/**
 * @fileoverview Basic tests for Voice Experience module
 * @author Catto Bot Team
 */


import { Redis } from 'ioredis';
import { VoiceSessionManager, VoiceExpCalculator, VoiceExpConfig, VoiceSession } from '../../../../src/modules/experience/voice';

// Mock ioredis
jest.mock('ioredis');

describe('Voice Experience Module', () => {
    let mockRedis: jest.Mocked<Redis>;
    let sessionManager: VoiceSessionManager;
    let calculator: VoiceExpCalculator;
    let baseConfig: VoiceExpConfig;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRedis = {
            setex: jest.fn().mockResolvedValue('OK'),
            get: jest.fn().mockResolvedValue(null),
            del: jest.fn().mockResolvedValue(1),
        } as unknown as jest.Mocked<Redis>;

        sessionManager = new VoiceSessionManager(mockRedis);
        calculator = new VoiceExpCalculator();

        baseConfig = {
            enabled: true,
            baseExpPerMinute: 10,
            minDuration: 60000,
            updateInterval: 300000,
            mutedPenalty: 0.5,
            deafenedPenalty: 0.7,
            streamingBonus: 0.2,
            videoBonus: 0.15,
            minMembersInChannel: 2,
            ignoreAFKChannels: true,
            afkTimeout: 300000,
        };
    });

    describe('VoiceSessionManager', () => {
        describe('createSession', () => {
            it('should create a session with correct properties', async () => {
                const session = await sessionManager.createSession('user1', 'guild1', 'channel1');

                expect(session).toMatchObject({
                    userId: 'user1',
                    guildId: 'guild1',
                    channelId: 'channel1',
                    accumulatedExp: 0,
                    muted: false,
                    deafened: false,
                    streaming: false,
                    video: false,
                    isAFK: false,
                });
                expect(mockRedis.setex).toHaveBeenCalled();
            });

            it('should respect provided options', async () => {
                const session = await sessionManager.createSession('user1', 'guild1', 'channel1', {
                    muted: true,
                    streaming: true,
                });

                expect(session.muted).toBe(true);
                expect(session.streaming).toBe(true);
            });
        });

        describe('getSession', () => {
            it('should return null for non-existent session', async () => {
                mockRedis.get.mockResolvedValue(null);

                const session = await sessionManager.getSession('user1', 'guild1');

                expect(session).toBeNull();
            });

            it('should return parsed session data', async () => {
                const mockSession: VoiceSession = {
                    userId: 'user1',
                    guildId: 'guild1',
                    channelId: 'channel1',
                    startTime: Date.now(),
                    lastUpdate: Date.now(),
                    muted: false,
                    deafened: false,
                    streaming: false,
                    video: false,
                    accumulatedExp: 100,
                    isAFK: false,
                };

                mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

                const session = await sessionManager.getSession('user1', 'guild1');

                expect(session).toEqual(mockSession);
            });
        });

        describe('updateSession', () => {
            it('should update session properties', async () => {
                const mockSession: VoiceSession = {
                    userId: 'user1',
                    guildId: 'guild1',
                    channelId: 'channel1',
                    startTime: Date.now(),
                    lastUpdate: Date.now(),
                    muted: false,
                    deafened: false,
                    streaming: false,
                    video: false,
                    accumulatedExp: 50,
                    isAFK: false,
                };

                mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

                const updated = await sessionManager.updateSession('user1', 'guild1', {
                    muted: true,
                });

                expect(updated?.muted).toBe(true);
                expect(mockRedis.setex).toHaveBeenCalled();
            });

            it('should return null for non-existent session', async () => {
                mockRedis.get.mockResolvedValue(null);

                const updated = await sessionManager.updateSession('user1', 'guild1', {
                    muted: true,
                });

                expect(updated).toBeNull();
            });
        });

        describe('deleteSession', () => {
            it('should delete session from Redis', async () => {
                const mockSession: VoiceSession = {
                    userId: 'user1',
                    guildId: 'guild1',
                    channelId: 'channel1',
                    startTime: Date.now(),
                    lastUpdate: Date.now(),
                    muted: false,
                    deafened: false,
                    streaming: false,
                    video: false,
                    accumulatedExp: 0,
                    isAFK: false,
                };

                mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

                await sessionManager.deleteSession('user1', 'guild1');

                expect(mockRedis.del).toHaveBeenCalledWith('voice:session:user1:guild1');
            });
        });
    });

    describe('VoiceExpCalculator', () => {
        let baseSession: VoiceSession;

        beforeEach(() => {
            baseSession = {
                userId: 'user1',
                guildId: 'guild1',
                channelId: 'channel1',
                startTime: Date.now() - 600000,
                lastUpdate: Date.now(),
                muted: false,
                deafened: false,
                streaming: false,
                video: false,
                accumulatedExp: 0,
                isAFK: false,
            };
        });

        describe('calculateExperience', () => {
            it('should calculate base experience', () => {
                const duration = 600000; // 10 minutes
                const result = calculator.calculateExperience(baseSession, duration, baseConfig);

                expect(result.baseExp).toBe(100);
                expect(result.finalExp).toBe(100);
                expect(result.duration).toBe(duration);
            });

            it('should apply muted penalty', () => {
                const session = { ...baseSession, muted: true };
                const duration = 600000;
                const result = calculator.calculateExperience(session, duration, baseConfig);

                expect(result.finalExp).toBe(50); // 50% penalty
                expect(result.penalized).toBe(true);
            });

            it('should apply deafened penalty', () => {
                const session = { ...baseSession, deafened: true };
                const duration = 600000;
                const result = calculator.calculateExperience(session, duration, baseConfig);

                expect(result.finalExp).toBe(30); // 70% penalty
                expect(result.penalized).toBe(true);
            });

            it('should apply streaming bonus', () => {
                const session = { ...baseSession, streaming: true };
                const duration = 600000;
                const result = calculator.calculateExperience(session, duration, baseConfig);

                expect(result.finalExp).toBe(120); // 20% bonus
            });

            it('should apply video bonus', () => {
                const session = { ...baseSession, video: true };
                const duration = 600000;
                const result = calculator.calculateExperience(session, duration, baseConfig);

                expect(result.finalExp).toBe(114); // Floor(100 * 1.15) = 114
            });

            it('should combine bonuses', () => {
                const session = { ...baseSession, streaming: true, video: true };
                const duration = 600000;
                const result = calculator.calculateExperience(session, duration, baseConfig);

                // 100 * 1.2 * 1.15 = 138
                expect(result.finalExp).toBe(138);
            });

            it('should return 0 for duration below minimum', () => {
                const duration = 30000; // 30 seconds
                const result = calculator.calculateExperience(baseSession, duration, baseConfig);

                expect(result.finalExp).toBe(0);
                expect(result.penaltyReason).toBe('Duration too short');
            });

            it('should apply guild multiplier', () => {
                const duration = 600000;
                const result = calculator.calculateExperience(
                    baseSession,
                    duration,
                    baseConfig,
                    { guild: 1.5 }
                );

                expect(result.finalExp).toBe(150);
            });

            it('should apply channel multiplier', () => {
                const duration = 600000;
                const result = calculator.calculateExperience(
                    baseSession,
                    duration,
                    baseConfig,
                    { channel: 2.0 }
                );

                expect(result.finalExp).toBe(200);
            });

            it('should combine all multipliers', () => {
                const session = { ...baseSession, streaming: true };
                const duration = 600000;
                const result = calculator.calculateExperience(
                    session,
                    duration,
                    baseConfig,
                    { guild: 1.5, channel: 2.0 }
                );

                // 100 * 1.2 (streaming) * 1.5 (guild) * 2.0 (channel) = 360
                expect(result.finalExp).toBe(360);
            });
        });

        describe('calculateForDuration', () => {
            it('should calculate experience for duration', () => {
                const duration = 600000; // 10 minutes
                const exp = calculator.calculateForDuration(duration, baseConfig);

                expect(exp).toBe(100);
            });

            it('should return 0 for duration below minimum', () => {
                const duration = 30000;
                const exp = calculator.calculateForDuration(duration, baseConfig);

                expect(exp).toBe(0);
            });

            it('should apply muted penalty', () => {
                const duration = 600000;
                const exp = calculator.calculateForDuration(duration, baseConfig, {
                    muted: true,
                });

                expect(exp).toBe(50);
            });

            it('should apply streaming bonus', () => {
                const duration = 600000;
                const exp = calculator.calculateForDuration(duration, baseConfig, {
                    streaming: true,
                });

                expect(exp).toBe(120);
            });
        });

        describe('calculateEffectiveMultiplier', () => {
            it('should return 1.0 for base session', () => {
                const multiplier = calculator.calculateEffectiveMultiplier(baseSession, baseConfig);

                expect(multiplier).toBe(1.0);
            });

            it('should apply muted penalty', () => {
                const session = { ...baseSession, muted: true };
                const multiplier = calculator.calculateEffectiveMultiplier(session, baseConfig);

                expect(multiplier).toBe(0.5);
            });

            it('should apply streaming bonus', () => {
                const session = { ...baseSession, streaming: true };
                const multiplier = calculator.calculateEffectiveMultiplier(session, baseConfig);

                expect(multiplier).toBe(1.2);
            });

            it('should combine penalties and bonuses', () => {
                const session = { ...baseSession, muted: true, streaming: true };
                const multiplier = calculator.calculateEffectiveMultiplier(session, baseConfig);

                // 0.5 * 1.2 = 0.6
                expect(multiplier).toBe(0.6);
            });

            it('should apply guild multiplier', () => {
                const multiplier = calculator.calculateEffectiveMultiplier(
                    baseSession,
                    baseConfig,
                    { guild: 2.0 }
                );

                expect(multiplier).toBe(2.0);
            });
        });

        describe('edge cases', () => {
            it('should handle very long durations', () => {
                const duration = 24 * 60 * 60 * 1000; // 24 hours
                const result = calculator.calculateExperience(baseSession, duration, baseConfig);

                // 10 exp/min * 1440 minutes = 14400
                expect(result.finalExp).toBe(14400);
            });

            it('should handle zero baseExpPerMinute', () => {
                const zeroConfig = { ...baseConfig, baseExpPerMinute: 0 };
                const duration = 600000;
                const result = calculator.calculateExperience(baseSession, duration, zeroConfig);

                expect(result.finalExp).toBe(0);
            });

            it('should handle extreme multipliers', () => {
                const duration = 600000;
                const result = calculator.calculateExperience(
                    baseSession,
                    duration,
                    baseConfig,
                    { guild: 10.0, channel: 10.0 }
                );

                // 100 * 10 * 10 = 10000
                expect(result.finalExp).toBe(10000);
            });
        });
    });
});
