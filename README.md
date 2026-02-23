# HexDI

> Type-safe dependency injection for TypeScript — errors caught at compile time, not runtime.

HexDI is a dependency injection framework built around **ports & adapters** (hexagonal architecture). Define service contracts as typed tokens, compose them into a validated dependency graph, and resolve them from an immutable container. The full ecosystem adds structured logging, distributed tracing, reactive state, data fetching, state machines, and workflow orchestration — all wired through the same container.

## Install

```bash
pnpm add hex-di        # single package, full stack
# or
npm install hex-di
```

If you only need part of the stack (e.g. a library that just defines ports):

```bash
pnpm add @hex-di/core                        # ports + adapters only
pnpm add @hex-di/core @hex-di/graph          # + graph validation
pnpm add @hex-di/core @hex-di/graph @hex-di/runtime  # full stack manually
```

## Quick Start

```typescript
import { port, createAdapter, GraphBuilder, createContainer } from "hex-di";

// 1. Define service contracts
interface Logger {
  log(message: string): void;
}
interface Database {
  query(sql: string): Promise<unknown[]>;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

// 2. Implement adapters
const loggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: msg => console.log(`[app] ${msg}`) }),
});

const databaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: ({ Logger }) => ({
    query: async sql => {
      Logger.log(`query: ${sql}`);
      return [];
    },
  }),
});

// 3. Build the dependency graph — missing deps are TypeScript errors
const graph = GraphBuilder.create().provide(loggerAdapter).provide(databaseAdapter).build();

// 4. Create a container and resolve
const container = createContainer({ graph, name: "App" });
const db = container.resolve(DatabasePort);
await db.query("SELECT 1");
```

## Packages

### Core

| Package                                 | Install                    | Purpose                                             |
| --------------------------------------- | -------------------------- | --------------------------------------------------- |
| [`hex-di`](./packages/hex-di)           | `pnpm add hex-di`          | Umbrella — re-exports all three packages below      |
| [`@hex-di/core`](./packages/core)       | `pnpm add @hex-di/core`    | `port`, `createAdapter`, error classes, utilities   |
| [`@hex-di/graph`](./packages/graph)     | `pnpm add @hex-di/graph`   | `GraphBuilder` — compile-time dependency validation |
| [`@hex-di/runtime`](./packages/runtime) | `pnpm add @hex-di/runtime` | `createContainer`, scopes, resolution hooks         |
| [`@hex-di/result`](./packages/result)   | `pnpm add @hex-di/result`  | Rust-style `Result<T, E>` — errors as values        |

### Integrations

| Package                                               | Purpose                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| [`@hex-di/react`](./integrations/react)               | Typed hooks and providers, automatic scope lifecycle         |
| [`@hex-di/hono`](./integrations/hono)                 | Per-request scopes, typed context, Hono middleware           |
| [`@hex-di/result-react`](./integrations/result-react) | React hooks, components, and utilities for Result-driven UIs |

### Libraries

| Package                                                                                                                                                                                                                                                                                                                      | Purpose                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`@hex-di/logger`](./libs/logger/core)                                                                                                                                                                                                                                                                                       | Structured logging with swappable backends                                      |
| [`@hex-di/logger-pino`](./libs/logger/pino) · [`-winston`](./libs/logger/winston) · [`-bunyan`](./libs/logger/bunyan)                                                                                                                                                                                                        | Logger backend adapters                                                         |
| [`@hex-di/logger-react`](./libs/logger/react)                                                                                                                                                                                                                                                                                | React hooks for logger                                                          |
| [`@hex-di/tracing`](./libs/tracing/core)                                                                                                                                                                                                                                                                                     | Distributed tracing with W3C Trace Context                                      |
| [`@hex-di/tracing-otel`](./libs/tracing/otel) · [`-datadog`](./libs/tracing/datadog) · [`-jaeger`](./libs/tracing/jaeger) · [`-zipkin`](./libs/tracing/zipkin)                                                                                                                                                               | Tracing exporters                                                               |
| [`@hex-di/query`](./libs/query/core)                                                                                                                                                                                                                                                                                         | Port-based data fetching and caching                                            |
| [`@hex-di/query-react`](./libs/query/react) · [`-testing`](./libs/query/testing)                                                                                                                                                                                                                                             | React hooks and test utilities                                                  |
| [`@hex-di/store`](./libs/store/core)                                                                                                                                                                                                                                                                                         | Signal-based reactive state as a DI port                                        |
| [`@hex-di/store-react`](./libs/store/react) · [`-testing`](./libs/store/testing)                                                                                                                                                                                                                                             | React hooks and test utilities                                                  |
| [`@hex-di/flow`](./libs/flow/core)                                                                                                                                                                                                                                                                                           | Typed state machines — effects as port invocations                              |
| [`@hex-di/flow-react`](./libs/flow/react) · [`-testing`](./libs/flow/testing)                                                                                                                                                                                                                                                | React hooks and test utilities                                                  |
| [`@hex-di/saga`](./libs/saga/core)                                                                                                                                                                                                                                                                                           | Long-running workflows with automatic compensation                              |
| [`@hex-di/saga-react`](./libs/saga/react) · [`-testing`](./libs/saga/testing)                                                                                                                                                                                                                                                | React hooks and test utilities                                                  |
| [`@hex-di/http-client`](./libs/http-client/core)                                                                                                                                                                                                                                                                             | Platform-agnostic HTTP client — type-safe, composable, transport-agnostic       |
| [`@hex-di/http-client-fetch`](./libs/http-client/fetch) · [`-axios`](./libs/http-client/axios) · [`-got`](./libs/http-client/got) · [`-ky`](./libs/http-client/ky) · [`-node`](./libs/http-client/node) · [`-undici`](./libs/http-client/undici) · [`-bun`](./libs/http-client/bun) · [`-ofetch`](./libs/http-client/ofetch) | HTTP transport adapters                                                         |
| [`@hex-di/http-client-react`](./libs/http-client/react)                                                                                                                                                                                                                                                                      | React hooks for HTTP client                                                     |
| [`@hex-di/guard`](./libs/guard/core)                                                                                                                                                                                                                                                                                         | Compile-time-safe authorization — permission tokens, role DAG, policy evaluator |
| [`@hex-di/guard-react`](./libs/guard/react) · [`-testing`](./libs/guard/testing) · [`-validation`](./libs/guard/validation)                                                                                                                                                                                                  | React integration, test utilities, GxP validation protocols                     |
| [`@hex-di/clock`](./libs/clock/core)                                                                                                                                                                                                                                                                                         | Injectable clock, sequence generation, and timer abstractions                   |

