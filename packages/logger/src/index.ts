/**
 * @hex-di/logger - Structured Logging for HexDI
 *
 * Zero-dependency structured logging package following hexagonal architecture.
 *
 * Provides:
 * - Port definitions for Logger, LogHandler, LogFormatter
 * - Core logging types (LogEntry, LogLevel, LogContext)
 * - Adapter implementations (NoOp, Memory, Console)
 * - Context variable integration for log propagation
 * - Testing utilities for log assertions
 *
 * @packageDocumentation
 */

// =============================================================================
// Ports
// =============================================================================

export { LoggerPort, LogHandlerPort, LogFormatterPort } from "./ports/index.js";
export type { Logger, LogHandler, LogFormatter, FormatterType } from "./ports/index.js";

// =============================================================================
// Core Types
// =============================================================================

export type { LogLevel, LogEntry, LogContext } from "./types/index.js";
export { LogLevelValue, shouldLog } from "./types/index.js";

// =============================================================================
// Adapters
// =============================================================================

export {
  // NoOp adapter
  NoOpLoggerAdapter,
  NOOP_LOGGER,
  // Memory adapter
  MemoryLoggerAdapter,
  createMemoryLogger,
  // Console adapter
  ConsoleLoggerAdapter,
  createConsoleLogger,
  // Scoped adapter
  ScopedLoggerAdapter,
  createHandlerLogger,
} from "./adapters/index.js";
export type { MemoryLogger, ConsoleLoggerOptions } from "./adapters/index.js";

// =============================================================================
// Context Variables
// =============================================================================

export { LogContextVar, LogAnnotationsVar } from "./context/index.js";

// =============================================================================
// Utilities
// =============================================================================

export {
  getFormatter,
  mergeContext,
  extractContextFromHeaders,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
  withRedaction,
  withSampling,
  withRateLimit,
  getStderr,
  sanitizeMessage,
  sanitizeStringValue,
  sanitizeAnnotations,
  nextSequence,
  resetSequence,
  computeEntryHash,
  withIntegrity,
} from "./utils/index.js";
export type {
  RedactionConfig,
  SamplingConfig,
  RateLimitConfig,
  ValidationConfig,
  IntegrityConfig,
  IntegrityInfo,
} from "./utils/index.js";

// =============================================================================
// Instrumentation
// =============================================================================

export { instrumentContainer, createLoggingHook } from "./instrumentation/index.js";
export type { AutoLogOptions, LoggingHook } from "./instrumentation/index.js";

// =============================================================================
// Framework Integrations
// =============================================================================

export { loggingMiddleware } from "./framework/index.js";
export type {
  HonoContext,
  NextFunction,
  MiddlewareHandler,
  HonoLoggingOptions,
} from "./framework/index.js";

// =============================================================================
// Tracing Integration
// =============================================================================

export { withSpanInjection, createSpanProvider } from "./tracing/index.js";
export type { SpanInfo, SpanProvider } from "./tracing/index.js";

// =============================================================================
// Inspection
// =============================================================================

export {
  LoggerInspectorPort,
  createLoggerInspectorAdapter,
  createLazyLoggerInspector,
  createLoggerLibraryInspector,
  LoggerLibraryInspectorPort,
  LoggerLibraryInspectorAdapter,
} from "./inspection/index.js";
export type {
  LoggerInspector,
  LoggerInspectorListener,
  LoggerInspectorAdapter,
  CreateLoggerInspectorOptions,
  LoggerInspectorEvent,
  LoggingSnapshot,
  HandlerInfo,
  SamplingStatistics,
  RedactionStatistics,
  ContextUsageStatistics,
  TimeWindowOptions,
  RecentEntriesOptions,
} from "./inspection/index.js";

// =============================================================================
// Testing Utilities
// =============================================================================

export { assertLogEntry } from "./testing/index.js";
export type { LogEntryMatcher } from "./testing/index.js";
