/**
 * @fileoverview Main Voice Experience Service
 * @author Catto Bot Team
 */

import { PrismaClient } from '../../../../generated/prisma';
import { Redis } from 'ioredis';
import { VoiceSession, VoiceExpResult, VoiceExpReward } from './types';
import { VoiceSessionManager } from './VoiceSessionManager';
import { VoiceExpCalculator } from './VoiceExpCalculator';
import { VoiceExpConfigService } from './VoiceExpConfigService';
import logger from '../../../utils/logger';
import { withInterceptors } from '../../../interceptors';

/**
 * Interface for reward service
 */
interface IRewardService {
    awardExperience(userId: string, guildId: string, amount: number, source: string): Promise<void>;
}

/**
 * Main service for voice experience management
 */
export class VoiceExperienceService {
    private sessionManager: VoiceSessionManager;
    private calculator: VoiceExpCalculator;
    private configService: VoiceExpConfigService;
    private updateIntervals: Map<string, NodeJS.Timeout>;

    constructor(
        private prisma: PrismaClient,
        redis: Redis,
        private rewardService: IRewardService
    ) {
        this.sessionManager = new VoiceSessionManager(redis);
        this.calculator = new VoiceExpCalculator();
        this.configService = new VoiceExpConfigService(prisma, redis);
        this.updateIntervals = new Map();
    }

    /**
     * Start tracking a user's voice session
     */
    startTracking = withInterceptors(
        'VoiceExperienceService',
        'startTracking',
        async (userId: string, guildId: string, channelId: string, options: {
            muted?: boolean;
            deafened?: boolean;
            streaming?: boolean;
            video?: boolean;
            isAFK?: boolean;
        } = {}): Promise<VoiceSession> => {
            // Check if experience is enabled
            const config = await this.configService.getConfig(guildId);
            if (!config.enabled) {
                logger.debug(`Voice exp disabled for guild ${guildId}`);
                throw new Error('Voice experience is disabled');
            }

            // Create session
            const session = await this.sessionManager.createSession(
                userId,
                guildId,
                channelId,
                options
            );

            // Start periodic updates
            this.startPeriodicUpdates(userId, guildId, config.updateInterval);

            logger.info(`Started tracking voice for user ${userId} in guild ${guildId}`);
            return session;
        },
        { operation: 'voice_tracking_start' }
    );

    /**
     * Stop tracking a user's voice session and award experience
     */
    stopTracking = withInterceptors(
        'VoiceExperienceService',
        'stopTracking',
        async (userId: string, guildId: string): Promise<VoiceExpReward | null> => {
            // Stop periodic updates
            this.stopPeriodicUpdates(userId, guildId);

            // Get session
            const session = await this.sessionManager.getSession(userId, guildId);
            if (!session) {
                logger.debug(`No session found for user ${userId} in guild ${guildId}`);
                return null;
            }

            // Calculate final experience
            const reward = await this.calculateAndAwardExperience(session);

            // Delete session
            await this.sessionManager.deleteSession(userId, guildId);

            logger.info(
                `Stopped tracking voice for user ${userId} in guild ${guildId} - ` +
                `Awarded ${reward?.experience || 0} exp`
            );

            return reward;
        },
        { operation: 'voice_tracking_stop' }
    );

    /**
     * Update a user's voice state
     */
    updateState = withInterceptors(
        'VoiceExperienceService',
        'updateState',
        async (userId: string, guildId: string, updates: {
            channelId?: string;
            muted?: boolean;
            deafened?: boolean;
            streaming?: boolean;
            video?: boolean;
            isAFK?: boolean;
        }): Promise<VoiceSession | null> => {
            const session = await this.sessionManager.getSession(userId, guildId);
            if (!session) {
                return null;
            }

            // If channel changed, this is a move operation
            if (updates.channelId && updates.channelId !== session.channelId) {
                // Award exp for old channel first
                await this.calculateAndAwardExperience(session);
                
                // Update channel and reset accumulated exp
                return await this.sessionManager.updateSession(userId, guildId, {
                    channelId: updates.channelId,
                    accumulatedExp: 0,
                    muted: updates.muted,
                    deafened: updates.deafened,
                    streaming: updates.streaming,
                    video: updates.video,
                    isAFK: updates.isAFK,
                });
            }

            // Regular state update
            return await this.sessionManager.updateSession(userId, guildId, updates);
        },
        { operation: 'voice_state_update' }
    );

    /**
     * Process periodic experience updates for a user
     */
    private async processPeriodicUpdate(userId: string, guildId: string): Promise<void> {
        const session = await this.sessionManager.getSession(userId, guildId);
        if (!session) {
            this.stopPeriodicUpdates(userId, guildId);
            return;
        }

        // TODO: Add validation logic using config (e.g., check if exp is still enabled)
        // const config = await this.configService.getConfig(guildId);
        
        // Calculate experience since last update
        const timeSinceUpdate = Date.now() - session.lastUpdate;
        const expResult = await this.calculateExperienceForSession(session, timeSinceUpdate);

        if (expResult.finalExp > 0) {
            // Add to accumulated experience
            await this.sessionManager.addExperience(userId, guildId, expResult.finalExp);
            
            logger.debug(
                `Periodic update: User ${userId} earned ${expResult.finalExp} exp ` +
                `(${(timeSinceUpdate / 60000).toFixed(2)}m)`
            );
        }

        // Update last update time
        await this.sessionManager.updateSession(userId, guildId, {});
    }

