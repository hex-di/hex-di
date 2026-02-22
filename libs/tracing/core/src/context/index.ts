/**
 * W3C Trace Context propagation and DI context variables.
 *
 * Exports:
 * - W3C traceparent parsing and formatting
 * - Context extraction and injection for HTTP headers
 * - Context variables for DI propagation (Phase 24)
 *
 * @packageDocumentation
 */

export { parseTraceparent, formatTraceparent, isValidTraceId, isValidSpanId } from "./parse.js";
export { extractTraceContext, injectTraceContext } from "./propagation.js";
export { TraceContextVar, ActiveSpanVar, CorrelationIdVar } from "./variables.js";
