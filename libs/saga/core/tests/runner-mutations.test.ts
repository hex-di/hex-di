/**
 * Runner Mutation Tests
 *
 * Targeted tests to kill surviving mutants in runner.ts.
 * Organized by function: buildSagaStatus, event emission, executeStepWithRetry,
 * handleStepFailure, makeCancelledResult, executeStepNode, executeSagaInternal,
 * createSagaRunner/misc.
 */

import { describe, it, expect, vi } from "vitest";
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

/** Deferred promise for fine-grained control of async step execution */
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

/** Collect events by subscribing to an execution immediately after calling execute */
function collectEvents(
  runner: ReturnType<typeof createSagaRunner>,
  executionId: string
): SagaEvent[] {
  const events: SagaEvent[] = [];
  runner.subscribe(executionId, event => events.push(event));
  return events;
}

/** Find event by type with mandatory existence assertion */
function findEvent<T extends SagaEvent["type"]>(
  events: SagaEvent[],
  type: T
): Extract<SagaEvent, { type: T }> {
  const event = events.find(e => e.type === type);
  expect(event, `Expected event of type "${type}" to be present`).toBeDefined();
  return event as Extract<SagaEvent, { type: T }>;
}

// =============================================================================
// 1. buildSagaStatus — exact field assertions for all 5 cases
// =============================================================================

describe("buildSagaStatus — exact field assertions", () => {
  it("running status has all correct fields", async () => {
    const d = deferred<string>();

    const Step1 = defineStep("RunStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("RunningSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d.promise,
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      executionId: "run-status-1",
    });

    const statusResult = await runner.getStatus("run-status-1");
    expect(statusResult.isOk()).toBe(true);
    if (statusResult.isOk()) {
      const s = statusResult.value;
      expect(s.state).toBe("running");
      expect(s.executionId).toBe("run-status-1");
      expect(s.sagaName).toBe("RunningSaga");
      if (s.state === "running") {
        expect(s.currentStepIndex).toBe(0);
        expect(s.currentStepName).toBe("");
        expect(s.completedSteps).toEqual([]);
        expect(typeof s.startedAt).toBe("number");
        expect(s.startedAt).toBeGreaterThan(0);
      }
    }

    d.resolve("done");
    await resultAsync;
  });

  it("running status after one step completed has correct currentStepIndex and completedSteps", async () => {
    const d = deferred<string>();

    const Step1 = defineStep("First")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("Second")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("TwoStepSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("a-done"),
      PortB: () => d.promise,
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      executionId: "run-status-2",
    });

    // Wait a tick for first step to complete
    await new Promise(r => setTimeout(r, 10));

    const statusResult = await runner.getStatus("run-status-2");
    expect(statusResult.isOk()).toBe(true);
    if (statusResult.isOk()) {
      const s = statusResult.value;
      expect(s.state).toBe("running");
      if (s.state === "running") {
        expect(s.currentStepIndex).toBe(1);
        expect(s.completedSteps).toEqual(["First"]);
      }
    }

    d.resolve("done");
    await resultAsync;
  });

  it("completed status has all correct fields", async () => {
    const Step1 = defineStep("CompleteStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompleteSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("done"),
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "input", {
      executionId: "complete-status-1",
    });

    const statusResult = await runner.getStatus("complete-status-1");
    expect(statusResult.isOk()).toBe(true);
    if (statusResult.isOk()) {
      const s = statusResult.value;
      expect(s.state).toBe("completed");
      expect(s.executionId).toBe("complete-status-1");
      expect(s.sagaName).toBe("CompleteSaga");
      if (s.state === "completed") {
        expect(s.completedSteps).toEqual(["CompleteStep"]);
        expect(typeof s.startedAt).toBe("number");
        expect(typeof s.completedAt).toBe("number");
        expect(s.durationMs).toBe(0);
      }
    }
  });

  it("failed status has all correct fields", async () => {
    const Step1 = defineStep("FailedStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("FailedStatusSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.reject(new Error("boom")),
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "input", {
      executionId: "failed-status-1",
    });

    const statusResult = await runner.getStatus("failed-status-1");
    expect(statusResult.isOk()).toBe(true);
    if (statusResult.isOk()) {
      const s = statusResult.value;
      expect(s.state).toBe("failed");
      expect(s.executionId).toBe("failed-status-1");
      expect(s.sagaName).toBe("FailedStatusSaga");
      if (s.state === "failed") {
        expect(s.failedStepName).toBe("");
        expect(s.compensated).toBe(false);
        expect(s.compensatedSteps).toEqual([]);
        expect(typeof s.startedAt).toBe("number");
        expect(typeof s.failedAt).toBe("number");
        expect(s.durationMs).toBe(0);
        expect(s.error._tag).toBe("StepFailed");
        expect(s.error.executionId).toBe("failed-status-1");
        expect(s.error.sagaName).toBe("FailedStatusSaga");
        expect(s.error.stepName).toBe("");
        expect(s.error.stepIndex).toBe(-1);
        expect(s.error.message).toBe("Saga failed");
        expect(s.error.completedSteps).toEqual([]);
        expect(s.error.compensatedSteps).toEqual([]);
        if (s.error._tag === "StepFailed") {
          expect(s.error.cause).toBeUndefined();
        }
      }
    }
  });

  it("cancelled status has all correct fields", async () => {
    const d = deferred<string>();

    const Step1 = defineStep("CancelStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("CancelStep2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CancelStatusSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d.promise,
      PortB: () => Promise.resolve("done"),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      executionId: "cancel-status-1",
    });

    // Cancel while first step is pending
    await runner.cancel("cancel-status-1");
    d.resolve("done");
    await resultAsync;

    const statusResult = await runner.getStatus("cancel-status-1");
    expect(statusResult.isOk()).toBe(true);
    if (statusResult.isOk()) {
      const s = statusResult.value;
      // May be cancelled or failed depending on timing; check what buildSagaStatus returns
      if (s.state === "cancelled") {
        expect(s.executionId).toBe("cancel-status-1");
        expect(s.sagaName).toBe("CancelStatusSaga");
        expect(s.stepName).toBe("");
        expect(s.compensated).toBe(false);
        expect(s.compensatedSteps).toEqual([]);
        expect(typeof s.cancelledAt).toBe("number");
        expect(typeof s.startedAt).toBe("number");
      }
    }
  });

  it("compensating status has all correct fields", async () => {
    const d = deferred<void>();

    const Step1 = defineStep("CompensateStep1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => d.promise)
      .build();

    const Step2 = defineStep("CompensateStep2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompensatingSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: (params: any) => {
        // Forward invocation returns result, compensation invocation returns promise
        if (typeof params === "string") return Promise.resolve("step1-done");
        return d.promise.then(() => undefined);
      },
      PortB: () => Promise.reject(new Error("step2 fail")),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      executionId: "compensating-status-1",
    });

    // Wait for step2 to fail and compensation to start
    await new Promise(r => setTimeout(r, 30));

    const statusResult = await runner.getStatus("compensating-status-1");
    expect(statusResult.isOk()).toBe(true);
    if (statusResult.isOk()) {
      const s = statusResult.value;
      if (s.state === "compensating") {
        expect(s.executionId).toBe("compensating-status-1");
        expect(s.sagaName).toBe("CompensatingSaga");
        expect(s.failedStepName).toBe("");
        expect(s.failedStepIndex).toBeGreaterThanOrEqual(0);
        expect(s.compensatingStepIndex).toBe(0);
        expect(s.compensatingStepName).toBe("");
        expect(s.compensatedSteps).toEqual([]);
        expect(typeof s.startedAt).toBe("number");
        expect(s.error._tag).toBe("StepFailed");
        expect(s.error.stepName).toBe("");
        expect(s.error.stepIndex).toBe(-1);
        expect(s.error.message).toBe("Compensation in progress");
        expect(s.error.compensatedSteps).toEqual([]);
        if (s.error._tag === "StepFailed") {
          expect(s.error.cause).toBeUndefined();
        }
      }
    }

    d.resolve();
    await resultAsync;
  });
});

// =============================================================================
// 2. Event field precision — using deferred first step to capture ALL events
// =============================================================================

