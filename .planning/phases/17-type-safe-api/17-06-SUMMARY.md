---
phase: 17
plan: 06
subsystem: core
tags: [context-api, type-safety, utilities]
requires:
  - phase-15-foundation
provides:
  - context-variable-api
  - type-safe-context-helpers
affects:
  - phase-17-07 # Container options integration
  - future-runtime-context-usage
tech-stack:
  added: []
  patterns:
    - symbol-based-context-keys
    - type-safe-context-variables
key-files:
  created:
    - packages/core/src/context/variables.ts
    - packages/core/src/context/helpers.ts
    - packages/core/src/context/index.ts
    - packages/core/tests/context/variables.test.ts
  modified:
    - packages/core/src/index.ts
decisions: []
metrics:
  duration: "~2 minutes"
  completed: "2026-02-04"
---

# Phase 17 Plan 06: Move Context Variable Helpers to Core Package Summary

**One-liner:** Context variable API with Symbol-based type-safe helpers for dependency injection value passing

## Summary

Created context variable utilities in @hex-di/core package, providing a type-safe API for passing runtime values through the dependency graph. The implementation uses Symbol-based unique identifiers to prevent collisions, supports optional default values, and includes comprehensive helper functions with full test coverage.

## Context Variables Overview

The context API consists of three main components:

1. **ContextVariable<T>** interface: Type-safe variable definition with Symbol ID and optional default
2. **createContextVariable**: Factory function to create new context variables
3. **Helper functions**: withContext and getContext for value manipulation

## Implementation Details

### Core Types and Factory

**packages/core/src/context/variables.ts:**

- `ContextVariable<T>` interface with symbol-based ID
- `createContextVariable<T>(name, defaultValue?)` factory function
- Symbol ensures uniqueness even with duplicate names
- Default values preserved with proper type inference

### Helper Functions

**packages/core/src/context/helpers.ts:**

- `withContext<T>(variable, value)`: Creates context entries for map construction
- `getContext<T>(context, variable)`: Retrieves values with fallback to default
- Both functions maintain full type safety through generics

### Public API

**packages/core/src/index.ts:**

- Exported all context utilities under dedicated "Context" section
- Available as part of @hex-di/core public API
- Users import from main package: `import { createContextVariable } from '@hex-di/core'`

## Testing

Created comprehensive test suite with 15 tests covering:

- Unique symbol generation for each variable
- Default value preservation and type inference
- Helper function behavior and edge cases
- Falsy value handling (false, 0, "")
- Multiple variables in same context
- Type inference without explicit annotations

All tests passing with 100% coverage of public API surface.

## Architectural Decisions

### Symbol-Based Keys

Decision: Use Symbol for context variable IDs rather than string keys

**Rationale:**

- Prevents accidental collisions between variables with same name
- Provides better debugging through Symbol descriptions
- Enables compile-time type safety without runtime overhead

**Alternative considered:** String-based keys with namespace prefixes
**Rejected because:** Still risk of collisions, less type-safe

### Default Values at Variable Definition

Decision: Allow default values at variable creation, not just at retrieval

**Rationale:**

- Default values are a property of the variable itself
- Simplifies usage - don't need to pass defaults everywhere
- Consistent with common patterns in dependency injection

**Alternative considered:** Default values only in getContext
**Rejected because:** Less ergonomic, defaults would be duplicated across call sites

### Map<symbol, unknown> for Context Storage

Decision: Use Map with symbol keys and unknown values

**Rationale:**

- Map provides O(1) lookups with symbol keys
- unknown values maintain type safety at retrieval sites
- Compatible with existing runtime infrastructure
- No type erasure issues

**Alternative considered:** WeakMap
**Rejected because:** Symbols as keys don't benefit from weak references

## Files Modified

### Created

1. **packages/core/src/context/variables.ts** (58 lines)
   - ContextVariable interface
   - createContextVariable factory
   - Comprehensive JSDoc documentation

2. **packages/core/src/context/helpers.ts** (78 lines)
   - withContext helper function
   - getContext helper with default fallback
   - Usage examples in documentation

3. **packages/core/src/context/index.ts** (10 lines)
   - Re-exports all context utilities
   - Single entry point for context features

4. **packages/core/tests/context/variables.test.ts** (180 lines)
   - 15 comprehensive tests
   - Covers all public API behavior
   - Tests type inference and edge cases

### Modified

1. **packages/core/src/index.ts**
   - Added Context section with exports
   - Maintains consistent export structure

## Dependencies and Integration

### Upstream Dependencies

- **Phase 15 Foundation**: Core package structure and build tooling

### Downstream Impact

- **Phase 17-07**: Container options will integrate context API
- **Future runtime usage**: Runtime package can consume these utilities
- **Adapter patterns**: Enables context-aware adapter creation

### Integration Points

This plan establishes the foundation for context-aware dependency injection:

1. Adapters can accept context variables in configuration
2. Containers can pass context through resolution chains
3. Services receive typed context values at construction time

The API is intentionally minimal and focused, avoiding premature feature expansion.

## Next Phase Readiness

### Completed Deliverables

- Context variable API available in @hex-di/core
- Type-safe helpers with full test coverage
- Public exports properly configured
- Documentation complete

### Blockers

None - plan completed successfully.

### Open Questions

None - API design is complete and tested.

## Deviations from Plan

None - plan executed exactly as written.

All tasks completed without issues:

1. Created context variable types and factory
2. Added helper functions with JSDoc
3. Exported utilities and added comprehensive tests

## Performance and Quality

### Build Metrics

- Build time: < 1 second (incremental)
- Type check time: < 1 second
- Test execution: 131ms for 15 tests
- Zero type errors

### Code Quality

- 100% test coverage of public API
- Comprehensive JSDoc documentation
- Type inference working correctly
- Zero ESLint violations

### Type Safety Features

- Full generic type preservation through API
- Symbol-based keys prevent runtime collisions
- Compile-time verification of context access
- No type assertions needed in user code

## Lessons Learned

### What Went Well

1. **Symbol-based approach**: Clean separation and zero collision risk
2. **Type inference**: Users don't need explicit type annotations
3. **Test-driven design**: Tests validated API ergonomics
4. **Documentation**: JSDoc examples make usage clear

### Future Improvements

1. Consider context composition utilities if complex patterns emerge
2. May add context variable groups/namespaces in future versions
3. Could add debugging utilities to inspect active contexts

### Notes for Future Plans

- Context API is ready for container integration (17-07)
- Pattern established for future context features
- Consider middleware/interceptor patterns for context propagation
