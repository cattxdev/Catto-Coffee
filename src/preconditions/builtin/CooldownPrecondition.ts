/**
 * @fileoverview Cooldown Precondition - Handles command cooldowns
 * @author Catto Bot Team
 */

import { Collection } from 'discord.js';
import { Precondition, PreconditionContext, PreconditionResult } from '../Precondition';

interface CooldownData {
    endsAt: number;
    userId: string;
}

/**
 * Manages command cooldowns per user
 */
export class CooldownPrecondition extends Precondition {
    private cooldowns: Collection<string, Collection<string, CooldownData>>;

    constructor() {
        super('Cooldown', 5); // Run early
        this.cooldowns = new Collection();
    }

    async check(context: PreconditionContext): Promise<PreconditionResult> {
        const { interaction, commandName } = context;
        const command = context.client.commands.get(commandName);

        if (!command || !command.cooldown) {
            return this.success();
        }

        // Owner bypass
        if (context.client.config.owners.includes(interaction.user.id)) {
            return this.success();
        }

        const cooldownAmount = command.cooldown;

        if (!this.cooldowns.has(commandName)) {
            this.cooldowns.set(commandName, new Collection());
        }

        const now = Date.now();
        const timestamps = this.cooldowns.get(commandName)!;
        const cooldownData = timestamps.get(interaction.user.id);

        if (cooldownData) {
            const expirationTime = cooldownData.endsAt;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return this.error(
                    `⏱️ Please wait ${timeLeft.toFixed(1)} more second(s) before using \`/${commandName}\` again.`
                );
            }
        }

        // Set new cooldown
        timestamps.set(interaction.user.id, {
            endsAt: now + cooldownAmount,
            userId: interaction.user.id,
        });

        // Auto-cleanup after cooldown expires
        setTimeout(() => {
            timestamps.delete(interaction.user.id);
        }, cooldownAmount);

        return this.success();
    }

    /**
     * Manually clear cooldown for a user
     */
    public clearCooldown(commandName: string, userId: string): boolean {
        const timestamps = this.cooldowns.get(commandName);
        if (timestamps) {
            return timestamps.delete(userId);
        }
        return false;
    }

    /**
     * Get remaining cooldown time for a user
     */
    public getRemainingCooldown(commandName: string, userId: string): number {
        const timestamps = this.cooldowns.get(commandName);
        if (!timestamps) return 0;

        const cooldownData = timestamps.get(userId);
        if (!cooldownData) return 0;

        const now = Date.now();
        const remaining = cooldownData.endsAt - now;
        return remaining > 0 ? remaining : 0;
    }
}
