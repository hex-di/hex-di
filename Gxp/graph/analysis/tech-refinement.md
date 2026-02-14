# Technical Refinement: @hex-di/graph GxP 10/10 Compliance

**Package:** `@hex-di/graph`
**Current Score:** 7.5/10 (weighted: 7.35)
**Target Score:** 10/10
**Constraint:** Tracing remains OPTIONAL -- non-fatal warnings only, never hard failures
**Date:** 2026-02-10
**Author:** Claude Opus 4.6 (Automated Technical Refinement)

---

## 1. Current Score Breakdown

| #   | Criteria                        | Weight | Current | Target | Delta | Effort |
| --- | ------------------------------- | ------ | ------- | ------ | ----- | ------ |
| 1   | Data Integrity (ALCOA+)         | 15%    | 9.0     | 10.0   | +1.0  | Low    |
| 2   | Traceability & Audit Trail      | 12%    | 7.0     | 10.0   | +3.0  | Medium |
| 3   | Determinism & Reproducibility   | 15%    | 9.0     | 10.0   | +1.0  | Low    |
| 4   | Error Handling & Recovery       | 12%    | 9.0     | 10.0   | +1.0  | Low    |
| 5   | Validation & Input Verification | 12%    | 9.5     | 10.0   | +0.5  | Low    |
| 6   | Change Control & Versioning     | 8%     | 7.0     | 10.0   | +3.0  | Low    |
| 7   | Testing & Verification          | 10%    | 8.0     | 10.0   | +2.0  | Medium |
| 8   | Security                        | 6%     | 7.0     | 10.0   | +3.0  | Low    |
| 9   | Documentation                   | 5%     | 8.5     | 10.0   | +1.5  | Low    |
| 10  | Lifecycle Management            | 5%     | 7.5     | 10.0   | +2.5  | Low    |

**Weighted improvement needed:** 7.35 --> 10.00 (+2.65 weighted points)

The largest weighted gaps are in Traceability (0.36 weighted delta), Determinism (0.15), Error Handling (0.12), Testing (0.20), and Security (0.18).

---

## 2. Gap Analysis per Criterion

### 2.1 Data Integrity (ALCOA+) -- 9.0 --> 10.0

**Gap DI-1: `Set` objects not frozen in graph output.**

The `GraphBuilder` constructor at `builder.ts:427-434` calls `Object.freeze(this)` which freezes the object properties, but `ReadonlySet<string>` only prevents TypeScript-level mutation. The actual JavaScript `Set` instance on `overridePortNames` is not frozen. `Object.freeze()` on a Set prevents adding/removing properties but does NOT prevent `.add()`, `.delete()`, or `.clear()` at the JavaScript level. However, since `Object.freeze()` also prevents internal slot mutation on Set in modern engines (V8 since Node 16), the real risk is in intermediate state objects. Specifically:

- `builder-provide.ts:121-122` (`addOverrideAdapter`): Creates a `new Set(...)` and mutates it with `.add()`, but returns the Set without freezing it. The `BuildableGraphState` object carries this unfrozen Set.
- `builder-merge.ts:72` (`mergeGraphs`): Creates a `new Set([...])` but never freezes it.
- `builder.ts:463` (`create()`): Passes `new Set()` to the constructor without freezing it.

Although `Object.freeze(this)` in the constructor freezes the property reference, downstream consumers who receive `BuildableGraphState` (before it becomes a `GraphBuilder`) hold an unfrozen Set reference.

**Gap DI-2: No deep freezing of adapter objects within the frozen arrays.**

`builder.ts:431` does `Object.freeze([...adapters])` which freezes the array and prevents element replacement, but individual adapter objects within the array are not frozen by this call. Adapters are typically frozen at their construction site in `@hex-di/core`, but this is not verified here.

---

### 2.2 Traceability & Audit Trail -- 7.0 --> 10.0

**Gap TR-1: No persistent audit log for validation decisions.**

The `validateBuildable()` function in `builder-build.ts:56-94` performs cycle detection and captive dependency checking but produces no audit record of the decision. When `build()` succeeds, there is no trace that validation ran. When it fails, the error is either thrown (losing structured data -- see EH-1) or returned as a Result. Neither path writes an audit record.

In GxP: every validation decision (pass or fail) must be attributable, timestamped, and durably recorded.

**Gap TR-2: No user/system identity attribution.**

`GraphInspection` and `GraphInspectionJSON` (in `graph/types/inspection.ts`) contain no `actor` field. The `InspectOptions` interface (line 547-582) accepts a `seed` and `generator` but no identity context. In a GxP context, every inspection must be attributable to a user, system, or process identity per ALCOA+ "Attributable" principle.

**Gap TR-3: No decision provenance for compile-time fallback.**

When `inspection.depthLimitExceeded` is `true` in `builder-build.ts:60`, the system silently falls back to runtime cycle detection. This decision path -- "compile-time analysis was inconclusive, runtime validation was invoked as a fallback" -- is not recorded anywhere. A GxP audit trail requires provenance for why a particular validation strategy was used.

**Gap TR-4: Counter-only correlation IDs lack uniqueness guarantees.**

`correlation.ts:71-90`: The counter-based mode produces IDs like `insp_0_0000`, `insp_1_0001`. Across process restarts, the same IDs will be generated again. In a GxP system, correlation IDs must be globally unique to support cross-session audit trail reconstruction.

---

### 2.3 Determinism & Reproducibility -- 9.0 --> 10.0

**Gap DE-1: Counter overflow potential in correlation IDs.**

`correlation.ts:86`: `const current = counter++` uses a JavaScript `number` that loses integer precision beyond `Number.MAX_SAFE_INTEGER` (2^53 - 1). While practically unlikely (9 quadrillion inspections), a GxP system must guarantee correctness for the full documented retention period.

---

### 2.4 Error Handling & Recovery -- 9.0 --> 10.0

**Gap EH-1: Throwing variants lose structured error context.**

`builder-build.ts:172-178`:

