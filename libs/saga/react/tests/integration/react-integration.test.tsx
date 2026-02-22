import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Port } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { HexDiContainerProvider } from "@hex-di/react";
import { sagaPort, sagaManagementPort } from "@hex-di/saga";
import type {
  SagaExecutor,
  SagaManagementExecutor,
  SagaSuccess,
  SagaStatus,
  StepFailedError,
  SagaExecutionSummary,
} from "@hex-di/saga";
import {
  useSaga,
  useSagaStatus,
  useSagaHistory,
  SagaBoundary,
  SagaManagementProvider,
} from "../../src/index.js";

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
// Test Ports
// =============================================================================

interface OrderInput {
  readonly orderId: string;
  readonly items: readonly string[];
}

interface OrderOutput {
  readonly trackingNumber: string;
}

interface OrderError {
  readonly reason: string;
}

const OrderSagaPort = sagaPort<OrderInput, OrderOutput, OrderError>()({
  name: "OrderSaga",
});

const OrderManagementPort = sagaManagementPort<OrderOutput, OrderError>()({
  name: "OrderSagaManagement",
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("React integration: multi-hook scenarios", () => {
  // Suppress console.error from React error boundary in test output
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it("useSaga execute + useSagaStatus see consistent state", async () => {
    const success: SagaSuccess<OrderOutput> = {
      output: { trackingNumber: "TRK-INT-1" },
      executionId: "exec-int-1",
    };

    const completedStatus: SagaStatus = {
      state: "completed",
      executionId: "exec-int-1",
      sagaName: "OrderSaga",
      completedSteps: ["ValidateOrder", "ChargePayment"],
      startedAt: Date.now() - 1000,
      completedAt: Date.now(),
      durationMs: 1000,
    };

    const executor: SagaExecutor<OrderInput, OrderOutput, OrderError> = {
      execute: vi.fn().mockReturnValue(ResultAsync.ok(success)),
    };

    const managementExecutor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn().mockReturnValue(ResultAsync.ok(completedStatus)),
      listExecutions: vi.fn(),
    };

    const services = new Map<string, unknown>([
      ["OrderSaga", executor],
      ["OrderSagaManagement", managementExecutor],
    ]);
    const container = createMockContainer(services);

    function IntegrationComponent() {
      const saga = useSaga(OrderSagaPort);
      const statusHook = useSagaStatus(saga.executionId ?? "");

      return (
        <div>
          <span>SagaStatus: {saga.status}</span>
          <span>Data: {saga.data ? saga.data.trackingNumber : "none"}</span>
          <span>MonitorStatus: {statusHook.status}</span>
          <span>MonitorSteps: {statusHook.completedSteps.join(",")}</span>
          <button onClick={() => void saga.execute({ orderId: "O-1", items: ["item1"] })}>
            Execute
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <IntegrationComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    expect(screen.getByText("SagaStatus: idle")).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByText("Execute"));
    });

    await waitFor(() => {
      expect(screen.getByText("SagaStatus: success")).toBeDefined();
      expect(screen.getByText("Data: TRK-INT-1")).toBeDefined();
    });

    // After execution completes, the management hook should reflect status
    await waitFor(() => {
      expect(screen.getByText("MonitorStatus: completed")).toBeDefined();
      expect(screen.getByText("MonitorSteps: ValidateOrder,ChargePayment")).toBeDefined();
    });
  });

  it("useSaga execute + useSagaHistory lists execution", async () => {
    const success: SagaSuccess<OrderOutput> = {
      output: { trackingNumber: "TRK-INT-2" },
      executionId: "exec-int-2",
    };

    const executor: SagaExecutor<OrderInput, OrderOutput, OrderError> = {
      execute: vi.fn().mockReturnValue(ResultAsync.ok(success)),
    };

    const entries: SagaExecutionSummary[] = [
      {
        executionId: "exec-int-2",
        sagaName: "OrderSaga",
        status: "completed",
        startedAt: Date.now() - 2000,
        completedAt: Date.now(),
        stepCount: 3,
        completedStepCount: 3,
        compensated: false,
      },
    ];

    const managementExecutor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn(),
      listExecutions: vi.fn().mockReturnValue(ResultAsync.ok(entries)),
    };

    const services = new Map<string, unknown>([
      ["OrderSaga", executor],
      ["OrderSagaManagement", managementExecutor],
    ]);
    const container = createMockContainer(services);

    function IntegrationComponent() {
      const saga = useSaga(OrderSagaPort);
      const history = useSagaHistory();

      return (
        <div>
          <span>SagaStatus: {saga.status}</span>
          <span>HistoryCount: {history.entries.length}</span>
          {history.entries.map(e => (
            <span key={e.executionId}>
              Entry: {e.executionId} ({e.status})
            </span>
          ))}
          <button onClick={() => void saga.execute({ orderId: "O-2", items: ["item2"] })}>
            Execute
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <IntegrationComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    // Execute saga
    await act(async () => {
      fireEvent.click(screen.getByText("Execute"));
    });

    await waitFor(() => {
      expect(screen.getByText("SagaStatus: success")).toBeDefined();
    });

    // History should show the completed execution
    await waitFor(() => {
      expect(screen.getByText("HistoryCount: 1")).toBeDefined();
      expect(screen.getByText("Entry: exec-int-2 (completed)")).toBeDefined();
    });
  });

  it("SagaBoundary catches error thrown from useSaga child component", () => {
    const stepError: StepFailedError<OrderError> = {
      _tag: "StepFailed",
      message: "Payment failed",
      sagaName: "OrderSaga",
      stepName: "ChargePayment",
      stepIndex: 2,
      cause: { reason: "Insufficient funds" },
      completedSteps: ["ValidateOrder", "ReserveStock"],
      compensatedSteps: ["ReserveStock", "ValidateOrder"],
      executionId: "exec-int-3",
    };

    function ThrowingSagaChild(): ReactNode {
      throw stepError;
    }

    const onError = vi.fn();

    render(
      <SagaBoundary
        fallback={({ error, compensated, executionId, reset }) => (
          <div>
            <span>ErrorTag: {error._tag}</span>
            <span>FailedStep: {error.stepName}</span>
            <span>Compensated: {compensated ? "yes" : "no"}</span>
            <span>ExecId: {executionId ?? "none"}</span>
            <button onClick={reset}>Retry</button>
          </div>
        )}
        onError={onError}
      >
        <ThrowingSagaChild />
      </SagaBoundary>
    );

    expect(screen.getByText("ErrorTag: StepFailed")).toBeDefined();
    expect(screen.getByText("FailedStep: ChargePayment")).toBeDefined();
    expect(screen.getByText("Compensated: yes")).toBeDefined();
    expect(screen.getByText("ExecId: exec-int-3")).toBeDefined();
    expect(onError).toHaveBeenCalledWith(stepError, "exec-int-3");
  });

  it("full lifecycle: idle -> running -> success with all hooks transitioning", async () => {
    let resolveExecution: ((v: unknown) => void) | undefined;

    const executor: SagaExecutor<OrderInput, OrderOutput, OrderError> = {
      execute: vi.fn().mockReturnValue(
        ResultAsync.fromSafePromise(
          new Promise(resolve => {
            resolveExecution = resolve;
          })
        )
      ),
    };

    const runningStatus: SagaStatus = {
      state: "running",
      executionId: "exec-int-4",
      sagaName: "OrderSaga",
      currentStepIndex: 0,
      currentStepName: "ValidateOrder",
      completedSteps: [],
      startedAt: Date.now(),
    };

    const completedStatus: SagaStatus = {
      state: "completed",
      executionId: "exec-int-4",
      sagaName: "OrderSaga",
      completedSteps: ["ValidateOrder", "ChargePayment"],
      startedAt: Date.now() - 1000,
      completedAt: Date.now(),
      durationMs: 1000,
    };

    const getStatus = vi.fn().mockReturnValue(ResultAsync.ok(runningStatus));

    const managementExecutor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus,
      listExecutions: vi.fn(),
    };

    const services = new Map<string, unknown>([
      ["OrderSaga", executor],
      ["OrderSagaManagement", managementExecutor],
    ]);
    const container = createMockContainer(services);

    function LifecycleComponent() {
      const saga = useSaga(OrderSagaPort);
      const statusHook = useSagaStatus("exec-int-4");

      return (
        <div>
          <span>SagaPhase: {saga.status}</span>
          <span>MonitorState: {statusHook.status}</span>
          <button onClick={() => void saga.execute({ orderId: "O-4", items: ["item4"] })}>
            Execute
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <LifecycleComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    // Phase 1: Idle
    expect(screen.getByText("SagaPhase: idle")).toBeDefined();

    // Phase 2: Start execution (stays running because promise is pending)
    act(() => {
      void fireEvent.click(screen.getByText("Execute"));
    });

    await waitFor(() => {
      expect(screen.getByText("SagaPhase: running")).toBeDefined();
    });

    // Monitor should show running status
    await waitFor(() => {
      expect(screen.getByText("MonitorState: running")).toBeDefined();
    });

    // Phase 3: Resolve execution -> completed
    getStatus.mockReturnValue(ResultAsync.ok(completedStatus));

    await act(async () => {
      resolveExecution?.({
        output: { trackingNumber: "TRK-INT-4" },
        executionId: "exec-int-4",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("SagaPhase: success")).toBeDefined();
    });
  });
});
