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
export { withRedaction } from "./redaction.js";
export type { RedactionConfig } from "./redaction.js";
export { withSampling } from "./sampling.js";
export type { SamplingConfig } from "./sampling.js";
export { withRateLimit } from "./rate-limit.js";
export type { RateLimitConfig } from "./rate-limit.js";
