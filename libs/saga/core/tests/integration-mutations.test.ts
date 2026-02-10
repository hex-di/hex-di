/**
 * Integration Mutation Tests
 *
 * Targets surviving mutants in:
 * - src/integration/inspector-adapter.ts (hasDispose, indexObject, adapter structure)
 * - src/integration/registry-adapter.ts (hasDispose, adapter structure)
 * - src/ports/factory.ts (port names, type guards, branding)
 * - src/compensation/engine.ts (strategies, event emission, edge cases)
 */

import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaInspectorAdapter } from "../src/integration/inspector-adapter.js";
import { SagaRegistryAdapter } from "../src/integration/registry-adapter.js";
import {
  SagaPersisterPort,
  SagaRegistryPort,
  SagaInspectorPort,
  sagaPort,
  sagaManagementPort,
  isSagaPort,
  isSagaManagementPort,
} from "../src/ports/factory.js";
import { executeCompensation } from "../src/compensation/engine.js";
import type { CompensationPlanStep } from "../src/compensation/types.js";
import type { CompensationInvoker } from "../src/compensation/engine.js";
import type { SagaEvent } from "../src/runtime/types.js";

// =============================================================================
// Test Ports & Steps & Sagas
// =============================================================================

const TestPort = createPort<"TestPort", any>({ name: "TestPort" });

const TestStep = defineStep("TestStep")
  .io<string, string>()
  .invoke(TestPort, ctx => ctx.input)
  .compensate(ctx => ctx.stepResult)
  .build();

const TestSaga = defineSaga("TestSaga")
  .input<string>()
  .step(TestStep)
  .output(() => ({}))
  .build();

// =============================================================================
// Helpers
// =============================================================================

function createMockPersister(states: any[]): any {
  return {
    save: () => ResultAsync.ok(undefined),
    load: () => ResultAsync.ok(null),
    delete: () => ResultAsync.ok(undefined),
    list: () => ResultAsync.ok(states),
    update: () => ResultAsync.ok(undefined),
  };
}

function createStep(name: string, index: number, result: unknown): CompensationPlanStep {
  return {
    stepName: name,
    stepIndex: index,
    result,
    compensateFn: ctx => ({ undo: ctx.stepResult, step: name }),
  };
}

function createInvoker(behavior?: Record<string, "fail">): {
  invoker: CompensationInvoker;
  calls: string[];
} {
  const calls: string[] = [];
  const invoker: CompensationInvoker = (step, _params) => {
    calls.push(step.stepName);
    if (behavior?.[step.stepName] === "fail") {
      return ResultAsync.err(new Error(`Compensation failed for ${step.stepName}`));
    }
    return ResultAsync.ok(undefined);
  };
  return { invoker, calls };
}

// =============================================================================
// A. Inspector Adapter (inspector-adapter.ts)
// =============================================================================

