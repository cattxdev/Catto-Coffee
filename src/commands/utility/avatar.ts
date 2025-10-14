/**
 * @fileoverview Avatar command - Display user's avatar
 * @author Catto Bot Team
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Display a user\'s avatar')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user whose avatar to display')
                .setRequired(false)
        ),

    cooldown: 3000,

    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;
        
        const targetUser = interaction.options.getUser('user') || interaction.user;

        const embed = new EmbedBuilder()
            .setColor(client.config.embeds.color.info)
            .setTitle(`${targetUser.username}'s Avatar`)
            .setImage(targetUser.displayAvatarURL({ size: 4096 }))
            .setDescription(
                `[PNG](${targetUser.displayAvatarURL({ extension: 'png', size: 4096 })}) | ` +
                `[JPG](${targetUser.displayAvatarURL({ extension: 'jpg', size: 4096 })}) | ` +
                `[WEBP](${targetUser.displayAvatarURL({ extension: 'webp', size: 4096 })})`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

export default command;
