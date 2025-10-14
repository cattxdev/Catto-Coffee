/**
 * @fileoverview Interceptor system exports
 * @author Catto Bot Team
 */

// Core classes
export { Interceptor, InterceptorContext, InterceptorResult } from './Interceptor';
export { InterceptorRegistry } from './InterceptorRegistry';
export { default as interceptorRegistry } from './InterceptorRegistry';

// Built-in interceptors
export { LoggingInterceptor, LoggingInterceptorOptions } from './built/LoggingInterceptor';
export { MetricsInterceptor } from './built/MetricsInterceptor';
export { AuditInterceptor, AuditEntry } from './built/AuditInterceptor';
export { DatabaseInterceptor, DatabaseInterceptorOptions } from './built/DatabaseInterceptor';

// Utilities
export { withInterceptors, Intercept, executeWithInterceptors } from './utils';
