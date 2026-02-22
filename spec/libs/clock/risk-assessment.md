# Risk Assessment

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CLK-RSK-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- risk-assessment.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- risk-assessment.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- risk-assessment.md` |
| Status | Effective |

## System Context

`@hex-di/clock` is classified as **GAMP 5 Category 5** (custom software). It provides injectable clock, sequence generation, and timer scheduling abstractions with GxP compliance capabilities including startup self-test, per-record SHA-256 tamper-evidence, and electronic signature binding.

The detailed FMEA risk analysis is maintained in [compliance/gxp.md](06-gxp-compliance/11-fmea-risk-analysis.md).

## Risk Assessment Methodology

This assessment uses ICH Q9 quality risk management principles with FMEA (Failure Mode and Effects Analysis). Risk Priority Numbers (RPN) are calculated as **Severity x Occurrence x Detection** on a 1-10 scale each.

| RPN Range | Classification | Required Action |
|-----------|---------------|----------------|
| 1-60 | Acceptable | Routine monitoring |
| 61-99 | Conditionally acceptable | Documented risk acceptance by QA Reviewer |
| 100+ | Unacceptable | Mandatory corrective action before deployment |

See [compliance/gxp.md](06-gxp-compliance/11-fmea-risk-analysis.md) for the complete scoring criteria (Severity, Occurrence, Detection scales).

## Per-Invariant FMEA Summary

| Invariant | Description | Severity | Detection | Risk | Primary Failure Mode | Mitigation | RPN |
|-----------|-------------|----------|-----------|------|---------------------|------------|-----|
| INV-CK-1 | Monotonic time never decreases | 8 | 2 | Low | FM-1c: Platform `performance.now()` regression | Startup self-test ST-3 | 16 |
| INV-CK-2 | Adapter return values frozen | 9 | 2 | Low | FM-4: Platform API tampering | Captured API refs + GxP freeze | 36 |
| INV-CK-3 | Platform APIs captured at construction | 9 | 2 | Low | FM-4: Post-construction API replacement | Closure-scoped references | 36 |
| INV-CK-4 | Structural irresettability | 9 | 1 | Low | Type-level impossibility | Type system enforcement | N/A |
| INV-CK-5 | Sequence overflow permanent | 9 | 4 | Low | FM-2: Counter reaches MAX_SAFE_INTEGER | Overflow detection + emergency context | 36 |
| INV-CK-6 | Startup self-test fails fast | 8 | 2 | Low | FM-1a-1d: Broken platform APIs | ST-1 through ST-5 at construction | 16-56 |
| INV-CK-7 | Branded timestamps prevent misuse | — | 1 | Negligible | Compile-time prevention | Type system enforcement | N/A |
| INV-CK-8 | TemporalContext frozen | 8 | 2 | Low | FM-4: Record mutation after creation | `Object.freeze()` at creation | 16 |
| INV-CK-9 | CachedClockPort incompatible with ClockPort | 8 | 1 | Negligible | FM-10: Cached clock for audit | Structural type incompatibility | 16 |
| INV-CK-10 | Timer handles frozen | 4 | 3 | Low | FM-13: Timer handle forgery | `Object.freeze()` at creation | 12 |
| INV-CK-11 | Error objects frozen | 5 | 3 | Low | FM-14: Error metadata mutation | `Object.freeze()` at construction | 15 |
| INV-CK-12 | Change events unconditional | 7 | 4 | Low-Mod | FM-5: Silent adapter replacement | Unconditional event emission | 56 |
| INV-CK-13 | Capture ordering guaranteed | 6 | 3 | Low | FM-8: Wrong capture order | Spec + test verification | 36 |
| INV-CK-14 | Constant-time comparison | 9 | 3 | Low | FM-15: Timing side-channel on digest verification | Constant-time algorithm | 27 |

## Risk Summary

| RPN Range | Count | Failure Modes |
|-----------|-------|---------------|
| 1-30 | 6 | FM-1c (16), FM-10 (16), FM-11 (30), FM-13 (12), FM-14 (15), FM-15 (27) |
| 31-60 | 10 | FM-1a (32), FM-1b (48), FM-1d (56), FM-2 (36), FM-4 (36), FM-5 (56), FM-7 (48), FM-8 (36), FM-9 (36), FM-12 (48) |
| 61-90 | 2 | FM-3 (84), FM-6 (75) |
| 91+ | 0 | — |

**Highest residual risk**: FM-3 (NTP desynchronization) at RPN 84. Mitigated by ecosystem periodic drift monitoring.

**Second highest**: FM-6 (Process crash and restart) at RPN 75. Mitigated by `(processInstanceId, sequenceNumber)` composite key.

The FMEA also includes 6 compound failure mode scenarios (CFM-1 through CFM-6), all within the 31-60 managed risk range. See [compliance/gxp.md](06-gxp-compliance/11-fmea-risk-analysis.md) for the complete compound analysis.

## Low-Risk Justifications

**FM-1c (Monotonic regression, RPN 16)**: Platform-level monotonicity violations in `performance.now()` are exceedingly rare and are detected immediately by startup self-test ST-3 before any timestamp is served.

**FM-10 (Cached clock misuse, RPN 16)**: Compile-time prevention via structural type incompatibility between `CachedClockPort` and `ClockPort`. The method name mismatch (`recentMonotonicNow` vs. `monotonicNow`) makes substitution a compile error.

**FM-11 (Timer ordering violation, RPN 30)**: Implementation-specific to `VirtualTimerScheduler` (test utility only). Covered by DoD 20 tests verifying chronological firing order.

**FM-13 (Timer handle forgery, RPN 12)**: `TimerHandle` objects are frozen plain objects with no public constructor. An attacker cannot produce a structurally valid handle without going through the adapter API. The low severity (4) reflects that bypassing the abstraction would only affect timer cancellation, not data integrity.

**FM-14 (Error metadata mutation, RPN 15)**: Error objects are immutable from construction via `Object.freeze()`. The metadata they carry (e.g., `SequenceOverflowError.lastValue`) is a plain number, making post-freeze mutation impossible in strict JavaScript. Covered by IQ-16 freeze verification.

**FM-15 (Timing side-channel on digest verification, RPN 27)**: The constant-time comparison algorithm eliminates observable timing variance regardless of byte-match position. Severity (9) reflects the sensitivity of digest verification; low RPN results from the effective countermeasure with no practical bypass in a server-side JavaScript environment.

## Risk Acceptance Criteria

| Risk Level | Acceptance Condition |
|------------|---------------------|
| Low (RPN 1-60) | Routine monitoring; no additional corrective action |
| Conditionally acceptable (RPN 61-99) | Documented risk acceptance by QA Reviewer required |
| Unacceptable (RPN 100+) | Mandatory corrective action before deployment |

## Residual Risk Summary

| ID | Description | ALCOA+ Impact | Compensating Controls | Review Cadence |
|----|-------------|---------------|----------------------|----------------|
| FM-3 | NTP desynchronization | Contemporaneous | Ecosystem periodic drift monitoring; CLK-GXP-008 compensating controls | Per deployment; annual FMEA review |
| FM-6 | Process crash/restart | Complete | `processInstanceId` composite key; monitoring adapter startup logging | Per incident; annual FMEA review |

## Assessment Provenance

| Field | Value |
|-------|-------|
| Assessor | Specification author |
| Independence | Self-assessed (pre-release); independent QA review required for GxP deployment |
| Methodology | ICH Q9 FMEA with RPN scoring (Severity x Occurrence x Detection) |
| 3-way compound exclusion | Justified per ICH Q9 proportionality — see [FMEA](06-gxp-compliance/11-fmea-risk-analysis.md) |

## Review Schedule

The FMEA must be re-evaluated when:
- New failure modes are identified
- Detection mechanisms are added or modified
- Mitigations are changed
- Platform or infrastructure changes affect occurrence likelihood
- Annually (12 months from last review) per CLK-FMEA-001

See [compliance/gxp.md](06-gxp-compliance/11-fmea-risk-analysis.md) for the complete periodic review schedule and risk acceptance records.
