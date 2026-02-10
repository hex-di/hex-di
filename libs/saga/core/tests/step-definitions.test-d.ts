import { describe, it, expectTypeOf } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import type {
  StepContext,
  RetryConfig,
  InferStepName,
  InferStepOutput,
  InferStepInput,
  InferStepError,
  InferStepPort,
  NotAStepDefinitionError,
  CollectStepPorts,
} from "../src/step/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const InventoryPort = createPort<"Inventory", { check: (id: string) => boolean }>({
  name: "Inventory",
});
const PaymentPort = createPort<"Payment", { charge: (amount: number) => string }>({
  name: "Payment",
});

// =============================================================================
// Test Steps (prefix with _ to avoid unused var lint, use via typeof)
// =============================================================================

const _ReserveStep = defineStep("reserve")
  .io<string, number>()
  .invoke(InventoryPort, ctx => ctx.input)
  .build();

type ValidationError = { readonly kind: "validation"; readonly field: string };

const _ValidateStep = defineStep("validate")
  .io<string, number, ValidationError>()
  .invoke(PaymentPort, ctx => ctx.input)
  .build();

const _NoErrorStep = defineStep("noError")
  .io<string, boolean>()
  .invoke(InventoryPort, ctx => ctx.input)
  .build();

// Type aliases to reference in tests without triggering unused-var
type ReserveStep = typeof _ReserveStep;
type ValidateStep = typeof _ValidateStep;
type NoErrorStep = typeof _NoErrorStep;

// =============================================================================
// Type-Level Tests (DOD 1)
// =============================================================================

describe("Step Definitions - Type Level", () => {
  // DOD 1 type #1
  it("defineStep('reserve') infers name as literal 'reserve'", () => {
    expectTypeOf<InferStepName<ReserveStep>>().toEqualTypeOf<"reserve">();
  });

  // DOD 1 type #2
  it(".io<string, number>() sets TInput to string and TOutput to number", () => {
    expectTypeOf<InferStepInput<ReserveStep>>().toEqualTypeOf<string>();
    expectTypeOf<InferStepOutput<ReserveStep>>().toEqualTypeOf<number>();
  });

  // DOD 1 type #3
  it(".io<string, number>() defaults TError to never", () => {
    expectTypeOf<InferStepError<ReserveStep>>().toEqualTypeOf<never>();
  });

  // DOD 1 type #4
  it(".io<string, number, ValidationError>() sets TError to ValidationError", () => {
    expectTypeOf<InferStepError<ValidateStep>>().toEqualTypeOf<ValidationError>();
  });

  // DOD 1 type #5
  it(".invoke(port, mapper) infers TPort from port argument", () => {
    expectTypeOf<InferStepPort<ReserveStep>>().toEqualTypeOf<typeof InventoryPort>();
  });

  // DOD 1 type #6
  it("Builder enforces stage progression: .io() required before .invoke()", () => {
    const builder = defineStep("test");
    // builder has .io() but not .invoke()
    expectTypeOf(builder).toHaveProperty("io");
    expectTypeOf(builder).not.toHaveProperty("invoke");
    expectTypeOf(builder).not.toHaveProperty("build");
  });

  // DOD 1 type #7
  it("Builder enforces stage progression: .invoke() required before .build()", () => {
    const withIO = defineStep("test").io<string, number>();
    // withIO has .invoke() but not .build()
    expectTypeOf(withIO).toHaveProperty("invoke");
    expectTypeOf(withIO).not.toHaveProperty("build");
  });

  // DOD 1 type #8
  it("InferStepName<S> resolves to step name literal", () => {
    type Name = InferStepName<ReserveStep>;
    expectTypeOf<Name>().toEqualTypeOf<"reserve">();
  });

  // DOD 1 type #9
  it("InferStepOutput<S> resolves to step output type", () => {
    type Output = InferStepOutput<ReserveStep>;
    expectTypeOf<Output>().toEqualTypeOf<number>();
  });

  // DOD 1 type #10
  it("InferStepInput<S> resolves to step input type", () => {
    type Input = InferStepInput<ReserveStep>;
    expectTypeOf<Input>().toEqualTypeOf<string>();
  });

  // DOD 1 type #11
  it("InferStepError<S> resolves to step error type", () => {
    type Error = InferStepError<ValidateStep>;
    expectTypeOf<Error>().toEqualTypeOf<ValidationError>();
  });

  // DOD 1 type #12
  it("InferStepPort<S> resolves to step port type", () => {
    type PortType = InferStepPort<ReserveStep>;
    expectTypeOf<PortType>().toEqualTypeOf<typeof InventoryPort>();
  });

  // DOD 1 type #13
  it("InferStepName on non-step produces NotAStepDefinitionError", () => {
    type Result = InferStepName<{ foo: string }>;
    expectTypeOf<Result>().toMatchTypeOf<NotAStepDefinitionError<{ foo: string }>>();
  });

  // DOD 1 type #14
  it("CollectStepPorts<[S1, S2]> produces union of all step port types", () => {
    type Ports = CollectStepPorts<[ReserveStep, ValidateStep]>;
    expectTypeOf<Ports>().toMatchTypeOf<typeof InventoryPort | typeof PaymentPort>();
  });

  // DOD 1 type #16
  it("Compensation mapper type includes stepResult of correct TOutput type", () => {
    const step = defineStep("comp")
      .io<string, { reservationId: string }>()
      .invoke(InventoryPort, ctx => ctx.input)
      .compensate(ctx => {
        expectTypeOf(ctx.stepResult).toEqualTypeOf<{ reservationId: string }>();
        return {};
      })
      .build();

    // Ensure step compiles
    expectTypeOf(step.name).toEqualTypeOf<"comp">();
  });

  // DOD 1 type #17
  it("Condition predicate type receives StepContext<TInput, unknown>", () => {
    const step = defineStep("cond")
      .io<{ orderId: string }, boolean>()
      .invoke(InventoryPort, ctx => ctx.input)
      .when(ctx => {
        expectTypeOf(ctx).toMatchTypeOf<StepContext<{ orderId: string }, unknown>>();
        return true;
      })
      .build();

    expectTypeOf(step.name).toEqualTypeOf<"cond">();
  });

  // DOD 1 type #18
  it("RetryConfig delay accepts both number and (attempt: number) => number", () => {
    type DelayType = RetryConfig["delay"];
    expectTypeOf<number>().toMatchTypeOf<DelayType>();
    expectTypeOf<(attempt: number, error: unknown) => number>().toMatchTypeOf<DelayType>();
  });

  // DOD 1 type #19
  it("Step with TError never contributes nothing to error union", () => {
    type Err = InferStepError<NoErrorStep>;
    expectTypeOf<Err>().toEqualTypeOf<never>();
  });
});
