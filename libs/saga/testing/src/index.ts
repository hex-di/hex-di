/**
 * @hex-di/saga-testing - Testing utilities for @hex-di/saga
 *
 * Provides test harnesses, mock step executors, mock persisters,
 * saga result assertions, and event recorders.
 *
 * @packageDocumentation
 */

export {
  createSagaTestHarness,
  type SagaTestHarness,
  type SagaTestHarnessConfig,
  type MockStepResponse,
} from "./test-harness.js";

export {
  createMockStepExecutor,
  type MockStepExecutor,
  type MockStepExecutorConfig,
} from "./mock-step-executor.js";

export { createMockSagaPersister, type MockSagaPersister } from "./mock-persister.js";

export { expectSagaResult, type SagaResultAssertions } from "./assertions.js";

export { createSagaEventRecorder, type SagaEventRecorder } from "./event-recorder.js";
