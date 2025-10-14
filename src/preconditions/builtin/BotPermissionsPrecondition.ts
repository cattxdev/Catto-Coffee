/**
 * @fileoverview Bot Permissions Precondition - Check if bot has required permissions
 * @author Catto Bot Team
 */

import { PermissionFlagsBits } from 'discord.js';
import { Precondition, PreconditionContext, PreconditionResult } from '../Precondition';

/**
 * Checks if the bot has the required permissions to execute a command
 */
export class BotPermissionsPrecondition extends Precondition {
    constructor() {
        super('BotPermissions', 16);
    }

    async check(context: PreconditionContext): Promise<PreconditionResult> {
        const { interaction, commandName } = context;
        const command = context.client.commands.get(commandName);

        if (!command || !command.botPermissions || command.botPermissions.length === 0) {
            return this.success();
        }

        // DM channels don't have permissions
        if (!interaction.guild) {
            return this.error('❌ This command can only be used in a server.');
        }

        const botMember = await interaction.guild.members.fetchMe();
        const botPermissions = botMember.permissions;
        const missingPermissions: string[] = [];

        for (const permission of command.botPermissions) {
            if (!botPermissions.has(permission)) {
                const permName = Object.keys(PermissionFlagsBits).find(
                    key => PermissionFlagsBits[key as keyof typeof PermissionFlagsBits] === permission
                );
                if (permName) {
                    missingPermissions.push(this.formatPermissionName(permName));
                }
            }
        }

        if (missingPermissions.length > 0) {
            return this.error(
                `❌ I need the following permission(s) to execute this command:\n${missingPermissions.map(p => `• ${p}`).join('\n')}`
            );
        }

        return this.success();
    }

    /**
     * Format permission name to be more readable
     */
    private formatPermissionName(permission: string): string {
        return permission
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace(/^./, str => str.toUpperCase());
    }
}
