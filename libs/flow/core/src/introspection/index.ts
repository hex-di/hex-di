/**
 * Introspection Module - DevTools & Diagnostics
 *
 * Provides runtime inspection capabilities for flow state machines:
 * - FlowRegistry: Tracks live machine instances
 * - FlowInspector: Read-only query API over machine state/history
 * - FlowTracingHook: Distributed tracing spans for transitions/effects
 * - CircularBuffer: Generic O(1) fixed-capacity buffer
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type {
  Unsubscribe,
  RegistryEntry,
  RegistryEvent,
  RegistryListener,
  FlowRegistry,
  HealthEvent,
  EffectResultRecord,
  FlowInspectorConfig,
  FlowInspector,
  TracerLike,
  FlowTracingHookOptions,
  FlowTracingHook,
} from "./types.js";

// =============================================================================
// CircularBuffer
// =============================================================================

export { CircularBuffer } from "./circular-buffer.js";

// =============================================================================
// FlowRegistry
// =============================================================================

export { createFlowRegistry } from "./flow-registry.js";

// =============================================================================
// FlowInspector
// =============================================================================

export { createFlowInspector } from "./flow-inspector.js";

// =============================================================================
// FlowTracingHook
// =============================================================================

export { createFlowTracingHook } from "./flow-tracing-hook.js";
