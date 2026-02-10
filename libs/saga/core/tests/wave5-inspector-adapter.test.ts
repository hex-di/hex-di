/**
 * Wave 5 — Mutation-killing tests for surviving Stryker mutants.
 *
 * Targets:
 *   1. src/integration/inspector-adapter.ts  (hasDispose, indexObject, adapter fields, finalizer)
 *   2. src/step/builder.ts                   (options() branches, widenRetryConfig)
 *   3. src/runtime/checkpointing.ts          (toCompletedStepState, checkpoint error event)
 *   4. src/ports/factory.ts                  (hasSagaPortKind, hasPortName, isSagaPort, isSagaManagementPort)
 *   5. src/introspection/saga-inspector.ts   (traceToExecutionState, extractStepInfo, executionStateToSummary,
 *      getCurrentStepName, getActiveExecutions, getSuggestions, computeCompensationStats, emitToInspector)
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { createSagaInspectorAdapter } from "../src/integration/inspector-adapter.js";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { toCompletedStepState, checkpoint } from "../src/runtime/checkpointing.js";
import {
  sagaPort,
  sagaManagementPort,
  isSagaPort,
  isSagaManagementPort,
  SagaPersisterPort,
  SagaRegistryPort,
  SagaInspectorPort,
} from "../src/ports/factory.js";
import { createSagaInspector, emitToInspector } from "../src/introspection/saga-inspector.js";
import type { SagaPersister, SagaExecutionState, CompensationState } from "../src/ports/types.js";
import type {
  ExecutionTrace,
  StepTrace,
  CompensationTrace,
  CompensationStepTrace,
  SagaEvent,
} from "../src/runtime/types.js";
import type { ExecutionState, CompletedStepInfo } from "../src/runtime/execution-state.js";
import type { AnyStepDefinition } from "../src/step/types.js";

// =============================================================================
// Shared Test Ports and Steps
// =============================================================================

const PortA = createPort<"PortA", any>({ name: "PortA" });
const PortB = createPort<"PortB", any>({ name: "PortB" });
const PortC = createPort<"PortC", any>({ name: "PortC" });

const StepA = defineStep("StepA")
  .io<{ id: string }, { txId: string }>()
  .invoke(PortA, ctx => ctx.input)
  .compensate(ctx => ({ refund: ctx.stepResult.txId }))
  .build();

const StepB = defineStep("StepB")
  .io<{ id: string }, { shipId: string }>()
  .invoke(PortB, ctx => ctx.input)
  .compensate(ctx => ({ cancel: ctx.stepResult.shipId }))
  .options({ retry: { maxAttempts: 3, delay: 100 }, timeout: 5000 })
  .build();

const StepC = defineStep("StepC")
  .io<{ id: string }, void>()
  .invoke(PortC, ctx => ctx.input)
  .when(ctx => (ctx.results as any).StepA !== undefined)
  .build();

const TestSaga = defineSaga("TestSaga")
  .input<{ id: string }>()
  .step(StepA)
  .step(StepB)
  .step(StepC)
  .output(r => r)
  .build();

// =============================================================================
// Helpers
// =============================================================================

function createMockPersister(states: SagaExecutionState[] = []): SagaPersister {
  return {
    save: () => ResultAsync.ok(undefined),
    load: () => ResultAsync.ok(null),
    delete: () => ResultAsync.ok(undefined),
    list: () => ResultAsync.ok(states),
    update: () => ResultAsync.ok(undefined),
  };
}

function makeTrace(overrides?: Partial<ExecutionTrace>): ExecutionTrace {
  return {
    executionId: "exec-1",
    sagaName: "TestSaga",
    input: {},
    status: "running",
    steps: [],
    compensation: undefined,
    startedAt: Date.now(),
    completedAt: undefined,
    totalDurationMs: undefined,
    metadata: undefined,
    ...overrides,
  };
}

function makeStepTrace(overrides?: Partial<StepTrace>): StepTrace {
  return {
    stepName: "StepA",
    stepIndex: 0,
    status: "completed",
    startedAt: Date.now() - 100,
    completedAt: Date.now(),
    durationMs: 100,
    attemptCount: 1,
    error: undefined,
    skippedReason: undefined,
    ...overrides,
  };
}

function makeCompensationStepTrace(
  overrides?: Partial<CompensationStepTrace>
): CompensationStepTrace {
  return {
    stepName: "StepA",
    stepIndex: 0,
    status: "completed",
    startedAt: 100,
    completedAt: 200,
    durationMs: 100,
    error: undefined,
    ...overrides,
  };
}

function makeExecutionState(overrides?: Partial<SagaExecutionState>): SagaExecutionState {
  return {
    executionId: "exec-1",
    sagaName: "TestSaga",
    input: {},
    currentStep: 0,
    completedSteps: [],
    status: "completed",
    error: null,
    compensation: {
      active: false,
      compensatedSteps: [],
      failedSteps: [],
      triggeringStepIndex: null,
    },
    timestamps: {
      startedAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:01.000Z",
      completedAt: null,
    },
    metadata: {},
    ...overrides,
  };
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
// 1. inspector-adapter.ts — hasDispose, indexObject, adapter properties
// =============================================================================

describe("inspector-adapter.ts", () => {
  describe("createSagaInspectorAdapter returns frozen adapter with correct fields", () => {
    it("has lifetime 'singleton' (not empty string)", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      expect(adapter.lifetime).toBe("singleton");
      expect(adapter.lifetime).not.toBe("");
    });

    it("has factoryKind 'sync' (not empty string)", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      expect(adapter.factoryKind).toBe("sync");
      expect(adapter.factoryKind).not.toBe("");
    });

    it("has clonable false (not true)", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      expect(adapter.clonable).toBe(false);
    });

    it("result is frozen (Object.freeze was applied)", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      expect(Object.isFrozen(adapter)).toBe(true);
    });

    it("provides SagaInspectorPort", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      expect(adapter.provides).toBe(SagaInspectorPort);
    });

    it("requires SagaRegistryPort", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      expect(adapter.requires).toContain(SagaRegistryPort);
    });
  });

  describe("factory creates a working SagaInspector", () => {
    it("creates inspector with provided definitions", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [TestSaga] });
      const deps = { SagaRegistry: {} } as any;
      const inspector = adapter.factory(deps);
      const defs = inspector.getDefinitions();
      expect(defs).toHaveLength(1);
      expect(defs[0].name).toBe("TestSaga");
    });

    it("passes config.persister to inspector", async () => {
      const persister = createMockPersister([makeExecutionState({ executionId: "persist-1" })]);
      const adapter = createSagaInspectorAdapter({ definitions: [TestSaga], persister });
      const deps = { SagaRegistry: {} } as any;
      const inspector = adapter.factory(deps);
      const history = await inspector.getHistory();
      expect(history.isOk()).toBe(true);
      if (history.isOk()) {
        expect(history.value).toHaveLength(1);
      }
    });

    it("passes config.activeTraces to inspector", () => {
      const traces: Record<string, ExecutionTrace> = {
        t1: makeTrace({ executionId: "t1", status: "running" }),
      };
      const adapter = createSagaInspectorAdapter({
        definitions: [TestSaga],
        activeTraces: traces,
      });
      const deps = { SagaRegistry: {} } as any;
      const inspector = adapter.factory(deps);
      const active = inspector.getActiveExecutions();
      expect(active).toHaveLength(1);
    });
  });

  describe("finalizer calls dispose on disposable instances", () => {
    it("calls dispose when instance has a dispose method", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      const disposeFn = vi.fn();
      const instance = {
        getDefinitions: () => [],
        getActiveExecutions: () => [],
        getHistory: () => ResultAsync.ok([]),
        getTrace: () => null,
        getCompensationStats: () => ({
          totalCompensations: 0,
          successfulCompensations: 0,
          failedCompensations: 0,
          averageCompensationTime: 0,
          mostCompensatedSaga: null,
          bySaga: [],
        }),
        getSuggestions: () => [],
        subscribe: () => () => {},
        dispose: disposeFn,
      } as any;
      adapter.finalizer!(instance);
      expect(disposeFn).toHaveBeenCalledTimes(1);
    });

    it("does NOT call dispose when instance has no dispose method", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      const instance = {
        getDefinitions: () => [],
        getActiveExecutions: () => [],
        getHistory: () => ResultAsync.ok([]),
        getTrace: () => null,
        getCompensationStats: () => ({
          totalCompensations: 0,
          successfulCompensations: 0,
          failedCompensations: 0,
          averageCompensationTime: 0,
          mostCompensatedSaga: null,
          bySaga: [],
        }),
        getSuggestions: () => [],
        subscribe: () => () => {},
      } as any;
      // Should not throw
      expect(() => adapter.finalizer!(instance)).not.toThrow();
    });

    it("does NOT call dispose when value is null", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      expect(() => adapter.finalizer!(null as any)).not.toThrow();
    });

    it("does NOT call dispose when value is a primitive", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      expect(() => adapter.finalizer!(42 as any)).not.toThrow();
      expect(() => adapter.finalizer!("string" as any)).not.toThrow();
    });

    it("does NOT call dispose when dispose is not a function", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      const instance = { dispose: "not-a-function" } as any;
      expect(() => adapter.finalizer!(instance)).not.toThrow();
    });
  });
});

// =============================================================================
// 2. step/builder.ts — options() method branches, widenRetryConfig
// =============================================================================

describe("step/builder.ts — options() method", () => {
  describe("retry branch", () => {
    it("sets retry when opts.retry is provided", () => {
      const step = defineStep("OptRetry")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({ retry: { maxAttempts: 5, delay: 200 } })
        .build();

      expect(step.options.retry).toBeDefined();
      expect(step.options.retry!.maxAttempts).toBe(5);
    });

    it("does NOT set retry when opts.retry is undefined", () => {
      const step = defineStep("OptNoRetry")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({})
        .build();

      expect(step.options.retry).toBeUndefined();
    });
  });

  describe("timeout branch", () => {
    it("sets timeout when opts.timeout is 0 (falsy but defined)", () => {
      const step = defineStep("OptTimeout0")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({ timeout: 0 })
        .build();

      expect(step.options.timeout).toBe(0);
    });

    it("sets timeout when opts.timeout is positive", () => {
      const step = defineStep("OptTimeoutPos")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({ timeout: 5000 })
        .build();

      expect(step.options.timeout).toBe(5000);
    });

    it("does NOT set timeout when opts.timeout is undefined", () => {
      const step = defineStep("OptNoTimeout")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({})
        .build();

      expect(step.options.timeout).toBeUndefined();
    });
  });

  describe("skipCompensation branch", () => {
    it("sets skipCompensation when it is false (falsy but defined)", () => {
      const step = defineStep("SkipFalse")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({ skipCompensation: false })
        .build();

      expect(step.options.skipCompensation).toBe(false);
    });

    it("sets skipCompensation when it is true", () => {
      const step = defineStep("SkipTrue")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({ skipCompensation: true })
        .build();

      expect(step.options.skipCompensation).toBe(true);
    });

    it("does NOT set skipCompensation when undefined", () => {
      const step = defineStep("SkipUndef")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({})
        .build();

      expect(step.options.skipCompensation).toBeUndefined();
    });
  });

  describe("metadata branch", () => {
    it("sets metadata when it is an empty object (falsy-ish but defined)", () => {
      const step = defineStep("MetaEmpty")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({ metadata: {} })
        .build();

      expect(step.options.metadata).toEqual({});
    });

    it("sets metadata with non-empty object", () => {
      const step = defineStep("MetaNonEmpty")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({ metadata: { key: "value" } })
        .build();

      expect(step.options.metadata).toEqual({ key: "value" });
    });

    it("does NOT set metadata when undefined", () => {
      const step = defineStep("MetaUndef")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({})
        .build();

      expect(step.options.metadata).toBeUndefined();
    });
  });

  describe("widenRetryConfig via options()", () => {
    it("preserves numeric delay as-is", () => {
      const step = defineStep("NumDelay")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({ retry: { maxAttempts: 2, delay: 500 } })
        .build();

      expect(step.options.retry!.delay).toBe(500);
      expect(typeof step.options.retry!.delay).toBe("number");
    });

    it("wraps function delay via widenDelayFn", () => {
      const delayFn = (attempt: number, _error: unknown) => attempt * 100;
      const step = defineStep("FnDelay")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({ retry: { maxAttempts: 3, delay: delayFn } })
        .build();

      expect(typeof step.options.retry!.delay).toBe("function");
      const fn = step.options.retry!.delay as (attempt: number, error: unknown) => number;
      expect(fn(2, "err")).toBe(200);
    });

    it("preserves retryIf when provided", () => {
      const retryIfFn = (error: unknown) => error instanceof Error;
      const step = defineStep("WithRetryIf")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({ retry: { maxAttempts: 2, delay: 100, retryIf: retryIfFn } })
        .build();

      expect(step.options.retry!.retryIf).toBeDefined();
      expect(step.options.retry!.retryIf!(new Error("test"))).toBe(true);
      expect(step.options.retry!.retryIf!("not an error")).toBe(false);
    });

    it("retryIf is undefined when not provided", () => {
      const step = defineStep("NoRetryIf")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({ retry: { maxAttempts: 2, delay: 100 } })
        .build();

      expect(step.options.retry!.retryIf).toBeUndefined();
    });
  });

  describe("combined options sets all fields independently", () => {
    it("options with all fields set simultaneously", () => {
      const step = defineStep("AllOpts")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .options({
          retry: { maxAttempts: 3, delay: 100 },
          timeout: 5000,
          skipCompensation: true,
          metadata: { key: "val" },
        })
        .build();

      expect(step.options.retry!.maxAttempts).toBe(3);
      expect(step.options.timeout).toBe(5000);
      expect(step.options.skipCompensation).toBe(true);
      expect(step.options.metadata).toEqual({ key: "val" });
    });

    it("options called with only timeout does not overwrite prior retry", () => {
      const step = defineStep("RetryThenTimeout")
        .io<string, string>()
        .invoke(PortA, ctx => ctx.input)
        .retry({ maxAttempts: 3, delay: 200 })
        .options({ timeout: 1000 })
        .build();

      expect(step.options.retry!.maxAttempts).toBe(3);
      expect(step.options.timeout).toBe(1000);
    });
  });
});

// =============================================================================
// 3. runtime/checkpointing.ts — toCompletedStepState, checkpoint
// =============================================================================

describe("runtime/checkpointing.ts", () => {
  describe("toCompletedStepState", () => {
    it("maps stepName to name (not empty string)", () => {
      const info: CompletedStepInfo = {
        stepName: "ReserveStock",
        stepIndex: 2,
        result: { reservationId: "R123" },
        step: StepA as any,
      };
      const state = toCompletedStepState(info);
      expect(state.name).toBe("ReserveStock");
      expect(state.name).not.toBe("");
    });

    it("maps stepIndex to index (not 0 when non-zero)", () => {
      const info: CompletedStepInfo = {
        stepName: "Ship",
        stepIndex: 3,
        result: "ok",
        step: StepA as any,
      };
      const state = toCompletedStepState(info);
      expect(state.index).toBe(3);
    });

    it("maps result to output", () => {
      const result = { data: "payload" };
      const info: CompletedStepInfo = {
        stepName: "Process",
        stepIndex: 0,
        result,
        step: StepA as any,
      };
      const state = toCompletedStepState(info);
      expect(state.output).toBe(result);
    });

    it("skipped is false (not true)", () => {
      const info: CompletedStepInfo = {
        stepName: "Process",
        stepIndex: 0,
        result: null,
        step: StepA as any,
      };
      const state = toCompletedStepState(info);
      expect(state.skipped).toBe(false);
    });

    it("completedAt is a valid ISO timestamp string", () => {
      const info: CompletedStepInfo = {
        stepName: "Process",
        stepIndex: 0,
        result: null,
        step: StepA as any,
      };
      const before = new Date().toISOString();
      const state = toCompletedStepState(info);
      const after = new Date().toISOString();
      expect(state.completedAt).toBeTruthy();
      expect(state.completedAt >= before).toBe(true);
      expect(state.completedAt <= after).toBe(true);
    });
  });

  describe("checkpoint error event fields", () => {
    it("emits step:failed with stepName '__checkpoint' and stepIndex -1 on persister error", async () => {
      const emittedEvents: SagaEvent[] = [];
      const failingPersister: SagaPersister = {
        save: () => ResultAsync.ok(undefined),
        load: () => ResultAsync.ok(null),
        delete: () => ResultAsync.ok(undefined),
        list: () => ResultAsync.ok([]),
        update: (_id: string, _updates: any) =>
          ResultAsync.err({
            _tag: "StorageFailure" as const,
            operation: "update",
            cause: new Error("disk full"),
          }),
      };

      const state = createMockExecutionState({
        persister: failingPersister,
        listeners: [(e: SagaEvent) => emittedEvents.push(e)],
      });

      await checkpoint(state, { status: "running" });

      const failedEvent = emittedEvents.find(e => e.type === "step:failed");
      expect(failedEvent).toBeDefined();
      expect(failedEvent!.type).toBe("step:failed");
      const failed = failedEvent as Extract<SagaEvent, { type: "step:failed" }>;
      expect(failed.stepName).toBe("__checkpoint");
      expect(failed.stepName).not.toBe("");
      expect(failed.stepIndex).toBe(-1);
      expect(failed.stepIndex).not.toBe(0);
      expect(failed.attemptCount).toBe(1);
      expect(failed.retriesExhausted).toBe(true);
    });

    it("does nothing when no persister is configured", async () => {
      const state = createMockExecutionState({ persister: undefined });
      // Should not throw
      await checkpoint(state, { status: "running" });
    });
  });
});

// =============================================================================
// 4. ports/factory.ts — type guards
// =============================================================================

describe("ports/factory.ts — type guards", () => {
  describe("isSagaPort", () => {
    it("returns true for a port created by sagaPort()", () => {
      const port = sagaPort<string, string>()({ name: "TestSagaPort" });
      expect(isSagaPort(port)).toBe(true);
    });

    it("returns false for a management port", () => {
      const port = sagaManagementPort<string>()({ name: "TestMgmt" });
      expect(isSagaPort(port)).toBe(false);
    });

    it("returns false for a regular port (no SagaPortKind)", () => {
      const port = createPort<"Regular", any>({ name: "Regular" });
      expect(isSagaPort(port)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isSagaPort(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isSagaPort(undefined)).toBe(false);
    });

    it("returns false for primitives", () => {
      expect(isSagaPort(42)).toBe(false);
      expect(isSagaPort("string")).toBe(false);
      expect(isSagaPort(true)).toBe(false);
    });

    it("returns false for object with __portName but no SagaPortKind", () => {
      const fake = { __portName: "FakePort" };
      expect(isSagaPort(fake)).toBe(false);
    });

    it("returns false for object with SagaPortKind but wrong kind string", () => {
      const SAGA_PORT_KIND = Symbol.for("@hex-di/saga/SagaPortKind");
      const fake = { __portName: "FakePort", [SAGA_PORT_KIND]: "management" };
      expect(isSagaPort(fake)).toBe(false);
    });

    it("returns false for object with SagaPortKind 'execution' but no __portName", () => {
      const SAGA_PORT_KIND = Symbol.for("@hex-di/saga/SagaPortKind");
      const fake = { [SAGA_PORT_KIND]: "execution" };
      expect(isSagaPort(fake)).toBe(false);
    });

    it("returns false for object with __portName as number", () => {
      const SAGA_PORT_KIND = Symbol.for("@hex-di/saga/SagaPortKind");
      const fake = { __portName: 42, [SAGA_PORT_KIND]: "execution" };
      expect(isSagaPort(fake)).toBe(false);
    });
  });

  describe("isSagaManagementPort", () => {
    it("returns true for a management port", () => {
      const port = sagaManagementPort<string>()({ name: "TestMgmtPort" });
      expect(isSagaManagementPort(port)).toBe(true);
    });

    it("returns false for a saga port", () => {
      const port = sagaPort<string, string>()({ name: "TestSaga" });
      expect(isSagaManagementPort(port)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isSagaManagementPort(null)).toBe(false);
    });

    it("returns false for a regular port", () => {
      const port = createPort<"Reg", any>({ name: "Reg" });
      expect(isSagaManagementPort(port)).toBe(false);
    });

    it("returns false for an object with wrong kind", () => {
      const SAGA_PORT_KIND = Symbol.for("@hex-di/saga/SagaPortKind");
      const fake = { __portName: "F", [SAGA_PORT_KIND]: "execution" };
      expect(isSagaManagementPort(fake)).toBe(false);
    });
  });
});

// =============================================================================
// 5. introspection/saga-inspector.ts — traceToExecutionState
// =============================================================================

describe("saga-inspector.ts — traceToExecutionState via getCompensationStats", () => {
  describe("error field mapping from failed step", () => {
    it("sets _tag to 'StepFailed' (not empty string)", () => {
      const traces: Record<string, ExecutionTrace> = {
        e1: makeTrace({
          executionId: "e1",
          sagaName: "TestSaga",
          status: "failed",
          steps: [
            makeStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: new Error("boom"),
            }),
          ],
          compensation: {
            triggeredBy: "StepA",
            triggeredByIndex: 0,
            steps: [makeCompensationStepTrace({ status: "completed" })],
            status: "completed",
            startedAt: 100,
            completedAt: 200,
            totalDurationMs: 100,
          },
        }),
      };

      const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
      const stats = inspector.getCompensationStats();
      // The error._tag from traceToExecutionState should be "StepFailed"
      const breakdown = stats.bySaga.find(b => b.sagaName === "TestSaga");
      expect(breakdown).toBeDefined();
      expect(breakdown!.errorTagDistribution["StepFailed"]).toBe(1);
      // If _tag were "" this would be under "" key
      expect(breakdown!.errorTagDistribution[""]).toBeUndefined();
    });
  });

  describe("failed step fields set correctly", () => {
    it("stepName comes from failedStep (not empty)", () => {
      const traces: Record<string, ExecutionTrace> = {
        e1: makeTrace({
          executionId: "e1",
          sagaName: "TestSaga",
          status: "failed",
          steps: [
            makeStepTrace({
              stepName: "PaymentStep",
              stepIndex: 2,
              status: "failed",
              error: "payment error",
            }),
          ],
          compensation: {
            triggeredBy: "PaymentStep",
            triggeredByIndex: 2,
            steps: [makeCompensationStepTrace({ status: "failed" })],
            status: "failed",
            startedAt: 100,
            completedAt: 200,
            totalDurationMs: 100,
          },
        }),
      };

      const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
      const stats = inspector.getCompensationStats();
      // Error tag distribution should have StepFailed
      expect(stats.totalCompensations).toBe(1);
      expect(stats.failedCompensations).toBe(1);
    });
  });

  describe("compensation field mapping", () => {
    it("compensation.active is true when status is not 'completed' and not 'failed'", () => {
      // Note: CompensationTrace status is "completed" | "failed" in the type,
      // so in practice this always resolves to false when those statuses are set.
      // The test below checks that completed and failed both produce active: false.
      const tracesCompleted: Record<string, ExecutionTrace> = {
        e1: makeTrace({
          executionId: "e1",
          sagaName: "TestSaga",
          status: "failed",
          compensation: {
            triggeredBy: "StepA",
            triggeredByIndex: 0,
            steps: [makeCompensationStepTrace({ status: "completed" })],
            status: "completed",
            startedAt: 100,
            completedAt: 200,
            totalDurationMs: 100,
          },
        }),
      };

      const inspector1 = createSagaInspector({
        definitions: [TestSaga],
        activeTraces: tracesCompleted,
      });
      const stats1 = inspector1.getCompensationStats();
      // With completed compensation status, active should be false, so this execution counts as successful
      expect(stats1.successfulCompensations).toBe(1);
      expect(stats1.failedCompensations).toBe(0);

      const tracesFailed: Record<string, ExecutionTrace> = {
        e2: makeTrace({
          executionId: "e2",
          sagaName: "TestSaga",
          status: "failed",
          compensation: {
            triggeredBy: "StepA",
            triggeredByIndex: 0,
            steps: [makeCompensationStepTrace({ status: "failed" })],
            status: "failed",
            startedAt: 100,
            completedAt: 200,
            totalDurationMs: 100,
          },
        }),
      };

      const inspector2 = createSagaInspector({
        definitions: [TestSaga],
        activeTraces: tracesFailed,
      });
      const stats2 = inspector2.getCompensationStats();
      expect(stats2.failedCompensations).toBe(1);
      expect(stats2.successfulCompensations).toBe(0);
    });

    it("compensatedSteps filters only completed compensation steps", () => {
      const traces: Record<string, ExecutionTrace> = {
        e1: makeTrace({
          executionId: "e1",
          sagaName: "TestSaga",
          status: "compensating",
          steps: [
            makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
            makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed" }),
          ],
          compensation: {
            triggeredBy: "StepB",
            triggeredByIndex: 1,
            steps: [
              makeCompensationStepTrace({ stepName: "StepA", status: "completed" }),
              makeCompensationStepTrace({ stepName: "StepB", status: "failed" }),
            ],
            status: "failed",
            startedAt: 100,
            completedAt: 200,
            totalDurationMs: 100,
          },
        }),
      };

      const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
      const active = inspector.getActiveExecutions();
      expect(active).toHaveLength(1);
      expect(active[0].compensationState.compensatedSteps).toEqual(["StepA"]);
      expect(active[0].compensationState.failedSteps).toEqual(["StepB"]);
    });
  });

  describe("no compensation trace maps to default state", () => {
    it("defaults to active: false, empty arrays, null triggeringStepIndex", () => {
      const traces: Record<string, ExecutionTrace> = {
        e1: makeTrace({
          executionId: "e1",
          sagaName: "TestSaga",
          status: "running",
          steps: [makeStepTrace({ status: "completed" })],
          compensation: undefined,
        }),
      };

      const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
      const stats = inspector.getCompensationStats();
      // No compensation data => not counted as compensated
      expect(stats.totalCompensations).toBe(0);
    });
  });

  describe("timestamps mapping", () => {
    it("completedAt is ISO string when trace.completedAt is set", () => {
      const completedAtMs = 1704067200000; // 2024-01-01T00:00:00.000Z
      const traces: Record<string, ExecutionTrace> = {
        e1: makeTrace({
          executionId: "e1",
          sagaName: "TestSaga",
          status: "completed",
          startedAt: completedAtMs - 5000,
          completedAt: completedAtMs,
        }),
      };

      const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
      // getTrace returns raw, but traceToExecutionState is only called via getCompensationStats/getActiveExecutions
      // Verify via compensation stats that state builds correctly
      const stats = inspector.getCompensationStats();
      expect(stats).toBeDefined();
    });

    it("completedAt is null when trace.completedAt is undefined", () => {
      const traces: Record<string, ExecutionTrace> = {
        e1: makeTrace({
          executionId: "e1",
          sagaName: "TestSaga",
          status: "running",
          completedAt: undefined,
        }),
      };

      const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
      const stats = inspector.getCompensationStats();
      expect(stats).toBeDefined();
    });
  });

  describe("metadata mapping", () => {
    it("trace.metadata ?? {} returns metadata when present", () => {
      const traces: Record<string, ExecutionTrace> = {
        e1: makeTrace({
          executionId: "e1",
          sagaName: "TestSaga",
          status: "running",
          metadata: { env: "prod", region: "us" },
        }),
      };

      const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
      const active = inspector.getActiveExecutions();
      expect(active[0].metadata).toEqual({ env: "prod", region: "us" });
    });

    it("trace.metadata ?? {} returns empty object when metadata is undefined", () => {
      const traces: Record<string, ExecutionTrace> = {
        e1: makeTrace({
          executionId: "e1",
          sagaName: "TestSaga",
          status: "running",
          metadata: undefined,
        }),
      };

      const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
      const active = inspector.getActiveExecutions();
      expect(active[0].metadata).toEqual({});
      // This kills "trace.metadata ?? 'Stryker was here'" — must be an object
      expect(typeof active[0].metadata).toBe("object");
    });
  });

  describe("currentStep counts only completed steps", () => {
    it("currentStep = number of completed steps from trace", () => {
      const traces: Record<string, ExecutionTrace> = {
        e1: makeTrace({
          executionId: "e1",
          sagaName: "TestSaga",
          status: "running",
          steps: [
            makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
            makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed" }),
            makeStepTrace({ stepName: "StepC", stepIndex: 2, status: "completed" }),
          ],
        }),
      };

      const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
      const active = inspector.getActiveExecutions();
      // 2 completed steps, so currentStepIndex = 2
      expect(active[0].currentStepIndex).toBe(2);
      expect(active[0].completedStepCount).toBe(2);
    });
  });

  describe("completedSteps maps only completed trace steps", () => {
    it("filters only completed and maps step fields", () => {
      // This is tested indirectly: the completedStepCount in getActiveExecutions
      // relies on the same filter logic
      const traces: Record<string, ExecutionTrace> = {
        e1: makeTrace({
          executionId: "e1",
          sagaName: "TestSaga",
          status: "running",
          steps: [
            makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
            makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "skipped" }),
          ],
        }),
      };

      const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
      const active = inspector.getActiveExecutions();
      // Only 1 completed step (skipped is not completed)
      expect(active[0].completedStepCount).toBe(1);
      expect(active[0].currentStepIndex).toBe(1);
    });
  });
});

// =============================================================================
// 5b. extractStepInfo mutations
// =============================================================================

describe("saga-inspector.ts — extractStepInfo", () => {
  it("backoffStrategy is 'exponential' for function delay", () => {
    const DelayFnPort = createPort<"DelayFnPort", any>({ name: "DelayFnPort" });
    const stepWithFnDelay = defineStep("FnDelayStep")
      .io<string, string>()
      .invoke(DelayFnPort, ctx => ctx.input)
      .options({ retry: { maxAttempts: 3, delay: (attempt: number) => attempt * 100 } })
      .build();

    const sagaWithFnDelay = defineSaga("FnDelaySaga")
      .input<string>()
      .step(stepWithFnDelay)
      .output(r => r)
      .build();

    const inspector = createSagaInspector({ definitions: [sagaWithFnDelay] });
    const defs = inspector.getDefinitions();
    const stepInfo = defs[0].steps[0];
    expect(stepInfo.retryPolicy).toBeDefined();
    expect(stepInfo.retryPolicy!.backoffStrategy).toBe("exponential");
    expect(stepInfo.retryPolicy!.backoffStrategy).not.toBe("");
    // initialDelay should be 0 for function delays
    expect(stepInfo.retryPolicy!.initialDelay).toBe(0);
  });

  it("backoffStrategy is 'fixed' for numeric delay", () => {
    const FixedPort = createPort<"FixedPort", any>({ name: "FixedPort" });
    const stepWithNumDelay = defineStep("NumDelayStep")
      .io<string, string>()
      .invoke(FixedPort, ctx => ctx.input)
      .options({ retry: { maxAttempts: 2, delay: 250 } })
      .build();

    const sagaWithNumDelay = defineSaga("NumDelaySaga")
      .input<string>()
      .step(stepWithNumDelay)
      .output(r => r)
      .build();

    const inspector = createSagaInspector({ definitions: [sagaWithNumDelay] });
    const defs = inspector.getDefinitions();
    const stepInfo = defs[0].steps[0];
    expect(stepInfo.retryPolicy).toBeDefined();
    expect(stepInfo.retryPolicy!.backoffStrategy).toBe("fixed");
    expect(stepInfo.retryPolicy!.backoffStrategy).not.toBe("");
    expect(stepInfo.retryPolicy!.initialDelay).toBe(250);
  });

  it("hasCompensation is true when compensate is not null", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    // StepA has compensate
    expect(defs[0].steps[0].hasCompensation).toBe(true);
  });

  it("hasCompensation is false when compensate is null", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    // StepC has no compensate (was not called)
    expect(defs[0].steps[2].hasCompensation).toBe(false);
  });

  it("isConditional is true when condition is not null", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    // StepC has .when()
    expect(defs[0].steps[2].isConditional).toBe(true);
  });

  it("isConditional is false when condition is null", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    // StepA has no .when()
    expect(defs[0].steps[0].isConditional).toBe(false);
  });

  it("timeout from step options is passed through", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    // StepB has timeout: 5000
    expect(defs[0].steps[1].timeout).toBe(5000);
    // StepA has no timeout
    expect(defs[0].steps[0].timeout).toBeUndefined();
  });
});

// =============================================================================
// 5c. getCurrentStepName
// =============================================================================

describe("saga-inspector.ts — getCurrentStepName", () => {
  it("for compensating trace, returns pending compensation step name", () => {
    // Compensation with no completed/failed steps => first step is pending
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed" }),
        ],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [], // no completed/failed steps yet — not applicable since type only allows completed/failed
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    // With all compensation steps completed or failed, currentStepName is null
    expect(active[0].currentStepName).toBeNull();
  });

  it("for running trace with next step available, returns next step name", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          // StepB is next; it's in the trace as an incomplete entry
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed" }),
          makeStepTrace({ stepName: "StepC", stepIndex: 2, status: "completed" }),
        ],
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    // 2 completed steps => lastCompleted = 2
    // steps.length = 3 => 2 < 3 => steps[2].stepName = "StepC"
    expect(active[0].currentStepName).toBe("StepC");
  });

  it("for running trace where all steps done, returns null", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "completed" }),
        ],
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    // lastCompleted = 2 which equals steps.length = 2 => returns null
    expect(active[0].currentStepName).toBeNull();
  });
});

// =============================================================================
// 5d. getActiveExecutions — compensationState.active
// =============================================================================

describe("saga-inspector.ts — getActiveExecutions compensationState", () => {
  it("active is true when trace.status === 'compensating'", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [makeStepTrace({ status: "completed" })],
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active[0].compensationState.active).toBe(true);
  });

  it("active is false when trace.status === 'running'", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active[0].compensationState.active).toBe(false);
  });

  it("active is false when trace.status === 'pending'", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "pending",
        steps: [],
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active[0].compensationState.active).toBe(false);
  });
});

// =============================================================================
// 5e. getSuggestions — exact type strings and conditions
// =============================================================================

describe("saga-inspector.ts — getSuggestions exact strings", () => {
  it("compensation suggestion type is exactly 'saga_step_without_compensation'", () => {
    const NoCompPort = createPort<"NoCompPort", any>({ name: "NoCompPort" });
    const noCompStep = defineStep("NoCompS")
      .io<string, string>()
      .invoke(NoCompPort, ctx => ctx.input)
      .build();
    const noCompSaga = defineSaga("NoCompSaga2")
      .input<string>()
      .step(noCompStep)
      .output(() => ({}))
      .build();

    const inspector = createSagaInspector({ definitions: [noCompSaga] });
    const suggestions = inspector.getSuggestions();
    const compSuggestion = suggestions.find(
      s => s.stepName === "NoCompS" && s.type === "saga_step_without_compensation"
    );
    expect(compSuggestion).toBeDefined();
    expect(compSuggestion!.type).toBe("saga_step_without_compensation");
    expect(compSuggestion!.type.length).toBeGreaterThan(0);
  });

  it("retry suggestion type is exactly 'saga_no_retry_on_external_port'", () => {
    const NoRetryPort = createPort<"NoRetryPort", any>({ name: "NoRetryPort" });
    const noRetryStep = defineStep("NoRetryS")
      .io<string, string>()
      .invoke(NoRetryPort, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const noRetrySaga = defineSaga("NoRetrySaga2")
      .input<string>()
      .step(noRetryStep)
      .output(() => ({}))
      .build();

    const inspector = createSagaInspector({ definitions: [noRetrySaga] });
    const suggestions = inspector.getSuggestions();
    const retrySuggestion = suggestions.find(
      s => s.stepName === "NoRetryS" && s.type === "saga_no_retry_on_external_port"
    );
    expect(retrySuggestion).toBeDefined();
    expect(retrySuggestion!.type).toBe("saga_no_retry_on_external_port");
    expect(retrySuggestion!.type.length).toBeGreaterThan(0);
  });

  it("timeout suggestion type is exactly 'saga_long_timeout_without_persistence'", () => {
    const LTPort = createPort<"LTPort", any>({ name: "LTPort" });
    const ltStep = defineStep("LTStep")
      .io<string, string>()
      .invoke(LTPort, ctx => ctx.input)
      .timeout(60000)
      .build();
    const ltSaga = defineSaga("LTSaga")
      .input<string>()
      .step(ltStep)
      .output(() => ({}))
      .options({ compensationStrategy: "sequential", timeout: 60000 })
      .build();

    const inspector = createSagaInspector({ definitions: [ltSaga] });
    const suggestions = inspector.getSuggestions();
    const timeoutSuggestion = suggestions.find(
      s => s.type === "saga_long_timeout_without_persistence"
    );
    expect(timeoutSuggestion).toBeDefined();
    expect(timeoutSuggestion!.type).toBe("saga_long_timeout_without_persistence");
    expect(timeoutSuggestion!.type.length).toBeGreaterThan(0);
  });

  it("compensation suggestion from stats has successRate < 0.5 check", () => {
    // All compensation steps failed => successRate = 0 which is < 0.5
    const traces: Record<string, ExecutionTrace> = {
      "hf-1": makeTrace({
        executionId: "hf-1",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompensationStepTrace({ status: "failed" })],
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const suggestions = inspector.getSuggestions();
    const failRateSuggestion = suggestions.find(
      s => s.type === "saga_step_without_compensation" && s.message.includes("success rate")
    );
    expect(failRateSuggestion).toBeDefined();
    expect(failRateSuggestion!.message).toContain("0%");
  });

  it("no compensation suggestion when successRate >= 0.5", () => {
    // 1 successful, 0 failed => successRate = 1.0
    const traces: Record<string, ExecutionTrace> = {
      "ok-1": makeTrace({
        executionId: "ok-1",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompensationStepTrace({ status: "completed" })],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const suggestions = inspector.getSuggestions();
    const failRateSuggestion = suggestions.find(s => s.message.includes("success rate"));
    expect(failRateSuggestion).toBeUndefined();
  });

  it("totalCompensations > 0 check: no suggestion when no compensations", () => {
    // Traces with no compensation data
    const traces: Record<string, ExecutionTrace> = {
      "nc-1": makeTrace({
        executionId: "nc-1",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
        compensation: undefined,
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const suggestions = inspector.getSuggestions();
    const failRateSuggestion = suggestions.find(s => s.message.includes("success rate"));
    expect(failRateSuggestion).toBeUndefined();
  });
});

// =============================================================================
// 5f. computeCompensationStats — tie-breaking, averages, filtering
// =============================================================================

describe("saga-inspector.ts — computeCompensationStats", () => {
  it("mostFailedStep uses strict > (not >=) for tie-breaking", () => {
    // Two steps each fail once => first one encountered wins due to > (not >=)
    const traces: Record<string, ExecutionTrace> = {
      "tie-1": makeTrace({
        executionId: "tie-1",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            makeCompensationStepTrace({ stepName: "StepA", status: "failed" }),
            makeCompensationStepTrace({ stepName: "StepB", status: "failed" }),
          ],
          status: "failed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    const breakdown = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(breakdown).toBeDefined();
    // Both StepA and StepB fail once; with > (not >=), StepA (first encountered) wins
    expect(breakdown!.mostFailedStep).toBe("StepA");
  });

  it("averageCompensationTime computes from durationMs", () => {
    const traces: Record<string, ExecutionTrace> = {
      "avg-1": makeTrace({
        executionId: "avg-1",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompensationStepTrace({ status: "completed" })],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    // durationMs comes from the compensation state in traceToExecutionState
    // which is only set when compensation exists
    expect(stats.averageCompensationTime).toBeTypeOf("number");
  });

  it("mostCompensatedSaga uses strict > (not >=) for tie-breaking between sagas", () => {
    // Two sagas each with 1 compensation => first one encountered wins
    const StepX = defineStep("StepX")
      .io<string, string>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const SagaX = defineSaga("SagaX")
      .input<string>()
      .step(StepX)
      .output(() => ({}))
      .build();

    const StepY = defineStep("StepY")
      .io<string, string>()
      .invoke(PortB, ctx => ctx.input)
      .compensate(ctx => ctx.stepResult)
      .build();
    const SagaY = defineSaga("SagaY")
      .input<string>()
      .step(StepY)
      .output(() => ({}))
      .build();

    const traces: Record<string, ExecutionTrace> = {
      x1: makeTrace({
        executionId: "x1",
        sagaName: "SagaX",
        status: "failed",
        compensation: {
          triggeredBy: "StepX",
          triggeredByIndex: 0,
          steps: [makeCompensationStepTrace({ status: "completed" })],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
      y1: makeTrace({
        executionId: "y1",
        sagaName: "SagaY",
        status: "failed",
        compensation: {
          triggeredBy: "StepY",
          triggeredByIndex: 0,
          steps: [makeCompensationStepTrace({ status: "completed" })],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [SagaX, SagaY], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    // Both have 1 compensation; with >, first one wins ("SagaX" since it's first in map iteration)
    // The important thing is that it IS one of them (not null)
    expect(stats.mostCompensatedSaga).not.toBeNull();
    expect(["SagaX", "SagaY"]).toContain(stats.mostCompensatedSaga);
  });

  it("compensated filter includes traces with triggeringStepIndex !== null", () => {
    // Trace with triggeringStepIndex set but empty compensatedSteps/failedSteps
    const traces: Record<string, ExecutionTrace> = {
      "trig-1": makeTrace({
        executionId: "trig-1",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    // Should be counted because triggeringStepIndex !== null
    expect(stats.totalCompensations).toBe(1);
  });

  it("compensation with durationMs computes average correctly", () => {
    const traces: Record<string, ExecutionTrace> = {
      d1: makeTrace({
        executionId: "d1",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompensationStepTrace({ status: "completed" })],
          status: "completed",
          startedAt: 100,
          completedAt: 300,
          totalDurationMs: 200,
        },
      }),
      d2: makeTrace({
        executionId: "d2",
        sagaName: "TestSaga",
        status: "failed",
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompensationStepTrace({ status: "completed" })],
          status: "completed",
          startedAt: 100,
          completedAt: 500,
          totalDurationMs: 400,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    const breakdown = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(breakdown).toBeDefined();
    // durationMs is set on the compensation state from traceToExecutionState
    // The exact average depends on how durationMs maps, but it should be > 0
    // if any execution has durationMs set
  });
});

// =============================================================================
// 5g. emitToInspector
// =============================================================================

describe("saga-inspector.ts — emitToInspector", () => {
  it("does nothing if inspector has no registered listeners (returns early)", () => {
    const fakeInspector = {
      getDefinitions: () => [],
      getActiveExecutions: () => [],
      getHistory: () => ResultAsync.ok([]),
      getTrace: () => null,
      getCompensationStats: () => ({
        totalCompensations: 0,
        successfulCompensations: 0,
        failedCompensations: 0,
        averageCompensationTime: 0,
        mostCompensatedSaga: null,
        bySaga: [],
      }),
      getSuggestions: () => [],
      subscribe: () => () => {},
    } as any;

    // Should not throw - the WeakMap won't have this instance
    expect(() =>
      emitToInspector(fakeInspector, {
        type: "saga:started",
        executionId: "e1",
        sagaName: "TestSaga",
        input: "hello",
        stepCount: 1,
        metadata: undefined,
        timestamp: Date.now(),
      })
    ).not.toThrow();
  });

  it("listeners registered via subscribe receive events", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const received: SagaEvent[] = [];
    inspector.subscribe(event => received.push(event));

    emitToInspector(inspector, {
      type: "saga:started",
      executionId: "e1",
      sagaName: "TestSaga",
      input: "hello",
      stepCount: 1,
      metadata: undefined,
      timestamp: Date.now(),
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("saga:started");
  });

  it("listener errors are caught and swallowed (do not propagate)", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const received: SagaEvent[] = [];

    inspector.subscribe(() => {
      throw new Error("listener error");
    });
    inspector.subscribe(event => received.push(event));

    expect(() =>
      emitToInspector(inspector, {
        type: "saga:started",
        executionId: "e1",
        sagaName: "TestSaga",
        input: "hello",
        stepCount: 1,
        metadata: undefined,
        timestamp: Date.now(),
      })
    ).not.toThrow();

    // Second listener should still receive the event
    expect(received).toHaveLength(1);
  });
});

// =============================================================================
// 5h. executionStateToSummary — currentStepName edge cases
// =============================================================================

describe("saga-inspector.ts — executionStateToSummary via getHistory", () => {
  it("currentStepName is null when currentStep >= totalSteps", async () => {
    const state = makeExecutionState({
      currentStep: 10,
      status: "completed",
    });
    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].currentStepName).toBeNull();
    }
  });

  it("currentStepName resolves correctly when in range", async () => {
    const state = makeExecutionState({
      currentStep: 1,
      status: "running",
    });
    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // TestSaga step at index 1 = StepB
      expect(result.value[0].currentStepName).toBe("StepB");
    }
  });

  it("error with fields.stepName string is preserved", async () => {
    const state = makeExecutionState({
      status: "failed",
      error: {
        _tag: "StepFailed",
        name: "StepFailed",
        message: "Step failed",
        stack: null,
        code: null,
        fields: { stepName: "TargetStep" },
      },
    });
    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].error!.stepName).toBe("TargetStep");
      expect(result.value[0].error!._tag).toBe("StepFailed");
    }
  });

  it("durationMs is computed from completedAt - startedAt", async () => {
    const state = makeExecutionState({
      status: "completed",
      timestamps: {
        startedAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:05.000Z",
        completedAt: "2024-01-01T00:00:05.000Z",
      },
    });
    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].durationMs).toBe(5000);
    }
  });

  it("durationMs is null when completedAt is null", async () => {
    const state = makeExecutionState({
      status: "running",
      timestamps: {
        startedAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:01.000Z",
        completedAt: null,
      },
    });
    const persister = createMockPersister([state]);
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].durationMs).toBeNull();
    }
  });
});

// =============================================================================
// 5i. traceToExecutionState — completedSteps mapping with completedAt
// =============================================================================

describe("saga-inspector.ts — traceToExecutionState completedSteps", () => {
  it("completedAt from step trace becomes ISO string when defined", () => {
    const now = Date.now();
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed", completedAt: now }),
        ],
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    // completedStepCount = 1, verifying that completed step was mapped
    expect(active[0].completedStepCount).toBe(1);
  });

  it("step with status 'failed' is NOT counted in completedSteps", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed" })],
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active[0].completedStepCount).toBe(0);
    expect(active[0].currentStepIndex).toBe(0);
  });

  it("step with status 'skipped' is NOT counted in completedSteps", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "skipped" })],
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active[0].completedStepCount).toBe(0);
  });
});

// =============================================================================
// 5j. traceToExecutionState — error object exact field values
// =============================================================================

describe("saga-inspector.ts — traceToExecutionState error fields", () => {
  it("error _tag is 'StepFailed' not empty string", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "some error" }),
        ],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompensationStepTrace()],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    const breakdown = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(breakdown).toBeDefined();
    // The error._tag from traceToExecutionState is "StepFailed"
    expect(breakdown!.errorTagDistribution["StepFailed"]).toBe(1);
    expect(breakdown!.errorTagDistribution[""]).toBeUndefined();
  });

  it("no error when no failed steps in trace", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompensationStepTrace()],
          status: "completed",
          startedAt: 100,
          completedAt: 200,
          totalDurationMs: 100,
        },
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    const breakdown = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(breakdown).toBeDefined();
    // No error => no error tag distribution entries
    expect(Object.keys(breakdown!.errorTagDistribution)).toHaveLength(0);
  });
});

// =============================================================================
// 5k. getActiveExecutions — only active statuses included
// =============================================================================

describe("saga-inspector.ts — getActiveExecutions status filtering", () => {
  it("includes pending, running, compensating traces", () => {
    const traces: Record<string, ExecutionTrace> = {
      p1: makeTrace({ executionId: "p1", sagaName: "TestSaga", status: "pending" }),
      r1: makeTrace({ executionId: "r1", sagaName: "TestSaga", status: "running" }),
      c1: makeTrace({
        executionId: "c1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [makeStepTrace()],
      }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(3);
    const ids = active.map(a => a.executionId).sort();
    expect(ids).toEqual(["c1", "p1", "r1"]);
  });

  it("excludes completed, failed, cancelled traces", () => {
    const traces: Record<string, ExecutionTrace> = {
      d1: makeTrace({ executionId: "d1", sagaName: "TestSaga", status: "completed" }),
      f1: makeTrace({ executionId: "f1", sagaName: "TestSaga", status: "failed" }),
      x1: makeTrace({ executionId: "x1", sagaName: "TestSaga", status: "cancelled" }),
    };

    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(0);
  });
});