    /**
     * Calculate experience for a session
     */
    private async calculateExperienceForSession(
        session: VoiceSession,
        duration: number
    ): Promise<VoiceExpResult> {
        const config = await this.configService.getConfig(session.guildId);
        
        // Get channel config
        const channelConfig = await this.configService.getChannelConfig(
            session.guildId,
            session.channelId
        );

        // Check if channel experience is disabled
        if (channelConfig && !channelConfig.enabled) {
            return {
                baseExp: 0,
                finalExp: 0,
                duration,
                multipliers: {},
                penalized: true,
                penaltyReason: 'Channel experience disabled',
            };
        }

        // Get multipliers
        const multipliers = await this.getMultipliers(session.userId, session.guildId);

        // Apply channel multiplier if exists
        if (channelConfig?.multiplier) {
            multipliers.channel = channelConfig.multiplier;
        }

        return this.calculator.calculateExperience(session, duration, config, multipliers);
    }

    /**
     * Calculate and award experience for a session
     */
    private async calculateAndAwardExperience(session: VoiceSession): Promise<VoiceExpReward | null> {
        const duration = this.sessionManager.getSessionDuration(session);
        const expResult = await this.calculateExperienceForSession(session, duration);

        // Add accumulated experience
        const totalExp = expResult.finalExp + session.accumulatedExp;

        if (totalExp <= 0) {
            return null;
        }

        // Award experience
        await this.rewardService.awardExperience(
            session.userId,
            session.guildId,
            totalExp,
            'voice'
        );

        const reward: VoiceExpReward = {
            userId: session.userId,
            guildId: session.guildId,
            channelId: session.channelId,
            experience: totalExp,
            duration,
            calculation: expResult,
            timestamp: new Date(),
        };

        return reward;
    }

    /**
     * Get experience multipliers for a user
     */
    private async getMultipliers(_userId: string, guildId: string): Promise<{
        guild?: number;
        channel?: number;
        premium?: number;
    }> {
        // Get guild
        const guild = await this.prisma.guild.findUnique({
            where: { discordId: guildId },
        });

        // TODO: Implement role-based multipliers using _userId
        // const user = await this.prisma.user.findUnique({
        //     where: { discordId: _userId },
        //     include: { roles: true }
        // });

        const multipliers: { guild?: number; channel?: number; premium?: number } = {};

        // Guild multiplier (from premium status)
        if (guild?.isPremium) {
            multipliers.premium = 1.5; // 50% bonus for premium guilds
        }

        // TODO: Add role-based multipliers
        // TODO: Add user-specific multipliers

        return multipliers;
    }

    /**
     * Start periodic experience updates for a user
     */
    private startPeriodicUpdates(userId: string, guildId: string, interval: number): void {
        const key = `${userId}:${guildId}`;
        
        // Clear existing interval if any
        this.stopPeriodicUpdates(userId, guildId);

        // Set up new interval
        const intervalId = setInterval(() => {
            this.processPeriodicUpdate(userId, guildId).catch(error => {
                logger.error(`Error in periodic voice update for ${userId}:`, error);
            });
        }, interval);

        this.updateIntervals.set(key, intervalId);
    }

    /**
     * Stop periodic updates for a user
     */
    private stopPeriodicUpdates(userId: string, guildId: string): void {
        const key = `${userId}:${guildId}`;
        const intervalId = this.updateIntervals.get(key);
        
        if (intervalId) {
            clearInterval(intervalId);
            this.updateIntervals.delete(key);
        }
    }

    /**
     * Get active session for a user
     */
    async getSession(userId: string, guildId: string): Promise<VoiceSession | null> {
        return await this.sessionManager.getSession(userId, guildId);
    }

    /**
     * Get all active sessions in a guild
     */
    async getGuildSessions(guildId: string): Promise<VoiceSession[]> {
        return await this.sessionManager.getGuildSessions(guildId);
    }

    /**
     * Cleanup stale sessions
     */
    async cleanupStaleSessions(): Promise<number> {
        const defaultTimeout = 3600000; // 1 hour
        return await this.sessionManager.cleanupStaleSessions(defaultTimeout);
    }

    /**
     * Get configuration service
     */
    getConfigService(): VoiceExpConfigService {
        return this.configService;
    }

    /**
     * Cleanup all intervals (call on shutdown)
     */
    destroy(): void {
        for (const intervalId of this.updateIntervals.values()) {
            clearInterval(intervalId);
        }
        this.updateIntervals.clear();
        logger.info('Voice Experience Service destroyed');
    }
}
