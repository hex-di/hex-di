import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent, waitFor } from "@testing-library/react";
import type { Port } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { HexDiContainerProvider } from "@hex-di/react";
import { sagaPort } from "@hex-di/saga";
import type {
  SagaExecutor,
  SagaSuccess,
  StepFailedError,
  CompensationFailedError,
} from "@hex-di/saga";
import { useSaga } from "../src/index.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Shared Container Mock
// =============================================================================

const INTERNAL_ACCESS = Symbol.for("hex-di/internal-access");

function createMockContainer(services: Map<string, unknown>): any {
  const mockResolve = vi.fn().mockImplementation((port: Port<unknown, string>) => {
    const name = (port as any).__portName ?? (port as any).name;
    const svc = services.get(name);
    if (svc) return svc;
    throw new Error(`Unknown port: ${name}`);
  });

  const mockScope = {
    resolve: mockResolve,
    resolveAsync: vi
      .fn()
      .mockImplementation((port: Port<unknown, string>) => Promise.resolve(mockResolve(port))),
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
      .mockImplementation((port: Port<unknown, string>) => Promise.resolve(mockResolve(port))),
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

// =============================================================================
// useSaga
// =============================================================================

describe("useSaga", () => {
  it("starts in idle state", () => {
    const executor: SagaExecutor<OrderInput, OrderOutput, OrderError> = {
      execute: vi.fn(),
    };
    const services = new Map<string, unknown>([["OrderSaga", executor]]);
    const container = createMockContainer(services);

    function SagaComponent() {
      const { status, data, error, compensated } = useSaga(OrderSagaPort);
      return (
        <div>
          <span>Status: {status}</span>
          <span>Data: {data ? data.trackingNumber : "none"}</span>
          <span>Error: {error ? "yes" : "no"}</span>
          <span>Compensated: {compensated ? "yes" : "no"}</span>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Status: idle")).toBeDefined();
    expect(screen.getByText("Data: none")).toBeDefined();
    expect(screen.getByText("Error: no")).toBeDefined();
    expect(screen.getByText("Compensated: no")).toBeDefined();
  });

  it("executes saga and transitions to success", async () => {
    const success: SagaSuccess<OrderOutput> = {
      output: { trackingNumber: "TRK-123" },
      executionId: "exec-1",
    };

    const executor: SagaExecutor<OrderInput, OrderOutput, OrderError> = {
      execute: vi.fn().mockReturnValue(ResultAsync.ok(success)),
    };
    const services = new Map<string, unknown>([["OrderSaga", executor]]);
    const container = createMockContainer(services);

    function SagaComponent() {
      const { status, data, execute, executionId } = useSaga(OrderSagaPort);
      return (
        <div>
          <span>Status: {status}</span>
          <span>Data: {data ? data.trackingNumber : "none"}</span>
          <span>ExecId: {executionId ?? "none"}</span>
          <button onClick={() => void execute({ orderId: "O-1", items: ["item1"] })}>
            Execute
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Status: idle")).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByText("Execute"));
    });

    await waitFor(() => {
      expect(screen.getByText("Status: success")).toBeDefined();
      expect(screen.getByText("Data: TRK-123")).toBeDefined();
      expect(screen.getByText("ExecId: exec-1")).toBeDefined();
    });
  });

  it("handles saga error with compensation (StepFailed)", async () => {
    const stepError: StepFailedError<OrderError> = {
      _tag: "StepFailed",
      message: "Payment failed",
      sagaName: "orderSaga",
      stepName: "ChargePayment",
      stepIndex: 2,
      cause: { reason: "Insufficient funds" },
      completedSteps: ["ValidateOrder", "ReserveStock"],
      compensatedSteps: ["ReserveStock", "ValidateOrder"],
      executionId: "exec-2",
    };

    const executor: SagaExecutor<OrderInput, OrderOutput, OrderError> = {
      execute: vi.fn().mockReturnValue(ResultAsync.err(stepError)),
    };
    const services = new Map<string, unknown>([["OrderSaga", executor]]);
    const container = createMockContainer(services);

    function SagaComponent() {
      const { status, error, compensated, execute } = useSaga(OrderSagaPort);
      return (
        <div>
          <span>Status: {status}</span>
          <span>Error: {error ? error._tag : "none"}</span>
          <span>Compensated: {compensated ? "yes" : "no"}</span>
          <button onClick={() => void execute({ orderId: "O-2", items: ["item2"] })}>
            Execute
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaComponent />
      </HexDiContainerProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Execute"));
    });

    await waitFor(() => {
      expect(screen.getByText("Status: error")).toBeDefined();
      expect(screen.getByText("Error: StepFailed")).toBeDefined();
      expect(screen.getByText("Compensated: yes")).toBeDefined();
    });
  });

  it("exposes currentStep as undefined in idle/success state", () => {
    const executor: SagaExecutor<OrderInput, OrderOutput, OrderError> = {
      execute: vi.fn(),
    };
    const services = new Map<string, unknown>([["OrderSaga", executor]]);
    const container = createMockContainer(services);

    function SagaComponent() {
      const { currentStep } = useSaga(OrderSagaPort);
      return <span>CurrentStep: {currentStep ?? "none"}</span>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("CurrentStep: none")).toBeDefined();
  });

  it("exposes currentStep from error stepName on failure", async () => {
    const stepError: StepFailedError<OrderError> = {
      _tag: "StepFailed",
      message: "Payment failed",
      sagaName: "orderSaga",
      stepName: "ChargePayment",
      stepIndex: 2,
      cause: { reason: "Insufficient funds" },
      completedSteps: ["ValidateOrder", "ReserveStock"],
      compensatedSteps: ["ReserveStock", "ValidateOrder"],
      executionId: "exec-cs",
    };

    const executor: SagaExecutor<OrderInput, OrderOutput, OrderError> = {
      execute: vi.fn().mockReturnValue(ResultAsync.err(stepError)),
    };
    const services = new Map<string, unknown>([["OrderSaga", executor]]);
    const container = createMockContainer(services);

    function SagaComponent() {
      const { currentStep, execute } = useSaga(OrderSagaPort);
      return (
        <div>
          <span>CurrentStep: {currentStep ?? "none"}</span>
          <button onClick={() => void execute({ orderId: "O-cs", items: ["item1"] })}>
            Execute
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaComponent />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("CurrentStep: none")).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByText("Execute"));
    });

    await waitFor(() => {
      expect(screen.getByText("CurrentStep: ChargePayment")).toBeDefined();
    });
  });

  it("handles compensation failure", async () => {
    const compError: CompensationFailedError<OrderError> = {
      _tag: "CompensationFailed",
      message: "Compensation failed at ReserveStock",
      sagaName: "orderSaga",
      stepName: "ChargePayment",
      stepIndex: 2,
      cause: { reason: "Insufficient funds" },
      compensationCause: new Error("Stock restore failed"),
      completedSteps: ["ValidateOrder", "ReserveStock", "ChargePayment"],
      compensatedSteps: ["ValidateOrder"],
      failedCompensationSteps: ["ReserveStock"],
      executionId: "exec-3",
    };

    const executor: SagaExecutor<OrderInput, OrderOutput, OrderError> = {
      execute: vi.fn().mockReturnValue(ResultAsync.err(compError)),
    };
    const services = new Map<string, unknown>([["OrderSaga", executor]]);
    const container = createMockContainer(services);

    function SagaComponent() {
      const { status, error, compensated, execute } = useSaga(OrderSagaPort);
      return (
        <div>
          <span>Status: {status}</span>
          <span>Error: {error ? error._tag : "none"}</span>
          <span>Compensated: {compensated ? "yes" : "no"}</span>
          <button onClick={() => void execute({ orderId: "O-3", items: ["item3"] })}>
            Execute
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaComponent />
      </HexDiContainerProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Execute"));
    });

    await waitFor(() => {
      expect(screen.getByText("Status: error")).toBeDefined();
      expect(screen.getByText("Error: CompensationFailed")).toBeDefined();
      expect(screen.getByText("Compensated: no")).toBeDefined();
    });
  });

  it("resets to idle state", async () => {
    const success: SagaSuccess<OrderOutput> = {
      output: { trackingNumber: "TRK-456" },
      executionId: "exec-4",
    };

    const executor: SagaExecutor<OrderInput, OrderOutput, OrderError> = {
      execute: vi.fn().mockReturnValue(ResultAsync.ok(success)),
    };
    const services = new Map<string, unknown>([["OrderSaga", executor]]);
    const container = createMockContainer(services);

    function SagaComponent() {
      const { status, execute, reset } = useSaga(OrderSagaPort);
      return (
        <div>
          <span>Status: {status}</span>
          <button onClick={() => void execute({ orderId: "O-4", items: [] })}>Execute</button>
          <button onClick={reset}>Reset</button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaComponent />
      </HexDiContainerProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Execute"));
    });

    await waitFor(() => {
      expect(screen.getByText("Status: success")).toBeDefined();
    });

    act(() => {
      fireEvent.click(screen.getByText("Reset"));
    });

    expect(screen.getByText("Status: idle")).toBeDefined();
  });

  it("resume returns err without SagaManagementProvider", async () => {
    const executor: SagaExecutor<OrderInput, OrderOutput, OrderError> = {
      execute: vi.fn(),
    };
    const services = new Map<string, unknown>([["OrderSaga", executor]]);
    const container = createMockContainer(services);

    let resumeRef: ((executionId: string) => Promise<any>) | undefined;

    function SagaComponent() {
      const { resume } = useSaga(OrderSagaPort);
      resumeRef = resume;
      return <span>mounted</span>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaComponent />
      </HexDiContainerProvider>
    );

    const result = await resumeRef?.("exec-resume-1");
    expect(result.isErr()).toBe(true);
    expect(result.error._tag).toBe("ValidationFailed");
    expect(result.error.message).toContain("SagaManagementProvider");
  });

  it("cancel returns err without SagaManagementProvider", async () => {
    const executor: SagaExecutor<OrderInput, OrderOutput, OrderError> = {
      execute: vi.fn(),
    };
    const services = new Map<string, unknown>([["OrderSaga", executor]]);
    const container = createMockContainer(services);

    let cancelRef: (() => Promise<any>) | undefined;

    function SagaComponent() {
      const { cancel } = useSaga(OrderSagaPort);
      cancelRef = cancel;
      return <span>mounted</span>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaComponent />
      </HexDiContainerProvider>
    );

    const result = await cancelRef?.();
    expect(result.isErr()).toBe(true);
    expect(result.error._tag).toBe("ValidationFailed");
    expect(result.error.message).toContain("SagaManagementProvider");
  });

  it("reset returns err when saga is running", async () => {
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
    const services = new Map<string, unknown>([["OrderSaga", executor]]);
    const container = createMockContainer(services);

    let executeRef: ((input: OrderInput) => Promise<any>) | undefined;
    let resetRef: (() => any) | undefined;

    function SagaComponent() {
      const { execute, reset } = useSaga(OrderSagaPort);
      executeRef = execute;
      resetRef = reset;
      return <span>mounted</span>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaComponent />
      </HexDiContainerProvider>
    );

    // Start execution (will be pending)
    act(() => {
      void executeRef?.({ orderId: "O-reset", items: [] });
    });

    // Try reset while running
    const result = resetRef?.();
    expect(result.isErr()).toBe(true);
    expect(result.error._tag).toBe("ValidationFailed");
    expect(result.error.message).toContain("Cannot reset while saga is running");

    // Cleanup
    resolveExecution?.({ output: { trackingNumber: "X" }, executionId: "x" });
  });

  it("returns err when executing while already running", async () => {
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
    const services = new Map<string, unknown>([["OrderSaga", executor]]);
    const container = createMockContainer(services);

    let executeRef: ((input: OrderInput) => Promise<any>) | undefined;

    function SagaComponent() {
      const { status, execute } = useSaga(OrderSagaPort);
      executeRef = execute;
      return <span>Status: {status}</span>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <SagaComponent />
      </HexDiContainerProvider>
    );

    // Start first execution (will be pending)
    act(() => {
      void executeRef?.({ orderId: "O-5", items: [] });
    });

    // Try executing again while running - should return err Result
    const result = await executeRef?.({ orderId: "O-5b", items: [] });
    expect(result.isErr()).toBe(true);
    expect(result.error._tag).toBe("ValidationFailed");
    expect(result.error.message).toContain(
      "Cannot execute saga while another execution is in progress"
    );

    // Cleanup: resolve the pending execution
    resolveExecution?.({ output: { trackingNumber: "X" }, executionId: "x" });
  });
});
