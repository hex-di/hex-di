# 03 — Captive Dependency Detection

Prevents lifetime scope violations where a longer-lived service captures a shorter-lived service. Uses a two-tier strategy with compile-time type-level detection (primary) and runtime detection (defense-in-depth). See [INV-GR-3](../invariants.md#inv-gr-3-captive-dependency-prevention).

## BEH-GR-03-001: Lifetime hierarchy (singleton > scoped > transient)

Lifetime levels form a strict total order. A captive dependency occurs when a service with a lower level number (longer-lived) depends on a service with a higher level number (shorter-lived).

```ts
// Type-level hierarchy (validation/types/captive/lifetime-level.ts)
type LifetimeLevel<T extends string> =
  T extends "singleton" ? 1 :
  T extends "scoped"    ? 2 :
  T extends "transient" ? 3 : never;

// Type-level comparison
type IsCaptiveDependency<
  TDependentLevel extends number,
  TDependencyLevel extends number
> = /* TDependentLevel < TDependencyLevel */;

// Runtime hierarchy (graph/inspection/runtime-captive-detection.ts)
const LIFETIME_LEVELS: Record<Lifetime, number> = {
  singleton: 1,
  scoped: 2,
  transient: 3,
};

function isCaptive(dependentLevel: number, dependencyLevel: number): boolean {
  return dependentLevel < dependencyLevel;
}
```

**Exported from**: `validation/types/captive/lifetime-level.ts` (type-level), `graph/inspection/runtime-captive-detection.ts` (runtime)

**Behavior Table**:

| Dependent Lifetime | Dependency Lifetime | Captive? | Reason                           |
| ------------------ | ------------------- | -------- | -------------------------------- |
| singleton (1)      | singleton (1)       | No       | Same level                       |
| singleton (1)      | scoped (2)          | **Yes**  | Singleton captures scoped        |
| singleton (1)      | transient (3)       | **Yes**  | Singleton captures transient     |
| scoped (2)         | singleton (1)       | No       | Shorter depends on longer (safe) |
| scoped (2)         | scoped (2)          | No       | Same level                       |
| scoped (2)         | transient (3)       | **Yes**  | Scoped captures transient        |
| transient (3)      | singleton (1)       | No       | Shorter depends on longer (safe) |
| transient (3)      | scoped (2)          | No       | Shorter depends on longer (safe) |
| transient (3)      | transient (3)       | No       | Same level                       |

**Example**:

```ts
// This is a captive dependency: singleton -> scoped
const SingletonCache = createAdapter(CachePort, {
  lifetime: "singleton",
  requires: [SessionPort], // SessionPort is scoped
  factory: session => new CacheImpl(session),
});

// The singleton would "capture" one instance of the scoped session,
// defeating the purpose of scoped lifetime (one per scope).
```

**Design notes**:

- Async adapters (`factoryKind: "async"`) are always treated as singletons for captive detection, regardless of their declared `lifetime`. This is because async initialization happens once at container startup.
- The hierarchy is numeric for both type-level comparison (using tuple length arithmetic) and runtime comparison (simple `<` operator).
- Cross-ref: [INV-GR-3](../invariants.md#inv-gr-3-captive-dependency-prevention).

## BEH-GR-03-002: Type-level captive detection (compile-time)

Detects captive dependencies at compile time when `.provide()` is called. Performs both forward and reverse checks to catch violations regardless of adapter registration order.

```ts
// Forward check: does this adapter's requirements violate lifetime rules?
type FindAnyCaptiveDependency<
  TLifetimeMap,
  TDependentLevel extends number,
  TRequiredPortNames extends string,
> = TRequiredPortNames extends string
    ? FindCaptiveDependency<TLifetimeMap, TDependentLevel, TRequiredPortNames> extends infer Result
      ? Result extends string ? Result : never
      : never
    : never;

// Reverse check: would existing adapters become captive because of this new adapter?
type FindReverseCaptiveDependency<
  TDepGraph,
  TLifetimeMap,
  TNewPortName extends string,
  TNewPortLevel extends number,
> = HasLifetimeInMap<TLifetimeMap, TNewPortName> extends true
    ? never  // Already in map, skip reverse check
    : FindDependentsOf<TDepGraph, TNewPortName> extends infer TDependents
      ? /* check each dependent for captive violation */
      : never;
```

**Exported from**: `validation/types/captive/detection.ts`

**Algorithm**:

1. On `.provide(adapter)`, extract the adapter's lifetime level via `LifetimeLevel<AdapterLifetime>`
2. **Forward check** (`FindAnyCaptiveDependency`):
   a. For each required port name (distributed via conditional types):
   b. Look up the required port's lifetime level in `TLifetimeMap`
   c. If the port is not in the map: return `ForwardReferenceMarker` (deferred, filtered to `never`)
   d. If the port is in the map and `IsCaptiveDependency` is true: return the port name (error)
   e. If the port is in the map and no captive: return `never` (pass)
3. **Reverse check** (`FindReverseCaptiveDependency`):
   a. If the newly provided port is already in the lifetime map: skip (duplicates already validated)
   b. Find all existing ports that depend on this new port via `FindDependentsOf<TDepGraph, PortName>`
   c. For each dependent (distributed): check if the dependent's level is lower (longer-lived) than the new port's level
   d. If captive: return the dependent's name (error)
4. If either check finds a violation, the return type becomes a template literal error

**Behavior Table**:

| Scenario                                                    | Forward Check                   | Reverse Check            | Result             |
| ----------------------------------------------------------- | ------------------------------- | ------------------------ | ------------------ |
| Singleton requires already-registered scoped                | Captive found                   | N/A                      | Compile error      |
| Scoped requires not-yet-registered singleton                | `ForwardReferenceMarker` (pass) | N/A                      | Allowed (deferred) |
| Registering scoped port that singleton already requires     | N/A                             | Captive found            | Compile error      |
| Transient requires singleton                                | No captive (safe direction)     | N/A                      | Allowed            |
| Batch via `provideMany`: singleton + scoped with cross-deps | Two-pass algorithm              | Checked after both added | Compile error      |

**Example**:

```ts
import { GraphBuilder } from "@hex-di/graph";

// Forward captive: detected immediately
const builder1 = GraphBuilder.create()
  .provide(ScopedSessionAdapter) // lifetimeMap: { Session: 2 }
  .provide(SingletonCacheAdapter); // requires Session -> captive! (1 < 2)
// Compile error: ERROR[HEX003]: Captive dependency: Cache (singleton) cannot depend on Session (scoped)

// Reverse captive: detected when the shorter-lived adapter is registered later
const builder2 = GraphBuilder.create()
  .provide(SingletonCacheAdapter) // requires Session (forward reference, deferred)
  .provide(ScopedSessionAdapter); // reverse check finds singleton depends on scoped -> captive!
// Compile error: ERROR[HEX003]: Reverse captive dependency
```

**Design notes**:

- `ForwardReferenceMarker` is a branded type distinct from `never`. It is filtered out by `FindAnyCaptiveDependency` to avoid false positives, but is visible via `FindCaptiveDependency` for debugging.
- `provideMany` uses a two-pass algorithm: (1) build complete lifetime map from ALL batch adapters, (2) validate each adapter against the complete map. This handles intra-batch forward references.
- Cross-ref: [INV-GR-3](../invariants.md#inv-gr-3-captive-dependency-prevention), [BEH-GR-01-002](01-builder-api.md#beh-gr-01-002-provideadapter----register-an-adapter).

## BEH-GR-03-003: Runtime captive detection (fallback)

Detects captive dependencies at runtime during `.build()` / `.tryBuild()`. Always runs as defense-in-depth, even when the compile-time depth limit is not exceeded. Catches forward reference scenarios that may bypass compile-time validation.

```ts
function detectCaptiveAtRuntime(
  adapters: readonly AdapterConstraint[]
): CaptiveDependencyResult | null;

interface CaptiveDependencyResult {
  readonly dependentPort: string;
  readonly dependentLifetime: Lifetime;
  readonly captivePort: string;
  readonly captiveLifetime: Lifetime;
}
```

**Exported from**: `graph/inspection/runtime-captive-detection.ts`

**Algorithm**:

1. Build lifetime map: for each adapter, `portName -> lifetime`
2. For each adapter in the graph:
   a. Get the adapter's port name, lifetime, and level
   b. For each required port:
   - Look up the required port's lifetime in the lifetime map
   - If not in the map (external dependency), skip
   - If `isCaptive(dependentLevel, captiveLevel)`: return the violation
3. If no violations found, return `null`

**Behavior Table**:

| Graph Configuration                | Result                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `singleton(A) -> scoped(B)`        | `{ dependentPort: "A", dependentLifetime: "singleton", captivePort: "B", captiveLifetime: "scoped" }` |
| `singleton(A) -> transient(B)`     | `{ dependentPort: "A", ..., captivePort: "B", captiveLifetime: "transient" }`                         |
| `scoped(A) -> transient(B)`        | `{ dependentPort: "A", dependentLifetime: "scoped", captivePort: "B", captiveLifetime: "transient" }` |
| `transient(A) -> singleton(B)`     | `null` (safe direction)                                                                               |
| `singleton(A) -> singleton(B)`     | `null` (same level)                                                                                   |
| `A -> ExternalPort` (not in graph) | `null` (external deps skipped)                                                                        |

**Example**:

```ts
import { detectCaptiveAtRuntime, detectAllCaptivesAtRuntime } from "@hex-di/graph";

// Detect first violation
const captive = detectCaptiveAtRuntime(graph.adapters);
if (captive) {
  console.log(
    `${captive.dependentPort} (${captive.dependentLifetime}) ` +
      `cannot depend on ${captive.captivePort} (${captive.captiveLifetime})`
  );
}

// Detect ALL violations
const allViolations = detectAllCaptivesAtRuntime(graph.adapters);
// Returns readonly CaptiveDependencyResult[] (empty if none)
```

**Design notes**:

- Unlike `detectCycleAtRuntime` which is only called when `depthLimitExceeded` is true, captive detection ALWAYS runs at build time as defense-in-depth.
- `detectAllCaptivesAtRuntime` is a variant that collects every violation instead of returning the first one. Useful for diagnostic tooling.
- Detection is order-independent: adapter registration order does not affect whether a captive is found.
- Cross-ref: [INV-GR-3](../invariants.md#inv-gr-3-captive-dependency-prevention).

## BEH-GR-03-004: Captive error reporting

When a captive dependency is detected, a structured error is produced with the dependent port, its lifetime, the captured port, and its lifetime.

```ts
// Compile-time: template literal error on .provide()
`ERROR[HEX003]: Captive dependency: Cache (singleton) cannot depend on Session (scoped). ...`;

// Runtime: tagged error via createError
const CaptiveDependencyBuild = createError("CaptiveDependency");

interface CaptiveDependencyBuildError {
  readonly _tag: "CaptiveDependency";
  readonly dependentPort: string;
  readonly dependentLifetime: string;
  readonly captivePort: string;
  readonly captiveLifetime: string;
  readonly message: string;
}
```

**Exported from**: `errors/graph-build-errors.ts` (constructors, interfaces), `graph/inspection/error-formatting.ts` (message formatting)

**Algorithm**:

1. `formatCaptiveError(dependentName, dependentLifetime, captivePortName, captiveLifetime)` constructs the `ERROR[HEX003]` message
2. `CaptiveDependencyBuild({ dependentPort, dependentLifetime, captivePort, captiveLifetime, message })` creates the frozen tagged error
3. For `.build()`: wrapped in `GraphBuildException` and thrown
4. For `.tryBuild()`: wrapped in `Err`

**Behavior Table**:

| Detection Layer             | Error Shape                        | Fields Available                                                                                   |
| --------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Compile-time (`.provide()`) | Template literal string type       | Port names and lifetime names embedded in message                                                  |
| Runtime (`.build()`)        | `throw GraphBuildException`        | `.cause.dependentPort`, `.cause.captivePort`, `.cause.dependentLifetime`, `.cause.captiveLifetime` |
| Runtime (`.tryBuild()`)     | `Err(CaptiveDependencyBuildError)` | Same fields via `.error`                                                                           |

**Example**:

```ts
import { GraphBuildException } from "@hex-di/graph";

try {
  builder.build();
} catch (e) {
  if (e instanceof GraphBuildException && e.cause._tag === "CaptiveDependency") {
    console.log(`${e.cause.dependentPort} (${e.cause.dependentLifetime})`);
    console.log(`cannot depend on ${e.cause.captivePort} (${e.cause.captiveLifetime})`);
  }
}
```

**Design notes**:

- The error includes both port names and lifetime names, giving the developer all information needed to fix the issue without looking up adapter definitions.
- Error objects are frozen via `Object.freeze`.
- Audit events include the captive dependency details for observability.
- Cross-ref: [INV-GR-3](../invariants.md#inv-gr-3-captive-dependency-prevention), [BEH-GR-04-003](04-error-channel-enforcement.md#beh-gr-04-003-error-reporting-with-resolution-path-context).
