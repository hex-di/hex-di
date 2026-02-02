---
phase: 09-unified-createadapter
plan: 05
subsystem: core-adapters
status: complete
completed: 2026-02-02
duration: 1 min
tags:
  - testing
  - runtime-validation
  - vitest
  - adapter-api

requires:
  - "09-02 (factory-based createAdapter implementation)"
  - "09-03 (class-based createAdapter implementation)"

provides:
  - "Comprehensive runtime tests for unified createAdapter"
  - "Validation of factory variant behavior"
  - "Validation of class variant dependency injection"
  - "Error handling verification"

affects:
  - "Future tests can use unified createAdapter as the standard API"

tech-stack:
  added: []
  patterns:
    - "Runtime adapter structure validation"
    - "Dependency injection order verification"
    - "Mutual exclusion error testing"

key-files:
  created:
    - "packages/core/tests/unified-adapter.test.ts"
  modified:
    - "packages/core/src/index.ts (fixed export to use unified createAdapter)"

decisions:
  - slug: "export-unified-adapter"
    decision: "Export createAdapter from unified.ts instead of factory.js"
    rationale: "Unified API is the new standard, replaces old separate functions"
    alternatives:
      - "Keep both exports (creates confusion about which to use)"
      - "Deprecate old API gradually (out of scope, no backward compat needed)"
---

# Phase 9 Plan 05: Runtime Tests for Unified createAdapter Summary

**One-liner:** Comprehensive runtime tests validating factory/class variants, dependency injection, defaults, and mutual exclusion errors

## Tasks Completed

| Task | Type | Commit  | Duration | Description                                          |
| ---- | ---- | ------- | -------- | ---------------------------------------------------- |
| 1    | auto | 3f62614 | ~1 min   | Created runtime tests for factory and class variants |
| 2    | auto | 3f62614 | ~1 min   | Added error handling tests for mutual exclusion      |

## What Was Built

### Runtime Test Coverage

Created comprehensive runtime tests in `packages/core/tests/unified-adapter.test.ts` with 18 test cases covering:

**Factory Variant Tests (7 tests):**

- Adapter object structure with all properties explicit
- Default value application (requires=[], lifetime='singleton', clonable=false)
- Finalizer preservation on adapter object
- Factory receives resolved dependencies as object
- Explicit lifetime configuration
- Explicit clonable flag configuration
- All properties explicit with finalizer

**Class Variant Tests (7 tests):**

- Adapter object structure with class constructor
- Dependency injection in requires array order
- Default value application for class variant
- Finalizer preservation on class adapter
- Explicit lifetime configuration
- Explicit clonable flag configuration
- All properties explicit with finalizer

**Error Handling Tests (4 tests):**

- Throws HEX020 when both factory and class provided
- Throws HEX019 when neither factory nor class provided
- Error messages include helpful hints for mutual exclusion
- Error messages include helpful hints for missing implementation

### Export Fix

**Issue Found:** Tests were failing because `packages/core/src/index.ts` was still exporting `createAdapter` from the old `./adapters/factory.js` file instead of the new unified implementation.

**Resolution:** Updated export to use `./adapters/unified.js`:

```typescript
// Before
export { createAdapter, createAsyncAdapter } from "./adapters/factory.js";

// After
export {
  createAdapter,
  type BothFactoryAndClassError,
  type NeitherFactoryNorClassError,
  type BaseUnifiedConfig,
  type FactoryConfig,
  type ClassConfig,
} from "./adapters/unified.js";
export { createAsyncAdapter } from "./adapters/factory.js";
```

### Key Validations

**Runtime behavior verified:**

1. Factory-based adapters create correct object structure
2. Class-based adapters inject dependencies in correct order
3. Default values match type-level defaults (singleton, [], false)
4. Finalizer is preserved when provided
5. Mutual exclusion errors thrown with descriptive messages (HEX019, HEX020)
6. Error messages include actionable hints

**Test Statistics:**

- Total tests: 18
- All passing
- Line count: 318 lines (exceeds 80 line minimum)
- Coverage: Factory variant, class variant, error handling, defaults

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed incorrect export in index.ts**

- **Found during:** Test execution (Task 1)
- **Issue:** Tests were importing old createAdapter from factory.js, not unified.ts
- **Fix:** Updated export to use unified.ts and added type exports
- **Files modified:** packages/core/src/index.ts
- **Commit:** 3f62614

## Technical Notes

### Test Fixtures

Used minimal test fixtures:

- Ports: LoggerPort, DatabasePort, UserServicePort
- Classes: ConsoleLogger, UserServiceImpl
- Mock implementations using vitest's `vi.fn()`

### Dependency Injection Verification

The class variant tests verify injection order by:

1. Creating adapter with requires array in specific order
2. Calling factory with named dependencies
3. Asserting constructor parameters match requires order

Example:

```typescript
const adapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  class: UserServiceImpl,
});

// Verify constructor receives: (logger, database)
const instance = adapter.factory({ Logger: mockLogger, Database: mockDatabase });
expect(instance.logger).toBe(mockLogger);
expect(instance.database).toBe(mockDatabase);
```

### Error Message Testing

Error tests verify both:

1. Correct error code (HEX019, HEX020)
2. Helpful hints in message text (custom instantiation, constructor injection, etc.)

This ensures errors are actionable for developers.

## Next Phase Readiness

**Ready for Phase 10 (Async Lifetime Constraint):**

- Runtime tests establish baseline behavior
- Tests can be extended for async factory validation
- Type-level async detection already working (09-02)

**No blockers or concerns.**

## Files Modified

### Created

- `packages/core/tests/unified-adapter.test.ts` (318 lines)
  - 18 runtime tests covering factory/class variants and errors

### Modified

- `packages/core/src/index.ts`
  - Changed createAdapter export from factory.js to unified.js
  - Added unified config type exports

## Metrics

- **Duration:** ~1 minute
- **Tests added:** 18
- **Test coverage:** Factory variant, class variant, error handling, defaults
- **Line count:** 318 lines (3.9x minimum requirement)
- **All tests passing:** ✓

---

_Plan completed: 2026-02-02_
_All success criteria met_
