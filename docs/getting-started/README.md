---
title: Getting Started
description: Install HexDI and learn how structural dependency injection works in TypeScript.
sidebar_position: 1
---

# Getting Started with HexDI

Today, teams discover architectural mistakes in three places: code review, staging, or production. Code review depends on a reviewer noticing the problem. Staging catches what review missed. Production catches everything else.

HexDI moves architectural discovery to a fourth place: **the compiler**.

Missing a dependency? Compile error. Circular dependency? Compile error. Resolving a port that isn't in the graph? Compile error. The category of "wiring is wrong" errors ceases to exist at runtime.

This isn't a linter rule that can be suppressed. It's a type system guarantee that holds as long as TypeScript does.

---

## Prerequisites

- Node.js 18.0 or later
- TypeScript 5.0 or later with `strict: true`
- A package manager (pnpm, npm, or yarn)

---

## The Core Model

HexDI builds your application around four concepts:

```
Port → Adapter → Graph → Container
```

```typescript
// Port: a contract (not an implementation)
const LoggerPort = port<Logger>()({ name: 'Logger' });

// Adapter: an implementation with explicit dependencies
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({ log: console.log })
});

// Graph: validated at compile time
// If it builds, every dependency is satisfied.
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .build();

// Container: runtime resolution
const container = createContainer({ graph, name: "App" });
const logger = container.resolve(LoggerPort);
```

The graph is not a runtime object you hope is correct. It's a type-level constraint the compiler enforces. You cannot build a graph with missing dependencies. You cannot resolve a port that isn't in the graph. The architecture is structurally correct by construction.

---

## Sections

1. **[Installation](./installation.md)** — One command to install everything
2. **[Core Concepts](./core-concepts.md)** — Ports, adapters, graphs, containers, scopes
3. **[First Application](./first-application.md)** — A complete working example
4. **[Lifetimes](./lifetimes.md)** — Singleton, scoped, and transient lifetimes
5. **[TypeScript Integration](./typescript-integration.md)** — Type inference and utilities

---

Start with [Installation](./installation.md).
