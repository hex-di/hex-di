# Introduction

Welcome to HexDI documentation.

## What is HexDI?

HexDI is a type-safe dependency injection framework for TypeScript that catches dependency errors at compile time.

## Key Features

- **Type-Safe Resolution**: Full type inference for resolved services
- **Compile-Time Validation**: Catch missing or circular dependencies before runtime
- **Zero Runtime Overhead**: No reflection or decorators required
- **Framework Agnostic**: Works with React, Hono, and any TypeScript project

## Quick Start

```typescript
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// Define a port (interface token)
interface Logger {
  log(message: string): void;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");

// Create an adapter (implementation)
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: message => console.log(message),
  }),
});

// Build the dependency graph
const graph = GraphBuilder.create().provide(LoggerAdapter).build();

// Create a container and resolve services
const container = createContainer(graph);
const logger = container.resolve(LoggerPort);
logger.log("Hello, HexDI!");
```
