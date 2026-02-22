# hex-di

Type-safe dependency injection with hexagonal architecture.

Single-package install for the full HexDI stack.

## Installation

```bash
pnpm add hex-di
# or
npm install hex-di
# or
yarn add hex-di
```

## Quick Start

```typescript
import { port, createAdapter, GraphBuilder, createContainer } from "hex-di";

// 1. Define ports (interfaces)
interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown[]>;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

// 2. Define adapters (implementations)
const loggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: (msg) => console.log(msg) }),
});

const databaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: ({ Logger }) => ({
    query: async (sql) => {
      Logger.log(`Executing: ${sql}`);
      return [];
    },
  }),
});

// 3. Build the dependency graph (validated at compile time)
const graph = GraphBuilder.create()
  .provide(loggerAdapter)
  .provide(databaseAdapter)
  .build();

if (graph.isErr()) {
  throw graph.error;
}

// 4. Create the container and resolve services
const container = createContainer(graph.value);
const db = container.resolve(DatabasePort);
await db.query("SELECT * FROM users");
```

## What's included

This package re-exports the complete public API of:

| Package | What it provides |
|---|---|
| [`@hex-di/core`](../core) | `port`, `createAdapter`, `lazyPort`, error classes, utilities |
| [`@hex-di/graph`](../graph) | `GraphBuilder`, graph inference types, build errors |
| [`@hex-di/runtime`](../runtime) | `createContainer`, `Container`, `Scope`, resolution hooks, inspection |

## Selective imports

Install individual packages if you only need part of the stack — for example, library authors who only define ports and adapters only need `@hex-di/core`:

```bash
pnpm add @hex-di/core
```
