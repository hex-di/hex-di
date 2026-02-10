import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep, defineSaga, createSagaRunner } from "@hex-di/saga";
import type { PortResolver } from "@hex-di/saga";
import {
  createSagaTestHarness,
  createMockSagaPersister,
  createSagaEventRecorder,
} from "../../src/index.js";

// =============================================================================
// Shared Test Ports, Steps, and Saga Definition
// =============================================================================

const ValidatePort = createPort<"Validate", any>({ name: "Validate" });
const ReservePort = createPort<"Reserve", any>({ name: "Reserve" });
const ChargePort = createPort<"Charge", any>({ name: "Charge" });

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

const OrderSaga = defineSaga("OrderSaga")
  .input<{ orderId: string }>()
  .step(ValidateStep)
  .step(ReserveStep)
  .step(ChargeStep)
  .output(results => ({
    reservationId: results.Reserve.reservationId,
    transactionId: results.Charge.transactionId,
  }))
  .build();

// =============================================================================
// Test 1: Test Harness Integration
// =============================================================================

describe("Test Harness Integration", () => {
  it("full execution path: mocked ports, getCalls, events, and trace", async () => {
    const harness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-100" } },
        Charge: { value: { transactionId: "t-200" } },
      },
    });

    const result = await harness.execute({ orderId: "integ-1" });

    // Result is Ok with correct output
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toEqual({
        reservationId: "r-100",
        transactionId: "t-200",
      });
    }

    // getCalls() records per-port invocations
    expect(harness.getCalls("Validate")).toHaveLength(1);
    expect(harness.getCalls("Reserve")).toHaveLength(1);
    expect(harness.getCalls("Charge")).toHaveLength(1);

    // Events array has correct lifecycle events
    const eventTypes = harness.events.map(e => e.type);
    expect(eventTypes).toContain("saga:started");
    expect(eventTypes).toContain("step:started");
    expect(eventTypes).toContain("step:completed");
    expect(eventTypes).toContain("saga:completed");

    // getTrace() returns valid trace
    const trace = harness.getTrace();
    expect(trace).not.toBeNull();
    if (trace) {
      expect(trace.sagaName).toBe("OrderSaga");
      expect(trace.status).toBe("completed");
      expect(trace.steps).toHaveLength(3);
      expect(trace.steps.every(s => s.status === "completed")).toBe(true);
      expect(trace.compensation).toBeUndefined();
      expect(trace.startedAt).toBeTypeOf("number");
      expect(trace.completedAt).toBeTypeOf("number");
    }
  });
});

// =============================================================================
// Test 2: Mock Persister with Real Runner
// =============================================================================

describe("Mock Persister with Real Runner", () => {
  it("checkpoints persist and resume skips completed steps", async () => {
    const mockPersister = createMockSagaPersister();
    const callLog: string[] = [];

    const resolver: PortResolver = {
      resolve(portName: string) {
        return (params: any) => {
          if (params?.undo || params?.refund) return Promise.resolve();
          callLog.push(portName);
          if (portName === "Validate") return Promise.resolve({ valid: true });
          if (portName === "Reserve")
            return Promise.resolve({ reservationId: `r-${callLog.length}` });
          if (portName === "Charge")
            return Promise.resolve({ transactionId: `t-${callLog.length}` });
          return Promise.resolve({});
        };
      },
    };

    const runner = createSagaRunner(resolver, { persister: mockPersister.persister });

    // Execute once to register the saga and verify checkpoints
    const firstResult = await runner.execute(
      OrderSaga,
      { orderId: "persist-test" },
      {
        executionId: "exec-persist-1",
      }
    );
    expect(firstResult.isOk()).toBe(true);
    expect(mockPersister.saveCount).toBeGreaterThanOrEqual(1);
    expect(mockPersister.updateCount).toBeGreaterThanOrEqual(3);

    // Clear call log for resume test
    callLog.length = 0;

    // Simulate crash state: Step0 (Validate) completed, resume from step 1
    await mockPersister.persister.save({
      executionId: "exec-resume-1",
      sagaName: "OrderSaga",
      input: { orderId: "resume-test" },
      currentStep: 1,
      completedSteps: [
        {
          name: "Validate",
          index: 0,
          output: { valid: true },
          skipped: false,
          completedAt: new Date().toISOString(),
        },
      ],
      status: "running",
      error: null,
      compensation: {
        active: false,
        compensatedSteps: [],
        failedSteps: [],
        triggeringStepIndex: null,
      },
      timestamps: {
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      },
      metadata: {},
    });

    // Resume should skip Validate, execute only Reserve and Charge
    const resumeResult = await runner.resume("exec-resume-1");
    expect(resumeResult.isOk()).toBe(true);
    expect(callLog).toEqual(["Reserve", "Charge"]);

    if (resumeResult.isOk()) {
      expect(resumeResult.value.output).toEqual({
        reservationId: expect.stringContaining("r-"),
        transactionId: expect.stringContaining("t-"),
      });
    }
  });
});

// =============================================================================
// Test 3: Event Recorder Integration
// =============================================================================

describe("Event Recorder Integration", () => {
  it("captures all lifecycle events for success and failure paths", async () => {
    const recorder = createSagaEventRecorder();

    // --- Success path ---
    const successHarness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-1" } },
        Charge: { value: { transactionId: "t-1" } },
      },
    });

    // Attach recorder to the success execution
    const successResult = await successHarness.execute({ orderId: "ev-success" });
    expect(successResult.isOk()).toBe(true);

    // Use the harness events directly (harness captures them internally)
    const successEvents = successHarness.events;
    const successTypes = successEvents.map(e => e.type);
    expect(successTypes[0]).toBe("saga:started");
    expect(successTypes[successTypes.length - 1]).toBe("saga:completed");
    expect(successTypes.filter(t => t === "step:started")).toHaveLength(3);
    expect(successTypes.filter(t => t === "step:completed")).toHaveLength(3);

    // --- Failure path ---
    const failureHarness = createSagaTestHarness(OrderSaga, {
      mocks: {
        Validate: { value: { valid: true } },
        Reserve: { value: { reservationId: "r-2" } },
        Charge: { error: new Error("Payment declined") },
      },
    });

    const failResult = await failureHarness.execute({ orderId: "ev-fail" });
    expect(failResult.isErr()).toBe(true);

    const failEvents = failureHarness.events;
    const failTypes = failEvents.map(e => e.type);
    expect(failTypes).toContain("saga:started");
    expect(failTypes).toContain("step:failed");
    expect(failTypes).toContain("compensation:started");
    expect(failTypes).toContain("saga:failed");

    // --- Event recorder unit behavior ---
    // Feed events manually to verify hasEvent, getByType, eventCount, and reset
    for (const event of successEvents) {
      recorder.listener(event);
    }

    expect(recorder.eventCount).toBe(successEvents.length);
    expect(recorder.hasEvent("saga:started")).toBe(true);
    expect(recorder.hasEvent("saga:completed")).toBe(true);
    expect(recorder.hasEvent("saga:cancelled")).toBe(false);
    expect(recorder.getByType("step:started")).toHaveLength(3);
    expect(recorder.getByType("step:completed")).toHaveLength(3);

    recorder.reset();
    expect(recorder.eventCount).toBe(0);
    expect(recorder.events).toHaveLength(0);
    expect(recorder.hasEvent("saga:started")).toBe(false);
  });
});
