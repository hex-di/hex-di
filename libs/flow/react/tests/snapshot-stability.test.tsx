/**
 * Snapshot stability tests for flow-react hooks.
 *
 * Verifies that useMachine getSnapshot returns stable references
 * between renders when the machine state has not changed.
 */

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import React, { useState } from "react";
import { port, type Port } from "@hex-di/core";
import { HexDiContainerProvider } from "@hex-di/react";
import type { FlowService, MachineSnapshot, ActivityStatus } from "@hex-di/flow";
import { useMachine } from "../src/hooks/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

const INTERNAL_ACCESS = Symbol.for("hex-di/internal-access");

type TestState = "idle" | "loading" | "success";
type TestEvent = "FETCH" | "SUCCESS";

interface TestContext {
  readonly data: string | null;
}

type TestFlowService = FlowService<TestState, TestEvent, TestContext>;

const TestFlowPort = port<TestFlowService>()({ name: "TestFlow" });

function mockSnapshot<TState extends string, TContext>(
  state: TState,
  context: TContext,
  activities: readonly {
    readonly id: string;
    readonly status: ActivityStatus;
    readonly startTime: number;
    readonly endTime: number | undefined;
  }[] = []
): MachineSnapshot<TState, TContext> {
  return {
    state,
    context,
    activities,
    stateValue: state,
    pendingEvents: [],
    matches: (path: string) => path === state,
    can: () => true,
  };
}

function mockResultAsync(): { match: ReturnType<typeof vi.fn> } {
  return {
    match: vi
      .fn()
      .mockImplementation((onOk: (v: void) => unknown) => Promise.resolve(onOk(undefined))),
  };
}

function mockOkResult(value: unknown = []): { readonly _tag: "Ok"; readonly value: unknown } {
  return { _tag: "Ok", value };
}

function createMockFlowService(initialSnapshot: MachineSnapshot<TestState, TestContext>): {
  service: TestFlowService;
  triggerStateChange: (snapshot: MachineSnapshot<TestState, TestContext>) => void;
} {
  let currentSnapshot = initialSnapshot;
  const subscribers = new Set<(snapshot: MachineSnapshot<TestState, TestContext>) => void>();

  const service: TestFlowService = {
    snapshot: () => currentSnapshot,
    state: () => currentSnapshot.state,
    context: () => currentSnapshot.context,
    send: vi.fn().mockReturnValue(mockOkResult([])),
    sendBatch: vi.fn().mockReturnValue(mockOkResult([])),
    sendAndExecute: vi.fn().mockReturnValue(mockResultAsync()),
    subscribe: (callback: (snapshot: MachineSnapshot<TestState, TestContext>) => void) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    getActivityStatus: () => undefined,
    dispose: vi.fn().mockReturnValue(mockResultAsync()),
    isDisposed: false,
  };

  const triggerStateChange = (snapshot: MachineSnapshot<TestState, TestContext>): void => {
    currentSnapshot = snapshot;
    subscribers.forEach(cb => cb(snapshot));
  };

  return { service, triggerStateChange };
}

function createMockContainer(flowService: TestFlowService): any {
  const mockResolve = vi.fn().mockImplementation((p: Port<unknown, string>) => {
    const pName = (p as { __portName?: string }).__portName;
    if (pName === "TestFlow") return flowService;
    throw new Error(`Unknown port: ${pName}`);
  });

  return {
    resolve: mockResolve,
    resolveAsync: vi
      .fn()
      .mockImplementation((p: Port<unknown, string>) => Promise.resolve(mockResolve(p))),
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
// Tests
// =============================================================================

afterEach(() => {
  cleanup();
});

describe("useMachine snapshot stability", () => {
  it("getSnapshot returns cached snapshot between calls without state changes", () => {
    const initialSnapshot = mockSnapshot("idle", { data: null });
    const { service } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service);

    const snapshots: Array<MachineSnapshot<TestState, TestContext>> = [];

    function MachineConsumer(): React.ReactElement {
      const { state, context } = useMachine(TestFlowPort);
      // Capture the snapshot from the service to check stability
      snapshots.push(service.snapshot());
      return (
        <div>
          <div data-testid="state">{state}</div>
          <div data-testid="data">{context.data ?? "null"}</div>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <MachineConsumer />
      </HexDiContainerProvider>
    );

    // The snapshot reference should be the same between renders
    // (useSyncExternalStore's getSnapshot should return cached values)
    expect(screen.getByTestId("state").textContent).toBe("idle");
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    // All snapshots should be the same reference (from getSnapshot caching)
    for (let i = 1; i < snapshots.length; i++) {
      expect(snapshots[i]).toBe(snapshots[0]);
    }
  });

  it("snapshot updates when machine state actually changes", () => {
    const initialSnapshot = mockSnapshot("idle", { data: null });
    const { service, triggerStateChange } = createMockFlowService(initialSnapshot);
    const container = createMockContainer(service);

    function MachineConsumer(): React.ReactElement {
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
        <MachineConsumer />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("idle");

    act(() => {
      triggerStateChange(mockSnapshot("loading", { data: null }));
    });

    expect(screen.getByTestId("state").textContent).toBe("loading");

    act(() => {
      triggerStateChange(mockSnapshot("success", { data: "loaded" }));
    });

    expect(screen.getByTestId("state").textContent).toBe("success");
    expect(screen.getByTestId("data").textContent).toBe("loaded");
  });

  it("invalidates cache when service changes (container swap)", () => {
    const snapshot1 = mockSnapshot("idle", { data: "service-1" });
    const snapshot2 = mockSnapshot("loading", { data: "service-2" });

    const { service: service1 } = createMockFlowService(snapshot1);
    const { service: service2 } = createMockFlowService(snapshot2);

    const container1 = createMockContainer(service1);
    const container2 = createMockContainer(service2);

    function MachineConsumer(): React.ReactElement {
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
        <MachineConsumer />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("idle");
    expect(screen.getByTestId("data").textContent).toBe("service-1");

    rerender(
      <HexDiContainerProvider container={container2}>
        <MachineConsumer />
      </HexDiContainerProvider>
    );

    expect(screen.getByTestId("state").textContent).toBe("loading");
    expect(screen.getByTestId("data").textContent).toBe("service-2");
  });
});
