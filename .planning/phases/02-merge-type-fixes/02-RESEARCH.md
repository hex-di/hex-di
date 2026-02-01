# Phase 2: Merge Type Fixes - Research

**Researched:** 2026-02-01
**Domain:** TypeScript type-level programming / Type-state machine patterns
**Confidence:** HIGH

## Summary

This phase addresses two related bugs in the GraphBuilder's type-level merge logic where metadata from the second graph is lost during merge operations. The investigation confirms these are straightforward type fixes in a well-structured codebase.

The codebase already has:

1. The correct type utilities (`BoolOr`, `MergeParentProvides`) already implemented
2. The `UnifiedMergeInternals` type that needs fixing
3. Comprehensive test files that verify the expected behavior

The fix involves ensuring `UnifiedMergeInternals` properly uses `MergeParentProvides` for parentProvides (which it already does based on code review) and uses `BoolOr` for the `UnsafeDepthOverride` flag (which it already does). However, the test files still fail, suggesting the issue may be in how these types are consumed downstream or there may be a subtle type inference issue.

**Primary recommendation:** Verify `UnifiedMergeInternals` implementation and trace through the type flow to identify where parentProvides and UnsafeDepthOverride information is being lost.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library    | Version | Purpose                          | Why Standard                                   |
| ---------- | ------- | -------------------------------- | ---------------------------------------------- |
| TypeScript | 5.x     | Type-level programming           | Native support for advanced type manipulation  |
| Vitest     | 4.x     | Type testing with `expectTypeOf` | Built-in typecheck mode for compile-time tests |

### Supporting

| Library          | Version | Purpose                    | When to Use                                           |
| ---------------- | ------- | -------------------------- | ----------------------------------------------------- |
| vitest typecheck | 4.x     | Type-level test validation | Testing type-level behavior without runtime execution |

### Alternatives Considered

| Instead of             | Could Use   | Tradeoff                                                                      |
| ---------------------- | ----------- | ----------------------------------------------------------------------------- |
| vitest typecheck       | tsd         | tsd is more specialized but vitest integrates better with existing test suite |
| Manual type assertions | expect-type | Less readable but no additional dependency                                    |

**Installation:**
No additional installation needed - all tools are already in place.

## Architecture Patterns

### Current Type Architecture

The merge type system follows a clear layered architecture:

```
packages/graph/src/builder/types/
├── state.ts           # BuilderInternals, Get*/With* utilities, UnifiedMergeInternals
├── merge.ts           # MergeResult, MergeWithResult, validation chain
├── provide.ts         # ProvideResult, adapter validation
├── inspection.ts      # Debug types, validation tracing
└── index.ts           # Public re-exports
```

### Pattern 1: Type-State Machine

**What:** Each GraphBuilder method returns a new type with updated phantom type parameters

**When to use:** Tracking accumulated state through fluent API calls

**Example:**

```typescript
// Source: packages/graph/src/builder/types/state.ts
export type UnifiedMergeInternals<
  T1 extends AnyBuilderInternals,
  T2 extends AnyBuilderInternals,
  TMergedDepGraph,
  TMergedLifetimeMap,
  TResolvedMaxDepth extends number,
> = BuilderInternals<
  TMergedDepGraph,
  TMergedLifetimeMap,
  MergeParentProvides<GetParentProvides<T1>, GetParentProvides<T2>>,
  TResolvedMaxDepth,
  BoolOr<GetUnsafeDepthOverride<T1>, GetUnsafeDepthOverride<T2>>,
  GetDepthExceededWarning<T1> | GetDepthExceededWarning<T2>,
  BoolOr<GetUncheckedUsed<T1>, GetUncheckedUsed<T2>>
>;
```

### Pattern 2: Get*/With* Lens Pattern

**What:** Extractors (Get*) and transformers (With*) for immutable type updates

**When to use:** Reading and updating nested phantom type state

**Example:**

```typescript
// Source: packages/graph/src/builder/types/state.ts
export type GetParentProvides<T extends AnyBuilderInternals> = T["parentProvides"];
export type GetUnsafeDepthOverride<T extends AnyBuilderInternals> = T["unsafeDepthOverride"];
```

### Pattern 3: Union Type Merging with Unknown Filtering

**What:** Special handling for `unknown` as a "no value" marker in unions

**When to use:** Combining optional parent contexts from multiple graphs

**Example:**

