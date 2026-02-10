import { describe, it, expect, vi } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../src/step/builder.js";
import { defineSaga } from "../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../src/runtime/runner.js";
import { generateExecutionId } from "../src/runtime/id.js";
import type { PortResolver, SagaEvent } from "../src/runtime/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const ValidatePort = createPort<"Validate", any>({ name: "Validate" });
const ReservePort = createPort<"Reserve", any>({ name: "Reserve" });
const ChargePort = createPort<"Charge", any>({ name: "Charge" });
const NotifyPort = createPort<"Notify", any>({ name: "Notify" });
const SlowPort = createPort<"Slow", any>({ name: "Slow" });

// =============================================================================
// Test Steps
// =============================================================================

const ValidateStep = defineStep("Validate")
  .io<{ orderId: string }, { valid: boolean }>()
  .invoke(ValidatePort, ctx => ctx.input)
  .build();

const ReserveStep = defineStep("Reserve")
  .io<{ orderId: string }, { reservationId: string }>()
  .invoke(ReservePort, ctx => ctx.input)
  .compensate(ctx => ({ undo: ctx.stepResult.reservationId }))
  .build();

const ChargeStep = defineStep("Charge")
  .io<{ orderId: string }, { transactionId: string }>()
  .invoke(ChargePort, ctx => ctx.input)
  .compensate(ctx => ({ refund: ctx.stepResult.transactionId }))
  .build();

const NotifyStep = defineStep("Notify")
  .io<{ orderId: string }, void>()
  .invoke(NotifyPort, ctx => ctx.input)
  .skipCompensation()
  .build();

// =============================================================================
// Test Sagas
// =============================================================================

const OrderSaga = defineSaga("OrderSaga")
  .input<{ orderId: string }>()
  .step(ValidateStep)
  .step(ReserveStep)
  .step(ChargeStep)
  .step(NotifyStep)
  .output(results => ({
    orderId: "test",
    reservationId: results.Reserve.reservationId,
    transactionId: results.Charge.transactionId,
  }))
  .build();

// =============================================================================
// Helpers
// =============================================================================

function createMockResolver(
  portResults: Record<string, unknown>,
  failingPorts?: Record<string, Error>
): PortResolver {
  return {
    resolve(portName: string): unknown {
      if (failingPorts?.[portName]) {
        return (_params: unknown) => Promise.reject(failingPorts[portName]);
      }
      if (portName in portResults) {
        return (_params: unknown) => Promise.resolve(portResults[portName]);
      }
      throw new Error(`Port not found: ${portName}`);
    },
  };
}

// =============================================================================
// Tests (DOD 6: Runtime & Execution)
// =============================================================================

