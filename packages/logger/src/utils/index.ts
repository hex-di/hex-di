/**
 * Logging utilities.
 *
 * @packageDocumentation
 */

export { getFormatter } from "./formatting.js";
export {
  mergeContext,
  extractContextFromHeaders,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
} from "./context.js";
export { getConsole } from "./globals.js";
export { getStderr } from "./stderr.js";
export { withRedaction } from "./redaction.js";
export type { RedactionConfig } from "./redaction.js";
export { withSampling } from "./sampling.js";
export type { SamplingConfig } from "./sampling.js";
export { withRateLimit } from "./rate-limit.js";
export type { RateLimitConfig } from "./rate-limit.js";
export { sanitizeMessage, sanitizeStringValue } from "./sanitize.js";
export { sanitizeAnnotations } from "./validation.js";
export type { ValidationConfig } from "./validation.js";
export { nextSequence, resetSequence } from "./sequence.js";
export { computeEntryHash, withIntegrity } from "./integrity.js";
export type { IntegrityConfig, IntegrityInfo } from "./integrity.js";
