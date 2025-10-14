/**
 * @fileoverview Interaction Create event - Handles all interactions
 * @author Catto Bot Team
 */

import { Events, Interaction } from 'discord.js';
import { Event } from '../types';
import type { BotClient } from '../structures/BotClient';
import logger from '../utils/logger';

const event: Event = {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction, client: BotClient) {
        try {
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                await client.commandHandler.executeCommand(interaction);
            }

            // Handle autocomplete
            else if (interaction.isAutocomplete()) {
                await client.commandHandler.handleAutocomplete(interaction);
            }

            // Handle buttons
            else if (interaction.isButton()) {
                await client.componentHandler.executeButton(interaction);
            }

            // Handle select menus
            else if (interaction.isStringSelectMenu()) {
                await client.componentHandler.executeSelectMenu(interaction);
            }

            // Handle modals
            else if (interaction.isModalSubmit()) {
                await client.componentHandler.executeModal(interaction);
            }

            // Handle context menu commands
            else if (interaction.isContextMenuCommand()) {
                await client.commandHandler.executeCommand(interaction as any);
            }
        } catch (error) {
            logger.error('Error handling interaction:', error);
            
            const errorMessage = {
                content: '❌ An error occurred while processing your interaction!',
                ephemeral: true,
            };

            try {
                if (interaction.isRepliable()) {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorMessage);
                    } else {
                        await interaction.reply(errorMessage);
                    }
                }
            } catch (replyError) {
                logger.error('Failed to send error message:', replyError);
            }
        }
    },
};

export default event;