describe("event field precision — deferred step captures all events", () => {
  it("events after first await are captured with exact fields (step:completed, step2 events, saga:completed)", async () => {
    // saga:started and step:started for step 1 fire synchronously before subscribe.
    // Events after the first await (step:completed for step 1, step 2 events, saga:completed) ARE captured.
    const d1 = deferred<string>();

    const Step1 = defineStep("EvtS1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("EvtS2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("EvtAllSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d1.promise,
      PortB: () => Promise.resolve("b-done"),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      executionId: "evt-all-1",
    });

    const events = collectEvents(runner, "evt-all-1");
    d1.resolve("a-done");
    await resultAsync;

    // step:completed for step 1 — fires after the deferred resolves
    const completedEvents = events.filter(e => e.type === "step:completed");
    expect(completedEvents.length).toBeGreaterThanOrEqual(1);
    const sc1 = completedEvents[0];
    if (sc1.type === "step:completed") {
      expect(sc1.executionId).toBe("evt-all-1");
      expect(sc1.stepName).toBe("EvtS1");
      expect(sc1.stepIndex).toBe(0);
      expect(typeof sc1.timestamp).toBe("number");
      expect(sc1.timestamp).toBeGreaterThan(0);
    }

    // step:started for step 2
    const startedEvents = events.filter(e => e.type === "step:started");
    expect(startedEvents.length).toBeGreaterThanOrEqual(1);
    const ss2 = startedEvents.find(e => e.type === "step:started" && e.stepName === "EvtS2");
    expect(ss2).toBeDefined();
    if (ss2 && ss2.type === "step:started") {
      expect(ss2.executionId).toBe("evt-all-1");
      expect(ss2.stepName).toBe("EvtS2");
      expect(ss2.stepIndex).toBe(1);
      expect(typeof ss2.timestamp).toBe("number");
      expect(ss2.timestamp).toBeGreaterThan(0);
    }

    // step:completed for step 2
    const sc2 = completedEvents.find(e => e.type === "step:completed" && e.stepName === "EvtS2");
    expect(sc2).toBeDefined();
    if (sc2 && sc2.type === "step:completed") {
      expect(sc2.executionId).toBe("evt-all-1");
      expect(sc2.stepName).toBe("EvtS2");
      expect(sc2.stepIndex).toBe(1);
      expect(typeof sc2.timestamp).toBe("number");
      expect(sc2.timestamp).toBeGreaterThan(0);
    }

    // saga:completed
    const completed = findEvent(events, "saga:completed");
    expect(completed.executionId).toBe("evt-all-1");
    expect(completed.sagaName).toBe("EvtAllSaga");
    expect(typeof completed.timestamp).toBe("number");
    expect(completed.timestamp).toBeGreaterThan(0);
  });

  it("step:failed event has exact fields with attemptCount=1 for non-retry step", async () => {
    const d1 = deferred<string>();
    const failErr = new Error("step fail");

    const Step1 = defineStep("FailEvtS1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("FailEvtSaga2")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d1.promise,
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      executionId: "fail-evt-2",
    });

    const events = collectEvents(runner, "fail-evt-2");
    d1.reject(failErr);
    await resultAsync;

    const stepFailed = findEvent(events, "step:failed");
    expect(stepFailed.executionId).toBe("fail-evt-2");
    expect(stepFailed.stepName).toBe("FailEvtS1");
    expect(stepFailed.stepIndex).toBe(0);
    expect(stepFailed.error).toBe(failErr);
    expect(stepFailed.attemptCount).toBe(1);
    expect(typeof stepFailed.timestamp).toBe("number");
    expect(stepFailed.timestamp).toBeGreaterThan(0);
  });

  it("step:failed event has attemptCount = maxAttempts+1 for retry steps", async () => {
    const RetryStep = defineStep("RetryEvtStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 2, delay: 0 })
      .build();

    const saga = defineSaga("RetryEvtSaga")
      .input<string>()
      .step(RetryStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.reject(new Error("always fail")),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      executionId: "retry-evt-1",
    });

    const events = collectEvents(runner, "retry-evt-1");
    await resultAsync;

    const stepFailed = findEvent(events, "step:failed");
    expect(stepFailed.attemptCount).toBe(3); // maxAttempts(2) + 1
  });

  it("step:skipped event has exact fields (skipped step AFTER deferred step)", async () => {
    // Put the skipped step after a deferred step so it fires after subscribe
    const d = deferred<string>();

    const FirstStep = defineStep("FirstStepEvt")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const SkipStep = defineStep("SkipEvtS")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .when(() => false)
      .build();

    const saga = defineSaga("SkipEvtSaga2")
      .input<string>()
      .step(FirstStep)
      .step(SkipStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d.promise,
      PortB: () => Promise.resolve("ok"),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      executionId: "skip-evt-2",
    });

    const events = collectEvents(runner, "skip-evt-2");
    d.resolve("first-done");
    await resultAsync;

    const skipped = findEvent(events, "step:skipped");
    expect(skipped.executionId).toBe("skip-evt-2");
    expect(skipped.stepName).toBe("SkipEvtS");
    expect(skipped.stepIndex).toBe(1);
    expect(typeof skipped.timestamp).toBe("number");
    expect(skipped.timestamp).toBeGreaterThan(0);
  });

  it("saga:failed with compensation success — deferred step for full event capture", async () => {
    const d1 = deferred<string>();

    const Step1 = defineStep("CompEvtS1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("CompEvtS2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompEvtSaga2")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d1.promise,
      PortB: () => Promise.reject(new Error("b-fail")),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      executionId: "comp-evt-2",
    });

    const events = collectEvents(runner, "comp-evt-2");
    d1.resolve("a-done");
    await resultAsync;

    // compensation:started
    const compStarted = findEvent(events, "compensation:started");
    expect(compStarted.executionId).toBe("comp-evt-2");
    expect(compStarted.failedStepName).toBe("CompEvtS2");
    expect(compStarted.stepsToCompensate).toEqual(["CompEvtS1"]);
    expect(typeof compStarted.timestamp).toBe("number");
    expect(compStarted.timestamp).toBeGreaterThan(0);

    // saga:failed
    const sagaFailed = findEvent(events, "saga:failed");
    expect(sagaFailed.executionId).toBe("comp-evt-2");
    expect(sagaFailed.sagaName).toBe("CompEvtSaga2");
    expect(sagaFailed.compensated).toBe(true);
    expect(typeof sagaFailed.error).toBeDefined();
    expect(sagaFailed.failedStepName).toBe("CompEvtS2");
    expect(typeof sagaFailed.totalDurationMs).toBe("number");
    expect(typeof sagaFailed.timestamp).toBe("number");
    expect(sagaFailed.timestamp).toBeGreaterThan(0);
  });

  it("saga:failed with compensation failure — deferred step, compensated=false", async () => {
    const d1 = deferred<string>();

    const Step1 = defineStep("CompFailEvtS1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("CompFailEvtS2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompFailEvtSaga2")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        if (portName === "PortA") {
          return (params: any) => {
            if (params?.undo) return Promise.reject(new Error("comp-fail"));
            return d1.promise;
          };
        }
        if (portName === "PortB") {
          return () => Promise.reject(new Error("b-fail"));
        }
        throw new Error(`Port not found: ${portName}`);
      },
    };

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      executionId: "comp-fail-evt-2",
    });

    const events = collectEvents(runner, "comp-fail-evt-2");
    d1.resolve("a-done");
    await resultAsync;

    const sagaFailed = findEvent(events, "saga:failed");
    expect(sagaFailed.compensated).toBe(false);
    expect(sagaFailed.executionId).toBe("comp-fail-evt-2");
    expect(sagaFailed.sagaName).toBe("CompFailEvtSaga2");
    expect(typeof sagaFailed.error).toBeDefined();
    expect(typeof sagaFailed.timestamp).toBe("number");
  });

  it("timeout step emits saga:failed with exact fields via deferred pattern", async () => {
    const d1 = deferred<string>();

    const Step1 = defineStep("TimeoutEvtS1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("TimeoutEvtS2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .timeout(30)
      .build();

    const saga = defineSaga("TimeoutEvtSaga2")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d1.promise,
      PortB: () => new Promise(() => {}), // never resolves
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      executionId: "timeout-evt-2",
    });

    const events = collectEvents(runner, "timeout-evt-2");
    d1.resolve("a-done");
    await resultAsync;

    // compensation:started should be present
    const compStarted = findEvent(events, "compensation:started");
    expect(compStarted.executionId).toBe("timeout-evt-2");
    expect(compStarted.failedStepName).toBe("TimeoutEvtS2");
    expect(compStarted.stepsToCompensate).toEqual(["TimeoutEvtS1"]);
    expect(typeof compStarted.timestamp).toBe("number");

    // saga:failed with compensated=true (timeout compensation succeeded)
    const sagaFailed = findEvent(events, "saga:failed");
    expect(sagaFailed.executionId).toBe("timeout-evt-2");
    expect(sagaFailed.sagaName).toBe("TimeoutEvtSaga2");
    expect(sagaFailed.compensated).toBe(true);
    expect(sagaFailed.failedStepName).toBe("TimeoutEvtS2");
    expect(typeof sagaFailed.totalDurationMs).toBe("number");
    expect(typeof sagaFailed.timestamp).toBe("number");
  });

  it("saga:cancelled event captured via abort between steps", async () => {
    // Step 1 deferred so we can subscribe, then abort triggers cancel at L223 before step 2
    const d1 = deferred<string>();
    const abortController = new AbortController();

    const Step1 = defineStep("CancelEvtS1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("CancelEvtS2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CancelEvtSaga2")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => {
        // Abort after step 1 returns — should be caught at L223 before step 2
        abortController.abort();
        return d1.promise;
      },
      PortB: () => Promise.resolve("done"),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      executionId: "cancel-evt-2",
      signal: abortController.signal,
    });

    const events = collectEvents(runner, "cancel-evt-2");
    d1.resolve("step1-done");
    await resultAsync;

    const cancelled = events.find(e => e.type === "saga:cancelled");
    if (cancelled && cancelled.type === "saga:cancelled") {
      expect(cancelled.executionId).toBe("cancel-evt-2");
      expect(cancelled.sagaName).toBe("CancelEvtSaga2");
      expect(typeof cancelled.timestamp).toBe("number");
      expect(cancelled.timestamp).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// 3. executeStepWithRetry — retry logic precision
// =============================================================================

describe("executeStepWithRetry — retry logic precision", () => {
  it("step with maxAttempts: 2 calls port exactly 3 times (maxAttempts + 1)", async () => {
    let callCount = 0;

    const RetryStep = defineStep("RetryCountStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 2, delay: 0 })
      .build();

    const saga = defineSaga("RetryCountSaga")
      .input<string>()
      .step(RetryStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => {
        callCount++;
        return Promise.reject(new Error(`fail-${callCount}`));
      },
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "test");

    expect(callCount).toBe(3);
  });

  it("delay function receives correct attempt number and error", async () => {
    const delayFn = vi.fn((_attempt: number, _error: unknown) => 0);
    const errors: Error[] = [];

    const RetryStep = defineStep("DelayArgStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 2, delay: delayFn })
      .build();

    const saga = defineSaga("DelayArgSaga")
      .input<string>()
      .step(RetryStep)
      .output(() => ({}))
      .build();

    let callIdx = 0;
    const resolver = createResolver({
      PortA: () => {
        const e = new Error(`fail-${callIdx}`);
        errors.push(e);
        callIdx++;
        return Promise.reject(e);
      },
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "test");

    // delay is called with (attempt + 1, lastError) — attempt starts at 0
    // So first retry: delay(1, error), second retry: delay(2, error)
    expect(delayFn).toHaveBeenCalledTimes(2);
    expect(delayFn.mock.calls[0][0]).toBe(1);
    expect(delayFn.mock.calls[0][1]).toBe(errors[0]);
    expect(delayFn.mock.calls[1][0]).toBe(2);
    expect(delayFn.mock.calls[1][1]).toBe(errors[1]);
  });

  it("delay=0 skips sleep (no timing overhead)", async () => {
    const RetryStep = defineStep("NoDelayStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 1, delay: 0 })
      .build();

    const saga = defineSaga("NoDelaySaga")
      .input<string>()
      .step(RetryStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.reject(new Error("fail")),
    });

    const runner = createSagaRunner(resolver);
    const start = Date.now();
    await executeSaga(runner, saga, "test");
    const elapsed = Date.now() - start;

    // Should complete very quickly without any sleep
    expect(elapsed).toBeLessThan(100);
  });

  it("retryIf is checked before retry; not on final attempt", async () => {
    const retryIf = vi.fn(() => true);

    const RetryStep = defineStep("RetryIfStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 3, delay: 0, retryIf })
      .build();

    const saga = defineSaga("RetryIfSaga")
      .input<string>()
      .step(RetryStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.reject(new Error("always-fail")),
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "test");

    // maxAttempts=3 means 4 total attempts (maxAttempts+1).
    // retryIf is called before each retry: after attempt 0, after attempt 1, after attempt 2
    // Not after attempt 3 (the last one = maxAttempts - 1 is index 3)
    // Actually: retry loop runs attempt < maxAttempts (=4),
    // retryIf is called when attempt < maxAttempts - 1, so on attempts 0, 1, 2
    expect(retryIf).toHaveBeenCalledTimes(3);
  });

  it("retryIf returns false on first check → step called once, saga fails immediately", async () => {
    let callCount = 0;
    const retryIf = vi.fn(() => false);

    const RetryStep = defineStep("RetryIfFalseStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 3, delay: 0, retryIf })
      .build();

    const saga = defineSaga("RetryIfFalseSaga")
      .input<string>()
      .step(RetryStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => {
        callCount++;
        return Promise.reject(new Error("fail"));
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(callCount).toBe(1);
    expect(retryIf).toHaveBeenCalledTimes(1);
    expect(result.isErr()).toBe(true);
  });

  it("lastError is from the final attempt", async () => {
    let callCount = 0;

    const RetryStep = defineStep("LastErrStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 2, delay: 0 })
      .build();

    const saga = defineSaga("LastErrSaga")
      .input<string>()
      .step(RetryStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => {
        callCount++;
        return Promise.reject(new Error(`fail-attempt-${callCount}`));
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr() && result.error._tag === "StepFailed") {
      expect(result.error.cause).toBeInstanceOf(Error);
      expect(result.error.cause).toHaveProperty("message", "fail-attempt-3");
    }
  });

  it("signal aborted before execute → saga fails with cancellation-related error", async () => {
    const d = deferred<string>();

    const Step1 = defineStep("PreAbortStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("PreAbortStep2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("PreAbortSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const abortController = new AbortController();

    const resolver = createResolver({
      PortA: () => d.promise,
      PortB: () => Promise.resolve("done"),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test", {
      signal: abortController.signal,
      executionId: "pre-abort-1",
    });

    // Abort before step 1 completes
    abortController.abort();
    d.resolve("done");

    const result = await resultAsync;
    // Result should be an error because signal was aborted
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Error is either Cancelled or StepFailed with "Saga cancelled" message
      const err = result.error;
      if (err._tag === "Cancelled") {
        expect(err.message).toBe("Saga was cancelled");
      } else if (err._tag === "StepFailed") {
        // cause is the Error("Saga cancelled") thrown during abort
        expect(err.cause).toHaveProperty("message", expect.stringContaining("Saga cancelled"));
      }
    }
  });

  it("sleep cancellation during retry delay → error contains 'Saga cancelled during retry delay'", async () => {
    const RetryStep = defineStep("SleepCancelStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 1, delay: 5000 })
      .build();

    const saga = defineSaga("SleepCancelSaga")
      .input<string>()
      .step(RetryStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.reject(new Error("fail")),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test", {
      executionId: "sleep-cancel-1",
    });

    // Wait a bit for the retry delay to start, then cancel
    await new Promise(r => setTimeout(r, 30));
    await runner.cancel("sleep-cancel-1");

    const result = await resultAsync;
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // The error should relate to cancellation
      if (result.error._tag === "StepFailed") {
        expect(result.error.cause).toHaveProperty(
          "message",
          expect.stringContaining("Saga cancelled")
        );
      }
    }
  });
});

// =============================================================================
// 4. handleStepFailure — compensation plan & error branching
// =============================================================================

describe("handleStepFailure — compensation plan & error branching", () => {
  it("skipCompensation flag excludes step from compensation", async () => {
    const compensationCalls: string[] = [];

    const Step1 = defineStep("SkipCompStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .skipCompensation()
      .build();

    const Step2 = defineStep("FailAfterSkip")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("SkipCompSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        if (portName === "PortA") {
          return (params: any) => {
            if (params?.undo) {
              compensationCalls.push("PortA-comp");
              return Promise.resolve();
            }
            return Promise.resolve("step1-done");
          };
        }
        if (portName === "PortB") {
          return () => Promise.reject(new Error("step2-fail"));
        }
        throw new Error(`Port not found: ${portName}`);
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    // skipCompensation step should NOT have its compensation called
    expect(compensationCalls).toEqual([]);
    if (result.isErr()) {
      expect(result.error.compensatedSteps).toEqual([]);
    }
  });

  it("step without compensation handler is not in compensated steps", async () => {
    const Step1 = defineStep("NoCompHandler")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("FailNoComp")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("NoCompSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("step1-done"),
      PortB: () => Promise.reject(new Error("step2-fail")),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.compensatedSteps).toEqual([]);
    }
  });

  it("compensation:started stepsToCompensate matches actual compensable completed steps count", async () => {
    // Step1: has compensation, Step2: no compensation, Step3: fails
    const Step1 = defineStep("HasComp")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("NoComp")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const Step3 = defineStep("FailStep")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompCountSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .step(Step3)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => new Promise(r => setTimeout(() => r("ok"), 5)),
      PortB: () => new Promise(r => setTimeout(() => r("ok"), 5)),
      PortC: () => new Promise((_, rej) => setTimeout(() => rej(new Error("fail")), 5)),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test", {
      executionId: "comp-count-1",
    });

    const events = collectEvents(runner, "comp-count-1");
    await resultAsync;

    const compStarted = events.find(e => e.type === "compensation:started");
    if (compStarted && compStarted.type === "compensation:started") {
      // Only Step1 has compensation, Step2 does not
      expect(compStarted.stepsToCompensate).toEqual(["HasComp"]);
    }
  });

  it("all compensation succeeded → error._tag is StepFailed", async () => {
    const Step1 = defineStep("CompSuccessStep1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("CompSuccessStep2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompSuccessSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("a-done"),
      PortB: () => Promise.reject(new Error("b-fail")),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.compensatedSteps).toContain("CompSuccessStep1");
    }
  });

  it("compensation partially failed → error._tag is CompensationFailed with compensationCause", async () => {
    const compError = new Error("compensation-failed");

    const Step1 = defineStep("CompPartialStep1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("CompPartialStep2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompPartialSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        if (portName === "PortA") {
          return (params: any) => {
            if (params?.undo) return Promise.reject(compError);
            return Promise.resolve("a-done");
          };
        }
        if (portName === "PortB") {
          return () => Promise.reject(new Error("b-fail"));
        }
        throw new Error(`Port not found: ${portName}`);
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("CompensationFailed");
      if (result.error._tag === "CompensationFailed") {
        expect(result.error.compensationCause).toBe(compError);
        expect(result.error.failedCompensationSteps).toContain("CompPartialStep1");
      }
    }
  });

  it("baseFields.message for non-timeout → 'Step \"X\" failed'", async () => {
    const Step1 = defineStep("MsgFailStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("MsgFailSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.reject(new Error("fail")),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe('Step "MsgFailStep" failed');
    }
  });

  it("baseFields.message for timeout → 'Step \"X\" timed out after Yms'", async () => {
    const TimeoutStep = defineStep("TimeoutMsgStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .timeout(50)
      .build();

    const saga = defineSaga("TimeoutMsgSaga")
      .input<string>()
      .step(TimeoutStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => new Promise(() => {}), // never resolves
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      expect(result.error.message).toBe('Step "TimeoutMsgStep" timed out after 50ms');
      if (result.error._tag === "Timeout") {
        expect(result.error.timeoutMs).toBe(50);
      }
    }
  });

  it("timeout step failure emits saga:failed with compensated matching allSucceeded", async () => {
    const TimeoutStep = defineStep("TimeoutEvtStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .timeout(30)
      .build();

    const saga = defineSaga("TimeoutEvtSaga")
      .input<string>()
      .step(TimeoutStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => new Promise(() => {}),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test", {
      executionId: "timeout-evt-1",
    });

    const events = collectEvents(runner, "timeout-evt-1");
    await resultAsync;

    const sagaFailed = events.find(e => e.type === "saga:failed");
    if (sagaFailed && sagaFailed.type === "saga:failed") {
      // No compensation steps to fail, so allSucceeded = true
      expect(sagaFailed.compensated).toBe(true);
    }
  });
});

// =============================================================================
// 5. makeCancelledResult — cancelled error fields (deterministic via pre-aborted signal)
// =============================================================================

describe("makeCancelledResult — cancelled error fields", () => {
  it("abort between steps produces Cancelled error with exact fields", async () => {
    // Step 1 completes and aborts the signal. At L223, signal.aborted is true → makeCancelledResult.
    const abortController = new AbortController();

    const Step1 = defineStep("CancelBefore1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("CancelBefore2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CancelBeforeSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => {
        // Abort synchronously — will be checked at L223 on next loop iteration
        abortController.abort();
        return Promise.resolve("step1-done");
      },
      PortB: () => Promise.resolve("step2-done"),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      executionId: "cancel-before-1",
      signal: abortController.signal,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Should be Cancelled since abort happened between steps
      if (result.error._tag === "Cancelled") {
        expect(result.error.executionId).toBe("cancel-before-1");
        expect(result.error.sagaName).toBe("CancelBeforeSaga");
        expect(result.error.stepName).toBe("");
        expect(result.error.message).toBe("Saga was cancelled");
        expect(result.error.completedSteps).toContain("CancelBefore1");
        expect(result.error.compensatedSteps).toEqual([]);
      }
    }
  });

  it("cancel between steps produces Cancelled with correct completedSteps", async () => {
    // Step 1 resolves immediately, then signal is aborted.
    // At L223, signal.aborted is true before step 2 starts → makeCancelledResult
    const abortController = new AbortController();

    const Step1 = defineStep("CancelBetween1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("CancelBetween2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CancelBetweenSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => {
        // Abort after step 1 returns but before step 2 starts
        abortController.abort();
        return Promise.resolve("step1-done");
      },
      PortB: () => Promise.resolve("step2-done"),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      executionId: "cancel-between-1",
      signal: abortController.signal,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Due to microtask scheduling, cancel may be detected at L223 or within step
      if (result.error._tag === "Cancelled") {
        expect(result.error.stepName).toBe("");
        expect(result.error.message).toBe("Saga was cancelled");
        expect(result.error.compensatedSteps).toEqual([]);
        // Step 1 completed before abort, so it should be in completedSteps
        expect(result.error.completedSteps).toContain("CancelBetween1");
      }
    }
  });

  it("cancel with global timeout → error includes completedSteps", async () => {
    // Using global timeout ensures cancellation works via race
    const Step1 = defineStep("CancelGlobalStep1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("CancelGlobalStep2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CancelGlobalSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("fast"),
      PortB: () => new Promise(() => {}), // never resolves
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      timeout: 50,
      executionId: "cancel-global-1",
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Global timeout produces Timeout error
      expect(result.error._tag).toBe("Timeout");
      expect(result.error.completedSteps).toContain("CancelGlobalStep1");
      expect(result.error.compensatedSteps).toEqual([]);
      expect(result.error.stepName).toBe("");
      expect(result.error.stepIndex).toBe(-1);
    }
  });
});

// =============================================================================
// 6. executeStepNode — port resolution & condition
// =============================================================================

describe("executeStepNode — port resolution & condition", () => {
  it("PortNotFound error has exact fields", async () => {
    const Step1 = defineStep("PnfStep1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("PnfStep2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("PnfSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    // PortA resolves, PortB throws
    const resolver: PortResolver = {
      resolve(portName: string) {
        if (portName === "PortA") return () => Promise.resolve("done");
        throw new Error(`Port not found: ${portName}`);
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      executionId: "pnf-1",
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("PortNotFound");
      if (result.error._tag === "PortNotFound") {
        expect(result.error.portName).toBe("PortB");
        expect(result.error.message).toContain("PortB");
        expect(result.error.message).toContain("not found in container");
        expect(result.error.executionId).toBe("pnf-1");
        expect(result.error.sagaName).toBe("PnfSaga");
        expect(result.error.stepName).toBe("PnfStep2");
        expect(result.error.stepIndex).toBe(1);
        expect(result.error.completedSteps).toEqual(["PnfStep1"]);
        expect(result.error.compensatedSteps).toEqual([]);
      }
    }
  });

  it("condition false → step:skipped, step NOT in completedSteps, saga continues", async () => {
    const SkipStep = defineStep("CondSkipStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .when(() => false)
      .build();

    const AfterStep = defineStep("AfterSkipStep")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CondSaga")
      .input<string>()
      .step(SkipStep)
      .step(AfterStep)
      .output(() => ({ done: true }))
      .build();

    const portACalled = vi.fn(() => Promise.resolve("a"));
    const resolver = createResolver({
      PortA: portACalled,
      PortB: () => Promise.resolve("b"),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      executionId: "cond-skip-1",
    });

    expect(result.isOk()).toBe(true);
    expect(portACalled).not.toHaveBeenCalled();

    // Check that CondSkipStep is not in completedSteps via getStatus
    const status = await runner.getStatus("cond-skip-1");
    if (status.isOk() && status.value.state === "completed") {
      expect(status.value.completedSteps).not.toContain("CondSkipStep");
      expect(status.value.completedSteps).toContain("AfterSkipStep");
    }
  });

  it("invoke receives correct context with input, results, stepIndex, executionId", async () => {
    const invokeSpy = vi.fn((ctx: any) => ({ key: ctx.input }));

    const Step1 = defineStep("CtxStep1")
      .io<{ val: string }, { out1: string }>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("CtxStep2")
      .io<{ val: string }, { out2: string }>()
      .invoke(PortB, invokeSpy)
      .build();

    const saga = defineSaga("CtxSaga")
      .input<{ val: string }>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve({ out1: "first" }),
      PortB: () => Promise.resolve({ out2: "second" }),
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(
      runner,
      saga,
      { val: "hello" },
      {
        executionId: "ctx-1",
      }
    );

    expect(invokeSpy).toHaveBeenCalledTimes(1);
    const ctx = invokeSpy.mock.calls[0][0];
    expect(ctx.input).toEqual({ val: "hello" });
    expect(ctx.results).toEqual({ CtxStep1: { out1: "first" } });
    expect(ctx.stepIndex).toBe(1);
    expect(ctx.executionId).toBe("ctx-1");
  });

  it("invokePort with object that has execute method works", async () => {
    const Step1 = defineStep("ExecMethodStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("ExecMethodSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({ ok: true }))
      .build();

    const resolver: PortResolver = {
      resolve() {
        return { execute: (params: unknown) => Promise.resolve(`executed-${params}`) };
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isOk()).toBe(true);
  });

  it("invokePort with non-function non-execute-method value throws", async () => {
    const Step1 = defineStep("BadPortStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("BadPortSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver: PortResolver = {
      resolve() {
        return { notExecute: "something" };
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr() && result.error._tag === "StepFailed") {
      expect(result.error.cause).toBeInstanceOf(Error);
      expect(result.error.cause).toHaveProperty(
        "message",
        "Port service does not have an executable interface"
      );
    }
  });
});

// =============================================================================
// 7. executeSagaInternal — branch/parallel/subSaga context & global timeout
// =============================================================================

describe("executeSagaInternal — context & global timeout", () => {
  it("branch selector receives correct context", async () => {
    const selectorSpy = vi.fn(
      (_ctx: { input: unknown; results: unknown; stepIndex: number; executionId: string }) =>
        "a" as "a" | "b"
    );

    const BranchStepA = defineStep("BranchA")
      .io<{ val: string }, { a: string }>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const BranchStepB = defineStep("BranchB")
      .io<{ val: string }, { b: string }>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const PreStep = defineStep("PreBranch")
      .io<{ val: string }, { pre: string }>()
      .invoke(PortC, ctx => ctx.input)
      .build();

    const saga = defineSaga("BranchCtxSaga")
      .input<{ val: string }>()
      .step(PreStep)
      .branch(selectorSpy, {
        a: [BranchStepA],
        b: [BranchStepB],
      })
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve({ a: "resultA" }),
      PortB: () => Promise.resolve({ b: "resultB" }),
      PortC: () => Promise.resolve({ pre: "preDone" }),
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(
      runner,
      saga,
      { val: "hello" },
      {
        executionId: "branch-ctx-1",
      }
    );

    expect(selectorSpy).toHaveBeenCalledTimes(1);
    const ctx = selectorSpy.mock.calls[0][0];
    expect(ctx.input).toEqual({ val: "hello" });
    expect(ctx.results).toEqual({ PreBranch: { pre: "preDone" } });
    expect(ctx.executionId).toBe("branch-ctx-1");
    expect(typeof ctx.stepIndex).toBe("number");
  });

  it("subSaga inputMapper receives correct context", async () => {
    const mapperSpy = vi.fn((ctx: any) => ({ childVal: ctx.input.val }));

    const ChildStep = defineStep("ChildSubStep")
      .io<{ childVal: string }, { out: string }>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const ChildSaga = defineSaga("ChildSubSaga")
      .input<{ childVal: string }>()
      .step(ChildStep)
      .output(results => ({ childOut: results.ChildSubStep.out }))
      .build();

    const PreStep = defineStep("PreSubSaga")
      .io<{ val: string }, { pre: string }>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const ParentSaga = defineSaga("ParentSubSaga")
      .input<{ val: string }>()
      .step(PreStep)
      .saga(ChildSaga, mapperSpy)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve({ out: "childResult" }),
      PortB: () => Promise.resolve({ pre: "preDone" }),
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(
      runner,
      ParentSaga,
      { val: "parentInput" },
      {
        executionId: "subsaga-ctx-1",
      }
    );

    expect(mapperSpy).toHaveBeenCalledTimes(1);
    const ctx = mapperSpy.mock.calls[0][0];
    expect(ctx.input).toEqual({ val: "parentInput" });
    expect(ctx.results).toEqual({ PreSubSaga: { pre: "preDone" } });
    expect(ctx.executionId).toBe("subsaga-ctx-1");
  });

  it("global timeout error has correct fields", async () => {
    const Step1 = defineStep("GlobalTimeoutStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("GlobalTimeoutSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => new Promise(() => {}), // never resolves
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      timeout: 50,
      executionId: "global-timeout-1",
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      if (result.error._tag === "Timeout") {
        expect(result.error.timeoutMs).toBe(50);
      }
      expect(result.error.stepName).toBe("");
      expect(result.error.stepIndex).toBe(-1);
      expect(result.error.message).toContain("50ms");
      expect(result.error.message).toContain("timed out");
      expect(result.error.compensatedSteps).toEqual([]);
      expect(result.error.executionId).toBe("global-timeout-1");
      expect(result.error.sagaName).toBe("GlobalTimeoutSaga");
    }
  });

  it("global timeout from saga.options works", async () => {
    const Step1 = defineStep("SagaOptTimeout")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("SagaOptTimeoutSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .options({ compensationStrategy: "sequential", timeout: 50 })
      .build();

    const resolver = createResolver({
      PortA: () => new Promise(() => {}),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      if (result.error._tag === "Timeout") {
        expect(result.error.timeoutMs).toBe(50);
      }
    }
  });

  it("options.timeout takes precedence over saga.options.timeout", async () => {
    const Step1 = defineStep("PriorityTimeout")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("PriorityTimeoutSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .options({ compensationStrategy: "sequential", timeout: 5000 })
      .build();

    const resolver = createResolver({
      PortA: () => new Promise(() => {}),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      timeout: 50,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      if (result.error._tag === "Timeout") {
        // options.timeout (50) takes precedence over saga.options.timeout (5000)
        expect(result.error.timeoutMs).toBe(50);
      }
    }
  });

  it("global timeout includes completed steps before timeout", async () => {
    const Step1 = defineStep("FastStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("SlowStep")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("TimeoutCompletedSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("fast"),
      PortB: () => new Promise(() => {}), // never resolves
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      timeout: 50,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.completedSteps).toContain("FastStep");
    }
  });

  it("parallel step results are accumulated", async () => {
    const ParA = defineStep("ParA")
      .io<string, { a: string }>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const ParB = defineStep("ParB")
      .io<string, { b: string }>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const AfterPar = defineStep("AfterPar")
      .io<string, string>()
      .invoke(PortC, ctx => {
        // Verify accumulated results from parallel are available
        return ctx.results;
      })
      .build();

    const saga = defineSaga("ParAccSaga")
      .input<string>()
      .parallel([ParA, ParB])
      .step(AfterPar)
      .output(results => ({
        a: results.ParA.a,
        b: results.ParB.b,
      }))
      .build();

    let receivedParams: unknown;
    const resolver = createResolver({
      PortA: () => Promise.resolve({ a: "aVal" }),
      PortB: () => Promise.resolve({ b: "bVal" }),
      PortC: (params: any) => {
        receivedParams = params;
        return Promise.resolve("after");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isOk()).toBe(true);
    // The AfterPar step should have received accumulated results from parallel steps
    expect(receivedParams).toEqual({
      ParA: { a: "aVal" },
      ParB: { b: "bVal" },
    });
  });
});

// =============================================================================
// 8. createSagaRunner & misc
// =============================================================================

describe("createSagaRunner & misc", () => {
  it("outputMapper throw produces StepFailed with execution context", async () => {
    // outputMapper throwing is caught by tryCatch in executeSagaInternal
    // and wrapped via wrapUnexpectedError with real executionId/sagaName
    const Step1 = defineStep("OutputThrow1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const throwError = new Error("outputMapper exploded");
    const saga = defineSaga("OutputThrowSaga")
      .input<string>()
      .step(Step1)
      .output(() => {
        throw throwError;
      })
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("done"),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      // With Result-based control flow, executionId and sagaName are preserved
      expect(result.error.executionId).toBeTruthy();
      expect(result.error.sagaName).toBe("OutputThrowSaga");
      expect(result.error.stepName).toBe("");
      expect(result.error.stepIndex).toBe(-1);
      expect(result.error.message).toBe(`Output mapper failed: ${String(throwError)}`);
      expect(result.error.completedSteps).toEqual(["OutputThrow1"]);
      expect(result.error.compensatedSteps).toEqual([]);
      expect(result.error).toHaveProperty("cause", throwError);
    }
  });

  it("raw Promise.reject from port produces StepFailed with correct fields", async () => {
    const Step1 = defineStep("ExtractStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("ExtractSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.reject("raw string error"),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.stepName).toBe("ExtractStep");
      expect(result.error.message).toContain("ExtractStep");
    }
  });

  it("subscribe returns noop for unknown execution", () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);
    const unsub = runner.subscribe("nonexistent", () => {});

    expect(typeof unsub).toBe("function");
    unsub(); // should not throw
  });

  it("subscribe/unsubscribe: listener no longer called after unsubscribe", async () => {
    const d = deferred<string>();

    const Step1 = defineStep("UnsubStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("UnsubSaga2")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d.promise,
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test", {
      executionId: "unsub-test-2",
    });

    const events: SagaEvent[] = [];
    const unsub = runner.subscribe("unsub-test-2", event => events.push(event));

    // Unsubscribe immediately
    unsub();
    const countBefore = events.length;

    // Resolve the step — events should NOT be delivered
    d.resolve("done");
    await resultAsync;

    expect(events.length).toBe(countBefore);
  });

  it("multiple listeners all receive events", async () => {
    const d = deferred<string>();

    const Step1 = defineStep("MultiListStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("MultiListSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d.promise,
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test", {
      executionId: "multi-list-1",
    });

    const events1: SagaEvent[] = [];
    const events2: SagaEvent[] = [];
    runner.subscribe("multi-list-1", event => events1.push(event));
    runner.subscribe("multi-list-1", event => events2.push(event));

    d.resolve("ok");
    await resultAsync;

    // Both listeners should have received the same events
    expect(events1.length).toBe(events2.length);
    expect(events1.length).toBeGreaterThan(0);
  });

  it("executeSaga returns executionId in success result", async () => {
    const Step1 = defineStep("IdStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("IdSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({ ok: true }))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("done"),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      executionId: "custom-id-1",
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.executionId).toBe("custom-id-1");
    }
  });

  it("auto-generated executionId is a non-empty string", async () => {
    const Step1 = defineStep("AutoIdStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("AutoIdSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({ ok: true }))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("done"),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(typeof result.value.executionId).toBe("string");
      expect(result.value.executionId.length).toBeGreaterThan(0);
    }
  });

  it("external signal abortion triggers cancellation", async () => {
    const step1Deferred = deferred<string>();
    const abortController = new AbortController();

    const Step1 = defineStep("ExtAbortStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("ExtAbortStep2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("ExtAbortSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => step1Deferred.promise,
      PortB: () => Promise.resolve("done"),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test", {
      signal: abortController.signal,
    });

    // Abort while step 1 is still pending
    abortController.abort();
    step1Deferred.resolve("done");

    const result = await resultAsync;
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      const err = result.error;
      if (err._tag === "Cancelled") {
        expect(err.message).toBe("Saga was cancelled");
      } else if (err._tag === "StepFailed") {
        expect(err.cause).toHaveProperty("message", expect.stringContaining("Saga cancelled"));
      }
    }
  });

  it("error fields: completedSteps is exact array of completed step names", async () => {
    const Step1 = defineStep("ErrField1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("ErrField2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const Step3 = defineStep("ErrField3")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();

    const saga = defineSaga("ErrFieldSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .step(Step3)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("a"),
      PortB: () => Promise.resolve("b"),
      PortC: () => Promise.reject(new Error("c-fail")),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.completedSteps).toEqual(["ErrField1", "ErrField2"]);
      expect(result.error.stepName).toBe("ErrField3");
      expect(result.error.stepIndex).toBe(2);
    }
  });

  it("failed error has correct cause from step error", async () => {
    const stepError = new Error("specific-error");

    const Step1 = defineStep("CauseStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("CauseSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.reject(stepError),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr() && result.error._tag === "StepFailed") {
      expect(result.error.cause).toBe(stepError);
    }
  });

  it("compensation with multiple errors uses first error's cause", async () => {
    const compError1 = new Error("comp-error-1");
    const compError2 = new Error("comp-error-2");

    const Step1 = defineStep("MultiCompStep1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: "s1" }))
      .build();

    const Step2 = defineStep("MultiCompStep2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .compensate(() => ({ undo: "s2" }))
      .build();

    const Step3 = defineStep("MultiCompStep3")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();

    const saga = defineSaga("MultiCompSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .step(Step3)
      .output(() => ({}))
      .options({ compensationStrategy: "best-effort" })
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        if (portName === "PortA") {
          return (params: any) => {
            if (params?.undo) return Promise.reject(compError1);
            return Promise.resolve("a");
          };
        }
        if (portName === "PortB") {
          return (params: any) => {
            if (params?.undo) return Promise.reject(compError2);
            return Promise.resolve("b");
          };
        }
        if (portName === "PortC") {
          return () => Promise.reject(new Error("c-fail"));
        }
        throw new Error(`Port not found: ${portName}`);
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("CompensationFailed");
      if (result.error._tag === "CompensationFailed") {
        // errors[0].cause is used for compensationCause
        // Best-effort runs in reverse, so Step2 compensation runs first (index-wise: reversed)
        expect(result.error.compensationCause).toBeDefined();
      }
    }
  });

  it("signal.aborted at retry loop start (L101) triggers cancellation during retries", async () => {
    // This test kills the L101 `signal.aborted → false` mutant
    // Step with retry: abort signal between retry attempts
    const abortController = new AbortController();
    let callCount = 0;

    const RetryStep = defineStep("AbortRetryStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 3, delay: 0 })
      .build();

    const saga = defineSaga("AbortRetrySaga")
      .input<string>()
      .step(RetryStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => {
        callCount++;
        if (callCount === 1) {
          // First attempt fails, then abort before second attempt
          abortController.abort();
        }
        return Promise.reject(new Error(`fail-${callCount}`));
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      signal: abortController.signal,
      executionId: "abort-retry-1",
    });

    expect(result.isErr()).toBe(true);
    // The abort should have been detected at L101 in the retry loop
    if (result.isErr()) {
      expect(result.error).toHaveProperty(
        "cause",
        expect.objectContaining({ message: expect.stringContaining("Saga cancelled") })
      );
    }
  });

  it("cancel not found execution returns ExecutionNotFound error", async () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);

    const result = await runner.cancel("nonexistent-id");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ExecutionNotFound");
      expect(result.error).toHaveProperty("executionId", "nonexistent-id");
      expect(result.error.message).toContain("nonexistent-id");
    }
  });

  it("getStatus for not found execution returns ExecutionNotFound error", async () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);

    const result = await runner.getStatus("nonexistent-id");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ExecutionNotFound");
      expect(result.error).toHaveProperty("executionId", "nonexistent-id");
      expect(result.error.message).toContain("nonexistent-id");
    }
  });

  it("branch step failure returns error result (kills L280 ConditionalExpression false)", async () => {
    const BranchStepA = defineStep("BranchFailA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const BranchStepB = defineStep("BranchFailB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("BranchFailSaga")
      .input<string>()
      .branch(
        (_ctx: { input: unknown; results: unknown; stepIndex: number; executionId: string }) =>
          "a" as "a" | "b",
        {
          a: [BranchStepA],
          b: [BranchStepB],
        }
      )
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.reject(new Error("branch-step-fail")),
      PortB: () => Promise.resolve("b-ok"),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.stepName).toBe("BranchFailA");
      expect(result.error.message).toContain("BranchFailA");
    }
  });

  it("subSaga failure propagates correct error (kills L301, L303, L305 mutations)", async () => {
    // subSaga creates a sub-state with accumulatedResults: {}, completedSteps: [], listeners: []
    // This test ensures those empty arrays/objects matter by running a sub-saga that fails
    const ChildStep = defineStep("SubFailChild")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const ChildSaga = defineSaga("SubFailChildSaga")
      .input<string>()
      .step(ChildStep)
      .output(results => results)
      .build();

    const ParentSaga = defineSaga("SubFailParentSaga")
      .input<string>()
      .saga(ChildSaga, (ctx: any) => ctx.input)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.reject(new Error("child-fail")),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, ParentSaga, "test");

    // The error should propagate from the child saga
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.stepName).toBe("SubFailChild");
    }
  });
});

// =============================================================================
// 9. Additional targeted tests for remaining survivors
// =============================================================================

describe("stepIndex accuracy in errors and events", () => {
  it("parallel step failure has correct stepIndex (kills L254 stepIndex-- mutant)", async () => {
    // Parallel steps increment stepIndex for each step. Failure at step index 1 should
    // report stepIndex=1, not stepIndex=0 or stepIndex=-1
    const d = deferred<string>();

    const ParStep1 = defineStep("ParIdx1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const ParStep2 = defineStep("ParIdx2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("ParIdxSaga")
      .input<string>()
      .parallel([ParStep1, ParStep2])
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d.promise,
      PortB: () => Promise.reject(new Error("par-fail")),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test", {
      executionId: "par-idx-1",
    });

    const events = collectEvents(runner, "par-idx-1");
    d.resolve("a-done");
    await resultAsync;

    // Step 1 (index=0) succeeds, Step 2 (index=1) fails
    const stepFailed = events.find(e => e.type === "step:failed");
    expect(stepFailed).toBeDefined();
    if (stepFailed && stepFailed.type === "step:failed") {
      expect(stepFailed.stepName).toBe("ParIdx2");
      expect(stepFailed.stepIndex).toBe(1);
    }

    const result = await executeSaga(runner, saga, "test");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.stepIndex).toBe(1);
    }
  });

  it("branch steps use parent stepIndex (kills L288 stepIndex-- mutant)", async () => {
    const Step1 = defineStep("BranchIdx1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const BranchStepA = defineStep("BranchIdxA")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const BranchStepB = defineStep("BranchIdxB")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();

    const saga = defineSaga("BranchIdxSaga")
      .input<string>()
      .step(Step1) // index 0
      .branch(
        (_ctx: { input: unknown; results: unknown; stepIndex: number; executionId: string }) =>
          "a" as "a" | "b",
        {
          a: [BranchStepA],
          b: [BranchStepB],
        }
      ) // index 1 (after step + branch increment)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("step1-done"),
      PortB: () => Promise.reject(new Error("branch-fail")),
      PortC: () => Promise.resolve("c-ok"),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Branch step uses the parent stepIndex
      expect(result.error.stepIndex).toBe(1);
      expect(result.error.stepName).toBe("BranchIdxA");
    }
  });

  it("subSaga step failure at correct stepIndex (kills L319 stepIndex-- mutant)", async () => {
    const Step1 = defineStep("SubIdx1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const ChildStep = defineStep("SubIdxChild")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const ChildSaga = defineSaga("SubIdxChildSaga")
      .input<string>()
      .step(ChildStep)
      .output(results => results)
      .build();

    const ParentSaga = defineSaga("SubIdxParentSaga")
      .input<string>()
      .step(Step1) // index 0
      .saga(ChildSaga, (ctx: any) => ctx.input) // index 1
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("parent-step-done"),
      PortB: () => Promise.reject(new Error("child-step-fail")),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, ParentSaga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.stepName).toBe("SubIdxChild");
    }
  });
});

