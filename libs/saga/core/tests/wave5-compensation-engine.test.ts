/**
 * Wave 5: Targeted mutation tests for compensation/engine.ts
 *
 * Kills surviving Stryker mutants in:
 * - buildCompensationParams (instanceof, ternary swap)
 * - buildCompensationContext (field assignment mutations)
 * - emitCompensationStepEvent (if guard, event field mutations)
 * - emitCompensationCompleted (type string, totalDurationMs arithmetic)
 * - emitCompensationFailed (type string, field mutations)
 * - executeSequential (reverse order, slice, break, allSucceeded check)
 * - executeParallel (firstFailedStep undefined check, allSucceeded)
 * - executeBestEffort (continue-past-failure, reversed order, firstFailedStep)
 * - executeCompensation (filter, length === 0, empty return, strategy switch)
 */
import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { executeCompensation } from "../src/compensation/engine.js";
import type { CompensationEngineInput, CompensationInvoker } from "../src/compensation/engine.js";
import type { CompensationPlanStep } from "../src/compensation/types.js";
import type { SagaEvent } from "../src/runtime/types.js";

// =============================================================================
// Helpers
// =============================================================================

function makeStep(
  name: string,
  index: number,
  result: unknown,
  compensateFn?: CompensationPlanStep["compensateFn"]
): CompensationPlanStep {
  return {
    stepName: name,
    stepIndex: index,
    result,
    compensateFn: compensateFn ?? (ctx => ({ undo: ctx.stepResult, step: name })),
  };
}

function makeNullCompensateStep(
  name: string,
  index: number,
  result: unknown
): CompensationPlanStep {
  // Steps with null compensateFn should be filtered out
  return {
    stepName: name,
    stepIndex: index,
    result,
    compensateFn: null as unknown as CompensationPlanStep["compensateFn"],
  };
}

function successInvoker(): { invoker: CompensationInvoker; calls: string[] } {
  const calls: string[] = [];
  const invoker: CompensationInvoker = step => {
    calls.push(step.stepName);
    return ResultAsync.ok(undefined);
  };
  return { invoker, calls };
}

function failingInvoker(failNames: Set<string>): { invoker: CompensationInvoker; calls: string[] } {
  const calls: string[] = [];
  const invoker: CompensationInvoker = step => {
    calls.push(step.stepName);
    if (failNames.has(step.stepName)) {
      return ResultAsync.err(new Error(`Compensation failed for ${step.stepName}`));
    }
    return ResultAsync.ok(undefined);
  };
  return { invoker, calls };
}

function makeInput(
  overrides: Partial<CompensationEngineInput> & {
    plan: CompensationEngineInput["plan"];
    invoker: CompensationInvoker;
  }
): CompensationEngineInput {
  return {
    sagaInput: overrides.sagaInput ?? { testInput: true },
    accumulatedResults: overrides.accumulatedResults ?? { step0: "result0" },
    originalError: overrides.originalError ?? new Error("original-error"),
    failedStepIndex: overrides.failedStepIndex ?? 3,
    failedStepName: overrides.failedStepName ?? "FailStep",
    executionId: overrides.executionId ?? "exec-test",
    sagaName: overrides.sagaName ?? "TestSaga",
    ...overrides,
  };
}

function collectEvents(events: SagaEvent[]): (event: SagaEvent) => void {
  return (event: SagaEvent) => {
    events.push(event);
  };
}

// =============================================================================
// buildCompensationParams - instanceof and ternary swap mutations
// =============================================================================

describe("buildCompensationParams mutations", () => {
  it("wraps non-Error thrown values from compensateFn into Error via String()", async () => {
    // compensateFn throws a string, not an Error. The error mapper should wrap it.
    const step = makeStep("A", 0, "result-a", () => {
      throw "string-error-value";
    });

    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    // The compensateFn threw, so buildCompensationParams catches via tryCatch
    expect(result.allSucceeded).toBe(false);
    expect(result.failedSteps).toEqual(["A"]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].cause).toBeInstanceOf(Error);
    expect((result.errors[0].cause as Error).message).toBe("string-error-value");
  });

  it("preserves Error instances thrown from compensateFn", async () => {
    const originalErr = new Error("real-error");
    const step = makeStep("A", 0, "result-a", () => {
      throw originalErr;
    });

    const { invoker } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
      })
    );

    expect(result.allSucceeded).toBe(false);
    expect(result.errors[0].cause).toBe(originalErr);
  });

  it("wraps number thrown values from compensateFn into Error", async () => {
    const step = makeStep("A", 0, "result-a", () => {
      throw 42;
    });

    const { invoker } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
      })
    );

    expect(result.errors[0].cause).toBeInstanceOf(Error);
    expect((result.errors[0].cause as Error).message).toBe("42");
  });
});

