# @hex-di/core

Zero-dependency foundational building blocks for the HexDI dependency injection framework. This package provides the type-level and runtime primitives that all other `@hex-di/*` packages build upon: ports, adapters, errors, inspection types, context variables, and tracing support.

## Overview

HexDI is a TypeScript-first dependency injection framework modelled on hexagonal architecture (ports and adapters). `@hex-di/core` is the shared foundation — it defines what a port is, what an adapter is, the error taxonomy, and the inspection protocol. Higher-level packages such as `@hex-di/container` consume these primitives to build actual dependency graphs and containers.

## Installation

```bash
npm install @hex-di/core
# or
pnpm add @hex-di/core
```

TypeScript 5.0 or later is required (peer dependency).

## Concepts

| Concept | Description |
|---------|-------------|
| **Port** | A branded token that names a service interface. Two ports with the same interface but different names are type-incompatible. |
| **DirectedPort** | A port annotated with a hexagonal direction (`'inbound'` for use-case interfaces, `'outbound'` for infrastructure interfaces). |
| **Adapter** | Binds a port to a concrete implementation via a factory function or class constructor, with a declared lifetime and dependency list. |
| **LazyPort** | Wraps a port so its dependency is injected as a thunk `() => T`, enabling bidirectional (normally circular) relationships. |

## Ports

### `port<TService>()(config)` — recommended

The curried builder preserves the port name as a TypeScript literal type:

```typescript
import { port } from "@hex-di/core";

interface Logger {
  log(message: string): void;
}

interface UserRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

// Inferred type: DirectedPort<Logger, "Logger", "outbound">
const LoggerPort = port<Logger>()({ name: "Logger" });

// Inbound (use-case) port with metadata
const UserServicePort = port<UserRepository>()({
  name: "UserRepository",
  direction: "outbound",
  description: "User persistence operations",
  category: "persistence",
  tags: ["user", "crud"],
});
```

### `createPort(config)` — explicit overloads

When you need full control over the type parameters:

```typescript
import { createPort } from "@hex-di/core";

// Type: DirectedPort<Logger, "Logger", "outbound">
const LoggerPort = createPort<"Logger", Logger>({ name: "Logger" });

// With direction
const RequestHandlerPort = createPort<"RequestHandler", RequestHandler, "inbound">({
  name: "RequestHandler",
  direction: "inbound",
});
```

Direction defaults to `'outbound'` when omitted. Both factories produce frozen objects with zero runtime overhead — the service type is a phantom type that only exists at compile time.

### Type utilities

```typescript
import type { InferService, InferPortName, InferPortDirection, InboundPorts, OutboundPorts } from "@hex-di/core";

type LoggerService = InferService<typeof LoggerPort>;   // Logger
type PortName     = InferPortName<typeof LoggerPort>;   // "Logger"
type Direction    = InferPortDirection<typeof LoggerPort>; // "outbound"
```

### Runtime port inspection

```typescript
import { isDirectedPort, isInboundPort, isOutboundPort, getPortDirection, getPortMetadata } from "@hex-di/core";

isDirectedPort(LoggerPort);          // true
isOutboundPort(LoggerPort);          // true
getPortDirection(LoggerPort);        // "outbound"
getPortMetadata(LoggerPort).description; // "Application logging"
```

## Adapters

### Factory-based adapters

```typescript
import { createAdapter, port } from "@hex-di/core";

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => ({ log: (msg) => console.log(msg) }),
  // defaults: requires: [], lifetime: "singleton", clonable: false
});

// With dependencies
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: ({ Logger, Database }) => new UserServiceImpl(Logger, Database),
});
```

The factory receives a dependencies object keyed by port name. The type of each value is inferred from the port's service type — no casts needed.

### Class-based adapters

Class constructors receive dependencies in the same order as the `requires` tuple:

```typescript
class UserServiceImpl implements UserService {
  constructor(
    private logger: Logger,
    private database: Database,
  ) {}

  getUser(id: string) { /* ... */ }
}

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  class: UserServiceImpl,
});
```

### Async factories

Async factories are automatically detected and locked to `"singleton"` lifetime:

