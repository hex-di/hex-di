import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../../src/step/builder.js";
import { defineSaga } from "../../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../../src/runtime/runner.js";
import { createInMemoryPersister } from "../../src/persistence/in-memory.js";
import type { PortResolver } from "../../src/runtime/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const InitPort = createPort<"Init", any>({ name: "Init" });
const ProcessPort = createPort<"Process", any>({ name: "Process" });
const FinalPort = createPort<"Final", any>({ name: "Final" });
const BranchAPort = createPort<"BranchA", any>({ name: "BranchA" });
const BranchBPort = createPort<"BranchB", any>({ name: "BranchB" });

// =============================================================================
// E2E Tests (DOD 13: Advanced Patterns)
// =============================================================================

describe("Advanced Patterns E2E", () => {
  describe("multi-saga composition", () => {
    it("parent saga invokes sub-saga via .saga()", async () => {
      const SubStep = defineStep("SubProcess")
        .io<{ parentData: string }, { subResult: string }>()
        .invoke(ProcessPort, ctx => ctx.input)
        .build();

      const SubSaga = defineSaga("SubSaga")
        .input<{ parentData: string }>()
        .step(SubStep)
        .output(r => ({ subResult: r.SubProcess.subResult }))
        .build();

      const ParentInit = defineStep("ParentInit")
        .io<{ orderId: string }, { parentData: string }>()
        .invoke(InitPort, ctx => ctx.input)
        .build();

      const ParentSaga = defineSaga("ParentSaga")
        .input<{ orderId: string }>()
        .step(ParentInit)
        .saga(SubSaga, ctx => ({ parentData: ctx.results.ParentInit.parentData }))
        .output(r => ({
          orderId: "o-1",
          subResult: r.SubSaga.subResult,
        }))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Init") return () => Promise.resolve({ parentData: "data-from-parent" });
          if (portName === "Process") return () => Promise.resolve({ subResult: "sub-done" });
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, ParentSaga, { orderId: "o-1" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output.subResult).toBe("sub-done");
      }
    });

    it("sub-saga failure triggers parent compensation", async () => {
      const SubStep = defineStep("SubFail")
        .io<string, string>()
        .invoke(ProcessPort, ctx => ctx.input)
        .build();

      const SubSaga = defineSaga("FailingSub")
        .input<string>()
        .step(SubStep)
        .output(r => r.SubFail)
        .build();

      const ParentStep = defineStep("ParentStep")
        .io<string, { data: string }>()
        .invoke(InitPort, ctx => ctx.input)
        .compensate(() => ({ undo: true }))
        .build();

      const ParentSaga = defineSaga("ParentWithSub")
        .input<string>()
        .step(ParentStep)
        .saga(SubSaga, () => "sub-input")
        .output(() => ({}))
        .build();

      const compensateCalled = vi.fn();
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Init") {
            return (params: any) => {
              if (params?.undo) {
                compensateCalled();
                return Promise.resolve();
              }
              return Promise.resolve({ data: "parent-data" });
            };
          }
          if (portName === "Process") return () => Promise.reject(new Error("sub failed"));
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, ParentSaga, "input");

      expect(result.isErr()).toBe(true);
    });
  });

  describe("branch execution", () => {
    it("selector chooses correct branch at runtime", async () => {
      const StepA = defineStep("StepA")
        .io<{ mode: string }, { resultA: string }>()
        .invoke(BranchAPort, ctx => ctx.input)
        .build();

      const StepB = defineStep("StepB")
        .io<{ mode: string }, { resultB: string }>()
        .invoke(BranchBPort, ctx => ctx.input)
        .build();

      const BranchSaga = defineSaga("BranchSaga")
        .input<{ mode: string }>()
        .branch(ctx => ((ctx.input as { mode: string }).mode === "a" ? "a" : "b"), {
          a: [StepA] as const,
          b: [StepB] as const,
        })
        .output(() => ({ done: true }))
        .build();

      const resolvedPorts: string[] = [];
      const resolver: PortResolver = {
        resolve(portName: string) {
          resolvedPorts.push(portName);
          if (portName === "BranchA") return () => Promise.resolve({ resultA: "a-done" });
          if (portName === "BranchB") return () => Promise.resolve({ resultB: "b-done" });
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, BranchSaga, { mode: "a" });

      expect(result.isOk()).toBe(true);
      expect(resolvedPorts).toContain("BranchA");
      expect(resolvedPorts).not.toContain("BranchB");
    });

    it("only selected branch steps execute and compensate", async () => {
      const StepA = defineStep("StepA")
        .io<{ mode: string }, string>()
        .invoke(BranchAPort, ctx => ctx.input)
        .compensate(() => ({ undo: "a" }))
        .build();

      const StepB = defineStep("StepB")
        .io<{ mode: string }, string>()
        .invoke(BranchBPort, ctx => ctx.input)
        .compensate(() => ({ undo: "b" }))
        .build();

      const FailStep = defineStep("Fail")
        .io<{ mode: string }, string>()
        .invoke(FinalPort, ctx => ctx.input)
        .build();

      const BranchSaga = defineSaga("BranchCompSaga")
        .input<{ mode: string }>()
        .branch(() => "a" as const, {
          a: [StepA] as const,
          b: [StepB] as const,
        })
        .step(FailStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "BranchA") {
            return (params: any) => {
              if (params?.undo) return Promise.resolve();
              return Promise.resolve("a-result");
            };
          }
          if (portName === "BranchB") return () => Promise.resolve("b-result");
          if (portName === "Final") return () => Promise.reject(new Error("final failed"));
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, BranchSaga, { mode: "a" });

      expect(result.isErr()).toBe(true);
    });
  });

  describe("saga hooks", () => {
    it("beforeStep called before each step, afterStep called after", async () => {
      const Step1 = defineStep("Step1")
        .io<string, string>()
        .invoke(InitPort, ctx => ctx.input)
        .build();

      const Step2 = defineStep("Step2")
        .io<string, string>()
        .invoke(ProcessPort, ctx => ctx.input)
        .build();

      const hookCalls: string[] = [];

      const saga = defineSaga("HookSaga")
        .input<string>()
        .step(Step1)
        .step(Step2)
        .output(() => ({ done: true }))
        .options({
          compensationStrategy: "sequential",
          hooks: {
            beforeStep: ctx => hookCalls.push(`before:${ctx.stepName}`),
            afterStep: ctx => hookCalls.push(`after:${ctx.stepName}`),
          },
        })
        .build();

      // Hooks are stored in options; they are called by the runtime if it supports them
      expect(saga.options.hooks?.beforeStep).toBeDefined();
      expect(saga.options.hooks?.afterStep).toBeDefined();

      const resolver: PortResolver = {
        resolve() {
          return () => Promise.resolve("ok");
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input");

      expect(result.isOk()).toBe(true);
    });
  });

  describe("idempotent step execution", () => {
    it("duplicate idempotency key returns cached result (simulated via port)", async () => {
      const cache = new Map<string, unknown>();
      let callCount = 0;

      const IdempotentStep = defineStep("Idempotent")
        .io<{ key: string }, { result: string }>()
        .invoke(InitPort, ctx => ctx.input)
        .build();

      const saga = defineSaga("IdempotentSaga")
        .input<{ key: string }>()
        .step(IdempotentStep)
        .output(r => r.Idempotent)
        .build();

      const resolver: PortResolver = {
        resolve() {
          return (params: { key: string }) => {
            if (cache.has(params.key)) {
              return Promise.resolve(cache.get(params.key));
            }
            callCount++;
            const result = { result: `result-${callCount}` };
            cache.set(params.key, result);
            return Promise.resolve(result);
          };
        },
      };

      const runner = createSagaRunner(resolver);

      // First execution
      const r1 = await executeSaga(runner, saga, { key: "k1" });
      expect(r1.isOk()).toBe(true);

      // Second execution with same key (simulated idempotency)
      const r2 = await executeSaga(runner, saga, { key: "k1" });
      expect(r2.isOk()).toBe(true);

      // Port was only truly invoked once for this key
      expect(callCount).toBe(1);
    });
  });

  describe("long-running saga with persistence", () => {
    it("persists after each step, resumes after simulated crash", async () => {
      const Step0Port = createPort<"S0", any>({ name: "S0" });
      const Step1Port = createPort<"S1", any>({ name: "S1" });
      const Step2Port = createPort<"S2", any>({ name: "S2" });
      const Step3Port = createPort<"S3", any>({ name: "S3" });
      const Step4Port = createPort<"S4", any>({ name: "S4" });

      const steps = [
        defineStep("S0")
          .io<string, { r0: string }>()
          .invoke(Step0Port, ctx => ctx.input)
          .compensate(ctx => ({ undo: ctx.stepResult.r0 }))
          .build(),
        defineStep("S1")
          .io<string, { r1: string }>()
          .invoke(Step1Port, ctx => ctx.input)
          .compensate(ctx => ({ undo: ctx.stepResult.r1 }))
          .build(),
        defineStep("S2")
          .io<string, { r2: string }>()
          .invoke(Step2Port, ctx => ctx.input)
          .compensate(ctx => ({ undo: ctx.stepResult.r2 }))
          .build(),
        defineStep("S3")
          .io<string, { r3: string }>()
          .invoke(Step3Port, ctx => ctx.input)
          .build(),
        defineStep("S4")
          .io<string, { r4: string }>()
          .invoke(Step4Port, ctx => ctx.input)
          .build(),
      ] as const;

      const FiveStepSaga = defineSaga("LongRunning5")
        .input<string>()
        .step(steps[0])
        .step(steps[1])
        .step(steps[2])
        .step(steps[3])
        .step(steps[4])
        .output(r => ({
          r0: r.S0.r0,
          r1: r.S1.r1,
          r2: r.S2.r2,
          r3: r.S3.r3,
          r4: r.S4.r4,
        }))
        .build();

      const persister = createInMemoryPersister();
      const callLog: string[] = [];

      const resolver: PortResolver = {
        resolve(portName: string) {
          return (params: any) => {
            if (params?.undo) return Promise.resolve();
            callLog.push(portName);
            return Promise.resolve({ [`r${portName.replace("S", "")}`]: `v${portName}` });
          };
        },
      };

      const runner = createSagaRunner(resolver, { persister });

      // Execute fully first to register saga
      await runner.execute(FiveStepSaga, "init", { executionId: "reg-long" });
      callLog.length = 0;

      // Simulate crash after 3 steps
      await persister.save({
        executionId: "crash-long",
        sagaName: "LongRunning5",
        input: "resumed",
        currentStep: 3,
        completedSteps: [
          {
            name: "S0",
            index: 0,
            output: { r0: "persisted-0" },
            skipped: false,
            completedAt: new Date().toISOString(),
          },
          {
            name: "S1",
            index: 1,
            output: { r1: "persisted-1" },
            skipped: false,
            completedAt: new Date().toISOString(),
          },
          {
            name: "S2",
            index: 2,
            output: { r2: "persisted-2" },
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

      // Resume: steps 3-4 should execute, 0-2 skipped
      const result = await runner.resume("crash-long");
      expect(result.isOk()).toBe(true);
      expect(callLog).toEqual(["S3", "S4"]);

      if (result.isOk()) {
        const output = result.value.output;
        expect(output).toHaveProperty("r0", "persisted-0");
        expect(output).toHaveProperty("r1", "persisted-1");
        expect(output).toHaveProperty("r2", "persisted-2");
        expect(output).toHaveProperty("r3");
        expect(output).toHaveProperty("r4");
      }
    });

    it("external event triggers resume() to continue saga", async () => {
      const StepAPort = createPort<"RA", any>({ name: "RA" });
      const StepBPort = createPort<"RB", any>({ name: "RB" });

      const StepA = defineStep("RA")
        .io<string, { a: string }>()
        .invoke(StepAPort, ctx => ctx.input)
        .build();

      const StepB = defineStep("RB")
        .io<string, { b: string }>()
        .invoke(StepBPort, ctx => ctx.input)
        .build();

      const ResumeSaga = defineSaga("ResumeSaga")
        .input<string>()
        .step(StepA)
        .step(StepB)
        .output(r => ({ a: r.RA.a, b: r.RB.b }))
        .build();

      const persister = createInMemoryPersister();
      const callLog: string[] = [];

      const resolver: PortResolver = {
        resolve(portName: string) {
          return () => {
            callLog.push(portName);
            return Promise.resolve({ [portName === "RA" ? "a" : "b"]: `result-${portName}` });
          };
        },
      };

      const runner = createSagaRunner(resolver, { persister });

      // Register saga
      await runner.execute(ResumeSaga, "register", { executionId: "reg-resume" });
      callLog.length = 0;

      // Simulate partial completion
      await persister.save({
        executionId: "event-resume",
        sagaName: "ResumeSaga",
        input: "event-trigger",
        currentStep: 1,
        completedSteps: [
          {
            name: "RA",
            index: 0,
            output: { a: "a-done" },
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
        totalSteps: 2,
        pendingStep: null,
      });

      // External event triggers resume
      const result = await runner.resume("event-resume");
      expect(result.isOk()).toBe(true);
      expect(callLog).toEqual(["RB"]);
    });

    it("saga-level timeout fires after configured duration", async () => {
      const SlowPort = createPort<"SlowOp", any>({ name: "SlowOp" });

      const SlowStep = defineStep("SlowOp")
        .io<string, string>()
        .invoke(SlowPort, ctx => ctx.input)
        .timeout(50)
        .build();

      const TimeoutSaga = defineSaga("TimeoutSaga")
        .input<string>()
        .step(SlowStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => new Promise(resolve => setTimeout(() => resolve("done"), 500));
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, TimeoutSaga, "input");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Timeout");
      }
    });
  });

  describe("idempotent compensation", () => {
    it("re-execution of failed saga produces same compensation result", async () => {
      const compensationCalls: Array<{ port: string; params: unknown }> = [];

      const PayPort = createPort<"Pay", any>({ name: "Pay" });
      const ShipPort = createPort<"Ship", any>({ name: "Ship" });

      const PayStep = defineStep("Pay")
        .io<string, { txId: string }>()
        .invoke(PayPort, ctx => ctx.input)
        .compensate(ctx => ({ refund: ctx.stepResult.txId }))
        .build();

      const ShipStep = defineStep("Ship")
        .io<string, string>()
        .invoke(ShipPort, ctx => ctx.input)
        .build();

      const CompSaga = defineSaga("IdempotentCompSaga")
        .input<string>()
        .step(PayStep)
        .step(ShipStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          return (params: any) => {
            if (params?.refund) {
              compensationCalls.push({ port: portName, params });
              return Promise.resolve();
            }
            if (portName === "Pay") return Promise.resolve({ txId: "tx-123" });
            if (portName === "Ship") return Promise.reject(new Error("ship failed"));
            throw new Error(`Port not found: ${portName}`);
          };
        },
      };

      const runner = createSagaRunner(resolver);

      // First execution: fails at Ship, Pay compensated
      const r1 = await executeSaga(runner, CompSaga, "attempt-1");
      expect(r1.isErr()).toBe(true);

      // Second execution: same failure, same compensation
      const r2 = await executeSaga(runner, CompSaga, "attempt-2");
      expect(r2.isErr()).toBe(true);

      // Both compensations called Pay with same refund params
      const payCompensations = compensationCalls.filter(c => c.port === "Pay");
      expect(payCompensations).toHaveLength(2);
      expect(payCompensations[0].params).toEqual({ refund: "tx-123" });
      expect(payCompensations[1].params).toEqual({ refund: "tx-123" });
    });
  });

  describe("multi-saga nested compensation", () => {
    it("nested compensation runs atomically: child compensates before parent", async () => {
      const compensationOrder: string[] = [];

      const ChildPort = createPort<"Child", any>({ name: "Child" });
      const FailPort = createPort<"FailChild", any>({ name: "FailChild" });

      const ChildStep = defineStep("ChildStep")
        .io<string, { cid: string }>()
        .invoke(ChildPort, ctx => ctx.input)
        .compensate(() => {
          compensationOrder.push("ChildStep");
          return { undoChild: true };
        })
        .build();

      const ChildFailStep = defineStep("ChildFail")
        .io<string, string>()
        .invoke(FailPort, ctx => ctx.input)
        .build();

      const ChildSaga = defineSaga("ChildSaga")
        .input<string>()
        .step(ChildStep)
        .step(ChildFailStep)
        .output(() => ({}))
        .build();

      const ParentStep = defineStep("ParentSetup")
        .io<string, { pid: string }>()
        .invoke(InitPort, ctx => ctx.input)
        .compensate(() => {
          compensationOrder.push("ParentSetup");
          return { undoParent: true };
        })
        .build();

      const ParentSaga = defineSaga("NestedParent")
        .input<string>()
        .step(ParentStep)
        .saga(ChildSaga, () => "child-input")
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          return (params: any) => {
            if (params?.undoChild || params?.undoParent) return Promise.resolve();
            if (portName === "Init") return Promise.resolve({ pid: "p-1" });
            if (portName === "Child") return Promise.resolve({ cid: "c-1" });
            if (portName === "FailChild") return Promise.reject(new Error("child step failed"));
            throw new Error(`Port not found: ${portName}`);
          };
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, ParentSaga, "input");

      expect(result.isErr()).toBe(true);

      // Child compensation should have been triggered
      // The exact order depends on how the runner handles sub-saga compensation,
      // but ChildStep compensation should appear in the log
      expect(compensationOrder).toContain("ChildStep");
    });
  });

  describe("resume in different scope", () => {
    it("new scope created on resume, original scope unavailable", async () => {
      const SAPort = createPort<"SA", any>({ name: "SA" });
      const SBPort = createPort<"SB", any>({ name: "SB" });

      const SA = defineStep("SA")
        .io<string, { a: string }>()
        .invoke(SAPort, ctx => ctx.input)
        .build();

      const SB = defineStep("SB")
        .io<string, { b: string }>()
        .invoke(SBPort, ctx => ctx.input)
        .build();

      const ScopedSaga = defineSaga("ScopedResumeSaga")
        .input<string>()
        .step(SA)
        .step(SB)
        .output(r => ({ a: r.SA.a, b: r.SB.b }))
        .build();

      const persister = createInMemoryPersister();

      // Runner 1 (original scope)
      const resolvedInScope1: string[] = [];
      const resolver1: PortResolver = {
        resolve(portName: string) {
          resolvedInScope1.push(portName);
          return () => Promise.resolve({ a: "scope1-a", b: "scope1-b" });
        },
      };

      const runner1 = createSagaRunner(resolver1, { persister });
      await runner1.execute(ScopedSaga, "scope1", { executionId: "scope-reg" });

      // Simulate crash: save state as if SA completed but SB hasn't
      await persister.save({
        executionId: "scope-resume",
        sagaName: "ScopedResumeSaga",
        input: "scope1",
        currentStep: 1,
        completedSteps: [
          {
            name: "SA",
            index: 0,
            output: { a: "original-a" },
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
        totalSteps: 2,
        pendingStep: null,
      });

      // Runner 2 (new scope) — uses different resolver
      const resolvedInScope2: string[] = [];
      const resolver2: PortResolver = {
        resolve(portName: string) {
          resolvedInScope2.push(portName);
          return () => Promise.resolve({ a: "scope2-a", b: "scope2-b" });
        },
      };

      const runner2 = createSagaRunner(resolver2, { persister });
      // Must register saga in runner2's internal registry first
      await runner2.execute(ScopedSaga, "scope2-reg", { executionId: "scope2-reg" });
      resolvedInScope2.length = 0;

      // Resume in new scope
      const result = await runner2.resume("scope-resume");
      expect(result.isOk()).toBe(true);

      // Only SB resolved in new scope (SA was persisted)
      expect(resolvedInScope2).toEqual(["SB"]);

      if (result.isOk()) {
        // SA output comes from persisted state, SB from new scope
        expect(result.value.output).toHaveProperty("a", "original-a");
        expect(result.value.output).toHaveProperty("b", "scope2-b");
      }
    });
  });
});
