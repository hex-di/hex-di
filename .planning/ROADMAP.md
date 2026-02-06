# Roadmap: HexDI

## Milestones

- ✅ **v1.1 Bugfix Verification** — Phases 1-2 (shipped 2026-02-01)
- ✅ **v1.2 DX Improvements** — Phases 3-5 (shipped 2026-02-01)
- ✅ **v2.0 Unified Port API** — Phases 6-8 (shipped 2026-02-02)
- ✅ **v3.0 Unified Adapter API** — Phases 9-11 (shipped 2026-02-02)
- ✅ **v4.0 Runtime API Simplification** — Phases 12-14 (shipped 2026-02-03)
- ✅ **v5.0 Runtime Package Improvements** — Phases 15-19 (shipped 2026-02-05)
- ✅ **v6.0 Monorepo Reorganization** — Phases 20-22 (shipped 2026-02-06)
- **v7.0 Distributed Tracing** — Phases 23-27 (active)

## Phases

<details>
<summary>✅ v1.1 Bugfix Verification (Phases 1-2) — SHIPPED 2026-02-01</summary>

Phases 1-2: Verification of merge operation bugs and runtime captive detection.

</details>

<details>
<summary>✅ v1.2 DX Improvements (Phases 3-5) — SHIPPED 2026-02-01</summary>

Phases 3-5: Scoped overrides, enhanced defineService, port directions and metadata.

</details>

<details>
<summary>✅ v2.0 Unified Port API (Phases 6-8) — SHIPPED 2026-02-02</summary>

Phases 6-8: Unified createPort(), InboundPorts/OutboundPorts utilities, graph inspection filtering.

</details>

<details>
<summary>✅ v3.0 Unified Adapter API (Phases 9-11) — SHIPPED 2026-02-02</summary>

Phases 9-11: Unified createAdapter(), auto-detect async, compile-time async lifetime enforcement.

</details>

<details>
<summary>✅ v4.0 Runtime API Simplification (Phases 12-14) — SHIPPED 2026-02-03</summary>

Phases 12-14: Unified provide(), merge() safety, disposal lifecycle, GraphSummary.

</details>

<details>
<summary>✅ v5.0 Runtime Package Improvements (Phases 15-19) — SHIPPED 2026-02-05</summary>

Phases 15-19: Type file split, tracing/inspection consolidation, override builder, performance benchmarks, documentation.

</details>

<details>
<summary>✅ v6.0 Monorepo Reorganization (Phases 20-22) — SHIPPED 2026-02-06</summary>

Phases 20-22: Restructured monorepo into packages/, integrations/, tooling/, libs/ groups with nested sub-packages.

See: `.planning/milestones/v6.0-ROADMAP.md` for full details.

</details>

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
- [ ] 23-06-PLAN.md — W3C Trace Context propagation
- [ ] 23-07-PLAN.md — ID generation and utilities
- [ ] 23-08-PLAN.md — Integration tests and documentation

#### Phase 24: Container Instrumentation and Context Propagation

**Goal:** Developers can instrument a single container or entire tree with one call; resolution spans form parent-child relationships across container boundaries
**Requirements:** INST-01..09 (9 requirements)

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
| 23. Core Tracing Foundation     | v7.0      | 5/8            | In progress | -          |
| 24. Container Instrumentation   | v7.0      | 0/TBD          | Not started | -          |
| 25. OTel Backend & Export       | v7.0      | 0/TBD          | Not started | -          |
| 26. Breaking Change Migration   | v7.0      | 0/TBD          | Not started | -          |
| 27. Framework & Testing         | v7.0      | 0/TBD          | Not started | -          |
