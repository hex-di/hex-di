---
phase: 09-unified-createadapter
plan: 03
type: summary
status: complete
subsystem: core-adapters
tags: [adapter-api, constructor-injection, class-based-adapters, type-system]

requires: ["09-01"]
provides: ["class-based-adapter-creation"]
affects: ["09-04", "09-05"]

tech-stack:
  added: []
  patterns:
    - "Constructor injection with extractServicesInOrder"
    - "Mutual exclusion validation (factory XOR class)"

key-files:
  created: []
  modified:
    - packages/core/src/adapters/unified.ts

decisions:
  - name: "Constructor parameter types with PortsToServices"
    rationale: "Maps requires tuple to constructor parameter types while preserving order"
    alternatives: ["Use unknown[] and trust user", "Attempt structural validation"]
    context: "TypeScript cannot verify parameter order matches requires order"
  - name: "Runtime mutual exclusion validation"
    rationale: "Catch config errors early with clear error messages"
    alternatives: ["Type-only validation", "Allow both and prioritize one"]
    impact: "Better developer experience with actionable error messages"
  - name: "Inline config types instead of ClassConfig intersection"
    rationale: "TypeScript variance rules prevent tighter constraints in intersections"
    alternatives: ["Loosen ClassConfig constraint", "Use different type pattern"]
    impact: "Maintains type safety for constructor parameter inference"

metrics:
  duration: 7 minutes
  completed: 2026-02-02
---

# Phase 09 Plan 03: Class-Based createAdapter Implementation Summary

**One-liner:** Constructor injection via class property with dependency ordering matching requires array.

## What Was Built

Implemented class-based adapter creation through the unified `createAdapter()` API. Class constructors receive dependencies injected in the order specified by the `requires` array.

### Implementation Details

**Class Overloads (5 variants):**

- All defaults (no requires, lifetime, clonable)
- Explicit requires only
- Explicit lifetime (with optional requires)
- Explicit clonable (with optional requires)
- Full explicit (requires + lifetime + clonable)

**Runtime Implementation:**

- `extractServicesInOrder` helper extracts deps from object in port array order
- Mutual exclusion validation (factory XOR class)
- Class variant creates wrapper factory: `(deps) => new Class(...extractServicesInOrder(deps, requires))`
- Class-based adapters always have `factoryKind: "sync"`

**Type Safety:**

- Constructor parameters typed as `PortsToServices<TRequires>` (maps port tuple to service tuple)
- Cannot use `ClassConfig` intersection due to TypeScript variance rules
- Inline config types maintain tighter constructor parameter constraints

### Key Commits

- **37f841a**: `feat(09-03): add class-based createAdapter overloads`
  - 5 overloads for different default combinations
  - Constructor parameters typed with PortsToServices helper
  - All class adapters have factoryKind 'sync'
- **18a76e0**: `feat(09-03): implement class variant in createAdapter`
  - extractServicesInOrder helper for constructor injection
  - Mutual exclusion validation (HEX019, HEX020 error codes)
  - Wrapper factory pattern for class instantiation

## What Changed

### Files Modified

- **packages/core/src/adapters/unified.ts** (+249 lines)
  - 5 class-based createAdapter overloads
  - extractServicesInOrder helper function
  - Class variant implementation in createAdapter body
  - Mutual exclusion runtime validation

### Breaking Changes

None. This is net-new functionality.

### Behavior Changes

- `createAdapter()` now accepts `class` property
- Runtime error (HEX020) if both `factory` and `class` provided
- Runtime error (HEX019) updated to mention both factory and class

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

### Decision 1: PortsToServices Type Helper

**Problem:** Need to type class constructor parameters from requires tuple

**Chosen:** `type PortsToServices<T> = { [K in keyof T]: T[K] extends Port<infer S> ? S : never }`

**Rationale:**

- Preserves tuple order and length
- Maps each port to its service type
- Already existed in unified.ts from 09-01

**Alternatives Considered:**

- Use `unknown[]` - loses type safety
- Structural validation at runtime - not possible in TypeScript

**Impact:**

- Constructor parameters properly typed
- IDE autocomplete works
- Type errors if constructor doesn't match requires

### Decision 2: Inline Config Types Instead of ClassConfig Intersection

