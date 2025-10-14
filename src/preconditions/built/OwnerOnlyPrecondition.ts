/**
 * @fileoverview Owner Only Precondition - Restrict commands to bot owners
 * @author Catto Bot Team
 */

import { Precondition, PreconditionContext, PreconditionResult } from '../Precondition';

/**
 * Restricts commands to bot owners only
 */
export class OwnerOnlyPrecondition extends Precondition {
    constructor() {
        super('OwnerOnly', 1); // Highest priority
    }

    async check(context: PreconditionContext): Promise<PreconditionResult> {
        const { interaction, commandName } = context;
        const command = context.client.commands.get(commandName);

        if (!command || !command.ownerOnly) {
            return this.success();
        }

        if (!context.client.config.owners.includes(interaction.user.id)) {
            return this.error('❌ This command can only be used by the bot owner.');
        }

        return this.success();
    }
}
