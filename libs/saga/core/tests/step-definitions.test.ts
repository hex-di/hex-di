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
// Tests (DOD 1: Step Definitions)
// =============================================================================

describe("defineStep (DOD 1)", () => {
  it('defineStep("reserve") returns a StepBuilder with name "reserve"', () => {
    const step = defineStep("reserve")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .build();

    expect(step.name).toBe("reserve");
  });

  it(".io<TInput, TOutput>() transitions to StepBuilderWithIO", () => {
    const builder = defineStep("test").io<string, number>();
    expect(builder).toBeDefined();
    expect(typeof builder.invoke).toBe("function");
  });

  it(".io<TInput, TOutput, TError>() accepts explicit error type", () => {
    const builder = defineStep("test").io<string, number, Error>();
    expect(builder).toBeDefined();
  });

  it(".invoke(port, mapper) transitions to StepBuilderWithInvocation", () => {
    const builder = defineStep("test")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input);

    expect(typeof builder.build).toBe("function");
    expect(typeof builder.compensate).toBe("function");
    expect(typeof builder.when).toBe("function");
    expect(typeof builder.retry).toBe("function");
    expect(typeof builder.timeout).toBe("function");
  });

  it(".invoke(port, mapper) stores port reference and invocation mapper", () => {
    const step = defineStep("test")
      .io<{ id: string }, string>()
      .invoke(InventoryPort, ctx => ({ action: "reserve", id: ctx.input.id }))
      .build();

    expect(step.port).toBe(InventoryPort);
    expect(step.invoke).toBeTypeOf("function");
  });

  it(".compensate(mapper) stores compensation mapper", () => {
    const step = defineStep("test")
      .io<string, { rid: string }>()
      .invoke(InventoryPort, ctx => ctx.input)
      .compensate(ctx => ({ undo: ctx.stepResult.rid }))
      .build();

    expect(step.compensate).toBeTypeOf("function");
  });

  it(".skipCompensation() marks step as non-compensable", () => {
    const step = defineStep("test")
      .io<string, void>()
      .invoke(InventoryPort, ctx => ctx.input)
      .skipCompensation()
      .build();

    expect(step.compensate).toBeNull();
    expect(step.options.skipCompensation).toBe(true);
  });

  it(".when(predicate) stores condition predicate", () => {
    const step = defineStep("test")
      .io<{ shouldRun: boolean }, void>()
      .invoke(InventoryPort, ctx => ctx.input)
      .when(ctx => ctx.input.shouldRun)
      .build();

    expect(step.condition).toBeTypeOf("function");
  });

  it(".retry({ maxAttempts: 3, delay: 1000 }) stores fixed delay retry config", () => {
    const step = defineStep("test")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .retry({ maxAttempts: 3, delay: 1000 })
      .build();

    expect(step.options.retry?.maxAttempts).toBe(3);
    expect(step.options.retry?.delay).toBe(1000);
  });

  it(".retry({ maxAttempts: 3, delay: fn }) stores function delay", () => {
    const step = defineStep("test")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .retry({ maxAttempts: 3, delay: attempt => 1000 * 2 ** attempt })
      .build();

    expect(step.options.retry?.maxAttempts).toBe(3);
    expect(typeof step.options.retry?.delay).toBe("function");
  });

  it(".retry({ retryIf }) stores retryIf predicate", () => {
    const step = defineStep("test")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .retry({
        maxAttempts: 3,
        delay: 100,
        retryIf: () => true,
      })
      .build();

    expect(typeof step.options.retry?.retryIf).toBe("function");
  });

  it(".timeout(5000) stores timeout in milliseconds", () => {
    const step = defineStep("test")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .timeout(5000)
      .build();

    expect(step.options.timeout).toBe(5000);
  });

  it(".build() returns a frozen StepDefinition", () => {
    const step = defineStep("test")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .build();

    expect(Object.isFrozen(step)).toBe(true);
  });

  it("builder methods are chainable in any order after .invoke()", () => {
    const step = defineStep("chain")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .timeout(3000)
      .when(() => true)
      .retry({ maxAttempts: 2, delay: 100 })
      .compensate(() => ({ undo: true }))
      .build();

    expect(step.name).toBe("chain");
    expect(step.options.timeout).toBe(3000);
    expect(step.condition).toBeTypeOf("function");
    expect(step.options.retry?.maxAttempts).toBe(2);
    expect(step.compensate).toBeTypeOf("function");
  });

  it("condition predicate receives StepContext with input and accumulated results", () => {
    let capturedCtx: any;
    const step = defineStep("cond")
      .io<{ id: string }, void>()
      .invoke(InventoryPort, ctx => ctx.input)
      .when(ctx => {
        capturedCtx = ctx;
        return true;
      })
      .build();

    step.condition?.({
      input: { id: "123" },
      results: { PrevStep: "result" },
      stepIndex: 2,
      executionId: "exec-1",
    });

    expect(capturedCtx.input).toEqual({ id: "123" });
    expect(capturedCtx.results).toEqual({ PrevStep: "result" });
    expect(capturedCtx.stepIndex).toBe(2);
    expect(capturedCtx.executionId).toBe("exec-1");
  });

  it("compensation mapper receives CompensationContext with stepResult and error", () => {
    let capturedCtx: any;
    const step = defineStep("comp")
      .io<string, { rid: string }>()
      .invoke(InventoryPort, ctx => ctx.input)
      .compensate(ctx => {
        capturedCtx = ctx;
        return { undo: ctx.stepResult.rid };
      })
      .build();

    step.compensate?.({
      input: "test-input",
      results: {},
      stepIndex: 1,
      executionId: "exec-1",
      stepResult: { rid: "r-1" },
      error: new Error("payment failed"),
      failedStepIndex: 2,
      failedStepName: "Charge",
    });

    expect(capturedCtx.stepResult).toEqual({ rid: "r-1" });
    expect(capturedCtx.error).toBeInstanceOf(Error);
  });

  it("CompensationContext includes failedStepIndex and failedStepName", () => {
    let capturedCtx: any;
    const step = defineStep("comp2")
      .io<string, { rid: string }>()
      .invoke(InventoryPort, ctx => ctx.input)
      .compensate(ctx => {
        capturedCtx = ctx;
        return {};
      })
      .build();

    step.compensate?.({
      input: "in",
      results: {},
      stepIndex: 0,
      executionId: "e",
      stepResult: { rid: "r" },
      error: new Error("test"),
      failedStepIndex: 3,
      failedStepName: "ShipOrder",
    });

    expect(capturedCtx.failedStepIndex).toBe(3);
    expect(capturedCtx.failedStepName).toBe("ShipOrder");
  });

  it("StepDefinition includes metadata when provided via .options()", () => {
    const step = defineStep("meta")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .options({ metadata: { priority: "high" } })
      .build();

    expect(step.options.metadata).toEqual({ priority: "high" });
  });

  it("step with .skipCompensation() has compensate field set to null", () => {
    const step = defineStep("skip")
      .io<string, void>()
      .invoke(InventoryPort, ctx => ctx.input)
      .skipCompensation()
      .build();

    expect(step.compensate).toBeNull();
  });

  it("step without .compensate() or .skipCompensation() has compensate field set to null", () => {
    const step = defineStep("nocomp")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .build();

    expect(step.compensate).toBeNull();
  });

  it("invoke mapper receives StepContext with input and accumulated results", () => {
    let capturedCtx: any;
    const step = defineStep("invoke-ctx")
      .io<{ id: string }, string>()
      .invoke(InventoryPort, ctx => {
        capturedCtx = ctx;
        return ctx.input;
      })
      .build();

    step.invoke({
      input: { id: "abc" },
      results: { PrevStep: "val" },
      stepIndex: 5,
      executionId: "exec-99",
    });

    expect(capturedCtx.input).toEqual({ id: "abc" });
    expect(capturedCtx.results).toEqual({ PrevStep: "val" });
    expect(capturedCtx.stepIndex).toBe(5);
    expect(capturedCtx.executionId).toBe("exec-99");
  });

  it("step name is stored as string literal (not widened to string)", () => {
    const step = defineStep("specificName")
      .io<string, string>()
      .invoke(InventoryPort, ctx => ctx.input)
      .build();

    // At runtime, the name is just a string; the literal type is enforced at compile time
    expect(step.name).toBe("specificName");
  });
});
