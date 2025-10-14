/**
 * @fileoverview Help category select menu component
 * @author Catto Bot Team
 */

import { StringSelectMenuInteraction, EmbedBuilder } from 'discord.js';
import { SelectMenuComponent } from '../../types';
import type { BotClient } from '../../structures/BotClient';

const component: SelectMenuComponent = {
    customId: 'help_category',

    async execute(interaction: StringSelectMenuInteraction, client: BotClient): Promise<void> {
        const category = interaction.values[0];
        const commands = client.categories.get(category);

        if (!commands) {
            await interaction.reply({
                content: '❌ Category not found!',
                ephemeral: true,
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(client.config.embeds.color.info)
            .setTitle(`📁 ${category.charAt(0).toUpperCase() + category.slice(1)} Commands`)
            .setDescription(`Here are all the commands in the **${category}** category:`)
            .setTimestamp();

        commands.forEach(cmd => {
            embed.addFields({
                name: `/${cmd.data.name}`,
                value: 'description' in cmd.data ? cmd.data.description : 'No description',
                inline: false,
            });
        });

        await interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    },
};

export default component;
