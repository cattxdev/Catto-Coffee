/**
 * @fileoverview Event Handler - Loads and manages Discord events
 * @author Catto Bot Team
 */

import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import logger from '../utils/logger';
import { Event } from '../types';
import type { BotClient } from '../structures/BotClient';

/**
 * Event Handler Class
 * Manages loading and executing Discord events
 */
export class EventHandler {
    private client: BotClient;
    private eventsPath: string;

    constructor(client: BotClient) {
        this.client = client;
        this.eventsPath = join(__dirname, '../events');
    }

    /**
     * Load all events from the events directory
     */
    async loadEvents(): Promise<void> {
        try {
            logger.info('Loading events...');

            const eventFiles = readdirSync(this.eventsPath)
                .filter(file => file.endsWith('.ts') || file.endsWith('.js'));

            let eventCount = 0;

            for (const file of eventFiles) {
                const filePath = join(this.eventsPath, file);
                const fileURL = pathToFileURL(filePath).href;
                const eventModule = await import(fileURL);
                const event: Event = eventModule.default || eventModule;

                // Validate event structure
                if (!this.validateEvent(event)) {
                    logger.warn(`Invalid event structure in ${file}`);
                    continue;
                }

                // Register event listener
                if (event.once) {
                    this.client.once(event.name, (...args: any[]) => event.execute(...args, this.client));
                } else {
                    this.client.on(event.name, (...args: any[]) => event.execute(...args, this.client));
                }

                eventCount++;
                logger.debug(`Loaded event: ${event.name} (once: ${event.once || false})`);
            }

            logger.info(`Successfully loaded ${eventCount} events`);
        } catch (error) {
            logger.error('Error loading events:', error);
            throw error;
        }
    }

    /**
     * Validate event structure
     * @param event - The event object to validate
     * @returns Whether the event is valid
     */
    private validateEvent(event: any): event is Event {
        if (!event.name) {
            logger.warn('Event missing name property');
            return false;
        }

        if (!event.execute || typeof event.execute !== 'function') {
            logger.warn(`Event ${event.name} missing execute function`);
            return false;
        }

        return true;
    }

    /**
     * Reload a specific event
     * @param eventName - The name of the event file to reload
     * @returns Whether reload was successful
     */
    async reloadEvent(eventName: string): Promise<boolean> {
        try {
            const eventPath = join(this.eventsPath, `${eventName}.ts`);
            delete require.cache[require.resolve(eventPath)];
            
            const eventModule = await import(eventPath);
            const event: Event = eventModule.default || eventModule;

            if (!this.validateEvent(event)) {
                return false;
            }

            // Remove all listeners for this event
            this.client.removeAllListeners(event.name);

            // Re-register event listener
            if (event.once) {
                this.client.once(event.name, (...args: any[]) => event.execute(...args, this.client));
            } else {
                this.client.on(event.name, (...args: any[]) => event.execute(...args, this.client));
            }

            logger.info(`Reloaded event: ${event.name}`);
            return true;
        } catch (error) {
            logger.error(`Error reloading event ${eventName}:`, error);
            return false;
        }
    }

    /**
     * Get all registered events
     * @returns Array of event names
     */
    getRegisteredEvents(): (string | symbol)[] {
        return this.client.eventNames();
    }

    /**
     * Get listener count for a specific event
     * @param eventName - The event name
     * @returns Number of listeners
     */
    getListenerCount(eventName: string | symbol): number {
        return this.client.listenerCount(eventName);
    }
}
