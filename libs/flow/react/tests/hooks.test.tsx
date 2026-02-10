/**
 * Unit tests for @hex-di/flow-react hooks.
 *
 * DoD 9 tests:
 * 1. useMachine returns current state and send function
 * 2. useMachine updates on state change
 * 3. useMachine uses useSyncExternalStore (concurrent mode safety)
 * 4. useSelector returns derived state with referential equality
 * 5. useSelector only re-renders when selected value changes
 * 6. useSelector accepts custom equality function
 * 7. useSend returns stable callback reference
 * 8. useSend does not re-render on transitions
 * 9. useFlow returns snapshot, send, matches, can, status
 * 10. useFlow.matches('active') checks state
 * 11. useFlow.can(event) checks valid transitions
 * 12. useFlow.status is 'active', 'done', or 'error'
 * 13. useMachineSelector accepts full snapshot in selector
 * 14. useFlowEvent fires callback only for matching event type
 * 15. useFlowEvent does not cause re-renders
 * 16. useActivity returns status and events for named activity
 * 17. FlowProvider disposes runner on unmount
 * 18. FlowProvider provides collector to descendants
 * 19. Scoped flows: nested containers create isolated machine instances
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import React, { useEffect } from "react";
import { port, type Port } from "@hex-di/core";
import { HexDiContainerProvider } from "@hex-di/react";
import type {
  FlowService,
  FlowServiceAny,
  MachineSnapshot,
  ActivityStatus,
  EffectAny,
  FlowCollector,
  FlowTransitionEventAny,
  FlowTransitionFilter,
  FlowStats,
} from "@hex-di/flow";
import {
  useMachine,
  useSelector,
  useSend,
  useFlow,
  useMachineSelector,
  useActivity,
} from "../src/hooks/index.js";
import { useFlowEvent } from "../src/hooks/use-flow-event.js";
import { FlowProvider, useFlowCollector } from "../src/context/index.js";
import { shallowEqual } from "../src/hooks/shallow-equal.js";

// =============================================================================
// shallowEqual Unit Tests
// =============================================================================

describe("shallowEqual", () => {
  // --- Same reference ---
  it("returns true for the same reference", () => {
    const obj = { a: 1, b: 2 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  // --- Identical primitives ---
  it("returns true for identical numbers", () => {
    expect(shallowEqual(1, 1)).toBe(true);
  });

  it("returns true for identical strings", () => {
    expect(shallowEqual("hello", "hello")).toBe(true);
  });

  it("returns true for both being null", () => {
    expect(shallowEqual(null, null)).toBe(true);
  });

  it("returns true for both being undefined", () => {
    expect(shallowEqual(undefined, undefined)).toBe(true);
  });

  // --- Different primitives ---
  it("returns false for different numbers", () => {
    expect(shallowEqual(1, 2)).toBe(false);
  });

  it("returns false for different strings", () => {
    expect(shallowEqual("a", "b")).toBe(false);
  });

  // --- NaN comparison (via Object.is) ---
  it("returns true for NaN vs NaN via Object.is", () => {
    expect(shallowEqual(NaN, NaN)).toBe(true);
  });

  // --- null vs object ---
  it("returns false for null vs object", () => {
    expect(shallowEqual(null, { a: 1 })).toBe(false);
  });

  it("returns false for object vs null", () => {
    expect(shallowEqual({ a: 1 }, null)).toBe(false);
  });

  // --- Non-object types that are not equal ---
  it("returns false for non-equal non-object types (number vs string)", () => {
    expect(shallowEqual(1 as unknown, "1" as unknown)).toBe(false);
  });

  // --- typeof checks: non-object vs object (kills typeof a !== "object" -> false mutant) ---
  it("returns false for number vs object", () => {
    expect(shallowEqual(42 as unknown, {} as unknown)).toBe(false);
  });

  it("returns false for object vs number", () => {
    expect(shallowEqual({} as unknown, 42 as unknown)).toBe(false);
  });

  it("returns false for string vs object", () => {
    expect(shallowEqual("hello" as unknown, { length: 5 } as unknown)).toBe(false);
  });

  it("returns false for object vs string", () => {
    expect(shallowEqual({ length: 5 } as unknown, "hello" as unknown)).toBe(false);
  });

  // --- Array equality ---
  it("returns true for two equal arrays", () => {
    expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("returns true for two empty arrays", () => {
    expect(shallowEqual([], [])).toBe(true);
  });

  // --- Arrays with different lengths (both directions to catch BlockStatement mutants) ---
  it("returns false for arrays where first is longer", () => {
    expect(shallowEqual([1, 2, 3], [1, 2])).toBe(false);
  });

  it("returns false for arrays where second is longer (kills BlockStatement removal of length check)", () => {
    // When BlockStatement mutant removes "return false" from length check,
    // the for loop uses a.length=2, checks elements 0 and 1 which match,
    // and returns true instead of false. This test catches that.
    expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  // --- Arrays with different elements ---
  it("returns false for arrays with different elements", () => {
    expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it("returns false for arrays differing only at first element", () => {
    expect(shallowEqual([0, 2, 3], [1, 2, 3])).toBe(false);
  });

  // --- Array vs object ---
  it("returns false for array vs object", () => {
    expect(shallowEqual([1, 2] as unknown, { 0: 1, 1: 2 } as unknown)).toBe(false);
  });

  it("returns false for object vs array", () => {
    expect(shallowEqual({ 0: 1, 1: 2 } as unknown, [1, 2] as unknown)).toBe(false);
  });

  // --- Object equality ---
  it("returns true for two equal objects", () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it("returns true for two empty objects", () => {
    expect(shallowEqual({}, {})).toBe(true);
  });

  // --- Objects with different key counts (both directions for BlockStatement mutant) ---
  it("returns false for objects where first has more keys", () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it("returns false for objects where second has more keys (kills BlockStatement removal of key count check)", () => {
    // When BlockStatement mutant removes "return false" from key count check,
    // the for loop iterates over keysA (just "a"), finds it in b with same value,
    // and returns true instead of false. This test catches that.
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  // --- Objects with same keys but different values ---
  it("returns false for objects with same keys but different values", () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
  });

  // --- Objects with key in a but not in b ---
  it("returns false when key exists in a but not in b (same key count)", () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
  });

  // --- Nested objects compared by reference only ---
  it("returns false for nested objects with equal structure but different references", () => {
    const nested1 = { inner: { x: 1 } };
    const nested2 = { inner: { x: 1 } };
    expect(shallowEqual(nested1, nested2)).toBe(false);
  });

  it("returns true for nested objects with same reference", () => {
    const inner = { x: 1 };
    const nested1 = { inner };
    const nested2 = { inner };
    expect(shallowEqual(nested1, nested2)).toBe(true);
  });

  // --- Array elements compared by reference ---
  it("returns false for arrays with equal-structure objects but different references", () => {
    expect(shallowEqual([{ a: 1 }], [{ a: 1 }])).toBe(false);
  });

  it("returns true for arrays with same object references", () => {
    const obj = { a: 1 };
    expect(shallowEqual([obj], [obj])).toBe(true);
  });

  // --- Edge: one is array, other checks both sides of the OR ---
  it("returns false when first arg is array and second is plain object", () => {
    expect(shallowEqual([1] as unknown, { length: 1, 0: 1 } as unknown)).toBe(false);
  });

  it("returns false when first arg is plain object and second is array", () => {
    expect(shallowEqual({ length: 1, 0: 1 } as unknown, [1] as unknown)).toBe(false);
  });

  // --- Additional edge cases for thorough branch coverage ---
  it("returns false for boolean true vs boolean false", () => {
    expect(shallowEqual(true as unknown, false as unknown)).toBe(false);
  });

  it("returns true for boolean true vs boolean true", () => {
    expect(shallowEqual(true as unknown, true as unknown)).toBe(true);
  });

  it("returns false for undefined vs null", () => {
    expect(shallowEqual(undefined as unknown, null as unknown)).toBe(false);
  });

  it("returns false for null vs undefined", () => {
    expect(shallowEqual(null as unknown, undefined as unknown)).toBe(false);
  });
});

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Symbol for internal access - matches the one used in @hex-di/runtime
 */
