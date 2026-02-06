# Project Roadmap

## Tracking

- **Started:** 2026-02-01
- **Current Phase:** 29 of 31 (Lint Cleanup)
- **Completion:** 90% (28/31 phases complete)

## Shipped Milestones

| Version | Phases | Status  | Ship Date  | Key Features                             |
| ------- | ------ | ------- | ---------- | ---------------------------------------- |
| v1.1    | 1-2    | Shipped | 2026-02-01 | Bug fixes, initial verification          |
| v1.2    | 3-5    | Shipped | 2026-02-01 | Scoped overrides, enhanced defineService |
| v2.0    | 6-8    | Shipped | 2026-02-02 | Unified createPort, graph inspection     |
| v3.0    | 9-11   | Shipped | 2026-02-02 | Unified adapters, async detection        |
| v4.0    | 12-14  | Shipped | 2026-02-03 | Unified provide, disposal system         |
| v5.0    | 15-19  | Shipped | 2026-02-05 | Type refinement, performance, docs       |
| v6.0    | 20-22  | Shipped | 2026-02-06 | Framework integrations, libraries        |

## Active Milestone

### v7.0 Distributed Tracing (Active)

**Milestone Goal:** Replace isolated per-container tracing with distributed tracing supporting cross-container propagation, multiple backends (OTel, Jaeger, Zipkin, DataDog), and framework integration (Hono, React).

See: `.planning/milestones/v7.0-ROADMAP.md` for full details.

#### Phase 23: Core Tracing Package Foundation

**Goal:** Developers can import @hex-di/tracing and use a complete tracing API with ports, built-in adapters, W3C Trace Context, and ID generation -- zero external dependencies
**Requirements:** CORE-01..10, ADPT-01..04, CTX-01..07, PERF-03, PERF-04 (23 requirements)
**Plans:** 8 plans

Plans:

- [x] 23-01-PLAN.md — Package setup and port definitions
- [x] 23-02-PLAN.md — Core types and interfaces
- [x] 23-03-PLAN.md — NoOp adapter implementation
- [x] 23-04-PLAN.md — Memory adapter implementation
- [x] 23-05-PLAN.md — Console adapter implementation
- [x] 23-06-PLAN.md — W3C Trace Context propagation
- [x] 23-07-PLAN.md — ID generation and utilities
- [x] 23-08-PLAN.md — Integration tests and documentation

#### Phase 24: Container Instrumentation and Context Propagation

**Goal:** Developers can instrument a single container or entire tree with one call; resolution spans form parent-child relationships across container boundaries
**Requirements:** INST-01..09 (9 requirements)
**Plans:** 3 plans

Plans:

- [x] 24-01-PLAN.md — Core instrumentation with span stack
- [x] 24-02-PLAN.md — Tree instrumentation with subscription
- [x] 24-03-PLAN.md — Hook factory and exports

#### Phase 25: OpenTelemetry Backend and Export Pipeline

**Goal:** Developers can export HexDI traces to any OTel-compatible backend through dedicated packages with batching, resource metadata, and semantic conventions
**Requirements:** OTEL-01..08, BACK-01..04 (12 requirements)
**Plans:** 5 plans

Plans:

- [x] 25-01-PLAN.md — OTel package foundation with SpanData conversion
- [x] 25-02-PLAN.md — Batch and Simple span processors
- [x] 25-03-PLAN.md — OTLP HTTP exporter with resource metadata
- [x] 25-04-PLAN.md — Jaeger and Zipkin backend adapters
- [x] 25-05-PLAN.md — DataDog bridge with dd-trace

#### Phase 26: Breaking Change Migration

**Goal:** All old tracing types removed from every package; full monorepo builds, typechecks, and tests clean
**Requirements:** MIGR-01..09 (9 requirements)
**Plans:** 5 plans

Plans:

- [x] 26-01-PLAN.md — Remove old tracing from @hex-di/core
- [x] 26-02-PLAN.md — Remove old tracing from @hex-di/runtime
- [x] 26-03-PLAN.md — Update integration packages
- [x] 26-04-PLAN.md — Migrate all examples
- [x] 26-05-PLAN.md — Final verification and cleanup

#### Phase 27: Framework Integrations and Testing Utilities

**Goal:** Hono/React get first-class tracing integration; test authors get span assertion helpers; benchmarks confirm acceptable overhead
**Requirements:** FRMW-01..06, TEST-01..04, PERF-01, PERF-02 (12 requirements)
**Plans:** 5 plans

Plans:

- [x] 27-01-PLAN.md — Test utilities foundation (assertSpanExists, matchers)
- [x] 27-02-PLAN.md — Hono tracing middleware (W3C Trace Context)
- [x] 27-03-PLAN.md — React TracingProvider and hooks
- [x] 27-04-PLAN.md — Performance benchmarks
- [x] 27-05-PLAN.md — Documentation and final integration

#### Phase 28: Tracing Test Coverage

**Goal:** Close test coverage gaps from milestone audit — instrumentation code and OTel backend packages get comprehensive behavioral tests proving correctness
**Gap Closure:** Closes Phase 24 (zero instrumentation tests) and Phase 25 (no OTel package tests) gaps from v7.0-MILESTONE-AUDIT.md
**Plans:** 4 plans

Plans:

- [x] 28-01-PLAN.md — Instrumentation unit tests (span stack, instrumentContainer, port filtering, cleanup, error recording)
- [x] 28-02-PLAN.md — Cross-container integration tests (parent-child span relationships, instrumentContainerTree)
- [x] 28-03-PLAN.md — OTel span adapter and processor tests (convertToReadableSpan, batch/simple processors)
- [x] 28-04-PLAN.md — Backend adapter tests (Jaeger, Zipkin, DataDog exporter wiring)

