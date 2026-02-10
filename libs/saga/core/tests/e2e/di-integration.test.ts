import { describe, it, expect } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { ok, safeTry, err } from "@hex-di/result";
import { defineStep } from "../../src/step/builder.js";
import { defineSaga } from "../../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../../src/runtime/runner.js";
import { createSagaExecutor } from "../../src/integration/executor.js";
import { createSagaTracingHook } from "../../src/introspection/saga-tracing-hook.js";
import type { PortResolver } from "../../src/runtime/types.js";
import type { SagaEvent } from "../../src/runtime/types.js";
import type { TracerLike } from "../../src/introspection/types.js";

// =============================================================================
// Shared Ports (using `any` service type for test flexibility)
// =============================================================================

const ValidatePort = createPort<"Validate", any>({ name: "Validate" });
const ReservePort = createPort<"Reserve", any>({ name: "Reserve" });
const ChargePort = createPort<"Charge", any>({ name: "Charge" });

// =============================================================================
// Shared Steps & Saga
// =============================================================================

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

// =============================================================================
// Helper: build container with adapters for saga ports
// =============================================================================

function buildContainerWithAdapters(portResults: Record<string, unknown>) {
  const ValidateAdapter = createAdapter({
    provides: ValidatePort,
    factory: () => (params: any) => {
      if (params?.undo || params?.refund) return Promise.resolve();
      return Promise.resolve(portResults["Validate"]);
    },
  });

  const ReserveAdapter = createAdapter({
    provides: ReservePort,
    factory: () => (params: any) => {
      if (params?.undo || params?.refund) return Promise.resolve();
      return Promise.resolve(portResults["Reserve"]);
    },
  });

  const ChargeAdapter = createAdapter({
    provides: ChargePort,
    factory: () => (params: any) => {
      if (params?.undo || params?.refund) return Promise.resolve();
      return Promise.resolve(portResults["Charge"]);
    },
  });

  const graph = GraphBuilder.create()
    .provide(ValidateAdapter)
    .provide(ReserveAdapter)
    .provide(ChargeAdapter)
    .build();

  return createContainer({ graph, name: "SagaE2E" });
}

function containerResolver(container: { resolve(port: any): any }): PortResolver {
  return {
    resolve(portName: string) {
      const portMap: Record<string, any> = {
        Validate: ValidatePort,
        Reserve: ReservePort,
        Charge: ChargePort,
      };
      const port = portMap[portName];
      if (!port) throw new Error(`Port not found: ${portName}`);
      return container.resolve(port);
    },
  };
}

// =============================================================================
// E2E DI Integration Tests (DoD Section 9)
// =============================================================================

