import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import React, { Suspense } from "react";
import type { Port } from "@hex-di/core";
import { HexDiContainerProvider, HexDiAutoScopeProvider } from "@hex-di/react";
import { createStatePort, createAsyncDerivedPort } from "@hex-di/store";
import type {
  StateService,
  AsyncDerivedService,
  AsyncDerivedSnapshot,
  DeepReadonly,
  ActionMap,
  BoundActions,
  StateListener,
  Unsubscribe,
} from "@hex-di/store";
import { useStateValue, useActions, useAsyncDerivedSuspense } from "../../src/index.js";

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
// Test Types
// =============================================================================

interface CounterState {
  readonly count: number;
}

interface CounterActions extends ActionMap<CounterState> {
  increment: (state: CounterState) => CounterState;
}

const CounterPort = createStatePort<CounterState, CounterActions>()({
  name: "Counter",
});

interface MultiState {
  readonly count: number;
  readonly label: string;
}

interface MultiActions extends ActionMap<MultiState> {
  setCount: (state: MultiState, count: number) => MultiState;
  setLabel: (state: MultiState, label: string) => MultiState;
}

const MultiPort = createStatePort<MultiState, MultiActions>()({
  name: "Multi",
});

const AsyncPort = createAsyncDerivedPort<string>()({
  name: "AsyncData",
});

// =============================================================================
// Mock Service Factories
// =============================================================================

