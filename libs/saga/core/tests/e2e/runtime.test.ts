import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../../src/step/builder.js";
import { defineSaga } from "../../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../../src/runtime/runner.js";
import type { PortResolver } from "../../src/runtime/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const ValidatePort = createPort<"Validate", any>({ name: "Validate" });
const InventoryPort = createPort<"Inventory", any>({ name: "Inventory" });
const PaymentPort = createPort<"Payment", any>({ name: "Payment" });
const ShippingPort = createPort<"Shipping", any>({ name: "Shipping" });
const NotifyPort = createPort<"Notify", any>({ name: "Notify" });

// =============================================================================
// E2E Tests (DOD 6: Runtime E2E)
// =============================================================================

describe("runtime e2e", () => {
  it("order saga: reserve -> charge -> ship -> success", async () => {
    const ValidateStep = defineStep("Validate")
      .io<{ orderId: string }, { valid: boolean }>()
      .invoke(ValidatePort, ctx => ctx.input)
      .build();

    const ReserveStep = defineStep("Reserve")
      .io<{ orderId: string }, { reservationId: string }>()
      .invoke(InventoryPort, ctx => ctx.input)
      .compensate(ctx => ({ release: ctx.stepResult.reservationId }))
      .build();

    const ChargeStep = defineStep("Charge")
      .io<{ orderId: string }, { transactionId: string }>()
      .invoke(PaymentPort, ctx => ctx.input)
      .compensate(ctx => ({ refund: ctx.stepResult.transactionId }))
      .build();

    const ShipStep = defineStep("Ship")
      .io<{ orderId: string }, { trackingId: string }>()
      .invoke(ShippingPort, ctx => ctx.input)
      .build();

    const OrderSaga = defineSaga("OrderSaga")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .step(ReserveStep)
      .step(ChargeStep)
      .step(ShipStep)
      .output(results => ({
        reservationId: results.Reserve.reservationId,
        transactionId: results.Charge.transactionId,
        trackingId: results.Ship.trackingId,
      }))
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        const adapters: Record<string, (p: unknown) => Promise<unknown>> = {
          Validate: () => Promise.resolve({ valid: true }),
          Inventory: () => Promise.resolve({ reservationId: "r-100" }),
          Payment: () => Promise.resolve({ transactionId: "t-200" }),
          Shipping: () => Promise.resolve({ trackingId: "track-300" }),
        };
        if (portName in adapters) return adapters[portName];
        throw new Error(`Port not found: ${portName}`);
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, OrderSaga, { orderId: "order-42" });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output.reservationId).toBe("r-100");
      expect(result.value.output.transactionId).toBe("t-200");
      expect(result.value.output.trackingId).toBe("track-300");
      expect(result.value.executionId).toBeTruthy();
    }
  });

  it("order saga: charge fails -> reserve compensated -> StepFailed returned", async () => {
    const compensated: string[] = [];

    const ReserveStep = defineStep("Reserve")
      .io<{ orderId: string }, { reservationId: string }>()
      .invoke(InventoryPort, ctx => ctx.input)
      .compensate(() => {
        compensated.push("Reserve");
        return { release: true };
      })
      .build();

    const ChargeStep = defineStep("Charge")
      .io<{ orderId: string }, { transactionId: string }>()
      .invoke(PaymentPort, ctx => ctx.input)
      .compensate(() => {
        compensated.push("Charge");
        return { refund: true };
      })
      .build();

    const saga = defineSaga("FailSaga")
      .input<{ orderId: string }>()
      .step(ReserveStep)
      .step(ChargeStep)
      .output(results => ({
        reservationId: results.Reserve.reservationId,
        transactionId: results.Charge.transactionId,
      }))
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        return (params: unknown) => {
          if (
            typeof params === "object" &&
            params !== null &&
            ("release" in params || "refund" in params)
          ) {
            return Promise.resolve();
          }
          if (portName === "Inventory") return Promise.resolve({ reservationId: "r-1" });
          if (portName === "Payment") return Promise.reject(new Error("Insufficient funds"));
          throw new Error(`Port not found: ${portName}`);
        };
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, { orderId: "order-1" });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.stepName).toBe("Charge");
    }
    expect(compensated).toEqual(["Reserve"]);
  });

  it("saga with conditional step: condition false -> step skipped, rest continues", async () => {
    const executed: string[] = [];

    const Step1 = defineStep("Step1")
      .io<{ skipNotify: boolean }, string>()
      .invoke(ValidatePort, ctx => ctx.input)
      .build();

    const SkippableStep = defineStep("Notify")
      .io<{ skipNotify: boolean }, void>()
      .invoke(NotifyPort, ctx => ctx.input)
      .when(ctx => !(ctx.input as { skipNotify: boolean }).skipNotify)
      .build();

    const Step3 = defineStep("Ship")
      .io<{ skipNotify: boolean }, string>()
      .invoke(ShippingPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("ConditionalSaga")
      .input<{ skipNotify: boolean }>()
      .step(Step1)
      .step(SkippableStep)
      .step(Step3)
      .output(() => ({ done: true }))
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        return () => {
          executed.push(portName);
          return Promise.resolve("ok");
        };
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, { skipNotify: true });

    expect(result.isOk()).toBe(true);
    expect(executed).toEqual(["Validate", "Shipping"]);
    expect(executed).not.toContain("Notify");
  });

  it("saga with retry: step fails twice, succeeds third -> saga completes", async () => {
    let attempts = 0;

    const RetryStep = defineStep("RetryStep")
      .io<string, string>()
      .invoke(ValidatePort, ctx => ctx.input)
      .retry({ maxAttempts: 3, delay: 10 })
      .build();

    const saga = defineSaga("RetrySaga")
      .input<string>()
      .step(RetryStep)
      .output(() => ({ success: true }))
      .build();

    const resolver: PortResolver = {
      resolve() {
        return () => {
          attempts++;
          if (attempts <= 2) {
            return Promise.reject(new Error("transient"));
          }
          return Promise.resolve("ok");
        };
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isOk()).toBe(true);
    expect(attempts).toBe(3);
  });

  it("saga with timeout: step exceeds timeout -> cancellation + compensation", async () => {
    const compensated: string[] = [];

    const FastStep = defineStep("Fast")
      .io<string, string>()
      .invoke(ValidatePort, ctx => ctx.input)
      .compensate(() => {
        compensated.push("Fast");
        return {};
      })
      .build();

    const SlowStep = defineStep("Slow")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .timeout(50)
      .build();

    const saga = defineSaga("TimeoutSaga")
      .input<string>()
      .step(FastStep)
      .step(SlowStep)
      .output(() => ({}))
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        return (params: unknown) => {
          if (typeof params === "object" && params !== null) {
            return Promise.resolve();
          }
          if (portName === "Validate") return Promise.resolve("fast");
          if (portName === "Inventory") {
            return new Promise(resolve => setTimeout(() => resolve("slow"), 500));
          }
          throw new Error(`Port not found: ${portName}`);
        };
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Timeout");
    }
  });

  it("saga with AbortSignal: external abort -> cancellation", async () => {
    const abortController = new AbortController();

    const SlowStep = defineStep("SlowStep")
      .io<string, string>()
      .invoke(ValidatePort, ctx => ctx.input)
      .timeout(5000) // Long timeout so the abort kicks in first
      .build();

    const saga = defineSaga("AbortSaga")
      .input<string>()
      .step(SlowStep)
      .output(() => ({}))
      .build();

    const resolver: PortResolver = {
      resolve() {
        return () => new Promise(resolve => setTimeout(() => resolve("done"), 5000));
      },
    };

    const runner = createSagaRunner(resolver);
    const resultAsync = executeSaga(runner, saga, "input", {
      signal: abortController.signal,
    });

    // Small delay then abort
    await new Promise(resolve => setTimeout(resolve, 20));
    abortController.abort();

    const result = await resultAsync;
    expect(result.isErr()).toBe(true);
  });

  it("order saga: compensation fails -> CompensationFailed with details", async () => {
    const ReserveStep = defineStep("Reserve")
      .io<string, { rid: string }>()
      .invoke(InventoryPort, ctx => ctx.input)
      .compensate(() => ({ release: true }))
      .build();

    const ChargeStep = defineStep("Charge")
      .io<string, string>()
      .invoke(PaymentPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("CompFailSaga")
      .input<string>()
      .step(ReserveStep)
      .step(ChargeStep)
      .output(() => ({}))
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        return (params: unknown) => {
          // Compensation call for Reserve
          if (typeof params === "object" && params !== null && "release" in params) {
            return Promise.reject(new Error("DB connection lost"));
          }
          if (portName === "Inventory") return Promise.resolve({ rid: "r-1" });
          if (portName === "Payment") return Promise.reject(new Error("declined"));
          throw new Error(`Port not found: ${portName}`);
        };
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("CompensationFailed");
    }
  });
});
