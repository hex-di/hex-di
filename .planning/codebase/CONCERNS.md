# Codebase Concerns

**Analysis Date:** 2026-02-01

## Known Bugs

### Forward Reference Validation Gap in build()

**Issue:** Runtime captive dependency detection only executes when `inspection.depthLimitExceeded` is true, not unconditionally.

**Files:** `packages/graph/tests/forward-ref-validation-gap.test.ts` (lines 1-95), `packages/graph/src/builder/builder-build.ts`

**Symptoms:** When bypassing the type system (via testing utilities or runtime construction), captive dependencies can slip through to runtime without detection.

**Trigger:** Call `buildGraph()` directly with adapters that form a captive dependency pattern where depthLimitExceeded is false.

**Impact:** High - Defense-in-depth validation is incomplete. A singleton depending on a scoped service would not be caught at runtime if type checking is bypassed.

**Fix approach:** Modify `buildGraph()` and `buildGraphFragment()` to always run `detectCaptiveAtRuntime()` as a defense-in-depth check, regardless of `depthLimitExceeded` status.

### parentProvides Not Merged Correctly in GraphBuilder.merge()

**Issue:** When merging two child builders created from different parent graphs using `forParent()`, only the first graph's parentProvides is preserved in the merged result.

**Files:** `packages/graph/tests/merge-parent-provides.test-d.ts` (lines 1-177), `packages/graph/src/builder/types/merge.ts`, `packages/graph/src/builder/types/state.ts`

**Symptoms:**

- Type-level: Cannot override ports from the second parent after merge
- Runtime: overridePortNames IS correctly merged, but type system doesn't reflect this
- Asymmetric behavior: `childA.merge(childB)` ≠ `childB.merge(childA)` for override capability

**Trigger:**

```typescript
const parentA = GraphBuilder.create().provide(LoggerAdapter).build();
const parentB = GraphBuilder.create().provide(DatabaseAdapter).build();
const childA = GraphBuilder.forParent(parentA);
const childB = GraphBuilder.forParent(parentB);
const merged = childA.merge(childB);
merged.override(DatabaseAdapter); // Type error: Database not in parentProvides
```

**Impact:** High - Merging child containers from multiple parent graphs loses type safety for the second parent's ports.

**Fix approach:** Update `UnifiedMergeInternals` type to merge parentProvides from both graphs using union type, not just preserve T1's parentProvides.

### UnsafeDepthOverride Not Preserved in Merge When T2 Has Override

**Issue:** In `UnifiedMergeInternals`, only T1's `UnsafeDepthOverride` flag is preserved during merge. If T2 has `withUnsafeDepthOverride()` enabled but T1 doesn't, the user's explicit opt-in is silently discarded.

**Files:** `packages/graph/tests/merge-unsafe-override-preservation.test-d.ts` (lines 1-134), `packages/graph/src/builder/types/merge.ts`, `packages/graph/src/builder/types/state.ts`

**Symptoms:** Merged graph doesn't have unsafe depth override flag even though one of the component graphs explicitly requested it.

**Trigger:**

```typescript
const graphWithoutOverride = GraphBuilder.create().provide(AdapterA);
const graphWithOverride = GraphBuilder.withUnsafeDepthOverride().create().provide(AdapterB);
const merged = graphWithoutOverride.merge(graphWithOverride);
// merged should have UnsafeDepthOverride = true, but currently it's false
```

**Impact:** Medium - Silently loses user configuration during merge, violating the principle that merge should respect both graphs' settings.

**Fix approach:** Modify merge internals to use OR semantics for UnsafeDepthOverride: `T1.UnsafeDepthOverride | T2.UnsafeDepthOverride` instead of just `T1.UnsafeDepthOverride`.

## Tech Debt

### High Type-Level Complexity in Graph Validation

**Area:** Type-level validation system across multiple files

**Files:**

- `packages/graph/src/builder/types/provide.ts` (1,250 lines)
- `packages/graph/src/validation/types/error-parsing.ts` (991 lines)
- `packages/graph/src/builder/types/merge.ts` (810 lines)
- `packages/graph/src/builder/types/state.ts` (extensive generic constraints)

**Problem:** The type-state machine for compile-time validation has reached high complexity:

- Multiple cascading generic parameters (TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, TOverrides, etc.)
- Deep type recursion for cycle/captive detection
- Type complexity scoring system already warns when graphs exceed recommended thresholds

**Impact:**

- Slower TypeScript compilation times on large projects
- Difficult to extend or modify validation logic
- Type error messages can be cryptic when validation fails
- IDE responsiveness decreases with large graphs

**Scaling limits:**

- `typeComplexityScore` > 100 triggers "monitor" recommendation
- No hard limit enforced, but diminishing returns beyond ~200 ports
- Performance degrades quadratically with graph size for type checking

**Improvement path:**

