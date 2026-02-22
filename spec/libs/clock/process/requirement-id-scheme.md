# Requirement Identification Scheme

Naming conventions and uniqueness guarantees for all identifiers used in the `@hex-di/clock` specification.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CLK-PRC-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- process/requirement-id-scheme.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- process/requirement-id-scheme.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- process/requirement-id-scheme.md` |
| Status | Effective |

## Requirement ID Format

`@hex-di/clock` uses a domain-prefixed requirement identification scheme. All requirement IDs begin with `CLK-` followed by a domain code and a three-digit sequential number.

### Format: `CLK-{DOMAIN}-{NNN}`

| Component | Format | Meaning |
|-----------|--------|---------|
| `CLK` | Fixed prefix | Clock library specification |
| `{DOMAIN}` | 2-5 letter code | Functional domain (see table below) |
| `{NNN}` | Three-digit integer (001-999) | Sequential requirement number within the domain |

### Domain Codes

| Domain Code | Full Name | Spec Location | Count |
|-------------|-----------|---------------|:-----:|
| `MON` | Monotonic time | 02-clock-port.md §2.2 | 2 |
| `WCK` | Wall-clock time | 02-clock-port.md §2.3 | 1 |
| `HRS` | High-resolution time | 02-clock-port.md §2.4 | 3 |
| `BRD` | Branded timestamps | 02-clock-port.md §2.5 | 9 |
| `TMR` | Timer scheduler | 02-clock-port.md §2.7, 04-platform-adapters.md §4.6, 05-testing-support.md §5.4 | 12 |
| `CAC` | Cached clock | 02-clock-port.md §2.8, 04-platform-adapters.md §4.7 | 10 |
| `CAP` | Clock capabilities | 02-clock-port.md §2.8 | 11 |
| `SEQ` | Sequence generator | 03-sequence-generator.md §3.1 | 6 |
| `ORD` | Ordering guarantees | 03-sequence-generator.md §3.2 | 1 |
| `MPC` | Multi-process coordination | 03-sequence-generator.md §3.3 | 9 |
| `ASY` | Async combinators | 02-clock-port.md §2.9 | 10 |
| `DUR` | Duration types | 02-clock-port.md §2.10 | 7 |
| `TMP` | Temporal API interop | 02-clock-port.md §2.11 | 6 |
| `SYS` | System clock adapter | 04-platform-adapters.md §4.1–4.3 | 24 |
| `EDGE` | Edge runtime adapter | 04-platform-adapters.md §4.8 | 9 |
| `HB` | Host bridge adapter | 04-platform-adapters.md §4.9 | 9 |
| `PERF` | Benchmark specification | 04-platform-adapters.md §4.10 | 5 |
| `ADV` | Virtual clock advance | 05-testing-support.md §5.1 | 5 |
| `WSY` | Virtual clock wall-sync | 05-testing-support.md §5.4 | 4 |
| `TST` | Testing assertion helpers | 05-testing-support.md §5.6 | 7 |
| `GXP` | GxP compliance | compliance/ | 16 |
| `QUA` | Qualification protocols | [02-qualification-protocols.md](../06-gxp-compliance/02-qualification-protocols.md) | 19 |
| `AUD` | Audit trail integration | [06-audit-trail-integration.md](../06-gxp-compliance/06-audit-trail-integration.md) | 39 |
| `SIG` | Electronic signatures | [06-audit-trail-integration.md §sig](../06-gxp-compliance/06-audit-trail-integration.md) | 18 |
| `CHG` | Change control | [03-verification-and-change-control.md](../06-gxp-compliance/03-verification-and-change-control.md) | 22 |
| `PAC` | Personnel and access control | [10-personnel-and-access-control.md](../06-gxp-compliance/10-personnel-and-access-control.md) | 19 |
| `REC` | Recovery procedures | [07-recovery-procedures.md](../06-gxp-compliance/07-recovery-procedures.md) | 6 |
| `RTM` | RTM completeness | [08-requirements-traceability-matrix.md](../06-gxp-compliance/08-requirements-traceability-matrix.md) | 5 |
| `FMEA` | FMEA risk analysis | [11-fmea-risk-analysis.md](../06-gxp-compliance/11-fmea-risk-analysis.md) | 2 |
| `RES` | Resolution and precision | [04-resolution-and-precision.md](../06-gxp-compliance/04-resolution-and-precision.md) | 1 |
| `OPS` | Operational requirements | [01-clock-source-requirements.md §ops](../06-gxp-compliance/01-clock-source-requirements.md) | 2 |
| `INT` | Container integration | 07-integration.md | 11 |
| `ALS` | AsyncLocalStorage clock context | 07-integration.md §7.8 | 5 |
| `DTS` | Distributed time synchronization | [01-clock-source-requirements.md §DTS](../06-gxp-compliance/01-clock-source-requirements.md) | 5 |
| `SUP` | Supplier quality agreement | [09-supplier-assessment.md §sqa](../06-gxp-compliance/09-supplier-assessment.md) | 2 |

**Total**: 322 formal CLK-prefixed requirements.

### Operational Requirements

22 requirements are tagged `[OPERATIONAL]`, indicating procedural or organizational requirements that cannot be verified by the library's automated test suite. These are: CLK-HRS-002, CLK-MPC-001, CLK-MPC-005, CLK-MPC-006, CLK-SYS-002, CLK-SYS-003, CLK-SYS-013, CLK-SYS-019, CLK-HB-008, CLK-HB-009, CLK-GXP-008, CLK-GXP-009, CLK-GXP-010, CLK-GXP-011, CLK-GXP-012, CLK-DTS-001, CLK-DTS-002, CLK-DTS-003, CLK-DTS-004, CLK-DTS-005, CLK-SUP-001, CLK-SUP-002.

## Invariant IDs — `INV-CK-N`

| Component | Format | Meaning |
|-----------|--------|---------|
| `INV-CK` | Prefix | Clock library invariant |
| `N` | Integer (1-14) | Sequential invariant number |

**Examples**: `INV-CK-1` (Monotonic Time Never Decreases), `INV-CK-14` (Constant-Time Comparison).

**Stability**: Numbers are permanent and never reused.

### Current Allocation

| ID | Invariant | Spec Reference |
|----|-----------|---------------|
| INV-CK-1 | Monotonic Time Never Decreases | [invariants.md](../invariants.md#inv-ck-1-monotonic-time-never-decreases) |
| INV-CK-2 | All Adapter Return Values Are Frozen | [invariants.md](../invariants.md#inv-ck-2-all-adapter-return-values-are-frozen) |
| INV-CK-3 | Platform API References Captured at Construction | [invariants.md](../invariants.md#inv-ck-3-platform-api-references-captured-at-construction) |
| INV-CK-4 | Production Sequence Generator Is Structurally Irresettable | [invariants.md](../invariants.md#inv-ck-4-production-sequence-generator-is-structurally-irresettable) |
| INV-CK-5 | Sequence Overflow Is Permanent | [invariants.md](../invariants.md#inv-ck-5-sequence-overflow-is-permanent) |
| INV-CK-6 | Startup Self-Test Fails Fast | [invariants.md](../invariants.md#inv-ck-6-startup-self-test-fails-fast) |
| INV-CK-7 | Branded Timestamps Prevent Cross-Domain Misuse | [invariants.md](../invariants.md#inv-ck-7-branded-timestamps-prevent-cross-domain-misuse) |
| INV-CK-8 | TemporalContext Is Frozen at Creation | [invariants.md](../invariants.md#inv-ck-8-temporalcontext-is-frozen-at-creation) |
| INV-CK-9 | CachedClockPort Is Structurally Incompatible with ClockPort | [invariants.md](../invariants.md#inv-ck-9-cachedclockport-is-structurally-incompatible-with-clockport) |
| INV-CK-10 | Timer Handles Are Frozen Opaque Objects | [invariants.md](../invariants.md#inv-ck-10-timer-handles-are-frozen-opaque-objects) |
| INV-CK-11 | Error Objects Are Frozen at Construction | [invariants.md](../invariants.md#inv-ck-11-error-objects-are-frozen-at-construction) |
| INV-CK-12 | Clock Source Change Events Are Unconditional | [invariants.md](../invariants.md#inv-ck-12-clock-source-change-events-are-unconditional) |
| INV-CK-13 | TemporalContext Capture Ordering | [invariants.md](../invariants.md#inv-ck-13-temporalcontext-capture-ordering) |
| INV-CK-14 | Record Integrity Digests Use Constant-Time Comparison | [invariants.md](../invariants.md#inv-ck-14-record-integrity-digests-use-constant-time-comparison) |

## Architecture Decision Records — `ADR-CK-NNN`

| Component | Format | Meaning |
|-----------|--------|---------|
| `ADR-CK` | Prefix | Clock library ADR |
| `NNN` | Three-digit integer (001-010) | Sequential decision number |

### Current Allocation

| ADR | Title | File |
|-----|-------|------|
| ADR-CK-001 | Port-First Architecture | [decisions/001-port-first-architecture.md](../decisions/001-port-first-architecture.md) |
| ADR-CK-002 | Three Time Functions | [decisions/002-three-time-functions.md](../decisions/002-three-time-functions.md) |
| ADR-CK-003 | Separate Sequence Generator | [decisions/003-separate-sequence-generator.md](../decisions/003-separate-sequence-generator.md) |
| ADR-CK-004 | Branded Timestamps | [decisions/004-branded-timestamps.md](../decisions/004-branded-timestamps.md) |
| ADR-CK-005 | Result-Based Error Handling | [decisions/005-result-based-errors.md](../decisions/005-result-based-errors.md) |
| ADR-CK-006 | Structural Irresettability | [decisions/006-structural-irresettability.md](../decisions/006-structural-irresettability.md) |
| ADR-CK-007 | Cached Clock Structural Separation | [decisions/007-cached-clock-separation.md](../decisions/007-cached-clock-separation.md) |
| ADR-CK-008 | Progressive API Disclosure | [decisions/008-progressive-api-disclosure.md](../decisions/008-progressive-api-disclosure.md) |
| ADR-CK-009 | Branded Duration Types | [decisions/009-branded-duration-types.md](../decisions/009-branded-duration-types.md) |
| ADR-CK-010 | Zero-Cost Abstraction Patterns | [decisions/010-zero-cost-abstractions.md](../decisions/010-zero-cost-abstractions.md) |

## FMEA Failure Mode IDs — `FM-N` / `CFM-N`

| Component | Format | Meaning |
|-----------|--------|---------|
| `FM` | Prefix | Individual failure mode |
| `CFM` | Prefix | Compound failure mode |
| `N` | Integer | Sequential failure mode number |

Individual: FM-1a through FM-12 (12 failure modes).
Compound: CFM-1 through CFM-6 (6 compound scenarios).

See [06-gxp-compliance/README.md](../06-gxp-compliance/README.md).

## Document Identifiers — `SPEC-CLK-{CAT}-{NNN}`

| Component | Format | Meaning |
|-----------|--------|---------|
| `SPEC-CLK` | Prefix | Clock library specification document |
| `{CAT}` | 3-letter code | Document category |
| `{NNN}` | Three-digit integer | Sequential within category |

| Category Code | Document Type |
|---------------|--------------|
| `OVW` | Overview |
| `INV` | Invariants |
| `GLO` | Glossary |
| `TRC` | Traceability |
| `RSK` | Risk assessment |
| `RMP` | Roadmap |
| `ADR` | Architecture Decision Record |
| `PRC` | Process document |
| `GXP` | GxP compliance |

## Uniqueness Guarantee

1. Every identifier is unique across the entire `@hex-di/clock` specification.
2. The `CLK-` prefix prevents collisions with other packages. Core `@hex-di/result` uses no prefix; `@hex-di/result-react` uses `R` infix; `@hex-di/clock` uses `CLK-`.
3. Invariants use `INV-CK-N` (the `CK` infix distinguishes from core `INV-N`).
4. ADRs use `ADR-CK-NNN` (the `CK` infix distinguishes from core `ADR-NNN`).
5. Identifiers are assigned once and never reused for a different purpose.
6. Withdrawn requirements retain their identifier with a "Withdrawn" marker.

## Cross-References

When referencing identifiers across documents, use the full identifier with a markdown link to the source:

```markdown
See [CLK-MON-001](../02-clock-port.md).
See [INV-CK-1](../invariants.md#inv-ck-1-monotonic-time-never-decreases).
See [ADR-CK-001](../decisions/001-port-first-architecture.md).
See [FM-3](../06-gxp-compliance/11-fmea-risk-analysis.md).
```
