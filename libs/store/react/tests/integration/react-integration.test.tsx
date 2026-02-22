import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import React from "react";
import type { Port } from "@hex-di/core";
import { HexDiContainerProvider, HexDiAutoScopeProvider } from "@hex-di/react";
import { createStatePort } from "@hex-di/store";
import type {
  StateService,
  DeepReadonly,
  ActionMap,
  BoundActions,
  StateListener,
  Unsubscribe,
} from "@hex-di/store";
import { useStateValue, useActions } from "../../src/index.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Shared Container Mock
// =============================================================================

const INTERNAL_ACCESS = Symbol.for("hex-di/internal-access");

function createMockContainer(services: Map<string, unknown>): any {
  const mockResolve = vi.fn().mockImplementation((port: Port<string, unknown>) => {
    const name = (port as any).__portName ?? (port as any).name;
    const svc = services.get(name);
    if (svc) return svc;
    throw new Error(`Unknown port: ${name}`);
  });

  const mockScope = {
    resolve: mockResolve,
    resolveAsync: vi
      .fn()
      .mockImplementation((port: Port<string, unknown>) => Promise.resolve(mockResolve(port))),
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
    resolveAsync: vi
      .fn()
      .mockImplementation((port: Port<string, unknown>) => Promise.resolve(mockResolve(port))),
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

// =============================================================================
// Mock Service Factory
// =============================================================================

function createMockStateService(initialCount = 0): {
  service: StateService<CounterState, CounterActions>;
  setState: (s: CounterState) => void;
} {
  let current: CounterState = { count: initialCount };
  const listeners = new Set<StateListener<CounterState>>();

  const setState = (next: CounterState): void => {
    const prev = current;
    current = next;
    for (const listener of listeners) {
      listener(current as DeepReadonly<CounterState>, prev as DeepReadonly<CounterState>);
    }
  };

  const boundActions: BoundActions<CounterState, CounterActions> = {
    increment: () => {
      setState({ count: current.count + 1 });
    },
    decrement: () => {
      setState({ count: current.count - 1 });
    },
    incrementBy: (amount: number) => {
      setState({ count: current.count + amount });
    },
  } as BoundActions<CounterState, CounterActions>;

  const service: StateService<CounterState, CounterActions> = {
    get state() {
      return current as DeepReadonly<CounterState>;
    },
    get isDisposed() {
      return false;
    },
    actions: boundActions,
    subscribe: (...args: any[]): Unsubscribe => {
      if (typeof args[0] === "function" && args.length === 1) {
        const listener = args[0] as StateListener<CounterState>;
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }
      if (typeof args[0] === "function" && typeof args[1] === "function") {
        const selector = args[0] as (state: DeepReadonly<CounterState>) => unknown;
        const listener = args[1] as (value: unknown, prev: unknown) => void;
        const equalityFn = args[2] as ((a: unknown, b: unknown) => boolean) | undefined;
        let lastSelected = selector(current as DeepReadonly<CounterState>);

        const wrappedListener: StateListener<CounterState> = state => {
          const nextSelected = selector(state);
          const isEqual = equalityFn
            ? equalityFn(lastSelected, nextSelected)
            : lastSelected === nextSelected;
          if (!isEqual) {
            const prev = lastSelected;
            lastSelected = nextSelected;
            listener(nextSelected, prev);
          }
        };
        listeners.add(wrappedListener);
        return () => {
          listeners.delete(wrappedListener);
        };
      }
      throw new Error("Invalid subscribe args");
    },
  };

  return { service, setState };
}

// =============================================================================
// Test Types
// =============================================================================

interface CounterState {
  readonly count: number;
}

interface CounterActions extends ActionMap<CounterState> {
  increment: (state: CounterState) => CounterState;
  decrement: (state: CounterState) => CounterState;
  incrementBy: (state: CounterState, amount: number) => CounterState;
}

const CounterPort = createStatePort<CounterState, CounterActions>()({
  name: "Counter",
});

// =============================================================================
// React integration
// =============================================================================

describe("React integration", () => {
  it("Hooks resolve state ports from HexDiContainerProvider container", () => {
    const { service } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    function CounterDisplay() {
      const state = useStateValue(CounterPort);
      return <div>Count: {state.count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <CounterDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Count: 0")).toBeDefined();
  });

  it("Scoped hooks resolve from HexDiAutoScopeProvider scope", () => {
    // Root service with count: 0
    const { service: rootService } = createMockStateService(0);
    const services = new Map<string, unknown>([["Counter", rootService]]);
    const container = createMockContainer(services);

    // Scoped service with count: 42
    const { service: scopedService } = createMockStateService(42);

    const mockScopeResolve = vi.fn().mockImplementation((port: Port<string, unknown>) => {
      const name = (port as any).__portName ?? (port as any).name;
      if (name === "Counter") return scopedService;
      throw new Error(`Unknown port: ${name}`);
    });

    const mockScope = {
      resolve: mockScopeResolve,
      resolveAsync: vi
        .fn()
        .mockImplementation((port: Port<string, unknown>) =>
          Promise.resolve(mockScopeResolve(port))
        ),
      createScope: vi.fn(),
      dispose: vi.fn().mockResolvedValue(undefined),
      has: vi.fn().mockReturnValue(true),
      isDisposed: false,
      [INTERNAL_ACCESS]: () => ({
        disposed: false,
        singletonMemo: new Map(),
        scopedMemo: new Map(),
        containerId: "mock-scope",
        scopeId: "mock-scoped-scope-id",
      }),
    };

    container.createScope = vi.fn().mockReturnValue(mockScope);

    function RootDisplay() {
      const state = useStateValue(CounterPort);
      return <div data-testid="root">Root: {state.count}</div>;
    }

    function ScopedDisplay() {
      const state = useStateValue(CounterPort);
      return <div data-testid="scoped">Scoped: {state.count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <RootDisplay />
        <HexDiAutoScopeProvider>
          <ScopedDisplay />
        </HexDiAutoScopeProvider>
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("root").textContent).toBe("Root: 0");
    expect(screen.getByTestId("scoped").textContent).toBe("Scoped: 42");
  });

  it("Full flow: render -> dispatch action -> re-render with updated state", () => {
    const { service } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    function Counter() {
      const state = useStateValue(CounterPort);
      const actions = useActions(CounterPort);
      return (
        <div>
          <span data-testid="count">Count: {state.count}</span>
          <button onClick={() => actions.increment()}>Increment</button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <Counter />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("count").textContent).toBe("Count: 0");

    act(() => {
      fireEvent.click(screen.getByText("Increment"));
    });

    expect(screen.getByTestId("count").textContent).toBe("Count: 1");
  });

  it("Multiple components sharing same state port see consistent state", () => {
    const { service } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    function ComponentA() {
      const state = useStateValue(CounterPort);
      const actions = useActions(CounterPort);
      return (
        <div>
          <span data-testid="count-a">A: {state.count}</span>
          <button onClick={() => actions.increment()}>Increment</button>
        </div>
      );
    }

    function ComponentB() {
      const state = useStateValue(CounterPort);
      return <span data-testid="count-b">B: {state.count}</span>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <ComponentA />
        <ComponentB />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("count-a").textContent).toBe("A: 0");
    expect(screen.getByTestId("count-b").textContent).toBe("B: 0");

    act(() => {
      fireEvent.click(screen.getByText("Increment"));
    });

    expect(screen.getByTestId("count-a").textContent).toBe("A: 1");
    expect(screen.getByTestId("count-b").textContent).toBe("B: 1");
  });
});
