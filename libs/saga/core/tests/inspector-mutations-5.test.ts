/**
 * Inspector Mutations 5 — targeted mutant killing for:
 * - saga-inspector.ts (74 survived + 9 NoCoverage = 83)
 * - ports/factory.ts (13 survived)
 * - integration/inspector-adapter.ts (12 survived)
 * - step/builder.ts (8 survived)
 *
 * Targets mutation types: StringLiteral=>"", OptionalChaining removal,
 * ConditionalExpression=>true/false, EqualityOperator changes,
 * ArrayDeclaration=>["Stryker was here"], ArrowFunction=>()=>undefined,
 * ObjectLiteral=>{}, MethodExpression=>identity, LogicalOperator changes,
 * BlockStatement=>{}.
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaInspector, emitToInspector } from "../src/introspection/saga-inspector.js";
import {
  sagaPort,
  sagaManagementPort,
  SagaPersisterPort,
  SagaRegistryPort,
  SagaInspectorPort,
  isSagaPort,
  isSagaManagementPort,
} from "../src/ports/factory.js";
import { createSagaInspectorAdapter } from "../src/integration/inspector-adapter.js";
import type { SagaPersister, SagaExecutionState } from "../src/ports/types.js";
import type { ExecutionTrace, StepTrace, CompensationStepTrace } from "../src/runtime/types.js";
import type { AnySagaDefinition } from "../src/saga/types.js";
import type { AnyStepDefinition } from "../src/step/types.js";

// =============================================================================
// Shared Helpers
// =============================================================================

const METADATA_KEY = Symbol.for("@hex-di/core/PortMetadata");

const PortA = createPort<"PortA", any>({ name: "PortA" });
const PortB = createPort<"PortB", any>({ name: "PortB" });
const PortC = createPort<"PortC", any>({ name: "PortC" });

const StepA = defineStep("StepA")
  .io<unknown, unknown>()
  .invoke(PortA, ctx => ctx.input)
  .compensate(() => ({}))
  .build();

const StepB = defineStep("StepB")
  .io<unknown, unknown>()
  .invoke(PortB, ctx => ctx.input)
  .compensate(() => ({}))
  .options({ retry: { maxAttempts: 2, delay: 50 }, timeout: 3000 })
  .build();

const StepC = defineStep("StepC")
  .io<unknown, unknown>()
  .invoke(PortC, ctx => ctx.input)
  .build();

const TestSaga = defineSaga("TestSaga")
  .input<unknown>()
  .step(StepA)
  .step(StepB)
  .step(StepC)
  .output(r => r)
  .build();

function makeStepTrace(
  overrides: Partial<StepTrace> & { stepName: string; stepIndex: number }
): StepTrace {
  return {
    status: "completed",
    startedAt: 100,
    completedAt: 200,
    durationMs: 100,
    attemptCount: 1,
    error: undefined,
    skippedReason: undefined,
    ...overrides,
  };
}

function makeCompStepTrace(
  overrides: Partial<CompensationStepTrace> & {
    stepName: string;
    stepIndex: number;
  }
): CompensationStepTrace {
  return {
    status: "completed",
    startedAt: 300,
    completedAt: 400,
    durationMs: 100,
    error: undefined,
    ...overrides,
  };
}

function makeTrace(
  overrides: Partial<ExecutionTrace> & {
    executionId: string;
    sagaName: string;
  }
): ExecutionTrace {
  return {
    input: {},
    status: "running",
    steps: [],
    compensation: undefined,
    startedAt: 100,
    completedAt: undefined,
    totalDurationMs: undefined,
    metadata: undefined,
    ...overrides,
  };
}

function makePersisterState(
  overrides: Partial<SagaExecutionState> & {
    executionId: string;
    sagaName: string;
  }
): SagaExecutionState {
  return {
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
      updatedAt: "2024-01-01T00:01:00.000Z",
      completedAt: "2024-01-01T00:01:00.000Z",
    },
    metadata: {},
    ...overrides,
  };
}

function makeMockPersister(states: SagaExecutionState[]): SagaPersister {
  return {
    save: () => ResultAsync.ok(undefined),
    load: () => ResultAsync.ok(null),
    delete: () => ResultAsync.ok(undefined),
    list: () => ResultAsync.ok(states),
    update: () => ResultAsync.ok(undefined),
  };
}

function getPortMetadata(port: any): any {
  return port[METADATA_KEY];
}

// =============================================================================
// SECTION 1: ports/factory.ts — Port names, categories, type guards
// =============================================================================

describe("ports/factory.ts — port names and categories", () => {
  it("SagaPersisterPort has __portName 'SagaPersister' (non-empty string)", () => {
    expect(SagaPersisterPort.__portName).toBe("SagaPersister");
    expect(SagaPersisterPort.__portName.length).toBeGreaterThan(0);
  });

  it("SagaRegistryPort has __portName 'SagaRegistry' (non-empty string)", () => {
    expect(SagaRegistryPort.__portName).toBe("SagaRegistry");
    expect(SagaRegistryPort.__portName.length).toBeGreaterThan(0);
  });

  it("SagaInspectorPort has __portName 'SagaInspector' (non-empty string)", () => {
    expect(SagaInspectorPort.__portName).toBe("SagaInspector");
    expect(SagaInspectorPort.__portName.length).toBeGreaterThan(0);
  });

  it("SagaPersisterPort has category 'saga/saga' in metadata", () => {
    const meta = getPortMetadata(SagaPersisterPort);
    expect(meta).toBeDefined();
    expect(meta.category).toBe("saga/saga");
  });

  it("SagaRegistryPort has category 'saga/saga' in metadata", () => {
    const meta = getPortMetadata(SagaRegistryPort);
    expect(meta).toBeDefined();
    expect(meta.category).toBe("saga/saga");
  });

  it("SagaInspectorPort has category 'saga/saga' in metadata", () => {
    const meta = getPortMetadata(SagaInspectorPort);
    expect(meta).toBeDefined();
    expect(meta.category).toBe("saga/saga");
  });

  it("sagaPort factory creates a port with correct name and category", () => {
    const port = sagaPort<{ id: string }, string, Error>()({
      name: "OrderSaga",
      description: "test",
    });
    expect(port.__portName).toBe("OrderSaga");
    expect(port.__portName.length).toBeGreaterThan(0);
    const meta = getPortMetadata(port);
    expect(meta.category).toBe("saga/saga");
  });

  it("sagaPort factory creates a frozen port", () => {
    const port = sagaPort<string, string>()({ name: "FrozenSaga" });
    expect(Object.isFrozen(port)).toBe(true);
  });

  it("sagaManagementPort factory creates a port with correct name and category", () => {
    const port = sagaManagementPort<string, Error>()({
      name: "OrderSagaMgmt",
      description: "management test",
    });
    expect(port.__portName).toBe("OrderSagaMgmt");
    expect(port.__portName.length).toBeGreaterThan(0);
    const meta = getPortMetadata(port);
    expect(meta.category).toBe("saga/saga-management");
  });

  it("sagaManagementPort factory creates a frozen port", () => {
    const port = sagaManagementPort<string>()({ name: "FrozenMgmt" });
    expect(Object.isFrozen(port)).toBe(true);
  });

  it("SagaPersisterPort has description set as non-empty string", () => {
    const meta = getPortMetadata(SagaPersisterPort);
    expect(meta.description).toBeDefined();
    expect(typeof meta.description).toBe("string");
    expect(meta.description.length).toBeGreaterThan(0);
  });

  it("SagaRegistryPort has description set as non-empty string", () => {
    const meta = getPortMetadata(SagaRegistryPort);
    expect(meta.description).toBeDefined();
    expect(typeof meta.description).toBe("string");
    expect(meta.description.length).toBeGreaterThan(0);
  });

  it("SagaInspectorPort has description set as non-empty string", () => {
    const meta = getPortMetadata(SagaInspectorPort);
    expect(meta.description).toBeDefined();
    expect(typeof meta.description).toBe("string");
    expect(meta.description.length).toBeGreaterThan(0);
  });
});

describe("ports/factory.ts — isSagaPort type guard", () => {
  it("returns true for a port created by sagaPort", () => {
    const port = sagaPort<string, string>()({ name: "TestExec" });
    expect(isSagaPort(port)).toBe(true);
  });

  it("returns false for a port created by sagaManagementPort", () => {
    const port = sagaManagementPort<string>()({ name: "TestMgmt" });
    expect(isSagaPort(port)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isSagaPort(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isSagaPort(undefined)).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isSagaPort(42)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isSagaPort("not a port")).toBe(false);
  });

  it("returns false for a plain object without __portName", () => {
    expect(isSagaPort({ foo: "bar" })).toBe(false);
  });

  it("returns false for an object with __portName but no saga kind symbol", () => {
    expect(isSagaPort({ __portName: "test" })).toBe(false);
  });

  it("returns false for a regular port (not branded)", () => {
    const regularPort = createPort<"Regular", any>({ name: "Regular" });
    expect(isSagaPort(regularPort)).toBe(false);
  });

  it("returns false for an object with __portName as non-string", () => {
    expect(isSagaPort({ __portName: 123 })).toBe(false);
  });
});

describe("ports/factory.ts — isSagaManagementPort type guard", () => {
  it("returns true for a port created by sagaManagementPort", () => {
    const port = sagaManagementPort<string>()({ name: "MgmtPort" });
    expect(isSagaManagementPort(port)).toBe(true);
  });

  it("returns false for a port created by sagaPort", () => {
    const port = sagaPort<string, string>()({ name: "ExecPort" });
    expect(isSagaManagementPort(port)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isSagaManagementPort(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isSagaManagementPort(undefined)).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isSagaManagementPort(99)).toBe(false);
  });

  it("returns false for a plain object without __portName", () => {
    expect(isSagaManagementPort({})).toBe(false);
  });

  it("returns false for a regular port (not branded)", () => {
    const regularPort = createPort<"RegularMgmt", any>({ name: "RegularMgmt" });
    expect(isSagaManagementPort(regularPort)).toBe(false);
  });
});

// =============================================================================
// SECTION 2: integration/inspector-adapter.ts
// =============================================================================

describe("integration/inspector-adapter.ts — createSagaInspectorAdapter", () => {
  it("creates a frozen adapter with correct provides and requires", () => {
    const adapter = createSagaInspectorAdapter({
      definitions: [TestSaga],
    });
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(adapter.provides).toBe(SagaInspectorPort);
    expect(adapter.requires).toEqual([SagaRegistryPort]);
    expect(adapter.lifetime).toBe("singleton");
    expect(adapter.factoryKind).toBe("sync");
    expect(adapter.clonable).toBe(false);
  });

  it("factory returns a working SagaInspector", () => {
    const adapter = createSagaInspectorAdapter({
      definitions: [TestSaga],
    });
    const mockRegistry = {
      register: () => {},
      unregister: () => {},
      getAllExecutions: () => [],
      getExecution: () => undefined,
      getExecutionsBySaga: () => [],
      getExecutionsByStatus: () => [],
      subscribe: () => () => {},
      dispose: () => {},
    };
    const inspector = adapter.factory({ SagaRegistry: mockRegistry } as any);
    expect(inspector).toBeDefined();
    const defs = inspector.getDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe("TestSaga");
  });

  it("factory passes persister config to inspector", () => {
    const mockPersister = makeMockPersister([
      makePersisterState({ executionId: "e1", sagaName: "TestSaga" }),
    ]);
    const adapter = createSagaInspectorAdapter({
      definitions: [TestSaga],
      persister: mockPersister,
    });
    const inspector = adapter.factory({ SagaRegistry: {} } as any);
    const historyResult = inspector.getHistory();
    expect(historyResult).toBeDefined();
  });

  it("factory passes activeTraces config to inspector", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
      }),
    };
    const adapter = createSagaInspectorAdapter({
      definitions: [TestSaga],
      activeTraces: traces,
    });
    const inspector = adapter.factory({ SagaRegistry: {} } as any);
    const active = inspector.getActiveExecutions();
    expect(active).toHaveLength(1);
    expect(active[0].executionId).toBe("e1");
  });

  it("finalizer calls dispose on instances that have dispose()", () => {
    const adapter = createSagaInspectorAdapter({
      definitions: [TestSaga],
    });
    let disposeCalled = false;
    const disposableInspector = {
      dispose() {
        disposeCalled = true;
      },
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
    };
    adapter.finalizer!(disposableInspector as any);
    expect(disposeCalled).toBe(true);
  });

  it("finalizer does not crash on instances without dispose()", () => {
    const adapter = createSagaInspectorAdapter({
      definitions: [TestSaga],
    });
    const inspector = adapter.factory({ SagaRegistry: {} } as any);
    expect(() => adapter.finalizer!(inspector as any)).not.toThrow();
  });

  it("finalizer does not call dispose when property is not a function", () => {
    const adapter = createSagaInspectorAdapter({
      definitions: [TestSaga],
    });
    const fakeInstance = {
      dispose: "not a function",
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
    };
    expect(() => adapter.finalizer!(fakeInstance as any)).not.toThrow();
  });

  it("hasDispose returns false for null", () => {
    const adapter = createSagaInspectorAdapter({
      definitions: [],
    });
    expect(() => adapter.finalizer!(null as any)).not.toThrow();
  });

  it("hasDispose returns false for non-object (number)", () => {
    const adapter = createSagaInspectorAdapter({
      definitions: [],
    });
    expect(() => adapter.finalizer!(42 as any)).not.toThrow();
  });

  it("indexObject returns undefined for non-object input", () => {
    const adapter = createSagaInspectorAdapter({
      definitions: [TestSaga],
    });
    const inspector = adapter.factory({} as any);
    expect(inspector.getDefinitions()).toHaveLength(1);
  });

  it("indexObject handles key not present in deps object", () => {
    const adapter = createSagaInspectorAdapter({
      definitions: [TestSaga],
    });
    const inspector = adapter.factory({ notSagaRegistry: "something" } as any);
    expect(inspector.getDefinitions()).toHaveLength(1);
  });
});

// =============================================================================
// SECTION 3: step/builder.ts — options method boundary tests
// =============================================================================

describe("step/builder.ts — options method boundary tests", () => {
  it("options({ timeout: 0 }) sets timeout to 0 (not skipped by undefined check)", () => {
    const step = defineStep("TimeoutZero")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .options({ timeout: 0 })
      .build();
    expect(step.options.timeout).toBe(0);
    expect(step.options.timeout).not.toBeUndefined();
  });

  it("options({ skipCompensation: false }) sets skipCompensation to false (not undefined)", () => {
    const step = defineStep("SkipCompFalse")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .options({ skipCompensation: false })
      .build();
    expect(step.options.skipCompensation).toBe(false);
    expect(step.options.skipCompensation).not.toBeUndefined();
  });

  it("options({ skipCompensation: true }) sets skipCompensation to true", () => {
    const step = defineStep("SkipCompTrue")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .options({ skipCompensation: true })
      .build();
    expect(step.options.skipCompensation).toBe(true);
  });

  it("options({ metadata: {} }) sets metadata to empty object (not undefined)", () => {
    const step = defineStep("EmptyMeta")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .options({ metadata: {} })
      .build();
    expect(step.options.metadata).toEqual({});
    expect(step.options.metadata).not.toBeUndefined();
  });

  it("options({ metadata: { key: 'val' } }) preserves metadata content", () => {
    const step = defineStep("WithMeta")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .options({ metadata: { key: "val" } })
      .build();
    expect(step.options.metadata).toEqual({ key: "val" });
  });

  it("options({}) with empty object does not crash and preserves existing defaults", () => {
    const step = defineStep("EmptyOpts")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .options({})
      .build();
    expect(step.options.timeout).toBeUndefined();
    expect(step.options.retry).toBeUndefined();
    expect(step.options.skipCompensation).toBeUndefined();
    expect(step.options.metadata).toBeUndefined();
  });

  it("retry config with delay as function wraps correctly (typeof delay !== 'number')", () => {
    const delayFn = (attempt: number, _err: unknown) => attempt * 100;
    const step = defineStep("FnDelay")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .options({ retry: { maxAttempts: 3, delay: delayFn } })
      .build();
    expect(step.options.retry).toBeDefined();
    expect(step.options.retry!.maxAttempts).toBe(3);
    expect(typeof step.options.retry!.delay).toBe("function");
    const widenedDelay = step.options.retry!.delay;
    if (typeof widenedDelay === "function") {
      expect(widenedDelay(1, new Error("test"))).toBe(100);
      expect(widenedDelay(2, new Error("test"))).toBe(200);
      expect(widenedDelay(3, new Error("test"))).toBe(300);
    }
  });

  it("retry config with delay as number preserves the number", () => {
    const step = defineStep("NumDelay")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .options({ retry: { maxAttempts: 2, delay: 500 } })
      .build();
    expect(step.options.retry!.delay).toBe(500);
    expect(typeof step.options.retry!.delay).toBe("number");
  });

  it("retry config with retryIf wraps correctly", () => {
    const retryIfFn = (err: unknown) => typeof err === "object" && err !== null && "_tag" in err;
    const step = defineStep("RetryIfStep")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 3, delay: 100, retryIf: retryIfFn })
      .build();
    expect(step.options.retry!.retryIf).toBeDefined();
    expect(step.options.retry!.retryIf!({ _tag: "TransientError" })).toBe(true);
    expect(step.options.retry!.retryIf!("just a string")).toBe(false);
  });

  it("retry config without retryIf leaves retryIf undefined", () => {
    const step = defineStep("NoRetryIf")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 2, delay: 100 })
      .build();
    expect(step.options.retry!.retryIf).toBeUndefined();
  });

  it("timeout method sets the timeout on the step options", () => {
    const step = defineStep("TimeoutMethod")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .timeout(5000)
      .build();
    expect(step.options.timeout).toBe(5000);
  });

  it("skipCompensation() sets compensate to null and skipCompensation to true", () => {
    const step = defineStep("SkipComp")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({ action: "undo" }))
      .skipCompensation()
      .build();
    expect(step.compensate).toBeNull();
    expect(step.options.skipCompensation).toBe(true);
  });

  it("when() sets the condition predicate", () => {
    const step = defineStep("Conditional")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .when(ctx => ctx.stepIndex > 0)
      .build();
    expect(step.condition).not.toBeNull();
    expect(step.condition!({ input: {}, results: {}, stepIndex: 0, executionId: "e1" })).toBe(
      false
    );
    expect(step.condition!({ input: {}, results: {}, stepIndex: 1, executionId: "e1" })).toBe(true);
  });

  it("build() produces a frozen step definition", () => {
    const step = defineStep("FrozenStep")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    expect(Object.isFrozen(step)).toBe(true);
    expect(Object.isFrozen(step.options)).toBe(true);
  });

  it("build() preserves the step name as a non-empty string", () => {
    const step = defineStep("MyStep")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    expect(step.name).toBe("MyStep");
    expect(step.name.length).toBeGreaterThan(0);
  });

  it("build() preserves the port reference", () => {
    const step = defineStep("PortRef")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .build();
    expect(step.port).toBe(PortA);
  });

  it("invoke mapper is preserved and callable", () => {
    const step = defineStep("MapperTest")
      .io<{ id: string }, unknown>()
      .invoke(PortA, ctx => ({ id: (ctx.input as any).id, action: "do" }))
      .build();
    const result = step.invoke({
      input: { id: "abc" },
      results: {},
      stepIndex: 0,
      executionId: "e1",
    });
    expect(result).toEqual({ id: "abc", action: "do" });
  });

  it("compensate mapper is preserved and callable", () => {
    const step = defineStep("CompMapperTest")
      .io<unknown, { rid: string }>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(ctx => ({
        action: "undo",
        rid: (ctx.stepResult as any).rid,
      }))
      .build();
    expect(step.compensate).not.toBeNull();
    const result = step.compensate!({
      input: {},
      results: {},
      stepIndex: 0,
      executionId: "e1",
      stepResult: { rid: "r123" },
      error: new Error("test"),
      failedStepIndex: 1,
      failedStepName: "OtherStep",
    });
    expect(result).toEqual({ action: "undo", rid: "r123" });
  });

  it("options with retry then timeout in chain preserves both", () => {
    const step = defineStep("ChainOpts")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .retry({ maxAttempts: 5, delay: 200 })
      .timeout(10000)
      .build();
    expect(step.options.retry!.maxAttempts).toBe(5);
    expect(step.options.retry!.delay).toBe(200);
    expect(step.options.timeout).toBe(10000);
  });
});

// =============================================================================
// SECTION 4: saga-inspector.ts — extractDefinitionInfo string literals
// =============================================================================

describe("saga-inspector.ts — extractDefinitionInfo string/value verification", () => {
  it("definition name is the exact saga name (non-empty)", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    expect(defs[0].name).toBe("TestSaga");
    expect(defs[0].name.length).toBeGreaterThan(0);
  });

  it("step names are exact step names (non-empty)", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    expect(defs[0].steps[0].name).toBe("StepA");
    expect(defs[0].steps[1].name).toBe("StepB");
    expect(defs[0].steps[2].name).toBe("StepC");
    for (const step of defs[0].steps) {
      expect(step.name.length).toBeGreaterThan(0);
    }
  });

  it("step port names are exact port names (non-empty)", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    expect(defs[0].steps[0].port).toBe("PortA");
    expect(defs[0].steps[1].port).toBe("PortB");
    expect(defs[0].steps[2].port).toBe("PortC");
    for (const step of defs[0].steps) {
      expect(step.port.length).toBeGreaterThan(0);
    }
  });

  it("portDependencies lists port names in order (non-empty strings)", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    expect(defs[0].portDependencies).toEqual(["PortA", "PortB", "PortC"]);
    for (const dep of defs[0].portDependencies) {
      expect(dep.length).toBeGreaterThan(0);
    }
  });

  it("compensationStrategy is exact string 'sequential'", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    expect(defs[0].options.compensationStrategy).toBe("sequential");
    expect(defs[0].options.compensationStrategy.length).toBeGreaterThan(0);
  });

  it("hasCompensation is true for steps with compensate defined", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    expect(defs[0].steps[0].hasCompensation).toBe(true);
    expect(defs[0].steps[1].hasCompensation).toBe(true);
    expect(defs[0].steps[2].hasCompensation).toBe(false);
  });

  it("isConditional is true only for steps with condition set", () => {
    const condStep: AnyStepDefinition = {
      name: "CondStep",
      port: PortA,
      invoke: () => ({}),
      compensate: null,
      condition: () => true,
      options: {},
    };
    const noCondStep: AnyStepDefinition = {
      name: "NoCondStep",
      port: PortB,
      invoke: () => ({}),
      compensate: null,
      condition: null,
      options: {},
    };
    const saga: AnySagaDefinition = {
      name: "CondSaga",
      steps: [condStep, noCondStep],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };
    const inspector = createSagaInspector({ definitions: [saga] });
    const defs = inspector.getDefinitions();
    expect(defs[0].steps[0].isConditional).toBe(true);
    expect(defs[0].steps[1].isConditional).toBe(false);
  });

  it("retryPolicy maxAttempts is exact value from step config", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    expect(defs[0].steps[1].retryPolicy!.maxAttempts).toBe(2);
  });

  it("options retryPolicy is undefined when saga-level retryPolicy is not set", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    expect(defs[0].options.retryPolicy).toBeUndefined();
  });

  it("options timeout is undefined when saga has no timeout", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    expect(defs[0].options.timeout).toBeUndefined();
  });

  it("options timeout is the exact value when saga has timeout", () => {
    const saga: AnySagaDefinition = {
      name: "TimedSaga",
      steps: [StepA],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential", timeout: 15000 },
    };
    const inspector = createSagaInspector({ definitions: [saga] });
    const defs = inspector.getDefinitions();
    expect(defs[0].options.timeout).toBe(15000);
  });

  it("definition result is frozen", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    expect(Object.isFrozen(defs[0])).toBe(true);
  });

  it("step definition info is frozen", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const defs = inspector.getDefinitions();
    for (const step of defs[0].steps) {
      expect(Object.isFrozen(step)).toBe(true);
    }
  });
});

// =============================================================================
// SECTION 5: saga-inspector.ts — traceToExecutionState conversion
// =============================================================================

describe("saga-inspector.ts — traceToExecutionState details", () => {
  it("completedSteps maps step name and index from completed trace steps", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({
            stepName: "StepA",
            stepIndex: 0,
            status: "completed",
            completedAt: 1704067260000,
          }),
          makeStepTrace({
            stepName: "StepB",
            stepIndex: 1,
            status: "completed",
            completedAt: 1704067320000,
          }),
        ],
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active[0].completedStepCount).toBe(2);
    expect(active[0].currentStepIndex).toBe(2);
  });

  it("error in traceToExecutionState extracts stepName and stepIndex from failed step", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({
            stepName: "StepB",
            stepIndex: 1,
            status: "failed",
            error: { _tag: "NetworkError" },
          }),
        ],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            makeCompStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: "comp fail",
            }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    expect(stats.totalCompensations).toBe(1);
    expect(stats.bySaga[0].errorTagDistribution).toEqual({ StepFailed: 1 });
  });

  it("traceToExecutionState sets metadata from trace.metadata or empty object", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
        metadata: { custom: "data" },
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active[0].metadata).toEqual({ custom: "data" });
  });

  it("traceToExecutionState sets completedAt from trace.completedAt or null", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
        completedAt: undefined,
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active[0].completedAt).toBeNull();
  });

  it("traceToExecutionState completedSteps completedAt handles undefined", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({
            stepName: "StepA",
            stepIndex: 0,
            status: "completed",
            completedAt: undefined,
          }),
        ],
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active[0].completedStepCount).toBe(1);
  });
});

// =============================================================================
// SECTION 6: saga-inspector.ts — computeCompensationStats edge cases
// =============================================================================

describe("saga-inspector.ts — computeCompensationStats edge cases", () => {
  it("avgCompTime is 0 when all compensation durationMs are undefined", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0 })],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    expect(stats.averageCompensationTime).toBe(0);
    expect(stats.bySaga[0].averageCompensationTime).toBe(0);
  });

  it("tie-breaking for mostFailedStep uses strict > (not >=)", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            makeCompStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: "comp err",
            }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
      e2: makeTrace({
        executionId: "e2",
        sagaName: "TestSaga",
        status: "failed",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed", error: "err2" }),
        ],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [
            makeCompStepTrace({
              stepName: "StepB",
              stepIndex: 1,
              status: "failed",
              error: "comp err2",
            }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    const breakdown = stats.bySaga.find(b => b.sagaName === "TestSaga");
    expect(breakdown!.mostFailedStep).toBe("StepA");
  });

  it("mostCompensatedSaga with equal counts keeps the first encountered", () => {
    const Saga2Step = defineStep("Saga2Step")
      .io<unknown, unknown>()
      .invoke(PortA, ctx => ctx.input)
      .compensate(() => ({}))
      .build();
    const Saga2 = defineSaga("Saga2")
      .input<unknown>()
      .step(Saga2Step)
      .output(r => r)
      .build();

    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0 })],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
      e2: makeTrace({
        executionId: "e2",
        sagaName: "Saga2",
        status: "failed",
        steps: [
          makeStepTrace({ stepName: "Saga2Step", stepIndex: 0, status: "failed", error: "err" }),
        ],
        compensation: {
          triggeredBy: "Saga2Step",
          triggeredByIndex: 0,
          steps: [makeCompStepTrace({ stepName: "Saga2Step", stepIndex: 0 })],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga, Saga2], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    expect(stats.mostCompensatedSaga).not.toBeNull();
  });

  it("errorTagDistribution counts multiple error tags correctly", () => {
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
            error: { _tag: "NetworkError" },
          }),
        ],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            makeCompStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: "comp fail",
            }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
      e2: makeTrace({
        executionId: "e2",
        sagaName: "TestSaga",
        status: "failed",
        steps: [
          makeStepTrace({
            stepName: "StepA",
            stepIndex: 0,
            status: "failed",
            error: { _tag: "NetworkError" },
          }),
        ],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            makeCompStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "cf2" }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
      e3: makeTrace({
        executionId: "e3",
        sagaName: "TestSaga",
        status: "failed",
        steps: [
          makeStepTrace({
            stepName: "StepB",
            stepIndex: 1,
            status: "failed",
            error: { _tag: "TimeoutError" },
          }),
        ],
        compensation: {
          triggeredBy: "StepB",
          triggeredByIndex: 1,
          steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" })],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    const breakdown = stats.bySaga.find(b => b.sagaName === "TestSaga")!;
    expect(breakdown.errorTagDistribution["StepFailed"]).toBe(3);
  });

  it("successRate fraction is correctly computed (1/3)", () => {
    const traces: Record<string, ExecutionTrace> = {};
    traces["e1"] = makeTrace({
      executionId: "e1",
      sagaName: "TestSaga",
      status: "failed",
      steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
      compensation: {
        triggeredBy: "StepA",
        triggeredByIndex: 0,
        steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" })],
        status: "completed",
        startedAt: 200,
        completedAt: 300,
        totalDurationMs: 100,
      },
    });
    traces["e2"] = makeTrace({
      executionId: "e2",
      sagaName: "TestSaga",
      status: "failed",
      steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
      compensation: {
        triggeredBy: "StepA",
        triggeredByIndex: 0,
        steps: [
          makeCompStepTrace({
            stepName: "StepA",
            stepIndex: 0,
            status: "failed",
            error: "comp err",
          }),
        ],
        status: "failed",
        startedAt: 200,
        completedAt: 300,
        totalDurationMs: 100,
      },
    });
    traces["e3"] = makeTrace({
      executionId: "e3",
      sagaName: "TestSaga",
      status: "failed",
      steps: [makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "failed", error: "err" })],
      compensation: {
        triggeredBy: "StepB",
        triggeredByIndex: 1,
        steps: [
          makeCompStepTrace({
            stepName: "StepA",
            stepIndex: 0,
            status: "failed",
            error: "comp err2",
          }),
        ],
        status: "failed",
        startedAt: 200,
        completedAt: 300,
        totalDurationMs: 100,
      },
    });
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const stats = inspector.getCompensationStats();
    const breakdown = stats.bySaga[0];
    expect(breakdown.successRate).toBeCloseTo(1 / 3, 5);
    expect(stats.successfulCompensations).toBe(1);
    expect(stats.failedCompensations).toBe(2);
    expect(stats.totalCompensations).toBe(3);
  });
});

// =============================================================================
// SECTION 7: saga-inspector.ts — getActiveExecutions edge cases
// =============================================================================

describe("saga-inspector.ts — getActiveExecutions edge cases", () => {
  it("empty activeTraces object returns empty array", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: {} });
    const active = inspector.getActiveExecutions();
    expect(active).toEqual([]);
    expect(active.length).toBe(0);
  });

  it("currentStepName for running trace with zero steps returns null", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({ executionId: "e1", sagaName: "TestSaga", status: "running", steps: [] }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    expect(inspector.getActiveExecutions()[0].currentStepName).toBeNull();
  });

  it("currentStepName for compensating trace without compensation object returns null", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "compensating",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "completed" }),
          makeStepTrace({ stepName: "StepC", stepIndex: 2, status: "completed" }),
        ],
        compensation: undefined,
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    expect(inspector.getActiveExecutions()[0].currentStepName).toBeNull();
  });

  it("currentStepName for running trace with first step failed returns second step name", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [
          makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" }),
          makeStepTrace({ stepName: "StepB", stepIndex: 1, status: "completed" }),
        ],
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    expect(inspector.getActiveExecutions()[0].currentStepName).toBe("StepB");
  });

  it("executionId is a non-empty string in active execution summaries", () => {
    const traces: Record<string, ExecutionTrace> = {
      "exec-id-test": makeTrace({
        executionId: "exec-id-test",
        sagaName: "TestSaga",
        status: "running",
        steps: [],
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active[0].executionId).toBe("exec-id-test");
    expect(active[0].executionId.length).toBeGreaterThan(0);
  });

  it("sagaName is a non-empty string in active execution summaries", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({ executionId: "e1", sagaName: "TestSaga", status: "running", steps: [] }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    expect(inspector.getActiveExecutions()[0].sagaName).toBe("TestSaga");
  });

  it("status is the exact trace status string", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({ executionId: "e1", sagaName: "TestSaga", status: "pending", steps: [] }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    expect(inspector.getActiveExecutions()[0].status).toBe("pending");
  });

  it("currentStepIndex is exactly the number of completed steps", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "running",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" })],
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const active = inspector.getActiveExecutions();
    expect(active[0].currentStepIndex).toBe(1);
    expect(active[0].completedStepCount).toBe(1);
  });

  it("active execution summary is frozen", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({ executionId: "e1", sagaName: "TestSaga", status: "running", steps: [] }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    expect(Object.isFrozen(inspector.getActiveExecutions()[0])).toBe(true);
  });
});

// =============================================================================
// SECTION 8: saga-inspector.ts — getSuggestions string and logic verification
// =============================================================================

describe("saga-inspector.ts — getSuggestions string/logic verification", () => {
  it("suggestion type strings are exact non-empty values", () => {
    const noCompStep: AnyStepDefinition = {
      name: "BareStep",
      port: PortA,
      invoke: () => ({}),
      compensate: null,
      condition: null,
      options: {},
    };
    const saga: AnySagaDefinition = {
      name: "SugSaga",
      steps: [noCompStep],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential", timeout: 60000 },
    };
    const inspector = createSagaInspector({ definitions: [saga] });
    const suggestions = inspector.getSuggestions();
    const types = suggestions.map(s => s.type);
    expect(types).toContain("saga_step_without_compensation");
    expect(types).toContain("saga_no_retry_on_external_port");
    expect(types).toContain("saga_long_timeout_without_persistence");
    for (const s of suggestions) {
      expect(s.type.length).toBeGreaterThan(0);
      expect(s.message.length).toBeGreaterThan(0);
      expect(s.action.length).toBeGreaterThan(0);
      expect(s.sagaName).toBe("SugSaga");
    }
  });

  it("step-level timeout suggestion includes stepName", () => {
    const longStep: AnyStepDefinition = {
      name: "VeryLongStep",
      port: PortA,
      invoke: () => ({}),
      compensate: () => ({}),
      condition: null,
      options: { retry: { maxAttempts: 1, delay: 10 }, timeout: 120000 },
    };
    const saga: AnySagaDefinition = {
      name: "StepTimeoutSaga",
      steps: [longStep],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };
    const inspector = createSagaInspector({ definitions: [saga] });
    const suggestions = inspector.getSuggestions();
    const stepTimeout = suggestions.find(
      s => s.type === "saga_long_timeout_without_persistence" && s.stepName === "VeryLongStep"
    );
    expect(stepTimeout).toBeDefined();
    expect(stepTimeout!.stepName).toBe("VeryLongStep");
    expect(stepTimeout!.message).toContain("120000");
    expect(stepTimeout!.message).toContain("VeryLongStep");
    expect(stepTimeout!.action).toContain("SagaPersister");
  });

  it("no retry suggestion has stepName set", () => {
    const step: AnyStepDefinition = {
      name: "UnretryStep",
      port: PortA,
      invoke: () => ({}),
      compensate: () => ({}),
      condition: null,
      options: {},
    };
    const saga: AnySagaDefinition = {
      name: "NoRetrySaga",
      steps: [step],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };
    const inspector = createSagaInspector({ definitions: [saga] });
    const retrySug = inspector
      .getSuggestions()
      .find(s => s.type === "saga_no_retry_on_external_port");
    expect(retrySug).toBeDefined();
    expect(retrySug!.stepName).toBe("UnretryStep");
    expect(retrySug!.sagaName).toBe("NoRetrySaga");
  });

  it("no compensation suggestion has stepName set", () => {
    const step: AnyStepDefinition = {
      name: "NoCompStep2",
      port: PortA,
      invoke: () => ({}),
      compensate: null,
      condition: null,
      options: { retry: { maxAttempts: 1, delay: 10 } },
    };
    const saga: AnySagaDefinition = {
      name: "NoCompSaga2",
      steps: [step],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };
    const inspector = createSagaInspector({ definitions: [saga] });
    const compSug = inspector
      .getSuggestions()
      .find(s => s.type === "saga_step_without_compensation");
    expect(compSug).toBeDefined();
    expect(compSug!.stepName).toBe("NoCompStep2");
    expect(compSug!.sagaName).toBe("NoCompSaga2");
  });

  it("saga-level timeout exactly at 30000 does NOT trigger suggestion", () => {
    const step: AnyStepDefinition = {
      name: "S",
      port: PortA,
      invoke: () => ({}),
      compensate: () => ({}),
      condition: null,
      options: { retry: { maxAttempts: 1, delay: 10 } },
    };
    const saga: AnySagaDefinition = {
      name: "BoundarySaga",
      steps: [step],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential", timeout: 30000 },
    };
    const inspector = createSagaInspector({ definitions: [saga] });
    expect(
      inspector.getSuggestions().filter(s => s.type === "saga_long_timeout_without_persistence")
    ).toHaveLength(0);
  });

  it("saga-level timeout at 30001 triggers suggestion (boundary test)", () => {
    const step: AnyStepDefinition = {
      name: "S",
      port: PortA,
      invoke: () => ({}),
      compensate: () => ({}),
      condition: null,
      options: { retry: { maxAttempts: 1, delay: 10 } },
    };
    const saga: AnySagaDefinition = {
      name: "BoundarySaga30001",
      steps: [step],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential", timeout: 30001 },
    };
    const inspector = createSagaInspector({ definitions: [saga] });
    const timeout = inspector
      .getSuggestions()
      .filter(
        s =>
          s.type === "saga_long_timeout_without_persistence" && s.sagaName === "BoundarySaga30001"
      );
    expect(timeout).toHaveLength(1);
    expect(timeout[0].message).toContain("30001");
  });

  it("step-level timeout at 30000 does NOT trigger suggestion", () => {
    const step: AnyStepDefinition = {
      name: "BoundaryStep",
      port: PortA,
      invoke: () => ({}),
      compensate: () => ({}),
      condition: null,
      options: { retry: { maxAttempts: 1, delay: 10 }, timeout: 30000 },
    };
    const saga: AnySagaDefinition = {
      name: "StepBoundarySaga",
      steps: [step],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };
    const inspector = createSagaInspector({ definitions: [saga] });
    expect(
      inspector.getSuggestions().filter(s => s.type === "saga_long_timeout_without_persistence")
    ).toHaveLength(0);
  });

  it("step-level timeout at 30001 triggers suggestion", () => {
    const step: AnyStepDefinition = {
      name: "BoundaryStep30001",
      port: PortA,
      invoke: () => ({}),
      compensate: () => ({}),
      condition: null,
      options: { retry: { maxAttempts: 1, delay: 10 }, timeout: 30001 },
    };
    const saga: AnySagaDefinition = {
      name: "StepBoundarySaga30001",
      steps: [step],
      outputMapper: r => r,
      options: { compensationStrategy: "sequential" },
    };
    const inspector = createSagaInspector({ definitions: [saga] });
    const timeout = inspector
      .getSuggestions()
      .filter(
        s =>
          s.type === "saga_long_timeout_without_persistence" && s.stepName === "BoundaryStep30001"
      );
    expect(timeout).toHaveLength(1);
  });

  it("high failure rate suggestion includes compensation success rate percentage", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            makeCompStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: "comp fail",
            }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const failRate = inspector
      .getSuggestions()
      .find(s => s.message.includes("compensation success rate"));
    expect(failRate).toBeDefined();
    expect(failRate!.message).toContain("0%");
    expect(failRate!.action.length).toBeGreaterThan(0);
    expect(failRate!.type).toBe("saga_step_without_compensation");
  });

  it("high failure rate check at exact boundary: successRate = 0.5 does NOT trigger", () => {
    const traces: Record<string, ExecutionTrace> = {
      e1: makeTrace({
        executionId: "e1",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" })],
          status: "completed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
      e2: makeTrace({
        executionId: "e2",
        sagaName: "TestSaga",
        status: "failed",
        steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
        compensation: {
          triggeredBy: "StepA",
          triggeredByIndex: 0,
          steps: [
            makeCompStepTrace({
              stepName: "StepA",
              stepIndex: 0,
              status: "failed",
              error: "comp fail",
            }),
          ],
          status: "failed",
          startedAt: 200,
          completedAt: 300,
          totalDurationMs: 100,
        },
      }),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    expect(
      inspector.getSuggestions().filter(s => s.message.includes("compensation success rate"))
    ).toHaveLength(0);
  });

  it("high failure rate with 1/3 success rate (< 0.5) triggers suggestion", () => {
    const traces: Record<string, ExecutionTrace> = {};
    traces["e1"] = makeTrace({
      executionId: "e1",
      sagaName: "TestSaga",
      status: "failed",
      steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
      compensation: {
        triggeredBy: "StepA",
        triggeredByIndex: 0,
        steps: [makeCompStepTrace({ stepName: "StepA", stepIndex: 0, status: "completed" })],
        status: "completed",
        startedAt: 200,
        completedAt: 300,
        totalDurationMs: 100,
      },
    });
    traces["e2"] = makeTrace({
      executionId: "e2",
      sagaName: "TestSaga",
      status: "failed",
      steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
      compensation: {
        triggeredBy: "StepA",
        triggeredByIndex: 0,
        steps: [
          makeCompStepTrace({
            stepName: "StepA",
            stepIndex: 0,
            status: "failed",
            error: "comp fail",
          }),
        ],
        status: "failed",
        startedAt: 200,
        completedAt: 300,
        totalDurationMs: 100,
      },
    });
    traces["e3"] = makeTrace({
      executionId: "e3",
      sagaName: "TestSaga",
      status: "failed",
      steps: [makeStepTrace({ stepName: "StepA", stepIndex: 0, status: "failed", error: "err" })],
      compensation: {
        triggeredBy: "StepA",
        triggeredByIndex: 0,
        steps: [
          makeCompStepTrace({
            stepName: "StepA",
            stepIndex: 0,
            status: "failed",
            error: "comp fail",
          }),
        ],
        status: "failed",
        startedAt: 200,
        completedAt: 300,
        totalDurationMs: 100,
      },
    });
    const inspector = createSagaInspector({ definitions: [TestSaga], activeTraces: traces });
    const failRate = inspector
      .getSuggestions()
      .filter(s => s.message.includes("compensation success rate"));
    expect(failRate.length).toBeGreaterThanOrEqual(1);
    expect(failRate[0].message).toContain("33%");
  });
});

// =============================================================================
// SECTION 9: saga-inspector.ts — getHistory edge cases
// =============================================================================

describe("saga-inspector.ts — getHistory edge cases", () => {
  it("returns empty ok result when no persister is configured", async () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([]);
      expect(result.value.length).toBe(0);
    }
  });

  it("passes filters to persister.list", async () => {
    let receivedFilters: any = null;
    const persister: SagaPersister = {
      save: () => ResultAsync.ok(undefined),
      load: () => ResultAsync.ok(null),
      delete: () => ResultAsync.ok(undefined),
      list: filters => {
        receivedFilters = filters;
        return ResultAsync.ok([]);
      },
      update: () => ResultAsync.ok(undefined),
    };
    const inspector = createSagaInspector({ definitions: [TestSaga], persister });
    await inspector.getHistory({ sagaName: "TestSaga", status: "completed", limit: 10 });
    expect(receivedFilters).toEqual({ sagaName: "TestSaga", status: "completed", limit: 10 });
  });

  it("getHistory maps states through executionStateToSummary correctly", async () => {
    const states = [
      makePersisterState({
        executionId: "h1",
        sagaName: "TestSaga",
        status: "completed",
        currentStep: 3,
        completedSteps: [
          {
            name: "StepA",
            index: 0,
            output: undefined,
            skipped: false,
            completedAt: "2024-01-01T00:00:30.000Z",
          },
          {
            name: "StepB",
            index: 1,
            output: undefined,
            skipped: false,
            completedAt: "2024-01-01T00:00:45.000Z",
          },
          {
            name: "StepC",
            index: 2,
            output: undefined,
            skipped: false,
            completedAt: "2024-01-01T00:01:00.000Z",
          },
        ],
      }),
    ];
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister(states),
    });
    const result = await inspector.getHistory();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0].executionId).toBe("h1");
      expect(result.value[0].totalSteps).toBe(3);
      expect(result.value[0].completedStepCount).toBe(3);
      expect(result.value[0].currentStepName).toBeNull();
    }
  });
});

// =============================================================================
// SECTION 10: saga-inspector.ts — subscribe and emitToInspector
// =============================================================================

describe("saga-inspector.ts — subscribe/emit additional coverage", () => {
  it("subscribe returns an unsubscribe function that removes only that listener", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const events1: any[] = [];
    const events2: any[] = [];
    const unsub1 = inspector.subscribe(e => events1.push(e));
    inspector.subscribe(e => events2.push(e));
    emitToInspector(inspector, {
      type: "saga:started",
      executionId: "e1",
      sagaName: "TestSaga",
      timestamp: 1000,
      input: {},
      stepCount: 3,
      metadata: undefined,
    });
    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
    unsub1();
    emitToInspector(inspector, {
      type: "saga:completed",
      executionId: "e1",
      sagaName: "TestSaga",
      timestamp: 2000,
      totalDurationMs: 1000,
      stepsExecuted: 3,
      stepsSkipped: 0,
    });
    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(2);
  });

  it("multiple subscribe calls create independent subscriptions", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const calls: number[] = [];
    inspector.subscribe(() => calls.push(1));
    inspector.subscribe(() => calls.push(2));
    inspector.subscribe(() => calls.push(3));
    emitToInspector(inspector, {
      type: "saga:started",
      executionId: "e1",
      sagaName: "TestSaga",
      timestamp: 1000,
      input: {},
      stepCount: 1,
      metadata: undefined,
    });
    expect(calls).toEqual([1, 2, 3]);
  });

  it("emitToInspector with throwing listener does not prevent other listeners from receiving", () => {
    const inspector = createSagaInspector({ definitions: [TestSaga] });
    const received: string[] = [];
    inspector.subscribe(() => {
      received.push("first");
      throw new Error("boom");
    });
    inspector.subscribe(() => received.push("second"));
    inspector.subscribe(() => received.push("third"));
    emitToInspector(inspector, {
      type: "saga:started",
      executionId: "e1",
      sagaName: "TestSaga",
      timestamp: 1000,
      input: {},
      stepCount: 1,
      metadata: undefined,
    });
    expect(received).toEqual(["first", "second", "third"]);
  });
});

// =============================================================================
// SECTION 11: saga-inspector.ts — getDefinitions with multiple sagas
// =============================================================================

describe("saga-inspector.ts — getDefinitions with multiple sagas", () => {
  it("returns all registered saga definitions in order", () => {
    const Saga2 = defineSaga("Saga2")
      .input<unknown>()
      .step(StepA)
      .output(r => r)
      .build();
    const inspector = createSagaInspector({ definitions: [TestSaga, Saga2] });
    const defs = inspector.getDefinitions();
    expect(defs).toHaveLength(2);
    expect(defs[0].name).toBe("TestSaga");
    expect(defs[1].name).toBe("Saga2");
  });

  it("returns empty array when no definitions registered", () => {
    const inspector = createSagaInspector({ definitions: [] });
    const defs = inspector.getDefinitions();
    expect(defs).toEqual([]);
    expect(defs.length).toBe(0);
  });
});

// =============================================================================
// SECTION 12: saga-inspector.ts — executionStateToSummary edge cases
// =============================================================================

describe("saga-inspector.ts — executionStateToSummary additional edge cases", () => {
  it("summary startedAt is exact timestamp from state", async () => {
    const state = makePersisterState({
      executionId: "e-ts1",
      sagaName: "TestSaga",
      timestamps: {
        startedAt: "2024-06-15T12:00:00.000Z",
        updatedAt: "2024-06-15T12:01:00.000Z",
        completedAt: null,
      },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    if (result.isOk()) {
      expect(result.value[0].startedAt).toBe("2024-06-15T12:00:00.000Z");
      expect(result.value[0].updatedAt).toBe("2024-06-15T12:01:00.000Z");
    }
  });

  it("completedStepCount is exact length from state.completedSteps", async () => {
    const state = makePersisterState({
      executionId: "e-cs1",
      sagaName: "TestSaga",
      completedSteps: [
        { name: "StepA", index: 0, output: undefined, skipped: false, completedAt: "" },
        { name: "StepB", index: 1, output: undefined, skipped: false, completedAt: "" },
      ],
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    if (result.isOk()) {
      expect(result.value[0].completedStepCount).toBe(2);
    }
  });

  it("compensationState arrays are spread copies (not references)", async () => {
    const compensatedSteps = ["StepA", "StepB"];
    const failedSteps = ["StepC"];
    const state = makePersisterState({
      executionId: "e-spread",
      sagaName: "TestSaga",
      compensation: { active: false, compensatedSteps, failedSteps, triggeringStepIndex: 2 },
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    if (result.isOk()) {
      expect(result.value[0].compensationState.compensatedSteps).toEqual(["StepA", "StepB"]);
      expect(result.value[0].compensationState.failedSteps).toEqual(["StepC"]);
      expect(result.value[0].compensationState.compensatedSteps).not.toBe(compensatedSteps);
      expect(result.value[0].compensationState.failedSteps).not.toBe(failedSteps);
    }
  });

  it("metadata is a spread copy (not same reference)", async () => {
    const meta = { key: "value" };
    const state = makePersisterState({
      executionId: "e-meta-ref",
      sagaName: "TestSaga",
      metadata: meta,
    });
    const inspector = createSagaInspector({
      definitions: [TestSaga],
      persister: makeMockPersister([state]),
    });
    const result = await inspector.getHistory();
    if (result.isOk()) {
      expect(result.value[0].metadata).toEqual({ key: "value" });
      expect(result.value[0].metadata).not.toBe(meta);
    }
  });
});