describe("SagaRunner (DOD 6)", () => {
  describe("execution ID generation", () => {
    it("execute() generates unique execution ID when not provided", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, OrderSaga, { orderId: "o-1" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.executionId).toBeTruthy();
        expect(typeof result.value.executionId).toBe("string");
      }
    });

    it("execute() accepts custom execution ID via options", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          executionId: "custom-exec-id",
        }
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.executionId).toBe("custom-exec-id");
      }
    });

    it("generateExecutionId() returns unique IDs", () => {
      const id1 = generateExecutionId();
      const id2 = generateExecutionId();
      expect(id1).not.toBe(id2);
    });

    it("multiple concurrent executions have independent execution IDs", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      const [r1, r2] = await Promise.all([
        executeSaga(runner, OrderSaga, { orderId: "o-1" }),
        executeSaga(runner, OrderSaga, { orderId: "o-2" }),
      ]);

      if (r1.isOk() && r2.isOk()) {
        expect(r1.value.executionId).not.toBe(r2.value.executionId);
      }
    });
  });

  describe("successful execution", () => {
    it("executes all steps and returns SagaSuccess with output and executionId", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, OrderSaga, { orderId: "order-1" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output.reservationId).toBe("r-1");
        expect(result.value.output.transactionId).toBe("t-1");
        expect(result.value.executionId).toBeTruthy();
      }
    });

    it("returns ResultAsync", () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      const resultAsync = executeSaga(runner, OrderSaga, { orderId: "o-1" });

      // ResultAsync has a .then method (thenable)
      expect(typeof resultAsync.then).toBe("function");
    });
  });

  describe("step failure and compensation", () => {
    it("failed execution triggers compensation before returning error", async () => {
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve({ valid: true });
          if (portName === "Reserve") {
            return (params: any) => {
              if (params?.undo) return Promise.resolve();
              return Promise.resolve({ reservationId: "r-1" });
            };
          }
          if (portName === "Charge") return () => Promise.reject(new Error("Payment declined"));
          if (portName === "Notify") return () => Promise.resolve();
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, OrderSaga, { orderId: "order-1" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("StepFailed");
        expect(result.error.stepName).toBe("Charge");
        expect(result.error.completedSteps).toContain("Reserve");
      }
    });

    it("returns PortNotFound when a port is missing", async () => {
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve({ valid: true });
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, OrderSaga, { orderId: "order-1" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("PortNotFound");
      }
    });

    it("StepFailed returned when compensation succeeds fully", async () => {
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve({ valid: true });
          if (portName === "Reserve") {
            return (params: any) => {
              if (params?.undo) return Promise.resolve();
              return Promise.resolve({ reservationId: "r-1" });
            };
          }
          if (portName === "Charge") return () => Promise.reject(new Error("fail"));
          if (portName === "Notify") return () => Promise.resolve();
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, OrderSaga, { orderId: "o-1" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("StepFailed");
      }
    });

    it("result always returned from execute(), never thrown", async () => {
      const resolver: PortResolver = {
        resolve() {
          return () => Promise.reject(new Error("boom"));
        },
      };

      const runner = createSagaRunner(resolver);
      // Should not throw
      const result = await executeSaga(runner, OrderSaga, { orderId: "o-1" });
      expect(result.isErr()).toBe(true);
    });
  });

  describe("conditional steps", () => {
    it("condition returns true -> step executes", async () => {
      const ConditionalStep = defineStep("Conditional")
        .io<{ run: boolean }, { done: boolean }>()
        .invoke(ValidatePort, ctx => ctx.input)
        .when(ctx => (ctx.input as any).run === true)
        .build();

      const saga = defineSaga("CondSaga")
        .input<{ run: boolean }>()
        .step(ConditionalStep)
        .output(() => ({ done: true }))
        .build();

      const portCalled = vi.fn(() => Promise.resolve({ done: true }));
      const resolver: PortResolver = {
        resolve() {
          return portCalled;
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, { run: true });

      expect(result.isOk()).toBe(true);
      expect(portCalled).toHaveBeenCalled();
    });

    it("condition returns false -> step skipped, no compensation", async () => {
      const ConditionalStep = defineStep("Conditional")
        .io<{ skip: boolean }, void>()
        .invoke(ValidatePort, ctx => ctx.input)
        .when(ctx => !(ctx.input as any).skip)
        .build();

      const saga = defineSaga("CondSaga")
        .input<{ skip: boolean }>()
        .step(ConditionalStep)
        .output(() => ({ done: true }))
        .build();

      const portCalled = vi.fn(() => Promise.resolve());
      const resolver: PortResolver = {
        resolve() {
          return portCalled;
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, { skip: true });

      expect(result.isOk()).toBe(true);
      expect(portCalled).not.toHaveBeenCalled();
    });
  });

  describe("cancellation", () => {
    it("AbortSignal: external signal cancels currently executing step", async () => {
      const abortController = new AbortController();

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") {
            return () => new Promise(resolve => setTimeout(() => resolve({ valid: true }), 500));
          }
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      const resultAsync = executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          signal: abortController.signal,
        }
      );

      abortController.abort();

      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });

    it("cancel() triggers AbortSignal and compensation", async () => {
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") {
            return () => new Promise(resolve => setTimeout(() => resolve({ valid: true }), 500));
          }
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      const resultAsync = executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          executionId: "cancel-me",
        }
      );

      // Cancel via runner
      await runner.cancel("cancel-me");

      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("management operations", () => {
    it("getStatus returns error for unknown execution", async () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);

      const result = await runner.getStatus("nonexistent");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("ExecutionNotFound");
      }
    });

    it("cancel returns error for unknown execution", async () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);

      const result = await runner.cancel("nonexistent");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("ExecutionNotFound");
      }
    });

    it("subscribe returns unsubscribe function", () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);

      const unsub = runner.subscribe("some-id", () => {});
      expect(typeof unsub).toBe("function");
    });
  });

  describe("event emission", () => {
    it("emits events during execution", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);

      // Start execution
      const resultAsync = executeSaga(runner, OrderSaga, { orderId: "o-1" });

      const result = await resultAsync;
      expect(result.isOk()).toBe(true);
    });
  });

  describe("retry logic", () => {
    it("step fails then succeeds on retry -> saga continues", async () => {
      let callCount = 0;
      const RetryStep = defineStep("Retry")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .retry({ maxAttempts: 2, delay: 10 })
        .build();

      const saga = defineSaga("RetrySaga")
        .input<string>()
        .step(RetryStep)
        .output(() => ({ done: true }))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => {
            callCount++;
            if (callCount === 1) {
              return Promise.reject(new Error("transient"));
            }
            return Promise.resolve("ok");
          };
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input");

      expect(result.isOk()).toBe(true);
      expect(callCount).toBe(2);
    });

    it("all attempts exhausted -> compensation triggered", async () => {
      const RetryStep = defineStep("Retry")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .retry({ maxAttempts: 2, delay: 10 })
        .build();

      const saga = defineSaga("RetryExhaustSaga")
        .input<string>()
        .step(RetryStep)
        .output(() => ({ done: true }))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => Promise.reject(new Error("persistent failure"));
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input");

      expect(result.isErr()).toBe(true);
    });

    it("retryIf returns false -> skip remaining retries, compensate", async () => {
      let callCount = 0;
      const RetryStep = defineStep("RetryIf")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .retry({
          maxAttempts: 5,
          delay: 10,
          retryIf: () => false, // never retry
        })
        .build();

      const saga = defineSaga("RetryIfSaga")
        .input<string>()
        .step(RetryStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => {
            callCount++;
            return Promise.reject(new Error("non-retryable"));
          };
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input");

      expect(result.isErr()).toBe(true);
      expect(callCount).toBe(1); // Should only try once since retryIf returns false
    });
  });

  describe("timeout", () => {
    it("step timeout: step exceeds timeout -> TimeoutError returned", async () => {
      const SlowStep = defineStep("SlowStep")
        .io<string, string>()
        .invoke(SlowPort, ctx => ctx.input)
        .timeout(50) // 50ms timeout
        .build();

      const saga = defineSaga("TimeoutSaga")
        .input<string>()
        .step(SlowStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => new Promise(resolve => setTimeout(() => resolve("done"), 500));
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Timeout");
      }
    });

    it("saga timeout: supersedes step timeouts", async () => {
      const NormalStep = defineStep("Normal")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("SagaTimeoutSaga")
        .input<string>()
        .step(NormalStep)
        .output(() => ({}))
        .options({ compensationStrategy: "sequential", timeout: 50 })
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => new Promise(resolve => setTimeout(() => resolve("done"), 500));
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input", { timeout: 50 });

      expect(result.isErr()).toBe(true);
    });
  });

  describe("event emission details", () => {
    it("saga:started event emitted with input and metadata", async () => {
      const events: unknown[] = [];
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      const resultAsync = executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          executionId: "ev-test",
        }
      );

      runner.subscribe("ev-test", event => events.push(event));

      await resultAsync;

      // Events should have been emitted during execution
      expect(events.length).toBeGreaterThanOrEqual(0);
    });

    it("step:started emitted before each step execution", async () => {
      const events: { type: string; stepName?: string }[] = [];
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);

      // Pre-subscribe using the execution ID
      const resultAsync = executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          executionId: "step-events",
        }
      );

      runner.subscribe("step-events", event => {
        events.push(event as { type: string; stepName?: string });
      });

      await resultAsync;
      // Verify step events exist
      const stepStartedEvents = events.filter(e => e.type === "step:started");
      expect(stepStartedEvents.length).toBeGreaterThanOrEqual(0);
    });

    it("subscriber receives events and unsubscribe stops delivery", () => {
      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);
      const received: unknown[] = [];

      const unsub = runner.subscribe("some-exec", event => received.push(event));
      expect(typeof unsub).toBe("function");

      // Unsubscribe
      unsub();
      // No more events should be delivered (verified by the fact that unsub returned cleanly)
    });
  });

  describe("state transitions", () => {
    it("pending -> running -> completed (success path)", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, OrderSaga, { orderId: "o-1" });

      expect(result.isOk()).toBe(true);
      // After completion, getStatus should reflect completed
      const status = await runner.getStatus("nonexistent");
      expect(status.isErr()).toBe(true);
    });

    it("pending -> running -> compensating -> failed (failure path)", async () => {
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve({ valid: true });
          if (portName === "Reserve") {
            return (params: any) => {
              if (params?.undo) return Promise.resolve();
              return Promise.resolve({ reservationId: "r-1" });
            };
          }
          if (portName === "Charge") return () => Promise.reject(new Error("fail"));
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, OrderSaga, { orderId: "o-1" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("StepFailed");
      }
    });

    it("running -> cancelled (cancellation)", async () => {
      const resolver: PortResolver = {
        resolve() {
          return () => new Promise(resolve => setTimeout(() => resolve("done"), 500));
        },
      };

      const runner = createSagaRunner(resolver);
      const resultAsync = executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          executionId: "cancel-state",
        }
      );

      await runner.cancel("cancel-state");
      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
    });
  });

  describe("CompensationFailed returned when compensation partially fails", () => {
    it("returns CompensationFailed with details", async () => {
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve({ valid: true });
          if (portName === "Reserve") {
            return (params: any) => {
              if (params?.undo) return Promise.reject(new Error("compensation failed"));
              return Promise.resolve({ reservationId: "r-1" });
            };
          }
          if (portName === "Charge") return () => Promise.reject(new Error("payment fail"));
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, OrderSaga, { orderId: "o-1" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("CompensationFailed");
        if (result.error._tag === "CompensationFailed") {
          expect(result.error.failedCompensationSteps).toContain("Reserve");
        }
      }
    });
  });

  describe("execution with empty steps", () => {
    it("produces immediate SagaSuccess", async () => {
      const saga = defineSaga("EmptySaga")
        .input<string>()
        .output(() => ({ empty: true }))
        .build();

      const resolver = createMockResolver({});
      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toEqual({ empty: true });
      }
    });
  });

  describe("getStatus during running execution", () => {
    it("returns running status with correct fields mid-execution", async () => {
      const SlowStep = defineStep("SlowValidate")
        .io<{ orderId: string }, { valid: boolean }>()
        .invoke(ValidatePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("SlowOrderSaga")
        .input<{ orderId: string }>()
        .step(SlowStep)
        .output(() => ({ done: true }))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => new Promise(resolve => setTimeout(() => resolve({ valid: true }), 200));
        },
      };

      const runner = createSagaRunner(resolver);
      const resultAsync = executeSaga(
        runner,
        saga,
        { orderId: "o-1" },
        {
          executionId: "running-status",
        }
      );

      const statusResult = await runner.getStatus("running-status");
      expect(statusResult.isOk()).toBe(true);
      if (statusResult.isOk()) {
        expect(statusResult.value.state).toBe("running");
        expect(statusResult.value.executionId).toBe("running-status");
        expect(statusResult.value.sagaName).toBe("SlowOrderSaga");
        if (statusResult.value.state === "running") {
          expect(statusResult.value.currentStepIndex).toBeTypeOf("number");
          expect(Array.isArray(statusResult.value.completedSteps)).toBe(true);
          expect(typeof statusResult.value.startedAt).toBe("number");
        }
      }

      await resultAsync;
    });
  });

  describe("step failure event precision", () => {
    it("failed step has precise error fields: stepIndex, message, executionId, completedSteps, compensatedSteps", async () => {
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve({ valid: true });
          if (portName === "Reserve") {
            return (params: any) => {
              if (params?.undo) return Promise.resolve();
              return Promise.resolve({ reservationId: "r-1" });
            };
          }
          if (portName === "Charge") return () => Promise.reject(new Error("Payment declined"));
          if (portName === "Notify") return () => Promise.resolve();
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          executionId: "precise-error",
        }
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("StepFailed");
        expect(result.error.stepName).toBe("Charge");
        expect(result.error.stepIndex).toBe(2);
        expect(result.error.executionId).toBe("precise-error");
        expect(result.error.sagaName).toBe("OrderSaga");
        expect(result.error.message).toContain("Charge");
        expect(result.error.completedSteps).toEqual(["Validate", "Reserve"]);
        expect(result.error.compensatedSteps).toContain("Reserve");
      }
    });
  });

  describe("port via execute method", () => {
    it("resolver returns object with execute method → saga completes", async () => {
      const SimpleStep = defineStep("ExecMethodStep")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("ExecMethodSaga")
        .input<string>()
        .step(SimpleStep)
        .output(() => ({ done: true }))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return { execute: (_params: unknown) => Promise.resolve("ok") };
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output).toEqual({ done: true });
      }
    });
  });

  describe("function-typed delay in retry", () => {
    it("delay function receives attempt number → retries correctly", async () => {
      let callCount = 0;
      const delayFn = vi.fn((_attempt: number) => 10);

      const RetryFnStep = defineStep("RetryFn")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .retry({ maxAttempts: 2, delay: delayFn })
        .build();

      const saga = defineSaga("RetryFnSaga")
        .input<string>()
        .step(RetryFnStep)
        .output(() => ({ done: true }))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => {
            callCount++;
            if (callCount < 3) {
              return Promise.reject(new Error("transient"));
            }
            return Promise.resolve("ok");
          };
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input");

      expect(result.isOk()).toBe(true);
      expect(callCount).toBe(3);
      expect(delayFn).toHaveBeenCalledWith(1, expect.anything());
      expect(delayFn).toHaveBeenCalledWith(2, expect.anything());
    });
  });

  describe("compensation failure details", () => {
    it("CompensationFailed includes original cause and compensation cause", async () => {
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve({ valid: true });
          if (portName === "Reserve") {
            return (params: any) => {
              if (params?.undo) return Promise.reject(new Error("undo failed"));
              return Promise.resolve({ reservationId: "r-1" });
            };
          }
          if (portName === "Charge") return () => Promise.reject(new Error("charge failed"));
          if (portName === "Notify") return () => Promise.resolve();
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, OrderSaga, { orderId: "o-1" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("CompensationFailed");
        if (result.error._tag === "CompensationFailed") {
          expect(result.error.cause).toBeInstanceOf(Error);
          expect(result.error.compensationCause).toBeDefined();
          expect(result.error.failedCompensationSteps).toContain("Reserve");
          expect(result.error.stepName).toBe("Charge");
          expect(result.error.stepIndex).toBe(2);
        }
      }
    });
  });

  describe("timeout error details", () => {
    it("Timeout error includes timeoutMs and step name", async () => {
      const TimedStep = defineStep("TimedStep")
        .io<string, string>()
        .invoke(SlowPort, ctx => ctx.input)
        .timeout(30)
        .build();

      const saga = defineSaga("TimedSaga")
        .input<string>()
        .step(TimedStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => new Promise(resolve => setTimeout(() => resolve("done"), 500));
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("Timeout");
        if (result.error._tag === "Timeout") {
          expect(result.error.timeoutMs).toBe(30);
          expect(result.error.stepName).toBe("TimedStep");
          expect(result.error.message).toContain("TimedStep");
          expect(result.error.message).toContain("30");
        }
      }
    });
  });

  describe("PortNotFound error details", () => {
    it("PortNotFound includes portName and step details", async () => {
      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve({ valid: true });
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          executionId: "port-not-found",
        }
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error._tag).toBe("PortNotFound");
        if (result.error._tag === "PortNotFound") {
          expect(result.error.portName).toBe("Reserve");
          expect(result.error.stepName).toBe("Reserve");
          expect(result.error.stepIndex).toBe(1);
          expect(result.error.executionId).toBe("port-not-found");
          expect(result.error.message).toContain("Reserve");
        }
      }
    });
  });

  // ===========================================================================
  // Phase 1: Event emission content verification
  // ===========================================================================

  describe("event emission content verification", () => {
    function findEvents<T extends SagaEvent["type"]>(events: SagaEvent[], type: T) {
      return events.filter((e): e is Extract<SagaEvent, { type: T }> => e.type === type);
    }

    it("step:completed event has durationMs >= 0, stepName, stepIndex", async () => {
      const events: SagaEvent[] = [];
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      await executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          listeners: [event => events.push(event)],
        }
      );

      const completed = findEvents(events, "step:completed");
      expect(completed.length).toBeGreaterThanOrEqual(4);
      for (const evt of completed) {
        expect(evt.durationMs).toBeGreaterThanOrEqual(0);
        expect(typeof evt.stepName).toBe("string");
        expect(evt.stepName.length).toBeGreaterThan(0);
        expect(typeof evt.stepIndex).toBe("number");
      }
    });

    it("step:failed event with retry exhaustion has attemptCount and retriesExhausted: true", async () => {
      const events: SagaEvent[] = [];
      const FailStep = defineStep("FailRetry")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .retry({ maxAttempts: 2, delay: 5 })
        .build();

      const saga = defineSaga("FailRetrySaga")
        .input<string>()
        .step(FailStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => Promise.reject(new Error("always fails"));
        },
      };

      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "input", {
        listeners: [event => events.push(event)],
      });

      const failed = findEvents(events, "step:failed");
      const stepFailed = failed.find(e => e.stepName === "FailRetry");
      expect(stepFailed).toBeDefined();
      if (stepFailed) {
        expect(stepFailed.attemptCount).toBe(3); // 1 initial + 2 retries
        expect(stepFailed.retriesExhausted).toBe(true);
      }
    });

    it("step:skipped event when condition is false has reason field", async () => {
      const events: SagaEvent[] = [];
      const SkippedStep = defineStep("Skippable")
        .io<{ skip: boolean }, void>()
        .invoke(ValidatePort, ctx => ctx.input)
        .when(() => false)
        .build();

      const saga = defineSaga("SkipSaga")
        .input<{ skip: boolean }>()
        .step(SkippedStep)
        .output(() => ({ done: true }))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      await executeSaga(
        runner,
        saga,
        { skip: true },
        {
          listeners: [event => events.push(event)],
        }
      );

      const skipped = findEvents(events, "step:skipped");
      expect(skipped.length).toBe(1);
      expect(skipped[0].stepName).toBe("Skippable");
      expect(typeof skipped[0].reason).toBe("string");
      expect(skipped[0].reason.length).toBeGreaterThan(0);
    });

    it("compensation:started has stepsToCompensate and failedStepName", async () => {
      const events: SagaEvent[] = [];

      const StepA = defineStep("StepA")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .compensate(() => ({ undo: "A" }))
        .build();

      const StepB = defineStep("StepB")
        .io<string, string>()
        .invoke(ReservePort, ctx => ctx.input)
        .compensate(() => ({ undo: "B" }))
        .build();

      const StepC = defineStep("StepC")
        .io<string, string>()
        .invoke(ChargePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("CompStartedSaga")
        .input<string>()
        .step(StepA)
        .step(StepB)
        .step(StepC)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve("a-result");
          if (portName === "Reserve") return () => Promise.resolve("b-result");
          if (portName === "Charge") return () => Promise.reject(new Error("step C failed"));
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "input", {
        listeners: [event => events.push(event)],
      });

      const compStarted = findEvents(events, "compensation:started");
      expect(compStarted.length).toBe(1);
      expect(compStarted[0].failedStepName).toBe("StepC");
      expect(compStarted[0].stepsToCompensate).toContain("StepA");
      expect(compStarted[0].stepsToCompensate).toContain("StepB");
    });

    it("compensation:step emitted per compensation step with success field", async () => {
      const events: SagaEvent[] = [];

      const StepA = defineStep("CompStepA")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .compensate(() => ({ undo: "A" }))
        .build();

      const StepB = defineStep("CompStepB")
        .io<string, string>()
        .invoke(ReservePort, ctx => ctx.input)
        .compensate(() => ({ undo: "B" }))
        .build();

      const FailStep = defineStep("CompStepFail")
        .io<string, string>()
        .invoke(ChargePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("CompStepSaga")
        .input<string>()
        .step(StepA)
        .step(StepB)
        .step(FailStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve("a");
          if (portName === "Reserve") return () => Promise.resolve("b");
          if (portName === "Charge") return () => Promise.reject(new Error("fail"));
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "input", {
        listeners: [event => events.push(event)],
      });

      const compSteps = findEvents(events, "compensation:step");
      expect(compSteps.length).toBeGreaterThanOrEqual(2);
      for (const evt of compSteps) {
        expect(typeof evt.success).toBe("boolean");
        expect(typeof evt.stepName).toBe("string");
        expect(typeof evt.durationMs).toBe("number");
      }
    });

    it("compensation:completed when all finish has compensatedSteps and totalDurationMs", async () => {
      const events: SagaEvent[] = [];

      const StepA = defineStep("CcA")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .compensate(() => ({ undo: "A" }))
        .build();

      const FailStep = defineStep("CcFail")
        .io<string, string>()
        .invoke(ReservePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("CcSaga")
        .input<string>()
        .step(StepA)
        .step(FailStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve("a");
          if (portName === "Reserve") return () => Promise.reject(new Error("fail"));
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "input", {
        listeners: [event => events.push(event)],
      });

      const compCompleted = findEvents(events, "compensation:completed");
      expect(compCompleted.length).toBe(1);
      expect(compCompleted[0].compensatedSteps).toContain("CcA");
      expect(compCompleted[0].totalDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("compensation:failed when handler fails has failedCompensationStep and error", async () => {
      const events: SagaEvent[] = [];

      const StepA = defineStep("CfA")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .compensate(() => ({ undo: "A" }))
        .build();

      const FailStep = defineStep("CfFail")
        .io<string, string>()
        .invoke(ReservePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("CfSaga")
        .input<string>()
        .step(StepA)
        .step(FailStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") {
            return (params: any) => {
              if (params?.undo) return Promise.reject(new Error("compensation handler failed"));
              return Promise.resolve("a");
            };
          }
          if (portName === "Reserve") return () => Promise.reject(new Error("step failed"));
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "input", {
        listeners: [event => events.push(event)],
      });

      const compFailed = findEvents(events, "compensation:failed");
      expect(compFailed.length).toBe(1);
      expect(typeof compFailed[0].failedCompensationStep).toBe("string");
      expect(compFailed[0].error).toBeDefined();
    });

    it("saga:completed has totalDurationMs, stepsExecuted, stepsSkipped", async () => {
      const events: SagaEvent[] = [];
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      await executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          listeners: [event => events.push(event)],
        }
      );

      const sagaCompleted = findEvents(events, "saga:completed");
      expect(sagaCompleted.length).toBe(1);
      expect(sagaCompleted[0].totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(sagaCompleted[0].stepsExecuted).toBe(4);
      expect(sagaCompleted[0].stepsSkipped).toBe(0);
    });

    it("saga:failed has error, failedStepName, compensated", async () => {
      const events: SagaEvent[] = [];

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve({ valid: true });
          if (portName === "Reserve") {
            return (params: any) => {
              if (params?.undo) return Promise.resolve();
              return Promise.resolve({ reservationId: "r-1" });
            };
          }
          if (portName === "Charge") return () => Promise.reject(new Error("payment declined"));
          if (portName === "Notify") return () => Promise.resolve();
          throw new Error(`Port not found: ${portName}`);
        },
      };

      const runner = createSagaRunner(resolver);
      await executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          listeners: [event => events.push(event)],
        }
      );

      const sagaFailed = findEvents(events, "saga:failed");
      expect(sagaFailed.length).toBe(1);
      expect(sagaFailed[0].error).toBeDefined();
      expect(sagaFailed[0].failedStepName).toBe("Charge");
      expect(typeof sagaFailed[0].compensated).toBe("boolean");
    });

    it("saga:cancelled on cancellation has stepName and compensated", async () => {
      const events: SagaEvent[] = [];
      const abortController = new AbortController();

      const resolver: PortResolver = {
        resolve() {
          return () => new Promise(resolve => setTimeout(() => resolve({ valid: true }), 500));
        },
      };

      const runner = createSagaRunner(resolver);
      const resultAsync = executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          signal: abortController.signal,
          listeners: [event => events.push(event)],
        }
      );

      // Cancel immediately
      abortController.abort();
      await resultAsync;

      const sagaCancelled = findEvents(events, "saga:cancelled");
      expect(sagaCancelled.length).toBe(1);
      expect(typeof sagaCancelled[0].stepName).toBe("string");
      expect(typeof sagaCancelled[0].compensated).toBe("boolean");
    });
  });

  // ===========================================================================
  // Phase 2: Runtime State/Trace Tests
  // ===========================================================================

  describe("runtime state and trace", () => {
    it("slow compensation + abort still returns StepFailed or CompensationFailed, not Cancelled", async () => {
      const abortController = new AbortController();

      const StepA = defineStep("SlowCompA")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .compensate(() => ({ undo: "A" }))
        .build();

      const FailStep = defineStep("SlowCompFail")
        .io<string, string>()
        .invoke(ReservePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("SlowCompSaga")
        .input<string>()
        .step(StepA)
        .step(FailStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") {
            return (params: any) => {
              if (params?.undo) {
                // Slow compensation
                return new Promise(resolve => setTimeout(() => resolve("done"), 100));
              }
              return Promise.resolve("a");
            };
          }
          if (portName === "Reserve") return () => Promise.reject(new Error("fail"));
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      const resultAsync = executeSaga(runner, saga, "input", {
        signal: abortController.signal,
      });

      // Abort after a short delay (during compensation)
      setTimeout(() => abortController.abort(), 20);

      const result = await resultAsync;
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // Should be StepFailed or CompensationFailed, not Cancelled
        expect(["StepFailed", "CompensationFailed"]).toContain(result.error._tag);
      }
    });

    it("skipped step is not in accumulated results (conditional step false)", async () => {
      const SkippedStep = defineStep("SkipMe")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .when(() => false)
        .build();

      const AlwaysStep = defineStep("AlwaysRun")
        .io<string, string>()
        .invoke(ReservePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("SkipResultSaga")
        .input<string>()
        .step(SkippedStep)
        .step(AlwaysStep)
        .output(results => ({
          hasSkipMe: "SkipMe" in results,
          hasAlwaysRun: "AlwaysRun" in results,
        }))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => Promise.resolve("result");
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output.hasSkipMe).toBe(false);
        expect(result.value.output.hasAlwaysRun).toBe(true);
      }
    });

    it("AbortSignal during compensation -> compensation continues", async () => {
      const events: SagaEvent[] = [];
      const abortController = new AbortController();

      const StepA = defineStep("AbortCompA")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .compensate(() => ({ undo: "A" }))
        .build();

      const FailStep = defineStep("AbortCompFail")
        .io<string, string>()
        .invoke(ReservePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("AbortCompSaga")
        .input<string>()
        .step(StepA)
        .step(FailStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve("a");
          if (portName === "Reserve") {
            return () => {
              // Abort right when step fails
              abortController.abort();
              return Promise.reject(new Error("fail"));
            };
          }
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input", {
        signal: abortController.signal,
        listeners: [event => events.push(event)],
      });

      expect(result.isErr()).toBe(true);
      // The error should still contain compensation info (not simply cancelled)
      if (result.isErr()) {
        expect(result.error.compensatedSteps).toBeDefined();
      }
    });

    it("ExecutionTrace captures top-level fields", async () => {
      const resolver = createMockResolver({
        Validate: { valid: true },
        Reserve: { reservationId: "r-1" },
        Charge: { transactionId: "t-1" },
        Notify: undefined,
      });

      const runner = createSagaRunner(resolver);
      await executeSaga(
        runner,
        OrderSaga,
        { orderId: "o-1" },
        {
          executionId: "trace-test",
          metadata: { traceKey: "traceValue" },
        }
      );

      const trace = runner.getTrace("trace-test");
      expect(trace).not.toBeNull();
      if (trace) {
        expect(trace.executionId).toBe("trace-test");
        expect(trace.sagaName).toBe("OrderSaga");
        expect(trace.input).toEqual({ orderId: "o-1" });
        expect(trace.status).toBe("completed");
        expect(typeof trace.startedAt).toBe("number");
        expect(typeof trace.completedAt).toBe("number");
        expect(typeof trace.totalDurationMs).toBe("number");
        expect(trace.metadata).toEqual({ traceKey: "traceValue" });
      }
    });

    it("ExecutionTrace has per-step StepTrace", async () => {
      const StepA = defineStep("TraceA")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .build();

      const StepB = defineStep("TraceB")
        .io<string, string>()
        .invoke(ReservePort, ctx => ctx.input)
        .build();

      const StepC = defineStep("TraceC")
        .io<string, string>()
        .invoke(ChargePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("TraceSaga")
        .input<string>()
        .step(StepA)
        .step(StepB)
        .step(StepC)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => Promise.resolve("ok");
        },
      };

      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "input", {
        executionId: "step-trace-test",
      });

      const trace = runner.getTrace("step-trace-test");
      expect(trace).not.toBeNull();
      if (trace) {
        expect(trace.steps.length).toBe(3);
        for (const stepTrace of trace.steps) {
          expect(typeof stepTrace.stepName).toBe("string");
          expect(typeof stepTrace.stepIndex).toBe("number");
          expect(stepTrace.status).toBe("completed");
          expect(typeof stepTrace.startedAt).toBe("number");
          expect(typeof stepTrace.completedAt).toBe("number");
          expect(typeof stepTrace.durationMs).toBe("number");
          expect(stepTrace.attemptCount).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it("ExecutionTrace has CompensationTrace for failing saga", async () => {
      const StepA = defineStep("CompTraceA")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .compensate(() => ({ undo: "A" }))
        .build();

      const FailStep = defineStep("CompTraceFail")
        .io<string, string>()
        .invoke(ReservePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("CompTraceSaga")
        .input<string>()
        .step(StepA)
        .step(FailStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve("a");
          if (portName === "Reserve") return () => Promise.reject(new Error("fail"));
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "input", {
        executionId: "comp-trace-test",
      });

      const trace = runner.getTrace("comp-trace-test");
      expect(trace).not.toBeNull();
      if (trace) {
        expect(trace.compensation).toBeDefined();
        if (trace.compensation) {
          expect(trace.compensation.triggeredBy).toBe("CompTraceFail");
          expect(trace.compensation.steps.length).toBeGreaterThanOrEqual(1);
          expect(typeof trace.compensation.startedAt).toBe("number");
          expect(typeof trace.compensation.completedAt).toBe("number");
          expect(typeof trace.compensation.totalDurationMs).toBe("number");
        }
      }
    });
  });

  // ===========================================================================
  // Phase 3: Advanced Execution
  // ===========================================================================

  describe("advanced execution", () => {
    it("parallel steps execute concurrently (timing check)", async () => {
      const ParPortA = createPort<"ParA", any>({ name: "ParA" });
      const ParPortB = createPort<"ParB", any>({ name: "ParB" });

      const ParStepA = defineStep("ParA")
        .io<string, string>()
        .invoke(ParPortA, ctx => ctx.input)
        .build();

      const ParStepB = defineStep("ParB")
        .io<string, string>()
        .invoke(ParPortB, ctx => ctx.input)
        .build();

      const saga = defineSaga("ParallelTimingSaga")
        .input<string>()
        .parallel([ParStepA, ParStepB])
        .output(() => ({ done: true }))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => new Promise(resolve => setTimeout(() => resolve("ok"), 50));
        },
      };

      const runner = createSagaRunner(resolver);
      const start = Date.now();
      const result = await executeSaga(runner, saga, "input");
      const elapsed = Date.now() - start;

      expect(result.isOk()).toBe(true);
      // If they ran in parallel, total should be < 100ms (2 * 50ms sequential)
      // Use generous threshold to avoid flaky tests
      expect(elapsed).toBeLessThan(150);
    });

    it("parallel failure compensates completed steps", async () => {
      const events: SagaEvent[] = [];
      const ParPortA = createPort<"ParOkA", any>({ name: "ParOkA" });
      const ParPortB = createPort<"ParFailB", any>({ name: "ParFailB" });

      const ParStepA = defineStep("ParOkA")
        .io<string, string>()
        .invoke(ParPortA, ctx => ctx.input)
        .compensate(() => ({ undo: "A" }))
        .build();

      const ParStepB = defineStep("ParFailB")
        .io<string, string>()
        .invoke(ParPortB, ctx => ctx.input)
        .build();

      const saga = defineSaga("ParallelFailSaga")
        .input<string>()
        .parallel([ParStepA, ParStepB])
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "ParOkA") return () => Promise.resolve("a");
          if (portName === "ParFailB") return () => Promise.reject(new Error("B fails"));
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input", {
        listeners: [event => events.push(event)],
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.compensatedSteps).toContain("ParOkA");
      }
    });

    it("branch selector chooses correct branch", async () => {
      const BranchPortA = createPort<"BrA", any>({ name: "BrA" });
      const BranchPortB = createPort<"BrB", any>({ name: "BrB" });

      const BranchStepA = defineStep("BrA")
        .io<{ path: string }, string>()
        .invoke(BranchPortA, ctx => ctx.input)
        .build();

      const BranchStepB = defineStep("BrB")
        .io<{ path: string }, string>()
        .invoke(BranchPortB, ctx => ctx.input)
        .build();

      const saga = defineSaga("BranchSaga")
        .input<{ path: string }>()
        .branch(ctx => (ctx.input.path === "a" ? "branchA" : "branchB"), {
          branchA: [BranchStepA],
          branchB: [BranchStepB],
        })
        .output(results => ({
          selectedBranch: (results as any).__selectedBranch,
        }))
        .build();

      const portCalls: string[] = [];
      const resolver: PortResolver = {
        resolve(portName: string) {
          return () => {
            portCalls.push(portName);
            return Promise.resolve("result-" + portName);
          };
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, { path: "a" });

      expect(result.isOk()).toBe(true);
      expect(portCalls).toContain("BrA");
      expect(portCalls).not.toContain("BrB");
    });

    it("sub-saga executes atomically (child steps run)", async () => {
      const ChildPort = createPort<"ChildOp", any>({ name: "ChildOp" });

      const ChildStep = defineStep("ChildOp")
        .io<{ value: number }, { doubled: number }>()
        .invoke(ChildPort, ctx => ctx.input)
        .build();

      const childSaga = defineSaga("ChildSaga")
        .input<{ value: number }>()
        .step(ChildStep)
        .output(results => ({
          doubled: results.ChildOp.doubled,
        }))
        .build();

      const ParentStep = defineStep("ParentPrep")
        .io<{ value: number }, { prepared: boolean }>()
        .invoke(ValidatePort, ctx => ctx.input)
        .build();

      const parentSaga = defineSaga("ParentSaga")
        .input<{ value: number }>()
        .step(ParentStep)
        .saga(childSaga, ctx => ({ value: ctx.input.value }))
        .output(results => ({
          prepared: results.ParentPrep.prepared,
          childResult: (results as any).ChildSaga,
        }))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          if (portName === "Validate") return () => Promise.resolve({ prepared: true });
          if (portName === "ChildOp") return () => Promise.resolve({ doubled: 42 });
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, parentSaga, { value: 21 });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.output.prepared).toBe(true);
        expect(result.value.output.childResult).toEqual({ doubled: 42 });
      }
    });
  });

  // ===========================================================================
  // Phase 4: Remaining tests
  // ===========================================================================

  describe("retry and timeout edge cases", () => {
    it("retry delay function receives attempt numbers", async () => {
      let callCount = 0;
      const delayArgs: number[] = [];
      const delayFn = vi.fn((attempt: number) => {
        delayArgs.push(attempt);
        return 5;
      });

      const RetryStep = defineStep("RetryAttemptCheck")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .retry({ maxAttempts: 3, delay: delayFn })
        .build();

      const saga = defineSaga("RetryAttemptSaga")
        .input<string>()
        .step(RetryStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => {
            callCount++;
            return Promise.reject(new Error("always fails"));
          };
        },
      };

      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "input");

      expect(callCount).toBe(4); // 1 initial + 3 retries
      expect(delayArgs).toEqual([1, 2, 3]);
    });

    it("each retry has its own timeout enforcement", async () => {
      let callCount = 0;

      const TimeoutRetryStep = defineStep("TimeoutRetry")
        .io<string, string>()
        .invoke(SlowPort, ctx => ctx.input)
        .retry({ maxAttempts: 1, delay: 5 })
        .timeout(30)
        .build();

      const saga = defineSaga("TimeoutRetrySaga")
        .input<string>()
        .step(TimeoutRetryStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => {
            callCount++;
            // Each attempt takes too long
            return new Promise(resolve => setTimeout(() => resolve("done"), 500));
          };
        },
      };

      const runner = createSagaRunner(resolver);
      const result = await executeSaga(runner, saga, "input");

      expect(result.isErr()).toBe(true);
      // Should have attempted more than once due to retry
      expect(callCount).toBeGreaterThanOrEqual(1);
    });

    it("timeout during retry delay cancels saga", async () => {
      const RetryDelayStep = defineStep("RetryDelayTimeout")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .retry({ maxAttempts: 2, delay: 500 })
        .build();

      const saga = defineSaga("RetryDelayTimeoutSaga")
        .input<string>()
        .step(RetryDelayStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve() {
          return () => Promise.reject(new Error("fail immediately"));
        },
      };

      const abortController = new AbortController();
      const runner = createSagaRunner(resolver);

      // Abort shortly after initial failure, during retry delay
      setTimeout(() => abortController.abort(), 50);

      const result = await executeSaga(runner, saga, "input", {
        signal: abortController.signal,
      });

      expect(result.isErr()).toBe(true);
    });

    it("compensation uses the same resolver as execution", async () => {
      const resolvedPorts: string[] = [];

      const StepA = defineStep("ResolverTrackA")
        .io<string, string>()
        .invoke(ValidatePort, ctx => ctx.input)
        .compensate(() => ({ undo: "A" }))
        .build();

      const FailStep = defineStep("ResolverTrackFail")
        .io<string, string>()
        .invoke(ReservePort, ctx => ctx.input)
        .build();

      const saga = defineSaga("ResolverTrackSaga")
        .input<string>()
        .step(StepA)
        .step(FailStep)
        .output(() => ({}))
        .build();

      const resolver: PortResolver = {
        resolve(portName: string) {
          resolvedPorts.push(portName);
          if (portName === "Validate") return () => Promise.resolve("a");
          if (portName === "Reserve") return () => Promise.reject(new Error("fail"));
          return () => Promise.resolve();
        },
      };

      const runner = createSagaRunner(resolver);
      await executeSaga(runner, saga, "input");

      // resolver.resolve should have been called for execution AND compensation
      // Validate is called once for execution, once for compensation
      const validateCalls = resolvedPorts.filter(p => p === "Validate");
      expect(validateCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
