# GxP Compliance Analysis Report: @hex-di/graph

**Package:** `@hex-di/graph` v0.1.0
**Scope:** Dependency graph construction and compile-time validation layer for HexDI
**Analysis Date:** 2026-02-10
**Analyst:** Claude Opus 4.6 (Automated GxP Compliance Review)
**Source Directory:** `packages/graph/src/`
**Test Directory:** `packages/graph/tests/`

---

## 1. Executive Summary

**Overall GxP Compliance Score: 7.5 / 10**

| Criteria                        | Score | Weight   | Weighted |
| ------------------------------- | ----- | -------- | -------- |
| Data Integrity (ALCOA+)         | 9.0   | 15%      | 1.35     |
| Traceability & Audit Trail      | 7.0   | 12%      | 0.84     |
| Determinism & Reproducibility   | 9.0   | 15%      | 1.35     |
| Error Handling & Recovery       | 9.0   | 12%      | 1.08     |
| Validation & Input Verification | 9.5   | 12%      | 1.14     |
| Change Control & Versioning     | 7.0   | 8%       | 0.56     |
| Testing & Verification          | 8.0   | 10%      | 0.80     |
| Security                        | 7.0   | 6%       | 0.42     |
| Documentation                   | 8.5   | 5%       | 0.43     |
| Lifecycle Management            | 7.5   | 5%       | 0.38     |
| **Total**                       |       | **100%** | **7.35** |

**Rounded Score: 7.5 / 10**

The `@hex-di/graph` package demonstrates strong GxP compliance across data integrity, determinism, error handling, and validation. The package implements a multi-layer defense-in-depth validation architecture combining compile-time type-level analysis (depth limit 50) with runtime DFS cycle detection and captive dependency checking. All graph outputs are frozen and immutable. The primary gap is the absence of a persistent, append-only audit trail; inspection results are available as snapshots but are not automatically persisted to durable storage.

---

## 2. Package Overview

### Purpose

`@hex-di/graph` is the compile-time validation layer of the HexDI dependency injection framework. It constructs, validates, and freezes dependency graphs before they reach the runtime container. The package enforces three critical invariants:

1. **No circular dependencies** -- detected at both compile time and runtime
2. **No captive dependencies** -- lifetime scoping violations detected at both layers
3. **Complete dependency satisfaction** -- all required ports must have providers

### Architecture

```
@hex-di/graph
  builder/           -- Immutable fluent GraphBuilder (type-state machine)
    builder.ts       -- Core GraphBuilder class with phantom type parameters
    builder-build.ts -- Result-based build functions (tryBuildGraph, buildGraph)
    builder-provide.ts -- Pure adapter registration functions
    builder-merge.ts -- Graph merge with algebraic properties
    builder-types.ts -- Structural interfaces for buildable graphs
    guards.ts        -- Runtime type guard (isGraphBuilder)
    types/           -- Type-level state, provide, merge, inspection types
  errors/            -- Tagged error types using createError pattern
  graph/
    types/           -- Graph, GraphInspection, PortInfo, ValidationResult
    guards.ts        -- Runtime type guard (isGraph)
    inspection/      -- Runtime inspection, cycle/captive detection, serialization
  validation/
    types/           -- Compile-time cycle detection, captive detection, depth limits
      cycle/         -- Type-level reachability (IsReachable, WouldCreateCycle)
      captive/       -- Type-level lifetime hierarchy checks
  symbols/           -- Nominal typing brands (unique symbols)
```

### Key Statistics

- **Source files:** 73 TypeScript files across `src/`
- **Test files:** 61 test files
- **Test lines:** 12,000+ lines of test code
- **Dependencies:** `@hex-di/core`, `@hex-di/result` (internal only)
- **Export tiers:** Primary (core building), Advanced (validation/inspection), Internal (debugging)

---

## 3. GxP Compliance Matrix

| GxP Principle       | Implementation                                                    | Evidence                                                                                              | Gap                          |
| ------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Attributability** | Nominal typing via unique symbols; correlation IDs on inspections | `__graphBrand`, `__graphBuilderBrand` (unique symbols); `correlationId` on every `GraphInspection`    | No user identity attribution |
| **Legibility**      | Frozen, strongly-typed structures; JSON serialization             | `inspectionToJSON()` with schema version; `GraphInspectionJSON` interface                             | --                           |
| **Contemporaneous** | Injectable timestamps on inspection snapshots                     | `options.timestamp ?? new Date().toISOString()` in `inspectionToJSON()`                               | Not auto-persisted           |
| **Original**        | Immutable data via `Object.freeze()` on all outputs               | Constructor freezes: `Object.freeze(this)`, `Object.freeze([...adapters])`                            | --                           |
| **Accurate**        | Multi-layer validation: compile-time + runtime                    | Type-level `IsReachable` + runtime `detectCycleAtRuntime` DFS                                         | --                           |
| **Complete**        | 20+ inspection properties; structured logging; suggestions        | `GraphInspection` interface with 20+ readonly fields                                                  | No persistent audit log      |
| **Consistent**      | Deterministic sorted outputs; canonical cycle paths               | Alphabetical sorting on `unsatisfiedRequirements`, `orphanPorts`, `overrides`; `normalizeCyclePath()` | --                           |
| **Enduring**        | JSON serialization with schema versioning                         | `GraphInspectionJSON.version: 1` for forward compatibility                                            | Storage not built-in         |
| **Available**       | Multiple export tiers; type guards for validation                 | Primary, Advanced, Internal entry points; `isGraph()`, `isGraphBuilder()` guards                      | --                           |

---

## 4. Detailed Analysis

### 4.1 Data Integrity (ALCOA+) -- Score: 9.0/10

#### Strengths

**Comprehensive Immutability Strategy.** Every GraphBuilder instance and Graph output is deeply frozen at construction time. The constructor in `builder.ts` (lines 427-434) demonstrates this:

```typescript
// From: packages/graph/src/builder/builder.ts (lines 427-434)
private constructor(
  adapters: readonly AdapterConstraint[],
  overridePortNames: ReadonlySet<string> = new Set()
) {
  this.adapters = Object.freeze([...adapters]);
  this.overridePortNames = overridePortNames;
  Object.freeze(this);
}
```

Every `.provide()`, `.merge()`, and `.override()` call returns a _new_ frozen instance rather than mutating the existing builder. The helper functions in `builder-provide.ts` produce plain frozen state objects:

