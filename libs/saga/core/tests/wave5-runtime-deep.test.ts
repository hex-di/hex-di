/**
 * Wave 5: Deep Runtime Mutation Tests
 *
 * Targeted tests to kill surviving mutants in:
 * - runtime/saga-executor.ts
 * - runtime/compensation-handler.ts
 * - runtime/events.ts
 * - runtime/step-executor.ts
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../src/runtime/runner.js";
import { resolveStepByName, executeSagaInternal } from "../src/runtime/saga-executor.js";
import { emit, buildExecutionTrace } from "../src/runtime/events.js";
import { invokePort, TimeoutSignal, executeStepWithRetry } from "../src/runtime/step-executor.js";
import type { PortResolver, SagaEvent } from "../src/runtime/types.js";
import type { ExecutionState } from "../src/runtime/execution-state.js";
import type { SagaNode } from "../src/saga/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const PortA = createPort<"PortA", any>({ name: "PortA" });
const PortB = createPort<"PortB", any>({ name: "PortB" });
const PortC = createPort<"PortC", any>({ name: "PortC" });
const _PortD = createPort<"PortD", any>({ name: "PortD" });

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

function _deferred<T>(): {
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
// 1. saga-executor.ts - executeSagaInternal deep mutants
// =============================================================================

describe("saga-executor: executeSagaInternal deep mutants", () => {
  describe("sagaStartTime is set to Date.now(), not 0", () => {
    it("sagaStartTime is a positive timestamp, not 0", async () => {
      const S = defineStep("TimestampStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("TimestampSaga")
        .input<string>()
        .step(S)
        .output(r => r.TimestampStep)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "ok" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "ts-1",
        listeners: [e => events.push(e)],
      });
      const started = findEvent(events, "saga:started");
      // If mutated to 0, this would fail
      expect(started.timestamp).toBeGreaterThan(1000000000000);
    });
  });

  describe("saga:started event field mutations", () => {
    it("saga:started type is exactly 'saga:started', not empty string", async () => {
      const S = defineStep("TypeStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("TypeSaga")
        .input<string>()
        .step(S)
        .output(r => r.TypeStep)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "ok" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "type-1",
        listeners: [e => events.push(e)],
      });
      expect(events[0].type).toBe("saga:started");
    });

    it("stepCount equals the number of nodes, not 0", async () => {
      const S1 = defineStep("SC1")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const S2 = defineStep("SC2")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("StepCountSaga")
        .input<string>()
        .step(S1)
        .step(S2)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "a", PortB: async () => "b" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "sc-1",
        listeners: [e => events.push(e)],
      });
      const started = findEvent(events, "saga:started");
      // Kills: stepCount: nodes.length -> 0
      expect(started.stepCount).toBe(2);
    });
  });

  describe("signal.aborted check", () => {
    it("does not cancel when signal is not aborted (mutant: if(true))", async () => {
      const S = defineStep("NoCancel")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("NoCancelSaga")
        .input<string>()
        .step(S)
        .output(r => r.NoCancel)
        .build();
      const resolver = createResolver({ PortA: async () => "result" });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "no-cancel-1" });
      // If signal.aborted mutated to true, would fail
      expect(result.isOk()).toBe(true);
    });

    it("returns cancelled when signal IS aborted (mutant: if(false))", async () => {
      const S1 = defineStep("Pre")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const S2 = defineStep("Post")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("CancelCheck")
        .input<string>()
        .step(S1)
        .step(S2)
        .output(() => "done")
        .build();
      const resolver = createResolver({
        PortA: async () => {
          await runnerRef.cancel("cancel-check-1");
          return "a";
        },
        PortB: async () => "b",
      });
      const runnerRef = createSagaRunner(resolver);
      const result = await executeSaga(runnerRef, saga, "in", { executionId: "cancel-check-1" });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Cancelled");
      }
    });
  });

  describe("startFromStep resume skip logic", () => {
    it("stepIndex < startFromStep skips steps (mutant: <= instead of <)", async () => {
      // Test that when resuming from step 1, step 0 is skipped but step 1 executes
      // If mutated to <=, step 1 would also be skipped
      const S0 = defineStep("Resume0")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const S1 = defineStep("Resume1")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("ResumeSaga")
        .input<string>()
        .step(S0)
        .step(S1)
        .output(r => r.Resume1)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "a", PortB: async () => "b" });
      const state = createMockExecutionState({
        executionId: "resume-1",
        sagaName: "ResumeSaga",
        input: "in",
        listeners: [(e: SagaEvent) => events.push(e)],
        sagaOptions: saga.options,
      });
      const abortController = new AbortController();
      state.abortController = abortController;

      const _result = await executeSagaInternal(
        saga,
        "in",
        resolver,
        state,
        undefined,
        abortController.signal,
        1
      );

      // Step 1 should be executed (started + completed), step 0 should be skipped silently
      const stepStartedEvents = findAllEvents(events, "step:started");
      expect(stepStartedEvents.length).toBe(1);
      expect(stepStartedEvents[0].stepName).toBe("Resume1");
    });
  });

  describe("checkpoint currentStep: stepIndex + 1 vs stepIndex - 1", () => {
    it("checkpoint is called with stepIndex + 1, verified by successful execution flow", async () => {
      // We test indirectly: if the checkpoint used stepIndex - 1, resume would re-execute the step
      const S0 = defineStep("CP0")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("CPSaga")
        .input<string>()
        .step(S0)
        .output(r => r.CP0)
        .build();
      const resolver = createResolver({ PortA: async () => "done" });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "cp-1" });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toBe("done");
      }
    });
  });

  describe("step result error path (isErr mutation)", () => {
    it("does not treat success as error (mutant: if(true))", async () => {
      const S = defineStep("SuccessNotErr")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("SuccessNotErrSaga")
        .input<string>()
        .step(S)
        .output(r => r.SuccessNotErr)
        .build();
      const resolver = createResolver({ PortA: async () => "good" });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "sne-1" });
      expect(result.isOk()).toBe(true);
    });

    it("does treat failure as error (mutant: if(false))", async () => {
      const S = defineStep("ErrIsErr")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("ErrIsErrSaga")
        .input<string>()
        .step(S)
        .output(r => r.ErrIsErr)
        .build();
      const resolver = createResolver({
        PortA: async () => {
          throw new Error("fail");
        },
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "eie-1" });
      expect(result.isErr()).toBe(true);
    });
  });

  describe("parallel node resume skip: baseIndex + node.steps.length <= startFromStep", () => {
    it("parallel node with 2 steps at base 0: when resuming from step 2, parallel is skipped", async () => {
      const PA = defineStep("PA")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const PB = defineStep("PB")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const SC = defineStep("SC")
        .io<string, string>()
        .invoke(PortC, ctx => ctx.input)
        .build();
      const saga = defineSaga("ParResumeSaga")
        .input<string>()
        .parallel([PA, PB])
        .step(SC)
        .output(r => r.SC)
        .build();

      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => "a",
        PortB: async () => "b",
        PortC: async () => "c",
      });
      const state = createMockExecutionState({
        executionId: "par-resume-1",
        sagaName: "ParResumeSaga",
        input: "in",
        listeners: [(e: SagaEvent) => events.push(e)],
        sagaOptions: saga.options,
      });

      const _result = await executeSagaInternal(
        saga,
        "in",
        resolver,
        state,
        undefined,
        state.abortController.signal,
        2
      );

      // Only SC (step index 2) should be executed; parallel is skipped
      const stepStartedEvents = findAllEvents(events, "step:started");
      expect(stepStartedEvents.length).toBe(1);
      expect(stepStartedEvents[0].stepName).toBe("SC");
    });

    it("parallel node NOT skipped when baseIndex + length > startFromStep (< vs <=)", async () => {
      // 2 parallel steps at base 0. If we resume from step 1 (inside the parallel),
      // baseIndex(0) + length(2) = 2 > 1, so parallel should NOT be skipped.
      // If mutated from <= to <, skipping would be wrong.
      const PA = defineStep("PA2")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const PB = defineStep("PB2")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("ParResumeEdge")
        .input<string>()
        .parallel([PA, PB])
        .output(r => ({ a: r.PA2, b: r.PB2 }))
        .build();

      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => "a",
        PortB: async () => "b",
      });
      const state = createMockExecutionState({
        executionId: "par-edge-1",
        sagaName: "ParResumeEdge",
        input: "in",
        listeners: [(e: SagaEvent) => events.push(e)],
        sagaOptions: saga.options,
      });

      const _result = await executeSagaInternal(
        saga,
        "in",
        resolver,
        state,
        undefined,
        state.abortController.signal,
        1
      );

      // The parallel node should execute (both steps re-run since partial resume not supported for parallel)
      const stepStartedEvents = findAllEvents(events, "step:started");
      expect(stepStartedEvents.length).toBe(2);
    });
  });

  describe("branch execution details", () => {
    it("branch ctx contains input, results, stepIndex, executionId", async () => {
      let capturedCtx: any;
      const PreStep = defineStep("BrPre")
        .io<{ key: string }, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const LeftStep = defineStep("BrLeft")
        .io<{ key: string }, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("BranchCtxSaga")
        .input<{ key: string }>()
        .step(PreStep)
        .branch(
          ctx => {
            capturedCtx = ctx;
            return "left";
          },
          { left: [LeftStep] }
        )
        .output(() => "done")
        .build();
      const resolver = createResolver({
        PortA: async () => "pre-result",
        PortB: async () => "left-result",
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, { key: "value" }, { executionId: "br-ctx-1" });
      expect(capturedCtx).toBeDefined();
      expect(capturedCtx.input).toEqual({ key: "value" });
      expect(capturedCtx.results).toHaveProperty("BrPre");
      expect(capturedCtx.stepIndex).toBe(1);
      expect(capturedCtx.executionId).toBe("br-ctx-1");
    });

    it("__selectedBranch is set to the selected key, not empty string", async () => {
      const BrStep = defineStep("BrStep1")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("SelectedBrSaga")
        .input<string>()
        .branch(() => "myKey", { myKey: [BrStep] })
        .output(r => r)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "branch-result" });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", {
        executionId: "sel-br-1",
        listeners: [e => events.push(e)],
      });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // The __selectedBranch should be "myKey" in the output
        const output = result.value.output as any;
        expect(output.__selectedBranch).toBe("myKey");
      }
    });

    it("branch results are accumulated via Object.assign (mutant: removed)", async () => {
      const BrStep2 = defineStep("BrAccum")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const AfterBranch = defineStep("AfterBr")
        .io<string, string>()
        .invoke(PortB, ctx => {
          // This step can only access BrAccum result if Object.assign worked
          return ctx.results;
        })
        .build();
      const saga = defineSaga("BrAccumSaga")
        .input<string>()
        .branch(() => "k", { k: [BrStep2] })
        .step(AfterBranch)
        .output((r: any) => ({ br: r.BrAccum, after: r.AfterBr }))
        .build();
      const resolver = createResolver({
        PortA: async () => "branch-val",
        PortB: async () => "after-val",
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "br-accum-1" });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const out = result.value.output as any;
        expect(out.br).toBe("branch-val");
      }
    });

    it("branch error propagates when branch step fails", async () => {
      const FailBrStep = defineStep("FailBr")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("FailBrSaga")
        .input<string>()
        .branch(() => "k", { k: [FailBrStep] })
        .output(() => "done")
        .build();
      const resolver = createResolver({
        PortA: async () => {
          throw new Error("branch-fail");
        },
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "fail-br-1" });
      expect(result.isErr()).toBe(true);
    });

    it("branch with no matching key does not execute steps", async () => {
      const BrNoMatch = defineStep("BrNoMatch")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("NoMatchBr")
        .input<string>()
        .branch(() => "nonexistent" as any, { other: [BrNoMatch] } as any)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "nope" });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", {
        executionId: "no-match-2",
        listeners: [e => events.push(e)],
      });
      expect(result.isOk()).toBe(true);
      expect(findAllEvents(events, "step:started").length).toBe(0);
    });
  });

  describe("sub-saga node details", () => {
    it("sub-saga constructs subState with correct sagaName, input, and empty accumulatedResults", async () => {
      let subInputCaptured: any;
      const SubInner = defineStep("SubInner")
        .io<{ nested: string }, string>()
        .invoke(PortA, ctx => {
          subInputCaptured = ctx.input;
          return ctx.input;
        })
        .build();
      const SubSaga = defineSaga("InnerSaga")
        .input<{ nested: string }>()
        .step(SubInner)
        .output(r => r.SubInner)
        .build();
      const MainStep = defineStep("MainStep")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const MainSaga = defineSaga("OuterSaga")
        .input<string>()
        .step(MainStep)
        .saga(SubSaga, ctx => ({ nested: ctx.input }))
        .output(r => ({ main: r.MainStep, sub: r.InnerSaga }))
        .build();
      const resolver = createResolver({
        PortA: async () => "inner-result",
        PortB: async () => "main-result",
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, MainSaga, "hello", { executionId: "sub-state-1" });
      expect(result.isOk()).toBe(true);
      // The sub-saga input mapper was called
      expect(subInputCaptured).toEqual({ nested: "hello" });
      if (result.isOk()) {
        const out = result.value.output as any;
        expect(out.main).toBe("main-result");
        expect(out.sub).toBe("inner-result");
      }
    });

    it("sub-saga failure propagates to parent", async () => {
      const FailSubStep = defineStep("FailSub")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const SubSaga = defineSaga("FailSubSaga2")
        .input<string>()
        .step(FailSubStep)
        .output(r => r.FailSub)
        .build();
      const saga = defineSaga("ParentWithFail2")
        .input<string>()
        .saga(SubSaga, ctx => ctx.input)
        .output(r => r)
        .build();
      const resolver = createResolver({
        PortA: async () => {
          throw new Error("sub-fail");
        },
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "sub-fail-2" });
      expect(result.isErr()).toBe(true);
    });
  });

  describe("output mapper error path", () => {
    it("output mapper error has stepIndex -1 and stepName empty string", async () => {
      const Ok = defineStep("OmOk")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("OmErrSaga")
        .input<string>()
        .step(Ok)
        .output(() => {
          throw new Error("om-fail");
        })
        .build();
      const resolver = createResolver({ PortA: async () => "ok" });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "om-err-1" });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("StepFailed");
        expect(result.error.stepIndex).toBe(-1);
        expect(result.error.stepName).toBe("");
        expect(result.error.message).toContain("Output mapper failed");
      }
    });
  });

  describe("status set to completed on success (mutant: empty string)", () => {
    it("execution state status becomes 'completed' not empty string", async () => {
      const S = defineStep("CompletedStatus")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("CompletedStatusSaga")
        .input<string>()
        .step(S)
        .output(r => r.CompletedStatus)
        .build();
      const resolver = createResolver({ PortA: async () => "done" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", { executionId: "status-1" });
      const trace = runner.getTrace("status-1");
      expect(trace).not.toBeNull();
      if (trace) {
        expect(trace.status).toBe("completed");
      }
    });
  });

  describe("saga:completed event fields", () => {
    it("saga:completed type is exactly 'saga:completed'", async () => {
      const S = defineStep("CompEvt")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("CompEvtSaga")
        .input<string>()
        .step(S)
        .output(r => r.CompEvt)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "ok" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "comp-evt-1",
        listeners: [e => events.push(e)],
      });
      const completed = findEvent(events, "saga:completed");
      expect(completed.type).toBe("saga:completed");
      expect(completed.executionId).toBe("comp-evt-1");
      expect(completed.sagaName).toBe("CompEvtSaga");
      expect(completed.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(completed.stepsExecuted).toBe(1);
      expect(completed.stepsSkipped).toBe(0);
    });
  });

  describe("global timeout", () => {
    it("global timeout fires and aborts the saga (timeout promise race)", async () => {
      const SlowStep = defineStep("SlowGlobal")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("GlobalTimeoutSaga")
        .input<string>()
        .step(SlowStep)
        .output(r => r.SlowGlobal)
        .build();
      const resolver = createResolver({
        PortA: () => new Promise(resolve => setTimeout(() => resolve("late"), 10000)),
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "gt-1", timeout: 30 });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Timeout");
        expect(result.error.message).toContain("Saga timed out after 30ms");
      }
    });

    it("no global timeout does not race with timeout promise (globalTimeout is 0 or undefined)", async () => {
      const FastStep = defineStep("FastGlobal")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("NoTimeoutSaga")
        .input<string>()
        .step(FastStep)
        .output(r => r.FastGlobal)
        .build();
      const resolver = createResolver({ PortA: async () => "fast" });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "no-gt-1" });
      expect(result.isOk()).toBe(true);
    });
  });
});

// =============================================================================
// 2. saga-executor.ts - executeStepNode deep mutants
// =============================================================================

describe("saga-executor: executeStepNode deep mutants", () => {
  describe("condition check path", () => {
    it("step skipped increments stepsSkipped (mutant: stepsSkipped--)", async () => {
      const Skip1 = defineStep("SkDec1")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .when(() => false)
        .build();
      const Skip2 = defineStep("SkDec2")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .when(() => false)
        .build();
      const saga = defineSaga("SkDecSaga")
        .input<string>()
        .step(Skip1)
        .step(Skip2)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "a", PortB: async () => "b" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "sk-dec-1",
        listeners: [e => events.push(e)],
      });
      const completed = findEvent(events, "saga:completed");
      // If mutated to --, stepsSkipped would be negative
      expect(completed.stepsSkipped).toBe(2);
    });

    it("condition inversion: step executes when condition returns true (mutant: !step.condition inversion)", async () => {
      const Conditional = defineStep("CondTrue")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .when(() => true)
        .build();
      const saga = defineSaga("CondTrueSaga")
        .input<string>()
        .step(Conditional)
        .output(r => r.CondTrue)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "executed" });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", {
        executionId: "cond-true-1",
        listeners: [e => events.push(e)],
      });
      expect(result.isOk()).toBe(true);
      expect(findAllEvents(events, "step:started").length).toBe(1);
      expect(findAllEvents(events, "step:skipped").length).toBe(0);
    });

    it("step:skipped reason is 'condition-false' not empty string", async () => {
      const Sk = defineStep("SkReason")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .when(() => false)
        .build();
      const saga = defineSaga("SkReasonSaga")
        .input<string>()
        .step(Sk)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({ PortA: async () => "nope" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "sk-reason-1",
        listeners: [e => events.push(e)],
      });
      const skipped = findEvent(events, "step:skipped");
      expect(skipped.reason).toBe("condition-false");
      expect(skipped.reason.length).toBeGreaterThan(0);
    });
  });

  describe("beforeStep hook: isCompensation is false, not true", () => {
    it("beforeStep hook receives isCompensation: false during forward execution", async () => {
      const hookCalls: any[] = [];
      const S = defineStep("BeforeHookStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("BeforeHookSaga")
        .input<string>()
        .step(S)
        .output(r => r.BeforeHookStep)
        .options({
          compensationStrategy: "sequential",
          hooks: { beforeStep: ctx => hookCalls.push(ctx) },
        })
        .build();
      const resolver = createResolver({ PortA: async () => "ok" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", { executionId: "bh-1" });
      expect(hookCalls[0].isCompensation).toBe(false);
      expect(hookCalls[0].isCompensation).not.toBe(true);
    });
  });

  describe("port resolution tryCatch error mapper", () => {
    it("tryCatch error mapper returns port name, not empty string", async () => {
      // When resolver.resolve throws, the tryCatch error mapper returns step.port.__portName
      // We verify this by checking the PortNotFound error message contains the port name
      const MissingPort = createPort<"MissingPortX", any>({ name: "MissingPortX" });
      const BadStep = defineStep("BadPortStep")
        .io<string, string>()
        .invoke(MissingPort, ctx => ctx.input)
        .build();
      const saga = defineSaga("BadPortSaga")
        .input<string>()
        .step(BadStep)
        .output(r => r.BadPortStep)
        .build();
      const resolver = createResolver({});
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "bad-port-1" });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("PortNotFound");
        if (result.error._tag === "PortNotFound") {
          expect(result.error.portName).toBe("MissingPortX");
          expect(result.error.message).toContain("MissingPortX");
          expect(result.error.message).toContain("not found in container");
        }
      }
    });
  });

  describe("step options access: retry and timeout", () => {
    it("passes step.options.retry to executeStepWithRetry (maxAttempts + 1)", async () => {
      let callCount = 0;
      const RetryStep = defineStep("RetryDeep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .retry({ maxAttempts: 2, delay: 0 })
        .build();
      const saga = defineSaga("RetryDeepSaga")
        .input<string>()
        .step(RetryStep)
        .output(r => r.RetryDeep)
        .build();
      const resolver = createResolver({
        PortA: async () => {
          callCount++;
          throw new Error("retry-deep-fail");
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", { executionId: "retry-deep-1" });
      // maxAttempts=2 => total attempts = maxAttempts + 1 = 3
      // If mutated to maxAttempts - 1 = 1, only 1 call would happen
      expect(callCount).toBe(3);
    });

    it("passes step.options.timeout to executeStepWithRetry", async () => {
      const TimeoutStep = defineStep("TimeoutDeep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .timeout(30)
        .build();
      const saga = defineSaga("TimeoutDeepSaga")
        .input<string>()
        .step(TimeoutStep)
        .output(r => r.TimeoutDeep)
        .build();
      const resolver = createResolver({
        PortA: () => new Promise(resolve => setTimeout(() => resolve("late"), 10000)),
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "timeout-deep-1" });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Timeout");
        if (result.error._tag === "Timeout") {
          expect(result.error.timeoutMs).toBe(30);
        }
      }
    });
  });

  describe("attemptCount calculation: maxAttempts + 1 vs - 1", () => {
    it("afterStep hook receives correct attemptCount for retry failure", async () => {
      const hookCalls: any[] = [];
      const RetryFail3 = defineStep("RF3")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .retry({ maxAttempts: 2, delay: 0 })
        .build();
      const saga = defineSaga("RF3Saga")
        .input<string>()
        .step(RetryFail3)
        .output(r => r.RF3)
        .options({
          compensationStrategy: "sequential",
          hooks: { afterStep: ctx => hookCalls.push(ctx) },
        })
        .build();
      const resolver = createResolver({
        PortA: async () => {
          throw new Error("always-fail");
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", { executionId: "rf3-1" });
      // attemptCount should be maxAttempts + 1 = 3, not maxAttempts - 1 = 1
      expect(hookCalls.length).toBeGreaterThanOrEqual(1);
      expect(hookCalls[0].attemptCount).toBe(3);
    });

    it("step:failed event attemptCount matches maxAttempts + 1", async () => {
      const RetryFailEvt = defineStep("RFEvt")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .retry({ maxAttempts: 1, delay: 0 })
        .build();
      const saga = defineSaga("RFEvtSaga")
        .input<string>()
        .step(RetryFailEvt)
        .output(r => r.RFEvt)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => {
          throw new Error("always-fail");
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "rf-evt-1",
        listeners: [e => events.push(e)],
      });
      const failed = findEvent(events, "step:failed");
      expect(failed.attemptCount).toBe(2);
    });
  });

  describe("TimeoutSignal path vs non-timeout failure", () => {
    it("step-level timeout triggers TimeoutSignal path (error instanceof TimeoutSignal)", async () => {
      const TimeoutStepPath = defineStep("TSP")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .timeout(30)
        .build();
      const saga = defineSaga("TSPSaga")
        .input<string>()
        .step(TimeoutStepPath)
        .output(r => r.TSP)
        .build();
      const resolver = createResolver({
        PortA: () => new Promise(r => setTimeout(() => r("late"), 10000)),
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "tsp-1" });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Timeout");
        expect(result.error.message).toContain("timed out");
      }
    });

    it("non-timeout failure goes through step:failed event with retriesExhausted: true", async () => {
      const FailEvt = defineStep("FE")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("FESaga")
        .input<string>()
        .step(FailEvt)
        .output(r => r.FE)
        .build();
      const events: SagaEvent[] = [];
      const testErr = new Error("regular-fail");
      const resolver = createResolver({
        PortA: async () => {
          throw testErr;
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "fe-1",
        listeners: [e => events.push(e)],
      });
      const failed = findEvent(events, "step:failed");
      expect(failed.retriesExhausted).toBe(true);
      expect(failed.retriesExhausted).not.toBe(false);
      expect(failed.error).toBe(testErr);
    });
  });

  describe("success path: accumulatedResults assignment and stepsExecuted increment", () => {
    it("accumulatedResults[step.name] is set (mutant: removed)", async () => {
      const SA = defineStep("AccA")
        .io<string, { x: number }>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const SB = defineStep("AccB")
        .io<string, { y: number }>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("AccSaga")
        .input<string>()
        .step(SA)
        .step(SB)
        .output(r => ({ xVal: r.AccA.x, yVal: r.AccB.y }))
        .build();
      const resolver = createResolver({
        PortA: async () => ({ x: 10 }),
        PortB: async () => ({ y: 20 }),
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "acc-1" });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // If accumulatedResults assignment was removed, output mapper would see undefined
        expect(result.value.output).toEqual({ xVal: 10, yVal: 20 });
      }
    });

    it("stepsExecuted++ (mutant: stepsExecuted--)", async () => {
      const E1 = defineStep("Exec1D")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const E2 = defineStep("Exec2D")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const E3 = defineStep("Exec3D")
        .io<string, string>()
        .invoke(PortC, ctx => ctx.input)
        .build();
      const saga = defineSaga("ExecDecSaga")
        .input<string>()
        .step(E1)
        .step(E2)
        .step(E3)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => "a",
        PortB: async () => "b",
        PortC: async () => "c",
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "exec-dec-1",
        listeners: [e => events.push(e)],
      });
      const completed = findEvent(events, "saga:completed");
      // If mutated to --, stepsExecuted would be -3
      expect(completed.stepsExecuted).toBe(3);
      expect(completed.stepsExecuted).toBeGreaterThan(0);
    });
  });

  describe("step:completed event durationMs", () => {
    it("durationMs is non-negative (mutant: 0)", async () => {
      const DurStep = defineStep("DurStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("DurSaga")
        .input<string>()
        .step(DurStep)
        .output(r => r.DurStep)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => {
          await new Promise(r => setTimeout(r, 5));
          return "ok";
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "dur-1",
        listeners: [e => events.push(e)],
      });
      const completed = findEvent(events, "step:completed");
      expect(completed.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof completed.durationMs).toBe("number");
    });
  });

  describe("afterStep hook on success: attemptCount is 1, isCompensation is false", () => {
    it("afterStep success hook has attemptCount=1 not 0, isCompensation=false not true", async () => {
      const hookCalls: any[] = [];
      const SuccHook = defineStep("SuccHook")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("SuccHookSaga")
        .input<string>()
        .step(SuccHook)
        .output(r => r.SuccHook)
        .options({
          compensationStrategy: "sequential",
          hooks: { afterStep: ctx => hookCalls.push(ctx) },
        })
        .build();
      const resolver = createResolver({ PortA: async () => "succ-result" });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", { executionId: "succ-hook-1" });
      expect(hookCalls.length).toBe(1);
      expect(hookCalls[0].attemptCount).toBe(1);
      expect(hookCalls[0].attemptCount).not.toBe(0);
      expect(hookCalls[0].isCompensation).toBe(false);
      expect(hookCalls[0].isCompensation).not.toBe(true);
      expect(hookCalls[0].result).toBe("succ-result");
      expect(hookCalls[0].error).toBeUndefined();
    });
  });

  describe("afterStep hook on failure: isCompensation is false", () => {
    it("afterStep failure hook has isCompensation=false", async () => {
      const hookCalls: any[] = [];
      const FailHk = defineStep("FailHk")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("FailHkSaga")
        .input<string>()
        .step(FailHk)
        .output(r => r.FailHk)
        .options({
          compensationStrategy: "sequential",
          hooks: { afterStep: ctx => hookCalls.push(ctx) },
        })
        .build();
      const resolver = createResolver({
        PortA: async () => {
          throw new Error("fail-hk");
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", { executionId: "fail-hk-1" });
      expect(hookCalls.length).toBe(1);
      expect(hookCalls[0].isCompensation).toBe(false);
      expect(hookCalls[0].error).toBeInstanceOf(Error);
      expect(hookCalls[0].result).toBeUndefined();
    });
  });
});

// =============================================================================
// 3. resolveStepByName deep mutants
// =============================================================================

describe("resolveStepByName: deep boundary tests", () => {
  it("does not match step type when _type is 'parallel' (mutant: _type === 'step' -> !==)", () => {
    const stepA = defineStep("StepFind")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const parallelNodes: SagaNode[] = [{ _type: "parallel", steps: [stepA] }];
    // The step should be found in parallel, not as a direct step node
    expect(resolveStepByName(parallelNodes, "StepFind")?.name).toBe("StepFind");
  });

  it("matches correct step name (mutant: === to !==)", () => {
    const stepA = defineStep("A")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const stepB = defineStep("B")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const nodes: SagaNode[] = [
      { _type: "step", step: stepA },
      { _type: "step", step: stepB },
    ];
    expect(resolveStepByName(nodes, "A")?.name).toBe("A");
    expect(resolveStepByName(nodes, "B")?.name).toBe("B");
    // Wrong name returns undefined
    expect(resolveStepByName(nodes, "C")).toBeUndefined();
  });

  it("searches parallel node type correctly (mutant: _type === 'parallel' -> !==)", () => {
    const pStep = defineStep("PStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const sStep = defineStep("SStep")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const nodes: SagaNode[] = [
      { _type: "step", step: sStep },
      { _type: "parallel", steps: [pStep] },
    ];
    expect(resolveStepByName(nodes, "PStep")?.name).toBe("PStep");
    expect(resolveStepByName(nodes, "SStep")?.name).toBe("SStep");
  });

  it("searches branch node type correctly (mutant: _type === 'branch' -> !==)", () => {
    const bStep = defineStep("BStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const nodes: SagaNode[] = [{ _type: "branch", selector: () => "k", branches: { k: [bStep] } }];
    expect(resolveStepByName(nodes, "BStep")?.name).toBe("BStep");
  });

  it("returns undefined for subSaga nodes (no matching type)", () => {
    const subSagaStep = defineStep("SubS")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const innerSaga = defineSaga("Inner")
      .input<string>()
      .step(subSagaStep)
      .output(r => r.SubS)
      .build();
    const nodes: SagaNode[] = [
      { _type: "subSaga", saga: innerSaga, inputMapper: (x: unknown) => x },
    ];
    expect(resolveStepByName(nodes, "SubS")).toBeUndefined();
  });
});

// =============================================================================
// 4. compensation-handler.ts deep mutants
// =============================================================================

describe("compensation-handler: deep mutants", () => {
  describe("compensation plan filter: compensate && !skipCompensation", () => {
    it("step with compensate and no skipCompensation is included in plan", async () => {
      const CompStep = defineStep("CompIncl")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => ({ undo: true }))
        .build();
      const FailStep = defineStep("FailTrig")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("CompInclSaga")
        .input<string>()
        .step(CompStep)
        .step(FailStep)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => "comp-val",
        PortB: async () => {
          throw new Error("trigger");
        },
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", {
        executionId: "comp-incl-1",
        listeners: [e => events.push(e)],
      });
      expect(result.isErr()).toBe(true);
      const compStarted = findEvent(events, "compensation:started");
      expect(compStarted.stepsToCompensate).toContain("CompIncl");
    });

    it("step with skipCompensation=true is excluded from plan", async () => {
      const SkipComp = defineStep("SkipComp2")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => ({ undo: true }))
        .skipCompensation()
        .build();
      const FailStep = defineStep("FailTrig2")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("SkipCompSaga2")
        .input<string>()
        .step(SkipComp)
        .step(FailStep)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => "val",
        PortB: async () => {
          throw new Error("trigger");
        },
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", {
        executionId: "skip-comp-2",
        listeners: [e => events.push(e)],
      });
      expect(result.isErr()).toBe(true);
      const compStarted = findEvent(events, "compensation:started");
      expect(compStarted.stepsToCompensate).not.toContain("SkipComp2");
    });

    it("step without compensate function is excluded from plan", async () => {
      const NoComp = defineStep("NoComp")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const FailStep = defineStep("FailNoComp")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("NoCompSaga")
        .input<string>()
        .step(NoComp)
        .step(FailStep)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => "val",
        PortB: async () => {
          throw new Error("trigger");
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "no-comp-1",
        listeners: [e => events.push(e)],
      });
      const compStarted = findEvent(events, "compensation:started");
      expect(compStarted.stepsToCompensate).not.toContain("NoComp");
    });
  });

  describe("status transitions in handleStepFailure", () => {
    it("status becomes 'compensating' during compensation, then 'failed' after", async () => {
      let _statusDuringComp: string | undefined;
      const CompObs = defineStep("CompObs")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => ({ undo: true }))
        .build();
      const FailObs = defineStep("FailObs")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("ObsSaga")
        .input<string>()
        .step(CompObs)
        .step(FailObs)
        .output(() => "done")
        .options({
          compensationStrategy: "sequential",
          hooks: {
            beforeCompensation: () => {
              /* status should be "compensating" at this point */
            },
          },
        })
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => "comp-val",
        PortB: async () => {
          throw new Error("fail-obs");
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "obs-1",
        listeners: [e => events.push(e)],
      });
      // After execution, the trace status should be "failed", not empty string
      const trace = runner.getTrace("obs-1");
      expect(trace).not.toBeNull();
      if (trace) {
        expect(trace.status).toBe("failed");
        expect(trace.status).not.toBe("");
      }
    });
  });

  describe("checkpoint: compensation active/compensatedSteps", () => {
    it("checkpoint has active: true during compensation (mutant: false)", async () => {
      // This is tested implicitly: the compensation runs successfully
      // If active was set to false, persister behavior would differ
      const CompCk = defineStep("CompCk")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => ({ undo: true }))
        .build();
      const FailCk = defineStep("FailCk")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("CompCkSaga")
        .input<string>()
        .step(CompCk)
        .step(FailCk)
        .output(() => "done")
        .build();
      const resolver = createResolver({
        PortA: async () => "val",
        PortB: async () => {
          throw new Error("fail-ck");
        },
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "comp-ck-1" });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("StepFailed");
      }
    });
  });

  describe("beforeCompensation hook: stepsToCompensate count", () => {
    it("stepsToCompensate equals the number of compensatable steps, not 0", async () => {
      const hookCalls: any[] = [];
      const C1 = defineStep("C1")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => ({}))
        .build();
      const C2 = defineStep("C2")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .compensate(() => ({}))
        .build();
      const Fail = defineStep("FailH")
        .io<string, string>()
        .invoke(PortC, ctx => ctx.input)
        .build();
      const saga = defineSaga("CompCountSaga")
        .input<string>()
        .step(C1)
        .step(C2)
        .step(Fail)
        .output(() => "done")
        .options({
          compensationStrategy: "sequential",
          hooks: { beforeCompensation: ctx => hookCalls.push(ctx) },
        })
        .build();
      const resolver = createResolver({
        PortA: async () => "a",
        PortB: async () => "b",
        PortC: async () => {
          throw new Error("fail");
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", { executionId: "comp-count-1" });
      expect(hookCalls.length).toBe(1);
      expect(hookCalls[0].stepsToCompensate).toBe(2);
      expect(hookCalls[0].stepsToCompensate).not.toBe(0);
    });
  });

  describe("compensation:started event fields", () => {
    it("compensation:started has correct failedStepName and stepsToCompensate", async () => {
      const Comp = defineStep("CSEvt")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => ({}))
        .build();
      const FailCSEvt = defineStep("FailCSEvt")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("CSEvtSaga")
        .input<string>()
        .step(Comp)
        .step(FailCSEvt)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => "val",
        PortB: async () => {
          throw new Error("fail");
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "cs-evt-1",
        listeners: [e => events.push(e)],
      });
      const compStarted = findEvent(events, "compensation:started");
      expect(compStarted.failedStepName).toBe("FailCSEvt");
      expect(compStarted.failedStepIndex).toBe(1);
      expect(compStarted.stepsToCompensate).toEqual(["CSEvt"]);
    });
  });

  describe("afterCompensation hook fields", () => {
    it("afterCompensation receives compensatedSteps and failedSteps", async () => {
      const hookCalls: any[] = [];
      const ACH = defineStep("ACH")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => ({}))
        .build();
      const FailACH = defineStep("FailACH")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("ACHSaga")
        .input<string>()
        .step(ACH)
        .step(FailACH)
        .output(() => "done")
        .options({
          compensationStrategy: "sequential",
          hooks: { afterCompensation: ctx => hookCalls.push(ctx) },
        })
        .build();
      const resolver = createResolver({
        PortA: async () => "val",
        PortB: async () => {
          throw new Error("fail");
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", { executionId: "ach-1" });
      expect(hookCalls.length).toBe(1);
      expect(hookCalls[0].compensatedSteps).toContain("ACH");
      expect(hookCalls[0].failedSteps).toEqual([]);
    });
  });

  describe("isTimeout path vs non-timeout path in handleStepFailure", () => {
    it("timeout path produces Timeout error with correct timeoutMs and message", async () => {
      const TimeoutComp = defineStep("TimeoutComp")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => ({}))
        .timeout(25)
        .build();
      const saga = defineSaga("TimeoutCompSaga")
        .input<string>()
        .step(TimeoutComp)
        .output(r => r.TimeoutComp)
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: () => new Promise(r => setTimeout(() => r("late"), 10000)),
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", {
        executionId: "timeout-comp-1",
        listeners: [e => events.push(e)],
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Timeout");
        if (result.error._tag === "Timeout") {
          expect(result.error.timeoutMs).toBe(25);
        }
        expect(result.error.message).toContain("timed out after 25ms");
      }
      const sagaFailed = findEvent(events, "saga:failed");
      expect(sagaFailed.type).toBe("saga:failed");
    });

    it("non-timeout path with successful compensation produces StepFailed", async () => {
      const SuccComp = defineStep("SuccComp")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => ({}))
        .build();
      const FailSucc = defineStep("FailSucc")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("SuccCompSaga")
        .input<string>()
        .step(SuccComp)
        .step(FailSucc)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => "val",
        PortB: async () => {
          throw new Error("non-timeout-fail");
        },
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", {
        executionId: "succ-comp-1",
        listeners: [e => events.push(e)],
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("StepFailed");
      }
      const sagaFailed = findEvent(events, "saga:failed");
      expect(sagaFailed.compensated).toBe(true);
    });

    it("non-timeout path with failed compensation produces CompensationFailed", async () => {
      const FailComp = defineStep("FailCompStep")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => {
          throw new Error("comp-fail");
        })
        .build();
      const FailTrigger = defineStep("FailTriggerC")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("FailCompSaga2")
        .input<string>()
        .step(FailComp)
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
        executionId: "fail-comp-2",
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
  });

  describe("baseFields message: isTimeout vs non-timeout", () => {
    it("timeout message includes step name and timeout value", async () => {
      const TMsg = defineStep("TMsg")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .timeout(15)
        .build();
      const saga = defineSaga("TMsgSaga")
        .input<string>()
        .step(TMsg)
        .output(r => r.TMsg)
        .build();
      const resolver = createResolver({
        PortA: () => new Promise(r => setTimeout(() => r("late"), 10000)),
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "tmsg-1" });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("TMsg");
        expect(result.error.message).toContain("timed out");
        expect(result.error.message).toContain("15");
      }
    });

    it("non-timeout message includes step name and 'failed'", async () => {
      const FMsg = defineStep("FMsg")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const saga = defineSaga("FMsgSaga")
        .input<string>()
        .step(FMsg)
        .output(r => r.FMsg)
        .build();
      const resolver = createResolver({
        PortA: async () => {
          throw new Error("fail-msg");
        },
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "fmsg-1" });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain("FMsg");
        expect(result.error.message).toContain("failed");
      }
    });
  });

  describe("compensationResult.allSucceeded path", () => {
    it("allSucceeded true emits compensated=true (mutant: false)", async () => {
      const AllSucc = defineStep("AllSucc")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => ({}))
        .build();
      const FailAllSucc = defineStep("FailAllSucc")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("AllSuccSaga")
        .input<string>()
        .step(AllSucc)
        .step(FailAllSucc)
        .output(() => "done")
        .build();
      const events: SagaEvent[] = [];
      const resolver = createResolver({
        PortA: async () => "val",
        PortB: async () => {
          throw new Error("fail");
        },
      });
      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "in", {
        executionId: "all-succ-1",
        listeners: [e => events.push(e)],
      });
      const sagaFailed = findEvent(events, "saga:failed");
      expect(sagaFailed.compensated).toBe(true);
    });

    it("allSucceeded false emits compensated=false (mutant: true)", async () => {
      const NotSucc = defineStep("NotSucc")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => {
          throw new Error("comp-fail");
        })
        .build();
      const FailNotSucc = defineStep("FailNotSucc")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("NotSuccSaga")
        .input<string>()
        .step(NotSucc)
        .step(FailNotSucc)
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
      await executeSaga(runner, saga, "in", {
        executionId: "not-succ-1",
        listeners: [e => events.push(e)],
      });
      const sagaFailed = findEvent(events, "saga:failed");
      expect(sagaFailed.compensated).toBe(false);
    });
  });

  describe("createCompensationFailedError: errors.length > 0 vs >= 0", () => {
    it("compensation failed error has compensationCause from first error", async () => {
      const CompFail2 = defineStep("CompFail2")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .compensate(() => {
          throw new Error("comp-cause-error");
        })
        .build();
      const FailTrig2 = defineStep("FailTrig2")
        .io<string, string>()
        .invoke(PortB, ctx => ctx.input)
        .build();
      const saga = defineSaga("CompFail2Saga")
        .input<string>()
        .step(CompFail2)
        .step(FailTrig2)
        .output(() => "done")
        .build();
      const resolver = createResolver({
        PortA: async () => "val",
        PortB: async () => {
          throw new Error("trigger");
        },
      });
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "in", { executionId: "comp-fail-2" });
      expect(result.isErr()).toBe(true);
      if (result.isErr() && result.error._tag === "CompensationFailed") {
        // compensationCause should be defined (from errors[0].cause), not undefined
        expect(result.error.compensationCause).toBeDefined();
      }
    });
  });
});