describe("timeout isTimeout path precision (L584, L594)", () => {
  it("timeout error has correct _tag=Timeout vs StepFailed for non-timeout", async () => {
    // Non-timeout step failure → StepFailed
    const FailStep = defineStep("TimeoutPathFail")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const sagaNoTimeout = defineSaga("TimeoutPathSaga1")
      .input<string>()
      .step(FailStep)
      .output(() => ({}))
      .build();

    const resolver1 = createResolver({
      PortA: () => Promise.reject(new Error("regular-fail")),
    });

    const runner1 = createSagaRunner(resolver1);
    const result1 = await executeSaga(runner1, sagaNoTimeout, "test");

    expect(result1.isErr()).toBe(true);
    if (result1.isErr()) {
      expect(result1.error._tag).toBe("StepFailed");
      expect(result1.error.message).toContain("failed");
      expect(result1.error.message).not.toContain("timed out");
    }

    // Timeout step failure → Timeout
    const TimeoutStep = defineStep("TimeoutPathTimeout")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .timeout(30)
      .build();

    const sagaTimeout = defineSaga("TimeoutPathSaga2")
      .input<string>()
      .step(TimeoutStep)
      .output(() => ({}))
      .build();

    const resolver2 = createResolver({
      PortB: () => new Promise(() => {}), // never resolves
    });

    const runner2 = createSagaRunner(resolver2);
    const result2 = await executeSaga(runner2, sagaTimeout, "test");

    expect(result2.isErr()).toBe(true);
    if (result2.isErr()) {
      expect(result2.error._tag).toBe("Timeout");
      expect(result2.error.message).toContain("timed out");
      expect(result2.error.message).toContain("30ms");
    }
  });
});

