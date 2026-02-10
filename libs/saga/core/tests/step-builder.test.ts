import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";

// =============================================================================
// Test Ports
// =============================================================================

const InventoryPort = createPort<"Inventory", { execute: (p: any) => any }>({
  name: "Inventory",
});

// =============================================================================
// Tests
// =============================================================================

describe("defineStep", () => {
  it("creates a basic step definition with name and port", () => {
    const step = defineStep("ReserveStock")
      .io<{ productId: string }, { reservationId: string }>()
      .invoke(InventoryPort, ctx => ({
        action: "reserve",
        productId: ctx.input.productId,
      }))
      .build();

    expect(step.name).toBe("ReserveStock");
    expect(step.port).toBe(InventoryPort);
    expect(step.compensate).toBeNull();
    expect(step.condition).toBeNull();
    expect(step.invoke).toBeTypeOf("function");
  });

  it("creates a step with compensation", () => {
    const step = defineStep("ReserveStock")
      .io<{ productId: string }, { reservationId: string }>()
      .invoke(InventoryPort, ctx => ({
        action: "reserve",
        productId: ctx.input.productId,
      }))
      .compensate(ctx => ({
        action: "release",
        reservationId: ctx.stepResult.reservationId,
      }))
      .build();

    expect(step.compensate).toBeTypeOf("function");
  });

  it("creates a step with skipCompensation", () => {
    const step = defineStep("LogEvent")
      .io<{ message: string }, void>()
      .invoke(InventoryPort, ctx => ctx.input)
      .skipCompensation()
      .build();

    expect(step.compensate).toBeNull();
    expect(step.options.skipCompensation).toBe(true);
  });

  it("creates a step with a condition", () => {
    const step = defineStep("ConditionalStep")
      .io<{ shouldRun: boolean }, void>()
      .invoke(InventoryPort, ctx => ctx.input)
      .when(ctx => ctx.input.shouldRun)
      .build();

    expect(step.condition).toBeTypeOf("function");
  });

  it("creates a step with timeout", () => {
    const step = defineStep("TimedStep")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .timeout(5000)
      .build();

    expect(step.options.timeout).toBe(5000);
  });

  it("creates a step with retry config", () => {
    const step = defineStep("RetryableStep")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .retry({
        maxAttempts: 3,
        delay: 100,
      })
      .build();

    expect(step.options.retry?.maxAttempts).toBe(3);
    expect(step.options.retry?.delay).toBe(100);
  });

  it("creates a step with retry config using function delay", () => {
    const step = defineStep("RetryableStep")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .retry({
        maxAttempts: 3,
        delay: attempt => attempt * 100,
      })
      .build();

    expect(step.options.retry?.maxAttempts).toBe(3);
    expect(typeof step.options.retry?.delay).toBe("function");
  });

  it("creates a step with options method", () => {
    const step = defineStep("OptionsStep")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .options({
        timeout: 3000,
        metadata: { priority: "high" },
      })
      .build();

    expect(step.options.timeout).toBe(3000);
    expect(step.options.metadata).toEqual({ priority: "high" });
  });

  it("invoke mapper receives correct context shape", () => {
    let capturedCtx: any;
    const step = defineStep("ContextStep")
      .io<{ id: string }, string>()
      .invoke(InventoryPort, ctx => {
        capturedCtx = ctx;
        return { id: ctx.input.id };
      })
      .build();

    step.invoke({
      input: { id: "123" },
      results: { prev: "value" },
      stepIndex: 2,
      executionId: "exec-1",
    });

    expect(capturedCtx.input).toEqual({ id: "123" });
    expect(capturedCtx.results).toEqual({ prev: "value" });
    expect(capturedCtx.stepIndex).toBe(2);
    expect(capturedCtx.executionId).toBe("exec-1");
  });

  it("compensate mapper receives correct context shape", () => {
    let capturedCtx: any;
    const step = defineStep("CompensateCtxStep")
      .io<{ id: string }, { rid: string }>()
      .invoke(InventoryPort, ctx => ctx.input)
      .compensate(ctx => {
        capturedCtx = ctx;
        return { undo: ctx.stepResult.rid };
      })
      .build();

    step.compensate?.({
      input: { id: "123" },
      results: {},
      stepIndex: 1,
      executionId: "exec-1",
      stepResult: { rid: "r-1" },
      error: new Error("test"),
      failedStepIndex: 2,
      failedStepName: "FailedStep",
    });

    expect(capturedCtx.stepResult).toEqual({ rid: "r-1" });
    expect(capturedCtx.failedStepName).toBe("FailedStep");
    expect(capturedCtx.failedStepIndex).toBe(2);
  });

  it("step definition is frozen (immutable)", () => {
    const step = defineStep("FrozenStep")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .build();

    expect(Object.isFrozen(step)).toBe(true);
  });
});