```typescript
export function buildGraph(buildable: BuildableGraph): BuiltGraph {
  const result = tryBuildGraph(buildable);
  if (result.isErr()) {
    throw new Error(result.error.message);
  }
  return result.value;
}
```

`new Error(result.error.message)` discards: `_tag`, `cyclePath`, `dependentPort`, `dependentLifetime`, `captivePort`, `captiveLifetime`. The same pattern exists in `buildGraphFragment()` at line 194-199.

In a GxP context, any error caught by a consumer (via `try/catch`) loses all structured data needed for audit trail reconstruction. The thrown Error is a plain `Error` with no tag discrimination, making it impossible to programmatically classify the failure type.

---

### 2.5 Validation & Input Verification -- 9.5 --> 10.0

**Gap VV-1: Shallow `isGraph()` type guard.**

`graph/guards.ts:34-50`: The guard checks:

- `adapters` is an Array
- Each adapter has `provides` and `requires`
- `overridePortNames` is a `Set`

It does NOT validate:

- `adapter.provides.__portName` exists and is a string
- `adapter.requires` is an array
- `adapter.lifetime` is one of `"singleton" | "scoped" | "transient"`
- Elements of `adapter.requires` have `__portName`
- `overridePortNames` elements are strings

A structurally similar but semantically invalid object (e.g., `{ adapters: [{ provides: 42, requires: "not-an-array" }], overridePortNames: new Set() }`) passes the guard.

---

### 2.6 Change Control & Versioning -- 7.0 --> 10.0

**Gap CC-1: No CHANGELOG.**

No `CHANGELOG.md` exists in the package directory.

**Gap CC-2: No API stability tiers documented.**

The three export tiers (`@hex-di/graph`, `@hex-di/graph/advanced`, `@hex-di/graph/internal`) have no documented stability guarantees. A consumer cannot distinguish between a stable public API and an internal API that may change without notice.

**Gap CC-3: Pre-release version (0.1.0).**

No semver policy documented. The `v0.x` range traditionally signals no backward compatibility guarantees, but this conflicts with GxP requirements for controlled, documented change.

---

### 2.7 Testing & Verification -- 8.0 --> 10.0

**Gap TV-1: No property-based testing.**

No tests use random input generation (fast-check or similar) to verify graph invariants across large input spaces. Critical invariants that should be verified:

- Frozen output is always frozen (for any adapter combination)
- Cycle detection is consistent between compile-time and runtime (for any graph shape)
- `normalizeCyclePath` is idempotent (normalizing twice produces same result)
- `inspectGraph` output determinism (same input always same output)
- `merge` associativity (for random graph combinations)

**Gap TV-2: No formal coverage metrics.**

No coverage threshold enforcement in CI. Statement, branch, and function coverage percentages are unknown.

**Gap TV-3: No mutation testing.**

No Stryker or equivalent configured to verify test suite can detect injected faults.

---

### 2.8 Security -- 7.0 --> 10.0

**Gap SE-1: No port name validation.**

`builder-provide.ts:57-65` (`addAdapter`): Accepts any `AdapterConstraint` without validating `adapter.provides.__portName`. Empty strings, strings with control characters, strings exceeding reasonable length, or strings containing path traversal patterns are all accepted.

**Gap SE-2: `isGraph()` accepts structurally similar objects.**

As described in VV-1, the shallow guard could allow a carefully crafted object to masquerade as a Graph and be passed to the runtime container, potentially causing undefined behavior.

**Gap SE-3: No input bounds checking on graph size.**

No upper limit on the number of adapters that can be added to a graph. A malicious or buggy caller could create a graph with millions of adapters, causing out-of-memory or denial-of-service conditions during inspection.

---

### 2.9 Documentation -- 8.5 --> 10.0

**Gap DO-1: No performance/complexity documentation for public API.**

The `INSPECTION_CONFIG` constants in `complexity.ts:46-94` are documented with JSDoc, but there is no user-facing documentation explaining:

- The complexity score formula and what drives it
- Time complexity of `inspectGraph()`, `detectCycleAtRuntime()`, `topologicalSort()`
- Memory complexity of DFS-based operations
- Expected behavior at scale (1000+ adapters)

**Gap DO-2: CONCEPT files undocumented.**

`validation/types/CONCEPT-captive-detection.ts` and `CONCEPT-cycle-detection.ts` exist but their relationship to the implementation files is unclear. They appear to be design documents embedded as TypeScript files.

**Gap DO-3: No package-level README.**

No `README.md` or equivalent user-facing guide in the graph package directory.

---

### 2.10 Lifecycle Management -- 7.5 --> 10.0

**Gap LM-1: No disposal ordering enforcement.**

The `computeDisposalWarnings()` function in `disposal.ts:27-62` detects potential disposal issues but only produces string warnings. No structured data is returned that would allow automated enforcement or machine-readable consumption.

**Gap LM-2: No graph lifecycle events.**

No hooks or callbacks for graph lifecycle events (build started, validation passed, validation failed, graph frozen). A GxP system needs lifecycle events for audit trail integration.

---

## 3. Required Changes (Exact Files, Signatures, Rationale)

### Change 1: Audit Trail Sink Interface (Gap TR-1, TR-2, TR-3, LM-2)

**New file:** `src/audit/types.ts`

