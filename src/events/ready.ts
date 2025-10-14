/**
 * @fileoverview Ready event - Fires when the bot successfully connects to Discord
 * @author Catto Bot Team
 */

import { Events, ActivityType } from 'discord.js';
import { Event } from '../types';
import type { BotClient } from '../structures/BotClient';
import logger from '../utils/logger';

const event: Event = {
    name: Events.ClientReady,
    once: true,
    async execute(client: BotClient) {
        if (!client.user) return;

        logger.info(`✅ Logged in as ${client.user.tag}`);
        logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);
        logger.info(`👥 Watching ${client.users.cache.size} users`);

        // Set bot status
        client.user.setPresence({
            activities: [{
                name: 'with Discord.js v14',
                type: ActivityType.Playing,
            }],
            status: 'online',
        });

        logger.info('🚀 Bot is ready!');
    },
};

export default event;