// =============================================================================
// buildCompensationContext - field assignment mutations
// =============================================================================

describe("buildCompensationContext field mutations", () => {
  it("passes input (sagaInput) correctly to compensation context", async () => {
    let capturedInput: unknown;
    const step = makeStep("A", 0, "result", ctx => {
      capturedInput = ctx.input;
      return {};
    });
    const { invoker } = successInvoker();
    const sagaInput = { orderId: "order-99", amount: 100 };

    await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        sagaInput,
      })
    );

    expect(capturedInput).toBe(sagaInput);
    expect(capturedInput).toEqual({ orderId: "order-99", amount: 100 });
  });

  it("passes results (accumulatedResults) correctly", async () => {
    let capturedResults: unknown;
    const step = makeStep("A", 0, "result", ctx => {
      capturedResults = ctx.results;
      return {};
    });
    const { invoker } = successInvoker();
    const accResults = { Validate: true, Reserve: { id: "r-1" } };

    await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        accumulatedResults: accResults,
      })
    );

    expect(capturedResults).toBe(accResults);
    expect(capturedResults).toEqual({ Validate: true, Reserve: { id: "r-1" } });
  });

  it("passes stepResult from step.result", async () => {
    let capturedStepResult: unknown;
    const stepResult = { reservationId: "r-777" };
    const step = makeStep("A", 0, stepResult, ctx => {
      capturedStepResult = ctx.stepResult;
      return {};
    });
    const { invoker } = successInvoker();

    await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
      })
    );

    expect(capturedStepResult).toBe(stepResult);
  });

  it("passes error (originalError) correctly", async () => {
    let capturedError: unknown;
    const step = makeStep("A", 0, "result", ctx => {
      capturedError = ctx.error;
      return {};
    });
    const { invoker } = successInvoker();
    const origErr = new Error("the-original-error");

    await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        originalError: origErr,
      })
    );

    expect(capturedError).toBe(origErr);
  });

  it("passes failedStepIndex correctly (non-zero)", async () => {
    let capturedIdx: number | undefined;
    const step = makeStep("A", 0, "result", ctx => {
      capturedIdx = ctx.failedStepIndex;
      return {};
    });
    const { invoker } = successInvoker();

    await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        failedStepIndex: 7,
      })
    );

    expect(capturedIdx).toBe(7);
  });

  it("passes failedStepName correctly (non-empty)", async () => {
    let capturedName: string | undefined;
    const step = makeStep("A", 0, "result", ctx => {
      capturedName = ctx.failedStepName;
      return {};
    });
    const { invoker } = successInvoker();

    await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        failedStepName: "CriticalStep",
      })
    );

    expect(capturedName).toBe("CriticalStep");
  });

  it("passes stepIndex from step.stepIndex (non-zero)", async () => {
    let capturedStepIdx: number | undefined;
    const step = makeStep("B", 2, "result", ctx => {
      capturedStepIdx = ctx.stepIndex;
      return {};
    });
    const { invoker } = successInvoker();

    await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
      })
    );

    expect(capturedStepIdx).toBe(2);
  });

  it("passes executionId correctly (non-empty)", async () => {
    let capturedExecId: string | undefined;
    const step = makeStep("A", 0, "result", ctx => {
      capturedExecId = ctx.executionId;
      return {};
    });
    const { invoker } = successInvoker();

    await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        executionId: "exec-unique-42",
      })
    );

    expect(capturedExecId).toBe("exec-unique-42");
  });
});

// =============================================================================
// emitCompensationStepEvent - if guard, event field mutations
// =============================================================================

