/**
 * @fileoverview Experience Logging Interceptor - Pretty logs for XP operations
 * @author Catto Bot Team
 */

import { Interceptor, InterceptorContext, InterceptorResult } from '../Interceptor';
import logger from '../../utils/logger';
import type { BotClient } from '../../structures/BotClient';

/**
 * Custom interceptor for logging experience operations in a readable format
 */
export class ExperienceLoggingInterceptor extends Interceptor {
    constructor(private client: BotClient) {
        super('ExperienceLogging', 10);
    }

    async after(context: InterceptorContext): Promise<InterceptorResult> {
        const { operation, args, result, startTime } = context;

        // Only log awardExperience operations
        if (operation !== 'awardExperience') {
            return this.success();
        }

        const duration = Date.now() - startTime;

        // Extract data from args and result
        const userId = args?.userId || 'Unknown';
        const guildId = args?.guildId || 'Unknown';

        // Try to get user and guild names from Discord
        let userName = 'Unknown User';
        let guildName = 'Unknown Guild';

        try {
            const user = await this.client.users.fetch(userId).catch(() => null);
            if (user) {
                userName = `${user.username}`;
            }

            const guild = await this.client.guilds.fetch(guildId).catch(() => null);
            if (guild) {
                guildName = guild.name;
            }
        } catch (error) {
            // Silently fail if we can't fetch user/guild info
        }

        // If no result (cooldown or disabled), log that
        if (!result) {
            logger.info(`⏳ XP Cooldown: ${userName} in ${guildName} (${duration}ms)`);
            return this.success();
        }

        // Extract result data
        const { calculation, levelUp, totalXp, currentLevel } = result;
        const xpGained = calculation?.finalXp || 0;
        const baseXp = calculation?.baseXp || 0;
        const multiplier = calculation?.multiplier || 1;
        const leveledUp = levelUp?.leveledUp || false;
        const oldLevel = levelUp?.oldLevel || 0;
        const newLevel = levelUp?.newLevel || 0;

        // Build the log message
        let logMessage = `💰 ${userName} in ${guildName}: +${xpGained} XP`;
        
        // Add multiplier info if applied
        if (multiplier > 1) {
            logMessage += ` (${baseXp} × ${multiplier.toFixed(2)})`;
        }

        // Add total and level info
        logMessage += ` → Total: ${totalXp} XP (Level ${currentLevel})`;

        // Add level up notification
        if (leveledUp) {
            logMessage += ` 🎉 LEVEL UP! ${oldLevel} → ${newLevel}`;
            if (levelUp.rewards && levelUp.rewards.length > 0) {
                logMessage += ` | Rewards: ${levelUp.rewards.length}`;
            }
        }

        // Add performance info
        logMessage += ` [${duration}ms]`;

        logger.info(logMessage);

        return this.success();
    }

    async onError(context: InterceptorContext): Promise<InterceptorResult> {
        const { operation, error, startTime } = context;
        
        if (operation !== 'awardExperience') {
            return this.success();
        }

        const duration = Date.now() - startTime;
        const errorMsg = error?.message || 'Unknown error';
        
        logger.error(`❌ XP Award Failed: ${errorMsg} [${duration}ms]`);

        return this.success();
    }
}
