/**
 * Store State Management
 *
 * Shows Store port usage with state updates and action dispatching.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { createAdapter } from "@hex-di/core";
import { createStatePort, createStateAdapter } from "@hex-di/store";
import { LoggerPort, createConsoleLogger } from "@hex-di/logger";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// State shape
interface CounterState {
  readonly count: number;
  readonly items: readonly string[];
}

// Action reducers: each takes current state (+ optional payload) and returns new state
const counterActions = {
  increment: (state: CounterState) => ({
    ...state,
    count: state.count + 1,
  }),
  decrement: (state: CounterState) => ({
    ...state,
    count: state.count - 1,
  }),
  addItem: (state: CounterState, item: string) => ({
    ...state,
    items: [...state.items, item],
  }),
  reset: (_state: CounterState) => ({
    count: 0,
    items: [] as readonly string[],
  }),
};

// Create typed port using the store library (sets category: "store/state")
const CounterPort = createStatePort<CounterState, typeof counterActions>()({
  name: "Counter",
});

// Logger using the actual library port (sets category: "logger/logger")
const loggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => createConsoleLogger(),
  lifetime: "singleton",
});

// State adapter with actions and initial state
const counterAdapter = createStateAdapter({
  provides: CounterPort,
  initial: { count: 0, items: [] },
  actions: counterActions,
  lifetime: "singleton",
});

const graph = GraphBuilder.create()
  .provide(loggerAdapter)
  .provide(counterAdapter)
  .build();

const container = createContainer({ graph, name: "StoreExample" });
const counter = container.resolve(CounterPort);

// Subscribe to state changes
counter.subscribe((state, prev) => {
  console.log(\`  -> count: \${prev.count} => \${state.count}, items: [\${state.items.join(", ")}]\`);
});

// Use type-safe bound actions
counter.actions.increment();
counter.actions.increment();
counter.actions.addItem("apple");
counter.actions.addItem("banana");
console.log("State:", counter.state);

counter.actions.reset();
console.log("After reset:", counter.state);
`;

export const storeStateManagement: ExampleTemplate = {
  id: "store-state-management",
  title: "Store State Management",
  description: "Store port usage with state updates and action dispatching",
  category: "libraries",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "overview",
};