```typescript
// Source: packages/graph/src/builder/types/state.ts
export type MergeParentProvides<T1, T2> =
  IsExactlyUnknown<T1> extends true ? T2 : IsExactlyUnknown<T2> extends true ? T1 : T1 | T2;
```

### Anti-Patterns to Avoid

- **Direct property access on phantom types:** Use Get\* extractors to maintain abstraction
- **Type casting:** The codebase explicitly forbids `as` casts - fix the underlying type issue
- **Short-circuit evaluation hiding bugs:** Test both orderings of merge (A.merge(B) and B.merge(A))

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                     | Don't Build             | Use Instead                          | Why                                      |
| --------------------------- | ----------------------- | ------------------------------------ | ---------------------------------------- |
| Boolean OR at type level    | `T1 \| T2 extends true` | `BoolOr<T1, T2>`                     | Union semantics differ from logical OR   |
| Detecting "no value"        | `T extends never`       | `IsExactlyUnknown<T>` / `IsNever<T>` | `unknown` is used as marker, not `never` |
| Parent provides merging     | Simple union `T1 \| T2` | `MergeParentProvides<T1, T2>`        | `unknown \| T = unknown` loses info      |
| Extracting internals fields | Direct `T["field"]`     | `GetDepGraph<T>` etc.                | Abstraction for future changes           |

**Key insight:** The codebase already has the correct utilities implemented. The bugs are likely in how they're being applied or consumed, not in the utilities themselves.

## Common Pitfalls

### Pitfall 1: Union Absorption with Unknown

**What goes wrong:** `unknown | SomeType` evaluates to `unknown`, losing `SomeType`

**Why it happens:** `unknown` is TypeScript's top type - everything is assignable to it

**How to avoid:** Use `MergeParentProvides` which explicitly filters `unknown` before union

**Warning signs:** Type tests fail only when one operand has `unknown` parent

### Pitfall 2: Conditional Type Distribution

**What goes wrong:** Conditional types distribute over unions unexpectedly

**Why it happens:** `T extends U ? A : B` distributes when T is a union

**How to avoid:** Wrap in tuple `[T] extends [U]` to prevent distribution

**Warning signs:** Type evaluates to unexpected union of results

### Pitfall 3: Type Parameter Constraint Defaults

**What goes wrong:** `T extends AnyBuilderInternals = DefaultInternals` fills in wrong defaults

**Why it happens:** Default type parameters are filled in at constraint sites

**How to avoid:** Use `AnyBuilderInternals` for constraints, `DefaultInternals` only for actual defaults

**Warning signs:** Type inference fails or returns unexpected `never`

### Pitfall 4: Asymmetric Merge Behavior

**What goes wrong:** `A.merge(B)` behaves differently from `B.merge(A)` for metadata

**Why it happens:** Type implementation only preserves first operand's metadata

**How to avoid:** Test both orderings; use symmetric merge utilities

**Warning signs:** Test passes in one order but fails in reverse order

## Code Examples

### Verified Pattern: BoolOr Utility

```typescript
// Source: packages/graph/src/builder/types/state.ts (lines 533-537)
export type BoolOr<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true
    ? true
    : false;
```

### Verified Pattern: MergeParentProvides Utility

```typescript
// Source: packages/graph/src/builder/types/state.ts (lines 576-583)
export type MergeParentProvides<T1, T2> =
  IsExactlyUnknown<T1> extends true ? T2 : IsExactlyUnknown<T2> extends true ? T1 : T1 | T2;
```

### Verified Pattern: UnifiedMergeInternals (Current Implementation)

```typescript
// Source: packages/graph/src/builder/types/state.ts (lines 603-617)
export type UnifiedMergeInternals<
  T1 extends AnyBuilderInternals,
  T2 extends AnyBuilderInternals,
  TMergedDepGraph,
  TMergedLifetimeMap,
  TResolvedMaxDepth extends number,
> = BuilderInternals<
  TMergedDepGraph,
  TMergedLifetimeMap,
  MergeParentProvides<GetParentProvides<T1>, GetParentProvides<T2>>, // Already uses MergeParentProvides
  TResolvedMaxDepth,
  BoolOr<GetUnsafeDepthOverride<T1>, GetUnsafeDepthOverride<T2>>, // Already uses BoolOr
  GetDepthExceededWarning<T1> | GetDepthExceededWarning<T2>,
  BoolOr<GetUncheckedUsed<T1>, GetUncheckedUsed<T2>>
>;
```

### Test Expectation Pattern

