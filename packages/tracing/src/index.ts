/**
 * @hex-di/tracing - Distributed Tracing for HexDI
 *
 * Zero-dependency distributed tracing package following hexagonal architecture.
 *
 * Provides:
 * - Port definitions for Tracer, SpanExporter, SpanProcessor
 * - Core tracing types (Span, SpanData, SpanContext, etc.)
 * - Adapter implementations (NoOp, Memory, Console)
 * - W3C Trace Context parsing and propagation
 * - Utility functions (ID generation, type guards, timing)
 *
 * @packageDocumentation
 */

// =============================================================================
// Ports
// =============================================================================

export { TracerPort, SpanExporterPort, SpanProcessorPort } from "./ports/index.js";
export type { Tracer, SpanExporter, SpanProcessor } from "./ports/index.js";

// =============================================================================
// Core Types
// =============================================================================

export type {
  Span,
  SpanData,
  SpanOptions,
  SpanContext,
  Attributes,
  AttributeValue,
  SpanEvent,
  SpanKind,
  SpanStatus,
} from "./types/index.js";

// =============================================================================
// Adapters
// =============================================================================

export {
  // NoOp adapter
  NoOpTracerAdapter,
  NOOP_TRACER,
  NOOP_SPAN,
  // Memory adapter
  MemoryTracerAdapter,
  MemoryTracer,
  createMemoryTracer,
  MemorySpan,
  // Console adapter
  ConsoleTracerAdapter,
  createConsoleTracer,
  ConsoleTracer,
} from "./adapters/index.js";
export type { ConsoleTracerOptions } from "./adapters/index.js";

// =============================================================================
// W3C Trace Context
// =============================================================================

export {
  parseTraceparent,
  formatTraceparent,
  extractTraceContext,
  injectTraceContext,
  TraceContextVar,
  ActiveSpanVar,
  CorrelationIdVar,
} from "./context/index.js";

// =============================================================================
// Utilities
// =============================================================================

export {
  generateTraceId,
  generateSpanId,
  isAttributeValue,
  isSpanKind,
  isSpanStatus,
  isValidTraceId,
  isValidSpanId,
  getHighResTimestamp,
  formatDuration,
} from "./utils/index.js";

// =============================================================================
// Instrumentation
// =============================================================================

export {
  instrumentContainer,
  instrumentContainerTree,
  createTracingHook,
  evaluatePortFilter,
  isPredicateFilter,
  isDeclarativeFilter,
  DEFAULT_INSTRUMENT_OPTIONS,
  matchesPortPattern,
  shouldTracePort,
  pushSpan,
  popSpan,
  getActiveSpan,
  clearStack,
  getStackDepth,
} from "./instrumentation/index.js";

export type {
  AutoInstrumentOptions,
  PortFilter,
  HookableContainer,
} from "./instrumentation/index.js";
