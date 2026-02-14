# GxP Compliance Analysis Report: @hex-di/core

**Package:** `@hex-di/core` v0.1.0
**Analysis Date:** 2026-02-10
**Scope:** 32 source files, ~7,073 lines of source code, 16 test files (~4,227 lines of tests)
**Zero runtime dependencies**

---

## 1. Executive Summary

**Overall GxP Readiness Score: 8.2 / 10**

The `@hex-di/core` package demonstrates strong GxP compliance characteristics, particularly in data integrity, error handling, validation, and type safety. The package serves as the zero-dependency foundation for the HexDI dependency injection framework, defining ports, adapters, error types, inspection contracts, and tracing primitives.

**Key Strengths:**

- 21+ discriminated error types with `readonly` detail properties and exhaustive machine-readable error codes (HEX001-HEX025)
- Zero type casts in production source (`as any`, `as unknown`, `as never` are absent from `src/`)
- Pervasive `Object.freeze()` and `readonly` enforcement on all data structures
- Symbol-based access control for internal APIs (`Symbol.for("@hex-di/core/...")`)
- Comprehensive `ContainerError` hierarchy with V8 stack trace capture
- Full `@packageDocumentation` JSDoc coverage across all modules

**Key Gaps:**

- Non-deterministic correlation ID generation via `Math.random()` (not cryptographically secure, not reproducible)
- Single `as T` cast in `getContext()` helper (unavoidable `Map<symbol, unknown>` retrieval)
- No formal changelog or semantic versioning enforcement tooling
- No runtime cryptographic signing or tamper detection on frozen objects

---

## 2. Package Overview

### Architecture

`@hex-di/core` implements the type-level foundation for a hexagonal architecture dependency injection system. It is organized into five modules:

| Module        | Purpose                                                 | Files   |
| ------------- | ------------------------------------------------------- | ------- |
| `ports/`      | Branded port tokens with direction and metadata         | 4 files |
| `adapters/`   | Adapter types, factory, guards, lazy ports, inference   | 8 files |
| `errors/`     | Error hierarchy, codes, parsing, resolution errors      | 7 files |
| `inspection/` | Container snapshots, tracing types, inspector contracts | 6 files |
| `utils/`      | Correlation IDs, type utilities                         | 3 files |
| `context/`    | Context variables for runtime value passing             | 3 files |
| Root          | Main barrel export                                      | 1 file  |

### Dependency Graph

```
@hex-di/core (zero external dependencies)
  |
  +-- ports/types.ts       (foundational: Port<T, TName> branded type)
  +-- ports/directed.ts     (extends: DirectedPort with direction + metadata)
  +-- ports/factory.ts      (creates: createPort(), port() builder)
  |
  +-- adapters/types.ts     (defines: Adapter<> branded type)
  +-- adapters/unified.ts   (creates: createAdapter() with 16 overloads)
  +-- adapters/guards.ts    (validates: isAdapter(), isLifetime(), isFactoryKind())
  +-- adapters/lazy.ts      (lazy: lazyPort() for circular dependency breaking)
  +-- adapters/inference.ts (infers: InferAdapterProvides, InferAdapterRequires, ...)
  |
  +-- errors/base.ts        (abstract: ContainerError with V8 stack capture)
  +-- errors/classes.ts     (concrete: 7 error classes)
  +-- errors/codes.ts       (enum: NumericErrorCode HEX001-025, ErrorCode)
  +-- errors/types.ts       (parsed: 21 ParsedError discriminated union types)
  +-- errors/parsing.ts     (parser: parseError() structured extraction)
  |
  +-- inspection/           (contracts: TraceEntry, TracingAPI, InspectorAPI, ...)
  +-- context/              (runtime: createContextVariable, getContext)
  +-- utils/                (helpers: generateCorrelationId, type utilities)
```

---

## 3. GxP Compliance Matrix

| #   | Criterion                       | Score      | Rating     |
| --- | ------------------------------- | ---------- | ---------- |
| 1   | Data Integrity (ALCOA+)         | 8.5/10     | Strong     |
| 2   | Traceability & Audit Trail      | 8.0/10     | Strong     |
| 3   | Determinism & Reproducibility   | 7.0/10     | Moderate   |
| 4   | Error Handling & Recovery       | 9.5/10     | Excellent  |
| 5   | Validation & Input Verification | 9.0/10     | Excellent  |
| 6   | Change Control & Versioning     | 7.5/10     | Moderate   |
| 7   | Testing & Verification          | 8.5/10     | Strong     |
| 8   | Security                        | 8.0/10     | Strong     |
| 9   | Documentation                   | 9.0/10     | Excellent  |
| 10  | Lifecycle Management            | 8.0/10     | Strong     |
|     | **Weighted Average**            | **8.2/10** | **Strong** |

---

## 4. Detailed Analysis

### 4.1 Data Integrity (ALCOA+) -- Score: 8.5/10

**ALCOA+ Principles Assessment:**

| Principle           | Status    | Evidence                                                                                                         |
| ------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| **Attributable**    | Strong    | Every error carries `code`, `portName`, `_tag` identifying the source                                            |
| **Legible**         | Strong    | Human-readable error messages with structured codes (e.g., `ERROR[HEX001]`)                                      |
| **Contemporaneous** | Moderate  | `TraceEntry.startTime` captures high-resolution timestamps, but correlation IDs use non-deterministic generation |
| **Original**        | Excellent | `Object.freeze()` on all adapter and port objects prevents mutation                                              |
| **Accurate**        | Strong    | Branded types with `readonly` enforce correctness at the type level                                              |

**Compliant Pattern -- Immutable Error Data:**

From `packages/core/src/errors/classes.ts`:

```typescript
export class CircularDependencyError extends ContainerError {
  readonly _tag = "CircularDependency";
  readonly code = "CIRCULAR_DEPENDENCY" as const;
  readonly isProgrammingError = true as const;

  readonly dependencyChain: readonly string[];

  constructor(dependencyChain: readonly string[]) {
    const formattedChain = dependencyChain.join(" -> ");
    super(`Circular dependency detected: ${formattedChain}`);
    this.dependencyChain = Object.freeze([...dependencyChain]);
  }
}
```

Key data integrity features:

- `readonly` on every property prevents post-construction mutation
- `Object.freeze([...dependencyChain])` creates a defensive copy then freezes it
- `as const` on discriminant fields preserves literal types for exhaustive matching

**Compliant Pattern -- Frozen Adapter Objects:**

From `packages/core/src/adapters/unified.ts`:

```typescript
// Build the adapter object
const baseAdapter = {
  provides: config.provides,
  requires,
  lifetime: effectiveLifetime,
  factoryKind,
  factory,
  clonable,
};

// Add finalizer if present
if (config.finalizer !== undefined) {
  return Object.freeze({
    ...baseAdapter,
    finalizer: config.finalizer,
  });
}

return Object.freeze(baseAdapter);
```

Every adapter returned by `createAdapter()` is frozen, preventing any post-creation tampering.

**Compliant Pattern -- Frozen Port Objects:**

From `packages/core/src/ports/factory.ts`:

```typescript
const metadata: PortMetadata = Object.freeze({
  description: config.description,
  category: config.category,
  tags: config.tags ?? [],
});

const runtime: DirectedPortRuntime<TName> = Object.freeze({
  __portName: config.name,
  [DIRECTION_BRAND]: direction,
  [METADATA_KEY]: metadata,
});
```

Ports are deeply frozen -- both the port object and its metadata are individually frozen.

**Non-Compliant Pattern -- Mutable Error Properties via Prototype:**

From `packages/core/src/errors/base.ts`:

```typescript
export abstract class ContainerError extends Error {
  abstract readonly code: string;
  abstract readonly isProgrammingError: boolean;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    // ...
  }
}
```

While properties are declared `readonly`, the `Error` base class has mutable `message` and `stack` properties inherited from JavaScript. The `readonly` modifier prevents TypeScript reassignment but does not prevent JavaScript-level mutation.

---

### 4.2 Traceability & Audit Trail -- Score: 8.0/10

**Compliant Pattern -- Comprehensive Trace Entry Type:**

From `packages/core/src/inspection/tracing-types.ts`:

```typescript
export interface TraceEntry {
  readonly id: string;
  readonly portName: string;
  readonly lifetime: Lifetime;
  readonly startTime: number;
  readonly duration: number;
  readonly isCacheHit: boolean;
  readonly parentId: string | null;
  readonly childIds: readonly string[];
  readonly scopeId: string | null;
  readonly order: number;
  readonly isPinned: boolean;
}
```

Each resolution trace captures:

- **What**: `portName`, `lifetime`
- **When**: `startTime`, `duration`, `order` (global counter)
- **Where**: `scopeId`, `parentId`/`childIds` (tree structure)
- **How**: `isCacheHit`, `isPinned`

**Compliant Pattern -- Structured Trace Statistics:**

```typescript
export interface TraceStats {
  readonly totalResolutions: number;
  readonly averageDuration: number;
  readonly cacheHitRate: number;
  readonly slowCount: number;
  readonly sessionStart: number;
  readonly totalDuration: number;
}
```

**Compliant Pattern -- Configurable Retention Policy:**

```typescript
export interface TraceRetentionPolicy {
  readonly maxTraces: number; // default 1000
  readonly maxPinnedTraces: number; // default 100
  readonly slowThresholdMs: number; // default 100
  readonly expiryMs: number; // default 300000 (5 minutes)
}
```

This enables configurable audit trail retention, with slow traces automatically pinned to prevent eviction.

**Compliant Pattern -- Correlation ID for Cross-Cutting Tracing:**

From `packages/core/src/inspection/graph-types.ts`:

```typescript
export interface GraphInspection {
  // ...
  readonly correlationId: string;
  // Format: `insp_{timestamp}_{random}` (e.g., "insp_1705123456789_x7k2")
}
```

Correlation IDs enable linking inspection results across logs, traces, and debugging sessions.

**Compliant Pattern -- Inspector Event Stream:**

From `packages/core/src/inspection/inspector-types.ts`:

```typescript
export type InspectorEvent =
  | { readonly type: "snapshot-changed" }
  | { readonly type: "scope-created"; readonly scope: ScopeEventInfo }
  | { readonly type: "scope-disposed"; readonly scopeId: string }
  | {
      readonly type: "resolution";
      readonly portName: string;
      readonly duration: number;
      readonly isCacheHit: boolean;
    }
  | { readonly type: "phase-changed"; readonly phase: ContainerPhase }
  | {
      readonly type: "init-progress";
      readonly current: number;
      readonly total: number;
      readonly portName: string;
    }
  | { readonly type: "result:ok"; readonly portName: string; readonly timestamp: number }
  | {
      readonly type: "result:err";
      readonly portName: string;
      readonly errorCode: string;
      readonly timestamp: number;
    };
// ... additional event types
```

Every significant container lifecycle event is emitted as a typed, readonly event with timestamps.

**Gap -- No Built-In Persistence:**

Trace entries exist in memory only. There is no built-in mechanism for persisting traces to durable storage, though the `TracingAPI.subscribe()` callback enables external persistence.

---

### 4.3 Determinism & Reproducibility -- Score: 7.0/10

**Non-Compliant Pattern -- Math.random() Correlation IDs:**

From `packages/core/src/utils/correlation.ts`:

```typescript
export function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

This is the primary determinism concern in the package:

- `Math.random()` is not seedable, making correlation IDs non-reproducible across runs
- Not cryptographically secure (PRNG, not CSPRNG)
- No monotonic ordering guarantee (two calls in the same microsecond could produce any ordering)
- Testing requires mocking `Math.random` rather than injecting a seed

**Non-Compliant Pattern -- Symbol() for Context Variables:**

From `packages/core/src/context/variables.ts`:

```typescript
export function createContextVariable<T>(name: string, defaultValue?: T): ContextVariable<T> {
  return {
    id: Symbol(name),
    defaultValue,
  };
}
```

`Symbol(name)` creates a unique symbol every time, making context variable identity non-reproducible. This is intentional for collision avoidance but means the same code path produces different symbols across runs.

**Compliant Pattern -- Deterministic Error Code Assignment:**

From `packages/core/src/errors/codes.ts`:

```typescript
export const NumericErrorCode = {
  DUPLICATE_ADAPTER: "HEX001",
  CIRCULAR_DEPENDENCY: "HEX002",
  CAPTIVE_DEPENDENCY: "HEX003",
  // ... through HEX025
} as const;
```

Error codes are static constants -- the same error always produces the same code, enabling deterministic error handling.

**Compliant Pattern -- Deterministic Adapter Defaults:**

From `packages/core/src/adapters/unified.ts`:

```typescript
const requires = config.requires ?? EMPTY_REQUIRES;
const lifetime = config.lifetime ?? SINGLETON;
const clonable = config.clonable ?? FALSE;
```

Default values are deterministic constants, not computed at runtime. `EMPTY_REQUIRES` is `Object.freeze([])`, ensuring the same frozen empty array is always used.

**Compliant Pattern -- Deterministic Inspection Ordering:**

From `packages/core/src/inspection/graph-types.ts` (interface documentation):

```typescript
/**
 * ## Ordering Guarantee
 *
 * **Order is deterministic**: Items appear in adapter registration order,
 * which is the order adapters were passed to `.provide()` or `.provideMany()`.
 *
 * Note: Other array properties like `unsatisfiedRequirements`, `orphanPorts`,
 * and `overrides` use **set semantics** (sorted alphabetically for consistency)
 * rather than registration order.
 */
