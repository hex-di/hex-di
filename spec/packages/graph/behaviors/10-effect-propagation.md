# 10 — Effect Propagation

Compute the transitive error type profile for each port in the dependency graph. When adapter factories return `Result<T, E>`, the error type `E` propagates through the graph: a port's effective error profile is the union of its own errors and the errors of all its transitive dependencies. See [RES-01](../../../research/RES-01-type-and-effect-systems.md) (Type & Effect Systems) and [RES-05](../../../research/RES-05-module-systems-compositional-verification.md) (Module Systems & Compositional Verification).

## BEH-GR-10-001: Transitive Error Type Computation Through Dependency Graph

The graph builder computes the transitive error type for each port by walking the dependency graph and accumulating the error types of all reachable adapters. This computation happens at the type level via recursive conditional types.

```ts
// Type-level transitive error computation
type TransitiveErrors<TDepGraph, TErrorMap, TPort extends string, TVisited extends string = never> =
  // Prevent infinite recursion on cycles (already validated as well-founded)
  TPort extends TVisited
    ? never
    : // Own errors
        | GetPortErrors<TErrorMap, TPort> // Recursive: errors from each direct dependency
        | (GetDirectDeps<TDepGraph, TPort> extends infer TDeps extends string
            ? TDeps extends string
              ? TransitiveErrors<TDepGraph, TErrorMap, TDeps, TVisited | TPort>
              : never
            : never);

// Error map: maps port names to their factory error types
type GetPortErrors<TErrorMap, TPort extends string> = TPort extends keyof TErrorMap
  ? TErrorMap[TPort]
  : never; // Port has no errors (infallible factory)
```

**Algorithm**:

1. Build an error map from adapter registrations: for each adapter, extract the `Err` type from `Result<T, E>` of its factory return type and associate it with the adapter's provided port name
2. For a given port `P`:
   a. Start with `P`'s own error type: `GetPortErrors<ErrorMap, P>`
   b. For each direct dependency `D` of `P`:
   - Recursively compute `TransitiveErrors<DepGraph, ErrorMap, D>`
     c. Union all collected error types
3. Use a `TVisited` set to prevent infinite recursion on well-founded cycles (lazy edges)
4. The result is the complete set of error tags that may be encountered when resolving port `P`

**Behavior Table**:

| Port          | Own Errors           | Dependencies           | Transitive Errors                                                             |
| ------------- | -------------------- | ---------------------- | ----------------------------------------------------------------------------- |
| `Config`      | `ConfigParseError`   | none                   | `ConfigParseError`                                                            |
| `Database`    | `ConnectionError`    | `Config`               | `ConnectionError \| ConfigParseError`                                         |
| `UserService` | `never` (infallible) | `Database`             | `ConnectionError \| ConfigParseError`                                         |
| `Cache`       | `CacheTimeoutError`  | none                   | `CacheTimeoutError`                                                           |
| `API`         | `ValidationError`    | `UserService`, `Cache` | `ValidationError \| ConnectionError \| ConfigParseError \| CacheTimeoutError` |

**Example**:

