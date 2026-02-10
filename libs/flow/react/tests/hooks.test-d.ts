/**
 * Type-level tests for @hex-di/flow-react hooks.
 *
 * These tests verify compile-time type inference and constraints:
 * 1. useMachine infers state/event/context types from Port
 * 2. useSelector infers selector parameter types from Port
 * 3. useSend infers event type from Port
 * 4. useFlow provides typed snapshot, send, matches, can, status
 * 5. useMachineSelector receives typed MachineSnapshot in selector
 * 6. useActivity returns UseActivityResult
 */

import { describe, expectTypeOf, it } from "vitest";
import { port } from "@hex-di/core";
import type {
  FlowService,
  MachineSnapshot,
  ActivityInstance,
  ActivityStatus,
  TransitionError,
  EffectExecutionError,
} from "@hex-di/flow";
import { ResultAsync } from "@hex-di/flow";
import {
  useMachine,
  useSelector,
  useSend,
  useFlow,
  useMachineSelector,
  useActivity,
  type UseMachineResult,
  type UseFlowResult,
  type FlowStatus,
  type UseActivityResult,
} from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

type TestState = "idle" | "loading" | "success" | "error";
type TestEvent = "FETCH" | "SUCCESS" | "FAILURE" | "RESET";
interface TestContext {
  data: string | null;
  error: string | null;
}

type TestFlowService = FlowService<TestState, TestEvent, TestContext>;

const TestFlowPort = port<TestFlowService>()({ name: "TestFlow" });

// =============================================================================
// Test 1: useMachine infers state/event/context types from Port
// =============================================================================

describe("useMachine infers types from Port", () => {
  it("infers state type", () => {
    const result = useMachine(TestFlowPort);
    expectTypeOf(result.state).toEqualTypeOf<TestState>();
  });

  it("infers context type", () => {
    const result = useMachine(TestFlowPort);
    expectTypeOf(result.context).toEqualTypeOf<TestContext>();
  });

  it("infers send event type", () => {
    const result = useMachine(TestFlowPort);
    expectTypeOf(result.send).toEqualTypeOf<
      (event: {
        readonly type: TestEvent;
      }) => ResultAsync<void, TransitionError | EffectExecutionError>
    >();
  });

  it("infers activities type", () => {
    const result = useMachine(TestFlowPort);
    expectTypeOf(result.activities).toEqualTypeOf<readonly ActivityInstance[]>();
  });

  it("returns UseMachineResult with correct type params", () => {
    const result = useMachine(TestFlowPort);
    expectTypeOf(result).toMatchTypeOf<UseMachineResult<TestState, TestEvent, TestContext>>();
  });
});

// =============================================================================
// Test 2: useSelector infers selector parameter types from Port
// =============================================================================

describe("useSelector infers selector parameter types from Port", () => {
  it("selector receives state typed as TestState", () => {
    useSelector(TestFlowPort, (state, _context) => {
      expectTypeOf(state).toEqualTypeOf<TestState>();
      return state === "loading";
    });
  });

  it("selector receives context typed as TestContext", () => {
    useSelector(TestFlowPort, (_state, context) => {
      expectTypeOf(context).toEqualTypeOf<TestContext>();
      return context.data;
    });
  });

  it("return type matches selector return", () => {
    const result = useSelector(TestFlowPort, state => state === "idle");
    expectTypeOf(result).toEqualTypeOf<boolean>();
  });

  it("return type inferred for complex selectors", () => {
    const result = useSelector(TestFlowPort, (_state, context) => ({
      hasData: context.data !== null,
      hasError: context.error !== null,
    }));
    expectTypeOf(result).toEqualTypeOf<{
      hasData: boolean;
      hasError: boolean;
    }>();
  });
});

// =============================================================================
// Test 3: useSend infers event type from Port
// =============================================================================

describe("useSend infers event type from Port", () => {
  it("send function accepts typed events", () => {
    const send = useSend(TestFlowPort);
    expectTypeOf(send).toBeFunction();
    expectTypeOf(send).parameter(0).toMatchTypeOf<{ readonly type: TestEvent }>();
  });

  it("send function returns ResultAsync", () => {
    const send = useSend(TestFlowPort);
    const result = send({ type: "FETCH" });
    expectTypeOf(result).toEqualTypeOf<ResultAsync<void, TransitionError | EffectExecutionError>>();
  });
});

// =============================================================================
// Test 4: useFlow provides typed snapshot, send, matches, can, status
// =============================================================================

describe("useFlow provides typed result", () => {
  it("snapshot is typed with state and context", () => {
    const { snapshot } = useFlow(TestFlowPort);
    expectTypeOf(snapshot).toMatchTypeOf<MachineSnapshot<TestState, TestContext>>();
    expectTypeOf(snapshot.state).toEqualTypeOf<TestState>();
    expectTypeOf(snapshot.context).toEqualTypeOf<TestContext>();
  });

  it("send accepts typed events", () => {
    const { send } = useFlow(TestFlowPort);
    expectTypeOf(send).toBeFunction();
    expectTypeOf(send).parameter(0).toMatchTypeOf<{ readonly type: TestEvent }>();
  });

  it("matches accepts string path", () => {
    const { matches } = useFlow(TestFlowPort);
    expectTypeOf(matches).toBeFunction();
    expectTypeOf(matches).parameter(0).toBeString();
    expectTypeOf(matches("idle")).toBeBoolean();
  });

  it("can accepts event object", () => {
    const { can } = useFlow(TestFlowPort);
    expectTypeOf(can).toBeFunction();
    expectTypeOf(can({ type: "FETCH" })).toBeBoolean();
  });

  it("status is FlowStatus", () => {
    const { status } = useFlow(TestFlowPort);
    expectTypeOf(status).toEqualTypeOf<FlowStatus>();
  });

  it("returns UseFlowResult with correct type params", () => {
    const result = useFlow(TestFlowPort);
    expectTypeOf(result).toMatchTypeOf<UseFlowResult<TestState, TestEvent, TestContext>>();
  });
});