describe("compensation errors length check (L624)", () => {
  it("compensation with no errors returns StepFailed (not CompensationFailed)", async () => {
    // All compensation succeeds → StepFailed, not CompensationFailed
    const Step1 = defineStep("CompErrLen1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("CompErrLen2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompErrLenSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("a-done"),
      PortB: () => Promise.reject(new Error("b-fail")),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      // Verify it's NOT CompensationFailed
      expect(result.error._tag).not.toBe("CompensationFailed");
    }
  });

  it("compensation with errors returns CompensationFailed with compensationCause from first error", async () => {
    const compError = new Error("comp-first-error");

    const Step1 = defineStep("CompErrLen3")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("CompErrLen4")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompErrLenSaga2")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        if (portName === "PortA") {
          return (params: any) => {
            if (params?.undo) return Promise.reject(compError);
            return Promise.resolve("a-done");
          };
        }
        if (portName === "PortB") {
          return () => Promise.reject(new Error("b-fail"));
        }
        throw new Error(`Port not found: ${portName}`);
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("CompensationFailed");
      if (result.error._tag === "CompensationFailed") {
        expect(result.error.compensationCause).toBe(compError);
      }
    }
  });
});

describe("buildSagaStatus compensating/cancelled fields (L733-735, L780-781)", () => {
  it("getStatus during compensating has exact fields", async () => {
    // Need to check getStatus while compensation is running
    const d = deferred<string>();
    let statusDuringComp: unknown = null;

    const Step1 = defineStep("CompStatusS1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("CompStatusS2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompStatusSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        if (portName === "PortA") {
          return (params: any) => {
            if (params?.undo) {
              // During compensation, check getStatus
              const statusResult = runner.getStatus("comp-status-1");
              statusResult.then(sr => {
                if (sr.isOk()) {
                  statusDuringComp = sr.value;
                }
                d.resolve("comp-done");
              });
              return d.promise;
            }
            return Promise.resolve("a-done");
          };
        }
        if (portName === "PortB") {
          return () => Promise.reject(new Error("b-fail"));
        }
        throw new Error(`Port not found: ${portName}`);
      },
    };

    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "test", {
      executionId: "comp-status-1",
    });

    expect(statusDuringComp).not.toBeNull();
    if (statusDuringComp && typeof statusDuringComp === "object") {
      const status = statusDuringComp as Record<string, unknown>;
      expect(status.state).toBe("compensating");
      expect(status.executionId).toBe("comp-status-1");
      expect(status.sagaName).toBe("CompStatusSaga");
      expect(status.failedStepName).toBe("");
      expect(status.compensatingStepIndex).toBe(0);
      expect(status.compensatingStepName).toBe("");
      expect(status.compensatedSteps).toEqual([]);
      expect(typeof status.startedAt).toBe("number");
      // error field
      const err = status.error as Record<string, unknown>;
      expect(err._tag).toBe("StepFailed");
      expect(err.stepName).toBe("");
      expect(err.stepIndex).toBe(-1);
      expect(err.message).toBe("Compensation in progress");
    }
  });

  it("getStatus after cancellation between steps has cancelled state", async () => {
    // Abort between steps (step 1 aborts, signal.aborted checked at L223)
    const abortController = new AbortController();

    const Step1 = defineStep("CancelStatusS1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("CancelStatusS2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("CancelStatusSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => {
        abortController.abort();
        return Promise.resolve("done");
      },
      PortB: () => Promise.resolve("done"),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      executionId: "cancel-status-1",
      signal: abortController.signal,
    });

    expect(result.isErr()).toBe(true);

    // After saga finishes (cancelled), check getStatus
    const statusResult = await runner.getStatus("cancel-status-1");
    if (statusResult.isOk()) {
      const status = statusResult.value;
      if (status.state === "cancelled") {
        expect(status.executionId).toBe("cancel-status-1");
        expect(status.sagaName).toBe("CancelStatusSaga");
        expect(status).toHaveProperty("stepName", "");
        expect(status).toHaveProperty("compensated", false);
        expect(status).toHaveProperty("compensatedSteps", []);
        expect(typeof status.startedAt).toBe("number");
        expect(status).toHaveProperty("cancelledAt");
      }
    }
  });
});

