/**
 * @fileoverview NSFW Precondition - Restrict commands to NSFW channels
 * @author Catto Bot Team
 */

import { ChannelType } from 'discord.js';
import { Precondition, PreconditionContext, PreconditionResult } from '../Precondition';

/**
 * Ensures commands are only run in NSFW channels when required
 */
export class NSFWPrecondition extends Precondition {
    constructor() {
        super('NSFW', 9);
    }

    async check(context: PreconditionContext): Promise<PreconditionResult> {
        const { interaction, commandName } = context;
        const command = context.client.commands.get(commandName);

        if (!command || !command.nsfw) {
            return this.success();
        }

        const channel = interaction.channel;

        if (!channel) {
            return this.error('❌ Unable to determine channel type.');
        }

        // DM channels are considered NSFW by default
        if (channel.type === ChannelType.DM || channel.type === ChannelType.GroupDM) {
            return this.success();
        }

        // Check if channel has NSFW property
        if ('nsfw' in channel && channel.nsfw) {
            return this.success();
        }

        return this.error('🔞 This command can only be used in NSFW channels.');
    }
}
