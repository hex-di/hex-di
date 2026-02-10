import { describe, it, expectTypeOf } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import type {
  SagaOptions,
  AccumulatedResults,
  AccumulatedErrors,
  BranchAccumulatedResults,
  BranchAccumulatedErrors,
  InferSagaName,
  InferSagaInput,
  InferSagaOutput,
  InferSagaSteps,
  InferSagaErrors,
  NotASagaDefinitionError,
} from "../src/saga/types.js";
import type { AnyStepDefinition, StepContext } from "../src/step/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const ValidatePort = createPort<"Validate", unknown>({ name: "Validate" });
const ReservePort = createPort<"Reserve", unknown>({ name: "Reserve" });
const ChargePort = createPort<"Charge", unknown>({ name: "Charge" });

// =============================================================================
// Test Steps
// =============================================================================

type ValidationError = { readonly kind: "validation" };
type PaymentError = { readonly kind: "payment" };

const ValidateStep = defineStep("Validate")
  .io<{ orderId: string }, { valid: boolean }, ValidationError>()
  .invoke(ValidatePort, ctx => ctx.input)
  .build();

const ReserveStep = defineStep("Reserve")
  .io<{ orderId: string }, { reservationId: string }>()
  .invoke(ReservePort, ctx => ctx.input)
  .compensate(ctx => ({ undo: ctx.stepResult.reservationId }))
  .build();

const ChargeStep = defineStep("Charge")
  .io<{ orderId: string }, { transactionId: string }, PaymentError>()
  .invoke(ChargePort, ctx => ctx.input)
  .compensate(ctx => ({ refund: ctx.stepResult.transactionId }))
  .build();

// =============================================================================
// Test Saga
// =============================================================================

const _OrderSaga = defineSaga("OrderSaga")
  .input<{ orderId: string }>()
  .step(ValidateStep)
  .step(ReserveStep)
  .step(ChargeStep)
  .output(results => ({
    orderId: "test",
    reservationId: results.Reserve.reservationId,
    transactionId: results.Charge.transactionId,
  }))
  .build();
type OrderSaga = typeof _OrderSaga;

// =============================================================================
// Type-Level Tests (DOD 2)
// =============================================================================

