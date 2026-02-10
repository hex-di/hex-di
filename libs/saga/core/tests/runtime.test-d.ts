import { describe, it, expectTypeOf } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { executeSaga, createSagaRunner } from "../src/runtime/runner.js";
import type {
  SagaRunner,
  PortResolver,
  SagaEvent,
  SagaEventListener,
  ExecuteOptions,
} from "../src/runtime/types.js";
import type { SagaSuccess, SagaError } from "../src/errors/types.js";
import type { ResultAsync } from "@hex-di/result";

// =============================================================================
// Test Setup
// =============================================================================

const TestPort = createPort<"Test", unknown>({ name: "Test" });

const Step1 = defineStep("Step1")
  .io<{ orderId: string }, { result: string }, { kind: "err" }>()
  .invoke(TestPort, ctx => ctx.input)
  .build();

const _TestSaga = defineSaga("TestSaga")
  .input<{ orderId: string }>()
  .step(Step1)
  .output(r => r.Step1)
  .build();
type TestSaga = typeof _TestSaga;

// =============================================================================
// Type-Level Tests (DOD 6: Runtime)
// =============================================================================

describe("Runtime - Type Level", () => {
  // DOD 6 type #1
  it("executeSaga infers input type from saga definition", () => {
    const _resolver: PortResolver = { resolve: () => () => {} };
    const _runner: SagaRunner = createSagaRunner(_resolver);
    // executeSaga(runner, saga, input) - input must match saga TInput
    type InputParam = Parameters<typeof executeSaga<TestSaga>>[2];
    expectTypeOf<InputParam>().toEqualTypeOf<{ orderId: string }>();
  });

  // DOD 6 type #2
  it("executeSaga return type is ResultAsync<SagaSuccess<TOutput>, SagaError<TErrors>>", () => {
    type Return = globalThis.ReturnType<typeof executeSaga<TestSaga>>;
    expectTypeOf<Return>().toMatchTypeOf<
      ResultAsync<SagaSuccess<{ result: string }>, SagaError<{ kind: "err" }>>
    >();
  });

  // DOD 6 type #3
  it("SagaRunner.execute returns ResultAsync with SagaSuccess and SagaError", () => {
    type ExecReturn = globalThis.ReturnType<SagaRunner["execute"]>;
    expectTypeOf<ExecReturn>().toMatchTypeOf<
      ResultAsync<SagaSuccess<unknown>, SagaError<unknown>>
    >();
  });

  // DOD 6 type #4
  it("SagaEvent discriminated union has correct event types", () => {
    type EventTypes = SagaEvent["type"];
    expectTypeOf<EventTypes>().toEqualTypeOf<
      | "saga:started"
      | "saga:completed"
      | "saga:failed"
      | "saga:cancelled"
      | "step:started"
      | "step:completed"
      | "step:failed"
      | "step:skipped"
      | "compensation:started"
      | "compensation:step"
      | "compensation:completed"
      | "compensation:failed"
    >();
  });

  // DOD 6 type #5
  it("SagaEventListener accepts SagaEvent parameter", () => {
    expectTypeOf<SagaEventListener>().toMatchTypeOf<(event: SagaEvent) => void>();
  });

  // DOD 6 type #7
  it("PortResolver.resolve returns unknown", () => {
    type ResolveReturn = globalThis.ReturnType<PortResolver["resolve"]>;
    expectTypeOf<ResolveReturn>().toEqualTypeOf<unknown>();
  });

  // DOD 6 type #8
  it("ExecuteOptions has optional signal, timeout, and executionId fields", () => {
    expectTypeOf<ExecuteOptions>().toHaveProperty("signal");
    expectTypeOf<ExecuteOptions>().toHaveProperty("timeout");
    expectTypeOf<ExecuteOptions>().toHaveProperty("executionId");
  });

  // DOD 6 type #9
  it("SagaRunner has execute, resume, cancel, getStatus, subscribe methods", () => {
    expectTypeOf<SagaRunner>().toHaveProperty("execute");
    expectTypeOf<SagaRunner>().toHaveProperty("resume");
    expectTypeOf<SagaRunner>().toHaveProperty("cancel");
    expectTypeOf<SagaRunner>().toHaveProperty("getStatus");
    expectTypeOf<SagaRunner>().toHaveProperty("subscribe");
  });

  // DOD 6 type #10
  it("subscribe returns unsubscribe function", () => {
    type SubReturn = globalThis.ReturnType<SagaRunner["subscribe"]>;
    expectTypeOf<SubReturn>().toMatchTypeOf<() => void>();
  });
});
