/**
 * @fileoverview Voice Experience Calculator
 * @author Catto Bot Team
 */

import { VoiceSession, VoiceExpResult, VoiceExpConfig } from './types';
import logger from '../../../utils/logger';

/**
 * Calculates experience for voice activity
 */
export class VoiceExpCalculator {
    /**
     * Calculate experience for a voice session
     */
    calculateExperience(
        session: VoiceSession,
        duration: number,
        config: VoiceExpConfig,
        multipliers: {
            guild?: number;
            channel?: number;
            premium?: number;
        } = {}
    ): VoiceExpResult {
        // Check minimum duration
        if (duration < config.minDuration) {
            return {
                baseExp: 0,
                finalExp: 0,
                duration,
                multipliers: {},
                penalized: true,
                penaltyReason: 'Duration too short',
            };
        }

        // Calculate base experience (exp per minute * minutes)
        const minutes = duration / 60000;
        let baseExp = config.baseExpPerMinute * minutes;

        // Activity multiplier (penalties for muted/deafened)
        let activityMultiplier = 1.0;

        if (session.muted) {
            activityMultiplier *= (1 - config.mutedPenalty);
        }

        if (session.deafened) {
            activityMultiplier *= (1 - config.deafenedPenalty);
        }

        // Bonuses for streaming/video
        if (session.streaming) {
            activityMultiplier *= (1 + config.streamingBonus);
        }

        if (session.video) {
            activityMultiplier *= (1 + config.videoBonus);
        }

        // Apply activity multiplier
        let finalExp = baseExp * activityMultiplier;

        // Apply guild multiplier
        if (multipliers.guild) {
            finalExp *= multipliers.guild;
        }

        // Apply channel multiplier
        if (multipliers.channel) {
            finalExp *= multipliers.channel;
        }

        // Apply premium multiplier
        if (multipliers.premium) {
            finalExp *= multipliers.premium;
        }

        // Apply peak hours multiplier if configured
        let timeBasedMultiplier: number | undefined;
        if (config.peakHours) {
            const currentHour = new Date().getHours();
            const { start, end, multiplier } = config.peakHours;

            const isInPeakHours = start <= end
                ? currentHour >= start && currentHour < end
                : currentHour >= start || currentHour < end;

            if (isInPeakHours) {
                timeBasedMultiplier = multiplier;
                finalExp *= multiplier;
            }
        }

        // Round to nearest integer
        baseExp = Math.floor(baseExp);
        finalExp = Math.floor(finalExp);

        const result: VoiceExpResult = {
            baseExp,
            finalExp,
            duration,
            multipliers: {
                guild: multipliers.guild,
                channel: multipliers.channel,
                premium: multipliers.premium,
                activity: activityMultiplier,
                timeBased: timeBasedMultiplier,
            },
            penalized: session.muted || session.deafened || session.isAFK,
            penaltyReason: this.getPenaltyReason(session),
        };

        logger.debug(
            `Calculated voice exp: ${finalExp} (base: ${baseExp}, ` +
            `duration: ${(duration / 60000).toFixed(2)}m, ` +
            `activity: ${activityMultiplier.toFixed(2)})`
        );

        return result;
    }

    /**
     * Calculate experience for a specific duration
     */
    calculateForDuration(
        durationMs: number,
        config: VoiceExpConfig,
        options: {
            muted?: boolean;
            deafened?: boolean;
            streaming?: boolean;
            video?: boolean;
            guildMultiplier?: number;
            channelMultiplier?: number;
            premiumMultiplier?: number;
        } = {}
    ): number {
        const session: VoiceSession = {
            userId: 'temp',
            guildId: 'temp',
            channelId: 'temp',
            startTime: Date.now() - durationMs,
            lastUpdate: Date.now(),
            muted: options.muted ?? false,
            deafened: options.deafened ?? false,
            streaming: options.streaming ?? false,
            video: options.video ?? false,
            accumulatedExp: 0,
            isAFK: false,
        };

        const result = this.calculateExperience(session, durationMs, config, {
            guild: options.guildMultiplier,
            channel: options.channelMultiplier,
            premium: options.premiumMultiplier,
        });

        return result.finalExp;
    }

    /**
     * Estimate experience per hour
     */
    estimateExpPerHour(
        config: VoiceExpConfig,
        multipliers: {
            guild?: number;
            channel?: number;
            premium?: number;
        } = {},
        options: {
            muted?: boolean;
            deafened?: boolean;
            streaming?: boolean;
            video?: boolean;
        } = {}
    ): number {
        return this.calculateForDuration(3600000, config, {
            ...options,
            guildMultiplier: multipliers.guild,
            channelMultiplier: multipliers.channel,
            premiumMultiplier: multipliers.premium,
        });
    }

    /**
     * Get penalty reason from session state
     */
    private getPenaltyReason(session: VoiceSession): string | undefined {
        const reasons: string[] = [];

        if (session.muted) reasons.push('muted');
        if (session.deafened) reasons.push('deafened');
        if (session.isAFK) reasons.push('AFK');

        return reasons.length > 0 ? reasons.join(', ') : undefined;
    }

    /**
     * Calculate effective multiplier
     */
    calculateEffectiveMultiplier(
        session: VoiceSession,
        config: VoiceExpConfig,
        multipliers: {
            guild?: number;
            channel?: number;
            premium?: number;
        } = {}
    ): number {
        let total = 1.0;

        // Activity modifiers
        if (session.muted) total *= (1 - config.mutedPenalty);
        if (session.deafened) total *= (1 - config.deafenedPenalty);
        if (session.streaming) total *= (1 + config.streamingBonus);
        if (session.video) total *= (1 + config.videoBonus);

        // External multipliers
        if (multipliers.guild) total *= multipliers.guild;
        if (multipliers.channel) total *= multipliers.channel;
        if (multipliers.premium) total *= multipliers.premium;

        return total;
    }
}
