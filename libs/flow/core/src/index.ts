/**
 * @hex-di/flow - Typed State Machine Runtime for HexDI
 *
 * A state machine runtime that provides maximum type safety (like Rust), full type
 * inference, zero type casts, and seamless integration with the @hex-di ecosystem
 * for managing complex UI state transitions.
 *
 * ## Key Features
 *
 * - **Branded State Types**: State types with unique symbol branding for nominal
 *   typing, compile-time validation, and type-safe narrowing.
 *
 * - **Branded Event Types**: Event types with conditional payloads and full
 *   type inference for send() calls.
 *
 * - **Effects as Data**: Effect descriptors (InvokeEffect, SpawnEffect, EmitEffect,
 *   DelayEffect, etc.) are pure data structures, not side effects.
 *
 * - **Activity System**: Long-running processes with AbortSignal cancellation,
 *   EventSink for emitting events, and proper lifecycle management.
 *
 * - **HexDI Integration**: FlowAdapter pattern for seamless container integration,
 *   DIEffectExecutor for port resolution, scoped lifetime by default.
 *
 * - **DevTools Integration**: FlowCollector for transition tracing with zero
 *   overhead when disabled.
 *
 * ## Quick Start
 *
 * @example Basic state machine
 * ```typescript
 * import { createMachine, state, event, Effect } from '@hex-di/flow';
 *
 * // Define states
 * const idle = state<'idle'>('idle');
 * const loading = state<'loading'>('loading');
 * const success = state<'success', { data: string }>('success');
 *
 * // Define events
 * const fetch = event<'FETCH'>('FETCH');
 * const resolved = event<'RESOLVED', { data: string }>('RESOLVED');
 *
 * // Create machine
 * const machine = createMachine({
 *   id: 'fetcher',
 *   initial: 'idle',
 *   states: {
 *     idle: {
 *       on: {
 *         FETCH: { target: 'loading' }
 *       }
 *     },
 *     loading: {
 *       on: {
 *         RESOLVED: {
 *           target: 'success',
 *           actions: [(ctx, e) => ({ data: e.payload.data })]
 *         }
 *       }
 *     },
 *     success: { on: {} }
 *   }
 * });
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Package Version
// =============================================================================

/**
 * Package version string.
 */
export const VERSION = "0.1.0";

// =============================================================================
// Machine Module - State, Event, and Machine Types
// =============================================================================

export {
  // Brand symbols (type-level only)
  type StateBrandSymbol,
  type EventBrandSymbol,
  type MachineBrandSymbol,

  // Utility types
  type DeepReadonly,

  // State types
  type State,
  type StateAny,

  // Event types
  type Event,
  type EventAny,

  // Machine types
  type Machine,
  type MachineAny,

  // State inference utilities
  type InferStateName,
  type InferStateContext,

  // Event inference utilities
  type InferEventName,
  type InferEventPayload,
  type StateUnion,
  type EventUnion,

  // Machine inference utilities
  type InferMachineStateNames,
  type InferMachineEventNames,
  type InferMachineContextType,

  // Machine configuration types
  type TransitionConfig,
  type TransitionConfigAny,
  type TransitionConfigOrArray,
  type StateNode,
  type StateNodeAny,
  type StateNodeTransitions,
  type MachineConfig,
  type MachineConfigAny,
  type MachineStatesRecord,

  // Machine factory and inference
  createMachine,
  type InferMachineState,
  type InferMachineEvent,
  type InferMachineContext,

  // Factory functions
  state,
  event,
} from "./machine/index.js";

// =============================================================================
// Effects Module - Effect Descriptors and Constructors
// =============================================================================

export {
  // Port method extraction utilities
  type MethodNames,
  type MethodParams,
  type MethodReturn,

  // Effect descriptors
  type InvokeEffect,
  type SpawnEffect,
  type StopEffect,
  type EmitEffect,
  type DelayEffect,
  type ParallelEffect,
  type SequenceEffect,
  type NoneEffect,

  // Universal constraint type
  type EffectAny,

  // Effect constructors namespace
  Effect,
} from "./effects/index.js";

