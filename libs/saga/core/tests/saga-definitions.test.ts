import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../src/runtime/runner.js";

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
// Tests (DOD 2: Saga Definitions)
// =============================================================================

describe("defineSaga (DOD 2)", () => {
  it('defineSaga("orderSaga") returns a SagaBuilder with name "orderSaga"', () => {
    const saga = defineSaga("orderSaga")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(() => ({}))
      .build();

    expect(saga.name).toBe("orderSaga");
  });

  it(".input<TInput>() transitions to SagaBuilderWithInput", () => {
    // Chain proof: after .input(), .step() is available
    const builder = defineSaga("test").input<string>();
    expect(typeof builder.step).toBe("function");
    expect(typeof builder.output).toBe("function");
  });

  it(".step(stepDef) appends step to saga steps tuple", () => {
    const saga = defineSaga("one-step")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(() => ({}))
      .build();

    expect(saga.steps).toHaveLength(1);
    expect(saga.steps[0].name).toBe("Validate");
  });

  it("multiple .step() calls build ordered steps tuple", () => {
    const saga = defineSaga("multi")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .step(ReserveStockStep)
      .step(ChargePaymentStep)
      .output(() => ({}))
      .build();

    expect(saga.steps).toHaveLength(3);
    expect(saga.steps[0].name).toBe("Validate");
    expect(saga.steps[1].name).toBe("ReserveStock");
    expect(saga.steps[2].name).toBe("ChargePayment");
  });

  it(".output(mapper) stores output mapping function", () => {
    const saga = defineSaga("out")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(results => ({ valid: results.Validate.valid }))
      .build();

    expect(saga.outputMapper).toBeTypeOf("function");
  });

  it('.options({ compensationStrategy: "sequential" }) stores options', () => {
    const saga = defineSaga("seq")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(() => ({}))
      .options({ compensationStrategy: "sequential" })
      .build();

    expect(saga.options.compensationStrategy).toBe("sequential");
  });

  it('.options({ compensationStrategy: "parallel" }) stores parallel strategy', () => {
    const saga = defineSaga("par")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(() => ({}))
      .options({ compensationStrategy: "parallel" })
      .build();

    expect(saga.options.compensationStrategy).toBe("parallel");
  });

  it('.options({ compensationStrategy: "best-effort" }) stores best-effort strategy', () => {
    const saga = defineSaga("be")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(() => ({}))
      .options({ compensationStrategy: "best-effort" })
      .build();

    expect(saga.options.compensationStrategy).toBe("best-effort");
  });

  it(".options({ persistent: true }) enables persistence", () => {
    const saga = defineSaga("persist")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(() => ({}))
      .options({ compensationStrategy: "sequential", persistent: true })
      .build();

    expect(saga.options.persistent).toBe(true);
  });

  it(".options({ timeout: 30000 }) stores saga-level timeout", () => {
    const saga = defineSaga("timeout")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(() => ({}))
      .options({ compensationStrategy: "sequential", timeout: 30000 })
      .build();

    expect(saga.options.timeout).toBe(30000);
  });

  it(".build() returns a frozen SagaDefinition", () => {
    const saga = defineSaga("frozen")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(() => ({}))
      .build();

    expect(Object.isFrozen(saga)).toBe(true);
    expect(Object.isFrozen(saga.options)).toBe(true);
  });

  it("output mapper receives AccumulatedResults with correct step names as keys", () => {
    let capturedResults: any;
    const saga = defineSaga("out-keys")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .step(ReserveStockStep)
      .output(results => {
        capturedResults = results;
        return { done: true };
      })
      .build();

    saga.outputMapper({
      Validate: { valid: true },
      ReserveStock: { reservationId: "r-1" },
    });

    expect(capturedResults).toEqual({
      Validate: { valid: true },
      ReserveStock: { reservationId: "r-1" },
    });
  });

  it("default compensationStrategy is 'sequential'", () => {
    const saga = defineSaga("default-strategy")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(() => ({}))
      .build();

    expect(saga.options.compensationStrategy).toBe("sequential");
  });

  it(".options({ hooks: { beforeStep, afterStep } }) stores saga hooks", () => {
    const beforeStep = () => {};
    const afterStep = () => {};
    const saga = defineSaga("hooks")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(() => ({}))
      .options({
        compensationStrategy: "sequential",
        hooks: { beforeStep, afterStep },
      })
      .build();

    expect(saga.options.hooks?.beforeStep).toBe(beforeStep);
    expect(saga.options.hooks?.afterStep).toBe(afterStep);
  });

  it(".options({ maxConcurrency: 5 }) stores parallel execution limit", () => {
    const saga = defineSaga("concurrency")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(() => ({}))
      .options({ compensationStrategy: "sequential", maxConcurrency: 5 })
      .build();

    expect(saga.options.maxConcurrency).toBe(5);
  });

  it('.options({ metadata: { version: "1.0" } }) stores arbitrary metadata', () => {
    const saga = defineSaga("meta")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(() => ({}))
      .options({ compensationStrategy: "sequential", metadata: { version: "1.0" } })
      .build();

    expect(saga.options.metadata).toEqual({ version: "1.0" });
  });

  it("SagaDefinition includes all step definitions in order", () => {
    const saga = defineSaga("ordered")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .step(ReserveStockStep)
      .step(ChargePaymentStep)
      .step(ShipOrderStep)
      .output(() => ({}))
      .build();

    expect(saga.steps).toHaveLength(4);
    expect(saga.steps[0].name).toBe("Validate");
    expect(saga.steps[1].name).toBe("ReserveStock");
    expect(saga.steps[2].name).toBe("ChargePayment");
    expect(saga.steps[3].name).toBe("ShipOrder");
  });

  it(".parallel([step1, step2]) adds a parallel node to _nodes", () => {
    const saga = defineSaga("parallel-saga")
      .input<{ orderId: string }>()
      .parallel([ValidateStep, ReserveStockStep])
      .output(() => ({}))
      .build();

    const nodes = (saga as any)._nodes;
    expect(nodes).toHaveLength(1);
    expect(nodes[0]._type).toBe("parallel");
    expect(nodes[0].steps).toHaveLength(2);
    expect(nodes[0].steps[0].name).toBe("Validate");
    expect(nodes[0].steps[1].name).toBe("ReserveStock");
  });

  it(".branch(selector, branches) adds a branch node to _nodes", () => {
    const selector = (ctx: any) => (ctx.input.orderId === "rush" ? "express" : "standard");
    const saga = defineSaga("branch-saga")
      .input<{ orderId: string }>()
      .branch(selector, {
        express: [ShipOrderStep],
        standard: [ReserveStockStep],
      })
      .output(() => ({}))
      .build();

    const nodes = (saga as any)._nodes;
    expect(nodes).toHaveLength(1);
    expect(nodes[0]._type).toBe("branch");
    expect(nodes[0].selector).toBe(selector);
    expect(Object.keys(nodes[0].branches)).toEqual(["express", "standard"]);
    expect(nodes[0].branches.express).toHaveLength(1);
    expect(nodes[0].branches.standard).toHaveLength(1);
  });

  it(".saga(subSaga, mapper) adds a subSaga node to _nodes", () => {
    const childSaga = defineSaga("child")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .output(results => ({ valid: results.Validate.valid }))
      .build();

    const inputMapper = (ctx: any) => ({ orderId: ctx.input.orderId });
    const saga = defineSaga("parent-saga")
      .input<{ orderId: string }>()
      .saga(childSaga, inputMapper)
      .output(() => ({}))
      .build();

    const nodes = (saga as any)._nodes;
    expect(nodes).toHaveLength(1);
    expect(nodes[0]._type).toBe("subSaga");
    expect(nodes[0].saga).toBe(childSaga);
    expect(nodes[0].inputMapper).toBe(inputMapper);
  });

  it("branch selector receives StepContext with input, results, and stepIndex", async () => {
    const selectorSpy = vi.fn().mockReturnValue("a");

    const BranchStepPort = createPort<"BranchStep", { execute: (p: any) => any }>({
      name: "BranchStep",
    });

    const BranchStep = defineStep("BranchStep")
      .io<{ orderId: string }, { done: boolean }>()
      .invoke(BranchStepPort, ctx => ctx.input)
      .build();

    const saga = defineSaga("branch-ctx-test")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .branch(selectorSpy, {
        a: [BranchStep],
        b: [BranchStep],
      })
      .output(() => ({}))
      .build();

    const mockResolver = {
      resolve: (_portName: string) => ({
        execute: () => ({ valid: true, done: true }),
      }),
    };

    const runner = createSagaRunner(mockResolver);
    await executeSaga(runner, saga, { orderId: "order-1" });

    expect(selectorSpy).toHaveBeenCalledTimes(1);
    const ctx = selectorSpy.mock.calls[0][0];
    expect(ctx).toHaveProperty("input");
    expect(ctx).toHaveProperty("results");
    expect(ctx).toHaveProperty("stepIndex");
    expect(ctx.input).toEqual({ orderId: "order-1" });
    expect(ctx.results).toHaveProperty("Validate");
  });

  it("builder enforces stage progression", () => {
    // Stage 1: defineSaga returns builder with .input() but not .step() or .output()
    const stage1 = defineSaga("stage-test");
    expect(typeof (stage1 as any).input).toBe("function");
    expect((stage1 as any).step).toBeUndefined();
    expect((stage1 as any).output).toBeUndefined();
    expect((stage1 as any).build).toBeUndefined();

    // Stage 2: after .input(), builder has .step(), .output(), .parallel(), .branch(), .saga() but not .build()
    const stage2 = stage1.input<{ orderId: string }>();
    expect(typeof (stage2 as any).step).toBe("function");
    expect(typeof (stage2 as any).output).toBe("function");
    expect(typeof (stage2 as any).parallel).toBe("function");
    expect(typeof (stage2 as any).branch).toBe("function");
    expect(typeof (stage2 as any).saga).toBe("function");
    expect((stage2 as any).build).toBeUndefined();

    // Stage 3: after .output(), builder has .build() and .options() but not .step()
    const stage3 = stage2.step(ValidateStep).output(() => ({}));
    expect(typeof (stage3 as any).build).toBe("function");
    expect(typeof (stage3 as any).options).toBe("function");
    expect((stage3 as any).step).toBeUndefined();
    expect((stage3 as any).input).toBeUndefined();
  });
});
