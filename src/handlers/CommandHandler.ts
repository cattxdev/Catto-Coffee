/**
 * @fileoverview Command Handler - Loads and manages slash commands
 * @author Catto Bot Team
 */

import { REST, Routes, Collection, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import logger from '../utils/logger';
import { Command } from '../types';
import type { BotClient } from '../structures/BotClient';

/**
 * Command Handler Class
 * Manages loading, registering, and executing commands
 */
export class CommandHandler {
    private client: BotClient;
    private commandsPath: string;

    constructor(client: BotClient) {
        this.client = client;
        this.commandsPath = join(__dirname, '../commands');
    }

    /**
     * Load all commands from the commands directory
     */
    async loadCommands(): Promise<void> {
        try {
            logger.info('Loading commands...');

            const commandFolders = readdirSync(this.commandsPath).filter(file => {
                const filePath = join(this.commandsPath, file);
                return statSync(filePath).isDirectory();
            });

            let commandCount = 0;

            for (const folder of commandFolders) {
                const commandFiles = readdirSync(join(this.commandsPath, folder))
                    .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

                for (const file of commandFiles) {
                    const filePath = join(this.commandsPath, folder, file);
                    const fileURL = pathToFileURL(filePath).href;
                    const commandModule = await import(fileURL);
                    const command: Command = commandModule.default || commandModule;

                    // Validate command structure
                    if (!this.validateCommand(command)) {
                        logger.warn(`Invalid command structure in ${file}`);
                        continue;
                    }

                    // Add category to command
                    command.category = folder;

                    // Store command
                    this.client.commands.set(command.data.name, command);

                    // Add to category collection
                    if (!this.client.categories.has(folder)) {
                        this.client.categories.set(folder, new Collection());
                    }
                    this.client.categories.get(folder)!.set(command.data.name, command);

                    commandCount++;
                    logger.debug(`Loaded command: ${command.data.name} (${folder})`);
                }
            }

            logger.info(`Successfully loaded ${commandCount} commands from ${commandFolders.length} categories`);

            // Register commands with Discord
            if (this.client.config.commands.registerGlobally || this.client.config.devGuildId) {
                await this.registerCommands();
            }
        } catch (error) {
            logger.error('Error loading commands:', error);
            throw error;
        }
    }

    /**
     * Validate command structure
     * @param command - The command object to validate
     * @returns Whether the command is valid
     */
    private validateCommand(command: any): command is Command {
        if (!command.data) {
            logger.warn('Command missing data property');
            return false;
        }

        if (!command.data.name) {
            logger.warn('Command missing name');
            return false;
        }

        if (!command.execute || typeof command.execute !== 'function') {
            logger.warn(`Command ${command.data.name} missing execute function`);
            return false;
        }

        return true;
    }

    /**
     * Register commands with Discord API
     */
    async registerCommands(): Promise<void> {
        try {
            const commands = Array.from(this.client.commands.values()).map(cmd => cmd.data.toJSON());

            const rest = new REST({ version: '10' }).setToken(this.client.config.token);

            logger.info('Started refreshing application (/) commands.');

            if (this.client.config.devGuildId && !this.client.config.commands.registerGlobally) {
                // Register to development guild only
                await rest.put(
                    Routes.applicationGuildCommands(this.client.config.clientId, this.client.config.devGuildId),
                    { body: commands }
                );
                logger.info(`Successfully registered ${commands.length} commands to development guild.`);
            } else {
                // Register globally
                await rest.put(
                    Routes.applicationCommands(this.client.config.clientId),
                    { body: commands }
                );
                logger.info(`Successfully registered ${commands.length} commands globally.`);
            }
        } catch (error) {
            logger.error('Error registering commands:', error);
            throw error;
        }
    }

    /**
     * Execute a command
     * @param interaction - The interaction object
     */
    async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const command = this.client.commands.get(interaction.commandName);

        if (!command) {
            logger.warn(`Command not found: ${interaction.commandName}`);
            return;
        }

        try {
            // Run all preconditions
            const preconditionResult = await this.client.preconditionManager.runPreconditions({
                interaction,
                client: this.client,
                commandName: interaction.commandName,
            });

            if (!preconditionResult.success) {
                await interaction.reply({
                    content: preconditionResult.message || '❌ You cannot run this command.',
                    ephemeral: true,
                });
                return;
            }

            // Execute command
            await command.execute(interaction, this.client);

            logger.info(`Command executed: ${interaction.commandName} by ${interaction.user.tag}`);
        } catch (error) {
            logger.error(`Error executing command ${interaction.commandName}:`, error);
            await this.handleCommandError(interaction, error as Error);
        }
    }

    /**
     * Handle autocomplete interactions
     * @param interaction - The autocomplete interaction
     */
    async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
        const command = this.client.commands.get(interaction.commandName);

        if (!command || !command.autocomplete) {
            return;
        }

        try {
            await command.autocomplete(interaction, this.client);
        } catch (error) {
            logger.error(`Error in autocomplete for ${interaction.commandName}:`, error);
        }
    }

    /**
     * Handle command execution errors
     * @param interaction - The interaction object
     * @param _error - The error that occurred
     */
    private async handleCommandError(interaction: ChatInputCommandInteraction, _error: Error): Promise<void> {
        const errorMessage = {
            content: '❌ There was an error executing this command!',
            ephemeral: true,
        };

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        } catch (e) {
            logger.error('Error sending error message:', e);
        }
    }

    /**
     * Reload a specific command
     * @param commandName - The name of the command to reload
     * @returns Whether reload was successful
     */
    async reloadCommand(commandName: string): Promise<boolean> {
        const command = this.client.commands.get(commandName);
        
        if (!command || !command.category) {
            return false;
        }

        try {
            const commandPath = join(this.commandsPath, command.category, `${commandName}.ts`);
            delete require.cache[require.resolve(commandPath)];
            
            const commandModule = await import(commandPath);
            const newCommand: Command = commandModule.default || commandModule;
            newCommand.category = command.category;
            
            this.client.commands.set(newCommand.data.name, newCommand);
            this.client.categories.get(command.category)!.set(newCommand.data.name, newCommand);

            logger.info(`Reloaded command: ${commandName}`);
            return true;
        } catch (error) {
            logger.error(`Error reloading command ${commandName}:`, error);
            return false;
        }
    }
}