describe("emitCompensationStepEvent mutations", () => {
  it("does not crash when emitEvent is undefined", async () => {
    const steps = [makeStep("A", 0, "result")];
    const { invoker } = successInvoker();

    // No emitEvent passed - should not throw
    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: undefined,
      })
    );

    expect(result.allSucceeded).toBe(true);
  });

  it("emits compensation:step events with correct type string", async () => {
    const steps = [makeStep("A", 0, "result")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const stepEvents = events.filter(e => e.type === "compensation:step");
    expect(stepEvents.length).toBeGreaterThanOrEqual(1);
    expect(stepEvents[0].type).toBe("compensation:step");
  });

  it("emits compensation:step with correct stepName", async () => {
    const steps = [makeStep("MyStep", 5, "result")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const stepEvent = events.find(e => e.type === "compensation:step");
    expect(stepEvent).toBeDefined();
    if (stepEvent && stepEvent.type === "compensation:step") {
      expect(stepEvent.stepName).toBe("MyStep");
    }
  });

  it("emits compensation:step with correct stepIndex (non-zero)", async () => {
    const steps = [makeStep("X", 4, "result")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const stepEvent = events.find(e => e.type === "compensation:step");
    expect(stepEvent).toBeDefined();
    if (stepEvent && stepEvent.type === "compensation:step") {
      expect(stepEvent.stepIndex).toBe(4);
    }
  });

  it("emits compensation:step with success=true for successful compensation", async () => {
    const steps = [makeStep("A", 0, "result")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const stepEvent = events.find(e => e.type === "compensation:step");
    expect(stepEvent).toBeDefined();
    if (stepEvent && stepEvent.type === "compensation:step") {
      expect(stepEvent.success).toBe(true);
      expect(stepEvent.error).toBeUndefined();
    }
  });

  it("emits compensation:step with success=false and error for failed compensation", async () => {
    const steps = [makeStep("A", 0, "result")];
    const { invoker } = failingInvoker(new Set(["A"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const stepEvent = events.find(e => e.type === "compensation:step");
    expect(stepEvent).toBeDefined();
    if (stepEvent && stepEvent.type === "compensation:step") {
      expect(stepEvent.success).toBe(false);
      expect(stepEvent.error).toBeInstanceOf(Error);
    }
  });

  it("emits compensation:step with correct executionId and sagaName", async () => {
    const steps = [makeStep("A", 0, "result")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
        executionId: "exec-99",
        sagaName: "OrderSaga",
      })
    );

    const stepEvent = events.find(e => e.type === "compensation:step");
    expect(stepEvent).toBeDefined();
    if (stepEvent && stepEvent.type === "compensation:step") {
      expect(stepEvent.executionId).toBe("exec-99");
      expect(stepEvent.sagaName).toBe("OrderSaga");
    }
  });

  it("emits compensation:step with durationMs >= 0", async () => {
    const steps = [makeStep("A", 0, "result")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const stepEvent = events.find(e => e.type === "compensation:step");
    expect(stepEvent).toBeDefined();
    if (stepEvent && stepEvent.type === "compensation:step") {
      expect(stepEvent.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("emits compensation:step with a valid timestamp", async () => {
    const before = Date.now();
    const steps = [makeStep("A", 0, "result")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const after = Date.now();
    const stepEvent = events.find(e => e.type === "compensation:step");
    expect(stepEvent).toBeDefined();
    if (stepEvent) {
      expect(stepEvent.timestamp).toBeGreaterThanOrEqual(before);
      expect(stepEvent.timestamp).toBeLessThanOrEqual(after);
    }
  });
});

// =============================================================================
// emitCompensationCompleted - type string, totalDurationMs mutations
// =============================================================================

describe("emitCompensationCompleted mutations", () => {
  it("emits compensation:completed with correct type string on full success", async () => {
    const steps = [makeStep("A", 0, "result"), makeStep("B", 1, "result")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const completedEvent = events.find(e => e.type === "compensation:completed");
    expect(completedEvent).toBeDefined();
    expect(completedEvent!.type).toBe("compensation:completed");
  });

  it("includes compensatedSteps in completed event", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const completedEvent = events.find(e => e.type === "compensation:completed");
    expect(completedEvent).toBeDefined();
    if (completedEvent && completedEvent.type === "compensation:completed") {
      expect(completedEvent.compensatedSteps).toEqual(["B", "A"]);
    }
  });

  it("totalDurationMs is a non-negative number (not Date.now() + startTime)", async () => {
    const steps = [makeStep("A", 0, "r")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const completedEvent = events.find(e => e.type === "compensation:completed");
    expect(completedEvent).toBeDefined();
    if (completedEvent && completedEvent.type === "compensation:completed") {
      // If mutated to Date.now() + startTime, this would be a huge number (> 2 * Date.now())
      expect(completedEvent.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(completedEvent.totalDurationMs).toBeLessThan(5000);
    }
  });

  it("does not emit compensation:completed on failure", async () => {
    const steps = [makeStep("A", 0, "r")];
    const { invoker } = failingInvoker(new Set(["A"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const completedEvent = events.find(e => e.type === "compensation:completed");
    expect(completedEvent).toBeUndefined();
  });

  it("completed event has correct executionId and sagaName", async () => {
    const steps = [makeStep("A", 0, "r")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
        executionId: "exec-comp-1",
        sagaName: "MySaga",
      })
    );

    const completedEvent = events.find(e => e.type === "compensation:completed");
    expect(completedEvent).toBeDefined();
    if (completedEvent) {
      expect(completedEvent.executionId).toBe("exec-comp-1");
      expect(completedEvent.sagaName).toBe("MySaga");
    }
  });
});

// =============================================================================
// emitCompensationFailed - type string, field mutations
// =============================================================================

describe("emitCompensationFailed mutations", () => {
  it("emits compensation:failed with correct type string", async () => {
    const steps = [makeStep("A", 0, "r")];
    const { invoker } = failingInvoker(new Set(["A"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    expect(failedEvent!.type).toBe("compensation:failed");
  });

  it("emits compensation:failed with correct failedCompensationStep", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    // B fails (it runs first in reverse order)
    const { invoker } = failingInvoker(new Set(["B"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      expect(failedEvent.failedCompensationStep).toBe("B");
    }
  });

  it("emits compensation:failed with the error from the failed step", async () => {
    const steps = [makeStep("A", 0, "r")];
    const { invoker } = failingInvoker(new Set(["A"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      expect(failedEvent.error).toBeInstanceOf(Error);
    }
  });

  it("emits compensation:failed with compensatedSteps and remainingSteps", async () => {
    // A, B, C in forward order. Reverse = C, B, A. B fails -> compensated=[C], remaining=[A]
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r"), makeStep("C", 2, "r")];
    const { invoker } = failingInvoker(new Set(["B"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      expect(failedEvent.compensatedSteps).toEqual(["C"]);
      expect(failedEvent.remainingSteps).toEqual(["A"]);
    }
  });

  it("emits compensation:failed with correct executionId and sagaName", async () => {
    const steps = [makeStep("A", 0, "r")];
    const { invoker } = failingInvoker(new Set(["A"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
        executionId: "exec-fail-1",
        sagaName: "FailingSaga",
      })
    );

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent) {
      expect(failedEvent.executionId).toBe("exec-fail-1");
      expect(failedEvent.sagaName).toBe("FailingSaga");
    }
  });
});

// =============================================================================
// executeSequential - reverse order, slice, break, allSucceeded
// =============================================================================

describe("executeSequential mutations", () => {
  it("reverses step order for execution (kills [...steps] without .reverse())", async () => {
    const steps = [
      makeStep("First", 0, "r"),
      makeStep("Second", 1, "r"),
      makeStep("Third", 2, "r"),
    ];
    const { invoker, calls } = successInvoker();

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
      })
    );

    expect(calls).toEqual(["Third", "Second", "First"]);
  });

  it("stops on first invoker failure (kills break removal)", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r"), makeStep("C", 2, "r")];
    // Reverse: C, B, A. B fails -> A should NOT be attempted
    const { invoker, calls } = failingInvoker(new Set(["B"]));

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
      })
    );

    expect(calls).toEqual(["C", "B"]);
    expect(result.compensatedSteps).toEqual(["C"]);
    expect(result.failedSteps).toEqual(["B"]);
  });

  it("stops on first compensateFn throw (kills break removal in paramsResult.isErr branch)", async () => {
    const steps = [
      makeStep("A", 0, "r"),
      makeStep("B", 1, "r", () => {
        throw new Error("B-throw");
      }),
      makeStep("C", 2, "r"),
    ];
    // Reverse: C, B, A. B throws in compensateFn -> A should NOT be attempted
    const { invoker, calls } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
      })
    );

    // C succeeds (invoker called), B throws in compensateFn (invoker NOT called for B), A never reached
    expect(calls).toEqual(["C"]);
    expect(result.compensatedSteps).toEqual(["C"]);
    expect(result.failedSteps).toEqual(["B"]);
  });

  it("remaining steps in failed event uses slice(i+1) not slice(i-1)", async () => {
    // A(0), B(1), C(2), D(3). Reverse = D, C, B, A. If C fails (i=1), remaining = [B, A]
    const steps = [
      makeStep("A", 0, "r"),
      makeStep("B", 1, "r"),
      makeStep("C", 2, "r"),
      makeStep("D", 3, "r"),
    ];
    const { invoker } = failingInvoker(new Set(["C"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      // Remaining after C (at reverse index 1): [B, A]
      expect(failedEvent.remainingSteps).toEqual(["B", "A"]);
    }
  });

  it("allSucceeded is true only when failedSteps.length === 0 (kills === 1 mutation)", async () => {
    const steps = [makeStep("A", 0, "r")];
    const { invoker } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
      })
    );

    expect(result.allSucceeded).toBe(true);
    expect(result.failedSteps).toHaveLength(0);
  });

  it("allSucceeded is false when there is exactly one failure (kills === 1 mutation)", async () => {
    const steps = [makeStep("A", 0, "r")];
    const { invoker } = failingInvoker(new Set(["A"]));

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
      })
    );

    expect(result.allSucceeded).toBe(false);
    expect(result.failedSteps).toHaveLength(1);
  });

  it("emits compensation:completed only when failedSteps.length === 0", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const completedEvents = events.filter(e => e.type === "compensation:completed");
    expect(completedEvents).toHaveLength(1);
  });

  it("errors array captures stepIndex from the failing step", async () => {
    const steps = [makeStep("A", 3, "r")];
    const { invoker } = failingInvoker(new Set(["A"]));

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
      })
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].stepName).toBe("A");
    expect(result.errors[0].stepIndex).toBe(3);
  });
});

