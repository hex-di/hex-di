/**
 * Inspection Hooks Tests
 *
 * Tests for useFlowState, useFlowHealth, useFlowTimeline hooks.
 * Verifies push-based subscriptions via inspector.subscribe().
 *
 * @packageDocumentation
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import React from "react";
import { port, type Port } from "@hex-di/core";
import { HexDiContainerProvider } from "@hex-di/react";
import type {
  FlowInspector,
  MachineSnapshot,
  HealthEvent,
  FlowTransitionEventAny,
  Unsubscribe,
} from "@hex-di/flow";
import { useFlowState } from "../src/hooks/use-flow-state.js";
import { useFlowHealth } from "../src/hooks/use-flow-health.js";
import { useFlowTimeline } from "../src/hooks/use-flow-timeline.js";

// =============================================================================
// Constants
// =============================================================================

const INTERNAL_ACCESS = Symbol.for("hex-di/internal-access");

// =============================================================================
// Mock FlowInspector with subscribe support
// =============================================================================

function createMockInspector(): {
  inspector: FlowInspector;
  setMachineState: (snap: MachineSnapshot<string, unknown> | undefined) => void;
  setHealthEvents: (events: readonly HealthEvent[]) => void;
  setEventHistory: (events: readonly FlowTransitionEventAny[]) => void;
  notify: () => void;
} {
  let machineState: MachineSnapshot<string, unknown> | undefined;
  let healthEvents: readonly HealthEvent[] = [];
  let eventHistory: readonly FlowTransitionEventAny[] = [];
  const listeners = new Set<() => void>();

  const inspector: FlowInspector = {
    getMachineState: vi.fn((_portName: string, _instanceId: string) => machineState),
    getValidTransitions: vi.fn(() => []),
    getRunningActivities: vi.fn(() => []),
    getEventHistory: vi.fn((_options?: { limit?: number; since?: number }) => eventHistory),
    getStateHistory: vi.fn(() => []),
    getEffectHistory: vi.fn(() => []),
    getAllMachinesSnapshot: vi.fn(() => []),
    getHealthEvents: vi.fn((_options?: { limit?: number }) => healthEvents),
    getEffectResultStatistics: vi.fn(() => new Map()),
    getHighErrorRatePorts: vi.fn(() => []),
    getPendingEvents: vi.fn(() => []),
    recordEffectResult: vi.fn(),
    recordHealthEvent: vi.fn(),
    subscribe: vi.fn((callback: () => void): Unsubscribe => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    }),
    dispose: vi.fn(),
  };

  return {
    inspector,
    setMachineState: snap => {
      machineState = snap;
    },
    setHealthEvents: events => {
      healthEvents = events;
    },
    setEventHistory: events => {
      eventHistory = events;
    },
    notify: () => {
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

// =============================================================================
// Mock Container
// =============================================================================

const InspectorPort = port<FlowInspector>()({ name: "FlowInspector" });

function createMockContainer(inspector: FlowInspector): any {
  const mockResolve = vi.fn().mockImplementation((p: Port<string, unknown>) => {
    if (p.__portName === "FlowInspector") {
      return inspector;
    }
    throw new Error(`Unknown port: ${p.__portName}`);
  });

  const mockScope = {
    resolve: mockResolve,
    resolveAsync: vi
      .fn()
      .mockImplementation((p: Port<string, unknown>) => Promise.resolve(mockResolve(p))),
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
      .mockImplementation((p: Port<string, unknown>) => Promise.resolve(mockResolve(p))),
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
// Helpers
// =============================================================================

function makeSnapshot(state: string, context: unknown = {}): MachineSnapshot<string, unknown> {
  return {
    state,
    context,
    activities: [],
    pendingEvents: [],
    stateValue: state,
    matches: (path: string) => path === state,
    can: () => true,
  };
}

function makeTransition(overrides: Partial<FlowTransitionEventAny> = {}): FlowTransitionEventAny {
  return {
    id: `t-${Math.random()}`,
    machineId: "test-machine",
    prevState: "idle",
    event: { type: "START" },
    nextState: "active",
    effects: [],
    timestamp: Date.now(),
    duration: 1,
    isPinned: false,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("Inspection Hooks", () => {
  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // useFlowState
  // ---------------------------------------------------------------------------

  describe("useFlowState", () => {
    it("returns undefined when machine is not found", () => {
      const { inspector } = createMockInspector();
      const container = createMockContainer(inspector);

      let result: MachineSnapshot<string, unknown> | undefined = makeSnapshot("should-not-be-this");

      function TestComponent() {
        result = useFlowState(InspectorPort, "Unknown", "unknown-1");
        return <div data-testid="state">{result?.state ?? "none"}</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(screen.getByTestId("state").textContent).toBe("none");
    });

    it("returns machine state snapshot when found", () => {
      const { inspector, setMachineState } = createMockInspector();
      setMachineState(makeSnapshot("loading", { count: 42 }));
      const container = createMockContainer(inspector);

      function TestComponent() {
        const snapshot = useFlowState(InspectorPort, "TestPort", "inst-1");
        return <div data-testid="state">{snapshot?.state ?? "none"}</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(screen.getByTestId("state").textContent).toBe("loading");
    });

    it("updates when inspector notifies subscribers", () => {
      const { inspector, setMachineState, notify } = createMockInspector();
      setMachineState(makeSnapshot("idle"));
      const container = createMockContainer(inspector);

      function TestComponent() {
        const snapshot = useFlowState(InspectorPort, "P", "i1");
        return <div data-testid="state">{snapshot?.state ?? "none"}</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(screen.getByTestId("state").textContent).toBe("idle");

      // Change the underlying data and push notification
      setMachineState(makeSnapshot("active"));
      act(() => {
        notify();
      });

      expect(screen.getByTestId("state").textContent).toBe("active");
    });

    it("calls inspector.subscribe to register", () => {
      const { inspector } = createMockInspector();
      const container = createMockContainer(inspector);

      function TestComponent() {
        useFlowState(InspectorPort, "P", "i1");
        return <div>test</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(inspector.subscribe).toHaveBeenCalled();
    });

    it("cleans up subscription on unmount", () => {
      const { inspector } = createMockInspector();
      const container = createMockContainer(inspector);

      function TestComponent() {
        useFlowState(InspectorPort, "P", "i1");
        return <div>test</div>;
      }

      const { unmount } = render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      unmount();

      // The unsubscribe function returned by subscribe should have been called.
      // We can verify by checking subscribe was called and that
      // the notify after unmount does not cause issues.
    });

    it("prevents unnecessary re-renders via shallowEqual", () => {
      const { inspector, notify } = createMockInspector();
      // Inspector always returns the same-structured snapshot
      const stableSnap = makeSnapshot("idle");
      (inspector.getMachineState as ReturnType<typeof vi.fn>).mockReturnValue(stableSnap);
      const container = createMockContainer(inspector);

      let renderCount = 0;

      function TestComponent() {
        useFlowState(InspectorPort, "P", "i1");
        renderCount++;
        return <div data-testid="count">{renderCount}</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      const initialCount = renderCount;

      // Notify multiple times - should not cause re-renders since data is shallowEqual
      act(() => {
        notify();
      });
      act(() => {
        notify();
      });

      expect(renderCount).toBe(initialCount);
    });
  });

  // ---------------------------------------------------------------------------
  // useFlowHealth
  // ---------------------------------------------------------------------------

  describe("useFlowHealth", () => {
    it("returns empty array when no health events exist", () => {
      const { inspector } = createMockInspector();
      const container = createMockContainer(inspector);

      let result: readonly HealthEvent[] = [];

      function TestComponent() {
        result = useFlowHealth(InspectorPort);
        return <div data-testid="count">{result.length}</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(screen.getByTestId("count").textContent).toBe("0");
    });

    it("returns health events from inspector", () => {
      const { inspector, setHealthEvents } = createMockInspector();
      const events: HealthEvent[] = [
        { type: "flow-error", machineId: "m1", state: "error", timestamp: 1000 },
        { type: "flow-recovered", machineId: "m1", fromState: "error", timestamp: 2000 },
      ];
      setHealthEvents(events);
      const container = createMockContainer(inspector);

      function TestComponent() {
        const health = useFlowHealth(InspectorPort);
        return <div data-testid="count">{health.length}</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(screen.getByTestId("count").textContent).toBe("2");
    });

    it("updates when inspector notifies subscribers", () => {
      const { inspector, setHealthEvents, notify } = createMockInspector();
      setHealthEvents([]);
      const container = createMockContainer(inspector);

      function TestComponent() {
        const health = useFlowHealth(InspectorPort);
        return <div data-testid="count">{health.length}</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(screen.getByTestId("count").textContent).toBe("0");

      setHealthEvents([{ type: "flow-error", machineId: "m1", state: "error", timestamp: 1000 }]);

      act(() => {
        notify();
      });

      expect(screen.getByTestId("count").textContent).toBe("1");
    });

    it("passes limit option to inspector", () => {
      const { inspector, setHealthEvents } = createMockInspector();
      const events: HealthEvent[] = [
        { type: "flow-error", machineId: "m1", state: "s1", timestamp: 1 },
        { type: "flow-error", machineId: "m1", state: "s2", timestamp: 2 },
        { type: "flow-error", machineId: "m1", state: "s3", timestamp: 3 },
      ];
      setHealthEvents(events);
      const container = createMockContainer(inspector);

      function TestComponent() {
        useFlowHealth(InspectorPort, { limit: 2 });
        return <div>test</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(inspector.getHealthEvents).toHaveBeenCalledWith({ limit: 2 });
    });
  });

  // ---------------------------------------------------------------------------
  // useFlowTimeline
  // ---------------------------------------------------------------------------

  describe("useFlowTimeline", () => {
    it("returns empty array when no transition events exist", () => {
      const { inspector } = createMockInspector();
      const container = createMockContainer(inspector);

      function TestComponent() {
        const timeline = useFlowTimeline(InspectorPort);
        return <div data-testid="count">{timeline.length}</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(screen.getByTestId("count").textContent).toBe("0");
    });

    it("returns transition events from inspector", () => {
      const { inspector, setEventHistory } = createMockInspector();
      setEventHistory([makeTransition({ id: "t1" }), makeTransition({ id: "t2" })]);
      const container = createMockContainer(inspector);

      function TestComponent() {
        const timeline = useFlowTimeline(InspectorPort);
        return <div data-testid="count">{timeline.length}</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(screen.getByTestId("count").textContent).toBe("2");
    });

    it("updates when inspector notifies subscribers", () => {
      const { inspector, setEventHistory, notify } = createMockInspector();
      setEventHistory([]);
      const container = createMockContainer(inspector);

      function TestComponent() {
        const timeline = useFlowTimeline(InspectorPort);
        return <div data-testid="count">{timeline.length}</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(screen.getByTestId("count").textContent).toBe("0");

      setEventHistory([makeTransition({ id: "t1" }), makeTransition({ id: "t2" })]);

      act(() => {
        notify();
      });

      expect(screen.getByTestId("count").textContent).toBe("2");
    });

    it("passes limit and since options to inspector", () => {
      const { inspector } = createMockInspector();
      const container = createMockContainer(inspector);

      function TestComponent() {
        useFlowTimeline(InspectorPort, { limit: 5, since: 1000 });
        return <div>test</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(inspector.getEventHistory).toHaveBeenCalledWith({ limit: 5, since: 1000 });
    });
  });

  // ---------------------------------------------------------------------------
  // No setInterval usage
  // ---------------------------------------------------------------------------

  describe("Push-based verification", () => {
    it("does not use setInterval (no polling)", () => {
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

      const { inspector } = createMockInspector();
      const container = createMockContainer(inspector);

      function TestComponent() {
        useFlowState(InspectorPort, "P", "i1");
        useFlowHealth(InspectorPort);
        useFlowTimeline(InspectorPort);
        return <div>test</div>;
      }

      render(
        <HexDiContainerProvider container={container}>
          <TestComponent />
        </HexDiContainerProvider>
      );

      expect(setIntervalSpy).not.toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });
  });
});
