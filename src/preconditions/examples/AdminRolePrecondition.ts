/**
 * @fileoverview Example: Admin Role Precondition
 * @author Catto Bot Team
 * 
 * This precondition checks if a user has a specific admin role.
 * Useful for commands that should only be available to server admins.
 */

import { Precondition, PreconditionContext, PreconditionResult } from '../Precondition';

/**
 * Checks if user has an admin role in the server
 */
export class AdminRolePrecondition extends Precondition {
    private adminRoleIds: string[];

    constructor(adminRoleIds: string[] = []) {
        super('AdminRole', 14);
        this.adminRoleIds = adminRoleIds;
    }

    async check(context: PreconditionContext): Promise<PreconditionResult> {
        const { interaction, commandName } = context;
        const command = context.client.commands.get(commandName);

        // Only check if command requires admin role
        // Add 'adminOnly?: boolean' to the Command interface
        if (!command || !(command as any).adminOnly) {
            return this.success();
        }

        // Must be in a guild
        if (!interaction.guild || !interaction.member) {
            return this.error('❌ This command can only be used in a server.');
        }

        // Check if user has any of the admin roles
        const guildMember = await interaction.guild.members.fetch(interaction.user.id);
        
        const hasAdminRole = this.adminRoleIds.some(roleId =>
            guildMember.roles.cache.has(roleId)
        );

        if (!hasAdminRole) {
            return this.error('❌ You need an admin role to use this command.');
        }

        return this.success();
    }

    /**
     * Add an admin role ID
     */
    public addAdminRole(roleId: string): void {
        if (!this.adminRoleIds.includes(roleId)) {
            this.adminRoleIds.push(roleId);
        }
    }

    /**
     * Remove an admin role ID
     */
    public removeAdminRole(roleId: string): void {
        this.adminRoleIds = this.adminRoleIds.filter(id => id !== roleId);
    }
}

// Usage:
// const adminPrecondition = new AdminRolePrecondition(['ROLE_ID_1', 'ROLE_ID_2']);
// client.preconditionManager.registerPrecondition(adminPrecondition);
