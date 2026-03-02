/**
 * Runner Mutation Tests (Part 3)
 *
 * Targeted tests to kill surviving mutants across the saga runtime:
 * - step-executor.ts: retry config optional chaining, delay boundary
 * - saga-executor.ts: stepIndex increment, string literals, boolean fields, arrays
 * - compensation-handler.ts: string literals, arrays, boolean/object fields
 * - runner.ts: subscribe, getTrace, getStatus, cancel, resume, string literals
 * - events.ts: trace recording, string/object/boolean fields
 *
 * Each test is designed to detect a specific Stryker mutation.
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../src/runtime/runner.js";
import type { PortResolver, SagaEvent } from "../src/runtime/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const PortA = createPort<"PortA", any>({ name: "PortA" });
const PortB = createPort<"PortB", any>({ name: "PortB" });
const PortC = createPort<"PortC", any>({ name: "PortC" });

// =============================================================================
// Helpers
// =============================================================================

function createResolver(mapping: Record<string, (params: any) => Promise<unknown>>): PortResolver {
  return {
    resolve(portName: string): unknown {
      if (portName in mapping) {
        return mapping[portName];
      }
      throw new Error(`Port not found: ${portName}`);
    },
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
} {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// =============================================================================
// 1. Retry config optional chaining — retryIf, delay properties undefined
// =============================================================================

describe("retry config with partial properties (optional chaining mutants)", () => {
  it("retries correctly when retryConfig has maxAttempts but NO retryIf property", async () => {
    let callCount = 0;
    const Step1 = defineStep("RetryNoIf")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 2, delay: 0 })
      .build();

    const saga = defineSaga("RetryNoIfSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.RetryNoIf)
      .build();

    const resolver = createResolver({
      PortA: async () => {
        callCount++;
        if (callCount < 3) throw new Error("transient");
        return "ok";
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isOk()).toBe(true);
    expect(callCount).toBe(3); // initial + 2 retries
  });

  it("retries correctly when retryConfig has maxAttempts but NO delay property (defaults to 0)", async () => {
    let callCount = 0;
    const Step1 = defineStep("RetryNoDelay")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 1, delay: undefined as any })
      .build();

    const saga = defineSaga("RetryNoDelaySaga")
      .input<string>()
      .step(Step1)
      .output(r => r.RetryNoDelay)
      .build();

    const resolver = createResolver({
      PortA: async () => {
        callCount++;
        if (callCount < 2) throw new Error("transient");
        return "ok";
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isOk()).toBe(true);
    expect(callCount).toBe(2);
  });

  it("does NOT retry when retryIf returns false", async () => {
    let callCount = 0;
    const Step1 = defineStep("RetryIfFalse")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({
        maxAttempts: 3,
        delay: 0,
        retryIf: () => false,
      })
      .build();

    const saga = defineSaga("RetryIfFalseSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.RetryIfFalse)
      .build();

    const resolver = createResolver({
      PortA: async () => {
        callCount++;
        throw new Error("always-fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    // Only 1 call because retryIf returned false — no retry happens
    expect(callCount).toBe(1);
  });

  it("retryIf is called with the error and can selectively retry", async () => {
    let callCount = 0;
    const Step1 = defineStep("RetryIfSelective")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({
        maxAttempts: 3,
        delay: 0,
        retryIf: (error: any) => error?.message === "transient",
      })
      .build();

    const saga = defineSaga("RetryIfSelectiveSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.RetryIfSelective)
      .build();

    const resolver = createResolver({
      PortA: async () => {
        callCount++;
        if (callCount === 1) throw new Error("transient");
        throw new Error("permanent");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    expect(callCount).toBe(2);
  });

  it("delay === 0 does NOT sleep (boundary for delay > 0 vs delay >= 0)", async () => {
    let callCount = 0;
    const startTime = Date.now();

    const Step1 = defineStep("DelayZero")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 2, delay: 0 })
      .build();

    const saga = defineSaga("DelayZeroSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.DelayZero)
      .build();

    const resolver = createResolver({
      PortA: async () => {
        callCount++;
        if (callCount < 3) throw new Error("transient");
        return "ok";
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    const elapsed = Date.now() - startTime;
    expect(result.isOk()).toBe(true);
    expect(elapsed).toBeLessThan(500);
    expect(callCount).toBe(3);
  });

  it("delay function receives attempt number and error", async () => {
    const delayArgs: Array<{ attempt: number; error: unknown }> = [];
    let callCount = 0;

    const Step1 = defineStep("DelayFn")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({
        maxAttempts: 2,
        delay: (attempt: number, error: unknown) => {
          delayArgs.push({ attempt, error });
          return 0;
        },
      })
      .build();

    const saga = defineSaga("DelayFnSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.DelayFn)
      .build();

    const resolver = createResolver({
      PortA: async () => {
        callCount++;
        if (callCount <= 2) throw new Error(`fail-${callCount}`);
        return "ok";
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isOk()).toBe(true);
    expect(delayArgs.length).toBe(2);
    expect(delayArgs[0].attempt).toBe(1);
    expect((delayArgs[0].error as Error).message).toBe("fail-1");
    expect(delayArgs[1].attempt).toBe(2);
    expect((delayArgs[1].error as Error).message).toBe("fail-2");
  });
});

// =============================================================================
// 2. String literal mutations — event type names must be exact strings
// =============================================================================

describe("string literal mutations — event type names", () => {
  it("saga:started event has exact type string and non-empty sagaName", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("StrStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("StringSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.StrStep)
      .build();

    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "str-test-1",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const started = events.find(e => e.type === "saga:started");
    expect(started).toBeDefined();
    expect(started!.type).toBe("saga:started");
    expect(started!.sagaName).toBe("StringSaga");
    expect(started!.sagaName).not.toBe("");
    expect(started!.executionId).toBe("str-test-1");
    expect(started!.executionId).not.toBe("");
  });

  it("step:started event has non-empty stepName and type", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("NamedStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("StepNameSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.NamedStep)
      .build();

    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "str-test-2",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const stepStarted = events.find(e => e.type === "step:started");
    expect(stepStarted).toBeDefined();
    expect(stepStarted!.type).toBe("step:started");
    expect((stepStarted as any).stepName).toBe("NamedStep");
    expect((stepStarted as any).stepName).not.toBe("");
  });

  it("step:completed event has non-empty stepName and type", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("CompletedStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompletedStepSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.CompletedStep)
      .build();

    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "str-test-3",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const stepCompleted = events.find(e => e.type === "step:completed");
    expect(stepCompleted).toBeDefined();
    expect(stepCompleted!.type).toBe("step:completed");
    expect((stepCompleted as any).stepName).toBe("CompletedStep");
    expect((stepCompleted as any).stepName).not.toBe("");
  });

  it("saga:completed event has non-empty sagaName", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("DoneStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("DoneSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.DoneStep)
      .build();

    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "str-test-4",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const completed = events.find(e => e.type === "saga:completed");
    expect(completed).toBeDefined();
    expect(completed!.type).toBe("saga:completed");
    expect(completed!.sagaName).toBe("DoneSaga");
    expect(completed!.sagaName).not.toBe("");
  });

  it("step:failed event has non-empty stepName and sagaName", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("FailStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("FailSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.FailStep)
      .build();

    const resolver = createResolver({
      PortA: async () => {
        throw new Error("step-fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "str-test-5",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const stepFailed = events.find(e => e.type === "step:failed");
    expect(stepFailed).toBeDefined();
    expect(stepFailed!.type).toBe("step:failed");
    expect((stepFailed as any).stepName).toBe("FailStep");
    expect((stepFailed as any).stepName).not.toBe("");
    expect(stepFailed!.sagaName).toBe("FailSaga");
    expect(stepFailed!.sagaName).not.toBe("");
  });

  it("saga:failed event has non-empty sagaName and failedStepName", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("FailSagaStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("FailedSagaEvt")
      .input<string>()
      .step(Step1)
      .output(r => r.FailSagaStep)
      .build();

    const resolver = createResolver({
      PortA: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "str-test-6",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const sagaFailed = events.find(e => e.type === "saga:failed");
    expect(sagaFailed).toBeDefined();
    expect(sagaFailed!.type).toBe("saga:failed");
    expect(sagaFailed!.sagaName).toBe("FailedSagaEvt");
    expect(sagaFailed!.sagaName).not.toBe("");
    expect((sagaFailed as any).failedStepName).toBe("FailSagaStep");
    expect((sagaFailed as any).failedStepName).not.toBe("");
  });

  it("step:skipped event has non-empty stepName and reason", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("SkippedStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .when(() => false)
      .build();

    const saga = defineSaga("SkipSaga")
      .input<string>()
      .step(Step1)
      .output(() => "done")
      .build();

    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "str-test-7",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const skipped = events.find(e => e.type === "step:skipped");
    expect(skipped).toBeDefined();
    expect(skipped!.type).toBe("step:skipped");
    expect((skipped as any).stepName).toBe("SkippedStep");
    expect((skipped as any).stepName).not.toBe("");
    expect((skipped as any).reason).toBe("condition-false");
    expect((skipped as any).reason).not.toBe("");
  });

  it("compensation:started event has non-empty failedStepName and sagaName", async () => {
    const events: SagaEvent[] = [];

    const Step1 = defineStep("CompStartA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("CompStartB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompStartSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.CompStartA)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortB: async () => {
        throw new Error("fail-b");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "str-test-8",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const compStarted = events.find(e => e.type === "compensation:started");
    expect(compStarted).toBeDefined();
    expect(compStarted!.type).toBe("compensation:started");
    expect(compStarted!.sagaName).toBe("CompStartSaga");
    expect(compStarted!.sagaName).not.toBe("");
    expect((compStarted as any).failedStepName).toBe("CompStartB");
    expect((compStarted as any).failedStepName).not.toBe("");
  });

  it("compensation:step event has non-empty stepName", async () => {
    const events: SagaEvent[] = [];

    const Step1 = defineStep("CompStepA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("CompStepB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompStepSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.CompStepA)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortB: async () => {
        throw new Error("fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "str-test-9",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const compStep = events.find(e => e.type === "compensation:step");
    expect(compStep).toBeDefined();
    expect((compStep as any).stepName).toBe("CompStepA");
    expect((compStep as any).stepName).not.toBe("");
  });

  it("compensation:completed event has non-empty compensatedSteps array", async () => {
    const events: SagaEvent[] = [];

    const Step1 = defineStep("CompDoneA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("CompDoneB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompDoneSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.CompDoneA)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortB: async () => {
        throw new Error("fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "str-test-10",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const compCompleted = events.find(e => e.type === "compensation:completed");
    expect(compCompleted).toBeDefined();
    expect((compCompleted as any).compensatedSteps).toContain("CompDoneA");
    expect((compCompleted as any).compensatedSteps.length).toBeGreaterThanOrEqual(1);
    expect((compCompleted as any).compensatedSteps[0]).toBe("CompDoneA");
  });
});

// =============================================================================
// 3. Step index progression (increment vs decrement mutants)
// =============================================================================

describe("step index progression (UpdateOperator mutants)", () => {
  it("step indices increment sequentially in events, not decrement", async () => {
    const events: SagaEvent[] = [];

    const Step1 = defineStep("IdxA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const Step2 = defineStep("IdxB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const Step3 = defineStep("IdxC")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();

    const saga = defineSaga("IndexSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .step(Step3)
      .output(r => r.IdxC)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => p,
      PortB: async (p: any) => p,
      PortC: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "idx-test-1",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const stepStartedEvents = events.filter(e => e.type === "step:started") as Array<
      Extract<SagaEvent, { type: "step:started" }>
    >;

    expect(stepStartedEvents.length).toBe(3);
    expect(stepStartedEvents[0].stepIndex).toBe(0);
    expect(stepStartedEvents[1].stepIndex).toBe(1);
    expect(stepStartedEvents[2].stepIndex).toBe(2);

    const stepCompletedEvents = events.filter(e => e.type === "step:completed") as Array<
      Extract<SagaEvent, { type: "step:completed" }>
    >;
    expect(stepCompletedEvents.length).toBe(3);
    expect(stepCompletedEvents[0].stepIndex).toBe(0);
    expect(stepCompletedEvents[1].stepIndex).toBe(1);
    expect(stepCompletedEvents[2].stepIndex).toBe(2);
  });

  it("step names in step:started events match the defined step names in order", async () => {
    const events: SagaEvent[] = [];

    const Step1 = defineStep("First")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const Step2 = defineStep("Second")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("OrderSaga2")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.Second)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => p,
      PortB: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "idx-test-2",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const stepStartedEvents = events.filter(e => e.type === "step:started") as Array<
      Extract<SagaEvent, { type: "step:started" }>
    >;

    expect(stepStartedEvents[0].stepName).toBe("First");
    expect(stepStartedEvents[1].stepName).toBe("Second");
  });

  it("stepsExecuted count matches number of non-skipped steps", async () => {
    const events: SagaEvent[] = [];

    const Step1 = defineStep("Exec1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const Step2 = defineStep("Exec2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .when(() => false)
      .build();
    const Step3 = defineStep("Exec3")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();

    const saga = defineSaga("ExecCountSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .step(Step3)
      .output(r => r.Exec3)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => p,
      PortB: async (p: any) => p,
      PortC: async (p: any) => p,
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "idx-test-3",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const sagaCompleted = events.find(e => e.type === "saga:completed") as Extract<
      SagaEvent,
      { type: "saga:completed" }
    >;
    expect(sagaCompleted).toBeDefined();
    expect(sagaCompleted.stepsExecuted).toBe(2);
    expect(sagaCompleted.stepsSkipped).toBe(1);
  });
});

// =============================================================================
// 4. Compensation paths — arrays, compensatedSteps, failedSteps
// =============================================================================

describe("compensation arrays and error fields (ArrayDeclaration mutants)", () => {
  it("compensatedSteps in error result is a proper array with step names", async () => {
    const Step1 = defineStep("CompArrA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();
    const Step2 = defineStep("CompArrB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompArrSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.CompArrA)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortB: async () => {
        throw new Error("fail-b");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(Array.isArray(result.error.compensatedSteps)).toBe(true);
      expect(result.error.compensatedSteps).toContain("CompArrA");
      expect(result.error.compensatedSteps.length).toBe(1);
      expect(Array.isArray(result.error.completedSteps)).toBe(true);
      expect(result.error.completedSteps).toContain("CompArrA");
    }
  });

  it("completedSteps in error result lists all steps completed before failure", async () => {
    const Step1 = defineStep("CompletedA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();
    const Step2 = defineStep("CompletedB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();
    const Step3 = defineStep("CompletedC")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompletedListSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .step(Step3)
      .output(r => r.CompletedC)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortB: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortC: async () => {
        throw new Error("fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.completedSteps).toContain("CompletedA");
      expect(result.error.completedSteps).toContain("CompletedB");
      expect(result.error.completedSteps.length).toBe(2);
      expect(result.error.compensatedSteps).toContain("CompletedA");
      expect(result.error.compensatedSteps).toContain("CompletedB");
      expect(result.error.compensatedSteps.length).toBe(2);
    }
  });

  it("compensation failure results in CompensationFailed tag with failedCompensationSteps array", async () => {
    const Step1 = defineStep("CompFailA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();
    const Step2 = defineStep("CompFailB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompFailSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.CompFailA)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) throw new Error("compensation-fail");
        return p;
      },
      PortB: async () => {
        throw new Error("step-fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("CompensationFailed");
      if (result.error._tag === "CompensationFailed") {
        expect(Array.isArray(result.error.failedCompensationSteps)).toBe(true);
        expect(result.error.failedCompensationSteps).toContain("CompFailA");
        expect(result.error.compensationCause).toBeDefined();
      }
    }
  });
});

// =============================================================================
// 5. Timeout path — step timeout
// =============================================================================

describe("timeout handling (step-level)", () => {
  it("step timeout produces Timeout error with timeoutMs field", async () => {
    const Step1 = defineStep("TimeoutStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .timeout(50)
      .build();

    const saga = defineSaga("TimeoutSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.TimeoutStep)
      .build();

    const resolver = createResolver({
      PortA: async () => {
        await new Promise(r => setTimeout(r, 200));
        return "too-late";
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      if (result.error._tag === "Timeout") {
        expect(result.error.timeoutMs).toBe(50);
        expect(result.error.stepName).toBe("TimeoutStep");
        expect(result.error.stepName).not.toBe("");
        expect(result.error.message).toContain("timed out");
        expect(result.error.message).not.toBe("");
      }
    }
  });

  it("saga:failed event is emitted with correct fields for timeout", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("TimeoutEvtStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .timeout(50)
      .build();

    const saga = defineSaga("TimeoutEvtSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.TimeoutEvtStep)
      .build();

    const resolver = createResolver({
      PortA: async () => {
        await new Promise(r => setTimeout(r, 200));
        return "late";
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "timeout-evt-1",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const sagaFailed = events.find(e => e.type === "saga:failed") as Extract<
      SagaEvent,
      { type: "saga:failed" }
    >;
    expect(sagaFailed).toBeDefined();
    expect(sagaFailed.type).toBe("saga:failed");
    expect(sagaFailed.failedStepName).toBe("TimeoutEvtStep");
    expect(sagaFailed.failedStepName).not.toBe("");
    expect(sagaFailed.sagaName).toBe("TimeoutEvtSaga");
    expect(sagaFailed.sagaName).not.toBe("");
  });
});

// =============================================================================
// 6. Global saga timeout
// =============================================================================

describe("global saga timeout", () => {
  it("saga-level timeout produces Timeout error when execution exceeds limit", async () => {
    const Step1 = defineStep("GlobalTOStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("GlobalTOSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.GlobalTOStep)
      .options({ compensationStrategy: "sequential", timeout: 50 })
      .build();

    const resolver = createResolver({
      PortA: async () => {
        await new Promise(r => setTimeout(r, 300));
        return "late";
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      if (result.error._tag === "Timeout") {
        expect(result.error.timeoutMs).toBe(50);
        expect(result.error.sagaName).toBe("GlobalTOSaga");
        expect(result.error.sagaName).not.toBe("");
      }
    }
  });

  it("options timeout overrides saga-level timeout", async () => {
    const Step1 = defineStep("OptTOStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("OptTOSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.OptTOStep)
      .options({ compensationStrategy: "sequential", timeout: 5000 })
      .build();

    const resolver = createResolver({
      PortA: async () => {
        await new Promise(r => setTimeout(r, 300));
        return "late";
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", { timeout: 50 });
    const awaited = await result;

    expect(awaited.isErr()).toBe(true);
    if (awaited.isErr()) {
      expect(awaited.error._tag).toBe("Timeout");
    }
  });
});

// =============================================================================
// 7. Steps with undefined options (optional chaining mutants)
// =============================================================================

describe("steps with undefined/missing options (optional chaining mutants)", () => {
  it("executes step successfully when step.options.retry is undefined", async () => {
    const Step1 = defineStep("NoRetry")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("NoRetrySaga")
      .input<string>()
      .step(Step1)
      .output(r => r.NoRetry)
      .build();
    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");
    expect(result.isOk()).toBe(true);
  });

  it("handles failure gracefully when step has no retry config", async () => {
    const Step1 = defineStep("NoRetryFail")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("NoRetryFailSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.NoRetryFail)
      .build();
    const resolver = createResolver({
      PortA: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
    }
  });

  it("executes step successfully when step.options.timeout is undefined", async () => {
    const Step1 = defineStep("NoTimeout")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("NoTimeoutSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.NoTimeout)
      .build();
    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");
    expect(result.isOk()).toBe(true);
  });

  it("handles step with skipCompensation option", async () => {
    const Step1 = defineStep("SkipComp")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .skipCompensation()
      .build();
    const Step2 = defineStep("FailForSkipComp")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("SkipCompSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.FailForSkipComp)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => p,
      PortB: async () => {
        throw new Error("fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.compensatedSteps).not.toContain("SkipComp");
    }
  });
});

// =============================================================================
// 8. Boolean field mutations (BooleanLiteral => false)
// =============================================================================

describe("boolean field mutations", () => {
  it("retriesExhausted is true in step:failed event after all retries are used", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("BoolRetry")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 1, delay: 0 })
      .build();
    const saga = defineSaga("BoolRetrySaga")
      .input<string>()
      .step(Step1)
      .output(r => r.BoolRetry)
      .build();
    const resolver = createResolver({
      PortA: async () => {
        throw new Error("always-fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "bool-test-1",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const stepFailed = events.find(e => e.type === "step:failed") as Extract<
      SagaEvent,
      { type: "step:failed" }
    >;
    expect(stepFailed).toBeDefined();
    expect(stepFailed.retriesExhausted).toBe(true);
  });

  it("compensation:step event has success=true for successful compensation", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("BoolCompA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();
    const Step2 = defineStep("BoolCompB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("BoolCompSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.BoolCompA)
      .build();
    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortB: async () => {
        throw new Error("fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "bool-test-2",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const compStep = events.find(e => e.type === "compensation:step") as Extract<
      SagaEvent,
      { type: "compensation:step" }
    >;
    expect(compStep).toBeDefined();
    expect(compStep.success).toBe(true);
  });

  it("saga:failed event has compensated=true when all compensations succeed", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("BoolSagaFailA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();
    const Step2 = defineStep("BoolSagaFailB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("BoolSagaFailSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.BoolSagaFailA)
      .build();
    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortB: async () => {
        throw new Error("fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "bool-test-3",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const sagaFailed = events.find(e => e.type === "saga:failed") as Extract<
      SagaEvent,
      { type: "saga:failed" }
    >;
    expect(sagaFailed).toBeDefined();
    expect(sagaFailed.compensated).toBe(true);
  });

  it("saga:failed event has compensated=false when compensation fails", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("BoolCompFailA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();
    const Step2 = defineStep("BoolCompFailB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("BoolCompFailSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.BoolCompFailA)
      .build();
    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) throw new Error("comp-fail");
        return p;
      },
      PortB: async () => {
        throw new Error("step-fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "bool-test-4",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const sagaFailed = events.find(e => e.type === "saga:failed") as Extract<
      SagaEvent,
      { type: "saga:failed" }
    >;
    expect(sagaFailed).toBeDefined();
    expect(sagaFailed.compensated).toBe(false);
  });
});

// =============================================================================
// 9. ObjectLiteral mutations — metadata/options are populated
// =============================================================================

describe("object literal mutations — metadata and options", () => {
  it("saga:started event includes metadata when provided", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("MetaStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("MetaSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.MetaStep)
      .build();
    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "meta-test-1",
      metadata: { traceId: "abc-123", userId: "u-1" },
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const started = events.find(e => e.type === "saga:started") as Extract<
      SagaEvent,
      { type: "saga:started" }
    >;
    expect(started).toBeDefined();
    expect(started.metadata).toBeDefined();
    expect(started.metadata).not.toEqual({});
    expect(started.metadata!.traceId).toBe("abc-123");
    expect(started.metadata!.userId).toBe("u-1");
  });

  it("saga:started event has stepCount matching number of steps", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("CountA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const Step2 = defineStep("CountB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CountSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.CountB)
      .build();
    const resolver = createResolver({ PortA: async (p: any) => p, PortB: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "meta-test-2",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const started = events.find(e => e.type === "saga:started") as Extract<
      SagaEvent,
      { type: "saga:started" }
    >;
    expect(started.stepCount).toBe(2);
    expect(started.stepCount).toBeGreaterThan(0);
  });

  it("saga:completed event has correct totalDurationMs and stepsExecuted", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("DurStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("DurSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.DurStep)
      .build();
    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "meta-test-3",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const completed = events.find(e => e.type === "saga:completed") as Extract<
      SagaEvent,
      { type: "saga:completed" }
    >;
    expect(completed).toBeDefined();
    expect(completed.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(typeof completed.totalDurationMs).toBe("number");
    expect(completed.stepsExecuted).toBe(1);
    expect(completed.stepsSkipped).toBe(0);
  });

  it("step:completed event has valid durationMs", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("DurStepEvt")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("DurStepEvtSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.DurStepEvt)
      .build();
    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "meta-test-4",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const stepCompleted = events.find(e => e.type === "step:completed") as Extract<
      SagaEvent,
      { type: "step:completed" }
    >;
    expect(stepCompleted).toBeDefined();
    expect(typeof stepCompleted.durationMs).toBe("number");
    expect(stepCompleted.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// 10. Cancel path
// Cancellation uses abort signal. Without a timeout, abort is only checked between
// steps. With a timeout, withTimeout races with the abort signal.
// =============================================================================

describe("cancellation path", () => {
  it("cancel aborts running saga with timeout step", async () => {
    const d = deferred<string>();
    const Step1 = defineStep("CancelStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .timeout(10000)
      .build();
    const saga = defineSaga("CancelSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.CancelStep)
      .build();
    const resolver = createResolver({ PortA: async () => d.promise });

    const runner = createSagaRunner(resolver);
    const resultAsync = runner.execute(saga, "input", { executionId: "cancel-test-1" });

    await new Promise(r => setTimeout(r, 20));
    await runner.cancel("cancel-test-1");

    const result = await resultAsync;
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.sagaName).toBe("CancelSaga");
      expect(result.error.sagaName).not.toBe("");
      expect(result.error.message).not.toBe("");
    }
  });

  it("cancel returns error for unknown execution ID", async () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);
    const result = await runner.cancel("nonexistent-id");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ExecutionNotFound");
      if (result.error._tag === "ExecutionNotFound") {
        expect(result.error.executionId).toBe("nonexistent-id");
        expect(result.error.executionId).not.toBe("");
      }
      expect(result.error.message).toContain("nonexistent-id");
      expect(result.error.message).not.toBe("");
    }
  });
});

// =============================================================================
// 11. Subscribe/unsubscribe
// =============================================================================

describe("subscribe and unsubscribe behavior", () => {
  it("subscribe returns noop when execution ID is unknown", () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);
    const unsub = runner.subscribe("unknown-id", () => {});
    expect(typeof unsub).toBe("function");
    unsub();
  });

  it("unsubscribe removes listener so future events are not received", async () => {
    const events: SagaEvent[] = [];
    const d = deferred<string>();

    const Step1 = defineStep("UnsubStep1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const Step2 = defineStep("UnsubStep2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("UnsubSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.UnsubStep2)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => p,
      PortB: async () => d.promise,
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = runner.execute(saga, "input", { executionId: "unsub-test-1" });

    const unsub = runner.subscribe("unsub-test-1", e => events.push(e));
    await new Promise(r => setTimeout(r, 10));
    unsub();

    d.resolve("result-2");
    await resultAsync;

    const sagaCompletedEvents = events.filter(e => e.type === "saga:completed");
    expect(sagaCompletedEvents.length).toBe(0);
  });
});

// =============================================================================
// 12. getTrace and getStatus
// =============================================================================

describe("getTrace and getStatus", () => {
  it("getTrace returns null for unknown execution ID", () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);
    const trace = runner.getTrace("unknown-id");
    expect(trace).toBeNull();
  });

  it("getTrace returns valid trace after execution completes", async () => {
    const Step1 = defineStep("TraceStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("TraceSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.TraceStep)
      .build();
    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input", { executionId: "trace-test-1" });

    expect(result.isOk()).toBe(true);
    const trace = runner.getTrace("trace-test-1");
    expect(trace).not.toBeNull();
    expect(trace!.executionId).toBe("trace-test-1");
    expect(trace!.executionId).not.toBe("");
    expect(trace!.sagaName).toBe("TraceSaga");
    expect(trace!.sagaName).not.toBe("");
    expect(trace!.steps.length).toBe(1);
    expect(trace!.steps[0].stepName).toBe("TraceStep");
    expect(trace!.steps[0].stepName).not.toBe("");
    expect(trace!.steps[0].status).toBe("completed");
  });

  it("getTrace includes compensation trace when steps are compensated", async () => {
    const Step1 = defineStep("TraceCompA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();
    const Step2 = defineStep("TraceCompB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("TraceCompSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.TraceCompA)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortB: async () => {
        throw new Error("fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input", { executionId: "trace-test-2" });
    expect(result.isErr()).toBe(true);

    const trace = runner.getTrace("trace-test-2");
    expect(trace).not.toBeNull();
    expect(trace!.compensation).toBeDefined();
    expect(trace!.compensation!.triggeredBy).toBe("TraceCompB");
    expect(trace!.compensation!.triggeredBy).not.toBe("");
    expect(trace!.compensation!.steps.length).toBeGreaterThan(0);
    expect(trace!.compensation!.steps[0].stepName).toBe("TraceCompA");
    expect(trace!.compensation!.steps[0].stepName).not.toBe("");
  });

  it("getStatus returns error for unknown execution ID", async () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);
    const result = await runner.getStatus("unknown-id");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ExecutionNotFound");
      if (result.error._tag === "ExecutionNotFound") {
        expect(result.error.executionId).toBe("unknown-id");
        expect(result.error.executionId).not.toBe("");
      }
    }
  });

  it("getStatus returns completed status after successful execution", async () => {
    const Step1 = defineStep("StatusStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("StatusSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.StatusStep)
      .build();
    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input", { executionId: "status-test-1" });
    expect(result.isOk()).toBe(true);

    const statusResult = await runner.getStatus("status-test-1");
    expect(statusResult.isOk()).toBe(true);
    if (statusResult.isOk()) {
      expect(statusResult.value.state).toBe("completed");
      expect(statusResult.value.executionId).toBe("status-test-1");
      expect(statusResult.value.executionId).not.toBe("");
      expect(statusResult.value.sagaName).toBe("StatusSaga");
      expect(statusResult.value.sagaName).not.toBe("");
    }
  });
});

// =============================================================================
// 13. Resume without persister
// =============================================================================

describe("resume without persister", () => {
  it("resume returns error when no persister is configured", async () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);
    const result = await runner.resume("some-execution-id");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.message).toContain("Resume not implemented");
      expect(result.error.message).not.toBe("");
    }
  });
});

// =============================================================================
// 14. Hooks — beforeStep, afterStep
// =============================================================================

describe("saga hooks (beforeStep, afterStep)", () => {
  it("beforeStep hook is called with correct fields before each step", async () => {
    const hookCalls: Array<{ stepName: string; stepIndex: number; isCompensation: boolean }> = [];
    const Step1 = defineStep("HookA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const Step2 = defineStep("HookB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("HookSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.HookB)
      .options({
        compensationStrategy: "sequential",
        hooks: {
          beforeStep: ctx => {
            hookCalls.push({
              stepName: ctx.stepName,
              stepIndex: ctx.stepIndex,
              isCompensation: ctx.isCompensation,
            });
          },
        },
      })
      .build();

    const resolver = createResolver({ PortA: async (p: any) => p, PortB: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isOk()).toBe(true);
    expect(hookCalls.length).toBe(2);
    expect(hookCalls[0].stepName).toBe("HookA");
    expect(hookCalls[0].stepName).not.toBe("");
    expect(hookCalls[0].stepIndex).toBe(0);
    expect(hookCalls[0].isCompensation).toBe(false);
    expect(hookCalls[1].stepName).toBe("HookB");
    expect(hookCalls[1].stepIndex).toBe(1);
  });

  it("afterStep hook is called with result on success and error on failure", async () => {
    const hookCalls: Array<{
      stepName: string;
      result: unknown;
      error: unknown;
      durationMs: number;
      attemptCount: number;
    }> = [];
    const Step1 = defineStep("AfterHookA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const Step2 = defineStep("AfterHookB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("AfterHookSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.AfterHookB)
      .options({
        compensationStrategy: "sequential",
        hooks: {
          afterStep: ctx => {
            hookCalls.push({
              stepName: ctx.stepName,
              result: ctx.result,
              error: ctx.error,
              durationMs: ctx.durationMs,
              attemptCount: ctx.attemptCount,
            });
          },
        },
      })
      .build();

    const resolver = createResolver({
      PortA: async () => "result-a",
      PortB: async () => {
        throw new Error("fail-b");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");
    expect(result.isErr()).toBe(true);
    expect(hookCalls.length).toBe(2);
    expect(hookCalls[0].stepName).toBe("AfterHookA");
    expect(hookCalls[0].stepName).not.toBe("");
    expect(hookCalls[0].result).toBe("result-a");
    expect(hookCalls[0].error).toBeUndefined();
    expect(hookCalls[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(hookCalls[0].attemptCount).toBe(1);
    expect(hookCalls[1].stepName).toBe("AfterHookB");
    expect(hookCalls[1].result).toBeUndefined();
    expect(hookCalls[1].error).toBeDefined();
    expect(hookCalls[1].durationMs).toBeGreaterThanOrEqual(0);
    expect(hookCalls[1].attemptCount).toBe(1);
  });

  it("hook errors are swallowed and do not break execution", async () => {
    const Step1 = defineStep("SafeHookStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("SafeHookSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.SafeHookStep)
      .options({
        compensationStrategy: "sequential",
        hooks: {
          beforeStep: () => {
            throw new Error("hook-crash");
          },
          afterStep: () => {
            throw new Error("hook-crash");
          },
        },
      })
      .build();

    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");
    expect(result.isOk()).toBe(true);
  });
});

// =============================================================================
// 15. Compensation hooks
// =============================================================================

describe("compensation hooks (beforeCompensation, afterCompensation)", () => {
  it("beforeCompensation hook is called with correct fields", async () => {
    const hookCalls: Array<{ failedStepName: string; stepsToCompensate: number }> = [];
    const Step1 = defineStep("BeforeCompA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();
    const Step2 = defineStep("BeforeCompB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("BeforeCompSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.BeforeCompA)
      .options({
        compensationStrategy: "sequential",
        hooks: {
          beforeCompensation: ctx => {
            hookCalls.push({
              failedStepName: ctx.failedStepName,
              stepsToCompensate: ctx.stepsToCompensate,
            });
          },
        },
      })
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortB: async () => {
        throw new Error("fail");
      },
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "input");

    expect(hookCalls.length).toBe(1);
    expect(hookCalls[0].failedStepName).toBe("BeforeCompB");
    expect(hookCalls[0].failedStepName).not.toBe("");
    expect(hookCalls[0].stepsToCompensate).toBe(1);
  });

  it("afterCompensation hook is called with compensatedSteps and failedSteps arrays", async () => {
    const hookCalls: Array<{
      compensatedSteps: readonly string[];
      failedSteps: readonly string[];
    }> = [];
    const Step1 = defineStep("AfterCompA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();
    const Step2 = defineStep("AfterCompB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("AfterCompSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(r => r.AfterCompA)
      .options({
        compensationStrategy: "sequential",
        hooks: {
          afterCompensation: ctx => {
            hookCalls.push({
              compensatedSteps: ctx.compensatedSteps,
              failedSteps: ctx.failedSteps,
            });
          },
        },
      })
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortB: async () => {
        throw new Error("fail");
      },
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "input");

    expect(hookCalls.length).toBe(1);
    expect(Array.isArray(hookCalls[0].compensatedSteps)).toBe(true);
    expect(hookCalls[0].compensatedSteps).toContain("AfterCompA");
    expect(Array.isArray(hookCalls[0].failedSteps)).toBe(true);
    expect(hookCalls[0].failedSteps.length).toBe(0);
  });
});

// =============================================================================
// 16. PortNotFound error path
// =============================================================================

describe("port resolution failure", () => {
  it("returns PortNotFound with correct portName and non-empty strings", async () => {
    const Step1 = defineStep("PortNotFoundStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("PortNotFoundSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.PortNotFoundStep)
      .build();
    const resolver: PortResolver = {
      resolve() {
        throw new Error("port missing");
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("PortNotFound");
      if (result.error._tag === "PortNotFound") {
        expect(result.error.portName).toBe("PortA");
        expect(result.error.portName).not.toBe("");
        expect(result.error.stepName).toBe("PortNotFoundStep");
        expect(result.error.stepName).not.toBe("");
        expect(result.error.message).toContain("PortA");
        expect(result.error.message).not.toBe("");
        expect(result.error.sagaName).toBe("PortNotFoundSaga");
        expect(result.error.sagaName).not.toBe("");
      }
    }
  });
});

// =============================================================================
// 17. External abort signal (via runner.cancel on a step with timeout)
// =============================================================================

describe("external abort signal", () => {
  it("external cancellation interrupts a saga with timeout step", async () => {
    const d = deferred<string>();
    const Step1 = defineStep("AbortStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .timeout(10000)
      .build();
    const saga = defineSaga("AbortSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.AbortStep)
      .build();
    const resolver = createResolver({ PortA: async () => d.promise });

    const runner = createSagaRunner(resolver);
    const resultAsync = runner.execute(saga, "input", { executionId: "abort-signal-test" });

    await new Promise(r => setTimeout(r, 20));
    await runner.cancel("abort-signal-test");

    const result = await resultAsync;
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.sagaName).toBe("AbortSaga");
      expect(result.error.sagaName).not.toBe("");
    }
  });
});

// =============================================================================
// 18. Custom execution ID
// =============================================================================

describe("custom execution ID", () => {
  it("uses custom executionId when provided in options", async () => {
    const Step1 = defineStep("CustomIdStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("CustomIdSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.CustomIdStep)
      .build();
    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", { executionId: "my-custom-id" });
    const awaited = await result;

    expect(awaited.isOk()).toBe(true);
    if (awaited.isOk()) {
      expect(awaited.value.executionId).toBe("my-custom-id");
      expect(awaited.value.executionId).not.toBe("");
    }
  });
});

// =============================================================================
// 19. Attempt count in step:failed event
// =============================================================================

describe("attempt count tracking", () => {
  it("step:failed event has correct attemptCount with retries", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("AttemptCountStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 2, delay: 0 })
      .build();
    const saga = defineSaga("AttemptCountSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.AttemptCountStep)
      .build();
    const resolver = createResolver({
      PortA: async () => {
        throw new Error("always-fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "attempt-test-1",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const stepFailed = events.find(e => e.type === "step:failed") as Extract<
      SagaEvent,
      { type: "step:failed" }
    >;
    expect(stepFailed).toBeDefined();
    expect(stepFailed.attemptCount).toBe(3);
    expect(stepFailed.attemptCount).toBeGreaterThan(0);
  });

  it("step:failed event has attemptCount=1 when no retries configured", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("NoRetryAttempt")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("NoRetryAttemptSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.NoRetryAttempt)
      .build();
    const resolver = createResolver({
      PortA: async () => {
        throw new Error("fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "attempt-test-2",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const stepFailed = events.find(e => e.type === "step:failed") as Extract<
      SagaEvent,
      { type: "step:failed" }
    >;
    expect(stepFailed).toBeDefined();
    expect(stepFailed.attemptCount).toBe(1);
  });
});

// =============================================================================
// 20. Listeners provided via options receive events from the start
// =============================================================================

describe("pre-execution listeners", () => {
  it("listeners in options capture events from the very start including saga:started", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("PreListStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("PreListSaga")
      .input<string>()
      .step(Step1)
      .output(r => r.PreListStep)
      .build();
    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "prelist-test-1",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe("saga:started");
    expect(events[0].sagaName).toBe("PreListSaga");
    expect(events[0].sagaName).not.toBe("");
    const lastEvent = events[events.length - 1];
    expect(lastEvent.type).toBe("saga:completed");
  });
});

// =============================================================================
// 21. Step condition false path
// =============================================================================

describe("conditional step execution", () => {
  it("step skipped by condition does not appear in completedSteps", async () => {
    const Step1 = defineStep("CondA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const Step2 = defineStep("CondB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .when(() => false)
      .build();
    const Step3 = defineStep("CondC")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();

    const saga = defineSaga("CondSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .step(Step3)
      .output(r => r.CondC)
      .build();
    const resolver = createResolver({
      PortA: async (p: any) => p,
      PortB: async (p: any) => p,
      PortC: async (p: any) => p,
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input", { executionId: "cond-test-1" });

    expect(result.isOk()).toBe(true);
    const trace = runner.getTrace("cond-test-1");
    expect(trace).not.toBeNull();
    const skippedTrace = trace!.steps.find(s => s.stepName === "CondB");
    expect(skippedTrace).toBeDefined();
    expect(skippedTrace!.status).toBe("skipped");
    expect(skippedTrace!.skippedReason).toBe("condition-false");
    expect(skippedTrace!.skippedReason).not.toBe("");
  });
});

// =============================================================================
// 22. Compensation stepsToCompensate array in compensation:started event
// =============================================================================

describe("compensation:started stepsToCompensate array", () => {
  it("stepsToCompensate is a proper array of step names, not a mutated array", async () => {
    const events: SagaEvent[] = [];
    const Step1 = defineStep("StcA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();
    const Step2 = defineStep("StcB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();
    const Step3 = defineStep("StcC")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();

    const saga = defineSaga("StcSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .step(Step3)
      .output(r => r.StcC)
      .build();

    const resolver = createResolver({
      PortA: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortB: async (p: any) => {
        if (p?.undo) return;
        return p;
      },
      PortC: async () => {
        throw new Error("fail");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await runner.execute(saga, "input", {
      executionId: "stc-test-1",
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await result;

    const compStarted = events.find(e => e.type === "compensation:started") as Extract<
      SagaEvent,
      { type: "compensation:started" }
    >;
    expect(compStarted).toBeDefined();
    expect(Array.isArray(compStarted.stepsToCompensate)).toBe(true);
    expect(compStarted.stepsToCompensate.length).toBe(2);
    expect(compStarted.stepsToCompensate).toContain("StcA");
    expect(compStarted.stepsToCompensate).toContain("StcB");
    for (const name of compStarted.stepsToCompensate) {
      expect(name).not.toBe("Stryker was here");
      expect(name).not.toBe("");
    }
  });
});

// =============================================================================
// 23. Output mapper failure
// =============================================================================

describe("output mapper failure path", () => {
  it("returns StepFailed error when output mapper throws", async () => {
    const Step1 = defineStep("OutputMapStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("OutputMapSaga")
      .input<string>()
      .step(Step1)
      .output(() => {
        throw new Error("output-mapper-error");
      })
      .build();
    const resolver = createResolver({ PortA: async (p: any) => p });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.message).toContain("Output mapper failed");
      expect(result.error.message).not.toBe("");
    }
  });
});
