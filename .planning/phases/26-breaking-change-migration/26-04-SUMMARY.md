---
phase: 26
plan: 04
subsystem: examples
tags: [tracing, migration, examples, instrumentContainer, MemoryTracer]
requires: ["26-01", "26-02"]
provides: ["migrated-examples"]
affects: ["26-05"]
tech-stack:
  added: []
  patterns:
    - "instrumentContainer() + createMemoryTracer() pattern for tracing in examples"
key-files:
  created: []
  modified:
    - "examples/react-showcase/tests/tracing.test.ts"
    - "examples/react-showcase/src/App.tsx"
    - "examples/react-showcase/src/di/root-graph.ts"
    - "examples/react-showcase/package.json"
  deleted:
    - "examples/react-showcase/tests/tracing.test.js"
    - "examples/react-showcase/tests/tracing.test.js.map"
key-decisions:
  - id: "26-04-01"
    decision: "Tracing test uses instrumentContainer() + createMemoryTracer() pattern"
    rationale: "Direct replacement for old container.tracer API; tests verify spans are created for resolutions"
  - id: "26-04-02"
    decision: "@hex-di/tracing added as devDependency (test-only usage in react-showcase)"
    rationale: "Tracing import only used in test file, not in production app code"
patterns-established:
  - "instrumentContainer(container, tracer) for adding tracing to containers"
  - "tracer.getCollectedSpans() for asserting on recorded spans in tests"
duration: "~8 minutes"
completed: "2026-02-06"
---

# Phase 26 Plan 04: Migrate Examples to New Tracing API Summary

**One-liner:** Migrated react-showcase tracing tests from container.tracer to instrumentContainer() + createMemoryTracer() from @hex-di/tracing

## Objective

Update all examples to use the new @hex-di/tracing API instead of old container.tracer pattern, ensuring examples serve as migration guides for users.

## What Was Done

### Task 1: Inventory of Tracing Usage

Found old tracing patterns in two locations:

- **hono-todo**: No tracing usage at all -- no migration needed
- **react-showcase**: Had old tracing references in:
  - `tests/tracing.test.ts` -- used `container.tracer` property (removed in 26-02)
  - `tests/tracing.test.js` + `.js.map` -- stale compiled JS from older API version
  - `src/App.tsx` -- comments referencing `container.tracer` and "built-in tracing"
  - `src/di/root-graph.ts` -- JSDoc showing old `TracingPlugin`/`pipe` pattern

### Task 2: Migration to New API

1. **Rewrote `tracing.test.ts`**: Replaced 4 tests using `container.tracer` with 4 new tests using `instrumentContainer()` + `createMemoryTracer()`:
   - `should install tracing hooks on a container` -- verifies cleanup function returned
   - `should capture spans when services are resolved` -- verifies SpanData with `resolve:UserSession` name
   - `should capture span metadata correctly` -- verifies context.traceId, spanId, kind, status, hex-di attributes
   - `should stop capturing after cleanup` -- verifies hooks are removed

2. **Deleted stale compiled files**: `tracing.test.js` and `.js.map` from old compilation

3. **Updated comments in App.tsx**: Replaced "built-in tracing" and "container.tracer" references with "instrumentContainer() from @hex-di/tracing"

4. **Updated root-graph.ts JSDoc**: Replaced old `TracingPlugin`/`pipe`/`createPluginWrapper` example with new `instrumentContainer()` pattern

5. **Added dependency**: `@hex-di/tracing: workspace:*` in react-showcase devDependencies

### Task 3: Build Verification

- `pnpm --filter @hex-di/hono-todo typecheck` -- PASS
- `pnpm --filter @hex-di/react-showcase typecheck` -- PASS
- `pnpm --filter @hex-di/react-showcase test -- tests/tracing.test.ts` -- 4/4 tests PASS

## Task Commits

| Task | Name                                | Commit       | Key Files                                             |
| ---- | ----------------------------------- | ------------ | ----------------------------------------------------- |
| 1-2  | Migrate examples to new tracing API | ec5bf23      | tracing.test.ts, App.tsx, root-graph.ts, package.json |
| 3    | Verify examples build               | (no changes) | typecheck + tests pass                                |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- [x] No references to `container.tracer` in any example
- [x] No calls to `trace()` or `enableTracing()` in examples
- [x] Examples using tracing import from `@hex-di/tracing`
- [x] Examples typecheck passes (both hono-todo and react-showcase)
- [x] Tracing tests pass (4/4)

## Success Criteria

- [x] MIGR-08 complete: All examples updated to use new tracing API
- [x] Examples serve as migration guides showing the new pattern
- [x] No regressions in example functionality (beyond pre-existing issues)

## Next Phase Readiness

Plan 26-05 (final verification) can proceed. All examples are clean of old tracing references.

## Self-Check: PASSED
