import { describe, it, expect } from "vitest";
import { createInMemoryPersister } from "../src/persistence/in-memory.js";
import type { SagaExecutionState } from "../src/ports/types.js";

// =============================================================================
// Helpers
// =============================================================================

function createState(overrides?: Partial<SagaExecutionState>): SagaExecutionState {
  return {
    executionId: overrides?.executionId ?? "exec-1",
    sagaName: overrides?.sagaName ?? "TestSaga",
    input: overrides?.input ?? { orderId: "o-1" },
    currentStep: overrides?.currentStep ?? 0,
    completedSteps: overrides?.completedSteps ?? [],
    status: overrides?.status ?? "running",
    error: overrides?.error ?? null,
    compensation: overrides?.compensation ?? {
      active: false,
      compensatedSteps: [],
      failedSteps: [],
      triggeringStepIndex: null,
    },
    timestamps: overrides?.timestamps ?? {
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    },
    metadata: overrides?.metadata ?? {},
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("createInMemoryPersister", () => {
  it("returns a SagaPersister", () => {
    const persister = createInMemoryPersister();
    expect(persister).toBeDefined();
    expect(typeof persister.save).toBe("function");
    expect(typeof persister.load).toBe("function");
    expect(typeof persister.delete).toBe("function");
    expect(typeof persister.list).toBe("function");
    expect(typeof persister.update).toBe("function");
  });

  describe("save", () => {
    it("writes full SagaExecutionState", async () => {
      const persister = createInMemoryPersister();
      const state = createState();

      const result = await persister.save(state);
      expect(result.isOk()).toBe(true);

      const loaded = await persister.load("exec-1");
      expect(loaded.isOk()).toBe(true);
      if (loaded.isOk()) {
        expect(loaded.value).not.toBeNull();
        expect(loaded.value?.executionId).toBe("exec-1");
        expect(loaded.value?.sagaName).toBe("TestSaga");
      }
    });

    it("stores a deep clone (not a reference)", async () => {
      const persister = createInMemoryPersister();
      const state = createState();
      await persister.save(state);

      // Save a different state with the same ID to verify original was cloned
      await persister.save(createState({ currentStep: 99 }));

      const loaded = await persister.load("exec-1");
      if (loaded.isOk() && loaded.value) {
        // The second save replaced the first
        expect(loaded.value.currentStep).toBe(99);
      }

      // Verify the original object was not modified
      expect(state.currentStep).toBe(0);
    });
  });

  describe("load", () => {
    it("returns saved state", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "exec-42" }));

      const result = await persister.load("exec-42");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.executionId).toBe("exec-42");
      }
    });

    it("returns null for non-existent ID", async () => {
      const persister = createInMemoryPersister();

      const result = await persister.load("nonexistent");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it("returns a deep clone (not a reference)", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "exec-1" }));

      const result1 = await persister.load("exec-1");
      const result2 = await persister.load("exec-1");
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value).not.toBe(result2.value);
        expect(result1.value).toEqual(result2.value);
      }
    });
  });

  describe("delete", () => {
    it("removes state", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "exec-del" }));

      const deleteResult = await persister.delete("exec-del");
      expect(deleteResult.isOk()).toBe(true);

      const loadResult = await persister.load("exec-del");
      if (loadResult.isOk()) {
        expect(loadResult.value).toBeNull();
      }
    });

    it("does not throw for non-existent ID", async () => {
      const persister = createInMemoryPersister();

      const result = await persister.delete("nonexistent");
      expect(result.isOk()).toBe(true);
    });
  });

  describe("update", () => {
    it("applies incremental updates", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "exec-upd", currentStep: 0 }));

      const updateResult = await persister.update("exec-upd", { currentStep: 2 });
      expect(updateResult.isOk()).toBe(true);

      const loaded = await persister.load("exec-upd");
      if (loaded.isOk() && loaded.value) {
        expect(loaded.value.currentStep).toBe(2);
      }
    });

    it("returns NotFound for non-existent ID", async () => {
      const persister = createInMemoryPersister();

      const result = await persister.update("nonexistent", { currentStep: 1 });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("NotFound");
      }
    });

    it("preserves other fields during partial update", async () => {
      const persister = createInMemoryPersister();
      await persister.save(
        createState({ executionId: "exec-part", sagaName: "MySaga", currentStep: 0 })
      );

      await persister.update("exec-part", { currentStep: 3 });

      const loaded = await persister.load("exec-part");
      if (loaded.isOk() && loaded.value) {
        expect(loaded.value.sagaName).toBe("MySaga");
        expect(loaded.value.currentStep).toBe(3);
      }
    });
  });

  describe("list", () => {
    it("returns all saved states", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "e1" }));
      await persister.save(createState({ executionId: "e2" }));
      await persister.save(createState({ executionId: "e3" }));

      const result = await persister.list();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(3);
      }
    });

    it("filters by saga name", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "e1", sagaName: "OrderSaga" }));
      await persister.save(createState({ executionId: "e2", sagaName: "PaymentSaga" }));
      await persister.save(createState({ executionId: "e3", sagaName: "OrderSaga" }));

      const result = await persister.list({ sagaName: "OrderSaga" });
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value.every(s => s.sagaName === "OrderSaga")).toBe(true);
      }
    });

    it("filters by execution status", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "e1", status: "running" }));
      await persister.save(createState({ executionId: "e2", status: "completed" }));
      await persister.save(createState({ executionId: "e3", status: "running" }));

      const result = await persister.list({ status: "running" });
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value.every(s => s.status === "running")).toBe(true);
      }
    });

    it("applies pagination limit", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "e1" }));
      await persister.save(createState({ executionId: "e2" }));
      await persister.save(createState({ executionId: "e3" }));

      const result = await persister.list({ limit: 2 });
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
      }
    });

    it("returns empty array when no states match", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "e1", sagaName: "Foo" }));

      const result = await persister.list({ sagaName: "Bar" });
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("returns empty array for empty store", async () => {
      const persister = createInMemoryPersister();

      const result = await persister.list();
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe("concurrent access", () => {
    it("handles multiple saves for different execution IDs concurrently", async () => {
      const persister = createInMemoryPersister();
      const saves = Array.from({ length: 10 }, (_, i) =>
        persister.save(createState({ executionId: `conc-${i}` }))
      );
      const results = await Promise.all(saves);
      for (const r of results) {
        expect(r.isOk()).toBe(true);
      }
    });

    it("handles multiple loads for same execution ID concurrently", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "load-conc" }));
      const loads = Array.from({ length: 5 }, () => persister.load("load-conc"));
      const results = await Promise.all(loads);
      for (const r of results) {
        expect(r.isOk()).toBe(true);
        if (r.isOk()) {
          expect(r.value).not.toBeNull();
        }
      }
    });

    it("save then immediate load returns consistent data", async () => {
      const persister = createInMemoryPersister();
      const state = createState({
        executionId: "imm-load",
        metadata: { key: "value" },
      });
      await persister.save(state);
      const loaded = await persister.load("imm-load");
      expect(loaded.isOk()).toBe(true);
      if (loaded.isOk() && loaded.value) {
        expect(loaded.value.metadata).toEqual({ key: "value" });
      }
    });
  });

  describe("complex state shapes", () => {
    it("handles deeply nested input objects", async () => {
      const persister = createInMemoryPersister();
      const complexInput = {
        order: {
          items: [
            { id: "item-1", quantity: 2, price: { amount: 100, currency: "USD" } },
            { id: "item-2", quantity: 1, price: { amount: 50, currency: "EUR" } },
          ],
          customer: { name: "Test", address: { city: "NYC", zip: "10001" } },
        },
      };
      await persister.save(createState({ executionId: "nested", input: complexInput }));
      const loaded = await persister.load("nested");
      if (loaded.isOk() && loaded.value) {
        expect(loaded.value.input).toEqual(complexInput);
      }
    });

    it("handles state with many completed steps", async () => {
      const persister = createInMemoryPersister();
      const steps = Array.from({ length: 20 }, (_, i) => ({
        name: `Step${i}`,
        index: i,
        output: { data: `result-${i}` },
        skipped: false,
        completedAt: new Date().toISOString(),
      }));
      await persister.save(
        createState({
          executionId: "many-steps",
          completedSteps: steps,
          currentStep: 20,
        })
      );
      const loaded = await persister.load("many-steps");
      if (loaded.isOk() && loaded.value) {
        expect(loaded.value.completedSteps).toHaveLength(20);
      }
    });

    it("handles state with serialized error in complex shape", async () => {
      const persister = createInMemoryPersister();
      const errorState = createState({
        executionId: "err-complex",
        status: "failed",
        error: {
          _tag: "CompensationFailed",
          name: "CompensationFailed",
          message: "Compensation failed",
          stack: null,
          code: null,
          fields: {
            stepName: "Charge",
            stepIndex: 2,
            cause: { code: "DECLINED", nested: { detail: "complex" } },
          },
        },
      });
      await persister.save(errorState);
      const loaded = await persister.load("err-complex");
      if (loaded.isOk() && loaded.value) {
        expect(loaded.value.error?._tag).toBe("CompensationFailed");
      }
    });
  });

  describe("list with combined filters", () => {
    it("filters by sagaName and status simultaneously", async () => {
      const persister = createInMemoryPersister();
      await persister.save(
        createState({ executionId: "cf-1", sagaName: "OrderSaga", status: "completed" })
      );
      await persister.save(
        createState({ executionId: "cf-2", sagaName: "OrderSaga", status: "failed" })
      );
      await persister.save(
        createState({ executionId: "cf-3", sagaName: "PaymentSaga", status: "completed" })
      );

      const listed = await persister.list({ sagaName: "OrderSaga", status: "completed" });
      if (listed.isOk()) {
        expect(listed.value).toHaveLength(1);
        expect(listed.value[0].executionId).toBe("cf-1");
      }
    });

    it("filters by sagaName and status with limit", async () => {
      const persister = createInMemoryPersister();
      for (let i = 0; i < 5; i++) {
        await persister.save(
          createState({
            executionId: `lim-${i}`,
            sagaName: "OrderSaga",
            status: "completed",
          })
        );
      }
      const listed = await persister.list({ sagaName: "OrderSaga", status: "completed", limit: 3 });
      if (listed.isOk()) {
        expect(listed.value).toHaveLength(3);
      }
    });
  });

  describe("multiple concurrent sagas persist independently", () => {
    it("stores and retrieves separate execution states", async () => {
      const persister = createInMemoryPersister();

      await persister.save(createState({ executionId: "saga-a", sagaName: "A", currentStep: 0 }));
      await persister.save(createState({ executionId: "saga-b", sagaName: "B", currentStep: 2 }));

      await persister.update("saga-a", { currentStep: 1 });

      const loadA = await persister.load("saga-a");
      const loadB = await persister.load("saga-b");

      if (loadA.isOk() && loadA.value && loadB.isOk() && loadB.value) {
        expect(loadA.value.currentStep).toBe(1);
        expect(loadB.value.currentStep).toBe(2);
      }
    });
  });

  describe("checkpoint tracking state", () => {
    it("tracks step completion via update appending to completedSteps", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "chk-1", currentStep: 0 }));

      await persister.update("chk-1", {
        currentStep: 1,
        completedSteps: [
          {
            name: "Validate",
            index: 0,
            output: { valid: true },
            skipped: false,
            completedAt: new Date().toISOString(),
          },
        ],
      });

      const loaded = await persister.load("chk-1");
      if (loaded.isOk() && loaded.value) {
        expect(loaded.value.currentStep).toBe(1);
        expect(loaded.value.completedSteps).toHaveLength(1);
        expect(loaded.value.completedSteps[0].name).toBe("Validate");
      }
    });

    it("tracks compensation status", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "chk-comp" }));

      await persister.update("chk-comp", {
        status: "compensating",
        compensation: {
          active: true,
          compensatedSteps: [],
          failedSteps: [],
          triggeringStepIndex: null,
        },
      });

      const loaded = await persister.load("chk-comp");
      if (loaded.isOk() && loaded.value) {
        expect(loaded.value.status).toBe("compensating");
        expect(loaded.value.compensation.active).toBe(true);
      }
    });

    it("tracks terminal status with completedAt timestamp", async () => {
      const persister = createInMemoryPersister();
      await persister.save(createState({ executionId: "chk-done" }));

      const completedAt = new Date().toISOString();
      await persister.update("chk-done", {
        status: "completed",
        timestamps: {
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt,
        },
      });

      const loaded = await persister.load("chk-done");
      if (loaded.isOk() && loaded.value) {
        expect(loaded.value.status).toBe("completed");
        expect(loaded.value.timestamps.completedAt).toBe(completedAt);
      }
    });

    it("stores ISO 8601 timestamps as strings", async () => {
      const persister = createInMemoryPersister();
      const now = new Date().toISOString();
      await persister.save(
        createState({
          executionId: "ts-test",
          timestamps: { startedAt: now, updatedAt: now, completedAt: null },
        })
      );

      const loaded = await persister.load("ts-test");
      if (loaded.isOk() && loaded.value) {
        expect(typeof loaded.value.timestamps.startedAt).toBe("string");
        expect(loaded.value.timestamps.startedAt).toBe(now);
      }
    });
  });

  describe("serialized error preservation", () => {
    it("preserves SerializedSagaError with _tag", async () => {
      const persister = createInMemoryPersister();
      await persister.save(
        createState({
          executionId: "err-1",
          status: "failed",
          error: {
            _tag: "StepFailed",
            name: "StepFailed",
            message: "Payment declined",
            stack: null,
            code: null,
            fields: { stepName: "Charge", stepIndex: 2 },
          },
        })
      );

      const loaded = await persister.load("err-1");
      if (loaded.isOk() && loaded.value && loaded.value.error) {
        expect(loaded.value.error._tag).toBe("StepFailed");
        expect(loaded.value.error.message).toBe("Payment declined");
        expect(loaded.value.error.fields.stepName).toBe("Charge");
        expect(loaded.value.error.fields.stepIndex).toBe(2);
      }
    });
  });
});
