/**
 * @fileoverview Embed utility functions
 * @author Catto Bot Team
 */

import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { config } from '../config/config';

/**
 * Create a standard success embed
 */
export function createSuccessEmbed(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(config.embeds.color.success)
        .setTitle(`✅ ${title}`)
        .setTimestamp();

    if (description) {
        embed.setDescription(description);
    }

    if (config.embeds.footer.iconURL) {
        embed.setFooter({ text: config.embeds.footer.text, iconURL: config.embeds.footer.iconURL });
    } else {
        embed.setFooter({ text: config.embeds.footer.text });
    }

    return embed;
}

/**
 * Create a standard error embed
 */
export function createErrorEmbed(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(config.embeds.color.error)
        .setTitle(`❌ ${title}`)
        .setTimestamp();

    if (description) {
        embed.setDescription(description);
    }

    if (config.embeds.footer.iconURL) {
        embed.setFooter({ text: config.embeds.footer.text, iconURL: config.embeds.footer.iconURL });
    } else {
        embed.setFooter({ text: config.embeds.footer.text });
    }

    return embed;
}

/**
 * Create a standard warning embed
 */
export function createWarningEmbed(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(config.embeds.color.warning)
        .setTitle(`⚠️ ${title}`)
        .setTimestamp();

    if (description) {
        embed.setDescription(description);
    }

    if (config.embeds.footer.iconURL) {
        embed.setFooter({ text: config.embeds.footer.text, iconURL: config.embeds.footer.iconURL });
    } else {
        embed.setFooter({ text: config.embeds.footer.text });
    }

    return embed;
}

/**
 * Create a standard info embed
 */
export function createInfoEmbed(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(config.embeds.color.info)
        .setTitle(`ℹ️ ${title}`)
        .setTimestamp();

    if (description) {
        embed.setDescription(description);
    }

    if (config.embeds.footer.iconURL) {
        embed.setFooter({ text: config.embeds.footer.text, iconURL: config.embeds.footer.iconURL });
    } else {
        embed.setFooter({ text: config.embeds.footer.text });
    }

    return embed;
}

/**
 * Create a custom embed with specified color
 */
export function createCustomEmbed(
    color: ColorResolvable,
    title: string,
    description?: string
): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setTimestamp();

    if (description) {
        embed.setDescription(description);
    }

    if (config.embeds.footer.iconURL) {
        embed.setFooter({ text: config.embeds.footer.text, iconURL: config.embeds.footer.iconURL });
    } else {
        embed.setFooter({ text: config.embeds.footer.text });
    }

    return embed;
}

/**
 * Truncate text to a specified length
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format milliseconds to human-readable time
 */
export function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