```typescript
// From: packages/graph/src/builder/builder-provide.ts (lines 57-65)
export function addAdapter(
  buildable: BuildableGraph,
  adapter: AdapterConstraint
): BuildableGraphState {
  return {
    adapters: Object.freeze([...buildable.adapters, adapter]),
    overridePortNames: buildable.overridePortNames,
  };
}
```

**Nominal Typing via Unique Symbols.** The package prevents structural confusion through unique symbol brands, declared in `symbols/brands.ts`:

```typescript
// From: packages/graph/src/symbols/brands.ts (lines 27-28, 73)
declare const __graphBuilderBrand: unique symbol;
export type { __graphBuilderBrand };
export const GRAPH_BUILDER_BRAND = Symbol("GraphBuilder");
```

The `Graph` type itself uses a phantom brand (from `graph/types/graph-types.ts`, lines 18-49):

```typescript
// From: packages/graph/src/graph/types/graph-types.ts (lines 18-49)
declare const __graphBrand: unique symbol;

export interface Graph<out TProvides = never, out TAsyncPorts = never, out TOverrides = never> {
  readonly [__graphBrand]?: [TProvides, TAsyncPorts, TOverrides];
  readonly adapters: readonly AdapterConstraint[];
  readonly overridePortNames: ReadonlySet<string>;
}
```

**Phantom Type Parameters for Type-State Tracking.** The GraphBuilder class uses `declare readonly` properties that exist only at compile time -- no runtime footprint, but full type-level state tracking:

```typescript
// From: packages/graph/src/builder/builder.ts (lines 299-341)
declare readonly __provides: TProvides;
declare readonly __requires: TRequires;
declare readonly __asyncPorts: TAsyncPorts;
declare readonly __depGraph: GetDepGraph<TInternalState>;
declare readonly __lifetimeMap: GetLifetimeMap<TInternalState>;
```

**Frozen Inspection Outputs.** The `inspectGraph()` function in `inspector.ts` (line 215) returns a deeply frozen object:

```typescript
// From: packages/graph/src/graph/inspection/inspector.ts (lines 215-236)
return Object.freeze({
  adapterCount: graph.adapters.length,
  provides,
  unsatisfiedRequirements,
  dependencyMap,
  overrides,
  maxChainDepth,
  depthWarning,
  isComplete: unsatisfiedRequirements.length === 0,
  summary: `Graph(${graph.adapters.length} adapters, ...)`,
  suggestions: Object.freeze(suggestions),
  orphanPorts: Object.freeze(orphanPorts),
  disposalWarnings: Object.freeze(disposalWarnings),
  // ... 8 more frozen properties
  correlationId,
  ports: Object.freeze(ports.map(p => Object.freeze(p))),
  directionSummary: Object.freeze(directionSummary),
});
```

#### Gaps

- `ReadonlySet<string>` on `overridePortNames` prevents TypeScript-level mutation but `Set` is not frozen at the JavaScript level in all code paths. The builder constructor does not call `Object.freeze()` on the Set itself.

---

### 4.2 Traceability & Audit Trail -- Score: 7.0/10

#### Strengths

**Correlation IDs.** Every inspection result includes a `correlationId` for tracing:

```typescript
// From: packages/graph/src/graph/inspection/correlation.ts (lines 71-90)
export function createCorrelationIdGenerator(): CorrelationIdGenerator {
  let counter = 0;
  return (seed?: string): string => {
    if (seed !== undefined) {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
      }
      const suffix = hash.toString(36).substring(0, 4).padEnd(4, "0");
      return `insp_${hash}_${suffix}`;
    }
    const current = counter++;
    const suffix = current.toString(36).padStart(4, "0");
    return `insp_${current}_${suffix}`;
  };
}
```

The generator uses the factory pattern for test isolation -- each generator has its own counter with no global state.

**Structured Logging Integration.** The `toStructuredLogs()` function in `structured-logging.ts` produces machine-readable log entries compatible with Pino, Winston, OpenTelemetry, and cloud logging services:

```typescript
// From: packages/graph/src/graph/inspection/structured-logging.ts (lines 52-63)
export interface StructuredLogEntry {
  readonly level: LogLevel;
  readonly event: string;
  readonly message: string;
  readonly data: Readonly<Record<string, string | number | boolean | readonly string[]>>;
  readonly correlationId: string;
}
```

Eleven distinct event types are generated covering summary, completeness, adapter details, depth warnings, missing dependencies, orphan ports, disposal warnings, unnecessary lazy ports, and performance recommendations.

**JSON Serialization with Schema Versioning.** The `inspectionToJSON()` function (in `serialization.ts`) produces versioned JSON with injectable timestamps for deterministic testing:

```typescript
// From: packages/graph/src/graph/inspection/serialization.ts (lines 55-83)
export function inspectionToJSON(
  inspection: GraphInspection,
  options: InspectionToJSONOptions = {}
): GraphInspectionJSON {
  return {
    version: 1,
    timestamp: options.timestamp ?? new Date().toISOString(),
    adapterCount: inspection.adapterCount,
    provides: [...inspection.provides],
    // ... 16 more fields
  };
}
```

**Cycle Path Traceability.** When a cycle is detected at runtime, the full cycle path is preserved and formatted with a consistent error code:

```typescript
// From: packages/graph/src/graph/inspection/error-formatting.ts (lines 28-31)
export function formatCycleError(cyclePath: string[]): string {
  const pathString = cyclePath.join(" -> ");
  return `ERROR[HEX002]: Circular dependency: ${pathString}. Fix: Break cycle by extracting shared logic, using lazy resolution, or inverting a dependency.`;
}
```

#### Gaps

- **No persistent audit log.** Inspection snapshots are available via `inspectionToJSON()` but are not automatically written to durable storage. In a GxP environment, a persistent, append-only audit trail of all graph build attempts, validation decisions, and error occurrences would be required.
- **No provenance for compile-time decisions.** The type-level validation operates invisibly; when `DepthExceededResult` causes a fallback to runtime validation, there is no log entry capturing that decision path.

---

### 4.3 Determinism & Reproducibility -- Score: 9.0/10

#### Strengths

**Sorted Outputs for Set-Derived Arrays.** All arrays derived from sets use alphabetical sorting. This is documented in the `inspectGraph()` function header (lines 42-60 of `inspector.ts`):

| Property                  | Order Independent | Notes                                      |
| ------------------------- | ----------------- | ------------------------------------------ |
| `adapterCount`            | Yes               | Pure count                                 |
| `provides`                | No                | Preserves registration order (intentional) |
| `unsatisfiedRequirements` | Yes               | Alphabetically sorted                      |
| `dependencyMap`           | Yes               | Map semantics                              |
| `overrides`               | Yes               | Alphabetically sorted                      |
| `maxChainDepth`           | Yes               | Computed via DFS, deterministic            |
| `orphanPorts`             | Yes               | Alphabetically sorted                      |