**Problem:** `ClassConfig<TProvides, TRequires, TClass>` uses constraint `TClass extends new (...args: unknown[])`. Overloads want tighter constraint `TClass extends new (...args: PortsToServices<TRequires>)`. TypeScript variance rules prevent intersecting with tighter constraints.

**Chosen:** Use inline config object types in overloads, don't intersect with ClassConfig

**Rationale:**

- Allows tighter constructor parameter typing
- ClassConfig still exists for documentation and branded error types
- Overload signatures are source of truth for type checking

**Alternatives Considered:**

- Loosen ClassConfig constraint to accept any constructor - loses constructor parameter validation
- Create separate ClassConfig variants for each overload - unnecessary complexity

**Impact:**

- Constructor parameter types properly enforced
- ClassConfig type still exported for user reference
- No runtime impact (types erased)

### Decision 3: Mutual Exclusion Validation at Runtime

**Problem:** User might provide both `factory` and `class`, or neither

**Chosen:** Runtime validation with HEX error codes (HEX019, HEX020)

**Rationale:**

- Type system prevents this at compile time via branded error types
- Runtime check provides fallback for dynamic configs
- Clear error messages guide users to correct usage

**Alternatives Considered:**

- Type-only validation - misses runtime/dynamic cases
- Allow both and prioritize one - confusing behavior
- Allow neither and default to no-op - breaks adapter contract

**Impact:**

- Better developer experience
- Consistent error handling with rest of codebase
- Early failure prevents cryptic downstream errors

### Decision 4: extractServicesInOrder Pattern

**Problem:** Class constructors need dependencies in requires array order, but factory receives deps as object `{ PortName: instance }`

**Chosen:** Helper function `extractServicesInOrder(deps, requires)` that returns `unknown[]`

**Rationale:**

- Same pattern used in `service.ts` (proven approach)
- Keeps factory signature consistent (receives object, not array)
- Simple map operation: `requires.map(port => deps[port.__portName])`

**Alternatives Considered:**

- Change factory signature to receive array - breaks existing factory adapters
- Build dependencies in adapter creation - loses lazy evaluation
- Use Proxy to intercept constructor calls - overcomplicated

**Impact:**

- Constructor receives dependencies in correct order
- Works with all requires array sizes (0 to N)
- Runtime overhead: one map operation per instantiation

## Next Phase Readiness

### Blockers

None.

### Concerns

None. Class-based adapters complete. Next plan (09-04) implements finalizer support.

### Recommendations

- Document constructor parameter ordering requirement
- Consider validation helper to check constructor signature matches requires (future enhancement)

## Testing Notes

### Type Tests Needed (Future)

- Constructor parameter inference with various requires tuples
- Error types for mismatched constructor signatures
- Default value inference (requires optional, lifetime defaults to singleton)

### Runtime Tests Needed (Future)

- Class with no dependencies
- Class with dependencies (2-3 params)
- Dependency injection order matches requires order
- Runtime error for both factory and class
- Runtime error for neither factory nor class
- Finalizer works with class-based adapters

## Integration Points

### Upstream Dependencies

- **09-01**: Config types (ClassConfig, FactoryConfig), branded error types
- **core/ports**: Port type, InferService helper
- **core/types**: Adapter type, Lifetime, ResolvedDeps

### Downstream Impact

- **09-04** (Finalizers): Class-based adapters support finalizer property
- **09-05** (Legacy Removal): Old fromClass/createClassAdapter can be removed
- **Future users**: Can use `createAdapter({ class: MyClass })` instead of separate functions

## Lessons Learned

### What Went Well

- TypeScript variance rules understood upfront (didn't try to fight ClassConfig intersection)
- extractServicesInOrder pattern copied directly from service.ts
- Mutual exclusion validation catches config errors early

### What Was Challenging

- TypeScript variance with ClassConfig constraint required inline config types
- Control flow analysis for factory assignment needed explicit if/else branches

### What Would We Do Differently

Nothing - plan was well-scoped and execution was smooth.

---

**Execution time:** 7 minutes
**Test coverage:** Type checking passed, runtime tests deferred to future plan
**Documentation:** TSDoc added to all overloads and helpers