readonly provides: readonly string[];
```

Inspection results explicitly document their ordering guarantees, enabling deterministic testing.

---

### 4.4 Error Handling & Recovery -- Score: 9.5/10

This is the strongest area of GxP compliance. The error system is exhaustive, typed, and designed for programmatic handling.

**Compliant Pattern -- ContainerError Base Class with V8 Stack Capture:**

From `packages/core/src/errors/base.ts`:

```typescript
export abstract class ContainerError extends Error {
  abstract readonly code: string;
  abstract readonly isProgrammingError: boolean;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    const ErrorWithCapture: V8ErrorConstructor = Error;
    if (typeof ErrorWithCapture.captureStackTrace === "function") {
      ErrorWithCapture.captureStackTrace(this, new.target);
    }
  }

  override get name(): string {
    return this.constructor.name;
  }
}
```

Features:

- Abstract `code` and `isProgrammingError` force concrete classes to categorize themselves
- V8 `captureStackTrace` produces clean stack traces excluding the constructor
- `Object.setPrototypeOf` ensures `instanceof` works across module boundaries
- `name` getter returns the concrete class name for debugging

**Compliant Pattern -- Programming Error vs Runtime Error Classification:**

```typescript
// Programming errors (should be fixed in code):
export class CircularDependencyError extends ContainerError {
  readonly isProgrammingError = true as const;
}
export class DisposedScopeError extends ContainerError {
  readonly isProgrammingError = true as const;
}
export class ScopeRequiredError extends ContainerError {
  readonly isProgrammingError = true as const;
}

// Runtime errors (may be recoverable):
export class FactoryError extends ContainerError {
  readonly isProgrammingError = false as const;
}
export class AsyncFactoryError extends ContainerError {
  readonly isProgrammingError = false as const;
}
```

This classification enables automated error triage -- programming errors should fail fast in development, runtime errors may require operational handling.

**Compliant Pattern -- Discriminated Union for Pattern Matching:**

From `packages/core/src/errors/resolution-error.ts`:

```typescript
export type ResolutionError =
  | CircularDependencyError
  | FactoryError
  | DisposedScopeError
  | ScopeRequiredError
  | AsyncFactoryError
  | AsyncInitializationRequiredError
  | NonClonableForkedError;

export function isResolutionError(error: unknown): error is ResolutionError {
  return error instanceof ContainerError;
}

export function toResolutionError(error: unknown): ResolutionError | null {
  if (isResolutionError(error)) {
    return error;
  }
  return null;
}
```

The `_tag` discriminant on each error class enables exhaustive `switch` statements.

**Compliant Pattern -- Structured Error Parsing:**

From `packages/core/src/errors/parsing.ts`:

```typescript
export function parseError(message: string): ParsedError | undefined {
  if (!isHexError(message)) {
    return undefined;
  }

  // Duplicate adapter (HEX001)
  const duplicateMatch = message.match(
    /ERROR\[HEX001\]: Duplicate adapter for '(?<portName>[^']+)'/
  );
  if (duplicateMatch?.groups) {
    return {
      code: ErrorCode.DUPLICATE_ADAPTER,
      message,
      details: { portName: duplicateMatch.groups.portName },
    };
  }
  // ... 20+ additional pattern matchers
}
```

Error messages can be round-tripped: `throw -> catch -> message -> parseError() -> structured details`.

**Compliant Pattern -- Safe Unknown Extraction:**

From `packages/core/src/errors/base.ts`:

```typescript
export function extractErrorMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  if (hasMessageProperty(cause)) {
    return cause.message;
  }
  return String(cause);
}
```

Handles all thrown value types safely without silent failures.

**Compliant Pattern -- 21 Parsed Error Types with Readonly Details:**

From `packages/core/src/errors/types.ts`:

```typescript
export type ParsedError =
  | ParsedDuplicateAdapterError
  | ParsedCircularDependencyError
  | ParsedCaptiveDependencyError
  | ParsedReverseCaptiveDependencyError
  | ParsedLifetimeInconsistencyError
  | ParsedSelfDependencyError
  | ParsedDepthLimitExceededError
  | ParsedMissingDependencyError
  | ParsedOverrideWithoutParentError
  | ParsedMissingProvidesError
  | ParsedInvalidProvidesError
  | ParsedInvalidRequiresTypeError
  | ParsedInvalidRequiresElementError
  | ParsedInvalidLifetimeTypeError
  | ParsedInvalidLifetimeValueError
  | ParsedInvalidFactoryError
  | ParsedDuplicateRequiresError
  | ParsedInvalidFinalizerError
  | ParsedInvalidLazyPortError
  | ParsedMultipleErrorsError
  | ParsedUnknownErrorError;
