import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent, act } from "@testing-library/react";
import type { Port } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { HexDiContainerProvider } from "@hex-di/react";
import { sagaManagementPort } from "@hex-di/saga";
import type { SagaManagementExecutor, SagaExecutionSummary, ManagementError } from "@hex-di/saga";
import { useSagaHistory, SagaManagementProvider } from "../src/index.js";

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
// Test Port
// =============================================================================

const OrderManagementPort = sagaManagementPort<{ trackingNumber: string }, { reason: string }>()({
  name: "OrderSagaManagement",
});

// =============================================================================
// Tests
// =============================================================================

describe("useSagaHistory", () => {
  it("starts in loading state", () => {
    const executor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn(),
      listExecutions: vi.fn().mockReturnValue(ResultAsync.fromSafePromise(new Promise(() => {}))),
    };
    const services = new Map<string, unknown>([["OrderSagaManagement", executor]]);
    const container = createMockContainer(services);

    function HistoryComponent() {
      const { loading } = useSagaHistory();
      return <span>Loading: {loading ? "yes" : "no"}</span>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <HistoryComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Loading: yes")).toBeDefined();
  });

  it("displays execution entries with total", async () => {
    const entries: SagaExecutionSummary[] = [
      {
        executionId: "exec-1",
        sagaName: "OrderSaga",
        status: "completed",
        startedAt: Date.now() - 10000,
        completedAt: Date.now() - 5000,
        stepCount: 3,
        completedStepCount: 3,
        compensated: false,
      },
      {
        executionId: "exec-2",
        sagaName: "OrderSaga",
        status: "failed",
        startedAt: Date.now() - 3000,
        completedAt: Date.now() - 1000,
        stepCount: 3,
        completedStepCount: 1,
        compensated: true,
      },
    ];

    const executor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn(),
      listExecutions: vi.fn().mockReturnValue(ResultAsync.ok(entries)),
    };
    const services = new Map<string, unknown>([["OrderSagaManagement", executor]]);
    const container = createMockContainer(services);

    function HistoryComponent() {
      const { entries, total, loading } = useSagaHistory();
      return (
        <div>
          <span>Loading: {loading ? "yes" : "no"}</span>
          <span>Count: {entries.length}</span>
          <span>Total: {total}</span>
          {entries.map(e => (
            <span key={e.executionId}>
              Entry: {e.executionId} ({e.status})
            </span>
          ))}
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <HistoryComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Loading: no")).toBeDefined();
      expect(screen.getByText("Count: 2")).toBeDefined();
      expect(screen.getByText("Total: 2")).toBeDefined();
      expect(screen.getByText("Entry: exec-1 (completed)")).toBeDefined();
      expect(screen.getByText("Entry: exec-2 (failed)")).toBeDefined();
    });
  });

  it("handles error from listExecutions", async () => {
    const error: ManagementError = {
      _tag: "PersistenceFailed",
      message: "Failed to list executions",
      operation: "list",
      cause: new Error("Database error"),
    };

    const executor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn(),
      listExecutions: vi.fn().mockReturnValue(ResultAsync.err(error)),
    };
    const services = new Map<string, unknown>([["OrderSagaManagement", executor]]);
    const container = createMockContainer(services);

    function HistoryComponent() {
      const { entries, loading, error } = useSagaHistory();
      return (
        <div>
          <span>Loading: {loading ? "yes" : "no"}</span>
          <span>Count: {entries.length}</span>
          <span>Error: {error ? error._tag : "none"}</span>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <HistoryComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Loading: no")).toBeDefined();
      expect(screen.getByText("Count: 0")).toBeDefined();
      expect(screen.getByText("Error: PersistenceFailed")).toBeDefined();
    });
  });

  it("passes filter options to listExecutions", async () => {
    const listExecutions = vi.fn().mockReturnValue(ResultAsync.ok([]));

    const executor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn(),
      listExecutions,
    };
    const services = new Map<string, unknown>([["OrderSagaManagement", executor]]);
    const container = createMockContainer(services);

    function HistoryComponent() {
      const { loading } = useSagaHistory({
        sagaName: "OrderSaga",
        limit: 10,
      });
      return <span>Loading: {loading ? "yes" : "no"}</span>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <HistoryComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Loading: no")).toBeDefined();
    });

    expect(listExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        sagaName: "OrderSaga",
        limit: 10,
      })
    );
  });

  it("refresh re-fetches history", async () => {
    let callCount = 0;
    const listExecutions = vi.fn().mockImplementation(() => {
      callCount++;
      return ResultAsync.ok([
        {
          executionId: `exec-${callCount}`,
          sagaName: "OrderSaga",
          status: "completed",
          startedAt: Date.now(),
          completedAt: Date.now(),
          currentStepName: null,
        },
      ]);
    });

    const executor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn(),
      listExecutions,
    };
    const services = new Map<string, unknown>([["OrderSagaManagement", executor]]);
    const container = createMockContainer(services);

    function HistoryComponent() {
      const { entries, refresh } = useSagaHistory();
      return (
        <div>
          <span>First: {entries[0]?.executionId ?? "none"}</span>
          <button onClick={() => void refresh()}>Refresh</button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <HistoryComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("First: exec-1")).toBeDefined();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Refresh"));
    });

    await waitFor(() => {
      expect(screen.getByText("First: exec-2")).toBeDefined();
    });

    expect(listExecutions).toHaveBeenCalledTimes(2);
  });
});
