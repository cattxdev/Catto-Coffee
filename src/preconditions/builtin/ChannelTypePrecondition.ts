/**
 * @fileoverview Channel Type Precondition - Restrict commands to specific channel types
 * @author Catto Bot Team
 */

import { ChannelType } from 'discord.js';
import { Precondition, PreconditionContext, PreconditionResult } from '../Precondition';

/**
 * Restricts commands to specific channel types
 */
export class ChannelTypePrecondition extends Precondition {
    constructor() {
        super('ChannelType', 8);
    }

    async check(context: PreconditionContext): Promise<PreconditionResult> {
        const { interaction, commandName } = context;
        const command = context.client.commands.get(commandName);

        if (!command || !command.channelTypes || command.channelTypes.length === 0) {
            return this.success();
        }

        const channel = interaction.channel;
        if (!channel) {
            return this.error('❌ Unable to determine channel type.');
        }

        if (!command.channelTypes.includes(channel.type)) {
            const allowedTypes = command.channelTypes
                .map(type => this.formatChannelType(type))
                .join(', ');

            return this.error(
                `❌ This command can only be used in: ${allowedTypes}`
            );
        }

        return this.success();
    }

    /**
     * Format channel type name to be more readable
     */
    private formatChannelType(type: ChannelType): string {
        const typeNames: Record<ChannelType, string> = {
            [ChannelType.GuildText]: 'Text Channels',
            [ChannelType.DM]: 'DMs',
            [ChannelType.GuildVoice]: 'Voice Channels',
            [ChannelType.GroupDM]: 'Group DMs',
            [ChannelType.GuildCategory]: 'Categories',
            [ChannelType.GuildAnnouncement]: 'Announcement Channels',
            [ChannelType.AnnouncementThread]: 'Announcement Threads',
            [ChannelType.PublicThread]: 'Public Threads',
            [ChannelType.PrivateThread]: 'Private Threads',
            [ChannelType.GuildStageVoice]: 'Stage Channels',
            [ChannelType.GuildDirectory]: 'Directory Channels',
            [ChannelType.GuildForum]: 'Forum Channels',
            [ChannelType.GuildMedia]: 'Media Channels',
        };

        return typeNames[type] || 'Unknown Channel Type';
    }
}
