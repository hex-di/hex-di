/**
 * Basic Port & Adapter Registration
 *
 * Single-file example showing the fundamental pattern: define a port,
 * implement an adapter, build a graph, create a container, resolve the port.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// 1. Define a port (interface contract)
interface Greeter {
  greet(name: string): string;
}

const GreeterPort = port<Greeter>()({ name: "Greeter" });

// 2. Create an adapter (implementation)
const greeterAdapter = createAdapter({
  provides: GreeterPort,
  factory: () => ({
    greet: (name: string) => \`Hello, \${name}!\`,
  }),
  lifetime: "singleton",
});

// 3. Build a dependency graph
const graph = GraphBuilder.create()
  .provide(greeterAdapter)
  .build();

// 4. Create a container and resolve
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