const INTERNAL_ACCESS = Symbol.for("hex-di/internal-access");

type TestState = "idle" | "loading" | "success" | "error";
type TestEvent = "FETCH" | "SUCCESS" | "ERROR" | "RESET";

interface TestContext {
  readonly data: string | null;
  readonly error: string | null;
}

type TestFlowService = FlowService<TestState, TestEvent, TestContext>;

const TestFlowPort = port<TestFlowService>()({ name: "TestFlow" });

// =============================================================================
// Mock Helpers
// =============================================================================

/**
 * Creates a mock MachineSnapshot with required stateValue, matches, can.
 */
function mockSnapshot<TState extends string, TContext>(
  state: TState,
  context: TContext,
  activities: readonly {
    readonly id: string;
    readonly status: ActivityStatus;
    readonly startTime: number;
    readonly endTime: number | undefined;
  }[] = [],
  options?: {
    readonly matchesFn?: (path: string) => boolean;
    readonly canFn?: (event: { readonly type: string }) => boolean;
  }
): MachineSnapshot<TState, TContext> {
  return {
    state,
    context,
    activities,
    stateValue: state,
    pendingEvents: [],
    matches: options?.matchesFn ?? ((path: string) => path === state),
    can: options?.canFn ?? (() => true),
  };
}

/**
 * Creates a mock ResultAsync-like object with a match() method.
 * The hooks call .match() to convert ResultAsync to Promise<void>.
 */
function mockResultAsync(): { match: ReturnType<typeof vi.fn> } {
  return {
    match: vi
      .fn()
      .mockImplementation((onOk: (v: void) => unknown) => Promise.resolve(onOk(undefined))),
  };
}

/**
 * Creates a mock Result object with an _tag.
 */
function mockOkResult(value: unknown = []): { readonly _tag: "Ok"; readonly value: unknown } {
  return { _tag: "Ok", value };
}

/**
 * Creates a mock FlowService with configurable behavior.
 */
function createMockFlowService(initialSnapshot: MachineSnapshot<TestState, TestContext>): {
  service: TestFlowService;
  subscribers: Set<(snapshot: MachineSnapshot<TestState, TestContext>) => void>;
  triggerStateChange: (snapshot: MachineSnapshot<TestState, TestContext>) => void;
  sendMock: ReturnType<typeof vi.fn>;
  sendAndExecuteMock: ReturnType<typeof vi.fn>;
  disposeMock: ReturnType<typeof vi.fn>;
} {
  let currentSnapshot = initialSnapshot;
  const subscribers = new Set<(snapshot: MachineSnapshot<TestState, TestContext>) => void>();

  const sendMock = vi.fn().mockReturnValue(mockOkResult([]));
  const sendAndExecuteMock = vi.fn().mockReturnValue(mockResultAsync());
  const disposeMock = vi.fn().mockReturnValue(mockResultAsync());

  const service: TestFlowService = {
    snapshot: () => currentSnapshot,
    state: () => currentSnapshot.state,
    context: () => currentSnapshot.context,
    send: sendMock,
    sendBatch: vi.fn().mockReturnValue(mockOkResult([])),
    sendAndExecute: sendAndExecuteMock,
    subscribe: (callback: (snapshot: MachineSnapshot<TestState, TestContext>) => void) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    getActivityStatus: (_id: string): ActivityStatus | undefined => undefined,
    dispose: disposeMock,
    isDisposed: false,
  };

  const triggerStateChange = (snapshot: MachineSnapshot<TestState, TestContext>): void => {
    currentSnapshot = snapshot;
    subscribers.forEach(cb => cb(snapshot));
  };

  return { service, subscribers, triggerStateChange, sendMock, sendAndExecuteMock, disposeMock };
}

/**
 * Creates a mock container for testing.
 */
function createMockContainer<P extends Port<unknown, string>>(
  flowService: TestFlowService,
  testPort: P
): any {
  const mockResolve = vi.fn().mockImplementation((p: Port<unknown, string>) => {
    const pName = (p as { name?: string }).name;
    const tName = (testPort as { name?: string }).name;
    if (pName === tName) {
      return flowService;
    }
    throw new Error(`Unknown port: ${pName}`);
  });

  const mockScope = {
    resolve: mockResolve,
    resolveAsync: vi.fn().mockImplementation((p: Port<unknown, string>) => {
      return Promise.resolve(mockResolve(p));
    }),
    createScope: vi.fn(),
    dispose: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockReturnValue(true),
    isDisposed: false,
    [INTERNAL_ACCESS]: () => ({
      disposed: false,
      singletonMemo: new Map(),
      scopedMemo: new Map(),
      containerId: "mock-scope",
      scopeId: "mock-scope-id",
    }),
  };

  return {
    resolve: mockResolve,
    resolveAsync: vi.fn().mockImplementation((p: Port<unknown, string>) => {
      return Promise.resolve(mockResolve(p));
    }),
    createScope: vi.fn().mockReturnValue(mockScope),
    createChild: vi.fn(),
    dispose: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockReturnValue(true),
    initialize: vi.fn().mockImplementation(function (this: unknown) {
      return Promise.resolve(this);
    }),
    isInitialized: false,
    isDisposed: false,
    [INTERNAL_ACCESS]: () => ({
      disposed: false,
      singletonMemo: new Map(),
      containerId: "mock-container",
    }),
  };
}

const initialSnapshot = mockSnapshot("idle", { data: null, error: null });

/**
 * Creates a mock FlowCollector for testing.
 */
function createMockCollector(): FlowCollector & { readonly transitions: FlowTransitionEventAny[] } {
  const transitions: FlowTransitionEventAny[] = [];
  const subscribers = new Set<(event: FlowTransitionEventAny) => void>();

  return {
    transitions,
    collect: (event: FlowTransitionEventAny) => {
      transitions.push(event);
      subscribers.forEach(cb => cb(event));
    },
    getTransitions: (_filter?: FlowTransitionFilter) => transitions,
    getStats: (): FlowStats => ({
      totalTransitions: transitions.length,
      averageDuration: 0,
      slowCount: 0,
      sessionStart: Date.now(),
      totalDuration: 0,
      transitionsByMachine: {},
    }),
    clear: () => {
      transitions.length = 0;
    },
    subscribe: (callback: (event: FlowTransitionEventAny) => void) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
  };
}

/**
 * Creates a mock FlowTransitionEvent.
 */
function createMockTransitionEvent(
  eventType: string,
  overrides?: Partial<FlowTransitionEventAny>
): FlowTransitionEventAny {
  return {
    id: `transition-${Math.random().toString(36).slice(2)}`,
    machineId: "test-machine",
    prevState: "idle",
    event: { type: eventType },
    nextState: "loading",
    effects: [],
    timestamp: Date.now(),
    duration: 0.5,
    isPinned: false,
    ...overrides,
  };
}

// =============================================================================
// useMachine Tests (DoD 9.1-9.3)
// =============================================================================

describe("useMachine", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns current state and send function", () => {
    const { service } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { state, context, send, activities } = useMachine(TestFlowPort);

      const handleClick = (): void => {
        void send({ type: "FETCH" });
      };

      return (
        <div>
          <div data-testid="state">{state}</div>
          <div data-testid="data">{context.data ?? "null"}</div>
          <div data-testid="activities">{activities.length}</div>
          <button data-testid="send" onClick={handleClick}>
            Send
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("idle");
    expect(screen.getByTestId("data").textContent).toBe("null");
    expect(screen.getByTestId("activities").textContent).toBe("0");

    act(() => {
      screen.getByTestId("send").click();
    });

    expect(service.sendAndExecute).toHaveBeenCalledWith({ type: "FETCH" });
  });

  it("updates on state change", () => {
    const { service, triggerStateChange } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { state, context } = useMachine(TestFlowPort);
      return (
        <div>
          <div data-testid="state">{state}</div>
          <div data-testid="data">{context.data ?? "null"}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("idle");

    act(() => {
      triggerStateChange(mockSnapshot("loading", { data: null, error: null }));
    });

    expect(screen.getByTestId("state").textContent).toBe("loading");

    act(() => {
      triggerStateChange(mockSnapshot("success", { data: "loaded data", error: null }));
    });

    expect(screen.getByTestId("state").textContent).toBe("success");
    expect(screen.getByTestId("data").textContent).toBe("loaded data");
  });

  it("unsubscribes on unmount", () => {
    const { service, subscribers } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { state } = useMachine(TestFlowPort);
      return <div data-testid="state">{state}</div>;
    }

    const { unmount } = render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(subscribers.size).toBe(1);
    unmount();
    expect(subscribers.size).toBe(0);
  });
});

