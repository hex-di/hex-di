---
phase: 04-api-ergonomics
plan: 03
subsystem: core-api
tags: [testing, builder-pattern, api-ergonomics]
dependency-graph:
  requires: ["04-01", "04-02"]
  provides: ["test-coverage-builder-api"]
  affects: []
tech-stack:
  added: []
  patterns: [vitest-testing, type-safe-tests]
key-files:
  created:
    - packages/core/tests/builder.test.ts
    - packages/core/tests/from-class.test.ts
  modified: []
decisions: []
metrics:
  duration: 4 min
  completed: 2026-02-01
---

# Phase 4 Plan 3: Export APIs and Add Tests Summary

Comprehensive test suites for ServiceBuilder and fromClass APIs with 56 tests total covering all builder methods and integration scenarios.

## What Was Done

### Task 1: Update Exports in index.ts

Already completed in plan 04-02. Verified that index.ts exports:

- `ServiceBuilder` class from `./adapters/builder.js`
- `fromClass`, `ClassAdapterBuilder`, `ClassServiceBuilder` from `./adapters/from-class.js`

### Task 2: Add ServiceBuilder Tests

Created comprehensive test suite in `packages/core/tests/builder.test.ts`:

**Test Coverage (28 tests):**

- `ServiceBuilder.create()` - curried factory pattern, default singleton lifetime, builder immutability
- Lifetime methods - `.singleton()`, `.scoped()`, `.transient()`, immutability, last-wins behavior
- `.requires()` - single/multiple dependencies, replacement behavior, immutability
- `.factory()` - port/adapter tuple creation, deps passing, frozen tuple
- `defineService()` builder entry point - curried function, full chain support

**Key Test Patterns:**

```typescript
// Builder creation and factory
const [port, adapter] = ServiceBuilder.create<Logger>()("Logger")
  .scoped()
  .requires(ConfigPort)
  .factory(({ Config }) => new LoggerImpl(Config));

// Verifies: port name, adapter lifetime, requires array, frozen result
```

### Task 3: Add fromClass Tests

Created comprehensive test suite in `packages/core/tests/from-class.test.ts`:

**Test Coverage (28 tests):**

- `fromClass()` entry point - constructor capture, builder type
- `.as('Name')` - port naming, ClassServiceBuilder return, frozen builder
- Lifetime methods - all three lifetimes, default singleton, immutability
- `.requires()` - dependency capture, replacement behavior, zero deps
- `.build()` - tuple creation, class instantiation, frozen result
- Constructor injection order - requires order maps to constructor args

**Key Test Pattern:**

```typescript
// Class with loose typing for fromClass compatibility
class UserServiceImpl implements UserService {
  constructor(...args: readonly unknown[]) {
    this.db = args[0] as Database;
    this.logger = args[1] as Logger;
  }
}

const [port, adapter] = fromClass(UserServiceImpl)
  .as("UserService")
  .scoped()
  .requires(DatabasePort, LoggerPort)
  .build();
```

## Verification Results

All verification criteria passed:

- `pnpm --filter @hex-di/core typecheck` - clean
- `pnpm --filter @hex-di/core lint` - clean
- `pnpm --filter @hex-di/core test` - 56 tests pass
- `pnpm --filter @hex-di/core build` - successful

## Deviations from Plan

### Type Constraint Issue in fromClass

**Issue:** The plan specified testing `.as<Logger>('Logger')` with interface type narrowing, but this requires the constraint `TService extends TInstance`. In TypeScript, `Logger extends ConsoleLogger` is false (even though `ConsoleLogger implements Logger`), so the interface narrowing overload doesn't work as documented.

**Workaround:** Tests use `.as('Logger')` without type parameter. The interface narrowing feature has a design limitation that should be addressed in a future plan.

### Constructor Typing for fromClass

**Issue:** Classes with typed constructor parameters don't satisfy `new (...args: readonly unknown[]) => unknown`.

**Workaround:** Test classes use rest parameters with unknown types:

```typescript
class UserServiceImpl {
  constructor(...args: readonly unknown[]) { ... }
}
```

This is a known limitation of the fromClass API design.

## Technical Notes

1. **Immutability Verification:** All builder methods return frozen instances, verified through `Object.isFrozen()` assertions
2. **Tuple Freezing:** Both `factory()` and `build()` return frozen [Port, Adapter] tuples
3. **Method Chaining Order:** Tests verify lifetime and requires can be called in any order

## Commits

| Hash    | Description                                                       |
| ------- | ----------------------------------------------------------------- |
| e8677d8 | test(04-03): add ServiceBuilder and fromClass comprehensive tests |

## Files Changed

| File                                   | Change  | Lines |
| -------------------------------------- | ------- | ----- |
| packages/core/tests/builder.test.ts    | Created | 367   |
| packages/core/tests/from-class.test.ts | Created | 438   |

## Success Criteria Verification

- [x] All new APIs exported from @hex-di/core (verified in 04-02)
- [x] ServiceBuilder has 28 tests (requirement: 10+)
- [x] fromClass has 28 tests (requirement: 8+)
- [x] Type inference verified in tests
- [x] No regressions in existing tests
