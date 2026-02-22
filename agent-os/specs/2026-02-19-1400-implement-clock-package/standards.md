# Standards for @hex-di/clock Implementation

---

## libs/lib-src-layout

Consistent directory structure across all lib core packages.

```
src/
  index.ts          # Root barrel — all public exports, sectioned by area
  ports/            # Port definitions (DirectedPort tokens + service interfaces)
  adapters/         # createAdapter() implementations, one subdir per variant
  types/            # Domain types, interfaces, enums used across the lib
  context/          # createContextVariable() bindings for ambient state propagation
  inspection/       # Devtools integration: inspector port, library-inspector bridge
  instrumentation/  # Container hooks: resolution lifecycle hooks, tracing spans/logs
  testing/          # Test assertion helpers (assertXxx, matchers) — no vitest peer dep here
  utils/            # Pure utility functions with no DI coupling
  framework/        # Framework middleware (Hono, Express, etc.)
  integration/      # Cross-lib wiring: library-inspector-adapter, registry adapters
```

**Key distinctions:**
- `inspection/` — devtools read-only query API, inspector port, library-inspector bridge
- `instrumentation/` — container hooks that emit tracing spans or logs during resolution
- `integration/` — adapters that wire this lib into the broader HexDI ecosystem (library-inspector, registry)
- `context/` — always `createContextVariable()` from `@hex-di/core`; ambient state threaded through DI
- Not all dirs are required — only create what the lib needs

---

## libs/lib-index-structure

The root `index.ts` must be divided into sections using banner comments. Section order follows the dependency hierarchy (types before consumers).

```typescript
// =============================================================================
// Ports
// =============================================================================
export { LoggerPort } from "./ports/index.js";
export type { Logger } from "./ports/index.js";

// =============================================================================
// Core Types
// =============================================================================
export type { LogLevel, LogEntry } from "./types/index.js";

// =============================================================================
// Adapters
// =============================================================================
export { ConsoleLoggerAdapter, MemoryLoggerAdapter } from "./adapters/index.js";

// =============================================================================
// Context Variables
// =============================================================================
export { LogContextVar } from "./context/index.js";

// =============================================================================
// Utilities
// =============================================================================
export { mergeContext } from "./utils/index.js";

// =============================================================================
// Instrumentation
// =============================================================================
export { instrumentContainer } from "./instrumentation/index.js";

// =============================================================================
// Inspection
// =============================================================================
export { LoggerInspectorPort } from "./inspection/index.js";

// =============================================================================
// Testing Utilities
// =============================================================================
export { assertLogEntry } from "./testing/index.js";
```

- Banner format: `// ===...=== (78 chars)`, then `// Section Title`, then `// ===...===`
- Each section re-exports from its subdirectory's `index.js`
- Ports section is always first
- Testing Utilities section is always last
- Omit sections that don't apply to the lib

---

## libs/lib-dependencies

All `@hex-di/*` framework packages belong in `peerDependencies`, not `dependencies`.

```json
{
  "peerDependencies": {
    "@hex-di/core": "workspace:*",
    "@hex-di/runtime": "workspace:*",
    "@hex-di/result": "workspace:*"
  },
  "dependencies": {}
}
```

- `@hex-di/core` as `dependencies` in saga/query/store is a legacy inconsistency — new libs must use `peerDependencies`
- `sideEffects: false` is required on all lib packages for tree-shaking
- `"type": "module"` is required (ESM-first)

---

## libs/lib-sub-packages

Each lib is split into focused packages so users only pay for what they install.

```
libs/
  logger/
    core/        @hex-di/logger          # ports, adapters, types, utils
    react/       @hex-di/logger-react    # React hooks/providers (peer: react)
    bunyan/      @hex-di/logger-bunyan   # Bunyan backend (peer: bunyan)
```

**Split rules:**
- `react/` — anything requiring `react` as peer dep
- `testing/` — test utilities requiring `vitest` as peer dep
- Vendor backends — anything requiring a third-party vendor as peer dep
- Core package must have zero optional deps that would bloat all users

---

## ports/port-factory-api

Use `port<T>()({...})` (preferred) for literal name inference.
Use `createPort<TName, T>({...})` only when explicit type params are needed.

Always include all metadata fields, even optional ones.

```typescript
// Preferred
export const LoggerPort = port<Logger>()({
  name: "Logger",
  direction: "outbound",
  description: "Structured logging service for context-aware log output",
  category: "logger/logger",
  tags: ["logging", "observability"],
});
```

