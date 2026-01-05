/**
 * Flow Tracing Module
 *
 * This module provides DevTools integration for state machine tracing:
 * - FlowCollector interface for collecting transition events
 * - NoOpFlowCollector for zero-overhead production
 * - FlowMemoryCollector for in-memory storage with filtering and stats
 * - Tracing runner factories for automatic transition recording
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export {
  // Transition event types
  type FlowTransitionEvent,
  type FlowTransitionEventAny,

  // Filter types
  type FlowTransitionFilter,

  // Stats types
  type FlowStats,

  // Retention policy
  type FlowRetentionPolicy,
  DEFAULT_FLOW_RETENTION_POLICY,
} from "./types.js";

// =============================================================================
// Collector Interface
// =============================================================================

export {
  // Collector interface
  type FlowCollector,

  // Subscriber types
  type FlowSubscriber,
  type Unsubscribe,
} from "./collector.js";

// =============================================================================
// Collector Implementations
// =============================================================================

export {
  // No-op collector (zero overhead)
  NoOpFlowCollector,
  noopFlowCollector,
} from "./noop-collector.js";

export {
  // Memory collector with filtering and stats
  FlowMemoryCollector,
} from "./memory-collector.js";

// =============================================================================
// Tracing Runner
// =============================================================================

export {
  // Tracing runner options
  type TracingRunnerOptions,

  // Tracing runner factories
  createTracingRunner,
  createTracingRunnerWithDuration,

  // Testing utilities
  __resetTransitionIdCounter,
} from "./tracing-runner.js";
