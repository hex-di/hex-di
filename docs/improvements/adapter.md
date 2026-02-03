# Adapter API Improvements

> **Status: IMPLEMENTED** (v3.0 - February 2026)
>
> This document describes the design and migration from 7 adapter functions to a single unified `createAdapter()` API. The migration is complete.

## Final State

### Rating: 9.2/10

| Aspect            | Score | Notes                                                     |
| ----------------- | ----- | --------------------------------------------------------- |
| Type Safety       | 10/10 | Excellent - phantom types, variance, ResolvedDeps         |
| Flexibility       | 9/10  | 3 lifetimes, async, finalizers, lazy ports                |
| Error Handling    | 10/10 | Error codes HEX010-HEX018, compile-time async enforcement |
| Design Separation | 9/10  | Port has metadata, Adapter binds                          |
| Documentation     | 8/10  | Good JSDoc, single entry point                            |
| Performance       | 8/10  | Object.freeze, phantom types = zero cost                  |
| Ergonomics        | 9/10  | Single function, object config, smart defaults            |
| Consistency       | 10/10 | Always object config, always returns Adapter              |
| API Simplicity    | 10/10 | 1 function with clear options                             |
| Maintainability   | 9/10  | Single implementation to maintain                         |
| Discoverability   | 10/10 | One function to learn                                     |

---

## Problems Solved

### Before: 7 Entry Points

```typescript
// Level 1: Direct factory
createAdapter();
createAsyncAdapter(); // REMOVED

// Level 2: Convenience helpers
defineService(); // REMOVED (10+ overloads!)
defineAsyncService(); // REMOVED

// Level 3: Builders
ServiceBuilder.create(); // REMOVED
fromClass(); // REMOVED
createClassAdapter(); // REMOVED
```

### After: 1 Entry Point

```typescript
createAdapter({ provides, requires?, lifetime?, factory })
createAdapter({ provides, requires?, lifetime?, class: MyClass })
```

---

## Current API: `createAdapter()`

```typescript
createAdapter<TProvides, TRequires>({
  provides: Port,
  requires?: Port[],                           // default: []
  lifetime?: 'singleton' | 'scoped' | 'transient', // default: 'singleton'
  factory: (deps: ResolvedDeps) => T | Promise<T>,
  finalizer?: (instance: T) => void | Promise<void>,
  clonable?: boolean                           // default: false
}): Adapter
```

### Removed APIs

The following were removed in v3.0:

- `createAsyncAdapter()` - async is auto-detected from factory return type
- `defineService()` - replaced by `createAdapter()` with object config
- `defineAsyncService()` - replaced by `createAdapter()` with async factory
- `ServiceBuilder` - replaced by `createAdapter()` with object config
- `fromClass()` - replaced by `createAdapter({ class: MyClass })`
- `createClassAdapter()` - replaced by `createAdapter({ class: MyClass })`

**Result: 1 function instead of 7**

---

## Async Lifetime Enforcement

### Bad: Silent Override

```typescript
createAdapter({
  provides: DatabasePort,
  lifetime: "scoped", // silently becomes 'singleton'
  factory: async () => await connectDB(),
});
```

**Problems:**

- User thinks it's scoped
- Debugging nightmare
- Violates principle of least surprise

### Good: Compile Error

```typescript
createAdapter({
  provides: DatabasePort,
  lifetime: "scoped", // COMPILE ERROR
  factory: async () => await connectDB(),
});

// Error: Async factory requires lifetime: 'singleton'
```

```typescript
createAdapter({
  provides: DatabasePort,
  lifetime: "singleton", // OK - explicit
  factory: async () => await connectDB(),
});
```

### Type Implementation

```typescript
type ValidateAsyncLifetime<TFactory, TLifetime extends Lifetime> =
  ReturnType<TFactory> extends Promise<unknown>
    ? TLifetime extends "singleton"
      ? TLifetime // OK
      : AsyncRequiresSingletonError // Compile error
    : TLifetime; // Sync factory - any lifetime OK

type AsyncRequiresSingletonError = {
  readonly __errorBrand: "AsyncRequiresSingletonError";
  readonly __message: 'Async factory requires lifetime: "singleton"';
  readonly __hint: "Async services are initialized once and cached";
};
```

