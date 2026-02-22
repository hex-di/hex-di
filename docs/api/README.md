---
title: API Reference
description: Complete API documentation for HexDI packages — core, graph, runtime, react, and testing.
sidebar_position: 4
---

# API Reference

Complete API documentation for HexDI packages.

## Packages

- **[@hex-di/core](./core.md)** — Port token system (the foundation)
- **[@hex-di/graph](./graph.md)** — GraphBuilder, adapters, compile-time validation
- **[@hex-di/runtime](./runtime.md)** — Container, scopes, and lifecycle
- **[@hex-di/result](./result.md)** — Rust-style `Result<T, E>` — errors as values
- **[@hex-di/react](./react.md)** — React hooks and providers
- **[@hex-di/testing](./testing.md)** — Mock adapters, override builders, test graphs

## Quick Reference

### Creating Services

```typescript
// 1. Define a contract
const LoggerPort = port<Logger>()({ name: "Logger" });

// 2. Declare an implementation with dependencies
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: console.log }),
});

// 3. Build a structurally validated graph
const graph = GraphBuilder.create().provide(LoggerAdapter).build();

// 4. Resolve services
const container = createContainer({ graph, name: "App" });
const logger = container.resolve(LoggerPort);
```

### Type Utilities

| Utility                      | Package | Purpose                             |
| ---------------------------- | ------- | ----------------------------------- |
| `InferService<P>`            | core    | Extract service type from port      |
| `InferPortName<P>`           | core    | Extract port name as literal type   |
| `InferPortDirection<P>`      | core    | Extract port direction              |
| `InferAdapterProvides<A>`    | graph   | Extract provided port from adapter  |
| `InferAdapterRequires<A>`    | graph   | Extract required ports from adapter |
| `InferContainerProvides<C>`  | runtime | Extract all ports from container    |
| `ServiceFromContainer<C, P>` | runtime | Get service type for a port         |

### Error Classes

| Error                     | Code                  | When                               |
| ------------------------- | --------------------- | ---------------------------------- |
| `CircularDependencyError` | `CIRCULAR_DEPENDENCY` | Cycle detected in the graph        |
| `FactoryError`            | `FACTORY_FAILED`      | Adapter factory threw              |
| `DisposedScopeError`      | `DISPOSED_SCOPE`      | Resolution after scope disposed    |
| `ScopeRequiredError`      | `SCOPE_REQUIRED`      | Scoped service resolved at root    |

## Package Dependencies

```
@hex-di/core (zero dependencies — foundation)
    ↑
@hex-di/graph (depends on core)
    ↑
@hex-di/runtime (depends on core, graph)
    ↑
├── @hex-di/react   (depends on core, runtime)
└── @hex-di/testing (depends on core, graph, runtime)

@hex-di/result (zero dependencies — standalone)
```

The four core packages are available from the `hex-di` umbrella:

```typescript
import { port, createAdapter, GraphBuilder, createContainer } from "hex-di";
```

`@hex-di/result` is a separate package (not bundled in `hex-di`):

```typescript
import { ok, err, type Result } from "@hex-di/result";
```
