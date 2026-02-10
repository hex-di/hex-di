import { describe, it, expect } from "vitest";
import {
  createStepFailedError,
  createCompensationFailedError,
  createTimeoutError,
  createCancelledError,
  createValidationFailedError,
  createPortNotFoundError,
  createPersistenceFailedError,
} from "../src/errors/factories.js";
import type { SagaError } from "../src/errors/types.js";

// =============================================================================
// Helpers
// =============================================================================

function baseFields(overrides?: Record<string, unknown>) {
  return {
    executionId: "exec-1",
    sagaName: "TestSaga",
    stepName: "TestStep",
    stepIndex: 0,
    message: "Test error",
    completedSteps: ["Step1", "Step2"] as readonly string[],
    compensatedSteps: ["Step2"] as readonly string[],
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("error factories", () => {
  describe("StepFailedError", () => {
    it("has _tag: 'StepFailed'", () => {
      const error = createStepFailedError(baseFields(), new Error("step fail"));
      expect(error._tag).toBe("StepFailed");
    });

    it("carries cause of original step error", () => {
      const cause = new Error("Payment declined");
      const error = createStepFailedError(baseFields(), cause);
      expect(error.cause).toBe(cause);
    });

    it("includes executionId", () => {
      const error = createStepFailedError(baseFields({ executionId: "exec-42" }), "cause");
      expect(error.executionId).toBe("exec-42");
    });

    it("includes stepName", () => {
      const error = createStepFailedError(baseFields({ stepName: "ChargePayment" }), "cause");
      expect(error.stepName).toBe("ChargePayment");
    });

    it("includes stepIndex", () => {
      const error = createStepFailedError(baseFields({ stepIndex: 3 }), "cause");
      expect(error.stepIndex).toBe(3);
    });

    it("includes completedSteps list", () => {
      const error = createStepFailedError(baseFields(), "cause");
      expect(error.completedSteps).toEqual(["Step1", "Step2"]);
    });

    it("includes compensatedSteps list", () => {
      const error = createStepFailedError(baseFields(), "cause");
      expect(error.compensatedSteps).toEqual(["Step2"]);
    });

    it("is frozen", () => {
      const error = createStepFailedError(baseFields(), "cause");
      expect(Object.isFrozen(error)).toBe(true);
    });
  });

  describe("CompensationFailedError", () => {
    it("has _tag: 'CompensationFailed'", () => {
      const error = createCompensationFailedError(baseFields(), "cause", "comp-cause", ["s1"]);
      expect(error._tag).toBe("CompensationFailed");
    });

    it("carries cause and compensationCause", () => {
      const cause = new Error("original");
      const compCause = new Error("comp fail");
      const error = createCompensationFailedError(baseFields(), cause, compCause, []);
      expect(error.cause).toBe(cause);
      expect(error.compensationCause).toBe(compCause);
    });

    it("lists failedCompensationSteps", () => {
      const error = createCompensationFailedError(baseFields(), "c", "cc", ["Reserve", "Charge"]);
      expect(error.failedCompensationSteps).toEqual(["Reserve", "Charge"]);
    });
  });

  describe("TimeoutError", () => {
    it("has _tag: 'Timeout'", () => {
      const error = createTimeoutError(baseFields(), 5000);
      expect(error._tag).toBe("Timeout");
    });

    it("has timeoutMs field", () => {
      const error = createTimeoutError(baseFields(), 3000);
      expect(error.timeoutMs).toBe(3000);
    });
  });

  describe("CancelledError", () => {
    it("has _tag: 'Cancelled'", () => {
      const error = createCancelledError(baseFields());
      expect(error._tag).toBe("Cancelled");
    });

    it("includes all base fields", () => {
      const error = createCancelledError(baseFields({ executionId: "exec-cancel" }));
      expect(error.executionId).toBe("exec-cancel");
      expect(error.sagaName).toBe("TestSaga");
    });
  });

  describe("ValidationFailedError", () => {
    it("has _tag: 'ValidationFailed' and cause", () => {
      const cause = { field: "orderId", message: "required" };
      const error = createValidationFailedError(baseFields(), cause);
      expect(error._tag).toBe("ValidationFailed");
      expect(error.cause).toBe(cause);
    });
  });

  describe("PortNotFoundError", () => {
    it("has _tag: 'PortNotFound' and portName", () => {
      const error = createPortNotFoundError(baseFields(), "InventoryPort");
      expect(error._tag).toBe("PortNotFound");
      expect(error.portName).toBe("InventoryPort");
    });
  });

  describe("PersistenceFailedError", () => {
    it("has _tag: 'PersistenceFailed', operation, and cause", () => {
      const cause = new Error("DB connection lost");
      const error = createPersistenceFailedError(baseFields(), "save", cause);
      expect(error._tag).toBe("PersistenceFailed");
      expect(error.operation).toBe("save");
      expect(error.cause).toBe(cause);
    });

    it("supports all operation types", () => {
      for (const op of ["save", "load", "delete", "update"] as const) {
        const error = createPersistenceFailedError(baseFields(), op, "err");
        expect(error.operation).toBe(op);
      }
    });
  });

  describe("error message propagation", () => {
    it("StepFailedError carries custom message", () => {
      const error = createStepFailedError(
        baseFields({ message: "Step 'Charge' failed after 3 retries" }),
        new Error("Payment declined")
      );
      expect(error.message).toBe("Step 'Charge' failed after 3 retries");
    });

    it("TimeoutError message includes timeout value", () => {
      const error = createTimeoutError(
        baseFields({ message: "Step timed out after 5000ms" }),
        5000
      );
      expect(error.message).toContain("5000");
    });

    it("PortNotFoundError message includes port name", () => {
      const error = createPortNotFoundError(
        baseFields({ message: 'Port "InventoryPort" not found in container' }),
        "InventoryPort"
      );
      expect(error.message).toContain("InventoryPort");
      expect(error.portName).toBe("InventoryPort");
    });
  });

  describe("sagaName field", () => {
    it("all variants include sagaName", () => {
      const base = baseFields({ sagaName: "OrderSaga" });
      expect(createStepFailedError(base, "c").sagaName).toBe("OrderSaga");
      expect(createTimeoutError(base, 1000).sagaName).toBe("OrderSaga");
      expect(createCancelledError(base).sagaName).toBe("OrderSaga");
      expect(createPortNotFoundError(base, "p").sagaName).toBe("OrderSaga");
    });
  });

  describe("all variants include stepName", () => {
    it("all 7 error variants include stepName", () => {
      const base = baseFields({ stepName: "ProcessPayment" });
      expect(createStepFailedError(base, "c").stepName).toBe("ProcessPayment");
      expect(createCompensationFailedError(base, "c", "cc", []).stepName).toBe("ProcessPayment");
      expect(createTimeoutError(base, 1000).stepName).toBe("ProcessPayment");
      expect(createCancelledError(base).stepName).toBe("ProcessPayment");
      expect(createValidationFailedError(base, "c").stepName).toBe("ProcessPayment");
      expect(createPortNotFoundError(base, "p").stepName).toBe("ProcessPayment");
      expect(createPersistenceFailedError(base, "save", "c").stepName).toBe("ProcessPayment");
    });
  });

  describe("all variants include stepIndex", () => {
    it("all 7 error variants include stepIndex", () => {
      const base = baseFields({ stepIndex: 5 });
      expect(createStepFailedError(base, "c").stepIndex).toBe(5);
      expect(createCompensationFailedError(base, "c", "cc", []).stepIndex).toBe(5);
      expect(createTimeoutError(base, 1000).stepIndex).toBe(5);
      expect(createCancelledError(base).stepIndex).toBe(5);
      expect(createValidationFailedError(base, "c").stepIndex).toBe(5);
      expect(createPortNotFoundError(base, "p").stepIndex).toBe(5);
      expect(createPersistenceFailedError(base, "save", "c").stepIndex).toBe(5);
    });
  });

  describe("PersistenceFailed for all operations", () => {
    it("PersistenceFailed returned for save operation", () => {
      const err = createPersistenceFailedError(baseFields(), "save", "db error");
      expect(err._tag).toBe("PersistenceFailed");
      expect(err.operation).toBe("save");
    });

    it("PersistenceFailed returned for load operation", () => {
      const err = createPersistenceFailedError(baseFields(), "load", "timeout");
      expect(err.operation).toBe("load");
    });

    it("PersistenceFailed returned for update operation", () => {
      const err = createPersistenceFailedError(baseFields(), "update", "conflict");
      expect(err.operation).toBe("update");
    });

    it("PersistenceFailed returned for delete operation", () => {
      const err = createPersistenceFailedError(baseFields(), "delete", "not found");
      expect(err.operation).toBe("delete");
    });
  });

  describe("SagaError _tag discriminant", () => {
    it("enables exhaustive switch/case handling", () => {
      const errors: SagaError[] = [
        createStepFailedError(baseFields(), "c"),
        createCompensationFailedError(baseFields(), "c", "cc", []),
        createTimeoutError(baseFields(), 1000),
        createCancelledError(baseFields()),
        createValidationFailedError(baseFields(), "c"),
        createPortNotFoundError(baseFields(), "p"),
        createPersistenceFailedError(baseFields(), "save", "c"),
      ];

      const tags = errors.map(e => e._tag);
      expect(tags).toEqual([
        "StepFailed",
        "CompensationFailed",
        "Timeout",
        "Cancelled",
        "ValidationFailed",
        "PortNotFound",
        "PersistenceFailed",
      ]);
    });

    it("all 7 error variants include executionId", () => {
      const errors: SagaError[] = [
        createStepFailedError(baseFields({ executionId: "e1" }), "c"),
        createCompensationFailedError(baseFields({ executionId: "e2" }), "c", "cc", []),
        createTimeoutError(baseFields({ executionId: "e3" }), 1000),
        createCancelledError(baseFields({ executionId: "e4" })),
        createValidationFailedError(baseFields({ executionId: "e5" }), "c"),
        createPortNotFoundError(baseFields({ executionId: "e6" }), "p"),
        createPersistenceFailedError(baseFields({ executionId: "e7" }), "save", "c"),
      ];

      errors.forEach((e, i) => {
        expect(e.executionId).toBe(`e${i + 1}`);
      });
    });

    it("all 7 error variants include completedSteps", () => {
      const completed = ["A", "B"];
      const errors: SagaError[] = [
        createStepFailedError(baseFields({ completedSteps: completed }), "c"),
        createCompensationFailedError(baseFields({ completedSteps: completed }), "c", "cc", []),
        createTimeoutError(baseFields({ completedSteps: completed }), 1000),
        createCancelledError(baseFields({ completedSteps: completed })),
        createValidationFailedError(baseFields({ completedSteps: completed }), "c"),
        createPortNotFoundError(baseFields({ completedSteps: completed }), "p"),
        createPersistenceFailedError(baseFields({ completedSteps: completed }), "save", "c"),
      ];

      errors.forEach(e => {
        expect(e.completedSteps).toEqual(completed);
      });
    });

    it("all 7 error variants include compensatedSteps", () => {
      const compensated = ["X"];
      const errors: SagaError[] = [
        createStepFailedError(baseFields({ compensatedSteps: compensated }), "c"),
        createCompensationFailedError(baseFields({ compensatedSteps: compensated }), "c", "cc", []),
        createTimeoutError(baseFields({ compensatedSteps: compensated }), 1000),
        createCancelledError(baseFields({ compensatedSteps: compensated })),
        createValidationFailedError(baseFields({ compensatedSteps: compensated }), "c"),
        createPortNotFoundError(baseFields({ compensatedSteps: compensated }), "p"),
        createPersistenceFailedError(baseFields({ compensatedSteps: compensated }), "save", "c"),
      ];

      errors.forEach(e => {
        expect(e.compensatedSteps).toEqual(compensated);
      });
    });
  });
});