### Tooling

| Package                                              | Purpose                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`@hex-di/testing`](./tooling/testing)               | Mock adapters, override builders, test graphs                                  |
| [`@hex-di/visualization`](./tooling/visualization)   | DOT and Mermaid graph export                                                   |
| [`@hex-di/result-testing`](./tooling/result-testing) | Vitest matchers for `Result<T, E>`                                             |
| [`@hex-di/devtools-ui`](./tooling/devtools-ui)       | Shared UI components, panels, and visualization primitives for developer tools |
| [`@hex-di/graph-viz`](./tooling/graph-viz)           | Generic graph visualization components with zoom/pan and render props          |
| [`@hex-di/playground`](./tooling/playground)         | Interactive browser-based playground for experimenting with HexDI patterns     |

## Key Concepts

### Lifetimes

| Lifetime      | Created            | Use for                           |
| ------------- | ------------------ | --------------------------------- |
| `"singleton"` | Once per container | Stateless services, shared config |
| `"scoped"`    | Once per scope     | Request context, user sessions    |
| `"transient"` | Every resolution   | Fresh instances, isolated state   |

### Compile-time validation

```typescript
// Missing dependency → TypeScript error at .build()
GraphBuilder.create()
  .provide(databaseAdapter) // requires LoggerPort, but it's not provided
  .build(); // Error: MissingDependencyError<typeof LoggerPort>

// Duplicate provider → TypeScript error
GraphBuilder.create()
  .provide(loggerAdapter)
  .provide(anotherLoggerAdapter) // Error: DuplicateProviderError<typeof LoggerPort>
  .build();
```

### Scopes

```typescript
const container = createContainer({ graph, name: "App" });

// Singletons resolve directly from the container
const config = container.resolve(ConfigPort);

// Scoped services need a scope
const scope = container.createScope();
const session = scope.resolve(UserSessionPort);
await scope.dispose();
```

### Testing

```typescript
import { createContainer } from "hex-di";

const testGraph = GraphBuilder.create()
  .provide(loggerAdapter)
  .provide(
    createAdapter({
      // swap the real DB for a stub
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: async () => [] }),
    })
  )
  .build();

const container = createContainer({ graph: testGraph, name: "Test" });
```

## TypeScript requirements

TypeScript 5.0+ with `strict: true`:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "target": "ES2022"
  }
}
```

## Monorepo development

```bash
pnpm install          # install all dependencies
pnpm build            # build all packages (Turborepo)
pnpm test             # run all tests (Vitest)
pnpm typecheck        # type-check all packages
pnpm lint             # lint all packages
pnpm lint:fix         # auto-fix lint issues
```

**Requirements:** Node ≥ 18, pnpm ≥ 9.

## Design

- **Compile-time over runtime** — dependency errors are TypeScript errors, not crashes
- **Immutable composition** — `GraphBuilder` returns new instances; graphs can be branched and merged safely
- **Ports & adapters** — swap any implementation without touching business logic
- **Errors as values** — `Result<T, E>` throughout the ecosystem, no silent throws
- **Zero overhead** — phantom types and optional features add no runtime cost

See [VISION.md](./VISION.md) for the longer-term direction.

## License

MIT