// =============================================================================
// executeParallel - firstFailedStep undefined check, allSucceeded
// =============================================================================

describe("executeParallel mutations", () => {
  it("runs all compensations (not in reverse order)", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r"), makeStep("C", 2, "r")];
    const { invoker, calls } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
      })
    );

    expect(result.allSucceeded).toBe(true);
    expect(result.compensatedSteps).toHaveLength(3);
    // Parallel runs in original order (Promise.all preserves map order)
    expect(calls).toContain("A");
    expect(calls).toContain("B");
    expect(calls).toContain("C");
  });

  it("collects all failures without stopping", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r"), makeStep("C", 2, "r")];
    const { invoker } = failingInvoker(new Set(["A", "C"]));

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
      })
    );

    expect(result.allSucceeded).toBe(false);
    expect(result.compensatedSteps).toEqual(["B"]);
    expect(result.failedSteps).toContain("A");
    expect(result.failedSteps).toContain("C");
    expect(result.errors).toHaveLength(2);
  });

  it("emits compensation:failed with firstFailedStep name (not empty string)", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker } = failingInvoker(new Set(["A"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      expect(failedEvent.failedCompensationStep).toBe("A");
      expect(failedEvent.failedCompensationStep).not.toBe("");
    }
  });

  it("firstFailedStep is the first failing step in iteration order", async () => {
    // Both B and C fail, but B comes first in the outcomes array
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r"), makeStep("C", 2, "r")];
    const { invoker } = failingInvoker(new Set(["B", "C"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      expect(failedEvent.failedCompensationStep).toBe("B");
    }
  });

  it("allSucceeded is true when all parallel compensations succeed", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
      })
    );

    expect(result.allSucceeded).toBe(true);
  });

  it("allSucceeded is false when any parallel compensation fails", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker } = failingInvoker(new Set(["B"]));

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
      })
    );

    expect(result.allSucceeded).toBe(false);
  });

  it("emits compensation:completed when all parallel succeed", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const completed = events.find(e => e.type === "compensation:completed");
    expect(completed).toBeDefined();
    const failed = events.find(e => e.type === "compensation:failed");
    expect(failed).toBeUndefined();
  });

  it("emits compensation:step events for each parallel step", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r"), makeStep("C", 2, "r")];
    const { invoker } = failingInvoker(new Set(["B"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const stepEvents = events.filter(e => e.type === "compensation:step");
    expect(stepEvents).toHaveLength(3);
  });

  it("parallel handles compensateFn that throws", async () => {
    const steps = [
      makeStep("A", 0, "r"),
      makeStep("B", 1, "r", () => {
        throw new Error("B-throw");
      }),
    ];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    expect(result.allSucceeded).toBe(false);
    expect(result.failedSteps).toContain("B");
    expect(result.compensatedSteps).toContain("A");
  });

  it("parallel emits compensation:failed with empty remainingSteps", async () => {
    const steps = [makeStep("A", 0, "r")];
    const { invoker } = failingInvoker(new Set(["A"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      expect(failedEvent.remainingSteps).toEqual([]);
    }
  });
});

// =============================================================================
// executeBestEffort - continues past failure, reversed order, firstFailedStep
// =============================================================================

describe("executeBestEffort mutations", () => {
  it("executes in reverse order (kills [...steps] without .reverse())", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r"), makeStep("C", 2, "r")];
    const { invoker, calls } = successInvoker();

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
      })
    );

    expect(calls).toEqual(["C", "B", "A"]);
  });

  it("continues past failure (distinguishes from sequential)", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r"), makeStep("C", 2, "r")];
    // Reverse: C, B, A. B fails but best-effort continues to A
    const { invoker, calls } = failingInvoker(new Set(["B"]));

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
      })
    );

    expect(calls).toEqual(["C", "B", "A"]);
    expect(result.compensatedSteps).toEqual(["C", "A"]);
    expect(result.failedSteps).toEqual(["B"]);
  });

  it("continues past compensateFn throw (unlike sequential)", async () => {
    const steps = [
      makeStep("A", 0, "r"),
      makeStep("B", 1, "r", () => {
        throw new Error("B-throw");
      }),
      makeStep("C", 2, "r"),
    ];
    // Reverse: C, B, A. B throws in compensateFn but best-effort continues
    const { invoker, calls } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
      })
    );

    // C and A go through invoker, B throws in compensateFn so invoker is never called for B
    expect(calls).toEqual(["C", "A"]);
    expect(result.compensatedSteps).toEqual(["C", "A"]);
    expect(result.failedSteps).toEqual(["B"]);
  });

  it("firstFailedStep is the first (in reverse order) to fail, not empty", async () => {
    // Reverse: C, B, A. B fails first, then A fails.
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r"), makeStep("C", 2, "r")];
    const { invoker } = failingInvoker(new Set(["B", "A"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      expect(failedEvent.failedCompensationStep).toBe("B");
      expect(failedEvent.failedCompensationStep).not.toBe("");
    }
  });

  it("allSucceeded is true when best-effort has no failures", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
      })
    );

    expect(result.allSucceeded).toBe(true);
    expect(result.failedSteps).toHaveLength(0);
  });

  it("allSucceeded is false when best-effort has any failure", async () => {
    const steps = [makeStep("A", 0, "r")];
    const { invoker } = failingInvoker(new Set(["A"]));

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
      })
    );

    expect(result.allSucceeded).toBe(false);
  });

  it("emits compensation:completed for best-effort with all successes", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const completed = events.find(e => e.type === "compensation:completed");
    expect(completed).toBeDefined();
    if (completed && completed.type === "compensation:completed") {
      expect(completed.compensatedSteps).toEqual(["B", "A"]);
    }
  });

  it("emits compensation:failed (not completed) for best-effort with failures", async () => {
    const steps = [makeStep("A", 0, "r")];
    const { invoker } = failingInvoker(new Set(["A"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const completed = events.find(e => e.type === "compensation:completed");
    expect(completed).toBeUndefined();

    const failed = events.find(e => e.type === "compensation:failed");
    expect(failed).toBeDefined();
  });

  it("best-effort emits compensation:failed with empty remainingSteps", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker } = failingInvoker(new Set(["A"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      expect(failedEvent.remainingSteps).toEqual([]);
    }
  });

  it("errors array includes stepIndex from each failed step", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 3, "r"), makeStep("C", 5, "r")];
    // Reverse: C(5), B(3), A(0). B and A fail.
    const { invoker } = failingInvoker(new Set(["B", "A"]));

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
      })
    );

    expect(result.errors).toHaveLength(2);
    const errorsByName = new Map(result.errors.map(e => [e.stepName, e]));
    expect(errorsByName.get("B")!.stepIndex).toBe(3);
    expect(errorsByName.get("A")!.stepIndex).toBe(0);
  });
});