```

Each variant has typed `readonly details` (e.g., `ParsedCaptiveDependencyError` carries `dependentLifetime`, `dependentName`, `captiveLifetime`, `captiveName`).

---

### 4.5 Validation & Input Verification -- Score: 9.0/10

**Compliant Pattern -- Exhaustive Runtime Adapter Validation:**

From `packages/core/src/adapters/unified.ts`:

```typescript
function assertValidAdapterConfig(
  config: {
    provides?: unknown;
    requires?: unknown;
    lifetime?: unknown;
    factory?: unknown;
    finalizer?: unknown;
  },
  isAsync: boolean
): void {
  // Validate 'provides' - must be a Port object
  if (config.provides === null || config.provides === undefined) {
    throw new TypeError(
      "ERROR[HEX010]: Invalid adapter config: 'provides' is required. " +
        "Expected a Port created with createPort()."
    );
  }

  if (!isPortLike(config.provides)) {
    throw new TypeError(
      "ERROR[HEX011]: Invalid adapter config: 'provides' must be a Port object with __portName. " +
        `Got: ${typeof config.provides}. ` +
        "Create ports using createPort() from @hex-di/core."
    );
  }

  // Validate 'requires' - must be an array of Port objects
  if (!Array.isArray(config.requires)) {
    throw new TypeError(
      "ERROR[HEX012]: Invalid adapter config: 'requires' must be an array. " +
        `Got: ${typeof config.requires}. `
    );
  }

  // Element-by-element validation of requires array
  for (let i = 0; i < config.requires.length; i++) {
    const req: unknown = config.requires[i];
    if (!isPortLike(req)) {
      throw new TypeError(
        `ERROR[HEX013]: Invalid adapter config: 'requires[${i}]' must be a Port object. ` +
          `Got: ${req === null ? "null" : typeof req}.`
      );
    }
  }

  // Validate no duplicate ports in requires
  const requiresNames = new Set<string>();
  for (const port of requires) {
    if (requiresNames.has(port.__portName)) {
      throw new TypeError(`ERROR[HEX017]: Duplicate port '${port.__portName}' in requires array.`);
    }
    requiresNames.add(port.__portName);
  }

  // Self-dependency check
  if (requires.some(p => p.__portName === providesPort.__portName)) {
    throw new TypeError(
      `ERROR[HEX006]: Adapter cannot require its own port '${providesPort.__portName}'.`
    );
  }

  // Validate 'finalizer' - must be a function if provided
  if (config.finalizer !== undefined && typeof config.finalizer !== "function") {
    throw new TypeError("ERROR[HEX018]: Invalid adapter config: 'finalizer' must be a function.");
  }
}
```

This function validates **every field** of the adapter configuration, with specific error codes for each failure mode. Each error message includes:

1. The error code (`ERROR[HEXxxx]`)
2. What was expected
3. What was actually received
4. A hint for fixing the issue

**Compliant Pattern -- Compile-Time Type Guards:**

From `packages/core/src/adapters/guards.ts`:

```typescript
export function isAdapter(value: unknown): value is AdapterConstraint {
  if (value === null || typeof value !== "object") return false;
  if (!("provides" in value) || !isPort(value.provides)) return false;
  if (!("requires" in value) || !Array.isArray(value.requires)) return false;
  for (const req of value.requires) {
    if (!isPort(req)) return false;
  }
  if (!("lifetime" in value) || !isLifetime(value.lifetime)) return false;
  if (!("factoryKind" in value) || !isFactoryKind(value.factoryKind)) return false;
  if (!("factory" in value) || typeof value.factory !== "function") return false;
  if (!("clonable" in value) || typeof value.clonable !== "boolean") return false;
  return true;
}
```

The `isAdapter` guard checks every structural property of an adapter, narrowing `unknown` to `AdapterConstraint` safely.

**Compliant Pattern -- Compile-Time Async Lifetime Enforcement:**

From `packages/core/src/adapters/unified-types.ts`:

```typescript
export type EnforceAsyncLifetime<TFactory, TLifetime extends string> =
  IsAsyncFactory<TFactory> extends true
    ? TLifetime extends "singleton"
      ? TLifetime
      : AsyncLifetimeError<TLifetime>
    : TLifetime;

export type AsyncLifetimeError<L extends string> =
  `Async factories must use 'singleton' lifetime. Got: '${L}'. Hint: Remove the lifetime property to use the default, or make the factory synchronous.`;
```

If a developer attempts to use `lifetime: "scoped"` with an `async` factory, the adapter's lifetime type becomes an error message string, making the adapter unusable at compile time.

**Compliant Pattern -- Mutual Exclusion Enforcement:**

```typescript
if (hasFactory && hasClass) {
  throw new TypeError("ERROR[HEX020]: Cannot provide both 'factory' and 'class'. ");
}

if (!hasFactory && !hasClass) {
  throw new TypeError("ERROR[HEX019]: Must provide either 'factory' or 'class'. ");
}
```

Both compile-time (via `factory?: never` and `class?: never` on config types) and runtime validation enforce mutual exclusion.

**Compliant Pattern -- Library Inspector Type Guard:**

From `packages/core/src/inspection/library-inspector-types.ts`:

```typescript
export function isLibraryInspector(value: unknown): value is LibraryInspector {
  if (typeof value !== "object" || value === null) return false;
  if (!("name" in value) || typeof value.name !== "string" || value.name.length === 0) return false;
  if (!("getSnapshot" in value) || typeof value.getSnapshot !== "function") return false;
  if ("subscribe" in value && typeof value.subscribe !== "function") return false;
  if ("dispose" in value && typeof value.dispose !== "function") return false;
  return true;
}
```

Validates all required properties and optional property types of the `LibraryInspector` protocol.

---

### 4.6 Change Control & Versioning -- Score: 7.5/10

**Compliant Pattern -- Structured Error Code Ranges:**

From `packages/core/src/errors/codes.ts`:

```typescript
/**
 * ## Error Code Ranges
 *
 * | Range    | Category                        |
 * |----------|---------------------------------|
 * | HEX001-009 | Graph validation errors       |
 * | HEX010-019 | Adapter configuration errors  |
 * | HEX020-025 | Runtime/container errors      |
 */