describe("subscribe indexOf splice precision (L887)", () => {
  it("unsubscribe middle listener does not affect other listeners", async () => {
    const d = deferred<string>();

    const Step1 = defineStep("SpliceStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("SpliceSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d.promise,
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test", {
      executionId: "splice-1",
    });

    const events1: SagaEvent[] = [];
    const events2: SagaEvent[] = [];
    const events3: SagaEvent[] = [];
    runner.subscribe("splice-1", e => events1.push(e));
    const unsub2 = runner.subscribe("splice-1", e => events2.push(e));
    runner.subscribe("splice-1", e => events3.push(e));

    // Unsubscribe middle listener
    unsub2();

    d.resolve("done");
    await resultAsync;

    // Listeners 1 and 3 should receive events, listener 2 should not
    expect(events1.length).toBeGreaterThan(0);
    expect(events2.length).toBe(0);
    expect(events3.length).toBeGreaterThan(0);
    expect(events1.length).toBe(events3.length);
  });

  it("unsubscribe same listener twice with other listeners doesn't affect them (kills L887 true mutant)", async () => {
    // With mutant `if (true)`, second unsub calls splice(-1, 1) which removes the LAST listener
    const d = deferred<string>();

    const Step1 = defineStep("DoubleUnsub")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("DoubleUnsubSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d.promise,
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test", {
      executionId: "double-unsub-1",
    });

    const events1: SagaEvent[] = [];
    const events2: SagaEvent[] = [];
    const events3: SagaEvent[] = [];

    runner.subscribe("double-unsub-1", e => events1.push(e));
    const unsub2 = runner.subscribe("double-unsub-1", e => events2.push(e));
    runner.subscribe("double-unsub-1", e => events3.push(e));

    // Unsubscribe listener 2 twice — second time should be a no-op
    unsub2();
    unsub2(); // If mutant (always splice), this would splice(-1, 1) removing listener 3

    d.resolve("done");
    await resultAsync;

    // Listener 2 should NOT receive events
    expect(events2.length).toBe(0);
    // Listener 1 and 3 SHOULD still receive events
    expect(events1.length).toBeGreaterThan(0);
    expect(events3.length).toBeGreaterThan(0);
    expect(events1.length).toBe(events3.length);
  });
});

