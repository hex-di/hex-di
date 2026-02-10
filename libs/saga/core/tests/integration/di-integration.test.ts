import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { safeTry, ok } from "@hex-di/result";
import { defineStep } from "../../src/step/builder.js";
import { defineSaga } from "../../src/saga/builder.js";
import { sagaPort, sagaManagementPort } from "../../src/ports/factory.js";
import { createSagaAdapter } from "../../src/adapters/factory.js";
import { createSagaRunner, executeSaga } from "../../src/runtime/runner.js";
import {
  createSagaExecutor,
  createSagaManagementExecutor,
} from "../../src/integration/executor.js";
import { createInMemoryPersister } from "../../src/persistence/in-memory.js";
import { createSagaTracingHook } from "../../src/introspection/saga-tracing-hook.js";
import type { PortResolver } from "../../src/runtime/types.js";
import type { TracerLike } from "../../src/introspection/types.js";

// =============================================================================
// Test Setup
// =============================================================================

const ValidatePort = createPort<"Validate", any>({ name: "Validate" });
const ReservePort = createPort<"Reserve", any>({ name: "Reserve" });
const ChargePort = createPort<"Charge", any>({ name: "Charge" });

const ValidateStep = defineStep("Validate")
  .io<{ orderId: string }, { valid: boolean }>()
  .invoke(ValidatePort, ctx => ctx.input)
  .build();

const ReserveStep = defineStep("Reserve")
  .io<{ orderId: string }, { reservationId: string }>()
  .invoke(ReservePort, ctx => ctx.input)
  .compensate(ctx => ({ undo: ctx.stepResult.reservationId }))
  .build();

const ChargeStep = defineStep("Charge")
  .io<{ orderId: string }, { transactionId: string }>()
  .invoke(ChargePort, ctx => ctx.input)
  .compensate(ctx => ({ refund: ctx.stepResult.transactionId }))
  .build();

type OrderInput = { orderId: string };
type OrderOutput = { reservationId: string; transactionId: string };

const OrderSaga = defineSaga("OrderSaga")
  .input<OrderInput>()
  .step(ValidateStep)
  .step(ReserveStep)
  .step(ChargeStep)
  .output(r => ({
    reservationId: r.Reserve.reservationId,
    transactionId: r.Charge.transactionId,
  }))
  .build();

const OrderSagaPort = sagaPort<OrderInput, OrderOutput>()({
  name: "OrderSaga",
});

const _OrderMgmtPort = sagaManagementPort<OrderOutput>()({
  name: "OrderSagaManagement",
});

function createMockResolver(portResults: Record<string, unknown>): PortResolver {
  return {
    resolve(portName: string): unknown {
      if (portName in portResults) {
        return (params: any) => {
          if (params?.undo || params?.refund) return Promise.resolve();
          return Promise.resolve(portResults[portName]);
        };
      }
      throw new Error(`Port not found: ${portName}`);
    },
  };
}

// =============================================================================
// DI Integration Tests (DOD 9)
// =============================================================================

