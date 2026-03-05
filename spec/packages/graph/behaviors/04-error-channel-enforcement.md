# 04 — Error Channel Enforcement

Prevents building a graph that contains adapters with unhandled error channels. Fallible adapters (those whose factory may fail) must have their errors handled before being provided to the graph. Error types are tracked in the `TErrors` phantom type parameter within `BuilderInternals` and block `.build()` / `.tryBuild()` at compile time if non-`never`. See [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage).

## BEH-GR-04-001: Unhandled adapter error detection

Each adapter may carry an error channel type representing possible construction failures. When `.provide(adapter)` is called, the adapter's error channel is extracted and accumulated into the builder's `TErrors` type parameter. If `TErrors` is non-`never` at build time, `.build()` and `.tryBuild()` return a template literal error type instead of `Graph`.

```ts
// Error accumulation in BuilderInternals
type WithErrors<T extends AnyBuilderInternals, TNewErrors> = BuilderInternals<
  T["depGraph"],
  T["lifetimeMap"],
  T["parentProvides"],
  T["maxDepth"],
  T["unsafeDepthOverride"],
  T["depthExceededWarning"],
  T["uncheckedUsed"],
  T["errors"] | TNewErrors // union accumulation
>;

// Extraction
type GetErrors<T extends AnyBuilderInternals> = T["errors"];
```

**Exported from**: `builder/types/state.ts`

**Algorithm**:

1. On `.provide(adapter)`, the type-level `ProvideResultAllErrors` extracts the adapter's error channel type
2. If the error channel is `never` (infallible adapter): `TErrors` unchanged
3. If the error channel is non-`never`: new internals created via `WithErrors<TInternalState, AdapterErrors>`, accumulating the error type into the union
4. On `.merge(other)`: error channels from both builders are unioned via `GetErrors<T1> | GetErrors<T2>`
5. At `.build()` / `.tryBuild()`: `[GetErrors<TInternalState>] extends [never]` check gates the return type

**Behavior Table**:

| Adapter Type                                      | Error Channel                         | Effect on `TErrors` |
| ------------------------------------------------- | ------------------------------------- | ------------------- |
| Infallible adapter (factory returns `T`)          | `never`                               | Unchanged           |
| Fallible adapter (factory returns `Result<T, E>`) | `E`                                   | `TErrors \| E`      |
| Handled via `adapterOrDie(adapter)`               | `never` (errors converted to throws)  | Unchanged           |
| Handled via `adapterOrElse(adapter, fallback)`    | `never` (errors replaced by fallback) | Unchanged           |
| Handled via `adapterOrHandle(adapter, handlers)`  | `never` (errors pattern-matched)      | Unchanged           |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";
import { adapterOrDie, adapterOrElse } from "@hex-di/graph";

// Fallible adapter: factory returns Result<Database, ConnectionError>
const FallibleDbAdapter = createAdapter(DatabasePort, {
  lifetime: "singleton",
  factory: () => connectToDatabase(), // may fail
});

// ERROR: cannot build with unhandled error channel
const bad = GraphBuilder.create().provide(FallibleDbAdapter).build();
// Type: `ERROR: Unhandled adapter error channels detected. Use adapterOrDie(adapter), ...`

// FIX: handle errors before providing
const good = GraphBuilder.create()
  .provide(adapterOrDie(FallibleDbAdapter)) // converts errors to throws
  .build();
// Type: Graph<"Database", never, never>
```

**Design notes**:

- Error channel tracking is purely compile-time. At runtime, adapters are stored as-is regardless of error handling status.
- The error check is the FIRST gate in the `.build()` conditional type, before the dependency satisfaction check. This ensures developers see the error handling message before the "missing adapters" message.
- Cross-ref: [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage), [BEH-GR-01-004](01-builder-api.md#beh-gr-01-004-build--trybuild----validate-and-produce-graph).

## BEH-GR-04-002: Error channel aggregation during build

Error channels from all provided adapters are aggregated into a single union type in `TErrors`. When multiple fallible adapters are provided, their error types are unioned. Merging two builders unions their accumulated errors.

```ts
// After providing multiple fallible adapters:
// TErrors = ConnectionError | TimeoutError | AuthError

// After merging two builders:
// TErrors = ErrorsFromBuilder1 | ErrorsFromBuilder2
```

**Exported from**: `builder/types/state.ts` (via `WithErrors`, `UnifiedMergeInternals`)

**Algorithm**:

1. Each `.provide()` call unions the adapter's error type: `TErrors | NewAdapterErrors`
2. `.provideMany()` accumulates all adapter error types from the batch
3. `.merge()` uses `UnifiedMergeInternals` which unions: `GetErrors<T1> | GetErrors<T2>`
4. `.override()` follows the same accumulation as `.provide()`
5. At any point, the full error union is inspectable via `GetErrors<TInternalState>`

**Behavior Table**:

| Operation                                    | Error Accumulation                       |
| -------------------------------------------- | ---------------------------------------- |
| `.provide(infallible)`                       | `TErrors \| never = TErrors` (unchanged) |
| `.provide(fallible<E>)`                      | `TErrors \| E`                           |
| `.provide(handled(fallible))`                | `TErrors \| never = TErrors` (unchanged) |
| `.provideMany([fallible<E1>, fallible<E2>])` | `TErrors \| E1 \| E2`                    |
| `.merge(builder2)`                           | `TErrors1 \| TErrors2`                   |
| `.provide(adapterOrDie(fallible))`           | `TErrors \| never = TErrors` (unchanged) |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";

const builder = GraphBuilder.create()
  .provide(FallibleDbAdapter) // TErrors = ConnectionError
  .provide(FallibleCacheAdapter) // TErrors = ConnectionError | CacheInitError
  .provide(InfallibleLogAdapter); // TErrors = ConnectionError | CacheInitError (unchanged)

// Merge preserves both error channels
const merged = builder.merge(otherBuilder);
// TErrors = ConnectionError | CacheInitError | OtherBuilderErrors

// Handle all errors to clear TErrors
const handled = GraphBuilder.create()
  .provide(adapterOrDie(FallibleDbAdapter))
  .provide(adapterOrElse(FallibleCacheAdapter, InMemoryCacheAdapter));
// TErrors = never (all handled)
handled.build(); // OK: Graph<...>
```