1. Consider splitting extremely large graphs into multiple smaller sub-graphs merged at runtime
2. Implement progressive validation: defer some checks to runtime in development mode
3. Add type caching/memoization for frequently validated subgraphs
4. Document performance budget and when to split graphs

### Large Test Files for Complex Type Checking

**Area:** Type-level test suites

**Files:**

- `packages/graph/tests/edge-cases-extended.test.ts` (748 lines)
- `packages/graph/tests/property-based/builder-invariants.test.ts` (extensive property-based tests)
- `packages/graph/tests/provide-many-all-errors.test-d.ts` (tests all error combinations)

**Problem:** Type-level tests are extremely comprehensive due to the need to verify all error paths and edge cases at the type level.

**Impact:**

- Tests are slow to run (type checking is slower than runtime testing)
- High maintenance burden when modifying validation logic
- Difficult to debug type errors in tests

**Scaling limits:** Each new validation dimension multiplies test case count (e.g., adding a new error type requires testing that error in all contexts: single, batch, merge, override, etc.)

**Improvement path:**

- Use property-based testing framework to reduce explicit test case duplication
- Create test helper utilities to reduce boilerplate in type-level tests
- Extract common test patterns into shared test infrastructure

### Extensive Use of `any` in Test Files

**Area:** Test infrastructure and mocking

**Count:** 191 files contain `any` type references (701 total occurrences)

**Justified use cases:**

- Mock adapter factories in tests need flexibility (expected)
- Test utilities for simulating edge cases (expected)

**Areas of concern:**

- Some non-test code may use `any` to work around type constraints
- `any` in validation error parsing could hide type issues

**Impact:** Low to Medium - Test code relaxation is intentional per project rules, but non-test usage should be audited.

**Recommendation:** Run periodic audit for `any` in non-test source code; test files are expected to use `any` for mocking flexibility.

## Performance Bottlenecks

### Type Checking Performance Degradation with Large Graphs

**Problem:** TypeScript compiler type-checking time grows super-linearly with graph size due to recursive validation types.

**Files:**

- `packages/graph/src/builder/types/provide.ts`
- `packages/graph/src/validation/types/cycle/detection.ts`
- `packages/graph/src/validation/types/captive/detection.ts`

**Cause:** Each `.provide()` call triggers multiple nested type computations:

1. Duplicate check (O(1))
2. Cycle check (O(depth), running DFS-like type computation)
3. Captive check (O(requires \* existing adapters))
4. Depth limit check

**Observation:** `computeTypeComplexityScore()` in `packages/graph/src/graph/inspection/complexity.ts` already warns at >100 complexity score, but no runtime enforcement of graph size limits.

**Metrics:**

- 153,688 total lines of TypeScript in packages
- Largest single files: runtime/tests (1,609 lines), provide.ts types (1,250 lines)
- Runtime performance is good, but type-checking performance is concern

**Improvement path:**

1. Add depth-based validation cutoffs with clear guidance
2. Implement lazy validation for very large graphs (validate subsets)
3. Document when to use child containers to partition graphs
4. Consider code generation for validation on first-time setup

### Memory Overhead in MemoMap for Scope Caching

**Area:** Scope resolution and caching

**Files:** `packages/runtime/src/util/memo-map.ts` (2 occurrences of `any`), `packages/runtime/src/scope/impl.ts`

**Problem:** MemoMap stores all scoped instances in memory for the lifetime of the scope without built-in eviction policy.

**Impact:** Long-lived scopes with many resolution requests will accumulate entries. Scope disposal should clean all references, but:

- No maximum size limit on MemoMap
- No eviction policy for unused entries
- Circular reference risk if finalizers aren't called

**Improvement path:**

1. Add optional WeakMap-based caching for scoped services
2. Implement maximum size limits with eviction (LRU)
3. Add metrics to track MemoMap size in production
4. Document scope lifetime best practices

## Fragile Areas

### Graph Builder Type-State Machine State Transitions

**Component:** GraphBuilder implementation

**Files:**

- `packages/graph/src/builder/builder.ts`
- `packages/graph/src/builder/types/state.ts`
- `packages/graph/src/builder/types/provide.ts`
- `packages/graph/src/builder/types/merge.ts`

**Why fragile:**

- Complex phantom type parameters that track state must be kept in sync across multiple files
- A single type definition error propagates through all validation logic
- Merge operations combine state from two graphs - asymmetry bugs hard to catch
- Type union logic for error messages is deeply nested

**Safe modification:**

1. Test any state type changes with full type-level test suite first (`pnpm test:types`)
2. Changes to merge logic require updating both `merge()`, `mergeWith()`, and `mergeMany()` consistently
3. When adding new validation, add corresponding type-level tests before runtime implementation
4. Use `GetUnsafeDepthOverride`, `GetParentProvides` extractors - don't access state fields directly

