# Error Code Registry

This document provides a comprehensive reference for all error codes in `@hex-di/graph`.

## Error Format

All error messages follow the format:

```
ERROR[HEXxxx]: Description. Fix: Guidance.
WARNING[HEXxxx]: Description. Fix: Guidance.
```

## Quick Reference

| Code   | Name                     | Severity | Detection    | Category        |
| ------ | ------------------------ | -------- | ------------ | --------------- |
| HEX001 | Duplicate Adapter        | Error    | Compile-time | Graph Structure |
| HEX002 | Circular Dependency      | Error    | Both         | Graph Structure |
| HEX003 | Captive Dependency       | Error    | Both         | Lifetime        |
| HEX004 | Reverse Captive          | Error    | Compile-time | Lifetime        |
| HEX005 | Lifetime Inconsistency   | Error    | Compile-time | Merge           |
| HEX006 | Self-Dependency          | Error    | Compile-time | Graph Structure |
| HEX007 | Depth Limit              | Warning  | Compile-time | Validation      |
| HEX008 | Missing Dependency       | Error    | Compile-time | Graph Structure |
| HEX009 | Override Without Parent  | Error    | Compile-time | Child Container |
| HEX010 | Missing Provides         | Error    | Runtime      | Adapter Config  |
| HEX011 | Invalid Provides         | Error    | Runtime      | Adapter Config  |
| HEX012 | Invalid Requires Type    | Error    | Runtime      | Adapter Config  |
| HEX013 | Invalid Requires Element | Error    | Runtime      | Adapter Config  |
| HEX014 | Invalid Lifetime Type    | Error    | Runtime      | Adapter Config  |
| HEX015 | Invalid Lifetime Value   | Error    | Runtime      | Adapter Config  |
| HEX016 | Invalid Factory          | Error    | Runtime      | Adapter Config  |
| HEX017 | Duplicate Requires       | Error    | Runtime      | Adapter Config  |
| HEX018 | Invalid Finalizer        | Error    | Runtime      | Adapter Config  |
| HEX019 | Invalid Lazy Port        | Error    | Runtime      | Adapter Config  |

## Detailed Reference

### HEX001: Duplicate Adapter

**Message:** `ERROR[HEX001]: Duplicate adapter for 'PortName'. Fix: Use override() for intentional replacement.`

**When:** Two adapters provide the same port.

**Cause:**

```typescript
GraphBuilder.create()
  .provide(LoggerAdapterA) // Provides LoggerPort
  .provide(LoggerAdapterB); // Also provides LoggerPort - ERROR!
```

**Fix:** Use `override()` for intentional replacement in child containers:

```typescript
GraphBuilder.forParent(parentGraph).override(MockLoggerAdapter); // Explicitly replaces parent's Logger
```

---

### HEX002: Circular Dependency

**Message:** `ERROR[HEX002]: Circular dependency: A -> B -> A. Fix: Break the cycle using lazyPort() or restructure dependencies.`

**When:** Adapters form a dependency cycle.

**Detection:** Compile-time (type-level DFS) and runtime (fallback when depth exceeded).

**Cause:**

```typescript
const AdapterA = createAdapter({
  provides: PortA,
  requires: [PortB],  // A depends on B
  ...
});
const AdapterB = createAdapter({
  provides: PortB,
  requires: [PortA],  // B depends on A - CYCLE!
  ...
});
```

**Fix:** Use `lazyPort()` to break the cycle:

```typescript
const AdapterA = createAdapter({
  provides: PortA,
  requires: [lazyPort(PortB)], // Deferred resolution
  factory: ({ PortB }) => ({ getB: () => PortB().value }),
});
```

---

### HEX003: Captive Dependency

**Message:** `ERROR[HEX003]: Captive dependency: Singleton 'UserService' cannot depend on Scoped 'RequestContext'. Fix: Change lifetimes or use lazyPort().`

**When:** A longer-lived service depends on a shorter-lived service.

**Detection:** Compile-time (type-level) and runtime (defense-in-depth for forward references).

**Cause:**

```typescript
const SingletonAdapter = createAdapter({
  provides: UserServicePort,
  lifetime: "singleton",        // Lives forever
  requires: [RequestContextPort], // Scoped - should be recreated per request!
  ...
});
```

**Problem:** The singleton will hold a reference to a single RequestContext instance, causing stale data across requests.

**Fix Options:**

1. Align lifetimes: Make UserService scoped
2. Use `lazyPort()` to get fresh instances:

```typescript
requires: [lazyPort(RequestContextPort)],
factory: ({ RequestContext }) => ({
  getCurrentUser: () => RequestContext().userId  // Fresh each call
})
```

---

### HEX004: Reverse Captive Dependency

**Message:** `ERROR[HEX004]: Reverse captive dependency: Existing Singleton 'Cache' would capture new Scoped 'Session'. Fix: Adjust lifetimes.`

**When:** Adding a new adapter would create a captive situation with an existing adapter.

**Cause:** This occurs when adapter registration order matters:

```typescript
// Step 1: Add singleton that depends on unregistered Session
.provide(CacheAdapter)  // singleton, requires SessionPort

// Step 2: Register Session as scoped - creates reverse captive!
.provide(SessionAdapter)  // scoped - ERROR!
```

**Fix:** Register in correct order or adjust lifetimes.

---

### HEX005: Lifetime Inconsistency

**Message:** `ERROR[HEX005]: Lifetime inconsistency for 'Logger': Graph A provides Singleton, Graph B provides Scoped. Fix: Use consistent lifetimes.`

**When:** Merging graphs that provide the same port with different lifetimes.

**Cause:**

```typescript
const graphA = GraphBuilder.create()
  .provide(createAdapter({ provides: LoggerPort, lifetime: "singleton", ... }))
  .build();

const graphB = GraphBuilder.create()
  .provide(createAdapter({ provides: LoggerPort, lifetime: "scoped", ... }))
  .build();

// Merging would create ambiguity - ERROR!
```

**Fix:** Ensure consistent lifetimes across graphs being merged.

---

### HEX006: Self-Dependency

**Message:** `ERROR[HEX006]: Self-dependency detected. Adapter for 'Service' requires its own port.`

**When:** An adapter lists its own port in requires.

**Cause:**

```typescript
const BrokenAdapter = createAdapter({
  provides: ServicePort,
  requires: [ServicePort],  // Cannot require yourself!
  ...
});
```

**Fix:** Remove the self-dependency or use `lazyPort()` if you genuinely need recursive access.

---

### HEX007: Depth Limit Warning

**Message:** `WARNING[HEX007]: Type-level depth limit (50) exceeded during cycle detection. Validation may be incomplete.`

**When:** Type-level validation exceeds the configured depth limit.

**Not an Error:** This is a warning indicating incomplete validation, not a failure.

**Implications:**

- Cycle detection may have false negatives
- Runtime validation will catch any missed cycles at `build()` time

**Fix Options:**

1. Increase limit: `GraphBuilder.withMaxDepth<100>().create()`
2. Restructure graph to reduce depth
3. Use `withUnsafeDepthOverride()` to acknowledge incomplete validation

---

### HEX008: Missing Dependency

**Message:** `ERROR[HEX008]: Missing adapters for Logger, Database. Fix: Register adapters for these ports.`

**When:** `build()` is called but required ports have no adapters.

**Cause:**

```typescript
const UserAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  ...
});

GraphBuilder.create()
  .provide(UserAdapter)  // Requires Logger and Database
  .build();              // ERROR: Missing adapters!
```

**Fix:** Provide all required adapters:

```typescript
GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).provide(UserAdapter).build(); // Success
```

---

### HEX009: Override Without Parent

**Message:** `ERROR[HEX009]: Cannot use override() without forParent(). Fix: Use forParent() to create child container.`

**When:** `override()` is called on a root GraphBuilder.

**Cause:**

```typescript
GraphBuilder.create().override(MockAdapter); // ERROR: No parent to override!
```

**Fix:** Use `forParent()`:

```typescript
GraphBuilder.forParent(parentGraph).override(MockAdapter); // OK: Overrides parent's adapter
```

---

### HEX010-019: Adapter Configuration Errors

These errors occur at runtime when `createAdapter()` receives invalid configuration.

| Code   | Error                    | Cause                                              |
| ------ | ------------------------ | -------------------------------------------------- |
| HEX010 | Missing Provides         | `provides` field is undefined                      |
| HEX011 | Invalid Provides         | `provides` is not a valid Port object              |
| HEX012 | Invalid Requires Type    | `requires` is not an array                         |
| HEX013 | Invalid Requires Element | `requires[n]` is not a valid Port                  |
| HEX014 | Invalid Lifetime Type    | `lifetime` is not a string                         |
| HEX015 | Invalid Lifetime Value   | `lifetime` is not "singleton"/"scoped"/"transient" |
| HEX016 | Invalid Factory          | `factory` is not a function                        |
| HEX017 | Duplicate Requires       | `requires` contains the same port twice            |
| HEX018 | Invalid Finalizer        | `finalizer` is present but not a function          |
| HEX019 | Invalid Lazy Port        | `lazyPort()` called with invalid port              |

## Programmatic Error Handling

```typescript
import { parseGraphError, GraphErrorCode } from "@hex-di/graph";

const error =
  "ERROR[HEX003]: Captive dependency: Singleton 'A' cannot depend on Scoped 'B'. Fix: ...";
const parsed = parseGraphError(error);

if (parsed) {
  switch (parsed.code) {
    case GraphErrorCode.CAPTIVE_DEPENDENCY:
      console.log(
        `Lifetime conflict: ${parsed.details.dependentName} -> ${parsed.details.captiveName}`
      );
      break;
    case GraphErrorCode.CIRCULAR_DEPENDENCY:
      console.log(`Cycle: ${parsed.details.cyclePath}`);
      break;
  }
}
```

## See Also

- `src/validation/error-parsing.ts` - Error parsing implementation
- `src/validation/types/error-messages.ts` - Type-level error message generation
- `ARCHITECTURE.md` - Validation architecture overview