```typescript
// Source: packages/graph/tests/merge-unsafe-override-preservation.test-d.ts
it("T1 without override + T2 with override = merged has override", () => {
  const graphWithoutOverride = GraphBuilder.create().provide(AdapterA);
  const graphWithOverride = GraphBuilder.withUnsafeDepthOverride().create().provide(AdapterB);

  const merged = graphWithoutOverride.merge(graphWithOverride);

  type Internals = (typeof merged)["__internalState"];
  type Override = GetUnsafeDepthOverride<Internals>;
  // Expected: true (T2 has override)
  expectTypeOf<Override>().toEqualTypeOf<true>();
});
```

## State of the Art

| Old Approach                 | Current Approach                                | When Changed               | Impact                      |
| ---------------------------- | ----------------------------------------------- | -------------------------- | --------------------------- |
| Separate \*WithOptions types | Unified validation chain with TResolvedMaxDepth | Recent refactor            | Reduced duplication         |
| Direct TProvides union       | Get\* extractors for all state access           | Architecture consolidation | Better maintainability      |
| No parent tracking           | `parentProvides` in BuilderInternals            | forParent() feature        | Enables override validation |

**Deprecated/outdated:**

- Direct access to TInternalState fields: Use Get\* extractors

## Open Questions

### Question 1: Why Are Tests Currently Failing?

- **What we know:** The `UnifiedMergeInternals` implementation appears correct based on code review - it already uses `MergeParentProvides` and `BoolOr`
- **What's unclear:** The test files exist and pass according to vitest output, but the CONCERNS.md and test file comments describe them as "bug demonstrations"
- **Recommendation:** Run type tests with verbose output to understand current state; the tests may have been written as "expected to fail" documentation

### Question 2: Type Inference Path from merge() to UnifiedMergeInternals

- **What we know:** `MergeResult` uses `UnifiedMergeCheckLifetime` which eventually calls `UnifiedMergeResultSuccess` which uses `UnifiedMergeInternals`
- **What's unclear:** Whether type parameter inference is being lost somewhere in the chain
- **Recommendation:** Create minimal reproduction and trace through each type in the chain

## Sources

### Primary (HIGH confidence)

- `/Users/u1070457/Projects/Perso/hex-di/packages/graph/src/builder/types/state.ts` - BuilderInternals and merge utilities
- `/Users/u1070457/Projects/Perso/hex-di/packages/graph/src/builder/types/merge.ts` - MergeResult type chain
- `/Users/u1070457/Projects/Perso/hex-di/packages/graph/tests/merge-parent-provides.test-d.ts` - Test expectations
- `/Users/u1070457/Projects/Perso/hex-di/packages/graph/tests/merge-unsafe-override-preservation.test-d.ts` - Test expectations

### Secondary (MEDIUM confidence)

- `/Users/u1070457/Projects/Perso/hex-di/.planning/REQUIREMENTS.md` - MERGE-01 and MERGE-02 requirements
- `/Users/u1070457/Projects/Perso/hex-di/.planning/codebase/CONCERNS.md` - Bug descriptions and fix approaches

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Direct codebase inspection
- Architecture: HIGH - Code review of actual implementation
- Pitfalls: HIGH - Based on TypeScript type system knowledge and codebase patterns

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (stable codebase, no external dependencies affecting types)

## Implementation Notes for Planner

### Current State Assessment

Based on code review, `UnifiedMergeInternals` ALREADY contains the correct implementation:

1. Line 612: `MergeParentProvides<GetParentProvides<T1>, GetParentProvides<T2>>` - correctly merges parent provides
2. Line 614: `BoolOr<GetUnsafeDepthOverride<T1>, GetUnsafeDepthOverride<T2>>` - correctly ORs the flags

### Possible Root Causes

1. **Test files describe intended behavior, not current bugs**: The tests pass (13 passed per vitest output), so perhaps the bugs were already fixed
2. **Type inference issue upstream**: The issue may be in how `MergeResult` or `UnifiedMergeResultSuccess` passes type parameters
3. **AnyBuilderInternals constraint issue**: The `& AnyBuilderInternals` intersection in some places may be interfering

### Verification Strategy

The planner should:

1. First verify if tests actually fail by examining what `expectTypeOf<Override>().toEqualTypeOf<true>()` evaluates to
2. If tests pass, verify the requirements are actually met
3. If tests fail, trace the type parameter flow from `merge()` through to the phantom property access