describe("DI Integration", () => {
  describe("createSagaAdapter", () => {
    it("registers step port dependencies automatically via requires", () => {
      const adapter = createSagaAdapter(OrderSagaPort, {
        saga: OrderSaga,
        requires: [ValidatePort, ReservePort, ChargePort],
      });
      expect(adapter.requires).toHaveLength(3);
    });

    it("validates all step ports present at adapter level", () => {
      const adapter = createSagaAdapter(OrderSagaPort, {
        saga: OrderSaga,
        requires: [ValidatePort, ReservePort, ChargePort],
      });
      // requires is readonly unknown[], access port names at runtime
      const portNames = adapter.requires.map((p: any) => p.__portName);
      expect(portNames).toContain("Validate");
      expect(portNames).toContain("Reserve");
      expect(portNames).toContain("Charge");
    });
  });

  describe("createSagaExecutor", () => {
    it("creates a SagaExecutor that wraps SagaRunner with saga definition", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
      });
      const runner = createSagaRunner(resolver);
      const executor = createSagaExecutor<OrderInput, OrderOutput, never>(runner, OrderSaga);

      const result = await executor.execute({ orderId: "o-1" });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output.reservationId).toBe("r-1");
        expect(result.value.output.transactionId).toBe("t-1");
      }
    });

    it("executor is frozen", () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);
      const executor = createSagaExecutor<OrderInput, OrderOutput, never>(runner, OrderSaga);
      expect(Object.isFrozen(executor)).toBe(true);
    });

    it("executor returns Err on step failure", async () => {
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve({ valid: true });
          if (portName === "Reserve") return () => Promise.reject(new Error("out of stock"));
          return () => Promise.resolve();
        },
      };
      const runner = createSagaRunner(resolver);
      const executor = createSagaExecutor<OrderInput, OrderOutput, never>(runner, OrderSaga);

      const result = await executor.execute({ orderId: "o-1" });
      expect(result.isErr()).toBe(true);
    });

    it("defaultOptions are passed through to runner", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
      });
      const runner = createSagaRunner(resolver);
      const executor = createSagaExecutor<OrderInput, OrderOutput, never>(runner, OrderSaga, {
        executionId: "custom-exec-id",
      });

      const result = await executor.execute({ orderId: "o-1" });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.executionId).toBe("custom-exec-id");
      }
    });
  });

  describe("createSagaManagementExecutor", () => {
    it("creates a SagaManagementExecutor with management operations", () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);
      const mgmt = createSagaManagementExecutor<OrderOutput, never>(runner);

      expect(typeof mgmt.resume).toBe("function");
      expect(typeof mgmt.cancel).toBe("function");
      expect(typeof mgmt.getStatus).toBe("function");
      expect(typeof mgmt.listExecutions).toBe("function");
    });

    it("management executor is frozen", () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);
      const mgmt = createSagaManagementExecutor<OrderOutput, never>(runner);
      expect(Object.isFrozen(mgmt)).toBe(true);
    });

    it("cancel returns Err for nonexistent execution", async () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);
      const mgmt = createSagaManagementExecutor<OrderOutput, never>(runner);

      const result = await mgmt.cancel("nonexistent");
      expect(result.isErr()).toBe(true);
    });

    it("getStatus returns Err for nonexistent execution", async () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);
      const mgmt = createSagaManagementExecutor<OrderOutput, never>(runner);

      const result = await mgmt.getStatus("nonexistent");
      expect(result.isErr()).toBe(true);
    });

    it("listExecutions returns empty array for base implementation", async () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);
      const mgmt = createSagaManagementExecutor<OrderOutput, never>(runner);

      const result = await mgmt.listExecutions();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it("listExecutions returns entries when persister is provided", async () => {
      const persister = createInMemoryPersister();
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
      });
      const runner = createSagaRunner(resolver, { persister });
      const mgmt = createSagaManagementExecutor<OrderOutput, never>(runner, persister);

      // Execute a saga to populate persister
      await runner.execute(OrderSaga, { orderId: "o-1" }, { executionId: "list-exec-1" });

      const result = await mgmt.listExecutions();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThanOrEqual(1);
        const entry = result.value.find(e => e.executionId === "list-exec-1");
        expect(entry).toBeDefined();
        expect(entry?.sagaName).toBe("OrderSaga");
        expect(entry?.startedAt).toBeGreaterThan(0);
      }
    });

    it("listExecutions respects filter parameters", async () => {
      const persister = createInMemoryPersister();
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
      });
      const runner = createSagaRunner(resolver, { persister });
      const mgmt = createSagaManagementExecutor<OrderOutput, never>(runner, persister);

      // Execute multiple sagas
      await runner.execute(OrderSaga, { orderId: "o-1" }, { executionId: "filter-exec-1" });
      await runner.execute(OrderSaga, { orderId: "o-2" }, { executionId: "filter-exec-2" });
      await runner.execute(OrderSaga, { orderId: "o-3" }, { executionId: "filter-exec-3" });

      // Filter by limit
      const limited = await mgmt.listExecutions({ limit: 2 });
      expect(limited.isOk()).toBe(true);
      if (limited.isOk()) {
        expect(limited.value).toHaveLength(2);
      }

      // Filter by saga name
      const byName = await mgmt.listExecutions({ sagaName: "OrderSaga" });
      expect(byName.isOk()).toBe(true);
      if (byName.isOk()) {
        expect(byName.value.length).toBeGreaterThanOrEqual(3);
        for (const entry of byName.value) {
          expect(entry.sagaName).toBe("OrderSaga");
        }
      }
    });

    it("listExecutions returns empty when persister has no matching entries", async () => {
      const persister = createInMemoryPersister();
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);
      const mgmt = createSagaManagementExecutor<OrderOutput, never>(runner, persister);

      const result = await mgmt.listExecutions({ sagaName: "NonexistentSaga" });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe("scoped execution pattern", () => {
    it("executor resolved per scope creates independent executions", async () => {
      const _executionIds: string[] = [];
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
      });

      // Simulate 2 scopes each resolving an executor
      const runner = createSagaRunner(resolver);

      const executor1 = createSagaExecutor<OrderInput, OrderOutput, never>(runner, OrderSaga);
      const executor2 = createSagaExecutor<OrderInput, OrderOutput, never>(runner, OrderSaga);

      const [r1, r2] = await Promise.all([
        executor1.execute({ orderId: "o-1" }),
        executor2.execute({ orderId: "o-2" }),
      ]);

      expect(r1.isOk()).toBe(true);
      expect(r2.isOk()).toBe(true);
      if (r1.isOk() && r2.isOk()) {
        // Different execution IDs
        expect(r1.value.executionId).not.toBe(r2.value.executionId);
      }
    });
  });

  describe("executor port resolution", () => {
    it("executor.execute() returns Ok for registered port", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
      });
      const runner = createSagaRunner(resolver);
      const executor = createSagaExecutor<OrderInput, OrderOutput, never>(runner, OrderSaga);

      const result = await executor.execute({ orderId: "o-1" });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toEqual({
          reservationId: "r-1",
          transactionId: "t-1",
        });
      }
    });

    it("executor returns Err for missing port", async () => {
      const resolver: PortResolver = {
        resolve(portName: string): unknown {
          if (portName === "Validate") {
            return () => Promise.resolve({ valid: true });
          }
          throw new Error(`Unknown port: ${portName}`);
        },
      };
      const runner = createSagaRunner(resolver);
      const executor = createSagaExecutor<OrderInput, OrderOutput, never>(runner, OrderSaga);

      const result = await executor.execute({ orderId: "o-1" });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("PortNotFound");
      }
    });
  });

  describe("safeTry composition", () => {
    it("safeTry composes resolution + saga errors", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
      });
      const runner = createSagaRunner(resolver);

      const composed = safeTry(async function* () {
        const sagaResult = yield* await executeSaga(runner, OrderSaga, { orderId: "o-1" });
        return ok({
          executionId: sagaResult.executionId,
          reservationId: sagaResult.output.reservationId,
          transactionId: sagaResult.output.transactionId,
        });
      });

      const result = await composed;
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.reservationId).toBe("r-1");
        expect(result.value.transactionId).toBe("t-1");
      }
    });
  });

  describe("tracing hook", () => {
    it("tracing hook produces spans", () => {
      const mockTracer: TracerLike = {
        pushSpan: vi.fn(),
        popSpan: vi.fn(),
      };
      const hook = createSagaTracingHook({ tracer: mockTracer });

      hook.onStepStart("OrderSaga", "Validate", 0);
      hook.onStepEnd("OrderSaga", true);
      hook.onStepStart("OrderSaga", "Reserve", 1);
      hook.onStepEnd("OrderSaga", false);
      hook.onCompensationStart("OrderSaga", "Reserve");
      hook.onCompensationEnd("OrderSaga", true);

      expect(mockTracer.pushSpan).toHaveBeenCalledTimes(3);
      expect(mockTracer.popSpan).toHaveBeenCalledTimes(3);

      expect(mockTracer.pushSpan).toHaveBeenCalledWith(
        "saga:OrderSaga/Validate",
        expect.objectContaining({
          "hex-di.saga.name": "OrderSaga",
          "hex-di.saga.step.name": "Validate",
          "hex-di.saga.step.index": "0",
        })
      );

      expect(mockTracer.pushSpan).toHaveBeenCalledWith(
        "saga:compensation:Reserve",
        expect.objectContaining({
          "hex-di.saga.name": "OrderSaga",
          "hex-di.saga.failed.step": "Reserve",
        })
      );

      expect(mockTracer.popSpan).toHaveBeenCalledWith("ok");
      expect(mockTracer.popSpan).toHaveBeenCalledWith("error");
    });
  });

  describe("definition reuse", () => {
    it("same definition works with different resolvers", async () => {
      const resolver1 = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
      });
      const resolver2 = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-2" },
        Charge: { transactionId: "t-2" },
      });

      const runner1 = createSagaRunner(resolver1);
      const runner2 = createSagaRunner(resolver2);

      const executor1 = createSagaExecutor<OrderInput, OrderOutput, never>(runner1, OrderSaga);
      const executor2 = createSagaExecutor<OrderInput, OrderOutput, never>(runner2, OrderSaga);

      const [result1, result2] = await Promise.all([
        executor1.execute({ orderId: "o-1" }),
        executor2.execute({ orderId: "o-2" }),
      ]);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk()) {
        expect(result1.value.output.reservationId).toBe("r-1");
        expect(result1.value.output.transactionId).toBe("t-1");
      }

      if (result2.isOk()) {
        expect(result2.value.output.reservationId).toBe("r-2");
        expect(result2.value.output.transactionId).toBe("t-2");
      }
    });
  });

  describe("scope disposal triggers AbortSignal", () => {
    it("AbortSignal passed via options cancels execution", async () => {
      const resolver: PortResolver = {
        resolve() {
          return () => new Promise(resolve => setTimeout(() => resolve({ valid: true }), 200));
        },
      };

      const runner = createSagaRunner(resolver);
      const abortController = new AbortController();
      const executor = createSagaExecutor<OrderInput, OrderOutput, never>(runner, OrderSaga, {
        signal: abortController.signal,
      });

      const resultPromise = executor.execute({ orderId: "o-1" });

      // Simulate scope disposal by aborting
      setTimeout(() => abortController.abort(), 50);

      const result = await resultPromise;
      expect(result.isErr()).toBe(true);
    });
  });
});