```ts
import { port, createAdapter, SINGLETON, ok, err } from "@hex-di/core";
import type { TransitiveErrors } from "@hex-di/graph";

interface ConfigError {
  readonly _tag: "ConfigParseError";
  readonly path: string;
}
interface DbError {
  readonly _tag: "ConnectionError";
  readonly host: string;
}

const ConfigPort = port<Config>()({ name: "Config" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserServicePort = port<UserService>()({ name: "UserService" });

const configAdapter = createAdapter({
  provides: [ConfigPort],
  factory: (): Result<Config, ConfigError> =>
    parseConfig() ? ok(config) : err({ _tag: "ConfigParseError", path: "/etc/app.json" }),
  lifetime: SINGLETON,
});

const dbAdapter = createAdapter({
  provides: [DatabasePort],
  requires: [ConfigPort],
  factory: ({ Config }): Result<Database, DbError> =>
    connect(Config.dbUrl) ? ok(db) : err({ _tag: "ConnectionError", host: Config.dbUrl }),
  lifetime: SINGLETON,
});

// UserService has an infallible factory but inherits errors from Database
const userAdapter = createAdapter({
  provides: [UserServicePort],
  requires: [DatabasePort],
  factory: ({ Database }) => ok({ getUser: async id => ({ id, name: "Alice" }) }),
  lifetime: SINGLETON,
});

const builder = GraphBuilder.create()
  .provide(configAdapter)
  .provide(dbAdapter)
  .provide(userAdapter);

// Type-level transitive errors for UserService
type UserServiceErrors = TransitiveErrors<
  typeof builder.__depGraph,
  typeof builder.__errorMap,
  "UserService"
>;
// ConfigParseError | ConnectionError

// Even though UserService's own factory is infallible,
// resolving it may fail due to Config or Database construction errors
```

**Design notes**:

- Transitive error computation is the graph-level equivalent of `andThen` error accumulation in `@hex-di/result`. Just as `andThen` unions error types in a chain, transitive errors union error types through the dependency graph.
- The `TVisited` parameter prevents infinite recursion. For acyclic graphs, it is strictly unnecessary but provides defense-in-depth. For well-founded cycles ([BEH-GR-08](08-well-founded-cycles.md)), it breaks the recursion at lazy edges.
- Cross-ref: [RES-01](../../../research/RES-01-type-and-effect-systems.md) Findings 1 and 4 (Gifford & Lucassen — effect sets tracked in the type system; Leijen/Koka — row-typed effect composition).

## BEH-GR-10-002: Effect Accumulation (Union of All Transitive Dependency Errors)

The graph builder accumulates error types as adapters are registered. The `TErrors` field in `BuilderInternals` tracks the union of all unhandled error types across the entire graph. At `build()` time, this union must be `never` (all errors handled) or a compile error is emitted.

```ts
// Error accumulation during provide()
type AccumulateErrors<TCurrentErrors, TNewAdapterErrors> = TCurrentErrors | TNewAdapterErrors;

// Build-time enforcement
type BuildGuard<TErrors> = [TErrors] extends [never]
  ? Graph<TProvides, TAsyncPorts, TOverrides>
  : `ERROR: Unhandled adapter error channels detected. Use adapterOrDie(adapter), adapterOrElse(adapter, fallbackAdapter), or adapterOrHandle(adapter, handlers) to handle fallible adapters before providing them to the graph.`;
```

**Algorithm**:

1. When `.provide(adapter)` is called:
   a. Extract the error type `E` from the adapter's factory return type `Result<T, E>`
   b. If `E` is `never`, the adapter is infallible — no errors to accumulate
   c. If `E` is non-`never`, union it with the existing `TErrors` in `BuilderInternals`
2. When `.merge(other)` is called:
   a. Union the `TErrors` from both builders: `GetErrors<T1> | GetErrors<T2>`
3. When `.build()` or `.tryBuild()` is called:
   a. Check if `[TErrors] extends [never]`
   b. If yes, all errors are handled — build proceeds
   c. If no, emit a compile-time error message listing the unhandled error types
4. Error handling adapters (`adapterOrDie`, `adapterOrElse`, `adapterOrHandle`) transform the adapter's error type to `never`, removing it from the accumulated union

**Behavior Table**:

| Operation                         | TErrors Before | Adapter Error      | TErrors After                  |
| --------------------------------- | -------------- | ------------------ | ------------------------------ |
| `provide(infallibleAdapter)`      | `never`        | `never`            | `never`                        |
| `provide(fallibleAdapter)`        | `never`        | `DbError`          | `DbError`                      |
| `provide(anotherFallible)`        | `DbError`      | `CacheError`       | `DbError \| CacheError`        |
| `provide(adapterOrDie(fallible))` | `DbError`      | wrapped to `never` | `DbError` (existing unchanged) |
| `merge(builderWithErrors)`        | `never`        | N/A                | other's `TErrors`              |
| `build()`                         | `never`        | N/A                | Succeeds                       |
| `build()`                         | `DbError`      | N/A                | Compile error                  |

