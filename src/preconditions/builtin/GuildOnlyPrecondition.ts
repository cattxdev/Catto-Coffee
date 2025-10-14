/**
 * @fileoverview Guild Only Precondition - Restrict commands to guild channels only
 * @author Catto Bot Team
 */

import { Precondition, PreconditionContext, PreconditionResult } from '../Precondition';

/**
 * Restricts commands to guild (server) channels only
 */
export class GuildOnlyPrecondition extends Precondition {
    constructor() {
        super('GuildOnly', 7);
    }

    async check(context: PreconditionContext): Promise<PreconditionResult> {
        const { interaction, commandName } = context;
        const command = context.client.commands.get(commandName);

        if (!command || !command.guildOnly) {
            return this.success();
        }

        if (!interaction.guild) {
            return this.error('❌ This command can only be used in a server.');
        }

        return this.success();
    }
}
