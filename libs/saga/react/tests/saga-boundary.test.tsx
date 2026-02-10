import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import type {
  StepFailedError,
  CompensationFailedError,
  TimeoutError,
  CancelledError,
} from "@hex-di/saga";
import { SagaBoundary } from "../src/index.js";

afterEach(() => {
  cleanup();
});

// =============================================================================
// Helpers
// =============================================================================

function ThrowingSagaChild({ error }: { error: unknown }): ReactNode {
  throw error;
}

function createStepFailedError(): StepFailedError<unknown> {
  return {
    _tag: "StepFailed",
    message: "Payment failed",
    sagaName: "OrderSaga",
    stepName: "ChargePayment",
    stepIndex: 2,
    cause: new Error("Insufficient funds"),
    completedSteps: ["ValidateOrder", "ReserveStock"],
    compensatedSteps: ["ReserveStock", "ValidateOrder"],
    executionId: "exec-1",
  };
}

function createCompensationFailedError(): CompensationFailedError<unknown> {
  return {
    _tag: "CompensationFailed",
    message: "Compensation failed",
    sagaName: "OrderSaga",
    stepName: "ChargePayment",
    stepIndex: 2,
    cause: new Error("Charge failed"),
    compensationCause: new Error("Stock restore failed"),
    completedSteps: ["ValidateOrder", "ReserveStock"],
    compensatedSteps: ["ValidateOrder"],
    failedCompensationSteps: ["ReserveStock"],
    executionId: "exec-2",
  };
}

function createTimeoutError(): TimeoutError {
  return {
    _tag: "Timeout",
    message: "Step timed out",
    sagaName: "OrderSaga",
    stepName: "ShipOrder",
    stepIndex: 3,
    timeoutMs: 5000,
    completedSteps: ["ValidateOrder", "ReserveStock", "ChargePayment"],
    compensatedSteps: [],
    executionId: "exec-3",
  };
}

function createCancelledError(): CancelledError {
  return {
    _tag: "Cancelled",
    message: "Saga cancelled",
    sagaName: "OrderSaga",
    stepName: "ReserveStock",
    stepIndex: 1,
    completedSteps: ["ValidateOrder"],
    compensatedSteps: ["ValidateOrder"],
    executionId: "exec-4",
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("SagaBoundary", () => {
  // Suppress console.error from React error boundary in test output
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it("renders children when no error", () => {
    render(
      <SagaBoundary fallback={() => <div>Error</div>}>
        <div>Content</div>
      </SagaBoundary>
    );

    expect(screen.getByText("Content")).toBeDefined();
  });

  it("renders fallback on StepFailed error", () => {
    const error = createStepFailedError();

    render(
      <SagaBoundary
        fallback={({ error: sagaError, compensated }) => (
          <div>
            <span>Tag: {sagaError._tag}</span>
            <span>Step: {sagaError.stepName}</span>
            <span>Compensated: {compensated ? "yes" : "no"}</span>
          </div>
        )}
      >
        <ThrowingSagaChild error={error} />
      </SagaBoundary>
    );

    expect(screen.getByText("Tag: StepFailed")).toBeDefined();
    expect(screen.getByText("Step: ChargePayment")).toBeDefined();
    expect(screen.getByText("Compensated: yes")).toBeDefined();
  });

  it("renders fallback on CompensationFailed error", () => {
    const error = createCompensationFailedError();

    render(
      <SagaBoundary
        fallback={({ error: sagaError, compensated }) => (
          <div>
            <span>Tag: {sagaError._tag}</span>
            <span>Compensated: {compensated ? "yes" : "no"}</span>
          </div>
        )}
      >
        <ThrowingSagaChild error={error} />
      </SagaBoundary>
    );

    expect(screen.getByText("Tag: CompensationFailed")).toBeDefined();
    expect(screen.getByText("Compensated: no")).toBeDefined();
  });

  it("provides executionId to fallback", () => {
    const error = createStepFailedError();

    render(
      <SagaBoundary
        fallback={({ executionId }) => <span>ExecutionId: {executionId ?? "none"}</span>}
      >
        <ThrowingSagaChild error={error} />
      </SagaBoundary>
    );

    expect(screen.getByText("ExecutionId: exec-1")).toBeDefined();
  });

  it("calls onError callback", () => {
    const error = createStepFailedError();
    const onError = vi.fn();

    render(
      <SagaBoundary fallback={() => <div>Error</div>} onError={onError}>
        <ThrowingSagaChild error={error} />
      </SagaBoundary>
    );

    expect(onError).toHaveBeenCalledWith(error, "exec-1");
  });

  it("reset clears error and re-renders children", () => {
    let shouldThrow = true;

    function MaybeThrow() {
      if (shouldThrow) {
        throw createStepFailedError();
      }
      return <div>Recovered</div>;
    }

    render(
      <SagaBoundary
        fallback={({ reset }) => (
          <button
            onClick={() => {
              shouldThrow = false;
              reset();
            }}
          >
            Reset
          </button>
        )}
      >
        <MaybeThrow />
      </SagaBoundary>
    );

    expect(screen.getByText("Reset")).toBeDefined();

    fireEvent.click(screen.getByText("Reset"));

    expect(screen.getByText("Recovered")).toBeDefined();
  });

  it("re-throws non-saga errors to parent boundaries", () => {
    const nonSagaError = new Error("Not a saga error");

    // The non-saga error should propagate up
    expect(() => {
      render(
        <SagaBoundary fallback={() => <div>Should not appear</div>}>
          <ThrowingSagaChild error={nonSagaError} />
        </SagaBoundary>
      );
    }).toThrow("Not a saga error");
  });

  it("handles Timeout error with compensatedSteps check", () => {
    const error = createTimeoutError();

    render(
      <SagaBoundary
        fallback={({ error: sagaError, compensated }) => (
          <div>
            <span>Tag: {sagaError._tag}</span>
            <span>Compensated: {compensated ? "yes" : "no"}</span>
          </div>
        )}
      >
        <ThrowingSagaChild error={error} />
      </SagaBoundary>
    );

    expect(screen.getByText("Tag: Timeout")).toBeDefined();
    // Timeout error has empty compensatedSteps, so compensated is false
    expect(screen.getByText("Compensated: no")).toBeDefined();
  });

  it("handles Cancelled error with compensated steps", () => {
    const error = createCancelledError();

    render(
      <SagaBoundary
        fallback={({ error: sagaError, compensated }) => (
          <div>
            <span>Tag: {sagaError._tag}</span>
            <span>Compensated: {compensated ? "yes" : "no"}</span>
          </div>
        )}
      >
        <ThrowingSagaChild error={error} />
      </SagaBoundary>
    );

    expect(screen.getByText("Tag: Cancelled")).toBeDefined();
    // Cancelled has compensatedSteps: ["ValidateOrder"], so compensated is true
    expect(screen.getByText("Compensated: yes")).toBeDefined();
  });
});