describe("createSagaInspectorAdapter", () => {
  describe("adapter structure", () => {
    const adapter = createSagaInspectorAdapter({
      definitions: [TestSaga],
    });

    it("provides is SagaInspectorPort", () => {
      expect(adapter.provides).toBe(SagaInspectorPort);
    });

    it("requires contains SagaRegistryPort", () => {
      expect(adapter.requires).toEqual([SagaRegistryPort]);
    });

    it("lifetime is singleton", () => {
      expect(adapter.lifetime).toBe("singleton");
    });

    it("factoryKind is sync", () => {
      expect(adapter.factoryKind).toBe("sync");
    });

    it("clonable is false", () => {
      expect(adapter.clonable).toBe(false);
    });

    it("is frozen", () => {
      expect(Object.isFrozen(adapter)).toBe(true);
    });
  });

  describe("factory", () => {
    it("creates a working inspector with getDefinitions", () => {
      const adapter = createSagaInspectorAdapter({
        definitions: [TestSaga],
      });
      const deps = { SagaRegistry: {} } as any;
      const inspector = adapter.factory(deps);

      const defs = inspector.getDefinitions();
      expect(defs).toHaveLength(1);
      expect(defs[0].name).toBe("TestSaga");
    });

    it("inspector has all expected methods", () => {
      const adapter = createSagaInspectorAdapter({
        definitions: [TestSaga],
      });
      const deps = { SagaRegistry: {} } as any;
      const inspector = adapter.factory(deps);

      expect(typeof inspector.getDefinitions).toBe("function");
      expect(typeof inspector.getActiveExecutions).toBe("function");
      expect(typeof inspector.getHistory).toBe("function");
      expect(typeof inspector.getTrace).toBe("function");
      expect(typeof inspector.getCompensationStats).toBe("function");
      expect(typeof inspector.getSuggestions).toBe("function");
      expect(typeof inspector.subscribe).toBe("function");
    });

    it("creates inspector with persister config", () => {
      const persister = createMockPersister([]);
      const adapter = createSagaInspectorAdapter({
        definitions: [TestSaga],
        persister,
      });
      const deps = { SagaRegistry: {} } as any;
      const inspector = adapter.factory(deps);

      // With persister, getHistory should delegate to persister
      expect(typeof inspector.getHistory).toBe("function");
    });

    it("creates inspector with activeTraces config", () => {
      const traces = {
        "exec-1": {
          executionId: "exec-1",
          sagaName: "TestSaga",
          input: "x",
          status: "running" as const,
          steps: [],
          compensation: undefined,
          startedAt: Date.now(),
          completedAt: undefined,
          totalDurationMs: undefined,
          metadata: undefined,
        },
      };
      const adapter = createSagaInspectorAdapter({
        definitions: [TestSaga],
        activeTraces: traces,
      });
      const deps = { SagaRegistry: {} } as any;
      const inspector = adapter.factory(deps);

      const active = inspector.getActiveExecutions();
      expect(active.length).toBe(1);
      expect(active[0].executionId).toBe("exec-1");
    });

    it("config without persister returns empty history", async () => {
      const adapter = createSagaInspectorAdapter({
        definitions: [TestSaga],
      });
      const deps = { SagaRegistry: {} } as any;
      const inspector = adapter.factory(deps);

      const result = await inspector.getHistory();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it("config without activeTraces returns empty active executions", () => {
      const adapter = createSagaInspectorAdapter({
        definitions: [TestSaga],
      });
      const deps = { SagaRegistry: {} } as any;
      const inspector = adapter.factory(deps);

      expect(inspector.getActiveExecutions()).toEqual([]);
    });
  });

  describe("finalizer", () => {
    it("calls dispose when present on instance", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      const disposeFn = vi.fn();
      const instance = {
        dispose: disposeFn,
        getDefinitions: vi.fn(),
        getActiveExecutions: vi.fn(),
        getHistory: vi.fn(),
        getTrace: vi.fn(),
        getCompensationStats: vi.fn(),
        getSuggestions: vi.fn(),
        subscribe: vi.fn(),
      };

      (adapter as any).finalizer(instance);
      expect(disposeFn).toHaveBeenCalledOnce();
    });

    it("does not crash when dispose is absent", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      const instance = {
        getDefinitions: vi.fn(),
        getActiveExecutions: vi.fn(),
        getHistory: vi.fn(),
        getTrace: vi.fn(),
        getCompensationStats: vi.fn(),
        getSuggestions: vi.fn(),
        subscribe: vi.fn(),
      };

      expect(() => (adapter as any).finalizer(instance)).not.toThrow();
    });

    it("does not call dispose when it is not a function", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      const instance = {
        dispose: "not-a-function",
        getDefinitions: vi.fn(),
        getActiveExecutions: vi.fn(),
        getHistory: vi.fn(),
        getTrace: vi.fn(),
        getCompensationStats: vi.fn(),
        getSuggestions: vi.fn(),
        subscribe: vi.fn(),
      };

      expect(() => (adapter as any).finalizer(instance as any)).not.toThrow();
    });
  });

  describe("hasDispose edge cases (via finalizer)", () => {
    it("handles null instance without crashing", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      // finalizer should not crash on null
      expect(() => (adapter as any).finalizer(null as any)).not.toThrow();
    });

    it("handles undefined instance without crashing", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      expect(() => (adapter as any).finalizer(undefined as any)).not.toThrow();
    });

    it("handles number instance without crashing", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      expect(() => (adapter as any).finalizer(42 as any)).not.toThrow();
    });

    it("handles string instance without crashing", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      expect(() => (adapter as any).finalizer("hello" as any)).not.toThrow();
    });

    it("handles object with getter-based dispose", () => {
      const adapter = createSagaInspectorAdapter({ definitions: [] });
      const disposeFn = vi.fn();
      const instance = Object.create(null);
      Object.defineProperty(instance, "dispose", {
        get: () => disposeFn,
        configurable: true,
        enumerable: true,
      });
      // getOwnPropertyDescriptor returns a getter, not a value, so hasDispose returns false
      expect(() => (adapter as any).finalizer(instance as any)).not.toThrow();
      expect(disposeFn).not.toHaveBeenCalled();
    });
  });

  describe("indexObject edge cases (via factory)", () => {
    it("factory works when deps is null-ish (non-object)", () => {
      const adapter = createSagaInspectorAdapter({
        definitions: [TestSaga],
      });
      // indexObject(null, "SagaRegistry") returns undefined, factory should still work
      const inspector = adapter.factory(null as any);
      expect(inspector.getDefinitions()).toHaveLength(1);
    });

    it("factory works when deps lacks SagaRegistry key", () => {
      const adapter = createSagaInspectorAdapter({
        definitions: [TestSaga],
      });
      const inspector = adapter.factory({} as any);
      expect(inspector.getDefinitions()).toHaveLength(1);
    });

    it("factory works when deps has SagaRegistry property", () => {
      const adapter = createSagaInspectorAdapter({
        definitions: [TestSaga],
      });
      const inspector = adapter.factory({ SagaRegistry: { fake: true } } as any);
      expect(inspector.getDefinitions()).toHaveLength(1);
    });
  });
});

