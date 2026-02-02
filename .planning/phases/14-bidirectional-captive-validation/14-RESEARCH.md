# Phase 14: Bidirectional Captive Validation - Research

**Researched:** 2026-02-02
**Domain:** TypeScript type-level constraint validation
**Confidence:** MEDIUM

## Summary

Phase 14 aims to detect captive dependency violations regardless of adapter registration order. Currently, forward references (singleton requiring unregistered scoped port) bypass compile-time validation because the required port's lifetime is unknown at registration time.

**Current behavior:**

- Registration order A: Scoped first, Singleton second → ERROR (forward captive detected)
- Registration order B: Singleton first, Scoped second → NO ERROR (forward reference bypasses check)

**Target behavior:**

- Both registration orders → ERROR (bidirectional validation)

**The core challenge:** TypeScript's type system processes types sequentially. When a singleton adapter requires an unregistered scoped port, we cannot validate the lifetime relationship until the scoped port is later registered. This requires tracking "pending constraints" in the builder's type state.

**Primary recommendation:** Implement using pending constraints pattern (TPendingConstraints phantom type parameter), but defer to v4.1 if implementation complexity risks timeline. This is a type-system sophistication feature, not a functional requirement.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library        | Version | Purpose                 | Why Standard                              |
| -------------- | ------- | ----------------------- | ----------------------------------------- |
| TypeScript     | 5.x     | Type-level programming  | Sole platform for compile-time validation |
| N/A - Built-in | -       | Phantom type parameters | Standard pattern for type-state machines  |

### Supporting

| Library | Version | Purpose                  | When to Use                               |
| ------- | ------- | ------------------------ | ----------------------------------------- |
| N/A     | -       | No external dependencies | Pure TypeScript type-level implementation |

### Alternatives Considered

| Instead of                         | Could Use                         | Tradeoff                                            |
| ---------------------------------- | --------------------------------- | --------------------------------------------------- |
| Pending constraints (compile-time) | Runtime-only validation           | Simpler but loses compile-time safety guarantee     |
| Phantom type parameter             | Two-pass validation at build()    | Cannot validate until build(), worse DX             |
| Union-based pending state          | Array/tuple-based constraint list | Unions distribute better in TypeScript conditionals |

**Installation:**
No new dependencies required. All features use existing type-level patterns.

## Architecture Patterns

### Recommended Type Structure

```
packages/graph/
├── src/
│   ├── builder/types/
│   │   ├── state.ts                # Add TPendingConstraints to BuilderInternals
│   │   └── provide.ts              # Add CheckPendingConstraints step
│   └── validation/types/
│       └── captive/
│           ├── pending.ts          # NEW: PendingConstraint types
│           ├── detection.ts        # Existing forward/reverse captive detection
│           └── index.ts            # Re-export pending types
```

### Pattern 1: Phantom Type Parameter for Pending State

**What:** Add TPendingConstraints union to BuilderInternals to track forward references
**When to use:** When sequential type processing requires deferred validation

**Example:**

```typescript
// Current BuilderInternals (7 parameters)
interface BuilderInternals<
  TDepGraph,
  TLifetimeMap,
  TParentProvides,
  TMaxDepth,
  TExtendedDepth,
  TDepthExceededWarning,
  TUncheckedUsed
> { ... }

// Proposed BuilderInternals (8 parameters)
interface BuilderInternals<
  TDepGraph,
  TLifetimeMap,
  TParentProvides,
  TMaxDepth,
  TExtendedDepth,
  TDepthExceededWarning,
  TUncheckedUsed,
  TPendingConstraints = never  // NEW: Defaults to empty
> {
  readonly depGraph: TDepGraph;
  readonly lifetimeMap: TLifetimeMap;
  readonly parentProvides: TParentProvides;
  readonly maxDepth: TMaxDepth;
  readonly unsafeDepthOverride: TExtendedDepth;
  readonly depthExceededWarning: TDepthExceededWarning;
  readonly uncheckedUsed: TUncheckedUsed;
  readonly pendingConstraints: TPendingConstraints;  // NEW
}
```

### Pattern 2: Union-Based Constraint Storage

