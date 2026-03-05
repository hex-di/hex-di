# 02 — Cycle Detection

Prevents circular dependency chains in the graph. Uses a two-tier strategy: compile-time DFS via recursive conditional types (primary), with runtime DFS as a fallback when the type-level depth limit is exceeded. See [INV-GR-2](../invariants.md#inv-gr-2-cycle-free-graph).

## BEH-GR-02-001: Type-level DFS cycle detection (compile-time)

Detects cycles at compile time using `IsReachable`, a depth-limited recursive conditional type that performs distributed DFS over the type-level dependency graph. When an adapter is provided, `WouldCreateCycle` checks if the newly provided port can be reached from its own requirements by following existing dependency edges.

```ts
// Core reachability type (compile-time DFS)
type IsReachable<
  TDepGraph,
  TCurrent extends string,
  TTarget extends string,
  TVisited extends string = never,
  TDepth extends Depth = [],
  TMaxDepth extends number = DefaultMaxDepth, // 50
> =
  DepthExceeded<TDepth, TMaxDepth> extends true
    ? DepthExceededResult<TCurrent>
    : IsNever<TCurrent> extends true
      ? false
      : TCurrent extends string
        ? TCurrent extends TVisited
          ? false
          : TCurrent extends TTarget
            ? true
            : IsReachableCheckDeps<TDepGraph, TCurrent, TTarget, TVisited, TDepth, TMaxDepth>
        : false;

// Entry point for cycle detection on provide()
type WouldCreateCycle<
  TDepGraph,
  TProvides extends string,
  TRequires extends string,
  TMaxDepth extends number = DefaultMaxDepth,
> =
  IsNever<TRequires> extends true
    ? false
    : IsReachable<TDepGraph, TRequires, TProvides, never, [], TMaxDepth>;
```

**Exported from**: `validation/types/cycle/detection.ts`

**Algorithm**:

1. When `.provide(adapter)` is called, `ProvideResultAllErrors` invokes `WouldCreateCycle<TDepGraph, PortName, RequiredPorts>`
2. `WouldCreateCycle` early-exits with `false` if `TRequires` is `never` (no dependencies, no cycle possible)
3. Otherwise delegates to `IsReachable<TDepGraph, TRequires, TProvides>`:
   a. **Depth check**: If `TDepth` exceeds `TMaxDepth`, return `DepthExceededResult<TCurrent>` (inconclusive)
   b. **Never check**: If `TCurrent` is `never`, return `false` (no more nodes)
   c. **Visited check**: If `TCurrent` is in `TVisited`, return `false` (already visited)
   d. **Target match**: If `TCurrent` equals `TTarget`, return `true` (cycle found)
   e. **Recurse**: Look up `GetDirectDeps<TDepGraph, TCurrent>`, recurse with deps as new `TCurrent`, `TVisited | TCurrent`, `IncrementDepth<TDepth>`
4. Distributive conditional types cause automatic iteration over union members

**Behavior Table**:

| Condition                                   | `IsReachable` Result                       | Semantic Meaning                    |
| ------------------------------------------- | ------------------------------------------ | ----------------------------------- |
| Target reached via dependency chain         | `true`                                     | Cycle definitively exists           |
| All paths exhausted without reaching target | `false`                                    | No cycle exists                     |
| Depth limit exceeded before conclusion      | `DepthExceededResult<LastPort>`            | Inconclusive -- deferred to runtime |
| No requirements (`never`)                   | `false` (early exit)                       | No cycle possible                   |
| Self-dependency (A requires A)              | Caught by `CheckSelfDependency` before DFS | Immediate error (HEX006)            |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";

// Graph: Logger -> nothing, UserService -> Logger, ApiGateway -> UserService
// Adding: Logger -> ApiGateway would create: Logger -> ApiGateway -> UserService -> Logger
const builder = GraphBuilder.create()
  .provide(LoggerAdapter) // depGraph: { Logger: never }
  .provide(UserServiceAdapter) // depGraph: { Logger: never, UserService: "Logger" }
  .provide(ApiGatewayAdapter); // depGraph: { ..., ApiGateway: "UserService" }

// This would be a compile error if LoggerAdapter required ApiGateway:
// ERROR[HEX002]: Circular dependency detected: Logger -> ApiGateway -> UserService -> Logger
```

**Design notes**:

- Depth is tracked as a tuple type (`[]`, `[0]`, `[0, 0]`, ...) whose `.length` property is the depth counter. `IncrementDepth` appends one element.
- `DepthExceededResult` is a uniquely-branded type (using `unique symbol`) that cannot be confused with `true` or `false`. It carries `TLastPort` provenance for diagnostics.
- The system gives the "benefit of the doubt" when depth is exceeded: the code compiles, and runtime validation serves as the safety net.
- `DefaultMaxDepth` is 50, sufficient for most enterprise dependency graphs. Override via `GraphBuilder.withMaxDepth<N>()`.
- Cross-ref: [INV-GR-2](../invariants.md#inv-gr-2-cycle-free-graph), [BEH-GR-01-002](01-builder-api.md#beh-gr-01-002-provideadapter----register-an-adapter).

## BEH-GR-02-002: Runtime cycle detection (DFS fallback)

When the compile-time depth limit is exceeded, runtime DFS detects cycles during `.build()` / `.tryBuild()`. Builds an adjacency map from the adapter array and performs iterative DFS with path tracking.

```ts
function detectCycleAtRuntime(adapters: readonly AdapterConstraint[]): string[] | null;
```

**Exported from**: `graph/inspection/runtime-cycle-detection.ts`

**Algorithm**:

1. Build adjacency map: for each adapter, `portName -> [required port names]`
2. Build port set: all port names provided by adapters in the graph
3. For each port in the port set (not yet fully visited):
   a. Run DFS with `visited` (globally explored), `inStack` (current DFS path), `path` (ordered trail)
   b. If a node is encountered that is already `inStack`, extract the cycle: `path[cycleStart..] ++ [node]`
   c. If a node is already `visited` (fully explored from a prior DFS root), skip it
   d. Only follow edges to ports that exist in the graph (ignore external dependencies)
4. If a cycle is found, normalize via `normalizeCyclePath` and return
5. If no cycles found, return `null`

**Behavior Table**:

| Graph Shape                              | Result                 | Explanation                         |
| ---------------------------------------- | ---------------------- | ----------------------------------- |
| `A -> B -> C` (acyclic)                  | `null`                 | No back-edges found                 |
| `A -> B -> C -> A` (cycle)               | `["A", "B", "C", "A"]` | Back-edge C->A detected, normalized |
| `A -> A` (self-loop)                     | `["A", "A"]`           | Immediate back-edge                 |
| `A -> B, C -> D` (disconnected, acyclic) | `null`                 | All components explored, no cycles  |
| `A -> ExtPort` (external dep)            | `null`                 | External ports skipped              |

**Example**:

```ts
import { detectCycleAtRuntime } from "@hex-di/graph";

const cycle = detectCycleAtRuntime(graph.adapters);
if (cycle) {
  // cycle = ["A", "B", "C", "A"]
  console.log(`Circular dependency: ${cycle.join(" -> ")}`);
}
```

**Design notes**:

- `normalizeCyclePath` rotates the cycle so it starts from the lexicographically smallest node, ensuring deterministic output regardless of DFS traversal order.
- Detection is order-independent: if a cycle exists, it will be found regardless of adapter registration order. The reported path may vary in starting node before normalization.
- Only called when `inspection.depthLimitExceeded` is `true` -- otherwise the compile-time check is considered authoritative.
- Cross-ref: [INV-GR-2](../invariants.md#inv-gr-2-cycle-free-graph).

## BEH-GR-02-003: Cycle error reporting (cycle path, participating ports)

When a cycle is detected (either at compile time or runtime), a structured error is produced with the full cycle path and a human-readable message.

```ts
// Compile-time: template literal error on .provide()
`ERROR[HEX002]: Circular dependency: A -> B -> C -> A. Fix: Break cycle by ...`;

// Runtime: tagged error via createError
const CyclicDependencyBuild = createError("CyclicDependency");

interface CyclicDependencyBuildError {
  readonly _tag: "CyclicDependency";
  readonly cyclePath: readonly string[];
  readonly message: string;
}

// Exception wrapper for .build() (throwing variant)
class GraphBuildException extends Error {
  readonly name = "GraphBuildException";
  readonly cause: GraphBuildError; // CyclicDependencyBuildError | CaptiveDependencyBuildError
}
```

**Exported from**: `errors/graph-build-errors.ts` (constructors, interfaces), `errors/graph-build-exception.ts` (exception class), `graph/inspection/error-formatting.ts` (message formatting)

**Algorithm**:

1. `formatCycleError(cyclePath)` joins the path with `->` and wraps in `ERROR[HEX002]` prefix with fix suggestion
2. `CyclicDependencyBuild({ cyclePath, message })` constructs the frozen tagged error object
3. For `.build()`: `GraphBuildException(error)` wraps the error in an `Error` subclass with `.cause`
4. For `.tryBuild()`: `err(error)` wraps the error in `Result.Err`

**Behavior Table**:

| Detection Layer             | Error Shape                       | Consumer Access                                 |
| --------------------------- | --------------------------------- | ----------------------------------------------- |
| Compile-time (`.provide()`) | Template literal string type      | IDE hover, `tsc` output                         |
| Runtime (`.build()`)        | `throw GraphBuildException`       | `catch` + `e.cause._tag === "CyclicDependency"` |
| Runtime (`.tryBuild()`)     | `Err(CyclicDependencyBuildError)` | `.match()` or `.isErr()` + `error._tag`         |

**Example**:

```ts
import { GraphBuildException } from "@hex-di/graph";

// Catching structured errors from .build()
try {
  builder.build();
} catch (e) {
  if (e instanceof GraphBuildException && e.cause._tag === "CyclicDependency") {
    console.log("Cycle path:", e.cause.cyclePath);
    // ["UserService", "AuthService", "UserService"]
  }
}

// Pattern matching with .tryBuild()
builder.tryBuild().match({
  ok: graph => startApp(graph),
  err: e => {
    if (e._tag === "CyclicDependency") {
      console.log(`Cycle: ${e.cyclePath.join(" -> ")}`);
    }
  },
});
```

**Design notes**:

- Error objects are frozen via `Object.freeze` (both the `CyclicDependencyBuild` output and the `GraphBuildException` instance).
- `GraphBuildException.cause` is frozen as a shallow copy to prevent mutation of the original error.
- Audit events are emitted for both successful and failed build attempts, including the cycle path in failure cases.
- The `GraphBuildError` union type does NOT include `MissingDependencyBuildError` -- missing deps are compile-time only. `GraphValidationError` (used by `.validate()`) is the superset that includes it.
- Cross-ref: [INV-GR-2](../invariants.md#inv-gr-2-cycle-free-graph), [BEH-GR-04-003](04-error-channel-enforcement.md#beh-gr-04-003-error-reporting-with-resolution-path-context).
