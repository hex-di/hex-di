# Traceability

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CLK-TRC-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- traceability.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- traceability.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- traceability.md` |
| Status | Effective |

## Traceability Overview

```
Requirement (CLK-*) ──► Spec Section (01-09) ──► Source Module ──► Test File ──► Test Case
      │                        │                       │                            │
      ▼                        ▼                       ▼                            ▼
   invariants.md         behavior spec        src/**/*.ts              tests/**/*.test.ts
   (INV-CK-N)           (numbered doc)                                tests/**/*.test-d.ts
      │                        │
      ▼                        ▼
 risk-assessment.md      decisions/
 (FM-N, RPN)            (ADR-CK-NNN)
```

## Requirement Identification Convention

`@hex-di/clock` uses the `CLK-*` prefix for all requirement identifiers. The scheme is documented in [process/requirement-id-scheme.md](process/requirement-id-scheme.md).

**Total requirements**: 322 formal CLK-prefixed requirements across 7 specification documents.
- 22 are tagged `[OPERATIONAL]` (procedural, not automatable)
- 300 are automatable

## Capability-Level Traceability

| # | Capability | Spec File | Source Modules | Risk Level | Subpath |
|---|-----------|-----------|----------------|------------|---------|
| 1 | Clock Port interface | [02-clock-port.md](02-clock-port.md) | `src/ports/clock.ts`, `src/branded.ts` | High | `.` |
| 2 | Sequence Generator | [03-sequence-generator.md](03-sequence-generator.md) | `src/ports/sequence.ts` | High | `.` |
| 3 | Platform Adapters | [04-platform-adapters.md](04-platform-adapters.md) | `src/adapters/system-clock.ts`, `src/adapters/edge-runtime-clock.ts`, `src/adapters/host-bridge-clock.ts` | High | `.` |
| 4 | Testing Support | [05-testing-support.md](05-testing-support.md) | `src/testing/virtual-clock.ts`, `src/testing/virtual-sequence.ts`, `src/testing/virtual-timer.ts`, `src/testing/virtual-cached-clock.ts` | Low | `./testing` |
| 5 | GxP Compliance | [compliance/](compliance/) | `src/temporal-context.ts`, `src/signature-validation.ts`, `src/record-integrity.ts`, `src/gxp-metadata.ts`, `src/deserialization.ts` | High | `.` |
| 6 | Container Integration | [07-integration.md](07-integration.md) | `src/events/clock-source-changed.ts`, `src/adapters/system-clock.ts` | Medium | `.` |
| 7 | Timer Scheduling | [02-clock-port.md §2.7](02-clock-port.md) | `src/ports/timer-scheduler.ts`, `src/adapters/system-timer.ts` | Medium | `.` |
| 8 | Cached Clock | [02-clock-port.md §2.8](02-clock-port.md) | `src/ports/cached-clock.ts`, `src/adapters/cached-clock.ts` | Medium | `.` |
| 9 | Async Combinators | [02-clock-port.md §2.9](02-clock-port.md) | `src/combinators/async.ts` | Low | `.` |
| 10 | Duration Types | [02-clock-port.md §2.10](02-clock-port.md) | `src/ports/clock.ts`, `src/duration.ts` | Low | `.` |
| 11 | Temporal API Interop | [02-clock-port.md §2.11](02-clock-port.md) | `src/temporal-interop.ts` | Low | `.` |
| 12 | Benchmark Specification | [04-platform-adapters.md §4.10](04-platform-adapters.md) | `tests/benchmarks/clock-*.bench.ts` | Low | `.` |
| 13 | Testing Assertion Helpers | [05-testing-support.md §5.6](05-testing-support.md) | `src/testing/assertions.ts` | Low | `./testing` |
| 14 | Process Instance ID | [03-sequence-generator.md §3.3](03-sequence-generator.md) | `src/process-instance-id.ts` | Medium | `.` |
| 15 | AsyncLocalStorage Clock Context | [07-integration.md §7.8](07-integration.md) | `src/context/clock-context.ts` | Low | `.` |
| 16 | Phantom brand types | [type-system/phantom-brands.md](type-system/phantom-brands.md) | `src/ports/clock.ts`, `src/branded.ts`, `src/duration.ts` | — (compile-time) | `.` |
| 17 | Structural safety patterns | [type-system/structural-safety.md](type-system/structural-safety.md) | `src/ports/sequence.ts`, `src/ports/cached-clock.ts`, `src/ports/timer-scheduler.ts` | — (compile-time) | `.` |

## Requirement-Level Traceability

| Spec File | Requirement ID Prefix | Count | Domain |
|-----------|-----------------------|:-----:|--------|
| 02-clock-port.md | CLK-MON, CLK-WCK, CLK-HRS, CLK-BRD, CLK-TMR, CLK-CAC, CLK-CAP, CLK-ASY, CLK-DUR, CLK-TMP | ~60 | Core port interfaces, branded types, timer, cached clock, capabilities, async combinators, duration types, Temporal interop |
| 03-sequence-generator.md | CLK-SEQ, CLK-ORD, CLK-MPC | ~16 | Sequence generation, ordering, multi-process |
| 04-platform-adapters.md | CLK-SYS, CLK-EDGE, CLK-HB, CLK-PERF | ~57 | System clock, edge runtime, host bridge adapters, benchmarks (incl. adapter-level CLK-TMR, CLK-CAC) |
| 05-testing-support.md | CLK-ADV, CLK-WSY, CLK-TST | ~16 | Virtual clock, virtual timer, virtual sequence, assertion helpers |
| compliance/ | CLK-GXP, CLK-QUA, CLK-AUD, CLK-SIG, CLK-CHG, CLK-PAC, CLK-REC, CLK-RTM, CLK-FMEA, CLK-RES, CLK-OPS, CLK-DTS, CLK-SUP | ~156 | GxP compliance, qualification, audit, change control, personnel, recovery, FMEA, distributed time sync, supplier quality |
| 07-integration.md | CLK-INT, CLK-ALS | ~16 | Container registration, clock source change, AsyncLocalStorage context |

For the complete formal requirement ID mapping with regulatory cross-references and validation test cases, see [compliance/gxp.md](06-gxp-compliance/08-requirements-traceability-matrix.md).

## Invariant Traceability

| Invariant | Unit Tests | Type Tests | GxP Tests | FMEA Ref |
|-----------|-----------|------------|-----------|----------|
| [INV-CK-1](invariants.md#inv-ck-1-monotonic-time-never-decreases) | DoD 3: #1-#10 | `system-clock.test-d.ts` | OQ-1 | FM-1c |
| [INV-CK-2](invariants.md#inv-ck-2-all-adapter-return-values-are-frozen) | IQ-4, IQ-5, DoD 7: #1-#4 | — | IQ protocol | FM-4 |
| [INV-CK-3](invariants.md#inv-ck-3-platform-api-references-captured-at-construction) | DoD 3: #1-#5 | — | IQ-4 | FM-4 |
| [INV-CK-4](invariants.md#inv-ck-4-production-sequence-generator-is-structurally-irresettable) | DoD 2: #11-#15 | `sequence-generator.test-d.ts` | IQ-6, DoD 7: #12 | — |
| [INV-CK-5](invariants.md#inv-ck-5-sequence-overflow-is-permanent) | DoD 2: #7-#10 | — | OQ-7 | FM-2 |
| [INV-CK-6](invariants.md#inv-ck-6-startup-self-test-fails-fast) | DoD 3: #11-#23 | — | IQ-14, IQ-15, IQ-16, IQ-19 | FM-1a–FM-1d |
| [INV-CK-7](invariants.md#inv-ck-7-branded-timestamps-prevent-cross-domain-misuse) | DoD 17; DoD 28 | `branded-timestamps.test-d.ts`, `duration-types.test-d.ts` | — | — |
| [INV-CK-8](invariants.md#inv-ck-8-temporalcontext-is-frozen-at-creation) | DoD 8: #1-#6 | `temporal-context.test-d.ts` | IQ-9 | — |
| [INV-CK-9](invariants.md#inv-ck-9-cachedclockport-is-structurally-incompatible-with-clockport) | DoD 21-23 | `cached-clock.test-d.ts` | — | FM-10 |
| [INV-CK-10](invariants.md#inv-ck-10-timer-handles-are-frozen-opaque-objects) | DoD 18 | `system-timer.test-d.ts` | — | FM-13 |
| [INV-CK-11](invariants.md#inv-ck-11-error-objects-are-frozen-at-construction) | DoD 3: #19-#23 | — | IQ-16 | FM-14 |
| [INV-CK-12](invariants.md#inv-ck-12-clock-source-change-events-are-unconditional) | DoD 13: #1-#9 | `clock-source-change.test-d.ts` | IQ-17, IQ-18 | FM-5 |
| [INV-CK-13](invariants.md#inv-ck-13-temporalcontext-capture-ordering) | DoD 8: #7-#8 | — | — | FM-8 |
| [INV-CK-14](invariants.md#inv-ck-14-record-integrity-digests-use-constant-time-comparison) | DoD 8c: #1-#21 | — | — | FM-15 |

## ADR Traceability

| ADR | Affected Invariants | Affected Capabilities |
|-----|--------------------|-----------------------|
| [ADR-CK-001](decisions/001-port-first-architecture.md) | INV-CK-2 | Clock Port, Container Integration |
| [ADR-CK-002](decisions/002-three-time-functions.md) | INV-CK-1, INV-CK-7 | Clock Port |
| [ADR-CK-003](decisions/003-separate-sequence-generator.md) | INV-CK-4, INV-CK-5, INV-CK-13 | Sequence Generator |
| [ADR-CK-004](decisions/004-branded-timestamps.md) | INV-CK-7 | Clock Port |
| [ADR-CK-005](decisions/005-result-based-errors.md) | INV-CK-5, INV-CK-6, INV-CK-11 | All capabilities |
| [ADR-CK-006](decisions/006-structural-irresettability.md) | INV-CK-4 | Sequence Generator |
| [ADR-CK-007](decisions/007-cached-clock-separation.md) | INV-CK-9 | Cached Clock |
| [ADR-CK-008](decisions/008-progressive-api-disclosure.md) | — | All capabilities (API tiering) |
| [ADR-CK-009](decisions/009-branded-duration-types.md) | INV-CK-7 | Duration Types |
| [ADR-CK-010](decisions/010-zero-cost-abstractions.md) | INV-CK-2, INV-CK-3 | All adapters (closure capture, frozen objects, branded numbers) |

## Test File Map

| Test File Pattern | Spec Coverage | Test Level |
|-------------------|--------------|------------|
| `clock-port.test.ts` / `.test-d.ts` | DoD 1 — Clock Port interface | Unit + Type |
| `sequence-generator.test.ts` / `.test-d.ts` | DoD 2 — Sequence Generator | Unit + Type |
| `system-clock.test.ts` / `.test-d.ts` | DoD 3 — System Clock adapter | Unit + Type |
| `system-clock-startup.test.ts` | DoD 3 — Startup self-test (ST-1 through ST-5) | Unit |
| `system-clock-fallback.test.ts` | DoD 3 — Clamped fallback | Unit |
| `virtual-clock.test.ts` | DoD 4 — Virtual clock adapter | Unit |
| `virtual-sequence.test.ts` | DoD 5 — Virtual sequence generator | Unit |
| `clock-diagnostics.test.ts` / `.test-d.ts` | DoD 6 — Clock diagnostics | Unit + Type |
| `gxp-clock.test.ts` | DoD 7 — GxP compliance | GxP |
| `temporal-context.test.ts` / `.test-d.ts` | DoD 8, 8a, 8b, 8c — Temporal context, signatures, deserialization, integrity | Unit + Type |
| `gxp-iq-clock.test.ts` | DoD 9 — Installation Qualification (44 tests) | IQ |
| `gxp-oq-clock.test.ts` | DoD 10 — Operational Qualification (8 tests) | OQ |
| `gxp-pq-clock.test.ts` | DoD 11 — Performance Qualification (5 tests) | PQ |
| `graph-integration.test.ts` / `.test-d.ts` | DoD 12 — Container graph integration | Integration + Type |
| `clock-source-change.test.ts` / `.test-d.ts` | DoD 13 — Clock source change events | Unit + Type |
| `clock-source-bridge.test.ts` / `.test-d.ts` | DoD 14 — Clock source bridge | Unit + Type |
| `gxp-metadata.test.ts` / `.test-d.ts` | DoD 15 — GxP metadata | Unit + Type |
| `hardware-clock.test-d.ts` | DoD 16 — Hardware clock types | Type |
| `branded-timestamps.test.ts` / `.test-d.ts` | DoD 17 — Branded timestamps | Unit + Type |
| `system-timer.test.ts` / `.test-d.ts` | DoD 18 — System timer scheduler | Unit + Type |
| `virtual-timer.test.ts` / `.test-d.ts` | DoD 19-20 — Virtual timer scheduler | Unit + Type |
| `cached-clock.test.ts` / `.test-d.ts` | DoD 21-23 — Cached clock system + virtual + types | Unit + Type |
| `clock-capabilities.test.ts` / `.test-d.ts` | DoD 24 — Clock capabilities | Unit + Type |
| `edge-runtime-clock.test.ts` / `.test-d.ts` | DoD 25 — Edge runtime adapter | Unit + Type |
| `host-bridge-clock.test.ts` / `.test-d.ts` | DoD 26 — Host bridge adapter | Unit + Type |
| `async-combinators.test.ts` / `.test-d.ts` | DoD 27 — Async combinators | Unit + Type |
| `duration-types.test.ts` / `.test-d.ts` | DoD 28 — Duration types | Unit + Type |
| `temporal-interop.test.ts` / `.test-d.ts` | DoD 29 — Temporal API interop | Unit + Type |
| `benchmarks/clock-*.bench.ts` | DoD 30 — Benchmark specification | Perf |
| `assertion-helpers.test.ts` / `.test-d.ts` | DoD 31 — Testing assertion helpers | Unit + Type |
| `clock-context.test.ts` / `.test-d.ts` | DoD 32 — AsyncLocalStorage clock context | Unit + Type |
| `cached-clock-registration.test.ts` / `.test-d.ts` | DoD 33 — Cached clock registration | Unit + Type |
| `process-instance-id.test.ts` / `.test-d.ts` | DoD 34 — Process instance ID | Unit + Type |
| `periodic-evaluation.test.ts` / `.test-d.ts` | DoD 35 — Periodic clock evaluation | Unit + Type |
| `retention-utilities.test.ts` / `.test-d.ts` | DoD 36 — Retention utilities | Unit + Type |
| `validated-branding.test.ts` / `.test-d.ts` | DoD 37 — Validated branding | Unit + Type |

## DoD Traceability

Forward mapping from each Definition of Done group to the spec section(s) it verifies and the test files that satisfy it.

| DoD Group | Spec Section(s) | Test File(s) | Test Level |
|-----------|----------------|--------------|------------|
| [DoD 1: Clock Port](../09-definition-of-done.md#dod-1-clock-port-spec-sections-21–24) | §2.1–2.4 (CLK-MON, CLK-WCK, CLK-HRS) | `clock-port.test.ts`, `clock-port.test-d.ts` | Unit + Type |
| [DoD 2: Sequence Generator Port](../09-definition-of-done.md#dod-2-sequence-generator-port-spec-sections-31–33) | §3.1–3.3 (CLK-SEQ, CLK-ORD, CLK-MPC) | `sequence-generator.test.ts`, `sequence-generator.test-d.ts` | Unit + Type |
| [DoD 3: System Clock Adapter](../09-definition-of-done.md#dod-3-system-clock-adapter-spec-sections-41–45) | §4.1–4.5 (CLK-SYS) | `system-clock.test.ts`, `system-clock.test-d.ts`, `system-clock-startup.test.ts`, `system-clock-fallback.test.ts` | Unit + Type |
| [DoD 4: Virtual Clock Adapter](../09-definition-of-done.md#dod-4-virtual-clock-adapter-spec-section-51) | §5.1 (CLK-TST, CLK-ADV) | `virtual-clock.test.ts` | Unit |
| [DoD 5: Virtual Sequence Generator](../09-definition-of-done.md#dod-5-virtual-sequence-generator-spec-section-52) | §5.2 (CLK-TST) | `virtual-sequence.test.ts` | Unit |
| [DoD 6: Clock Diagnostics](../09-definition-of-done.md#dod-6-clock-diagnostics-spec-sections-28-41) | §2.8, §4.1 (CLK-CAP) | `clock-diagnostics.test.ts`, `clock-diagnostics.test-d.ts` | Unit + Type |
| [DoD 7: GxP Compliance](../09-definition-of-done.md#dod-7-gxp-compliance-cross-cutting) | §2.1–§4.9 cross-cutting GxP (INV-CK-2–INV-CK-4, INV-CK-8) | `gxp-clock.test.ts` | GxP |
| [DoD 8: Temporal Context](../09-definition-of-done.md#dod-8-temporal-context-spec-section-66) | §6.6 (CLK-AUD) | `temporal-context.test.ts`, `temporal-context.test-d.ts` | Unit + Type |
| [DoD 8a: Signature Validation](../09-definition-of-done.md#dod-8a-signature-validation) | §6.5 (CLK-SIG) | `temporal-context.test.ts` (signature tests) | Unit |
| [DoD 8b: Deserialization](../09-definition-of-done.md#dod-8b-deserialization) | §6.6 (CLK-AUD) | `temporal-context.test.ts` (deserialization tests) | Unit |
| [DoD 8c: Record Integrity](../09-definition-of-done.md#dod-8c-record-integrity) | §6.6 (CLK-AUD) — INV-CK-14 | `temporal-context.test.ts` (integrity tests) | Unit |
| [DoD 9: Installation Qualification](../09-definition-of-done.md#dod-9-installation-qualification) | §6.2 IQ protocol (IQ-1–IQ-25) | `gxp-iq-clock.test.ts` | IQ |
| [DoD 10: Operational Qualification](../09-definition-of-done.md#dod-10-operational-qualification) | §6.2 OQ protocol (OQ-1–OQ-8) | `gxp-oq-clock.test.ts` | OQ |
| [DoD 11: Performance Qualification](../09-definition-of-done.md#dod-11-performance-qualification) | §6.2 PQ protocol (PQ-1–PQ-5) | `gxp-pq-clock.test.ts` | PQ |
| [DoD 12: Container Graph Integration](../09-definition-of-done.md#dod-12-container-graph-integration) | §7.1 (CLK-INT-001–004) | `graph-integration.test.ts`, `graph-integration.test-d.ts` | Integration + Type |
| [DoD 13: Clock Source Change Events](../09-definition-of-done.md#dod-13-clock-source-change-events) | §7.3 (CLK-INT-007–011) — INV-CK-12 | `clock-source-change.test.ts`, `clock-source-change.test-d.ts` | Unit + Type |
| [DoD 14: Clock Source Bridge](../09-definition-of-done.md#dod-14-clock-source-bridge) | §7.1 (CLK-INT-003) | `clock-source-bridge.test.ts`, `clock-source-bridge.test-d.ts` | Unit + Type |
| [DoD 15: GxP Metadata](../09-definition-of-done.md#dod-15-gxp-metadata) | §8.1 `getClockGxPMetadata` | `gxp-metadata.test.ts`, `gxp-metadata.test-d.ts` | Unit + Type |
| [DoD 16: Hardware Clock Types](../09-definition-of-done.md#dod-16-hardware-clock-types) | §4.3 (CLK-HB) | `hardware-clock.test-d.ts` | Type |
| [DoD 17: Branded Timestamps](../09-definition-of-done.md#dod-17-branded-timestamps) | §2.5 (CLK-BRD) — INV-CK-7 | `branded-timestamps.test.ts`, `branded-timestamps.test-d.ts` | Unit + Type |
| [DoD 18: System Timer Scheduler](../09-definition-of-done.md#dod-18-system-timer-scheduler) | §2.6, §4.6 (CLK-TMR) — INV-CK-10 | `system-timer.test.ts`, `system-timer.test-d.ts` | Unit + Type |
| [DoD 19–20: Virtual Timer Scheduler](../09-definition-of-done.md#dod-19-virtual-timer-scheduler-clk-tsr-tests) | §5.4 (CLK-WSY) | `virtual-timer.test.ts`, `virtual-timer.test-d.ts` | Unit + Type |
| [DoD 21–23: Cached Clock](../09-definition-of-done.md#dod-21-cached-clock-system) | §2.7, §4.7, §5.5 (CLK-CAC) — INV-CK-9 | `cached-clock.test.ts`, `cached-clock.test-d.ts` | Unit + Type |
| [DoD 24: Clock Capabilities](../09-definition-of-done.md#dod-24-clock-capabilities) | §2.8 (CLK-CAP) | `clock-capabilities.test.ts`, `clock-capabilities.test-d.ts` | Unit + Type |
| [DoD 25: Edge Runtime Adapter](../09-definition-of-done.md#dod-25-edge-runtime-clock-adapter) | §4.8 (CLK-EDGE) | `edge-runtime-clock.test.ts`, `edge-runtime-clock.test-d.ts` | Unit + Type |
| [DoD 26: Host Bridge Adapter](../09-definition-of-done.md#dod-26-host-bridge-clock-adapter) | §4.9 (CLK-HB) | `host-bridge-clock.test.ts`, `host-bridge-clock.test-d.ts` | Unit + Type |
| [DoD 27: Async Combinators](../09-definition-of-done.md#dod-27-async-combinators) | §2.9 (CLK-ASY) | `async-combinators.test.ts`, `async-combinators.test-d.ts` | Unit + Type |
| [DoD 28: Duration Types](../09-definition-of-done.md#dod-28-duration-types) | §2.10 (CLK-DUR) — INV-CK-7 | `duration-types.test.ts`, `duration-types.test-d.ts` | Unit + Type |
| [DoD 29: Temporal API Interop](../09-definition-of-done.md#dod-29-temporal-api-interop) | §2.11 (CLK-TMP) | `temporal-interop.test.ts`, `temporal-interop.test-d.ts` | Unit + Type |
| [DoD 30: Benchmark Specification](../09-definition-of-done.md#dod-30-benchmark-specification) | §4.10 (CLK-PERF) | `benchmarks/clock-reads.bench.ts`, `benchmarks/sequence-generator.bench.ts`, `benchmarks/temporal-context.bench.ts`, `benchmarks/abstraction-overhead.bench.ts`, `benchmarks/memory-overhead.bench.ts`, `benchmarks/cached-clock.bench.ts` | Perf |
| [DoD 31: Testing Assertion Helpers](../09-definition-of-done.md#dod-31-testing-assertion-helpers) | §5.6 | `assertion-helpers.test.ts`, `assertion-helpers.test-d.ts` | Unit + Type |
| [DoD 32: AsyncLocalStorage Clock Context](../09-definition-of-done.md#dod-32-asynclocalstorage-clock-context) | §7.8 (CLK-ALS) | `clock-context.test.ts`, `clock-context.test-d.ts` | Unit + Type |
| [DoD 33: Cached Clock Registration](../09-definition-of-done.md#dod-33-cached-clock-registration) | §7.5 (CLK-INT-005–006) | `cached-clock-registration.test.ts`, `cached-clock-registration.test-d.ts` | Unit + Type |
| [DoD 34: Process Instance ID](../09-definition-of-done.md#dod-34-process-instance-id) | §3.3 (CLK-MPC) | `process-instance-id.test.ts`, `process-instance-id.test-d.ts` | Unit + Type |
| [DoD 35: Periodic Clock Evaluation](../09-definition-of-done.md#dod-35-periodic-clock-evaluation) | §4.1 `setupPeriodicClockEvaluation` (CLK-SYS, CLK-GXP-007) | `periodic-evaluation.test.ts`, `periodic-evaluation.test-d.ts` | Unit + Type |
| [DoD 36: Retention Utilities](../09-definition-of-done.md#dod-36-retention-utilities) | §6.6 `validateRetentionMetadata` (CLK-AUD, CLK-DTS) | `retention-utilities.test.ts`, `retention-utilities.test-d.ts` | Unit + Type |
| [DoD 37: Validated Branding](../09-definition-of-done.md#dod-37-validated-branding) | §2.5 `asMonotonicValidated`, `asWallClockValidated`, `asHighResValidated` (CLK-BRD) | `validated-branding.test.ts`, `validated-branding.test-d.ts` | Unit + Type |

## Coverage Targets

| Metric | Target | Regulatory Basis |
|--------|--------|-----------------|
| Line coverage | > 95% | GAMP 5 Category 5 |
| Branch coverage | > 90% | GAMP 5 Category 5 |
| Mutation score (Stryker) | > 95% | GAMP 5 Appendix M4 |
| Type test coverage | 100% of public types | GAMP 5 Category 5 |
| CLK-* requirement coverage | 100% (300 automatable) | EU GMP Annex 11 Section 4 |
| IQ/OQ/PQ protocol coverage | 57 total (IQ:44, OQ:8, PQ:5) | 21 CFR 11.10(a) |