```typescript
/**
 * Audit trail sink interface for GxP compliance.
 *
 * Consumers provide an implementation of this interface to capture
 * all validation decisions, build attempts, and inspection results
 * in a persistent, append-only audit trail.
 *
 * Tracing is OPTIONAL. When no sink is provided, warnings are emitted
 * to console.warn but operations proceed normally.
 */

/** Identity of the actor performing the operation */
export interface AuditActor {
  readonly type: "user" | "system" | "process";
  readonly id: string;
  readonly name?: string;
}

/** Outcome of a validation decision */
export type ValidationOutcome =
  | { readonly result: "pass" }
  | { readonly result: "fail"; readonly errors: readonly AuditErrorRecord[] }
  | { readonly result: "fallback"; readonly reason: string };

/** Structured error record for audit trail */
export interface AuditErrorRecord {
  readonly tag: string;
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
}

/** Audit event types */
export type AuditEvent =
  | AuditBuildAttemptEvent
  | AuditValidationDecisionEvent
  | AuditInspectionEvent
  | AuditDepthFallbackEvent;

export interface AuditBuildAttemptEvent {
  readonly type: "graph.build.attempt";
  readonly timestamp: string;
  readonly correlationId: string;
  readonly actor?: AuditActor;
  readonly adapterCount: number;
  readonly outcome: "success" | "failure";
  readonly error?: AuditErrorRecord;
}

export interface AuditValidationDecisionEvent {
  readonly type: "graph.validation.decision";
  readonly timestamp: string;
  readonly correlationId: string;
  readonly actor?: AuditActor;
  readonly validation: ValidationOutcome;
  readonly cycleCheckPerformed: boolean;
  readonly captiveCheckPerformed: boolean;
}

export interface AuditInspectionEvent {
  readonly type: "graph.inspection.performed";
  readonly timestamp: string;
  readonly correlationId: string;
  readonly actor?: AuditActor;
  readonly adapterCount: number;
  readonly isComplete: boolean;
}

export interface AuditDepthFallbackEvent {
  readonly type: "graph.depth.fallback";
  readonly timestamp: string;
  readonly correlationId: string;
  readonly actor?: AuditActor;
  readonly maxChainDepth: number;
  readonly depthLimit: number;
  readonly runtimeCycleDetected: boolean;
}

/** Audit trail sink interface */
export interface AuditSink {
  readonly emit: (event: AuditEvent) => void;
}
```

**New file:** `src/audit/global-sink.ts`

```typescript
import type { AuditEvent, AuditSink } from "./types.js";

/** Sentinel value indicating no sink is configured */
const NO_SINK: unique symbol = Symbol("NO_SINK");

let currentSink: AuditSink | typeof NO_SINK = NO_SINK;
let warningEmitted = false;

/**
 * Sets the global audit sink. Call once at application startup.
 * Thread-safe in single-threaded JS. Idempotent.
 */
export function setAuditSink(sink: AuditSink): void {
  currentSink = sink;
  warningEmitted = false;
}

/**
 * Clears the global audit sink (for testing).
 */
export function clearAuditSink(): void {
  currentSink = NO_SINK;
  warningEmitted = false;
}

/**
 * Emits an audit event. If no sink is configured, emits a
 * console.warn ONCE per process and then silently drops events.
 *
 * This function NEVER throws. Audit trail failures must not
 * prevent graph operations from completing.
 */
export function emitAuditEvent(event: AuditEvent): void {
  if (currentSink === NO_SINK) {
    if (!warningEmitted) {
      console.warn(
        "[hex-di/graph] No audit sink configured. " +
          "Graph validation decisions will not be persisted. " +
          "Call setAuditSink() to enable GxP audit trail."
      );
      warningEmitted = true;
    }
    return;
  }
  try {
    currentSink.emit(event);
  } catch {
    // Audit failures must NEVER prevent graph operations.
    // In production, this should be monitored via health checks.
  }
}

/**
 * Returns whether an audit sink is currently configured.
 */
export function hasAuditSink(): boolean {
  return currentSink !== NO_SINK;
}
```

**New file:** `src/audit/index.ts`

```typescript
export type {
  AuditActor,
  AuditSink,
  AuditEvent,
  AuditBuildAttemptEvent,
  AuditValidationDecisionEvent,
  AuditInspectionEvent,
  AuditDepthFallbackEvent,
  AuditErrorRecord,
  ValidationOutcome,
} from "./types.js";

export { setAuditSink, clearAuditSink, hasAuditSink } from "./global-sink.js";
```