**What:** Store pending constraints as discriminated union of constraint objects
**When to use:** When you need to track multiple unresolved relationships

**Example:**

```typescript
// Constraint structure
type PendingCaptiveConstraint<
  TDependentPort extends string,
  TDependentLifetime extends Lifetime,
  TRequiredPort extends string,
> = {
  readonly _tag: "PendingCaptive";
  readonly dependentPort: TDependentPort;
  readonly dependentLifetime: TDependentLifetime;
  readonly requiredPort: TRequiredPort;
};

// Stored as union
type TPendingConstraints =
  | PendingCaptiveConstraint<"SingletonPort", "singleton", "ScopedPort">
  | PendingCaptiveConstraint<"CachePort", "singleton", "SessionPort">
  | never; // Empty when no pending constraints
```

### Pattern 3: Two-Step Validation (Register + Validate)

**What:** When port is provided, validate against both forward deps AND pending constraints
**When to use:** Bidirectional validation scenarios

**Example:**

```typescript
// Step 1: When registering SingletonAdapter requiring unregistered ScopedPort
// Normal forward captive check: ScopedPort not in map → skip (forward ref)
// Create pending constraint: Singleton → requires → ScopedPort

type Step1State = WithPendingConstraints<
  State,
  PendingCaptiveConstraint<"SingletonPort", "singleton", "ScopedPort">
>;

// Step 2: When registering ScopedAdapter providing ScopedPort
// Check 1: Forward captive (ScopedAdapter's requirements) → pass
// Check 2: Reverse captive (existing deps on ScopedPort) → pass
// Check 3 (NEW): Pending constraints for ScopedPort
//   Found: Singleton (level 1) requires ScopedPort
//   Validate: ScopedAdapter level (2) vs Singleton level (1)
//   Result: 2 > 1 → CAPTIVE ERROR
```

### Pattern 4: Constraint Filtering and Removal

**What:** Filter pending constraints by target port and remove satisfied constraints
**When to use:** To efficiently validate and clean up pending state

**Example:**

```typescript
// Filter constraints targeting a specific port
type FilterPendingForPort<TPending, TPortName extends string> =
  TPending extends PendingCaptiveConstraint<infer Dep, infer DepLife, infer Req>
    ? Req extends TPortName
      ? PendingCaptiveConstraint<Dep, DepLife, Req>
      : never
    : never;

// Remove satisfied constraint from union
type RemoveConstraint<TState extends AnyBuilderInternals, TConstraint> = BuilderInternals<
  GetDepGraph<TState>,
  GetLifetimeMap<TState>,
  GetParentProvides<TState>,
  GetMaxDepth<TState>,
  GetExtendedDepth<TState>,
  GetDepthExceededWarning<TState>,
  GetUncheckedUsed<TState>,
  Exclude<GetPendingConstraints<TState>, TConstraint> // Remove from union
>;
```

### Anti-Patterns to Avoid

- **Array/tuple for pending constraints:** Harder to filter and remove specific constraints compared to union types
- **Validating all pending at build():** Worse DX than validating as soon as port is provided
- **Separate pending state per adapter:** Union across all adapters more efficient for TypeScript's distributive conditionals
- **Tracking constraint history:** Only track unresolved constraints, not resolved ones (avoid state bloat)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                    | Don't Build            | Use Instead                             | Why                                              |
| -------------------------- | ---------------------- | --------------------------------------- | ------------------------------------------------ |
| Forward reference tracking | Custom marker types    | ForwardReferenceMarker (existing)       | Already implemented in detection.ts              |
| Reverse captive detection  | New algorithm          | FindReverseCaptiveDependency (existing) | Handles registration order B partially           |
| Lifetime comparison        | Manual level checks    | IsCaptiveDependency (existing)          | Handles all 9 lifetime comparisons               |
| Constraint filtering       | Manual union iteration | Distributive conditionals               | TypeScript distributes over unions automatically |

**Key insight:** Most validation infrastructure exists. The gap is tracking forward references until they're resolved, which requires minimal new code (pending constraint structure + validation step).

## Common Pitfalls

