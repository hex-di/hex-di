/**
 * Runtime Mutation Tests
 *
 * Targeted tests to kill surviving mutants in:
 * - runtime/saga-executor.ts
 * - runtime/events.ts
 * - runtime/compensation-handler.ts
 * - runtime/step-executor.ts
 * - runtime/checkpointing.ts
 * - runtime/status-builder.ts
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../src/runtime/runner.js";
import { resolveStepByName } from "../src/runtime/saga-executor.js";
import { emit, buildExecutionTrace } from "../src/runtime/events.js";
import { invokePort, TimeoutSignal } from "../src/runtime/step-executor.js";
import { toCompletedStepState } from "../src/runtime/checkpointing.js";
import { buildSagaStatus } from "../src/runtime/status-builder.js";
import type { PortResolver, SagaEvent, SagaEventListener } from "../src/runtime/types.js";
import type { ExecutionState } from "../src/runtime/execution-state.js";
import type { SagaNode } from "../src/saga/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const PortA = createPort<"PortA", any>({ name: "PortA" });
const PortB = createPort<"PortB", any>({ name: "PortB" });
const PortC = createPort<"PortC", any>({ name: "PortC" });
const PortD = createPort<"PortD", any>({ name: "PortD" });

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

function findEvent<T extends SagaEvent["type"]>(
  events: SagaEvent[],
  type: T
): Extract<SagaEvent, { type: T }> {
  const event = events.find(e => e.type === type);
  expect(event, `Expected event of type "${type}" to be present`).toBeDefined();
  return event as Extract<SagaEvent, { type: T }>;
}

function findAllEvents<T extends SagaEvent["type"]>(
  events: SagaEvent[],
  type: T
): Array<Extract<SagaEvent, { type: T }>> {
  return events.filter(e => e.type === type) as Array<Extract<SagaEvent, { type: T }>>;
}

function createMockExecutionState(overrides?: Partial<ExecutionState>): ExecutionState {
  return {
    executionId: "test-exec",
    sagaName: "TestSaga",
    input: {},
    accumulatedResults: {},
    completedSteps: [],
    sagaOptions: { compensationStrategy: "sequential" },
    status: "running",
    abortController: new AbortController(),
    listeners: [],
    sagaStartTime: Date.now(),
    stepsExecuted: 0,
    stepsSkipped: 0,
    metadata: undefined,
    trace: { stepTraces: [], compensationTrace: undefined },
    ...overrides,
  };
}

// =============================================================================
// 1. saga-executor.ts - executeSagaInternal
// =============================================================================

describe("saga-executor: executeSagaInternal", () => {
  describe("saga:started event", () => {
    it("emits saga:started with correct sagaName, executionId, input, stepCount", async () => {
      const StepOne = defineStep("StepOne")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("MySaga")
        .input<string>()
        .step(StepOne)
        .output(r => r.StepOne)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "result-1" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "hello", {
        executionId: "exec-started-1",
        listeners: [e => events.push(e)],
      });
      const started = findEvent(events, "saga:started");
      expect(started.type).toBe("saga:started");
      expect(started.sagaName).toBe("MySaga");
      expect(started.executionId).toBe("exec-started-1");
      expect(started.input).toBe("hello");
      expect(started.stepCount).toBe(1);
      expect(started.timestamp).toBeTypeOf("number");
    });

    it("includes metadata in saga:started event", async () => {
      const StepOne = defineStep("MetaStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("MetaSaga")
        .input<string>()
        .step(StepOne)
        .output(r => r.MetaStep)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "ok" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "input", {
        executionId: "meta-1",
        listeners: [e => events.push(e)],
        metadata: { region: "us-east" },
      });
      const started = findEvent(events, "saga:started");
      expect(started.metadata).toEqual({ region: "us-east" });
    });
  });

  describe("saga:completed event", () => {
    it("emits saga:completed with stepsExecuted, stepsSkipped, totalDurationMs", async () => {
      const S1 = defineStep("S1")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const S2 = defineStep("S2")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .when(() => false)
        .build();
      const S3 = defineStep("S3")
        .io<string, string>()
        .invoke(PortC, ctx => ctx.input)
        .build();
      const saga = defineSaga("CompletedSaga")
        .input<string>()
        .step(S1)
        .step(S2)
        .step(S3)
        .output(r => r.S1)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => "a",
        PortB: async () => "b",
        PortC: async () => "c",
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "input", {
        executionId: "completed-1",
        listeners: [e => events.push(e)],
      });
      const completed = findEvent(events, "saga:completed");
      expect(completed.type).toBe("saga:completed");
      expect(completed.executionId).toBe("completed-1");
      expect(completed.sagaName).toBe("CompletedSaga");
      expect(completed.stepsExecuted).toBe(2);
      expect(completed.stepsSkipped).toBe(1);
      expect(completed.totalDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("sequential step execution", () => {
    it("accumulates results from each step by step name", async () => {
      const StepA = defineStep("StepA")
        .io<string, { valueA: string }>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const StepB = defineStep("StepB")
        .io<string, { valueB: string }>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("AccumSaga")
        .input<string>()
        .step(StepA)
        .step(StepB)
        .output(r => ({ a: r.StepA.valueA, b: r.StepB.valueB }))
        .build();
      const resolver = createResolver({
        PortA: async () => ({ valueA: "alpha" }),
        PortB: async () => ({ valueB: "beta" }),
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "accum-1" });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toEqual({ a: "alpha", b: "beta" });
      }
    });

    it("increments stepIndex for each sequential step", async () => {
      const S0 = defineStep("S0")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const S1a = defineStep("S1a")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("IndexSaga")
        .input<string>()
        .step(S0)
        .step(S1a)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "a", PortB: async () => "b" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "x", {
        executionId: "idx-1",
        listeners: [e => events.push(e)],
      });
      const stepStartedEvents = findAllEvents(events, "step:started");
      expect(stepStartedEvents.length).toBe(2);
      expect(stepStartedEvents[0].stepIndex).toBe(0);
      expect(stepStartedEvents[1].stepIndex).toBe(1);
    });
  });

  describe("step:started and step:completed events", () => {
    it("emits step:started with correct stepName, stepIndex, sagaName", async () => {
      const MyStep = defineStep("MyStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("StepEventSaga")
        .input<string>()
        .step(MyStep)
        .output(r => r.MyStep)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "result" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "step-event-1",
        listeners: [e => events.push(e)],
      });
      const stepStarted = findEvent(events, "step:started");
      expect(stepStarted.stepName).toBe("MyStep");
      expect(stepStarted.stepIndex).toBe(0);
      expect(stepStarted.sagaName).toBe("StepEventSaga");
      expect(stepStarted.executionId).toBe("step-event-1");
      const stepCompleted = findEvent(events, "step:completed");
      expect(stepCompleted.stepName).toBe("MyStep");
      expect(stepCompleted.stepIndex).toBe(0);
      expect(stepCompleted.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("step:skipped event", () => {
    it("emits step:skipped when condition returns false", async () => {
      const SkipMe = defineStep("SkipMe")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .when(() => false)
        .build();
      const saga = defineSaga("SkipSaga")
        .input<string>()
        .step(SkipMe)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "nope" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "skip-1",
        listeners: [e => events.push(e)],
      });
      const skipped = findEvent(events, "step:skipped");
      expect(skipped.type).toBe("step:skipped");
      expect(skipped.stepName).toBe("SkipMe");
      expect(skipped.stepIndex).toBe(0);
      expect(skipped.reason).toBe("condition-false");
      expect(skipped.sagaName).toBe("SkipSaga");
      expect(skipped.executionId).toBe("skip-1");
    });

    it("increments stepsSkipped counter when step is skipped", async () => {
      const Skip1 = defineStep("Skip1")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .when(() => false)
        .build();
      const Skip2 = defineStep("Skip2")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .when(() => false)
        .build();
      const saga = defineSaga("DoubleSkip")
        .input<string>()
        .step(Skip1)
        .step(Skip2)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "nope", PortB: async () => "nope" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "double-skip",
        listeners: [e => events.push(e)],
      });
      const completed = findEvent(events, "saga:completed");
      expect(completed.stepsSkipped).toBe(2);
      expect(completed.stepsExecuted).toBe(0);
    });
  });

  describe("step:failed event", () => {
    it("emits step:failed with error, attemptCount, retriesExhausted", async () => {
      const FailStep = defineStep("FailStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("FailSaga")
        .input<string>()
        .step(FailStep)
        .output(r => r.FailStep)
        .build();
      const events: SagaEvent[] = [];
      const testError = new Error("boom");
      const resolver = createResolver({
        PortA: async () => {
          throw testError;
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "fail-1",
        listeners: [e => events.push(e)],
      });
      const failed = findEvent(events, "step:failed");
      expect(failed.type).toBe("step:failed");
      expect(failed.stepName).toBe("FailStep");
      expect(failed.stepIndex).toBe(0);
      expect(failed.attemptCount).toBe(1);
      expect(failed.retriesExhausted).toBe(true);
      expect(failed.error).toBe(testError);
    });

    it("emits step:failed with correct attemptCount when retries are configured", async () => {
      let callCount = 0;
      const RetryFailStep = defineStep("RetryFail")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .retry({ maxAttempts: 2, delay: 0 })
        .build();
      const saga = defineSaga("RetryFailSaga")
        .input<string>()
        .step(RetryFailStep)
        .output(r => r.RetryFail)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => {
          callCount++;
          throw new Error("retry-fail");
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "retry-fail-1",
        listeners: [e => events.push(e)],
      });
      const failed = findEvent(events, "step:failed");
      expect(failed.attemptCount).toBe(3);
      expect(callCount).toBe(3);
    });
  });

  describe("cancellation", () => {
    it("returns cancelled error when saga is cancelled via runner.cancel during execution", async () => {
      // Use a 2-step saga. Step 1's adapter cancels the runner, so when the loop
      // checks signal.aborted before step 2, it returns makeCancelledResult.
      let runnerRef: ReturnType<typeof createSagaRunner>;
      const Step1 = defineStep("CancelStep1")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const Step2 = defineStep("CancelStep2")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("CancelSaga")
        .input<string>()
        .step(Step1)
        .step(Step2)
        .output(r => r.CancelStep1)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => {
          // Cancel while step 1 is running; abort signal will be checked before step 2
          await runnerRef.cancel("cancel-1");
          return "step1-done";
        },
        PortB: async () => "step2-should-not-run",
      });
      runnerRef = createSagaRunner(resolver);
      const result = await executeSaga(runnerRef, saga, "in", {
        executionId: "cancel-1",
        listeners: [e => events.push(e)],
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Cancelled");
        expect(result.error.message).toBe("Saga was cancelled");
      }
      const cancelled = findEvent(events, "saga:cancelled");
      expect(cancelled.type).toBe("saga:cancelled");
      expect(cancelled.compensated).toBe(false);
      expect(cancelled.executionId).toBe("cancel-1");
      expect(cancelled.sagaName).toBe("CancelSaga");
    });
  });

  describe("output mapper failure", () => {
    it("returns StepFailed error when output mapper throws", async () => {
      const OkStep = defineStep("OkStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("OutputFailSaga")
        .input<string>()
        .step(OkStep)
        .output(() => {
          throw new Error("mapper-broke");
        })
        .build();
      const resolver = createResolver({ PortA: async () => "ok" });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "output-fail-1" });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("StepFailed");
        expect(result.error.message).toContain("Output mapper failed");
        expect(result.error.stepIndex).toBe(-1);
        expect(result.error.stepName).toBe("");
      }
    });
  });

  describe("port resolution failure", () => {
    it("returns PortNotFound error when port cannot be resolved", async () => {
      const MissingPort = createPort<"MissingPort", any>({ name: "MissingPort" });
      const BadStep = defineStep("BadStep")
        .io<string, string>()
        .invoke(MissingPort, ctx => ctx.input)
        .build();
      const saga = defineSaga("MissingPortSaga")
        .input<string>()
        .step(BadStep)
        .output(r => r.BadStep)
        .build();
      const resolver = createResolver({});
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "port-fail-1" });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("PortNotFound");
        if (result.error._tag === "PortNotFound") {
          expect(result.error.portName).toBe("MissingPort");
          expect(result.error.message).toContain("MissingPort");
          expect(result.error.message).toContain("not found in container");
        }
      }
    });
  });

  describe("global timeout", () => {
    it("returns Timeout error when global timeout expires", async () => {
      const SlowStep = defineStep("SlowStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("TimeoutSaga")
        .input<string>()
        .step(SlowStep)
        .output(r => r.SlowStep)
        .build();
      const resolver = createResolver({
        PortA: () => new Promise(resolve => setTimeout(resolve, 5000)),
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", {
        executionId: "timeout-1",
        timeout: 50,
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Timeout");
        expect(result.error.message).toContain("timed out");
        expect(result.error.message).toContain("50");
      }
    });
  });

  describe("parallel steps", () => {
    it("executes parallel steps and accumulates all results", async () => {
      const ParA = defineStep("ParA")
        .io<string, { pa: string }>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const ParB = defineStep("ParB")
        .io<string, { pb: string }>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("ParallelSaga")
        .input<string>()
        .parallel([ParA, ParB])
        .output(r => ({ a: r.ParA.pa, b: r.ParB.pb }))
        .build();
      const resolver = createResolver({
        PortA: async () => ({ pa: "valA" }),
        PortB: async () => ({ pb: "valB" }),
      });
      const events: SagaEvent[] = [];
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", {
        executionId: "par-1",
        listeners: [e => events.push(e)],
      });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toEqual({ a: "valA", b: "valB" });
      }
      expect(findAllEvents(events, "step:started").length).toBe(2);
      expect(findAllEvents(events, "step:completed").length).toBe(2);
    });

    it("returns error when any parallel step fails", async () => {
      const ParOk = defineStep("ParOk")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const ParFail = defineStep("ParFail")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("ParFailSaga")
        .input<string>()
        .parallel([ParOk, ParFail])
        .output(() => "done")
        .build();
      const resolver = createResolver({
        PortA: async () => "ok",
        PortB: async () => {
          throw new Error("par-fail");
        },
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "par-fail-1" });
      expect(result.isErr()).toBe(true);
    });
  });

  describe("branching", () => {
    it("selects and executes the correct branch", async () => {
      const LeftStep = defineStep("LeftStep")
        .io<{ route: string }, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const RightStep = defineStep("RightStep")
        .io<{ route: string }, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("BranchSaga")
        .input<{ route: string }>()
        .branch(ctx => ctx.input.route, { left: [LeftStep], right: [RightStep] })
        .output(r => r)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => "left-result",
        PortB: async () => "right-result",
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(
        runner,
        saga,
        { route: "left" },
        { executionId: "branch-1", listeners: [e => events.push(e)] }
      );
      expect(result.isOk()).toBe(true);
      const stepStarted = findEvent(events, "step:started");
      expect(stepStarted.stepName).toBe("LeftStep");
    });

    it("does not execute steps when selected branch key has no matching branch", async () => {
      const SomeBranchStep = defineStep("SomeBranch")
        .io<{ route: string }, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("NoMatchBranch")
        .input<{ route: string }>()
        .branch(ctx => ctx.input.route, { only: [SomeBranchStep] })
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "nope" });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(
        runner,
        saga,
        { route: "nonexistent" },
        { executionId: "no-match-1", listeners: [e => events.push(e)] }
      );
      expect(result.isOk()).toBe(true);
      expect(findAllEvents(events, "step:started").length).toBe(0);
    });
  });

  describe("sub-sagas", () => {
    it("executes sub-saga and accumulates its output", async () => {
      const SubStep = defineStep("SubStep")
        .io<string, { subVal: string }>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const SubSaga = defineSaga("SubSaga")
        .input<string>()
        .step(SubStep)
        .output(r => r.SubStep)
        .build();
      const ParentStep = defineStep("ParentStep")
        .io<string, { parentVal: string }>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const ParentSaga = defineSaga("ParentSaga")
        .input<string>()
        .step(ParentStep)
        .saga(SubSaga, ctx => ctx.input)
        .output(r => ({ parent: r.ParentStep.parentVal, sub: r.SubSaga }))
        .build();
      const resolver = createResolver({
        PortA: async () => ({ subVal: "sub-output" }),
        PortB: async () => ({ parentVal: "parent-output" }),
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, ParentSaga, "input", { executionId: "sub-saga-1" });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toEqual({
          parent: "parent-output",
          sub: { subVal: "sub-output" },
        });
      }
    });

    it("returns error if sub-saga step fails", async () => {
      const FailSubStep = defineStep("FailSubStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const FailSubSaga = defineSaga("FailSubSaga")
        .input<string>()
        .step(FailSubStep)
        .output(r => r.FailSubStep)
        .build();
      const saga = defineSaga("ParentWithFailSub")
        .input<string>()
        .saga(FailSubSaga, ctx => ctx.input)
        .output(r => r)
        .build();
      const resolver = createResolver({
        PortA: async () => {
          throw new Error("sub-fail");
        },
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input", { executionId: "sub-fail-1" });
      expect(result.isErr()).toBe(true);
    });
  });

  describe("hooks: beforeStep and afterStep", () => {
    it("calls beforeStep hook with correct context", async () => {
      const HookStep = defineStep("HookStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const hookCalls: any[] = [];
      const saga = defineSaga("HookSaga")
        .input<string>()
        .step(HookStep)
        .output(r => r.HookStep)
        .options({
          compensationStrategy: "sequential",
          hooks: { beforeStep: ctx => hookCalls.push({ hook: "before", ...ctx }) },
        })
        .build();
      const resolver = createResolver({ PortA: async () => "ok" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", { executionId: "hook-1" });
      expect(hookCalls.length).toBe(1);
      expect(hookCalls[0].hook).toBe("before");
      expect(hookCalls[0].stepName).toBe("HookStep");
      expect(hookCalls[0].stepIndex).toBe(0);
      expect(hookCalls[0].executionId).toBe("hook-1");
      expect(hookCalls[0].sagaName).toBe("HookSaga");
      expect(hookCalls[0].isCompensation).toBe(false);
    });

    it("calls afterStep hook with result on success", async () => {
      const AfterStep = defineStep("AfterStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const hookCalls: any[] = [];
      const saga = defineSaga("AfterHookSaga")
        .input<string>()
        .step(AfterStep)
        .output(r => r.AfterStep)
        .options({
          compensationStrategy: "sequential",
          hooks: { afterStep: ctx => hookCalls.push(ctx) },
        })
        .build();
      const resolver = createResolver({ PortA: async () => "step-result" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", { executionId: "after-hook-1" });
      expect(hookCalls.length).toBe(1);
      expect(hookCalls[0].stepName).toBe("AfterStep");
      expect(hookCalls[0].result).toBe("step-result");
      expect(hookCalls[0].error).toBeUndefined();
      expect(hookCalls[0].attemptCount).toBe(1);
      expect(hookCalls[0].isCompensation).toBe(false);
      expect(hookCalls[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    it("calls afterStep hook with error on failure", async () => {
      const FailHookStep = defineStep("FailHookStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const hookCalls: any[] = [];
      const saga = defineSaga("FailHookSaga")
        .input<string>()
        .step(FailHookStep)
        .output(r => r.FailHookStep)
        .options({
          compensationStrategy: "sequential",
          hooks: { afterStep: ctx => hookCalls.push(ctx) },
        })
        .build();
      const testErr = new Error("step-error");
      const resolver = createResolver({
        PortA: async () => {
          throw testErr;
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", { executionId: "fail-hook-1" });
      expect(hookCalls.length).toBe(1);
      expect(hookCalls[0].stepName).toBe("FailHookStep");
      expect(hookCalls[0].result).toBeUndefined();
      expect(hookCalls[0].error).toBe(testErr);
      expect(hookCalls[0].isCompensation).toBe(false);
    });

    it("does not abort saga when beforeStep hook throws", async () => {
      const SafeStep = defineStep("SafeStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("HookThrowSaga")
        .input<string>()
        .step(SafeStep)
        .output(r => r.SafeStep)
        .options({
          compensationStrategy: "sequential",
          hooks: {
            beforeStep: () => {
              throw new Error("hook-error");
            },
          },
        })
        .build();
      const resolver = createResolver({ PortA: async () => "still-works" });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "hook-throw-1" });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toBe("still-works");
      }
    });
  });
});

// =============================================================================
// 2. resolveStepByName
// =============================================================================

describe("resolveStepByName", () => {
  it("finds step in a step node", () => {
    const step = defineStep("FindMe")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const nodes: SagaNode[] = [{ _type: "step", step }];
    expect(resolveStepByName(nodes, "FindMe")?.name).toBe("FindMe");
  });

  it("finds step in a parallel node", () => {
    const stepA = defineStep("ParaFind")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const stepB = defineStep("ParaOther")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const nodes: SagaNode[] = [{ _type: "parallel", steps: [stepA, stepB] }];
    expect(resolveStepByName(nodes, "ParaFind")?.name).toBe("ParaFind");
  });

  it("finds step in a branch node", () => {
    const leftStep = defineStep("LeftFind")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const rightStep = defineStep("RightFind")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const nodes: SagaNode[] = [
      {
        _type: "branch",
        selector: () => "left",
        branches: { left: [leftStep], right: [rightStep] },
      },
    ];
    expect(resolveStepByName(nodes, "LeftFind")?.name).toBe("LeftFind");
    expect(resolveStepByName(nodes, "RightFind")?.name).toBe("RightFind");
  });

  it("returns undefined for unknown step name", () => {
    const step = defineStep("Known")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const nodes: SagaNode[] = [{ _type: "step", step }];
    expect(resolveStepByName(nodes, "Unknown")).toBeUndefined();
  });

  it("returns undefined for empty nodes array", () => {
    expect(resolveStepByName([], "Any")).toBeUndefined();
  });
});

// =============================================================================
// 3. events.ts - emit and recordTrace
// =============================================================================

describe("events: emit function", () => {
  it("calls all listeners with the event", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const state = createMockExecutionState({ listeners: [listener1, listener2] });
    const event: SagaEvent = {
      type: "saga:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      timestamp: Date.now(),
      input: {},
      stepCount: 1,
      metadata: undefined,
    };
    emit(state, event);
    expect(listener1).toHaveBeenCalledWith(event);
    expect(listener2).toHaveBeenCalledWith(event);
  });

  it("does not throw when listener throws", () => {
    const throwingListener: SagaEventListener = () => {
      throw new Error("listener-error");
    };
    const normalListener = vi.fn();
    const state = createMockExecutionState({ listeners: [throwingListener, normalListener] });
    const event: SagaEvent = {
      type: "saga:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      timestamp: Date.now(),
      input: {},
      stepCount: 0,
      metadata: undefined,
    };
    expect(() => emit(state, event)).not.toThrow();
    expect(normalListener).toHaveBeenCalled();
  });
});

describe("events: recordTrace via emit", () => {
  it("records step:started trace", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "step:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "MyStep",
      stepIndex: 0,
      timestamp: 1000,
    });
    expect(state.trace.stepTraces.length).toBe(1);
    expect(state.trace.stepTraces[0].stepName).toBe("MyStep");
    expect(state.trace.stepTraces[0].stepIndex).toBe(0);
    expect(state.trace.stepTraces[0].startedAt).toBe(1000);
    expect(state.trace.stepTraces[0].attemptCount).toBe(1);
    expect(state.trace.stepTraces[0].error).toBeUndefined();
    expect(state.trace.stepTraces[0].skippedReason).toBeUndefined();
  });

  it("records step:completed trace", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "step:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "CompStep",
      stepIndex: 0,
      timestamp: 1000,
    });
    emit(state, {
      type: "step:completed",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "CompStep",
      stepIndex: 0,
      timestamp: 1050,
      durationMs: 50,
    });
    expect(state.trace.stepTraces[0].status).toBe("completed");
    expect(state.trace.stepTraces[0].completedAt).toBe(1050);
    expect(state.trace.stepTraces[0].durationMs).toBe(50);
  });

  it("records step:failed trace", () => {
    const state = createMockExecutionState();
    const testError = new Error("test-error");
    emit(state, {
      type: "step:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "FailTraceStep",
      stepIndex: 2,
      timestamp: 2000,
    });
    emit(state, {
      type: "step:failed",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "FailTraceStep",
      stepIndex: 2,
      error: testError,
      attemptCount: 3,
      timestamp: 2100,
      retriesExhausted: true,
    });
    const trace = state.trace.stepTraces[0];
    expect(trace.status).toBe("failed");
    expect(trace.completedAt).toBe(2100);
    expect(trace.durationMs).toBe(100);
    expect(trace.attemptCount).toBe(3);
    expect(trace.error).toBe(testError);
  });

  it("records step:skipped trace", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "step:skipped",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "SkippedStep",
      stepIndex: 1,
      timestamp: 3000,
      reason: "condition-false",
    });
    const trace = state.trace.stepTraces[0];
    expect(trace.stepName).toBe("SkippedStep");
    expect(trace.stepIndex).toBe(1);
    expect(trace.status).toBe("skipped");
    expect(trace.attemptCount).toBe(0);
    expect(trace.skippedReason).toBe("condition-false");
  });

  it("records compensation:started trace", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "compensation:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedStepName: "BadStep",
      failedStepIndex: 2,
      stepsToCompensate: ["Step1", "Step0"],
      timestamp: 5000,
    });
    expect(state.trace.compensationTrace).toBeDefined();
    const ct = state.trace.compensationTrace!;
    expect(ct.triggeredBy).toBe("BadStep");
    expect(ct.triggeredByIndex).toBe(2);
    expect(ct.steps.length).toBe(0);
    expect(ct.startedAt).toBe(5000);
  });

  it("records compensation:step trace", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "compensation:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedStepName: "X",
      failedStepIndex: 0,
      stepsToCompensate: ["CompStep"],
      timestamp: 5000,
    });
    emit(state, {
      type: "compensation:step",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "CompStep",
      stepIndex: 0,
      success: true,
      error: undefined,
      durationMs: 10,
      timestamp: 5010,
    });
    const ct = state.trace.compensationTrace!;
    expect(ct.steps.length).toBe(1);
    expect(ct.steps[0].stepName).toBe("CompStep");
    expect(ct.steps[0].stepIndex).toBe(0);
    expect(ct.steps[0].status).toBe("completed");
    expect(ct.steps[0].completedAt).toBe(5010);
    expect(ct.steps[0].durationMs).toBe(10);
  });

  it("sets compensation:step status to failed when success is false", () => {
    const state = createMockExecutionState();
    const compError = new Error("comp-err");
    emit(state, {
      type: "compensation:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedStepName: "X",
      failedStepIndex: 0,
      stepsToCompensate: ["Fail"],
      timestamp: 5000,
    });
    emit(state, {
      type: "compensation:step",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "Fail",
      stepIndex: 0,
      success: false,
      error: compError,
      durationMs: 5,
      timestamp: 5005,
    });
    const ct = state.trace.compensationTrace!;
    expect(ct.steps[0].status).toBe("failed");
    expect(ct.steps[0].error).toBe(compError);
    expect(ct.status).toBe("failed");
  });

  it("records compensation:completed trace", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "compensation:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedStepName: "X",
      failedStepIndex: 0,
      stepsToCompensate: [],
      timestamp: 5000,
    });
    emit(state, {
      type: "compensation:completed",
      executionId: "test-exec",
      sagaName: "TestSaga",
      compensatedSteps: ["Step1"],
      totalDurationMs: 100,
      timestamp: 5100,
    });
    const ct = state.trace.compensationTrace!;
    expect(ct.completedAt).toBe(5100);
    expect(ct.totalDurationMs).toBe(100);
  });

  it("records compensation:failed trace", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "compensation:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedStepName: "X",
      failedStepIndex: 0,
      stepsToCompensate: [],
      timestamp: 5000,
    });
    emit(state, {
      type: "compensation:failed",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedCompensationStep: "FailComp",
      error: new Error("comp-fail"),
      compensatedSteps: [],
      remainingSteps: ["R1"],
      timestamp: 5200,
    });
    const ct = state.trace.compensationTrace!;
    expect(ct.status).toBe("failed");
    expect(ct.completedAt).toBe(5200);
    expect(ct.totalDurationMs).toBe(200);
  });

  it("does not crash when compensation:step arrives without compensation:started", () => {
    const state = createMockExecutionState();
    expect(() =>
      emit(state, {
        type: "compensation:step",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "X",
        stepIndex: 0,
        success: true,
        error: undefined,
        durationMs: 1,
        timestamp: 1000,
      })
    ).not.toThrow();
    expect(state.trace.compensationTrace).toBeUndefined();
  });
});

describe("events: buildExecutionTrace", () => {
  it("builds frozen trace from running state", () => {
    const state = createMockExecutionState({
      status: "running",
      executionId: "trace-1",
      sagaName: "TraceSaga",
      input: { key: "val" },
      sagaStartTime: 1000,
      metadata: { traceKey: "traceVal" },
    });
    emit(state, {
      type: "step:started",
      executionId: "trace-1",
      sagaName: "TraceSaga",
      stepName: "T1",
      stepIndex: 0,
      timestamp: 1001,
    });
    const trace = buildExecutionTrace(state);
    expect(trace.executionId).toBe("trace-1");
    expect(trace.sagaName).toBe("TraceSaga");
    expect(trace.input).toEqual({ key: "val" });
    expect(trace.status).toBe("running");
    expect(trace.startedAt).toBe(1000);
    expect(trace.completedAt).toBeUndefined();
    expect(trace.totalDurationMs).toBeUndefined();
    expect(trace.metadata).toEqual({ traceKey: "traceVal" });
    expect(trace.steps.length).toBe(1);
    expect(trace.compensation).toBeUndefined();
    expect(Object.isFrozen(trace)).toBe(true);
    expect(Object.isFrozen(trace.steps)).toBe(true);
    expect(Object.isFrozen(trace.steps[0])).toBe(true);
  });

  it("builds trace from completed state", () => {
    const state = createMockExecutionState({ status: "completed", sagaStartTime: 1000 });
    const trace = buildExecutionTrace(state);
    expect(trace.status).toBe("completed");
    expect(trace.completedAt).toBeDefined();
    expect(trace.totalDurationMs).toBeDefined();
    expect(trace.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("builds trace from failed state", () => {
    const trace = buildExecutionTrace(
      createMockExecutionState({ status: "failed", sagaStartTime: 500 })
    );
    expect(trace.status).toBe("failed");
    expect(trace.completedAt).toBeDefined();
  });

  it("builds trace from cancelled state", () => {
    const trace = buildExecutionTrace(
      createMockExecutionState({ status: "cancelled", sagaStartTime: 500 })
    );
    expect(trace.status).toBe("cancelled");
    expect(trace.completedAt).toBeDefined();
  });

  it("includes frozen compensation trace when present", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "compensation:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedStepName: "FailX",
      failedStepIndex: 3,
      stepsToCompensate: ["S0", "S1"],
      timestamp: 2000,
    });
    emit(state, {
      type: "compensation:step",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "S1",
      stepIndex: 1,
      success: true,
      error: undefined,
      durationMs: 5,
      timestamp: 2005,
    });
    emit(state, {
      type: "compensation:completed",
      executionId: "test-exec",
      sagaName: "TestSaga",
      compensatedSteps: ["S1"],
      totalDurationMs: 10,
      timestamp: 2010,
    });
    const trace = buildExecutionTrace(state);
    expect(trace.compensation).toBeDefined();
    expect(trace.compensation!.triggeredBy).toBe("FailX");
    expect(trace.compensation!.triggeredByIndex).toBe(3);
    expect(trace.compensation!.steps.length).toBe(1);
    expect(Object.isFrozen(trace.compensation)).toBe(true);
  });
});

// =============================================================================
// 4. compensation-handler.ts
// =============================================================================

describe("compensation-handler: full compensation flow", () => {
  it("compensates completed steps on failure and emits compensation events", async () => {
    const CompA = defineStep("CompA")
      .io<string, { aResult: string }>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ({ undo: ctx.stepResult }))
      .build();
    const CompB = defineStep("CompB")
      .io<string, { bResult: string }>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CompFlowSaga")
      .input<string>()
      .step(CompA)
      .step(CompB)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => ({ aResult: "a-value" }),
      PortB: async () => {
        throw new Error("b-fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "in", {
      executionId: "comp-flow-1",
      listeners: [e => events.push(e)],
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.stepName).toBe("CompB");
      expect(result.error.compensatedSteps).toContain("CompA");
    }
    const compStarted = findEvent(events, "compensation:started");
    expect(compStarted.failedStepName).toBe("CompB");
    expect(compStarted.failedStepIndex).toBe(1);
    expect(compStarted.stepsToCompensate).toEqual(["CompA"]);
    const sagaFailed = findEvent(events, "saga:failed");
    expect(sagaFailed.type).toBe("saga:failed");
    expect(sagaFailed.failedStepName).toBe("CompB");
    expect(sagaFailed.compensated).toBe(true);
  });

  it("skips steps with skipCompensation in compensation plan", async () => {
    const SkippedComp = defineStep("SkippedComp")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ({ undo: ctx.stepResult }))
      .skipCompensation()
      .build();
    const NormalComp = defineStep("NormalComp")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .compensate(ctx => ({ undo: ctx.stepResult }))
      .build();
    const FailComp = defineStep("FailComp")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();
    const saga = defineSaga("SkipCompSaga")
      .input<string>()
      .step(SkippedComp)
      .step(NormalComp)
      .step(FailComp)
      .output(() => "done")
      .build();
    const resolver = createResolver({
      PortA: async () => "a",
      PortB: async () => "b",
      PortC: async () => {
        throw new Error("c-fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "in", { executionId: "skip-comp-1" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.compensatedSteps).toContain("NormalComp");
      expect(result.error.compensatedSteps).not.toContain("SkippedComp");
    }
  });

  it("beforeCompensation and afterCompensation hooks are invoked", async () => {
    const CompStep = defineStep("HookComp")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ({ undo: ctx.stepResult }))
      .build();
    const FailingStep = defineStep("Failing")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const hookCalls: any[] = [];
    const saga = defineSaga("CompHookSaga")
      .input<string>()
      .step(CompStep)
      .step(FailingStep)
      .output(() => "done")
      .options({
        compensationStrategy: "sequential",
        hooks: {
          beforeCompensation: ctx => hookCalls.push({ hook: "before", ...ctx }),
          afterCompensation: ctx => hookCalls.push({ hook: "after", ...ctx }),
        },
      })
      .build();
    const resolver = createResolver({
      PortA: async () => "comp-val",
      PortB: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "in", { executionId: "comp-hook-1" });
    const beforeHook = hookCalls.find(h => h.hook === "before");
    expect(beforeHook).toBeDefined();
    expect(beforeHook.failedStepName).toBe("Failing");
    expect(beforeHook.stepsToCompensate).toBe(1);
    expect(beforeHook.executionId).toBe("comp-hook-1");
    expect(beforeHook.sagaName).toBe("CompHookSaga");
    const afterHook = hookCalls.find(h => h.hook === "after");
    expect(afterHook).toBeDefined();
    expect(afterHook.compensatedSteps).toContain("HookComp");
  });

  it("emits saga:failed with compensated=false when compensation fails", async () => {
    const CompFailStep = defineStep("CompFail")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => {
        throw new Error("comp-step-fail");
      })
      .build();
    const FailTrigger = defineStep("FailTrigger")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CompFailSaga")
      .input<string>()
      .step(CompFailStep)
      .step(FailTrigger)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "val",
      PortB: async () => {
        throw new Error("trigger-fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "in", {
      executionId: "comp-fail-1",
      listeners: [e => events.push(e)],
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("CompensationFailed");
      if (result.error._tag === "CompensationFailed") {
        expect(result.error.failedCompensationSteps.length).toBeGreaterThan(0);
      }
    }
    const sagaFailed = findEvent(events, "saga:failed");
    expect(sagaFailed.compensated).toBe(false);
  });

  describe("makeCancelledResult via saga cancellation", () => {
    it("sets status to cancelled and emits saga:cancelled event", async () => {
      // Use a 2-step saga. Step 1's adapter cancels the runner, so when the loop
      // checks signal.aborted before step 2, it returns makeCancelledResult.
      let runnerRef: ReturnType<typeof createSagaRunner>;
      const SlowStep = defineStep("SlowCancel")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const Step2 = defineStep("NeverRun")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("CancelledSaga")
        .input<string>()
        .step(SlowStep)
        .step(Step2)
        .output(r => r.SlowCancel)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => {
          await runnerRef.cancel("cancel-result-1");
          return "step1-done";
        },
        PortB: async () => "should-not-run",
      });
      runnerRef = createSagaRunner(resolver);
      const result = await executeSaga(runnerRef, saga, "in", {
        executionId: "cancel-result-1",
        listeners: [e => events.push(e)],
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Cancelled");
        expect(result.error.message).toBe("Saga was cancelled");
      }
      const cancelled = findEvent(events, "saga:cancelled");
      expect(cancelled.compensated).toBe(false);
    });
  });

  describe("timeout via step-level timeout triggers TimeoutSignal path", () => {
    it("returns Timeout error with correct timeoutMs and message", async () => {
      const TimeoutStep = defineStep("TimedOut")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .timeout(50)
        .build();
      const saga = defineSaga("StepTimeoutSaga")
        .input<string>()
        .step(TimeoutStep)
        .output(r => r.TimedOut)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: () => new Promise(resolve => setTimeout(() => resolve("late"), 5000)),
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", {
        executionId: "step-timeout-1",
        listeners: [e => events.push(e)],
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Timeout");
        if (result.error._tag === "Timeout") {
          expect(result.error.timeoutMs).toBe(50);
        }
        expect(result.error.message).toContain("timed out");
        expect(result.error.message).toContain("50");
      }
      const sagaFailed = findEvent(events, "saga:failed");
      expect(sagaFailed.compensated).toBeDefined();
    });
  });
});

// =============================================================================
// 5. step-executor.ts
// =============================================================================

describe("step-executor: invokePort", () => {
  it("invokes callable service", async () => {
    const service = (params: any) => Promise.resolve(params.value);
    const result = invokePort(service, { value: 42 });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(await result.value).toBe(42);
    }
  });

  it("invokes service with execute method", async () => {
    const service = { execute: (params: any) => Promise.resolve(params.value) };
    const result = invokePort(service, { value: 99 });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(await result.value).toBe(99);
    }
  });

  it("returns error for non-executable service", () => {
    const result = invokePort({ notExecute: true }, {});
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe("Port service does not have an executable interface");
    }
  });

  it("returns error for null service", () => {
    expect(invokePort(null, {}).isErr()).toBe(true);
  });
  it("returns error for number service", () => {
    expect(invokePort(42, {}).isErr()).toBe(true);
  });
  it("returns error for string service", () => {
    expect(invokePort("not-a-service", {}).isErr()).toBe(true);
  });
});

describe("step-executor: TimeoutSignal", () => {
  it("stores timeoutMs", () => {
    expect(new TimeoutSignal(5000).timeoutMs).toBe(5000);
  });
  it("is an instance of TimeoutSignal", () => {
    expect(new TimeoutSignal(100)).toBeInstanceOf(TimeoutSignal);
  });
});

describe("step-executor: executeStepWithRetry via full saga", () => {
  it("succeeds on first attempt without retries", async () => {
    let callCount = 0;
    const Step = defineStep("NoRetry")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("NoRetrySaga")
      .input<string>()
      .step(Step)
      .output(r => r.NoRetry)
      .build();
    const resolver = createResolver({
      PortA: async () => {
        callCount++;
        return "ok";
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "in", { executionId: "no-retry-1" });
    expect(result.isOk()).toBe(true);
    expect(callCount).toBe(1);
  });

  it("retries and succeeds on 2nd attempt", async () => {
    let callCount = 0;
    const RetryStep = defineStep("RetryOnce")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 1, delay: 0 })
      .build();
    const saga = defineSaga("RetryOnceSaga")
      .input<string>()
      .step(RetryStep)
      .output(r => r.RetryOnce)
      .build();
    const resolver = createResolver({
      PortA: async () => {
        callCount++;
        if (callCount === 1) throw new Error("first-fail");
        return "retry-ok";
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "in", { executionId: "retry-once-1" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toBe("retry-ok");
    }
    expect(callCount).toBe(2);
  });

  it("respects retryIf predicate", async () => {
    let callCount = 0;
    const CondRetryStep = defineStep("CondRetry")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({
        maxAttempts: 3,
        delay: 0,
        retryIf: (err: unknown) => err instanceof Error && err.message === "retryable",
      })
      .build();
    const saga = defineSaga("CondRetrySaga")
      .input<string>()
      .step(CondRetryStep)
      .output(r => r.CondRetry)
      .build();
    const resolver = createResolver({
      PortA: async () => {
        callCount++;
        throw new Error("not-retryable");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "in", { executionId: "cond-retry-1" });
    expect(result.isErr()).toBe(true);
    expect(callCount).toBe(1);
  });

  it("uses delay function for retry backoff", async () => {
    let callCount = 0;
    const delayFn = vi.fn(() => 1);
    const DelayStep = defineStep("DelayRetry")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 2, delay: delayFn })
      .build();
    const saga = defineSaga("DelayRetrySaga")
      .input<string>()
      .step(DelayStep)
      .output(r => r.DelayRetry)
      .build();
    const resolver = createResolver({
      PortA: async () => {
        callCount++;
        if (callCount <= 2) throw new Error("retry");
        return "eventually-ok";
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "in", { executionId: "delay-retry-1" });
    expect(result.isOk()).toBe(true);
    expect(callCount).toBe(3);
    expect(delayFn).toHaveBeenCalledTimes(2);
    expect(delayFn).toHaveBeenCalledWith(1, expect.any(Error));
    expect(delayFn).toHaveBeenCalledWith(2, expect.any(Error));
  });

  it("returns error when signal is aborted during retry", async () => {
    const AbortRetryStep = defineStep("AbortRetry")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 5, delay: 100 })
      .build();
    const saga = defineSaga("AbortRetrySaga")
      .input<string>()
      .step(AbortRetryStep)
      .output(r => r.AbortRetry)
      .build();
    const resolver = createResolver({
      PortA: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "in", { executionId: "abort-retry-1" });
    setTimeout(async () => {
      await runner.cancel("abort-retry-1");
    }, 50);
    const result = await resultAsync;
    expect(result.isErr()).toBe(true);
  });
});

// =============================================================================
// 6. checkpointing.ts
// =============================================================================

describe("checkpointing: toCompletedStepState", () => {
  it("maps CompletedStepInfo to CompletedStepState with correct fields", () => {
    const step = defineStep("CheckpointStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const state = toCompletedStepState({
      stepName: "CheckpointStep",
      stepIndex: 3,
      result: { data: "some-output" },
      step,
    });
    expect(state.name).toBe("CheckpointStep");
    expect(state.index).toBe(3);
    expect(state.output).toEqual({ data: "some-output" });
    expect(state.skipped).toBe(false);
    expect(state.completedAt).toBeDefined();
    expect(new Date(state.completedAt).toISOString()).toBe(state.completedAt);
  });

  it("maps name from stepName", () => {
    const step = defineStep("ActualName")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    expect(
      toCompletedStepState({ stepName: "ActualName", stepIndex: 0, result: null, step }).name
    ).toBe("ActualName");
  });

  it("maps index from stepIndex", () => {
    const step = defineStep("IndexStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    expect(
      toCompletedStepState({ stepName: "IndexStep", stepIndex: 7, result: "val", step }).index
    ).toBe(7);
  });

  it("maps output from result", () => {
    const step = defineStep("OutputStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    expect(
      toCompletedStepState({
        stepName: "OutputStep",
        stepIndex: 0,
        result: { complex: [1, 2, 3] },
        step,
      }).output
    ).toEqual({ complex: [1, 2, 3] });
  });
});

// =============================================================================
// 7. status-builder.ts
// =============================================================================

describe("status-builder: buildSagaStatus", () => {
  it("builds running status", () => {
    const status = buildSagaStatus("running", "exec-1", "MySaga", ["Step1", "Step2"], 1000);
    expect(status.state).toBe("running");
    expect(status.executionId).toBe("exec-1");
    expect(status.sagaName).toBe("MySaga");
    if (status.state === "running") {
      expect(status.currentStepIndex).toBe(2);
      expect(status.currentStepName).toBe("");
      expect(status.completedSteps).toEqual(["Step1", "Step2"]);
      expect(status.startedAt).toBe(1000);
    }
  });

  it("builds completed status", () => {
    const status = buildSagaStatus("completed", "exec-2", "DoneSaga", ["A", "B"], 2000);
    expect(status.state).toBe("completed");
    if (status.state === "completed") {
      expect(status.completedSteps).toEqual(["A", "B"]);
      expect(status.startedAt).toBe(2000);
      expect(status.completedAt).toBe(2000);
      expect(status.durationMs).toBe(0);
    }
  });

  it("builds compensating status", () => {
    const status = buildSagaStatus("compensating", "exec-3", "CompSaga", ["X"], 3000);
    expect(status.state).toBe("compensating");
    if (status.state === "compensating") {
      expect(status.failedStepName).toBe("");
      expect(status.failedStepIndex).toBe(1);
      expect(status.compensatingStepIndex).toBe(0);
      expect(status.compensatingStepName).toBe("");
      expect(status.compensatedSteps).toEqual([]);
      expect(status.startedAt).toBe(3000);
      expect(status.error._tag).toBe("StepFailed");
      expect(status.error.message).toBe("Compensation in progress");
    }
  });

  it("builds failed status", () => {
    const status = buildSagaStatus("failed", "exec-4", "FailSaga", ["Y", "Z"], 4000);
    expect(status.state).toBe("failed");
    if (status.state === "failed") {
      expect(status.failedStepName).toBe("");
      expect(status.compensated).toBe(false);
      expect(status.compensatedSteps).toEqual([]);
      expect(status.startedAt).toBe(4000);
      expect(status.failedAt).toBe(4000);
      expect(status.durationMs).toBe(0);
      expect(status.error._tag).toBe("StepFailed");
      expect(status.error.message).toBe("Saga failed");
      expect(status.error.completedSteps).toEqual(["Y", "Z"]);
    }
  });

  it("builds cancelled status", () => {
    const status = buildSagaStatus("cancelled", "exec-5", "CancelSaga", [], 5000);
    expect(status.state).toBe("cancelled");
    if (status.state === "cancelled") {
      expect(status.stepName).toBe("");
      expect(status.compensated).toBe(false);
      expect(status.compensatedSteps).toEqual([]);
      expect(status.cancelledAt).toBe(5000);
      expect(status.startedAt).toBe(5000);
    }
  });

  it("failed status error includes correct executionId and sagaName", () => {
    const status = buildSagaStatus("failed", "err-exec", "ErrSaga", [], 0);
    if (status.state === "failed") {
      expect(status.error.executionId).toBe("err-exec");
      expect(status.error.sagaName).toBe("ErrSaga");
      expect(status.error.stepName).toBe("");
      expect(status.error.stepIndex).toBe(-1);
      expect(status.error.compensatedSteps).toEqual([]);
      if (status.error._tag === "StepFailed") {
        expect(status.error.cause).toBeUndefined();
      }
    }
  });

  it("compensating status error includes correct completedSteps", () => {
    const status = buildSagaStatus("compensating", "comp-exec", "CompSaga2", ["A", "B", "C"], 0);
    if (status.state === "compensating") {
      expect(status.error.completedSteps).toEqual(["A", "B", "C"]);
      expect(status.error.executionId).toBe("comp-exec");
      expect(status.error.sagaName).toBe("CompSaga2");
    }
  });
});

// =============================================================================
// 8. Integration tests
// =============================================================================

describe("integration: event ordering for successful execution", () => {
  it("events arrive in correct order", async () => {
    const IntStep = defineStep("IntStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("IntSaga")
      .input<string>()
      .step(IntStep)
      .output(r => r.IntStep)
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({ PortA: async () => "ok" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "input", {
      executionId: "order-1",
      listeners: [e => events.push(e)],
    });
    expect(events.map(e => e.type)).toEqual([
      "saga:started",
      "step:started",
      "step:completed",
      "saga:completed",
    ]);
  });

  it("all events have correct executionId and sagaName", async () => {
    const AllEvStep = defineStep("AllEvStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("AllEvSaga")
      .input<string>()
      .step(AllEvStep)
      .output(r => r.AllEvStep)
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({ PortA: async () => "ok" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "in", {
      executionId: "all-ev-1",
      listeners: [e => events.push(e)],
    });
    for (const event of events) {
      expect(event.executionId).toBe("all-ev-1");
      expect(event.sagaName).toBe("AllEvSaga");
      expect(event.timestamp).toBeTypeOf("number");
    }
  });
});

describe("integration: trace via getTrace", () => {
  it("getTrace returns full trace for completed saga", async () => {
    const T1 = defineStep("T1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const T2 = defineStep("T2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("TraceSaga")
      .input<string>()
      .step(T1)
      .step(T2)
      .output(() => "done")
      .build();
    const resolver = createResolver({ PortA: async () => "a", PortB: async () => "b" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "in", { executionId: "trace-full-1" });
    const trace = runner.getTrace("trace-full-1");
    expect(trace).not.toBeNull();
    if (trace) {
      expect(trace.executionId).toBe("trace-full-1");
      expect(trace.sagaName).toBe("TraceSaga");
      expect(trace.status).toBe("completed");
      expect(trace.steps.length).toBe(2);
      expect(trace.steps[0].stepName).toBe("T1");
      expect(trace.steps[1].stepName).toBe("T2");
    }
  });

  it("getTrace returns null for unknown execution", () => {
    const runner = createSagaRunner(createResolver({}));
    expect(runner.getTrace("nonexistent")).toBeNull();
  });

  it("getTrace includes compensation trace", async () => {
    const CompStep = defineStep("CompTraceStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ({ undo: ctx.stepResult }))
      .build();
    const FailStep = defineStep("FailTraceStep")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CompTraceSaga")
      .input<string>()
      .step(CompStep)
      .step(FailStep)
      .output(() => "done")
      .build();
    const resolver = createResolver({
      PortA: async () => "val",
      PortB: async () => {
        throw new Error("boom");
      },
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "in", { executionId: "comp-trace-1" });
    const trace = runner.getTrace("comp-trace-1");
    expect(trace).not.toBeNull();
    if (trace) {
      expect(trace.status).toBe("failed");
      expect(trace.compensation).toBeDefined();
      if (trace.compensation) {
        expect(trace.compensation.triggeredBy).toBe("FailTraceStep");
      }
    }
  });
});

describe("integration: multi-step with mixed skip and execute", () => {
  it("correctly tracks stepsExecuted and stepsSkipped", async () => {
    const Exec1 = defineStep("Exec1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const SkipMid = defineStep("SkipMid")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .when(() => false)
      .build();
    const Exec2 = defineStep("Exec2")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();
    const SkipEnd = defineStep("SkipEnd")
      .io<string, string>()
      .invoke(PortD, ctx => ctx.input)
      .when(() => false)
      .build();
    const saga = defineSaga("MixedSaga")
      .input<string>()
      .step(Exec1)
      .step(SkipMid)
      .step(Exec2)
      .step(SkipEnd)
      .output(r => ({ e1: r.Exec1, e2: r.Exec2 }))
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "a",
      PortB: async () => "b",
      PortC: async () => "c",
      PortD: async () => "d",
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "mixed-1",
      listeners: [e => events.push(e)],
    });
    const completed = findEvent(events, "saga:completed");
    expect(completed.stepsExecuted).toBe(2);
    expect(completed.stepsSkipped).toBe(2);
    expect(events.map(e => e.type)).toEqual([
      "saga:started",
      "step:started",
      "step:completed",
      "step:skipped",
      "step:started",
      "step:completed",
      "step:skipped",
      "saga:completed",
    ]);
  });
});

describe("integration: subscriber", () => {
  it("subscriber receives events when subscribed after execute call", async () => {
    const d = deferred<string>();
    const SubStep = defineStep("SubStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("SubSaga")
      .input<string>()
      .step(SubStep)
      .output(r => r.SubStep)
      .build();
    const resolver = createResolver({ PortA: () => d.promise });
    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "in", { executionId: "sub-1" });
    const subEvents: SagaEvent[] = [];
    runner.subscribe("sub-1", e => subEvents.push(e));
    d.resolve("ok");
    await resultAsync;
    const types = subEvents.map(e => e.type);
    expect(types).toContain("step:completed");
    expect(types).toContain("saga:completed");
  });

  it("unsubscribe stops receiving events", async () => {
    const d1 = deferred<string>();
    const d2 = deferred<string>();
    const S1 = defineStep("S1u")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const S2 = defineStep("S2u")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("UnsubSaga")
      .input<string>()
      .step(S1)
      .step(S2)
      .output(() => "done")
      .build();
    const resolver = createResolver({ PortA: () => d1.promise, PortB: () => d2.promise });
    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "in", { executionId: "unsub-1" });
    const subEvents: SagaEvent[] = [];
    const unsub = runner.subscribe("unsub-1", e => subEvents.push(e));
    d1.resolve("a");
    await new Promise(r => setTimeout(r, 10));
    unsub();
    d2.resolve("b");
    await resultAsync;
    expect(subEvents.map(e => e.type)).not.toContain("saga:completed");
  });
});
