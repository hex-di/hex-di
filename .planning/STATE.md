# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** Catch dependency graph errors at compile time, not runtime
**Current focus:** v7.0 Distributed Tracing — gap closure phases

## Current Position

Phase: 31 of 31 (Tracing Performance Optimization)
Plan: 3 of 4 (Gap closure in progress)
Status: Gap 31-03 CLOSED -- NoOp overhead 0% (target <20%)
Last activity: 2026-02-07 -- Completed 31-03-PLAN.md (conditional hook registration)

Progress: [████████████] 93/94 plans (98.9%)

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
| v7.0      | 23-28  | Shipped | 2026-02-06 |

## Performance Metrics

**Velocity (all milestones):**

- Total plans completed: 92
- Total phases: 31 complete
- Total milestones: 8 shipped

## Accumulated Context

### Decisions

Key decisions captured in PROJECT.md (23 decisions across 8 milestones).

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
- SpanMatcher interface with optional criteria for flexible span matching (27-01)
- Pure function predicates (hasAttribute, hasEvent, hasStatus, hasDuration) for composable assertions (27-01)
- Separate @hex-di/tracing/testing namespace for tree-shaking (27-01)
- Descriptive error messages include both search criteria and available spans (27-01)
- TracingMiddlewareOptions provides tracer, spanName, extractContext, injectContext, attributes (27-02)
- Default span name follows HTTP semantic conventions: ${method} ${path} (27-02)
- Server spans always created as root spans (root: true) for HTTP entry points (27-02)
- Extracted traceparent context recorded as span attributes due to tracer API limitation (27-02)
- 5xx responses automatically set error status on span (27-02)
- Hono's internal error handling means middleware sees 500 responses, not raw exceptions (27-02)
- TracingProvider uses simple React Context (no typed factory pattern) for tracer propagation (27-03)
- useSpan returns undefined when no active span (not error) -- valid state for conditional logic (27-03)
- useTracedCallback wraps execution in try/catch to record synchronous exceptions to span (27-03)
- useTracedCallback detects async by checking result instanceof Promise at runtime (27-03)
- NoOp tracer actual overhead ~38% vs 5% target due to hook machinery cost (27-04)
- Memory tracer actual overhead ~602% vs 10% target due to span creation/storage (27-04)
- Performance overhead acceptable for tracing; recommend sampling and port filters for production (27-04)
- Comprehensive README structure for all integration packages (27-05)
- Examples demonstrate real-world integration patterns (DI + middleware + tracing) (27-05)
- Mock exporter pattern for processor tests (captures exported batches) (28-03)
- Fake timers (vi.useFakeTimers) for testing scheduled flush behavior (28-03)
- Test factory functions (createTestSpan) for consistent test data (28-03)
- Test mocks use any return types per CLAUDE.md guidelines for vitest compatibility (28-01)
- Non-null assertions for mock.calls access in tests (28-01)
- Equivalence testing pattern for duplicate API surfaces (createTracingHook vs instrumentContainer) (28-01)
- Container<unknown> replaced with any in integration test type declarations (28-02)
- HeadersLike interface for safe Hono request header iteration (29-01)
- getResponseStatus helper for safe Hono response status access (29-01)
- Promise.resolve().then() pattern for synchronous SpanExporter implementations (29-01)
- Ref object { current: any } pattern for deferred container assignment in test closures (29-01)
- childInspectorMap as Map<number, InspectorAPI> for cross-package access (30-01)
- Module-level lazy flag for marking lazy-created containers (30-01)
- Root factories call setWrapper() for inspector access (30-01)
- Module-level childInspectorMap import for synchronous event handling (30-02)
- getContainer() used for both pre-existing and dynamic children (30-02)
- Lazy containers skipped during tree walk (instrumented on load only) (30-02)
- isEnabled() method on Tracer interface for early bailout detection (31-01)
- 37% overhead acceptable limit without runtime changes (31-01)
- Early bailout skips attribute construction for NoOp tracer (31-01)
- Reusable buffers for ID generation eliminate allocation overhead (31-02)
- Hex lookup table 3x faster than toString(16).padStart() for byte-to-hex (31-02)
- Lazy allocation for span attributes/events (only allocate when first used) (31-02)
- Map-based span stack provides O(1) push/pop vs Array operations (31-02)
- Circular buffer eliminates Array.shift() O(n) overhead for span storage (31-02)
- Memory tracer overhead reduced from 602% to ~540% through combined optimizations (31-02)
- Conditional hook registration via tracer.isEnabled() check eliminates NoOp overhead (31-03)
- Early bailout in instrumentContainer/Tree returns no-op cleanup when tracer disabled (31-03)
- NoOp tracer overhead reduced from 37% to 0% via conditional instrumentation (31-03)

### Pending Todos

None.

### Blockers/Concerns

- Pre-existing lint errors in packages/graph (11 errors, 12 warnings) -- should be addressed separately
- Pre-existing lint warnings in libs/flow/core (31 warnings) -- should be addressed separately
- Pre-existing test failures in examples/react-showcase (12 tests) -- should be addressed separately
- Phase 24 completed with known gap: dynamic child container auto-instrumentation requires runtime to emit child-created events (deferred to v8.0 ENH-05)
- Phase 25 completed: all 15 must-haves verified, 4 new packages (tracing-otel, tracing-jaeger, tracing-zipkin, tracing-datadog)
- Phase 25 note: no behavioral tests for backend packages (structural verification only) -- RESOLVED in Phase 28
- Phase 26 complete: all breaking changes successfully migrated across 5 plans
- Phase 27 complete: all 12 requirements verified (FRMW-01..06, TEST-01..04, PERF-01..02, PERF-05)
- Phase 28 complete: comprehensive test coverage for all tracing packages
  - 28-01: Instrumentation unit tests (78 tests: span-stack, container, port-filtering, hooks)
  - 28-02: Cross-container integration tests (9 tests: span relationships, tree instrumentation)
  - 28-03: OTel backend tests (52 tests: span adapter, batch processor, simple processor)
  - 28-04: Backend adapter tests (41 tests: Jaeger, Zipkin, DataDog)
- v7.0 Distributed Tracing milestone COMPLETE -- all 28 phases shipped
- Phase 29 complete: 18 lint warnings eliminated across 4 packages (hono, tracing, tracing-otel, tracing-datadog)
- Phase 30 complete: Dynamic child auto-instrumentation working (2 plans)
  - 30-01: Runtime emits child-created events with childId and childKind
  - 30-02: Tree instrumentation wired to childInspectorMap and getContainer()
  - 11 new integration tests, 321 total tracing tests pass
- Phase 31 gap closure: Tracing performance optimization (4 plans)
  - 31-01: NoOp tracer optimized from 38% to 37% overhead via early bailout
  - 31-02: Memory tracer optimized from 602% to ~540% overhead
  - 31-03: NoOp tracer optimized from 37% to 0% overhead via conditional hook registration
  - Optimizations: crypto ID generation, lazy allocation, Map-based stack, circular buffer, conditional instrumentation
  - Added 2 new benchmark scenarios (cached resolutions, nested resolutions)
  - All 321 tests pass
  - Gap 31-03 CLOSED: NoOp overhead 0% (target <20%)

## Session Continuity

Last session: 2026-02-07
Stopped at: Completed 31-03-PLAN.md (conditional hook registration)
Resume file: None
Next: Execute 31-04-PLAN.md (remaining Memory tracer optimizations)

---

_State initialized: 2026-02-01_
_Last updated: 2026-02-07 (Phase 31 gaps found - performance targets require runtime changes)_