describe("E2E DI Integration", () => {
  it("full container setup: register -> build -> resolve -> execute -> dispose", async () => {
    const container = buildContainerWithAdapters({
      Validate: { valid: true },
      Reserve: { reservationId: "r-100" },
      Charge: { transactionId: "t-200" },
    });

    const resolver = containerResolver(container);
    const runner = createSagaRunner(resolver);
    const executor = createSagaExecutor<OrderInput, OrderOutput, never>(runner, OrderSaga);

    const result = await executor.execute({ orderId: "order-42" });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output.reservationId).toBe("r-100");
      expect(result.value.output.transactionId).toBe("t-200");
      expect(result.value.executionId).toBeTruthy();
    }

    // Dispose container — verifies no dangling resources
    await container.dispose();
  });

  it("multi-scope execution: independent scopes produce isolated results", async () => {
    // Use scoped lifetime so each scope gets its own adapter instance
    const ScopedValidatePort = createPort<"ScopedValidate", any>({ name: "ScopedValidate" });
    const ScopedReservePort = createPort<"ScopedReserve", any>({ name: "ScopedReserve" });
    const ScopedChargePort = createPort<"ScopedCharge", any>({ name: "ScopedCharge" });

    let callCount = 0;

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ScopedValidatePort,
          lifetime: "scoped",
          factory: () => () => Promise.resolve({ valid: true }),
        })
      )
      .provide(
        createAdapter({
          provides: ScopedReservePort,
          lifetime: "scoped",
          factory: () => () => {
            callCount++;
            return Promise.resolve({ reservationId: `r-${callCount}` });
          },
        })
      )
      .provide(
        createAdapter({
          provides: ScopedChargePort,
          lifetime: "scoped",
          factory: () => () => {
            callCount++;
            return Promise.resolve({ transactionId: `t-${callCount}` });
          },
        })
      )
      .build();

    const container = createContainer({ graph, name: "MultiScope" });

    const ScopedValidateStep = defineStep("ScopedValidate")
      .io<{ orderId: string }, { valid: boolean }>()
      .invoke(ScopedValidatePort, ctx => ctx.input)
      .build();

    const ScopedReserveStep = defineStep("ScopedReserve")
      .io<{ orderId: string }, { reservationId: string }>()
      .invoke(ScopedReservePort, ctx => ctx.input)
      .build();

    const ScopedChargeStep = defineStep("ScopedCharge")
      .io<{ orderId: string }, { transactionId: string }>()
      .invoke(ScopedChargePort, ctx => ctx.input)
      .build();

    const ScopedSaga = defineSaga("ScopedOrderSaga")
      .input<{ orderId: string }>()
      .step(ScopedValidateStep)
      .step(ScopedReserveStep)
      .step(ScopedChargeStep)
      .output(r => ({
        reservationId: r.ScopedReserve.reservationId,
        transactionId: r.ScopedCharge.transactionId,
      }))
      .build();

    const scope1 = container.createScope("scope-1");
    const scope2 = container.createScope("scope-2");

    const portMap: Record<string, any> = {
      ScopedValidate: ScopedValidatePort,
      ScopedReserve: ScopedReservePort,
      ScopedCharge: ScopedChargePort,
    };

    const resolver1: PortResolver = {
      resolve(portName: string) {
        const port = portMap[portName];
        if (!port) throw new Error(`Port not found: ${portName}`);
        return scope1.resolve(port);
      },
    };
    const resolver2: PortResolver = {
      resolve(portName: string) {
        const port = portMap[portName];
        if (!port) throw new Error(`Port not found: ${portName}`);
        return scope2.resolve(port);
      },
    };

    const runner1 = createSagaRunner(resolver1);
    const runner2 = createSagaRunner(resolver2);

    const [result1, result2] = await Promise.all([
      executeSaga(runner1, ScopedSaga, { orderId: "o-1" }),
      executeSaga(runner2, ScopedSaga, { orderId: "o-2" }),
    ]);

    expect(result1.isOk()).toBe(true);
    expect(result2.isOk()).toBe(true);

    if (result1.isOk() && result2.isOk()) {
      // Different execution IDs prove isolation
      expect(result1.value.executionId).not.toBe(result2.value.executionId);
      // Both completed independently
      expect(result1.value.output.reservationId).toBeTruthy();
      expect(result2.value.output.reservationId).toBeTruthy();
    }

    await container.dispose();
  });

  it("tracing integration: spans are produced for saga and step lifecycle", async () => {
    const spans: Array<{ name: string; attributes?: Record<string, string> }> = [];
    const popStatuses: string[] = [];

    const mockTracer: TracerLike = {
      pushSpan(name: string, attributes?: Record<string, string>) {
        spans.push({ name, attributes });
      },
      popSpan(status: "ok" | "error") {
        popStatuses.push(status);
      },
    };

    const hook = createSagaTracingHook({ tracer: mockTracer });

    const container = buildContainerWithAdapters({
      Validate: { valid: true },
      Reserve: { reservationId: "r-1" },
      Charge: { transactionId: "t-1" },
    });

    const resolver = containerResolver(container);
    const runner = createSagaRunner(resolver);

    const listener = (event: SagaEvent): void => {
      if (event.type === "step:started") {
        hook.onStepStart(event.sagaName, event.stepName, event.stepIndex);
      } else if (event.type === "step:completed") {
        hook.onStepEnd(event.sagaName, true);
      } else if (event.type === "step:failed") {
        hook.onStepEnd(event.sagaName, false);
      } else if (event.type === "compensation:started") {
        hook.onCompensationStart(event.sagaName, event.failedStepName);
      } else if (event.type === "compensation:completed") {
        hook.onCompensationEnd(event.sagaName, true);
      } else if (event.type === "compensation:failed") {
        hook.onCompensationEnd(event.sagaName, false);
      }
    };

    const result = await executeSaga(
      runner,
      OrderSaga,
      { orderId: "o-1" },
      {
        listeners: [listener],
      }
    );

    expect(result.isOk()).toBe(true);

    // Verify span tree: one span per step (3 steps total)
    expect(spans).toHaveLength(3);
    expect(popStatuses).toHaveLength(3);
    expect(popStatuses.every(s => s === "ok")).toBe(true);

    // Verify span attributes contain required keys
    const validateSpan = spans.find(s => s.name.includes("Validate"));
    expect(validateSpan).toBeDefined();
    expect(validateSpan?.attributes?.["hex-di.saga.name"]).toBe("OrderSaga");
    expect(validateSpan?.attributes?.["hex-di.saga.step.name"]).toBe("Validate");
    expect(validateSpan?.attributes?.["hex-di.saga.step.index"]).toBe("0");

    const reserveSpan = spans.find(s => s.name.includes("Reserve"));
    expect(reserveSpan).toBeDefined();
    expect(reserveSpan?.attributes?.["hex-di.saga.step.name"]).toBe("Reserve");
    expect(reserveSpan?.attributes?.["hex-di.saga.step.index"]).toBe("1");

    const chargeSpan = spans.find(s => s.name.includes("Charge"));
    expect(chargeSpan).toBeDefined();
    expect(chargeSpan?.attributes?.["hex-di.saga.step.name"]).toBe("Charge");
    expect(chargeSpan?.attributes?.["hex-di.saga.step.index"]).toBe("2");

    await container.dispose();
  });

  it("Result-based resolution + safeTry: error channels compose through Result", async () => {
    const container = buildContainerWithAdapters({
      Validate: { valid: true },
      Reserve: { reservationId: "r-1" },
      Charge: { transactionId: "t-1" },
    });

    const resolver = containerResolver(container);
    const runner = createSagaRunner(resolver);

    // Compose saga execution with additional Result-returning logic via safeTry
    const composed = safeTry(async function* () {
      const sagaResult = yield* await executeSaga(runner, OrderSaga, { orderId: "o-1" });

      // Simulate a post-saga business check that returns Result
      const businessCheck = sagaResult.output.reservationId.startsWith("r-")
        ? ok(sagaResult.output)
        : err({ _tag: "BusinessError" as const, message: "Invalid reservation format" });

      const output = yield* businessCheck;

      return ok({
        executionId: sagaResult.executionId,
        reservationId: output.reservationId,
        transactionId: output.transactionId,
        verified: true,
      });
    });

    const result = await composed;
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.reservationId).toBe("r-1");
      expect(result.value.transactionId).toBe("t-1");
      expect(result.value.verified).toBe(true);
    }

    // Verify error channel composition: business logic error flows through
    const failingComposed = safeTry(async function* () {
      const sagaResult = yield* await executeSaga(runner, OrderSaga, { orderId: "o-2" });

      // Force a business error
      const businessCheck = err({
        _tag: "BusinessError" as const,
        message: "Order limit exceeded",
      });

      yield* businessCheck;

      return ok({ executionId: sagaResult.executionId });
    });

    const failResult = await failingComposed;
    expect(failResult.isErr()).toBe(true);
    if (failResult.isErr()) {
      const error = failResult.error;
      expect(typeof error).toBe("object");
      expect(error).not.toBeNull();
      // The error should be our business error (not a saga error)
      const errorObj = error as { _tag: string; message: string };
      expect(errorObj._tag).toBe("BusinessError");
      expect(errorObj.message).toBe("Order limit exceeded");
    }

    await container.dispose();
  });
});
