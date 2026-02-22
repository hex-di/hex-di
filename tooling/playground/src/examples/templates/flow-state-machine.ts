/**
 * Flow State Machine
 *
 * Demonstrates a Flow state machine with activities and transitions
 * visible in the overview panel.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { createAdapter, adapterOrElse } from "@hex-di/core";
import type { FactoryResult } from "@hex-di/core";
import { defineMachine, createFlowPort, createFlowAdapter } from "@hex-di/flow";
import { LoggerPort, createConsoleLogger } from "@hex-di/logger";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// Define state machine context
interface OrderContext {
  readonly step: number;
  readonly history: readonly string[];
}

// Define the machine with states, transitions, and context updates
const orderMachine = defineMachine({
  id: "order-flow",
  initial: "idle",
  context: { step: 0, history: [] } satisfies OrderContext,
  states: {
    idle: {
      on: {
        START: {
          target: "processing",
          actions: [(ctx: OrderContext) => ({
            step: 1,
            history: [...ctx.history, "started"],
          })],
        },
      },
    },
    processing: {
      on: {
        VALIDATE: {
          target: "validating",
          actions: [(ctx: OrderContext) => ({
            step: 2,
            history: [...ctx.history, "validating"],
          })],
        },
        CANCEL: { target: "cancelled" },
      },
    },
    validating: {
      on: {
        APPROVE: {
          target: "completed",
          actions: [(ctx: OrderContext) => ({
            step: 3,
            history: [...ctx.history, "approved"],
          })],
        },
        REJECT: {
          target: "failed",
          actions: [(ctx: OrderContext) => ({
            ...ctx,
            history: [...ctx.history, "rejected"],
          })],
        },
      },
    },
    completed: {},
    failed: {},
    cancelled: {},
  },
});

// Create flow port using the flow library (sets category: "flow/flow")
const OrderFlowPort = createFlowPort<
  "idle" | "processing" | "validating" | "completed" | "failed" | "cancelled",
  "START" | "VALIDATE" | "CANCEL" | "APPROVE" | "REJECT",
  OrderContext
>("OrderFlow");

// Tagged error for logger construction failure
interface LoggerCreationFailed {
  readonly _tag: "LoggerCreationFailed";
  readonly reason: string;
}

// Logger adapter (fallible — returns FactoryResult)
const loggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: (): FactoryResult<ReturnType<typeof createConsoleLogger>, LoggerCreationFailed> => ({
    _tag: "Ok",
    value: createConsoleLogger(),
  }),
  lifetime: "singleton",
});

// Fallback logger adapter (infallible — returns plain T)
const fallbackLogger = createAdapter({
  provides: LoggerPort,
  factory: () => createConsoleLogger(),
  lifetime: "singleton",
});

// Flow adapter wraps the machine definition
const flowAdapterResult = createFlowAdapter({
  provides: OrderFlowPort,
  requires: [],
  machine: orderMachine,
  lifetime: "scoped",
});

if (flowAdapterResult._tag === "Err") {
  throw flowAdapterResult.error;
}

const graph = GraphBuilder.create()
  .provide(adapterOrElse(loggerAdapter, fallbackLogger))
  .provide(flowAdapterResult.value)
  .build();

const container = createContainer({ graph, name: "FlowExample" });

// FlowService is scoped — create a scope for each machine instance
const scope = container.createScope("order-scope");
const flow = scope.resolve(OrderFlowPort);

console.log("Initial state:", flow.state());
console.log("Initial context:", flow.context());

// Drive the state machine through transitions
flow.send({ type: "START" });
console.log("After START:", flow.state(), flow.context());

flow.send({ type: "VALIDATE" });
console.log("After VALIDATE:", flow.state(), flow.context());

flow.send({ type: "APPROVE" });
console.log("After APPROVE:", flow.state(), flow.context());

console.log("\\nFinal snapshot:", flow.snapshot());
`;

export const flowStateMachine: ExampleTemplate = {
  id: "flow-state-machine",
  title: "Flow State Machine",
  description: "Flow state machine with activities and transitions",
  category: "libraries",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "overview",
};
