import { describe, it, expectTypeOf } from "vitest";
import {
  sagaPort,
  sagaManagementPort,
  isSagaPort,
  isSagaManagementPort,
} from "../src/ports/factory.js";
import type {
  SagaPort,
  SagaManagementPort,
  SagaExecutor,
  InferSagaPortInput,
  InferSagaPortOutput,
  InferSagaPortError,
  InferSagaPortName,
  NotASagaPortError,
  SagaPortConfig,
  SagaManagementExecutor,
  SagaExecutionSummary,
  InferSagaManagementPortError,
} from "../src/ports/types.js";
import type { SagaSuccess, SagaError, SagaStatus, ManagementError } from "../src/errors/types.js";
import type { ResultAsync } from "@hex-di/result";

// =============================================================================
// Test Ports
// =============================================================================

type OrderInput = { orderId: string };
type OrderOutput = { transactionId: string };
type OrderErrors = { kind: "payment" } | { kind: "validation" };

const _OrderPort = sagaPort<OrderInput, OrderOutput, OrderErrors>()({
  name: "OrderSaga",
});
type OrderPort = typeof _OrderPort;

const _NoErrorPort = sagaPort<string, number>()({ name: "NoErrorSaga" });
type NoErrorPort = typeof _NoErrorPort;

// =============================================================================
// Type-Level Tests (DOD 3)
// =============================================================================