// =============================================================================
// executeCompensation - filter, length check, empty return, strategy switch
// =============================================================================

describe("executeCompensation entry point mutations", () => {
  it("filters out steps with null compensateFn (kills !== null -> === null)", async () => {
    const steps = [
      makeStep("A", 0, "r"),
      makeNullCompensateStep("B", 1, "r"),
      makeStep("C", 2, "r"),
    ];
    const { invoker, calls } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
      })
    );

    expect(result.allSucceeded).toBe(true);
    // Only A and C should be compensated (B has null compensateFn)
    expect(calls).toContain("A");
    expect(calls).toContain("C");
    expect(calls).not.toContain("B");
    expect(result.compensatedSteps).toHaveLength(2);
  });

  it("returns allSucceeded: true for empty plan (no completed steps)", async () => {
    const { invoker } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: [], strategy: "sequential" },
        invoker,
      })
    );

    expect(result.allSucceeded).toBe(true);
    expect(result.compensatedSteps).toEqual([]);
    expect(result.failedSteps).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("returns allSucceeded: true when all steps have null compensateFn (empty after filter)", async () => {
    const steps = [makeNullCompensateStep("A", 0, "r"), makeNullCompensateStep("B", 1, "r")];
    const { invoker, calls } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
      })
    );

    expect(result.allSucceeded).toBe(true);
    expect(result.compensatedSteps).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("routes to sequential strategy correctly", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker, calls } = successInvoker();

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
      })
    );

    // Sequential reverses order
    expect(calls).toEqual(["B", "A"]);
  });

  it("routes to parallel strategy correctly", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker, calls } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
      })
    );

    // Parallel runs all (preserves original order in Promise.all)
    expect(result.compensatedSteps).toHaveLength(2);
    expect(calls).toHaveLength(2);
  });

  it("routes to best-effort strategy correctly", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker, calls } = failingInvoker(new Set(["B"]));

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
      })
    );

    // Best-effort reverses and continues past failure
    expect(calls).toEqual(["B", "A"]);
    expect(result.compensatedSteps).toEqual(["A"]);
    expect(result.failedSteps).toEqual(["B"]);
  });
});

