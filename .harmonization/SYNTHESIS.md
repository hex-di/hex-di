# HexDI Ecosystem Harmonization — Consolidated Synthesis

**Date:** 2026-02-07
**Team:** 10 specialist agents (Result, Store, Query, Saga, Flow, Core, Graph, Runtime, Vision, Architecture)
**Reports:** 10 individual reports in `.harmonization/`

---

## Overall Verdict: B+ — Strong Foundation, Ship After 6 Critical Fixes

The ecosystem is architecturally sound. All 9 packages follow hexagonal architecture correctly. The `GraphBuilder` as universal composition mechanism makes the architecture **enforceable, not just aspirational**. The `effects-as-data` pattern across Flow, Store, and Saga is a genuine innovation.

---

## Critical Fixes (Must Resolve Before Shipping)

### CF-1: Add `metadata` to `VisualizableAdapter`

- **Where:** `packages/core/src/inspection/inspector-types.ts`
- **What:** Add `readonly metadata?: Readonly<Record<string, unknown>>`
- **Why:** Blocks Vision Phase 3 (Reporting) for Flow. Non-breaking additive change.
- **Confirmed by:** Core specialist, Graph specialist, Architecture specialist, Vision specialist

### CF-2: Export `ResolutionError` tagged union from Core

- **Where:** `packages/core/src/errors/`
- **What:** Define canonical tagged union mapping all `ContainerError` subclasses to `_tag` variants. Export `toResolutionError()` conversion function.
- **Why:** Three competing error paradigms (class hierarchy, tagged unions, type-level) create friction at every library boundary. Every consumer independently wraps resolution in try/catch.
- **Confirmed by:** Result specialist, Core specialist, Runtime specialist, Architecture specialist

### CF-3: Make `SagaPersister` return `ResultAsync`

- **Where:** `spec/saga/08-persistence.md`
- **What:** Replace all `Promise<T>` returns with `ResultAsync<T, PersistenceError>`
- **Why:** System boundary (storage I/O) where failures are common. Violates the "all fallible operations return Result" ecosystem principle.
- **Confirmed by:** Saga specialist, Architecture specialist, Vision specialist

### CF-4: Add `@hex-di/result` and `@hex-di/tracing` to Flow dependencies

- **Where:** `spec/flow/01-overview.md`, section 3.3
- **What:** List both packages in the dependency table
- **Why:** Without `@hex-di/result`, the Flow package cannot compile — every return type uses `Result`/`ResultAsync`.
- **Confirmed by:** Flow specialist, Architecture specialist

### CF-5: Remove `createMachine` backward-compat alias

- **Where:** `spec/flow/14-api-reference.md`
- **What:** Delete `createMachine`. `defineMachine` is the sole API.
- **Why:** Directly violates CLAUDE.md: "No backward compatibility — No compatibility shims"
- **Confirmed by:** Flow specialist, Architecture specialist

### CF-6: Define Flow-Saga integration contract types

- **Where:** New shared types between `spec/flow/` and `spec/saga/`
- **What:** Define `SagaProgressEvent`, `SagaCompensationEvent`, and ensure `SagaPort.execute()` return type is compatible with Flow's `EffectExecutionError.InvokeError` wrapping.
- **Why:** Both specs reference the integration but neither defines the shared event types.
- **Confirmed by:** Flow specialist, Saga specialist, Vision specialist

---

## High-Priority Fixes (Should Fix)

| #     | Issue                                                                                | Library              | Source                       |
| ----- | ------------------------------------------------------------------------------------ | -------------------- | ---------------------------- | -------------------------- |
| HF-1  | Translate query `dependsOn` into adapter `requires`                                  | Query                | Graph, Query reports         |
| HF-2  | Add port direction to Saga/Flow ports                                                | Saga, Flow           | Graph, Architecture reports  |
| HF-3  | Reconcile `SagaErrorBase` field mismatch (SS9 vs SS15)                               | Saga                 | Saga report                  |
| HF-4  | Create ecosystem-wide error code registry (`spec/ERROR_CODES.md`)                    | All                  | Store, Flow reports          |
| HF-5  | Expand `SuggestedCategory` with `"state"`, `"query"`, `"saga"`, `"flow"`, `"effect"` | Core                 | Core report                  |
| HF-6  | Rename `ResultAsyncImpl` export to `ResultAsync`                                     | Result               | Result report                |
| HF-7  | Add `ResultAsync` static combinators (`all`, `allSettled`, `any`, `collect`)         | Result               | Result report                |
| HF-8  | Create `@hex-di/result-testing` package                                              | Result               | Result, Store, Query reports |
| HF-9  | Fix `useSagaHistory` error type (`Error                                              | null` → typed error) | Saga                         | Saga, Architecture reports |
| HF-10 | Replace `MissingMockError` class with tagged union                                   | Flow                 | Flow, Architecture reports   |
| HF-11 | Resolve `activityPort` vs `createActivityPort` naming                                | All                  | Flow report                  |

---

