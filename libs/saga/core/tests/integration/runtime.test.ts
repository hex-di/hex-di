/**
 * Integration Tests: Runtime (DOD 6)
 *
 * Tests SagaRunner integration with container and adapters:
 * 3-step execution, scoped step port resolution, scope disposal
 * cancellation, and full container+adapter execution.
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../../src/step/builder.js";
import { defineSaga } from "../../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../../src/runtime/runner.js";
import type { PortResolver } from "../../src/runtime/types.js";

// =============================================================================
// Test Setup
// =============================================================================

const StepAPort = createPort<"StepA", any>({ name: "StepA" });
const StepBPort = createPort<"StepB", any>({ name: "StepB" });
const StepCPort = createPort<"StepC", any>({ name: "StepC" });

const StepA = defineStep("StepA")
  .io<{ value: string }, { a: string }>()
  .invoke(StepAPort, ctx => ctx.input)
  .compensate(ctx => ({ undo: ctx.stepResult.a }))
  .build();

const StepB = defineStep("StepB")
  .io<{ value: string }, { b: string }>()
  .invoke(StepBPort, ctx => ctx.input)
  .compensate(ctx => ({ undo: ctx.stepResult.b }))
  .build();

const StepC = defineStep("StepC")
  .io<{ value: string }, { c: string }>()
  .invoke(StepCPort, ctx => ctx.input)
  .build();

const ThreeStepSaga = defineSaga("ThreeStepSaga")
  .input<{ value: string }>()
  .step(StepA)
  .step(StepB)
  .step(StepC)
  .output(r => ({
    a: r.StepA.a,
    b: r.StepB.b,
    c: r.StepC.c,
  }))
  .build();

// =============================================================================
// Tests (DOD 6)
// =============================================================================

describe("Runtime Integration", () => {
  it("SagaRunner resolves from container and executes 3-step saga", async () => {
    const executionLog: string[] = [];

    const resolver: PortResolver = {
      resolve(portName: string) {
        return (params: any) => {
          if (params?.undo) return Promise.resolve();
          executionLog.push(portName);
          const key = portName.replace("Step", "").toLowerCase();
          return Promise.resolve({ [key]: `${key}-result` });
        };
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, ThreeStepSaga, { value: "test" });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output).toEqual({
        a: "a-result",
        b: "b-result",
        c: "c-result",
      });
      expect(result.value.executionId).toBeTruthy();
    }

    expect(executionLog).toEqual(["StepA", "StepB", "StepC"]);
  });

  it("scoped step ports resolved within execution scope", async () => {
    // Each call to resolve creates a unique scope-qualified adapter
    const resolvedPorts: string[] = [];

    const resolver: PortResolver = {
      resolve(portName: string) {
        resolvedPorts.push(portName);
        return () => {
          const key = portName.replace("Step", "").toLowerCase();
          return Promise.resolve({ [key]: `scoped-${key}` });
        };
      },
    };

    const runner = createSagaRunner(resolver);

    // Execute two sagas concurrently — each should resolve ports independently
    const [r1, r2] = await Promise.all([
      executeSaga(runner, ThreeStepSaga, { value: "s1" }),
      executeSaga(runner, ThreeStepSaga, { value: "s2" }),
    ]);

    expect(r1.isOk()).toBe(true);
    expect(r2.isOk()).toBe(true);

    // Each execution resolved 3 ports = 6 total
    expect(resolvedPorts).toHaveLength(6);

    // Results are identical (same resolver logic)
    if (r1.isOk() && r2.isOk()) {
      expect(r1.value.output.a).toBe("scoped-a");
      expect(r2.value.output.a).toBe("scoped-a");
      // Different execution IDs
      expect(r1.value.executionId).not.toBe(r2.value.executionId);
    }
  });

  it("scope disposal while saga running cancels execution via AbortSignal", async () => {
    const abortController = new AbortController();

    const resolver: PortResolver = {
      resolve() {
        return () =>
          new Promise(resolve => setTimeout(() => resolve({ a: "1", b: "2", c: "3" }), 500));
      },
    };

    const runner = createSagaRunner(resolver);
    const resultPromise = executeSaga(
      runner,
      ThreeStepSaga,
      { value: "cancel" },
      {
        signal: abortController.signal,
      }
    );

    // Simulate scope disposal by aborting after a short delay
    await new Promise(resolve => setTimeout(resolve, 20));
    abortController.abort();

    const result = await resultPromise;
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("Cancelled");
    }
  });

  it("execution with real container-like resolver and real adapters (test-scoped)", async () => {
    // Simulate a container-like resolver that provides adapters per port
    const adapters: Record<string, (input: unknown) => Promise<unknown>> = {
      StepA: input => Promise.resolve({ a: `validated-${(input as { value: string }).value}` }),
      StepB: input => Promise.resolve({ b: `reserved-${(input as { value: string }).value}` }),
      StepC: input => Promise.resolve({ c: `charged-${(input as { value: string }).value}` }),
    };

    const resolver: PortResolver = {
      resolve(portName: string) {
        const adapter = adapters[portName];
        if (!adapter) throw new Error(`Port not found: ${portName}`);
        return (params: unknown) => {
          // Handle compensation calls
          if (typeof params === "object" && params !== null && "undo" in params) {
            return Promise.resolve();
          }
          return adapter(params);
        };
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, ThreeStepSaga, { value: "order-42" });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.output.a).toBe("validated-order-42");
      expect(result.value.output.b).toBe("reserved-order-42");
      expect(result.value.output.c).toBe("charged-order-42");
    }
  });
});
