import { describe, it, expect, vi } from "vitest";
import {
  ok,
  err,
  fromNullable,
  fromPredicate,
  all,
  allSettled,
  any,
  collect,
} from "@hex-di/result";
import {
  createInstrumentedResultModule,
  type ChainCompleteCallback,
  type ResultChainDescriptor,
  type ResultChainExecution,
  type ResultModule,
} from "../../src/sandbox/traced-result.js";
import { serializeValue } from "../../src/sandbox/worker-protocol.js";
import { PlaygroundInspectorBridge } from "../../src/adapter/playground-inspector-bridge.js";
import type { WorkerToMainMessage } from "../../src/sandbox/worker-protocol.js";

// =============================================================================
// Helpers
// =============================================================================

function createTestModule(): ResultModule {
  // Use the real @hex-di/result module — cast needed because the real
  // module includes many more exports that aren't relevant to instrumentation.
  const realModule = { ok, err, fromNullable, fromPredicate } as unknown as ResultModule;
  return realModule;
}

interface Emission {
  readonly descriptor: ResultChainDescriptor;
  readonly execution: ResultChainExecution;
}

function createCallback(): {
  callback: ChainCompleteCallback;
  emissions: Emission[];
} {
  const emissions: Emission[] = [];
  const callback: ChainCompleteCallback = (descriptor, execution) => {
    emissions.push({ descriptor, execution });
  };
  return { callback, emissions };
}

// =============================================================================
// Tests
// =============================================================================

