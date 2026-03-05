# 01 — Builder API

Immutable fluent builder for constructing dependency graphs with compile-time validation. Each method returns a new `GraphBuilder` instance with updated phantom type parameters, implementing the Type-State Pattern. See [overview](../overview.md) and [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage).

## BEH-GR-01-001: GraphBuilder.create() — static factory

Creates a new empty `GraphBuilder` with default configuration. All phantom type parameters start as `never`. The builder is deeply frozen at construction time.

```ts
static create(): GraphBuilder<
  never,   // TProvides  -- no ports provided yet
  never,   // TRequires  -- no ports required yet
  never,   // TAsyncPorts -- no async ports yet
  never,   // TOverrides -- no overrides yet
  DefaultInternals  // empty dep graph, empty lifetime map, maxDepth=50
>
```

**Exported from**: `builder/builder.ts`

**Algorithm**:

1. Allocate an empty frozen adapter array `[]`
2. Allocate an empty frozen `Set<string>` for override port names
3. Construct `GraphBuilder` instance
4. `Object.freeze(this)` -- the builder instance is immutable

**Behavior Table**:

| Call                                        | Runtime State                                 | Phantom State                                    |
| ------------------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `GraphBuilder.create()`                     | `{ adapters: [], overridePortNames: Set {} }` | `<never, never, never, never, DefaultInternals>` |
| `GraphBuilder.withMaxDepth<100>().create()` | Same runtime state                            | `TMaxDepth = 100` in internals                   |
| `GraphBuilder.forParent(parentGraph)`       | Same runtime state                            | `TParentProvides = ParentPorts`                  |
| `GraphBuilder.withExtendedDepth().create()` | Same runtime state                            | `TUnsafeDepthOverride = true`                    |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";

const builder = GraphBuilder.create();
// Type: GraphBuilder<never, never, never, never, DefaultInternals>

// With custom max depth for large graphs
const deep = GraphBuilder.withMaxDepth<100>().create();

// For child containers
const child = GraphBuilder.forParent(parentGraph);
```

**Design notes**:

- The private constructor enforces the factory pattern -- `new GraphBuilder()` is inaccessible.
- `Object.freeze` is applied at three levels: the adapter array, the override set, and the builder instance itself.
- `DefaultInternals` uses `EmptyDependencyGraph` and `EmptyLifetimeMap` (symbol-branded empty types) to avoid index signature pollution during intersection.
- Cross-ref: [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage).

## BEH-GR-01-002: .provide(adapter) — register an adapter

Appends one adapter to the graph. Returns a new `GraphBuilder` with updated phantom types reflecting the provided port, its requirements, and validation state (cycle detection, captive detection, duplicate detection).

```ts
provide<A extends AdapterConstraint>(
  adapter: A
): ToBuilder<
  ProvideResultAllErrors<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState, A>
>
```

**Exported from**: `builder/builder.ts` (delegates to `builder-provide.ts::addAdapter`)

**Algorithm**:

1. Delegate to `addAdapter(this, adapter)` -- returns `BuildableGraphState`
2. `addAdapter` creates a new frozen adapter array `[...this.adapters, adapter]`
3. `overridePortNames` is carried forward unchanged
4. `GraphBuilder.fromState(state)` constructs the new builder
5. _Type-level_ (compile-time): `ProvideResultAllErrors` simultaneously checks:
   - Self-dependency (port requires itself)
   - Duplicate provider (port already in `TProvides`)
   - Cycle introduction (`WouldCreateCycle` via DFS reachability)
   - Captive dependency (`FindAnyCaptiveDependency` + `FindReverseCaptiveDependency`)
   - Depth exceeded (records warning if `withExtendedDepth` enabled)
   - Error channel accumulation (tracks unhandled adapter errors)

**Behavior Table**:

| Condition                              | Compile-Time Result                         | Runtime Result                            |
| -------------------------------------- | ------------------------------------------- | ----------------------------------------- |
| Valid adapter, no conflicts            | `GraphBuilder<P \| New, R \| NewDeps, ...>` | New builder with adapter appended         |
| Adapter provides already-provided port | Template literal error (HEX001)             | Builder still created (runtime allows)    |
| Adapter introduces cycle               | Template literal error (HEX002)             | Builder still created (deferred to build) |
| Adapter creates captive dependency     | Template literal error (HEX003)             | Builder still created (deferred to build) |
| Adapter has unhandled error channel    | Error type accumulated in `TErrors`         | Builder created normally                  |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";
import { LoggerAdapter, DatabaseAdapter } from "./adapters";

const builder = GraphBuilder.create()
  .provide(LoggerAdapter) // TProvides = "Logger"
  .provide(DatabaseAdapter); // TProvides = "Logger" | "Database"

// provideMany for batch registration
const batch = GraphBuilder.create().provideMany([LoggerAdapter, DatabaseAdapter]);
```

