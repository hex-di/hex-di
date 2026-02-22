import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
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
import { useStateValue } from "../src/index.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Shared Mock Infrastructure
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
}

const CounterPort = createStatePort<CounterState, CounterActions>()({
  name: "Counter",
});

// =============================================================================
// Helper: create a mock scope object
// =============================================================================

function createMockScope(services: Map<string, unknown>, scopeId: string): any {
  const mockResolve = vi.fn().mockImplementation((port: Port<string, unknown>) => {
    const name = (port as any).__portName ?? (port as any).name;
    const svc = services.get(name);
    if (svc) return svc;
    throw new Error(`Unknown port in scope: ${name}`);
  });

  return {
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
      scopeId,
    }),
  };
}

// =============================================================================
// Scoped State Tests
// =============================================================================

describe("Scoped state", () => {
  it("No separate StoreProvider needed (uses HexDiContainerProvider)", () => {
    const { service } = createMockStateService(0);
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

  it("HexDiAutoScopeProvider creates scoped state for nested components", () => {
    // Root service: count starts at 0
    const { service: rootService } = createMockStateService(0);
    // Scoped service: count starts at 100
    const { service: scopedService } = createMockStateService(100);

    const rootServices = new Map<string, unknown>([["Counter", rootService]]);
    const scopeServices = new Map<string, unknown>([["Counter", scopedService]]);

    const mockScope = createMockScope(scopeServices, "scope-1");

    const container = createMockContainer(rootServices);
    container.createScope = vi.fn().mockReturnValue(mockScope);

    function RootDisplay() {
      const state = useStateValue(CounterPort);
      return <div>Root: {state.count}</div>;
    }

    function ScopedDisplay() {
      const state = useStateValue(CounterPort);
      return <div>Scoped: {state.count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <RootDisplay />
        <HexDiAutoScopeProvider>
          <ScopedDisplay />
        </HexDiAutoScopeProvider>
      </HexDiContainerProvider>
    );

    // Root reads from root container (count: 0)
    expect(screen.getByText("Root: 0")).toBeDefined();
    // Scoped reads from the scope (count: 100)
    expect(screen.getByText("Scoped: 100")).toBeDefined();
    // Verify createScope was called
    expect(container.createScope).toHaveBeenCalled();
  });

  it("Multiple HexDiAutoScopeProvider instances create independent scoped state", () => {
    // Root service: count starts at 0
    const { service: rootService } = createMockStateService(0);
    // Scope 1 service: count starts at 100
    const { service: scopedService1 } = createMockStateService(100);
    // Scope 2 service: count starts at 200
    const { service: scopedService2 } = createMockStateService(200);

    const rootServices = new Map<string, unknown>([["Counter", rootService]]);
    const scope1Services = new Map<string, unknown>([["Counter", scopedService1]]);
    const scope2Services = new Map<string, unknown>([["Counter", scopedService2]]);

    const mockScope1 = createMockScope(scope1Services, "scope-1");
    const mockScope2 = createMockScope(scope2Services, "scope-2");

    const container = createMockContainer(rootServices);
    container.createScope = vi.fn().mockReturnValueOnce(mockScope1).mockReturnValueOnce(mockScope2);

    function RootDisplay() {
      const state = useStateValue(CounterPort);
      return <div>Root: {state.count}</div>;
    }

    function ScopedDisplay1() {
      const state = useStateValue(CounterPort);
      return <div>Scoped1: {state.count}</div>;
    }

    function ScopedDisplay2() {
      const state = useStateValue(CounterPort);
      return <div>Scoped2: {state.count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <RootDisplay />
        <HexDiAutoScopeProvider>
          <ScopedDisplay1 />
        </HexDiAutoScopeProvider>
        <HexDiAutoScopeProvider>
          <ScopedDisplay2 />
        </HexDiAutoScopeProvider>
      </HexDiContainerProvider>
    );

    // Root reads from root container (count: 0)
    expect(screen.getByText("Root: 0")).toBeDefined();
    // Scope 1 reads its own service (count: 100)
    expect(screen.getByText("Scoped1: 100")).toBeDefined();
    // Scope 2 reads its own service (count: 200)
    expect(screen.getByText("Scoped2: 200")).toBeDefined();
    // createScope was called twice (once per HexDiAutoScopeProvider)
    expect(container.createScope).toHaveBeenCalledTimes(2);
  });
});
