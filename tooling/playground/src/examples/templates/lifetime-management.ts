/**
 * Lifetime Management
 *
 * Demonstrates singleton, scoped, and transient lifetimes with a counter service.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { port, createAdapter, adapterOrElse, type FactoryResult } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

interface Counter {
  next(): number;
}

type CounterCreationFailed = {
  readonly _tag: "CounterCreationFailed";
  readonly reason: string;
};

const CounterPort = port<Counter>()({ name: "Counter" });

// Primary adapter: fallible factory returning FactoryResult
const primaryAdapter = createAdapter({
  provides: CounterPort,
  factory: (): FactoryResult<Counter, CounterCreationFailed> => {
    let local = 0;
    return { _tag: "Ok", value: { next: () => ++local } };
  },
  lifetime: "transient",
});

// Fallback adapter: infallible, used when primary fails
const fallbackAdapter = createAdapter({
  provides: CounterPort,
  factory: () => {
    let local = 1000;
    return { next: () => ++local };
  },
  lifetime: "transient",
});

const graph = GraphBuilder.create()
  .provide(adapterOrElse(primaryAdapter, fallbackAdapter))
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