**Design notes**:

- `never` is the identity element for union: `T | never = T`. This means infallible adapters naturally leave `TErrors` unchanged.
- `[TErrors] extends [never]` uses the tuple wrapper pattern to correctly detect `never` (see `IsSatisfied` in dependency-satisfaction.ts for explanation).
- Cross-ref: [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage).

## BEH-GR-04-003: Error reporting with resolution path context

When `.build()` is blocked by unhandled error channels, the compile-time error message guides the developer to the three resolution strategies. Runtime errors (`GraphBuildError`) from cycle and captive detection include structured fields for programmatic inspection.

```ts
// Compile-time error when TErrors is non-never
`ERROR: Unhandled adapter error channels detected. Use adapterOrDie(adapter), adapterOrElse(adapter, fallbackAdapter), or adapterOrHandle(adapter, handlers) to handle fallible adapters before providing them to the graph.`;

// Runtime error union (from build/tryBuild)
type GraphBuildError =
  | CyclicDependencyBuildError // { _tag: "CyclicDependency", cyclePath, message }
  | CaptiveDependencyBuildError; // { _tag: "CaptiveDependency", dependentPort, captivePort, ... }

// Validation error union (from validate())
type GraphValidationError = GraphBuildError | MissingDependencyBuildError; // { _tag: "MissingDependency", missingPorts, message }
```

**Exported from**: `errors/graph-build-errors.ts`

**Algorithm**:

1. Compile-time: the `.build()` return type conditionally resolves to a template literal error string when `GetErrors<TInternalState>` is non-`never`
2. The error message names all three resolution strategies: `adapterOrDie`, `adapterOrElse`, `adapterOrHandle`
3. Runtime: `GraphBuildError` is a discriminated union with `_tag` for pattern matching
4. `.validate()` returns `GraphValidationError[]` which additionally includes `MissingDependencyBuildError`
5. All error constructors use `createError` from `@hex-di/result`, producing frozen objects with `_tag` discriminant

**Behavior Table**:

| Error Type                    | `_tag`                | Key Fields                                                                        | Source                   |
| ----------------------------- | --------------------- | --------------------------------------------------------------------------------- | ------------------------ |
| `CyclicDependencyBuildError`  | `"CyclicDependency"`  | `cyclePath: readonly string[]`, `message`                                         | `detectCycleAtRuntime`   |
| `CaptiveDependencyBuildError` | `"CaptiveDependency"` | `dependentPort`, `dependentLifetime`, `captivePort`, `captiveLifetime`, `message` | `detectCaptiveAtRuntime` |
| `MissingDependencyBuildError` | `"MissingDependency"` | `missingPorts: readonly string[]`, `message`                                      | `.validate()` only       |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";

// .validate() returns all errors (not just the first)
const result = builder.validate();
// {
//   valid: false,
//   errors: [
//     { _tag: "MissingDependency", missingPorts: ["Database"], message: "..." },
//     { _tag: "CaptiveDependency", dependentPort: "Cache", captivePort: "Session", ... },
//   ],
//   warnings: ["Depth limit exceeded for port DeepService"],
//   adapterCount: 5,
//   provides: ["Logger", "Cache", "Session", "Auth", "UserService"],
//   unsatisfiedRequirements: ["Database"],
// }

// Pattern matching on discriminated union
for (const error of result.errors) {
  switch (error._tag) {
    case "CyclicDependency":
      console.log("Cycle:", error.cyclePath.join(" -> "));
      break;
    case "CaptiveDependency":
      console.log(`${error.dependentPort} -> ${error.captivePort}`);
      break;
    case "MissingDependency":
      console.log("Missing:", error.missingPorts.join(", "));
      break;
  }
}
```

**Design notes**:

- The error channel enforcement message is deliberately placed before the dependency satisfaction message in the `.build()` conditional type chain. This guides developers to handle errors first, since unhandled errors affect the graph's runtime safety.
- `GraphBuildError` (used by `build()`/`tryBuild()`) is a subset of `GraphValidationError` (used by `validate()`). The `MissingDependency` variant is excluded from `GraphBuildError` because missing deps are caught at compile time and never reach runtime build validation.
- All error objects are frozen and carry a unique `_tag` discriminant following the ecosystem pattern established by `@hex-di/result::createError`.
- Cross-ref: [INV-GR-1](../invariants.md#inv-gr-1-complete-port-coverage), [BEH-GR-02-003](02-cycle-detection.md#beh-gr-02-003-cycle-error-reporting-cycle-path-participating-ports), [BEH-GR-03-004](03-captive-dependency-detection.md#beh-gr-03-004-captive-error-reporting).
