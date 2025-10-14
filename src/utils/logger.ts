/**
 * @fileoverview Logger utility for consistent logging across the application
 * @author Catto Bot Team
 */

import { Signale, SignaleOptions } from 'signale';
import { createWriteStream, existsSync, mkdirSync, WriteStream } from 'fs';
import { join } from 'path';
import { config } from '../config/config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger class for handling application logs using Signale
 */
class Logger {
    private signale: Signale;
    private logLevel: LogLevel;
    private logToFile: boolean;
    private logPath: string;
    private logStream?: WriteStream;
    private errorStream?: WriteStream;
    private levels: Record<LogLevel, number>;

    constructor() {
        this.logLevel = config.logging.level;
        this.logToFile = config.logging.logToFile;
        this.logPath = config.logging.logPath;

        // Create logs directory if it doesn't exist
        if (this.logToFile && !existsSync(this.logPath)) {
            mkdirSync(this.logPath, { recursive: true });
        }

        // Create write streams for file logging
        if (this.logToFile) {
            const date = new Date().toISOString().split('T')[0];
            this.logStream = createWriteStream(
                join(this.logPath, `bot-${date}.log`),
                { flags: 'a' }
            );
            this.errorStream = createWriteStream(
                join(this.logPath, `error-${date}.log`),
                { flags: 'a' }
            );
        }

        // Log levels
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
        };

        // Configure Signale
        const signaleOptions: SignaleOptions = {
            disabled: false,
            interactive: false,
            logLevel: this.logLevel,
            scope: 'catto-bot',
            stream: process.stdout
        };

        this.signale = new Signale(signaleOptions);

        // Add custom loggers
        this.signale.config({
            displayTimestamp: true,
            displayDate: true
        });
    }

    /**
     * Check if log level should be logged
     * @param level - Log level to check
     * @returns Whether to log
     */
    private shouldLog(level: LogLevel): boolean {
        return this.levels[level] >= this.levels[this.logLevel];
    }

    /**
     * Write log to file
     * @param level - Log level
     * @param message - Message to write
     * @param args - Additional arguments
     */
    private writeToFile(level: LogLevel, message: string, args: any[]): void {
        if (!this.logToFile) return;

        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        const fullMessage = args.length > 0 
            ? `${formattedMessage} ${JSON.stringify(args)}`
            : formattedMessage;

        const stream = level === 'error' ? this.errorStream : this.logStream;
        stream?.write(fullMessage + '\n');
    }

    /**
     * Log debug message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    debug(message: string, ...args: any[]): void {
        if (!this.shouldLog('debug')) return;

        this.signale.debug(message, ...args);
        this.writeToFile('debug', message, args);
    }

    /**
     * Log info message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    info(message: string, ...args: any[]): void {
        if (!this.shouldLog('info')) return;

        this.signale.info(message, ...args);
        this.writeToFile('info', message, args);
    }

    /**
     * Log success message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    success(message: string, ...args: any[]): void {
        if (!this.shouldLog('info')) return;

        this.signale.success(message, ...args);
        this.writeToFile('info', message, args);
    }

    /**
     * Log warning message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    warn(message: string, ...args: any[]): void {
        if (!this.shouldLog('warn')) return;

        this.signale.warn(message, ...args);
        this.writeToFile('warn', message, args);
    }

    /**
     * Log error message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    error(message: string, ...args: any[]): void {
        if (!this.shouldLog('error')) return;

        this.signale.error(message, ...args);
        this.writeToFile('error', message, args);
    }

    /**
     * Log database message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    database(message: string, ...args: any[]): void {
        if (!this.shouldLog('info')) return;

        this.signale.info(`💾 [Database] ${message}`, ...args);
        this.writeToFile('info', `[Database] ${message}`, args);
    }

    /**
     * Log command execution
     * @param message - Message to log
     * @param args - Additional arguments
     */
    command(message: string, ...args: any[]): void {
        if (!this.shouldLog('info')) return;

        this.signale.info(`⚡ [Command] ${message}`, ...args);
        this.writeToFile('info', `[Command] ${message}`, args);
    }

    /**
     * Log event execution
     * @param message - Message to log
     * @param args - Additional arguments
     */
    event(message: string, ...args: any[]): void {
        if (!this.shouldLog('info')) return;

        this.signale.info(`📡 [Event] ${message}`, ...args);
        this.writeToFile('info', `[Event] ${message}`, args);
    }

    /**
     * Close log streams
     */
    close(): void {
        this.logStream?.end();
        this.errorStream?.end();
    }
}

export default new Logger();