// =============================================================================
// Cross-strategy event emission integrity
// =============================================================================

describe("cross-strategy event integrity", () => {
  it("sequential emits step events for each attempted step", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r"), makeStep("C", 2, "r")];
    const { invoker } = failingInvoker(new Set(["B"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const stepEvents = events.filter(e => e.type === "compensation:step");
    // Reverse: C(success), B(fail), A(never attempted)
    expect(stepEvents).toHaveLength(2);
  });

  it("best-effort emits step events for ALL steps even with failures", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r"), makeStep("C", 2, "r")];
    const { invoker } = failingInvoker(new Set(["B"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const stepEvents = events.filter(e => e.type === "compensation:step");
    // All 3 attempted: C(success), B(fail), A(success)
    expect(stepEvents).toHaveLength(3);
  });

  it("parallel does not emit compensation:completed when there are failures", async () => {
    const steps = [makeStep("A", 0, "r"), makeStep("B", 1, "r")];
    const { invoker } = failingInvoker(new Set(["A"]));
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "parallel" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const completed = events.filter(e => e.type === "compensation:completed");
    const failed = events.filter(e => e.type === "compensation:failed");
    expect(completed).toHaveLength(0);
    expect(failed).toHaveLength(1);
  });

  it("no events emitted for empty plan", async () => {
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: [], strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    expect(events).toHaveLength(0);
  });
});

// =============================================================================
// Context passing across strategies
// =============================================================================

describe("context passing for all strategies", () => {
  for (const strategy of ["sequential", "parallel", "best-effort"] as const) {
    it(`${strategy}: passes all context fields to compensateFn`, async () => {
      const capturedCtxs: Array<Record<string, unknown>> = [];
      const sagaInput = { user: "alice" };
      const accResults = { Validate: { ok: true } };
      const origError = new Error("trigger-error");
      const stepResult = { booking: "b-1" };

      const step = makeStep("Reserve", 2, stepResult, ctx => {
        capturedCtxs.push({
          input: ctx.input,
          results: ctx.results,
          stepResult: ctx.stepResult,
          error: ctx.error,
          failedStepIndex: ctx.failedStepIndex,
          failedStepName: ctx.failedStepName,
          stepIndex: ctx.stepIndex,
          executionId: ctx.executionId,
        });
        return {};
      });

      const { invoker } = successInvoker();

      await executeCompensation(
        makeInput({
          plan: { completedSteps: [step], strategy },
          invoker,
          sagaInput,
          accumulatedResults: accResults,
          originalError: origError,
          failedStepIndex: 5,
          failedStepName: "Charge",
          executionId: "exec-ctx-test",
        })
      );

      expect(capturedCtxs).toHaveLength(1);
      const ctx = capturedCtxs[0];
      expect(ctx.input).toBe(sagaInput);
      expect(ctx.results).toBe(accResults);
      expect(ctx.stepResult).toBe(stepResult);
      expect(ctx.error).toBe(origError);
      expect(ctx.failedStepIndex).toBe(5);
      expect(ctx.failedStepName).toBe("Charge");
      expect(ctx.stepIndex).toBe(2);
      expect(ctx.executionId).toBe("exec-ctx-test");
    });
  }
});

// =============================================================================
// Edge: compensateFn returns value passed to invoker
// =============================================================================

describe("compensateFn return value is passed to invoker as params", () => {
  it("invoker receives the value returned by compensateFn", async () => {
    let receivedParams: unknown;
    const step = makeStep("A", 0, "result-a", ctx => ({
      undo: ctx.stepResult,
      marker: "special",
    }));

    const invoker: CompensationInvoker = (s, params) => {
      receivedParams = params;
      return ResultAsync.ok(undefined);
    };

    await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
      })
    );

    expect(receivedParams).toEqual({ undo: "result-a", marker: "special" });
  });
});

// =============================================================================
// Sequential: paramsResult error path records correct error fields
// =============================================================================

describe("sequential compensateFn throw error reporting", () => {
  it("records stepName and stepIndex in errors array when compensateFn throws", async () => {
    const step = makeStep("Reserve", 4, "result", () => {
      throw new Error("compensate-boom");
    });
    const { invoker } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
      })
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].stepName).toBe("Reserve");
    expect(result.errors[0].stepIndex).toBe(4);
    expect(result.errors[0].cause).toBeInstanceOf(Error);
    expect((result.errors[0].cause as Error).message).toBe("compensate-boom");
  });

  it("emits compensation:step with success=false and then compensation:failed", async () => {
    const step = makeStep("X", 1, "r", () => {
      throw new Error("throw");
    });
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: [step], strategy: "sequential" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const stepEvent = events.find(e => e.type === "compensation:step");
    expect(stepEvent).toBeDefined();
    if (stepEvent && stepEvent.type === "compensation:step") {
      expect(stepEvent.success).toBe(false);
      expect(stepEvent.stepName).toBe("X");
      expect(stepEvent.stepIndex).toBe(1);
    }

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      expect(failedEvent.failedCompensationStep).toBe("X");
    }
  });
});

