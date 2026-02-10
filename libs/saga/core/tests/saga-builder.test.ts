import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";

// =============================================================================
// Test Ports
// =============================================================================

const ValidatePort = createPort<"Validate", { execute: (p: any) => any }>({
  name: "Validate",
});

const InventoryPort = createPort<"Inventory", { execute: (p: any) => any }>({
  name: "Inventory",
});

const PaymentPort = createPort<"Payment", { execute: (p: any) => any }>({
  name: "Payment",
});

const ShippingPort = createPort<"Shipping", { execute: (p: any) => any }>({
  name: "Shipping",
});

// =============================================================================
// Test Steps
// =============================================================================

const ValidateStep = defineStep("Validate")
  .io<{ orderId: string }, { valid: boolean }>()
  .invoke(ValidatePort, ctx => ctx.input)
  .build();

const ReserveStockStep = defineStep("ReserveStock")
  .io<{ orderId: string }, { reservationId: string }>()
  .invoke(InventoryPort, ctx => ({ orderId: ctx.input.orderId }))
  .compensate(ctx => ({ action: "release", reservationId: ctx.stepResult.reservationId }))
  .build();

const ChargePaymentStep = defineStep("ChargePayment")
  .io<{ orderId: string }, { transactionId: string }>()
  .invoke(PaymentPort, ctx => ({ orderId: ctx.input.orderId }))
  .compensate(ctx => ({ action: "refund", transactionId: ctx.stepResult.transactionId }))
  .build();

const ShipOrderStep = defineStep("ShipOrder")
  .io<{ orderId: string }, { trackingNumber: string }>()
  .invoke(ShippingPort, ctx => ({ orderId: ctx.input.orderId }))
  .build();

// =============================================================================
// Tests
// =============================================================================

describe("defineSaga", () => {
  it("creates a basic linear saga definition", () => {
    const saga = defineSaga("OrderSaga")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .step(ReserveStockStep)
      .step(ChargePaymentStep)
      .output(results => ({
        orderId: "test",
        transactionId: results.ChargePayment.transactionId,
      }))
      .build();

    expect(saga.name).toBe("OrderSaga");
    expect(saga.steps).toHaveLength(3);
    expect(saga.outputMapper).toBeTypeOf("function");
    expect(saga.options.compensationStrategy).toBe("sequential");
  });

  it("creates a saga with custom options", () => {
    const saga = defineSaga("CustomSaga")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(results => results.Validate)
      .options({
        compensationStrategy: "parallel",
        persistent: true,
        timeout: 30000,
      })
      .build();

    expect(saga.options.compensationStrategy).toBe("parallel");
    expect(saga.options.persistent).toBe(true);
    expect(saga.options.timeout).toBe(30000);
  });

  it("saga definition is frozen", () => {
    const saga = defineSaga("FrozenSaga")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(results => results.Validate)
      .build();

    expect(Object.isFrozen(saga)).toBe(true);
    expect(Object.isFrozen(saga.options)).toBe(true);
  });

  it("output mapper receives accumulated results from all steps", () => {
    let capturedResults: any;
    const saga = defineSaga("OutputSaga")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .step(ReserveStockStep)
      .output(results => {
        capturedResults = results;
        return { done: true };
      })
      .build();

    const mockResults = {
      Validate: { valid: true },
      ReserveStock: { reservationId: "r-1" },
    };
    saga.outputMapper(mockResults);

    expect(capturedResults).toEqual(mockResults);
  });

  it("preserves step order in the steps array", () => {
    const saga = defineSaga("OrderedSaga")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .step(ReserveStockStep)
      .step(ChargePaymentStep)
      .step(ShipOrderStep)
      .output(() => ({}))
      .build();

    expect(saga.steps[0].name).toBe("Validate");
    expect(saga.steps[1].name).toBe("ReserveStock");
    expect(saga.steps[2].name).toBe("ChargePayment");
    expect(saga.steps[3].name).toBe("ShipOrder");
  });
});
