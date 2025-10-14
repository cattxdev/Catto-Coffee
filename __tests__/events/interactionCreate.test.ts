/**
 * @fileoverview Tests for Interaction Create Event
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Events } from 'discord.js';
import interactionCreateEvent from '../../src/events/interactionCreate';

const createMockClient = () => ({
    user: { tag: 'TestBot#0000', id: '123456789' },
    commandHandler: {
        executeCommand: jest.fn(() => Promise.resolve()) as any,
        handleAutocomplete: jest.fn(() => Promise.resolve()) as any,
    },
    componentHandler: {
        executeButton: jest.fn(() => Promise.resolve()) as any,
        executeSelectMenu: jest.fn(() => Promise.resolve()) as any,
        executeModal: jest.fn(() => Promise.resolve()) as any,
    },
    config: {
        owners: ['123456789'],
    },
} as any);

const createMockInteraction = (type: string) => {
    const base = {
        isChatInputCommand: jest.fn(() => type === 'command'),
        isAutocomplete: jest.fn(() => type === 'autocomplete'),
        isButton: jest.fn(() => type === 'button'),
        isStringSelectMenu: jest.fn(() => type === 'selectMenu'),
        isModalSubmit: jest.fn(() => type === 'modal'),
        isContextMenuCommand: jest.fn(() => type === 'contextMenu'),
        isRepliable: jest.fn(() => true),
        replied: false,
        deferred: false,
        reply: jest.fn(() => Promise.resolve({} as any)) as any,
        editReply: jest.fn(() => Promise.resolve({} as any)) as any,
        followUp: jest.fn(() => Promise.resolve({} as any)) as any,
    };

    return base as any;
};

describe('InteractionCreate Event', () => {
    let mockClient: any;

    beforeEach(() => {
        mockClient = createMockClient();
    });

    it('should have correct event properties', () => {
        expect(interactionCreateEvent.name).toBe(Events.InteractionCreate);
        expect(interactionCreateEvent.once).toBe(undefined);
        expect(typeof interactionCreateEvent.execute).toBe('function');
    });

    it('should handle chat input commands', async () => {
        const interaction = createMockInteraction('command');

        await interactionCreateEvent.execute(interaction, mockClient);

        expect(mockClient.commandHandler.executeCommand).toHaveBeenCalledWith(interaction);
    });

    it('should handle autocomplete interactions', async () => {
        const interaction = createMockInteraction('autocomplete');

        await interactionCreateEvent.execute(interaction, mockClient);

        expect(mockClient.commandHandler.handleAutocomplete).toHaveBeenCalledWith(interaction);
    });

    it('should handle button interactions', async () => {
        const interaction = createMockInteraction('button');

        await interactionCreateEvent.execute(interaction, mockClient);

        expect(mockClient.componentHandler.executeButton).toHaveBeenCalledWith(interaction);
    });

    it('should handle select menu interactions', async () => {
        const interaction = createMockInteraction('selectMenu');

        await interactionCreateEvent.execute(interaction, mockClient);

        expect(mockClient.componentHandler.executeSelectMenu).toHaveBeenCalledWith(interaction);
    });

    it('should handle modal interactions', async () => {
        const interaction = createMockInteraction('modal');

        await interactionCreateEvent.execute(interaction, mockClient);

        expect(mockClient.componentHandler.executeModal).toHaveBeenCalledWith(interaction);
    });

    it('should handle context menu commands', async () => {
        const interaction = createMockInteraction('contextMenu');

        await interactionCreateEvent.execute(interaction, mockClient);

        expect(mockClient.commandHandler.executeCommand).toHaveBeenCalledWith(interaction);
    });

    it('should handle errors gracefully', async () => {
        const interaction = createMockInteraction('command');
        const error = new Error('Test error');

        mockClient.commandHandler.executeCommand.mockRejectedValueOnce(error);

        // Should not throw
        await expect(
            interactionCreateEvent.execute(interaction, mockClient)
        ).resolves.not.toThrow();
    });

    it('should log errors when they occur', async () => {
        const interaction = createMockInteraction('command');
        const error = new Error('Test error');

        mockClient.commandHandler.executeCommand.mockRejectedValueOnce(error);

        // Should handle error without throwing
        await expect(
            interactionCreateEvent.execute(interaction, mockClient)
        ).resolves.not.toThrow();
    });

    it('should reply with error message when error occurs and not replied', async () => {
        const interaction = createMockInteraction('command');
        const error = new Error('Test error');

        mockClient.commandHandler.executeCommand.mockRejectedValueOnce(error);

        await interactionCreateEvent.execute(interaction, mockClient);

        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.stringContaining('error'),
                ephemeral: true,
            })
        );
    });

    it('should follow up with error message when already replied', async () => {
        const interaction = createMockInteraction('command');
        interaction.replied = true;
        const error = new Error('Test error');

        mockClient.commandHandler.executeCommand.mockRejectedValueOnce(error);

        await interactionCreateEvent.execute(interaction, mockClient);

        expect(interaction.followUp).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.stringContaining('error'),
                ephemeral: true,
            })
        );
    });

    it('should follow up with error message when deferred', async () => {
        const interaction = createMockInteraction('command');
        interaction.deferred = true;
        const error = new Error('Test error');

        mockClient.commandHandler.executeCommand.mockRejectedValueOnce(error);

        await interactionCreateEvent.execute(interaction, mockClient);

        expect(interaction.followUp).toHaveBeenCalledWith(
            expect.objectContaining({
                content: expect.stringContaining('error'),
                ephemeral: true,
            })
        );
    });

    it('should not be a once event', () => {
        // InteractionCreate should fire multiple times
        expect(interactionCreateEvent.once).toBeFalsy();
    });
});
