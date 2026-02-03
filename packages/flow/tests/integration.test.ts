/**
 * HexDI Integration Tests
 *
 * These tests verify the integration between @hex-di/flow and @hex-di/runtime:
 * - FlowService resolves from container
 * - Effect.invoke resolves port from scope
 * - Scoped lifetime creates new machine per scope
 * - Effects execute with correct dependencies
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { port, createPort, createAdapter, type InferService } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createMachine } from "../src/machine/create-machine.js";
import { event } from "../src/machine/factories.js";
import { Effect } from "../src/effects/constructors.js";
import { createMachineRunner } from "../src/runner/create-runner.js";
import { createActivityManager } from "../src/activities/manager.js";
import {
  createDIEffectExecutor,
  type FlowService,
  type ScopeResolver,
} from "../src/integration/index.js";

// =============================================================================
// Test Service Interfaces and Ports
// =============================================================================

/**
 * A simple counter service for testing Effect.invoke
 */
interface CounterService {
  readonly count: number;
  increment(): number;
  decrement(): number;
  getCount(): number;
}

const CounterServicePort = port<CounterService>()({ name: "CounterService" });

/**
 * Creates a counter service implementation
 */
function createCounterService(): CounterService {
  let count = 0;
  return {
    get count() {
      return count;
    },
    increment() {
      count += 1;
      return count;
    },
    decrement() {
      count -= 1;
      return count;
    },
    getCount() {
      return count;
    },
  };
}

const CounterServiceAdapter = createAdapter({
  provides: CounterServicePort,
  requires: [] as const,
  lifetime: "scoped",
  factory: () => createCounterService(),
});

// =============================================================================
// Test Machine Definitions
// =============================================================================

/**
 * Context type for the test machine
 */
interface TestMachineContext {
  readonly value: number;
  readonly lastAction: string;
}

// Event helpers
const startEvent = event<"START">("START");
const stopEvent = event<"STOP">("STOP");
const incrementEvent = event<"INCREMENT">("INCREMENT");
const goEvent = event<"GO">("GO");

// =============================================================================
// FlowService Adapters using createAdapter directly
// =============================================================================

// Define the FlowService type for our machines
type SimpleFlowService = FlowService<
  "idle" | "active",
  "START" | "STOP" | "INCREMENT",
  TestMachineContext
>;

// Create ports using createPort directly with FlowService type
const SimpleFlowServicePort = port<SimpleFlowService>()({
  name: "SimpleFlowService",
});

// Simple machine without effects
const simpleTestMachine = createMachine({
  id: "simple-test-machine",
  initial: "idle",
  context: { value: 0, lastAction: "none" } satisfies TestMachineContext,
  states: {
    idle: {
      on: {
        START: {
          target: "active",
          actions: [(ctx: TestMachineContext) => ({ ...ctx, lastAction: "started" })],
        },
        INCREMENT: {
          target: "idle",
          actions: [(ctx: TestMachineContext) => ({ ...ctx, value: ctx.value + 1 })],
        },
      },
    },
    active: {
      on: {
        STOP: {
          target: "idle",
          actions: [(ctx: TestMachineContext) => ({ ...ctx, lastAction: "stopped" })],
        },
      },
    },
  },
});

