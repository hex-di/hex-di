/**
 * Public API for container instrumentation.
 *
 * Exports functions and types for automatic and manual instrumentation
 * of dependency injection containers with distributed tracing.
 *
 * @packageDocumentation
 */

// =============================================================================
// Instrumentation Functions
// =============================================================================

export { instrumentContainer } from "./container.js";
export { instrumentContainerTree } from "./tree.js";
export { createTracingHook } from "./hooks.js";

// =============================================================================
// Types
// =============================================================================

export type { AutoInstrumentOptions, PortFilter, HookableContainer } from "./types.js";

// =============================================================================
// Utilities
// =============================================================================

export { evaluatePortFilter, isPredicateFilter, isDeclarativeFilter } from "./types.js";
export { DEFAULT_INSTRUMENT_OPTIONS } from "./types.js";
export { matchesPortPattern, shouldTracePort } from "./utils.js";
export { pushSpan, popSpan, getActiveSpan, clearStack, getStackDepth } from "./span-stack.js";

// =============================================================================
// Async Context
// =============================================================================

export { initAsyncSpanContext, runInAsyncContext } from "./async-context.js";