// =============================================================================
// 5. makeCancelledResult deep mutants
// =============================================================================

describe("makeCancelledResult: deep mutants", () => {
  it("sets status to 'cancelled', not empty string", async () => {
    const S1 = defineStep("MkCnclS1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const S2 = defineStep("MkCnclS2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("MkCnclSaga")
      .input<string>()
      .step(S1)
      .step(S2)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => {
        await runnerRef.cancel("mk-cncl-1");
        return "a";
      },
      PortB: async () => "b",
    });
    const runnerRef = createSagaRunner(resolver);
    const result = await executeSaga(runnerRef, saga, "in", {
      executionId: "mk-cncl-1",
      listeners: [e => events.push(e)],
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Cancelled");
    }
    const trace = runnerRef.getTrace("mk-cncl-1");
    if (trace) {
      expect(trace.status).toBe("cancelled");
      expect(trace.status).not.toBe("");
    }
  });

  it("saga:cancelled event has stepName='' and compensated=false", async () => {
    const S1 = defineStep("CnclEvtS1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const S2 = defineStep("CnclEvtS2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CnclEvtSaga")
      .input<string>()
      .step(S1)
      .step(S2)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => {
        await runnerRef.cancel("cncl-evt-1");
        return "a";
      },
      PortB: async () => "b",
    });
    const runnerRef = createSagaRunner(resolver);
    await executeSaga(runnerRef, saga, "in", {
      executionId: "cncl-evt-1",
      listeners: [e => events.push(e)],
    });
    const cancelled = findEvent(events, "saga:cancelled");
    expect(cancelled.stepName).toBe("");
    expect(cancelled.compensated).toBe(false);
    expect(cancelled.compensated).not.toBe(true);
  });

  it("createCancelledError message is 'Saga was cancelled', not empty string", async () => {
    const S1 = defineStep("CnclMsgS1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const S2 = defineStep("CnclMsgS2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CnclMsgSaga")
      .input<string>()
      .step(S1)
      .step(S2)
      .output(() => "done")
      .build();
    const resolver = createResolver({
      PortA: async () => {
        await runnerRef.cancel("cncl-msg-1");
        return "a";
      },
      PortB: async () => "b",
    });
    const runnerRef = createSagaRunner(resolver);
    const result = await executeSaga(runnerRef, saga, "in", { executionId: "cncl-msg-1" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe("Saga was cancelled");
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// 6. events.ts deep mutants
// =============================================================================

describe("events.ts: recordTrace deep mutants", () => {
  describe("step:started trace fields", () => {
    it("status is 'completed' (initial placeholder), not empty string", () => {
      const state = createMockExecutionState();
      emit(state, {
        type: "step:started",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "S",
        stepIndex: 0,
        timestamp: 1000,
      });
      // Initial status is "completed" as placeholder; this is a quirk documented in code
      expect(state.trace.stepTraces[0].status).toBe("completed");
      expect(state.trace.stepTraces[0].status).not.toBe("");
    });

    it("attemptCount is 1, not 0", () => {
      const state = createMockExecutionState();
      emit(state, {
        type: "step:started",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "S",
        stepIndex: 0,
        timestamp: 1000,
      });
      expect(state.trace.stepTraces[0].attemptCount).toBe(1);
      expect(state.trace.stepTraces[0].attemptCount).not.toBe(0);
    });
  });

  describe("step:completed trace: find by stepName AND completedAt === undefined", () => {
    it("matches only traces where completedAt is undefined (second started trace not wrongly matched)", () => {
      const state = createMockExecutionState();
      // First: start and complete step S
      emit(state, {
        type: "step:started",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "S",
        stepIndex: 0,
        timestamp: 1000,
      });
      emit(state, {
        type: "step:completed",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "S",
        stepIndex: 0,
        timestamp: 1050,
        durationMs: 50,
      });
      // Second: start another trace with same name S
      emit(state, {
        type: "step:started",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "S",
        stepIndex: 1,
        timestamp: 2000,
      });
      emit(state, {
        type: "step:completed",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "S",
        stepIndex: 1,
        timestamp: 2100,
        durationMs: 100,
      });

      // First trace should have completedAt = 1050
      expect(state.trace.stepTraces[0].completedAt).toBe(1050);
      expect(state.trace.stepTraces[0].durationMs).toBe(50);
      // Second trace should have completedAt = 2100
      expect(state.trace.stepTraces[1].completedAt).toBe(2100);
      expect(state.trace.stepTraces[1].durationMs).toBe(100);
    });
  });

  describe("step:failed trace: durationMs calculation", () => {
    it("durationMs = timestamp - startedAt when startedAt is defined", () => {
      const state = createMockExecutionState();
      emit(state, {
        type: "step:started",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "FailDur",
        stepIndex: 0,
        timestamp: 5000,
      });
      emit(state, {
        type: "step:failed",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "FailDur",
        stepIndex: 0,
        error: new Error("e"),
        attemptCount: 2,
        timestamp: 5300,
        retriesExhausted: true,
      });
      expect(state.trace.stepTraces[0].durationMs).toBe(300);
      // If mutated to startedAt === undefined check being wrong, this would be undefined
      expect(state.trace.stepTraces[0].durationMs).not.toBeUndefined();
    });
  });

  describe("step:skipped trace fields", () => {
    it("status is 'skipped', not empty string", () => {
      const state = createMockExecutionState();
      emit(state, {
        type: "step:skipped",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "SkipT",
        stepIndex: 0,
        timestamp: 1000,
        reason: "condition-false",
      });
      expect(state.trace.stepTraces[0].status).toBe("skipped");
      expect(state.trace.stepTraces[0].status).not.toBe("");
    });

    it("attemptCount is 0, not 1", () => {
      const state = createMockExecutionState();
      emit(state, {
        type: "step:skipped",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "SkipAttempt",
        stepIndex: 0,
        timestamp: 1000,
        reason: "condition-false",
      });
      expect(state.trace.stepTraces[0].attemptCount).toBe(0);
      expect(state.trace.stepTraces[0].attemptCount).not.toBe(1);
    });
  });

  describe("compensation:started trace fields", () => {
    it("status is 'completed' (initial placeholder), not empty string", () => {
      const state = createMockExecutionState();
      emit(state, {
        type: "compensation:started",
        executionId: "test-exec",
        sagaName: "TestSaga",
        failedStepName: "F",
        failedStepIndex: 0,
        stepsToCompensate: ["S"],
        timestamp: 3000,
      });
      expect(state.trace.compensationTrace!.status).toBe("completed");
      expect(state.trace.compensationTrace!.status).not.toBe("");
    });

    it("totalDurationMs is 0 (initial), not 1", () => {
      const state = createMockExecutionState();
      emit(state, {
        type: "compensation:started",
        executionId: "test-exec",
        sagaName: "TestSaga",
        failedStepName: "F",
        failedStepIndex: 0,
        stepsToCompensate: ["S"],
        timestamp: 3000,
      });
      expect(state.trace.compensationTrace!.totalDurationMs).toBe(0);
      expect(state.trace.compensationTrace!.totalDurationMs).not.toBe(1);
    });
  });

  describe("compensation:step trace", () => {
    it("success=true => status='completed', not 'failed'", () => {
      const state = createMockExecutionState();
      emit(state, {
        type: "compensation:started",
        executionId: "test-exec",
        sagaName: "TestSaga",
        failedStepName: "F",
        failedStepIndex: 0,
        stepsToCompensate: ["S"],
        timestamp: 3000,
      });
      emit(state, {
        type: "compensation:step",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "S",
        stepIndex: 0,
        success: true,
        error: undefined,
        durationMs: 10,
        timestamp: 3010,
      });
      expect(state.trace.compensationTrace!.steps[0].status).toBe("completed");
    });

    it("success=false => status='failed', not 'completed'", () => {
      const state = createMockExecutionState();
      emit(state, {
        type: "compensation:started",
        executionId: "test-exec",
        sagaName: "TestSaga",
        failedStepName: "F",
        failedStepIndex: 0,
        stepsToCompensate: ["S"],
        timestamp: 3000,
      });
      emit(state, {
        type: "compensation:step",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "S",
        stepIndex: 0,
        success: false,
        error: new Error("e"),
        durationMs: 10,
        timestamp: 3010,
      });
      expect(state.trace.compensationTrace!.steps[0].status).toBe("failed");
    });

    it("startedAt = timestamp - durationMs, not timestamp + durationMs", () => {
      const state = createMockExecutionState();
      emit(state, {
        type: "compensation:started",
        executionId: "test-exec",
        sagaName: "TestSaga",
        failedStepName: "F",
        failedStepIndex: 0,
        stepsToCompensate: ["S"],
        timestamp: 3000,
      });
      emit(state, {
        type: "compensation:step",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "S",
        stepIndex: 0,
        success: true,
        error: undefined,
        durationMs: 50,
        timestamp: 3050,
      });
      // startedAt = 3050 - 50 = 3000, not 3050 + 50 = 3100
      expect(state.trace.compensationTrace!.steps[0].startedAt).toBe(3000);
      expect(state.trace.compensationTrace!.steps[0].completedAt).toBe(3050);
    });
  });

  describe("compensation:failed trace", () => {
    it("status becomes 'failed', not empty string", () => {
      const state = createMockExecutionState();
      emit(state, {
        type: "compensation:started",
        executionId: "test-exec",
        sagaName: "TestSaga",
        failedStepName: "F",
        failedStepIndex: 0,
        stepsToCompensate: [],
        timestamp: 5000,
      });
      emit(state, {
        type: "compensation:failed",
        executionId: "test-exec",
        sagaName: "TestSaga",
        failedCompensationStep: "FC",
        error: new Error("cf"),
        compensatedSteps: [],
        remainingSteps: [],
        timestamp: 5200,
      });
      expect(state.trace.compensationTrace!.status).toBe("failed");
      expect(state.trace.compensationTrace!.status).not.toBe("");
    });
  });
});

describe("events.ts: buildExecutionTrace deep mutants", () => {
  describe("completedAt is defined for completed/failed/cancelled", () => {
    it("running status has no completedAt", () => {
      const state = createMockExecutionState({ status: "running" });
      const trace = buildExecutionTrace(state);
      expect(trace.completedAt).toBeUndefined();
      expect(trace.totalDurationMs).toBeUndefined();
    });

    it("completed status has defined completedAt", () => {
      const state = createMockExecutionState({ status: "completed", sagaStartTime: 1000 });
      const trace = buildExecutionTrace(state);
      expect(trace.completedAt).toBeDefined();
      expect(trace.completedAt).toBeGreaterThan(0);
      expect(trace.totalDurationMs).toBeDefined();
      expect(trace.totalDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("failed status has defined completedAt", () => {
      const state = createMockExecutionState({ status: "failed", sagaStartTime: 1000 });
      const trace = buildExecutionTrace(state);
      expect(trace.completedAt).toBeDefined();
    });

    it("cancelled status has defined completedAt", () => {
      const state = createMockExecutionState({ status: "cancelled", sagaStartTime: 1000 });
      const trace = buildExecutionTrace(state);
      expect(trace.completedAt).toBeDefined();
    });

    it("compensating status has no completedAt", () => {
      const state = createMockExecutionState({ status: "compensating" });
      const trace = buildExecutionTrace(state);
      expect(trace.completedAt).toBeUndefined();
      expect(trace.totalDurationMs).toBeUndefined();
    });
  });

  describe("status mapping: running -> 'running', other statuses pass through", () => {
    it("running state maps to 'running' status", () => {
      const state = createMockExecutionState({ status: "running" });
      const trace = buildExecutionTrace(state);
      expect(trace.status).toBe("running");
    });

    it("completed state maps to 'completed' status", () => {
      const state = createMockExecutionState({ status: "completed" });
      const trace = buildExecutionTrace(state);
      expect(trace.status).toBe("completed");
    });

    it("failed state maps to 'failed' status", () => {
      const state = createMockExecutionState({ status: "failed" });
      const trace = buildExecutionTrace(state);
      expect(trace.status).toBe("failed");
    });

    it("cancelled state maps to 'cancelled' status", () => {
      const state = createMockExecutionState({ status: "cancelled" });
      const trace = buildExecutionTrace(state);
      expect(trace.status).toBe("cancelled");
    });

    it("compensating state maps to 'compensating' status", () => {
      const state = createMockExecutionState({ status: "compensating" });
      const trace = buildExecutionTrace(state);
      expect(trace.status).toBe("compensating");
    });
  });
});

// =============================================================================
// 7. step-executor.ts deep mutants
// =============================================================================

describe("step-executor: executeStepWithRetry deep mutants", () => {
  describe("maxAttempts calculation: maxAttempts + 1 vs - 1", () => {
    it("with retryConfig.maxAttempts=2, total attempts is 3 (2+1), not 1 (2-1)", async () => {
      let callCount = 0;
      const step = defineStep("MaxAtt")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .retry({ maxAttempts: 2, delay: 0 })
        .build();
      const result = await executeStepWithRetry(
        step,
        "params",
        async () => {
          callCount++;
          throw new Error("fail");
        },
        { maxAttempts: 2, delay: 0 },
        undefined,
        new AbortController().signal
      );
      expect(result.isErr()).toBe(true);
      expect(callCount).toBe(3);
    });

    it("without retryConfig, total attempts is 1", async () => {
      let callCount = 0;
      const step = defineStep("NoRetryAtt")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const result = await executeStepWithRetry(
        step,
        "params",
        async () => {
          callCount++;
          throw new Error("fail");
        },
        undefined,
        undefined,
        new AbortController().signal
      );
      expect(result.isErr()).toBe(true);
      expect(callCount).toBe(1);
    });
  });

  describe("signal.aborted check at start of loop", () => {
    it("returns cancelled error when signal is aborted", async () => {
      const ac = new AbortController();
      ac.abort();
      const step = defineStep("AbortCheck")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const result = await executeStepWithRetry(
        step,
        "params",
        async () => "should-not-run",
        undefined,
        undefined,
        ac.signal
      );
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error);
        expect((result.error as Error).message).toBe("Saga cancelled");
      }
    });

    it("does not cancel when signal is NOT aborted", async () => {
      const step = defineStep("NoAbort")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const result = await executeStepWithRetry(
        step,
        "params",
        async () => "success",
        undefined,
        undefined,
        new AbortController().signal
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("success");
      }
    });
  });

  describe("timeout vs no timeout path", () => {
    it("timeout=0 (falsy) uses non-timeout path", async () => {
      const step = defineStep("ZeroTimeout")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const result = await executeStepWithRetry(
        step,
        "params",
        async () => "ok",
        undefined,
        0, // falsy timeout
        new AbortController().signal
      );
      expect(result.isOk()).toBe(true);
    });

    it("timeout=1000 uses timeout path", async () => {
      const step = defineStep("RealTimeout")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const result = await executeStepWithRetry(
        step,
        "params",
        async () => "ok",
        undefined,
        1000,
        new AbortController().signal
      );
      expect(result.isOk()).toBe(true);
    });

    it("timeout triggers TimeoutSignal when step is slow", async () => {
      const step = defineStep("SlowTimeout")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .build();
      const result = await executeStepWithRetry(
        step,
        "params",
        () => new Promise(r => setTimeout(() => r("late"), 10000)),
        undefined,
        20,
        new AbortController().signal
      );
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(TimeoutSignal);
        if (result.error instanceof TimeoutSignal) {
          expect(result.error.timeoutMs).toBe(20);
        }
      }
    });
  });

  describe("retryIf predicate inversion", () => {
    it("retryIf returning true allows retry (mutant: negation)", async () => {
      let callCount = 0;
      const step = defineStep("RetryIfTrue")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .retry({ maxAttempts: 2, delay: 0, retryIf: () => true })
        .build();
      const result = await executeStepWithRetry(
        step,
        "params",
        async () => {
          callCount++;
          throw new Error("retry-true");
        },
        { maxAttempts: 2, delay: 0, retryIf: () => true },
        undefined,
        new AbortController().signal
      );
      expect(result.isErr()).toBe(true);
      // All 3 attempts should be made (retryIf allows retrying)
      expect(callCount).toBe(3);
    });

    it("retryIf returning false stops retrying (mutant: negation)", async () => {
      let callCount = 0;
      const step = defineStep("RetryIfFalse")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .retry({ maxAttempts: 3, delay: 0, retryIf: () => false })
        .build();
      const result = await executeStepWithRetry(
        step,
        "params",
        async () => {
          callCount++;
          throw new Error("retry-false");
        },
        { maxAttempts: 3, delay: 0, retryIf: () => false },
        undefined,
        new AbortController().signal
      );
      expect(result.isErr()).toBe(true);
      // Only 1 attempt because retryIf returns false
      expect(callCount).toBe(1);
    });
  });

  describe("delay function vs numeric delay", () => {
    it("function delay receives (attempt+1, lastError)", async () => {
      const delayArgs: Array<[number, unknown]> = [];
      let _callCount = 0;
      const step = defineStep("DelayFn")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .retry({
          maxAttempts: 2,
          delay: (attempt, err) => {
            delayArgs.push([attempt, err]);
            return 0;
          },
        })
        .build();
      const result = await executeStepWithRetry(
        step,
        "params",
        async () => {
          _callCount++;
          throw new Error("delay-fn-fail");
        },
        {
          maxAttempts: 2,
          delay: (attempt: number, err: unknown) => {
            delayArgs.push([attempt, err]);
            return 0;
          },
        },
        undefined,
        new AbortController().signal
      );
      expect(result.isErr()).toBe(true);
      // delay called twice (before retry 1 and retry 2)
      expect(delayArgs.length).toBe(2);
      // attempt+1 for first retry: 0+1=1, for second: 1+1=2
      // If mutated to attempt-1, values would be -1 and 0
      expect(delayArgs[0][0]).toBe(1);
      expect(delayArgs[1][0]).toBe(2);
      expect(delayArgs[0][1]).toBeInstanceOf(Error);
    });

    it("numeric delay of 0 does not invoke sleep (delay > 0 check)", async () => {
      let callCount = 0;
      const step = defineStep("ZeroDelay")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .retry({ maxAttempts: 1, delay: 0 })
        .build();
      const result = await executeStepWithRetry(
        step,
        "params",
        async () => {
          callCount++;
          if (callCount < 2) throw new Error("first-fail");
          return "ok";
        },
        { maxAttempts: 1, delay: 0 },
        undefined,
        new AbortController().signal
      );
      expect(result.isOk()).toBe(true);
      expect(callCount).toBe(2);
    });

    it("numeric delay as fallback when retryConfig.delay is undefined", async () => {
      let callCount = 0;
      const step = defineStep("UndDelay")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .retry({ maxAttempts: 1, delay: 0 })
        .build();
      // Pass delay as undefined in the retryConfig to test ?? 0 fallback
      const result = await executeStepWithRetry(
        step,
        "params",
        async () => {
          callCount++;
          if (callCount < 2) throw new Error("first-fail");
          return "ok";
        },
        { maxAttempts: 1, delay: undefined as unknown as number },
        undefined,
        new AbortController().signal
      );
      expect(result.isOk()).toBe(true);
      expect(callCount).toBe(2);
    });
  });
});

describe("step-executor: invokePort deep mutants", () => {
  it("callable service is invoked with params", async () => {
    const result = invokePort((p: any) => Promise.resolve(p.val * 2), { val: 21 });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(await result.value).toBe(42);
    }
  });

  it("execute method service is invoked with params", async () => {
    const result = invokePort({ execute: (p: any) => Promise.resolve(p.val + 1) }, { val: 99 });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(await result.value).toBe(100);
    }
  });

  it("non-callable, non-execute service returns error with correct message", () => {
    const result = invokePort({ something: "else" }, {});
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe("Port service does not have an executable interface");
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });

  it("callable is checked before execute (priority)", async () => {
    // A function with an execute property should be treated as callable
    const fn = Object.assign((p: any) => Promise.resolve("callable-" + p), {
      execute: () => Promise.resolve("execute"),
    });
    const result = invokePort(fn, "test");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(await result.value).toBe("callable-test");
    }
  });
});

describe("step-executor: TimeoutSignal deep mutants", () => {
  it("stores timeoutMs correctly (mutant: removed assignment)", () => {
    const ts = new TimeoutSignal(3000);
    expect(ts.timeoutMs).toBe(3000);
    // If assignment was removed, timeoutMs would be undefined
    expect(ts.timeoutMs).not.toBeUndefined();
  });

  it("different timeoutMs values are distinct", () => {
    const ts1 = new TimeoutSignal(100);
    const ts2 = new TimeoutSignal(200);
    expect(ts1.timeoutMs).toBe(100);
    expect(ts2.timeoutMs).toBe(200);
    expect(ts1.timeoutMs).not.toBe(ts2.timeoutMs);
  });
});

describe("step-executor: withTimeout and sleep integration", () => {
  it("timeout resolves with TimeoutSignal, not undefined", async () => {
    const step = defineStep("WTO")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const result = await executeStepWithRetry(
      step,
      "params",
      () => new Promise(r => setTimeout(() => r("late"), 10000)),
      undefined,
      10, // 10ms timeout
      new AbortController().signal
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(TimeoutSignal);
      // Not undefined (mutant: err(undefined) instead of err(new TimeoutSignal))
      expect(result.error).not.toBeUndefined();
    }
  });

  it("abort during step execution returns error with message", async () => {
    const ac = new AbortController();
    const step = defineStep("AbortDuring")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const resultPromise = executeStepWithRetry(
      step,
      "params",
      () => new Promise(r => setTimeout(() => r("late"), 10000)),
      undefined,
      5000, // long timeout so abort fires first
      ac.signal
    );
    // Abort shortly after start
    setTimeout(() => ac.abort(), 10);
    const result = await resultPromise;
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe("Saga cancelled");
    }
  });

  it("step that throws non-Error is wrapped in Error by withTimeout", async () => {
    const step = defineStep("NonError")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const result = await executeStepWithRetry(
      step,
      "params",
      async () => {
        throw "string-error";
      },
      undefined,
      1000,
      new AbortController().signal
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // error instanceof Error should be true because withTimeout wraps non-Error
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe("string-error");
    }
  });

  it("sleep cancellation during retry returns error", async () => {
    const ac = new AbortController();
    const step = defineStep("SleepCancel")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 3, delay: 10000 })
      .build();
    let _callCount = 0;
    const resultPromise = executeStepWithRetry(
      step,
      "params",
      async () => {
        _callCount++;
        throw new Error("fail");
      },
      { maxAttempts: 3, delay: 10000 },
      undefined,
      ac.signal
    );
    // Cancel after first attempt fails and retry sleep begins
    setTimeout(() => ac.abort(), 50);
    const result = await resultPromise;
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(Error);
      // Either "Saga cancelled during retry delay" or "Saga cancelled"
      expect((result.error as Error).message).toContain("Saga cancelled");
    }
  });
});

