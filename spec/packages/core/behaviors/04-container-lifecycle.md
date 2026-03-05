# 04 — Container Lifecycle

Container resolution, scoping, disposal, and context variable management. Containers are created from a dependency graph and manage service instance lifetimes. This spec documents the public contract exposed through `@hex-di/core` types; the runtime implementation lives in `@hex-di/engine`.

## BEH-CO-04-001: Container resolution -- resolve(port) returns service instance

The `resolve(port)` method looks up the adapter for a given port and returns the service instance, creating it via the factory if not yet cached according to the adapter's lifetime.

```ts
// Sync resolution
resolve<TPort extends TProvides>(port: TPort): InferService<TPort>;

// Async resolution (for async adapters)
resolveAsync<TPort extends TProvides>(port: TPort): Promise<InferService<TPort>>;
```

**Defined by**: Container type contract in `inspection/container-types.ts`, implemented by `@hex-di/engine`

**Algorithm**:

1. Check container is not disposed. If disposed, throw `DisposedScopeError`.
2. Look up the adapter registered for the port (by `__portName`).
3. Check lifetime:
   - **Singleton**: check root container cache. If cached, return. Otherwise invoke factory with resolved deps.
   - **Scoped**: check current scope cache. If cached, return. If no scope exists (root container), throw `ScopeRequiredError`.
   - **Transient**: always invoke factory with resolved deps.
4. For async adapters: if calling `resolve()` (sync) and the adapter is not yet initialized, throw `AsyncInitializationRequiredError`. Use `resolveAsync()` or call `container.initialize()` first.
5. Detect circular dependencies during resolution. If cycle found, throw `CircularDependencyError` with the full dependency chain.
6. If factory throws, wrap in `FactoryError` (sync) or `AsyncFactoryError` (async).
7. Cache the instance according to lifetime.
8. Return the service instance.

**Behavior Table**:

| Scenario                                        | Result                                        |
| ----------------------------------------------- | --------------------------------------------- |
| Singleton, first resolve                        | Factory invoked, instance cached and returned |
| Singleton, subsequent resolve                   | Cached instance returned                      |
| Scoped, within scope                            | Factory invoked per scope, cached in scope    |
| Scoped, root container                          | `ScopeRequiredError` thrown                   |
| Transient                                       | Factory invoked every time                    |
| Disposed container                              | `DisposedScopeError` thrown                   |
| Async adapter via `resolve()` (not initialized) | `AsyncInitializationRequiredError` thrown     |
| Circular dependency detected                    | `CircularDependencyError` thrown              |
| Factory throws                                  | `FactoryError` wrapping original exception    |

**Example**:

```ts
import { port, createAdapter } from "@hex-di/core";
// import { GraphBuilder, createContainer } from "@hex-di/engine";

interface Logger {
  log(msg: string): void;
}
const LoggerPort = port<Logger>()({ name: "Logger" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => ({ log: msg => console.log(msg) }),
});

// const graph = GraphBuilder.create().provide(LoggerAdapter).build();
// const container = createContainer(graph);
// await container.initialize();

// const logger = container.resolve(LoggerPort);
// logger.log("Hello"); // works
```

**Design notes**:

