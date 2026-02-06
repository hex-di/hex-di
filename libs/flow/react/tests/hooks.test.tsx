/**
 * Unit tests for @hex-di/flow-react hooks.
 *
 * These tests verify:
 * 1. useMachine returns current state and send function
 * 2. useMachine updates on state change
 * 3. useSelector derives value from state/context
 * 4. useSelector uses shallow equality by default
 * 5. useSend returns stable send function
 * 6. unmount unsubscribes from runner
 * 7. FlowProvider provides collector to descendants
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import React, { useEffect } from "react";
import { port, createPort, type Port } from "@hex-di/core";
import { HexDiContainerProvider } from "@hex-di/react";
import type {
  FlowService,
  MachineSnapshot,
  ActivityStatus,
  EffectAny,
  FlowCollector,
  FlowTransitionEventAny,
  FlowTransitionFilter,
  FlowStats,
} from "@hex-di/flow";
import { useMachine, useSelector, useSend } from "../src/hooks/index.js";
import { FlowProvider, useFlowCollector } from "../src/context/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Symbol for internal access - matches the one used in @hex-di/runtime
 * We use Symbol.for() to ensure cross-realm consistency
 */
const INTERNAL_ACCESS = Symbol.for("hex-di/internal-access");

/**
 * State union for test machine
 */
type TestState = "idle" | "loading" | "success" | "error";

/**
 * Event union for test machine
 */
type TestEvent = "FETCH" | "SUCCESS" | "ERROR" | "RESET";

/**
 * Context type for test machine
 */
interface TestContext {
  readonly data: string | null;
  readonly error: string | null;
}

/**
 * Test FlowService interface
 */
type TestFlowService = FlowService<TestState, TestEvent, TestContext>;

/**
 * Port for test FlowService
 */
const TestFlowPort = port<TestFlowService>()({ name: "TestFlow" });

/**
 * Creates a mock FlowService with configurable behavior.
 */
function createMockFlowService(initialSnapshot: MachineSnapshot<TestState, TestContext>): {
  service: TestFlowService;
  subscribers: Set<(snapshot: MachineSnapshot<TestState, TestContext>) => void>;
  triggerStateChange: (snapshot: MachineSnapshot<TestState, TestContext>) => void;
  sendMock: ReturnType<typeof vi.fn>;
  sendAndExecuteMock: ReturnType<typeof vi.fn>;
} {
  let currentSnapshot = initialSnapshot;
  const subscribers = new Set<(snapshot: MachineSnapshot<TestState, TestContext>) => void>();

  const sendMock = vi.fn().mockReturnValue([] as readonly EffectAny[]);
  const sendAndExecuteMock = vi.fn().mockResolvedValue(undefined);

  const service: TestFlowService = {
    snapshot: () => currentSnapshot,
    state: () => currentSnapshot.state,
    context: () => currentSnapshot.context,
    send: sendMock,
    sendAndExecute: sendAndExecuteMock,
    subscribe: (callback: (snapshot: MachineSnapshot<TestState, TestContext>) => void) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    getActivityStatus: (_id: string): ActivityStatus | undefined => undefined,
    dispose: vi.fn().mockResolvedValue(undefined),
    isDisposed: false,
  };

  const triggerStateChange = (snapshot: MachineSnapshot<TestState, TestContext>): void => {
    currentSnapshot = snapshot;
    subscribers.forEach(cb => cb(snapshot));
  };

  return { service, subscribers, triggerStateChange, sendMock, sendAndExecuteMock };
}

/**
 * Creates a mock container for testing.
 * This is a minimal mock that satisfies what HexDiContainerProvider needs.
 *
 * Note: Tests have relaxed lint rules and may use type assertions for mocking flexibility.
 */
