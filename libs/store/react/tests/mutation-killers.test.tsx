/**
 * Mutation-killing tests for store-react hooks.
 *
 * These tests target specific surviving Stryker mutants:
 *
 * Category 1: [service] -> [] dependency array mutations (11 survived)
 *   Each hook uses useCallback(..., [service]). Stryker mutates [service] to [],
 *   making callbacks stale. We kill these by re-rendering with a DIFFERENT
 *   container (different service instance), then mutating service2. With [],
 *   the subscribe callback still references service1 so changes to service2
 *   won't trigger re-renders.
 *
 * Category 2: useAsyncDerivedSuspense lifecycle mutations (14 survived/NoCov)
 *   - idle status check mutations
 *   - Promise body + subscribe callback NoCov
 *   We kill these by testing idle->success and loading->success transitions.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import React, { Component, Suspense, type ReactNode } from "react";
import { HexDiContainerProvider } from "@hex-di/react";
import { createAsyncDerivedPort } from "@hex-di/store";
import type { AsyncDerivedSnapshot, DeepReadonly } from "@hex-di/store";
import {
  useStateValue,
  useStatePort,
  useAtom,
  useDerived,
  useAsyncDerived,
  useAsyncDerivedSuspense,
} from "../src/index.js";
import {
  createMockContainer,
  createMockStateService,
  createMockAtomService,
  createMockDerivedService,
  createMockAsyncDerivedService,
  CounterPort,
  ThemePort,
  DoubleCountPort,
} from "./helpers.js";

afterEach(() => {
  cleanup();
});

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
// Category 1: Service-switching tests — kills [service] → [] mutations
//
// Strategy: render with container1, rerender with container2, then mutate
// service2. If [service] was mutated to [], subscribe still references
// service1 and changes to service2 won't re-render the component.
// =============================================================================

describe("service-switching (kills dependency array mutations)", () => {
  describe("useStateValue", () => {
    it("subscribes to new service after container switch (full state)", () => {
      const { service: service1 } = createMockStateService();
      const container1 = createMockContainer(new Map<string, unknown>([["Counter", service1]]));

      const { service: service2, setState: setState2 } = createMockStateService();
      const container2 = createMockContainer(new Map<string, unknown>([["Counter", service2]]));

      function Display() {
        const state = useStateValue(CounterPort);
        return <div data-testid="count">{state.count}</div>;
      }

      const { rerender } = render(
        <HexDiContainerProvider container={container1}>
          <Display />
        </HexDiContainerProvider>
      );

      expect(screen.getByTestId("count").textContent).toBe("0");

      rerender(
        <HexDiContainerProvider container={container2}>
          <Display />
        </HexDiContainerProvider>
      );

      act(() => {
        setState2({ count: 77 });
      });

      expect(screen.getByTestId("count").textContent).toBe("77");
    });

    it("subscribes to new service after container switch (selector)", () => {
      const { service: service1 } = createMockStateService();
      const container1 = createMockContainer(new Map<string, unknown>([["Counter", service1]]));

      const { service: service2, setState: setState2 } = createMockStateService();
      const container2 = createMockContainer(new Map<string, unknown>([["Counter", service2]]));

      function Display() {
        const count = useStateValue(CounterPort, s => s.count);
        return <div data-testid="count">{count}</div>;
      }

      const { rerender } = render(
        <HexDiContainerProvider container={container1}>
          <Display />
        </HexDiContainerProvider>
      );

      rerender(
        <HexDiContainerProvider container={container2}>
          <Display />
        </HexDiContainerProvider>
      );

      act(() => {
        setState2({ count: 500 });
      });

      expect(screen.getByTestId("count").textContent).toBe("500");
    });

    it("reads from new service getSnapshot after container switch", () => {
      const { service: service1, setState: setState1 } = createMockStateService();
      setState1({ count: 10 });
      const container1 = createMockContainer(new Map<string, unknown>([["Counter", service1]]));

      const { service: service2, setState: setState2 } = createMockStateService();
      setState2({ count: 999 });
      const container2 = createMockContainer(new Map<string, unknown>([["Counter", service2]]));

      function Display() {
        const state = useStateValue(CounterPort);
        return <div data-testid="count">{state.count}</div>;
      }

      const { rerender } = render(
        <HexDiContainerProvider container={container1}>
          <Display />
        </HexDiContainerProvider>
      );

      expect(screen.getByTestId("count").textContent).toBe("10");

      rerender(
        <HexDiContainerProvider container={container2}>
          <Display />
        </HexDiContainerProvider>
      );

      // Trigger a state change to force re-evaluation of getSnapshot
      act(() => {
        setState2({ count: 1000 });
      });

      // With stale getSnapshot ([service]→[]), this would read from service1
      expect(screen.getByTestId("count").textContent).toBe("1000");
    });
  });

  describe("useStatePort", () => {
    it("subscribes to new service after container switch", () => {
      const { service: service1 } = createMockStateService();
      const container1 = createMockContainer(new Map<string, unknown>([["Counter", service1]]));

      const { service: service2, setState: setState2 } = createMockStateService();
      const container2 = createMockContainer(new Map<string, unknown>([["Counter", service2]]));

      function Display() {
        const { state } = useStatePort(CounterPort);
        return <div data-testid="count">{state.count}</div>;
      }

      const { rerender } = render(
        <HexDiContainerProvider container={container1}>
          <Display />
        </HexDiContainerProvider>
      );

      rerender(
        <HexDiContainerProvider container={container2}>
          <Display />
        </HexDiContainerProvider>
      );

      act(() => {
        setState2({ count: 42 });
      });

      expect(screen.getByTestId("count").textContent).toBe("42");
    });

    it("reads from new service getSnapshot after container switch", () => {
      const { service: service1, setState: setState1 } = createMockStateService();
      setState1({ count: 20 });
      const container1 = createMockContainer(new Map<string, unknown>([["Counter", service1]]));

      const { service: service2, setState: setState2 } = createMockStateService();
      setState2({ count: 888 });
      const container2 = createMockContainer(new Map<string, unknown>([["Counter", service2]]));

      function Display() {
        const { state } = useStatePort(CounterPort);
        return <div data-testid="count">{state.count}</div>;
      }

      const { rerender } = render(
        <HexDiContainerProvider container={container1}>
          <Display />
        </HexDiContainerProvider>
      );

      rerender(
        <HexDiContainerProvider container={container2}>
          <Display />
        </HexDiContainerProvider>
      );

      act(() => {
        setState2({ count: 900 });
      });

      // With stale getSnapshot, this would read service1.state (count: 20)
      expect(screen.getByTestId("count").textContent).toBe("900");
    });
  });

  describe("useDerived", () => {
    it("subscribes to new service after container switch", () => {
      const { service: service1 } = createMockDerivedService(1);
      const container1 = createMockContainer(new Map<string, unknown>([["DoubleCount", service1]]));

      const { service: service2, setValue: setValue2 } = createMockDerivedService(100);
      const container2 = createMockContainer(new Map<string, unknown>([["DoubleCount", service2]]));

      function Display() {
        const value = useDerived(DoubleCountPort);
        return <div data-testid="value">{value}</div>;
      }

      const { rerender } = render(
        <HexDiContainerProvider container={container1}>
          <Display />
        </HexDiContainerProvider>
      );

      rerender(
        <HexDiContainerProvider container={container2}>
          <Display />
        </HexDiContainerProvider>
      );

      act(() => {
        setValue2(200);
      });

      expect(screen.getByTestId("value").textContent).toBe("200");
    });

    it("reads from new service getSnapshot after container switch", () => {
      const { service: service1 } = createMockDerivedService(10);
      const container1 = createMockContainer(new Map<string, unknown>([["DoubleCount", service1]]));

      const { service: service2, setValue: setValue2 } = createMockDerivedService(777);
      const container2 = createMockContainer(new Map<string, unknown>([["DoubleCount", service2]]));

      function Display() {
        const value = useDerived(DoubleCountPort);
        return <div data-testid="value">{value}</div>;
      }

      const { rerender } = render(
        <HexDiContainerProvider container={container1}>
          <Display />
        </HexDiContainerProvider>
      );

      rerender(
        <HexDiContainerProvider container={container2}>
          <Display />
        </HexDiContainerProvider>
      );

      act(() => {
        setValue2(800);
      });

      // With stale getSnapshot, this would read service1.value (10)
      expect(screen.getByTestId("value").textContent).toBe("800");
    });
  });

  describe("useAtom", () => {
    it("subscribes to new service after container switch", () => {
      const { service: service1 } = createMockAtomService("old");
      const container1 = createMockContainer(new Map<string, unknown>([["Theme", service1]]));

      const { service: service2 } = createMockAtomService("new");
      const container2 = createMockContainer(new Map<string, unknown>([["Theme", service2]]));

      function Display() {
        const [theme] = useAtom(ThemePort);
        return <div data-testid="theme">{theme}</div>;
      }

      const { rerender } = render(
        <HexDiContainerProvider container={container1}>
          <Display />
        </HexDiContainerProvider>
      );

      rerender(
        <HexDiContainerProvider container={container2}>
          <Display />
        </HexDiContainerProvider>
      );

      act(() => {
        service2.set("updated");
      });

      expect(screen.getByTestId("theme").textContent).toBe("updated");
    });

    it("reads from new service getSnapshot after container switch", () => {
      const { service: service1 } = createMockAtomService("light");
      const container1 = createMockContainer(new Map<string, unknown>([["Theme", service1]]));

      const { service: service2 } = createMockAtomService("dark");
      const container2 = createMockContainer(new Map<string, unknown>([["Theme", service2]]));

      function Display() {
        const [theme] = useAtom(ThemePort);
        return <div data-testid="theme">{theme}</div>;
      }

      const { rerender } = render(
        <HexDiContainerProvider container={container1}>
          <Display />
        </HexDiContainerProvider>
      );

      rerender(
        <HexDiContainerProvider container={container2}>
          <Display />
        </HexDiContainerProvider>
      );

      act(() => {
        service2.set("very-dark");
      });

      // With stale getSnapshot, this would read service1.value ("light")
      expect(screen.getByTestId("theme").textContent).toBe("very-dark");
    });

    it("setter uses new service after container switch", () => {
      const { service: service1 } = createMockAtomService("a");
      const container1 = createMockContainer(new Map<string, unknown>([["Theme", service1]]));

      const { service: service2 } = createMockAtomService("b");
      const container2 = createMockContainer(new Map<string, unknown>([["Theme", service2]]));

      let capturedSetter: ((v: string) => void) | undefined;

      function Display() {
        const [theme, setTheme] = useAtom(ThemePort);
        capturedSetter = setTheme;
        return <div data-testid="theme">{theme}</div>;
      }

      const { rerender } = render(
        <HexDiContainerProvider container={container1}>
          <Display />
        </HexDiContainerProvider>
      );

      rerender(
        <HexDiContainerProvider container={container2}>
          <Display />
        </HexDiContainerProvider>
      );

      // The setter should target service2, not service1
      act(() => {
        capturedSetter!("from-setter");
      });

      // service2 should have the new value
      expect(service2.value).toBe("from-setter");
      expect(screen.getByTestId("theme").textContent).toBe("from-setter");
    });
  });

  describe("useAsyncDerived", () => {
    it("subscribes to new service after container switch", () => {
      const { service: service1 } = createMockAsyncDerivedService<string>({
        status: "success",
        data: "old" as DeepReadonly<string>,
        error: undefined,
        isLoading: false,
      });
      const container1 = createMockContainer(new Map<string, unknown>([["AsyncData", service1]]));

      const { service: service2, setSnapshot: setSnapshot2 } =
        createMockAsyncDerivedService<string>({
          status: "success",
          data: "initial" as DeepReadonly<string>,
          error: undefined,
          isLoading: false,
        });
      const container2 = createMockContainer(new Map<string, unknown>([["AsyncData", service2]]));

      function Display() {
        const { snapshot } = useAsyncDerived(AsyncPort);
        return (
          <div data-testid="status">
            {snapshot.status === "success" ? snapshot.data : "not-success"}
          </div>
        );
      }

      const { rerender } = render(
        <HexDiContainerProvider container={container1}>
          <Display />
        </HexDiContainerProvider>
      );

      rerender(
        <HexDiContainerProvider container={container2}>
          <Display />
        </HexDiContainerProvider>
      );

      act(() => {
        setSnapshot2({
          status: "success",
          data: "updated" as DeepReadonly<string>,
          error: undefined,
          isLoading: false,
        });
      });

      expect(screen.getByTestId("status").textContent).toBe("updated");
    });

    it("reads from new service getSnapshot after container switch", () => {
      const { service: service1 } = createMockAsyncDerivedService<string>({
        status: "success",
        data: "first" as DeepReadonly<string>,
        error: undefined,
        isLoading: false,
      });
      const container1 = createMockContainer(new Map<string, unknown>([["AsyncData", service1]]));

      const { service: service2, setSnapshot: setSnapshot2 } =
        createMockAsyncDerivedService<string>({
          status: "success",
          data: "second" as DeepReadonly<string>,
          error: undefined,
          isLoading: false,
        });
      const container2 = createMockContainer(new Map<string, unknown>([["AsyncData", service2]]));

      function Display() {
        const { snapshot } = useAsyncDerived(AsyncPort);
        return (
          <div data-testid="status">
            {snapshot.status === "success" ? snapshot.data : "not-success"}
          </div>
        );
      }

      const { rerender } = render(
        <HexDiContainerProvider container={container1}>
          <Display />
        </HexDiContainerProvider>
      );

      rerender(
        <HexDiContainerProvider container={container2}>
          <Display />
        </HexDiContainerProvider>
      );

      act(() => {
        setSnapshot2({
          status: "success",
          data: "from-service2" as DeepReadonly<string>,
          error: undefined,
          isLoading: false,
        });
      });

      // With stale getSnapshot, this would read from service1
      expect(screen.getByTestId("status").textContent).toBe("from-service2");
    });
  });
});

// =============================================================================
// Category 2: Suspense lifecycle — kills idle/loading/promise mutations
// =============================================================================

describe("useAsyncDerivedSuspense lifecycle (kills suspense mutations)", () => {
  it("idle status triggers Suspense fallback", () => {
    const { service } = createMockAsyncDerivedService<string>({
      status: "idle",
      data: undefined,
      error: undefined,
      isLoading: false,
    });
    const container = createMockContainer(new Map<string, unknown>([["AsyncData", service]]));

    function AsyncComponent() {
      const { data } = useAsyncDerivedSuspense(AsyncPort);
      return <div data-testid="data">{data}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <Suspense fallback={<div data-testid="fallback">Suspended</div>}>
          <AsyncComponent />
        </Suspense>
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("fallback").textContent).toBe("Suspended");
  });

  it("loading → success: Promise resolves and content appears", async () => {
    const { service, setSnapshot } = createMockAsyncDerivedService<string>({
      status: "loading",
      data: undefined,
      error: undefined,
      isLoading: true,
    });
    const container = createMockContainer(new Map<string, unknown>([["AsyncData", service]]));

    function AsyncComponent() {
      const { data } = useAsyncDerivedSuspense(AsyncPort);
      return <div data-testid="data">{data}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <Suspense fallback={<div data-testid="fallback">Loading</div>}>
          <AsyncComponent />
        </Suspense>
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("fallback").textContent).toBe("Loading");

    await act(async () => {
      setSnapshot({
        status: "success",
        data: "resolved-data" as DeepReadonly<string>,
        error: undefined,
        isLoading: false,
      });
    });

    expect(screen.getByTestId("data").textContent).toBe("resolved-data");
  });

  it("loading → error: Promise resolves and error boundary catches", async () => {
    const { service, setSnapshot } = createMockAsyncDerivedService<string>({
      status: "loading",
      data: undefined,
      error: undefined,
      isLoading: true,
    });
    const container = createMockContainer(new Map<string, unknown>([["AsyncData", service]]));

    function AsyncComponent() {
      const { data } = useAsyncDerivedSuspense(AsyncPort);
      return <div data-testid="data">{data}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <ErrorBoundary fallback={error => <div data-testid="error">Error: {String(error)}</div>}>
          <Suspense fallback={<div data-testid="fallback">Loading</div>}>
            <AsyncComponent />
          </Suspense>
        </ErrorBoundary>
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("fallback").textContent).toBe("Loading");

    await act(async () => {
      setSnapshot({
        status: "error",
        data: undefined,
        error: new Error("async failure"),
        isLoading: false,
      } as AsyncDerivedSnapshot<string, never>);
    });

    expect(screen.getByTestId("error").textContent).toContain("async failure");
  });

  it("idle → success: Promise resolves from idle state", async () => {
    const { service, setSnapshot } = createMockAsyncDerivedService<string>({
      status: "idle",
      data: undefined,
      error: undefined,
      isLoading: false,
    });
    const container = createMockContainer(new Map<string, unknown>([["AsyncData", service]]));

    function AsyncComponent() {
      const { data } = useAsyncDerivedSuspense(AsyncPort);
      return <div data-testid="data">{data}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <Suspense fallback={<div data-testid="fallback">Idle fallback</div>}>
          <AsyncComponent />
        </Suspense>
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("fallback").textContent).toBe("Idle fallback");

    await act(async () => {
      setSnapshot({
        status: "success",
        data: "from-idle" as DeepReadonly<string>,
        error: undefined,
        isLoading: false,
      });
    });

    expect(screen.getByTestId("data").textContent).toBe("from-idle");
  });
});