```typescript
const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  factory: async () => {
    const db = await createConnection(process.env.DB_URL);
    return db;
  },
  // lifetime is forced to "singleton" for async factories
});
```

### Finalizers

Called when the container or scope is disposed:

```typescript
const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  factory: async () => createConnection(process.env.DB_URL),
  finalizer: async (db) => db.disconnect(),
});
```

### Lifetimes

| Value | Behaviour |
|-------|-----------|
| `"singleton"` | One instance per container, shared across all resolutions (default) |
| `"scoped"` | One instance per scope, isolated from parent and sibling scopes |
| `"transient"` | New instance on every resolution |

### Clonable flag

Mark an adapter `clonable: true` when its instance is safe to shallow-clone (no resource handles, no shared mutable state). This is required when using forked scope inheritance in higher-level packages.

## Lazy ports

Lazy ports break circular dependency chains. Instead of resolving `T` immediately, the factory receives a thunk `() => T` that is called on demand:

```typescript
import { lazyPort, isLazyPort, getOriginalPort } from "@hex-di/core";

const LazyUserService = lazyPort(UserServicePort);
// LazyUserService.__portName === "LazyUserService"

const NotificationAdapter = createAdapter({
  provides: NotificationServicePort,
  requires: [LazyUserService],
  lifetime: "singleton",
  factory: ({ LazyUserService }) => ({
    send: (userId, message) => {
      const users = LazyUserService(); // Resolved on first call
      const user = users.getUser(userId);
      console.log(`Sending "${message}" to ${user.name}`);
    },
  }),
});

isLazyPort(LazyUserService);          // true
getOriginalPort(LazyUserService);     // UserServicePort
```

## Error handling

Every error thrown by HexDI contains a structured code in the format `ERROR[HEXxxx]:`.

```typescript
import { isHexError, parseError, ErrorCode, NumericErrorCode } from "@hex-di/core";

const message = "ERROR[HEX001]: Duplicate adapter for 'Logger'.";

isHexError(message); // true

const parsed = parseError(message);
// { code: "DUPLICATE_ADAPTER", message: "...", details: { portName: "Logger" } }

if (parsed?.code === ErrorCode.DUPLICATE_ADAPTER) {
  // Handle specifically
}
```

### Error code ranges

| Range | Category |
|-------|----------|
| `HEX001–009` | Graph validation (circular deps, captive deps, duplicates, …) |
| `HEX010–019` | Adapter configuration (missing provides, invalid factory, …) |
| `HEX020–025` | Runtime / container errors (disposed scope, async init, …) |
| `HEX026–028` | Integrity / tamper detection |
| `HEX_WARN_001` | Warning: tracing not configured |

### Concrete error classes

```typescript
import {
  ContainerError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  NonClonableForkedError,
} from "@hex-di/core";
```

All concrete classes extend `ContainerError`. Use `isResolutionError` and `toResolutionError` to work with the `ResolutionError` union type.

## Context variables

Type-safe key-value pairs for passing runtime configuration through the DI graph:

```typescript
import { createContextVariable, withContext, getContext } from "@hex-di/core";

const requestId = createContextVariable<string>("requestId");
const timeout   = createContextVariable("timeout", 5000); // default 5000

// Build a context map
const ctx = new Map([
  [requestId.id, withContext(requestId, "req-abc-123").value],
]);

// Retrieve values
const id      = getContext(ctx, requestId); // "req-abc-123"
const timeMs  = getContext(ctx, timeout);   // 5000 (default)
```

Each variable uses a local `Symbol` for its identity, so two variables created with the same name string are always distinct.

## Correlation IDs

Monotonic, deterministic IDs for tracing service resolutions within a process:

```typescript
import { generateCorrelationId, configureCorrelationId, resetCorrelationId } from "@hex-di/core";

// Default: counter-based ("corr_0_0000", "corr_1_0001", ...)
const id1 = generateCorrelationId(); // "corr_0_0000"
const id2 = generateCorrelationId(); // "corr_1_0001"

// Custom generator (e.g., crypto-secure for audit trails)
configureCorrelationId({ generator: () => crypto.randomUUID() });

// Reset for test teardown
resetCorrelationId();
```

## Inspection types