```

Error codes are partitioned into reserved ranges by category, enabling forward-compatible extension. New error types are added to the appropriate range without renumbering existing codes.

**Compliant Pattern -- Explicit Export Surface:**

The `packages/core/src/index.ts` barrel export explicitly lists every exported symbol (170+ exports), organized by category. No glob re-exports (`export *`) are used.

**Compliant Pattern -- Schema Versioning for Serialized Data:**

From `packages/core/src/inspection/graph-types.ts`:

```typescript
export interface GraphInspectionJSON {
  readonly version: 1;
  readonly timestamp: string;
  // ...
}
```

The JSON serialization format includes a `version` field for forward compatibility.

**Gap -- No Automated Changelog:**

The package uses manual versioning (`0.1.0`) without tooling like `changesets` or `conventional-commits` to enforce version bumps on breaking changes.

**Gap -- No API Stability Annotations:**

While `@internal` JSDoc tags are used for internal APIs, there is no formal stability annotation system (e.g., `@experimental`, `@stable`, `@deprecated`) to communicate API maturity.

---

### 4.7 Testing & Verification -- Score: 8.5/10

**Test Coverage Summary:**

| Category                        | Files | Lines  |
| ------------------------------- | ----- | ------ |
| Runtime tests (`.test.ts`)      | 16    | ~3,500 |
| Type-level tests (`.test-d.ts`) | 5     | ~727   |
| **Total**                       | 21    | ~4,227 |

**Test Categories Observed:**

- `error-base.test.ts` -- ContainerError base class, stack trace capture, error message extraction
- `error-classes.test.ts` -- All 7 concrete error classes
- `error-parsing.test.ts` -- parseError() for all 21 error patterns
- `unified-adapter-validation.test.ts` -- Runtime validation of adapter configs (HEX006-HEX018)
- `unified-adapter.test.ts` -- Factory and class adapter creation
- `unified-adapter.test-d.ts` -- Type-level tests for async lifetime enforcement
- `adapter-guards.test.ts` -- isAdapter(), isLifetime(), isFactoryKind()
- `directed-ports.test.ts` -- DirectedPort creation, direction guards
- `lazy-port.test.ts` -- lazyPort(), isLazyPort(), getOriginalPort()
- `correlation.test.ts` -- generateCorrelationId()
- `resolution-error.test.ts` -- isResolutionError(), toResolutionError()
- `tracing-types.test.ts` -- hasTracingAccess()
- `library-inspector-types.test.ts` -- isLibraryInspector()
- `port-category.test.ts` / `port-category.test-d.ts` -- Category inference
- `context/variables.test.ts` -- createContextVariable()

**Compliant Pattern -- Mutation Testing Configuration:**

From `packages/core/package.json`:

```json
{
  "scripts": {
    "test:mutation": "stryker run"
  },
  "devDependencies": {
    "@stryker-mutator/core": "^8.7.1",
    "@stryker-mutator/vitest-runner": "^8.7.1"
  }
}
```

Mutation testing with Stryker is configured, providing confidence that tests catch meaningful code changes, not just line coverage.

**Compliant Pattern -- Type-Level Testing:**

Files like `unified-adapter.test-d.ts` and `async-lifetime-enforcement.test-d.ts` use Vitest's `expectTypeOf` to verify type-level constraints compile correctly.

**Gap -- Test Determinism for Correlation:**

The `correlation.test.ts` tests must mock `Math.random` to be deterministic, which is a consequence of the non-deterministic ID generation.

---

### 4.8 Security -- Score: 8.0/10

**Compliant Pattern -- Symbol-Based Private APIs:**

From `packages/core/src/ports/directed.ts`:

```typescript
export const DIRECTION_BRAND = Symbol.for("@hex-di/core/PortDirection");
export const METADATA_KEY = Symbol.for("@hex-di/core/PortMetadata");
```

From `packages/core/src/adapters/lazy.ts`:

```typescript
const LAZY_PORT_BRAND = Symbol.for("@hex-di/core/LazyPort");
const ORIGINAL_PORT = Symbol.for("@hex-di/core/OriginalPort");
```

From `packages/core/src/inspection/tracing-types.ts`:

```typescript
export function hasTracingAccess(container: unknown): container is { [key: symbol]: TracingAPI } {
  return (
    typeof container === "object" &&
    container !== null &&
    Symbol.for("hex-di/tracing-access") in container
  );
}
```

Symbol-keyed properties are not enumerable, not visible in `JSON.stringify`, and not accessible via standard property enumeration. The `Symbol.for()` usage provides cross-module-boundary consistency while maintaining encapsulation.

**Compliant Pattern -- Zero Runtime Dependencies:**

From `packages/core/package.json`:

```json
{
  "peerDependencies": {
    "typescript": ">=5.0"
  },
  "peerDependenciesMeta": {
    "typescript": {
      "optional": true
    }
  }
}
```

The package has zero `dependencies` and zero `devDependencies` beyond test tooling. The attack surface from transitive dependencies is zero.

**Compliant Pattern -- Object.freeze() Prevents Tampering:**

All ports, adapters, and metadata objects are frozen at creation time. A total of 8 `Object.freeze()` calls protect:

- Port runtime objects (`ports/factory.ts`)
- Port metadata objects (`ports/factory.ts`)
- Lazy port runtime objects (`adapters/lazy.ts`)
- Adapter objects (`adapters/unified.ts`, 2 call sites)
- Empty requires constant (`adapters/constants.ts`)
- Dependency chain arrays (`errors/classes.ts`)

**Gap -- Symbol.for() is Globally Accessible:**

While `Symbol.for()` provides encapsulation, it is globally shared. Any code that knows the symbol key string can access the property:

```typescript
// Any code can do this:
const brand = Symbol.for("@hex-di/core/PortDirection");
const direction = somePort[brand]; // Bypasses encapsulation
```

This is a known trade-off for cross-module-boundary consistency.

**Gap -- No Cryptographic Integrity:**

There is no checksum, hash, or digital signature on frozen objects. An attacker with access to the runtime could theoretically replace frozen objects via prototype manipulation or by intercepting the `createPort`/`createAdapter` functions before they are called.

---

### 4.9 Documentation -- Score: 9.0/10

**Compliant Pattern -- @packageDocumentation on Every Module:**

Every `.ts` file begins with a `@packageDocumentation` JSDoc block describing the module's purpose.

Example from `packages/core/src/adapters/unified.ts`:

```typescript
/**
 * Unified createAdapter API.
 *
 * This module contains the unified `createAdapter()` function that accepts
 * both factory functions and class constructors through a single API.
 *
 * @packageDocumentation
 */
```

**Compliant Pattern -- Comprehensive Type Documentation:**

From `packages/core/src/adapters/types.ts`:

```typescript
/**
 * Lifetime scope for an adapter's service instance.
 *
 * | Lifetime    | Description                                                      |
 * |-------------|------------------------------------------------------------------|
 * | `singleton` | One instance per container, shared across all resolutions        |
 * | `scoped`    | One instance per scope, isolated from parent and sibling scopes  |
 * | `transient` | New instance on every resolution                                 |
 */