// =============================================================================
// B. Registry Adapter (registry-adapter.ts)
// =============================================================================

describe("SagaRegistryAdapter", () => {
  it("provides is SagaRegistryPort", () => {
    expect(SagaRegistryAdapter.provides).toBe(SagaRegistryPort);
  });

  it("requires is empty array", () => {
    expect(SagaRegistryAdapter.requires).toEqual([]);
  });

  it("lifetime is singleton", () => {
    expect(SagaRegistryAdapter.lifetime).toBe("singleton");
  });

  it("factoryKind is sync", () => {
    expect(SagaRegistryAdapter.factoryKind).toBe("sync");
  });

  it("clonable is false", () => {
    expect(SagaRegistryAdapter.clonable).toBe(false);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(SagaRegistryAdapter)).toBe(true);
  });

  describe("factory", () => {
    it("creates a registry with register method", () => {
      const registry = SagaRegistryAdapter.factory({} as any);
      expect(typeof registry.register).toBe("function");
    });

    it("creates a registry with unregister method", () => {
      const registry = SagaRegistryAdapter.factory({} as any);
      expect(typeof registry.unregister).toBe("function");
    });

    it("creates a registry with getAllExecutions method", () => {
      const registry = SagaRegistryAdapter.factory({} as any);
      expect(typeof registry.getAllExecutions).toBe("function");
      expect(registry.getAllExecutions()).toEqual([]);
    });

    it("creates a registry with getExecution method", () => {
      const registry = SagaRegistryAdapter.factory({} as any);
      expect(typeof registry.getExecution).toBe("function");
    });

    it("creates a registry with getExecutionsBySaga method", () => {
      const registry = SagaRegistryAdapter.factory({} as any);
      expect(typeof registry.getExecutionsBySaga).toBe("function");
    });

    it("creates a registry with getExecutionsByStatus method", () => {
      const registry = SagaRegistryAdapter.factory({} as any);
      expect(typeof registry.getExecutionsByStatus).toBe("function");
    });

    it("creates a registry with subscribe method", () => {
      const registry = SagaRegistryAdapter.factory({} as any);
      expect(typeof registry.subscribe).toBe("function");
    });

    it("creates a registry with dispose method", () => {
      const registry = SagaRegistryAdapter.factory({} as any);
      expect(typeof registry.dispose).toBe("function");
    });
  });

  describe("finalizer", () => {
    it("calls dispose when present on the instance", () => {
      const disposeFn = vi.fn();
      const instance = {
        register: vi.fn(),
        unregister: vi.fn(),
        getAllExecutions: vi.fn(),
        getExecution: vi.fn(),
        getExecutionsBySaga: vi.fn(),
        getExecutionsByStatus: vi.fn(),
        subscribe: vi.fn(),
        dispose: disposeFn,
      };
      (SagaRegistryAdapter as any).finalizer(instance);
      expect(disposeFn).toHaveBeenCalledOnce();
    });

    it("does not crash when dispose is absent", () => {
      const instance = {
        register: vi.fn(),
        unregister: vi.fn(),
        getAllExecutions: vi.fn(),
        getExecution: vi.fn(),
        getExecutionsBySaga: vi.fn(),
        getExecutionsByStatus: vi.fn(),
        subscribe: vi.fn(),
      };
      expect(() => (SagaRegistryAdapter as any).finalizer(instance as any)).not.toThrow();
    });

    it("does not crash when instance is null", () => {
      expect(() => (SagaRegistryAdapter as any).finalizer(null as any)).not.toThrow();
    });

    it("does not crash when instance is a number", () => {
      expect(() => (SagaRegistryAdapter as any).finalizer(42 as any)).not.toThrow();
    });

    it("does not call dispose when it is not a function", () => {
      const instance = {
        register: vi.fn(),
        unregister: vi.fn(),
        getAllExecutions: vi.fn(),
        getExecution: vi.fn(),
        getExecutionsBySaga: vi.fn(),
        getExecutionsByStatus: vi.fn(),
        subscribe: vi.fn(),
        dispose: "not-a-function",
      };
      expect(() => (SagaRegistryAdapter as any).finalizer(instance as any)).not.toThrow();
    });

    it("does not call getter-based dispose", () => {
      const disposeFn = vi.fn();
      const instance = Object.create(null);
      instance.register = vi.fn();
      instance.unregister = vi.fn();
      instance.getAllExecutions = vi.fn();
      instance.getExecution = vi.fn();
      instance.getExecutionsBySaga = vi.fn();
      instance.getExecutionsByStatus = vi.fn();
      instance.subscribe = vi.fn();
      Object.defineProperty(instance, "dispose", {
        get: () => disposeFn,
        configurable: true,
        enumerable: true,
      });
      (SagaRegistryAdapter as any).finalizer(instance as any);
      // getter-based dispose: getOwnPropertyDescriptor returns accessor, not value
      expect(disposeFn).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// C. Ports Factory (ports/factory.ts)
// =============================================================================

describe("ports/factory.ts", () => {
  describe("pre-defined port names", () => {
    it("SagaPersisterPort name is SagaPersister", () => {
      expect(SagaPersisterPort.__portName).toBe("SagaPersister");
    });

    it("SagaRegistryPort name is SagaRegistry", () => {
      expect(SagaRegistryPort.__portName).toBe("SagaRegistry");
    });

    it("SagaInspectorPort name is SagaInspector", () => {
      expect(SagaInspectorPort.__portName).toBe("SagaInspector");
    });
  });

  describe("isSagaPort", () => {
    it("returns true for saga port", () => {
      const port = sagaPort<string, number>()({ name: "TestExec" });
      expect(isSagaPort(port)).toBe(true);
    });

    it("returns false for management port", () => {
      const port = sagaManagementPort<number>()({ name: "TestMgmt" });
      expect(isSagaPort(port)).toBe(false);
    });

    it("returns false for regular port", () => {
      const port = createPort<"Regular", any>({ name: "Regular" });
      expect(isSagaPort(port)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isSagaPort(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isSagaPort(undefined)).toBe(false);
    });

    it("returns false for number", () => {
      expect(isSagaPort(42)).toBe(false);
    });

    it("returns false for string", () => {
      expect(isSagaPort("hello")).toBe(false);
    });

    it("returns false for object without __portName", () => {
      expect(isSagaPort({ something: true })).toBe(false);
    });

    it("returns false for object with __portName but no saga kind", () => {
      expect(isSagaPort({ __portName: "Fake" })).toBe(false);
    });
  });

  describe("isSagaManagementPort", () => {
    it("returns true for management port", () => {
      const port = sagaManagementPort<number>()({ name: "TestMgmt" });
      expect(isSagaManagementPort(port)).toBe(true);
    });

    it("returns false for saga port", () => {
      const port = sagaPort<string, number>()({ name: "TestExec" });
      expect(isSagaManagementPort(port)).toBe(false);
    });

    it("returns false for regular port", () => {
      const port = createPort<"Regular", any>({ name: "Regular" });
      expect(isSagaManagementPort(port)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isSagaManagementPort(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isSagaManagementPort(undefined)).toBe(false);
    });

    it("returns false for number", () => {
      expect(isSagaManagementPort(42)).toBe(false);
    });

    it("returns false for object without __portName", () => {
      expect(isSagaManagementPort({})).toBe(false);
    });
  });

  describe("sagaPort factory", () => {
    it("created port has __portName matching config", () => {
      const port = sagaPort<string, number>()({ name: "MySaga" });
      expect(port.__portName).toBe("MySaga");
    });

    it("created port is frozen", () => {
      const port = sagaPort<string, number>()({ name: "FrozenSaga" });
      expect(Object.isFrozen(port)).toBe(true);
    });

    it("created port has category saga", () => {
      const port = sagaPort<string, number>()({ name: "CatSaga" });
      // The port's internal category is set via createPort with category: "saga"
      // We verify via isSagaPort (which checks the runtime kind symbol)
      expect(isSagaPort(port)).toBe(true);
    });

    it("port with description", () => {
      const port = sagaPort<string, number>()({ name: "DescSaga", description: "A description" });
      expect(port.__portName).toBe("DescSaga");
      expect(isSagaPort(port)).toBe(true);
    });
  });

  describe("sagaManagementPort factory", () => {
    it("created port has __portName matching config", () => {
      const port = sagaManagementPort<number>()({ name: "MyMgmt" });
      expect(port.__portName).toBe("MyMgmt");
    });

    it("created port is frozen", () => {
      const port = sagaManagementPort<number>()({ name: "FrozenMgmt" });
      expect(Object.isFrozen(port)).toBe(true);
    });

    it("created management port passes isSagaManagementPort", () => {
      const port = sagaManagementPort<number>()({ name: "MgmtGuard" });
      expect(isSagaManagementPort(port)).toBe(true);
    });

    it("port with description", () => {
      const port = sagaManagementPort<number>()({ name: "DescMgmt", description: "Mgmt desc" });
      expect(port.__portName).toBe("DescMgmt");
      expect(isSagaManagementPort(port)).toBe(true);
    });
  });
});

// =============================================================================
// D. Compensation Engine (compensation/engine.ts)
// =============================================================================

describe("compensation engine — mutation killers", () => {
  describe("sequential compensation", () => {
    it("compensates steps in exact reverse order", async () => {
      const steps = [createStep("A", 0, "a"), createStep("B", 1, "b"), createStep("C", 2, "c")];
      const { invoker, calls } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "seq-1",
        sagaName: "SeqSaga",
      });

      expect(calls).toEqual(["C", "B", "A"]);
      expect(result.compensatedSteps).toEqual(["C", "B", "A"]);
      expect(result.allSucceeded).toBe(true);
      expect(result.failedSteps).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("failure stops remaining steps", async () => {
      const steps = [createStep("A", 0, "a"), createStep("B", 1, "b"), createStep("C", 2, "c")];
      const { invoker, calls } = createInvoker({ B: "fail" });

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "seq-2",
        sagaName: "SeqSaga",
      });

      // C succeeds, B fails, A is never reached
      expect(calls).toEqual(["C", "B"]);
      expect(result.compensatedSteps).toEqual(["C"]);
      expect(result.failedSteps).toEqual(["B"]);
      expect(result.allSucceeded).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stepName).toBe("B");
    });

    it("emits compensation:step events in order", async () => {
      const steps = [createStep("A", 0, "a"), createStep("B", 1, "b")];
      const { invoker } = createInvoker();
      const events: SagaEvent[] = [];

      await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 2,
        failedStepName: "C",
        executionId: "seq-evt-1",
        sagaName: "SeqSaga",
        emitEvent: e => events.push(e),
      });

      const stepEvents = events.filter(e => e.type === "compensation:step");
      expect(stepEvents).toHaveLength(2);
      // Reversed order: B first, then A
      expect(stepEvents[0].stepName).toBe("B");
      expect(stepEvents[0].success).toBe(true);
      expect(stepEvents[0].stepIndex).toBe(1);
      expect(typeof stepEvents[0].durationMs).toBe("number");
      expect(stepEvents[1].stepName).toBe("A");
      expect(stepEvents[1].success).toBe(true);
    });

    it("emits compensation:completed event on full success", async () => {
      const steps = [createStep("A", 0, "a")];
      const { invoker } = createInvoker();
      const events: SagaEvent[] = [];

      await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 1,
        failedStepName: "B",
        executionId: "seq-comp-1",
        sagaName: "SeqSaga",
        emitEvent: e => events.push(e),
      });

      const completed = events.find(e => e.type === "compensation:completed");
      expect(completed).toBeDefined();
      expect(completed!.type).toBe("compensation:completed");
      if (completed && "compensatedSteps" in completed) {
        expect(completed.compensatedSteps).toEqual(["A"]);
        expect(typeof completed.totalDurationMs).toBe("number");
      }
    });

    it("emits compensation:failed event with remainingSteps", async () => {
      const steps = [createStep("A", 0, "a"), createStep("B", 1, "b"), createStep("C", 2, "c")];
      const { invoker } = createInvoker({ B: "fail" });
      const events: SagaEvent[] = [];

      await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "seq-fail-1",
        sagaName: "SeqSaga",
        emitEvent: e => events.push(e),
      });

      const failed = events.find(e => e.type === "compensation:failed");
      expect(failed).toBeDefined();
      if (failed && "failedCompensationStep" in failed) {
        expect(failed.failedCompensationStep).toBe("B");
        expect(failed.compensatedSteps).toEqual(["C"]);
        expect(failed.remainingSteps).toEqual(["A"]);
      }
    });
  });

  describe("parallel compensation", () => {
    it("all steps run concurrently", async () => {
      const steps = [createStep("A", 0, "a"), createStep("B", 1, "b"), createStep("C", 2, "c")];
      const { invoker, calls } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "par-1",
        sagaName: "ParSaga",
      });

      expect(calls).toHaveLength(3);
      expect(result.allSucceeded).toBe(true);
      expect(result.compensatedSteps).toHaveLength(3);
    });

    it("collects both successes and failures", async () => {
      const steps = [createStep("A", 0, "a"), createStep("B", 1, "b"), createStep("C", 2, "c")];
      const { invoker } = createInvoker({ B: "fail" });

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "par-2",
        sagaName: "ParSaga",
      });

      expect(result.allSucceeded).toBe(false);
      expect(result.compensatedSteps).toContain("A");
      expect(result.compensatedSteps).toContain("C");
      expect(result.failedSteps).toEqual(["B"]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stepName).toBe("B");
    });

    it("emits compensation:failed for parallel with first failed step", async () => {
      const steps = [createStep("A", 0, "a"), createStep("B", 1, "b")];
      const { invoker } = createInvoker({ A: "fail" });
      const events: SagaEvent[] = [];

      await executeCompensation({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 2,
        failedStepName: "C",
        executionId: "par-evt-1",
        sagaName: "ParSaga",
        emitEvent: e => events.push(e),
      });

      const failed = events.find(e => e.type === "compensation:failed");
      expect(failed).toBeDefined();
      if (failed && "failedCompensationStep" in failed) {
        expect(failed.failedCompensationStep).toBe("A");
        // Parallel: remainingSteps is empty
        expect(failed.remainingSteps).toEqual([]);
      }
    });

    it("emits compensation:completed on full parallel success", async () => {
      const steps = [createStep("A", 0, "a"), createStep("B", 1, "b")];
      const { invoker } = createInvoker();
      const events: SagaEvent[] = [];

      await executeCompensation({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 2,
        failedStepName: "C",
        executionId: "par-comp-1",
        sagaName: "ParSaga",
        emitEvent: e => events.push(e),
      });

      const completed = events.find(e => e.type === "compensation:completed");
      expect(completed).toBeDefined();
    });
  });

  describe("best-effort compensation", () => {
    it("continues past failures", async () => {
      const steps = [createStep("A", 0, "a"), createStep("B", 1, "b"), createStep("C", 2, "c")];
      const { invoker, calls } = createInvoker({ B: "fail" });

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "be-1",
        sagaName: "BESaga",
      });

      // All 3 should be attempted (reversed: C, B, A)
      expect(calls).toEqual(["C", "B", "A"]);
      expect(result.compensatedSteps).toContain("C");
      expect(result.compensatedSteps).toContain("A");
      expect(result.failedSteps).toEqual(["B"]);
      expect(result.allSucceeded).toBe(false);
    });

    it("collects all results", async () => {
      const steps = [createStep("A", 0, "a"), createStep("B", 1, "b"), createStep("C", 2, "c")];
      const { invoker } = createInvoker({ C: "fail", A: "fail" });

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "be-2",
        sagaName: "BESaga",
      });

      expect(result.compensatedSteps).toEqual(["B"]);
      expect(result.failedSteps).toContain("C");
      expect(result.failedSteps).toContain("A");
      expect(result.errors).toHaveLength(2);
      expect(result.allSucceeded).toBe(false);
    });

    it("emits compensation:failed for best-effort with first failure info", async () => {
      const steps = [createStep("A", 0, "a"), createStep("B", 1, "b")];
      const { invoker } = createInvoker({ B: "fail" });
      const events: SagaEvent[] = [];

      await executeCompensation({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 2,
        failedStepName: "C",
        executionId: "be-evt-1",
        sagaName: "BESaga",
        emitEvent: e => events.push(e),
      });

      const failed = events.find(e => e.type === "compensation:failed");
      expect(failed).toBeDefined();
      if (failed && "failedCompensationStep" in failed) {
        expect(failed.failedCompensationStep).toBe("B");
      }
    });

    it("emits compensation:completed on full best-effort success", async () => {
      const steps = [createStep("A", 0, "a"), createStep("B", 1, "b")];
      const { invoker } = createInvoker();
      const events: SagaEvent[] = [];

      await executeCompensation({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 2,
        failedStepName: "C",
        executionId: "be-comp-1",
        sagaName: "BESaga",
        emitEvent: e => events.push(e),
      });

      const completed = events.find(e => e.type === "compensation:completed");
      expect(completed).toBeDefined();
      if (completed && "compensatedSteps" in completed) {
        expect(completed.compensatedSteps).toHaveLength(2);
      }
    });
  });

  describe("empty plan", () => {
    it("returns allSucceeded=true and empty arrays for steps with no compensateFn", async () => {
      const steps: CompensationPlanStep[] = [];
      const { invoker } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 0,
        failedStepName: "A",
        executionId: "empty-1",
        sagaName: "EmptySaga",
      });

      expect(result.allSucceeded).toBe(true);
      expect(result.compensatedSteps).toEqual([]);
      expect(result.failedSteps).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  describe("steps with null compensateFn", () => {
    it("filters out steps without compensation function", async () => {
      const stepsWithNull = [
        createStep("A", 0, "a"),
        {
          stepName: "B",
          stepIndex: 1,
          result: "b",
          compensateFn: null,
        },
        createStep("C", 2, "c"),
      ];
      const { invoker, calls } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: stepsWithNull as any, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "null-comp-1",
        sagaName: "NullSaga",
      });

      // B should be filtered out since compensateFn === null
      expect(calls).toEqual(["C", "A"]);
      expect(result.compensatedSteps).toEqual(["C", "A"]);
      expect(result.allSucceeded).toBe(true);
    });
  });

  describe("compensateFn that throws", () => {
    it("sequential: throwing compensateFn causes failure and stops", async () => {
      const throwingStep: CompensationPlanStep = {
        stepName: "Thrower",
        stepIndex: 0,
        result: "x",
        compensateFn: () => {
          throw new Error("compensate boom");
        },
      };
      // Order: [Thrower(0), A(1)]. Reversed: [A(1), Thrower(0)].
      // A succeeds (invoker called), then Thrower fails (compensateFn throws).
      const steps = [throwingStep, createStep("A", 1, "a")];
      const { invoker, calls } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 2,
        failedStepName: "B",
        executionId: "throw-1",
        sagaName: "ThrowSaga",
      });

      // A runs first and succeeds, Thrower runs next and fails in compensateFn
      expect(calls).toEqual(["A"]);
      expect(result.compensatedSteps).toEqual(["A"]);
      expect(result.failedSteps).toContain("Thrower");
      expect(result.allSucceeded).toBe(false);
    });

    it("best-effort: throwing compensateFn records failure but continues", async () => {
      const throwingStep: CompensationPlanStep = {
        stepName: "Thrower",
        stepIndex: 1,
        result: "x",
        compensateFn: () => {
          throw new Error("compensate boom");
        },
      };
      const steps = [createStep("A", 0, "a"), throwingStep, createStep("C", 2, "c")];
      const { invoker, calls } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 3,
        failedStepName: "D",
        executionId: "throw-2",
        sagaName: "ThrowSaga",
      });

      // Reversed: C, Thrower, A - Thrower fails but A still runs
      expect(calls).toEqual(["C", "A"]);
      expect(result.compensatedSteps).toContain("C");
      expect(result.compensatedSteps).toContain("A");
      expect(result.failedSteps).toContain("Thrower");
      expect(result.allSucceeded).toBe(false);
    });

    it("parallel: throwing compensateFn records failure", async () => {
      const throwingStep: CompensationPlanStep = {
        stepName: "Thrower",
        stepIndex: 0,
        result: "x",
        compensateFn: () => {
          throw new Error("compensate boom");
        },
      };
      const steps = [throwingStep, createStep("B", 1, "b")];
      const { invoker } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 2,
        failedStepName: "C",
        executionId: "throw-3",
        sagaName: "ThrowSaga",
      });

      expect(result.failedSteps).toContain("Thrower");
      expect(result.compensatedSteps).toContain("B");
      expect(result.allSucceeded).toBe(false);
    });
  });

  describe("no emitEvent", () => {
    it("sequential works without emitEvent", async () => {
      const steps = [createStep("A", 0, "a")];
      const { invoker } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 1,
        failedStepName: "B",
        executionId: "no-emit-1",
        sagaName: "NoEmitSaga",
      });

      expect(result.allSucceeded).toBe(true);
    });

    it("parallel works without emitEvent", async () => {
      const steps = [createStep("A", 0, "a")];
      const { invoker } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 1,
        failedStepName: "B",
        executionId: "no-emit-2",
        sagaName: "NoEmitSaga",
      });

      expect(result.allSucceeded).toBe(true);
    });

    it("best-effort works without emitEvent", async () => {
      const steps = [createStep("A", 0, "a")];
      const { invoker } = createInvoker();

      const result = await executeCompensation({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        sagaInput: {},
        accumulatedResults: {},
        originalError: new Error("fail"),
        failedStepIndex: 1,
        failedStepName: "B",
        executionId: "no-emit-3",
        sagaName: "NoEmitSaga",
      });

      expect(result.allSucceeded).toBe(true);
    });
  });
});
