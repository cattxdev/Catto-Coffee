/**
 * @fileoverview Help command - Displays all available commands
 * @author Catto Bot Team
 */

import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { createErrorEmbed } from '../../utils/embeds';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all available commands')
        .addStringOption(option =>
            option
                .setName('command')
                .setDescription('Get detailed information about a specific command')
                .setRequired(false)
                .setAutocomplete(true)
        ),

    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;
        
        const commandName = interaction.options.getString('command');

        // Show specific command help
        if (commandName) {
            const command = client.commands.get(commandName);

            if (!command) {
                const embed = createErrorEmbed(
                    'Command Not Found',
                    `Command \`${commandName}\` not found.`
                );
                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true,
                });
                return;
            }

            const description = 'description' in command.data ? command.data.description : 'No description available';

            const embed = new EmbedBuilder()
                .setColor(client.config.embeds.color.info)
                .setTitle(`Command: /${command.data.name}`)
                .setDescription(description)
                .addFields(
                    { name: 'Category', value: command.category || 'Unknown', inline: true },
                    { name: 'Cooldown', value: `${(command.cooldown || 3000) / 1000}s`, inline: true }
                );

            if (command.userPermissions?.length) {
                embed.addFields({
                    name: 'Required Permissions',
                    value: command.userPermissions.join(', '),
                });
            }

            await interaction.reply({ embeds: [embed] });
            return;
        }

        // Show all commands grouped by category
        const categories = Array.from(client.categories.keys());

        const embed = new EmbedBuilder()
            .setColor(client.config.embeds.color.info)
            .setTitle(`${client.user!.username} - Help Menu`)
            .setDescription(
                `I have **${client.commands.size}** commands in **${categories.length}** categories.\n\n` +
                `Use \`/help <command>\` for detailed information about a specific command.`
            )
            .setThumbnail(client.user!.displayAvatarURL());

        // Add fields for each category
        for (const category of categories) {
            const commands = client.categories.get(category)!;
            const commandList = Array.from(commands.values())
                .map(cmd => `\`/${cmd.data.name}\``)
                .join(', ');

            embed.addFields({
                name: `${category.charAt(0).toUpperCase() + category.slice(1)} (${commands.size})`,
                value: commandList || 'No commands',
            });
        }

        if (client.config.embeds.footer.iconURL) {
            embed.setFooter({ text: client.config.embeds.footer.text, iconURL: client.config.embeds.footer.iconURL });
        } else {
            embed.setFooter({ text: client.config.embeds.footer.text });
        }
        embed.setTimestamp();

        // Create select menu for categories
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select a category for more details')
            .addOptions(
                categories.map(cat =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(cat.charAt(0).toUpperCase() + cat.slice(1))
                        .setDescription(`View ${cat} commands`)
                        .setValue(cat)
                        .setEmoji('📁')
                )
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(selectMenu);

        await interaction.reply({
            embeds: [embed],
            components: [row],
        });
    },

    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const commands = Array.from(client.commands.values()) as any[];

        const filtered = commands
            .filter(cmd => cmd.data.name.startsWith(focusedValue.toLowerCase()))
            .slice(0, 25)
            .map(cmd => ({
                name: cmd.data.name,
                value: cmd.data.name,
            }));

        await interaction.respond(filtered);
    },
};

export default command;
