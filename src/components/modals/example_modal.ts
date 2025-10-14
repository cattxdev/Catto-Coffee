/**
 * @fileoverview Example modal component
 * @author Catto Bot Team
 */

import { ModalSubmitInteraction, EmbedBuilder } from 'discord.js';
import { ModalComponent } from '../../types';
import type { BotClient } from '../../structures/BotClient';

const component: ModalComponent = {
    customId: 'example_modal',

    async execute(interaction: ModalSubmitInteraction, client: BotClient) {
        const input = interaction.fields.getTextInputValue('input_field');

        const embed = new EmbedBuilder()
            .setColor(client.config.embeds.color.success)
            .setTitle('✅ Modal Submitted')
            .setDescription(`You entered: **${input}**`)
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    },
};

export default component;