**Example**:

```ts
import { GraphBuilder, createAdapter, adapterOrDie, port, SINGLETON, ok, err } from "@hex-di/core";

interface DbError {
  readonly _tag: "ConnectionError";
}
interface CacheError {
  readonly _tag: "CacheTimeout";
}

const dbAdapter = createAdapter({
  provides: [DatabasePort],
  factory: (): Result<Database, DbError> => {
    /* ... */
  },
  lifetime: SINGLETON,
});

const cacheAdapter = createAdapter({
  provides: [CachePort],
  factory: (): Result<Cache, CacheError> => {
    /* ... */
  },
  lifetime: SINGLETON,
});

// Errors accumulate
const builder = GraphBuilder.create()
  .provide(dbAdapter) // TErrors = DbError
  .provide(cacheAdapter); // TErrors = DbError | CacheError

// build() would fail:
// builder.build();
// ERROR: Unhandled adapter error channels detected.

// Handle errors before building
const safeBuilder = GraphBuilder.create()
  .provide(adapterOrDie(dbAdapter)) // TErrors = never (handled)
  .provide(adapterOrDie(cacheAdapter)) // TErrors = never (handled)
  .build(); // Succeeds
```

**Design notes**:

- Error accumulation mirrors the effect composition semantics from RES-01: `andThen` unions `E | F`, and `.provide()` unions `TErrors | TNewAdapterErrors`. The algebraic structure is the same — errors form a join-semilattice under union with `never` as the bottom element.
- The compile-time error message intentionally lists the three error handling strategies (`adapterOrDie`, `adapterOrElse`, `adapterOrHandle`) to guide developers toward a resolution. This is the graph-level equivalent of `catchTag` at the result level.
- Cross-ref: [BEH-GR-04](04-error-channel-enforcement.md) (error channel enforcement at the adapter level).

## BEH-GR-10-003: Effect Summary Per Port (Complete Error Profile for Resolution)

