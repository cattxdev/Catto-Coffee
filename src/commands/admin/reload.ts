/**
 * @fileoverview Reload command - Reload commands, events, or components (Owner only)
 * @author Catto Bot Team
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reload a command, event, or all components (Owner only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('command')
                .setDescription('Reload a specific command')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('The command name to reload')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('event')
                .setDescription('Reload a specific event')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('The event name to reload')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('components')
                .setDescription('Reload all components (buttons, select menus, modals)')
        ),

    ownerOnly: true,
    userPermissions: [PermissionFlagsBits.Administrator],

    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;
        
        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply({ ephemeral: true });

        try {
            if (subcommand === 'command') {
                const commandName = interaction.options.getString('name', true);
                const success = await client.commandHandler.reloadCommand(commandName);

                if (success) {
                    const embed = createSuccessEmbed(
                        'Command Reloaded',
                        `Successfully reloaded command: \`${commandName}\``
                    );
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    const embed = createErrorEmbed(
                        'Reload Failed',
                        `Failed to reload command: \`${commandName}\`\nCommand may not exist.`
                    );
                    await interaction.editReply({ embeds: [embed] });
                }
            } else if (subcommand === 'event') {
                const eventName = interaction.options.getString('name', true);
                const success = await client.eventHandler.reloadEvent(eventName);

                if (success) {
                    const embed = createSuccessEmbed(
                        'Event Reloaded',
                        `Successfully reloaded event: \`${eventName}\``
                    );
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    const embed = createErrorEmbed(
                        'Reload Failed',
                        `Failed to reload event: \`${eventName}\`\nEvent may not exist.`
                    );
                    await interaction.editReply({ embeds: [embed] });
                }
            } else if (subcommand === 'components') {
                await client.componentHandler.reloadComponents();
                const embed = createSuccessEmbed(
                    'Components Reloaded',
                    'Successfully reloaded all components!'
                );
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            const embed = createErrorEmbed(
                'Reload Error',
                `An error occurred while reloading: ${error}`
            );
            await interaction.editReply({ embeds: [embed] });
        }
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
