/**
 * @fileoverview Base Precondition class
 * @author Catto Bot Team
 */

import type { ChatInputCommandInteraction, ContextMenuCommandInteraction } from 'discord.js';
import type { BotClient } from '../structures/BotClient';

/**
 * Result of a precondition check
 */
export interface PreconditionResult {
    success: boolean;
    message?: string;
}

/**
 * Context passed to precondition checks
 */
export interface PreconditionContext {
    interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction;
    client: BotClient;
    commandName: string;
}

/**
 * Base Precondition class that all preconditions extend from
 */
export abstract class Precondition {
    public readonly name: string;
    public readonly position: number;

    constructor(name: string, position: number = 10) {
        this.name = name;
        this.position = position; // Lower number = runs first
    }

    /**
     * Check if the precondition passes
     * @param context - The precondition context
     * @returns Result indicating success or failure with optional message
     */
    abstract check(context: PreconditionContext): Promise<PreconditionResult> | PreconditionResult;

    /**
     * Helper method to create a success result
     */
    protected success(): PreconditionResult {
        return { success: true };
    }

    /**
     * Helper method to create a failure result
     */
    protected error(message: string): PreconditionResult {
        return { success: false, message };
    }
}