## Cross-Library Integration Gaps

Every specialist independently flagged missing cross-library integration documentation:

```
Store ←→ Query    : Cache-to-state sync, mutation-to-state coordination, optimistic updates
Store ←→ Flow     : Machine transitions trigger state actions (and vice versa)
Store ←→ Saga     : Saga steps read/write store state, compensation rollback
Query ←→ Saga     : Saga steps fetch/invalidate queries
Query ←→ Flow     : State machine effects trigger query operations
Flow  ←→ Saga     : Saga execution from Flow effects (partially specified)
```

**Recommendation:** Create `spec/integration/` directory with cross-library integration specs. Priority: Store+Query and Flow+Saga.

---

## Vision Phase Alignment

| Phase            | Status   | Spec Readiness | Key Blocker                                      |
| ---------------- | -------- | -------------- | ------------------------------------------------ |
| P1 Plumbing      | 100%     | 100%           | None                                             |
| P2 Awareness     | 100%     | 90%            | CF-1 (VisualizableAdapter.metadata)              |
| P3 Reporting     | 15% impl | 70% spec       | CF-2, Agent InspectorAPI, TracingQueryAPI        |
| P4 Communication | 40% impl | 45% spec       | P3 completion, MCP resource specs for Flow/Agent |
| P5 Autonomy      | 0% impl  | 20% spec       | P3+P4, MAPE-K spec needed                        |

**Critical path:** Phase 3 is the bottleneck. All downstream phases depend on it. The Priority 1 recommendations (CF-1 through CF-6) directly unblock Phase 3 Waves 1-3.

---

## Ecosystem Consistency Scorecard

| Dimension                         | Score      | Notes                                            |
| --------------------------------- | ---------- | ------------------------------------------------ |
| Port/Adapter separation           | 10/10      | Exemplary across all libraries                   |
| Dependency direction              | 9/10       | Query `dependsOn` gap                            |
| Domain isolation                  | 10/10      | `effects-as-data` pattern is strong              |
| Framework agnosticism             | 10/10      | React consistently isolated in `-react` packages |
| Testability via port substitution | 10/10      | All libraries support graph-based test isolation |
| Result integration                | 8/10       | Strong except SagaPersister Promise gap          |
| Cross-cutting concerns via ports  | 8/10       | Tracing good, error paradigm mismatch            |
| Naming conventions                | 7/10       | Port factory naming split, machine ID casing     |
| Inter-library composition         | 5/10       | Architecturally supported but undocumented       |
| Vision alignment                  | 7/10       | P1-P2 solid, P3 70% spec, P4-P5 need work        |
| **Overall**                       | **8.4/10** |                                                  |

---

## Individual Report Scores

| Library | Specialist Score | Key Strength                               | Key Gap                                           |
| ------- | ---------------- | ------------------------------------------ | ------------------------------------------------- |
| Result  | —                | Foundational type, zero deps               | `ResultAsyncImpl` naming, missing combinators     |
| Store   | 13/13 patterns   | Most faithful hexagonal implementation     | Cross-library integration docs                    |
| Query   | 8/10             | Most architecturally mature spec           | 0/10 Saga/Flow integration                        |
| Saga    | 7/10             | Strong builder pattern, Result integration | `SagaPersister` Promise returns                   |
| Flow    | 7.5/10           | Comprehensive (16 files), effects-as-data  | Missing dependency declarations                   |
| Core    | 85% ready        | Sound Port/Adapter type system             | `VisualizableAdapter.metadata`, `ResolutionError` |
| Graph   | Compatible       | 5-step compile-time validation             | Query `dependsOn` not in graph                    |
| Runtime | Compatible       | Scope system covers all library needs      | throw-vs-Result boundary                          |

---

## Recommended Action Order

```
Step 1: CF-1 through CF-6 (critical fixes)
Step 2: HF-6, HF-7, HF-8 (Result API surface — foundational)
Step 3: HF-1, HF-2 (Graph/port direction gaps)
Step 4: HF-3, HF-4, HF-9, HF-10, HF-11 (consistency cleanups)
Step 5: Cross-library integration specs
Step 6: Phase 3 implementation (Waves 1-3)
```

---

## Files Produced

All reports are in `.harmonization/`:

| File                     | Author                  | Lines     |
| ------------------------ | ----------------------- | --------- |
| `result-report.md`       | Result specialist       | ~400      |
| `store-report.md`        | Store specialist        | ~275      |
| `query-report.md`        | Query specialist        | ~280      |
| `saga-report.md`         | Saga specialist         | ~375      |
| `flow-report.md`         | Flow specialist         | ~330      |
| `core-report.md`         | Core specialist         | ~395      |
| `graph-report.md`        | Graph specialist        | ~275      |
| `runtime-report.md`      | Runtime specialist      | ~300      |
| `vision-report.md`       | Vision specialist       | ~575      |
| `architecture-report.md` | Architecture specialist | ~380      |
| **SYNTHESIS.md**         | Team lead               | This file |