- Always provide `description`, `category`, and `tags` — they are optional in the API but required by convention
- `port<T>()` curried form preserves `name` as a string literal in the resulting type
- `lifetime` is **not** a port config field (it belongs to `createAdapter`)
- There is no `definePort` function

---

## ports/port-category

Use `"library/role"` format. The prefix scopes to the package, the suffix identifies the port's role within it.

For `@hex-di/clock`:
- `"clock/clock"` — primary clock port
- `"clock/sequence"` — sequence generator port
- `"clock/timer"` — timer scheduler port
- `"clock/cached-clock"` — cached clock port
- `"clock/diagnostics"` — clock diagnostics port
- `"clock/source-changed"` — clock source change sink port

Do **not** use the `SuggestedCategory` enum values (`"logging"`, `"persistence"`, etc.) — they are too coarse-grained.

---

## ports/port-direction

`direction` reflects the data flow direction in hexagonal architecture.

| Direction  | Data flow                    | Examples                          |
|------------|------------------------------|-----------------------------------|
| `outbound` | domain → infrastructure      | Logger, Tracer, Database, Cache   |
| `inbound`  | infrastructure → domain      | Streams, Queries, Mutations       |

All clock ports are `outbound` — the application calls into clock/timer/sequence infrastructure.

---

## adapters/adapter-factory-vs-class

Use `factory` for custom wiring logic. Use `class` for pure constructor injection.

```typescript
// factory — any wiring logic, functional construction
export const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => createConsoleLogger(),
});

// factory with deps
export const ScopedLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [LogHandlerPort],
  lifetime: "scoped",
  factory: deps => createHandlerLogger(deps.LogHandler),
});
```

- `factory` and `class` are mutually exclusive
- With `factory`, deps are accessed by port name (`deps.LogHandler`), order is irrelevant

---

## adapters/adapter-lifetime

Match the lifetime to the lifecycle of the thing being wrapped.

| Lifetime | When to use | Examples |
|---|---|---|
| `"singleton"` | Stateless or globally shared | Logger, Tracer, HTTP client, config |
| `"scoped"` | Holds per-request/per-scope state | Request-bound logger, user context |
| `"transient"` | Must never be shared across injections | Memory adapters for test isolation |

For clock:
- `SystemClockAdapter` → `"singleton"` (captures platform APIs at construction, stateless)
- `SystemSequenceGeneratorAdapter` → `"singleton"` (shared global counter)
- `SystemTimerSchedulerAdapter` → `"singleton"` (stateless wrapper)
- `SystemCachedClockAdapter` → `"singleton"` (shared cache)
- `VirtualClockAdapter` → `"transient"` (each test gets isolated time control)
- `VirtualSequenceGenerator` → `"transient"` (test isolation)

---

## adapters/adapter-deps-access

In a `factory`, dependencies are accessed by the port's `name` field — not the variable name.

```typescript
// LogHandlerPort has name: "LogHandler"
factory: deps => createHandlerLogger(
  deps.LogHandler,  // not deps.LogHandlerPort
),
```

- `deps.<Name>` where `<Name>` is the port's `name:` field (without `Port` suffix)
- Order of `requires` is irrelevant for `factory` — access by name, not position

---

## graph/graph-composition-flow

The full pipeline: create a builder → register adapters → build the graph → create a container.

```typescript
const graph = GraphBuilder.create()
  .provide(SystemClockAdapter)
  .provide(SystemSequenceGeneratorAdapter)
  .build();

const container = createContainer({ graph, name: "AppContainer" });
```

- `GraphBuilder.create()` — static factory; never use `new GraphBuilder()`
- `.provide(adapter)` — immutable; always assign the result
- `.build()` — validates deps at compile time and runtime
- `name` is required in `createContainer`

---

## testing/test-container-setup

No shared test helper exists. Write the full pipeline inline per test.

```typescript
const graph = GraphBuilder.create()
  .provide(SystemClockAdapter)
  .build();

const container = createContainer({ graph, name: "Test" });
const clock = container.resolve(ClockPort);
```

- Only register the ports the test actually needs
- `name` is required in `createContainer`; use a descriptive string

---

## testing/test-memory-adapters

Built-in in-memory test doubles for logger and tracer ports. For clock:
- `VirtualClockAdapter` is the clock test double (transient, has `advance()`, `setTime()`, `autoAdvance`)
- `VirtualSequenceGenerator` has `reset()` (testing only — production port does not)
- `VirtualTimerScheduler` linked to `VirtualClockAdapter`, has `blockUntil()` for waiter sync
- Both adapters have lifetime `"transient"` — each injection gets a fresh instance