#### Phase 29: Lint Cleanup

**Goal:** Zero lint warnings across all tracing and integration packages
**Gap Closure:** Closes Hono middleware warnings (7), tracing type-guards warnings (2), cross-container test warnings (5) from v7.0-MILESTONE-AUDIT.md
**Plans:** 1 plan

Plans:

- [ ] 29-01-PLAN.md — Fix all 18 lint warnings in tracing and integration packages

#### Phase 30: Dynamic Child Container Auto-Instrumentation

**Goal:** instrumentContainerTree automatically instruments dynamically created child containers via child-created events
**Gap Closure:** Closes Phase 24 gap "dynamic child auto-instrumentation non-functional" from v7.0-MILESTONE-AUDIT.md
**Plans:** 2 plans

Plans:

- [ ] 30-01-PLAN.md — Emit child-created events from runtime LifecycleManager
- [ ] 30-02-PLAN.md — Wire tree.ts listener to new events and fix reverse lookup

#### Phase 31: Tracing Performance Optimization

**Goal:** Reduce NoOp tracer overhead to <10% and Memory tracer overhead to <100% via hot path optimization
**Gap Closure:** Closes performance overhead gaps from v7.0-MILESTONE-AUDIT.md
**Plans:** 2 plans

Plans:

- [ ] 31-01-PLAN.md — Optimize instrumentation hook hot path (NoOp target: <10%)
- [ ] 31-02-PLAN.md — Optimize Memory tracer span creation and storage (target: <100%)

## Progress

| Phase                             | Milestone | Plans Complete | Status   | Completed  |
| --------------------------------- | --------- | -------------- | -------- | ---------- |
| 1. Bug Verification               | v1.1      | 1/1            | Complete | 2026-02-01 |
| 2. Fix Verification               | v1.1      | 1/1            | Complete | 2026-02-01 |
| 3. Scoped Overrides               | v1.2      | 3/3            | Complete | 2026-02-01 |
| 4. Enhanced defineService         | v1.2      | 3/3            | Complete | 2026-02-01 |
| 5. Port Directions                | v1.2      | 3/3            | Complete | 2026-02-01 |
| 6. Unified createPort             | v2.0      | 1/1            | Complete | 2026-02-02 |
| 7. Port Utilities                 | v2.0      | 1/1            | Complete | 2026-02-02 |
| 8. Graph Inspection               | v2.0      | 1/1            | Complete | 2026-02-02 |
| 9. Unified createAdapter          | v3.0      | 3/3            | Complete | 2026-02-02 |
| 10. Auto-detect Async             | v3.0      | 3/3            | Complete | 2026-02-02 |
| 11. Async Lifetime Enforcement    | v3.0      | 3/3            | Complete | 2026-02-02 |
| 12. Unified provide               | v4.0      | 2/2            | Complete | 2026-02-03 |
| 13. Merge Safety                  | v4.0      | 2/2            | Complete | 2026-02-03 |
| 14. Disposal & Inspection         | v4.0      | 2/2            | Complete | 2026-02-03 |
| 15. Type File Split               | v5.0      | 2/2            | Complete | 2026-02-03 |
| 16. Tracing Consolidation         | v5.0      | 6/6            | Complete | 2026-02-04 |
| 17. Override Builder              | v5.0      | 5/5            | Complete | 2026-02-04 |
| 18. Performance & Testing         | v5.0      | 5/5            | Complete | 2026-02-05 |
| 19. Documentation & Polish        | v5.0      | 4/4            | Complete | 2026-02-05 |
| 20. Integration Migration         | v6.0      | 2/2            | Complete | 2026-02-06 |
| 21. Tooling & Library Migration   | v6.0      | 2/2            | Complete | 2026-02-06 |
| 22. Verification & References     | v6.0      | 2/2            | Complete | 2026-02-06 |
| 23. Core Tracing Foundation       | v7.0      | 8/8            | Complete | 2026-02-06 |
| 24. Container Instrumentation     | v7.0      | 3/3            | Complete | 2026-02-06 |
| 25. OTel Backend & Export         | v7.0      | 5/5            | Complete | 2026-02-06 |
| 26. Breaking Change Migration     | v7.0      | 5/5            | Complete | 2026-02-06 |
| 27. Framework & Testing           | v7.0      | 5/5            | Complete | 2026-02-06 |
| 28. Tracing Test Coverage         | v7.0      | 4/4            | Complete | 2026-02-06 |
| 29. Lint Cleanup                  | v7.0      | 0/1            | Pending  | —          |
| 30. Dynamic Child Instrumentation | v7.0      | 0/2            | Pending  | —          |
| 31. Tracing Performance           | v7.0      | 0/2            | Pending  | —          |

## Tracking

### Velocity

**By Milestone:**

| Milestone | Phases | Plans | Days | Plans/Day |
| --------- | ------ | ----- | ---- | --------- |
| v1.1      | 2      | 2     | 1    | 2.0       |
| v1.2      | 3      | 9     | 1    | 9.0       |
| v2.0      | 3      | 3     | 1    | 3.0       |
| v3.0      | 3      | 9     | 1    | 9.0       |
| v4.0      | 3      | 6     | 1    | 6.0       |
| v5.0      | 5      | 22    | 3    | 7.3       |
| v6.0      | 3      | 6     | 1    | 6.0       |
| v7.0      | 6      | 30    | 1    | 30.0      |

**Overall:** 87 plans in 6 days = 14.5 plans/day

### Burndown

| Week | Phases Remaining | Plans Remaining | Trend    |
| ---- | ---------------- | --------------- | -------- |
| 1    | 27               | ~100            | Start    |
| 2    | 0                | 0               | Complete |

---

_Last updated: 2026-02-06_
