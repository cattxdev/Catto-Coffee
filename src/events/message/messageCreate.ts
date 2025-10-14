/**
 * @fileoverview Message Create Event - Handles text XP
 * @author Catto Bot Team
 */

import { Events, Message } from 'discord.js';
import type { BotClient } from '../../structures/BotClient';
import type { Event } from '../../types';

// Cooldown map to prevent XP spam
const xpCooldowns = new Map<string, number>();

export default {
    name: Events.MessageCreate,
    
    async execute(message: Message, client: BotClient) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        const cooldownKey = `${message.guild.id}-${message.author.id}`;
        const now = Date.now();
        const cooldownAmount = 60000; // 60 seconds

        // Check cooldown
        if (xpCooldowns.has(cooldownKey)) {
            const expirationTime = xpCooldowns.get(cooldownKey)! + cooldownAmount;
            if (now < expirationTime) {
                return; // Still on cooldown
            }
        }

        try {
            // Get or create guild
            const dbGuild = await client.db.guild.upsert({
                where: { discordId: message.guild.id },
                create: { 
                    discordId: message.guild.id,
                    name: message.guild.name
                },
                update: { name: message.guild.name },
            });

            // Check if XP is enabled
            const xpConfig = await client.db.experienceConfig.findUnique({
                where: {
                    guildId_type: {
                        guildId: dbGuild.id,
                        type: 'TEXT'
                    }
                }
            });

            // Skip if disabled
            if (xpConfig && !xpConfig.isEnabled) return;

            // Get or create user
            const user = await client.db.user.upsert({
                where: { discordId: message.author.id },
                create: { discordId: message.author.id },
                update: { lastSeenAt: new Date() },
            });

            // Get or create guild member
            const member = await client.db.guildMember.upsert({
                where: {
                    guildId_userDiscordId: {
                        guildId: dbGuild.id,
                        userDiscordId: user.discordId,
                    },
                },
                create: {
                    guildId: dbGuild.id,
                    userId: user.id,
                    userDiscordId: user.discordId,
                },
                update: {},
            });

            // Calculate XP to award
            const minXp = xpConfig?.minXp || 15;
            const maxXp = xpConfig?.maxXp || 25;
            const xpToAward = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;

            // Check for multipliers
            const multipliers = await client.db.experienceMultiplier.findMany({
                where: {
                    guildId: dbGuild.id,
                    type: 'TEXT',
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                }
            });

            let multiplierBonus = 0;
            for (const mult of multipliers) {
                // Check if multiplier applies to this user/channel/role
                if (mult.targetType === 'channel' && mult.targetId === message.channel.id) {
                    multiplierBonus += mult.multiplierBps - 100;
                }
                // Add more checks for role and user multipliers as needed
            }

            const finalXp = Math.floor(xpToAward * (1 + multiplierBonus / 100));

            // Update member stats
            const newTextXp = member.textXp + finalXp;
            const newTextTotalXp = member.textTotalXp + finalXp;
            const newTextLevel = calculateLevel(newTextTotalXp);
            const leveledUp = newTextLevel > member.textLevel;

            await client.db.guildMember.update({
                where: { id: member.id },
                data: {
                    textXp: newTextXp,
                    textTotalXp: newTextTotalXp,
                    textLevel: newTextLevel,
                    textMessageCount: { increment: 1 },
                    dailyTextMessages: { increment: 1 },
                    weeklyTextMessages: { increment: 1 },
                    monthlyTextMessages: { increment: 1 },
                    lastMessageAt: new Date(),
                }
            });

            // Update global stats
            await client.db.user.update({
                where: { id: user.id },
                data: {
                    globalExperience: { increment: finalXp },
                    totalMessagesCount: { increment: 1 },
                }
            });

            // Handle level up
            if (leveledUp) {
                // Log audit
                await client.db.auditLog.create({
                    data: {
                        guildId: dbGuild.id,
                        userId: user.id,
                        action: 'LEVEL_UP',
                        metadata: {
                            type: 'TEXT',
                            oldLevel: member.textLevel,
                            newLevel: newTextLevel
                        }
                    }
                });

                // Check for level rewards
                const rewards = await client.db.levelReward.findMany({
                    where: {
                        guildId: dbGuild.id,
                        type: 'TEXT',
                        level: newTextLevel
                    }
                });

                // Award roles (implement role assignment logic here)
                if (rewards.length > 0 && xpConfig?.announceLevel) {
                    const guildMember = message.guild.members.cache.get(message.author.id);
                    if (guildMember) {
                        for (const reward of rewards) {
                            try {
                                await guildMember.roles.add(reward.roleId);
                            } catch (error) {
                                console.error('Failed to award role:', error);
                            }
                        }
                    }
                }

                // Send level up message
                if (xpConfig?.announceLevel) {
                    const msg = xpConfig.announceMessage
                        ?.replace('{user}', message.author.toString())
                        ?.replace('{level}', newTextLevel.toString())
                        || `🎉 Congratulations ${message.author}! You've reached level **${newTextLevel}**!`;

                    if (xpConfig.announceChannelId) {
                        const channel = message.guild.channels.cache.get(xpConfig.announceChannelId);
                        if (channel && channel.isTextBased()) {
                            await channel.send(msg);
                        }
                    } else {
                        await message.reply(msg);
                    }
                }
            }

            // Set cooldown
            xpCooldowns.set(cooldownKey, now);
            setTimeout(() => xpCooldowns.delete(cooldownKey), cooldownAmount);

        } catch (error) {
            console.error('Error processing message XP:', error);
        }
    },
} satisfies Event;

/**
 * Calculate level from total XP
 * Formula: level = floor(sqrt(totalXp / 100))
 */
function calculateLevel(totalXp: number): number {
    return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}
