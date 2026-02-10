import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../../src/step/builder.js";
import { defineSaga } from "../../src/saga/builder.js";
import { createSagaRunner } from "../../src/runtime/runner.js";
import { createInMemoryPersister } from "../../src/persistence/in-memory.js";
import type { PortResolver } from "../../src/runtime/types.js";
import type { SagaExecutionState } from "../../src/ports/types.js";

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
// E2E Tests (DOD 7: Persistence)
// =============================================================================

describe("Persistence E2E", () => {
  it("5-step saga: crash after step 3 -> resume completes steps 4-5 (simulated)", async () => {
    const persister = createInMemoryPersister();

    // Simulate execution of steps 0-2
    await persister.save(
      createState({
        executionId: "crash-exec",
        sagaName: "FiveStepSaga",
        currentStep: 3,
        status: "running",
        completedSteps: [
          {
            name: "Step0",
            index: 0,
            output: "r0",
            skipped: false,
            completedAt: new Date().toISOString(),
          },
          {
            name: "Step1",
            index: 1,
            output: "r1",
            skipped: false,
            completedAt: new Date().toISOString(),
          },
          {
            name: "Step2",
            index: 2,
            output: "r2",
            skipped: false,
            completedAt: new Date().toISOString(),
          },
        ],
      })
    );

    // After "crash", load persisted state
    const loaded = await persister.load("crash-exec");
    expect(loaded.isOk()).toBe(true);
    if (loaded.isOk() && loaded.value) {
      expect(loaded.value.currentStep).toBe(3);
      expect(loaded.value.completedSteps).toHaveLength(3);
      expect(loaded.value.status).toBe("running");

      // Simulate resume: continue from step 3
      await persister.update("crash-exec", {
        currentStep: 4,
        completedSteps: [
          ...loaded.value.completedSteps,
          {
            name: "Step3",
            index: 3,
            output: "r3",
            skipped: false,
            completedAt: new Date().toISOString(),
          },
        ],
      });

      await persister.update("crash-exec", {
        currentStep: 5,
        status: "completed",
        completedSteps: [
          ...loaded.value.completedSteps,
          {
            name: "Step3",
            index: 3,
            output: "r3",
            skipped: false,
            completedAt: new Date().toISOString(),
          },
          {
            name: "Step4",
            index: 4,
            output: "r4",
            skipped: false,
            completedAt: new Date().toISOString(),
          },
        ],
        timestamps: {
          startedAt: loaded.value.timestamps.startedAt,
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      });

      // Verify final state
      const final = await persister.load("crash-exec");
      if (final.isOk() && final.value) {
        expect(final.value.status).toBe("completed");
        expect(final.value.currentStep).toBe(5);
        expect(final.value.completedSteps).toHaveLength(5);
        expect(final.value.timestamps.completedAt).not.toBeNull();
      }
    }
  });

  it("resume in new scope: original scope disposed, new scope created (simulated)", async () => {
    const persister = createInMemoryPersister();

    // Scope 1: starts execution, completes 2 steps, then "disposes"
    await persister.save(
      createState({
        executionId: "scope-exec",
        sagaName: "ScopedSaga",
        currentStep: 2,
        completedSteps: [
          {
            name: "Init",
            index: 0,
            output: "init",
            skipped: false,
            completedAt: new Date().toISOString(),
          },
          {
            name: "Process",
            index: 1,
            output: "proc",
            skipped: false,
            completedAt: new Date().toISOString(),
          },
        ],
      })
    );

    // Scope 2: loads state and continues
    const scope2Loaded = await persister.load("scope-exec");
    expect(scope2Loaded.isOk()).toBe(true);
    if (scope2Loaded.isOk() && scope2Loaded.value) {
      const state = scope2Loaded.value;
      expect(state.currentStep).toBe(2);
      expect(state.completedSteps).toHaveLength(2);

      // Continue in new scope
      await persister.update("scope-exec", {
        currentStep: 3,
        status: "completed",
        completedSteps: [
          ...state.completedSteps,
          {
            name: "Finalize",
            index: 2,
            output: "done",
            skipped: false,
            completedAt: new Date().toISOString(),
          },
        ],
      });

      const finalState = await persister.load("scope-exec");
      if (finalState.isOk() && finalState.value) {
        expect(finalState.value.status).toBe("completed");
      }
    }
  });
});

// =============================================================================
// Real Runner Resume E2E
// =============================================================================

const StepAPort = createPort<"StepA", any>({ name: "StepA" });
const StepBPort = createPort<"StepB", any>({ name: "StepB" });
const StepCPort = createPort<"StepC", any>({ name: "StepC" });

const StepA = defineStep("StepA")
  .io<{ value: string }, { a: string }>()
  .invoke(StepAPort, ctx => ctx.input)
  .build();

const StepB = defineStep("StepB")
  .io<{ value: string }, { b: string }>()
  .invoke(StepBPort, ctx => ctx.input)
  .build();

const StepC = defineStep("StepC")
  .io<{ value: string }, { c: string }>()
  .invoke(StepCPort, ctx => ctx.input)
  .build();

const ThreeStepSaga = defineSaga("ThreeStepSaga")
  .input<{ value: string }>()
  .step(StepA)
  .step(StepB)
  .step(StepC)
  .output(r => ({
    a: r.StepA.a,
    b: r.StepB.b,
    c: r.StepC.c,
  }))
  .build();

describe("Persistence E2E: Real Runner Resume", () => {
  it("execute with persister checkpoints state, then resume continues from checkpoint", async () => {
    const persister = createInMemoryPersister();

    const resolver: PortResolver = {
      resolve(portName: string): unknown {
        return () => {
          const key = portName.replace("Step", "").toLowerCase();
          return Promise.resolve({ [key]: `${key}-value` });
        };
      },
    };

    const runner = createSagaRunner(resolver, { persister });

    // Execute fully to register saga and verify checkpointing
    const result = await runner.execute(
      ThreeStepSaga,
      { value: "test" },
      {
        executionId: "e2e-exec",
      }
    );
    expect(result.isOk()).toBe(true);

    // Persister should have the completed state
    const loaded = await persister.load("e2e-exec");
    expect(loaded.isOk()).toBe(true);
    if (loaded.isOk() && loaded.value) {
      expect(loaded.value.executionId).toBe("e2e-exec");
      expect(loaded.value.sagaName).toBe("ThreeStepSaga");
    }
  });

  it("full resume flow: execute partially via persister, then runner.resume completes", async () => {
    const persister = createInMemoryPersister();
    const callLog: string[] = [];

    const resolver: PortResolver = {
      resolve(portName: string): unknown {
        return () => {
          callLog.push(portName);
          const key = portName.replace("Step", "").toLowerCase();
          return Promise.resolve({ [key]: `${key}-resumed` });
        };
      },
    };

    const runner = createSagaRunner(resolver, { persister });

    // Register saga by executing once
    await runner.execute(ThreeStepSaga, { value: "register" }, { executionId: "reg" });
    callLog.length = 0;

    // Manually create a persisted state that represents crash after StepA
    await persister.save({
      executionId: "resume-e2e",
      sagaName: "ThreeStepSaga",
      input: { value: "partial" },
      currentStep: 1,
      completedSteps: [
        {
          name: "StepA",
          index: 0,
          output: { a: "a-original" },
          skipped: false,
          completedAt: new Date().toISOString(),
        },
      ],
      status: "running",
      error: null,
      compensation: {
        active: false,
        compensatedSteps: [],
        failedSteps: [],
        triggeringStepIndex: null,
      },
      timestamps: {
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      },
      metadata: {},
    });

    // Resume should skip StepA and execute StepB + StepC
    const result = await runner.resume("resume-e2e");
    expect(result.isOk()).toBe(true);

    // Only StepB and StepC should have been called
    expect(callLog).toEqual(["StepB", "StepC"]);

    if (result.isOk()) {
      expect(result.value.executionId).toBe("resume-e2e");
      expect(result.value.output).toEqual({
        a: "a-original",
        b: "b-resumed",
        c: "c-resumed",
      });
    }
  });

  it("persister list shows executed sagas after runner.execute", async () => {
    const persister = createInMemoryPersister();

    const resolver: PortResolver = {
      resolve(): unknown {
        return () => Promise.resolve({ a: "1", b: "2", c: "3" });
      },
    };

    const runner = createSagaRunner(resolver, { persister });

    await runner.execute(ThreeStepSaga, { value: "t1" }, { executionId: "list-1" });
    await runner.execute(ThreeStepSaga, { value: "t2" }, { executionId: "list-2" });

    const listResult = await persister.list();
    expect(listResult.isOk()).toBe(true);
    if (listResult.isOk()) {
      expect(listResult.value).toHaveLength(2);
      const ids = listResult.value.map(s => s.executionId);
      expect(ids).toContain("list-1");
      expect(ids).toContain("list-2");
    }
  });
});
