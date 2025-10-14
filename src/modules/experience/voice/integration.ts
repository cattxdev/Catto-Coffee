/**
 * @fileoverview Voice Experience Module Integration
 * @author Catto Bot Team
 */

import { Client, Events } from 'discord.js';
import { Redis } from 'ioredis';
import { PrismaClient } from '../../../../generated/prisma';
import { VoiceExperienceService, VoiceStateHandler } from './index';
import logger from '../../../utils/logger';

/**
 * Initialize voice experience tracking
 */
export function initializeVoiceExperience(
    client: Client,
    prisma: PrismaClient,
    redis: Redis,
    rewardService: any // Replace with actual reward service type
): VoiceExperienceService {
    // Create voice experience service
    const voiceExpService = new VoiceExperienceService(
        prisma,
        redis,
        rewardService
    );

    // Create voice state handler
    const voiceStateHandler = new VoiceStateHandler(voiceExpService);

    // Register Discord event listener
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        try {
            await voiceStateHandler.handleVoiceStateUpdate(oldState, newState);
        } catch (error) {
            logger.error('Error handling voice state update:', error);
        }
    });

    logger.info('Voice experience module initialized');

    return voiceExpService;
}

/**
 * Cleanup voice experience tracking (call on bot shutdown)
 */
export async function cleanupVoiceExperience(_service: VoiceExperienceService): Promise<void> {
    logger.info('Cleaning up voice experience module...');
    
    // Stop all periodic updates
    // The service handles cleanup internally when destroyed
    // Future: Implement explicit cleanup methods if needed
    
    logger.info('Voice experience module cleaned up');
}
