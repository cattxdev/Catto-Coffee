/**
 * @fileoverview Error Handler - Global error handling and logging
 * @author Catto Bot Team
 */

import { EmbedBuilder, User } from 'discord.js';
import logger from '../utils/logger';
import { ErrorContext } from '../types';
import type { BotClient } from '../structures/BotClient';

/**
 * Error Handler Class
 * Manages global error handling for the bot
 */
export class ErrorHandler {
    private client: BotClient;

    constructor(client: BotClient) {
        this.client = client;
    }

    /**
     * Setup global error handlers
     */
    setupGlobalHandlers(): void {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error: Error) => {
            logger.error('Uncaught Exception:', error);
            this.logErrorDetails(error);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            this.logErrorDetails(reason);
        });

        // Handle Discord.js warnings
        this.client.on('warn', (warning: string) => {
            logger.warn('Discord.js Warning:', warning);
        });

        // Handle Discord.js errors
        this.client.on('error', (error: Error) => {
            logger.error('Discord.js Error:', error);
            this.logErrorDetails(error);
        });

        // Handle rate limits
        this.client.rest.on('rateLimited', (info: any) => {
            logger.warn('Rate Limited:', {
                timeout: info.timeToReset,
                limit: info.limit,
                method: info.method,
                path: info.route,
            });
        });

        logger.info('Global error handlers initialized');
    }

    /**
     * Log detailed error information
     * @param error - The error to log
     */
    logErrorDetails(error: any): void {
        if (error instanceof Error) {
            logger.error('Error Details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
        }
    }

    /**
     * Create an error embed
     * @param error - The error object
     * @param user - The user who triggered the error
     * @returns The error embed
     */
    createErrorEmbed(error: Error, user: User): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(this.client.config.embeds.color.error)
            .setTitle('❌ An Error Occurred')
            .setDescription(`\`\`\`js\n${error.message}\`\`\``)
            .addFields(
                { name: 'Error Type', value: error.name, inline: true },
                { name: 'User', value: user.tag, inline: true },
                { name: 'Time', value: new Date().toLocaleString(), inline: true }
            )
            .setTimestamp();
    }

    /**
     * Handle API errors
     * @param error - The API error
     * @param context - Context where the error occurred
     */
    handleAPIError(error: any, context: string): void {
        logger.error(`API Error in ${context}:`, {
            status: error.status,
            code: error.code,
            message: error.message,
        });

        // Handle specific error codes
        switch (error.code) {
            case 10008:
                logger.error('Unknown Message - Message was deleted or does not exist');
                break;
            case 10003:
                logger.error('Unknown Channel - Channel was deleted or does not exist');
                break;
            case 50001:
                logger.error('Missing Access - Bot lacks permissions');
                break;
            case 50013:
                logger.error('Missing Permissions - Bot lacks required permissions');
                break;
            case 50035:
                logger.error('Invalid Form Body - Validation error');
                break;
            default:
                logger.error('Unhandled API error code:', error.code);
        }
    }

    /**
     * Send error notification to bot owners
     * @param error - The error to report
     * @param context - Additional context
     */
    async notifyOwners(error: Error, context: ErrorContext = {}): Promise<void> {
        if (!this.client.config.owners.length) {
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(this.client.config.embeds.color.error)
            .setTitle('🚨 Bot Error Notification')
            .setDescription(`\`\`\`js\n${error.message}\`\`\``)
            .addFields(
                { name: 'Error Type', value: error.name, inline: true },
                { name: 'Time', value: new Date().toLocaleString(), inline: true }
            )
            .setTimestamp();

        if (context.guild) {
            embed.addFields({ name: 'Guild', value: context.guild, inline: true });
        }

        if (context.user) {
            embed.addFields({ name: 'User', value: context.user, inline: true });
        }

        if (context.command) {
            embed.addFields({ name: 'Command', value: context.command, inline: true });
        }

        if (error.stack) {
            const stackTrace = error.stack.length > 1024 
                ? error.stack.substring(0, 1021) + '...'
                : error.stack;
            embed.addFields({ name: 'Stack Trace', value: `\`\`\`js\n${stackTrace}\`\`\`` });
        }

        for (const ownerId of this.client.config.owners) {
            try {
                const owner = await this.client.users.fetch(ownerId);
                await owner.send({ embeds: [embed] });
            } catch (err) {
                logger.error(`Failed to notify owner ${ownerId}:`, err);
            }
        }
    }
}
