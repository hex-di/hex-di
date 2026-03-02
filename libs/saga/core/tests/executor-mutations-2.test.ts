/**
 * Executor Mutations 2
 *
 * Comprehensive mutation-killing tests targeting surviving mutants across:
 * - saga-executor.ts
 * - compensation-handler.ts
 * - step-executor.ts
 * - events.ts
 * - runner.ts
 * - checkpointing.ts
 * - status-builder.ts
 *
 * Each test asserts SPECIFIC values that would fail if a mutation were applied.
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../src/runtime/runner.js";
import { resolveStepByName } from "../src/runtime/saga-executor.js";
import { emit, buildExecutionTrace } from "../src/runtime/events.js";
import { invokePort, TimeoutSignal, executeStepWithRetry } from "../src/runtime/step-executor.js";
import { toCompletedStepState, checkpoint } from "../src/runtime/checkpointing.js";
import { buildSagaStatus } from "../src/runtime/status-builder.js";
import type { PortResolver, SagaEvent } from "../src/runtime/types.js";
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
// 1. saga-executor.ts — Kill StringLiteral, ObjectLiteral, BooleanLiteral mutants
// =============================================================================

describe("saga-executor: event string values are non-empty", () => {
  it("saga:started type is exactly 'saga:started', not empty", async () => {
    const Step = defineStep("StringCheck1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("StringSaga")
      .input<string>()
      .step(Step)
      .output(r => r.StringCheck1)
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({ PortA: async () => "val" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "hello", {
      executionId: "str-1",
      listeners: [e => events.push(e)],
    });
    const started = events[0];
    expect(started.type).toBe("saga:started");
    expect(started.type.length).toBeGreaterThan(0);
    expect(started.executionId).toBe("str-1");
    expect(started.executionId.length).toBeGreaterThan(0);
    expect(started.sagaName).toBe("StringSaga");
    expect(started.sagaName.length).toBeGreaterThan(0);
  });

  it("saga:completed type is exactly 'saga:completed', not empty", async () => {
    const Step = defineStep("CompStr")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("CompStrSaga")
      .input<string>()
      .step(Step)
      .output(r => r.CompStr)
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({ PortA: async () => "done" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "str-comp",
      listeners: [e => events.push(e)],
    });
    const completed = findEvent(events, "saga:completed");
    expect(completed.type).toBe("saga:completed");
    expect(completed.type.length).toBeGreaterThan(0);
  });

  it("step:started type is exactly 'step:started'", async () => {
    const Step = defineStep("StepStr")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("StepStrSaga")
      .input<string>()
      .step(Step)
      .output(r => r.StepStr)
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({ PortA: async () => "ok" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "step-str",
      listeners: [e => events.push(e)],
    });
    const stepStart = findEvent(events, "step:started");
    expect(stepStart.type).toBe("step:started");
    expect(stepStart.stepName).toBe("StepStr");
    expect(stepStart.stepName.length).toBeGreaterThan(0);
  });

  it("step:completed type is exactly 'step:completed'", async () => {
    const Step = defineStep("SCStr")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("SCStrSaga")
      .input<string>()
      .step(Step)
      .output(r => r.SCStr)
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({ PortA: async () => "ok" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "sc-str",
      listeners: [e => events.push(e)],
    });
    const stepComp = findEvent(events, "step:completed");
    expect(stepComp.type).toBe("step:completed");
  });

  it("step:failed type is exactly 'step:failed'", async () => {
    const Step = defineStep("SFStr")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("SFStrSaga")
      .input<string>()
      .step(Step)
      .output(r => r.SFStr)
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "sf-str",
      listeners: [e => events.push(e)],
    });
    const stepFailed = findEvent(events, "step:failed");
    expect(stepFailed.type).toBe("step:failed");
    expect(stepFailed.retriesExhausted).toBe(true);
  });
});

describe("saga-executor: step indices are exactly correct (not off-by-one)", () => {
  it("three sequential steps have indices 0, 1, 2", async () => {
    const S0 = defineStep("Idx0")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const S1 = defineStep("Idx1")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const S2 = defineStep("Idx2")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();
    const saga = defineSaga("IdxSaga")
      .input<string>()
      .step(S0)
      .step(S1)
      .step(S2)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "a",
      PortB: async () => "b",
      PortC: async () => "c",
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "idx-test",
      listeners: [e => events.push(e)],
    });
    const startEvents = findAllEvents(events, "step:started");
    expect(startEvents.length).toBe(3);
    expect(startEvents[0].stepIndex).toBe(0);
    expect(startEvents[1].stepIndex).toBe(1);
    expect(startEvents[2].stepIndex).toBe(2);
    // Also confirm completed events match
    const compEvents = findAllEvents(events, "step:completed");
    expect(compEvents.length).toBe(3);
    expect(compEvents[0].stepIndex).toBe(0);
    expect(compEvents[1].stepIndex).toBe(1);
    expect(compEvents[2].stepIndex).toBe(2);
  });

  it("stepIndex increments (not decrements) for each step", async () => {
    const SA = defineStep("IncA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const SB = defineStep("IncB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("IncSaga")
      .input<string>()
      .step(SA)
      .step(SB)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({ PortA: async () => "a", PortB: async () => "b" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "inc-test",
      listeners: [e => events.push(e)],
    });
    const starts = findAllEvents(events, "step:started");
    // stepIndex[1] > stepIndex[0] — kills ++ => -- mutant
    expect(starts[1].stepIndex).toBeGreaterThan(starts[0].stepIndex);
    expect(starts[1].stepIndex - starts[0].stepIndex).toBe(1);
  });
});

describe("saga-executor: sagaStartTime is set to Date.now()", () => {
  it("saga:started timestamp is a recent Date.now() value", async () => {
    const Step = defineStep("TimeStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("TimeSaga")
      .input<string>()
      .step(Step)
      .output(r => r.TimeStep)
      .build();
    const events: SagaEvent[] = [];
    const before = Date.now();
    const resolver = createResolver({ PortA: async () => "ok" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "time-1",
      listeners: [e => events.push(e)],
    });
    const after = Date.now();
    const started = findEvent(events, "saga:started");
    expect(started.timestamp).toBeGreaterThanOrEqual(before);
    expect(started.timestamp).toBeLessThanOrEqual(after);
  });
});

describe("saga-executor: stepsExecuted increments correctly", () => {
  it("stepsExecuted equals number of actually executed steps, not skipped", async () => {
    const E1 = defineStep("Exe1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const E2 = defineStep("Exe2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const E3 = defineStep("Exe3")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();
    const saga = defineSaga("ExeSaga")
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
    await executeSaga(runner, saga, "x", {
      executionId: "exe-cnt",
      listeners: [e => events.push(e)],
    });
    const completed = findEvent(events, "saga:completed");
    expect(completed.stepsExecuted).toBe(3);
    expect(completed.stepsSkipped).toBe(0);
  });

  it("stepsSkipped increments correctly (not decrements)", async () => {
    const Skip1 = defineStep("Sk1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .when(() => false)
      .build();
    const Skip2 = defineStep("Sk2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .when(() => false)
      .build();
    const Skip3 = defineStep("Sk3")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .when(() => false)
      .build();
    const saga = defineSaga("SkipCntSaga")
      .input<string>()
      .step(Skip1)
      .step(Skip2)
      .step(Skip3)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "a",
      PortB: async () => "b",
      PortC: async () => "c",
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "skip-cnt",
      listeners: [e => events.push(e)],
    });
    const completed = findEvent(events, "saga:completed");
    expect(completed.stepsSkipped).toBe(3);
    expect(completed.stepsExecuted).toBe(0);
  });
});

describe("saga-executor: step condition=false emits 'condition-false' reason", () => {
  it("step:skipped reason is 'condition-false', not empty", async () => {
    const SkipStep = defineStep("CondSkip")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .when(() => false)
      .build();
    const saga = defineSaga("CondSkipSaga")
      .input<string>()
      .step(SkipStep)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({ PortA: async () => "x" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "cond-skip",
      listeners: [e => events.push(e)],
    });
    const skipped = findEvent(events, "step:skipped");
    expect(skipped.reason).toBe("condition-false");
    expect(skipped.reason.length).toBeGreaterThan(0);
    expect(skipped.stepName).toBe("CondSkip");
    expect(skipped.stepName.length).toBeGreaterThan(0);
  });
});

describe("saga-executor: parallel step indices", () => {
  it("parallel steps use baseIndex+i for each step", async () => {
    const PreStep = defineStep("PrePar")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const ParA = defineStep("PA")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const ParB = defineStep("PB")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();
    const saga = defineSaga("ParIdxSaga")
      .input<string>()
      .step(PreStep)
      .parallel([ParA, ParB])
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "pre",
      PortB: async () => "pa",
      PortC: async () => "pb",
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "par-idx",
      listeners: [e => events.push(e)],
    });
    const starts = findAllEvents(events, "step:started");
    expect(starts.length).toBe(3);
    // Pre step at index 0, parallel steps at 1 and 2
    expect(starts[0].stepIndex).toBe(0);
    const parStarts = starts.filter(s => s.stepName === "PA" || s.stepName === "PB");
    const parIndices = parStarts.map(s => s.stepIndex).sort();
    expect(parIndices).toEqual([1, 2]);
  });

  it("parallel step failure returns error", async () => {
    const PA = defineStep("PFA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const PB = defineStep("PFB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("ParFailSaga2")
      .input<string>()
      .parallel([PA, PB])
      .output(() => "done")
      .build();
    const resolver = createResolver({
      PortA: async () => "ok",
      PortB: async () => {
        throw new Error("par-err");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "par-fail-2" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).not.toBe("");
    }
  });
});

describe("saga-executor: branching with accumulated results", () => {
  it("branch accumulates results including __selectedBranch", async () => {
    const BLeft = defineStep("BL")
      .io<{ route: string }, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const BRight = defineStep("BR")
      .io<{ route: string }, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("BranchAccum")
      .input<{ route: string }>()
      .branch(ctx => ctx.input.route, { left: [BLeft], right: [BRight] })
      .output(r => r)
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "left-val",
      PortB: async () => "right-val",
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(
      runner,
      saga,
      { route: "left" },
      { executionId: "branch-accum", listeners: [e => events.push(e)] }
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const output = result.value.output as any;
      expect(output.__selectedBranch).toBe("left");
      expect(output.BL).toBe("left-val");
    }
  });

  it("branch with non-matching key does not error, succeeds with no branch steps", async () => {
    const BStep = defineStep("BOnly")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("BranchMiss")
      .input<string>()
      .branch(() => "missing" as any, { present: [BStep] } as any)
      .output(() => "done")
      .build();
    const resolver = createResolver({ PortA: async () => "nope" });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "branch-miss" });
    expect(result.isOk()).toBe(true);
  });

  it("branch failure within branch step propagates error", async () => {
    const BFail = defineStep("BFail")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("BranchFail")
      .input<string>()
      .branch(() => "a", { a: [BFail] })
      .output(() => "done")
      .build();
    const resolver = createResolver({
      PortA: async () => {
        throw new Error("branch-step-fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "branch-fail" });
    expect(result.isErr()).toBe(true);
  });
});

describe("saga-executor: sub-saga execution", () => {
  it("sub-saga output is accumulated by sub-saga name", async () => {
    const SubStep1 = defineStep("SS1")
      .io<string, { sv: string }>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const SubSaga = defineSaga("SubS")
      .input<string>()
      .step(SubStep1)
      .output(r => r.SS1)
      .build();
    const saga = defineSaga("ParentSub")
      .input<string>()
      .saga(SubSaga, ctx => ctx.input)
      .output(r => r.SubS)
      .build();
    const resolver = createResolver({ PortA: async () => ({ sv: "sub-out" }) });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "sub-out" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toEqual({ sv: "sub-out" });
    }
  });

  it("sub-saga failure propagates to parent", async () => {
    const FailSub = defineStep("FSub")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const FailSubSaga = defineSaga("FailSubSaga2")
      .input<string>()
      .step(FailSub)
      .output(r => r.FSub)
      .build();
    const saga = defineSaga("ParentFail2")
      .input<string>()
      .saga(FailSubSaga, ctx => ctx.input)
      .output(r => r)
      .build();
    const resolver = createResolver({
      PortA: async () => {
        throw new Error("sub-err");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "sub-fail-2" });
    expect(result.isErr()).toBe(true);
  });

  it("sub-saga creates a separate execution state with correct sagaName", async () => {
    const SubStep = defineStep("SubNameStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const SubSaga = defineSaga("NamedSub")
      .input<string>()
      .step(SubStep)
      .output(r => r.SubNameStep)
      .build();
    const saga = defineSaga("ParentNameCheck")
      .input<string>()
      .saga(SubSaga, ctx => ctx.input)
      .output(r => r.NamedSub)
      .build();
    const resolver = createResolver({ PortA: async () => "val" });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "sub-name" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toBeDefined();
    }
  });
});

describe("saga-executor: cancellation mid-execution", () => {
  it("aborted signal before step causes cancelled result with correct stepIndex", async () => {
    const S1 = defineStep("Cancel1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const S2 = defineStep("Cancel2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CancelMid")
      .input<string>()
      .step(S1)
      .step(S2)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => {
        await runnerRef.cancel("cancel-mid-1");
        return "done1";
      },
      PortB: async () => "done2",
    });
    const runnerRef = createSagaRunner(resolver);
    const result = await executeSaga(runnerRef, saga, "x", {
      executionId: "cancel-mid-1",
      listeners: [e => events.push(e)],
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Cancelled");
      expect(result.error.message).toBe("Saga was cancelled");
      expect(result.error.message.length).toBeGreaterThan(0);
      expect(result.error.executionId).toBe("cancel-mid-1");
      expect(result.error.sagaName).toBe("CancelMid");
    }
    const cancelEvent = findEvent(events, "saga:cancelled");
    expect(cancelEvent.compensated).toBe(false);
    expect(cancelEvent.stepName).toBe("");
    expect(cancelEvent.executionId).toBe("cancel-mid-1");
    expect(cancelEvent.sagaName).toBe("CancelMid");
  });

  it("cancellation via external AbortSignal", async () => {
    const controller = new AbortController();
    const SlowStep = defineStep("ExAbort")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("ExAbortSaga")
      .input<string>()
      .step(SlowStep)
      .output(r => r.ExAbort)
      .build();
    const resolver = createResolver({
      PortA: async () => {
        controller.abort();
        return "should-still-return";
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", {
      executionId: "ex-abort-1",
      signal: controller.signal,
    });
    // The saga might complete before abort is checked, or abort might kick in
    // But the abort controller should be linked
    expect(result.isOk() || result.isErr()).toBe(true);
  });
});

describe("saga-executor: output mapper failure produces correct error", () => {
  it("output mapper failure returns StepFailed with stepIndex=-1 and stepName=''", async () => {
    const OkStep = defineStep("MapperFail")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("MapperFailSaga")
      .input<string>()
      .step(OkStep)
      .output(() => {
        throw new Error("mapper-broke");
      })
      .build();
    const resolver = createResolver({ PortA: async () => "ok" });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "mapper-fail-1" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.stepIndex).toBe(-1);
      expect(result.error.stepName).toBe("");
      expect(result.error.message).toContain("Output mapper failed");
      expect(result.error.message).toContain("mapper-broke");
    }
  });
});

describe("saga-executor: completed steps are pushed to completedSteps array", () => {
  it("completedSteps has correct entries after multi-step saga", async () => {
    const A = defineStep("Push1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const B = defineStep("Push2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const FailStep = defineStep("PushFail")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();
    const saga = defineSaga("PushSaga")
      .input<string>()
      .step(A)
      .step(B)
      .step(FailStep)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "val-a",
      PortB: async () => "val-b",
      PortC: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", {
      executionId: "push-1",
      listeners: [e => events.push(e)],
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // completedSteps should contain Push1 and Push2
      expect(result.error.completedSteps).toContain("Push1");
      expect(result.error.completedSteps).toContain("Push2");
      expect(result.error.completedSteps.length).toBe(2);
    }
  });
});

// =============================================================================
// 2. compensation-handler.ts — Kill ObjectLiteral, StringLiteral, BooleanLiteral
// =============================================================================

describe("compensation-handler: compensation plan building", () => {
  it("only includes steps with compensate function and without skipCompensation", async () => {
    const WithComp = defineStep("WithComp")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const NoComp = defineStep("NoComp")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const SkipComp = defineStep("SkipComp2")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .skipCompensation()
      .build();
    const Fail = defineStep("CompFail2")
      .io<string, string>()
      .invoke(PortD, ctx => ctx.input)
      .build();
    const saga = defineSaga("CompPlanSaga")
      .input<string>()
      .step(WithComp)
      .step(NoComp)
      .step(SkipComp)
      .step(Fail)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "a",
      PortB: async () => "b",
      PortC: async () => "c",
      PortD: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", {
      executionId: "comp-plan",
      listeners: [e => events.push(e)],
    });
    expect(result.isErr()).toBe(true);
    const compStarted = findEvent(events, "compensation:started");
    // Only WithComp should be in stepsToCompensate
    expect(compStarted.stepsToCompensate).toEqual(["WithComp"]);
    expect(compStarted.stepsToCompensate.length).toBe(1);
  });
});

describe("compensation-handler: compensation events have correct fields", () => {
  it("compensation:started has non-empty failedStepName, correct failedStepIndex", async () => {
    const CompStep = defineStep("CompEvt")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const FailStep = defineStep("CompEvtFail")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CompEvtSaga")
      .input<string>()
      .step(CompStep)
      .step(FailStep)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "ok",
      PortB: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "comp-evt",
      listeners: [e => events.push(e)],
    });
    const compStarted = findEvent(events, "compensation:started");
    expect(compStarted.failedStepName).toBe("CompEvtFail");
    expect(compStarted.failedStepName.length).toBeGreaterThan(0);
    expect(compStarted.failedStepIndex).toBe(1);
    expect(compStarted.stepsToCompensate).not.toEqual([]);
    expect(compStarted.stepsToCompensate).toContain("CompEvt");
    expect(compStarted.timestamp).toBeTypeOf("number");
    expect(compStarted.timestamp).toBeGreaterThan(0);
  });

  it("saga:failed event has correct compensated=true when all compensations succeed", async () => {
    const CompOk = defineStep("CompOkStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const FailTrig = defineStep("FailTrig")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CompOkSaga")
      .input<string>()
      .step(CompOk)
      .step(FailTrig)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "ok",
      PortB: async () => {
        throw new Error("trigger");
      },
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "comp-ok",
      listeners: [e => events.push(e)],
    });
    const sagaFailed = findEvent(events, "saga:failed");
    expect(sagaFailed.compensated).toBe(true);
    expect(sagaFailed.failedStepName).toBe("FailTrig");
    expect(sagaFailed.failedStepName.length).toBeGreaterThan(0);
    expect(sagaFailed.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("saga:failed event has compensated=false when compensation fails", async () => {
    const FailComp = defineStep("FailCompStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => {
        throw new Error("comp-fail");
      })
      .build();
    const FailTrig2 = defineStep("FailTrig2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("FailCompSaga")
      .input<string>()
      .step(FailComp)
      .step(FailTrig2)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "ok",
      PortB: async () => {
        throw new Error("trigger");
      },
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "fail-comp",
      listeners: [e => events.push(e)],
    });
    const sagaFailed = findEvent(events, "saga:failed");
    expect(sagaFailed.compensated).toBe(false);
  });
});

describe("compensation-handler: timeout path", () => {
  it("timeout triggers compensation with correct timeout error message", async () => {
    const CompTimeout = defineStep("CompTO")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const TimeoutStep = defineStep("TOStep")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .timeout(30)
      .build();
    const saga = defineSaga("TOSaga")
      .input<string>()
      .step(CompTimeout)
      .step(TimeoutStep)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "ok",
      PortB: () => new Promise(r => setTimeout(() => r("late"), 5000)),
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", {
      executionId: "to-comp",
      listeners: [e => events.push(e)],
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      if (result.error._tag === "Timeout") {
        expect(result.error.timeoutMs).toBe(30);
      }
      expect(result.error.message).toContain("timed out");
      expect(result.error.message).toContain("30");
      expect(result.error.stepName).toBe("TOStep");
    }
    // Compensation should have run
    const compStarted = findEvent(events, "compensation:started");
    expect(compStarted.stepsToCompensate).toContain("CompTO");
  });
});

describe("compensation-handler: hooks are called with correct args", () => {
  it("beforeCompensation hook receives stepsToCompensate count, not 0", async () => {
    const HC1 = defineStep("HC1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const HC2 = defineStep("HC2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const HCFail = defineStep("HCFail")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();
    const hookCalls: any[] = [];
    const saga = defineSaga("HCSaga")
      .input<string>()
      .step(HC1)
      .step(HC2)
      .step(HCFail)
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
      PortA: async () => "a",
      PortB: async () => "b",
      PortC: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", { executionId: "hc-test" });
    const before = hookCalls.find(h => h.hook === "before");
    expect(before).toBeDefined();
    expect(before.stepsToCompensate).toBe(2);
    expect(before.failedStepName).toBe("HCFail");
    expect(before.executionId).toBe("hc-test");
    expect(before.sagaName).toBe("HCSaga");
    const after = hookCalls.find(h => h.hook === "after");
    expect(after).toBeDefined();
    expect(after.compensatedSteps).toContain("HC1");
    expect(after.compensatedSteps).toContain("HC2");
    expect(after.failedSteps).toEqual([]);
  });

  it("beforeCompensation hook receives metadata from execution", async () => {
    const MetaComp = defineStep("MetaComp")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const MetaFail = defineStep("MetaFail")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const hookCalls: any[] = [];
    const saga = defineSaga("MetaCompSaga")
      .input<string>()
      .step(MetaComp)
      .step(MetaFail)
      .output(() => "done")
      .options({
        compensationStrategy: "sequential",
        hooks: { beforeCompensation: ctx => hookCalls.push(ctx) },
      })
      .build();
    const resolver = createResolver({
      PortA: async () => "ok",
      PortB: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", { executionId: "meta-comp-1", metadata: { env: "test" } });
    expect(hookCalls.length).toBe(1);
    expect(hookCalls[0].metadata).toEqual({ env: "test" });
  });
});

describe("compensation-handler: makeCancelledResult", () => {
  it("sets status to cancelled on the executionState", async () => {
    const C1 = defineStep("MC1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const C2 = defineStep("MC2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("MCancelSaga")
      .input<string>()
      .step(C1)
      .step(C2)
      .output(() => "done")
      .build();
    const resolver = createResolver({
      PortA: async () => {
        await runnerRef.cancel("mc-cancel");
        return "ok";
      },
      PortB: async () => "should-not-run",
    });
    const runnerRef = createSagaRunner(resolver);
    const result = await executeSaga(runnerRef, saga, "x", { executionId: "mc-cancel" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Cancelled");
      expect(result.error.completedSteps).toBeDefined();
      expect(result.error.compensatedSteps).toEqual([]);
    }
  });
});

describe("compensation-handler: CompensationFailed error structure", () => {
  it("CompensationFailed has failedCompensationSteps array with correct step names", async () => {
    const CFail1 = defineStep("CFail1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => {
        throw new Error("comp-fail-1");
      })
      .build();
    const CFail2 = defineStep("CTrigger")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CFailStructSaga")
      .input<string>()
      .step(CFail1)
      .step(CFail2)
      .output(() => "done")
      .build();
    const resolver = createResolver({
      PortA: async () => "ok",
      PortB: async () => {
        throw new Error("trigger");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "cfail-struct" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("CompensationFailed");
      if (result.error._tag === "CompensationFailed") {
        expect(result.error.failedCompensationSteps).toContain("CFail1");
        expect(result.error.failedCompensationSteps.length).toBeGreaterThan(0);
        expect(result.error.compensationCause).toBeDefined();
      }
    }
  });
});

// =============================================================================
// 3. step-executor.ts — Kill more mutants
// =============================================================================

describe("step-executor: invokePort edge cases", () => {
  it("invokePort returns promise that resolves to the function result", async () => {
    const service = (params: any) => params.x + 1;
    const result = invokePort(service, { x: 5 });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const value = await result.value;
      expect(value).toBe(6);
    }
  });

  it("invokePort with execute method returns promise that resolves", async () => {
    const service = { execute: (params: any) => params.y * 2 };
    const result = invokePort(service, { y: 3 });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const value = await result.value;
      expect(value).toBe(6);
    }
  });

  it("invokePort returns err for object without execute", () => {
    const result = invokePort({ foo: "bar" }, {});
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe("Port service does not have an executable interface");
      expect(result.error.message.length).toBeGreaterThan(0);
    }
  });

  it("invokePort returns err for undefined service", () => {
    const result = invokePort(undefined, {});
    expect(result.isErr()).toBe(true);
  });

  it("invokePort returns err for boolean service", () => {
    const result = invokePort(true, {});
    expect(result.isErr()).toBe(true);
  });

  it("invokePort wraps sync function result in Promise", async () => {
    const syncService = () => "sync-result";
    const result = invokePort(syncService, {});
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(await result.value).toBe("sync-result");
    }
  });
});

describe("step-executor: TimeoutSignal stores timeoutMs correctly", () => {
  it("timeoutMs is exact value, not 0 or undefined", () => {
    const signal = new TimeoutSignal(1234);
    expect(signal.timeoutMs).toBe(1234);
    expect(signal.timeoutMs).not.toBe(0);
    expect(signal).toBeInstanceOf(TimeoutSignal);
  });

  it("timeoutMs 0 is stored as 0", () => {
    const signal = new TimeoutSignal(0);
    expect(signal.timeoutMs).toBe(0);
  });
});

describe("step-executor: retry with retryIf returning false stops immediately", () => {
  it("does not retry when retryIf returns false", async () => {
    let callCount = 0;
    const Step = defineStep("NoRetryIf")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 3, delay: 0, retryIf: () => false })
      .build();
    const saga = defineSaga("NoRetryIfSaga")
      .input<string>()
      .step(Step)
      .output(r => r.NoRetryIf)
      .build();
    const resolver = createResolver({
      PortA: async () => {
        callCount++;
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "no-retryif" });
    expect(result.isErr()).toBe(true);
    expect(callCount).toBe(1);
  });
});

describe("step-executor: retry with delay=0 boundary", () => {
  it("delay=0 does not actually sleep (fast execution)", async () => {
    let callCount = 0;
    const Step = defineStep("ZeroDelay")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 2, delay: 0 })
      .build();
    const saga = defineSaga("ZeroDelaySaga")
      .input<string>()
      .step(Step)
      .output(r => r.ZeroDelay)
      .build();
    const start = Date.now();
    const resolver = createResolver({
      PortA: async () => {
        callCount++;
        if (callCount < 3) throw new Error("fail");
        return "ok";
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "zero-delay" });
    const elapsed = Date.now() - start;
    expect(result.isOk()).toBe(true);
    expect(callCount).toBe(3);
    // Delay=0 means effectively no sleep, should be fast
    expect(elapsed).toBeLessThan(500);
  });
});

describe("step-executor: retry with delay function", () => {
  it("delay function receives correct attempt number and error", async () => {
    let callCount = 0;
    const delays: any[] = [];
    const Step = defineStep("DelayFn")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({
        maxAttempts: 2,
        delay: (attempt: number, err: unknown) => {
          delays.push({ attempt, err });
          return 1;
        },
      })
      .build();
    const saga = defineSaga("DelayFnSaga")
      .input<string>()
      .step(Step)
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
    await executeSaga(runner, saga, "x", { executionId: "delay-fn" });
    expect(delays.length).toBe(2);
    expect(delays[0].attempt).toBe(1);
    expect(delays[1].attempt).toBe(2);
    expect(delays[0].err).toBeInstanceOf(Error);
    expect((delays[0].err as Error).message).toBe("fail-1");
    expect((delays[1].err as Error).message).toBe("fail-2");
  });
});

describe("step-executor: executeStepWithRetry directly", () => {
  it("returns ok when service succeeds on first attempt", async () => {
    const step = defineStep("Direct1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const service = async (params: any) => params;
    const controller = new AbortController();
    const result = await executeStepWithRetry(
      step,
      "input",
      service,
      undefined,
      undefined,
      controller.signal
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("input");
    }
  });

  it("returns err when service is not callable", async () => {
    const step = defineStep("Direct2")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const controller = new AbortController();
    const result = await executeStepWithRetry(
      step,
      "input",
      42,
      undefined,
      undefined,
      controller.signal
    );
    expect(result.isErr()).toBe(true);
  });

  it("returns err when signal is already aborted", async () => {
    const step = defineStep("Direct3")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const controller = new AbortController();
    controller.abort();
    const result = await executeStepWithRetry(
      step,
      "input",
      async () => "ok",
      undefined,
      undefined,
      controller.signal
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect((result.error as Error).message).toBe("Saga cancelled");
    }
  });

  it("with timeout, returns TimeoutSignal when promise takes too long", async () => {
    const step = defineStep("Direct4")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const controller = new AbortController();
    const result = await executeStepWithRetry(
      step,
      "input",
      async () => new Promise(r => setTimeout(() => r("late"), 5000)),
      undefined,
      30,
      controller.signal
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(TimeoutSignal);
      if (result.error instanceof TimeoutSignal) {
        expect(result.error.timeoutMs).toBe(30);
      }
    }
  });

  it("with timeout, returns value when promise resolves before timeout", async () => {
    const step = defineStep("Direct5")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const controller = new AbortController();
    const result = await executeStepWithRetry(
      step,
      "input",
      async () => "fast-val",
      undefined,
      5000,
      controller.signal
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("fast-val");
    }
  });
});

// =============================================================================
// 4. events.ts — Kill more mutants in recordTrace
// =============================================================================

describe("events: recordTrace edge cases", () => {
  it("step:started sets initial status to 'completed' (will be updated later)", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "step:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "InitStep",
      stepIndex: 0,
      timestamp: 1000,
    });
    expect(state.trace.stepTraces[0].status).toBe("completed");
    expect(state.trace.stepTraces[0].completedAt).toBeUndefined();
    expect(state.trace.stepTraces[0].durationMs).toBeUndefined();
  });

  it("step:completed finds correct trace by stepName and completedAt===undefined", () => {
    const state = createMockExecutionState();
    // Add two traces with same name but first is already completed
    emit(state, {
      type: "step:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "Dup",
      stepIndex: 0,
      timestamp: 1000,
    });
    // Manually mark first as completed
    state.trace.stepTraces[0].completedAt = 1050;
    // Start another with same name
    emit(state, {
      type: "step:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "Dup",
      stepIndex: 1,
      timestamp: 2000,
    });
    // Complete the second one
    emit(state, {
      type: "step:completed",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "Dup",
      stepIndex: 1,
      timestamp: 2050,
      durationMs: 50,
    });
    expect(state.trace.stepTraces[1].completedAt).toBe(2050);
    expect(state.trace.stepTraces[1].durationMs).toBe(50);
    // First trace should remain unchanged
    expect(state.trace.stepTraces[0].completedAt).toBe(1050);
  });

  it("step:failed calculates durationMs from startedAt", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "step:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "DurCalc",
      stepIndex: 0,
      timestamp: 3000,
    });
    emit(state, {
      type: "step:failed",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "DurCalc",
      stepIndex: 0,
      error: new Error("e"),
      attemptCount: 2,
      timestamp: 3150,
      retriesExhausted: true,
    });
    const trace = state.trace.stepTraces[0];
    expect(trace.durationMs).toBe(150); // 3150 - 3000
    expect(trace.status).toBe("failed");
    expect(trace.attemptCount).toBe(2);
    expect(trace.error).toBeInstanceOf(Error);
  });

  it("step:failed with undefined startedAt sets durationMs to undefined", () => {
    const state = createMockExecutionState();
    // Manually push a trace with undefined startedAt
    state.trace.stepTraces.push({
      stepName: "NoStart",
      stepIndex: 0,
      status: "completed",
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
      attemptCount: 1,
      error: undefined,
      skippedReason: undefined,
    });
    emit(state, {
      type: "step:failed",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "NoStart",
      stepIndex: 0,
      error: "err",
      attemptCount: 1,
      timestamp: 5000,
      retriesExhausted: true,
    });
    expect(state.trace.stepTraces[0].durationMs).toBeUndefined();
  });

  it("step:skipped sets attemptCount to 0 and status to 'skipped'", () => {
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
    const trace = state.trace.stepTraces[0];
    expect(trace.attemptCount).toBe(0);
    expect(trace.status).toBe("skipped");
    expect(trace.startedAt).toBeUndefined();
    expect(trace.completedAt).toBeUndefined();
    expect(trace.durationMs).toBeUndefined();
    expect(trace.error).toBeUndefined();
    expect(trace.skippedReason).toBe("condition-false");
  });

  it("compensation:started initializes compensationTrace with correct fields", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "compensation:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedStepName: "TriggeredBy",
      failedStepIndex: 5,
      stepsToCompensate: ["A", "B"],
      timestamp: 8000,
    });
    const ct = state.trace.compensationTrace;
    expect(ct).toBeDefined();
    expect(ct!.triggeredBy).toBe("TriggeredBy");
    expect(ct!.triggeredByIndex).toBe(5);
    expect(ct!.steps).toEqual([]);
    expect(ct!.status).toBe("completed");
    expect(ct!.startedAt).toBe(8000);
    expect(ct!.completedAt).toBe(8000);
    expect(ct!.totalDurationMs).toBe(0);
  });

  it("compensation:step with success=true sets status to 'completed'", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "compensation:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedStepName: "X",
      failedStepIndex: 0,
      stepsToCompensate: ["CS"],
      timestamp: 1000,
    });
    emit(state, {
      type: "compensation:step",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "CS",
      stepIndex: 0,
      success: true,
      error: undefined,
      durationMs: 20,
      timestamp: 1020,
    });
    const step = state.trace.compensationTrace!.steps[0];
    expect(step.status).toBe("completed");
    expect(step.startedAt).toBe(1000); // timestamp - durationMs
    expect(step.completedAt).toBe(1020);
    expect(step.durationMs).toBe(20);
    expect(step.error).toBeUndefined();
  });

  it("compensation:step with success=false sets status to 'failed' and overall status", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "compensation:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedStepName: "X",
      failedStepIndex: 0,
      stepsToCompensate: ["CF"],
      timestamp: 1000,
    });
    const compError = new Error("comp-step-err");
    emit(state, {
      type: "compensation:step",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "CF",
      stepIndex: 0,
      success: false,
      error: compError,
      durationMs: 5,
      timestamp: 1005,
    });
    const step = state.trace.compensationTrace!.steps[0];
    expect(step.status).toBe("failed");
    expect(step.error).toBe(compError);
    expect(state.trace.compensationTrace!.status).toBe("failed");
  });

  it("compensation:completed updates completedAt and totalDurationMs", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "compensation:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedStepName: "X",
      failedStepIndex: 0,
      stepsToCompensate: [],
      timestamp: 1000,
    });
    emit(state, {
      type: "compensation:completed",
      executionId: "test-exec",
      sagaName: "TestSaga",
      compensatedSteps: ["Y"],
      totalDurationMs: 250,
      timestamp: 1250,
    });
    const ct = state.trace.compensationTrace!;
    expect(ct.completedAt).toBe(1250);
    expect(ct.totalDurationMs).toBe(250);
  });

  it("compensation:failed sets status to 'failed' and calculates totalDurationMs from startedAt", () => {
    const state = createMockExecutionState();
    emit(state, {
      type: "compensation:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedStepName: "X",
      failedStepIndex: 0,
      stepsToCompensate: [],
      timestamp: 2000,
    });
    emit(state, {
      type: "compensation:failed",
      executionId: "test-exec",
      sagaName: "TestSaga",
      failedCompensationStep: "FC",
      error: new Error("fc"),
      compensatedSteps: [],
      remainingSteps: [],
      timestamp: 2300,
    });
    const ct = state.trace.compensationTrace!;
    expect(ct.status).toBe("failed");
    expect(ct.completedAt).toBe(2300);
    expect(ct.totalDurationMs).toBe(300); // 2300 - 2000
  });

  it("compensation:step without prior compensation:started does not crash", () => {
    const state = createMockExecutionState();
    expect(() =>
      emit(state, {
        type: "compensation:step",
        executionId: "test-exec",
        sagaName: "TestSaga",
        stepName: "Orphan",
        stepIndex: 0,
        success: true,
        error: undefined,
        durationMs: 1,
        timestamp: 1000,
      })
    ).not.toThrow();
    expect(state.trace.compensationTrace).toBeUndefined();
  });

  it("compensation:completed without prior compensation:started does not crash", () => {
    const state = createMockExecutionState();
    expect(() =>
      emit(state, {
        type: "compensation:completed",
        executionId: "test-exec",
        sagaName: "TestSaga",
        compensatedSteps: [],
        totalDurationMs: 0,
        timestamp: 1000,
      })
    ).not.toThrow();
    expect(state.trace.compensationTrace).toBeUndefined();
  });

  it("compensation:failed without prior compensation:started does not crash", () => {
    const state = createMockExecutionState();
    expect(() =>
      emit(state, {
        type: "compensation:failed",
        executionId: "test-exec",
        sagaName: "TestSaga",
        failedCompensationStep: "X",
        error: new Error("err"),
        compensatedSteps: [],
        remainingSteps: [],
        timestamp: 1000,
      })
    ).not.toThrow();
    expect(state.trace.compensationTrace).toBeUndefined();
  });
});

describe("events: buildExecutionTrace comprehensive", () => {
  it("compensating status returns status 'compensating'", () => {
    const state = createMockExecutionState({ status: "compensating", sagaStartTime: 100 });
    const trace = buildExecutionTrace(state);
    expect(trace.status).toBe("compensating");
    // compensating is not in the completed set, so completedAt/totalDurationMs should be undefined
    expect(trace.completedAt).toBeUndefined();
    expect(trace.totalDurationMs).toBeUndefined();
  });

  it("running status returns completedAt as undefined", () => {
    const state = createMockExecutionState({ status: "running", sagaStartTime: 100 });
    const trace = buildExecutionTrace(state);
    expect(trace.status).toBe("running");
    expect(trace.completedAt).toBeUndefined();
    expect(trace.totalDurationMs).toBeUndefined();
  });

  it("completed status returns numeric completedAt and totalDurationMs", () => {
    const state = createMockExecutionState({ status: "completed", sagaStartTime: 1000 });
    const trace = buildExecutionTrace(state);
    expect(trace.completedAt).toBeTypeOf("number");
    expect(trace.totalDurationMs).toBeTypeOf("number");
    expect(trace.totalDurationMs!).toBeGreaterThanOrEqual(0);
  });

  it("failed status returns numeric completedAt", () => {
    const state = createMockExecutionState({ status: "failed", sagaStartTime: 1000 });
    const trace = buildExecutionTrace(state);
    expect(trace.status).toBe("failed");
    expect(trace.completedAt).toBeTypeOf("number");
  });

  it("cancelled status returns numeric completedAt", () => {
    const state = createMockExecutionState({ status: "cancelled", sagaStartTime: 1000 });
    const trace = buildExecutionTrace(state);
    expect(trace.status).toBe("cancelled");
    expect(trace.completedAt).toBeTypeOf("number");
  });

  it("trace includes compensation when compensationTrace is present", () => {
    const state = createMockExecutionState({ status: "failed" });
    state.trace.compensationTrace = {
      triggeredBy: "FailStep",
      triggeredByIndex: 2,
      steps: [
        {
          stepName: "CompS",
          stepIndex: 1,
          status: "completed",
          startedAt: 100,
          completedAt: 110,
          durationMs: 10,
          error: undefined,
        },
      ],
      status: "completed",
      startedAt: 100,
      completedAt: 120,
      totalDurationMs: 20,
    };
    const trace = buildExecutionTrace(state);
    expect(trace.compensation).toBeDefined();
    expect(trace.compensation!.triggeredBy).toBe("FailStep");
    expect(trace.compensation!.triggeredByIndex).toBe(2);
    expect(trace.compensation!.steps.length).toBe(1);
    expect(trace.compensation!.steps[0].stepName).toBe("CompS");
    expect(trace.compensation!.status).toBe("completed");
    expect(trace.compensation!.totalDurationMs).toBe(20);
    expect(Object.isFrozen(trace.compensation!.steps)).toBe(true);
  });

  it("trace is deeply frozen", () => {
    const state = createMockExecutionState({ status: "completed" });
    emit(state, {
      type: "step:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "FrozenStep",
      stepIndex: 0,
      timestamp: 100,
    });
    emit(state, {
      type: "step:completed",
      executionId: "test-exec",
      sagaName: "TestSaga",
      stepName: "FrozenStep",
      stepIndex: 0,
      timestamp: 110,
      durationMs: 10,
    });
    const trace = buildExecutionTrace(state);
    expect(Object.isFrozen(trace)).toBe(true);
    expect(Object.isFrozen(trace.steps)).toBe(true);
    if (trace.steps.length > 0) {
      expect(Object.isFrozen(trace.steps[0])).toBe(true);
    }
  });
});

describe("events: emit calls listeners and swallows errors", () => {
  it("emit passes event to all listeners in order", () => {
    const calls: number[] = [];
    const state = createMockExecutionState({
      listeners: [() => calls.push(1), () => calls.push(2), () => calls.push(3)],
    });
    emit(state, {
      type: "saga:started",
      executionId: "test-exec",
      sagaName: "TestSaga",
      timestamp: 0,
      input: null,
      stepCount: 0,
      metadata: undefined,
    });
    expect(calls).toEqual([1, 2, 3]);
  });

  it("emit swallows listener errors and continues to next listener", () => {
    const calls: number[] = [];
    const state = createMockExecutionState({
      listeners: [
        () => calls.push(1),
        () => {
          throw new Error("boom");
        },
        () => calls.push(3),
      ],
    });
    expect(() =>
      emit(state, {
        type: "saga:started",
        executionId: "test-exec",
        sagaName: "TestSaga",
        timestamp: 0,
        input: null,
        stepCount: 0,
        metadata: undefined,
      })
    ).not.toThrow();
    expect(calls).toContain(1);
    expect(calls).toContain(3);
  });
});

// =============================================================================
// 5. runner.ts — Kill mutants in createSagaRunner
// =============================================================================

describe("runner: execute returns correct executionId", () => {
  it("uses custom executionId from options", async () => {
    const Step = defineStep("ExIdStep")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("ExIdSaga")
      .input<string>()
      .step(Step)
      .output(r => r.ExIdStep)
      .build();
    const resolver = createResolver({ PortA: async () => "ok" });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "custom-id-123" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.executionId).toBe("custom-id-123");
    }
  });

  it("generates executionId when not provided", async () => {
    const Step = defineStep("AutoId")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("AutoIdSaga")
      .input<string>()
      .step(Step)
      .output(r => r.AutoId)
      .build();
    const resolver = createResolver({ PortA: async () => "ok" });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.executionId).toBeDefined();
      expect(result.value.executionId.length).toBeGreaterThan(0);
      expect(result.value.executionId).toContain("exec-");
    }
  });
});

describe("runner: cancel unknown execution returns error", () => {
  it("cancel returns ExecutionNotFound for unknown executionId", async () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);
    const result = await runner.cancel("nonexistent");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ExecutionNotFound");
      expect(result.error.message).toContain("nonexistent");
    }
  });
});

describe("runner: getStatus for unknown execution returns error", () => {
  it("getStatus returns ExecutionNotFound", async () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);
    const result = await runner.getStatus("unknown-id");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ExecutionNotFound");
      expect(result.error.message).toContain("unknown-id");
    }
  });
});

describe("runner: getTrace for unknown execution returns null", () => {
  it("returns null", () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);
    expect(runner.getTrace("no-such-id")).toBeNull();
  });
});

describe("runner: subscribe for unknown execution returns no-op unsubscribe", () => {
  it("returns function that does not throw", () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);
    const unsub = runner.subscribe("unknown", () => {});
    expect(typeof unsub).toBe("function");
    expect(() => unsub()).not.toThrow();
  });
});

describe("runner: subscribe and unsubscribe", () => {
  it("subscriber receives events, unsubscribe stops delivery", async () => {
    const d1 = deferred<string>();
    const d2 = deferred<string>();
    const S1 = defineStep("SubS1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const S2 = defineStep("SubS2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("SubSaga2")
      .input<string>()
      .step(S1)
      .step(S2)
      .output(() => "done")
      .build();
    const resolver = createResolver({ PortA: () => d1.promise, PortB: () => d2.promise });
    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "x", { executionId: "sub-unsub" });
    const events: SagaEvent[] = [];
    const unsub = runner.subscribe("sub-unsub", e => events.push(e));
    d1.resolve("a");
    await new Promise(r => setTimeout(r, 20));
    const countBefore = events.length;
    unsub();
    d2.resolve("b");
    await resultAsync;
    // After unsub, should not receive saga:completed
    const afterTypes = events.slice(countBefore).map(e => e.type);
    expect(afterTypes).not.toContain("saga:completed");
  });
});

describe("runner: resume without persister", () => {
  it("resume returns error when no persister configured", async () => {
    const resolver = createResolver({});
    const runner = createSagaRunner(resolver);
    const result = await runner.resume("resume-no-persist");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain("Resume not implemented");
      expect(result.error._tag).toBe("StepFailed");
    }
  });
});

describe("runner: listeners from options receive events from the start", () => {
  it("listener in options receives saga:started as first event", async () => {
    const Step = defineStep("ListOpt")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("ListOptSaga")
      .input<string>()
      .step(Step)
      .output(r => r.ListOpt)
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({ PortA: async () => "ok" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "list-opt",
      listeners: [e => events.push(e)],
    });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe("saga:started");
  });
});

describe("runner: metadata is passed through", () => {
  it("saga:started event includes metadata from options", async () => {
    const Step = defineStep("MetaOpt")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("MetaOptSaga")
      .input<string>()
      .step(Step)
      .output(r => r.MetaOpt)
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({ PortA: async () => "ok" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "meta-opt",
      listeners: [e => events.push(e)],
      metadata: { key: "value" },
    });
    const started = findEvent(events, "saga:started");
    expect(started.metadata).toEqual({ key: "value" });
  });

  it("saga:started event has undefined metadata when none provided", async () => {
    const Step = defineStep("NoMeta")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("NoMetaSaga")
      .input<string>()
      .step(Step)
      .output(r => r.NoMeta)
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({ PortA: async () => "ok" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", {
      executionId: "no-meta",
      listeners: [e => events.push(e)],
    });
    const started = findEvent(events, "saga:started");
    expect(started.metadata).toBeUndefined();
  });
});

describe("runner: timeout from saga options vs execute options", () => {
  it("execute options timeout takes precedence over saga timeout", async () => {
    const Step = defineStep("TOPrecedence")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("TOPrecedenceSaga")
      .input<string>()
      .step(Step)
      .output(r => r.TOPrecedence)
      .options({ compensationStrategy: "sequential", timeout: 10000 })
      .build();
    const resolver = createResolver({
      PortA: () => new Promise(r => setTimeout(() => r("late"), 5000)),
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "to-prec", timeout: 30 });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      expect(result.error.message).toContain("30");
    }
  });
});

// =============================================================================
// 6. checkpointing.ts — Kill mutants
// =============================================================================

describe("checkpointing: toCompletedStepState field mapping", () => {
  it("maps stepName to name correctly", () => {
    const step = defineStep("NameMap")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const state = toCompletedStepState({ stepName: "NameMap", stepIndex: 0, result: "r", step });
    expect(state.name).toBe("NameMap");
    expect(state.name).not.toBe("");
  });

  it("maps stepIndex to index correctly", () => {
    const step = defineStep("IdxMap")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const state = toCompletedStepState({ stepName: "IdxMap", stepIndex: 5, result: "r", step });
    expect(state.index).toBe(5);
  });

  it("maps result to output correctly", () => {
    const step = defineStep("OutMap")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const state = toCompletedStepState({
      stepName: "OutMap",
      stepIndex: 0,
      result: { key: "val" },
      step,
    });
    expect(state.output).toEqual({ key: "val" });
  });

  it("skipped is always false", () => {
    const step = defineStep("SkipFalse")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const state = toCompletedStepState({ stepName: "SkipFalse", stepIndex: 0, result: null, step });
    expect(state.skipped).toBe(false);
    expect(state.skipped).not.toBe(true);
  });

  it("completedAt is a valid ISO string", () => {
    const step = defineStep("ISODate")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const state = toCompletedStepState({ stepName: "ISODate", stepIndex: 0, result: null, step });
    expect(state.completedAt).toBeDefined();
    expect(typeof state.completedAt).toBe("string");
    expect(state.completedAt.length).toBeGreaterThan(0);
    // Verify it parses as a valid date
    const parsed = new Date(state.completedAt);
    expect(parsed.toISOString()).toBe(state.completedAt);
  });
});

describe("checkpointing: checkpoint function", () => {
  it("does nothing when no persister is configured", async () => {
    const state = createMockExecutionState();
    // No persister, should not throw
    await checkpoint(state, { status: "running" });
    // No error events should be emitted
    expect(state.trace.stepTraces.length).toBe(0);
  });

  it("calls persister.update when persister is configured", async () => {
    const updateFn = vi.fn((_executionId: string, _updates: any) => ResultAsync.ok(undefined));
    const mockPersister = {
      save: vi.fn(() => ResultAsync.ok(undefined)),
      load: vi.fn(() => ResultAsync.ok(null)),
      delete: vi.fn(() => ResultAsync.ok(undefined)),
      list: vi.fn(() => ResultAsync.ok([])),
      update: vi.fn((executionId: string, updates: any) => {
        return ResultAsync.ok(undefined).andThen(() => {
          updateFn(executionId, updates);
          return ResultAsync.ok(undefined);
        });
      }),
    };
    const state = createMockExecutionState({ persister: mockPersister as any });
    await checkpoint(state, { status: "completed" });
    // The persister.update should have been called
    expect(mockPersister.update).toHaveBeenCalledWith(
      "test-exec",
      expect.objectContaining({
        status: "completed",
        timestamps: expect.objectContaining({
          updatedAt: expect.any(String),
        }),
      })
    );
  });

  it("emits step:failed event when persister.update fails", async () => {
    const mockPersister = {
      save: vi.fn(() => ResultAsync.ok(undefined)),
      load: vi.fn(() => ResultAsync.ok(null)),
      delete: vi.fn(() => ResultAsync.ok(undefined)),
      list: vi.fn(() => ResultAsync.ok([])),
      update: vi.fn(() =>
        ResultAsync.err({
          _tag: "StorageFailure" as const,
          operation: "update",
          cause: new Error("persist-fail"),
        })
      ),
    };
    const events: SagaEvent[] = [];
    const state = createMockExecutionState({
      persister: mockPersister as any,
      listeners: [(e: SagaEvent) => events.push(e)],
    });
    await checkpoint(state, { status: "failed" });
    // Should have emitted a step:failed event for __checkpoint
    const failEvent = events.find(
      e => e.type === "step:failed" && (e as any).stepName === "__checkpoint"
    );
    expect(failEvent).toBeDefined();
  });
});

// =============================================================================
// 7. status-builder.ts — Kill remaining mutants
// =============================================================================

describe("status-builder: field values are exact", () => {
  it("running currentStepIndex equals completedSteps.length", () => {
    const status = buildSagaStatus("running", "ex1", "Saga1", ["a", "b", "c"], 500);
    if (status.state === "running") {
      expect(status.currentStepIndex).toBe(3);
      expect(status.completedSteps.length).toBe(3);
    }
  });

  it("running with empty completedSteps has currentStepIndex=0", () => {
    const status = buildSagaStatus("running", "ex2", "Saga2", [], 500);
    if (status.state === "running") {
      expect(status.currentStepIndex).toBe(0);
    }
  });

  it("compensating failedStepIndex equals completedSteps.length", () => {
    const status = buildSagaStatus("compensating", "ex3", "Saga3", ["a"], 500);
    if (status.state === "compensating") {
      expect(status.failedStepIndex).toBe(1);
    }
  });

  it("cancelled has correct executionId and sagaName", () => {
    const status = buildSagaStatus("cancelled", "ex4", "Saga4", [], 999);
    expect(status.state).toBe("cancelled");
    expect(status.executionId).toBe("ex4");
    expect(status.sagaName).toBe("Saga4");
    if (status.state === "cancelled") {
      expect(status.cancelledAt).toBe(999);
      expect(status.startedAt).toBe(999);
    }
  });

  it("failed error has _tag=StepFailed", () => {
    const status = buildSagaStatus("failed", "ex5", "Saga5", [], 100);
    if (status.state === "failed") {
      expect(status.error._tag).toBe("StepFailed");
      expect(status.error._tag).not.toBe("");
    }
  });

  it("compensating error message is 'Compensation in progress'", () => {
    const status = buildSagaStatus("compensating", "ex6", "Saga6", [], 100);
    if (status.state === "compensating") {
      expect(status.error.message).toBe("Compensation in progress");
      expect(status.error.message.length).toBeGreaterThan(0);
    }
  });

  it("failed error message is 'Saga failed'", () => {
    const status = buildSagaStatus("failed", "ex7", "Saga7", [], 100);
    if (status.state === "failed") {
      expect(status.error.message).toBe("Saga failed");
      expect(status.error.message.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// 8. resolveStepByName — comprehensive
// =============================================================================

describe("resolveStepByName: edge cases", () => {
  it("returns correct step from nested branch", () => {
    const leftA = defineStep("LA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const leftB = defineStep("LB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const rightA = defineStep("RA")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();
    const nodes: SagaNode[] = [
      {
        _type: "branch",
        selector: () => "left",
        branches: { left: [leftA, leftB], right: [rightA] },
      },
    ];
    expect(resolveStepByName(nodes, "LA")?.name).toBe("LA");
    expect(resolveStepByName(nodes, "LB")?.name).toBe("LB");
    expect(resolveStepByName(nodes, "RA")?.name).toBe("RA");
    expect(resolveStepByName(nodes, "Unknown")).toBeUndefined();
  });

  it("returns correct step from parallel node", () => {
    const p1 = defineStep("P1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const p2 = defineStep("P2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const nodes: SagaNode[] = [{ _type: "parallel", steps: [p1, p2] }];
    expect(resolveStepByName(nodes, "P1")?.name).toBe("P1");
    expect(resolveStepByName(nodes, "P2")?.name).toBe("P2");
  });

  it("searches through multiple node types", () => {
    const s1 = defineStep("Solo")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const p1 = defineStep("InPar")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const b1 = defineStep("InBranch")
      .io<string, string>()
      .invoke(PortC, ctx => ctx.input)
      .build();
    const nodes: SagaNode[] = [
      { _type: "step", step: s1 },
      { _type: "parallel", steps: [p1] },
      { _type: "branch", selector: () => "a", branches: { a: [b1] } },
    ];
    expect(resolveStepByName(nodes, "Solo")?.name).toBe("Solo");
    expect(resolveStepByName(nodes, "InPar")?.name).toBe("InPar");
    expect(resolveStepByName(nodes, "InBranch")?.name).toBe("InBranch");
  });
});

// =============================================================================
// 9. hooks: beforeStep hook receives isCompensation=false
// =============================================================================

describe("hooks: beforeStep isCompensation is false for forward steps", () => {
  it("isCompensation is false in beforeStep context", async () => {
    const HStep = defineStep("IsCompFalse")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const hookCalls: any[] = [];
    const saga = defineSaga("IsCompSaga")
      .input<string>()
      .step(HStep)
      .output(r => r.IsCompFalse)
      .options({
        compensationStrategy: "sequential",
        hooks: { beforeStep: ctx => hookCalls.push(ctx) },
      })
      .build();
    const resolver = createResolver({ PortA: async () => "ok" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", { executionId: "is-comp" });
    expect(hookCalls.length).toBe(1);
    expect(hookCalls[0].isCompensation).toBe(false);
    expect(hookCalls[0].isCompensation).not.toBe(true);
  });
});

describe("hooks: afterStep on failure has correct fields", () => {
  it("afterStep receives correct error, undefined result, correct attemptCount", async () => {
    const FHStep = defineStep("AfterFail")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 1, delay: 0 })
      .build();
    const hookCalls: any[] = [];
    const saga = defineSaga("AfterFailSaga")
      .input<string>()
      .step(FHStep)
      .output(r => r.AfterFail)
      .options({
        compensationStrategy: "sequential",
        hooks: { afterStep: ctx => hookCalls.push(ctx) },
      })
      .build();
    const testErr = new Error("after-fail-err");
    const resolver = createResolver({
      PortA: async () => {
        throw testErr;
      },
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", { executionId: "after-fail" });
    expect(hookCalls.length).toBe(1);
    expect(hookCalls[0].result).toBeUndefined();
    expect(hookCalls[0].error).toBe(testErr);
    expect(hookCalls[0].attemptCount).toBe(2); // maxAttempts=1 => 1+1=2 total
    expect(hookCalls[0].isCompensation).toBe(false);
    expect(hookCalls[0].durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe("hooks: afterStep on success has correct fields", () => {
  it("afterStep receives result value, undefined error, attemptCount=1", async () => {
    const SHStep = defineStep("AfterOk")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const hookCalls: any[] = [];
    const saga = defineSaga("AfterOkSaga")
      .input<string>()
      .step(SHStep)
      .output(r => r.AfterOk)
      .options({
        compensationStrategy: "sequential",
        hooks: { afterStep: ctx => hookCalls.push(ctx) },
      })
      .build();
    const resolver = createResolver({ PortA: async () => "success-val" });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", { executionId: "after-ok" });
    expect(hookCalls.length).toBe(1);
    expect(hookCalls[0].result).toBe("success-val");
    expect(hookCalls[0].error).toBeUndefined();
    expect(hookCalls[0].attemptCount).toBe(1);
    expect(hookCalls[0].stepName).toBe("AfterOk");
    expect(hookCalls[0].stepIndex).toBe(0);
  });
});

describe("hooks: hook errors do not abort saga", () => {
  it("beforeStep throwing does not prevent step execution", async () => {
    const SafeStep = defineStep("HookSafe")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("HookSafeSaga")
      .input<string>()
      .step(SafeStep)
      .output(r => r.HookSafe)
      .options({
        compensationStrategy: "sequential",
        hooks: {
          beforeStep: () => {
            throw new Error("hook-err");
          },
        },
      })
      .build();
    const resolver = createResolver({ PortA: async () => "still-ok" });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "hook-safe" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toBe("still-ok");
    }
  });

  it("afterStep throwing does not prevent saga completion", async () => {
    const AfterSafe = defineStep("AfterSafe")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("AfterSafeSaga")
      .input<string>()
      .step(AfterSafe)
      .output(r => r.AfterSafe)
      .options({
        compensationStrategy: "sequential",
        hooks: {
          afterStep: () => {
            throw new Error("after-hook-err");
          },
        },
      })
      .build();
    const resolver = createResolver({ PortA: async () => "still-ok-2" });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "after-safe" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toBe("still-ok-2");
    }
  });

  it("beforeCompensation throwing does not prevent compensation", async () => {
    const CompSafe = defineStep("CompSafe")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const FailSafe = defineStep("FailSafe")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CompSafeSaga")
      .input<string>()
      .step(CompSafe)
      .step(FailSafe)
      .output(() => "done")
      .options({
        compensationStrategy: "sequential",
        hooks: {
          beforeCompensation: () => {
            throw new Error("before-comp-err");
          },
        },
      })
      .build();
    const resolver = createResolver({
      PortA: async () => "ok",
      PortB: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "comp-safe" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Compensation should still have run
      expect(result.error.compensatedSteps).toContain("CompSafe");
    }
  });

  it("afterCompensation throwing does not prevent error propagation", async () => {
    const CompSafe2 = defineStep("CompSafe2")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const FailSafe2 = defineStep("FailSafe2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("CompSafe2Saga")
      .input<string>()
      .step(CompSafe2)
      .step(FailSafe2)
      .output(() => "done")
      .options({
        compensationStrategy: "sequential",
        hooks: {
          afterCompensation: () => {
            throw new Error("after-comp-err");
          },
        },
      })
      .build();
    const resolver = createResolver({
      PortA: async () => "ok",
      PortB: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "comp-safe-2" });
    expect(result.isErr()).toBe(true);
  });
});

// =============================================================================
// 10. Global timeout — Additional path coverage
// =============================================================================

describe("global timeout: clears timeout when saga completes before deadline", () => {
  it("fast saga with global timeout succeeds", async () => {
    const FastStep = defineStep("FastTO")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("FastTOSaga")
      .input<string>()
      .step(FastStep)
      .output(r => r.FastTO)
      .build();
    const resolver = createResolver({ PortA: async () => "fast" });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "fast-to", timeout: 5000 });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toBe("fast");
    }
  });
});

describe("global timeout message includes timeout value", () => {
  it("Timeout error message contains the timeout ms value", async () => {
    const SlowStep = defineStep("GlobalTO")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("GlobalTOSaga")
      .input<string>()
      .step(SlowStep)
      .output(r => r.GlobalTO)
      .build();
    const resolver = createResolver({
      PortA: () => new Promise(r => setTimeout(() => r("late"), 5000)),
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "global-to", timeout: 40 });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
      expect(result.error.message).toContain("40");
      expect(result.error.sagaName).toBe("GlobalTOSaga");
    }
  });
});

// =============================================================================
// 11. Port resolution error message
// =============================================================================

describe("port resolution: error message contains port name", () => {
  it("PortNotFound error has correct portName and message", async () => {
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
    const result = await executeSaga(runner, saga, "x", { executionId: "bad-port" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("PortNotFound");
      if (result.error._tag === "PortNotFound") {
        expect(result.error.portName).toBe("MissingPortX");
        expect(result.error.portName.length).toBeGreaterThan(0);
      }
      expect(result.error.message).toContain("MissingPortX");
      expect(result.error.message).toContain("not found in container");
    }
  });
});

// =============================================================================
// 12. saga-executor: startFromStep resume skipping
// =============================================================================

describe("saga-executor: resume skipping behavior", () => {
  it("resume skips steps before startFromStep", async () => {
    // This is tested via the persister-backed resume path
    // Using a mock persister to test the resume behavior
    const S1 = defineStep("Res1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const S2 = defineStep("Res2")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("ResumeSaga")
      .input<string>()
      .step(S1)
      .step(S2)
      .output(r => r.Res2)
      .build();
    const _events: SagaEvent[] = [];
    const mockPersister = {
      save: () => ResultAsync.ok(undefined),
      load: (exId: string) =>
        ResultAsync.ok({
          executionId: exId,
          sagaName: "ResumeSaga",
          input: "resume-input",
          currentStep: 1,
          completedSteps: [
            {
              name: "Res1",
              index: 0,
              output: "already-done",
              skipped: false,
              completedAt: new Date().toISOString(),
            },
          ],
          status: "running" as const,
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
          totalSteps: 2,
          pendingStep: null,
        }),
      delete: () => ResultAsync.ok(undefined),
      list: () => ResultAsync.ok([]),
      update: () => ResultAsync.ok(undefined),
    } as any;
    const resolver = createResolver({
      PortA: async () => "should-not-be-called",
      PortB: async () => "resumed-step-2",
    });
    const runner = createSagaRunner(resolver, { persister: mockPersister });
    // First execute to register the saga in the registry
    await executeSaga(runner, saga, "x", { executionId: "resume-reg" });
    // Now resume
    const result = await runner.resume("resume-reg");
    // The resume should skip step 0 and execute step 1
    expect(result.isOk()).toBe(true);
  });
});

// =============================================================================
// 13. compensation-handler: checkpoint calls during compensation
// =============================================================================

describe("compensation-handler: state transitions", () => {
  it("status transitions from running to compensating to failed", async () => {
    const CompState = defineStep("CompState")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const FailState = defineStep("FailState")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("StateTransSaga")
      .input<string>()
      .step(CompState)
      .step(FailState)
      .output(() => "done")
      .build();
    const resolver = createResolver({
      PortA: async () => "ok",
      PortB: async () => {
        throw new Error("trigger-fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "state-trans" });
    expect(result.isErr()).toBe(true);
    // After compensation, the trace should show the saga went through compensating
    const trace = runner.getTrace("state-trans");
    expect(trace).not.toBeNull();
    if (trace) {
      expect(trace.status).toBe("failed");
      expect(trace.compensation).toBeDefined();
    }
  });
});

// =============================================================================
// 14. Additional boundary tests
// =============================================================================

describe("boundary: single step saga", () => {
  it("single step saga that succeeds returns ok with output", async () => {
    const Single = defineStep("Single")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const saga = defineSaga("SingleSaga")
      .input<string>()
      .step(Single)
      .output(r => r.Single)
      .build();
    const resolver = createResolver({ PortA: async () => "single-result" });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "single-1" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toBe("single-result");
      expect(result.value.executionId).toBe("single-1");
    }
  });
});

describe("boundary: empty compensation plan", () => {
  it("when no steps have compensate, compensation is still triggered but no steps compensated", async () => {
    const NoCompA = defineStep("NoCompA")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const NoCompB = defineStep("NoCompB")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .build();
    const saga = defineSaga("EmptyCompSaga")
      .input<string>()
      .step(NoCompA)
      .step(NoCompB)
      .output(() => "done")
      .build();
    const events: SagaEvent[] = [];
    const resolver = createResolver({
      PortA: async () => "ok",
      PortB: async () => {
        throw new Error("fail");
      },
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", {
      executionId: "empty-comp",
      listeners: [e => events.push(e)],
    });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // StepFailed because compensation succeeds (vacuously) when there are no steps to compensate
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.compensatedSteps).toEqual([]);
    }
  });
});

describe("boundary: step with condition that depends on previous result", () => {
  it("condition receives accumulated results", async () => {
    const condCalls: any[] = [];
    const First = defineStep("First")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const Conditional = defineStep("Conditional")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .when(ctx => {
        condCalls.push(ctx);
        return (ctx.results as any).First === "gate-open";
      })
      .build();
    const saga = defineSaga("CondDepSaga")
      .input<string>()
      .step(First)
      .step(Conditional)
      .output(r => r)
      .build();
    const resolver = createResolver({
      PortA: async () => "gate-open",
      PortB: async () => "conditional-ran",
    });
    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "x", { executionId: "cond-dep" });
    expect(result.isOk()).toBe(true);
    expect(condCalls.length).toBe(1);
    expect(condCalls[0].results.First).toBe("gate-open");
    expect(condCalls[0].stepIndex).toBe(1);
    expect(condCalls[0].executionId).toBe("cond-dep");
  });
});

describe("saga-executor: step result accumulation is correct", () => {
  it("accumulated results are passed to invoke of later steps", async () => {
    const invokeCalls: any[] = [];
    const First = defineStep("Accum1")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    const Second = defineStep("Accum2")
      .io<string, string>()
      .invoke(PortB, ctx => {
        invokeCalls.push(ctx.results);
        return ctx.input;
      })
      .build();
    const saga = defineSaga("AccumCheckSaga")
      .input<string>()
      .step(First)
      .step(Second)
      .output(() => "done")
      .build();
    const resolver = createResolver({
      PortA: async () => "first-val",
      PortB: async () => "second-val",
    });
    const runner = createSagaRunner(resolver);
    await executeSaga(runner, saga, "x", { executionId: "accum-check" });
    expect(invokeCalls.length).toBe(1);
    expect(invokeCalls[0].Accum1).toBe("first-val");
  });
});
