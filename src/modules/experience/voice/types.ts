/**
 * @fileoverview Voice Experience Types
 * @author Catto Bot Team
 */

import { VoiceState } from 'discord.js';

/**
 * Voice activity session data stored in Redis
 */
export interface VoiceSession {
    /** User's Discord ID */
    userId: string;
    /** Guild's Discord ID */
    guildId: string;
    /** Voice channel ID */
    channelId: string;
    /** Session start timestamp */
    startTime: number;
    /** Last activity update timestamp */
    lastUpdate: number;
    /** Whether user is muted */
    muted: boolean;
    /** Whether user is deafened */
    deafened: boolean;
    /** Whether user is streaming */
    streaming: boolean;
    /** Whether user is using video */
    video: boolean;
    /** Total accumulated experience in this session */
    accumulatedExp: number;
    /** Whether user is in AFK channel */
    isAFK: boolean;
}

/**
 * Voice experience calculation result
 */
export interface VoiceExpResult {
    /** Base experience earned */
    baseExp: number;
    /** Experience after multipliers */
    finalExp: number;
    /** Duration in milliseconds */
    duration: number;
    /** Applied multipliers */
    multipliers: {
        /** Guild multiplier */
        guild?: number;
        /** Channel multiplier */
        channel?: number;
        /** Premium multiplier */
        premium?: number;
        /** Activity multiplier (muted/deafened penalty) */
        activity?: number;
        /** Time-based multiplier (peak hours) */
        timeBased?: number;
    };
    /** Whether user was penalized */
    penalized: boolean;
    /** Penalty reason if applicable */
    penaltyReason?: string;
}

/**
 * Voice channel configuration
 */
export interface VoiceChannelConfig {
    /** Channel Discord ID */
    channelId: string;
    /** Guild Discord ID */
    guildId: string;
    /** Whether experience is enabled */
    enabled: boolean;
    /** Experience multiplier for this channel */
    multiplier: number;
    /** Minimum members required to earn experience (optional override) */
    minMembers?: number;
    /** Maximum members for full experience */
    maxMembers?: number;
    /** Whether to ignore AFK users */
    ignoreAFK?: boolean;
}

/**
 * Voice experience configuration
 */
export interface VoiceExpConfig {
    /** Whether voice experience is enabled */
    enabled: boolean;
    /** Base experience per minute */
    baseExpPerMinute: number;
    /** Minimum duration (ms) to earn experience */
    minDuration: number;
    /** Update interval (ms) for tracking */
    updateInterval: number;
    /** Penalty for being muted */
    mutedPenalty: number;
    /** Penalty for being deafened */
    deafenedPenalty: number;
    /** Bonus for streaming */
    streamingBonus: number;
    /** Bonus for video */
    videoBonus: number;
    /** Minimum members in channel */
    minMembersInChannel: number;
    /** Whether to ignore AFK channels */
    ignoreAFKChannels: boolean;
    /** AFK timeout (ms) before stopping tracking */
    afkTimeout: number;
    /** Peak hours configuration */
    peakHours?: {
        /** Start hour (0-23) */
        start: number;
        /** End hour (0-23) */
        end: number;
        /** Multiplier during peak hours */
        multiplier: number;
    };
}

/**
 * Voice activity statistics
 */
export interface VoiceActivityStats {
    /** Total time in voice (ms) */
    totalTime: number;
    /** Time while muted (ms) */
    mutedTime: number;
    /** Time while deafened (ms) */
    deafenedTime: number;
    /** Time streaming (ms) */
    streamingTime: number;
    /** Time with video (ms) */
    videoTime: number;
    /** Total sessions */
    totalSessions: number;
    /** Total experience earned */
    totalExp: number;
    /** Average session duration (ms) */
    avgSessionDuration: number;
}

/**
 * Voice state change event data
 */
export interface VoiceStateChange {
    /** The old voice state */
    oldState: VoiceState;
    /** The new voice state */
    newState: VoiceState;
    /** Type of change */
    changeType: VoiceChangeType;
    /** User ID */
    userId: string;
    /** Guild ID */
    guildId: string;
}

/**
 * Types of voice state changes
 */
export enum VoiceChangeType {
    /** User joined a voice channel */
    JOIN = 'join',
    /** User left a voice channel */
    LEAVE = 'leave',
    /** User moved to another channel */
    MOVE = 'move',
    /** User muted/unmuted */
    MUTE = 'mute',
    /** User deafened/undeafened */
    DEAFEN = 'deafen',
    /** User started/stopped streaming */
    STREAM = 'stream',
    /** User started/stopped video */
    VIDEO = 'video',
    /** User was moved to/from AFK */
    AFK = 'afk',
}

/**
 * Voice experience reward event
 */
export interface VoiceExpReward {
    /** User's Discord ID */
    userId: string;
    /** Guild's Discord ID */
    guildId: string;
    /** Channel ID */
    channelId: string;
    /** Experience awarded */
    experience: number;
    /** Duration of session (ms) */
    duration: number;
    /** Calculation result */
    calculation: VoiceExpResult;
    /** Timestamp */
    timestamp: Date;
}

/**
 * Batch update data for multiple users
 */
export interface VoiceBatchUpdate {
    /** Map of userId to experience earned */
    updates: Map<string, number>;
    /** Timestamp of update */
    timestamp: number;
    /** Guild ID */
    guildId: string;
}
