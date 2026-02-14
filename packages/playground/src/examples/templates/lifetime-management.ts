/**
 * Lifetime Management
 *
 * Demonstrates singleton, scoped, and transient lifetimes with a counter service.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

interface Counter {
  next(): number;
}

const CounterPort = port<Counter>()({ name: "Counter" });

// Transient: each resolve creates a fresh instance
const counterAdapter = createAdapter({
  provides: CounterPort,
  factory: () => {
    let local = 0;
    return { next: () => ++local };
  },
  lifetime: "transient",
});

const graph = GraphBuilder.create()
  .provide(counterAdapter)
  .build();

const container = createContainer({ graph, name: "LifetimeExample" });

// Each resolve creates a new instance (transient)
const counter1 = container.resolve(CounterPort);
const counter2 = container.resolve(CounterPort);
console.log("Counter1:", counter1.next(), counter1.next()); // 1, 2
console.log("Counter2:", counter2.next());                   // 1 (new instance)
`;

export const lifetimeManagement: ExampleTemplate = {
  id: "lifetime-management",
  title: "Lifetime Management",
  description: "Demonstrates singleton, scoped, and transient lifetimes with a counter service",
  category: "basics",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "container",
};