**Test coverage:** Extensive type-level tests exist in `packages/graph/tests/merge-*.test-d.ts`

### Container Lifecycle and Disposal

**Component:** Container and Scope lifecycle management

**Files:**

- `packages/runtime/src/container/internal/lifecycle-manager.ts`
- `packages/runtime/src/scope/impl.ts`
- `packages/runtime/src/scope/lifecycle-events.ts`

**Why fragile:**

- Order of operations in disposal matters (listeners, cleanup, finalizers)
- Race conditions possible if async resolution happens during disposal
- Child containers must coordinate with parent container for disposal
- LifecycleManager state transitions must be checked before operations

**Safe modification:**

1. All disposal operations should check `DisposalState` before proceeding
2. Don't assume finalizers won't throw - wrap in try-catch
3. Test with concurrent disposal operations (`packages/runtime/tests/concurrent.test.ts`)
4. Child container disposal must notify parent listeners

**Test coverage:** `packages/runtime/tests/disposal.test.ts` (756 lines), `packages/runtime/tests/memory-cleanup.test.ts` (659 lines), `packages/runtime/tests/child-container.test.ts` (1,542 lines)

### Lazy Resolution and Async Initialization Coordination

**Component:** Async container initialization and lazy resolution

**Files:**

- `packages/runtime/src/resolution/async-engine.ts`
- `packages/runtime/src/container/internal/async-initializer.ts`
- `packages/runtime/src/container/lazy-impl.ts`

**Why fragile:**

- `LazyContainer` must defer async resolution until explicit initialization
- Type system enforces that sync resolution is unavailable pre-initialization
- Async ports with sync dependencies create coordination complexity
- Custom async finalizers must complete before container dispose

**Safe modification:**

1. Verify `ContainerPhase` type state before any resolution operation
2. Async finalizers are collected during resolution, not during dispose
3. Don't mix sync and async resolution in hot paths
4. Test async error handling with `packages/runtime/tests/async-resolution.test.ts`

**Test coverage:** `packages/runtime/tests/async-resolution.test.ts` (871 lines), flow package tests (`packages/flow/tests/*.test.ts`)

## Validation Gaps

### Forward Reference Validation Only on Depth Limit Exceeded

**Issue:** See "Forward Reference Validation Gap in build()" under Known Bugs

**Recommendation:** This should be prioritized as a fix since it's a documented defense-in-depth gap.

### Type System Can Be Bypassed with Runtime Construction

**Problem:** Direct calls to `buildGraph()` or manual `BuildableGraph` construction bypass all type-level validation.

**Files:** `packages/graph/src/builder/builder-build.ts`

**Impact:** Low in practice (users shouldn't construct graphs manually), but could hide issues in testing utilities.

**Recommendation:** Document this as internal API; add JSDoc warnings. Consider runtime parameter validation as defense-in-depth.

## Missing Critical Features

### No Maximum Graph Size Enforcement

**Problem:** Large dependency graphs can cause TypeScript compiler slowdown, but there's no warning or limit.

**Current state:** `typeComplexityScore` suggests splitting at >100, but no enforcement.

**Recommendation:** Add clear documentation on graph size limits and provide tooling to detect when limits are approached.

### Limited Debugging Support for Type Errors

**Problem:** When type validation fails, error messages can be cryptic for deeply nested generic types.

**Files:** `packages/graph/src/validation/types/error-messages.ts` (644 lines of error message definitions)

**Recommendation:** Provide a CLI tool to pretty-print type errors and suggest fixes.

## Test Coverage Gaps

### Runtime Validation of Captive Dependencies

**What's not tested:** `detectCaptiveAtRuntime()` function behavior in various edge cases.

**Files:** `packages/graph/src/advanced.ts`, referenced by `packages/graph/tests/forward-ref-validation-gap.test.ts`

**Risk:** Without comprehensive runtime captive detection testing, the defense-in-depth check may have edge case bugs.

**Priority:** High - Should add comprehensive runtime captive detection tests before fixing forward-ref validation gap.

### Error Recovery and Graceful Degradation

**What's not tested:** How the system behaves when error handling itself fails (e.g., finalizer throws, listener throws).

**Files:** `packages/runtime/src/container/internal/lifecycle-manager.ts`

**Risk:** Unhandled exceptions in cleanup paths could leave container in bad state.

**Priority:** Medium - Add tests for error handling during disposal and initialization.

### Child Container Merge Edge Cases

**What's not tested:** Complex scenarios like:

- Merging 3+ child containers from different parents
- Merging with circular parent relationships
- Merging child containers where parents themselves have been merged

**Files:** `packages/graph/tests/merge-parent-provides.test-d.ts` tests 2-graph scenarios only

**Risk:** Untested combinations could reveal bugs in multi-way merge logic.

**Priority:** Medium - Add property-based tests for arbitrary merge combinations.

---

_Concerns audit: 2026-02-01_
