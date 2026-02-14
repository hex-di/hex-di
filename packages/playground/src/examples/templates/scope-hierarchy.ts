/**
 * Scope Creation & Hierarchy
 *
 * Demonstrates scope creation, nested scopes, and scoped lifetime resolution.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// A request-scoped service: same instance within a scope, new per scope
interface RequestId { readonly id: string; }
interface Logger { log(msg: string): void; }

const RequestIdPort = port<RequestId>()({ name: "RequestId" });
const LoggerPort = port<Logger>()({ name: "Logger" });

let requestCounter = 0;

const requestIdAdapter = createAdapter({
  provides: RequestIdPort,
  factory: () => {
    requestCounter++;
    const id = \`req-\${requestCounter}\`;
    console.log(\`Creating RequestId: \${id}\`);
    return { id };
  },
  lifetime: "scoped",
});

const loggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [RequestIdPort],
  factory: ({ RequestId }) => ({
    log: (msg: string) => console.log(\`[\${RequestId.id}] \${msg}\`),
  }),
  lifetime: "scoped",
});

const graph = GraphBuilder.create()
  .provide(requestIdAdapter)
  .provide(loggerAdapter)
  .build();

const container = createContainer({ graph, name: "ScopeExample" });

// Create two separate scopes (simulating two requests)
const scope1 = container.createScope("Request-1");
const scope2 = container.createScope("Request-2");

// Within the same scope, resolving twice returns the same instance
const logger1a = scope1.resolve(LoggerPort);
const logger1b = scope1.resolve(LoggerPort);
logger1a.log("First call in scope 1");
logger1b.log("Second call in scope 1 (same instance)");

// Different scope gets a different instance
const logger2 = scope2.resolve(LoggerPort);
logger2.log("Call in scope 2 (different instance)");

console.log("Same instance in scope 1?", logger1a === logger1b);
`;

export const scopeHierarchy: ExampleTemplate = {
  id: "scope-hierarchy",
  title: "Scope Creation & Hierarchy",
  description: "Demonstrates scope creation, nested scopes, and scoped lifetime resolution",
  category: "basics",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "scopes",
};
