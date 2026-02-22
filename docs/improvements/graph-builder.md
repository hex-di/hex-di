# GraphBuilder API Improvements Spec

## Overview

This spec defines improvements to the GraphBuilder API to reduce method count, improve type safety, and fix soundness gaps.

---

## API Changes

### Methods to Remove

| Method                | Reason                       | Replacement               |
| --------------------- | ---------------------------- | ------------------------- |
| `provideAsync()`      | Auto-detect from return type | `provide()` detects async |
| `provideFirstError()` | Rarely used, worse DX        | `provide()` (all errors)  |
| `provideUnchecked()`  | Escape hatch not needed      | Remove entirely           |
| `mergeWith()`         | Always use max depth         | `merge()` (no options)    |

### Methods to Rename

| Before                      | After                 | Reason                                                               |
| --------------------------- | --------------------- | -------------------------------------------------------------------- |
| `withUnsafeDepthOverride()` | `withExtendedDepth()` | "Unsafe" causes hesitation; "extended" accurately describes behavior |

### Final API (12 methods)

```typescript
// Factory (4)
GraphBuilder.create();
GraphBuilder.withMaxDepth<N>();
GraphBuilder.withExtendedDepth();
GraphBuilder.forParent(parentGraph)

  // Provide (3)
  .provide(adapter) // Auto-detects async via type-level Promise detection
  .provideMany(adapters) // Batch registration
  .override(adapter) // Override parent's adapter (with lifetime validation)

  // Merge (1)
  .merge(other) // Always uses max(A.maxDepth, B.maxDepth)

  // Inspection (2)
  .inspect() // Full analysis, or summary with { summary: true }
  .validate() // Pass/fail with errors

  // Build (2)
  .build() // Root graphs (all deps required)
  .buildFragment(); // Child graphs (missing deps allowed)
```

---

## New Features

### 1. Type-Level Async Detection

Auto-detect async adapters by inspecting factory return type:

```typescript
type IsAsyncFactory<TFactory> = TFactory extends (...args: any[]) => infer TReturn
  ? [TReturn] extends [Promise<any>]
    ? true
    : Promise<any> extends TReturn
      ? "partial" // Union includes Promise - treat as async
      : false
  : false;
```

**Coverage:**

- `async () => new Service()` - Detected
- `async (deps) => await init()` - Detected
- `() => Promise.resolve(x)` - Detected
- `() => fetchData()` - Detected (if typed as returning Promise)

### 2. Override Lifetime Validation (HEX022)

Overrides must use the same lifetime as the parent adapter:

```typescript
type OverrideResult<TAdapter, TParentGraph, TCurrentOverrides> =
  InferProvides<TAdapter> extends keyof TParentGraph['_lifetimeMap']
    ? TAdapter['lifetime'] extends TParentGraph['_lifetimeMap'][InferProvides<TAdapter>]
      ? GraphBuilder<..., TCurrentOverrides | InferProvides<TAdapter>, ...>
      : OverrideLifetimeError<...>
    : OverridePortNotFoundError<...>;
```

**Validation Matrix:**

| Parent Lifetime | Override Lifetime | Result        |
| --------------- | ----------------- | ------------- |
| singleton       | singleton         | OK            |
| singleton       | scoped            | ERROR[HEX022] |
| singleton       | transient         | ERROR[HEX022] |
| scoped          | singleton         | ERROR[HEX022] |
| scoped          | scoped            | OK            |
| scoped          | transient         | ERROR[HEX022] |
| transient       | singleton         | ERROR[HEX022] |
| transient       | scoped            | ERROR[HEX022] |
| transient       | transient         | OK            |

### 3. Bidirectional Captive Validation

Track pending constraints for forward references to catch captive violations regardless of registration order.

**Flow:**

1. `provide(SingletonAdapter)` where `SingletonAdapter` requires `ScopedPort` (not yet registered)
   - Creates `PendingCaptiveConstraint<'SingletonPort', 'singleton', 'ScopedPort'>`

2. `provide(ScopedAdapter)` where `ScopedAdapter` provides `ScopedPort`
   - Validates pending constraints against `ScopedPort`
   - `'scoped'` not assignable to `'singleton'` → ERROR[HEX003]

**Type Definitions:**

```typescript
type PendingCaptiveConstraint<
  TDependentPort extends string,
  TDependentLifetime extends Lifetime,
  TRequiredPort extends string,
> = {
  readonly dependentPort: TDependentPort;
  readonly dependentLifetime: TDependentLifetime;
  readonly requiredPort: TRequiredPort;
};

type LifetimeRank = {
  singleton: "singleton";
  scoped: "singleton" | "scoped";
  transient: "singleton" | "scoped" | "transient";
};
```

