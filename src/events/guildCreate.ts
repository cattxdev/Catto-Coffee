/**
 * @fileoverview Guild Create event - Fires when bot joins a guild
 * @author Catto Bot Team
 */

import { Events, Guild, EmbedBuilder } from 'discord.js';
import { Event } from '../types';
import type { BotClient } from '../structures/BotClient';
import logger from '../utils/logger';

const event: Event = {
    name: Events.GuildCreate,
    async execute(guild: Guild, client: BotClient) {
        logger.info(`✨ Joined new guild: ${guild.name} (${guild.id})`);
        logger.info(`   Members: ${guild.memberCount}`);

        // Try to send a welcome message to the system channel
        if (guild.systemChannel && guild.systemChannel.permissionsFor(client.user!)?.has('SendMessages')) {
            const embed = new EmbedBuilder()
                .setColor(client.config.embeds.color.success)
                .setTitle('👋 Thanks for adding me!')
                .setDescription(
                    `Hello! I'm **${client.user!.username}**.\n\n` +
                    `Use \`/help\` to see all available commands.\n` +
                    `If you need support, feel free to reach out!`
                )
                .setThumbnail(client.user!.displayAvatarURL())
                .setTimestamp();

            try {
                await guild.systemChannel.send({ embeds: [embed] });
            } catch (error) {
                logger.error('Failed to send welcome message:', error);
            }
        }
    },
};

export default event;
