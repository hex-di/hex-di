/**
 * Activity System Module
 *
 * This module provides the activity system for long-running processes
 * that can be spawned by state machines. Activities:
 *
 * - Execute with typed input and output
 * - Emit events back to the machine via EventSink
 * - Support cancellation via AbortSignal
 * - Are tracked by ActivityManager
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Core activity interfaces
  Activity,
  EventSink,

  // Activity instance tracking
  ActivityInstance,
  ActivityStatus,

  // Universal constraint type (legacy)
  ActivityAny,

  // Configured activity types (new API)
  CleanupReason,
  ActivityContext,
  ActivityConfig,
  ConfiguredActivity,
  ConfiguredActivityAny,

  // Port type alias
  ActivityPort,

  // Type utilities
  ActivityInput,
  ActivityOutput,
} from "./types.js";

// =============================================================================
// Manager
// =============================================================================

export {
  // Manager interface
  type ActivityManager,

  // Manager configuration types
  type ActivityManagerConfig,
  type SpawnOptions,

  // Manager factory
  createActivityManager,
} from "./manager.js";

// =============================================================================
// Port
// =============================================================================

export {
  // Port factory (curried API)
  activityPort,
} from "./port.js";

// =============================================================================
// Typed Events
// =============================================================================

export {
  // Event definition factory
  defineEvents,

  // Type utilities
  type EventDefinition,
  type EventFactory,
  type EventTypes,
  type PayloadOf,
  type EventOf,
  type TypedEventSink,
} from "./events.js";

// =============================================================================
// Activity Factory
// =============================================================================

export {
  // Activity factory function
  activity,
} from "./factory.js";

// =============================================================================
// Testing Utilities
// =============================================================================

export {
  // Test event sink
  createTestEventSink,
  type TestEventSink,

  // Test signal
  createTestSignal,
  type TestSignal,

  // Test dependencies
  createTestDeps,
  MissingMockError,
  type MocksFor,

  // Activity test harness
  testActivity,
  type TestActivityResult,
  type TestActivityOptions,
} from "./testing/index.js";