describe("TracedResult chain emission pipeline", () => {
  it("fromNullable emits constructor-only chain; toJSON is transparent", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    const traced = (instrumented.fromNullable as Function)("Alice", () => "missing");
    expect(emissions).toHaveLength(1); // Proactive constructor-only emission

    // toJSON works for serialization but does NOT trigger a second emission
    const json = (traced as any).toJSON();
    expect(json).toEqual({ _tag: "Ok", value: "Alice" });
    expect(emissions).toHaveLength(1); // Still just the constructor emission

    // The constructor emission has the correct data
    const { descriptor, execution } = emissions[0];
    expect(descriptor.operations[0].method).toBe("fromNullable");
    expect(execution.entryMethod).toBe("fromNullable");
    expect(execution.entryTrack).toBe("ok");
    expect(execution.finalTrack).toBe("ok");
  });

  it("JSON.stringify(tracedResult) does not trigger additional emission", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    const traced = (instrumented.fromNullable as Function)("Alice", () => "missing");
    expect(emissions).toHaveLength(1); // Constructor-only

    // JSON.stringify calls .toJSON() — it should work but not emit
    const jsonString = JSON.stringify(traced);
    expect(jsonString).toBe('{"_tag":"Ok","value":"Alice"}');

    // Still just the constructor emission (toJSON is transparent)
    expect(emissions).toHaveLength(1);
  });

  it("serializeValue(tracedResult) serializes correctly without phantom toJSON emission", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    const traced = (instrumented.fromNullable as Function)("Alice", () => "missing");
    expect(emissions).toHaveLength(1); // Constructor-only

    // serializeValue calls JSON.stringify internally
    const serialized = serializeValue(traced);

    // No additional emission from toJSON
    expect(emissions).toHaveLength(1);

    // The serialized value should contain the JSON representation
    expect(serialized.type).toBe("object");
    expect(serialized.value).toContain('"_tag":"Ok"');
    expect(serialized.value).toContain('"Alice"');
  });

  it("bridge stores chain data from proactive constructor emission", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);
    const bridge = new PlaygroundInspectorBridge();

    // User code calls fromNullable — emits constructor-only chain immediately
    (instrumented.fromNullable as Function)("Alice", () => "missing");
    expect(emissions).toHaveLength(1);

    // Forward the constructor-only emission to the bridge
    const { descriptor, execution } = emissions[0];
    bridge.handleWorkerMessage({ type: "result-chain-registered", chain: descriptor });
    bridge.handleWorkerMessage({ type: "result-chain-executed", execution });

    // Bridge should have chain data even without any terminal method call
    const chains = bridge.getResultChains();
    expect(chains).toBeDefined();
    expect(chains!.size).toBe(1);

    const chain = chains!.values().next().value!;
    expect(chain.operations[0].method).toBe("fromNullable");

    const executions = bridge.getResultExecutions(chain.chainId);
    expect(executions).toBeDefined();
    expect(executions!.length).toBe(1);
    expect(executions![0].entryMethod).toBe("fromNullable");
    expect(executions![0].finalTrack).toBe("ok");
  });

  it("bridge emits events that a subscriber can observe", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);
    const bridge = new PlaygroundInspectorBridge();

    const events: Array<{ type: string }> = [];
    bridge.subscribe(event => {
      events.push(event);
    });

    // Trigger chain emission
    const traced = (instrumented.fromNullable as Function)("Alice", () => "missing");
    serializeValue(traced);

    // Forward messages to bridge
    const { descriptor, execution } = emissions[0];
    bridge.handleWorkerMessage({ type: "result-chain-registered", chain: descriptor });
    bridge.handleWorkerMessage({ type: "result-chain-executed", execution });

    // Subscriber should have been notified
    const chainEvents = events.filter(
      e => e.type === "chain-registered" || e.type === "execution-added"
    );
    expect(chainEvents).toHaveLength(2);
    expect(chainEvents[0].type).toBe("chain-registered");
    expect(chainEvents[1].type).toBe("execution-added");
  });

  it("multiple constructor calls each produce independent chains", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);
    const bridge = new PlaygroundInspectorBridge();

    // Simulate: user code with multiple Result constructors + console.log
    const traced1 = (instrumented.fromNullable as Function)("Alice", () => "missing");
    serializeValue(traced1); // toJSON is transparent, no extra emission

    const traced2 = (instrumented.ok as Function)(42);
    serializeValue(traced2); // toJSON is transparent, no extra emission

    const traced3 = (instrumented.err as Function)("failure");
    serializeValue(traced3); // toJSON is transparent, no extra emission

    // 3 constructor-only emissions (toJSON no longer emits)
    expect(emissions).toHaveLength(3);

    // Forward all messages to bridge
    for (const { descriptor, execution } of emissions) {
      bridge.handleWorkerMessage({ type: "result-chain-registered", chain: descriptor });
      bridge.handleWorkerMessage({ type: "result-chain-executed", execution });
    }

    const chains = bridge.getResultChains();
    expect(chains).toBeDefined();
    // Each constructor call gets a unique chainId, and initial/terminal
    // emissions share the same chainId, so exactly 3 distinct chains.
    expect(chains!.size).toBe(3);
  });

  it("chain emission data is structured-clone compatible (required for postMessage)", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    // Create a traced result with a chain (fromNullable → map → match)
    const traced = (instrumented.fromNullable as Function)("Alice", () => "missing");
    const mapped = (traced as any).map((v: string) => v.toUpperCase());
    const result = (mapped as any).match(
      (v: string) => `ok:${v}`,
      (e: string) => `err:${e}`
    );

    expect(result).toBe("ok:ALICE");
    // Constructor-only emission + terminal emission (at minimum)
    expect(emissions.length).toBeGreaterThanOrEqual(2);

    // Use the last emission which has the full chain
    const { descriptor, execution } = emissions[emissions.length - 1];

    // structuredClone should NOT throw — if it does, self.postMessage would fail
    const clonedDescriptor = structuredClone(descriptor);
    expect(clonedDescriptor.chainId).toBe(descriptor.chainId);
    expect(clonedDescriptor.operations).toHaveLength(descriptor.operations.length);

    const clonedExecution = structuredClone(execution);
    expect(clonedExecution.executionId).toBe(execution.executionId);
    expect(clonedExecution.steps).toHaveLength(execution.steps.length);
  });

  it("executor forwards chain messages to onMessage handler", async () => {
    const { SandboxExecutor } = await import("../../src/sandbox/executor.js");

    // Collect all messages that reach the onMessage handler
    const receivedMessages: WorkerToMainMessage[] = [];
    const onMessage = (msg: WorkerToMainMessage) => {
      receivedMessages.push(msg);
    };

    // Create a mock worker factory that simulates:
    // 1. worker-ready
    // 2. Chain messages (result-chain-registered, result-chain-executed)
    // 3. execution-complete
    const factory = () => {
      const messageListeners: Array<(event: MessageEvent) => void> = [];

      function postBack(data: WorkerToMainMessage): void {
        setTimeout(() => {
          for (const listener of messageListeners) {
            listener(new MessageEvent("message", { data }));
          }
        }, 0);
      }

      const worker: Worker = {
        postMessage(msg: unknown) {
          const message = msg as { type: string };
          if (message.type === "execute") {
            // Simulate: worker runs user code, console.log triggers toJSON,
            // which emits chain messages BEFORE execution-complete
            setTimeout(() => {
              postBack({
                type: "result-chain-registered",
                chain: {
                  chainId: "chain:test",
                  label: "fromNullable → toJSON",
                  portName: undefined,
                  operations: [
                    {
                      index: 0,
                      method: "fromNullable",
                      label: "fromNullable()",
                      inputTrack: "both",
                      outputTracks: ["ok", "err"],
                      canSwitch: true,
                      isTerminal: false,
                      callbackLocation: undefined,
                    },
                  ],
                  isAsync: false,
                  sourceLocation: undefined,
                },
              } as WorkerToMainMessage);

              postBack({
                type: "result-chain-executed",
                execution: {
                  executionId: "exec:1",
                  chainId: "chain:test",
                  entryMethod: "fromNullable",
                  entryTrack: "ok",
                  entryValue: { data: "Alice", typeName: "String", truncated: false },
                  steps: [],
                  finalTrack: "ok",
                  finalValue: { data: "Alice", typeName: "String", truncated: false },
                  totalDurationMicros: 100,
                  startTimestamp: Date.now(),
                  scopeId: undefined,
                },
              } as WorkerToMainMessage);

              // Then execution completes
              setTimeout(() => {
                postBack({ type: "execution-complete", success: true });
              }, 0);
            }, 0);
          }
        },
        terminate: vi.fn(),
        addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
          if (type === "message" && typeof listener === "function") {
            messageListeners.push(listener as (event: MessageEvent) => void);
          }
        },
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
        onmessage: null,
        onmessageerror: null,
        onerror: null,
      };

      // Send worker-ready
      setTimeout(() => {
        for (const listener of messageListeners) {
          listener(new MessageEvent("message", { data: { type: "worker-ready" } }));
        }
      }, 0);

      return worker;
    };

    vi.useFakeTimers();
    const executor = new SandboxExecutor("worker.js", factory);
    const resultPromise = executor.execute("test code", onMessage);
    await vi.advanceTimersByTimeAsync(50);

    const result = await resultPromise;
    expect(result.success).toBe(true);

    // The onMessage handler should have received chain messages
    const chainMessages = receivedMessages.filter(
      m => m.type === "result-chain-registered" || m.type === "result-chain-executed"
    );
    expect(chainMessages).toHaveLength(2);
    expect(chainMessages[0].type).toBe("result-chain-registered");
    expect(chainMessages[1].type).toBe("result-chain-executed");

    vi.useRealTimers();
  });
});

