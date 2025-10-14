/**
 * @fileoverview Message Create Event - Handles text XP using experience module
 * @author Catto Bot Team
 */

import { Events, Message } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { Event } from '../../types';
import { MessageExperienceHandler } from '../../modules/experience';

// Cache handler per client
let experienceHandler: MessageExperienceHandler | null = null;

export default {
    name: Events.MessageCreate,
    
    async execute(message: Message, client: BotClient) {
        // Initialize handler if not exists
        if (!experienceHandler) {
            experienceHandler = new MessageExperienceHandler(client);
        }

        // Handle experience awarding
        await experienceHandler.handleMessage(message);
    },
} satisfies Event;
