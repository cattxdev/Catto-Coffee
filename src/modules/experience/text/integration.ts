/**
 * @fileoverview Text Experience Module Integration
 * @author Catto Bot Team
 */

import { Events } from 'discord.js';
import type { PrismaClient } from '../../../../generated/prisma';
import type RedisService from '../../../services/RedisService';
import { TextExperienceService } from './TextExperienceService';
import { MessageExperienceHandler } from './MessageExperienceHandler';
import { ExperienceCacheService } from '../ExperienceCacheService';
import { ExperienceLoggingInterceptor } from '../../../interceptors/built/ExperienceLoggingInterceptor';
import logger from '../../../utils/logger';
import type { BotClient } from '../../../structures/BotClient';

/**
 * Initialize text experience tracking
 */
export function initializeTextExperience(
    client: BotClient,
    prisma: PrismaClient,
    redisService: RedisService
): TextExperienceService {
    // Create cache service
    const cacheService = new ExperienceCacheService(redisService);

    // Create text experience service
    const textExpService = new TextExperienceService(prisma, cacheService);

    // Add experience logging interceptor for pretty XP logs
    const experienceLoggingInterceptor = new ExperienceLoggingInterceptor(client);
    textExpService.addInterceptor(experienceLoggingInterceptor);

    // Create message handler with the service instance that has interceptors
    const messageHandler = new MessageExperienceHandler(textExpService);

    // Register Discord event listener
    client.on(Events.MessageCreate, async (message) => {
        try {
            await messageHandler.handleMessage(message);
        } catch (error) {
            logger.error('Error handling message experience:', error);
        }
    });

    logger.info('Text experience module initialized');

    return textExpService;
}

/**
 * Cleanup text experience tracking (call on bot shutdown)
 */
export async function cleanupTextExperience(_service: TextExperienceService): Promise<void> {
    logger.info('Cleaning up text experience module...');
    // Any cleanup operations can be added here
    logger.info('Text experience module cleaned up');
}