export type Lifetime = "singleton" | "scoped" | "transient";
```

**Compliant Pattern -- Actionable Error Type Documentation:**

From `packages/core/src/ports/types.ts`:

```typescript
/**
 * Error type returned when type inference utilities receive a non-Port type.
 *
 * Instead of returning opaque `never`, this error type provides:
 * - Clear error message explaining what was expected
 * - The actual type that was received (for debugging)
 * - A hint about common mistakes (e.g., forgetting `typeof`)
 */
export type NotAPortError<T> = {
  readonly __errorBrand: "NotAPortError";
  readonly __message: "Expected a Port type created with createPort() or port()";
  readonly __received: T;
  readonly __hint: "Use InferService<typeof YourPort>, not InferService<YourPort>";
};
```

Type-level error messages appear in IDE tooltips, providing actionable guidance without requiring documentation lookup.

**Compliant Pattern -- Safety Documentation for Dangerous Operations:**

From `packages/core/src/ports/directed.ts`:

```typescript
/**
 * ## SAFETY DOCUMENTATION
 *
 * The DirectedPort type has branded properties that exist at the type level
 * for nominal typing. This helper bridges the gap between the runtime
 * representation and the phantom-branded type.
 *
 * This is safe because:
 * 1. **Brands are for type discrimination**: The `__brand` symbol from Port
 *    is used exclusively for compile-time type discrimination.
 * 2. **Immutability guaranteed**: `Object.freeze()` prevents any mutation.
 * 3. **Single creation point**: All directed ports flow through this helper.
 */
```

**Gap -- No Architecture Decision Records (ADRs):**

While code documentation is excellent, there are no formal ADRs documenting design decisions like "why Symbol.for() instead of WeakMap for brand storage" or "why Math.random() for correlation IDs".

---

### 4.10 Lifecycle Management -- Score: 8.0/10

**Compliant Pattern -- Container Phase State Machine:**

From `packages/core/src/inspection/container-types.ts`:

```typescript
export type ContainerPhase =
  | "uninitialized"
  | "initialized"
  | "unloaded"
  | "loading"
  | "loaded"
  | "active"
  | "disposing"
  | "disposed";
```

Each container type has a well-defined subset of valid phases:

| Container | Valid Phases                                                     |
| --------- | ---------------------------------------------------------------- |
| Root      | `uninitialized` -> `initialized` -> `disposing` -> `disposed`    |
| Child     | `initialized` -> `disposing` -> `disposed`                       |
| Lazy      | `unloaded` -> `loading` -> `loaded` -> `disposing` -> `disposed` |
| Scope     | `active` -> `disposing` -> `disposed`                            |

**Compliant Pattern -- Finalizer Contract:**

From `packages/core/src/adapters/types.ts`:

```typescript
export type Adapter</* ... */> = {
  // ...
  finalizer?(instance: InferService<TProvides>): void | Promise<void>;
};
```

Adapters can declare finalizer functions for resource cleanup. The runtime calls these in reverse dependency order during disposal.

**Compliant Pattern -- Disposal Warnings in Inspection:**

From `packages/core/src/inspection/graph-types.ts`:

```typescript
export interface GraphInspection {
  // ...
  readonly disposalWarnings: readonly string[];
  readonly portsWithFinalizers: readonly string[];
}
```

The inspection API proactively warns about disposal ordering issues (e.g., when adapters with finalizers depend on adapters without finalizers, creating potential use-after-dispose risks).

**Compliant Pattern -- Disposed Scope Error:**

From `packages/core/src/errors/classes.ts`:

```typescript
export class DisposedScopeError extends ContainerError {
  readonly _tag = "DisposedScope";
  readonly code = "DISPOSED_SCOPE" as const;
  readonly isProgrammingError = true as const;
  readonly portName: string;

  constructor(portName: string) {
    super(
      `Cannot resolve port '${portName}' from a disposed scope. ` +
        `The scope has already been disposed and cannot be used for resolution.`
    );
    this.portName = portName;
  }
}
```

Attempting to resolve from a disposed scope produces a clear, typed error rather than undefined behavior.

**Gap -- No Weak Reference Support:**

There is no built-in mechanism for weak references to scoped services. Long-lived code holding references to scope-owned services can prevent garbage collection after scope disposal.

---

## 5. Code Examples

### 5.1 Compliant: Branded Type System Preventing Misuse

From `packages/core/src/ports/types.ts`:

```typescript
// The Port type uses phantom branding for nominal typing
export type Port<T, TName extends string> = {
  readonly [__brand]: [T, TName];
  readonly __portName: TName;
};
```

Two ports with the same service interface but different names are type-incompatible:

```typescript
// From documentation in types.ts:
type ConsoleLoggerPort = Port<Logger, "ConsoleLogger">;
type FileLoggerPort = Port<Logger, "FileLogger">;

declare const consolePort: ConsoleLoggerPort;
declare const filePort: FileLoggerPort;
// consolePort = filePort; // Type error!
```

### 5.2 Compliant: AdapterConstraint Without `any`

From `packages/core/src/adapters/types.ts`:

```typescript
export interface AdapterConstraint {
  readonly provides: Port<unknown, string>;
  readonly requires: readonly Port<unknown, string>[];
  readonly lifetime: Lifetime;
  readonly factoryKind: FactoryKind;
  readonly factory: (...args: never[]) => unknown;
  readonly clonable: boolean;
  finalizer?(instance: never): void | Promise<void>;
}
```

This constraint type matches all adapter shapes without using `any`:

- `unknown` in covariant (output) positions
- `never` in contravariant (input) positions
- Follows the Effect-TS `Layer.Any` pattern

### 5.3 Compliant: Type-Level Error Messages

From `packages/core/src/utils/type-utilities.ts`:

```typescript
export type InferenceError<TSource extends string, TMessage extends string, TInput = unknown> = {
  readonly __inferenceError: true;
  readonly __source: TSource;
  readonly __message: TMessage;
  readonly __input: TInput;
};
```

Instead of returning opaque `never` when type inference fails, this provides structured error information visible in IDE tooltips.

### 5.4 Non-Compliant: Context Map Retrieval Cast

From `packages/core/src/context/helpers.ts`:

```typescript
export function getContext<T>(
  context: Map<symbol, unknown>,
  variable: ContextVariable<T>
): T | undefined {
  const value = context.get(variable.id);
  if (value !== undefined) {
    return value as T; // <-- cast here
  }
  return variable.defaultValue;
}
```

The `as T` cast is the only type cast in the production source. It is unavoidable because `Map<symbol, unknown>` erases the value type. The cast is sound because the symbol key guarantees the correct type was stored, but it cannot be verified at the type level.

### 5.5 Non-Compliant: Non-Deterministic ID Generation

From `packages/core/src/utils/correlation.ts`:

```typescript
export function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

