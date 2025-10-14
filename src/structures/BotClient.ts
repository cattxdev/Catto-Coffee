/**
 * @fileoverview Main Bot Client Class
 * @author Catto Bot Team
 */

import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { config } from '../config/config';
import { CommandHandler } from '../handlers/CommandHandler';
import { EventHandler } from '../handlers/EventHandler';
import { ComponentHandler } from '../handlers/ComponentHandler';
import { ErrorHandler } from '../handlers/ErrorHandler';
import { PreconditionManager } from '../preconditions/PreconditionManager';
import logger from '../utils/logger';
import { Command, ButtonComponent, SelectMenuComponent, ModalComponent } from '../types';

/**
 * Main Bot Client Class
 * Extends Discord.js Client with custom handlers and properties
 */
export class BotClient extends Client {
    public commands: Collection<string, Command>;
    public categories: Collection<string, Collection<string, Command>>;
    public buttons: Collection<string, ButtonComponent>;
    public selectMenus: Collection<string, SelectMenuComponent>;
    public modals: Collection<string, ModalComponent>;
    public cooldowns: Collection<string, Collection<string, number>>;
    public config: typeof config;
    public commandHandler: CommandHandler;
    public eventHandler: EventHandler;
    public componentHandler: ComponentHandler;
    public errorHandler: ErrorHandler;
    public preconditionManager: PreconditionManager;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
            partials: [
                Partials.Message,
                Partials.Channel,
                Partials.Reaction,
                Partials.User,
                Partials.GuildMember,
            ],
            allowedMentions: {
                parse: ['users', 'roles'],
                repliedUser: true,
            },
        });

        // Initialize collections
        this.commands = new Collection();
        this.categories = new Collection();
        this.buttons = new Collection();
        this.selectMenus = new Collection();
        this.modals = new Collection();
        this.cooldowns = new Collection();

        // Store config
        this.config = config;

        // Initialize handlers
        this.commandHandler = new CommandHandler(this);
        this.eventHandler = new EventHandler(this);
        this.componentHandler = new ComponentHandler(this);
        this.errorHandler = new ErrorHandler(this);
        this.preconditionManager = new PreconditionManager(this);
    }

    /**
     * Initialize the bot
     * Loads all handlers and starts the bot
     */
    async initialize(): Promise<void> {
        try {
            logger.info('Initializing bot...');

            // Load all handlers
            await this.commandHandler.loadCommands();
            await this.eventHandler.loadEvents();
            await this.componentHandler.loadComponents();

            // Setup global error handlers
            this.errorHandler.setupGlobalHandlers();

            // Login to Discord
            await this.login(this.config.token);

            logger.info('Bot initialized successfully!');
        } catch (error) {
            logger.error('Failed to initialize bot:', error);
            process.exit(1);
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        logger.info('Shutting down bot...');
        this.destroy();
        logger.close();
        process.exit(0);
    }
}
