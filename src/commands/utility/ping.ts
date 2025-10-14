/**
 * @fileoverview Ping command - Simple test command to check bot latency
 * @author Catto Bot Team
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Command } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency and response time'),

    cooldown: 5000, // 5 seconds

    async execute(interaction, client) {
        const sent = await interaction.reply({
            content: '🏓 Pinging...',
            fetchReply: true,
        });

        const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = client.ws.ping;

        const embed = new EmbedBuilder()
            .setColor(client.config.embeds.color.success)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Roundtrip Latency', value: `\`${roundtripLatency}ms\``, inline: true },
                { name: 'WebSocket Latency', value: `\`${wsLatency}ms\``, inline: true }
            )
            .setFooter(client.config.embeds.footer)
            .setTimestamp();

        await interaction.editReply({
            content: null,
            embeds: [embed],
        });
    },
};

export default command;
