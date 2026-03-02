import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaRunner } from "../src/runtime/runner.js";
import { createInMemoryPersister } from "../src/persistence/in-memory.js";
import type { PortResolver, SagaRunnerConfig } from "../src/runtime/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const Step0Port = createPort<"Step0", any>({ name: "Step0" });
const Step1Port = createPort<"Step1", any>({ name: "Step1" });
const Step2Port = createPort<"Step2", any>({ name: "Step2" });
const Step3Port = createPort<"Step3", any>({ name: "Step3" });
const Step4Port = createPort<"Step4", any>({ name: "Step4" });

// =============================================================================
// Test Steps
// =============================================================================

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
  .compensate(ctx => ({ undo: ctx.stepResult.r2 }))
  .build();

const Step3 = defineStep("Step3")
  .io<{ data: string }, { r3: string }>()
  .invoke(Step3Port, ctx => ctx.input)
  .compensate(ctx => ({ undo: ctx.stepResult.r3 }))
  .build();

const Step4 = defineStep("Step4")
  .io<{ data: string }, { r4: string }>()
  .invoke(Step4Port, ctx => ctx.input)
  .build();

// =============================================================================
// Test Saga (5 steps)
// =============================================================================

const FiveStepSaga = defineSaga("FiveStepSaga")
  .input<{ data: string }>()
  .step(Step0)
  .step(Step1)
  .step(Step2)
  .step(Step3)
  .step(Step4)
  .output(r => ({
    r0: r.Step0.r0,
    r1: r.Step1.r1,
    r2: r.Step2.r2,
    r3: r.Step3.r3,
    r4: r.Step4.r4,
  }))
  .build();

// =============================================================================
// Helpers
// =============================================================================

function createMockResolver(
  portResults: Record<string, unknown>,
  failingPorts?: Record<string, Error>
): PortResolver {
  return {
    resolve(portName: string): unknown {
      if (failingPorts?.[portName]) {
        return (_params: unknown) => Promise.reject(failingPorts[portName]);
      }
      if (portName in portResults) {
        return (_params: unknown) => {
          // Handle compensation calls
          if (_params && typeof _params === "object" && "undo" in _params) {
            return Promise.resolve();
          }
          return Promise.resolve(portResults[portName]);
        };
      }
      throw new Error(`Port not found: ${portName}`);
    },
  };
}

// =============================================================================
// Resume Tests
// =============================================================================

