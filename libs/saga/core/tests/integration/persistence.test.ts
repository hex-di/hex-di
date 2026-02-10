/**
 * Integration Tests: Persistence (DOD 7)
 *
 * Tests saga execution checkpointing via persister and
 * resume behavior after crash.
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../../src/step/builder.js";
import { defineSaga } from "../../src/saga/builder.js";
import { createSagaRunner } from "../../src/runtime/runner.js";
import { createInMemoryPersister } from "../../src/persistence/in-memory.js";
import type { PortResolver } from "../../src/runtime/types.js";

// =============================================================================
// Test Setup
// =============================================================================

const Step0Port = createPort<"Step0", any>({ name: "Step0" });
const Step1Port = createPort<"Step1", any>({ name: "Step1" });
const Step2Port = createPort<"Step2", any>({ name: "Step2" });

const Step0 = defineStep("Step0")
  .io<{ data: string }, { r0: string }>()
  .invoke(Step0Port, ctx => ctx.input)
  .compensate(ctx => ({ undo: ctx.stepResult.r0 }))
  .build();

const Step1 = defineStep("Step1")
  .io<{ data: string }, { r1: string }>()
  .invoke(Step1Port, ctx => ctx.input)
  .compensate(ctx => ({ undo: ctx.stepResult.r1 }))
  .build();

const Step2 = defineStep("Step2")
  .io<{ data: string }, { r2: string }>()
  .invoke(Step2Port, ctx => ctx.input)
  .build();

const ThreeStepSaga = defineSaga("ThreeStepSaga")
  .input<{ data: string }>()
  .step(Step0)
  .step(Step1)
  .step(Step2)
  .output(r => ({
    r0: r.Step0.r0,
    r1: r.Step1.r1,
    r2: r.Step2.r2,
  }))
  .build();

// =============================================================================
// Tests (DOD 7)
// =============================================================================

describe("Persistence Integration", () => {
  it("saga execution checkpoints after each step via persister", async () => {
    const persister = createInMemoryPersister();
    const saveSpy = vi.spyOn(persister, "save");
    const updateSpy = vi.spyOn(persister, "update");

    const resolver: PortResolver = {
      resolve(portName: string) {
        return (params: any) => {
          if (params?.undo) return Promise.resolve();
          const idx = portName.replace("Step", "");
          return Promise.resolve({ [`r${idx}`]: `value-${idx}` });
        };
      },
    };

    const runner = createSagaRunner(resolver, { persister });
    const result = await runner.execute(
      ThreeStepSaga,
      { data: "test" },
      {
        executionId: "checkpoint-exec",
      }
    );

    expect(result.isOk()).toBe(true);

    // save called once at start of execution
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: "checkpoint-exec",
        sagaName: "ThreeStepSaga",
        status: "running",
      })
    );

    // update called after each step (3 steps) + at least once for final status
    expect(updateSpy.mock.calls.length).toBeGreaterThanOrEqual(3);

    // Verify persisted state after execution
    const loaded = await persister.load("checkpoint-exec");
    expect(loaded.isOk()).toBe(true);
    if (loaded.isOk() && loaded.value) {
      expect(loaded.value.sagaName).toBe("ThreeStepSaga");
      expect(loaded.value.completedSteps).toHaveLength(3);
    }
  });

  it("resumed saga skips completed steps and continues from checkpoint", async () => {
    const persister = createInMemoryPersister();
    const callLog: string[] = [];

    const resolver: PortResolver = {
      resolve(portName: string) {
        return (params: any) => {
          if (params?.undo) return Promise.resolve();
          callLog.push(portName);
          const idx = portName.replace("Step", "");
          return Promise.resolve({ [`r${idx}`]: `resumed-${idx}` });
        };
      },
    };

    const runner = createSagaRunner(resolver, { persister });

    // Execute once to register the saga in the runner's internal registry
    await runner.execute(ThreeStepSaga, { data: "reg" }, { executionId: "reg-exec" });
    callLog.length = 0;

    // Manually save a crash state: steps 0 completed, step 1 is next
    await persister.save({
      executionId: "resume-exec",
      sagaName: "ThreeStepSaga",
      input: { data: "resumed" },
      currentStep: 1,
      completedSteps: [
        {
          name: "Step0",
          index: 0,
          output: { r0: "persisted-0" },
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

    // Resume from step 1
    const result = await runner.resume("resume-exec");
    expect(result.isOk()).toBe(true);

    // Only Step1 and Step2 should have been called (Step0 skipped)
    expect(callLog).toEqual(["Step1", "Step2"]);

    if (result.isOk()) {
      expect(result.value.executionId).toBe("resume-exec");
      expect(result.value.output).toEqual({
        r0: "persisted-0",
        r1: "resumed-1",
        r2: "resumed-2",
      });
    }
  });
});