### Pitfall 1: TS2589 "Type instantiation is excessively deep and possibly infinite"

**What goes wrong:** Adding TPendingConstraints parameter increases builder type parameter count from 7 to 8, making nested builder chains deeper
**Why it happens:** Each provide() creates new GraphBuilder type with updated state; 8 parameters × deep chains risks hitting TypeScript's recursion limits
**How to avoid:**

- Test with realistic adapter count (50+ adapters in single chain)
- Use tail-recursive patterns where possible
- Consider type parameter count in complexity budget

**Warning signs:**

- TS2589 errors in tests with many provide() calls
- IDE slowness when hovering over deep builder chains
- Type-check time increasing significantly

**Mitigation strategies:**

1. Keep TPendingConstraints as union (faster than tuple/array)
2. Use never for empty state (minimal memory)
3. Test with --noEmit to catch TS2589 early
4. Document max recommended chain depth

### Pitfall 2: Forgetting to Check Pending Constraints

**What goes wrong:** Pending constraints created but never validated when port is provided
**Why it happens:** Added constraint creation step but forgot validation step in provide() chain
**How to avoid:** Add CheckPendingConstraints between CheckCaptiveDependency and CheckReverseCaptiveDependency
**Warning signs:** Forward reference captive violations still not caught in tests

**Prevention:**

```typescript
// Validation order in provide():
// 1. CheckDuplicate
// 2. CheckSelfDependency
// 3. CheckCycleDependency
// 4. CheckCaptiveDependency (forward)
// 5. CheckReverseCaptiveDependency (existing adapters)
// 6. CheckPendingConstraints (NEW - validate against pending)
// 7. AddPendingForRequirements (NEW - create pending for unsatisfied)
```

### Pitfall 3: Constraint Leakage in Merge

**What goes wrong:** Merged graph doesn't inherit pending constraints, losing forward reference tracking
**Why it happens:** UnifiedMergeInternals not updated to merge TPendingConstraints
**How to avoid:** Union pending constraints from both graphs during merge
**Warning signs:** Forward reference violations caught before merge but not after

**Solution:**

```typescript
type UnifiedMergeInternals<...> = BuilderInternals<
  TMergedDepGraph,
  TMergedLifetimeMap,
  MergeParentProvides<...>,
  TResolvedMaxDepth,
  BoolOr<...>,
  GetDepthExceededWarning<T1> | GetDepthExceededWarning<T2>,
  BoolOr<...>,
  GetPendingConstraints<T1> | GetPendingConstraints<T2>  // NEW: Union constraints
>;
```

### Pitfall 4: Validating Constraint Before Port Is Provided

**What goes wrong:** Attempting to validate pending constraint when dependent is provided (too early)
**Why it happens:** Confusion about when to validate - validate when REQUIRED port is provided, not when DEPENDENT is provided
**How to avoid:** Clear mental model:

- Constraint created: When dependent with forward ref is registered
- Constraint validated: When required port is PROVIDED (not when it's required by something else)
- Constraint removed: After successful validation

**Example:**

```typescript
// WRONG: Validate when SingletonAdapter is provided (too early - ScopedPort unknown)
.provide(SingletonAdapter)  // requires ScopedPort
  → Create constraint, DO NOT validate (ScopedPort not provided yet)

// RIGHT: Validate when ScopedAdapter is provided (now we know ScopedPort's lifetime)
.provide(ScopedAdapter)     // provides ScopedPort
  → Find constraints requiring ScopedPort
  → Validate: Can SingletonAdapter (level 1) depend on ScopedAdapter (level 2)? NO → ERROR
```

## Code Examples

Verified patterns from official sources:

### Existing Forward Reference Detection (Current Implementation)

```typescript
// Source: packages/graph/src/validation/types/captive/detection.ts:151-174
export type FindCaptiveDependency<
  TLifetimeMap,
  TDependentLevel extends number,
  TRequiredPortName extends string,
> =
  GetLifetimeLevel<TLifetimeMap, TRequiredPortName> extends infer DepLevel
    ? IsNever<DepLevel> extends true
      ? // Port not in lifetime map yet - forward reference
        // Currently returns ForwardReferenceMarker (for debugging)
        // PROBLEM: No validation when port is later provided
        ForwardReferenceMarker<TRequiredPortName>
      : DepLevel extends number
        ? IsCaptiveDependency<TDependentLevel, DepLevel> extends true
          ? TRequiredPortName // Captive found
          : never
        : never
    : never;
```

### Existing Reverse Captive Detection (Partial Solution)

```typescript
// Source: packages/graph/src/validation/types/captive/detection.ts:370-392
export type FindReverseCaptiveDependency<
  TDepGraph,
  TLifetimeMap,
  TNewPortName extends string,
  TNewPortLevel extends number,
> =
  HasLifetimeInMap<TLifetimeMap, TNewPortName> extends true
    ? // Port already has provider - skip reverse check
      never
    : // Port is new (forward reference) - check existing adapters
      FindDependentsOf<TDepGraph, TNewPortName> extends infer TDependents
      ? IsNever<TDependents> extends true
        ? never
        : TDependents extends string
          ? CheckReverseCaptive<TLifetimeMap, TDependents, TNewPortLevel>
          : never
      : never;
```

**Analysis:** FindReverseCaptiveDependency catches some forward reference cases:

- When port is FIRST provided, checks if existing adapters require it
- LIMITATION: Only checks adapters already in the graph
- PROBLEM: If existing adapter requires forward ref, that requirement isn't in TDepGraph's edges yet
  - Example: Singleton requires ScopedPort → creates dep graph edge "Singleton" → "ScopedPort"
  - But when Scoped provides ScopedPort, FindDependentsOf finds "Singleton"
  - So this SHOULD work... Let me verify with test

### Verification Test (Existing Behavior)

```typescript
// Source: packages/graph/tests/forward-ref-compile-time-gap.test-d.ts:50-75
it("should produce an error when singleton is registered first, then scoped", () => {
  const step1 = GraphBuilder.create().provide(CaptiveSingletonAdapter);
  // CaptiveSingletonAdapter: singleton requiring ScopedPort (forward ref)

  const step2 = step1.provide(ScopedAdapter);
  // ScopedAdapter: provides ScopedPort

  type Step2Type = typeof step2;
  type IsErrorMessage = Step2Type extends `ERROR${string}` ? true : false;

  // THIS ASSERTION DOCUMENTS THE EXPECTED BEHAVIOR:
  // If this passes, the gap is FIXED
  // If this fails, the gap STILL EXISTS
  expectTypeOf<IsErrorMessage>().toEqualTypeOf<true>();
});
```

**Key insight:** The test EXPECTS this to be fixed. Let me check if the current implementation already handles this via FindReverseCaptiveDependency.

### Current Validation Flow (provide() Method)

```typescript
// Source: packages/graph/src/builder/types/provide.ts:231-269
export type CheckCaptiveDependency<...> =
  // Step 3: Check forward captive (this adapter's requirements)
  FindAnyCaptiveDependency<...> extends infer TCaptivePort
    ? IsNever<TCaptivePort> extends true
      ? CheckReverseCaptiveDependency<...>  // Proceed to step 4
      : TCaptivePort extends string
        ? CaptiveErrorMessage<...>  // Error
        : CheckReverseCaptiveDependency<...>
    : never;

export type CheckReverseCaptiveDependency<...> =
  // Step 4: Check reverse captive (existing adapters requiring this port)
  FindReverseCaptiveDependency<...> extends infer TReverseCaptivePort
    ? IsNever<TReverseCaptivePort> extends true
      ? ProvideResultSuccess<...>  // Success
      : TReverseCaptivePort extends string
        ? ReverseCaptiveErrorMessage<...>  // Error
        : ProvideResultSuccess<...>
    : never;
```

**Current flow when providing Scoped after Singleton:**

1. Scoped has no forward refs → CheckCaptiveDependency passes
2. CheckReverseCaptiveDependency calls FindReverseCaptiveDependency
3. FindReverseCaptiveDependency checks if Singleton requires ScopedPort
4. **PROBLEM:** This depends on TDepGraph having the edge "Singleton" → "ScopedPort"

Let me verify what TDepGraph contains...

**Critical realization:** When SingletonAdapter is provided:

- TDepGraph gains edge: "SingletonPort" → ["ScopedPort"]
- But ScopedPort has no entry in TDepGraph (it's not provided yet)

When ScopedAdapter is provided:

- FindDependentsOf<TDepGraph, "ScopedPort"> should return "SingletonPort"
- Because TDepGraph["SingletonPort"] = "ScopedPort"

**This should work!** But the test documents it as a gap. Let me check if there's a subtlety I'm missing...

### Proposed Pending Constraints Pattern (If Current Implementation Insufficient)

```typescript
// NEW: Pending constraint structure
type PendingCaptiveConstraint<
  TDependentPort extends string,
  TDependentLevel extends LifetimeLevel,
  TRequiredPort extends string
> = {
  readonly _tag: "PendingCaptive";
  readonly dependent: TDependentPort;
  readonly dependentLevel: TDependentLevel;
  readonly required: TRequiredPort;
};

// NEW: Check pending constraints when port is provided
type CheckPendingConstraints<
  TProvides,
  TRequires,
  TAsyncPorts,
  TOverrides,
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> =
  // Filter pending constraints that target this port
  FilterPendingForPort<
    GetPendingConstraints<TInternalState>,
    AdapterProvidesName<TAdapter>
  > extends infer TRelevantConstraints
    ? IsNever<TRelevantConstraints> extends true
      ? // No pending constraints for this port
        AddPendingForRequirements<...>
      : // Validate constraint
        TRelevantConstraints extends PendingCaptiveConstraint<
          infer TDepPort,
          infer TDepLevel,
          infer TReqPort
        >
        ? // Check if this adapter's lifetime allows the dependency
          IsCaptiveDependency<
            TDepLevel,
            LifetimeLevel<DirectAdapterLifetime<TAdapter>>
          > extends true
          ? // ERROR: Dependent would capture this port
            ReverseCaptiveErrorMessage<TDepPort, ..., AdapterProvidesName<TAdapter>, ...>
          : // OK: Remove satisfied constraint and continue
            RemoveConstraintAndAddNew<TInternalState, TRelevantConstraints, TAdapter>
        : never
    : never;

// NEW: Add pending constraints for unsatisfied requirements
type AddPendingForRequirements<
  TInternalState extends AnyBuilderInternals,
  TAdapter extends AdapterConstraint,
> =
  // Get requirements that aren't in TLifetimeMap
  FilterUnsatisfiedRequirements<...> extends infer TUnsatisfied
    ? IsNever<TUnsatisfied> extends true
      ? TInternalState  // All requirements satisfied
      : // Create pending constraints
        WithPendingConstraints<
          TInternalState,
          CreatePendingConstraints<
            AdapterProvidesName<TAdapter>,
            LifetimeLevel<DirectAdapterLifetime<TAdapter>>,
            TUnsatisfied
          >
        >
    : TInternalState;
```

## State of the Art

| Old Approach                   | Current Approach               | When Changed     | Impact                             |
| ------------------------------ | ------------------------------ | ---------------- | ---------------------------------- |
| No forward ref handling        | ForwardReferenceMarker         | v3.0 (estimated) | Made gap visible but not validated |
| Forward captive only           | Forward + Reverse captive      | v3.0 (estimated) | Caught some registration orders    |
| Reverse captive with TDepGraph | Pending constraints (proposed) | v4.0 (Phase 14)  | Complete bidirectional validation  |

**Current state (as of 2026-02-02):**

- Forward captive detection: ✓ Working (checks adapter's requirements at registration)
- Reverse captive detection: ⚠️ Partial (checks via TDepGraph, but may miss edge cases)
- Bidirectional validation: ✗ Gap exists (test expects it to work but documents as future work)

**Analysis of existing reverse captive:**
The existing FindReverseCaptiveDependency SHOULD catch the forward reference case based on code analysis:

1. TDepGraph tracks dependencies even for forward refs
2. FindDependentsOf uses TDepGraph to find dependents
3. Should detect Singleton depending on unregistered ScopedPort

**Hypothesis:** The test in forward-ref-compile-time-gap.test-d.ts may be pessimistic, OR there's a subtle edge case in TDepGraph edge tracking when requirements include forward refs.

**Recommendation for Phase 14:**

1. First verify if existing reverse captive actually works
2. If gap confirmed, implement pending constraints
3. If gap NOT confirmed, update test expectations and close phase

## Open Questions

1. **Does existing FindReverseCaptiveDependency already solve this?**
   - What we know: Code analysis suggests it should work via TDepGraph lookup
   - What's unclear: Why forward-ref-compile-time-gap.test-d.ts documents it as a gap
   - Recommendation: Run the test to verify current behavior before implementing new solution

2. **What's the TDepGraph edge for forward references?**
   - What we know: TDepGraph tracks "PortName" → ["RequiredPorts"]
   - What's unclear: Are forward ref dependencies added to TDepGraph edges?
   - Recommendation: Add debug type to inspect TDepGraph after forward ref registration

3. **What's the type complexity impact?**
   - What we know: Adding TPendingConstraints increases BuilderInternals from 7 to 8 parameters
   - What's unclear: Will this trigger TS2589 in realistic scenarios?
   - Recommendation: Benchmark with 50+ adapter chain before implementing

4. **Should pending constraints be per-port or per-relationship?**
   - What we know: Per-relationship is more precise (tracks Singleton→ScopedPort separately from Cache→ScopedPort)
   - What's unclear: Is the extra type complexity worth it vs simpler per-port tracking?
   - Recommendation: Start with per-relationship (more precise), simplify if TS2589 issues arise

5. **How do pending constraints interact with merge()?**
   - What we know: Union semantics would merge pending constraints from both graphs
   - What's unclear: Can merged pending constraints create false positives?
   - Recommendation: Test merge with forward refs in both graphs

6. **Should build() enforce no pending constraints?**
   - What we know: Pending constraints mean required ports were never provided
   - What's unclear: Should this be type error or just missing dependency error?
   - Recommendation: Let existing missing dependency validation handle it

## Sources

### Primary (HIGH confidence)

- packages/graph/src/validation/types/captive/detection.ts - Existing forward/reverse captive detection
- packages/graph/src/builder/types/provide.ts - Current validation pipeline
- packages/graph/src/builder/types/state.ts - BuilderInternals structure (7 parameters currently)
- packages/graph/tests/forward-ref-compile-time-gap.test-d.ts - Test documenting the gap
- packages/graph/src/validation/types/CONCEPT-captive-detection.ts - Conceptual documentation of current algorithm

### Secondary (MEDIUM confidence)

- .planning/research/ARCHITECTURE.md - Proposes pending constraints solution with code examples
- .planning/milestones/v4.0-REQUIREMENTS.md - Acceptance criteria for VAL-01
- .planning/STATE.md - Documents Phase 14 as high complexity, may defer to v4.1

### Tertiary (LOW confidence)

- None required - all information derived from codebase analysis

## Metadata

**Confidence breakdown:**

- Existing reverse captive detection: HIGH - Code is well-documented and test exists
- Pending constraints pattern: MEDIUM - Pattern is standard but complexity impact uncertain
- TS2589 risk: LOW - Cannot verify without implementation and benchmarking
- Merge behavior: MEDIUM - Union semantics standard but interaction with constraints untested

**Research date:** 2026-02-02
**Valid until:** 30 days (fast-moving feature, requires testing to validate approach)

**Recommendation:**

This feature is a **type-system sophistication improvement**, not a functional requirement. The runtime already validates captive dependencies as defense-in-depth. Defer to v4.1 if:

- Implementation reveals TS2589 issues
- Type-check performance degrades significantly
- Existing reverse captive detection proves sufficient after testing

If proceeding with Phase 14:

1. Verify test behavior: Run forward-ref-compile-time-gap.test-d.ts to confirm gap exists
2. If gap confirmed: Implement TPendingConstraints with union-based storage
3. Benchmark: Test with 50+ adapter chain to detect TS2589 early
4. Document: Add examples to CONCEPT-captive-detection.ts explaining bidirectional flow