describe("Saga Definitions - Type Level", () => {
  // DOD 2 type #1
  it("defineSaga('OrderSaga') infers name as literal 'OrderSaga'", () => {
    expectTypeOf<InferSagaName<OrderSaga>>().toEqualTypeOf<"OrderSaga">();
  });

  // DOD 2 type #2
  it(".input<OrderInput>() sets TInput to OrderInput", () => {
    expectTypeOf<InferSagaInput<OrderSaga>>().toEqualTypeOf<{ orderId: string }>();
  });

  // DOD 2 type #3
  it("Each .step() appends to TSteps tuple via variadic spread", () => {
    type Steps = InferSagaSteps<OrderSaga>;
    // Should be a tuple with 3 elements
    expectTypeOf<Steps>().toMatchTypeOf<readonly [unknown, unknown, unknown]>();
  });

  // DOD 2 type #4
  it("AccumulatedResults<TSteps> maps step names to step outputs", () => {
    type Steps = InferSagaSteps<OrderSaga>;
    type Results = AccumulatedResults<Steps>;
    expectTypeOf<Results>().toHaveProperty("Validate");
    expectTypeOf<Results>().toHaveProperty("Reserve");
    expectTypeOf<Results>().toHaveProperty("Charge");
  });

  // DOD 2 type #5
  it("AccumulatedErrors<TSteps> is union of all step TError types", () => {
    type Steps = InferSagaSteps<OrderSaga>;
    type Errors = AccumulatedErrors<Steps>;
    expectTypeOf<ValidationError>().toMatchTypeOf<Errors>();
    expectTypeOf<PaymentError>().toMatchTypeOf<Errors>();
  });

  // DOD 2 type #6
  it("Steps with TError: never do not contribute to AccumulatedErrors", () => {
    // ReserveStep has TError = never, so it should not appear in the union
    // The union should only contain ValidationError | PaymentError
    type Steps = InferSagaSteps<OrderSaga>;
    type Errors = AccumulatedErrors<Steps>;
    // never does not contribute to union
    expectTypeOf<Errors>().not.toEqualTypeOf<never>();
  });

  // DOD 2 type #15
  it("InferSagaName<S> resolves to saga name literal", () => {
    type Name = InferSagaName<OrderSaga>;
    expectTypeOf<Name>().toEqualTypeOf<"OrderSaga">();
  });

  // DOD 2 type #16
  it("InferSagaInput<S> resolves to saga input type", () => {
    type Input = InferSagaInput<OrderSaga>;
    expectTypeOf<Input>().toEqualTypeOf<{ orderId: string }>();
  });

  // DOD 2 type #17
  it("InferSagaOutput<S> resolves to saga output type", () => {
    type Output = InferSagaOutput<OrderSaga>;
    expectTypeOf<Output>().toHaveProperty("orderId");
    expectTypeOf<Output>().toHaveProperty("reservationId");
    expectTypeOf<Output>().toHaveProperty("transactionId");
  });

  // DOD 2 type #18
  it("InferSagaSteps<S> resolves to steps tuple", () => {
    type Steps = InferSagaSteps<OrderSaga>;
    expectTypeOf<Steps>().toMatchTypeOf<readonly AnyStepDefinition[]>();
  });

  // DOD 2 type #20
  it("Inference utilities produce error type on non-SagaDefinition input", () => {
    type Result = InferSagaName<{ foo: string }>;
    expectTypeOf<Result>().toMatchTypeOf<NotASagaDefinitionError<{ foo: string }>>();
  });

  // DOD 2 type #22
  it("Output mapper parameter typed as AccumulatedResults<TSteps>", () => {
    // The output mapper receives the correct shape
    defineSaga("TypeTest")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .step(ReserveStep)
      .output(results => {
        expectTypeOf(results.Validate).toEqualTypeOf<{ readonly valid: boolean }>();
        expectTypeOf(results.Reserve).toEqualTypeOf<{ readonly reservationId: string }>();
        return {};
      })
      .build();
  });

  // DOD 2 type #23
  it("SagaOptions compensationStrategy is 'sequential' | 'parallel' | 'best-effort'", () => {
    expectTypeOf<SagaOptions["compensationStrategy"]>().toEqualTypeOf<
      "sequential" | "parallel" | "best-effort"
    >();
  });

  // DOD 2 type #24
  it("Builder enforces stage progression: .input() -> .step() -> .output() -> .build()", () => {
    const stage1 = defineSaga("test");
    expectTypeOf(stage1).toHaveProperty("input");
    expectTypeOf(stage1).not.toHaveProperty("step");
    expectTypeOf(stage1).not.toHaveProperty("output");
    expectTypeOf(stage1).not.toHaveProperty("build");

    const stage2 = defineSaga("test").input<string>();
    expectTypeOf(stage2).toHaveProperty("step");
    expectTypeOf(stage2).toHaveProperty("output");
    expectTypeOf(stage2).not.toHaveProperty("build");

    const stage3 = defineSaga("test")
      .input<string>()
      .output(() => ({}));
    expectTypeOf(stage3).toHaveProperty("build");
    expectTypeOf(stage3).toHaveProperty("options");
    expectTypeOf(stage3).not.toHaveProperty("step");
  });

  // =========================================================================
  // Phase 6 Type Tests
  // =========================================================================

  // Phase 6 type #1
  it("Step mapper accesses prior results", () => {
    defineSaga("MapperAccessTest")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .step(ReserveStep)
      .output(results => {
        expectTypeOf(results.Validate).toEqualTypeOf<{ readonly valid: boolean }>();
        expectTypeOf(results.Reserve).toEqualTypeOf<{ readonly reservationId: string }>();
        return {};
      })
      .build();
  });

  // Phase 6 type #2
  it("Non-existent step produces error in AccumulatedResults", () => {
    type Results = AccumulatedResults<[typeof ValidateStep]>;
    expectTypeOf<Results>().toHaveProperty("Validate");
    // A non-existent key should not be a property
    expectTypeOf<Results>().not.toHaveProperty("NonExistent");
  });

  // Phase 6 type #3
  it("Branch results fields are optional in AccumulatedResults", () => {
    const BranchAStep = defineStep("BranchA")
      .io<{ orderId: string }, { branchAResult: string }, { kind: "branchA" }>()
      .invoke(ValidatePort, ctx => ctx.input)
      .build();
    const BranchBStep = defineStep("BranchB")
      .io<{ orderId: string }, { branchBResult: number }, { kind: "branchB" }>()
      .invoke(ReservePort, ctx => ctx.input)
      .build();

    const _BranchSaga = defineSaga("BranchSaga")
      .input<{ orderId: string }>()
      .branch(_ctx => "a" satisfies "a" | "b", { a: [BranchAStep], b: [BranchBStep] })
      .output(() => ({}))
      .build();
    type BranchSaga = typeof _BranchSaga;
    type Steps = InferSagaSteps<BranchSaga>;
    type Results = AccumulatedResults<Steps>;
    // Branch step is keyed as "__branch" with optional fields
    expectTypeOf<Results>().toHaveProperty("__branch");
  });

  // Phase 6 type #4
  it("Branch has __selectedBranch discriminant", () => {
    type TestBranches = {
      a: [typeof ValidateStep];
      b: [typeof ReserveStep];
    };
    type Result = BranchAccumulatedResults<"a" | "b", TestBranches>;
    expectTypeOf<Result>().toHaveProperty("__selectedBranch");
    expectTypeOf<Result["__selectedBranch"]>().toEqualTypeOf<"a" | "b">();
  });

  // Phase 6 type #5
  it("__selectedBranch enables narrowing", () => {
    // Per-branch results allow narrowing by instantiating with a single key
    type ResultA = BranchAccumulatedResults<"a", { a: [typeof ValidateStep] }>;
    type ResultB = BranchAccumulatedResults<"b", { b: [typeof ReserveStep] }>;
    expectTypeOf<ResultA["__selectedBranch"]>().toEqualTypeOf<"a">();
    expectTypeOf<ResultB["__selectedBranch"]>().toEqualTypeOf<"b">();
    // Narrowed types are distinct
    expectTypeOf<ResultA>().not.toEqualTypeOf<ResultB>();
  });

  // Phase 6 type #6
  it("Parallel steps spread into TSteps", () => {
    const _ParallelSaga = defineSaga("ParallelSaga")
      .input<{ orderId: string }>()
      .parallel([ValidateStep, ReserveStep])
      .output(results => {
        expectTypeOf(results.Validate).toEqualTypeOf<{ readonly valid: boolean }>();
        expectTypeOf(results.Reserve).toEqualTypeOf<{ readonly reservationId: string }>();
        return {};
      })
      .build();
    type ParallelSaga = typeof _ParallelSaga;
    type Steps = InferSagaSteps<ParallelSaga>;
    type Results = AccumulatedResults<Steps>;
    expectTypeOf<Results>().toHaveProperty("Validate");
    expectTypeOf<Results>().toHaveProperty("Reserve");
  });

  // Phase 6 type #7
  it("Sub-saga errors union into parent", () => {
    const ChildValidateStep = defineStep("ChildValidate")
      .io<{ childInput: string }, { childValid: boolean }, { kind: "childValidation" }>()
      .invoke(ValidatePort, ctx => ctx.input)
      .build();
    const _ChildSaga = defineSaga("ChildSaga")
      .input<{ childInput: string }>()
      .step(ChildValidateStep)
      .output(r => ({ childOutput: r.ChildValidate.childValid }))
      .build();
    type ChildSaga = typeof _ChildSaga;

    const _ParentSaga = defineSaga("ParentSaga")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .saga(_ChildSaga, ctx => ({ childInput: ctx.input.orderId }))
      .output(() => ({}))
      .build();
    type ParentSaga = typeof _ParentSaga;
    type Errors = InferSagaErrors<ParentSaga>;
    // Parent errors should include ValidationError from ValidateStep
    // and childValidation error from ChildSaga
    expectTypeOf<ValidationError>().toMatchTypeOf<Errors>();
    expectTypeOf<{ kind: "childValidation" }>().toMatchTypeOf<Errors>();
  });

  // Phase 6 type #8
  it("Sub-saga output via name key", () => {
    const ChildValidateStep = defineStep("ChildValidate")
      .io<{ childInput: string }, { childValid: boolean }, { kind: "childValidation" }>()
      .invoke(ValidatePort, ctx => ctx.input)
      .build();
    const _ChildSaga = defineSaga("ChildSaga")
      .input<{ childInput: string }>()
      .step(ChildValidateStep)
      .output(r => ({ childOutput: r.ChildValidate.childValid }))
      .build();

    defineSaga("ParentSaga2")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .saga(_ChildSaga, ctx => ({ childInput: ctx.input.orderId }))
      .output(results => {
        // Sub-saga output appears under its name key
        expectTypeOf(results.ChildSaga).toHaveProperty("childOutput");
        return {};
      })
      .build();
  });

  // Phase 6 type #9
  it("InferSagaErrors resolves to union of all step errors", () => {
    type Errors = InferSagaErrors<OrderSaga>;
    expectTypeOf<ValidationError>().toMatchTypeOf<Errors>();
    expectTypeOf<PaymentError>().toMatchTypeOf<Errors>();
    // never-error steps should not contribute
    expectTypeOf<Errors>().not.toEqualTypeOf<never>();
  });

  // Phase 6 type #10
  it("BranchAccumulatedResults fields are optional", () => {
    type TestBranches = {
      a: [typeof ValidateStep];
      b: [typeof ReserveStep];
    };
    type Result = BranchAccumulatedResults<"a" | "b", TestBranches>;
    // Branch step output fields are optional (T | undefined)
    type ValidateField = Result extends { Validate?: infer V } ? V : "missing";
    expectTypeOf<ValidateField>().not.toEqualTypeOf<"missing">();
  });

  // Phase 6 type #11
  it("BranchAccumulatedErrors is union of branch step errors", () => {
    const BranchAStep = defineStep("BranchA")
      .io<{ orderId: string }, { branchAResult: string }, { kind: "branchA" }>()
      .invoke(ValidatePort, ctx => ctx.input)
      .build();
    const BranchBStep = defineStep("BranchB")
      .io<{ orderId: string }, { branchBResult: number }, { kind: "branchB" }>()
      .invoke(ReservePort, ctx => ctx.input)
      .build();

    type TestBranches = {
      a: [typeof BranchAStep];
      b: [typeof BranchBStep];
    };
    type Errors = BranchAccumulatedErrors<"a" | "b", TestBranches>;
    // Should be union of branch A and B errors
    expectTypeOf<{ kind: "branchA" }>().toMatchTypeOf<Errors>();
    expectTypeOf<{ kind: "branchB" }>().toMatchTypeOf<Errors>();
  });

  // Phase 6 type #12
  it(".saga() mapper typed as StepContext", () => {
    const ChildValidateStep = defineStep("ChildValidate")
      .io<{ childInput: string }, { childValid: boolean }, { kind: "childValidation" }>()
      .invoke(ValidatePort, ctx => ctx.input)
      .build();
    const _ChildSaga = defineSaga("ChildSaga")
      .input<{ childInput: string }>()
      .step(ChildValidateStep)
      .output(r => ({ childOutput: r.ChildValidate.childValid }))
      .build();

    defineSaga("MapperTypedTest")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      .saga(_ChildSaga, ctx => {
        // ctx should be StepContext<TInput, AccumulatedResults<TSteps>>
        expectTypeOf(ctx).toMatchTypeOf<StepContext<{ orderId: string }, unknown>>();
        expectTypeOf(ctx.input).toEqualTypeOf<{ orderId: string }>();
        expectTypeOf(ctx.results).toHaveProperty("Validate");
        return { childInput: ctx.input.orderId };
      })
      .output(() => ({}))
      .build();
  });

  // Phase 6 type #13
  it(".parallel() returns builder with updated TSteps", () => {
    const builder = defineSaga("ParallelChainTest")
      .input<{ orderId: string }>()
      .parallel([ValidateStep, ReserveStep]);

    // After parallel, can chain .step() and .output() with accumulated results
    builder
      .step(ChargeStep)
      .output(results => {
        expectTypeOf(results).toHaveProperty("Validate");
        expectTypeOf(results).toHaveProperty("Reserve");
        expectTypeOf(results).toHaveProperty("Charge");
        return {};
      })
      .build();
  });

  // Duplicate step name detection
  it("rejects duplicate step names at compile time", () => {
    const DuplicateValidateStep = defineStep("Validate")
      .io<{ orderId: string }, { valid: boolean }>()
      .invoke(ValidatePort, ctx => ctx.input)
      .build();

    defineSaga("DupTest")
      .input<{ orderId: string }>()
      .step(ValidateStep)
      // @ts-expect-error duplicate step name "Validate"
      .step(DuplicateValidateStep);
  });
});
