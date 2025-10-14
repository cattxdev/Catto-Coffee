/**
 * @fileoverview Leaderboard Command - View server XP leaderboard
 * @author Catto Bot Team
 */

import {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ComponentType,
} from 'discord.js';
import { Command } from '../../types';
import { ExperienceCalculator } from '../../modules/experience/ExperienceCalculator';
import logger from '../../utils/logger';

const USERS_PER_PAGE = 10;

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server XP leaderboard')
        .addIntegerOption((option) =>
            option
                .setName('page')
                .setDescription('Page number to view')
                .setMinValue(1)
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

        const guildId = interaction.guild.id;
        const pageOption = interaction.options.get('page')?.value as number | undefined;
        let currentPage = (pageOption || 1) - 1; // 0-indexed

        try {
            await interaction.deferReply();

            const textExpService = client.textExperience;
            if (!textExpService) {
                await interaction.editReply({
                    content: '❌ Experience system is not initialized!',
                });
                return;
            }

            // Get total ranked users to calculate pages
            const totalUsers = await textExpService.ranking.getTotalRankedUsers(guildId);
            if (totalUsers === 0) {
                await interaction.editReply({
                    content: '❌ No users have earned XP yet!',
                });
                return;
            }

            const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);
            currentPage = Math.max(0, Math.min(currentPage, totalPages - 1)); // Clamp page

            // Create leaderboard embed
            const createLeaderboardEmbed = async (page: number) => {
                const offset = page * USERS_PER_PAGE;
                
                // Get top users from Redis (super fast!)
                const rankedUsers = await textExpService.ranking.getTopUsers(
                    guildId,
                    USERS_PER_PAGE,
                    offset
                );

                // Fetch user details
                const leaderboardText: string[] = [];
                for (const rankedUser of rankedUsers) {
                    const user = await client.users.fetch(rankedUser.userId).catch(() => null);
                    const username = user ? user.username : 'Unknown User';
                    const level = ExperienceCalculator.calculateLevel(rankedUser.totalXp);
                    
                    // Medal emojis for top 3
                    let rankDisplay = `\`#${rankedUser.rank}\``;
                    if (rankedUser.rank === 1) rankDisplay = '🥇';
                    else if (rankedUser.rank === 2) rankDisplay = '🥈';
                    else if (rankedUser.rank === 3) rankDisplay = '🥉';
                    
                    leaderboardText.push(
                        `${rankDisplay} **${username}** - Level ${level} (${rankedUser.totalXp.toLocaleString()} XP)`
                    );
                }

                const embed = new EmbedBuilder()
                    .setTitle(`📊 ${interaction.guild!.name} Leaderboard`)
                    .setDescription(leaderboardText.join('\n'))
                    .setColor(client.config.embeds.color.default)
                    .setFooter({
                        text: `Page ${page + 1} of ${totalPages} • ${totalUsers} total users`,
                        iconURL: interaction.guild!.iconURL() || undefined,
                    })
                    .setTimestamp();

                return embed;
            };

            // Create navigation buttons
            const createButtons = (page: number) => {
                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('leaderboard_first')
                            .setLabel('⏮️ First')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('leaderboard_prev')
                            .setLabel('◀️ Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('leaderboard_next')
                            .setLabel('Next ▶️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page >= totalPages - 1),
                        new ButtonBuilder()
                            .setCustomId('leaderboard_last')
                            .setLabel('Last ⏭️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page >= totalPages - 1)
                    );

                return row;
            };

            // Send initial embed
            const embed = await createLeaderboardEmbed(currentPage);
            const buttons = createButtons(currentPage);
            const message = await interaction.editReply({
                embeds: [embed],
                components: totalPages > 1 ? [buttons] : [],
            });

            // Only set up collector if there are multiple pages
            if (totalPages <= 1) return;

            // Button interaction collector
            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000, // 5 minutes
            });

            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.user.id !== interaction.user.id) {
                    await buttonInteraction.reply({
                        content: '❌ You cannot interact with this leaderboard!',
                        ephemeral: true,
                    });
                    return;
                }

                // Update page based on button
                switch (buttonInteraction.customId) {
                    case 'leaderboard_first':
                        currentPage = 0;
                        break;
                    case 'leaderboard_prev':
                        currentPage = Math.max(0, currentPage - 1);
                        break;
                    case 'leaderboard_next':
                        currentPage = Math.min(totalPages - 1, currentPage + 1);
                        break;
                    case 'leaderboard_last':
                        currentPage = totalPages - 1;
                        break;
                }

                // Update embed
                const newEmbed = await createLeaderboardEmbed(currentPage);
                const newButtons = createButtons(currentPage);

                await buttonInteraction.update({
                    embeds: [newEmbed],
                    components: [newButtons],
                });
            });

            collector.on('end', async () => {
                // Disable buttons after timeout
                const disabledRow = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        ...buttons.components.map((button) =>
                            ButtonBuilder.from(button).setDisabled(true)
                        )
                    );

                await message.edit({ components: [disabledRow] }).catch(() => {});
            });
        } catch (error) {
            logger.error('Error executing leaderboard command:', error);
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