### 4. Disposal Lifecycle

Add disposal/cleanup semantics for services.

```typescript
interface DisposableAdapter<T> extends Adapter<T, any, any, any, any> {
  dispose?: (instance: T) => void | Promise<void>;
}
```

**Requirements:**

- Disposal order guarantees (reverse of creation order)
- Async disposal support
- Scope disposal triggering service cleanup

**Container API:**

```typescript
// Dispose all services in a container
await container.dispose();

// Dispose a specific scope
await scope.dispose();
```

### 5. Inspection Summary Mode

```typescript
interface InspectOptions {
  summary?: boolean; // Default: false (full inspection)
}

builder.inspect(); // Full analysis (15+ fields)
builder.inspect({ summary: true }); // Quick check (7 fields)
```

**GraphSummary Interface:**

```typescript
interface GraphSummary {
  readonly adapterCount: number;
  readonly asyncAdapterCount: number;
  readonly isComplete: boolean;
  readonly missingPorts: readonly string[];
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly provides: readonly string[];
}
```

---

## Critical Bug Fixes (Completed)

### Bug 1: Forward Reference Validation Gap ✓

**Problem:** `build()` only ran runtime captive validation when `depthLimitExceeded` was true, allowing forward reference captive violations to slip through.

**Location:** `packages/graph/src/builder/builder-build.ts:53-80`

**Fix:** Run captive validation unconditionally at build time:

```typescript
export function validateBuildable(buildable: BuildableGraph): void {
  const inspection = inspectGraph(buildable);

  // Cycle detection only when depth limit exceeded (type system handles normal cases)
  if (inspection.depthLimitExceeded) {
    const cycle = detectCycleAtRuntime(buildable.adapters);
    if (cycle) {
      throw new Error(formatCycleError(cycle));
    }
  }

  // ALWAYS check captive dependencies as defense-in-depth
  // This catches forward reference scenarios that bypass compile-time validation
  const captive = detectCaptiveAtRuntime(buildable.adapters);
  if (captive) {
    throw new Error(
      formatCaptiveError(
        captive.dependentPort,
        captive.dependentLifetime,
        captive.captivePort,
        captive.captiveLifetime
      )
    );
  }
}
```

### Bug 2: parentProvides Not Merged ✓

**Problem:** When merging child builders from different parents, only the first child's `parentProvides` was preserved, breaking override capability for the second parent's ports.

**Location:** `packages/graph/src/builder/types/state.ts:576-617`

**Fix:** Use `MergeParentProvides` type to properly combine parent ports:

```typescript
// Merge parent provides with unknown filtering
export type MergeParentProvides<T1, T2> =
  IsExactlyUnknown<T1> extends true
    ? T2  // Use T2 if T1 is unknown (no parent)
    : IsExactlyUnknown<T2> extends true
      ? T1  // Use T1 if T2 is unknown (no parent)
      : T1 | T2;  // Both specific, union them

// Applied in UnifiedMergeInternals
export type UnifiedMergeInternals<T1, T2, ...> = BuilderInternals<
  TMergedDepGraph,
  TMergedLifetimeMap,
  MergeParentProvides<GetParentProvides<T1>, GetParentProvides<T2>>,  // ← Fix
  TResolvedMaxDepth,
  ...
>;
```

### Bug 3: UnsafeDepthOverride Not Preserved ✓

**Problem:** Only the first graph's `UnsafeDepthOverride` flag was preserved during merge, silently discarding the second graph's opt-in.

**Location:** `packages/graph/src/builder/types/state.ts:614`

**Fix:** Use `BoolOr` to preserve the flag from either graph:

```typescript
// Boolean OR helper
export type BoolOr<A extends boolean, B extends boolean> =
  A extends true ? true : B extends true ? true : false;

// Applied in UnifiedMergeInternals
export type UnifiedMergeInternals<T1, T2, ...> = BuilderInternals<
  TMergedDepGraph,
  TMergedLifetimeMap,
  MergeParentProvides<GetParentProvides<T1>, GetParentProvides<T2>>,
  TResolvedMaxDepth,
  BoolOr<GetUnsafeDepthOverride<T1>, GetUnsafeDepthOverride<T2>>,  // ← Fix
  GetDepthExceededWarning<T1> | GetDepthExceededWarning<T2>,
  BoolOr<GetUncheckedUsed<T1>, GetUncheckedUsed<T2>>
>;
```