// =============================================================================
// Proactive chain emission — the better solution
// =============================================================================

describe("TracedResult proactive chain emission", () => {
  it("emits chain data at construction time even without terminal method calls", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    // User code creates a Result and never calls a terminal method
    (instrumented.fromNullable as Function)("Alice", () => "missing");

    // Chain data should STILL be emitted — constructor-only chains
    // are valuable for the Result Panel to show what Results exist
    expect(emissions).toHaveLength(1);
    expect(emissions[0].descriptor.operations[0].method).toBe("fromNullable");
    expect(emissions[0].execution.entryTrack).toBe("ok");
    expect(emissions[0].execution.finalTrack).toBe("ok");
  });

  it("emits chain data for ok() without terminal method", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    (instrumented.ok as Function)(42);

    expect(emissions).toHaveLength(1);
    expect(emissions[0].descriptor.operations[0].method).toBe("ok");
    expect(emissions[0].execution.entryTrack).toBe("ok");
  });

  it("emits chain data for err() without terminal method", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    (instrumented.err as Function)("failure");

    expect(emissions).toHaveLength(1);
    expect(emissions[0].descriptor.operations[0].method).toBe("err");
    expect(emissions[0].execution.entryTrack).toBe("err");
  });

  it("constructor-only emission includes the constructor step (not empty steps)", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    (instrumented.fromNullable as Function)("Alice", () => "missing");

    expect(emissions).toHaveLength(1);
    // The constructor-only emission must include the constructor step
    expect(emissions[0].execution.steps).toHaveLength(1);
    expect(emissions[0].execution.steps[0].operationIndex).toBe(0);
    expect(emissions[0].execution.steps[0].inputTrack).toBe("ok");
    expect(emissions[0].execution.steps[0].outputTrack).toBe("ok");
  });

  it("emits chain data for fromPredicate() (direct return, not higher-order)", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    // fromPredicate takes (value, predicate, onFalse) and returns Result directly
    const traced = (instrumented.fromPredicate as Function)(
      42,
      (v: number) => v > 0,
      () => "not positive"
    );

    expect(emissions).toHaveLength(1);
    expect(emissions[0].descriptor.operations[0].method).toBe("fromPredicate");
    expect(emissions[0].execution.entryTrack).toBe("ok");

    // Verify it's a TracedResult (supports chaining methods)
    const result = (traced as any).match(
      (v: number) => `ok:${v}`,
      (e: string) => `err:${e}`
    );
    expect(result).toBe("ok:42");
    expect(emissions).toHaveLength(2); // constructor + terminal
  });

  it("terminal method enriches emission with full chain steps", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    const traced = (instrumented.fromNullable as Function)("Alice", () => "missing");

    // First emission: constructor-only chain
    expect(emissions).toHaveLength(1);
    const constructorEmission = emissions[0];
    expect(constructorEmission.descriptor.operations).toHaveLength(1);

    // When a terminal method is called, it should produce a SECOND emission
    // with the full chain (constructor + terminal)
    (traced as any).match(
      (v: string) => v.toUpperCase(),
      (e: string) => e
    );

    expect(emissions).toHaveLength(2);
    const terminalEmission = emissions[1];
    expect(terminalEmission.descriptor.operations).toHaveLength(2);
    expect(terminalEmission.descriptor.operations[0].method).toBe("fromNullable");
    expect(terminalEmission.descriptor.operations[1].method).toBe("match");
  });

  it("two fromNullable calls produce distinct chainIds with correct execution data", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);
    const bridge = new PlaygroundInspectorBridge();

    // Call 1: fromNullable with non-null value → Ok("Alice")
    (instrumented.fromNullable as Function)("Alice", () => "missing");

    // Call 2: fromNullable with null → Err("email is missing")
    (instrumented.fromNullable as Function)(undefined, () => "email is missing");

    // 2 constructor-only emissions
    expect(emissions).toHaveLength(2);

    // Forward all emissions to bridge
    for (const { descriptor, execution } of emissions) {
      bridge.handleWorkerMessage({ type: "result-chain-registered", chain: descriptor });
      bridge.handleWorkerMessage({ type: "result-chain-executed", execution });
    }

    const chains = bridge.getResultChains();
    expect(chains).toBeDefined();

    // They must have DIFFERENT chainIds
    expect(emissions[0].descriptor.chainId).not.toBe(emissions[1].descriptor.chainId);

    // First call: Ok track
    expect(emissions[0].execution.finalTrack).toBe("ok");
    expect(emissions[0].execution.entryTrack).toBe("ok");

    // Second call: Err track
    expect(emissions[1].execution.finalTrack).toBe("err");
    expect(emissions[1].execution.entryTrack).toBe("err");

    // Bridge should have both chains accessible
    expect(chains!.size).toBe(2);
  });

  it("toJSON is transparent: serialization works but is not recorded as an operation", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    const traced = (instrumented.fromNullable as Function)("Alice", () => "missing");

    // toJSON still works for serialization (console.log path)
    const json = JSON.stringify(traced);
    expect(json).toContain("Alice");

    // But toJSON should NOT appear as an operation in any emission
    for (const { descriptor } of emissions) {
      for (const op of descriptor.operations) {
        expect(op.method).not.toBe("toJSON");
      }
    }
  });

  it("terminal emission includes a step trace for the constructor (operation 0)", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    const traced = (instrumented.fromNullable as Function)("Alice", () => "missing");
    // Use match (a real terminal) to trigger emitComplete
    (traced as any).match(
      (v: string) => v.toUpperCase(),
      (e: string) => e
    );

    // Get the terminal emission (last one with full chain)
    const terminal = emissions[emissions.length - 1];
    expect(terminal.descriptor.operations).toHaveLength(2);
    expect(terminal.descriptor.operations[0].method).toBe("fromNullable");
    expect(terminal.descriptor.operations[1].method).toBe("match");

    // Steps must match operations 1:1 — including the constructor at index 0
    expect(terminal.execution.steps).toHaveLength(2);
    expect(terminal.execution.steps[0].operationIndex).toBe(0);
    expect(terminal.execution.steps[1].operationIndex).toBe(1);

    // Constructor step should reflect the entry track and value
    const constructorStep = terminal.execution.steps[0];
    expect(constructorStep.inputTrack).toBe("ok");
    expect(constructorStep.outputTrack).toBe("ok");
    expect(constructorStep.switched).toBe(false);
    expect(constructorStep.durationMicros).toBe(0);
  });

  it("emitInitial and emitComplete use the same chainId for a single call", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    const traced = (instrumented.fromNullable as Function)("Alice", () => "missing");
    expect(emissions).toHaveLength(1); // constructor-only emission

    // Use match (a real terminal) to trigger emitComplete
    (traced as any).match(
      (v: string) => v.toUpperCase(),
      (e: string) => e
    );
    expect(emissions).toHaveLength(2); // constructor + terminal

    // Both emissions should share the same chainId
    expect(emissions[0].descriptor.chainId).toBe(emissions[1].descriptor.chainId);
  });

  it("chaining methods update the chain before terminal emission", () => {
    const realModule = createTestModule();
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    const traced = (instrumented.fromNullable as Function)("Alice", () => "missing");
    expect(emissions).toHaveLength(1); // constructor-only emission

    const mapped = (traced as any).map((v: string) => v.toUpperCase());
    // Chaining method produces a new TracedResult — also emits constructor-only
    // The mapped result is itself a constructor-only chain at this point

    const result = (mapped as any).match(
      (v: string) => `ok:${v}`,
      (e: string) => `err:${e}`
    );

    expect(result).toBe("ok:ALICE");

    // The final emission should have the full chain: fromNullable → map → match
    const fullChain = emissions[emissions.length - 1];
    expect(fullChain.descriptor.operations.map((op: any) => op.method)).toEqual([
      "fromNullable",
      "map",
      "match",
    ]);
  });
});

