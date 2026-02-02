---
phase: 09-unified-createadapter
plan: 01
subsystem: core-adapters
status: complete
completed: 2026-02-02
duration: 2 min
tags:
  - typescript
  - type-system
  - config-validation
  - api-design

requires:
  - "06-core-port-api (unified createPort pattern reference)"

provides:
  - "Type foundation for unified createAdapter API"
  - "Branded error types for mutual exclusion"
  - "Config interfaces with factory/class variants"

affects:
  - "09-02 (will use these types for createAdapter overloads)"
  - "09-03 (will use these types for validation)"

tech-stack:
  added: []
  patterns:
    - "Branded error types with __error and __hint properties"
    - "Mutual exclusion via ?: never on incompatible properties"
    - "Interface inheritance for variant config types"

key-files:
  created:
    - "packages/core/src/adapters/unified-types.ts"
    - "packages/core/src/adapters/unified.ts"
  modified: []

decisions:
  - slug: "branded-error-pattern"
    decision: "Use readonly __error and __hint properties for branded error types"
    rationale: "Follows existing pattern from error-messages.ts in graph package"
    alternatives:
      - "Template literal error messages (too verbose for config validation)"
      - "never return type (loses actionable hint information)"

  - slug: "mutual-exclusion-mechanism"
    decision: "Use factory?: never and class?: never for mutual exclusion"
    rationale: "TypeScript pattern that enables compile-time enforcement of exactly one property"
    alternatives:
      - "Discriminated union with type field (requires extra discriminator property)"
      - "Separate interfaces without inheritance (duplicates shared properties)"

  - slug: "config-inheritance"
    decision: "FactoryConfig and ClassConfig extend BaseUnifiedConfig"
    rationale: "DRY principle - shared properties defined once, variants add specifics"
    alternatives:
      - "Separate interfaces (duplicates provides, requires, lifetime, clonable, finalizer)"
      - "Single interface with conditional types (harder to understand)"
---

# Phase 9 Plan 01: Config Types and Branded Errors Summary

**One-liner:** Established type foundation for unified createAdapter with branded errors for factory/class mutual exclusion and variant config interfaces

## Tasks Completed

| Task | Type | Commit  | Duration | Description                                                                         |
| ---- | ---- | ------- | -------- | ----------------------------------------------------------------------------------- |
| 1    | auto | 000ac0b | ~1 min   | Created branded error types (BothFactoryAndClassError, NeitherFactoryNorClassError) |
| 2    | auto | 0910a00 | ~1 min   | Created BaseUnifiedConfig, FactoryConfig, and ClassConfig interfaces                |
| 3    | auto | 6802691 | ~1 min   | Created placeholder unified.ts with PortsToServices helper type                     |

## What Was Built

### Type Structure

Created the type foundation for unified createAdapter API:

1. **Branded Error Types** (`unified-types.ts`)
   - `BothFactoryAndClassError` - shown when both factory and class provided
   - `NeitherFactoryNorClassError` - shown when neither provided
   - Pattern: `{ readonly __error: string; readonly __hint: string }`

2. **Config Interfaces** (`unified-types.ts`)
   - `BaseUnifiedConfig<TProvides, TRequires>` - shared properties
     - `provides: TProvides` - the port being implemented
     - `requires?: TRequires` - optional dependencies (defaults to [])
     - `lifetime?: Lifetime` - optional lifetime (defaults to 'singleton')
     - `clonable?: boolean` - optional clonability flag (defaults to false)
     - `finalizer?: (instance) => void | Promise<void>` - optional cleanup

   - `FactoryConfig<TProvides, TRequires, TFactory>` - factory variant
     - Extends `BaseUnifiedConfig`
     - `factory: TFactory` - required factory function
     - `class?: never` - explicitly disallows class property

   - `ClassConfig<TProvides, TRequires, TClass>` - class variant
     - Extends `BaseUnifiedConfig`
     - `class: TClass` - required class constructor
     - `factory?: never` - explicitly disallows factory property

3. **Type Utilities** (`unified.ts`)
   - `PortsToServices<T>` - maps port tuple to service tuple
   - Used for typing class constructor parameters

### Mutual Exclusion Pattern

The `?: never` pattern enforces at compile time that:

- If `factory` is provided, `class` cannot be (compile error)
- If `class` is provided, `factory` cannot be (compile error)
- If neither is provided, branded error type appears in IDE tooltip
- If both are provided, branded error type appears in IDE tooltip

### Import Dependencies

- `Port`, `InferService` from `../ports/types.js`
- `Lifetime`, `ResolvedDeps` from `./types.js`
- `TupleToUnion` from `../utils/type-utilities.js`

## Verification Results

✅ All tasks completed successfully
✅ `pnpm typecheck` passes in core package
✅ All config types export correctly
✅ Branded error types have actionable hints
✅ Mutual exclusion pattern compiles without errors

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Interface Inheritance Over Duplication**
   - Used `extends BaseUnifiedConfig` for variant configs
   - Keeps shared properties (provides, requires, lifetime, clonable, finalizer) in one place
   - Variants add only their specific property (factory or class)

2. **Readonly Properties Throughout**
   - All config properties marked `readonly`
   - Prevents accidental mutation
   - Consistent with existing adapter config pattern

3. **Generic Constraints on Port Types**
   - `TProvides extends Port<unknown, string>`
   - `TRequires extends readonly Port<unknown, string>[]`
   - Ensures type safety while allowing full inference

## Integration Points

### Upstream Dependencies

- Follows branded error pattern from `packages/graph/src/validation/types/error-messages.ts`
- Follows config pattern from existing `createAdapter` in `packages/core/src/adapters/factory.ts`
- Uses `ResolvedDeps` type from `packages/core/src/adapters/types.ts`

### Downstream Usage

- Plan 09-02 will use these types for `createAdapter()` overloads
- Plan 09-03 will use branded errors for config validation
- FactoryConfig and ClassConfig become the foundation for all unified adapter creation

## Code Quality Notes

### Type Safety

- Zero use of `any` type
- No type casts (`as` assertions)
- Full generic inference preserved
- Readonly properties prevent mutation

### Documentation

- All exported types have JSDoc comments
- Examples included for branded error types
- Type parameters documented with `@typeParam`
- Usage patterns explained in comments

### Patterns Used

- Branded error types (from graph package)
- Interface inheritance (DRY principle)
- Mutual exclusion via `?: never`
- Phantom type parameters (compile-time only)

## Next Phase Readiness

**Ready for Plan 09-02:** Yes

**What's needed next:**

1. Create overloads for `createAdapter()` function
2. Implement factory variant handling
3. Implement class variant handling
4. Add async detection logic
5. Wire up runtime validation

**Blockers:** None

**Open questions:** None - type structure is complete and ready for implementation

## Performance Impact

- **Compile time:** Negligible - simple interface definitions
- **Runtime:** Zero - types erase completely
- **Bundle size:** Zero - no runtime code added yet

## Files Changed

```
packages/core/src/adapters/
├── unified-types.ts  (created, 173 lines)
└── unified.ts         (created, 49 lines)
```

## Commits

1. `000ac0b` - feat(09-01): add branded error types for factory/class mutual exclusion
2. `0910a00` - feat(09-01): add base and variant config types for unified createAdapter
3. `6802691` - feat(09-01): create placeholder unified.ts with PortsToServices helper
