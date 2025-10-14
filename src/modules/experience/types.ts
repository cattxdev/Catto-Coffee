/**
 * @fileoverview Types for Experience Module
 * @author Catto Bot Team
 */

import type { ExperienceType, LeaderboardPeriod } from '../../../generated/prisma';

/**
 * Experience calculation result
 */
export interface ExperienceCalculation {
    /** Base XP amount before multipliers */
    baseXp: number;
    /** Total multiplier applied (in decimal, e.g., 1.5 for 150%) */
    multiplier: number;
    /** Final XP amount after multipliers */
    finalXp: number;
    /** List of multipliers that were applied */
    appliedMultipliers: AppliedMultiplier[];
}

/**
 * Applied multiplier details
 */
export interface AppliedMultiplier {
    /** Multiplier ID */
    id: string;
    /** Multiplier name/description */
    name: string;
    /** Multiplier value in basis points */
    basisPoints: number;
    /** Multiplier value as decimal (e.g., 1.5 for 50% boost) */
    decimal: number;
    /** Target type (GLOBAL, GUILD, ROLE, USER) */
    targetType: string;
    /** Target ID if applicable */
    targetId?: string;
}

/**
 * Level up result
 */
export interface LevelUpResult {
    /** Whether the user leveled up */
    leveledUp: boolean;
    /** Old level */
    oldLevel: number;
    /** New level */
    newLevel: number;
    /** Rewards earned (role IDs) */
    rewards: string[];
}

/**
 * Experience gain result
 */
export interface ExperienceGainResult {
    /** XP calculation details */
    calculation: ExperienceCalculation;
    /** Level up result */
    levelUp: LevelUpResult;
    /** Current total XP */
    totalXp: number;
    /** Current level */
    currentLevel: number;
    /** XP progress in current level */
    currentLevelXp: number;
    /** XP required for next level */
    xpForNextLevel: number;
}

/**
 * Cooldown check result
 */
export interface CooldownResult {
    /** Whether user is on cooldown */
    onCooldown: boolean;
    /** Remaining time in milliseconds (0 if not on cooldown) */
    remainingTime: number;
    /** When cooldown expires (null if not on cooldown) */
    expiresAt: Date | null;
}

/**
 * Experience config cached data
 */
export interface ExperienceConfigCache {
    /** Whether experience is enabled */
    enabled: boolean;
    /** Minimum XP per message */
    minXp: number;
    /** Maximum XP per message */
    maxXp: number;
    /** Cooldown in seconds */
    cooldownSeconds: number;
    /** Experience type */
    type: ExperienceType;
    /** Announcement channel ID */
    announcementChannelId: string | null;
    /** Whether to send level up messages */
    sendLevelUpMessages: boolean;
    /** When this cache was created */
    cachedAt: number;
}

/**
 * User experience data for leaderboard
 */
export interface LeaderboardEntry {
    /** User's database ID */
    id: string;
    /** User's Discord ID */
    discordId: string;
    /** Total XP */
    totalXp: number;
    /** Current level */
    level: number;
    /** Rank position */
    rank: number;
    /** Total messages sent */
    messageCount?: number;
}

/**
 * Leaderboard query options
 */
export interface LeaderboardOptions {
    /** Guild ID */
    guildId: string;
    /** Leaderboard period */
    period?: LeaderboardPeriod;
    /** Number of entries to return */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
}

/**
 * Experience statistics
 */
export interface ExperienceStats {
    /** Total XP gained */
    totalXp: number;
    /** Current level */
    level: number;
    /** Total messages sent */
    totalMessages: number;
    /** Daily messages */
    dailyMessages: number;
    /** Weekly messages */
    weeklyMessages: number;
    /** Monthly messages */
    monthlyMessages: number;
    /** XP to next level */
    xpToNextLevel: number;
    /** Current level progress (0-100) */
    levelProgress: number;
}

/**
 * Redis cache keys
 */
export const CacheKeys = {
    /** Experience config: exp:config:{guildId} */
    CONFIG: (guildId: string) => `exp:config:${guildId}`,
    
    /** User cooldown: exp:cooldown:{guildId}:{userId} */
    COOLDOWN: (guildId: string, userId: string) => `exp:cooldown:${guildId}:${userId}`,
    
    /** Active multipliers: exp:multipliers:{guildId} */
    MULTIPLIERS: (guildId: string) => `exp:multipliers:${guildId}`,
    
    /** User level cache: exp:level:{guildId}:{userId} */
    USER_LEVEL: (guildId: string, userId: string) => `exp:level:${guildId}:${userId}`,
    
    /** Leaderboard cache: exp:leaderboard:{guildId}:{period} */
    LEADERBOARD: (guildId: string, period: string) => `exp:leaderboard:${guildId}:${period}`,
} as const;

/**
 * Cache TTL values (in seconds)
 */
export const CacheTTL = {
    /** Config cache: 5 minutes */
    CONFIG: 300,
    
    /** Multipliers cache: 2 minutes */
    MULTIPLIERS: 120,
    
    /** User level cache: 1 minute */
    USER_LEVEL: 60,
    
    /** Leaderboard cache: 5 minutes */
    LEADERBOARD: 300,
} as const;
