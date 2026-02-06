/**
 * NoOp Tracer Adapter - Zero-overhead tracing for disabled environments.
 *
 * This module exports the NoOpTracerAdapter for use in production environments
 * where tracing is disabled, along with singleton instances for testing.
 *
 * @packageDocumentation
 */

export { NoOpTracerAdapter } from "./adapter.js";
export { NOOP_TRACER_EXPORTED as NOOP_TRACER, NOOP_SPAN_EXPORTED as NOOP_SPAN } from "./tracer.js";