The graph builder can produce an effect summary for each port, showing the complete error profile that a consumer would encounter when resolving that port. The summary includes direct errors (from the port's own factory), inherited errors (from transitive dependencies), and the handling status of each error type.

```ts
interface PortEffectSummary {
  readonly portName: string;
  readonly directErrors: ReadonlyArray<ErrorTagInfo>;
  readonly inheritedErrors: ReadonlyArray<ErrorTagInfo>;
  readonly totalErrors: ReadonlyArray<ErrorTagInfo>;
  readonly isInfallible: boolean; // true if totalErrors is empty
}

interface ErrorTagInfo {
  readonly tag: string; // _tag value
  readonly sourcePort: string; // Port whose factory produces this error
  readonly sourceAdapter: string; // Adapter name
  readonly handled: boolean; // Whether this error has been handled
  readonly handlingStrategy?: "die" | "fallback" | "handler"; // How it was handled
}

// Type-level effect summary
type EffectSummary<TDepGraph, TErrorMap, TPort extends string> = {
  readonly directErrors: GetPortErrors<TErrorMap, TPort>;
  readonly inheritedErrors: Exclude<
    TransitiveErrors<TDepGraph, TErrorMap, TPort>,
    GetPortErrors<TErrorMap, TPort>
  >;
  readonly totalErrors: TransitiveErrors<TDepGraph, TErrorMap, TPort>;
  readonly isInfallible: [TransitiveErrors<TDepGraph, TErrorMap, TPort>] extends [never]
    ? true
    : false;
};
```

**Algorithm**:

1. For a given port `P`:
   a. Compute direct errors: `GetPortErrors<ErrorMap, P>`
   b. Compute transitive errors: `TransitiveErrors<DepGraph, ErrorMap, P>`
   c. Compute inherited errors: `Exclude<transitive, direct>` (errors from dependencies only)
   d. Determine infallibility: `[transitive] extends [never] ? true : false`
2. At runtime, the effect summary is available via `graph.inspect()`:
   a. Walk the dependency graph from `P` to collect all reachable error types
   b. For each error, record its source port and whether it has been handled
   c. Produce the `PortEffectSummary` structure
3. The summary is computed lazily (only when inspected) to avoid overhead during normal resolution

**Behavior Table**:

| Port                | Direct Errors               | Inherited Errors                      | Total Errors                          | Infallible |
| ------------------- | --------------------------- | ------------------------------------- | ------------------------------------- | ---------- |
| `Config`            | `ConfigParseError`          | none                                  | `ConfigParseError`                    | No         |
| `Database`          | `ConnectionError`           | `ConfigParseError`                    | `ConnectionError \| ConfigParseError` | No         |
| `UserService`       | none                        | `ConnectionError \| ConfigParseError` | `ConnectionError \| ConfigParseError` | No         |
| `Logger`            | none                        | none                                  | none                                  | Yes        |
| `API` (all handled) | `ValidationError` (handled) | `ConnectionError` (handled)           | none (all handled)                    | Yes        |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";
import type { EffectSummary } from "@hex-di/graph";

const builder = GraphBuilder.create()
  .provide(configAdapter) // ConfigParseError
  .provide(dbAdapter) // ConnectionError, depends on Config
  .provide(userAdapter) // Infallible, depends on Database
  .provide(loggerAdapter); // Infallible, no deps

// Type-level effect summary
type ConfigSummary = EffectSummary<typeof builder.__depGraph, typeof builder.__errorMap, "Config">;
// { directErrors: ConfigParseError; inheritedErrors: never;
//   totalErrors: ConfigParseError; isInfallible: false }

type UserSummary = EffectSummary<
  typeof builder.__depGraph,
  typeof builder.__errorMap,
  "UserService"
>;
// { directErrors: never; inheritedErrors: ConnectionError | ConfigParseError;
//   totalErrors: ConnectionError | ConfigParseError; isInfallible: false }

type LoggerSummary = EffectSummary<typeof builder.__depGraph, typeof builder.__errorMap, "Logger">;
// { directErrors: never; inheritedErrors: never;
//   totalErrors: never; isInfallible: true }

// Runtime inspection
const graph = builder.build();
const inspection = graph.inspect();

for (const summary of inspection.effectSummaries) {
  if (!summary.isInfallible) {
    console.log(`${summary.portName} may fail with:`);
    for (const error of summary.totalErrors) {
      console.log(`  - ${error.tag} (from ${error.sourcePort})`);
    }
  }
}
// Config may fail with:
//   - ConfigParseError (from Config)
// Database may fail with:
//   - ConnectionError (from Database)
//   - ConfigParseError (from Config)
// UserService may fail with:
//   - ConnectionError (from Database)
//   - ConfigParseError (from Config)
```

**Design notes**:

- The effect summary is the graph-level realization of the error row concept from `@hex-di/result`. Each port's error profile is a row of tagged error types, and transitive propagation computes the full row by walking dependencies.
- The distinction between direct and inherited errors is critical for debugging: when a resolution fails, the developer needs to know whether the error originated in the port's own factory or in a dependency's factory. The `sourcePort` field in `ErrorTagInfo` provides this provenance.
- Effect summaries are complementary to the `TErrors` accumulation in [BEH-GR-10-002](#beh-gr-10-002-effect-accumulation-union-of-all-transitive-dependency-errors). While `TErrors` is a flat union for the entire graph (used for build-time enforcement), `EffectSummary` is per-port (used for inspection and debugging).
- Cross-ref: [RES-01](../../../research/RES-01-type-and-effect-systems.md) Finding 3 (Plotkin & Pretnar — compositional effect handlers); [RES-05](../../../research/RES-05-module-systems-compositional-verification.md) Finding 3 (Kang et al. — specification linking for separate compilation).
