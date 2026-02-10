import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { defineStep } from "../../src/step/builder.js";
import { defineSaga } from "../../src/saga/builder.js";
import { createSagaRunner, executeSaga } from "../../src/runtime/runner.js";
import type { PortResolver } from "../../src/runtime/types.js";

// =============================================================================
// Test Ports
// =============================================================================

const Port1 = createPort<"Port1", any>({ name: "Port1" });
const Port2 = createPort<"Port2", any>({ name: "Port2" });
const Port3 = createPort<"Port3", any>({ name: "Port3" });
const Port4 = createPort<"Port4", any>({ name: "Port4" });
const Port5 = createPort<"Port5", any>({ name: "Port5" });

// =============================================================================
// E2E Tests (DOD 5: Compensation E2E)
// =============================================================================

describe("compensation e2e", () => {
  it("3-step saga: step 3 fails -> steps 2 and 1 compensated in order", async () => {
    const compensationOrder: string[] = [];

    const Step1 = defineStep("Step1")
      .io<string, { id: string }>()
      .invoke(Port1, ctx => ctx.input)
      .compensate(ctx => {
        compensationOrder.push("Step1");
        return { undo: ctx.stepResult.id };
      })
      .build();

    const Step2 = defineStep("Step2")
      .io<string, { id: string }>()
      .invoke(Port2, ctx => ctx.input)
      .compensate(ctx => {
        compensationOrder.push("Step2");
        return { undo: ctx.stepResult.id };
      })
      .build();

    const Step3 = defineStep("Step3")
      .io<string, { id: string }>()
      .invoke(Port3, ctx => ctx.input)
      .build();

    const saga = defineSaga("ThreeStep")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .step(Step3)
      .output(() => ({}))
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        if (portName === "Port1") {
          return (params: unknown) => {
            if (typeof params === "object" && params !== null && "undo" in params) {
              return Promise.resolve();
            }
            return Promise.resolve({ id: "s1" });
          };
        }
        if (portName === "Port2") {
          return (params: unknown) => {
            if (typeof params === "object" && params !== null && "undo" in params) {
              return Promise.resolve();
            }
            return Promise.resolve({ id: "s2" });
          };
        }
        if (portName === "Port3") {
          return () => Promise.reject(new Error("Step3 failed"));
        }
        throw new Error(`Port not found: ${portName}`);
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("StepFailed");
      expect(result.error.stepName).toBe("Step3");
    }
    // Compensation runs in reverse: Step2 first, then Step1
    expect(compensationOrder).toEqual(["Step2", "Step1"]);
  });

  it("5-step saga: step 3 fails -> steps 2 and 1 compensated, 3-5 untouched", async () => {
    const executedSteps: string[] = [];
    const compensatedSteps: string[] = [];

    function makeStep<TName extends string>(name: TName, port: any, _shouldFail = false) {
      return defineStep(name)
        .io<string, { name: string }>()
        .invoke(port, ctx => ctx.input)
        .compensate(() => {
          compensatedSteps.push(name);
          return { undo: name };
        })
        .build();
    }

    const s1 = makeStep("S1", Port1);
    const s2 = makeStep("S2", Port2);
    const s3 = makeStep("S3", Port3);
    const s4 = makeStep("S4", Port4);
    const s5 = makeStep("S5", Port5);

    const saga = defineSaga("FiveStep")
      .input<string>()
      .step(s1)
      .step(s2)
      .step(s3)
      .step(s4)
      .step(s5)
      .output(() => ({}))
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        return (params: unknown) => {
          if (typeof params === "object" && params !== null && "undo" in params) {
            return Promise.resolve();
          }
          executedSteps.push(portName);
          if (portName === "Port3") {
            return Promise.reject(new Error("S3 fails"));
          }
          return Promise.resolve({ name: portName });
        };
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    // Only Port1, Port2, Port3 were attempted; Port4, Port5 were not
    expect(executedSteps).toEqual(["Port1", "Port2", "Port3"]);
    // Compensation for S2 and S1 (reverse order), S3 has no successful result
    expect(compensatedSteps).toEqual(["S2", "S1"]);
  });

  it("sequential strategy with handler failure: partial compensation reported", async () => {
    const Step1 = defineStep("Step1")
      .io<string, string>()
      .invoke(Port1, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step2 = defineStep("Step2")
      .io<string, string>()
      .invoke(Port2, ctx => ctx.input)
      .compensate(() => ({ undo: true }))
      .build();

    const Step3 = defineStep("Step3")
      .io<string, string>()
      .invoke(Port3, ctx => ctx.input)
      .build();

    const saga = defineSaga("SeqFailSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .step(Step3)
      .output(() => ({}))
      .options({ compensationStrategy: "sequential" })
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        return (params: unknown) => {
          if (typeof params === "object" && params !== null && "undo" in params) {
            // Step2 compensation fails
            if (portName === "Port2") {
              return Promise.reject(new Error("comp fail"));
            }
            return Promise.resolve();
          }
          if (portName === "Port3") {
            return Promise.reject(new Error("step 3 fail"));
          }
          return Promise.resolve("result");
        };
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("CompensationFailed");
    }
  });

  it("best-effort strategy with handler failure: remaining steps still compensated", async () => {
    const compensated: string[] = [];

    const Step1 = defineStep("Step1")
      .io<string, string>()
      .invoke(Port1, ctx => ctx.input)
      .compensate(() => {
        compensated.push("Step1");
        return { undo: true };
      })
      .build();

    const Step2 = defineStep("Step2")
      .io<string, string>()
      .invoke(Port2, ctx => ctx.input)
      .compensate(() => {
        compensated.push("Step2");
        return { undo: true };
      })
      .build();

    const Step3 = defineStep("Step3")
      .io<string, string>()
      .invoke(Port3, ctx => ctx.input)
      .compensate(() => {
        compensated.push("Step3");
        return { undo: true };
      })
      .build();

    const Step4 = defineStep("Step4")
      .io<string, string>()
      .invoke(Port4, ctx => ctx.input)
      .build();

    const saga = defineSaga("BestEffortSaga")
      .input<string>()
      .step(Step1)
      .step(Step2)
      .step(Step3)
      .step(Step4)
      .output(() => ({}))
      .options({ compensationStrategy: "best-effort" })
      .build();

    const resolver: PortResolver = {
      resolve(portName: string) {
        return (params: unknown) => {
          if (typeof params === "object" && params !== null && "undo" in params) {
            // Step2 compensation fails
            if (portName === "Port2") {
              return Promise.reject(new Error("comp fail"));
            }
            return Promise.resolve();
          }
          if (portName === "Port4") {
            return Promise.reject(new Error("step 4 fail"));
          }
          return Promise.resolve("result");
        };
      },
    };

    const runner = createSagaRunner(resolver);
    const result = await executeSaga(runner, saga, "input");

    expect(result.isErr()).toBe(true);
    // Best-effort: all compensation steps attempted despite Step2 failure
    expect(compensated).toContain("Step3");
    expect(compensated).toContain("Step1");
  });
});
