# Phase 18: Testing

**Goal:** Hook and core tracing/inspection APIs have comprehensive test coverage documenting expected behavior.

## Plans

| Plan  | Description            | Wave | Files                             | Status  |
| ----- | ---------------------- | ---- | --------------------------------- | ------- |
| 18-01 | Resolution Hook Tests  | 1    | resolution-hooks.test.ts [CREATE] | PLANNED |
| 18-02 | Hook Composition Tests | 1    | hook-composition.test.ts [CREATE] | PLANNED |
| 18-03 | Inspector API Tests    | 2    | inspector.test.ts [MODIFY]        | PLANNED |
| 18-04 | Tracer API Tests       | 2    | tracer.test.ts [CREATE]           | PLANNED |

## Execution Strategy

### Wave 1 (Parallel)

- **18-01**: Create comprehensive resolution hook tests (28 scenarios)
- **18-02**: Create hook composition and ordering tests (11 scenarios)

Both plans can execute in parallel as they create new test files with no dependencies.

### Wave 2 (Parallel)

- **18-03**: Expand inspector.test.ts with lifecycle and hierarchy tests (8 new scenarios)
- **18-04**: Create tracer API tests with filtering and metrics (16 scenarios)

Both plans can execute in parallel as they work on different test areas.

## Requirements Coverage

- **TEST-01**: Resolution hook tests (28 tests) ✓ Plan 18-01
- **TEST-02**: Hook composition tests (11 tests) ✓ Plan 18-02
- **TEST-03**: Inspector API tests (integrated) ✓ Plan 18-03
- **TEST-04**: Tracer API tests (integrated) ✓ Plan 18-04

## Total Test Coverage

- New test files: 3 (resolution-hooks, hook-composition, tracer)
- Modified test files: 1 (inspector)
- Total new tests: 63 scenarios
- Estimated new code: ~2100 lines

## Success Metrics

1. ✅ Resolution hook tests cover 20+ scenarios (28 provided)
2. ✅ Hook composition tests verify 10+ patterns (11 provided)
3. ✅ Inspector API tests cover integrated API with lifecycle/hierarchy
4. ✅ Tracer API tests cover filtering, metrics, and cross-scope

## Dependencies

- Phases 15-17 complete (testing final consolidated API surface)
- No external dependencies
- All tests use existing @hex-di/core and @hex-di/runtime APIs

## Phase Context Applied

From /gsd:discuss-phase decisions:

- ✅ Error propagation AND cleanup guarantees tested (Plan 18-01)
- ✅ FIFO ordering as documented contract (Plans 18-01, 18-02)
- ✅ Parity tests for hook registration methods (Plan 18-01)
- ✅ Cross-scope testing for inspector and tracer (Plans 18-03, 18-04)
- ✅ Realistic dependency graphs with actual adapters (all plans)
- ✅ Mid-resolution edge cases covered (Plan 18-02)
