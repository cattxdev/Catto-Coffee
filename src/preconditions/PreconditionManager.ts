/**
 * @fileoverview Precondition Manager - Manages and runs all preconditions
 * @author Catto Bot Team
 */

import { Collection } from 'discord.js';
import { Precondition, PreconditionContext, PreconditionResult } from './Precondition';
import { BotClient } from '../structures/BotClient';
import logger from '../utils/logger';

// Import built-in preconditions
import { CooldownPrecondition } from './builtin/CooldownPrecondition';
import { UserPermissionsPrecondition } from './builtin/UserPermissionsPrecondition';
import { BotPermissionsPrecondition } from './builtin/BotPermissionsPrecondition';
import { ChannelTypePrecondition } from './builtin/ChannelTypePrecondition';
import { NSFWPrecondition } from './builtin/NSFWPrecondition';
import { GuildOnlyPrecondition } from './builtin/GuildOnlyPrecondition';
import { OwnerOnlyPrecondition } from './builtin/OwnerOnlyPrecondition';

export class PreconditionManager {
    private preconditions: Collection<string, Precondition>;

    constructor(_client: BotClient) {
        this.preconditions = new Collection();
        this.loadBuiltInPreconditions();
    }

    /**
     * Load all built-in preconditions
     */
    private loadBuiltInPreconditions(): void {
        const builtInPreconditions = [
            new OwnerOnlyPrecondition(),
            new CooldownPrecondition(),
            new GuildOnlyPrecondition(),
            new ChannelTypePrecondition(),
            new NSFWPrecondition(),
            new UserPermissionsPrecondition(),
            new BotPermissionsPrecondition(),
        ];

        for (const precondition of builtInPreconditions) {
            this.preconditions.set(precondition.name, precondition);
            logger.debug(`Loaded precondition: ${precondition.name} (priority: ${precondition.position})`);
        }

        logger.info(`✅ Loaded ${this.preconditions.size} built-in preconditions`);
    }

    /**
     * Register a custom precondition
     */
    public registerPrecondition(precondition: Precondition): void {
        if (this.preconditions.has(precondition.name)) {
            logger.warn(`Precondition ${precondition.name} is already registered. Overwriting...`);
        }
        this.preconditions.set(precondition.name, precondition);
        logger.info(`Registered custom precondition: ${precondition.name}`);
    }

    /**
     * Run all preconditions for a command
     * @returns Result indicating if all preconditions passed
     */
    public async runPreconditions(context: PreconditionContext): Promise<PreconditionResult> {
        // Sort preconditions by position (lower = higher priority)
        const sortedPreconditions = Array.from(this.preconditions.values())
            .sort((a, b) => a.position - b.position);

        for (const precondition of sortedPreconditions) {
            try {
                const result = await precondition.check(context);
                
                if (!result.success) {
                    logger.debug(
                        `Precondition ${precondition.name} failed for command ${context.commandName} by user ${context.interaction.user.tag}`
                    );
                    return result;
                }
            } catch (error) {
                logger.error(`Error running precondition ${precondition.name}:`, error);
                return {
                    success: false,
                    message: '❌ An error occurred while checking command requirements.',
                };
            }
        }

        return { success: true };
    }

    /**
     * Get a specific precondition by name
     */
    public getPrecondition(name: string): Precondition | undefined {
        return this.preconditions.get(name);
    }

    /**
     * Get all registered preconditions
     */
    public getAllPreconditions(): Collection<string, Precondition> {
        return this.preconditions;
    }

    /**
     * Remove a precondition
     */
    public removePrecondition(name: string): boolean {
        return this.preconditions.delete(name);
    }

    /**
     * Get the cooldown precondition for manual cooldown management
     */
    public getCooldownPrecondition(): CooldownPrecondition | undefined {
        return this.preconditions.get('Cooldown') as CooldownPrecondition | undefined;
    }
}
