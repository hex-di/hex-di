/**
 * Basic Port & Adapter Registration
 *
 * Single-file example showing the fundamental pattern: define a port,
 * implement an adapter, build a graph, create a container, resolve the port.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { port, createAdapter, adapterOrElse } from "@hex-di/core";
import type { FactoryResult } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// 1. Define a port (interface contract)
interface Greeter {
  greet(name: string): string;
}

const GreeterPort = port<Greeter>()({ name: "Greeter" });

// 2. Define a tagged error type for adapter construction
interface GreeterCreationFailed {
  readonly _tag: "GreeterCreationFailed";
}
const GreeterCreationFailed: GreeterCreationFailed = Object.freeze({ _tag: "GreeterCreationFailed" as const });

// 3. Create a fallible adapter (returns Result<Greeter, GreeterCreationFailed>)
const greeterAdapter = createAdapter({
  provides: GreeterPort,
  factory: (): FactoryResult<Greeter, GreeterCreationFailed> => ({
    _tag: "Ok",
    value: { greet: (name: string) => \`Hello, \${name}!\` },
  }),
  lifetime: "singleton",
});

// 4. Create a fallback adapter (infallible — returns plain T)
const fallbackGreeter = createAdapter({
  provides: GreeterPort,
  factory: () => ({ greet: () => "[unavailable]" }),
  lifetime: "singleton",
});

// 5. Build the graph using adapterOrElse (pure composition glue)
const graph = GraphBuilder.create()
  .provide(adapterOrElse(greeterAdapter, fallbackGreeter))
  .build();

// 6. Create a container and resolve
const container = createContainer({ graph, name: "BasicExample" });
const greeter = container.resolve(GreeterPort);
console.log(greeter.greet("World"));
`;

export const basicRegistration: ExampleTemplate = {
  id: "basic-registration",
  title: "Basic Port & Adapter Registration",
  description: "Define a port, implement an adapter, build a graph, create a container, resolve",
  category: "basics",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "graph",
};
