/**
 * HexDI DevTools Adapters
 *
 * @deprecated This package is deprecated and will be removed in the next major version (v2.0).
 * Please migrate to the new unified package structure:
 *
 * ## Migration Guide
 *
 * | Old Import | New Import |
 * |------------|------------|
 * | `@hex-di/devtools-adapters` | `@hex-di/devtools-core` or `@hex-di/devtools` |
 * | `MemoryTraceCollectorAdapter` | `@hex-di/devtools-core` |
 * | `NoopTraceCollectorAdapter` | `@hex-di/devtools-core` |
 * | `ConsoleLoggerAdapter` | `@hex-di/devtools-core` |
 * | `StderrLoggerAdapter` | `@hex-di/devtools-core` |
 * | `NoopLoggerAdapter` | `@hex-di/devtools-core` |
 *
 * ## Example Migration
 *
 * Before:
 * ```typescript
 * import { MemoryTraceCollectorAdapter, ConsoleLoggerAdapter } from '@hex-di/devtools-adapters';
 * ```
 *
 * After:
 * ```typescript
 * import { MemoryTraceCollectorAdapter, ConsoleLoggerAdapter } from '@hex-di/devtools-core';
 * ```
 *
 * Essential adapter implementations for HexDI DevTools.
 *
 * @packageDocumentation
 */

// =============================================================================
// Tracing Adapters
// =============================================================================

/**
 * @deprecated Import from `@hex-di/devtools-core` instead.
 * Will be removed in v2.0.
 */
export {
  MemoryTraceCollectorAdapter,
  NoopTraceCollectorAdapter,
} from './tracing/index.js';

// =============================================================================
// Logging Adapters
// =============================================================================

/**
 * @deprecated Import from `@hex-di/devtools-core` instead.
 * Will be removed in v2.0.
 */
export {
  ConsoleLoggerAdapter,
  createConsoleLoggerAdapter,
  StderrLoggerAdapter,
  createStderrLoggerAdapter,
  NoopLoggerAdapter,
} from './logging/index.js';