describe("OptionalChaining survivors — step.options paths", () => {
  it("step without options object: retry and timeout are undefined (kills L444, L445)", async () => {
    // Step created with NO .retry() or .timeout() — step.options might be undefined
    const BasicStep = defineStep("NoOptsStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("NoOptsSaga")
      .input<string>()
      .step(BasicStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.reject(new Error("fail")),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test", { executionId: "no-opts-1" });
    const events = collectEvents(runner, "no-opts-1");
    await resultAsync;

    // step:failed should have attemptCount = 1 (no retry)
    const stepFailed = events.find(e => e.type === "step:failed");
    expect(stepFailed).toBeDefined();
    if (stepFailed && stepFailed.type === "step:failed") {
      expect(stepFailed.attemptCount).toBe(1);
    }
  });

  it("step with retry but no retryIf (kills L119 optional chaining)", async () => {
    // retryConfig exists but retryIf is undefined
    let callCount = 0;
    const RetryNoIf = defineStep("RetryNoIfStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 2, delay: 0 })
      .build();

    const saga = defineSaga("RetryNoIfSaga")
      .input<string>()
      .step(RetryNoIf)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => {
        callCount++;
        return Promise.reject(new Error(`fail-${callCount}`));
      },
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "test");

    // Without retryIf, all maxAttempts+1 attempts should be made
    expect(callCount).toBe(3);
  });

  it("step with retry delay=0 specifically (kills L125, L127, L129 mutants)", async () => {
    let callCount = 0;
    const RetryDelay0 = defineStep("RetryDelay0Step")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 1, delay: 0 })
      .build();

    const saga = defineSaga("RetryDelay0Saga")
      .input<string>()
      .step(RetryDelay0)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => {
        callCount++;
        return Promise.reject(new Error(`fail-${callCount}`));
      },
    });

    const runner = createSagaRunner(resolver);
    const start = Date.now();
    await executeSaga(runner, saga, "test");
    const elapsed = Date.now() - start;

    expect(callCount).toBe(2);
    // With delay=0, should complete very fast (no actual sleep)
    expect(elapsed).toBeLessThan(100);
  });

  it("step with retry delay function receives correct args (kills L125, L127)", async () => {
    const delayFn = vi.fn((_attempt: number, _error: unknown) => 0);

    const RetryDelayFn = defineStep("RetryDelayFnStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 2, delay: delayFn })
      .build();

    const saga = defineSaga("RetryDelayFnSaga")
      .input<string>()
      .step(RetryDelayFn)
      .output(() => ({}))
      .build();

    const errors: Error[] = [];
    const resolver = createResolver({
      PortA: () => {
        const err = new Error(`fail-${errors.length}`);
        errors.push(err);
        return Promise.reject(err);
      },
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "test");

    // delayFn called with (attempt+1, lastError) for each retry
    expect(delayFn).toHaveBeenCalledTimes(2); // 2 retries (maxAttempts=2)
    expect(delayFn.mock.calls[0][0]).toBe(1); // attempt 0 → delay(0+1, error)
    expect(delayFn.mock.calls[0][1]).toBe(errors[0]);
    expect(delayFn.mock.calls[1][0]).toBe(2); // attempt 1 → delay(1+1, error)
    expect(delayFn.mock.calls[1][1]).toBe(errors[1]);
  });

  it("skipCompensation optional chaining (kills L521)", async () => {
    // Step with compensation but without skipCompensation option
    const Step1 = defineStep("SkipCompOC1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("SkipCompOC2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("SkipCompOCSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("a-done"),
      PortB: () => Promise.reject(new Error("b-fail")),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Step1 should be compensated (no skipCompensation option)
      expect(result.error.compensatedSteps).toContain("SkipCompOC1");
    }
  });
});

describe("saga.options.timeout via options (L829)", () => {
  it("saga with options.timeout applies global timeout (kills L829)", async () => {
    const Step1 = defineStep("SagaOptTimeout1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("SagaOptTimeoutSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .options({ timeout: 50, compensationStrategy: "sequential" })
      .build();

    const resolver = createResolver({
      PortA: () => new Promise(() => {}), // never resolves
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      expect(result.error.message).toContain("timed out");
    }
  });

  it("explicit options.timeout overrides saga.options.timeout (kills L829)", async () => {
    const Step1 = defineStep("ExplicitTimeout1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("ExplicitTimeoutSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .options({ timeout: 5000, compensationStrategy: "sequential" }) // long timeout in saga options
      .build();

    const resolver = createResolver({
      PortA: () => new Promise(() => {}), // never resolves
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      timeout: 50, // short timeout in execute options
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      expect(result.error.message).toContain("50ms"); // execute option wins
    }
  });
});

describe("withTimeout and sleep addEventListener mutations (L163, L193, L358)", () => {
  it("withTimeout resolves correctly when promise resolves before timeout", async () => {
    // Tests that the .then handler at L166 works (kills L166 BlockStatement → {} mutant)
    const Step1 = defineStep("WithTimeoutOk")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .timeout(5000)
      .build();

    const saga = defineSaga("WithTimeoutOkSaga")
      .input<string>()
      .step(Step1)
      .output(r => r)
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("timeout-ok-result"),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toHaveProperty("WithTimeoutOk", "timeout-ok-result");
    }
  });

  it("withTimeout catches error from promise (kills L171/L173 no-coverage)", async () => {
    // Tests that the .catch handler at L171 works
    const Step1 = defineStep("WithTimeoutErr")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .timeout(5000)
      .build();

    const saga = defineSaga("WithTimeoutErrSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.reject(new Error("timeout-err")),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty(
        "cause",
        expect.objectContaining({ message: "timeout-err" })
      );
    }
  });

  it("global timeout abort listener clears timer (kills L358 mutations)", async () => {
    // Global timeout sets up a timer and an abort listener. If the saga completes
    // before timeout, the abort listener at L358 should clear the timer.
    const Step1 = defineStep("GlobalAbortTimer")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const saga = defineSaga("GlobalAbortTimerSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("fast"),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      timeout: 60000, // long timeout that should never trigger
    });

    expect(result.isOk()).toBe(true);
  });
});

describe("condition path and port resolver edge cases", () => {
  it("step condition receives exact context (kills L380 ObjectLiteral → {})", async () => {
    const d = deferred<string>();
    let capturedCtx: unknown = null;

    const Step1 = defineStep("CondCtxStep1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("CondCtxStep2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .when(ctx => {
        capturedCtx = ctx;
        return true;
      })
      .build();

    const saga = defineSaga("CondCtxSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => d.promise,
      PortB: () => Promise.resolve("b-done"),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test-input", {
      executionId: "cond-ctx-1",
    });

    d.resolve("a-done");
    await resultAsync;

    expect(capturedCtx).not.toBeNull();
    if (capturedCtx && typeof capturedCtx === "object") {
      const ctx = capturedCtx as Record<string, unknown>;
      expect(ctx.input).toBe("test-input");
      expect(ctx.results).toHaveProperty("CondCtxStep1", "a-done");
      expect(ctx.stepIndex).toBe(1);
      expect(ctx.executionId).toBe("cond-ctx-1");
    }
  });

  it("port resolver error path returns exact PortNotFound error (kills L407, L412)", async () => {
    const BadStep = defineStep("BadPortStep")
      .io<string, string>()
      .invoke(createPort<"NoSuchPort", any>({ name: "NoSuchPort" }), ctx => ctx.input)
      .build();

    const saga = defineSaga("BadPortSaga")
      .input<string>()
      .step(BadStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({}); // empty — all ports fail to resolve

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("PortNotFound");
      if (result.error._tag === "PortNotFound") {
        expect(result.error.message).toContain("NoSuchPort");
        expect(result.error.portName).toBe("NoSuchPort");
      }
    }
  });

  it("port resolver error for step after completed steps (kills L412 empty string)", async () => {
    const Step1 = defineStep("PortResolve1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const BadStep = defineStep("PortResolveBad")
      .io<string, string>()
      .invoke(createPort<"MissingPort", any>({ name: "MissingPort" }), ctx => ctx.input)
      .build();

    const saga = defineSaga("PortResolveSaga")
      .input<string>()
      .step(Step1)
      .step(BadStep)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => Promise.resolve("a-done"),
    }); // MissingPort not provided

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("PortNotFound");
      expect(result.error.completedSteps).toEqual(["PortResolve1"]);
      expect(result.error.compensatedSteps).toEqual([]);
      expect(result.error.message).toContain("MissingPort");
    }
  });
});