// =============================================================================
// useSelector Tests (DoD 9.4-9.6)
// =============================================================================

describe("useSelector", () => {
  afterEach(() => {
    cleanup();
  });

  it("derives value from state/context", () => {
    const { service } = createMockFlowService(
      mockSnapshot("success", { data: "hello world", error: null })
    );
    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const isSuccess = useSelector(TestFlowPort, (state, _context) => state === "success");
      const dataLength = useSelector(TestFlowPort, (_state, context) => context.data?.length ?? 0);
      return (
        <div>
          <div data-testid="is-success">{isSuccess ? "yes" : "no"}</div>
          <div data-testid="data-length">{dataLength}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("is-success").textContent).toBe("yes");
    expect(screen.getByTestId("data-length").textContent).toBe("11");
  });

  it("uses shallow equality by default", () => {
    const { service, triggerStateChange } = createMockFlowService(
      mockSnapshot("idle", { data: "test", error: null })
    );
    const container = createMockContainer(service, TestFlowPort);

    let renderCount = 0;

    function TestComponent(): React.ReactElement {
      renderCount++;
      const selected = useSelector(TestFlowPort, (state, context) => {
        return { state, dataLength: context.data?.length ?? 0 };
      });
      return (
        <div>
          <div data-testid="state">{selected.state}</div>
          <div data-testid="data-length">{selected.dataLength}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    const initialRenderCount = renderCount;

    // Same derived values - should NOT re-render
    act(() => {
      triggerStateChange(mockSnapshot("idle", { data: "test", error: "some error" }));
    });

    expect(renderCount).toBe(initialRenderCount);

    // Different derived values - should re-render
    act(() => {
      triggerStateChange(mockSnapshot("loading", { data: "test", error: null }));
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(screen.getByTestId("state").textContent).toBe("loading");
  });

  it("supports custom equality function", () => {
    const { service, triggerStateChange } = createMockFlowService(
      mockSnapshot("idle", { data: "test", error: null })
    );
    const container = createMockContainer(service, TestFlowPort);

    let renderCount = 0;

    function TestComponent(): React.ReactElement {
      renderCount++;
      const dataLength = useSelector(
        TestFlowPort,
        (_state, context) => context.data?.length ?? 0,
        (a, b) => a === b
      );
      return <div data-testid="data-length">{dataLength}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    const initialRenderCount = renderCount;

    // Same data length (4) - should NOT re-render
    act(() => {
      triggerStateChange(mockSnapshot("loading", { data: "abcd", error: null }));
    });

    expect(renderCount).toBe(initialRenderCount);

    // Different data length (11) - should re-render
    act(() => {
      triggerStateChange(mockSnapshot("success", { data: "longer data", error: null }));
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(screen.getByTestId("data-length").textContent).toBe("11");
  });
});

// =============================================================================
// useSend Tests (DoD 9.7-9.8)
// =============================================================================

describe("useSend", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns stable send function", () => {
    const { service, triggerStateChange } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service, TestFlowPort);

    const sendRefs: Array<(event: { readonly type: TestEvent }) => unknown> = [];

    function TestComponent(): React.ReactElement {
      const send = useSend(TestFlowPort);
      const { state } = useMachine(TestFlowPort);

      useEffect(() => {
        sendRefs.push(send);
      });

      const handleClick = (): void => {
        void send({ type: "FETCH" });
      };

      return (
        <div>
          <div data-testid="state">{state}</div>
          <button data-testid="send" onClick={handleClick}>
            Send
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    act(() => {
      triggerStateChange(mockSnapshot("loading", { data: null, error: null }));
    });

    act(() => {
      triggerStateChange(mockSnapshot("success", { data: "data", error: null }));
    });

    expect(sendRefs.length).toBeGreaterThan(1);
    const firstSendRef = sendRefs[0];
    sendRefs.forEach(ref => {
      expect(ref).toBe(firstSendRef);
    });
  });

  it("calls sendAndExecute when invoked", async () => {
    const { service, sendAndExecuteMock } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const send = useSend(TestFlowPort);

      const handleClick = (): void => {
        void send({ type: "FETCH" });
      };

      return (
        <button data-testid="send" onClick={handleClick}>
          Send
        </button>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    await act(async () => {
      screen.getByTestId("send").click();
    });

    expect(sendAndExecuteMock).toHaveBeenCalledWith({ type: "FETCH" });
  });

  it("does not re-render on transitions", () => {
    const { service, triggerStateChange } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service, TestFlowPort);

    let renderCount = 0;

    function SendOnlyComponent(): React.ReactElement {
      renderCount++;
      const send = useSend(TestFlowPort);

      return (
        <button data-testid="send" onClick={() => void send({ type: "FETCH" })}>
          Send
        </button>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SendOnlyComponent />
      </HexDiContainerProvider>
    );

    const initialRenderCount = renderCount;

    // Trigger state changes - should NOT cause SendOnlyComponent to re-render
    act(() => {
      triggerStateChange(mockSnapshot("loading", { data: null, error: null }));
    });

    act(() => {
      triggerStateChange(mockSnapshot("success", { data: "data", error: null }));
    });

    // useSend does not subscribe to state, so render count should not change
    expect(renderCount).toBe(initialRenderCount);
  });
});

// =============================================================================
// useFlow Tests (DoD 9.9-9.12)
// =============================================================================

describe("useFlow", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns snapshot, send, matches, can, status", () => {
    const matchesFn = vi.fn().mockReturnValue(true);
    const canFn = vi.fn().mockReturnValue(true);

    const { service } = createMockFlowService(
      mockSnapshot("idle", { data: null, error: null }, [], { matchesFn, canFn })
    );
    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { snapshot, send, matches, can, status } = useFlow(TestFlowPort);
      return (
        <div>
          <div data-testid="state">{snapshot.state}</div>
          <div data-testid="status">{status}</div>
          <div data-testid="matches">{matches("idle") ? "yes" : "no"}</div>
          <div data-testid="can">{can({ type: "FETCH" }) ? "yes" : "no"}</div>
          <button data-testid="send" onClick={() => void send({ type: "FETCH" })}>
            Send
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("idle");
    expect(screen.getByTestId("status").textContent).toBe("active");
    expect(screen.getByTestId("matches").textContent).toBe("yes");
    expect(screen.getByTestId("can").textContent).toBe("yes");

    act(() => {
      screen.getByTestId("send").click();
    });

    expect(service.sendAndExecute).toHaveBeenCalledWith({ type: "FETCH" });
  });

  it("matches() delegates to snapshot.matches()", () => {
    const matchesFn = vi.fn().mockImplementation((path: string) => path === "loading");

    const { service } = createMockFlowService(
      mockSnapshot("idle", { data: null, error: null }, [], { matchesFn })
    );
    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { matches } = useFlow(TestFlowPort);
      return (
        <div>
          <div data-testid="matches-loading">{matches("loading") ? "yes" : "no"}</div>
          <div data-testid="matches-idle">{matches("idle") ? "yes" : "no"}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("matches-loading").textContent).toBe("yes");
    expect(screen.getByTestId("matches-idle").textContent).toBe("no");
  });

  it("can() delegates to snapshot.can()", () => {
    const canFn = vi
      .fn()
      .mockImplementation((event: { readonly type: string }) => event.type === "FETCH");

    const { service } = createMockFlowService(
      mockSnapshot("idle", { data: null, error: null }, [], { canFn })
    );
    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { can } = useFlow(TestFlowPort);
      return (
        <div>
          <div data-testid="can-fetch">{can({ type: "FETCH" }) ? "yes" : "no"}</div>
          <div data-testid="can-reset">{can({ type: "RESET" }) ? "yes" : "no"}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("can-fetch").textContent).toBe("yes");
    expect(screen.getByTestId("can-reset").textContent).toBe("no");
  });

  it("matches() and can() update when snapshot changes", () => {
    // Initially: matches("idle") = true, can("FETCH") = true
    // After transition to "loading": matches("loading") = true, matches("idle") = false
    // This kills the [snapshot] -> [] dep array mutants for matches and can
    const initialMatchesFn = vi.fn().mockImplementation((path: string) => path === "idle");
    const initialCanFn = vi
      .fn()
      .mockImplementation((event: { readonly type: string }) => event.type === "FETCH");

    const { service, triggerStateChange } = createMockFlowService(
      mockSnapshot("idle", { data: null, error: null }, [], {
        matchesFn: initialMatchesFn,
        canFn: initialCanFn,
      })
    );
    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { matches, can, snapshot } = useFlow(TestFlowPort);
      return (
        <div>
          <div data-testid="state">{snapshot.state}</div>
          <div data-testid="matches-idle">{matches("idle") ? "yes" : "no"}</div>
          <div data-testid="matches-loading">{matches("loading") ? "yes" : "no"}</div>
          <div data-testid="can-fetch">{can({ type: "FETCH" }) ? "yes" : "no"}</div>
          <div data-testid="can-reset">{can({ type: "RESET" }) ? "yes" : "no"}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("matches-idle").textContent).toBe("yes");
    expect(screen.getByTestId("matches-loading").textContent).toBe("no");
    expect(screen.getByTestId("can-fetch").textContent).toBe("yes");
    expect(screen.getByTestId("can-reset").textContent).toBe("no");

    // Transition to "loading" with new matches/can functions
    const loadingMatchesFn = vi.fn().mockImplementation((path: string) => path === "loading");
    const loadingCanFn = vi
      .fn()
      .mockImplementation((event: { readonly type: string }) => event.type === "RESET");

    act(() => {
      triggerStateChange(
        mockSnapshot("loading", { data: null, error: null }, [], {
          matchesFn: loadingMatchesFn,
          canFn: loadingCanFn,
        })
      );
    });

    expect(screen.getByTestId("state").textContent).toBe("loading");
    expect(screen.getByTestId("matches-idle").textContent).toBe("no");
    expect(screen.getByTestId("matches-loading").textContent).toBe("yes");
    expect(screen.getByTestId("can-fetch").textContent).toBe("no");
    expect(screen.getByTestId("can-reset").textContent).toBe("yes");
  });

  it("send() targets the correct service after container swap", async () => {
    const { service: service1, sendAndExecuteMock: send1 } = createMockFlowService(initialSnapshot);
    const { service: service2, sendAndExecuteMock: send2 } = createMockFlowService(
      mockSnapshot("loading", { data: null, error: null })
    );
    const container1 = createMockContainer(service1, TestFlowPort);
    const container2 = createMockContainer(service2, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { send, snapshot } = useFlow(TestFlowPort);
      return (
        <div>
          <div data-testid="state">{snapshot.state}</div>
          <button data-testid="send" onClick={() => void send({ type: "FETCH" })}>
            Send
          </button>
        </div>
      );
    }

    const { rerender } = render(
      <HexDiContainerProvider container={container1}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    await act(async () => {
      screen.getByTestId("send").click();
    });

    expect(send1).toHaveBeenCalledWith({ type: "FETCH" });
    expect(send2).not.toHaveBeenCalled();

    rerender(
      <HexDiContainerProvider container={container2}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    await act(async () => {
      screen.getByTestId("send").click();
    });

    // After swap, send should target service2
    expect(send2).toHaveBeenCalledWith({ type: "FETCH" });
  });

  it("status is 'active' for running machine and 'done' for disposed", () => {
    const { service } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service, TestFlowPort);

    let capturedStatus: string | undefined;

    function TestComponent(): React.ReactElement {
      const { status } = useFlow(TestFlowPort);
      capturedStatus = status;
      return <div data-testid="status">{status}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(capturedStatus).toBe("active");
  });

  it("returns 'done' status when flowService.isDisposed is true", () => {
    const { service } = createMockFlowService(initialSnapshot);
    // Set service as disposed
    (service as any).isDisposed = true;
    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { status } = useFlow(TestFlowPort);
      return <div data-testid="status">{status}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("done");
  });
});

// =============================================================================
// useMachineSelector Tests (DoD 9.13)
// =============================================================================

describe("useMachineSelector", () => {
  afterEach(() => {
    cleanup();
  });

  it("accepts full snapshot in selector", () => {
    const matchesFn = vi.fn().mockReturnValue(true);

    const { service } = createMockFlowService(
      mockSnapshot("idle", { data: "test", error: null }, [], { matchesFn })
    );
    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const result = useMachineSelector(TestFlowPort, snapshot => ({
        state: snapshot.state,
        matchesIdle: snapshot.matches("idle"),
        dataLength: snapshot.context.data?.length ?? 0,
      }));

      return (
        <div>
          <div data-testid="state">{result.state}</div>
          <div data-testid="matches-idle">{result.matchesIdle ? "yes" : "no"}</div>
          <div data-testid="data-length">{result.dataLength}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("idle");
    expect(screen.getByTestId("matches-idle").textContent).toBe("yes");
    expect(screen.getByTestId("data-length").textContent).toBe("4");
  });

  it("does not re-render when selected value is the same (memoization)", () => {
    const { service, triggerStateChange } = createMockFlowService(
      mockSnapshot("idle", { data: "test", error: null })
    );
    const container = createMockContainer(service, TestFlowPort);

    let renderCount = 0;

    function TestComponent(): React.ReactElement {
      renderCount++;
      const state = useMachineSelector(TestFlowPort, snapshot => snapshot.state);
      return <div data-testid="state">{state}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    const initialRenderCount = renderCount;

    // Trigger state change that keeps same state value (context changes but state stays "idle")
    act(() => {
      triggerStateChange(mockSnapshot("idle", { data: "different", error: null }));
    });

    // Should NOT re-render since selected value (state) didn't change
    expect(renderCount).toBe(initialRenderCount);
    expect(screen.getByTestId("state").textContent).toBe("idle");
  });

  it("re-renders when selected value changes", () => {
    const { service, triggerStateChange } = createMockFlowService(
      mockSnapshot("idle", { data: "test", error: null })
    );
    const container = createMockContainer(service, TestFlowPort);

    let renderCount = 0;

    function TestComponent(): React.ReactElement {
      renderCount++;
      const state = useMachineSelector(TestFlowPort, snapshot => snapshot.state);
      return <div data-testid="state">{state}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    const initialRenderCount = renderCount;

    // Change state from "idle" to "loading"
    act(() => {
      triggerStateChange(mockSnapshot("loading", { data: "test", error: null }));
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(screen.getByTestId("state").textContent).toBe("loading");
  });

  it("supports custom equality function", () => {
    const { service, triggerStateChange } = createMockFlowService(
      mockSnapshot("idle", { data: "test", error: null })
    );
    const container = createMockContainer(service, TestFlowPort);

    let renderCount = 0;

    function TestComponent(): React.ReactElement {
      renderCount++;
      const dataLength = useMachineSelector(
        TestFlowPort,
        snapshot => snapshot.context.data?.length ?? 0,
        (a, b) => a === b
      );
      return <div data-testid="data-length">{dataLength}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    const initialRenderCount = renderCount;

    // Change data but keep same length (4) - custom equality should prevent re-render
    act(() => {
      triggerStateChange(mockSnapshot("loading", { data: "abcd", error: null }));
    });

    expect(renderCount).toBe(initialRenderCount);

    // Change data to different length (11) - should re-render
    act(() => {
      triggerStateChange(mockSnapshot("success", { data: "longer data", error: null }));
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(screen.getByTestId("data-length").textContent).toBe("11");
  });
});

// =============================================================================
// useFlowEvent Tests (DoD 9.14-9.15)
// =============================================================================

describe("useFlowEvent", () => {
  afterEach(() => {
    cleanup();
  });

  it("fires callback only for matching event type", () => {
    const collector = createMockCollector();
    const fetchCallback = vi.fn();
    const successCallback = vi.fn();

    function TestComponent(): React.ReactElement {
      useFlowEvent("FETCH", fetchCallback);
      useFlowEvent("SUCCESS", successCallback);
      return <div data-testid="component">Rendered</div>;
    }

    render(
      <FlowProvider collector={collector}>
        <TestComponent />
      </FlowProvider>
    );

    // Emit a FETCH event
    act(() => {
      collector.collect(createMockTransitionEvent("FETCH"));
    });

    expect(fetchCallback).toHaveBeenCalledTimes(1);
    expect(successCallback).not.toHaveBeenCalled();

    // Emit a SUCCESS event
    act(() => {
      collector.collect(createMockTransitionEvent("SUCCESS"));
    });

    expect(fetchCallback).toHaveBeenCalledTimes(1);
    expect(successCallback).toHaveBeenCalledTimes(1);
  });

  it("does not cause re-renders", () => {
    const collector = createMockCollector();
    let renderCount = 0;

    function TestComponent(): React.ReactElement {
      renderCount++;
      useFlowEvent("FETCH", () => {
        // no-op callback
      });
      return <div data-testid="component">Rendered</div>;
    }

    render(
      <FlowProvider collector={collector}>
        <TestComponent />
      </FlowProvider>
    );

    const initialRenderCount = renderCount;

    // Emit events - should NOT cause re-renders
    act(() => {
      collector.collect(createMockTransitionEvent("FETCH"));
    });

    act(() => {
      collector.collect(createMockTransitionEvent("FETCH"));
    });

    expect(renderCount).toBe(initialRenderCount);
  });

  it("does not crash without FlowProvider (no collector)", () => {
    const callback = vi.fn();

    function TestComponent(): React.ReactElement {
      useFlowEvent("FETCH", callback);
      return <div data-testid="component">Rendered</div>;
    }

    // Render without FlowProvider - should not throw
    render(<TestComponent />);

    expect(screen.getByTestId("component").textContent).toBe("Rendered");
    expect(callback).not.toHaveBeenCalled();
  });
});

// =============================================================================
// useActivity Tests (DoD 9.16)
// =============================================================================

describe("useActivity", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns status and events for named activity", () => {
    const activityInstance = {
      id: "upload-file",
      status: "running" as ActivityStatus,
      startTime: Date.now(),
      endTime: undefined,
    };

    const snapshotWithActivity = mockSnapshot("loading", { data: null, error: null }, [
      activityInstance,
    ]);

    // Create service with custom getActivityStatus
    const { service } = createMockFlowService(snapshotWithActivity);
    (service as any).getActivityStatus = (id: string) =>
      id === "upload-file" ? "running" : undefined;

    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { status, events } = useActivity(TestFlowPort, "upload-file");
      return (
        <div>
          <div data-testid="status">{status ?? "none"}</div>
          <div data-testid="events-count">{events.length}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("running");
    expect(screen.getByTestId("events-count").textContent).toBe("1");
  });

  it("filters only matching activities from multiple activities", () => {
    const activities = [
      {
        id: "upload-file",
        status: "running" as ActivityStatus,
        startTime: Date.now(),
        endTime: undefined,
      },
      {
        id: "download-file",
        status: "completed" as ActivityStatus,
        startTime: Date.now() - 1000,
        endTime: Date.now(),
      },
      {
        id: "upload-file",
        status: "completed" as ActivityStatus,
        startTime: Date.now() - 2000,
        endTime: Date.now() - 1000,
      },
    ];

    const snapshotWithActivities = mockSnapshot("loading", { data: null, error: null }, activities);

    const { service } = createMockFlowService(snapshotWithActivities);
    (service as any).getActivityStatus = (id: string) =>
      id === "upload-file" ? "running" : id === "download-file" ? "completed" : undefined;

    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { status, events } = useActivity(TestFlowPort, "upload-file");
      return (
        <div>
          <div data-testid="status">{status ?? "none"}</div>
          <div data-testid="events-count">{events.length}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    // Should only return the 2 "upload-file" activities, not the "download-file" one
    expect(screen.getByTestId("status").textContent).toBe("running");
    expect(screen.getByTestId("events-count").textContent).toBe("2");
  });

  it("returns memoized result when activity data does not change", () => {
    const activities = [
      {
        id: "upload-file",
        status: "running" as ActivityStatus,
        startTime: 1000,
        endTime: undefined,
      },
    ];

    const snapshotWithActivity = mockSnapshot("loading", { data: null, error: null }, activities);

    const { service, triggerStateChange } = createMockFlowService(snapshotWithActivity);
    (service as any).getActivityStatus = (_id: string) => "running" as ActivityStatus;

    const container = createMockContainer(service, TestFlowPort);

    let renderCount = 0;

    function TestComponent(): React.ReactElement {
      renderCount++;
      const { status, events } = useActivity(TestFlowPort, "upload-file");
      return (
        <div>
          <div data-testid="status">{status ?? "none"}</div>
          <div data-testid="events-count">{events.length}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    const initialRenderCount = renderCount;

    // Trigger state change but keep same activity data (same id, same status, same reference to activities array items)
    act(() => {
      triggerStateChange(mockSnapshot("loading", { data: "changed", error: null }, activities));
    });

    // The memoization should prevent re-render since the activities haven't changed
    expect(renderCount).toBe(initialRenderCount);
  });

  it("re-renders when activity status changes", () => {
    const activities = [
      {
        id: "upload-file",
        status: "running" as ActivityStatus,
        startTime: 1000,
        endTime: undefined,
      },
    ];

    const snapshotWithActivity = mockSnapshot("loading", { data: null, error: null }, activities);

    let currentActivityStatus: ActivityStatus = "running";
    const { service, triggerStateChange } = createMockFlowService(snapshotWithActivity);
    (service as any).getActivityStatus = (_id: string) => currentActivityStatus;

    const container = createMockContainer(service, TestFlowPort);

    let renderCount = 0;

    function TestComponent(): React.ReactElement {
      renderCount++;
      const { status } = useActivity(TestFlowPort, "upload-file");
      return <div data-testid="status">{status ?? "none"}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    const initialRenderCount = renderCount;

    // Change the activity status
    currentActivityStatus = "completed";
    const completedActivities = [
      { id: "upload-file", status: "completed" as ActivityStatus, startTime: 1000, endTime: 2000 },
    ];

    act(() => {
      triggerStateChange(
        mockSnapshot("success", { data: "done", error: null }, completedActivities)
      );
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(screen.getByTestId("status").textContent).toBe("completed");
  });

  it("re-renders when events change but status stays the same", () => {
    // This test kills the && -> || mutant:
    // With ||, if status stays the same, it would short-circuit to true
    // and return the old memoized value, missing the events change.
    const initialActivities = [
      {
        id: "upload-file",
        status: "running" as ActivityStatus,
        startTime: 1000,
        endTime: undefined,
      },
    ];

    const snapshotWithActivity = mockSnapshot(
      "loading",
      { data: null, error: null },
      initialActivities
    );

    const { service, triggerStateChange } = createMockFlowService(snapshotWithActivity);
    (service as any).getActivityStatus = (_id: string) => "running" as ActivityStatus;

    const container = createMockContainer(service, TestFlowPort);

    let lastEventsCount = 0;

    function TestComponent(): React.ReactElement {
      const { status, events } = useActivity(TestFlowPort, "upload-file");
      lastEventsCount = events.length;
      return (
        <div>
          <div data-testid="status">{status ?? "none"}</div>
          <div data-testid="events-count">{events.length}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(lastEventsCount).toBe(1);

    // Add a second activity event with same status
    const updatedActivities = [
      {
        id: "upload-file",
        status: "running" as ActivityStatus,
        startTime: 1000,
        endTime: undefined,
      },
      {
        id: "upload-file",
        status: "running" as ActivityStatus,
        startTime: 2000,
        endTime: undefined,
      },
    ];

    act(() => {
      triggerStateChange(mockSnapshot("loading", { data: null, error: null }, updatedActivities));
    });

    expect(screen.getByTestId("events-count").textContent).toBe("2");
  });

  it("re-renders when status changes even if events array is identical by reference", () => {
    // This test kills the status === newResult.status -> true mutant:
    // With "true &&", the status change would be ignored and if events
    // are shallowEqual, the memoized result would be returned.
    const activities = [
      {
        id: "upload-file",
        status: "running" as ActivityStatus,
        startTime: 1000,
        endTime: undefined,
      },
    ];

    const snapshotWithActivity = mockSnapshot("loading", { data: null, error: null }, activities);

    let currentActivityStatus: ActivityStatus = "running";
    const { service, triggerStateChange } = createMockFlowService(snapshotWithActivity);
    (service as any).getActivityStatus = (_id: string) => currentActivityStatus;

    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { status } = useActivity(TestFlowPort, "upload-file");
      return <div data-testid="status">{status ?? "none"}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("running");

    // Change status but keep same activity objects in snapshot (same references via shallowEqual)
    currentActivityStatus = "completed";
    act(() => {
      triggerStateChange(mockSnapshot("success", { data: "done", error: null }, activities));
    });

    expect(screen.getByTestId("status").textContent).toBe("completed");
  });
});

// =============================================================================
// FlowProvider Tests (DoD 9.17-9.19)
// =============================================================================

describe("FlowProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("provides collector to descendants", () => {
    const collector = createMockCollector();
    let capturedCollector: FlowCollector | undefined;

    function TestComponent(): React.ReactElement {
      capturedCollector = useFlowCollector();
      return <div data-testid="component">Rendered</div>;
    }

    render(
      <FlowProvider collector={collector}>
        <TestComponent />
      </FlowProvider>
    );

    expect(capturedCollector).toBe(collector);
    expect(screen.getByTestId("component").textContent).toBe("Rendered");
  });

  it("returns undefined when no FlowProvider is present", () => {
    let capturedCollector: FlowCollector | undefined;

    function TestComponent(): React.ReactElement {
      capturedCollector = useFlowCollector();
      return <div data-testid="component">Rendered</div>;
    }

    render(<TestComponent />);

    expect(capturedCollector).toBeUndefined();
  });

  it("disposes service on unmount when service prop is provided", () => {
    const collector = createMockCollector();
    const disposeMock = vi.fn().mockReturnValue(mockResultAsync());
    const mockService: FlowServiceAny = {
      snapshot: () => mockSnapshot("idle", undefined),
      state: () => "idle",
      context: () => undefined,
      send: vi.fn().mockReturnValue(mockOkResult()),
      sendBatch: vi.fn().mockReturnValue(mockOkResult()),
      sendAndExecute: vi.fn().mockReturnValue(mockResultAsync()),
      subscribe: () => () => {},
      getActivityStatus: () => undefined,
      dispose: disposeMock,
      isDisposed: false,
    };

    function TestComponent(): React.ReactElement {
      return <div data-testid="component">Rendered</div>;
    }

    const { unmount } = render(
      <FlowProvider collector={collector} service={mockService}>
        <TestComponent />
      </FlowProvider>
    );

    expect(disposeMock).not.toHaveBeenCalled();

    unmount();

    expect(disposeMock).toHaveBeenCalledTimes(1);
  });

  it("scoped flows: separate containers create isolated machine instances", () => {
    const snapshot1 = mockSnapshot("idle", { data: "scope-1", error: null });
    const snapshot2 = mockSnapshot("loading", { data: "scope-2", error: null });

    const { service: service1 } = createMockFlowService(snapshot1);
    const { service: service2 } = createMockFlowService(snapshot2);

    const container1 = createMockContainer(service1, TestFlowPort);
    const container2 = createMockContainer(service2, TestFlowPort);

    function StateDisplay({ testId }: { readonly testId: string }): React.ReactElement {
      const { state, context } = useMachine(TestFlowPort);
      return (
        <div data-testid={testId}>
          {state}-{context.data}
        </div>
      );
    }

    render(
      <div>
        <HexDiContainerProvider container={container1}>
          <StateDisplay testId="scope-1" />
        </HexDiContainerProvider>
        <HexDiContainerProvider container={container2}>
          <StateDisplay testId="scope-2" />
        </HexDiContainerProvider>
      </div>
    );

    expect(screen.getByTestId("scope-1").textContent).toBe("idle-scope-1");
    expect(screen.getByTestId("scope-2").textContent).toBe("loading-scope-2");
  });
});

// =============================================================================
// Additional Tests: useSelector custom equality prevents unnecessary re-renders
// =============================================================================

describe("useSelector custom equality prevents re-renders", () => {
  afterEach(() => {
    cleanup();
  });

  it("custom equality function that compares object keys prevents re-renders on equivalent objects", () => {
    const { service, triggerStateChange } = createMockFlowService(
      mockSnapshot("idle", { data: "test", error: null })
    );
    const container = createMockContainer(service, TestFlowPort);

    let renderCount = 0;

    function TestComponent(): React.ReactElement {
      renderCount++;
      const summary = useSelector(
        TestFlowPort,
        (state, context) => ({ state, hasData: context.data !== null }),
        (a, b) => a.state === b.state && a.hasData === b.hasData
      );
      return (
        <div>
          <div data-testid="state">{summary.state}</div>
          <div data-testid="hasData">{summary.hasData ? "yes" : "no"}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    const initialRenderCount = renderCount;

    // Change context data but keep state same and hasData still true
    act(() => {
      triggerStateChange(mockSnapshot("idle", { data: "different", error: null }));
    });

    // Custom equality sees state=idle/hasData=true both times => no re-render
    expect(renderCount).toBe(initialRenderCount);

    // Now change state => should re-render
    act(() => {
      triggerStateChange(mockSnapshot("loading", { data: "different", error: null }));
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(screen.getByTestId("state").textContent).toBe("loading");
  });
});

// =============================================================================
// Additional Tests: useFlow.status transitions
// =============================================================================

describe("useFlow.status reflects machine state", () => {
  afterEach(() => {
    cleanup();
  });

  it("status is 'active' for a running machine", () => {
    const { service } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service, TestFlowPort);

    let capturedStatus: string | undefined;

    function TestComponent(): React.ReactElement {
      const { status } = useFlow(TestFlowPort);
      capturedStatus = status;
      return <div data-testid="status">{status}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(capturedStatus).toBe("active");
    expect(screen.getByTestId("status").textContent).toBe("active");
  });

  it("status updates when snapshot changes and machine reflects done", () => {
    const { service, triggerStateChange } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service, TestFlowPort);

    const statuses: string[] = [];

    function TestComponent(): React.ReactElement {
      const { status, snapshot } = useFlow(TestFlowPort);
      statuses.push(status);
      return (
        <div>
          <div data-testid="status">{status}</div>
          <div data-testid="state">{snapshot.state}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    // State changes should be reflected in re-renders
    act(() => {
      triggerStateChange(mockSnapshot("loading", { data: null, error: null }));
    });

    act(() => {
      triggerStateChange(mockSnapshot("success", { data: "done", error: null }));
    });

    expect(screen.getByTestId("state").textContent).toBe("success");
    // All statuses should be 'active' since the machine is not disposed
    expect(statuses.every(s => s === "active")).toBe(true);
  });
});

// =============================================================================
// Additional Tests: FlowProvider disposes runner on unmount
// =============================================================================

describe("FlowProvider disposal", () => {
  afterEach(() => {
    cleanup();
  });

  it("disposes service when FlowProvider is unmounted via cleanup", () => {
    const collector = createMockCollector();
    const disposeMock = vi.fn().mockReturnValue(mockResultAsync());
    const mockService: FlowServiceAny = {
      snapshot: () => mockSnapshot("idle", undefined),
      state: () => "idle",
      context: () => undefined,
      send: vi.fn().mockReturnValue(mockOkResult()),
      sendBatch: vi.fn().mockReturnValue(mockOkResult()),
      sendAndExecute: vi.fn().mockReturnValue(mockResultAsync()),
      subscribe: () => () => {},
      getActivityStatus: () => undefined,
      dispose: disposeMock,
      isDisposed: false,
    };

    function Child(): React.ReactElement {
      return <div data-testid="child">Alive</div>;
    }

    const { unmount } = render(
      <FlowProvider collector={collector} service={mockService}>
        <Child />
      </FlowProvider>
    );

    expect(screen.getByTestId("child").textContent).toBe("Alive");
    expect(disposeMock).not.toHaveBeenCalled();

    // Call cleanup() from testing-library which unmounts
    cleanup();
    expect(disposeMock).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Additional Tests: useSend sends events correctly
// =============================================================================

describe("useSend event handling", () => {
  afterEach(() => {
    cleanup();
  });

  it("sends events with correct type payload", async () => {
    const { service, sendAndExecuteMock } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const send = useSend(TestFlowPort);
      return (
        <div>
          <button data-testid="fetch" onClick={() => void send({ type: "FETCH" })}>
            Fetch
          </button>
          <button data-testid="reset" onClick={() => void send({ type: "RESET" })}>
            Reset
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    await act(async () => {
      screen.getByTestId("fetch").click();
    });

    expect(sendAndExecuteMock).toHaveBeenCalledWith({ type: "FETCH" });

    await act(async () => {
      screen.getByTestId("reset").click();
    });

    expect(sendAndExecuteMock).toHaveBeenCalledWith({ type: "RESET" });
    expect(sendAndExecuteMock).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// Additional Tests: useMachine returns snapshot with correct state after send
// =============================================================================

describe("useMachine snapshot after send", () => {
  afterEach(() => {
    cleanup();
  });

  it("reflects updated state after send triggers state change", () => {
    const { service, triggerStateChange, sendAndExecuteMock } =
      createMockFlowService(initialSnapshot);
    const container = createMockContainer(service, TestFlowPort);

    // Make sendAndExecute trigger a state change
    sendAndExecuteMock.mockImplementation((event: { readonly type: string }) => {
      if (event.type === "FETCH") {
        triggerStateChange(mockSnapshot("loading", { data: null, error: null }));
      }
      return mockResultAsync();
    });

    function TestComponent(): React.ReactElement {
      const { state, context, send } = useMachine(TestFlowPort);
      return (
        <div>
          <div data-testid="state">{state}</div>
          <div data-testid="data">{context.data ?? "null"}</div>
          <button data-testid="send" onClick={() => void send({ type: "FETCH" })}>
            Send
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("idle");

    act(() => {
      screen.getByTestId("send").click();
    });

    expect(screen.getByTestId("state").textContent).toBe("loading");
  });
});

// =============================================================================
// Dependency Array Tests: Swap container to verify hooks update with new service
// =============================================================================

describe("hooks update when flowService identity changes", () => {
  afterEach(() => {
    cleanup();
  });

  it("useMachine switches to new service when container changes", () => {
    const { service: service1, triggerStateChange: trigger1 } = createMockFlowService(
      mockSnapshot("idle", { data: "service-1", error: null })
    );
    const { service: service2, triggerStateChange: trigger2 } = createMockFlowService(
      mockSnapshot("loading", { data: "service-2", error: null })
    );
    const container1 = createMockContainer(service1, TestFlowPort);
    const container2 = createMockContainer(service2, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { state, context } = useMachine(TestFlowPort);
      return (
        <div>
          <div data-testid="state">{state}</div>
          <div data-testid="data">{context.data ?? "null"}</div>
        </div>
      );
    }

    const { rerender } = render(
      <HexDiContainerProvider container={container1}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("idle");
    expect(screen.getByTestId("data").textContent).toBe("service-1");

    // Switch to container2 with service2
    rerender(
      <HexDiContainerProvider container={container2}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("loading");
    expect(screen.getByTestId("data").textContent).toBe("service-2");

    // Verify service2's state changes are reflected (not service1's)
    act(() => {
      trigger2(mockSnapshot("success", { data: "service-2-updated", error: null }));
    });

    expect(screen.getByTestId("state").textContent).toBe("success");
    expect(screen.getByTestId("data").textContent).toBe("service-2-updated");

    // Verify service1's state changes are NOT reflected
    act(() => {
      trigger1(mockSnapshot("error", { data: "service-1-error", error: "bad" }));
    });

    expect(screen.getByTestId("state").textContent).toBe("success");
    expect(screen.getByTestId("data").textContent).toBe("service-2-updated");
  });

  it("useMachine.send targets new service after container swap", async () => {
    const { service: service1, sendAndExecuteMock: sendMock1 } =
      createMockFlowService(initialSnapshot);
    const { service: service2, sendAndExecuteMock: sendMock2 } = createMockFlowService(
      mockSnapshot("loading", { data: null, error: null })
    );
    const container1 = createMockContainer(service1, TestFlowPort);
    const container2 = createMockContainer(service2, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { send, state } = useMachine(TestFlowPort);
      return (
        <div>
          <div data-testid="state">{state}</div>
          <button data-testid="send" onClick={() => void send({ type: "FETCH" })}>
            Send
          </button>
        </div>
      );
    }

    const { rerender } = render(
      <HexDiContainerProvider container={container1}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    await act(async () => {
      screen.getByTestId("send").click();
    });

    expect(sendMock1).toHaveBeenCalledWith({ type: "FETCH" });
    expect(sendMock2).not.toHaveBeenCalled();

    // Switch container
    rerender(
      <HexDiContainerProvider container={container2}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    await act(async () => {
      screen.getByTestId("send").click();
    });

    // After swap, send should target service2
    expect(sendMock2).toHaveBeenCalledWith({ type: "FETCH" });
  });

  it("useSend switches to new service when container changes", async () => {
    const { service: service1, sendAndExecuteMock: send1 } = createMockFlowService(initialSnapshot);
    const { service: service2, sendAndExecuteMock: send2 } = createMockFlowService(
      mockSnapshot("loading", { data: null, error: null })
    );
    const container1 = createMockContainer(service1, TestFlowPort);
    const container2 = createMockContainer(service2, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const send = useSend(TestFlowPort);
      return (
        <button data-testid="send" onClick={() => void send({ type: "FETCH" })}>
          Send
        </button>
      );
    }

    const { rerender } = render(
      <HexDiContainerProvider container={container1}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    await act(async () => {
      screen.getByTestId("send").click();
    });

    expect(send1).toHaveBeenCalledWith({ type: "FETCH" });
    expect(send2).not.toHaveBeenCalled();

    // Switch container
    rerender(
      <HexDiContainerProvider container={container2}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    await act(async () => {
      screen.getByTestId("send").click();
    });

    expect(send2).toHaveBeenCalledWith({ type: "FETCH" });
  });

  it("useSelector switches to new service when container changes", () => {
    const { service: service1 } = createMockFlowService(
      mockSnapshot("idle", { data: "from-1", error: null })
    );
    const { service: service2, triggerStateChange: trigger2 } = createMockFlowService(
      mockSnapshot("loading", { data: "from-2", error: null })
    );
    const container1 = createMockContainer(service1, TestFlowPort);
    const container2 = createMockContainer(service2, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const data = useSelector(TestFlowPort, (_state, context) => context.data);
      return <div data-testid="data">{data ?? "null"}</div>;
    }

    const { rerender } = render(
      <HexDiContainerProvider container={container1}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("data").textContent).toBe("from-1");

    rerender(
      <HexDiContainerProvider container={container2}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("data").textContent).toBe("from-2");

    // Verify new service changes are reflected
    act(() => {
      trigger2(mockSnapshot("success", { data: "from-2-updated", error: null }));
    });

    expect(screen.getByTestId("data").textContent).toBe("from-2-updated");
  });

  it("useFlow switches to new service when container changes", () => {
    const { service: service1 } = createMockFlowService(
      mockSnapshot("idle", { data: null, error: null })
    );
    const { service: service2, triggerStateChange: trigger2 } = createMockFlowService(
      mockSnapshot("loading", { data: null, error: null })
    );
    const container1 = createMockContainer(service1, TestFlowPort);
    const container2 = createMockContainer(service2, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { snapshot, status } = useFlow(TestFlowPort);
      return (
        <div>
          <div data-testid="state">{snapshot.state}</div>
          <div data-testid="status">{status}</div>
        </div>
      );
    }

    const { rerender } = render(
      <HexDiContainerProvider container={container1}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("idle");

    rerender(
      <HexDiContainerProvider container={container2}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("loading");

    act(() => {
      trigger2(mockSnapshot("success", { data: "done", error: null }));
    });

    expect(screen.getByTestId("state").textContent).toBe("success");
  });

  it("useMachineSelector switches to new service when container changes", () => {
    const { service: service1 } = createMockFlowService(
      mockSnapshot("idle", { data: "from-1", error: null })
    );
    const { service: service2, triggerStateChange: trigger2 } = createMockFlowService(
      mockSnapshot("loading", { data: "from-2", error: null })
    );
    const container1 = createMockContainer(service1, TestFlowPort);
    const container2 = createMockContainer(service2, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const result = useMachineSelector(TestFlowPort, snapshot => ({
        state: snapshot.state,
        data: snapshot.context.data,
      }));
      return (
        <div>
          <div data-testid="state">{result.state}</div>
          <div data-testid="data">{result.data ?? "null"}</div>
        </div>
      );
    }

    const { rerender } = render(
      <HexDiContainerProvider container={container1}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("idle");
    expect(screen.getByTestId("data").textContent).toBe("from-1");

    rerender(
      <HexDiContainerProvider container={container2}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("loading");
    expect(screen.getByTestId("data").textContent).toBe("from-2");

    act(() => {
      trigger2(mockSnapshot("success", { data: "from-2-updated", error: null }));
    });

    expect(screen.getByTestId("state").textContent).toBe("success");
  });

  it("useActivity switches to new service when container changes", () => {
    const activities1 = [
      { id: "task-a", status: "running" as ActivityStatus, startTime: 1000, endTime: undefined },
    ];
    const activities2 = [
      { id: "task-a", status: "completed" as ActivityStatus, startTime: 1000, endTime: 2000 },
    ];

    const { service: service1 } = createMockFlowService(
      mockSnapshot("idle", { data: null, error: null }, activities1)
    );
    (service1 as any).getActivityStatus = (_id: string) => "running" as ActivityStatus;

    const { service: service2 } = createMockFlowService(
      mockSnapshot("success", { data: null, error: null }, activities2)
    );
    (service2 as any).getActivityStatus = (_id: string) => "completed" as ActivityStatus;

    const container1 = createMockContainer(service1, TestFlowPort);
    const container2 = createMockContainer(service2, TestFlowPort);

    function TestComponent(): React.ReactElement {
      const { status } = useActivity(TestFlowPort, "task-a");
      return <div data-testid="status">{status ?? "none"}</div>;
    }

    const { rerender } = render(
      <HexDiContainerProvider container={container1}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("running");

    rerender(
      <HexDiContainerProvider container={container2}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("status").textContent).toBe("completed");
  });

  it("FlowProvider disposes old service when service prop changes", () => {
    const collector = createMockCollector();
    const dispose1 = vi.fn().mockReturnValue(mockResultAsync());
    const dispose2 = vi.fn().mockReturnValue(mockResultAsync());

    const service1: FlowServiceAny = {
      snapshot: () => mockSnapshot("idle", undefined),
      state: () => "idle",
      context: () => undefined,
      send: vi.fn().mockReturnValue(mockOkResult()),
      sendBatch: vi.fn().mockReturnValue(mockOkResult()),
      sendAndExecute: vi.fn().mockReturnValue(mockResultAsync()),
      subscribe: () => () => {},
      getActivityStatus: () => undefined,
      dispose: dispose1,
      isDisposed: false,
    };

    const service2: FlowServiceAny = {
      snapshot: () => mockSnapshot("loading", undefined),
      state: () => "loading",
      context: () => undefined,
      send: vi.fn().mockReturnValue(mockOkResult()),
      sendBatch: vi.fn().mockReturnValue(mockOkResult()),
      sendAndExecute: vi.fn().mockReturnValue(mockResultAsync()),
      subscribe: () => () => {},
      getActivityStatus: () => undefined,
      dispose: dispose2,
      isDisposed: false,
    };

    function Child(): React.ReactElement {
      return <div data-testid="child">Alive</div>;
    }

    const { rerender, unmount } = render(
      <FlowProvider collector={collector} service={service1}>
        <Child />
      </FlowProvider>
    );

    expect(dispose1).not.toHaveBeenCalled();

    // Switch service
    rerender(
      <FlowProvider collector={collector} service={service2}>
        <Child />
      </FlowProvider>
    );

    // Old service should be disposed when service prop changes
    expect(dispose1).toHaveBeenCalledTimes(1);
    expect(dispose2).not.toHaveBeenCalled();

    unmount();

    expect(dispose2).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// FlowProvider Suspense Tests (DoD 9.18)
// =============================================================================

describe("FlowProvider Suspense support", () => {
  afterEach(() => {
    cleanup();
  });

  it("asyncService renders children after promise resolves", async () => {
    const collector = createMockCollector();
    const disposeMock = vi.fn().mockReturnValue(mockResultAsync());

    const mockService: FlowServiceAny = {
      snapshot: () => mockSnapshot("idle", undefined),
      state: () => "idle",
      context: () => undefined,
      send: vi.fn().mockReturnValue(mockOkResult()),
      sendBatch: vi.fn().mockReturnValue(mockOkResult()),
      sendAndExecute: vi.fn().mockReturnValue(mockResultAsync()),
      subscribe: () => () => {},
      getActivityStatus: () => undefined,
      dispose: disposeMock,
      isDisposed: false,
    };

    // Use an already-resolved promise for simpler test
    const asyncService = Promise.resolve(mockService);

    function Child(): React.ReactElement {
      return <div data-testid="child">Loaded</div>;
    }

    await act(async () => {
      render(
        <React.Suspense fallback={<div data-testid="fallback">Loading...</div>}>
          <FlowProvider collector={collector} asyncService={asyncService}>
            <Child />
          </FlowProvider>
        </React.Suspense>
      );
      // Allow React to process the resolved promise
      await new Promise(r => setTimeout(r, 0));
    });

    // After resolution, children should render
    expect(screen.getByTestId("child").textContent).toBe("Loaded");
  });

  it("asyncService disposes resolved service on unmount", async () => {
    const collector = createMockCollector();
    const disposeMock = vi.fn().mockReturnValue(mockResultAsync());

    const mockService: FlowServiceAny = {
      snapshot: () => mockSnapshot("idle", undefined),
      state: () => "idle",
      context: () => undefined,
      send: vi.fn().mockReturnValue(mockOkResult()),
      sendBatch: vi.fn().mockReturnValue(mockOkResult()),
      sendAndExecute: vi.fn().mockReturnValue(mockResultAsync()),
      subscribe: () => () => {},
      getActivityStatus: () => undefined,
      dispose: disposeMock,
      isDisposed: false,
    };

    const asyncService = Promise.resolve(mockService);

    function Child(): React.ReactElement {
      return <div data-testid="child">Loaded</div>;
    }

    let unmountFn: () => void;

    await act(async () => {
      const result = render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <FlowProvider collector={collector} asyncService={asyncService}>
            <Child />
          </FlowProvider>
        </React.Suspense>
      );
      unmountFn = result.unmount;
      // Let the promise resolve and React process it
      await new Promise(r => setTimeout(r, 0));
    });

    expect(disposeMock).not.toHaveBeenCalled();

    // Unmount should dispose the resolved service
    unmountFn!();
    expect(disposeMock).toHaveBeenCalledTimes(1);
  });
});
