/**
 * @fileoverview Type definitions for the Discord bot
 * @author Catto Bot Team
 */

import {
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
    PermissionResolvable,
    ChatInputCommandInteraction,
    ContextMenuCommandBuilder,
    ContextMenuCommandInteraction,
    ButtonInteraction,
    StringSelectMenuInteraction,
    ModalSubmitInteraction,
    AutocompleteInteraction,
    ChannelType,
} from 'discord.js';
import type { BotClient } from '../structures/BotClient';

/**
 * Command structure for slash commands
 */
export interface Command {
    /** The command data (name, description, options) */
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder | ContextMenuCommandBuilder;
    
    /** The category this command belongs to */
    category?: string;
    
    /** Execute function for the command */
    execute: (interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction, client: BotClient) => Promise<void>;
    
    /** Autocomplete function (optional) */
    autocomplete?: (interaction: AutocompleteInteraction, client: BotClient) => Promise<void>;
    
    /** Cooldown in milliseconds (optional) */
    cooldown?: number;
    
    /** Whether this command is owner only */
    ownerOnly?: boolean;
    
    /** Whether this command can only be used in guilds */
    guildOnly?: boolean;
    
    /** Required user permissions */
    userPermissions?: PermissionResolvable[];
    
    /** Required bot permissions */
    botPermissions?: PermissionResolvable[];
    
    /** Whether this command is NSFW */
    nsfw?: boolean;
    
    /** Allowed channel types for this command */
    channelTypes?: ChannelType[];
    
    /** Whether this command is enabled */
    enabled?: boolean;
}

/**
 * Event structure
 */
export interface Event {
    /** The event name */
    name: string;
    
    /** Whether this event should only run once */
    once?: boolean;
    
    /** Execute function for the event */
    execute: (...args: any[]) => Promise<void> | void;
}

/**
 * Component structure for buttons
 */
export interface ButtonComponent {
    /** The custom ID for this button */
    customId: string;
    
    /** Execute function for the button */
    execute: (interaction: ButtonInteraction, client: BotClient) => Promise<void>;
    
    /** Whether this component requires permissions */
    permissions?: PermissionResolvable[];
}

/**
 * Component structure for select menus
 */
export interface SelectMenuComponent {
    /** The custom ID for this select menu */
    customId: string;
    
    /** Execute function for the select menu */
    execute: (interaction: StringSelectMenuInteraction, client: BotClient) => Promise<void>;
    
    /** Whether this component requires permissions */
    permissions?: PermissionResolvable[];
}

/**
 * Component structure for modals
 */
export interface ModalComponent {
    /** The custom ID for this modal */
    customId: string;
    
    /** Execute function for the modal */
    execute: (interaction: ModalSubmitInteraction, client: BotClient) => Promise<void>;
    
    /** Whether this component requires permissions */
    permissions?: PermissionResolvable[];
}

/**
 * Configuration structure
 */
export interface BotConfig {
    token: string;
    clientId: string;
    devGuildId?: string;
    owners: string[];
    environment: 'development' | 'production';
    cooldowns: {
        default: number;
        premium: number;
    };
    commands: {
        prefix: string;
        caseSensitive: boolean;
        registerGlobally: boolean;
    };
    embeds: {
        color: {
            default: number;
            success: number;
            error: number;
            warning: number;
            info: number;
        },
        footer: {
            text: string;
            iconURL: string | undefined;
        },
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        logToFile: boolean;
        logPath: string;
    };
    features: {
        buttons: boolean;
        selectMenus: boolean;
        modals: boolean;
        contextMenus: boolean;
        autocomplete: boolean;
    };
    database: {
        enabled: boolean;
        url?: string;
    };
    api: {
        port: number;
        enabled: boolean;
    };
}

/**
 * Error context for error handling
 */
export interface ErrorContext {
    guild?: string;
    user?: string;
    command?: string;
    component?: string;
    [key: string]: any;
}