// =============================================================================
// Best-effort: compensateFn throw records error and continues
// =============================================================================

describe("best-effort compensateFn throw error reporting", () => {
  it("records error from compensateFn throw and continues to next step", async () => {
    const steps = [
      makeStep("A", 0, "r"),
      makeStep("B", 1, "r", () => {
        throw new Error("B-compensate-throw");
      }),
      makeStep("C", 2, "r"),
    ];
    const { invoker, calls } = successInvoker();

    const result = await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
      })
    );

    // C and A succeed, B throws in compensateFn
    expect(calls).toEqual(["C", "A"]);
    expect(result.failedSteps).toEqual(["B"]);
    expect(result.compensatedSteps).toEqual(["C", "A"]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].stepName).toBe("B");
    expect(result.errors[0].stepIndex).toBe(1);
    expect((result.errors[0].cause as Error).message).toBe("B-compensate-throw");
  });

  it("firstFailedStep from compensateFn throw is used in failed event", async () => {
    const steps = [
      makeStep("A", 0, "r"),
      makeStep("B", 1, "r", () => {
        throw new Error("B-throw");
      }),
      makeStep("C", 2, "r"),
    ];
    const { invoker } = successInvoker();
    const events: SagaEvent[] = [];

    await executeCompensation(
      makeInput({
        plan: { completedSteps: steps, strategy: "best-effort" },
        invoker,
        emitEvent: collectEvents(events),
      })
    );

    const failedEvent = events.find(e => e.type === "compensation:failed");
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === "compensation:failed") {
      expect(failedEvent.failedCompensationStep).toBe("B");
    }
  });
});