Implementation in `inspector.ts` (line 172) and `depth-analysis.ts` (line 106):

```typescript
// From: packages/graph/src/graph/inspection/inspector.ts (line 172)
const unsatisfiedRequirements = [...allRequires].filter(r => !providedSet.has(r)).sort();

// From: packages/graph/src/graph/inspection/depth-analysis.ts (lines 105-107)
export function computeOrphanPorts(providedSet: Set<string>, allRequires: Set<string>): string[] {
  return [...providedSet].filter(p => !allRequires.has(p)).sort();
}
```

**Canonical Cycle Path Normalization.** The `normalizeCyclePath()` function in `runtime-cycle-detection.ts` ensures the same cycle always produces the same path regardless of DFS traversal order:

```typescript
// From: packages/graph/src/graph/inspection/runtime-cycle-detection.ts (lines 30-50)
export function normalizeCyclePath(cycle: string[]): string[] {
  if (cycle.length <= 2) {
    return cycle; // Self-loop [A, A] - already canonical
  }
  const nodes = cycle.slice(0, -1);
  let minIndex = 0;
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i] < nodes[minIndex]) {
      minIndex = i;
    }
  }
  const rotated = [...nodes.slice(minIndex), ...nodes.slice(0, minIndex)];
  return [...rotated, rotated[0]];
}
```

This means the cycle `[B, C, A, B]` is always normalized to `[A, B, C, A]`.

**Memoized DFS for Depth Computation.** The `computeMaxChainDepth()` function uses memoization to ensure deterministic results regardless of iteration order:

```typescript
// From: packages/graph/src/graph/inspection/depth-analysis.ts (lines 32-56)
export function computeMaxChainDepth(depMap: Record<string, readonly string[]>): number {
  const memo = new Map<string, number>();

  function dfs(port: string, visited: Set<string>): number {
    if (visited.has(port)) return 0;
    const cached = memo.get(port);
    if (cached !== undefined) return cached;
    visited.add(port);
    const deps = depMap[port] ?? [];
    let maxDepth = 0;
    for (const dep of deps) {
      maxDepth = Math.max(maxDepth, 1 + dfs(dep, visited));
    }
    visited.delete(port);
    memo.set(port, maxDepth);
    return maxDepth;
  }

  let max = 0;
  for (const port of Object.keys(depMap)) {
    max = Math.max(max, dfs(port, new Set()));
  }
  return max;
}
```

**No Race Conditions.** JavaScript's single-threaded execution model combined with the immutable design (every operation creates a new frozen object) eliminates the possibility of race conditions entirely.

#### Gaps

- The `provides` array deliberately preserves registration order rather than sorting. While this is documented and intentional (for debugging), it means `provides` comparison requires order-awareness.

---

### 4.4 Error Handling & Recovery -- Score: 9.0/10

#### Strengths

**Discriminated Union Error Types.** All graph build errors use tagged unions with the `_tag` discriminant, created via `createError()` from `@hex-di/result`:

```typescript
// From: packages/graph/src/errors/graph-build-errors.ts (lines 23-67)
export const CyclicDependencyBuild = createError("CyclicDependency");
export const CaptiveDependencyBuild = createError("CaptiveDependency");
export const MissingDependencyBuild = createError("MissingDependency");

export interface CyclicDependencyBuildError {
  readonly _tag: "CyclicDependency";
  readonly cyclePath: readonly string[];
  readonly message: string;
}

export interface CaptiveDependencyBuildError {
  readonly _tag: "CaptiveDependency";
  readonly dependentPort: string;
  readonly dependentLifetime: string;
  readonly captivePort: string;
  readonly captiveLifetime: string;
  readonly message: string;
}

export type GraphBuildError = CyclicDependencyBuildError | CaptiveDependencyBuildError;
export type GraphValidationError = GraphBuildError | MissingDependencyBuildError;
```

**Result-Based API.** The `tryBuild()` and `tryBuildFragment()` methods return `Result<Graph, GraphBuildError>` instead of throwing. The core validation function in `builder-build.ts`:

```typescript
// From: packages/graph/src/builder/builder-build.ts (lines 56-94)
export function validateBuildable(buildable: BuildableGraph): Result<void, GraphBuildError> {
  const inspection = inspectGraph(buildable);

  if (inspection.depthLimitExceeded) {
    const cycle = detectCycleAtRuntime(buildable.adapters);
    if (cycle) {
      return err(
        CyclicDependencyBuild({
          cyclePath: cycle,
          message: formatCycleError(cycle),
        })
      );
    }
  }

  // ALWAYS check for captive dependencies as defense-in-depth.
  const captive = detectCaptiveAtRuntime(buildable.adapters);
  if (captive) {
    return err(
      CaptiveDependencyBuild({
        dependentPort: captive.dependentPort,
        dependentLifetime: captive.dependentLifetime,
        captivePort: captive.captivePort,
        captiveLifetime: captive.captiveLifetime,
        message: formatCaptiveError(
          captive.dependentPort,
          captive.dependentLifetime,
          captive.captivePort,
          captive.captiveLifetime
        ),
      })
    );
  }

  return ok(undefined);
}
```

**Consistent Error Codes.** Error messages follow the `ERROR[HEXNNN]` convention for machine-parseable error identification:

- `HEX001`: Duplicate adapter
- `HEX002`: Circular dependency
- `HEX003`: Captive dependency
- `HEX006`: Self-dependency
- `HEX008`: Missing adapters

**Compile-Time Error Messages as Template Literal Types.** The `build()` method signature encodes the error as a type-level string when dependencies are unsatisfied:

```typescript
// From: packages/graph/src/builder/builder.ts (lines 736-738)
build(): [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
  ? Graph<TProvides, TAsyncPorts, TOverrides>
  : `ERROR[HEX008]: Missing adapters for ${JoinPortNames<UnsatisfiedDependencies<TProvides, TRequires>>}. Call .provide() first.`;
```

#### Gaps

- The throwing variants (`build()`, `buildFragment()`) create `new Error(result.error.message)` which loses the structured error data (tag, cyclePath, etc.). Only the Result-based variants preserve full error context.

---

### 4.5 Validation & Input Verification -- Score: 9.5/10

#### Strengths

**Multi-Layer Validation Architecture.** The package implements defense-in-depth with two independent validation layers:

| Layer        | Mechanism                                    | Depth Limit       | Runs When                           |
| ------------ | -------------------------------------------- | ----------------- | ----------------------------------- |
| Compile-time | Type-level DFS via `IsReachable`             | 50 (configurable) | Every `.provide()` call             |
| Runtime      | JavaScript DFS via `detectCycleAtRuntime`    | Unlimited         | `build()` when depth exceeded       |
| Runtime      | JavaScript scan via `detectCaptiveAtRuntime` | N/A               | `build()` always (defense-in-depth) |

The compile-time cycle detection in `validation/types/cycle/detection.ts` implements a full reachability algorithm with visited set, depth limiting, and distributive conditional type iteration:

```typescript
// From: packages/graph/src/validation/types/cycle/detection.ts (lines 400-425)
export type IsReachable<
  TDepGraph,
  TCurrent extends string,
  TTarget extends string,
  TVisited extends string = never,
  TDepth extends Depth = [],
  TMaxDepth extends number = DefaultMaxDepth,
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
```

**DepthExceededResult is NOT Treated as a Cycle.** The three-way result semantics are critical for avoiding false positives:

| Result                | Meaning                       | Action                  |
| --------------------- | ----------------------------- | ----------------------- |
| `true`                | Cycle EXISTS                  | Compile error (HEX002)  |
| `false`               | Cycle does NOT exist          | Allow the adapter       |
| `DepthExceededResult` | UNKNOWN (analysis incomplete) | Allow; defer to runtime |

This is a branded type (from `detection.ts`, lines 105-108):

```typescript
// From: packages/graph/src/validation/types/cycle/detection.ts (lines 105-108)
export type DepthExceededResult<TLastPort extends string = string> = {
  readonly [__depthExceededBrand]: true;
  readonly lastPort: TLastPort;
};
```

**Captive Dependency Detection at Both Layers.** The captive runtime check ALWAYS runs, not just when depth is exceeded. From `builder-build.ts` (lines 72-74):

```typescript
// ALWAYS check for captive dependencies as defense-in-depth.
// This catches forward reference scenarios that may bypass compile-time validation,
// even when depth limit is not exceeded.
const captive = detectCaptiveAtRuntime(buildable.adapters);
```

The runtime detection uses a simple but correct lifetime level comparison (from `runtime-captive-detection.ts`, lines 31-49):

```typescript
// From: packages/graph/src/graph/inspection/runtime-captive-detection.ts (lines 31-49)
const LIFETIME_LEVELS: Record<Lifetime, number> = {
  singleton: 1,
  scoped: 2,
  transient: 3,
};

function isCaptive(dependentLevel: number, dependencyLevel: number): boolean {
  return dependentLevel < dependencyLevel;
}
```

**Reverse Captive Detection.** The type-level validation includes reverse captive checking for forward reference scenarios (from `captive/detection.ts`, lines 447-469):

```typescript
// From: packages/graph/src/validation/types/captive/detection.ts (lines 447-469)
export type FindReverseCaptiveDependency<
  TDepGraph,
  TLifetimeMap,
  TNewPortName extends string,
  TNewPortLevel extends number,
> =
  HasLifetimeInMap<TLifetimeMap, TNewPortName> extends true
    ? never // Port already in map, skip reverse check
    : FindDependentsOf<TDepGraph, TNewPortName> extends infer TDependents
      ? IsNever<TDependents> extends true
        ? never
        : TDependents extends string
          ? CheckReverseCaptive<TLifetimeMap, TDependents, TNewPortLevel>
          : never
      : never;
```

**Runtime Type Guards.** Both `isGraph()` and `isGraphBuilder()` provide runtime validation:

```typescript
// From: packages/graph/src/graph/guards.ts (lines 34-50)
export function isGraph(value: unknown): value is Graph {
  if (value === null || typeof value !== "object") return false;
  if (!("adapters" in value) || !Array.isArray(value.adapters)) return false;
  for (const adapter of value.adapters) {
    if (adapter === null || typeof adapter !== "object") return false;
    if (!("provides" in adapter) || !("requires" in adapter)) return false;
  }
  if (!("overridePortNames" in value) || !(value.overridePortNames instanceof Set)) return false;
  return true;
}

// From: packages/graph/src/builder/guards.ts (lines 34-41)
export function isGraphBuilder(value: unknown): value is GraphBuilder {
  return (
    value !== null &&
    typeof value === "object" &&
    GRAPH_BUILDER_BRAND in value &&
    value[GRAPH_BUILDER_BRAND] === true
  );
}
```

#### Gaps

- The `isGraph()` guard performs shallow adapter validation (checks `provides` and `requires` exist but does not validate their structure deeply).

---

### 4.6 Change Control & Versioning -- Score: 7.0/10

#### Strengths

**Well-Defined Export Surface.** The package uses three export tiers with explicit boundaries (from `index.ts`):

```typescript
// From: packages/graph/src/index.ts
// Primary: Core graph building
export { GraphBuilder, GRAPH_BUILDER_BRAND } from "./builder/builder.js";
export type { Graph } from "./graph/types/graph-types.js";

// Type Guards (Runtime)
export { isGraphBuilder } from "./builder/guards.js";
export { isGraph } from "./graph/guards.js";

// Graph Inference Types
export type {
  InferGraphProvides,
  InferGraphRequires,
  InferGraphAsyncPorts,
  InferGraphOverrides,
} from "./graph/types/graph-inference.js";

// Result-based Build API
export type {
  GraphBuildError,
  GraphValidationError,
  CyclicDependencyBuildError,
  CaptiveDependencyBuildError,
  MissingDependencyBuildError,
} from "./errors/index.js";
```

Additional tiers are available via `@hex-di/graph/advanced` and `@hex-di/graph/internal`.

**Schema Versioning for Serialized Data.** The `GraphInspectionJSON` interface includes a `version: 1` field for forward compatibility.

**Internal Markers.** Functions and types intended for internal use are marked with `@internal` JSDoc tags, preventing inadvertent public API surface growth.

#### Gaps

- No CHANGELOG or semantic versioning policy documented in the package.
- No API stability guarantees documented for the Advanced and Internal tiers.
- The package is at `v0.1.0`, indicating pre-release status with no backward compatibility commitments.

---

### 4.7 Testing & Verification -- Score: 8.0/10

#### Strengths

