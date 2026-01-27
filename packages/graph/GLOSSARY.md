# Glossary

This document defines the key terms and concepts used throughout the `@hex-di/graph` package. Understanding these terms is essential for working with the type-level validation system.

## Core Concepts

### Port

A **type-safe service identifier** that acts as a contract between consumers and providers. Ports are the "plugs" that adapters connect to.

```typescript
const LoggerPort = createPort<"Logger", Logger>("Logger");
//                            ^name     ^service type
```

**Think of it as**: An interface in traditional DI, but with compile-time enforcement via phantom types.

### Adapter

A **factory declaration** that implements a Port. An adapter captures:

- **provides**: Which port this adapter satisfies (single port)
- **requires**: Which ports this adapter depends on (array of ports)
- **lifetime**: How long service instances should live
- **factory**: A function that creates the service instance

```typescript
const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort, ConfigPort],
  lifetime: "scoped",
  factory: deps => new DatabaseImpl(deps.Logger, deps.Config),
});
```

### Graph / GraphBuilder

The **immutable builder** that accumulates adapters and validates dependencies at compile time. Each `.provide()` call returns a NEW builder with updated type parameters.

```typescript
const builder1 = GraphBuilder.create(); // GraphBuilder<never, never>
const builder2 = builder1.provide(LoggerAdapter); // GraphBuilder<LoggerPort, never>
// builder1 is unchanged
```

### Lifetime

Controls how long a service instance lives:

| Lifetime      | Level | Description                    | Use Case                           |
| ------------- | ----- | ------------------------------ | ---------------------------------- |
| `"singleton"` | 1     | One instance for entire app    | Shared resources, connection pools |
| `"scoped"`    | 2     | One instance per scope/request | Request context, transactions      |
| `"transient"` | 3     | New instance every resolution  | Stateful services, isolation       |

**Level ordering**: Lower number = longer lived. Singleton (1) > Scoped (2) > Transient (3).

---

## Type-Level Concepts

### Phantom Type

A **type parameter that exists only at compile-time** with zero runtime footprint. Used to track builder state without any memory overhead.

```typescript
// The TProvides, TRequires, etc. are phantom types - they exist only for the compiler
declare readonly __provides: TProvides;  // No runtime value, just type information
```

**Why it matters**: Enables TypeScript to track what ports are provided/required without any runtime cost.

### Type-State Machine

A pattern where **type parameters encode the current state** of an object. Each method returns a new type reflecting the state transition.

```
create()         provide(A)         provide(B)         build()
   │                  │                  │                │
   ▼                  ▼                  ▼                ▼
Empty            +LoggerPort      +DatabasePort       Graph
P: never         P: Logger        P: Logger|Db        (validated)
R: never         R: never         R: Logger
```

### BuilderInternals

A **grouped phantom type parameter** that encapsulates internal state to reduce visible type parameters from 8 to 5, improving IDE tooltip readability.

Contains:

- `depGraph`: Type-level dependency map for cycle detection
- `lifetimeMap`: Type-level port→lifetime map for captive detection
- `parentProvides`: Parent graph's provided ports
- `maxDepth`: Maximum cycle detection depth

### Prettify Pattern

A **type-level utility** that flattens intersection types into a single, readable object type. This dramatically improves IDE tooltip readability.

**The Problem**: TypeScript often creates deeply nested intersection types that are hard to read:

```typescript
// Before Prettify - IDE shows:
type Messy = { a: number } & { b: string } & { c: boolean };
// Tooltip: "{ a: number } & { b: string } & { c: boolean }"
```

**The Solution**: The `Prettify<T>` mapped type forces TypeScript to evaluate the intersection into a single object:

```typescript
// After Prettify - IDE shows:
type Clean = Prettify<{ a: number } & { b: string } & { c: boolean }>;
// Tooltip: "{ a: number; b: string; c: boolean }"
```

**Implementation**:

```typescript
/**
 * Flattens intersection types into a single object type for cleaner tooltips.
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
```

