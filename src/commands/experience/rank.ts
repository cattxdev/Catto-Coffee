/**
 * @fileoverview Rank Command - View your or another user's rank
 * @author Catto Bot Team
 */

import {
    SlashCommandBuilder,
    EmbedBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { ExperienceCalculator } from '../../modules/experience/services/ExperienceCalculator';
import logger from '../../utils/logger';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('View your rank or another user\'s rank in the server')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('User to check (leave empty for yourself)')
                .setRequired(false)
        )
        .setDMPermission(false),

    cooldown: 5000, // 5 seconds

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
            await interaction.deferReply();

            const textExpService = client.textExperience;
            if (!textExpService) {
                await interaction.editReply({
                    content: '❌ Experience system is not initialized!',
                });
                return;
            }

            // First, get the internal guild ID from the database
            const guild = await client.db.guild.findUnique({
                where: {
                    discordId: guildId,
                },
            });

            if (!guild) {
                await interaction.editReply({
                    content: '❌ This server is not registered in the database yet!',
                });
                return;
            }

            // Get user data from database using internal guild ID
            const member = await client.db.guildMember.findUnique({
                where: {
                    guildId_userDiscordId: {
                        guildId: guild.id, // Use internal database ID, not Discord ID
                        userDiscordId: targetUser.id,
                    },
                },
                include: {
                    user: true,
                },
            });

            if (!member || member.textTotalXp === 0) {
                await interaction.editReply({
                    content: targetUser.id === interaction.user.id
                        ? '❌ You haven\'t earned any XP yet! Start chatting to gain experience.'
                        : `❌ ${targetUser.username} hasn't earned any XP yet!`,
                });
                return;
            }

            // Get rank from Redis (super fast!)
            const rank = await textExpService.ranking.getUserRank(guildId, targetUser.id);
            const totalRanked = await textExpService.ranking.getTotalRankedUsers(guildId);

            // Calculate level progress
            const currentLevel = member.textLevel;
            const totalXp = member.textTotalXp;
            const currentLevelXp = ExperienceCalculator.getXpForCurrentLevel(totalXp);
            const xpForNextLevel = ExperienceCalculator.getXpRequiredForLevel(currentLevel + 1);
            const xpNeeded = xpForNextLevel - totalXp;
            const progress = (currentLevelXp / xpForNextLevel) * 100;

            // Create progress bar
            const progressBarLength = 20;
            const filledBars = Math.round((progress / 100) * progressBarLength);
            const emptyBars = progressBarLength - filledBars;
            const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

            // Get member for color
            const guildMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const memberColor = guildMember?.displayHexColor || '#5865F2';

            // Build embed
            const embed = new EmbedBuilder()
                .setAuthor({
                    name: `${targetUser.username}'s Rank`,
                    iconURL: targetUser.displayAvatarURL(),
                })
                .setColor(memberColor)
                .addFields(
                    {
                        name: '📊 Rank',
                        value: rank ? `#${rank} / ${totalRanked}` : 'Unranked',
                        inline: true,
                    },
                    {
                        name: '⭐ Level',
                        value: `${currentLevel}`,
                        inline: true,
                    },
                    {
                        name: '💎 Total XP',
                        value: totalXp.toLocaleString(),
                        inline: true,
                    },
                    {
                        name: '📈 Progress to Next Level',
                        value: `\`${progressBar}\` ${progress.toFixed(1)}%\n${currentLevelXp.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP (${xpNeeded.toLocaleString()} needed)`,
                        inline: false,
                    }
                )
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name}`,
                    iconURL: interaction.guild.iconURL() || undefined,
                });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error executing rank command:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ An error occurred: ${errorMessage}`,
                });
            } else {
                await interaction.reply({
                    content: `❌ An error occurred: ${errorMessage}`,
                    ephemeral: true,
                });
            }
        }
    },
};

export default command;
