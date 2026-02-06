---
phase: 23
plan: 02
subsystem: tracing-types
tags: [tracing, types, opentelemetry, w3c-trace-context]
requires: []
provides:
  - Span, SpanContext, SpanData, SpanOptions, SpanEvent interfaces
  - AttributeValue and Attributes types per OTel spec
  - SpanKind and SpanStatus enums
  - Type-safe tracing foundation with zero casts
affects: [23-03, 23-04, 23-05]
tech-stack:
  added: []
  patterns: [OpenTelemetry types, W3C Trace Context, readonly types]
key-files:
  created:
    - packages/tracing/src/types/span.ts
    - packages/tracing/src/types/attributes.ts
    - packages/tracing/src/types/status.ts
    - packages/tracing/src/types/index.ts
  modified: []
key-decisions:
  - AttributeValue uses union types for type safety without runtime overhead
  - All interfaces use readonly for immutability guarantees
  - SpanContext follows W3C Trace Context spec exactly (32 hex traceId, 16 hex spanId)
  - Comprehensive JSDoc on all public types per PERF-04 requirement
patterns-established:
  - Type-only modules with zero runtime footprint
  - Readonly types for immutability enforcement
  - Union types over enums for literal type safety
duration: 1.4min
completed: 2026-02-06
---

# Phase 23 Plan 02: Core Tracing Types Summary

**One-liner:** Complete OpenTelemetry-compliant type system with W3C Trace Context, zero type casts, comprehensive JSDoc

## Performance

**Execution:** 1.4 minutes for 4 type files, 2 commits
**Type safety:** Zero type casts, maximum type inference
**Documentation:** Comprehensive JSDoc with examples on all public APIs

## What We Built

### Type System Foundation

Implemented complete type system for distributed tracing:

**Span types (span.ts):**

- `SpanContext`: W3C Trace Context with traceId, spanId, traceFlags, traceState
- `SpanOptions`: Configuration for span creation (kind, attributes, links, startTime, root)
- `SpanEvent`: Point-in-time events during span execution
- `Span`: Active span interface with setAttribute, addEvent, setStatus, recordException, end
- `SpanData`: Immutable snapshot of completed spans for export

**Attribute types (attributes.ts):**

- `AttributeValue`: Union of string | number | boolean | homogeneous arrays
- `Attributes`: Readonly record for immutable metadata

**Status types (status.ts):**

- `SpanKind`: Literal union for internal, server, client, producer, consumer
- `SpanStatus`: Literal union for unset, ok, error

**Barrel export (index.ts):**

- Clean public API surface
- Single import point for all types

### Key Design Choices

1. **Union types over enums** - SpanKind and SpanStatus use literal unions for better type inference
2. **Readonly everywhere** - All interfaces and records are readonly for immutability
3. **No type casts** - Pure type definitions with zero runtime behavior
4. **W3C compliant** - SpanContext matches W3C Trace Context spec exactly
5. **OTel aligned** - AttributeValue and Span interface follow OpenTelemetry API

## Task Commits

| Task | Commit  | Description                      |
| ---- | ------- | -------------------------------- |
| 1-3  | 3773355 | Define span types and interfaces |
| 3    | a6e9120 | Create barrel export for types   |

**Note:** Tasks 1-2 were completed together as they form a cohesive unit (span.ts imports from attributes.ts and status.ts).

## Files Created

```
packages/tracing/src/types/
├── attributes.ts   (52 lines) - AttributeValue and Attributes types
├── status.ts       (56 lines) - SpanKind and SpanStatus types
├── span.ts         (247 lines) - Core span interfaces with full OTel API
└── index.ts        (14 lines) - Barrel export
```

**Total:** 369 lines of pure type definitions with comprehensive documentation

## Decisions Made

### Type Safety Approach

**Decision:** Use union types instead of enums for SpanKind and SpanStatus
**Rationale:** Better type inference, no runtime code, easier to extend
**Impact:** Consumers get literal type checking without enum imports

### Immutability Strategy

**Decision:** Readonly on all interfaces and types
**Rationale:** Prevents accidental mutation, enforces functional patterns
**Impact:** TypeScript enforces immutability at compile time

### Documentation Standard

**Decision:** Comprehensive JSDoc with examples on all public types
**Rationale:** PERF-04 requirement, enables IntelliSense and API docs
**Impact:** ~40% of code is documentation, excellent DX

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Type definitions compiled successfully with zero issues.

## Next Phase Readiness

### Ready for Phase 23 Plans 03-05

- ✅ All tracing types defined and exported
- ✅ Zero type casts used
- ✅ OTel and W3C specs followed exactly
- ✅ Comprehensive JSDoc completed

### Integration Points

- **Plan 23-01** (parallel): Port definitions will import these types
- **Plan 23-03**: Tracer port will use Span, SpanOptions, SpanContext
- **Plan 23-04**: NoopTracer will implement Span and Tracer interfaces
- **Plan 23-05**: Module-level span stack will use SpanContext

### Blockers

None. All types are independent and ready for use.

## Self-Check: PASSED