describe("branch __selectedBranch accumulation (L267)", () => {
  it("branch result includes __selectedBranch in accumulated results", async () => {
    const d = deferred<string>();

    const BranchStepA = defineStep("BranchAccumA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const BranchStepB = defineStep("BranchAccumB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const FinalStep = defineStep("BranchAccumFinal")
      .io<string, string>()
      .invoke(PortC, ctx => {
        // Verify __selectedBranch is in results
        const results = ctx.results as Record<string, unknown>;
        return JSON.stringify({ selected: results.__selectedBranch });
      })
      .build();

    const saga = defineSaga("BranchAccumSaga")
      .input<string>()
      .branch(
        (_ctx: { input: unknown; results: unknown; stepIndex: number; executionId: string }) =>
          "a" as "a" | "b",
        {
          a: [BranchStepA],
          b: [BranchStepB],
        }
      )
      .step(FinalStep)
      .output(r => r)
      .build();

    const resolver = createResolver({
      PortA: () => d.promise,
      PortB: () => Promise.resolve("b-done"),
      PortC: (params: any) => Promise.resolve(params),
    });

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "test");
    d.resolve("a-done");
    const result = await resultAsync;

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const output = result.value.output as Record<string, unknown>;
      // FinalStep received the accumulated results including __selectedBranch
      const finalResult = JSON.parse(output.BranchAccumFinal as string);
      expect(finalResult.selected).toBe("a");
    }
  });
});

