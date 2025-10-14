/**
 * @fileoverview Component Handler - Manages buttons, select menus, and modals
 * @author Catto Bot Team
 */

import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { Collection, ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction } from 'discord.js';
import logger from '../utils/logger';
import { ButtonComponent, SelectMenuComponent, ModalComponent } from '../types';
import type { BotClient } from '../structures/BotClient';

/**
 * Component Handler Class
 * Manages loading and executing interactive components
 */
export class ComponentHandler {
    private client: BotClient;
    private componentsPath: string;

    constructor(client: BotClient) {
        this.client = client;
        this.componentsPath = join(__dirname, '../components');
    }

    /**
     * Load all components from the components directory
     */
    async loadComponents(): Promise<void> {
        try {
            logger.info('Loading components...');

            let totalLoaded = 0;

            // Load buttons
            if (this.client.config.features.buttons) {
                totalLoaded += await this.loadComponentType('buttons', this.client.buttons);
            }

            // Load select menus
            if (this.client.config.features.selectMenus) {
                totalLoaded += await this.loadComponentType('selectMenus', this.client.selectMenus);
            }

            // Load modals
            if (this.client.config.features.modals) {
                totalLoaded += await this.loadComponentType('modals', this.client.modals);
            }

            logger.info(`Successfully loaded ${totalLoaded} components`);
        } catch (error) {
            logger.error('Error loading components:', error);
            throw error;
        }
    }

    /**
     * Load a specific type of component
     * @param type - The component type (buttons, selectMenus, modals)
     * @param collection - The collection to store components in
     * @returns Number of components loaded
     */
    private async loadComponentType(
        type: string,
        collection: Collection<string, ButtonComponent | SelectMenuComponent | ModalComponent>
    ): Promise<number> {
        const componentPath = join(this.componentsPath, type);

        try {
            const componentFiles = readdirSync(componentPath)
                .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

            for (const file of componentFiles) {
                const filePath = join(componentPath, file);
                const fileURL = pathToFileURL(filePath).href;
                const componentModule = await import(fileURL);
                const component = componentModule.default || componentModule;

                // Validate component structure
                if (!this.validateComponent(component, type)) {
                    logger.warn(`Invalid component structure in ${type}/${file}`);
                    continue;
                }

                collection.set(component.customId, component);
                logger.debug(`Loaded ${type.slice(0, -1)}: ${component.customId}`);
            }

            logger.debug(`Loaded ${componentFiles.length} ${type}`);
            return componentFiles.length;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                logger.debug(`No ${type} directory found, skipping...`);
                return 0;
            }
            throw error;
        }
    }

    /**
     * Validate component structure
     * @param component - The component object to validate
     * @param type - The component type
     * @returns Whether the component is valid
     */
    private validateComponent(
        component: any,
        type: string
    ): component is ButtonComponent | SelectMenuComponent | ModalComponent {
        if (!component.customId) {
            logger.warn(`Component missing customId property in ${type}`);
            return false;
        }

        if (!component.execute || typeof component.execute !== 'function') {
            logger.warn(`Component ${component.customId} missing execute function`);
            return false;
        }

        return true;
    }

    /**
     * Execute a button interaction
     * @param interaction - The button interaction
     */
    async executeButton(interaction: ButtonInteraction): Promise<void> {
        // Support for dynamic custom IDs (e.g., "button_id:parameter")
        const customId = interaction.customId.split(':')[0];
        const button = this.client.buttons.get(customId) as ButtonComponent | undefined;

        if (!button) {
            logger.warn(`Button not found: ${customId}`);
            return;
        }

        try {
            await button.execute(interaction, this.client);
            logger.debug(`Button executed: ${customId} by ${interaction.user.tag}`);
        } catch (error) {
            logger.error(`Error executing button ${customId}:`, error);
            await this.handleComponentError(interaction, error as Error);
        }
    }

    /**
     * Execute a select menu interaction
     * @param interaction - The select menu interaction
     */
    async executeSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
        // Support for dynamic custom IDs
        const customId = interaction.customId.split(':')[0];
        const selectMenu = this.client.selectMenus.get(customId) as SelectMenuComponent | undefined;

        if (!selectMenu) {
            logger.warn(`Select menu not found: ${customId}`);
            return;
        }

        try {
            await selectMenu.execute(interaction, this.client);
            logger.debug(`Select menu executed: ${customId} by ${interaction.user.tag}`);
        } catch (error) {
            logger.error(`Error executing select menu ${customId}:`, error);
            await this.handleComponentError(interaction, error as Error);
        }
    }

    /**
     * Execute a modal submission
     * @param interaction - The modal interaction
     */
    async executeModal(interaction: ModalSubmitInteraction): Promise<void> {
        // Support for dynamic custom IDs
        const customId = interaction.customId.split(':')[0];
        const modal = this.client.modals.get(customId) as ModalComponent | undefined;

        if (!modal) {
            logger.warn(`Modal not found: ${customId}`);
            return;
        }

        try {
            await modal.execute(interaction, this.client);
            logger.debug(`Modal executed: ${customId} by ${interaction.user.tag}`);
        } catch (error) {
            logger.error(`Error executing modal ${customId}:`, error);
            await this.handleComponentError(interaction, error as Error);
        }
    }

    /**
     * Handle component execution errors
     * @param interaction - The interaction object
     * @param _error - The error that occurred
     */
    private async handleComponentError(
        interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
        _error: Error
    ): Promise<void> {
        const errorMessage = {
            content: '❌ There was an error processing this interaction!',
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
     * Reload all components
     */
    async reloadComponents(): Promise<void> {
        this.client.buttons.clear();
        this.client.selectMenus.clear();
        this.client.modals.clear();
        await this.loadComponents();
    }
}
