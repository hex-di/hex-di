import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { sagaPort } from "../src/ports/factory.js";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaAdapter } from "../src/adapters/factory.js";

// =============================================================================
// Test Setup
// =============================================================================

const InventoryPort = createPort<"Inventory", any>({ name: "Inventory" });
const PaymentPort = createPort<"Payment", any>({ name: "Payment" });

const ReserveStep = defineStep("Reserve")
  .io<{ orderId: string }, { reservationId: string }>()
  .invoke(InventoryPort, ctx => ctx.input)
  .build();

const ChargeStep = defineStep("Charge")
  .io<{ orderId: string }, { transactionId: string }>()
  .invoke(PaymentPort, ctx => ctx.input)
  .build();

const OrderSaga = defineSaga("OrderSaga")
  .input<{ orderId: string }>()
  .step(ReserveStep)
  .step(ChargeStep)
  .output(results => ({
    reservationId: results.Reserve.reservationId,
    transactionId: results.Charge.transactionId,
  }))
  .build();

type OrderOutput = { reservationId: string; transactionId: string };

const OrderSagaPort = sagaPort<{ orderId: string }, OrderOutput>()({
  name: "OrderSaga",
});

// =============================================================================
// Tests (DOD 4: Saga Adapters)
// =============================================================================

describe("createSagaAdapter (DOD 4)", () => {
  it("returns a SagaAdapter", () => {
    const adapter = createSagaAdapter(OrderSagaPort, { saga: OrderSaga });
    expect(adapter).toBeDefined();
    expect(adapter.port).toBe(OrderSagaPort);
  });

  it("adapter config includes saga definition reference", () => {
    const adapter = createSagaAdapter(OrderSagaPort, { saga: OrderSaga });
    expect(adapter.saga).toBe(OrderSaga);
  });

  it("adapter config includes requires field listing additional port dependencies", () => {
    const adapter = createSagaAdapter(OrderSagaPort, {
      saga: OrderSaga,
      requires: [InventoryPort, PaymentPort],
    });
    expect(adapter.requires).toHaveLength(2);
  });

  it('adapter lifetime defaults to "scoped"', () => {
    const adapter = createSagaAdapter(OrderSagaPort, { saga: OrderSaga });
    expect(adapter.lifetime).toBe("scoped");
  });

  it('adapter lifetime can be overridden to "singleton"', () => {
    const adapter = createSagaAdapter(OrderSagaPort, {
      saga: OrderSaga,
      lifetime: "singleton",
    });
    expect(adapter.lifetime).toBe("singleton");
  });

  it('adapter lifetime can be overridden to "transient"', () => {
    const adapter = createSagaAdapter(OrderSagaPort, {
      saga: OrderSaga,
      lifetime: "transient",
    });
    expect(adapter.lifetime).toBe("transient");
  });

  it("adapter is frozen", () => {
    const adapter = createSagaAdapter(OrderSagaPort, { saga: OrderSaga });
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("adapter requires merges step ports with explicit additional requires", () => {
    const ExtraPort = createPort<"Extra", any>({ name: "Extra" });
    const adapter = createSagaAdapter(OrderSagaPort, {
      saga: OrderSaga,
      requires: [InventoryPort, PaymentPort, ExtraPort],
    });
    expect(adapter.requires).toHaveLength(3);
  });

  it("adapter with empty requires has empty array", () => {
    const adapter = createSagaAdapter(OrderSagaPort, { saga: OrderSaga });
    expect(adapter.requires).toEqual([]);
  });

  it("adapter port reference is the exact same port object", () => {
    const adapter = createSagaAdapter(OrderSagaPort, { saga: OrderSaga });
    expect(adapter.port === OrderSagaPort).toBe(true);
  });

  it("multiple adapters for different ports can coexist", () => {
    const OtherPort = sagaPort<string, number>()({ name: "OtherSaga" });
    const adapter1 = createSagaAdapter(OrderSagaPort, { saga: OrderSaga });
    const adapter2 = createSagaAdapter(OtherPort, { saga: OrderSaga });
    expect(adapter1.port.__portName).toBe("OrderSaga");
    expect(adapter2.port.__portName).toBe("OtherSaga");
  });
});
