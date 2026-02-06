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
// export { instrumentContainerTree } from "./tree.js"; // Added by plan 24-02
export { createTracingHook } from "./hooks.js";

// =============================================================================
// Types
// =============================================================================

export type { AutoInstrumentOptions, PortFilter } from "./types.js";

// =============================================================================
// Utilities
// =============================================================================

export { evaluatePortFilter, isPredicateFilter, isDeclarativeFilter } from "./types.js";
export { DEFAULT_INSTRUMENT_OPTIONS } from "./types.js";
