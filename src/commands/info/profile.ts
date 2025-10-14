/**
 * @fileoverview Example command showing database usage
 * @author Catto Bot Team
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types';

export default {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your profile and statistics')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to view (leave empty for yourself)')
                .setRequired(false)
        ),

    category: 'info',

    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;
        
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guild = interaction.guild;

        if (!guild) {
            await interaction.editReply('This command can only be used in a server!');
            return;
        }

        try {
            // Access database through client.db
            // Get or create user
            const user = await client.db.user.upsert({
                where: { discordId: targetUser.id },
                create: { discordId: targetUser.id },
                update: {},
            });

            // Get or create guild
            const dbGuild = await client.db.guild.upsert({
                where: { discordId: guild.id },
                create: { 
                    discordId: guild.id,
                    name: guild.name
                },
                update: { name: guild.name },
            });

            // Get guild member stats
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

            // Create embed with stats
            const embed = new EmbedBuilder()
                .setColor(client.config.embeds.color.info)
                .setAuthor({ 
                    name: targetUser.tag, 
                    iconURL: targetUser.displayAvatarURL() 
                })
                .setTitle('📊 User Profile')
                .addFields(
                    {
                        name: '🌍 Global Stats',
                        value: [
                            `**Level:** ${user.globalLevel}`,
                            `**Experience:** ${user.globalExperience.toLocaleString()}`,
                            `**Total Messages:** ${user.totalMessagesCount.toLocaleString()}`,
                            `**Total Voice Time:** ${formatTime(user.totalVoiceTimeSeconds)}`,
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '💬 Server Text Stats',
                        value: [
                            `**Level:** ${member.textLevel}`,
                            `**XP:** ${member.textXp.toLocaleString()} / ${getXpForLevel(member.textLevel + 1).toLocaleString()}`,
                            `**Total XP:** ${member.textTotalXp.toLocaleString()}`,
                            `**Messages:** ${member.textMessageCount.toLocaleString()}`,
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '🎤 Server Voice Stats',
                        value: [
                            `**Level:** ${member.voiceLevel}`,
                            `**XP:** ${member.voiceXp.toLocaleString()} / ${getXpForLevel(member.voiceLevel + 1).toLocaleString()}`,
                            `**Total XP:** ${member.voiceTotalXp.toLocaleString()}`,
                            `**Voice Time:** ${formatTime(member.voiceTimeSeconds)}`,
                        ].join('\n'),
                        inline: true,
                    }
                )
                .setTimestamp()
                .setFooter(client.config.embeds.footer);

            if (user.bio) {
                embed.setDescription(`*"${user.bio}"*`);
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching profile:', error);
            await interaction.editReply('An error occurred while fetching the profile.');
        }
    },
} satisfies Command;

/**
 * Calculate XP required for a level
 */
function getXpForLevel(level: number): number {
    return level * level * 100;
}

/**
 * Format seconds into human-readable time
 */
function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
