/**
 * Adapter implementations for the tracing ports.
 *
 * Exports all built-in tracer adapters:
 * - NoOp: Zero-overhead tracer for disabled tracing
 * - Memory: In-memory tracer for testing and debugging
 * - Console: Human-readable console output for development
 *
 * @packageDocumentation
 */

// NoOp adapter - zero overhead for production
export { NoOpTracerAdapter, NOOP_TRACER, NOOP_SPAN } from "./noop/index.js";

// Memory adapter - in-memory span collection for testing
export {
  MemoryTracerAdapter,
  MemoryTracer,
  createMemoryTracer,
  MemorySpan,
} from "./memory/index.js";

// Console adapter - human-readable output for development
export { ConsoleTracerAdapter, createConsoleTracer, ConsoleTracer } from "./console/index.js";
export type { ConsoleTracerOptions } from "./console/index.js";
