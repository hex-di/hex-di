import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import type { Port } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { HexDiContainerProvider } from "@hex-di/react";
import { sagaManagementPort } from "@hex-di/saga";
import type { SagaManagementExecutor, SagaStatus, ManagementError } from "@hex-di/saga";
import { useSagaStatus, SagaManagementProvider } from "../src/index.js";

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

describe("useSagaStatus", () => {
  it("starts in loading state", () => {
    const executor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn().mockReturnValue(ResultAsync.fromSafePromise(new Promise(() => {}))),
      listExecutions: vi.fn(),
    };
    const services = new Map<string, unknown>([["OrderSagaManagement", executor]]);
    const container = createMockContainer(services);

    function StatusComponent() {
      const { loading } = useSagaStatus("exec-1");
      return <span>Loading: {loading ? "yes" : "no"}</span>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <StatusComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Loading: yes")).toBeDefined();
  });

  it("shows running status", async () => {
    const runningStatus: SagaStatus = {
      state: "running",
      executionId: "exec-1",
      sagaName: "OrderSaga",
      currentStepIndex: 1,
      currentStepName: "ReserveStock",
      completedSteps: ["ValidateOrder"],
      startedAt: Date.now(),
    };

    const executor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn().mockReturnValue(ResultAsync.ok(runningStatus)),
      listExecutions: vi.fn(),
    };
    const services = new Map<string, unknown>([["OrderSagaManagement", executor]]);
    const container = createMockContainer(services);

    function StatusComponent() {
      const { status, completedSteps, loading, currentStep } = useSagaStatus("exec-1");
      return (
        <div>
          <span>Status: {status}</span>
          <span>Steps: {completedSteps.join(",")}</span>
          <span>Loading: {loading ? "yes" : "no"}</span>
          <span>CurrentStep: {currentStep ?? "none"}</span>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <StatusComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Status: running")).toBeDefined();
      expect(screen.getByText("Steps: ValidateOrder")).toBeDefined();
      expect(screen.getByText("Loading: no")).toBeDefined();
      expect(screen.getByText("CurrentStep: ReserveStock")).toBeDefined();
    });
  });

  it("shows not-found for missing execution", async () => {
    const notFoundError: ManagementError = {
      _tag: "ExecutionNotFound",
      executionId: "exec-missing",
      message: "Execution not found",
    };

    const executor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn().mockReturnValue(ResultAsync.err(notFoundError)),
      listExecutions: vi.fn(),
    };
    const services = new Map<string, unknown>([["OrderSagaManagement", executor]]);
    const container = createMockContainer(services);

    function StatusComponent() {
      const { status, loading } = useSagaStatus("exec-missing");
      return (
        <div>
          <span>Status: {status}</span>
          <span>Loading: {loading ? "yes" : "no"}</span>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <StatusComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Status: not-found")).toBeDefined();
      expect(screen.getByText("Loading: no")).toBeDefined();
    });
  });

  it("shows failed status with compensation info", async () => {
    const failedStatus: SagaStatus = {
      state: "failed",
      executionId: "exec-1",
      sagaName: "OrderSaga",
      error: {
        _tag: "StepFailed",
        message: "Payment failed",
        sagaName: "OrderSaga",
        stepName: "ChargePayment",
        stepIndex: 2,
        cause: new Error("Insufficient funds"),
        completedSteps: ["ValidateOrder", "ReserveStock"],
        compensatedSteps: ["ReserveStock", "ValidateOrder"],
        executionId: "exec-1",
      },
      failedStepName: "ChargePayment",
      compensated: true,
      compensatedSteps: ["ReserveStock", "ValidateOrder"],
      startedAt: Date.now() - 5000,
      failedAt: Date.now(),
      durationMs: 5000,
    };

    const executor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn().mockReturnValue(ResultAsync.ok(failedStatus)),
      listExecutions: vi.fn(),
    };
    const services = new Map<string, unknown>([["OrderSagaManagement", executor]]);
    const container = createMockContainer(services);

    function StatusComponent() {
      const { status, compensated } = useSagaStatus("exec-1");
      return (
        <div>
          <span>Status: {status}</span>
          <span>Compensated: {compensated ? "yes" : "no"}</span>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <StatusComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Status: failed")).toBeDefined();
      expect(screen.getByText("Compensated: yes")).toBeDefined();
    });
  });

  it("shows completed status", async () => {
    const completedStatus: SagaStatus = {
      state: "completed",
      executionId: "exec-1",
      sagaName: "OrderSaga",
      completedSteps: ["ValidateOrder", "ReserveStock", "ChargePayment"],
      startedAt: Date.now() - 3000,
      completedAt: Date.now(),
      durationMs: 3000,
    };

    const executor: SagaManagementExecutor<any, any> = {
      resume: vi.fn(),
      cancel: vi.fn(),
      getStatus: vi.fn().mockReturnValue(ResultAsync.ok(completedStatus)),
      listExecutions: vi.fn(),
    };
    const services = new Map<string, unknown>([["OrderSagaManagement", executor]]);
    const container = createMockContainer(services);

    function StatusComponent() {
      const { status, completedSteps } = useSagaStatus("exec-1");
      return (
        <div>
          <span>Status: {status}</span>
          <span>Steps: {completedSteps.length}</span>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaManagementProvider port={OrderManagementPort}>
          <StatusComponent />
        </SagaManagementProvider>
      </HexDiContainerProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Status: completed")).toBeDefined();
      expect(screen.getByText("Steps: 3")).toBeDefined();
    });
  });
});