`@hex-di/core` exports all inspection type definitions used by the container runtime. These types describe container snapshots, dependency graphs, resolution traces, and the library inspector protocol. They are consumed by `@hex-di/container` and the devtools packages rather than being used directly in most applications.

Key types exported:

- **Container snapshots**: `ContainerSnapshot`, `RootContainerSnapshot`, `ChildContainerSnapshot`, `ScopeSnapshot`
- **Graph inspection**: `InspectableGraph`, `GraphInspection`, `ValidationResult`, `GraphSuggestion`
- **Inspector API**: `InspectorAPI`, `InspectorEvent`, `InspectorListener`, `AdapterInfo`
- **Tracing**: `TraceEntry`, `TraceStats`, `TracingAPI`, `TracingOptions`, `TraceRetentionPolicy`
- **Library inspector protocol**: `LibraryInspector`, `LibraryEvent`, `UnifiedSnapshot`

## API reference

### Ports

| Export | Kind | Description |
|--------|------|-------------|
| `port<T>()` | function | Curried builder for service-typed ports |
| `createPort(config)` | function | Direct port factory with explicit overloads |
| `isDirectedPort(p)` | function | Runtime guard for directed ports |
| `isInboundPort(p)` | function | Runtime guard for inbound ports |
| `isOutboundPort(p)` | function | Runtime guard for outbound ports |
| `getPortDirection(p)` | function | Returns `'inbound'` or `'outbound'` |
| `getPortMetadata(p)` | function | Returns `PortMetadata` |
| `Port<T, TName>` | type | Branded port type |
| `DirectedPort<T, N, D>` | type | Port with direction |
| `InboundPort<T, N>` | type | Alias for `DirectedPort<T, N, 'inbound'>` |
| `OutboundPort<T, N>` | type | Alias for `DirectedPort<T, N, 'outbound'>` |
| `InferService<P>` | type | Extract service type from port |
| `InferPortName<P>` | type | Extract port name literal from port |
| `InferPortDirection<P>` | type | Extract direction from directed port |
| `InboundPorts<P>` | type | Filter union to only inbound ports |
| `OutboundPorts<P>` | type | Filter union to only outbound ports |

### Adapters

| Export | Kind | Description |
|--------|------|-------------|
| `createAdapter(config)` | function | Unified adapter factory (factory or class variant) |
| `lazyPort(port)` | function | Wrap a port for deferred resolution |
| `isLazyPort(p)` | function | Runtime guard for lazy ports |
| `getOriginalPort(lazy)` | function | Extract original port from lazy port |
| `isAdapter(v)` | function | Runtime guard for adapter objects |
| `isAdapterFrozen(a)` | function | Tamper-detection check |
| `Adapter<...>` | type | Branded adapter type |
| `Lifetime` | type | `"singleton" \| "scoped" \| "transient"` |
| `FactoryKind` | type | `"sync" \| "async"` |
| `ResolvedDeps<TRequires>` | type | Dependency object type from a requires union |
| `PortDeps<TRequires>` | type | Dependency object type from a requires tuple |
| `SINGLETON`, `SCOPED`, `TRANSIENT` | const | Literal-typed lifetime constants |
| `SYNC`, `ASYNC` | const | Literal-typed factory kind constants |

### Errors

| Export | Kind | Description |
|--------|------|-------------|
| `isHexError(msg)` | function | Check if string is a HexDI error/warning |
| `parseError(msg)` | function | Parse error message into structured info |
| `ContainerError` | class | Base error class |
| `CircularDependencyError` | class | Circular dep detected |
| `FactoryError` | class | Factory threw during instantiation |
| `DisposedScopeError` | class | Resolution from disposed scope |
| `ScopeRequiredError` | class | Scoped port resolved from root |
| `AsyncFactoryError` | class | Async factory threw |
| `AsyncInitializationRequiredError` | class | Async port resolved without init |
| `NonClonableForkedError` | class | Non-clonable adapter in forked scope |
| `ErrorCode` | const | Structured string error codes |
| `NumericErrorCode` | const | `HEXxxx` formatted codes |
| `isResolutionError(e)` | function | Guard for `ResolutionError` union |
| `toResolutionError(e)` | function | Convert thrown value to `ResolutionError` |

## License

MIT
