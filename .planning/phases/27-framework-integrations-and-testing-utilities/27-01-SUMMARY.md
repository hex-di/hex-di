# Phase 27 Plan 01: Test Utilities Foundation Summary

---

phase: 27
plan: 01
subsystem: testing
tags:

- tracing
- testing
- assertions
- matchers
  requires:
- 23-core-tracing-foundation
- 24-container-instrumentation
  provides:
- assertSpanExists function for finding spans by criteria
- hasAttribute, hasEvent, hasStatus, hasDuration predicates
- @hex-di/tracing/testing export namespace
  affects:
- 27-02-hono-tracing-middleware
- 27-03-react-tracing-utilities
- 27-04-comprehensive-testing-guide
  tech-stack:
  added: []
  patterns: - Pure function predicates for composable span matching - Descriptive error messages with diagnostic context - Tree-shakeable testing utilities via separate export namespace
  key-files:
  created: - packages/tracing/src/testing/assertions.ts - packages/tracing/src/testing/matchers.ts - packages/tracing/src/testing/index.ts - packages/tracing/tests/unit/assertions.test.ts - packages/tracing/tests/unit/matchers.test.ts
  modified: - packages/tracing/src/index.ts - packages/tracing/tests/integration/tracing.test.ts
  decisions:
- SpanMatcher interface with optional criteria (name, status, attributes, hasEvent, minDuration)
- RegExp support for name matching alongside string exact match
- Error messages include both search criteria and available spans for debugging
- Pure functions with no side effects for all matchers
- Separate testing namespace (@hex-di/tracing/testing) for tree-shaking
  metrics:
  duration: 3 minutes
  completed: 2026-02-06

---

**Test utilities foundation for verifying tracing behavior with assertSpanExists and matcher predicates**

## What Was Built

Created comprehensive test assertion helpers and span matcher predicates for verifying distributed tracing behavior in tests. Fulfills TEST-02 (assertSpanExists) and TEST-03 (span matchers) requirements.

### Implementation Details

**1. Assertion Helpers (assertions.ts)**

- `assertSpanExists(spans, matcher)` - Finds spans matching criteria, throws descriptive error if not found
- `SpanMatcher` interface with optional criteria fields
- Supports name matching (string exact or RegExp pattern)
- Supports status, attributes, hasEvent, minDuration matching
- Error messages include search criteria and available span names

**2. Span Matcher Predicates (matchers.ts)**

- `hasAttribute(span, key, value?)` - Check attribute presence/value
- `hasEvent(span, name)` - Check event presence by name
- `hasStatus(span, status)` - Check span status
- `hasDuration(span, minMs?, maxMs?)` - Check duration bounds
- All predicates are pure functions returning boolean

**3. Export Strategy**

- Created testing/index.ts for namespace exports
- Updated main index.ts to export testing utilities
- Tree-shakeable design - testing utilities in separate import path
- Added JSDoc documentation for all public functions

**4. Comprehensive Test Coverage**

- 27 tests for assertSpanExists covering all matchers
- 40 tests for predicate functions covering edge cases
- Tests verify purity (no mutations)
- Tests verify descriptive error messages
- Updated integration tests to verify new exports

## Task Commits

| Task | Description                  | Commit  | Files                                              |
| ---- | ---------------------------- | ------- | -------------------------------------------------- |
| 1-3  | Implement test utilities     | e954059 | assertions.ts, matchers.ts, testing/index.ts, etc. |
| 4    | Add comprehensive unit tests | 15507f2 | assertions.test.ts, matchers.test.ts               |

## Verification Results

```bash
# Type checking - PASSED
pnpm --filter @hex-di/tracing typecheck
# No errors

# Tests - PASSED
pnpm --filter @hex-di/tracing test
# Test Files: 8 passed (8)
# Tests: 223 passed (223)

# Lint - PASSED
pnpm --filter @hex-di/tracing lint
# 2 pre-existing warnings in type-guards.ts (not new code)
```

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision                                     | Rationale                                                     | Impact                                               |
| -------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| SpanMatcher interface with optional criteria | Flexible matching - specify only needed criteria              | Simple API for common cases, composable for complex  |
| RegExp support for name matching             | Enable pattern matching like `/^GET /` for HTTP verbs         | More powerful than string-only matching              |
| Include available spans in error messages    | Better test debugging when assertions fail                    | Developers see what spans exist vs what was expected |
| Pure functions for all matchers              | Composable, testable, no surprising side effects              | Can combine matchers with && and \|\| operators      |
| Separate @hex-di/tracing/testing namespace   | Tree-shaking - production code doesn't include test utilities | Smaller bundle size for production builds            |

## Integration Points

- **With MemoryTracer**: `tracer.getCollectedSpans()` → `assertSpanExists(spans, matcher)`
- **With test frameworks**: Integrates seamlessly with vitest, jest, etc.
- **Future middleware tests**: Hono and React utilities can use these helpers

## Next Phase Readiness

**Phase 27-02 (Hono Tracing Middleware):**

- ✅ Test utilities available for middleware verification
- ✅ assertSpanExists can validate HTTP request spans
- ✅ hasAttribute can check http.\* attributes

**Phase 27-03 (React Tracing Utilities):**

- ✅ Test utilities available for component span verification
- ✅ Matchers can validate component lifecycle spans

**Phase 27-04 (Testing Guide):**

- ✅ Complete API surface documented via JSDoc
- ✅ Example usage in unit tests serves as documentation
- ✅ All patterns established (pure functions, descriptive errors, tree-shaking)

No blockers or concerns for next phases.

## Self-Check: PASSED

All created files verified:

- packages/tracing/src/testing/assertions.ts ✓
- packages/tracing/src/testing/matchers.ts ✓
- packages/tracing/src/testing/index.ts ✓
- packages/tracing/tests/unit/assertions.test.ts ✓
- packages/tracing/tests/unit/matchers.test.ts ✓

All commits verified:

- e954059 ✓
- 15507f2 ✓
