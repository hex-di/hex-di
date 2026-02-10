/**
 * Introspection Integration Test
 *
 * Verifies the full lifecycle: registry + inspector + tracing hook
 * working together via the runner.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { expectOk } from "@hex-di/result-testing";
import { createFlowRegistry } from "../../src/introspection/flow-registry.js";
import { createFlowInspector } from "../../src/introspection/flow-inspector.js";
import { createFlowTracingHook } from "../../src/introspection/flow-tracing-hook.js";
import type {
  TracerLike,
  RegistryEntry,
  EffectResultRecord,
} from "../../src/introspection/types.js";
import { createMachineRunner } from "../../src/runner/create-runner.js";
import { defineMachine } from "../../src/machine/define-machine.js";
import { createActivityManager } from "../../src/activities/manager.js";
import { createBasicExecutor } from "../../src/runner/executor.js";
import { FlowMemoryCollector } from "../../src/tracing/memory-collector.js";

describe("Introspection Integration", () => {
  it("full lifecycle: registry tracks instance, inspector queries work, tracing hook produces spans, dispose cleans up", () => {
    // 1. Create all components
    const registry = createFlowRegistry();
    const memCollector = new FlowMemoryCollector();
    const spanLog: Array<{ method: string; args: unknown[] }> = [];
    const tracer: TracerLike = {
      pushSpan(name, attrs) {
        spanLog.push({ method: "pushSpan", args: [name, attrs] });
      },
      popSpan(status) {
        spanLog.push({ method: "popSpan", args: [status] });
      },
    };
    const tracingHook = createFlowTracingHook({ tracer });

    const effectResults: EffectResultRecord[] = [];
    const onEffectResult = (record: EffectResultRecord) => {
      effectResults.push(record);
      inspector.recordEffectResult(record);
    };

    const inspector = createFlowInspector({
      registry,
      collector: memCollector,
      cacheTtlMs: 0, // Disable cache for test determinism
    });

    // 2. Create a simple machine
    const machine = defineMachine({
      id: "test-flow",
      initial: "idle",
      context: { count: 0 },
      states: {
        idle: {
          on: {
            START: { target: "active" },
          },
        },
        active: {
          on: {
            STOP: { target: "idle" },
            FINISH: { target: "done" },
          },
        },
        done: {},
      },
    });

    // 3. Create runner with hooks
    const activityManager = createActivityManager({});
    const executor = createBasicExecutor();

    const runner = createMachineRunner(machine, {
      executor,
      activityManager,
      tracingHook,
      onEffectResult,
      collector: {
        collect(event: unknown) {
          // Bridge from runner's internal collector to FlowMemoryCollector
          const e = event as {
            machineId: string;
            prevState: string;
            event: { type: string };
            nextState: string;
            effects: unknown[];
            timestamp: number;
          };
          memCollector.collect({
            id: `t-${Date.now()}`,
            machineId: e.machineId,
            prevState: e.prevState,
            event: e.event,
            nextState: e.nextState,
            effects: [],
            timestamp: e.timestamp,
            duration: 0,
            isPinned: false,
          });
        },
      },
    });

    // 4. Register in registry
    const portName = "TestFlowPort";
    const instanceId = "inst-1";

    const getValidEvents = (): readonly string[] => {
      const currentState = runner.state();
      const statesRecord = machine.states;
      const descriptor = Object.getOwnPropertyDescriptor(statesRecord, currentState);
      const stateNode: unknown = descriptor !== undefined ? descriptor.value : undefined;
      if (typeof stateNode !== "object" || stateNode === null) return [];
      const onDescriptor = Object.getOwnPropertyDescriptor(stateNode, "on");
      const onMap: unknown = onDescriptor !== undefined ? onDescriptor.value : undefined;
      if (typeof onMap !== "object" || onMap === null) return [];
      return Object.keys(onMap);
    };

    const entry: RegistryEntry = {
      portName,
      instanceId,
      machineId: machine.id,
      state: () => runner.state(),
      snapshot: () => runner.snapshot(),
      createdAt: Date.now(),
      validEvents: getValidEvents,
    };
    registry.register(entry);

    // 5. Verify initial state
    expect(registry.getAllMachines()).toHaveLength(1);
    expect(inspector.getMachineState(portName, instanceId)?.state).toBe("idle");
    expect(inspector.getValidTransitions(portName, instanceId)).toEqual(["START"]);

    // 6. Send event
    const result = runner.send({ type: "START" });
    expectOk(result);

    // Verify tracing spans were produced
    expect(spanLog.length).toBeGreaterThanOrEqual(2);
    expect(spanLog[0]?.method).toBe("pushSpan");
    expect(spanLog[0]?.args[0]).toBe("flow:test-flow/idle->active");

    // Verify registry reflects new state
    expect(inspector.getMachineState(portName, instanceId)?.state).toBe("active");
    expect(inspector.getValidTransitions(portName, instanceId)).toEqual(["STOP", "FINISH"]);

    // Verify event history from collector
    const history = inspector.getEventHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.prevState).toBe("idle");
    expect(history[0]?.nextState).toBe("active");

    // Verify state history
    const stateHistory = inspector.getStateHistory(portName, instanceId);
    expect(stateHistory).toEqual(["idle", "active"]);

    // 7. Verify all machines snapshot
    const allSnapshots = inspector.getAllMachinesSnapshot();
    expect(allSnapshots).toHaveLength(1);
    expect(allSnapshots[0]?.state).toBe("active");

    // 8. Dispose
    registry.unregister(portName, instanceId);
    expect(registry.getAllMachines()).toHaveLength(0);
    expect(inspector.getMachineState(portName, instanceId)).toBeUndefined();

    inspector.dispose();
  });
});
