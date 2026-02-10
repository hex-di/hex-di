/**
 * Type-level tests for Runner & Interpreter (DoD 7).
 *
 * These tests verify compile-time validation of:
 * 1. MachineRunner send() return type is Result<readonly EffectAny[], TransitionError>
 * 2. MachineRunner sendAndExecute() return type is ResultAsync<void, TransitionError | EffectExecutionError>
 * 3. MachineRunner dispose() return type is ResultAsync<void, DisposeError>
 * 4. MachineSnapshot carries typed state and context
 * 5. EffectExecutor execute() return type
 * 6. MachineRunnerAny is a valid constraint for generic runner parameters
 * 7. PendingEvent types
 */

import { describe, expectTypeOf, it } from "vitest";
import type { Result, ResultAsync } from "@hex-di/result";
import type { EffectAny } from "../src/effects/types.js";
import type { TransitionError, EffectExecutionError, DisposeError } from "../src/errors/index.js";
import type { ActivityStatus, ActivityInstance } from "../src/activities/types.js";
import type {
  MachineSnapshot,
  MachineRunner,
  MachineRunnerAny,
  EffectExecutor,
  StateValue,
  PendingEvent,
} from "../src/runner/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

type TestState = "idle" | "loading" | "done";
type TestEvent = { readonly type: "FETCH" } | { readonly type: "DONE" };
interface TestContext {
  data: string | null;
}

type TestRunner = MachineRunner<TestState, TestEvent, TestContext>;

// =============================================================================
// Test 1: MachineRunner.send() return type
// =============================================================================

describe("MachineRunner send() return type", () => {
  it("returns Result<readonly EffectAny[], TransitionError>", () => {
    type SendReturn = ReturnType<TestRunner["send"]>;
    expectTypeOf<SendReturn>().toMatchTypeOf<Result<readonly EffectAny[], TransitionError>>();
  });

  it("send accepts typed event parameter", () => {
    type SendParam = Parameters<TestRunner["send"]>[0];
    expectTypeOf<SendParam>().toEqualTypeOf<TestEvent>();
  });
});

// =============================================================================
// Test 2: MachineRunner.sendAndExecute() return type
// =============================================================================

describe("MachineRunner sendAndExecute() return type", () => {
  it("returns ResultAsync<void, TransitionError | EffectExecutionError>", () => {
    type SendAndExecReturn = ReturnType<TestRunner["sendAndExecute"]>;
    expectTypeOf<SendAndExecReturn>().toMatchTypeOf<
      ResultAsync<void, TransitionError | EffectExecutionError>
    >();
  });

  it("sendAndExecute accepts typed event parameter", () => {
    type Param = Parameters<TestRunner["sendAndExecute"]>[0];
    expectTypeOf<Param>().toEqualTypeOf<TestEvent>();
  });
});

// =============================================================================
// Test 3: MachineRunner.dispose() return type
// =============================================================================

describe("MachineRunner dispose() return type", () => {
  it("returns ResultAsync<void, DisposeError>", () => {
    type DisposeReturn = ReturnType<TestRunner["dispose"]>;
    expectTypeOf<DisposeReturn>().toMatchTypeOf<ResultAsync<void, DisposeError>>();
  });

  it("isDisposed is readonly boolean", () => {
    expectTypeOf<TestRunner["isDisposed"]>().toBeBoolean();
  });
});

// =============================================================================
// Test 4: MachineSnapshot typing
// =============================================================================

