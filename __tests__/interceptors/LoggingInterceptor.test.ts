/**
 * @fileoverview Tests for LoggingInterceptor
 * @author Catto Bot Team
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { InterceptorContext } from '../../src/interceptors/Interceptor';

// Mock the logger module before importing
jest.mock('../../src/utils/logger', () => ({
    __esModule: true,
    default: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        success: jest.fn(),
        database: jest.fn(),
        command: jest.fn(),
        event: jest.fn(),
        close: jest.fn(),
    },
}));

// Now import the interceptor and logger
import { LoggingInterceptor } from '../../src/interceptors/built/LoggingInterceptor';
import logger from '../../src/utils/logger';

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('LoggingInterceptor', () => {
    let interceptor: LoggingInterceptor;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogger.debug.mockClear();
        mockLogger.info.mockClear();
        mockLogger.error.mockClear();
    });

    describe('Constructor', () => {
        it('should create with default options', () => {
            interceptor = new LoggingInterceptor();
            expect(interceptor.name).toBe('Logging');
            expect(interceptor.priority).toBe(10);
        });

        it('should create with custom options', () => {
            interceptor = new LoggingInterceptor({
                logLevel: 'debug',
                logArgs: false,
                logResults: true,
                logDuration: false,
                maxValueLength: 100,
            });

            expect(interceptor.name).toBe('Logging');
        });
    });

    describe('Before Hook', () => {
        it('should log operation with default options', async () => {
            interceptor = new LoggingInterceptor();

            const context: InterceptorContext = {
                operation: 'createUser',
                target: 'UserService',
                args: { id: '123', name: 'Test' },
                startTime: Date.now(),
            };

            const result = await interceptor.before!(context);

            expect(result.success).toBe(true);
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('should log with debug level when configured', async () => {
            interceptor = new LoggingInterceptor({ logLevel: 'debug' });

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                startTime: Date.now(),
            };

            await interceptor.before!(context);

            expect(mockLogger.debug).toHaveBeenCalled();
        });

        it('should not log args when logArgs is false', async () => {
            interceptor = new LoggingInterceptor({ logArgs: false });

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: { secret: 'data' },
                startTime: Date.now(),
            };

            await interceptor.before!(context);

            expect(mockLogger.info).toHaveBeenCalled();
            const logCall = (mockLogger.info as jest.Mock).mock.calls[0][0];
            expect(logCall).not.toContain('secret');
        });

        it('should truncate long arguments', async () => {
            interceptor = new LoggingInterceptor({ maxValueLength: 10 });

            const longString = 'a'.repeat(100);
            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: { data: longString },
                startTime: Date.now(),
            };

            await interceptor.before!(context);

            expect(mockLogger.info).toHaveBeenCalled();
            const logCall = (mockLogger.info as jest.Mock).mock.calls[0][0];
            expect(logCall).toContain('...');
        });
    });

    describe('After Hook', () => {
        it('should log completion', async () => {
            interceptor = new LoggingInterceptor();

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                result: { success: true },
                startTime: Date.now() - 100,
            };

            const result = await interceptor.after!(context);

            expect(result.success).toBe(true);
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('should log duration when enabled', async () => {
            interceptor = new LoggingInterceptor({ logDuration: true });

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                result: {},
                startTime: Date.now() - 250,
            };

            await interceptor.after!(context);

            expect(mockLogger.info).toHaveBeenCalled();
            const logCall = (mockLogger.info as jest.Mock).mock.calls[0][0];
            expect(logCall).toMatch(/\d+ms/);
        });

        it('should log results when enabled', async () => {
            interceptor = new LoggingInterceptor({ logResults: true });

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                result: { data: 'test data' },
                startTime: Date.now(),
            };

            await interceptor.after!(context);

            expect(mockLogger.info).toHaveBeenCalled();
            const logCall = (mockLogger.info as jest.Mock).mock.calls[0][0];
            expect(logCall).toContain('Result');
        });

        it('should not log duration when disabled', async () => {
            interceptor = new LoggingInterceptor({ logDuration: false });

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                startTime: Date.now() - 100,
            };

            await interceptor.after!(context);

            expect(mockLogger.info).toHaveBeenCalled();
            const logCall = (mockLogger.info as jest.Mock).mock.calls[0][0];
            expect(logCall).not.toMatch(/\d+ms/);
        });
    });

    describe('Error Hook', () => {
        it('should log errors', async () => {
            interceptor = new LoggingInterceptor();

            const error = new Error('Test error');
            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                error,
                startTime: Date.now() - 50,
            };

            const result = await interceptor.onError!(context);

            expect(result.success).toBe(true);
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('should include error message in log', async () => {
            interceptor = new LoggingInterceptor();

            const error = new Error('Custom error message');
            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                error,
                startTime: Date.now(),
            };

            await interceptor.onError!(context);

            expect(mockLogger.error).toHaveBeenCalled();
            const logCall = (mockLogger.error as jest.Mock).mock.calls[0][0];
            expect(logCall).toContain('Custom error message');
        });

        it('should log duration in error', async () => {
            interceptor = new LoggingInterceptor();

            const context: InterceptorContext = {
                operation: 'test',
                target: 'TestService',
                args: {},
                error: new Error('Test'),
                startTime: Date.now() - 100,
            };

            await interceptor.onError!(context);

            expect(mockLogger.error).toHaveBeenCalled();
            const logCall = (mockLogger.error as jest.Mock).mock.calls[0][0];
            expect(logCall).toMatch(/\d+ms/);
        });
    });
});
