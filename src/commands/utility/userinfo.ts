/**
 * @fileoverview User Info command - Display information about a user
 * @author Catto Bot Team
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Display information about a user')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to get information about')
                .setRequired(false)
        ),

    guildOnly: true,
    cooldown: 5000, // 5 seconds

    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.guild) return;
        
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id);

        const roles = member.roles.cache
            .filter(role => role.id !== interaction.guild!.id)
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString())
            .slice(0, 20);

        const embed = new EmbedBuilder()
            .setColor(member.displayHexColor || client.config.embeds.color.info)
            .setTitle(`👤 ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
            .addFields(
                { name: '🆔 User ID', value: targetUser.id, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`, inline: true },
                { name: '🎨 Nickname', value: member.nickname || 'None', inline: true },
                { name: '🤖 Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true },
                { name: `🎭 Roles [${roles.length}]`, value: roles.join(', ') || 'None' }
            );

        if (client.config.embeds.footer.iconURL) {
            embed.setFooter({ text: client.config.embeds.footer.text, iconURL: client.config.embeds.footer.iconURL });
        } else {
            embed.setFooter({ text: client.config.embeds.footer.text });
        }
        embed.setTimestamp();

        if (member.premiumSince) {
            embed.addFields({
                name: '💎 Boosting Since',
                value: `<t:${Math.floor(member.premiumSinceTimestamp! / 1000)}:R>`,
                inline: true,
            });
        }

        await interaction.reply({ embeds: [embed] });
    },
};

export default command;