function createMockContainer<P extends Port<unknown, string>>(
  flowService: TestFlowService,
  testPort: P
): any {
  const mockResolve = vi.fn().mockImplementation((port: Port<unknown, string>) => {
    const portName = (port as { name?: string }).name;
    const testPortName = (testPort as { name?: string }).name;
    if (portName === testPortName) {
      return flowService;
    }
    throw new Error(`Unknown port: ${portName}`);
  });

  const mockScope = {
    resolve: mockResolve,
    resolveAsync: vi.fn().mockImplementation((port: Port<unknown, string>) => {
      return Promise.resolve(mockResolve(port));
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
    resolveAsync: vi.fn().mockImplementation((port: Port<unknown, string>) => {
      return Promise.resolve(mockResolve(port));
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

/**
 * Initial test snapshot
 */
const initialSnapshot: MachineSnapshot<TestState, TestContext> = {
  state: "idle",
  context: { data: null, error: null },
  activities: [],
};

/**
 * Creates a mock FlowCollector for testing.
 */
function createMockCollector(): FlowCollector {
  const transitions: FlowTransitionEventAny[] = [];
  const subscribers = new Set<(event: FlowTransitionEventAny) => void>();

  return {
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

// =============================================================================
// useMachine Tests
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

    // Verify send function is available and works
    act(() => {
      screen.getByTestId("send").click();
    });

    expect(service.sendAndExecute).toHaveBeenCalledWith({ type: "FETCH" });
  });

  it("updates on state change", async () => {
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

    // Trigger state change
    act(() => {
      triggerStateChange({
        state: "loading",
        context: { data: null, error: null },
        activities: [],
      });
    });

    expect(screen.getByTestId("state").textContent).toBe("loading");

    // Trigger another state change with data
    act(() => {
      triggerStateChange({
        state: "success",
        context: { data: "loaded data", error: null },
        activities: [],
      });
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

    // Should have one subscriber after mount
    expect(subscribers.size).toBe(1);

    // Unmount should remove the subscriber
    unmount();

    expect(subscribers.size).toBe(0);
  });
});

// =============================================================================
// useSelector Tests
// =============================================================================

describe("useSelector", () => {
  afterEach(() => {
    cleanup();
  });

  it("derives value from state/context", () => {
    const { service } = createMockFlowService({
      state: "success",
      context: { data: "hello world", error: null },
      activities: [],
    });
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
    const { service, triggerStateChange } = createMockFlowService({
      state: "idle",
      context: { data: "test", error: null },
      activities: [],
    });
    const container = createMockContainer(service, TestFlowPort);

    let renderCount = 0;

    function TestComponent(): React.ReactElement {
      renderCount++;
      // This selector returns an object - should use shallow equality
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

    // Trigger state change with same derived values (same state, same data length)
    act(() => {
      triggerStateChange({
        state: "idle",
        context: { data: "test", error: "some error" }, // Different error but same data length
        activities: [],
      });
    });

    // With shallow equality, component should NOT re-render because the
    // selected values { state: 'idle', dataLength: 4 } are shallowly equal
    // The selector may be called during the subscription update check
    expect(renderCount).toBe(initialRenderCount);

    // Now trigger a state change that changes the derived value
    act(() => {
      triggerStateChange({
        state: "loading",
        context: { data: "test", error: null },
        activities: [],
      });
    });

    // This should cause a re-render because state changed
    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(screen.getByTestId("state").textContent).toBe("loading");
  });

  it("supports custom equality function", () => {
    const { service, triggerStateChange } = createMockFlowService({
      state: "idle",
      context: { data: "test", error: null },
      activities: [],
    });
    const container = createMockContainer(service, TestFlowPort);

    let renderCount = 0;

    function TestComponent(): React.ReactElement {
      renderCount++;
      // Use custom equality that only compares data length
      const dataLength = useSelector(
        TestFlowPort,
        (_state, context) => context.data?.length ?? 0,
        (a, b) => a === b // strict equality for numbers
      );
      return <div data-testid="data-length">{dataLength}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <TestComponent />
      </HexDiContainerProvider>
    );

    const initialRenderCount = renderCount;

    // Trigger state change with same data length but different data
    act(() => {
      triggerStateChange({
        state: "loading",
        context: { data: "abcd", error: null }, // Same length (4)
        activities: [],
      });
    });

    // Should NOT re-render because data length is still 4
    expect(renderCount).toBe(initialRenderCount);

    // Trigger state change with different data length
    act(() => {
      triggerStateChange({
        state: "success",
        context: { data: "longer data", error: null }, // Length 11
        activities: [],
      });
    });

    // Should re-render because data length changed
    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(screen.getByTestId("data-length").textContent).toBe("11");
  });
});

// =============================================================================
// useSend Tests
// =============================================================================

describe("useSend", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns stable send function", () => {
    const { service, triggerStateChange } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service, TestFlowPort);

    const sendRefs: Array<(event: { readonly type: TestEvent }) => Promise<void>> = [];

    function TestComponent(): React.ReactElement {
      const send = useSend(TestFlowPort);
      const { state } = useMachine(TestFlowPort);

      // Capture send reference on each render
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

    // Trigger state changes to cause re-renders
    act(() => {
      triggerStateChange({
        state: "loading",
        context: { data: null, error: null },
        activities: [],
      });
    });

    act(() => {
      triggerStateChange({
        state: "success",
        context: { data: "data", error: null },
        activities: [],
      });
    });

    // All captured send references should be the same (referentially equal)
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
});

// =============================================================================
// FlowProvider Tests
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
});