- **61 test files** covering the entire source surface
- **12,000+ lines of test code** -- a test-to-source ratio exceeding 1:1
- Tests cover critical paths:
  - Cycle detection (compile-time and runtime)
  - Captive dependency detection (forward and reverse)
  - Determinism (sorted outputs, canonical cycle paths)
  - Concurrent branch isolation (multiple `.provide()` on same builder)
  - Stress tests (1000 sequential operations, 100+ concurrent branches)
  - Edge cases (self-dependency, empty graph, depth-exceeded scenarios)
  - JSON serialization with injectable timestamps for snapshot testing

**Deterministic Test Infrastructure.** Correlation IDs support seeded mode for reproducible test output:

```typescript
// From: packages/graph/src/graph/inspection/correlation.ts (lines 74-83)
return (seed?: string): string => {
  if (seed !== undefined) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const suffix = hash.toString(36).substring(0, 4).padEnd(4, "0");
    return `insp_${hash}_${suffix}`;
  }
  // ...
};
```

#### Gaps

- No mutation testing reported.
- No formal test coverage metrics (statement/branch/function coverage percentages) available in the analysis.
- No property-based testing (e.g., fast-check) for graph invariants.

---

### 4.8 Security -- Score: 7.0/10

#### Strengths

**Minimal Dependency Surface.** Only two internal dependencies (`@hex-di/core`, `@hex-di/result`); no third-party runtime dependencies.

**Object Freezing Prevents Tampering.** All Graph and GraphBuilder outputs are frozen, preventing post-construction modification.

**Brand-Based Identity Checks.** The `GRAPH_BUILDER_BRAND` uses `Symbol()` which produces a globally unique, non-recreatable runtime value:

```typescript
// From: packages/graph/src/symbols/brands.ts (line 73)
export const GRAPH_BUILDER_BRAND = Symbol("GraphBuilder");
```

**Private Constructor.** The `GraphBuilder` constructor is `private`, enforcing the factory method pattern (`create()`, `forParent()`, `withMaxDepth()`).

#### Gaps

- No input sanitization on port names (arbitrary strings accepted).
- No prototype pollution protection beyond `Object.freeze()`.
- The `isGraph()` type guard accepts any object with the correct shape, which could be used to inject a malicious graph-like object.

---

### 4.9 Documentation -- Score: 8.5/10

#### Strengths

**Extensive JSDoc with Examples.** Every public function and type has comprehensive JSDoc documentation including `@pure`, `@internal`, `@phantom`, `@example`, and `@packageDocumentation` tags.

**ASCII State Machine Diagrams.** The `IsReachable` type includes a full state machine diagram in its JSDoc (56 lines of ASCII art in `detection.ts`, lines 276-341).

**Truth Tables for Type Decisions.** Both `IsReachable` and `WouldCreateCycle` include truth tables documenting base cases and recursive cases.

**Algebraic Properties Documented.** The merge operation documents its algebraic properties:

```typescript
// From: packages/graph/src/builder/builder-merge.ts (lines 7-12)
// ## Algebraic Properties
// - **Associativity:** `merge(merge(A, B), C) === merge(A, merge(B, C))`
// - **Identity:** Empty graph is identity element
// - **NOT Commutative:** Adapter ordering may differ
```

**Complexity Score Formula Explained.** The `complexity.ts` module documents the formula and all configuration constants with rationale.

#### Gaps

- No standalone user-facing documentation (README, getting-started guide) for the package.
- CONCEPT files (`CONCEPT-captive-detection.ts`, `CONCEPT-cycle-detection.ts`) exist in validation types but their relationship to the implementation is unclear.

---

### 4.10 Lifecycle Management -- Score: 7.5/10

#### Strengths

**Disposal Warning System.** The `computeDisposalWarnings()` function in `disposal.ts` detects potential use-after-dispose bugs:

```typescript
// From: packages/graph/src/graph/inspection/disposal.ts (lines 27-62)
export function computeDisposalWarnings(
  adapters: readonly AdapterConstraint[],
  dependencyMap: Record<string, readonly string[]>
): string[] {
  const warnings: string[] = [];
  const portsWithFinalizers = new Set<string>();
  for (const adapter of adapters) {
    if (typeof adapter.finalizer === "function") {
      portsWithFinalizers.add(adapter.provides.__portName);
    }
  }
  for (const adapter of adapters) {
    if (typeof adapter.finalizer !== "function") continue;
    const portName = adapter.provides.__portName;
    const deps = dependencyMap[portName] ?? [];
    for (const dep of deps) {
      const depAdapter = adapters.find(a => a.provides.__portName === dep);
      if (depAdapter && !portsWithFinalizers.has(dep)) {
        warnings.push(
          `'${portName}' has a finalizer but depends on '${dep}' which has no finalizer. ` +
            `During disposal, '${dep}' may be garbage collected before '${portName}' finishes cleanup.`
        );
      }
    }
  }
  return warnings;
}
```

**Unnecessary Lazy Port Detection.** The inspection system identifies lazy ports that do not actually break any cycle, suggesting they can be replaced with direct dependencies for cleaner lifecycle management.

