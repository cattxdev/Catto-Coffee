/**
 * @fileoverview Server Info command - Display information about the current server
 * @author Catto Bot Team
 */

import { SlashCommandBuilder, EmbedBuilder, GuildVerificationLevel } from 'discord.js';
import { Command } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display information about this server'),

    guildOnly: true,
    cooldown: 10000, // 10 seconds

    async execute(interaction, client) {
        const guild = interaction.guild!;

        const verificationLevels: Record<GuildVerificationLevel, string> = {
            [GuildVerificationLevel.None]: 'None',
            [GuildVerificationLevel.Low]: 'Low',
            [GuildVerificationLevel.Medium]: 'Medium',
            [GuildVerificationLevel.High]: 'High',
            [GuildVerificationLevel.VeryHigh]: 'Very High',
        };

        const embed = new EmbedBuilder()
            .setColor(client.config.embeds.color.info)
            .setTitle(`📊 ${guild.name}`)
            .setThumbnail(guild.iconURL({ size: 1024 }))
            .addFields(
                { name: '🆔 Server ID', value: guild.id, inline: true },
                { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '👥 Members', value: guild.memberCount.toString(), inline: true },
                { name: '💬 Channels', value: guild.channels.cache.size.toString(), inline: true },
                { name: '😊 Emojis', value: guild.emojis.cache.size.toString(), inline: true },
                { name: '🎭 Roles', value: guild.roles.cache.size.toString(), inline: true },
                { name: '🔒 Verification', value: verificationLevels[guild.verificationLevel], inline: true },
                { name: '🚀 Boosts', value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true }
            )
            .setFooter(client.config.embeds.footer)
            .setTimestamp();

        if (guild.description) {
            embed.setDescription(guild.description);
        }

        await interaction.reply({ embeds: [embed] });
    },
};

export default command;
