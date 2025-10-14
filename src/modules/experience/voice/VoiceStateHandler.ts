/**
 * @fileoverview Voice State Change Handler
 * @author Catto Bot Team
 */

import { VoiceState, ChannelType } from 'discord.js';
import { VoiceExperienceService } from './VoiceExperienceService';
import { VoiceChangeType, VoiceStateChange } from './types';
import logger from '../../../utils/logger';

/**
 * Handles Discord voice state changes and manages experience tracking
 */
export class VoiceStateHandler {
    constructor(private voiceExpService: VoiceExperienceService) {}

    /**
     * Handle voice state update event
     */
    async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
        try {
            const userId = newState.id;
            const guildId = newState.guild.id;

            // Determine what changed
            const changeType = this.determineChangeType(oldState, newState);
            
            if (!changeType) {
                return; // No relevant change
            }

            const change: VoiceStateChange = {
                oldState,
                newState,
                changeType,
                userId,
                guildId,
            };

            // Route to appropriate handler
            switch (changeType) {
                case VoiceChangeType.JOIN:
                    await this.handleJoin(change);
                    break;
                
                case VoiceChangeType.LEAVE:
                    await this.handleLeave(change);
                    break;
                
                case VoiceChangeType.MOVE:
                    await this.handleMove(change);
                    break;
                
                case VoiceChangeType.MUTE:
                case VoiceChangeType.DEAFEN:
                case VoiceChangeType.STREAM:
                case VoiceChangeType.VIDEO:
                case VoiceChangeType.AFK:
                    await this.handleStateChange(change);
                    break;
            }
        } catch (error) {
            logger.error('Error handling voice state update:', error);
        }
    }

    /**
     * Handle user joining a voice channel
     */
    private async handleJoin(change: VoiceStateChange): Promise<void> {
        const { newState } = change;
        
        // Check if channel is valid for tracking
        if (!this.isTrackableChannel(newState)) {
            return;
        }

        // Get channel member count
        const memberCount = this.getActiveMemberCount(newState);
        const config = await this.voiceExpService.getConfigService().getConfig(newState.guild.id);

        // Check minimum members requirement
        if (memberCount < config.minMembersInChannel) {
            logger.debug(
                `User ${newState.id} joined ${newState.channelId} but not enough members ` +
                `(${memberCount}/${config.minMembersInChannel})`
            );
            return;
        }

        // Start tracking
        try {
            await this.voiceExpService.startTracking(
                newState.id,
                newState.guild.id,
                newState.channelId!,
                {
                    muted: (newState.selfMute ?? false) || (newState.serverMute ?? false),
                    deafened: (newState.selfDeaf ?? false) || (newState.serverDeaf ?? false),
                    streaming: newState.streaming ?? false,
                    video: newState.selfVideo ?? false,
                    isAFK: this.isAFKChannel(newState),
                }
            );

            logger.info(`User ${newState.id} joined voice channel ${newState.channelId}`);
        } catch (error) {
            logger.error(`Failed to start tracking for ${newState.id}:`, error);
        }
    }

    /**
     * Handle user leaving a voice channel
     */
    private async handleLeave(change: VoiceStateChange): Promise<void> {
        const { oldState } = change;
        
        try {
            const reward = await this.voiceExpService.stopTracking(
                oldState.id,
                oldState.guild.id
            );

            if (reward) {
                logger.info(
                    `User ${oldState.id} left voice - Awarded ${reward.experience} exp ` +
                    `(${(reward.duration / 60000).toFixed(2)}m)`
                );
            }
        } catch (error) {
            logger.error(`Failed to stop tracking for ${oldState.id}:`, error);
        }
    }

    /**
     * Handle user moving between voice channels
     */
    private async handleMove(change: VoiceStateChange): Promise<void> {
        const { newState, oldState } = change;
        
        // Check if new channel is trackable
        if (!this.isTrackableChannel(newState)) {
            await this.handleLeave(change);
            return;
        }

        // Update session with new channel
        try {
            await this.voiceExpService.updateState(
                newState.id,
                newState.guild.id,
                {
                    channelId: newState.channelId!,
                    isAFK: this.isAFKChannel(newState),
                }
            );

            logger.info(
                `User ${newState.id} moved from ${oldState.channelId} to ${newState.channelId}`
            );
        } catch (error) {
            logger.error(`Failed to update channel move for ${newState.id}:`, error);
        }
    }

    /**
     * Handle voice state changes (mute, deafen, stream, video)
     */
    private async handleStateChange(change: VoiceStateChange): Promise<void> {
        const { newState } = change;
        
        try {
            await this.voiceExpService.updateState(
                newState.id,
                newState.guild.id,
                {
                    muted: (newState.selfMute ?? false) || (newState.serverMute ?? false),
                    deafened: (newState.selfDeaf ?? false) || (newState.serverDeaf ?? false),
                    streaming: newState.streaming ?? false,
                    video: newState.selfVideo ?? false,
                    isAFK: this.isAFKChannel(newState),
                }
            );

            logger.debug(
                `User ${newState.id} state changed: ` +
                `muted=${newState.selfMute}, deafened=${newState.selfDeaf}, ` +
                `streaming=${newState.streaming}, video=${newState.selfVideo}`
            );
        } catch (error) {
            logger.error(`Failed to update state for ${newState.id}:`, error);
        }
    }

    /**
     * Determine the type of voice state change
     */
    private determineChangeType(oldState: VoiceState, newState: VoiceState): VoiceChangeType | null {
        // User joined a channel
        if (!oldState.channelId && newState.channelId) {
            return VoiceChangeType.JOIN;
        }

        // User left a channel
        if (oldState.channelId && !newState.channelId) {
            return VoiceChangeType.LEAVE;
        }

        // User moved channels
        if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            return VoiceChangeType.MOVE;
        }

        // Check for state changes
        if (oldState.channelId && newState.channelId) {
            // Mute changed
            if (oldState.selfMute !== newState.selfMute || oldState.serverMute !== newState.serverMute) {
                return VoiceChangeType.MUTE;
            }

            // Deafen changed
            if (oldState.selfDeaf !== newState.selfDeaf || oldState.serverDeaf !== newState.serverDeaf) {
                return VoiceChangeType.DEAFEN;
            }

            // Streaming changed
            if (oldState.streaming !== newState.streaming) {
                return VoiceChangeType.STREAM;
            }

            // Video changed
            if (oldState.selfVideo !== newState.selfVideo) {
                return VoiceChangeType.VIDEO;
            }

            // AFK changed
            if (this.isAFKChannel(oldState) !== this.isAFKChannel(newState)) {
                return VoiceChangeType.AFK;
            }
        }

        return null;
    }

    /**
     * Check if a channel is trackable
     */
    private isTrackableChannel(state: VoiceState): boolean {
        if (!state.channel) {
            return false;
        }

        // Only track voice channels (not stage channels)
        if (state.channel.type !== ChannelType.GuildVoice) {
            return false;
        }

        return true;
    }

    /**
     * Check if user is in AFK channel
     */
    private isAFKChannel(state: VoiceState): boolean {
        if (!state.channel || !state.guild.afkChannel) {
            return false;
        }

        return state.channelId === state.guild.afkChannelId;
    }

    /**
     * Get count of active (non-bot) members in channel
     */
    private getActiveMemberCount(state: VoiceState): number {
        if (!state.channel) {
            return 0;
        }

        return state.channel.members.filter(m => !m.user.bot).size;
    }

    /**
     * Check if minimum members requirement is met
     */
    async checkMinimumMembers(_channelId: string, _guildId: string): Promise<boolean> {
        // TODO: Implement minimum members check
        // const config = await this.voiceExpService.getConfigService().getConfig(guildId);
        // Get actual member count from channel and compare with config.minMembersInChannel
        // For now, return true
        return true;
    }
}
