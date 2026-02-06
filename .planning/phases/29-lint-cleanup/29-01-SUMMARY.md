---
phase: 29-lint-cleanup
plan: 01
subsystem: testing
tags: [eslint, lint, type-guards, tracing, otel, datadog, hono]

# Dependency graph
requires:
  - phase: 23-28
    provides: tracing packages with lint warnings from v7.0
provides:
  - Zero lint warnings across @hex-di/hono, @hex-di/tracing, @hex-di/tracing-otel, @hex-di/tracing-datadog
  - Type guard patterns for Headers API and timer functions
  - Safe accessor patterns for Hono context properties
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HeadersLike/SetTimeoutLike/ClearTimeoutLike interfaces for type-safe global API access"
    - "Ref object pattern { current: any } for deferred assignment in test closures"
    - "every() predicate pattern for safe array element validation without unsafe indexing"
    - "Promise.resolve().then() pattern for synchronous SpanExporter implementations"

key-files:
  created: []
  modified:
    - integrations/hono/src/tracing-middleware.ts
    - packages/tracing/src/utils/type-guards.ts
    - packages/tracing/tests/integration/instrumentation/cross-container.test.ts
    - packages/tracing-otel/src/utils/globals.ts
    - packages/tracing-datadog/src/bridge.ts
    - packages/tracing-datadog/tests/unit/datadog-bridge.test.ts

key-decisions:
  - "HeadersLike interface with forEach signature for Hono request header iteration"
  - "getResponseStatus helper to safely extract status from Hono response (avoids any propagation from Context generic)"
  - "Ref object pattern for test closures needing deferred container assignment"
  - "Promise.resolve().then() instead of async/await for synchronous SpanExporter.export()"

patterns-established:
  - "Type guard narrowing for globalThis APIs (extends getConsole pattern to setTimeout/clearTimeout)"
  - "Ref object pattern for test factories capturing containers created after adapter definition"

# Metrics
duration: 6min
completed: 2026-02-07
---

# Phase 29 Plan 01: Lint Cleanup Summary

**Zero lint warnings across 4 tracing packages by adding type guards for Headers, timers, and response status, plus safe array validation patterns**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-06T23:32:05Z
- **Completed:** 2026-02-06T23:38:35Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Eliminated all 18 lint warnings across @hex-di/hono (7), @hex-di/tracing (7), @hex-di/tracing-otel (2), and @hex-di/tracing-datadog (2)
- All fixes comply with CLAUDE.md rules: no any types in production, no casts, no eslint-disable
- All 405 tests passing across affected packages (26 hono + 310 tracing + 52 otel + 17 datadog)
- Full typecheck passing across all 18 workspace packages

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Hono middleware Headers API warnings** - `faf05b7` (fix)
2. **Task 2: Fix tracing package type-guards and test warnings** - `9328465` (fix)
3. **Task 3: Fix OTel and DataDog backend warnings** - `e982786` (fix)

## Files Created/Modified

- `integrations/hono/src/tracing-middleware.ts` - Added HeadersLike, isHeadersLike, getResponseStatus for safe context property access
- `packages/tracing/src/utils/type-guards.ts` - Refactored array validation to use every() predicate pattern
- `packages/tracing/tests/integration/instrumentation/cross-container.test.ts` - Converted let container refs to const ref objects
- `packages/tracing-otel/src/utils/globals.ts` - Added SetTimeoutLike/ClearTimeoutLike interfaces and type guards
- `packages/tracing-datadog/src/bridge.ts` - Converted async export to Promise.resolve().then() pattern
- `packages/tracing-datadog/tests/unit/datadog-bridge.test.ts` - Prefixed unused mock parameter with underscore

## Decisions Made

- Used HeadersLike interface approach (forEach signature) rather than full Headers type to keep the guard minimal
- Narrowed context.req.raw to unknown before accessing .headers to break the error-typed chain from Hono's any generic
- Used getResponseStatus helper instead of inlining narrowing for context.res to keep middleware logic readable
- Chose Promise.resolve().then() over keeping async+await for DataDog export since the implementation is purely synchronous
- Used ref object pattern { current: any } for test closures to satisfy prefer-const without restructuring test setup order

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All tracing and integration packages now lint-clean
- Pre-existing warnings in core/runtime/flow (38 warnings) remain as separate backlog items
- Phase 29 can continue with additional lint cleanup plans if needed

## Self-Check: PASSED

---

_Phase: 29-lint-cleanup_
_Completed: 2026-02-07_
