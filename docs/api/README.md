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

| Error                     | Code                  | When                            |
| ------------------------- | --------------------- | ------------------------------- |
| `CircularDependencyError` | `CIRCULAR_DEPENDENCY` | Cycle detected in the graph     |
| `FactoryError`            | `FACTORY_FAILED`      | Adapter factory threw           |
| `DisposedScopeError`      | `DISPOSED_SCOPE`      | Resolution after scope disposed |
| `ScopeRequiredError`      | `SCOPE_REQUIRED`      | Scoped service resolved at root |

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

---

## HTTP API Specs (OpenAPI)

The example applications expose OpenAPI 3.1 specifications at runtime. CI verifies these against committed snapshots to detect accidental drift.

| Application   | Endpoint           | Snapshot                                                                                                                                     |
| ------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| hono-todo     | `GET /openapi`     | [`examples/hono-todo/openapi-snapshot.json`](https://github.com/leaderiop/hex-di/blob/main/examples/hono-todo/openapi-snapshot.json)         |
| pokenerve API | `GET /api/openapi` | [`examples/pokenerve/api/openapi-snapshot.json`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/openapi-snapshot.json) |

To regenerate snapshots after intentional schema changes:

```bash
cd examples/hono-todo
pnpm build && node dist/server.js &
sleep 2
curl -s http://localhost:4000/openapi | jq . > openapi-snapshot.json
kill %1

cd examples/pokenerve/api
pnpm build && node dist/server.js &
sleep 2
curl -s http://localhost:3001/api/openapi | jq . > openapi-snapshot.json
kill %1
```

See the [Schema-First OpenAPI guide](../guides/openapi.md) for the Zod/Hono pattern used to define these specs.

---

## Generated Reference

Full API reference auto-generated from TypeScript source via [TypeDoc](https://typedoc.org/):

```bash
pnpm docs:api    # regenerate from source
```

Output is written to `docs/api/generated/` (gitignored, generate on demand).

### Regeneration Policy

- Generated API docs under `docs/api/generated/` are **not** committed — they are gitignored and regenerated locally or in CI on demand.
- Run `pnpm docs:api` after changing any public API type signature to regenerate.
- The hand-written API reference pages (this directory's `.md` files) **are** committed and must be updated manually when public APIs change.
- CI does not currently diff generated docs; regeneration is a manual step before publishing documentation.

See [docs/improvements.md](../improvements.md) for the full improvement backlog.

## OpenAPI

HTTP-facing example applications publish OpenAPI specs via `@hono/zod-openapi`. CI validates these specs against committed snapshots — see the [OpenAPI Snapshot guide](../guides/openapi-snapshots.md) for details.
