/**
 * @fileoverview Logger utility for consistent logging across the application
 * @author Catto Bot Team
 */

import { createWriteStream, existsSync, mkdirSync, WriteStream } from 'fs';
import { join } from 'path';
import { config } from '../config/config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger class for handling application logs
 */
class Logger {
    private logLevel: LogLevel;
    private logToFile: boolean;
    private logPath: string;
    private logStream?: WriteStream;
    private errorStream?: WriteStream;
    private levels: Record<LogLevel, number>;
    private colors: Record<LogLevel | 'reset', string>;

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

        // Colors for console output
        this.colors = {
            debug: '\x1b[36m', // Cyan
            info: '\x1b[32m',  // Green
            warn: '\x1b[33m',  // Yellow
            error: '\x1b[31m', // Red
            reset: '\x1b[0m',
        };
    }

    /**
     * Format log message
     * @param level - Log level
     * @param message - Log message
     * @returns Formatted log message
     */
    private formatMessage(level: LogLevel, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
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
     * @param message - Message to write
     * @param isError - Whether this is an error log
     */
    private writeToFile(message: string, isError = false): void {
        if (!this.logToFile) return;

        const stream = isError ? this.errorStream : this.logStream;
        stream?.write(message + '\n');
    }

    /**
     * Log debug message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    debug(message: string, ...args: any[]): void {
        if (!this.shouldLog('debug')) return;

        const formattedMessage = this.formatMessage('debug', message);
        console.log(`${this.colors.debug}${formattedMessage}${this.colors.reset}`, ...args);
        this.writeToFile(`${formattedMessage} ${JSON.stringify(args)}`);
    }

    /**
     * Log info message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    info(message: string, ...args: any[]): void {
        if (!this.shouldLog('info')) return;

        const formattedMessage = this.formatMessage('info', message);
        console.log(`${this.colors.info}${formattedMessage}${this.colors.reset}`, ...args);
        this.writeToFile(`${formattedMessage} ${JSON.stringify(args)}`);
    }

    /**
     * Log warning message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    warn(message: string, ...args: any[]): void {
        if (!this.shouldLog('warn')) return;

        const formattedMessage = this.formatMessage('warn', message);
        console.warn(`${this.colors.warn}${formattedMessage}${this.colors.reset}`, ...args);
        this.writeToFile(`${formattedMessage} ${JSON.stringify(args)}`);
    }

    /**
     * Log error message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    error(message: string, ...args: any[]): void {
        if (!this.shouldLog('error')) return;

        const formattedMessage = this.formatMessage('error', message);
        console.error(`${this.colors.error}${formattedMessage}${this.colors.reset}`, ...args);
        this.writeToFile(`${formattedMessage} ${JSON.stringify(args)}`, true);
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