// =============================================================================
// Combinator instrumentation
// =============================================================================

describe("TracedResult combinator instrumentation", () => {
  it("all() emits a chain with combinator entry and structured input data", () => {
    const realModule = {
      ok,
      err,
      fromNullable,
      fromPredicate,
      all,
      allSettled,
      any,
      collect,
    } as unknown as ResultModule;
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    // Create individual Results through the instrumented module
    const r1 = (instrumented.ok as Function)(1);
    const r2 = (instrumented.ok as Function)(2);
    const r3 = (instrumented.err as Function)("fail");

    // Clear constructor-only emissions
    const before = emissions.length;

    // Call the instrumented all() combinator
    const combined = (instrumented.all as Function)(r1, r2, r3);

    // Should have new emissions beyond the constructor-only ones
    const combinatorEmissions = emissions.slice(before);
    expect(combinatorEmissions.length).toBeGreaterThanOrEqual(1);

    // The combinator emission should have "all" as entry method
    const combinatorEmission = combinatorEmissions[combinatorEmissions.length - 1];
    expect(combinatorEmission.descriptor.operations[0].method).toBe("all");

    // The combinator step should contain structured input data
    const step = combinatorEmission.execution.steps[0];
    expect(step.inputValue).toBeDefined();
    expect(Array.isArray(step.inputValue!.data)).toBe(true);

    const inputData = step.inputValue!.data as Array<Record<string, unknown>>;
    expect(inputData).toHaveLength(3);

    // Each input should have track and index
    expect(inputData[0]["track"]).toBe("ok");
    expect(inputData[0]["index"]).toBe(0);
    expect(inputData[1]["track"]).toBe("ok");
    expect(inputData[1]["index"]).toBe(1);
    expect(inputData[2]["track"]).toBe("err");
    expect(inputData[2]["index"]).toBe(2);

    // Output should be err (all short-circuits on first err)
    expect(combinatorEmission.execution.finalTrack).toBe("err");
  });

  it("collect() emits a chain with field names in input data", () => {
    const realModule = {
      ok,
      err,
      fromNullable,
      fromPredicate,
      all,
      allSettled,
      any,
      collect,
    } as unknown as ResultModule;
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    const r1 = (instrumented.ok as Function)("Alice");
    const r2 = (instrumented.ok as Function)(30);
    const before = emissions.length;

    // collect takes a record
    const combined = (instrumented.collect as Function)({ user: r1, age: r2 });

    const combinatorEmissions = emissions.slice(before);
    expect(combinatorEmissions.length).toBeGreaterThanOrEqual(1);

    const combinatorEmission = combinatorEmissions[combinatorEmissions.length - 1];
    expect(combinatorEmission.descriptor.operations[0].method).toBe("collect");

    const step = combinatorEmission.execution.steps[0];
    const inputData = step.inputValue!.data as Array<Record<string, unknown>>;
    expect(inputData).toHaveLength(2);

    // collect inputs should have field names
    expect(inputData[0]["name"]).toBe("user");
    expect(inputData[0]["track"]).toBe("ok");
    expect(inputData[1]["name"]).toBe("age");
    expect(inputData[1]["track"]).toBe("ok");

    // Output should be ok (both inputs are ok)
    expect(combinatorEmission.execution.finalTrack).toBe("ok");
  });

  it("any() emits chain with first-ok output track", () => {
    const realModule = {
      ok,
      err,
      fromNullable,
      fromPredicate,
      all,
      allSettled,
      any,
      collect,
    } as unknown as ResultModule;
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    const r1 = (instrumented.err as Function)("fail1");
    const r2 = (instrumented.ok as Function)(42);
    const r3 = (instrumented.err as Function)("fail2");
    const before = emissions.length;

    (instrumented.any as Function)(r1, r2, r3);

    const combinatorEmissions = emissions.slice(before);
    expect(combinatorEmissions.length).toBeGreaterThanOrEqual(1);

    const combinatorEmission = combinatorEmissions[combinatorEmissions.length - 1];
    expect(combinatorEmission.descriptor.operations[0].method).toBe("any");
    expect(combinatorEmission.execution.finalTrack).toBe("ok");
  });

  it("allSettled() emits chain with all errors when some inputs fail", () => {
    const realModule = {
      ok,
      err,
      fromNullable,
      fromPredicate,
      all,
      allSettled,
      any,
      collect,
    } as unknown as ResultModule;
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);

    const r1 = (instrumented.ok as Function)(1);
    const r2 = (instrumented.err as Function)("fail");
    const before = emissions.length;

    (instrumented.allSettled as Function)(r1, r2);

    const combinatorEmissions = emissions.slice(before);
    expect(combinatorEmissions.length).toBeGreaterThanOrEqual(1);

    const combinatorEmission = combinatorEmissions[combinatorEmissions.length - 1];
    expect(combinatorEmission.descriptor.operations[0].method).toBe("allSettled");
    expect(combinatorEmission.execution.finalTrack).toBe("err");
  });

  it("combinator chain forwarded to bridge produces accessible chain data", () => {
    const realModule = {
      ok,
      err,
      fromNullable,
      fromPredicate,
      all,
      allSettled,
      any,
      collect,
    } as unknown as ResultModule;
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);
    const bridge = new PlaygroundInspectorBridge();

    const r1 = (instrumented.ok as Function)(1);
    const r2 = (instrumented.ok as Function)(2);
    const before = emissions.length;

    (instrumented.all as Function)(r1, r2);

    // Forward combinator emissions to bridge
    for (const { descriptor, execution } of emissions.slice(before)) {
      bridge.handleWorkerMessage({ type: "result-chain-registered", chain: descriptor });
      bridge.handleWorkerMessage({ type: "result-chain-executed", execution });
    }

    const chains = bridge.getResultChains();
    expect(chains).toBeDefined();

    // Find the chain with "all" operation
    let allChain: ResultChainDescriptor | undefined;
    for (const [, chain] of chains!) {
      if (chain.operations.some(op => op.method === "all")) {
        allChain = chain;
        break;
      }
    }
    expect(allChain).toBeDefined();
    expect(allChain!.operations[0].method).toBe("all");

    const executions = bridge.getResultExecutions(allChain!.chainId);
    expect(executions).toBeDefined();
    expect(executions!.length).toBe(1);
    expect(executions![0].finalTrack).toBe("ok");
  });

  it("CombinatorContent extraction path: step inputValue.data is an array of per-input objects", () => {
    // This test mirrors what CombinatorContent in result-panel.tsx does:
    // 1. Find chain with combinator op
    // 2. Get execution step matching the op index
    // 3. Read step.inputValue.data as Array<{index, track, name, sourceLabel, ...}>
    const realModule = {
      ok,
      err,
      fromNullable,
      fromPredicate,
      all,
      allSettled,
      any,
      collect,
    } as unknown as ResultModule;
    const { callback, emissions } = createCallback();
    const instrumented = createInstrumentedResultModule(realModule, callback);
    const bridge = new PlaygroundInspectorBridge();

    // Simulate user code from the combinator template
    const r1 = (instrumented.ok as Function)("Alice");
    const r2 = (instrumented.err as Function)("invalid email");
    const r3 = (instrumented.ok as Function)(28);
    const before = emissions.length;

    (instrumented.all as Function)(r1, r2, r3);

    // Forward to bridge
    for (const { descriptor, execution } of emissions.slice(before)) {
      bridge.handleWorkerMessage({ type: "result-chain-registered", chain: descriptor });
      bridge.handleWorkerMessage({ type: "result-chain-executed", execution });
    }

    // --- CombinatorContent extraction path ---
    const COMBINATOR_METHODS = new Set(["all", "allSettled", "any", "collect"]);
    const chains = bridge.getResultChains()!;

    let selectedChain: ResultChainDescriptor | undefined;
    let combinatorOpIndex = -1;
    for (const [, chain] of chains) {
      const idx = chain.operations.findIndex(op => COMBINATOR_METHODS.has(op.method));
      if (idx >= 0) {
        selectedChain = chain;
        combinatorOpIndex = idx;
        break;
      }
    }

    expect(selectedChain).toBeDefined();
    expect(combinatorOpIndex).toBe(0);

    const execs = bridge.getResultExecutions(selectedChain!.chainId)!;
    expect(execs.length).toBe(1);

    const step = execs[0].steps.find(s => s.operationIndex === combinatorOpIndex)!;
    expect(step).toBeDefined();

    // The critical assertion: step.inputValue.data is an array of per-input objects
    const inputData = step.inputValue?.data;
    expect(Array.isArray(inputData)).toBe(true);
    expect((inputData as unknown[]).length).toBe(3);

    const inputs = inputData as Array<Record<string, unknown>>;
    expect(inputs[0]["track"]).toBe("ok");
    expect(inputs[0]["index"]).toBe(0);
    expect(inputs[1]["track"]).toBe("err");
    expect(inputs[1]["index"]).toBe(1);
    expect(inputs[2]["track"]).toBe("ok");
    expect(inputs[2]["index"]).toBe(2);

    // Output track should be err (all short-circuits on first err)
    expect(step.outputTrack).toBe("err");
    expect(execs[0].finalTrack).toBe("err");
  });
});
