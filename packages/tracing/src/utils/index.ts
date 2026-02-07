/**
 * Tracing utility functions.
 *
 * Provides ID generation, type guards, and timing utilities for the tracing system.
 *
 * @packageDocumentation
 */

// ID generation
export { generateTraceId, generateSpanId } from "./id-generation.js";

// Type guards
export {
  isAttributeValue,
  isSpanKind,
  isSpanStatus,
  isValidTraceId,
  isValidSpanId,
} from "./type-guards.js";

// Timing
export { getHighResTimestamp, formatDuration } from "./timing.js";

// Cross-platform global types
export type { CryptoLike, PerformanceLike, ConsoleLike } from "./globals.js";
