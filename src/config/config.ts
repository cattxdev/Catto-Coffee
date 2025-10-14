/**
 * @fileoverview Bot configuration file
 * @author Catto Bot Team
 */

import dotenv from 'dotenv';
import { BotConfig } from '../types';

dotenv.config();

/**
 * Bot configuration object
 */
export const config: BotConfig = {
    // Bot token from Discord Developer Portal
    token: process.env.DISCORD_TOKEN!,

    // Bot client ID
    clientId: process.env.CLIENT_ID!,

    // Guild ID for development (optional)
    devGuildId: process.env.DEV_GUILD_ID,

    // Bot owners (user IDs)
    owners: process.env.OWNER_IDS?.split(',').filter(Boolean) || [],

    // Environment
    environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',

    // Cooldown settings
    cooldowns: {
        default: 3000, // 3 seconds
        premium: 1000, // 1 second
    },

    // Command settings
    commands: {
        prefix: process.env.PREFIX || '!',
        caseSensitive: false,
        registerGlobally: process.env.REGISTER_GLOBALLY === 'true',
    },

    // Embed settings
    embeds: {
        color: {
            default: 0x5865F2,
            success: 0x57F287,
            error: 0xED4245,
            warning: 0xFEE75C,
            info: 0x5865F2,
        },
        footer: {
            text: 'Catto Bot',
            iconURL: process.env.FOOTER_ICON_URL || undefined,
        },
    },

    // Logging settings
    logging: {
        level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
        logToFile: process.env.LOG_TO_FILE === 'true',
        logPath: './logs',
    },

    // Feature flags
    features: {
        buttons: true,
        selectMenus: true,
        modals: true,
        contextMenus: true,
        autocomplete: true,
    },

    // Database configuration (if needed)
    database: {
        enabled: process.env.DATABASE_ENABLED === 'true',
        url: process.env.DATABASE_URL,
    },

    // API settings (if needed)
    api: {
        port: parseInt(process.env.API_PORT || '3000'),
        enabled: process.env.API_ENABLED === 'true',
    },
};

/**
 * Validate configuration
 * @throws {Error} If required configuration is missing
 */
function validateConfig(): void {
    if (!config.token) {
        throw new Error('DISCORD_TOKEN is required in environment variables');
    }

    if (!config.clientId) {
        throw new Error('CLIENT_ID is required in environment variables');
    }
}

validateConfig();
