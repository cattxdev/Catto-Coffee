/**
 * @fileoverview Main entry point for the Discord bot
 * @author Catto Bot Team
 * @version 1.0.0
 */

import { BotClient } from './structures/BotClient';

// Create and initialize bot instance
const bot = new BotClient();
bot.initialize();

// Graceful shutdown handlers
process.on('SIGINT', () => bot.shutdown());
process.on('SIGTERM', () => bot.shutdown());