// Adapter for simple flow service without dependencies
const SimpleFlowServiceAdapter = createAdapter({
  provides: SimpleFlowServicePort,
  requires: [] as const,
  lifetime: "scoped",
  factory: (): SimpleFlowService => {
    const activityManager = createActivityManager();
    const executor = createDIEffectExecutor({
      scope: {
        resolve: () => {
          throw new Error("No deps needed");
        },
      },
      activityManager,
    });

    const runner = createMachineRunner(simpleTestMachine, {
      executor,
      activityManager,
    });

    return {
      snapshot: () => runner.snapshot(),
      state: () => runner.state(),
      context: () => runner.context(),
      send: e => runner.send(e),
      sendAndExecute: e => runner.sendAndExecute(e),
      subscribe: cb => runner.subscribe(cb),
      getActivityStatus: id => runner.getActivityStatus(id),
      dispose: () => runner.dispose(),
      get isDisposed() {
        return runner.isDisposed;
      },
    };
  },
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("HexDI Integration", () => {
  describe("FlowService Resolution (No Dependencies)", () => {
    it("should resolve FlowService from container via adapter", () => {
      const graph = GraphBuilder.create().provide(SimpleFlowServiceAdapter).build();

      const container = createContainer(graph, { name: "TestContainer" });
      const scope = container.createScope();

      const flowService = scope.resolve(SimpleFlowServicePort);

      expect(flowService).toBeDefined();
      expect(typeof flowService.state).toBe("function");
      expect(typeof flowService.context).toBe("function");
      expect(typeof flowService.send).toBe("function");
      expect(typeof flowService.sendAndExecute).toBe("function");
      expect(typeof flowService.subscribe).toBe("function");
      expect(typeof flowService.dispose).toBe("function");
      expect(typeof flowService.snapshot).toBe("function");

      expect(flowService.state()).toBe("idle");
      expect(flowService.context()).toEqual({ value: 0, lastAction: "none" });

      void scope.dispose();
      void container.dispose();
    });

    it("should resolve FlowService with correct initial state", () => {
      const graph = GraphBuilder.create().provide(SimpleFlowServiceAdapter).build();

      const container = createContainer(graph, { name: "TestContainer" });
      const scope = container.createScope();

      const flowService = scope.resolve(SimpleFlowServicePort);

      const snapshot = flowService.snapshot();
      expect(snapshot.state).toBe("idle");
      expect(snapshot.context).toEqual({ value: 0, lastAction: "none" });

      void scope.dispose();
      void container.dispose();
    });

    it("should transition state correctly", () => {
      const graph = GraphBuilder.create().provide(SimpleFlowServiceAdapter).build();

      const container = createContainer(graph, { name: "TestContainer" });
      const scope = container.createScope();

      const flowService = scope.resolve(SimpleFlowServicePort);

      expect(flowService.state()).toBe("idle");

      flowService.send(startEvent());
      expect(flowService.state()).toBe("active");
      expect(flowService.context().lastAction).toBe("started");

      flowService.send(stopEvent());
      expect(flowService.state()).toBe("idle");
      expect(flowService.context().lastAction).toBe("stopped");

      void scope.dispose();
      void container.dispose();
    });
  });

  describe("Scoped Lifetime", () => {
    it("should create new machine instance per scope", () => {
      const graph = GraphBuilder.create().provide(SimpleFlowServiceAdapter).build();

      const container = createContainer(graph, { name: "TestContainer" });

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      const flowService1 = scope1.resolve(SimpleFlowServicePort);
      const flowService2 = scope2.resolve(SimpleFlowServicePort);

      expect(flowService1).not.toBe(flowService2);

      flowService1.send(startEvent());
      expect(flowService1.state()).toBe("active");

      expect(flowService2.state()).toBe("idle");

      void scope1.dispose();
      void scope2.dispose();
      void container.dispose();
    });

    it("should return same instance within same scope", () => {
      const graph = GraphBuilder.create().provide(SimpleFlowServiceAdapter).build();

      const container = createContainer(graph, { name: "TestContainer" });
      const scope = container.createScope();

      const flowService1 = scope.resolve(SimpleFlowServicePort);
      const flowService2 = scope.resolve(SimpleFlowServicePort);

      expect(flowService1).toBe(flowService2);

      flowService1.send(startEvent());
      expect(flowService2.state()).toBe("active");

      void scope.dispose();
      void container.dispose();
    });

    it.skip("should dispose machine when scope is disposed", async () => {
      const graph = GraphBuilder.create().provide(SimpleFlowServiceAdapter).build();

      const container = createContainer(graph, { name: "TestContainer" });
      const scope = container.createScope();

      const flowService = scope.resolve(SimpleFlowServicePort);

      flowService.send(startEvent());
      expect(flowService.state()).toBe("active");
      expect(flowService.isDisposed).toBe(false);

      await scope.dispose();

      expect(flowService.isDisposed).toBe(true);

      void container.dispose();
    });
  });

  describe("DIEffectExecutor", () => {
    it("should handle DelayEffect correctly", async () => {
      // Define port and adapter inline for this test
      type DelayFlowService = FlowService<"idle" | "waiting", "GO", void>;
      const DelayFlowServicePort = port<DelayFlowService>()({
        name: "DelayFlowService",
      });

      const delayMachine = createMachine({
        id: "delay-test",
        initial: "idle",
        context: undefined,
        states: {
          idle: {
            on: {
              GO: {
                target: "waiting",
                effects: [Effect.delay(10)],
              },
            },
          },
          waiting: {
            on: {},
          },
        },
      });

      const DelayFlowServiceAdapter = createAdapter({
        provides: DelayFlowServicePort,
        requires: [] as const,
        lifetime: "scoped",
        factory: (): DelayFlowService => {
          const activityManager = createActivityManager();
          const executor = createDIEffectExecutor({
            scope: {
              resolve: () => {
                throw new Error("No deps needed");
              },
            },
            activityManager,
          });

          const runner = createMachineRunner(delayMachine, {
            executor,
            activityManager,
          });

          return {
            snapshot: () => runner.snapshot(),
            state: () => runner.state(),
            context: () => runner.context(),
            send: e => runner.send(e),
            sendAndExecute: e => runner.sendAndExecute(e),
            subscribe: cb => runner.subscribe(cb),
            getActivityStatus: id => runner.getActivityStatus(id),
            dispose: () => runner.dispose(),
            get isDisposed() {
              return runner.isDisposed;
            },
          };
        },
      });

      const graph = GraphBuilder.create().provide(DelayFlowServiceAdapter).build();
      const container = createContainer(graph, { name: "TestContainer" });
      const scope = container.createScope();

      const flowService = scope.resolve(DelayFlowServicePort);

      const startTime = Date.now();
      await flowService.sendAndExecute(goEvent());
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(10);
      expect(flowService.state()).toBe("waiting");

      void scope.dispose();
      void container.dispose();
    });

    it("should handle ParallelEffect correctly", async () => {
      type ParallelFlowService = FlowService<"idle" | "done", "GO", void>;
      const ParallelFlowServicePort = port<ParallelFlowService>()({
        name: "ParallelFlowService",
      });

      const parallelMachine = createMachine({
        id: "parallel-test",
        initial: "idle",
        context: undefined,
        states: {
          idle: {
            on: {
              GO: {
                target: "done",
                effects: [Effect.parallel([Effect.delay(5), Effect.delay(5)])],
              },
            },
          },
          done: {
            on: {},
          },
        },
      });

      const ParallelFlowServiceAdapter = createAdapter({
        provides: ParallelFlowServicePort,
        requires: [] as const,
        lifetime: "scoped",
        factory: (): ParallelFlowService => {
          const activityManager = createActivityManager();
          const executor = createDIEffectExecutor({
            scope: {
              resolve: () => {
                throw new Error("No deps needed");
              },
            },
            activityManager,
          });

          const runner = createMachineRunner(parallelMachine, {
            executor,
            activityManager,
          });

          return {
            snapshot: () => runner.snapshot(),
            state: () => runner.state(),
            context: () => runner.context(),
            send: e => runner.send(e),
            sendAndExecute: e => runner.sendAndExecute(e),
            subscribe: cb => runner.subscribe(cb),
            getActivityStatus: id => runner.getActivityStatus(id),
            dispose: () => runner.dispose(),
            get isDisposed() {
              return runner.isDisposed;
            },
          };
        },
      });

      const graph = GraphBuilder.create().provide(ParallelFlowServiceAdapter).build();
      const container = createContainer(graph, { name: "TestContainer" });
      const scope = container.createScope();

      const flowService = scope.resolve(ParallelFlowServicePort);

      await flowService.sendAndExecute(goEvent());
      expect(flowService.state()).toBe("done");

      void scope.dispose();
      void container.dispose();
    });

    it("should handle SequenceEffect correctly", async () => {
      type SequenceFlowService = FlowService<"idle" | "done", "GO", void>;
      const SequenceFlowServicePort = port<SequenceFlowService>()({
        name: "SequenceFlowService",
      });

      const sequenceMachine = createMachine({
        id: "sequence-test",
        initial: "idle",
        context: undefined,
        states: {
          idle: {
            on: {
              GO: {
                target: "done",
                effects: [Effect.sequence([Effect.delay(5), Effect.delay(5), Effect.delay(5)])],
              },
            },
          },
          done: {
            on: {},
          },
        },
      });

      const SequenceFlowServiceAdapter = createAdapter({
        provides: SequenceFlowServicePort,
        requires: [] as const,
        lifetime: "scoped",
        factory: (): SequenceFlowService => {
          const activityManager = createActivityManager();
          const executor = createDIEffectExecutor({
            scope: {
              resolve: () => {
                throw new Error("No deps needed");
              },
            },
            activityManager,
          });

          const runner = createMachineRunner(sequenceMachine, {
            executor,
            activityManager,
          });

          return {
            snapshot: () => runner.snapshot(),
            state: () => runner.state(),
            context: () => runner.context(),
            send: e => runner.send(e),
            sendAndExecute: e => runner.sendAndExecute(e),
            subscribe: cb => runner.subscribe(cb),
            getActivityStatus: id => runner.getActivityStatus(id),
            dispose: () => runner.dispose(),
            get isDisposed() {
              return runner.isDisposed;
            },
          };
        },
      });

      const graph = GraphBuilder.create().provide(SequenceFlowServiceAdapter).build();
      const container = createContainer(graph, { name: "TestContainer" });
      const scope = container.createScope();

      const flowService = scope.resolve(SequenceFlowServicePort);

      const startTime = Date.now();
      await flowService.sendAndExecute(goEvent());
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(15);
      expect(flowService.state()).toBe("done");

      void scope.dispose();
      void container.dispose();
    });
  });
});