function createMockStateService(): {
  service: StateService<CounterState, CounterActions>;
  setState: (s: CounterState) => void;
} {
  let current: CounterState = { count: 0 };
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

function createMockMultiStateService(): {
  service: StateService<MultiState, MultiActions>;
  setState: (s: MultiState) => void;
} {
  let current: MultiState = { count: 0, label: "initial" };
  const listeners = new Set<StateListener<MultiState>>();

  const setState = (next: MultiState): void => {
    const prev = current;
    current = next;
    for (const listener of listeners) {
      listener(current as DeepReadonly<MultiState>, prev as DeepReadonly<MultiState>);
    }
  };

  const boundActions: BoundActions<MultiState, MultiActions> = {
    setCount: (count: number) => {
      setState({ ...current, count });
    },
    setLabel: (label: string) => {
      setState({ ...current, label });
    },
  } as BoundActions<MultiState, MultiActions>;

  const service: StateService<MultiState, MultiActions> = {
    get state() {
      return current as DeepReadonly<MultiState>;
    },
    get isDisposed() {
      return false;
    },
    actions: boundActions,
    subscribe: (...args: any[]): Unsubscribe => {
      if (typeof args[0] === "function" && args.length === 1) {
        const listener = args[0] as StateListener<MultiState>;
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }
      if (typeof args[0] === "function" && typeof args[1] === "function") {
        const selector = args[0] as (state: DeepReadonly<MultiState>) => unknown;
        const listener = args[1] as (value: unknown, prev: unknown) => void;
        const equalityFn = args[2] as ((a: unknown, b: unknown) => boolean) | undefined;
        let lastSelected = selector(current as DeepReadonly<MultiState>);

        const wrappedListener: StateListener<MultiState> = state => {
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

function createMockAsyncDerivedService<T>(initial: AsyncDerivedSnapshot<T, never>): {
  service: AsyncDerivedService<T, never>;
  setSnapshot: (s: AsyncDerivedSnapshot<T, never>) => void;
} {
  let current = initial;
  const listeners = new Set<(s: AsyncDerivedSnapshot<T, never>) => void>();

  const setSnapshot = (next: AsyncDerivedSnapshot<T, never>): void => {
    current = next;
    for (const listener of listeners) {
      listener(current);
    }
  };

  const service: AsyncDerivedService<T, never> = {
    get snapshot() {
      return current;
    },
    get status() {
      return current.status;
    },
    get isLoading() {
      return current.status === "loading";
    },
    get isDisposed() {
      return false;
    },
    refresh: vi.fn(),
    subscribe: (listener: (s: AsyncDerivedSnapshot<T, never>) => void): Unsubscribe => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return { service, setSnapshot };
}

// =============================================================================
// E2E React Rendering Tests
// =============================================================================

describe("E2E React rendering", () => {
  it("React: component renders state value, updates on action dispatch", () => {
    const { service } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    function Counter() {
      const state = useStateValue(CounterPort);
      const actions = useActions(CounterPort);
      return (
        <div>
          <span>Count: {state.count}</span>
          <button onClick={() => actions.increment()}>Increment</button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <Counter />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Count: 0")).toBeDefined();

    act(() => {
      fireEvent.click(screen.getByText("Increment"));
    });

    expect(screen.getByText("Count: 1")).toBeDefined();
  });

  it("React: selector prevents re-render when unrelated state changes", () => {
    const { service, setState } = createMockMultiStateService();
    const services = new Map<string, unknown>([["Multi", service]]);
    const container = createMockContainer(services);

    let renderCount = 0;
    function CountOnly() {
      renderCount++;
      const count = useStateValue(MultiPort, (s: DeepReadonly<MultiState>) => s.count);
      return <div>Count: {count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <CountOnly />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Count: 0")).toBeDefined();
    const initialRenders = renderCount;

    // Change label only -- should NOT cause re-render since selector returns count
    act(() => {
      setState({ count: 0, label: "changed" });
    });

    expect(renderCount).toBe(initialRenders);
    expect(screen.getByText("Count: 0")).toBeDefined();

    // Change count -- SHOULD cause re-render
    act(() => {
      setState({ count: 42, label: "changed" });
    });

    expect(renderCount).toBe(initialRenders + 1);
    expect(screen.getByText("Count: 42")).toBeDefined();
  });

  it("React: scoped state via HexDiAutoScopeProvider isolated between siblings", () => {
    // Create two separate counter services with different initial states
    const { service: service1 } = createMockStateService();
    const { service: service2, setState: setState2 } = createMockStateService();
    // Set service2 to a different initial value by dispatching
    setState2({ count: 100 });

    const services1 = new Map<string, unknown>([["Counter", service1]]);
    const services2 = new Map<string, unknown>([["Counter", service2]]);

    const mockResolve1 = vi.fn().mockImplementation((port: Port<string, unknown>) => {
      const name = (port as any).__portName ?? (port as any).name;
      const svc = services1.get(name);
      if (svc) return svc;
      throw new Error(`Unknown port: ${name}`);
    });

    const mockResolve2 = vi.fn().mockImplementation((port: Port<string, unknown>) => {
      const name = (port as any).__portName ?? (port as any).name;
      const svc = services2.get(name);
      if (svc) return svc;
      throw new Error(`Unknown port: ${name}`);
    });

    const mockScope1 = {
      resolve: mockResolve1,
      resolveAsync: vi
        .fn()
        .mockImplementation((port: Port<string, unknown>) => Promise.resolve(mockResolve1(port))),
      createScope: vi.fn(),
      dispose: vi.fn().mockResolvedValue(undefined),
      has: vi.fn().mockReturnValue(true),
      isDisposed: false,
      [INTERNAL_ACCESS]: () => ({
        disposed: false,
        singletonMemo: new Map(),
        scopedMemo: new Map(),
        containerId: "mock-scope-1",
        scopeId: "mock-scope-id-1",
      }),
    };

    const mockScope2 = {
      resolve: mockResolve2,
      resolveAsync: vi
        .fn()
        .mockImplementation((port: Port<string, unknown>) => Promise.resolve(mockResolve2(port))),
      createScope: vi.fn(),
      dispose: vi.fn().mockResolvedValue(undefined),
      has: vi.fn().mockReturnValue(true),
      isDisposed: false,
      [INTERNAL_ACCESS]: () => ({
        disposed: false,
        singletonMemo: new Map(),
        scopedMemo: new Map(),
        containerId: "mock-scope-2",
        scopeId: "mock-scope-id-2",
      }),
    };

    // Container whose createScope returns different scopes on successive calls
    const containerResolve = vi.fn().mockImplementation((port: Port<string, unknown>) => {
      const name = (port as any).__portName ?? (port as any).name;
      throw new Error(`Container-level resolve should not be called for: ${name}`);
    });

    const container: any = {
      resolve: containerResolve,
      resolveAsync: vi.fn(),
      createScope: vi.fn().mockReturnValueOnce(mockScope1).mockReturnValueOnce(mockScope2),
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

    function CounterDisplay({ testId }: { testId: string }) {
      const state = useStateValue(CounterPort);
      return <div data-testid={testId}>Count: {state.count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <HexDiAutoScopeProvider>
          <CounterDisplay testId="scope-1" />
        </HexDiAutoScopeProvider>
        <HexDiAutoScopeProvider>
          <CounterDisplay testId="scope-2" />
        </HexDiAutoScopeProvider>
      </HexDiContainerProvider>
    );

    // Each scope should resolve its own service independently
    expect(screen.getByTestId("scope-1").textContent).toBe("Count: 0");
    expect(screen.getByTestId("scope-2").textContent).toBe("Count: 100");
  });

  it("React: Suspense boundary shows fallback during async derived loading", () => {
    const { service } = createMockAsyncDerivedService<string>({
      status: "loading",
      data: undefined,
      error: undefined,
      isLoading: true,
    });
    const services = new Map<string, unknown>([["AsyncData", service]]);
    const container = createMockContainer(services);

    function AsyncComponent() {
      const { data } = useAsyncDerivedSuspense(AsyncPort);
      return <div>Data: {data}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <Suspense fallback={<div>Loading...</div>}>
          <AsyncComponent />
        </Suspense>
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Loading...")).toBeDefined();
  });
});