- Error classes (`CircularDependencyError`, `FactoryError`, `DisposedScopeError`, `ScopeRequiredError`, `AsyncFactoryError`, `AsyncInitializationRequiredError`) are all defined in `errors/classes.ts` within `@hex-di/core`. Each has a unique `_tag` for discriminated union matching and a `code` for machine-readable identification.
- All error instances are `Object.freeze()`d at construction time.
- `ResolutionError` is a discriminated union of all resolution-time error classes, enabling exhaustive `switch` on `_tag`.
- The container type is parameterized by phase (`"uninitialized" | "initialized" | "disposing" | "disposed"`), enabling compile-time prevention of use-after-dispose via [INV-CO-5](../invariants.md#inv-co-5-phantom-disposal-prevention).

## BEH-CO-04-002: Scope management -- child containers and scope boundaries

Scopes provide isolated service lifetime boundaries. Scoped adapters create one instance per scope, isolated from parent and sibling scopes.

```ts
// Container phase types
type ContainerKind = "root" | "child" | "lazy" | "scope";
type ContainerPhase =
  | "uninitialized"
  | "initialized"
  | "unloaded"
  | "loading"
  | "loaded"
  | "active"
  | "disposing"
  | "disposed";

// Inheritance modes for child containers
type InheritanceMode = "shared" | "forked" | "isolated";
```

**Defined by**: `inspection/container-types.ts`

**Algorithm**:

1. **Root container**: created from a graph via `createContainer(graph)`. Starts in `"uninitialized"` phase. Call `initialize()` to resolve async singletons.
2. **Scope**: created via `container.createScope()`. Scoped adapters get fresh instances within this scope. Scopes can be nested (child scopes).
3. **Child container**: created via `container.createChild(graph)`. Extends or overrides the parent's adapters. Each port can have an `InheritanceMode`:
   - `"shared"`: child sees parent's singleton instance (live reference).
   - `"forked"`: child gets a shallow clone of parent's instance. Requires the adapter to be marked `clonable: true`, otherwise throws `NonClonableForkedError`.
   - `"isolated"`: child creates its own fresh instance.
4. **Lazy container**: created via `container.createLazyChild(loader)`. Defers graph loading until first use. Phases: `"unloaded" -> "loading" -> "loaded"`.

**Behavior Table**:

| Container kind | Phases                                                 | Singleton visibility    | Scoped behavior        |
| -------------- | ------------------------------------------------------ | ----------------------- | ---------------------- |
| Root           | uninitialized -> initialized -> disposing -> disposed  | Owned                   | Must createScope()     |
| Child          | initialized -> disposing -> disposed                   | Inherited or overridden | Inherits parent scopes |
| Scope          | active -> disposing -> disposed                        | Sees parent singletons  | Own scoped instances   |
| Lazy           | unloaded -> loading -> loaded -> disposing -> disposed | Loaded on first use     | Deferred               |

**Example**:

```ts
// Conceptual usage (runtime from @hex-di/engine):
//
// const root = createContainer(graph);
// await root.initialize();
//
// // Create a scope for request handling
// const scope = root.createScope();
// const requestCtx = scope.resolve(RequestContextPort); // scoped instance
//
// // Child container with overrides
// const child = root.createChild(testGraph);
// const mockLogger = child.resolve(LoggerPort); // test double
//
// // Cleanup
// await scope.dispose();
```

**Design notes**:

- `ScopeInfo` and `ScopeTree` types in `container-types.ts` expose scope hierarchy for inspection and debugging.
- `ServiceOrigin` (`"own" | "inherited" | "overridden"`) tracks where a service comes from in child containers.
- `ContainerSnapshot` is a discriminated union over `kind`, enabling type-safe inspection of any container type.

## BEH-CO-04-003: Disposal -- container.dispose() and cleanup ordering

Disposal releases all service instances and invokes finalizers in reverse dependency order. After disposal, the container cannot be used for resolution.

```ts
// Adapter finalizer signature
readonly finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
```

**Defined by**: `Adapter.finalizer` in `adapters/types.ts`, `ContainerPhase` in `inspection/container-types.ts`

**Algorithm**:

1. Transition container to `"disposing"` phase.
2. Collect all cached service instances (singletons + scoped).
3. Sort by reverse dependency order: if A depends on B, finalize A before B.
4. For each instance with a registered finalizer: invoke `finalizer(instance)`. If finalizer is async, await it.
5. Clear all instance caches.
6. Dispose child scopes recursively.
7. Transition container to `"disposed"` phase.
8. Any subsequent `resolve()` call throws `DisposedScopeError`.

**Behavior Table**:

| Adapter config                    | Disposal behavior                   |
| --------------------------------- | ----------------------------------- |
| No finalizer                      | Instance released (GC eligible)     |
| `finalizer: (svc) => svc.close()` | `svc.close()` called before release |
| Async finalizer                   | Awaited during disposal             |
| Disposed container + `resolve()`  | `DisposedScopeError` thrown         |
| Nested scopes                     | Child scopes disposed first         |

**Example**:

```ts
import { port, createAdapter } from "@hex-di/core";

interface Database {
  query(sql: string): Promise<unknown>;
  close(): Promise<void>;
}

const DatabasePort = port<Database>()({ name: "Database" });

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  factory: async () => await connectToDb(),
  finalizer: async db => await db.close(),
});

// Conceptual usage:
// const container = createContainer(graph);
// await container.initialize();
// const db = container.resolve(DatabasePort);
// await container.dispose(); // db.close() is called
// container.resolve(DatabasePort); // throws DisposedScopeError
```

**Design notes**:

- Reverse dependency order ensures that a service's dependencies are still alive when its finalizer runs. If A depends on B and both have finalizers, A is finalized before B.
- `GraphInspection.disposalWarnings` reports potential issues where adapters with finalizers depend on adapters without finalizers (possible use-after-dispose risk).
- The `"disposing"` phase is transient -- it exists to prevent re-entrant disposal and to signal that finalization is in progress.
- Cross-ref: [INV-CO-5](../invariants.md#inv-co-5-phantom-disposal-prevention).

## BEH-CO-04-004: Context variables -- createContextVariable, withContext, getContext

Context variables provide a type-safe mechanism for passing runtime values (e.g., request ID, tenant ID) through the dependency graph without threading them through every factory signature.

```ts
interface ContextVariable<T> {
  readonly id: symbol;
  readonly defaultValue?: T;
}

function createContextVariable<T>(name: string, defaultValue?: T): ContextVariable<T>;
function withContext<T>(
  variable: ContextVariable<T>,
  value: T
): { variable: ContextVariable<T>; value: T };
function getContext<T>(context: Map<symbol, unknown>, variable: ContextVariable<T>): T | undefined;
```

**Exported from**: `context/variables.ts` and `context/helpers.ts`, re-exported from `index.ts`

**Algorithm**:

1. `createContextVariable(name, defaultValue?)`:
   - Create a local `Symbol(name)` as the variable's identity. Local symbols (not `Symbol.for()`) ensure no cross-module collisions.
   - Return `{ id: symbol, defaultValue }`.
2. `withContext(variable, value)`:
   - Return `{ variable, value }`. This is a helper for building context entries.
3. `getContext(context, variable)`:
   - Look up `context.get(variable.id)`.
   - If found (not `undefined`): return the value (cast to `T` -- see safety note).
   - If not found: return `variable.defaultValue`.

**Behavior Table**:

| Scenario                            | `getContext` returns                             |
| ----------------------------------- | ------------------------------------------------ |
| Variable set in context map         | The set value                                    |
| Variable not set, has default       | `defaultValue`                                   |
| Variable not set, no default        | `undefined`                                      |
| Two variables with same name string | Different values (different `Symbol` identities) |

**Example**:

```ts
import { createContextVariable, withContext, getContext } from "@hex-di/core";

// Define context variables at module level
const requestId = createContextVariable<string>("requestId");
const timeout = createContextVariable("timeout", 5000);

// Build a context map
const context = new Map<symbol, unknown>();
const entry = withContext(requestId, "req-abc-123");
context.set(entry.variable.id, entry.value);

// Retrieve values
getContext(context, requestId); // "req-abc-123"
getContext(context, timeout); // 5000 (default, since not set)

// Two variables with the same name are distinct
const requestId2 = createContextVariable<string>("requestId");
getContext(context, requestId2); // undefined (different Symbol)
```

**Design notes**:

- `Symbol(name)` is intentionally used over `Symbol.for(name)`. `Symbol.for()` creates global symbols that would collide across unrelated modules sharing the same variable name. The trade-off is that context variables must be shared by reference (module-level constants), not recreated.
- The `as T` cast in `getContext` is the single unavoidable cast in `@hex-di/core`. It is type-sound because: (a) the symbol key is unique per `ContextVariable` instance, (b) values are set via `withContext(variable, value)` which constrains `value: T`, (c) external code cannot forge a matching symbol.
- Context variables are designed for per-request or per-scope configuration. They are not a replacement for dependency injection -- they complement it for cross-cutting runtime values.
