---
phase: "03"
plan: "03"
subsystem: runtime-core
tags:
  - request-scope
  - http
  - lifetime
  - captive-dependency
dependency-graph:
  requires:
    - "03-01" # Added 'request' lifetime to Lifetime type
    - "03-02" # withOverrides context implementation
  provides:
    - RequestScopeImpl class for HTTP request isolation
    - createRequestScope method on Container type
    - Captive dependency validation for 'request' lifetime
  affects:
    - "03-04" # RequestScopeProvider integration
tech-stack:
  added: []
  patterns:
    - Request-scoped service lifecycle management
    - Lifetime hierarchy mapping (request = scoped level)
key-files:
  created:
    - packages/runtime/src/scope/request-scope.ts
  modified:
    - packages/runtime/src/types.ts
    - packages/runtime/src/container/factory.ts
    - packages/runtime/src/container/wrappers.ts
    - packages/runtime/src/container/base-impl.ts
    - packages/runtime/src/resolution/core.ts
    - packages/core/src/inspection/inspector-types.ts
    - packages/graph/src/validation/types/captive/lifetime-constants.ts
    - packages/graph/src/validation/types/captive/lifetime-level.ts
    - packages/graph/src/graph/inspection/runtime-captive-detection.ts
    - packages/runtime/src/captive-dependency.ts
decisions:
  - id: request-equals-scoped-level
    title: Request lifetime shares level with Scoped
    rationale: Both represent bounded contexts with similar duration semantics
metrics:
  duration: ~12 minutes
  completed: 2026-02-01
---

# Phase 03 Plan 03: Request Scope Implementation Summary

**One-liner:** RequestScopeImpl for HTTP request isolation with request-scoped service caching and captive dependency validation.

## What Was Built

### Task 1: Create RequestScope Implementation

- Created `RequestScopeImpl` class in `packages/runtime/src/scope/request-scope.ts`
- Provides HTTP request isolation with per-request service caching
- Generates unique request IDs for tracing/logging
- Supports nested request contexts via child scopes
- Updated `getMemoForLifetime` in `core.ts` to handle 'request' lifetime (maps to scopedMemo)
- Request-scoped services use the same memoization pattern as scoped services

### Task 2: Add createRequestScope to Container Type

- Added `createRequestScope` method signature to `ContainerMembers` type in `types.ts`
- Created `createRootRequestScope` helper in `factory.ts` for root containers
- Added `createRequestScope` to both uninitialized and initialized container wrappers
- Added `createChildContainerRequestScope` helper in `wrappers.ts` for child containers
- Updated `BaseContainerImpl` to accept `DisposableChild` interface for scope registration
- Updated `AdapterInfo` in `@hex-di/core` to use `Lifetime` type (now includes 'request')

### Task 3: Update Captive Dependency Validation

- Added `REQUEST_LEVEL = 2` constant to `lifetime-constants.ts`
- Updated `LifetimeLevel` type to map 'request' to `REQUEST_LEVEL` (same as scoped)
- Updated `DiagnosticLifetimeLevel` type with 'request' branch
- Updated `LIFETIME_LEVELS` runtime map in `runtime-captive-detection.ts`
- Updated documentation in `captive-dependency.ts` to include request lifetime

## Key Decisions

### Request Lifetime = Scoped Level

Request and scoped lifetimes share the same hierarchy level (level 2) because:

- Both represent bounded contexts that eventually end
- Both are shorter-lived than singleton but longer-lived than transient
- Allows request-scoped and scoped services to depend on each other without captive dependency warnings

## Commits

| Hash    | Message                                                                  |
| ------- | ------------------------------------------------------------------------ |
| f556ebd | feat(03-03): create RequestScope implementation                          |
| 7912b7e | feat(03-03): add createRequestScope to Container type                    |
| 5e4b1f6 | feat(03-03): update captive dependency validation for 'request' lifetime |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed AdapterInfo Lifetime type**

- **Found during:** Task 2
- **Issue:** `AdapterInfo` in `@hex-di/core` used hardcoded `"singleton" | "scoped" | "transient"` instead of `Lifetime` type
- **Fix:** Updated to use `Lifetime` type which includes 'request'
- **Files modified:** packages/core/src/inspection/inspector-types.ts
- **Commit:** 7912b7e

**2. [Rule 1 - Bug] Fixed scope registration type compatibility**

- **Found during:** Task 2
- **Issue:** `BaseContainerImpl.registerChildScope` only accepted `ScopeImpl`, not `RequestScopeImpl`
- **Fix:** Changed parameter type to `DisposableChild` interface
- **Files modified:** packages/runtime/src/container/base-impl.ts
- **Commit:** 7912b7e

**3. [Rule 2 - Missing Critical] Updated Lifetime type tests**

- **Found during:** Task 3
- **Issue:** Test files asserted Lifetime as 3-value union, missing 'request'
- **Fix:** Updated test assertions to include 'request' lifetime
- **Files modified:** packages/graph/tests/adapter.test-d.ts, packages/graph/tests/exports.test.ts
- **Commit:** 5e4b1f6

## Verification

- TypeScript compilation: PASSED (all packages)
- Runtime tests: PASSED (433 tests in @hex-di/runtime)
- Graph tests: PASSED (1844 tests in @hex-di/graph)
- ESLint: PASSED (no errors)

## Next Phase Readiness

### Ready for 03-04

- RequestScopeImpl is fully implemented
- Container.createRequestScope() is available
- Captive dependency validation correctly handles 'request' lifetime
- Request ID generation provides tracing capability

### Integration Points

- Request scopes can be created from any container (root or child)
- Request-scoped services are cached per-request
- Disposal cleans up all request-scoped instances
- Lifecycle events (disposing/disposed) are emitted