describe("MachineSnapshot carries typed state and context", () => {
  it("state is typed as TestState", () => {
    type Snap = MachineSnapshot<TestState, TestContext>;
    expectTypeOf<Snap["state"]>().toEqualTypeOf<TestState>();
  });

  it("context is typed as TestContext", () => {
    type Snap = MachineSnapshot<TestState, TestContext>;
    expectTypeOf<Snap["context"]>().toEqualTypeOf<TestContext>();
  });

  it("activities is readonly ActivityInstance[]", () => {
    type Snap = MachineSnapshot<TestState, TestContext>;
    expectTypeOf<Snap["activities"]>().toEqualTypeOf<readonly ActivityInstance[]>();
  });

  it("stateValue is StateValue", () => {
    type Snap = MachineSnapshot<TestState, TestContext>;
    expectTypeOf<Snap["stateValue"]>().toEqualTypeOf<StateValue>();
  });

  it("matches() accepts string and returns boolean", () => {
    type Snap = MachineSnapshot<TestState, TestContext>;
    type MatchesFn = Snap["matches"];
    expectTypeOf<MatchesFn>().toBeFunction();
    expectTypeOf<ReturnType<MatchesFn>>().toBeBoolean();
    expectTypeOf<Parameters<MatchesFn>[0]>().toBeString();
  });

  it("can() accepts event and returns boolean", () => {
    type Snap = MachineSnapshot<TestState, TestContext>;
    type CanFn = Snap["can"];
    expectTypeOf<CanFn>().toBeFunction();
    expectTypeOf<ReturnType<CanFn>>().toBeBoolean();
  });

  it("snapshot() method on runner returns typed snapshot", () => {
    type SnapReturn = ReturnType<TestRunner["snapshot"]>;
    expectTypeOf<SnapReturn>().toEqualTypeOf<MachineSnapshot<TestState, TestContext>>();
  });
});

// =============================================================================
// Test 5: EffectExecutor type
// =============================================================================

describe("EffectExecutor execute() return type", () => {
  it("execute accepts EffectAny and returns ResultAsync", () => {
    type ExecFn = EffectExecutor["execute"];
    expectTypeOf<Parameters<ExecFn>[0]>().toEqualTypeOf<EffectAny>();
    expectTypeOf<ReturnType<ExecFn>>().toMatchTypeOf<ResultAsync<void, EffectExecutionError>>();
  });
});

// =============================================================================
// Test 6: MachineRunnerAny as universal constraint
// =============================================================================

describe("MachineRunnerAny is a valid constraint", () => {
  it("concrete MachineRunner is assignable to MachineRunnerAny", () => {
    expectTypeOf<TestRunner>().toMatchTypeOf<MachineRunnerAny>();
  });

  it("MachineRunnerAny has all expected methods", () => {
    expectTypeOf<MachineRunnerAny["send"]>().toBeFunction();
    expectTypeOf<MachineRunnerAny["sendAndExecute"]>().toBeFunction();
    expectTypeOf<MachineRunnerAny["sendBatch"]>().toBeFunction();
    expectTypeOf<MachineRunnerAny["subscribe"]>().toBeFunction();
    expectTypeOf<MachineRunnerAny["dispose"]>().toBeFunction();
    expectTypeOf<MachineRunnerAny["snapshot"]>().toBeFunction();
    expectTypeOf<MachineRunnerAny["getActivityStatus"]>().toBeFunction();
  });

  it("sendBatch accepts events and returns Result", () => {
    type BatchReturn = ReturnType<TestRunner["sendBatch"]>;
    expectTypeOf<BatchReturn>().toMatchTypeOf<Result<readonly EffectAny[], TransitionError>>();
  });

  it("subscribe callback receives typed snapshot", () => {
    type SubParam = Parameters<TestRunner["subscribe"]>[0];
    type CallbackParam = Parameters<SubParam>[0];
    expectTypeOf<CallbackParam>().toEqualTypeOf<MachineSnapshot<TestState, TestContext>>();
  });

  it("getActivityStatus returns ActivityStatus or undefined", () => {
    type StatusReturn = ReturnType<TestRunner["getActivityStatus"]>;
    expectTypeOf<StatusReturn>().toEqualTypeOf<ActivityStatus | undefined>();
  });
});

// =============================================================================
// Test 7: PendingEvent types
// =============================================================================

describe("MachineSnapshot pendingEvents types", () => {
  it("MachineSnapshot has typed pendingEvents", () => {
    type Snap = MachineSnapshot<TestState, TestContext>;
    expectTypeOf<Snap["pendingEvents"]>().toEqualTypeOf<readonly PendingEvent[]>();
  });

  it("PendingEvent has correct shape", () => {
    expectTypeOf<PendingEvent["type"]>().toBeString();
    expectTypeOf<PendingEvent["source"]>().toEqualTypeOf<"emit" | "delay" | "external">();
    expectTypeOf<PendingEvent["enqueuedAt"]>().toBeNumber();
  });
});
