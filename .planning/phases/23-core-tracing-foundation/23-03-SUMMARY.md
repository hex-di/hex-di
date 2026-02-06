---
phase: 23-core-tracing-foundation
plan: "03"
subsystem: tracing-adapters
tags: [tracing, noop, adapter, performance, singleton]

dependency_graph:
  requires:
    - 23-01 # Port definitions (TracerPort)
    - 23-02 # Core types (Span, SpanContext, Tracer interfaces)
  provides:
    - NoOpTracerAdapter with zero runtime overhead
    - Singleton frozen span and tracer instances
    - Zero-allocation tracing implementation
  affects:
    - 23-04 # Can use NoOpTracerAdapter as default/fallback
    - 24-XX # Container integration can test with NoOp adapter
    - 25-XX # OTel adapter can be compared against NoOp baseline

tech_stack:
  added: []
  patterns:
    - "Singleton pattern with Object.freeze() for zero allocation"
    - "createAdapter factory pattern for port implementation"
    - "Barrel exports for clean public API"

key_files:
  created:
    - packages/tracing/src/adapters/noop/tracer.ts
    - packages/tracing/src/adapters/noop/adapter.ts
    - packages/tracing/src/adapters/noop/index.ts
  modified: []

decisions:
  - id: noop-singleton-pattern
    context: "NoOp tracer needs zero runtime overhead"
    decision: "Use Object.freeze() on singleton instances"
    rationale: "Prevents allocations, mutations, and ensures maximum performance"
    alternatives:
      - "Create new instances each time (rejected: allocations)"
      - "Use Proxy for no-op behavior (rejected: overhead)"

  - id: noop-method-returns
    context: "Span mutation methods need to support chaining"
    decision: "Return NOOP_SPAN singleton from all mutation methods"
    rationale: "Allows method chaining without allocating new objects"
    alternatives:
      - "Return void (rejected: breaks chaining pattern)"
      - "Return new span each time (rejected: allocations)"

  - id: noop-tracer-lifetime
    context: "Adapter needs to specify lifetime"
    decision: "Use singleton lifetime for NoOpTracerAdapter"
    rationale: "One frozen instance is sufficient for entire container"
    alternatives:
      - "Transient (rejected: unnecessary recreations)"
      - "Scoped (rejected: no per-scope state needed)"

metrics:
  duration: 103s
  completed: 2026-02-06
---

# Phase 23 Plan 03: NoOp Tracer Adapter Summary

**One-liner:** Zero-overhead NoOp tracer adapter with frozen singleton instances and no allocations

## What Was Built

Implemented a production-ready NoOp tracer adapter that provides zero runtime overhead for disabled tracing environments:

1. **NOOP_SPAN_CONTEXT** - Zero trace context (all-zeros traceId/spanId/traceFlags)
2. **NOOP_SPAN** - Frozen singleton span that performs no operations
3. **NOOP_TRACER** - Frozen singleton tracer returning NOOP_SPAN
4. **NoOpTracerAdapter** - Adapter implementing TracerPort with no dependencies

**Zero-overhead guarantees:**

- No allocations after initialization (returns same frozen singleton)
- No timing calls (no Date.now(), no performance.now())
- No state mutations (Object.freeze() on all singletons)
- No-op methods return immediately without side effects

## Task Commits

| Task | Description                            | Commit  | Files Modified       |
| ---- | -------------------------------------- | ------- | -------------------- |
| 1    | Create NoOp span and tracer singletons | a8892ef | tracer.ts            |
| 2    | Create NoOpTracerAdapter               | 4051e83 | adapter.ts, index.ts |

## Decisions Made

### NoOp Singleton Pattern

Used Object.freeze() on all singleton instances to guarantee zero allocations and prevent mutations. This ensures that the NoOp tracer has literally zero runtime overhead compared to not having tracing at all.

### Method Return Strategy

All Span mutation methods (setAttribute, setAttributes, addEvent, etc.) return the NOOP_SPAN singleton itself. This supports method chaining without allocating new objects, maintaining zero-overhead while preserving the fluent API.

### Singleton Lifetime

The NoOpTracerAdapter uses singleton lifetime since one frozen tracer instance is sufficient for the entire container. No per-scope state or per-request state is needed.

## Verification Performed

- ✅ TypeScript type checking passes (`pnpm --filter @hex-di/tracing typecheck`)
- ✅ Object.freeze() used on all singletons (NOOP_SPAN_CONTEXT, NOOP_SPAN, NOOP_TRACER)
- ✅ startSpan() returns same NOOP_SPAN instance every time (singleton reuse)
- ✅ No timing function calls in implementation (no Date.now(), no performance.now())
- ✅ isRecording() returns false to signal disabled tracing
- ✅ createAdapter() pattern correctly implements TracerPort
- ✅ Barrel exports provide clean public API

## Success Criteria Met

- ✅ Zero allocations after initialization (frozen singletons reused)
- ✅ No timing calls (no Date.now, performance.now)
- ✅ Singleton span reused for all operations (NOOP_SPAN returned by startSpan)
- ✅ isRecording() returns false
- ✅ Object.freeze() used on all singletons

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**Exports for downstream use:**

- `NoOpTracerAdapter` - Primary adapter for TracerPort
- `NOOP_TRACER` - Singleton for testing and validation
- `NOOP_SPAN` - Singleton for identity checks in tests

**Dependencies:**

- `@hex-di/core` - createAdapter() factory
- `../../ports/tracer.js` - TracerPort definition
- `../../types/` - Span, SpanContext, Tracer interfaces

## Next Phase Readiness

**Ready for:**

- Phase 23-04: Can serve as default/fallback adapter
- Phase 24: Container integration can test with NoOp adapter
- Phase 25: OTel adapter can be performance-compared against NoOp baseline

**Blockers:** None

**Concerns:** None

## Notes

The NoOp adapter provides a production-ready solution for environments where tracing is disabled. The zero-overhead design ensures that instrumented code has no performance impact when tracing is turned off.

**Performance characteristics:**

- Memory: One-time allocation of 3 frozen objects
- CPU: Zero overhead (all methods return immediately)
- Allocations: Zero after initialization
- Timing: Zero timing calls

This adapter serves as both a production solution and a performance baseline for comparing against real tracing implementations.

## Self-Check: PASSED

All files created and commits verified:

- ✅ packages/tracing/src/adapters/noop/tracer.ts exists
- ✅ packages/tracing/src/adapters/noop/adapter.ts exists
- ✅ Commits matching "23-03" found in git log