describe("Saga Ports - Type Level", () => {
  // DOD 3 type #1
  it("InferSagaPortInput<P> resolves to port input type", () => {
    expectTypeOf<InferSagaPortInput<OrderPort>>().toEqualTypeOf<OrderInput>();
  });

  // DOD 3 type #2
  it("InferSagaPortOutput<P> resolves to port output type", () => {
    expectTypeOf<InferSagaPortOutput<OrderPort>>().toEqualTypeOf<OrderOutput>();
  });

  // DOD 3 type #3
  it("InferSagaPortError<P> resolves to port error type", () => {
    expectTypeOf<InferSagaPortError<OrderPort>>().toEqualTypeOf<OrderErrors>();
  });

  // DOD 3 type #4
  it("InferSagaPortName<P> resolves to port name literal", () => {
    expectTypeOf<InferSagaPortName<OrderPort>>().toEqualTypeOf<"OrderSaga">();
  });

  // DOD 3 type #5
  it("InferSagaPortInput on non-SagaPort produces NotASagaPortError", () => {
    type Result = InferSagaPortInput<{ foo: string }>;
    expectTypeOf<Result>().toMatchTypeOf<NotASagaPortError<{ foo: string }>>();
  });

  // DOD 3 type #10
  it("SagaExecutor execute signature returns ResultAsync<SagaSuccess, SagaError>", () => {
    type Exec = SagaExecutor<OrderInput, OrderOutput, OrderErrors>;
    type ExecReturn = globalThis.ReturnType<Exec["execute"]>;
    expectTypeOf<ExecReturn>().toMatchTypeOf<
      ResultAsync<SagaSuccess<OrderOutput>, SagaError<OrderErrors>>
    >();
  });

  // DOD 3 type #15
  it("SagaStatus discriminated union has 6 variants", () => {
    type States = SagaStatus["state"];
    expectTypeOf<States>().toEqualTypeOf<
      "pending" | "running" | "compensating" | "completed" | "failed" | "cancelled"
    >();
  });

  // DOD 3 type #16
  it("ManagementError tagged union has 3 variants", () => {
    type Tags = ManagementError["_tag"];
    expectTypeOf<Tags>().toEqualTypeOf<
      "ExecutionNotFound" | "InvalidOperation" | "PersistenceFailed"
    >();
  });

  // DOD 3 type #17
  it("SagaPort TError defaults to never when omitted", () => {
    expectTypeOf<InferSagaPortError<NoErrorPort>>().toEqualTypeOf<never>();
  });

  // DOD 3 type #19
  it("SagaPortConfig requires name as string literal type", () => {
    type Config = SagaPortConfig<"MyPort">;
    expectTypeOf<Config["name"]>().toEqualTypeOf<"MyPort">();
  });

  // DOD 3 type #6
  it("Curried factory preserves TInput/TOutput/TError through phantom slots", () => {
    const _port = sagaPort<{ x: number }, boolean, { err: true }>()({ name: "TestPort" });
    type TestPort = typeof _port;
    expectTypeOf<InferSagaPortInput<TestPort>>().toEqualTypeOf<{ x: number }>();
    expectTypeOf<InferSagaPortOutput<TestPort>>().toEqualTypeOf<boolean>();
    expectTypeOf<InferSagaPortError<TestPort>>().toEqualTypeOf<{ err: true }>();
  });

  // Type guard narrowing tests
  it("isSagaPort narrows to SagaPort<string, unknown, unknown, unknown>", () => {
    const value: unknown = sagaPort<string, number>()({ name: "Test" });
    if (isSagaPort(value)) {
      expectTypeOf(value).toMatchTypeOf<SagaPort<string, unknown, unknown, unknown>>();
    }
  });

  it("isSagaManagementPort narrows to SagaManagementPort<string, unknown, unknown>", () => {
    const value: unknown = sagaManagementPort<number>()({ name: "TestMgmt" });
    if (isSagaManagementPort(value)) {
      expectTypeOf(value).toMatchTypeOf<SagaManagementPort<string, unknown, unknown>>();
    }
  });

  // DOD 3 type #14
  it("SagaPort phantom type accepts narrower input at type level", () => {
    const _NarrowPort = sagaPort<{ orderId: string; extra: boolean }, string>()({ name: "Narrow" });
    type NarrowPort = typeof _NarrowPort;
    // Narrower input preserves exact phantom slot
    expectTypeOf<InferSagaPortInput<NarrowPort>>().toEqualTypeOf<{
      orderId: string;
      extra: boolean;
    }>();
  });

  // DOD 3 type #15
  it("SagaManagementExecutor resume returns ResultAsync<SagaSuccess, SagaError>", () => {
    type Mgmt = SagaManagementExecutor<OrderOutput, OrderErrors>;
    type ResumeReturn = ReturnType<Mgmt["resume"]>;
    expectTypeOf<ResumeReturn>().toMatchTypeOf<
      ResultAsync<SagaSuccess<OrderOutput>, SagaError<OrderErrors>>
    >();
  });

  // DOD 3 type #16
  it("SagaManagementExecutor cancel returns ResultAsync<void, ManagementError>", () => {
    type Mgmt = SagaManagementExecutor<OrderOutput, OrderErrors>;
    type CancelReturn = ReturnType<Mgmt["cancel"]>;
    expectTypeOf<CancelReturn>().toMatchTypeOf<ResultAsync<void, ManagementError>>();
  });

  // DOD 3 type #17
  it("SagaManagementExecutor getStatus returns ResultAsync<SagaStatus, ManagementError>", () => {
    type Mgmt = SagaManagementExecutor<OrderOutput, OrderErrors>;
    type StatusReturn = ReturnType<Mgmt["getStatus"]>;
    expectTypeOf<StatusReturn>().toMatchTypeOf<ResultAsync<SagaStatus, ManagementError>>();
  });

  // DOD 3 type #18
  it("SagaManagementExecutor listExecutions returns ResultAsync<SagaExecutionSummary[], ManagementError>", () => {
    type Mgmt = SagaManagementExecutor<OrderOutput, OrderErrors>;
    type ListReturn = ReturnType<Mgmt["listExecutions"]>;
    expectTypeOf<ListReturn>().toMatchTypeOf<
      ResultAsync<SagaExecutionSummary[], ManagementError>
    >();
  });

  // DOD 3 type #19
  it("SagaManagementPort TError defaults to never when omitted", () => {
    const _MgmtNoErr = sagaManagementPort<number>()({ name: "MgmtNoErr" });
    type MgmtNoErr = typeof _MgmtNoErr;
    expectTypeOf<InferSagaManagementPortError<MgmtNoErr>>().toEqualTypeOf<never>();
  });
});
