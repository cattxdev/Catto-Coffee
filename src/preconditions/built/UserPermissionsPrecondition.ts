/**
 * @fileoverview User Permissions Precondition - Check if user has required permissions
 * @author Catto Bot Team
 */

import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { Precondition, PreconditionContext, PreconditionResult } from '../Precondition';

/**
 * Checks if the user has the required permissions to run a command
 */
export class UserPermissionsPrecondition extends Precondition {
    constructor() {
        super('UserPermissions', 15);
    }

    async check(context: PreconditionContext): Promise<PreconditionResult> {
        const { interaction, commandName } = context;
        const command = context.client.commands.get(commandName);

        if (!command || !command.userPermissions || command.userPermissions.length === 0) {
            return this.success();
        }

        // Owner bypass
        if (context.client.config.owners.includes(interaction.user.id)) {
            return this.success();
        }

        // DM channels don't have permissions
        if (!interaction.guild || !interaction.member) {
            return this.error('❌ This command can only be used in a server.');
        }

        const memberPermissions = interaction.member.permissions as PermissionsBitField;
        const missingPermissions: string[] = [];

        for (const permission of command.userPermissions) {
            if (!memberPermissions.has(permission)) {
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
                `❌ You need the following permission(s) to use this command:\n${missingPermissions.map(p => `• ${p}`).join('\n')}`
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
