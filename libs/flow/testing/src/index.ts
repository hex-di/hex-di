/**
 * @hex-di/flow-testing - Testing utilities for @hex-di/flow
 *
 * Provides test harnesses, mock executors, assertions, snapshot utilities,
 * event recorders, mock activities, and virtual clock for testing
 * state machine-based code.
 *
 * @packageDocumentation
 */

// =============================================================================
// Test Machine Harness
// =============================================================================

export {
  createFlowTestHarness,
  type TestMachineHarness,
  type TestMachineOptions,
} from "./test-machine.js";

// =============================================================================
// Mock Effect Executor
// =============================================================================

export {
  createMockEffectExecutor,
  type MockEffectExecutorResult,
  type MockEffectResponse,
  type RecordedEffect,
} from "./mock-effect-executor.js";

// =============================================================================
// Assertions
// =============================================================================

export {
  expectFlowState,
  expectEvents,
  expectEventTypes,
  expectSnapshot,
  type FlowStateAssertions,
  type SnapshotAssertions,
} from "./assertions.js";

// =============================================================================
// Event Recorder
// =============================================================================

export {
  createFlowEventRecorder,
  type FlowEventRecorder,
  type RecordedTransition,
} from "./event-recorder.js";

// =============================================================================
// Mock Activity
// =============================================================================

export { createMockActivity, type MockActivity } from "./mock-activity.js";

// =============================================================================
// Snapshot Utilities
// =============================================================================

export { serializeSnapshot, snapshotMachine, type SerializedSnapshot } from "./snapshot.js";

// =============================================================================
// Virtual Clock
// =============================================================================

export { createVirtualClock, type VirtualClock } from "./virtual-clock.js";

// =============================================================================
// Guard Testing
// =============================================================================

export {
  testGuard,
  testGuardSafe,
  type TestGuardInput,
  type TestGuardResult,
} from "./test-guard.js";

// =============================================================================
// Transition Testing
// =============================================================================

export {
  testTransition,
  type TestTransitionOptions,
  type TestTransitionResult,
} from "./test-transition.js";

// =============================================================================
// Effect Testing
// =============================================================================

export {
  testEffect,
  testEffectSafe,
  type EffectMocks,
  type TestEffectOptions,
  type TestEffectResult,
} from "./test-effect.js";

// =============================================================================
// Flow Integration Testing
// =============================================================================

export {
  testFlowInContainer,
  type ContainerMocks,
  type TestFlowInContainerConfig,
  type TestFlowInContainerResult,
  type InvocationRecord,
} from "./test-flow-in-container.js";

// =============================================================================
// Result Testing Utilities (re-exported from @hex-di/result-testing)
// =============================================================================

export { expectOk, expectErr, expectOkAsync, expectErrAsync } from "@hex-di/result-testing";
