/**
 * @fileoverview Voice Session Manager - Handles Redis session tracking
 * @author Catto Bot Team
 */

import { Redis } from 'ioredis';
import { VoiceSession } from './types';
import logger from '../../../utils/logger';

/**
 * Manages voice sessions in Redis
 */
export class VoiceSessionManager {
    private readonly SESSION_PREFIX = 'voice:session:';
    private readonly SESSION_TTL = 86400; // 24 hours

    constructor(private redis: Redis) {}

    /**
     * Create or update a voice session
     */
    async createSession(
        userId: string,
        guildId: string,
        channelId: string,
        options: {
            muted?: boolean;
            deafened?: boolean;
            streaming?: boolean;
            video?: boolean;
            isAFK?: boolean;
        } = {}
    ): Promise<VoiceSession> {
        const session: VoiceSession = {
            userId,
            guildId,
            channelId,
            startTime: Date.now(),
            lastUpdate: Date.now(),
            muted: options.muted ?? false,
            deafened: options.deafened ?? false,
            streaming: options.streaming ?? false,
            video: options.video ?? false,
            accumulatedExp: 0,
            isAFK: options.isAFK ?? false,
        };

        const key = this.getSessionKey(userId, guildId);
        await this.redis.setex(key, this.SESSION_TTL, JSON.stringify(session));

        logger.debug(`Created voice session for user ${userId} in guild ${guildId}`);
        return session;
    }

    /**
     * Get an existing session
     */
    async getSession(userId: string, guildId: string): Promise<VoiceSession | null> {
        const key = this.getSessionKey(userId, guildId);
        const data = await this.redis.get(key);

        if (!data) {
            return null;
        }

        try {
            return JSON.parse(data) as VoiceSession;
        } catch (error) {
            logger.error(`Failed to parse voice session for ${userId}:`, error);
            await this.redis.del(key);
            return null;
        }
    }

    /**
     * Update session state
     */
    async updateSession(
        userId: string,
        guildId: string,
        updates: Partial<Omit<VoiceSession, 'userId' | 'guildId' | 'startTime'>>
    ): Promise<VoiceSession | null> {
        const session = await this.getSession(userId, guildId);
        if (!session) {
            return null;
        }

        const updatedSession: VoiceSession = {
            ...session,
            ...updates,
            lastUpdate: Date.now(),
        };

        const key = this.getSessionKey(userId, guildId);
        await this.redis.setex(key, this.SESSION_TTL, JSON.stringify(updatedSession));

        return updatedSession;
    }

    /**
     * Delete a session
     */
    async deleteSession(userId: string, guildId: string): Promise<VoiceSession | null> {
        const session = await this.getSession(userId, guildId);
        if (!session) {
            return null;
        }

        const key = this.getSessionKey(userId, guildId);
        await this.redis.del(key);

        logger.debug(`Deleted voice session for user ${userId} in guild ${guildId}`);
        return session;
    }

    /**
     * Get all active sessions in a guild
     */
    async getGuildSessions(guildId: string): Promise<VoiceSession[]> {
        const pattern = `${this.SESSION_PREFIX}*:${guildId}`;
        const keys = await this.redis.keys(pattern);

        if (keys.length === 0) {
            return [];
        }

        const sessions: VoiceSession[] = [];
        const values = await this.redis.mget(keys);

        for (const value of values) {
            if (value) {
                try {
                    sessions.push(JSON.parse(value) as VoiceSession);
                } catch (error) {
                    logger.error('Failed to parse session:', error);
                }
            }
        }

        return sessions;
    }

    /**
     * Get all sessions in a specific channel
     */
    async getChannelSessions(guildId: string, channelId: string): Promise<VoiceSession[]> {
        const guildSessions = await this.getGuildSessions(guildId);
        return guildSessions.filter(s => s.channelId === channelId);
    }

    /**
     * Add accumulated experience to a session
     */
    async addExperience(userId: string, guildId: string, exp: number): Promise<void> {
        const session = await this.getSession(userId, guildId);
        if (!session) {
            return;
        }

        await this.updateSession(userId, guildId, {
            accumulatedExp: session.accumulatedExp + exp,
        });
    }

    /**
     * Get session duration in milliseconds
     */
    getSessionDuration(session: VoiceSession): number {
        return Date.now() - session.startTime;
    }

    /**
     * Check if session is stale (no updates for a while)
     */
    isSessionStale(session: VoiceSession, timeoutMs: number): boolean {
        return Date.now() - session.lastUpdate > timeoutMs;
    }

    /**
     * Clean up stale sessions
     */
    async cleanupStaleSessions(timeoutMs: number): Promise<number> {
        const pattern = `${this.SESSION_PREFIX}*`;
        const keys = await this.redis.keys(pattern);

        let cleaned = 0;
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (!data) continue;

            try {
                const session = JSON.parse(data) as VoiceSession;
                if (this.isSessionStale(session, timeoutMs)) {
                    await this.redis.del(key);
                    cleaned++;
                }
            } catch (error) {
                // Invalid session, delete it
                await this.redis.del(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info(`Cleaned up ${cleaned} stale voice sessions`);
        }

        return cleaned;
    }

    /**
     * Get total active sessions count
     */
    async getActiveSessionsCount(): Promise<number> {
        const pattern = `${this.SESSION_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        return keys.length;
    }

    /**
     * Generate session key for Redis
     */
    private getSessionKey(userId: string, guildId: string): string {
        return `${this.SESSION_PREFIX}${userId}:${guildId}`;
    }
}