**Why the `& {}`?**: The trailing `& {}` forces TypeScript to "normalize" the result. Without it, TypeScript may still display the mapped type form. The empty intersection has no runtime effect but triggers type expansion.

**Where Used in @hex-di/graph**:

- `InspectableBuilder<B>` - Flattens builder inspection results
- `DebugBuilderState<B>` - Flattens comprehensive debug views
- Various internal type utilities

**When to Use Prettify**:

- Intersection types with 3+ members
- User-facing types (APIs, inspections)
- Complex computed types that become unreadable

**When NOT to Use Prettify**:

- Simple types (already readable)
- Internal types not exposed to users
- Types where preserving intersection structure matters for error messages

---

## Validation Errors

### Circular Dependency

When **Service A depends on Service B, and Service B (directly or transitively) depends on Service A**. This creates an infinite loop during resolution.

```
A -> B -> C -> A  // Cycle!
```

**Fix options**:

1. Extract shared logic into a new service
2. Use lazy resolution (`LazyPort`)
3. Invert one of the dependencies

### Captive Dependency

When a **longer-lived service depends on a shorter-lived one**. The longer-lived service would "capture" a stale instance.

```typescript
// ERROR: Singleton capturing a Scoped service
const CacheAdapter = createAdapter({
  provides: CachePort,
  lifetime: "singleton", // Lives forever
  requires: [RequestContextPort], // But this is per-request!
  // ...
});
```

**Fix**: Change lifetimes so the dependent has equal or shorter lifetime than its dependencies.

### Duplicate Provider

When **two adapters provide the same port**. The graph cannot determine which implementation to use.

```typescript
// ERROR: Two adapters for LoggerPort
builder.provide(ConsoleLoggerAdapter).provide(FileLoggerAdapter);
```

**Fix**: Remove one adapter, or use `.override()` for child graphs.

### Missing Dependency

When **a required port has no adapter**. The graph is incomplete.

```typescript
// ERROR: UserService requires Database, but Database isn't provided
builder.provide(UserServiceAdapter).build();
```

**Fix**: Add the missing adapter via `.provide()`.

---

## Advanced Concepts

### Forward Reference

The ability to **register adapters in any order**. Dependencies don't need to be provided before their consumers.

```typescript
// Both work identically:
builder.provide(UserService).provide(Logger); // User depends on Logger
builder.provide(Logger).provide(UserService);
```

Validation happens at `.build()`, not at `.provide()`.

### Dependency Graph (Type-Level)

A **type-level adjacency map** tracking which ports depend on which:

```typescript
type ExampleDepGraph = {
  Logger: never; // No dependencies
  Database: "Logger"; // Depends on Logger
  UserService: "Logger" | "Database"; // Depends on both
};
```

Used for cycle detection via type-level DFS.

### Lifetime Map (Type-Level)

A **type-level map** tracking each port's lifetime level:

```typescript
type ExampleLifetimeMap = {
  Logger: 1; // Singleton (level 1)
  Database: 2; // Scoped (level 2)
  Cache: 3; // Transient (level 3)
};
```

Used for captive dependency detection.

### Variance (in AdapterAny)

TypeScript's rules for type compatibility:

- **Covariant** (`out`): Output/read positions. Use `unknown` for widest match.
- **Contravariant** (`in`): Input/write positions. Use `never` for widest match.

```typescript
// AdapterAny uses variance to match ANY adapter without `any`:
interface AdapterAny {
  readonly provides: Port<unknown, string>; // Covariant (output)
  readonly factory: (...args: never[]) => unknown; // Contravariant params, covariant return
  finalizer?(instance: never): void; // Contravariant param
}
```

This follows the Effect-TS pattern for universal constraints.

---

## See Also

- [README.md](./README.md) - Package documentation and API reference
- [DESIGN.md](./docs/DESIGN.md) - Architecture decisions and patterns
- [typescript-patterns.md](./docs/typescript-patterns.md) - Type-level programming guide