---

## Validation Pipeline

### Phase 1: Structural Validation (Sequential)

```
1. Duplicate Check       O(1)   → HEX001
2. Self-Dependency       O(1)   → HEX006
3. Cycle Detection       O(d)   → HEX002
```

### Phase 2: Lifetime Validation (Two-Pass)

```
Pass 1: Collect all adapters and dependencies
Pass 2: Validate complete graph (captive, lifetime constraints)
```

---

## Error Codes

| Code   | Error                           |
| ------ | ------------------------------- |
| HEX001 | Duplicate adapter               |
| HEX002 | Circular dependency             |
| HEX003 | Captive dependency              |
| HEX004 | Reverse captive                 |
| HEX005 | Lifetime inconsistency on merge |
| HEX006 | Self-dependency                 |
| HEX007 | Depth limit exceeded            |
| HEX008 | Missing dependency              |
| HEX009 | Override without parent         |
| HEX021 | Override type mismatch          |
| HEX022 | Override lifetime mismatch      |

---

## Breaking Changes

1. ✓ Remove `provideAsync()` - use `provide()` (auto-detects)
2. ✓ Remove `provideFirstError()` - use `provide()` (all-errors)
3. ✓ Remove `provideUnchecked()` - removed entirely
4. ✓ Remove `mergeWith()` - use `merge()` (always max depth)
5. ✓ Rename `withUnsafeDepthOverride()` → `withExtendedDepth()`
6. [ ] Add `override()` lifetime validation (HEX022)
7. [ ] Add bidirectional captive validation

---

## Implementation Checklist

### Phase 1: Critical Bug Fixes ✓

- [x] Fix forward reference validation gap (always run runtime captive check)
- [x] Fix `parentProvides` merge bug (preserve both parents)
- [x] Fix `UnsafeDepthOverride` merge (OR both flags)

### Phase 2: Method Removal ✓

- [x] Remove `provideAsync()` — `provide()` auto-detects async factories
- [x] Remove `provideFirstError()`
- [x] Remove `provideUnchecked()`
- [x] Remove `mergeWith()` — replaced by `merge()` (always max depth)
- [x] Rename `withUnsafeDepthOverride()` → `withExtendedDepth()`

### Phase 3: Type-Level Async Detection

- [ ] Implement `IsAsyncFactory<TFactory>` type
- [ ] Handle union return types (treat as async)
- [ ] Update `provide()` to use type-level Promise detection
- [ ] Update tests

### Phase 4: Override Lifetime Validation

- [ ] Add lifetime check to `override()` type
- [ ] Implement `OverrideLifetimeError` message type
- [ ] Expose parent's lifetime map via `GetPortLifetime` accessor
- [ ] Add tests for all lifetime combinations

### Phase 5: Bidirectional Captive Validation

- [ ] Implement `PendingCaptiveConstraint` type
- [ ] Add constraint creation for forward references
- [ ] Add constraint validation when ports are provided
- [ ] Implement constraint cleanup on satisfaction
- [ ] Add constraint propagation for transitive dependencies

### Phase 6: Inspection Improvements

- [ ] Add `summary` option to `inspect()`
- [ ] Implement `GraphSummary` interface
- [ ] Add `depthLimitExceeded` and `depthValidation` fields

### Phase 7: Disposal Lifecycle

- [ ] Add optional `dispose` function to adapter interface
- [ ] Track creation order in container
- [ ] Implement `container.dispose()` with reverse-order cleanup
- [ ] Implement `scope.dispose()` for scoped services
- [ ] Support async disposal (`Promise<void>`)
- [ ] Add tests for disposal order guarantees

### Phase 8: Documentation

- [ ] Update API documentation
- [ ] Add migration guide for breaking changes
- [ ] Add JSDoc examples for `build()` vs `buildFragment()`

---

## Usage Example

### Before (old API)

```typescript
// provideAsync() no longer exists — removed in Phase 2
const graph = GraphBuilder.create()
  .provide(ConfigAdapter)
  .provide(LoggerAdapter)
  .provideAsync(DatabaseAdapter) // old: had to know it's async
  .provideAsync(CacheAdapter)    // old: had to know it's async
  .provide(UserServiceAdapter)
  .build();
```

### After (current API)

```typescript
// provide() auto-detects async from factory return type
const graph = GraphBuilder.create()
  .provide(ConfigAdapter)
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter) // auto-detected as async
  .provide(CacheAdapter)    // auto-detected as async
  .provide(UserServiceAdapter)
  .build();
```
