/**
 * @fileoverview Text Leaderboard Image Command
 * @author Catto Bot Team
 */

import {
    SlashCommandBuilder,
    AttachmentBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { TextLeaderboardCard, TextLeaderboardEntry } from '../../modules/experience/classes/TextLeaderboardCard';
import { ExperienceRankingService } from '../../modules/experience/services/ExperienceRankingService';
import logger from '../../utils/logger';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server XP leaderboard as an image')
        .setDMPermission(false),

    cooldown: 10000, // 10 seconds (image generation is intensive)

    async execute(interaction, client) {
        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ This command can only be used in a server!',
                ephemeral: true,
            });
            return;
        }

        const startTime = Date.now();

        try {
            await interaction.deferReply();

            const guildId = interaction.guild.id;
            const userId = interaction.user.id;

            // Get guild from database
            const guild = await client.db.guild.findUnique({
                where: { discordId: guildId },
            });

            if (!guild) {
                await interaction.editReply({
                    content: '❌ This server is not registered yet.',
                });
                return;
            }

            // Get ranking service
            const redisService = client.redis;
            if (!redisService) {
                await interaction.editReply({
                    content: '❌ Redis service is not available.',
                });
                return;
            }

            const rankingService = new ExperienceRankingService(redisService);

            // Get top 10 users - Use Discord guild ID, not internal database ID
            const top10Data = await rankingService.getTopUsers(guild.discordId, 10);

            if (top10Data.length === 0) {
                await interaction.editReply({
                    content: '❌ No users have earned XP yet in this server.',
                });
                return;
            }

            // Fetch user data from database in parallel
            const userIds: string[] = top10Data.map((entry) => entry.userId);
            const guildMembers = await client.db.guildMember.findMany({
                where: {
                    guildId: guild.id,
                    userDiscordId: { in: userIds },
                },
            });

            // Fetch Discord users in parallel
            const discordUsers = await Promise.all(
                userIds.map((id: string) =>
                    client.users.fetch(id).catch(() => null)
                )
            );

            // Build leaderboard entries
            const entries: TextLeaderboardEntry[] = top10Data
                .map((entry, index: number) => {
                    const member = guildMembers.find((m) => m.userDiscordId === entry.userId);
                    const discordUser = discordUsers[index];

                    if (!discordUser) return null;

                    return {
                        userId: entry.userId,
                        username: discordUser.username,
                        discriminator: discordUser.discriminator,
                        avatarUrl: discordUser.displayAvatarURL({
                            extension: 'png',
                            size: 128,
                        }),
                        level: member?.textLevel || 1,
                        totalXp: entry.totalXp,
                        rank: entry.rank,
                    };
                })
                .filter((e: TextLeaderboardEntry | null): e is TextLeaderboardEntry => e !== null);

            if (entries.length === 0) {
                await interaction.editReply({
                    content: '❌ Could not load leaderboard data.',
                });
                return;
            }

            // Get requesting user's rank - Use Discord guild ID
            let requestingUserEntry: TextLeaderboardEntry | undefined;
            const userRank = await rankingService.getUserRank(guild.discordId, userId);
            const userScore = await rankingService.getUserScore(guild.discordId, userId);

            if (userRank && userScore !== null) {
                const requestingUserMember = await client.db.guildMember.findUnique({
                    where: {
                        guildId_userDiscordId: {
                            guildId: guild.id,
                            userDiscordId: userId,
                        },
                    },
                });

                const requestingDiscordUser = await client.users.fetch(userId);

                if (requestingUserMember && requestingDiscordUser) {
                    requestingUserEntry = {
                        userId,
                        username: requestingDiscordUser.username,
                        discriminator: requestingDiscordUser.discriminator,
                        avatarUrl: requestingDiscordUser.displayAvatarURL({
                            extension: 'png',
                            size: 128,
                        }),
                        level: requestingUserMember.textLevel,
                        totalXp: userScore,
                        rank: userRank,
                    };
                }
            }

            const fetchTime = Date.now() - startTime;
            logger.info(`Fetched leaderboard data in ${fetchTime}ms`);

            // Generate image
            const imageBuffer = await TextLeaderboardCard.generate({
                entries,
                requestingUser: requestingUserEntry,
                guildName: interaction.guild.name,
            });

            const totalTime = Date.now() - startTime;
            logger.info(`Generated leaderboard image in ${totalTime}ms total`);

            // Send image
            const attachment = new AttachmentBuilder(imageBuffer, {
                name: 'leaderboard.png',
            });

            await interaction.editReply({
                content: `🏆 **${interaction.guild.name} - Text XP Leaderboard**\n\n_Generated in ${totalTime}ms_`,
                files: [attachment],
            });

        } catch (error) {
            logger.error('Error generating leaderboard image:', error);

            await interaction.editReply({
                content: '❌ An error occurred while generating the leaderboard image. Please try again later.',
            });
        }
    },
};

export default command;
