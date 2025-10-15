/**
 * @fileoverview Message Create Event - Handles text XP using experience module
 * @author Catto Bot Team
 */

import { Events, Message } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { Event } from '../../types';
import { MessageExperienceHandler } from '../../modules/experience/text/MessageExperienceHandler';

// Cache handler per client
let experienceHandler: MessageExperienceHandler | null = null;

export default {
    name: Events.MessageCreate,

    async execute(message: Message, client: BotClient) {
        // Initialize handler if not exists and service is available
        if (!experienceHandler && client.textExperience) {
            experienceHandler = new MessageExperienceHandler(client.textExperience);
        }

        // Handle experience awarding
        if (experienceHandler) {
            await experienceHandler.handleMessage(message);
        }
    },
} as Event;
