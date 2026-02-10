/**
 * @hex-di/store-testing - Testing utilities for @hex-di/store
 *
 * Provides mock state/atom adapters with spy tracking, fluent assertions
 * for state/atom/derived/async-derived services, action recorders,
 * and async state waiters.
 *
 * @packageDocumentation
 */

// =============================================================================
// Mock Adapters
// =============================================================================

export {
  createMockStateAdapter,
  createMockAtomAdapter,
  type MockStateAdapterConfig,
  type MockStateService,
  type ActionSpy,
  type MockAtomAdapterConfig,
  type MockAtomService,
  type AtomSpy,
} from "./mock-adapters.js";

// =============================================================================
// Assertions
// =============================================================================

export {
  expectState,
  expectAtom,
  expectDerived,
  expectAsyncDerived,
  type StateAssertions,
  type AtomAssertions,
  type DerivedAssertions,
  type AsyncDerivedAssertions,
} from "./assertions.js";

// =============================================================================
// Action Recorder
// =============================================================================

export {
  createActionRecorder,
  type ActionRecorder,
  type RecordedAction,
} from "./action-recorder.js";

// =============================================================================
// Wait For State
// =============================================================================

export { waitForState } from "./wait-for-state.js";

// =============================================================================
// Test Container
// =============================================================================

export {
  createStateTestContainer,
  type StateTestContainerConfig,
  type TestContainer,
} from "./test-container.js";