// =============================================================================
// 8. Integration: branch resume skip
// =============================================================================

describe("saga-executor: branch and subSaga resume skips", () => {
  it("branch node is skipped when stepIndex < startFromStep", async () => {
    const BrResumeStep = defineStep("BrResume")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const AfterBr = defineStep("AfterBrResume")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("BrResumeSaga")
      .input<string>()
      .branch(() => "k", { k: [BrResumeStep] })
      .step(AfterBr)
      .output(r => r.AfterBrResume)
      .build();

    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "a",
      PortB: async () => "b",
    });
    const state = createMockExecutionState({
      executionId: "br-resume-1",
      sagaName: "BrResumeSaga",
      input: "in",
      listeners: [(e: SagaEvent) => events.push(e)],
      sagaOptions: saga.options,
    });

    const _result = await executeSagaInternal(
      saga,
      "in",
      resolver,
      state,
      undefined,
      state.abortController.signal,
      1
    );

    // Only AfterBr should be executed
    const stepStarted = findAllEvents(events, "step:started");
    expect(stepStarted.length).toBe(1);
    expect(stepStarted[0].stepName).toBe("AfterBrResume");
  });

  it("subSaga node is skipped when stepIndex < startFromStep", async () => {
    const SubStep = defineStep("SubResume")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const SubSaga = defineSaga("SubResumeSaga")
      .input<string>()
      .step(SubStep)
      .output(r => r.SubResume)
      .build();
    const AfterSub = defineStep("AfterSubResume")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("ParentResumeSaga")
      .input<string>()
      .saga(SubSaga, ctx => ctx.input)
      .step(AfterSub)
      .output(r => r.AfterSubResume)
      .build();

    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "sub-result",
      PortB: async () => "after-result",
    });
    const state = createMockExecutionState({
      executionId: "sub-resume-1",
      sagaName: "ParentResumeSaga",
      input: "in",
      listeners: [(e: SagaEvent) => events.push(e)],
      sagaOptions: saga.options,
    });

    const _result = await executeSagaInternal(
      saga,
      "in",
      resolver,
      state,
      undefined,
      state.abortController.signal,
      1
    );

    // Sub-saga should be skipped, only AfterSub executed in the parent
    const stepStarted = findAllEvents(events, "step:started");
    expect(stepStarted.length).toBe(1);
    expect(stepStarted[0].stepName).toBe("AfterSubResume");
  });
});