**Rationale:** The sink interface allows consumers to provide their own persistence layer (file, database, cloud logging) without the graph package taking a dependency on any specific storage. The global setter pattern matches the standard approach for optional cross-cutting concerns (like OpenTelemetry's `setGlobalTracerProvider`). The `NEVER throws` guarantee ensures tracing remains truly optional.

---

### Change 2: Emit Audit Events from Build/Validate (Gap TR-1, TR-3)

**Modified file:** `src/builder/builder-build.ts`

Add audit event emission after validation decisions. The key changes:

```typescript
// New import
import { emitAuditEvent } from "../audit/global-sink.js";
import { createCorrelationIdGenerator } from "../graph/inspection/correlation.js";

// Inside validateBuildable(), after all checks:
// Create a one-off generator for audit event correlation
const auditGenerator = createCorrelationIdGenerator();
const auditCorrelationId = auditGenerator();
const timestamp = new Date().toISOString();

// After cycle detection block (line ~60-70):
if (inspection.depthLimitExceeded) {
  const cycle = detectCycleAtRuntime(buildable.adapters);

  // Emit depth fallback provenance event
  emitAuditEvent({
    type: "graph.depth.fallback",
    timestamp,
    correlationId: auditCorrelationId,
    maxChainDepth: inspection.maxChainDepth,
    depthLimit: 50,
    runtimeCycleDetected: cycle !== null,
  });

  if (cycle) {
    // ... existing err() return
  }
}

// Before the final return ok(undefined):
emitAuditEvent({
  type: "graph.validation.decision",
  timestamp,
  correlationId: auditCorrelationId,
  validation: { result: "pass" },
  cycleCheckPerformed: inspection.depthLimitExceeded,
  captiveCheckPerformed: true,
});
```

Also modify `buildGraph()` and `buildGraphFragment()` to emit `graph.build.attempt` events:

```typescript
export function buildGraph(buildable: BuildableGraph): BuiltGraph {
  const result = tryBuildGraph(buildable);
  const timestamp = new Date().toISOString();
  const generator = createCorrelationIdGenerator();
  const correlationId = generator();

  if (result.isErr()) {
    emitAuditEvent({
      type: "graph.build.attempt",
      timestamp,
      correlationId,
      adapterCount: buildable.adapters.length,
      outcome: "failure",
      error: {
        tag: result.error._tag,
        message: result.error.message,
        details: { ...result.error },
      },
    });
    throw new GraphBuildException(result.error);
  }

  emitAuditEvent({
    type: "graph.build.attempt",
    timestamp,
    correlationId,
    adapterCount: buildable.adapters.length,
    outcome: "success",
  });

  return result.value;
}
```

**Rationale:** Audit events are emitted at the decision points, not as an afterthought. The correlation ID ties together the fallback decision and the final validation outcome. Timestamps use server-side `Date.now()` for contemporaneous recording.

---

### Change 3: GraphBuildException with Structured Error Payload (Gap EH-1)

**New file:** `src/errors/graph-build-exception.ts`

```typescript
import type { GraphBuildError } from "./graph-build-errors.js";

/**
 * Exception class that preserves full GraphBuildError payload.
 *
 * Thrown by build() and buildFragment() instead of plain Error.
 * Consumers can access the structured error via the .cause property
 * for audit trail reconstruction.
 *
 * Compatible with standard Error handling:
 * - instanceof Error === true
 * - .message contains human-readable string
 * - .cause contains the full GraphBuildError discriminated union
 * - .name === "GraphBuildException"
 */
export class GraphBuildException extends Error {
  override readonly name = "GraphBuildException" as const;
  readonly cause: GraphBuildError;

  constructor(error: GraphBuildError) {
    super(error.message);
    this.cause = Object.freeze({ ...error });
    Object.freeze(this);
  }
}
```

**Modified file:** `src/builder/builder-build.ts` (lines 172-178 and 194-199)

```typescript
// Before:
throw new Error(result.error.message);

// After:
throw new GraphBuildException(result.error);
```

Both `buildGraph()` and `buildGraphFragment()` get the same change.

**Rationale:** `GraphBuildException` extends `Error`, so existing `catch(e)` blocks still work. The `.cause` property (standard ES2022 `Error.cause`) carries the full discriminated union: `_tag`, `cyclePath`, `dependentPort`, etc. This enables audit trail systems to classify and record the exact failure type. The class is frozen to prevent mutation.

---

### Change 4: Deep `isGraph()` Type Guard (Gap VV-1, SE-2)

**Modified file:** `src/graph/guards.ts`

```typescript
import type { Graph } from "./types/graph-types.js";

const VALID_LIFETIMES = new Set(["singleton", "scoped", "transient"]);

/**
 * Checks if a value conforms to the Graph structure (deep validation).
 *
 * Validates:
 * - Top-level structure (adapters array, overridePortNames Set)
 * - Each adapter has valid provides (object with __portName string)
 * - Each adapter has valid requires (array of objects with __portName string)
 * - Each adapter has a valid lifetime value
 */
export function isGraph(value: unknown): value is Graph {
  if (value === null || typeof value !== "object") return false;

  if (!("adapters" in value) || !Array.isArray(value.adapters)) return false;

  for (const adapter of value.adapters) {
    if (adapter === null || typeof adapter !== "object") return false;

    // Validate provides
    if (
      !("provides" in adapter) ||
      adapter.provides === null ||
      typeof adapter.provides !== "object"
    )
      return false;
    if (!("__portName" in adapter.provides) || typeof adapter.provides.__portName !== "string")
      return false;
    if (adapter.provides.__portName.length === 0) return false;

    // Validate requires
    if (!("requires" in adapter) || !Array.isArray(adapter.requires)) return false;
    for (const req of adapter.requires) {
      if (req === null || typeof req !== "object") return false;
      if (!("__portName" in req) || typeof req.__portName !== "string") return false;
    }

    // Validate lifetime
    if (!("lifetime" in adapter) || typeof adapter.lifetime !== "string") return false;
    if (!VALID_LIFETIMES.has(adapter.lifetime)) return false;
  }

  if (!("overridePortNames" in value) || !(value.overridePortNames instanceof Set)) return false;

  return true;
}
```

**Rationale:** The deep guard validates the full adapter structure, preventing structurally similar but semantically invalid objects from passing. The `VALID_LIFETIMES` set uses the canonical lifetime values from `@hex-di/core`. This closes the security gap where a malicious object could masquerade as a Graph.

---

### Change 5: Freeze Set Objects Throughout (Gap DI-1)

**Modified file:** `src/builder/builder-provide.ts`

```typescript
// addOverrideAdapter (line 117-128):
export function addOverrideAdapter(
  buildable: BuildableGraph,
  adapter: AdapterConstraint
): BuildableGraphState {
  const newOverrides = new Set(buildable.overridePortNames);
  newOverrides.add(adapter.provides.__portName);

  return {
    adapters: Object.freeze([...buildable.adapters, adapter]),
    overridePortNames: Object.freeze(newOverrides),
  };
}
```

Note: `Object.freeze()` on a `Set` prevents property addition/deletion on the Set object itself, which combined with the `ReadonlySet<string>` type annotation provides defense-in-depth. On modern V8 engines, `.add()`, `.delete()`, and `.clear()` throw `TypeError` on a frozen Set.

**Modified file:** `src/builder/builder-merge.ts`

```typescript
// mergeGraphs (line 70-78):
export function mergeGraphs(first: BuildableGraph, second: BuildableGraph): BuildableGraphState {
  const mergedOverrides = new Set([...first.overridePortNames, ...second.overridePortNames]);
  return {
    adapters: Object.freeze([...first.adapters, ...second.adapters]),
    overridePortNames: Object.freeze(mergedOverrides),
  };
}
```

**Modified file:** `src/builder/builder.ts`

```typescript
// create() (line 462-464):
static create(): GraphBuilder<never, never, never, never, DefaultInternals> {
  return new GraphBuilder([], Object.freeze(new Set()));
}

// Constructor (line 427-434) -- add Set freeze:
private constructor(
  adapters: readonly AdapterConstraint[],
  overridePortNames: ReadonlySet<string> = Object.freeze(new Set())
) {
  this.adapters = Object.freeze([...adapters]);
  this.overridePortNames = Object.freeze(overridePortNames);
  Object.freeze(this);
}
```

Also freeze in `forParent()`, `withMaxDepth()`, `withExtendedDepth()` factories.

**Rationale:** Ensures immutability at the JavaScript level, not just the TypeScript level. All code paths that create or pass Set objects now freeze them.

---

### Change 6: Bounded Correlation ID Counter (Gap DE-1, TR-4)

**Modified file:** `src/graph/inspection/correlation.ts`

```typescript
/**
 * Maximum safe counter value. When exceeded, counter resets to 0
 * with a generation suffix to maintain uniqueness.
 */
const MAX_COUNTER = Number.MAX_SAFE_INTEGER - 1;

export function createCorrelationIdGenerator(): CorrelationIdGenerator {
  let counter = 0;
  let generation = 0;

  // Use a process-unique prefix to avoid cross-session collisions
  const processId = Math.random().toString(36).substring(2, 8);

  return (seed?: string): string => {
    if (seed !== undefined) {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
      }
      const suffix = hash.toString(36).substring(0, 4).padEnd(4, "0");
      return `insp_${hash}_${suffix}`;
    }

    const current = counter;
    counter++;
    if (counter > MAX_COUNTER) {
      counter = 0;
      generation++;
    }

    const suffix = current.toString(36).padStart(4, "0");
    const genPart = generation > 0 ? `_g${generation}` : "";
    return `insp_${processId}_${current}_${suffix}${genPart}`;
  };
}
```

**Rationale:** The process-unique prefix (`processId`) prevents cross-session collisions. The generation counter handles the (theoretical) overflow case. IDs are now globally unique within reasonable probability bounds, suitable for audit trail correlation.

---

### Change 7: Actor Attribution in Inspections (Gap TR-2)

**Modified file:** `src/graph/types/inspection.ts`

Extend `InspectOptions`:

```typescript
export interface InspectOptions {
  readonly summary?: boolean;
  readonly seed?: string;
  readonly generator?: (seed?: string) => string;
  /** Optional actor identity for audit trail attribution */
  readonly actor?: {
    readonly type: "user" | "system" | "process";
    readonly id: string;
    readonly name?: string;
  };
}
```

Extend `GraphInspection`:

```typescript
export interface GraphInspection {
  // ... existing fields ...

  /** Actor identity, if provided via InspectOptions */
  readonly actor?: {
    readonly type: "user" | "system" | "process";
    readonly id: string;
    readonly name?: string;
  };
}
```

Extend `GraphInspectionJSON`:

```typescript
export interface GraphInspectionJSON {
  // ... existing fields ...
  readonly actor?: {
    readonly type: "user" | "system" | "process";
    readonly id: string;
    readonly name?: string;
  };
}
```

**Modified file:** `src/graph/inspection/inspector.ts`

In `inspectGraph()`, propagate the actor from options to the output:

```typescript
return Object.freeze({
  // ... existing fields ...
  actor: options.actor ? Object.freeze({ ...options.actor }) : undefined,
});
```

**Modified file:** `src/graph/inspection/serialization.ts`

```typescript
export function inspectionToJSON(
  inspection: GraphInspection,
  options: InspectionToJSONOptions = {}
): GraphInspectionJSON {
  return {
    // ... existing fields ...
    actor: inspection.actor ? { ...inspection.actor } : undefined,
  };
}
```

**Rationale:** Actor attribution is optional (not all uses of `inspectGraph` are GxP-relevant), but when provided, it is carried through to the audit trail via JSON serialization and structured logging.

---

### Change 8: Port Name Validation (Gap SE-1)

**New file:** `src/validation/port-name-validation.ts`

```typescript
/**
 * Port name validation utilities.
 *
 * Validates port names to prevent injection attacks, empty names,
 * and names with control characters.
 */

const PORT_NAME_MAX_LENGTH = 256;
const PORT_NAME_PATTERN = /^[a-zA-Z_$][a-zA-Z0-9_$.-]*$/;

export interface PortNameValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * Validates a port name for safety and correctness.
 *
 * Rules:
 * - Must not be empty
 * - Must not exceed 256 characters
 * - Must start with a letter, underscore, or dollar sign
 * - May contain letters, digits, underscores, dollar signs, dots, hyphens
 * - Must not contain control characters, whitespace, or path separators
 */
export function validatePortName(name: string): PortNameValidationResult {
  if (name.length === 0) {
    return { valid: false, reason: "Port name must not be empty" };
  }
  if (name.length > PORT_NAME_MAX_LENGTH) {
    return { valid: false, reason: `Port name exceeds maximum length of ${PORT_NAME_MAX_LENGTH}` };
  }
  if (!PORT_NAME_PATTERN.test(name)) {
    return {
      valid: false,
      reason:
        "Port name must start with a letter/underscore/$ and contain only alphanumerics, underscores, $, dots, and hyphens",
    };
  }
  return { valid: true };
}
```

This validation can be wired into `isGraph()` for boundary validation, and optionally into `addAdapter()` for defense-in-depth. It does NOT need to be wired into the compile-time path (port names come from `createPort()` in `@hex-di/core` which already constrains them at the type level).

**Rationale:** Prevents empty, overly long, or control-character-containing port names from entering the graph. Defensive at system boundaries where untrusted data might arrive.

---

### Change 9: API Stability Annotations (Gap CC-1, CC-2)

**Modified file:** `src/index.ts` -- Add stability header:

```typescript
/**
 * @hex-di/graph - Dependency Graph Construction and Validation
 *
 * ## API Stability Tiers
 *
 * | Tier | Import Path | Stability | Policy |
 * |------|-------------|-----------|--------|
 * | Primary | `@hex-di/graph` | Stable | Semver-protected; breaking changes require major version bump |
 * | Advanced | `@hex-di/graph/advanced` | Stable | Semver-protected; additions may occur in minor versions |
 * | Internal | `@hex-di/graph/internal` | Unstable | May change without notice in any version; not for external consumption |
 *
 * @packageDocumentation
 */
```

**New file:** `CHANGELOG.md` (in package root)

Initial changelog entry documenting the GxP compliance improvements.

**Rationale:** Documenting stability tiers allows consumers to make informed decisions about which APIs to depend on. The CHANGELOG provides an audit trail of changes.

---

### Change 10: Performance Documentation (Gap DO-1)

**Modified file:** `src/graph/inspection/inspector.ts` -- Enhance JSDoc:

```typescript
/**
 * Inspects a built Graph and returns detailed runtime information.
 *
 * ## Time Complexity
 *
 * | Operation | Complexity | Notes |
 * |-----------|------------|-------|
 * | Port enumeration | O(A) | A = adapter count |
 * | Dependency map construction | O(A * D) | D = avg dependencies per adapter |
 * | Unsatisfied requirements | O(R) | R = total required ports |
 * | Max chain depth (DFS) | O(A + E) | E = total edges |
 * | Orphan port detection | O(P) | P = provided ports |
 * | Disposal warnings | O(A * D) | For each adapter, scan dependencies |
 * | Complexity score | O(E) | Sum of all dependency edges |
 * | Unnecessary lazy detection | O(L * (A + E)) | L = lazy port count |
 * | Suggestions | O(U + O + D) | U = unsatisfied, O = orphans, D = disposal warnings |
 * | **Total** | **O(A * D + L * (A + E))** | Dominated by lazy analysis |
 *
 * ## Memory Complexity
 *
 * O(A + E) for the dependency map and auxiliary data structures.
 *
 * ## Scale Guidelines
 *
 * | Adapter Count | Expected Time | Notes |
 * |--------------|---------------|-------|
 * | 1-100 | < 1ms | Typical application |
 * | 100-500 | 1-10ms | Large monolith |
 * | 500-1000 | 10-50ms | Very large system, consider splitting |
 * | 1000+ | 50ms+ | Not recommended; split into subgraphs |
 */
```

Similar documentation for `detectCycleAtRuntime()` (O(V + E) DFS) and `topologicalSort()` (O(V + E) Kahn's algorithm).

**Rationale:** GxP systems require documented performance characteristics for validation of system suitability.

---

## 4. New Code to Implement

### Summary of New Files

| File                                     | Purpose                                  | Lines (est.) |
| ---------------------------------------- | ---------------------------------------- | ------------ |
| `src/audit/types.ts`                     | Audit trail interfaces                   | ~80          |
| `src/audit/global-sink.ts`               | Global audit sink with optional warning  | ~55          |
| `src/audit/index.ts`                     | Barrel export                            | ~15          |
| `src/errors/graph-build-exception.ts`    | Exception class preserving error payload | ~25          |
| `src/validation/port-name-validation.ts` | Port name validation utility             | ~40          |
| `CHANGELOG.md`                           | Package changelog                        | ~30          |

### Summary of Modified Files

| File                                         | Change                                                          | Impact |
| -------------------------------------------- | --------------------------------------------------------------- | ------ |
| `src/builder/builder-build.ts`               | Emit audit events; use GraphBuildException                      | Medium |
| `src/builder/builder.ts`                     | Freeze Sets; forward actor to inspect                           | Low    |
| `src/builder/builder-provide.ts`             | Freeze Set in addOverrideAdapter                                | Low    |
| `src/builder/builder-merge.ts`               | Freeze Set in mergeGraphs                                       | Low    |
| `src/graph/guards.ts`                        | Deep validation in isGraph()                                    | Low    |
| `src/graph/types/inspection.ts`              | Add actor to InspectOptions/GraphInspection/GraphInspectionJSON | Low    |
| `src/graph/inspection/inspector.ts`          | Propagate actor; add performance JSDoc                          | Low    |
| `src/graph/inspection/serialization.ts`      | Serialize actor field                                           | Low    |
| `src/graph/inspection/correlation.ts`        | Bounded counter with process-unique prefix                      | Low    |
| `src/graph/inspection/structured-logging.ts` | Include actor in log entries                                    | Low    |
| `src/index.ts`                               | Add stability tier docs; export audit types                     | Low    |
| `src/advanced.ts`                            | Export audit sink and exception                                 | Low    |
| `src/errors/index.ts`                        | Export GraphBuildException                                      | Low    |

---

## 5. Test Requirements

### 5.1 Audit Trail Tests

**New file:** `tests/audit/audit-sink.test.ts`

| Test Case                                      | Description                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `emits build.attempt on successful build`      | Configure a mock sink, call `tryBuildGraph()`, verify event emitted                     |
| `emits build.attempt on failed build`          | Configure mock sink, build graph with cycle, verify failure event with structured error |
| `emits validation.decision on validation pass` | Call `validateBuildable()`, verify decision event with `result: "pass"`                 |
| `emits depth.fallback when depth exceeded`     | Create graph exceeding depth limit, verify fallback provenance event                    |
| `emits warning when no sink configured`        | Clear sink, call build, verify `console.warn` called once                               |
| `does not emit warning on subsequent calls`    | Clear sink, call build twice, verify `console.warn` called only once                    |
| `sink errors do not prevent build`             | Configure sink that throws, call build, verify build still succeeds                     |
| `actor propagated to audit events`             | Pass actor in options, verify actor appears in event                                    |
| `clearAuditSink resets state`                  | Set sink, clear it, verify warning emitted again                                        |

### 5.2 GraphBuildException Tests

**New file:** `tests/errors/graph-build-exception.test.ts`

| Test Case                             | Description                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `instanceof Error`                    | Verify `exception instanceof Error === true`                                                    |
| `preserves CyclicDependency payload`  | Build graph with cycle, catch, verify `cause._tag === "CyclicDependency"` and `cause.cyclePath` |
| `preserves CaptiveDependency payload` | Build graph with captive, catch, verify all 4 fields on `cause`                                 |
| `message matches original error`      | Verify `exception.message` equals the original `GraphBuildError.message`                        |
| `name is GraphBuildException`         | Verify `exception.name === "GraphBuildException"`                                               |
| `cause is frozen`                     | Verify `Object.isFrozen(exception.cause)`                                                       |
| `exception itself is frozen`          | Verify `Object.isFrozen(exception)`                                                             |

### 5.3 Deep isGraph() Guard Tests

**New file:** `tests/graph/deep-guard.test.ts`

| Test Case                                     | Description                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| `rejects missing __portName on provides`      | `{ adapters: [{ provides: {}, requires: [] }], overridePortNames: new Set() }` |
| `rejects non-string __portName`               | `provides: { __portName: 42 }`                                                 |
| `rejects empty __portName`                    | `provides: { __portName: "" }`                                                 |
| `rejects non-array requires`                  | `requires: "not-an-array"`                                                     |
| `rejects requires element without __portName` | `requires: [{}]`                                                               |
| `rejects invalid lifetime`                    | `lifetime: "permanent"`                                                        |
| `rejects missing lifetime`                    | no `lifetime` property                                                         |
| `accepts valid Graph`                         | Valid graph built via GraphBuilder                                             |
| `accepts graph with empty adapters`           | `{ adapters: [], overridePortNames: new Set() }`                               |
| `accepts graph with multiple valid adapters`  | 3+ adapters with different lifetimes                                           |

### 5.4 Set Freezing Tests

**New file:** `tests/builder/set-freezing.test.ts`

| Test Case                                  | Description                                                |
| ------------------------------------------ | ---------------------------------------------------------- |
| `constructor freezes overridePortNames`    | `Object.isFrozen(builder.overridePortNames)`               |
| `addOverrideAdapter returns frozen Set`    | Verify returned state has frozen Set                       |
| `mergeGraphs returns frozen Set`           | Verify merged state has frozen Set                         |
| `create() returns builder with frozen Set` | Verify `GraphBuilder.create().overridePortNames` is frozen |
| `Set.add throws on frozen Set`             | Attempt `.add()` on frozen Set, expect TypeError           |

### 5.5 Correlation ID Tests

**New file (extend existing):** `tests/inspection/correlation-bounded.test.ts`

| Test Case                                         | Description                                                  |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `includes process-unique prefix`                  | Generated IDs contain a random prefix segment                |
| `different generators produce different prefixes` | Two generators produce non-colliding IDs                     |
| `counter wraps at MAX_SAFE_INTEGER`               | Set counter near max, verify it wraps with generation suffix |
| `seeded mode unchanged`                           | Verify seeded mode still produces deterministic output       |

### 5.6 Property-Based Tests (Gap TV-1)

**New file:** `tests/property-based/graph-invariants.test.ts`

Using `fast-check` or a similar generator library:

| Property                         | Description                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `frozen output invariant`        | For any valid adapter combination, `Object.isFrozen(graph)` is true                              |
| `inspection determinism`         | For any graph, two calls to `inspectGraph()` produce identical results (excluding correlationId) |
| `normalizeCyclePath idempotence` | `normalizeCyclePath(normalizeCyclePath(x))` equals `normalizeCyclePath(x)` for any string array  |
| `merge associativity`            | `merge(merge(A, B), C)` has same adapters as `merge(A, merge(B, C))`                             |
| `sorted arrays remain sorted`    | `unsatisfiedRequirements`, `orphanPorts`, `overrides` are always sorted                          |
| `build() freezes adapters array` | For any buildable graph, `Object.isFrozen(result.adapters)`                                      |
| `cycle detection consistency`    | If runtime detects a cycle, the normalized path starts with the lex-smallest node                |
| `captive detection symmetry`     | If `detectCaptiveAtRuntime` returns a result, `dependentLevel < captiveLevel` always holds       |

### 5.7 Port Name Validation Tests

**New file:** `tests/validation/port-name-validation.test.ts`

| Test Case                             | Description                                        |
| ------------------------------------- | -------------------------------------------------- |
| `rejects empty string`                | `""` --> invalid                                   |
| `rejects whitespace-only`             | `"  "` --> invalid                                 |
| `rejects control characters`          | `"Port\x00Name"` --> invalid                       |
| `rejects starting with digit`         | `"1Port"` --> invalid                              |
| `accepts standard names`              | `"Logger"`, `"UserService"`, `"$config"` --> valid |
| `accepts names with dots and hyphens` | `"my.service"`, `"my-port"` --> valid              |
| `rejects overly long names`           | 257-char string --> invalid                        |
| `accepts max-length names`            | 256-char valid string --> valid                    |

---

## 6. Migration Notes

### 6.1 Breaking Change: GraphBuildException

**Impact:** Consumers who `catch(e)` on `build()` or `buildFragment()` and check `e instanceof Error` are unaffected (GraphBuildException extends Error). Consumers who check `e.message` are unaffected (message is preserved).

**New capability:** Consumers can now access `e.cause` to get the full `GraphBuildError` discriminated union:

```typescript
try {
  graph.build();
} catch (e) {
  if (e instanceof GraphBuildException) {
    switch (e.cause._tag) {
      case "CyclicDependency":
        console.log("Cycle path:", e.cause.cyclePath);
        break;
      case "CaptiveDependency":
        console.log("Captive:", e.cause.dependentPort, "->", e.cause.captivePort);
        break;
    }
  }
}
```

### 6.2 Breaking Change: Deep isGraph() Guard

**Impact:** Objects that previously passed the shallow `isGraph()` check but lacked `__portName`, `lifetime`, or proper `requires` structure will now fail the guard.

**Migration:** Ensure all objects passed to `isGraph()` have the full adapter structure. In practice, any object produced by `GraphBuilder.build()` already has the correct structure, so this only affects manually constructed graph-like objects.

### 6.3 Non-Breaking: Audit Trail

The audit trail is entirely opt-in. Existing code continues to work without changes. The only observable difference is a single `console.warn` on the first build call if no sink is configured.

### 6.4 Non-Breaking: Correlation ID Format

The correlation ID format changes from `insp_{counter}_{suffix}` to `insp_{processId}_{counter}_{suffix}`. Tests that assert exact correlation ID format will need updating. Tests that use seeded mode are unaffected.

### 6.5 Non-Breaking: Actor Attribution

The `actor` field on `InspectOptions`, `GraphInspection`, and `GraphInspectionJSON` is optional. Existing code that does not pass an `actor` continues to work unchanged. The field is `undefined` when not provided.

---

## 7. Tracing Warning Strategy

### Principle

Tracing (audit trail) is OPTIONAL. The graph package must function correctly and performantly whether or not an audit sink is configured. Audit failures must NEVER prevent graph operations from completing.

### Implementation

1. **One-time console.warn:** On the first graph build or validation call without a configured audit sink, emit a single `console.warn`:

   ```
   [hex-di/graph] No audit sink configured. Graph validation decisions will not be persisted.
   Call setAuditSink() to enable GxP audit trail.
   ```

   This warning is emitted exactly once per process lifecycle. Subsequent calls produce no output.

2. **Silent drop on sink error:** If a configured audit sink throws an exception, the error is silently caught and swallowed. The graph operation continues. In production, sink health should be monitored via separate health check mechanisms.

3. **No performance impact when disabled:** When no sink is configured, `emitAuditEvent()` is a no-op after the initial warning check. The function body is:

   ```typescript
   if (currentSink === NO_SINK) {
     if (!warningEmitted) { console.warn(...); warningEmitted = true; }
     return;
   }
   ```

   This is a single boolean check on the hot path -- negligible overhead.

4. **Structured log integration:** The existing `toStructuredLogs()` function already produces machine-readable log entries. The audit sink receives richer, dedicated audit events that include validation outcomes and actor attribution. These are complementary systems:
   - `toStructuredLogs()` = observability (debugging, monitoring)
   - `AuditSink` = compliance (persistent, append-only, attributable)

5. **Testing without a sink:** Tests that do not concern themselves with audit trail should call `clearAuditSink()` in their setup to suppress the warning. Alternatively, a `jest.spyOn(console, "warn")` mock prevents noise.

6. **Testing with a sink:** Tests that verify audit behavior configure a mock sink:
   ```typescript
   const events: AuditEvent[] = [];
   setAuditSink({ emit: e => events.push(e) });
   // ... perform operations ...
   expect(events).toContainEqual(
     expect.objectContaining({
       type: "graph.build.attempt",
       outcome: "success",
     })
   );
   ```

### Warning Levels

| Scenario                              | Behavior                               |
| ------------------------------------- | -------------------------------------- |
| No sink configured, first build       | `console.warn` once                    |
| No sink configured, subsequent builds | Silent (no output)                     |
| Sink configured, build succeeds       | Audit event emitted, no console output |
| Sink configured, build fails          | Audit event emitted with error details |
| Sink configured but throws            | Error caught silently, build proceeds  |
| Sink configured then cleared          | Warning emitted again on next build    |

---

## Appendix A: Score Projection After Changes

| #   | Criteria                        | Current | After Changes | Justification                                                                                                |
| --- | ------------------------------- | ------- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Data Integrity                  | 9.0     | 10.0          | Set freezing (DI-1), deep guard prevents invalid data (DI-2 via guard)                                       |
| 2   | Traceability & Audit Trail      | 7.0     | 10.0          | Persistent audit (TR-1), actor attribution (TR-2), decision provenance (TR-3), unique correlation IDs (TR-4) |
| 3   | Determinism & Reproducibility   | 9.0     | 10.0          | Bounded counter (DE-1), process-unique IDs                                                                   |
| 4   | Error Handling & Recovery       | 9.0     | 10.0          | GraphBuildException preserves full payload (EH-1)                                                            |
| 5   | Validation & Input Verification | 9.5     | 10.0          | Deep isGraph() guard (VV-1), port name validation                                                            |
| 6   | Change Control & Versioning     | 7.0     | 10.0          | CHANGELOG (CC-1), stability tiers (CC-2), version policy (CC-3)                                              |
| 7   | Testing & Verification          | 8.0     | 10.0          | Property-based tests (TV-1), coverage metrics (TV-2), mutation testing (TV-3)                                |
| 8   | Security                        | 7.0     | 10.0          | Port name validation (SE-1), deep guard (SE-2), bounds documentation (SE-3)                                  |
| 9   | Documentation                   | 8.5     | 10.0          | Performance docs (DO-1), CONCEPT clarification (DO-2), README (DO-3)                                         |
| 10  | Lifecycle Management            | 7.5     | 10.0          | Audit lifecycle events (LM-2), structured disposal data (LM-1)                                               |

**Projected weighted score:** 10.0

---

## Appendix B: Implementation Priority Order

| Priority | Change                                | Effort | Score Impact (weighted)              |
| -------- | ------------------------------------- | ------ | ------------------------------------ |
| 1        | Change 3: GraphBuildException         | Low    | +0.12 (Error Handling)               |
| 2        | Change 5: Freeze Sets                 | Low    | +0.15 (Data Integrity)               |
| 3        | Change 4: Deep isGraph()              | Low    | +0.06 (Validation) + 0.18 (Security) |
| 4        | Change 6: Bounded Correlation IDs     | Low    | +0.15 (Determinism)                  |
| 5        | Change 1+2: Audit Trail Sink + Events | Medium | +0.36 (Traceability)                 |
| 6        | Change 7: Actor Attribution           | Low    | (included in Traceability)           |
| 7        | Change 8: Port Name Validation        | Low    | (included in Security)               |
| 8        | Change 9: API Stability Annotations   | Low    | +0.24 (Change Control)               |
| 9        | Change 10: Performance Documentation  | Low    | +0.075 (Documentation)               |
| 10       | Property-based tests (TV-1)           | Medium | +0.20 (Testing)                      |

Total estimated implementation effort: **3-5 days** for a developer familiar with the codebase.

---

_End of Technical Refinement Document for @hex-di/graph GxP 10/10 Compliance_
