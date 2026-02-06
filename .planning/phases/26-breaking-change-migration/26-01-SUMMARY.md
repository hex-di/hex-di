---
phase: 26
plan: 01
subsystem: core
tags: [breaking-change, tracing, cleanup, migration]
requires: []
provides:
  - "@hex-di/core without old tracing types (collectors, span)"
affects:
  - "26-02 (runtime tracing removal)"
  - "26-03 (downstream consumer updates)"
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - packages/core/src/index.ts
  deleted:
    - packages/core/src/collectors/composite.ts
    - packages/core/src/collectors/index.ts
    - packages/core/src/collectors/memory.ts
    - packages/core/src/collectors/noop.ts
    - packages/core/src/collectors/types.ts
    - packages/core/src/span/builder.ts
    - packages/core/src/span/index.ts
    - packages/core/src/span/metrics.ts
    - packages/core/src/span/types.ts
key-decisions:
  - "Inspection TracingAPI (inspection/tracing-types.ts) preserved -- separate module from old collector-based tracing"
patterns-established: []
duration: "~8 minutes"
completed: "2026-02-06"
---

# Phase 26 Plan 01: Remove Old Tracing Types from Core - Summary

**One-liner:** Deleted collectors/ and span/ directories from @hex-di/core, removing TraceCollector, MemoryCollector, NoOpCollector, CompositeCollector, ResolutionSpan, SpanBuilder, and MetricsCollector exports

## Task Commits

| Task | Name                                           | Commit  | Key Changes                                                   |
| ---- | ---------------------------------------------- | ------- | ------------------------------------------------------------- |
| 1    | Delete old tracing directories from core       | fa3fa52 | Removed collectors/ (5 files) and span/ (4 files) directories |
| 2    | Remove old tracing exports from core index     | e0c8a74 | Cleaned index.ts exports, updated module doc                  |
| 3    | Verify core package builds without old tracing | --      | Verification only: typecheck and build both pass              |

## What Was Done

### Task 1: Delete old tracing directories

- Removed `packages/core/src/collectors/` containing: composite.ts, index.ts, memory.ts, noop.ts, types.ts
- Removed `packages/core/src/span/` containing: builder.ts, index.ts, metrics.ts, types.ts
- These contained the old TraceCollector interface, MemoryCollector/NoOpCollector/CompositeCollector implementations, ResolutionSpan type, SpanBuilder class, and MetricsCollector

### Task 2: Remove old tracing exports from core index

- Removed entire "Collectors" export section (TraceCollector, TraceSubscriber, Unsubscribe, MemoryCollector, NoOpCollector, CompositeCollector)
- Removed entire "Span" export section (ResolutionSpan, SpanBuilder, toSpan, getSelfTime, getSpanDepth, countSpans, ContainerMetrics, LifetimeMetrics, PortMetrics, MetricsCollector, fromTraceStats)
- Updated module JSDoc to remove old tracing bullet points
- Preserved inspection TracingAPI (from inspection/tracing-types.ts) which is a separate, current module

### Task 3: Verify core package builds

- `pnpm --filter @hex-di/core typecheck` passed
- `pnpm --filter @hex-di/core build` passed

## Decisions Made

1. **Inspection TracingAPI preserved**: The `TracingAPI` type exported from `./inspection/tracing-types.js` is part of the container inspection system, not the old collector-based tracing. It was kept intact as it serves a different purpose.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- [x] No collectors/ directory in packages/core/src/
- [x] No span/ directory in packages/core/src/
- [x] packages/core/src/index.ts has no TraceCollector, MemoryCollector, NoOpCollector, CompositeCollector, ResolutionSpan exports
- [x] pnpm --filter @hex-di/core typecheck passes
- [x] pnpm --filter @hex-di/core build passes

## Success Criteria

- [x] MIGR-01 complete: TraceCollector, ResolutionSpan types removed from @hex-di/core
- [x] MIGR-04 partially complete: MemoryCollector, NoOpCollector, CompositeCollector removed from @hex-di/core
- [x] @hex-di/core package builds independently without old tracing

## Next Phase Readiness

Downstream packages (runtime, integrations) that import these deleted types will now have build errors. These are expected and will be resolved in subsequent plans (26-02 through 26-05).

## Self-Check: PASSED
