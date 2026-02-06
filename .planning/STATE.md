# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** Catch dependency graph errors at compile time, not runtime
**Current focus:** v7.0 Distributed Tracing

## Current Position

Phase: 24 of 27 (Container Instrumentation and Context Propagation) -- in progress
Plan: 3 of 4 complete
Status: In progress
Last activity: 2026-02-06 -- Completed 24-03-PLAN.md (hook factory exports)

Progress: [██████░░░░] 58%

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

- Total plans completed: 71
- Total phases: 23 (1 in progress)
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

### Pending Todos

None.

### Blockers/Concerns

- Pre-existing lint errors in packages/graph (11 errors, 12 warnings) -- should be addressed separately
- Pre-existing lint warnings in libs/flow/core (31 warnings) -- should be addressed separately
- Pre-existing test failures in examples/react-showcase (12 tests) -- should be addressed separately
- Phase 24 MEDIUM risk: span stack for cross-container context has no JS DI prior art
- Phase 25 MEDIUM risk: OTel version pinning, type bridging without casts
- Phase 26 HIGH risk: breaking changes across multiple packages

## Session Continuity

Last session: 2026-02-06
Stopped at: Completed 24-03-PLAN.md
Resume file: None
Next: Continue Phase 24 (Plan 24-04)

---

_State initialized: 2026-02-01_
_Last updated: 2026-02-06 (24-03 completed, Phase 24 in progress)_
