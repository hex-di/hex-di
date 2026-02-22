import { vi } from "vitest";
import type { Port } from "@hex-di/core";
import { createStatePort, createAtomPort, createDerivedPort } from "@hex-di/store";
import type {
  StateService,
  AtomService,
  DerivedService,
  AsyncDerivedService,
  AsyncDerivedSnapshot,
  DeepReadonly,
  ActionMap,
  BoundActions,
  StateListener,
  Unsubscribe,
} from "@hex-di/store";

// =============================================================================
// Shared Container Mock
// =============================================================================

export const INTERNAL_ACCESS = Symbol.for("hex-di/internal-access");

export function createMockContainer(services: Map<string, unknown>): any {
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

export interface CounterState {
  readonly count: number;
}

export interface CounterActions extends ActionMap<CounterState> {
  increment: (state: CounterState) => CounterState;
  decrement: (state: CounterState) => CounterState;
  incrementBy: (state: CounterState, amount: number) => CounterState;
}

export const CounterPort = createStatePort<CounterState, CounterActions>()({
  name: "Counter",
});

export interface MultiState {
  readonly count: number;
  readonly label: string;
}

export interface MultiActions extends ActionMap<MultiState> {
  setCount: (state: MultiState, count: number) => MultiState;
  setLabel: (state: MultiState, label: string) => MultiState;
}

export const MultiPort = createStatePort<MultiState, MultiActions>()({
  name: "Multi",
});

export const ThemePort = createAtomPort<string>()({
  name: "Theme",
});

export const DoubleCountPort = createDerivedPort<number>()({
  name: "DoubleCount",
});

// =============================================================================
// Mock Service Factories
// =============================================================================

export function createMockStateService(): {
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
        // Full state listener
        const listener = args[0] as StateListener<CounterState>;
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }
      if (typeof args[0] === "function" && typeof args[1] === "function") {
        // Selector-based listener
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

export function createMockMultiStateService(): {
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

export function createMockAtomService(initial: string): {
  service: AtomService<string>;
} {
  let current = initial;
  const listeners = new Set<(value: DeepReadonly<string>, prev: DeepReadonly<string>) => void>();

  const notify = (prev: string): void => {
    for (const listener of listeners) {
      listener(current as DeepReadonly<string>, prev as DeepReadonly<string>);
    }
  };

  const service: AtomService<string> = {
    get value() {
      return current as DeepReadonly<string>;
    },
    get isDisposed() {
      return false;
    },
    set: (value: string) => {
      const prev = current;
      current = value;
      notify(prev);
    },
    update: (fn: (c: string) => string) => {
      const prev = current;
      current = fn(current);
      notify(prev);
    },
    subscribe: (
      listener: (value: DeepReadonly<string>, prev: DeepReadonly<string>) => void
    ): Unsubscribe => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return { service };
}

export function createMockDerivedService(initialValue: number): {
  service: DerivedService<number>;
  setValue: (v: number) => void;
} {
  let current = initialValue;
  const listeners = new Set<(value: DeepReadonly<number>, prev: DeepReadonly<number>) => void>();

  const setValue = (next: number): void => {
    const prev = current;
    current = next;
    for (const listener of listeners) {
      listener(current as DeepReadonly<number>, prev as DeepReadonly<number>);
    }
  };

  const service: DerivedService<number> = {
    get value() {
      return current as DeepReadonly<number>;
    },
    get isDisposed() {
      return false;
    },
    subscribe: (
      listener: (value: DeepReadonly<number>, prev: DeepReadonly<number>) => void
    ): Unsubscribe => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return { service, setValue };
}

export function createMockAsyncDerivedService<T>(initial: AsyncDerivedSnapshot<T, never>): {
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