### IDE Error Display

```
createAdapter({
  provides: DatabasePort,
  lifetime: 'scoped',
           ~~~~~~~~
  factory: async () => await connectDB()
});

Error: Type '"scoped"' is not assignable to type {
  __errorBrand: 'AsyncRequiresSingletonError',
  __message: 'Async factory requires lifetime: "singleton"',
  __hint: 'Async services are initialized once and cached'
}
```

---

## Default Behavior

### Sync Factory

```typescript
createAdapter({
  provides: LoggerPort,
  // lifetime omitted -> default 'singleton'
  factory: () => new Logger(),
});

createAdapter({
  provides: LoggerPort,
  lifetime: "scoped", // OK - any lifetime allowed
  factory: () => new Logger(),
});
```

### Async Factory

```typescript
createAdapter({
  provides: DatabasePort,
  // lifetime omitted -> default 'singleton' OK
  factory: async () => await connectDB(),
});

createAdapter({
  provides: DatabasePort,
  lifetime: "singleton", // OK - explicit
  factory: async () => await connectDB(),
});

createAdapter({
  provides: DatabasePort,
  lifetime: "scoped", // COMPILE ERROR
  factory: async () => await connectDB(),
});
```

---

## Clean Usage Flow

```typescript
// 1. Define ports (with rich metadata)
const ConfigPort = createPort<"Config", Config>({
  name: "Config",
  category: "configuration",
});

const LoggerPort = createPort<"Logger", Logger>({
  name: "Logger",
  description: "JSON structured logging",
  category: "observability",
  tags: ["logging", "monitoring"],
});

const UserServicePort = createPort<"UserService", UserService>({
  name: "UserService",
  direction: "inbound",
  description: "User CRUD operations",
  category: "command",
});

// 2. Create adapters (simple binding)
const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  factory: () => loadEnv(),
});

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [ConfigPort],
  factory: ({ Config }) => new Logger(Config),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort],
  lifetime: "scoped",
  factory: ({ Logger }) => new UserService(Logger),
});

// 3. Build graph
const graph = GraphBuilder.create()
  .provide(ConfigAdapter)
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)
  .build();
```

---

## Design Separation

```
+-------------------------------------------------------------------+
|                      CLEAN SEPARATION                             |
+-------------------------------------------------------------------+

  PORT = Contract + Metadata
  --------------------------
  * name
  * direction ('inbound' | 'outbound')
  * description
  * category
  * tags

  ADAPTER = Implementation Binding
  ---------------------------------
  * provides (references Port with metadata)
  * requires
  * lifetime
  * factory
  * finalizer
  * clonable

  Adapter inherits all metadata through its `provides` port

+-------------------------------------------------------------------+
```

---

## What to Keep

### Excellent (Don't Change)

- Type safety (phantom types, variance, ResolvedDeps)
- Port/Adapter separation
- Lifetime semantics (singleton, scoped, transient)
- Finalizer support
- Error code system (HEX010-HEX018)
- Lazy ports for circular dependencies
- Clonable support

### What to Simplify

| Current                   | Proposed                 |
| ------------------------- | ------------------------ |
| 7 functions               | 1 function               |
| 10+ overloads             | Smart defaults           |
| Manual async detection    | Auto-detect from factory |
| Curried builders          | Direct config object     |
| Inconsistent return types | Always returns `Adapter` |

---

## Breaking Changes (v3.0)

The following breaking changes were made:

1. Removed `createAsyncAdapter()` - use `createAdapter()` with async factory
2. Removed `defineService()` and `defineAsyncService()`
3. Removed `ServiceBuilder` class
4. Removed `fromClass()` and `createClassAdapter()`
5. Async factory with non-singleton lifetime = compile error (not silent override)

---

## Benefits Summary

| Benefit                | Description                                       |
| ---------------------- | ------------------------------------------------- |
| Single Entry Point     | One function to learn                             |
| Consistent API         | Always object config, always returns Adapter      |
| Explicit Async         | Compile error if lifetime incompatible            |
| Fewer Overloads        | Smart defaults instead of combinatorial explosion |
| Better Discoverability | IDE shows one function with clear options         |
| Easier Maintenance     | One implementation to maintain                    |
| Type Safety Preserved  | All existing type guarantees remain               |