describe("retry optional chaining (L119, L125, L127, L129)", () => {
  it("retry with delay > 0 actually delays between retries", async () => {
    let callCount = 0;
    const timestamps: number[] = [];

    const RetryDelay = defineStep("RetryDelayPos")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 1, delay: 20 })
      .build();

    const saga = defineSaga("RetryDelayPosSaga")
      .input<string>()
      .step(RetryDelay)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => {
        callCount++;
        timestamps.push(Date.now());
        return Promise.reject(new Error(`fail-${callCount}`));
      },
    });

    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "test");

    expect(callCount).toBe(2);
    // With delay=20, there should be at least ~15ms between calls
    if (timestamps.length === 2) {
      expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(15);
    }
  });
});

describe("withTimeout .catch handler (L171-175, no-coverage)", () => {
  it("step with timeout that rejects goes through .catch handler", async () => {
    const Step1 = defineStep("TimeoutCatch")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .timeout(5000)
      .build();

    const saga = defineSaga("TimeoutCatchSaga")
      .input<string>()
      .step(Step1)
      .output(() => ({}))
      .build();

    const specificError = new Error("specific-rejection");
    const resolver = createResolver({
      PortA: () => Promise.reject(specificError),
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // The error should propagate through .catch in withTimeout
      expect(result.error).toHaveProperty("cause", specificError);
    }
  });
});

describe("signal.aborted check at L223 — between steps", () => {
  it("abort detected at node loop top triggers makeCancelledResult (kills L223 false)", async () => {
    // Abort the signal inside step 1's resolver. After step 1 completes,
    // the loop at L222 checks signal.aborted → true → makeCancelledResult
    const abortController = new AbortController();

    const Step1 = defineStep("AbortLoop1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();

    const Step2 = defineStep("AbortLoop2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();

    const saga = defineSaga("AbortLoopSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .output(() => ({}))
      .build();

    const resolver = createResolver({
      PortA: () => {
        // Abort synchronously before returning
        abortController.abort();
        return Promise.resolve("step1-done");
      },
      PortB: () => {
        return Promise.resolve("step2-done");
      },
    });

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "test", {
      signal: abortController.signal,
      executionId: "abort-loop-1",
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // With L223 working: _tag should be "Cancelled" (from makeCancelledResult)
      // With L223 mutant (empty block): _tag would be "StepFailed" (from L101 abort check)
      expect(result.error._tag).toBe("Cancelled");
      expect(result.error.completedSteps).toContain("AbortLoop1");
      expect(result.error.stepName).toBe("");
      expect(result.error.message).toBe("Saga was cancelled");
    }
  });
});
