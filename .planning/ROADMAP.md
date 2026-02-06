# Project Roadmap

## Tracking

- **Started:** 2026-02-01
- **Current Phase:** 25 of 27 (OpenTelemetry Backend and Export Pipeline)
- **Completion:** 62% (24/39 phases complete)

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

#### Phase 26: Breaking Change Migration

**Goal:** All old tracing types removed from every package; full monorepo builds, typechecks, and tests clean
**Requirements:** MIGR-01..09 (9 requirements)

#### Phase 27: Framework Integrations and Testing Utilities

**Goal:** Hono/React get first-class tracing integration; test authors get span assertion helpers; benchmarks confirm acceptable overhead
**Requirements:** FRMW-01..06, TEST-01..04, PERF-01, PERF-02 (12 requirements)

## Progress

| Phase                           | Milestone | Plans Complete | Status      | Completed  |
| ------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Bug Verification             | v1.1      | 1/1            | Complete    | 2026-02-01 |
| 2. Fix Verification             | v1.1      | 1/1            | Complete    | 2026-02-01 |
| 3. Scoped Overrides             | v1.2      | 3/3            | Complete    | 2026-02-01 |
| 4. Enhanced defineService       | v1.2      | 3/3            | Complete    | 2026-02-01 |
| 5. Port Directions              | v1.2      | 3/3            | Complete    | 2026-02-01 |
| 6. Unified createPort           | v2.0      | 1/1            | Complete    | 2026-02-02 |
| 7. Port Utilities               | v2.0      | 1/1            | Complete    | 2026-02-02 |
| 8. Graph Inspection             | v2.0      | 1/1            | Complete    | 2026-02-02 |
| 9. Unified createAdapter        | v3.0      | 3/3            | Complete    | 2026-02-02 |
| 10. Auto-detect Async           | v3.0      | 3/3            | Complete    | 2026-02-02 |
| 11. Async Lifetime Enforcement  | v3.0      | 3/3            | Complete    | 2026-02-02 |
| 12. Unified provide             | v4.0      | 2/2            | Complete    | 2026-02-03 |
| 13. Merge Safety                | v4.0      | 2/2            | Complete    | 2026-02-03 |
| 14. Disposal & Inspection       | v4.0      | 2/2            | Complete    | 2026-02-03 |
| 15. Type File Split             | v5.0      | 2/2            | Complete    | 2026-02-03 |
| 16. Tracing Consolidation       | v5.0      | 6/6            | Complete    | 2026-02-04 |
| 17. Override Builder            | v5.0      | 5/5            | Complete    | 2026-02-04 |
| 18. Performance & Testing       | v5.0      | 5/5            | Complete    | 2026-02-05 |
| 19. Documentation & Polish      | v5.0      | 4/4            | Complete    | 2026-02-05 |
| 20. Integration Migration       | v6.0      | 2/2            | Complete    | 2026-02-06 |
| 21. Tooling & Library Migration | v6.0      | 2/2            | Complete    | 2026-02-06 |
| 22. Verification & References   | v6.0      | 2/2            | Complete    | 2026-02-06 |
| 23. Core Tracing Foundation     | v7.0      | 8/8            | Complete    | 2026-02-06 |
| 24. Container Instrumentation   | v7.0      | 3/3            | Complete    | 2026-02-06 |
| 25. OTel Backend & Export       | v7.0      | 0/TBD          | Not started | -          |
| 26. Breaking Change Migration   | v7.0      | 0/TBD          | Not started | -          |
| 27. Framework & Testing         | v7.0      | 0/TBD          | Not started | -          |

## Tracking

### Velocity

**By Milestone:**

| Milestone | Phases | Plans | Days   | Plans/Day |
| --------- | ------ | ----- | ------ | --------- |
| v1.1      | 2      | 2     | 1      | 2.0       |
| v1.2      | 3      | 9     | 1      | 9.0       |
| v2.0      | 3      | 3     | 1      | 3.0       |
| v3.0      | 3      | 9     | 1      | 9.0       |
| v4.0      | 3      | 6     | 1      | 6.0       |
| v5.0      | 5      | 22    | 3      | 7.3       |
| v6.0      | 3      | 6     | 1      | 6.0       |
| v7.0      | 5      | 71    | Active | TBD       |

**Overall:** 71 plans in 6 days = 11.8 plans/day

### Burndown

| Week | Phases Remaining | Plans Remaining | Trend |
| ---- | ---------------- | --------------- | ----- |
| 1    | 27               | ~100            | Start |
| 2    | 4                | ~20             | -87%  |

---

_Last updated: 2026-02-06_