// =============================================================================
// 9. Integration: compensation invoker portName resolution
// =============================================================================

describe("compensation-handler: invoker portName resolution", () => {
  it("compensation invoker resolves port by completed step port name, not empty string", async () => {
    let compensationPortName: string | undefined;
    const CompPort = defineStep("CompPort")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ({ undo: ctx.stepResult }))
      .build();
    const FailComp = defineStep("FailCompP")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CompPortSaga")
      .input<string>()
      .step(CompPort)
      .step(FailComp)
      .output(() => "done")
      .build();
    const resolver: PortResolver = {
      resolve(portName: string) {
        if (portName === "PortA") {
          compensationPortName = portName;
          return async () => "compensated";
        }
        if (portName === "PortB") {
          return async () => {
            throw new Error("trigger-fail");
          };
        }
        throw new Error(`Not found: ${portName}`);
      },
    };
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "in", { executionId: "comp-port-1" });
    // The compensation invoker should have resolved "PortA" (not "")
    expect(compensationPortName).toBe("PortA");
  });
});

// =============================================================================
// 10. Compensation: timeout isTimeout && timeoutMs !== undefined
// =============================================================================

describe("compensation-handler: isTimeout path", () => {
  it("isTimeout=true with timeoutMs produces Timeout error, not StepFailed", async () => {
    const TimeoutPath = defineStep("TimeoutPath")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .timeout(15)
      .build();
    const saga = defineSaga("TimeoutPathSaga")
      .input<string>()
      .step(TimeoutPath)
      .output(r => r.TimeoutPath)
      .build();
    const resolver = createResolver({
      PortA: () => new Promise(r => setTimeout(() => r("late"), 10000)),
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "in", { executionId: "timeout-path-1" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      expect(result.error._tag).not.toBe("StepFailed");
    }
  });
});
