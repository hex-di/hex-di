# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** Catch dependency graph errors at compile time, not runtime
**Current focus:** v7.0 Distributed Tracing

## Current Position

Phase: 26 of 27 (Breaking Change Migration)
Plan: 5 of 5
Status: Phase complete
Last activity: 2026-02-06 -- Completed 26-05-PLAN.md (Final verification and cleanup)

Progress: [█████████░] 80%

## Milestone History

| Milestone | Phases | Status  | Shipped    |
| --------- | ------ | ------- | ---------- |
| v1.1      | 1-2    | Shipped | 2026-02-01 |
| v1.2      | 3-5    | Shipped | 2026-02-01 |
| v2.0      | 6-8    | Shipped | 2026-02-02 |
| v3.0      | 9-11   | Shipped | 2026-02-02 |
| v4.0      | 12-14  | Shipped | 2026-02-03 |
| v5.0      | 15-19  | Shipped | 2026-02-05 |
| v6.0      | 20-22  | Shipped | 2026-02-06 |
| v7.0      | 23-27  | Active  | --         |

## Performance Metrics

**Velocity (all milestones):**

- Total plans completed: 80
- Total phases: 26 (phase 26 complete)
- Total milestones: 7

## Accumulated Context

### Decisions

Key decisions captured in PROJECT.md (23 decisions across 7 milestones).

**v7.0 key decisions:**

- Centralized Tree-Walking Subscription (NOT tracer propagation)
- No changes to @hex-di/runtime hook inheritance
- No runtime package changes for MVP
- @hex-di/tracing in packages/ (runtime library, not tooling)
- Module-level span stack for context propagation
- WeakMap<InspectorAPI, Container> for MVP reverse lookup
- W3C Trace Context manual implementation (no dependency)
- OTel is universal standard; Jaeger/Zipkin via OTel exporters; DataDog via dd-trace
- port() builder pattern for service-typed ports (23-01)
- Object.freeze() singleton pattern for zero-overhead NoOp tracer (23-03)
- Transient lifetime for MemoryTracerAdapter test isolation (23-04)
- Simple hex ID generation for MVP, crypto IDs in Plan 23-07 (23-04)
- Flat span storage in array for easy test assertions (23-04)
- globalThis access pattern for environment-independent console/process (23-05)
- crypto.getRandomValues via globalThis for browser/Node compatibility (23-07)
- Type guards use proper type narrowing without any casts (23-07)
- All-zeros ID validation per W3C spec (23-07)
- globals.d.ts pattern for test types instead of @types/node dependency (23-08)
- Integration tests verify exact export surface via star-import comparison (23-08)
- HookableContainer interface instead of InspectorAPI for instrumentation (24-01)
- Resolution key combines containerId, portName, depth, timestamp for uniqueness (24-01)
- Duration filtering at span-end (afterResolve) not span-start (24-01)
- WeakMap for InspectorAPI->Container reverse lookup (enables garbage collection) (24-02)
- Register mappings during walkTree for all instrumented containers (24-02)
- Subscribe to 'child-created' events on all inspectors for live updates (24-02)
- Pattern matching supports _, prefix_, and \*suffix wildcards for port filters (24-02)
- createTracingHook returns ResolutionHooks for manual registration (24-03)
- Instrumentation module exposes public APIs while keeping internals private (24-03)
- Integration test validates exact export surface to prevent drift (24-03)
- Type conversion without casts for SpanData → ReadableSpan (25-01)
- HrTime format [seconds, nanoseconds] for high-precision timestamps (25-01)
- resourceFromAttributes factory for Resource creation (25-01)
- Explicit field mapping instead of type casting for safety (25-01)
- Fixed tsconfig.build.json rootDir to prevent dist/src/ nesting (25-01)
- Factory functions for processors (no classes needed) (25-02)
- FIFO drop policy when buffer exceeds maxQueueSize (25-02)
- safeSetTimeout/safeClearTimeout API for cross-platform timer access (25-02)
- Graceful degradation when setTimeout unavailable (25-02)
- Resource metadata via factory function, not constructor (25-03)
- Preserve HexDI attributes while adding OTel conventions (25-03)
- Log export errors but never throw (graceful degradation) (25-03)
- Jaeger exporter uses @opentelemetry/exporter-jaeger with Thrift protocol (25-04)
- Zipkin exporter uses @opentelemetry/exporter-zipkin with JSON v2 API (25-04)
- dd-trace as optional peer dependency to avoid ~50MB forced installation (25-05)
- Minimal interface wrapping (DdSpan/DdTracer) without direct dd-trace type imports (25-05)
- Bridge accepts initialized tracer for user-controlled dd-trace configuration (25-05)
- Inspection TracingAPI preserved during core cleanup -- separate module from old collector-based tracing (26-01)
- Container.tracer removed; tracing now exclusively via @hex-di/tracing instrumentContainer() (26-02)
- TRACING_ACCESS symbol retained in runtime for inspection system use (26-02)
- Hono integration already clean of old tracing -- no changes needed (26-03)
- React test mock containers cleaned of dead TracingAPI/mockTracer code (26-03)
- @hex-di/testing package does not exist -- MIGR-07 trivially satisfied (26-03)
- Examples use instrumentContainer() + createMemoryTracer() pattern for tracing tests (26-04)
- @hex-di/tracing added as devDependency to react-showcase for test usage (26-04)
- libs/flow/core tracing is independent of DI tracing -- no migration needed (26-05)
- Negative export assertions kept as guard tests for removed collector types (26-05)

### Pending Todos

None.

### Blockers/Concerns

- Pre-existing lint errors in packages/graph (11 errors, 12 warnings) -- should be addressed separately
- Pre-existing lint warnings in libs/flow/core (31 warnings) -- should be addressed separately
- Pre-existing test failures in examples/react-showcase (12 tests) -- should be addressed separately
- Phase 24 completed with known gap: dynamic child container auto-instrumentation requires runtime to emit child-created events (deferred to v8.0 ENH-05)
- Phase 25 completed: all 15 must-haves verified, 4 new packages (tracing-otel, tracing-jaeger, tracing-zipkin, tracing-datadog)
- Phase 25 note: no behavioral tests for backend packages (structural verification only)
- Phase 26 complete: all breaking changes successfully migrated across 5 plans

## Session Continuity

Last session: 2026-02-06
Stopped at: Completed 26-05-PLAN.md (Final verification and cleanup)
Resume file: None
Next: Phase 27 (v7.0 release preparation)

---

_State initialized: 2026-02-01_
_Last updated: 2026-02-06 (Phase 26 complete)_
