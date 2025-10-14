/**
 * @fileoverview Debug Rank Command - Detailed diagnostics for XP system
 * @author Catto Bot Team
 */

import {
    SlashCommandBuilder,
    EmbedBuilder,
} from 'discord.js';
import { Command } from '../../types';
import logger from '../../utils/logger';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('debugrank')
        .setDescription('[DEBUG] Detailed diagnostics for rank system')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('User to debug')
                .setRequired(false)
        )
        .setDMPermission(false),

    cooldown: 5000,

    async execute(interaction, client) {
        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ This command can only be used in a server!',
                ephemeral: true,
            });
            return;
        }

        const targetUser = interaction.options.get('user')?.user || interaction.user;
        const guildId = interaction.guild.id;

        try {
            await interaction.deferReply({ ephemeral: true });

            const textExpService = client.textExperience;
            if (!textExpService) {
                await interaction.editReply({
                    content: '❌ Experience system is not initialized!',
                });
                return;
            }

            const debugInfo: string[] = [];
            debugInfo.push(`🔍 **Debug Information for ${targetUser.username}**`);
            debugInfo.push(`Discord ID: \`${targetUser.id}\``);
            debugInfo.push(`Guild Discord ID: \`${guildId}\``);
            debugInfo.push('');

            // 0. Get internal guild ID
            debugInfo.push('**0️⃣ Guild Lookup:**');
            const guild = await client.db.guild.findUnique({
                where: {
                    discordId: guildId,
                },
            });

            if (guild) {
                debugInfo.push('✅ Guild found in database!');
                debugInfo.push(`   Internal Guild ID: \`${guild.id}\``);
                debugInfo.push(`   Discord Guild ID: \`${guild.discordId}\``);
            } else {
                debugInfo.push('❌ Guild not found in database');
                await interaction.editReply({
                    content: '❌ Guild not registered in database!',
                });
                return;
            }
            debugInfo.push('');

            // 1. Check database by userDiscordId
            debugInfo.push('**1️⃣ Database Lookup (by userDiscordId):**');
            try {
                const memberByDiscordId = await client.db.guildMember.findUnique({
                    where: {
                        guildId_userDiscordId: {
                            guildId: guild.id, // Use internal ID
                            userDiscordId: targetUser.id,
                        },
                    },
                    include: {
                        user: true,
                        guild: true,
                    },
                });

                if (memberByDiscordId) {
                    debugInfo.push('✅ Found in database!');
                    debugInfo.push(`   Internal User ID: \`${memberByDiscordId.userId}\``);
                    debugInfo.push(`   User Discord ID: \`${memberByDiscordId.userDiscordId}\``);
                    debugInfo.push(`   Internal Guild ID: \`${memberByDiscordId.guildId}\``);
                    debugInfo.push(`   Guild Discord ID: \`${memberByDiscordId.guild.discordId}\``);
                    debugInfo.push(`   Text Total XP: \`${memberByDiscordId.textTotalXp}\``);
                    debugInfo.push(`   Text Level: \`${memberByDiscordId.textLevel}\``);
                    debugInfo.push(`   Message Count: \`${memberByDiscordId.textMessageCount}\``);
                } else {
                    debugInfo.push('❌ Not found in database by userDiscordId');
                }
            } catch (error) {
                debugInfo.push(`❌ Database error: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
            debugInfo.push('');

            // 2. Check all members with this Discord ID
            debugInfo.push('**2️⃣ All GuildMembers with this Discord ID:**');
            try {
                const allMembers = await client.db.guildMember.findMany({
                    where: {
                        userDiscordId: targetUser.id,
                    },
                    include: {
                        guild: true,
                    },
                });

                if (allMembers.length > 0) {
                    debugInfo.push(`Found ${allMembers.length} member record(s):`);
                    for (const member of allMembers) {
                        debugInfo.push(`   Guild: ${member.guild.discordId} | XP: ${member.textTotalXp} | Level: ${member.textLevel}`);
                    }
                } else {
                    debugInfo.push('❌ No members found with this Discord ID');
                }
            } catch (error) {
                debugInfo.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
            debugInfo.push('');

            // 3. Check Redis ranking
            debugInfo.push('**3️⃣ Redis Ranking Lookup:**');
            try {
                const rank = await textExpService.ranking.getUserRank(guildId, targetUser.id);
                const score = await textExpService.ranking.getUserScore(guildId, targetUser.id);
                const totalRanked = await textExpService.ranking.getTotalRankedUsers(guildId);

                debugInfo.push(`   Rank: ${rank ? `#${rank}` : '❌ Not ranked'}`);
                debugInfo.push(`   Score (XP): ${score !== null ? score : '❌ No score'}`);
                debugInfo.push(`   Total Ranked Users: ${totalRanked}`);
            } catch (error) {
                debugInfo.push(`❌ Redis error: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
            debugInfo.push('');

            // 4. Check Redis raw data
            debugInfo.push('**4️⃣ Redis Raw Data:**');
            try {
                const redisKey = `leaderboard:${guildId}`;
                debugInfo.push(`   Key: \`${redisKey}\``);
                
                // Get top 5 entries
                const topEntries = await client.redis.zrevrange(redisKey, 0, 4, true);
                if (topEntries.length > 0) {
                    debugInfo.push(`   Top 5 entries:`);
                    for (let i = 0; i < topEntries.length; i += 2) {
                        const userId = topEntries[i];
                        const xp = topEntries[i + 1];
                        debugInfo.push(`      ${userId.substring(0, 20)}... → ${xp} XP`);
                    }
                } else {
                    debugInfo.push('   ❌ No entries in Redis leaderboard');
                }

                // Check if our user is in there with exact ID
                const userScore = await client.redis.zscore(redisKey, targetUser.id);
                debugInfo.push(`   Direct lookup for ${targetUser.id}: ${userScore !== null ? `${userScore} XP` : '❌ Not found'}`);
            } catch (error) {
                debugInfo.push(`❌ Redis raw error: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
            debugInfo.push('');

            // 5. Recommendations
            debugInfo.push('**5️⃣ Recommendations:**');
            const memberExists = await client.db.guildMember.findUnique({
                where: {
                    guildId_userDiscordId: {
                        guildId: guild.id, // Use internal ID
                        userDiscordId: targetUser.id,
                    },
                },
            });

            if (!memberExists) {
                debugInfo.push('⚠️ User not in database - needs to send a message first');
            } else if (memberExists.textTotalXp === 0) {
                debugInfo.push('⚠️ User has 0 XP - needs to send messages to gain XP');
            } else {
                const redisScore = await textExpService.ranking.getUserScore(guildId, targetUser.id);
                if (redisScore === null) {
                    debugInfo.push('⚠️ User in database but not in Redis - syncing needed');
                    debugInfo.push('   Attempting to sync now...');
                    try {
                        await textExpService.ranking.updateUserScore(
                            guildId,
                            targetUser.id,
                            memberExists.textTotalXp
                        );
                        debugInfo.push('   ✅ Synced! Try `/rank` again.');
                    } catch (error) {
                        debugInfo.push(`   ❌ Sync failed: ${error instanceof Error ? error.message : 'Unknown'}`);
                    }
                } else if (redisScore !== memberExists.textTotalXp) {
                    debugInfo.push('⚠️ Redis and Database are out of sync');
                    debugInfo.push(`   Database: ${memberExists.textTotalXp} XP`);
                    debugInfo.push(`   Redis: ${redisScore} XP`);
                    debugInfo.push('   Syncing...');
                    try {
                        await textExpService.ranking.updateUserScore(
                            guildId,
                            targetUser.id,
                            memberExists.textTotalXp
                        );
                        debugInfo.push('   ✅ Synced!');
                    } catch (error) {
                        debugInfo.push(`   ❌ Sync failed: ${error instanceof Error ? error.message : 'Unknown'}`);
                    }
                } else {
                    debugInfo.push('✅ Everything looks correct!');
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🔍 Rank System Debug')
                .setDescription(debugInfo.join('\n'))
                .setColor(0x00ff00)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error executing debugrank command:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            
            await interaction.editReply({
                content: `❌ Debug command failed: ${errorMessage}`,
            });
        }
    },
};

export default command;