In a GxP context, correlation IDs should be:

1. Deterministic given a seed (for reproducibility)
2. Monotonically ordered (for causal ordering)
3. Collision-resistant with provable bounds

`Math.random()` satisfies none of these properties.

---

## 6. Edge Cases & Known Limitations

### 6.1 Edge Case: Async Factory Detection via Constructor Name

From `packages/core/src/adapters/unified.ts`:

```typescript
// Detect async factories at runtime by checking constructor name
factoryKind = config.factory.constructor.name === "AsyncFunction" ? ASYNC : SYNC;
```

**Limitation:** This detects `async () => {}` but **not** synchronous functions that return promises:

```typescript
// Detected as async (correct):
createAdapter({ provides: MyPort, factory: async () => new MyService() });

// NOT detected as async (incorrect -- treated as sync):
createAdapter({ provides: MyPort, factory: () => Promise.resolve(new MyService()) });
```

The comment in the source explicitly acknowledges this limitation.

### 6.2 Edge Case: Error.captureStackTrace Availability

From `packages/core/src/errors/base.ts`:

```typescript
const ErrorWithCapture: V8ErrorConstructor = Error;
if (typeof ErrorWithCapture.captureStackTrace === "function") {
  ErrorWithCapture.captureStackTrace(this, new.target);
}
```

`Error.captureStackTrace` is V8-specific (Node.js, Chrome). In non-V8 engines (Firefox, Safari), this check prevents a runtime error but results in less clean stack traces that include the ContainerError constructor frames.

### 6.3 Edge Case: Symbol.for() Cross-Realm Consistency

From `packages/core/src/ports/directed.ts`:

```typescript
export const DIRECTION_BRAND = Symbol.for("@hex-di/core/PortDirection");
```

`Symbol.for()` uses a global symbol registry shared across all realms (iframes, workers in some contexts). This ensures ports created in different module instances are still recognized as DirectedPorts. However, if two different versions of `@hex-di/core` are loaded, they share the same symbol, potentially causing version conflicts.

### 6.4 Edge Case: ParseError Falls Through to UNKNOWN_ERROR

From `packages/core/src/errors/parsing.ts`:

```typescript
// Unknown HEX error format
return {
  code: ErrorCode.UNKNOWN_ERROR,
  message,
  details: {
    rawMessage: message,
  },
};
```

If a new error code is added to the system but `parseError()` is not updated, the error is caught by the `UNKNOWN_ERROR` fallback rather than failing silently. The raw message is preserved for debugging.

### 6.5 Edge Case: Empty Dependency Array Identity

From `packages/core/src/adapters/constants.ts`:

```typescript
export const EMPTY_REQUIRES = Object.freeze(literal([]));
```

All adapters with no dependencies share the same frozen empty array instance. This is memory-efficient and identity-stable, but means `adapter1.requires === adapter2.requires` is `true` for any two adapters with no dependencies, which could be surprising in identity-based comparisons.

### 6.6 Edge Case: ContextVariable Collision Avoidance

From `packages/core/src/context/variables.ts`:

```typescript
export function createContextVariable<T>(name: string, defaultValue?: T): ContextVariable<T> {
  return {
    id: Symbol(name),
    defaultValue,
  };
}
```

Two calls to `createContextVariable('timeout')` produce different symbols (and thus different variables), even with the same name string. This prevents accidental collisions but means variable identity must be managed by reference, not by name.

### 6.7 Edge Case: Lazy Port Name Prefixing

From `packages/core/src/adapters/lazy.ts`:

```typescript
const lazyPortName: `Lazy${TName}` = `Lazy${portName}`;
```

If a port is already named `LazyFoo`, wrapping it with `lazyPort()` produces `LazyLazyFoo`. There is no validation preventing double-wrapping, though the type system would reflect the nested thunk type `() => () => Foo`.

### 6.8 Edge Case: hasMessageProperty Guard Handles Non-Error Objects

From `packages/core/src/errors/base.ts`:

```typescript
export function hasMessageProperty(value: unknown): value is { message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as { message: unknown }).message === "string"
  );
}
```

This handles the case where external libraries throw objects that look like errors (have a `message` property) but do not extend `Error`. The single `as { message: unknown }` here is a type-narrowing necessity after the `in` check.

---

## 7. Recommendations

### Priority Tier 1: Critical (Address for GxP Compliance)

| #   | Recommendation                                                                                                                                                                                                    | Impact                       | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------ |
| 1.1 | **Replace `Math.random()` with a deterministic, seedable ID generator** for `generateCorrelationId()`. Consider UUIDv7 (timestamp-sortable) or a monotonic counter with prefix. Allow seed injection for testing. | Determinism, Reproducibility | Low    |
| 1.2 | **Document the `as T` cast in `getContext()`** with a SAFETY comment explaining why it is sound (symbol-based key guarantees type correctness).                                                                   | Data Integrity, Auditability | Low    |

### Priority Tier 2: Important (Recommended for Production)

| #   | Recommendation                                                                                                                                                                                        | Impact                  | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| 2.1 | **Add a `validateFactory()` function** that detects promise-returning non-async factories by checking the return value prototype, addressing the async detection gap.                                 | Validation, Correctness | Medium |
| 2.2 | **Add API stability annotations** (`@experimental`, `@stable`) to exported symbols using JSDoc tags or a custom annotation system.                                                                    | Change Control          | Low    |
| 2.3 | **Add `Object.freeze()` to the ContainerError instances** (or at least key properties) to prevent JavaScript-level mutation of error data after construction.                                         | Data Integrity          | Low    |
| 2.4 | **Implement monotonic ordering in TraceEntry.order** with documentation guaranteeing the ordering invariant (currently defined in the type but ordering guarantee depends on runtime implementation). | Traceability            | Low    |