// =============================================================================
// Activities Module - Long-running Processes
// =============================================================================

export {
  // Core activity interfaces
  type Activity,
  type EventSink,

  // Activity instance tracking
  type ActivityInstance,
  type ActivityStatus,

  // Universal constraint type (legacy)
  type ActivityAny,

  // Configured activity types (new API)
  type CleanupReason,
  type ResolvedActivityDeps,
  type ActivityContext,
  type ActivityConfig,
  type ConfiguredActivity,
  type ConfiguredActivityAny,

  // Manager interface and factory
  type ActivityManager,
  type ActivityManagerConfig,
  type SpawnOptions,
  createActivityManager,

  // Port type and factory (curried API)
  type ActivityPort,
  type ActivityInput,
  type ActivityOutput,
  activityPort,
  createActivityPort, // Legacy export (deprecated)

  // Typed Events
  defineEvents,
  type EventDefinition,
  type EventFactory,
  type EventTypes,
  type PayloadOf,
  type EventOf,
  type TypedEventSink,

  // Activity Factory
  activity,

  // Testing Utilities
  createTestEventSink,
  type TestEventSink,
  createTestSignal,
  type TestSignal,
  createTestDeps,
  MissingMockError,
  type MocksFor,
  testActivity,
  type TestActivityResult,
  type TestActivityOptions,
} from "./activities/index.js";

// =============================================================================
// Runner Module - Machine Runner and Interpreter
// =============================================================================

export {
  // Snapshot type
  type MachineSnapshot,

  // Runner interface and factory
  type MachineRunner,
  type MachineRunnerAny,
  type MachineRunnerOptions,
  createMachineRunner,

  // Executor interface and basic implementation
  type EffectExecutor,
  createBasicExecutor,

  // Interpreter (pure transition logic)
  transition,
  type TransitionResult,
} from "./runner/index.js";

// =============================================================================
// Integration Module - HexDI Container Integration
// =============================================================================

export {
  // FlowService types
  type FlowService,
  type FlowServiceAny,
  type InferFlowServiceState,
  type InferFlowServiceEvent,
  type InferFlowServiceContext,

  // FlowPort factory
  createFlowPort,
  type FlowPort,

  // DI Effect Executor
  createDIEffectExecutor,
  type DIEffectExecutor,
  type DIEffectExecutorConfig,
  type ScopeResolver,

  // Flow Adapter
  createFlowAdapter,
  type FlowAdapterConfig,
  type FlowAdapter,
} from "./integration/index.js";

// =============================================================================
// Tracing Module - DevTools Integration
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

  // Collector interface
  type FlowCollector,

  // Subscriber types
  type FlowSubscriber,
  type Unsubscribe,

  // No-op collector (zero overhead)
  NoOpFlowCollector,
  noopFlowCollector,

  // Memory collector with filtering and stats
  FlowMemoryCollector,

  // Tracing runner options
  type TracingRunnerOptions,

  // Tracing runner factories
  createTracingRunner,
  createTracingRunnerWithDuration,
} from "./tracing/index.js";

// =============================================================================
// DevTools Module - Activity Metadata Extraction
// =============================================================================

export {
  // Activity metadata type
  type ActivityMetadata,

  // Metadata extraction
  getActivityMetadata,
} from "./devtools/index.js";

// =============================================================================
// Errors Module - Error Hierarchy
// =============================================================================

export {
  // Base class
  FlowError,

  // Specific error types
  InvalidTransitionError,
  InvalidStateError,
  InvalidEventError,
  ActivityError,
  EffectExecutionError,
  DisposedMachineError,

  // Utility function
  extractErrorMessage,
} from "./errors/index.js";