**Design notes**:

- Runtime is trivial (array append). All validation logic lives at the type level.
- `ProvideResultAllErrors` reports ALL errors at once rather than short-circuiting, for better developer experience.
- `.provideMany(adapters)` delegates to `addManyAdapters` and uses `ProvideManyResult` for batch type validation.
- `.override(adapter)` delegates to `addOverrideAdapter` and marks the port name in `overridePortNames`.
- Cross-ref: [INV-GR-4](../invariants.md#inv-gr-4-no-duplicate-providers), [BEH-GR-02](02-cycle-detection.md), [BEH-GR-03](03-captive-dependency-detection.md).

## BEH-GR-01-003: .merge(other) — combine two builders

Combines two `GraphBuilder` instances into a new one. Adapter arrays are concatenated (first before second). Override port name sets are unioned. Type-level state (dep graphs, lifetime maps, errors) is merged.

```ts
merge<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals extends AnyBuilderInternals>(
  other: GraphBuilder<OProvides, ORequires, OAsyncPorts, OOverrides, OInternals>
): ToBuilder<MergeResult<TProvides, TRequires, TAsyncPorts, TOverrides, TInternalState,
                         OProvides, ORequires, OAsyncPorts, OOverrides, OInternals>>
```

**Exported from**: `builder/builder.ts` (delegates to `builder-merge.ts::mergeGraphs`)

**Algorithm**:

1. Delegate to `mergeGraphs(this, other)`
2. Concatenate adapter arrays: `[...first.adapters, ...second.adapters]`
3. Union override port names: `new Set([...first.overridePortNames, ...second.overridePortNames])`
4. Freeze the new arrays and sets
5. `GraphBuilder.fromState(state)` constructs the merged builder
6. _Type-level_: `MergeResult` merges `TProvides`, `TRequires`, `TAsyncPorts`, `TOverrides` via union, and uses `UnifiedMergeInternals` to combine dep graphs, lifetime maps, parent provides, max depth, and error channels.

**Behavior Table**:

| Property              | Merge Strategy                               |
| --------------------- | -------------------------------------------- |
| `adapters`            | Concatenation (first ++ second)              |
| `overridePortNames`   | Set union                                    |
| `TProvides`           | `P1 \| P2`                                   |
| `TRequires`           | `R1 \| R2`                                   |
| `depGraph`            | Intersection (`&`) via `MergeDependencyMaps` |
| `lifetimeMap`         | Intersection (`&`)                           |
| `parentProvides`      | Smart union (filters out `unknown`)          |
| `maxDepth`            | First graph's maxDepth (default)             |
| `unsafeDepthOverride` | OR of both (`BoolOr`)                        |
| `errors`              | Union of both                                |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";

const infrastructure = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

const application = GraphBuilder.create().provide(UserServiceAdapter).provide(AuthServiceAdapter);

const merged = infrastructure.merge(application);
// TProvides = "Logger" | "Database" | "UserService" | "AuthService"
```

**Design notes**:

- Merge is associative: `merge(merge(A, B), C)` is equivalent to `merge(A, merge(B, C))`.
- Merge is NOT commutative: adapter ordering may differ.
- The empty graph is the identity element.
- Cross-ref: [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage).

## BEH-GR-01-004: .build() / .tryBuild() — validate and produce Graph

Finalizes the builder into a frozen `Graph` object. `.build()` throws on runtime validation failure. `.tryBuild()` returns `Result<Graph, GraphBuildError>`.

Both methods require all dependencies to be satisfied at compile time (`TRequires` reduces to `never` after `Exclude<TRequires, TProvides>`). If unsatisfied dependencies remain, a template literal error type is produced instead of `Graph`.

```ts
// .build() -- throws on failure
build(): [GetErrors<TInternalState>] extends [never]
  ? [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
    ? Graph<TProvides, TAsyncPorts, TOverrides>
    : `ERROR[HEX008]: Missing adapters for ${JoinPortNames<...>}. Call .provide() first.`
  : `ERROR: Unhandled adapter error channels detected. ...`;

// .tryBuild() -- returns Result
tryBuild(): [GetErrors<TInternalState>] extends [never]
  ? [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
    ? Result<Graph<TProvides, TAsyncPorts, TOverrides>, GraphBuildError>
    : `ERROR[HEX008]: ...`
  : `ERROR: Unhandled adapter error channels detected. ...`;
```

**Exported from**: `builder/builder.ts` (delegates to `builder-build.ts`)

**Algorithm**:

1. Call `validateBuildable(this)` which performs:
   a. `inspectGraph(this)` -- compute adapter metadata
   b. If `depthLimitExceeded`: call `detectCycleAtRuntime(adapters)` -- DFS fallback
   c. Always: call `detectCaptiveAtRuntime(adapters)` -- defense-in-depth
2. If validation returns `Err`: throw `GraphBuildException(error)` (`.build()`) or return `Err` (`.tryBuild()`)
3. If validation returns `Ok`: freeze `{ adapters, overridePortNames }` into `Graph`
4. Emit audit events for both success and failure outcomes

**Behavior Table**:

| Scenario                               | Compile-Time           | `.build()` Runtime            | `.tryBuild()` Runtime                |
| -------------------------------------- | ---------------------- | ----------------------------- | ------------------------------------ |
| All deps satisfied, no cycles/captives | `Graph<P, A, O>`       | Returns frozen `Graph`        | `Ok(Graph)`                          |
| Missing dependencies                   | Template literal error | N/A (blocked at compile time) | N/A                                  |
| Unhandled error channels               | Template literal error | N/A (blocked at compile time) | N/A                                  |
| Cycle detected (runtime fallback)      | Passed compile-time    | Throws `GraphBuildException`  | `Err({ _tag: "CyclicDependency" })`  |
| Captive detected (runtime)             | Passed compile-time    | Throws `GraphBuildException`  | `Err({ _tag: "CaptiveDependency" })` |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";

// Throwing variant
const graph = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter).build(); // Graph<"Logger" | "UserService", never, never>

// Result variant
const result = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter).tryBuild();
// Result<Graph<"Logger" | "UserService", ...>, GraphBuildError>

result.match({
  ok: graph => console.log("Built successfully"),
  err: e => {
    switch (e._tag) {
      case "CyclicDependency":
        console.log("Cycle:", e.cyclePath);
      case "CaptiveDependency":
        console.log("Captive:", e.dependentPort);
    }
  },
});
```

**Design notes**:

- Compile-time validation is the primary safety net. Runtime validation is defense-in-depth for cases where the type system was bypassed (forward references, depth exceeded, `provideUnchecked()`).
- `GraphBuildException` extends `Error` and preserves the structured `GraphBuildError` as `.cause`.
- Audit events are emitted via `emitAuditEvent` for observability.
- `GraphBuildError = CyclicDependencyBuildError | CaptiveDependencyBuildError` (does NOT include `MissingDependencyBuildError` -- missing deps are a compile-time-only check).
- Cross-ref: [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage), [INV-GR-2](../invariants.md#inv-gr-2-cycle-free-graph), [INV-GR-3](../invariants.md#inv-gr-3-captive-dependency-prevention).

## BEH-GR-01-005: .buildFragment() / .tryBuildFragment() — build without completeness check

Builds a graph fragment for child containers. Skips the compile-time dependency completeness check (no `UnsatisfiedDependencies` gate), but still runs runtime cycle and captive detection.

```ts
// .buildFragment() -- throws on failure
buildFragment(): Graph<TProvides, TAsyncPorts, TOverrides>;

// .tryBuildFragment() -- returns Result
tryBuildFragment(): Result<Graph<TProvides, TAsyncPorts, TOverrides>, GraphBuildError>;
```

**Exported from**: `builder/builder.ts` (delegates to `builder-build.ts`)

**Algorithm**:

1. Call `validateBuildable(this)` -- same validation as `build()` (cycle + captive detection)
2. If validation fails: throw or return `Err` (same as `build()`/`tryBuild()`)
3. If validation passes: freeze and return `Graph`

**Behavior Table**:

| Scenario                       | `.buildFragment()`           | `.tryBuildFragment()`                |
| ------------------------------ | ---------------------------- | ------------------------------------ |
| Fragment with unsatisfied deps | Returns `Graph` (allowed)    | `Ok(Graph)`                          |
| Fragment with cycle            | Throws `GraphBuildException` | `Err({ _tag: "CyclicDependency" })`  |
| Fragment with captive          | Throws `GraphBuildException` | `Err({ _tag: "CaptiveDependency" })` |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";

// Child container fragment -- UserService requires Database,
// but Database is provided by the parent container
const childFragment = GraphBuilder.forParent(parentGraph)
  .provide(UserServiceAdapter)
  .buildFragment();
// Graph<"UserService", never, never> -- no completeness error
```

**Design notes**:

- `buildFragment` is designed for hierarchical container patterns where the parent provides dependencies the child needs.
- Runtime validation (cycle + captive) still runs as a safety net -- only the completeness check is relaxed.
- The compile-time return type does NOT include the error channel gate (`GetErrors` check) or the missing dependency gate -- it directly returns `Graph`.
- Cross-ref: [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage).