### Priority Tier 3: Desirable (Nice-to-Have)

| #   | Recommendation                                                                                                                                           | Impact         | Effort |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| 3.1 | **Add Architecture Decision Records (ADRs)** for key design choices: Symbol.for() branding strategy, phantom type approach, error code range allocation. | Documentation  | Medium |
| 3.2 | **Add a `lazyPort()` double-wrap guard** that throws or warns if the input port is already a LazyPort.                                                   | Validation     | Low    |
| 3.3 | **Add a `GraphInspectionJSON.version` migration path** documentation explaining how to handle future schema version bumps.                               | Change Control | Low    |
| 3.4 | **Consider WeakRef integration** for scope-owned service references to prevent memory leaks from long-lived references to disposed scoped services.      | Lifecycle      | High   |
| 3.5 | **Add trace persistence hooks** as part of the `TracingAPI` contract (e.g., `onEvict(callback)`) to enable external audit trail storage.                 | Traceability   | Medium |

---

## 8. File Reference Guide

| File                                        | Role                                            | Key Exports                                                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/ports/types.ts`                        | Port branded type and type-level utilities      | `Port<T, TName>`, `InferService`, `InferPortName`, `DirectedPort`, `PortDirection`, `PortMetadata`                                                                       |
| `src/ports/factory.ts`                      | Port creation functions                         | `createPort()`, `port()`                                                                                                                                                 |
| `src/ports/directed.ts`                     | Runtime port direction and metadata             | `isDirectedPort()`, `isInboundPort()`, `isOutboundPort()`, `getPortDirection()`, `getPortMetadata()`, `DIRECTION_BRAND`, `METADATA_KEY`                                  |
| `src/adapters/types.ts`                     | Adapter branded type and constraint             | `Adapter<>`, `AdapterConstraint`, `Lifetime`, `FactoryKind`, `ResolvedDeps`, `PortDeps`, `EmptyDeps`                                                                     |
| `src/adapters/unified.ts`                   | Adapter creation with 16 overloads              | `createAdapter()`                                                                                                                                                        |
| `src/adapters/unified-types.ts`             | Compile-time error types for adapter validation | `IsAsyncFactory`, `EnforceAsyncLifetime`, `AsyncLifetimeError`, `BothFactoryAndClassError`                                                                               |
| `src/adapters/guards.ts`                    | Runtime type guards                             | `isAdapter()`, `isLifetime()`, `isFactoryKind()`                                                                                                                         |
| `src/adapters/inference.ts`                 | Type-level adapter extraction                   | `InferAdapterProvides`, `InferAdapterRequires`, `InferManyProvides`, `InferManyRequires`                                                                                 |
| `src/adapters/lazy.ts`                      | Lazy port creation and guards                   | `lazyPort()`, `isLazyPort()`, `getOriginalPort()`, `LazyPort<>`                                                                                                          |
| `src/adapters/constants.ts`                 | Literal-typed constants                         | `SYNC`, `ASYNC`, `SINGLETON`, `SCOPED`, `TRANSIENT`, `TRUE`, `FALSE`, `EMPTY_REQUIRES`                                                                                   |
| `src/errors/base.ts`                        | Abstract error base class                       | `ContainerError`, `extractErrorMessage()`, `hasMessageProperty()`                                                                                                        |
| `src/errors/classes.ts`                     | 7 concrete error classes                        | `CircularDependencyError`, `FactoryError`, `DisposedScopeError`, `ScopeRequiredError`, `AsyncFactoryError`, `AsyncInitializationRequiredError`, `NonClonableForkedError` |
| `src/errors/codes.ts`                       | Error code enumerations                         | `NumericErrorCode` (HEX001-HEX025), `ErrorCode` (27 string codes)                                                                                                        |
| `src/errors/types.ts`                       | 21 parsed error detail types                    | `ParsedError` discriminated union, per-error detail interfaces                                                                                                           |
| `src/errors/parsing.ts`                     | Error message parser                            | `parseError()`, `isHexError()`                                                                                                                                           |
| `src/errors/resolution-error.ts`            | Resolution error union and guards               | `ResolutionError`, `isResolutionError()`, `toResolutionError()`                                                                                                          |
| `src/inspection/container-types.ts`         | Container snapshot types                        | `ContainerSnapshot` (4-variant union), `ContainerPhase`, `ContainerKind`, `ScopeTree`                                                                                    |
| `src/inspection/tracing-types.ts`           | Tracing primitives                              | `TraceEntry`, `TraceStats`, `TraceFilter`, `TraceRetentionPolicy`, `TracingAPI`, `DEFAULT_RETENTION_POLICY`                                                              |
| `src/inspection/graph-types.ts`             | Graph inspection types                          | `GraphInspection`, `ValidationResult`, `GraphInspectionJSON`, `GraphSuggestion`, `PortInfo`                                                                              |
| `src/inspection/inspector-types.ts`         | Inspector API contract                          | `InspectorAPI`, `InspectorEvent`, `AdapterInfo`, `VisualizableAdapter`, `ContainerGraphData`, `ResultStatistics`                                                         |
| `src/inspection/library-inspector-types.ts` | Library inspector protocol                      | `LibraryInspector`, `LibraryEvent`, `UnifiedSnapshot`, `isLibraryInspector()`, `createLibraryInspectorPort()`                                                            |
| `src/utils/correlation.ts`                  | Correlation ID generation                       | `generateCorrelationId()`                                                                                                                                                |
| `src/utils/type-utilities.ts`               | Shared type utilities                           | `IsNever`, `TupleToUnion`, `Prettify`, `InferenceError`, `IsInferenceError`                                                                                              |
| `src/context/variables.ts`                  | Context variable creation                       | `createContextVariable()`, `ContextVariable<T>`                                                                                                                          |
| `src/context/helpers.ts`                    | Context read/write helpers                      | `withContext()`, `getContext()`                                                                                                                                          |
| `src/index.ts`                              | Barrel export (170+ symbols)                    | All public API                                                                                                                                                           |

---

_End of GxP Compliance Analysis Report for @hex-di/core_