// =============================================================================
// Test 5: useMachineSelector receives typed MachineSnapshot
// =============================================================================

describe("useMachineSelector receives typed MachineSnapshot in selector", () => {
  it("selector receives MachineSnapshot with correct state/context", () => {
    useMachineSelector(TestFlowPort, snapshot => {
      expectTypeOf(snapshot).toMatchTypeOf<MachineSnapshot<TestState, TestContext>>();
      expectTypeOf(snapshot.state).toEqualTypeOf<TestState>();
      expectTypeOf(snapshot.context).toEqualTypeOf<TestContext>();
      return snapshot.matches("idle");
    });
  });

  it("return type matches selector return", () => {
    const result = useMachineSelector(TestFlowPort, snapshot => snapshot.state === "loading");
    expectTypeOf(result).toEqualTypeOf<boolean>();
  });

  it("snapshot provides matches and can methods", () => {
    useMachineSelector(TestFlowPort, snapshot => {
      expectTypeOf(snapshot.matches).toBeFunction();
      expectTypeOf(snapshot.can).toBeFunction();
      return true;
    });
  });
});

// =============================================================================
// Test 6: useActivity returns UseActivityResult
// =============================================================================

describe("useActivity returns UseActivityResult", () => {
  it("returns UseActivityResult shape", () => {
    const result = useActivity(TestFlowPort, "my-activity");
    expectTypeOf(result).toEqualTypeOf<UseActivityResult>();
  });

  it("status is ActivityStatus or undefined", () => {
    const { status } = useActivity(TestFlowPort, "my-activity");
    expectTypeOf(status).toEqualTypeOf<ActivityStatus | undefined>();
  });

  it("events is readonly ActivityInstance array", () => {
    const { events } = useActivity(TestFlowPort, "my-activity");
    expectTypeOf(events).toEqualTypeOf<readonly ActivityInstance[]>();
  });
});

// =============================================================================
// Test 7: useMachine return type is correctly structured
// =============================================================================

describe("useMachine return type structure", () => {
  it("result has all required keys", () => {
    const result = useMachine(TestFlowPort);
    expectTypeOf(result).toHaveProperty("state");
    expectTypeOf(result).toHaveProperty("context");
    expectTypeOf(result).toHaveProperty("send");
    expectTypeOf(result).toHaveProperty("activities");
  });

  it("send returns ResultAsync", () => {
    const result = useMachine(TestFlowPort);
    const sendResult = result.send({ type: "FETCH" });
    expectTypeOf(sendResult).toEqualTypeOf<
      ResultAsync<void, TransitionError | EffectExecutionError>
    >();
  });
});

// =============================================================================
// Test 8: useSelector with custom equality function typing
// =============================================================================

describe("useSelector equality function typing", () => {
  it("equality function receives same type as selector return", () => {
    useSelector(
      TestFlowPort,
      (state, context) => ({ state, dataLen: context.data?.length ?? 0 }),
      (a, b) => {
        expectTypeOf(a).toEqualTypeOf<{ state: TestState; dataLen: number }>();
        expectTypeOf(b).toEqualTypeOf<{ state: TestState; dataLen: number }>();
        return a.state === b.state;
      }
    );
  });
});

// =============================================================================
// Test 9: useFlow snapshot contains correct nested types
// =============================================================================

describe("useFlow snapshot nested types", () => {
  it("snapshot.activities is readonly array", () => {
    const { snapshot } = useFlow(TestFlowPort);
    expectTypeOf(snapshot.activities).toEqualTypeOf<readonly ActivityInstance[]>();
  });

  it("snapshot.matches returns boolean", () => {
    const { snapshot } = useFlow(TestFlowPort);
    const result = snapshot.matches("idle");
    expectTypeOf(result).toBeBoolean();
  });

  it("snapshot.can returns boolean", () => {
    const { snapshot } = useFlow(TestFlowPort);
    const result = snapshot.can({ type: "FETCH" });
    expectTypeOf(result).toBeBoolean();
  });
});

// =============================================================================
// Test 10: FlowProvider props typing
// =============================================================================

describe("FlowProvider props typing", () => {
  it("FlowProvider requires collector prop", () => {
    // This is a compile-time test: FlowProviderProps should require collector
    type Props = import("../src/index.js").FlowProviderProps;
    expectTypeOf<Props>().toHaveProperty("collector");
  });

  it("FlowProvider accepts optional service prop", () => {
    type Props = import("../src/index.js").FlowProviderProps;
    expectTypeOf<Props>().toHaveProperty("service");
  });
});
