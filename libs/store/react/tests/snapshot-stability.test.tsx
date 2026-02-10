/**
 * Snapshot stability tests for store-react hooks.
 *
 * Verifies that hooks correctly handle:
 * - null store values (sentinel collision avoidance)
 * - Cache invalidation on service change
 * - Stable snapshots across re-renders
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import React, { useState, useEffect } from "react";
import { HexDiContainerProvider } from "@hex-di/react";
import type { Port } from "@hex-di/core";
import { createAtomPort, createStatePort, createDerivedPort } from "@hex-di/store";
import type {
  AtomService,
  StateService,
  DerivedService,
  DeepReadonly,
  ActionMap,
  BoundActions,
  StateListener,
  Unsubscribe,
} from "@hex-di/store";
import { useAtom, useStateValue, useDerived, useStatePort } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const INTERNAL_ACCESS = Symbol.for("hex-di/internal-access");

function createMockContainer(services: Map<string, unknown>): any {
  const mockResolve = vi.fn().mockImplementation((port: Port<unknown, string>) => {
    const name = (port as any).__portName ?? (port as any).name;
    const svc = services.get(name);
    if (svc) return svc;
    throw new Error(`Unknown port: ${name}`);
  });

  return {
    resolve: mockResolve,
    resolveAsync: vi
      .fn()
      .mockImplementation((port: Port<unknown, string>) => Promise.resolve(mockResolve(port))),
    createScope: vi.fn(),
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
// Null-value Atom Service
// =============================================================================

const NullAtomPort = createAtomPort<string | null>()({ name: "NullAtom" });

function createNullAtomService(initial: string | null): {
  service: AtomService<string | null>;
} {
  let current = initial;
  const listeners = new Set<
    (value: DeepReadonly<string | null>, prev: DeepReadonly<string | null>) => void
  >();

  const notify = (prev: string | null): void => {
    for (const listener of listeners) {
      listener(current as DeepReadonly<string | null>, prev as DeepReadonly<string | null>);
    }
  };

  return {
    service: {
      get value() {
        return current as DeepReadonly<string | null>;
      },
      get isDisposed() {
        return false;
      },
      set: (value: string | null) => {
        const prev = current;
        current = value;
        notify(prev);
      },
      update: (fn: (c: string | null) => string | null) => {
        const prev = current;
        current = fn(current);
        notify(prev);
      },
      subscribe: (
        listener: (value: DeepReadonly<string | null>, prev: DeepReadonly<string | null>) => void
      ): Unsubscribe => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
  };
}

// =============================================================================
// Null-state State Service
// =============================================================================

interface NullableState {
  readonly value: string | null;
}

interface NullableActions extends ActionMap<NullableState> {
  setValue: (state: NullableState, value: string | null) => NullableState;
}

const NullableStatePort = createStatePort<NullableState, NullableActions>()({
  name: "NullableState",
});

function createNullableStateService(initial: NullableState): {
  service: StateService<NullableState, NullableActions>;
  setState: (s: NullableState) => void;
} {
  let current = initial;
  const listeners = new Set<StateListener<NullableState>>();

  const setState = (next: NullableState): void => {
    const prev = current;
    current = next;
    for (const listener of listeners) {
      listener(current as DeepReadonly<NullableState>, prev as DeepReadonly<NullableState>);
    }
  };

  const boundActions: BoundActions<NullableState, NullableActions> = {
    setValue: (value: string | null) => {
      setState({ value });
    },
  } as BoundActions<NullableState, NullableActions>;

  return {
    service: {
      get state() {
        return current as DeepReadonly<NullableState>;
      },
      get isDisposed() {
        return false;
      },
      actions: boundActions,
      subscribe: (...args: any[]): Unsubscribe => {
        if (typeof args[0] === "function" && args.length === 1) {
          const listener = args[0] as StateListener<NullableState>;
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        }
        if (typeof args[0] === "function" && typeof args[1] === "function") {
          const selector = args[0] as (state: DeepReadonly<NullableState>) => unknown;
          const listener = args[1] as (value: unknown, prev: unknown) => void;
          const equalityFn = args[2] as ((a: unknown, b: unknown) => boolean) | undefined;
          let lastSelected = selector(current as DeepReadonly<NullableState>);

          const wrappedListener: StateListener<NullableState> = state => {
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
    },
    setState,
  };
}

// =============================================================================
// Null-derived Service
// =============================================================================

const NullDerivedPort = createDerivedPort<string | null>()({ name: "NullDerived" });

function createNullDerivedService(initial: string | null): {
  service: DerivedService<string | null>;
  setValue: (v: string | null) => void;
} {
  let current = initial;
  const listeners = new Set<
    (value: DeepReadonly<string | null>, prev: DeepReadonly<string | null>) => void
  >();

  const setValue = (next: string | null): void => {
    const prev = current;
    current = next;
    for (const listener of listeners) {
      listener(current as DeepReadonly<string | null>, prev as DeepReadonly<string | null>);
    }
  };

  return {
    service: {
      get value() {
        return current as DeepReadonly<string | null>;
      },
      get isDisposed() {
        return false;
      },
      subscribe: (
        listener: (value: DeepReadonly<string | null>, prev: DeepReadonly<string | null>) => void
      ): Unsubscribe => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
    setValue,
  };
}

// =============================================================================
// Normal Atom Service (for service change tests)
// =============================================================================

const ThemePort = createAtomPort<string>()({ name: "Theme" });

function createStringAtomService(initial: string): {
  service: AtomService<string>;
} {
  let current = initial;
  const listeners = new Set<(value: DeepReadonly<string>, prev: DeepReadonly<string>) => void>();

  const notify = (prev: string): void => {
    for (const listener of listeners) {
      listener(current as DeepReadonly<string>, prev as DeepReadonly<string>);
    }
  };

  return {
    service: {
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
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

afterEach(() => {
  cleanup();
});

describe("useAtom null-value caching", () => {
  it("caches null atom values correctly without infinite loop", () => {
    const { service } = createNullAtomService(null);
    const services = new Map<string, unknown>([["NullAtom", service]]);
    const container = createMockContainer(services);

    const values: Array<string | null> = [];

    function NullAtomDisplay(): React.ReactElement {
      const [value] = useAtom(NullAtomPort);
      values.push(value);
      return <div data-testid="value">{value === null ? "null" : value}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <NullAtomDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("null")).toBeDefined();
    // Should not render excessively (no infinite loop)
    expect(values.length).toBeLessThanOrEqual(3);
  });

  it("transitions from null to value and back to null", () => {
    const { service } = createNullAtomService(null);
    const services = new Map<string, unknown>([["NullAtom", service]]);
    const container = createMockContainer(services);

    function NullAtomDisplay(): React.ReactElement {
      const [value, setValue] = useAtom(NullAtomPort);
      return (
        <div>
          <div data-testid="value">{value === null ? "null" : value}</div>
          <button data-testid="set-hello" onClick={() => setValue("hello")}>
            Set Hello
          </button>
          <button data-testid="set-null" onClick={() => setValue(null)}>
            Set Null
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <NullAtomDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("value").textContent).toBe("null");

    act(() => {
      fireEvent.click(screen.getByTestId("set-hello"));
    });
    expect(screen.getByTestId("value").textContent).toBe("hello");

    act(() => {
      fireEvent.click(screen.getByTestId("set-null"));
    });
    expect(screen.getByTestId("value").textContent).toBe("null");
  });
});

describe("useAtom service change invalidation", () => {
  it("reads new value when container (and thus service) changes", () => {
    const { service: service1 } = createStringAtomService("light");
    const { service: service2 } = createStringAtomService("dark");

    const container1 = createMockContainer(new Map([["Theme", service1]]));
    const container2 = createMockContainer(new Map([["Theme", service2]]));

    function ThemeDisplay(): React.ReactElement {
      const [theme] = useAtom(ThemePort);
      return <div data-testid="theme">{theme}</div>;
    }

    const { rerender } = render(
      <HexDiContainerProvider container={container1}>
        <ThemeDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("light");

    rerender(
      <HexDiContainerProvider container={container2}>
        <ThemeDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });
});

describe("useStateValue null-value caching", () => {
  it("caches null state values correctly", () => {
    const { service } = createNullableStateService({ value: null });
    const services = new Map<string, unknown>([["NullableState", service]]);
    const container = createMockContainer(services);

    function NullStateDisplay(): React.ReactElement {
      const state = useStateValue(NullableStatePort);
      return <div data-testid="value">{state.value === null ? "null" : state.value}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <NullStateDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("value").textContent).toBe("null");
  });

  it("caches null selected value correctly", () => {
    const { service } = createNullableStateService({ value: null });
    const services = new Map<string, unknown>([["NullableState", service]]);
    const container = createMockContainer(services);

    const selectedValues: Array<string | null> = [];

    function SelectedNullDisplay(): React.ReactElement {
      const selected = useStateValue(NullableStatePort, s => s.value);
      selectedValues.push(selected);
      return <div data-testid="value">{selected === null ? "null" : selected}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <SelectedNullDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("value").textContent).toBe("null");
    expect(selectedValues.length).toBeLessThanOrEqual(3);
  });
});

describe("useDerived null-value caching", () => {
  it("caches null derived values correctly", () => {
    const { service } = createNullDerivedService(null);
    const services = new Map<string, unknown>([["NullDerived", service]]);
    const container = createMockContainer(services);

    const values: Array<string | null> = [];

    function NullDerivedDisplay(): React.ReactElement {
      const value = useDerived(NullDerivedPort);
      values.push(value);
      return <div data-testid="value">{value === null ? "null" : value}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <NullDerivedDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("value").textContent).toBe("null");
    expect(values.length).toBeLessThanOrEqual(3);
  });

  it("transitions between null and non-null derived values", () => {
    const { service, setValue } = createNullDerivedService(null);
    const services = new Map<string, unknown>([["NullDerived", service]]);
    const container = createMockContainer(services);

    function NullDerivedDisplay(): React.ReactElement {
      const value = useDerived(NullDerivedPort);
      return <div data-testid="value">{value === null ? "null" : value}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <NullDerivedDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("value").textContent).toBe("null");

    act(() => {
      setValue("computed");
    });
    expect(screen.getByTestId("value").textContent).toBe("computed");

    act(() => {
      setValue(null);
    });
    expect(screen.getByTestId("value").textContent).toBe("null");
  });
});

describe("useStatePort null-value caching", () => {
  it("caches null state in useStatePort correctly", () => {
    const { service } = createNullableStateService({ value: null });
    const services = new Map<string, unknown>([["NullableState", service]]);
    const container = createMockContainer(services);

    function StatePortDisplay(): React.ReactElement {
      const { state } = useStatePort(NullableStatePort);
      return <div data-testid="value">{state.value === null ? "null" : state.value}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <StatePortDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("value").textContent).toBe("null");
  });
});

describe("rapid same-value updates", () => {
  it("useAtom does not infinite loop with constant-value effect", () => {
    const { service } = createStringAtomService("stable");
    const services = new Map<string, unknown>([["Theme", service]]);
    const container = createMockContainer(services);

    let renderCount = 0;

    function StableSetComponent(): React.ReactElement {
      const [theme, setTheme] = useAtom(ThemePort);
      renderCount++;

      useEffect(() => {
        // Setting to same value should not cause infinite loop
        setTheme("stable");
      });

      return <div data-testid="theme">{theme}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <StableSetComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("stable");
    // Should not exceed reasonable render count (StrictMode doubles, plus the effect)
    expect(renderCount).toBeLessThanOrEqual(6);
  });
});