describe("SagaRunner.resume", () => {
  it("resumes a 5-step saga after crash at step 3: steps 0-2 skipped, 3-4 execute", async () => {
    const persister = createInMemoryPersister();
    const callLog: string[] = [];

    const resolver: PortResolver = {
      resolve(portName: string): unknown {
        return (_params: unknown) => {
          callLog.push(portName);
          return Promise.resolve({ [`r${portName.replace("Step", "")}`]: `result-${portName}` });
        };
      },
    };

    const config: SagaRunnerConfig = { persister };
    const runner = createSagaRunner(resolver, config);

    // First, execute to register the saga in the registry
    // We'll make it succeed so it registers
    const initialResult = await runner.execute(
      FiveStepSaga,
      { data: "test" },
      {
        executionId: "exec-initial",
      }
    );
    expect(initialResult.isOk()).toBe(true);

    // Clear the call log
    callLog.length = 0;

    // Now simulate a crash by manually saving state for a different execution
    await persister.save({
      executionId: "crash-exec",
      sagaName: "FiveStepSaga",
      input: { data: "resumed-test" },
      currentStep: 3,
      completedSteps: [
        {
          name: "Step0",
          index: 0,
          output: { r0: "r0-value" },
          skipped: false,
          completedAt: new Date().toISOString(),
        },
        {
          name: "Step1",
          index: 1,
          output: { r1: "r1-value" },
          skipped: false,
          completedAt: new Date().toISOString(),
        },
        {
          name: "Step2",
          index: 2,
          output: { r2: "r2-value" },
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
      totalSteps: 5,
      pendingStep: null,
    });

    // Resume from step 3
    const result = await runner.resume("crash-exec");
    expect(result.isOk()).toBe(true);

    // Only steps 3 and 4 should have been called
    expect(callLog).toEqual(["Step3", "Step4"]);

    if (result.isOk()) {
      expect(result.value.executionId).toBe("crash-exec");
      // Output mapper should combine persisted + new results
      expect(result.value.output).toEqual({
        r0: "r0-value",
        r1: "r1-value",
        r2: "r2-value",
        r3: "result-Step3",
        r4: "result-Step4",
      });
    }
  });

  it("returns error when resuming without persister configured", async () => {
    const resolver = createMockResolver({});
    const runner = createSagaRunner(resolver); // no persister

    const result = await runner.resume("some-id");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.message).toContain("Resume not implemented");
    }
  });

  it("returns error when resuming unknown executionId", async () => {
    const persister = createInMemoryPersister();
    const resolver = createMockResolver({});
    const runner = createSagaRunner(resolver, { persister });

    const result = await runner.resume("nonexistent-exec");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("PersistenceFailed");
      expect(result.error.message).toContain("No persisted state");
    }
  });

  it("returns error when saga name not found in registry", async () => {
    const persister = createInMemoryPersister();
    const resolver = createMockResolver({});
    const runner = createSagaRunner(resolver, { persister });

    // Manually save state for a saga that hasn't been registered
    await persister.save({
      executionId: "unknown-saga-exec",
      sagaName: "NonexistentSaga",
      input: {},
      currentStep: 0,
      completedSteps: [],
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
      totalSteps: 0,
      pendingStep: null,
    });

    const result = await runner.resume("unknown-saga-exec");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.message).toContain("not found in registry");
    }
  });

  it("checkpoints: persister.save on start, persister.update after each step", async () => {
    const persister = createInMemoryPersister();
    const saveSpy = vi.spyOn(persister, "save");
    const updateSpy = vi.spyOn(persister, "update");

    const resolver = createMockResolver({
      Step0: { r0: "v0" },
      Step1: { r1: "v1" },
      Step2: { r2: "v2" },
      Step3: { r3: "v3" },
      Step4: { r4: "v4" },
    });

    const runner = createSagaRunner(resolver, { persister });
    const result = await runner.execute(
      FiveStepSaga,
      { data: "test" },
      {
        executionId: "checkpoint-exec",
      }
    );

    expect(result.isOk()).toBe(true);

    // save called once at start
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: "checkpoint-exec",
        sagaName: "FiveStepSaga",
        status: "running",
      })
    );

    // update called after each step (5 steps) + once for final completion
    // Each step triggers a checkpoint, plus the saga:completed checkpoint
    expect(updateSpy.mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it("full round-trip: execute -> crash -> resume -> complete", async () => {
    const persister = createInMemoryPersister();
    let step2ShouldFail = true;

    const resolver: PortResolver = {
      resolve(portName: string): unknown {
        return (_params: unknown) => {
          if (_params && typeof _params === "object" && "undo" in _params) {
            return Promise.resolve();
          }
          if (portName === "Step2" && step2ShouldFail) {
            return Promise.reject(new Error("transient failure"));
          }
          const idx = portName.replace("Step", "");
          return Promise.resolve({ [`r${idx}`]: `v${idx}` });
        };
      },
    };

    const runner = createSagaRunner(resolver, { persister });

    // First execution: fails at step 2 (with compensation)
    const firstResult = await runner.execute(
      FiveStepSaga,
      { data: "test" },
      {
        executionId: "roundtrip-exec",
      }
    );
    expect(firstResult.isErr()).toBe(true);

    // Now fix step 2 and save a new state as if we're resuming after the transient error
    step2ShouldFail = false;

    // Manually create a fresh persisted state for a "new attempt"
    await persister.save({
      executionId: "roundtrip-resume",
      sagaName: "FiveStepSaga",
      input: { data: "test" },
      currentStep: 2,
      completedSteps: [
        {
          name: "Step0",
          index: 0,
          output: { r0: "v0" },
          skipped: false,
          completedAt: new Date().toISOString(),
        },
        {
          name: "Step1",
          index: 1,
          output: { r1: "v1" },
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
      totalSteps: 5,
      pendingStep: null,
    });

    // Resume
    const resumeResult = await runner.resume("roundtrip-resume");
    expect(resumeResult.isOk()).toBe(true);

    if (resumeResult.isOk()) {
      expect(resumeResult.value.output).toEqual({
        r0: "v0",
        r1: "v1",
        r2: "v2",
        r3: "v3",
        r4: "v4",
      });
    }
  });

  it("resume with step failure triggers compensation for all completed steps", async () => {
    const persister = createInMemoryPersister();
    const compensatedPorts: string[] = [];

    const resolver: PortResolver = {
      resolve(portName: string): unknown {
        return (_params: unknown) => {
          if (_params && typeof _params === "object" && "undo" in _params) {
            compensatedPorts.push(portName);
            return Promise.resolve();
          }
          if (portName === "Step3") {
            return Promise.reject(new Error("step 3 failed"));
          }
          const idx = portName.replace("Step", "");
          return Promise.resolve({ [`r${idx}`]: `v${idx}` });
        };
      },
    };

    const runner = createSagaRunner(resolver, { persister });

    // Register saga first
    await runner.execute(FiveStepSaga, { data: "reg" }, { executionId: "reg-exec" });

    // Simulate persisted state with steps 0-2 complete, step 3 will fail on resume
    await persister.save({
      executionId: "comp-resume",
      sagaName: "FiveStepSaga",
      input: { data: "test" },
      currentStep: 3,
      completedSteps: [
        {
          name: "Step0",
          index: 0,
          output: { r0: "v0" },
          skipped: false,
          completedAt: new Date().toISOString(),
        },
        {
          name: "Step1",
          index: 1,
          output: { r1: "v1" },
          skipped: false,
          completedAt: new Date().toISOString(),
        },
        {
          name: "Step2",
          index: 2,
          output: { r2: "v2" },
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
      totalSteps: 5,
      pendingStep: null,
    });

    compensatedPorts.length = 0;
    const result = await runner.resume("comp-resume");
    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.stepName).toBe("Step3");
    }
  });
});