**Topological Sort for Initialization Order.** The `topologicalSort()` function in `traversal.ts` (Kahn's algorithm) computes correct initialization order, returning `null` if a cycle prevents ordering:

```typescript
// From: packages/graph/src/graph/inspection/traversal.ts (lines 91-149)
export function topologicalSort(adapters: readonly AdapterConstraint[]): string[] | null {
  const depMap = buildDependencyMap(adapters);
  // ... Kahn's algorithm implementation ...
  if (result.length !== portNames.length) {
    return null; // Cycle detected
  }
  return result;
}
```

**Dependency Layer Computation.** The `computeDependencyLayers()` and `getPortsByLayer()` functions identify which services can be initialized in parallel:

```typescript
// From: packages/graph/src/graph/inspection/traversal.ts (lines 453-480)
export function getPortsByLayer(
  adapters: readonly AdapterConstraint[]
): readonly (readonly string[])[] | null {
  const levels = computeDependencyLayers(adapters);
  if (!levels) return null;
  // Group and return frozen layer arrays
  // [["Database", "Logger"], ["UserRepository"], ["UserService"]]
}
```

#### Gaps

- No automatic disposal ordering enforcement at the graph level (warnings only).
- No memory leak detection for circular references in graph data structures.
- The graph package does not manage actual instance lifecycles (that is the runtime's responsibility), limiting its lifecycle management scope.

---

## 5. Code Examples

### 5.1 Compliant: Defense-in-Depth Validation Pipeline

The `validateBuildable()` function demonstrates a GxP-compliant validation pipeline with layered checks:

```typescript
// From: packages/graph/src/builder/builder-build.ts (lines 56-94)
export function validateBuildable(buildable: BuildableGraph): Result<void, GraphBuildError> {
  const inspection = inspectGraph(buildable);

  // Layer 1: Cycle detection (conditional -- only when compile-time was inconclusive)
  if (inspection.depthLimitExceeded) {
    const cycle = detectCycleAtRuntime(buildable.adapters);
    if (cycle) {
      return err(
        CyclicDependencyBuild({
          cyclePath: cycle,
          message: formatCycleError(cycle),
        })
      );
    }
  }

  // Layer 2: Captive detection (ALWAYS runs as defense-in-depth)
  const captive = detectCaptiveAtRuntime(buildable.adapters);
  if (captive) {
    return err(
      CaptiveDependencyBuild({
        dependentPort: captive.dependentPort,
        dependentLifetime: captive.dependentLifetime,
        captivePort: captive.captivePort,
        captiveLifetime: captive.captiveLifetime,
        message: formatCaptiveError(
          captive.dependentPort,
          captive.dependentLifetime,
          captive.captivePort,
          captive.captiveLifetime
        ),
      })
    );
  }

  return ok(undefined);
}
```

### 5.2 Compliant: Immutable Builder Pattern

The `addAdapter()` and `mergeGraphs()` functions demonstrate pure, side-effect-free operations:

```typescript
// From: packages/graph/src/builder/builder-provide.ts (lines 57-65)
export function addAdapter(
  buildable: BuildableGraph,
  adapter: AdapterConstraint
): BuildableGraphState {
  return {
    adapters: Object.freeze([...buildable.adapters, adapter]),
    overridePortNames: buildable.overridePortNames,
  };
}

// From: packages/graph/src/builder/builder-merge.ts (lines 70-78)
export function mergeGraphs(first: BuildableGraph, second: BuildableGraph): BuildableGraphState {
  const mergedOverrides = new Set([...first.overridePortNames, ...second.overridePortNames]);
  return {
    adapters: Object.freeze([...first.adapters, ...second.adapters]),
    overridePortNames: mergedOverrides,
  };
}
```

### 5.3 Compliant: Runtime DFS with Canonical Output

The complete cycle detection with normalization for deterministic error reporting:

```typescript
// From: packages/graph/src/graph/inspection/runtime-cycle-detection.ts (lines 77-138)
export function detectCycleAtRuntime(adapters: readonly AdapterConstraint[]): string[] | null {
  const adjMap = new Map<string, string[]>();
  const portSet = new Set<string>();

  for (const adapter of adapters) {
    const portName = adapter.provides.__portName;
    portSet.add(portName);
    const requires = adapter.requires.map(r => r.__portName);
    adjMap.set(portName, requires);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): string[] | null {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      return [...path.slice(cycleStart), node];
    }
    if (visited.has(node)) return null;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    const deps = adjMap.get(node) ?? [];
    for (const dep of deps) {
      if (portSet.has(dep)) {
        const cycle = dfs(dep);
        if (cycle) return cycle;
      }
    }

    inStack.delete(node);
    path.pop();
    return null;
  }

  for (const portName of portSet) {
    const cycle = dfs(portName);
    if (cycle) {
      return normalizeCyclePath(cycle); // Canonical form for determinism
    }
  }
  return null;
}
```

### 5.4 Gap: Throwing Variants Lose Error Context

```typescript
// From: packages/graph/src/builder/builder-build.ts (lines 172-178)
export function buildGraph(buildable: BuildableGraph): BuiltGraph {
  const result = tryBuildGraph(buildable);
  if (result.isErr()) {
    throw new Error(result.error.message);
    // ^^^ Only message preserved; _tag, cyclePath, dependentPort etc. are lost
  }
  return result.value;
}
```

In a GxP context, the throwing variant discards the structured error data that would be needed for audit trail reconstruction.

---

## 6. Edge Cases & Known Limitations

### 6.1 Compile-Time Depth Limit (50)

**Limitation:** The type-level cycle detection algorithm (`IsReachable`) has a fixed depth limit of 50 (configurable via `withMaxDepth<N>()`). Dependency chains deeper than this produce a `DepthExceededResult` rather than a definitive cycle/no-cycle answer.

**Mitigation:** Runtime DFS (`detectCycleAtRuntime`) is triggered as a safety net when `depthLimitExceeded` is true. The system gives the benefit of the doubt -- `DepthExceededResult` does NOT prevent compilation.

**GxP Impact:** In extremely deep graphs (50+ levels), there is a window between compile-time and build-time where a cycle is not detectable. This is inherent to the TypeScript type system's recursion limits and cannot be eliminated without runtime validation.

### 6.2 Forward Reference Ordering in Captive Detection

**Limitation:** When adapters are registered in an order where a singleton is provided before its scoped dependency, the compile-time captive check cannot validate the dependency (it returns `ForwardReferenceMarker`). The reverse captive detection catches this when the dependency is eventually provided, but there is a brief window where the violation is not visible at the type level.

**Mitigation:** Runtime `detectCaptiveAtRuntime()` ALWAYS runs at `build()` time, catching any forward reference scenarios that bypass compile-time validation.

### 6.3 No Persistent Audit Log

**Limitation:** The package provides all the ingredients for auditing (correlation IDs, JSON serialization, structured logging, timestamps) but does not persist any audit trail. In a GxP environment, graph build attempts, validation results, and error occurrences must be durably recorded.

**Mitigation:** External consumers can wire `toStructuredLogs()` and `inspectionToJSON()` into their logging infrastructure.

### 6.4 Self-Loop Normalization

**Limitation:** The `normalizeCyclePath()` function handles self-loops (`[A, A]`) as a special case (returns as-is). For length-2 arrays where both elements are the same, normalization is correct but the early return bypasses the general algorithm.

**GxP Impact:** Minimal. Self-loops are caught earlier by the `CheckSelfDependency` type (HEX006) and produce distinct error messages.

### 6.5 Merge Non-Commutativity

**Limitation:** `merge(A, B)` and `merge(B, A)` produce graphs with different adapter ordering. While semantically equivalent (same dependency relationships), the `provides` array will differ.

**GxP Impact:** Any audit trail that includes the `provides` array will show different values depending on merge order. Set-derived properties (`unsatisfiedRequirements`, `orphanPorts`, `overrides`) are unaffected.

### 6.6 Shallow Type Guard Validation

**Limitation:** The `isGraph()` type guard performs shallow structural checks -- it verifies that adapters have `provides` and `requires` properties but does not validate their internal structure (e.g., `__portName` existence, lifetime validity).

**GxP Impact:** A malformed graph-like object could pass the type guard but fail during container creation. In a GxP context, deeper validation may be needed at system boundaries.

### 6.7 Throwing vs. Result API Inconsistency

**Limitation:** The `build()` method throws `new Error(message)`, losing the structured error type (`_tag`, `cyclePath`, etc.). The `tryBuild()` method preserves the full `GraphBuildError` union. This creates an inconsistency where the same validation failure produces different error shapes depending on the API used.

**GxP Impact:** Audit trail reconstruction from `build()` errors would only have the message string, not the structured data needed for automated analysis.

### 6.8 Concurrent Generator Counter Overflow

**Limitation:** The `createCorrelationIdGenerator()` uses an incrementing counter with no upper bound. In long-running processes with millions of inspections, the counter would eventually exceed JavaScript's safe integer range (`Number.MAX_SAFE_INTEGER`).

**GxP Impact:** Extremely unlikely in practice (would require 9 quadrillion inspections), but a theoretical limitation.

---

## 7. Recommendations

### Tier 1: Critical (Required for GxP Compliance)

| #   | Recommendation                                                                                                                                                                                                                 | Affected Files                                            | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ------ |
| 1.1 | **Implement persistent audit trail.** Create an `AuditSink` interface that consumers can provide. Log all `build()`, `tryBuild()`, `validate()` calls with timestamps, correlation IDs, validation results, and error details. | `builder-build.ts`, new `audit/` module                   | Medium |
| 1.2 | **Preserve structured errors in throwing API.** Change `buildGraph()` to throw a custom `GraphBuildException` class that carries the full `GraphBuildError` payload, not just the message string.                              | `builder-build.ts`                                        | Low    |
| 1.3 | **Add user/system attribution to inspection results.** Extend `InspectOptions` and `GraphInspectionJSON` with an optional `actor` field (user ID, system ID, or process identifier) for ALCOA+ attributability.                | `inspection.ts` types, `inspector.ts`, `serialization.ts` | Low    |

### Tier 2: Important (Strongly Recommended)

| #   | Recommendation                                                                                                                                                                                  | Affected Files                              | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------ |
| 2.1 | **Deep validation in `isGraph()` type guard.** Verify `__portName` existence on `provides`, validate `lifetime` values, and check `requires` array element structure.                           | `graph/guards.ts`                           | Low    |
| 2.2 | **Freeze `overridePortNames` Set.** Call `Object.freeze()` on the Set in the constructor and in `addOverrideAdapter()` to match the immutability guarantee on `adapters`.                       | `builder.ts`, `builder-provide.ts`          | Low    |
| 2.3 | **Add property-based testing.** Use a framework like fast-check to generate random adapter configurations and verify graph invariants (determinism, immutability, cycle detection correctness). | New test files                              | Medium |
| 2.4 | **Document compile-time decision provenance.** When `DepthExceededResult` triggers a fallback to runtime validation, emit a structured log entry or warning capturing the decision.             | `builder-build.ts`, `structured-logging.ts` | Low    |

### Tier 3: Nice-to-Have (Improvements)

| #   | Recommendation                                                                                                                                         | Affected Files                            | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ------ |
| 3.1 | **Add formal code coverage metrics.** Configure coverage reporting (Istanbul/c8) and publish threshold requirements (e.g., 90% branch coverage).       | `vitest.config.ts`, CI pipeline           | Low    |
| 3.2 | **Document API stability tiers.** Add stability annotations (stable, experimental, internal) to the three export tiers and document in a README.       | New documentation                         | Low    |
| 3.3 | **Bounded correlation ID counter.** Use a circular counter or UUID-based generation to prevent theoretical overflow in long-running processes.         | `correlation.ts`                          | Low    |
| 3.4 | **Mutation testing.** Integrate Stryker or similar to verify test suite quality against injected faults.                                               | CI pipeline configuration                 | Medium |
| 3.5 | **Port name validation.** Add a validation pass that rejects empty strings, whitespace-only strings, or strings with special characters as port names. | `builder-provide.ts` or validation module | Low    |

---

## 8. File Reference Guide

### Builder Module

| File                 | Path                             | Purpose                                              | GxP Relevance                                                         |
| -------------------- | -------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| `builder.ts`         | `src/builder/builder.ts`         | Core GraphBuilder class with phantom type parameters | Immutability (Object.freeze), type-state machine, private constructor |
| `builder-build.ts`   | `src/builder/builder-build.ts`   | Result-based build functions, validation pipeline    | Defense-in-depth validation, Result type error handling               |
| `builder-provide.ts` | `src/builder/builder-provide.ts` | Pure adapter registration functions                  | Immutable state transitions, Object.freeze on adapters                |
| `builder-merge.ts`   | `src/builder/builder-merge.ts`   | Graph merge with algebraic properties                | Documented algebraic properties (associativity, identity)             |
| `builder-types.ts`   | `src/builder/builder-types.ts`   | Structural interfaces for buildable graphs           | Interface contracts for validation                                    |
| `guards.ts`          | `src/builder/guards.ts`          | `isGraphBuilder()` type guard                        | Runtime brand-based identity verification                             |

### Builder Types Sub-Module

| File                  | Path                              | Purpose                             | GxP Relevance                                                 |
| --------------------- | --------------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| `types/state.ts`      | `src/builder/types/state.ts`      | Type-level builder internal state   | Phantom type tracking for compile-time validation             |
| `types/provide.ts`    | `src/builder/types/provide.ts`    | Type-level provide result types     | Compile-time error detection for duplicates, cycles, captives |
| `types/merge.ts`      | `src/builder/types/merge.ts`      | Type-level merge result types       | Compile-time merge conflict detection                         |
| `types/inspection.ts` | `src/builder/types/inspection.ts` | Type-level inspection/summary types | IDE tooltip integration for debugging                         |

### Graph Module

| File                 | Path                                 | Purpose                                                    | GxP Relevance                                             |
| -------------------- | ------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------- |
| `graph-types.ts`     | `src/graph/types/graph-types.ts`     | Graph interface with phantom brands                        | Nominal typing via unique symbol; readonly properties     |
| `inspection.ts`      | `src/graph/types/inspection.ts`      | GraphInspection, ValidationResult, GraphSummary interfaces | 20+ readonly inspection fields; versioned JSON schema     |
| `graph-inference.ts` | `src/graph/types/graph-inference.ts` | Type inference utilities for Graph                         | Type-safe extraction of provides/requires/async/overrides |
| `guards.ts`          | `src/graph/guards.ts`                | `isGraph()` type guard                                     | Runtime structural validation                             |

### Inspection Module

| File                           | Path                                                | Purpose                                                 | GxP Relevance                                            |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| `inspector.ts`                 | `src/graph/inspection/inspector.ts`                 | Main `inspectGraph()` orchestrator                      | Frozen output, 20+ metrics, correlation ID               |
| `runtime-cycle-detection.ts`   | `src/graph/inspection/runtime-cycle-detection.ts`   | DFS cycle detection + canonical normalization           | Deterministic output, safety net for type-level gaps     |
| `runtime-captive-detection.ts` | `src/graph/inspection/runtime-captive-detection.ts` | Lifetime violation detection                            | Defense-in-depth (always runs at build time)             |
| `serialization.ts`             | `src/graph/inspection/serialization.ts`             | `inspectionToJSON()` with versioning                    | Schema-versioned JSON, injectable timestamps             |
| `structured-logging.ts`        | `src/graph/inspection/structured-logging.ts`        | `toStructuredLogs()` for logging frameworks             | 11 event types, correlation IDs, cloud-compatible format |
| `correlation.ts`               | `src/graph/inspection/correlation.ts`               | Correlation ID generation                               | Factory pattern for test isolation, seeded mode          |
| `depth-analysis.ts`            | `src/graph/inspection/depth-analysis.ts`            | Memoized DFS depth computation, orphan detection        | Order-independent, deterministic, pure functions         |
| `traversal.ts`                 | `src/graph/inspection/traversal.ts`                 | Topological sort, transitive deps, dependency layers    | Initialization ordering, parallel layer detection        |
| `complexity.ts`                | `src/graph/inspection/complexity.ts`                | Type complexity scoring and performance recommendations | Documented formula, configurable thresholds              |
| `disposal.ts`                  | `src/graph/inspection/disposal.ts`                  | Disposal warning computation                            | Use-after-dispose detection                              |
| `suggestions.ts`               | `src/graph/inspection/suggestions.ts`               | Actionable suggestion generation                        | Guided remediation for missing adapters, depth, orphans  |
| `error-formatting.ts`          | `src/graph/inspection/error-formatting.ts`          | Consistent error code formatting                        | `ERROR[HEXNNN]` format matching compile-time messages    |
| `filter.ts`                    | `src/graph/inspection/filter.ts`                    | Port filtering utilities                                | Port direction/category/tag filtering                    |
| `lazy-analysis.ts`             | `src/graph/inspection/lazy-analysis.ts`             | Unnecessary lazy port detection                         | Lifecycle simplification suggestions                     |

### Validation Types Module

| File                         | Path                                              | Purpose                                    | GxP Relevance                                                         |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| `cycle/detection.ts`         | `src/validation/types/cycle/detection.ts`         | Type-level `IsReachable` algorithm         | Compile-time DFS with depth limiting, visited set, distributive types |
| `cycle/depth.ts`             | `src/validation/types/cycle/depth.ts`             | Depth tracking types (tuple-based counter) | Configurable `DefaultMaxDepth` (50)                                   |
| `cycle/batch.ts`             | `src/validation/types/cycle/batch.ts`             | Batch cycle detection for `provideMany()`  | Multi-adapter cycle checking                                          |
| `cycle/errors.ts`            | `src/validation/types/cycle/errors.ts`            | Compile-time cycle error message types     | Template literal error types with HEX002 codes                        |
| `captive/detection.ts`       | `src/validation/types/captive/detection.ts`       | Type-level captive dependency detection    | Forward/reverse captive checking, two-pass batch validation           |
| `captive/comparison.ts`      | `src/validation/types/captive/comparison.ts`      | Lifetime level comparison types            | `IsCaptiveDependency` type-level predicate                            |
| `captive/lifetime-level.ts`  | `src/validation/types/captive/lifetime-level.ts`  | Lifetime to numeric level mapping          | singleton=1, scoped=2, transient=3                                    |
| `captive/lifetime-map.ts`    | `src/validation/types/captive/lifetime-map.ts`    | Type-level lifetime map operations         | AddLifetime, GetLifetimeLevel types                                   |
| `captive/errors.ts`          | `src/validation/types/captive/errors.ts`          | Compile-time captive error message types   | `CaptiveDependencyError`, `ReverseCaptiveDependencyError`             |
| `captive/merge.ts`           | `src/validation/types/captive/merge.ts`           | Lifetime map merge types                   | `MergeLifetimeMaps` for graph merging                                 |
| `dependency-satisfaction.ts` | `src/validation/types/dependency-satisfaction.ts` | Unsatisfied dependency computation         | `UnsatisfiedDependencies` type                                        |
| `self-dependency.ts`         | `src/validation/types/self-dependency.ts`         | Self-dependency detection (HEX006)         | Immediate cycle detection                                             |
| `batch-duplicates.ts`        | `src/validation/types/batch-duplicates.ts`        | Duplicate detection in `provideMany()`     | HEX001 duplicate adapter errors                                       |
| `merge-conflict.ts`          | `src/validation/types/merge-conflict.ts`          | Merge conflict detection                   | Duplicate port detection during merge                                 |
| `error-aggregation.ts`       | `src/validation/types/error-aggregation.ts`       | Multi-error aggregation types              | All errors reported at once for better DX                             |
| `error-messages.ts`          | `src/validation/types/error-messages.ts`          | Template literal error message types       | Human-readable compile-time error messages                            |
| `adapter-extraction.ts`      | `src/validation/types/adapter-extraction.ts`      | Adapter port/requires name extraction      | Shared extraction types for cycle and captive modules                 |

### Symbols Module

| File        | Path                    | Purpose                                 | GxP Relevance                                                                    |
| ----------- | ----------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| `brands.ts` | `src/symbols/brands.ts` | Unique symbol brands for nominal typing | `__graphBuilderBrand` (phantom), `GRAPH_BUILDER_BRAND` (runtime), `__prettyView` |

### Errors Module

| File                    | Path                               | Purpose                                  | GxP Relevance                                |
| ----------------------- | ---------------------------------- | ---------------------------------------- | -------------------------------------------- |
| `graph-build-errors.ts` | `src/errors/graph-build-errors.ts` | Tagged error constructors and interfaces | Discriminated union errors with `_tag` field |
| `guards.ts`             | `src/errors/guards.ts`             | Error type guards                        | `isGraphBuildError()` runtime check          |

---

_End of GxP Compliance Analysis Report for @hex-di/graph_
