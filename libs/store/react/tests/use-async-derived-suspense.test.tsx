import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import React, { Component, Suspense, useState, type ReactNode } from "react";
import type { Port } from "@hex-di/core";
import { HexDiContainerProvider } from "@hex-di/react";
import { createAsyncDerivedPort } from "@hex-di/store";
import type {
  AsyncDerivedService,
  AsyncDerivedSnapshot,
  DeepReadonly,
  Unsubscribe,
} from "@hex-di/store";
import { useAsyncDerivedSuspense } from "../src/index.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Mock Infrastructure
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

const AsyncPort = createAsyncDerivedPort<string>()({ name: "AsyncData" });

// =============================================================================
// ErrorBoundary Helper
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: unknown) => ReactNode;
}
interface ErrorBoundaryState {
  error: unknown;
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, hasError: false };
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error, hasError: true };
  }
  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback(this.state.error);
    return this.props.children;
  }
}

// =============================================================================
// useAsyncDerivedSuspense
// =============================================================================

describe("useAsyncDerivedSuspense", () => {
  it("throws Promise on loading (triggers Suspense)", () => {
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

  it("throws error on failure (caught by ErrorBoundary)", () => {
    const { service } = createMockAsyncDerivedService<string>({
      status: "error",
      data: undefined,
      error: "Network failure" as any,
      isLoading: false,
    } as AsyncDerivedSnapshot<string, never>);
    const services = new Map<string, unknown>([["AsyncData", service]]);
    const container = createMockContainer(services);

    function AsyncComponent() {
      const { data } = useAsyncDerivedSuspense(AsyncPort);
      return <div>Data: {data}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <ErrorBoundary fallback={error => <div>Error: {String(error)}</div>}>
          <AsyncComponent />
        </ErrorBoundary>
      </HexDiContainerProvider>
    );

    expect(screen.getByText(/Network failure/)).toBeDefined();
  });

  it("returns { data, refresh } on success", () => {
    const { service } = createMockAsyncDerivedService<string>({
      status: "success",
      data: "Hello" as DeepReadonly<string>,
      error: undefined,
      isLoading: false,
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

    expect(screen.getByText("Data: Hello")).toBeDefined();
  });

  it("data is guaranteed non-undefined on success", () => {
    const { service } = createMockAsyncDerivedService<string>({
      status: "success",
      data: "World" as DeepReadonly<string>,
      error: undefined,
      isLoading: false,
    });
    const services = new Map<string, unknown>([["AsyncData", service]]);
    const container = createMockContainer(services);

    function AsyncComponent() {
      const { data } = useAsyncDerivedSuspense(AsyncPort);
      return <div>Data: {typeof data === "undefined" ? "undefined" : data}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <Suspense fallback={<div>Loading...</div>}>
          <AsyncComponent />
        </Suspense>
      </HexDiContainerProvider>
    );

    const element = screen.getByText(/^Data:/);
    expect(element.textContent).toBe("Data: World");
    expect(element.textContent).not.toContain("undefined");
  });

  it("refresh() is referentially stable", () => {
    const { service } = createMockAsyncDerivedService<string>({
      status: "success",
      data: "stable" as DeepReadonly<string>,
      error: undefined,
      isLoading: false,
    });
    const services = new Map<string, unknown>([["AsyncData", service]]);
    const container = createMockContainer(services);

    const refreshRefs: unknown[] = [];

    function Capture() {
      const { refresh } = useAsyncDerivedSuspense(AsyncPort);
      refreshRefs.push(refresh);
      return null;
    }

    function Parent() {
      const [tick, setTick] = useState(0);
      return (
        <>
          <Suspense fallback={<div>Loading...</div>}>
            <Capture />
          </Suspense>
          <button onClick={() => setTick(t => t + 1)} data-testid="tick">
            Tick {tick}
          </button>
        </>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <Parent />
      </HexDiContainerProvider>
    );

    // Force a re-render via parent state change
    act(() => {
      fireEvent.click(screen.getByTestId("tick"));
    });

    expect(refreshRefs.length).toBeGreaterThanOrEqual(2);
    expect(refreshRefs[0]).toBe(refreshRefs[1]);
  });
});
