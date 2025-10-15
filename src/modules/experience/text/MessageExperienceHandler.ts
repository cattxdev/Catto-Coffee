/**
 * @fileoverview Message Experience Handler
 * @author Catto Bot Team
 */

import type { Message } from 'discord.js';
import { ChannelType } from 'discord.js';
import logger from '#/utils/logger';
import { TextExperienceService } from './TextExperienceService';
import { ExperienceCalculator } from '#/modules/experience/services/ExperienceCalculator';

/**
 * Handler for awarding text experience on message creation
 */
export class MessageExperienceHandler {
    private readonly experienceService: TextExperienceService;

    constructor(experienceService: TextExperienceService) {
        this.experienceService = experienceService;
    }

    /**
     * Handle message creation for experience awarding
     * 
     * @param message - The message that was created
     * @returns True if experience was awarded, false otherwise
     */
    async handleMessage(message: Message): Promise<boolean> {
        try {
            // 1. Basic validation
            if (!this.shouldProcessMessage(message)) {
                return false;
            }

            // 2. Award experience
            const result = await this.experienceService.awardExperience(
                message.author.id,
                message.guild!.id
            );

            // 3. Handle result
            if (!result) {
                // Experience disabled or on cooldown
                return false;
            }

            // 4. Handle level up
            if (result.levelUp.leveledUp) {
                await this.handleLevelUp(message, result);
            }

            return true;
        } catch (error) {
            logger.error('Error handling message experience:', error);
            return false;
        }
    }

    /**
     * Check if message should be processed for experience
     */
    private shouldProcessMessage(message: Message): boolean {
        // Must be in a guild
        if (!message.guild) {
            return false;
        }

        // Must not be from a bot
        if (message.author.bot) {
            return false;
        }

        // Must be a text channel
        if (message.channel.type !== ChannelType.GuildText) {
            return false;
        }

        // Message must have content or attachments
        if (!message.content && message.attachments.size === 0) {
            return false;
        }

        // Message must be at least 3 characters (prevent spam)
        if (message.content.length < 3 && message.attachments.size === 0) {
            return false;
        }

        return true;
    }

    /**
     * Handle level up announcement
     */
    private async handleLevelUp(message: Message, result: any): Promise<void> {
        try {
            const { levelUp, currentLevel } = result;
            const config = await this.experienceService.getConfig(message.guild!.id);

            // Check if announcements are enabled
            if (!config.sendLevelUpMessages) {
                return;
            }

            // Award roles first
            const member = message.member;
            if (member && levelUp.rewards.length > 0) {
                for (const roleId of levelUp.rewards) {
                    try {
                        await member.roles.add(roleId);
                        logger.info(`Awarded role ${roleId} to ${member.user.tag} for reaching level ${currentLevel}`);
                    } catch (error) {
                        logger.error(`Failed to award role ${roleId}:`, error);
                    }
                }
            }

            // Build customizable message with placeholders
            const customMessage = await this.buildCustomLevelUpMessage(message, result);

            // Send announcement
            if (config.announcementChannelId) {
                // Send to configured channel
                const channel = await message.guild!.channels.fetch(config.announcementChannelId).catch(() => null);
                if (channel && channel.isTextBased()) {
                    await channel.send(customMessage || this.getDefaultLevelUpMessage(message, result));
                }
            } else {
                // Send to current channel (must be text-based from validation)
                if (message.channel.isTextBased() && 'send' in message.channel) {
                    await message.channel.send(customMessage || this.getDefaultLevelUpMessage(message, result));
                }
            }
        } catch (error) {
            logger.error('Error handling level up announcement:', error);
        }
    }

    /**
     * Build custom level up message from database config
     */
    private async buildCustomLevelUpMessage(message: Message, result: any): Promise<string | null> {
        try {
            // Get the full config from database to access announceMessage
            const dbConfig = await this.experienceService.prismaClient.experienceConfig.findFirst({
                where: {
                    guild: { discordId: message.guild!.id },
                    type: 'TEXT'
                }
            });

            if (!dbConfig || !dbConfig.announceMessage) {
                return null;
            }

            const { levelUp, totalXp, currentLevel, xpForNextLevel, currentLevelXp } = result;
            const progress = result.levelProgress || 0;

            // Replace placeholders with actual values
            let customMessage = dbConfig.announceMessage
                // User mentions
                .replace(/{user}/g, `${message.author}`)
                .replace(/{user\.mention}/g, `${message.author}`)
                .replace(/{user\.username}/g, message.author.username)
                .replace(/{user\.tag}/g, message.author.tag)
                .replace(/{user\.id}/g, message.author.id)

                // Level info
                .replace(/{level}/g, currentLevel.toString())
                .replace(/{level\.new}/g, currentLevel.toString())
                .replace(/{level\.old}/g, levelUp.oldLevel.toString())
                .replace(/{level\.formatted}/g, ExperienceCalculator.formatLevel(currentLevel))

                // XP info
                .replace(/{xp}/g, ExperienceCalculator.formatXp(totalXp))
                .replace(/{xp\.total}/g, ExperienceCalculator.formatXp(totalXp))
                .replace(/{xp\.current}/g, ExperienceCalculator.formatXp(currentLevelXp))
                .replace(/{xp\.needed}/g, ExperienceCalculator.formatXp(xpForNextLevel))
                .replace(/{xp\.progress}/g, `${Math.floor(progress)}%`)

                // Server info
                .replace(/{server}/g, message.guild!.name)
                .replace(/{server\.name}/g, message.guild!.name)
                .replace(/{server\.id}/g, message.guild!.id)
                .replace(/{server\.members}/g, message.guild!.memberCount.toString())

                // Rewards
                .replace(/{rewards}/g, levelUp.rewards.length > 0
                    ? levelUp.rewards.map((roleId: string) => `<@&${roleId}>`).join(', ')
                    : 'None')
                .replace(/{rewards\.count}/g, levelUp.rewards.length.toString())

                // Calculation info
                .replace(/{calculation\.base}/g, ExperienceCalculator.formatXp(result.calculation?.baseXp || 0))
                .replace(/{calculation\.multiplier}/g, (result.calculation?.multiplier || 1).toFixed(2))
                .replace(/{calculation\.final}/g, ExperienceCalculator.formatXp(result.calculation?.finalXp || 0));

            return customMessage;
        } catch (error) {
            logger.error('Error building custom level up message:', error);
            return null;
        }
    }

    /**
     * Get default level up message
     */
    private getDefaultLevelUpMessage(message: Message, result: any): string {
        const { currentLevel, levelUp } = result;
        let msg = `🎉 Congratulations ${message.author}! You've reached level **${currentLevel}**!`;

        if (levelUp.rewards.length > 0) {
            msg += `\n🎁 **Rewards:** ${levelUp.rewards.map((roleId: string) => `<@&${roleId}>`).join(', ')}`;
        }

        return msg;
    }
}

