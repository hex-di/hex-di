/**
 * Tracing utility functions.
 *
 * Provides ID generation, type guards, and timing utilities for the tracing system.
 *
 * @packageDocumentation
 */

// ID generation
export { generateTraceId, generateSpanId } from "./id-generation";

// Type guards
export {
  isAttributeValue,
  isSpanKind,
  isSpanStatus,
  isValidTraceId,
  isValidSpanId,
} from "./type-guards";

// Timing
export { getHighResTimestamp, formatDuration } from "./timing";
