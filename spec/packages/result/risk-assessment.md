# Risk Assessment

Failure Mode and Effects Analysis (FMEA) for `@hex-di/result`, following ICH Q9 risk management principles.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CORE-RSK-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- risk-assessment.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- risk-assessment.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- risk-assessment.md` |
| Status | Effective |

> This document factors out the risk assessment content from [compliance/gxp.md](compliance/gxp.md#risk-assessment-methodology) into a standalone document for structural parity with the `result-react` specification suite. The canonical risk methodology, per-invariant assessment, and residual risks are maintained here. The inline content in `compliance/gxp.md` remains with callout links to this document.

## System Context

`@hex-di/result` is a **deterministic, stateless, zero-dependency** TypeScript library providing `Result<T, E>`, `ResultAsync<T, E>`, and `Option<T>` types. It has:

- **No external I/O**: No network requests, no file access, no database queries
- **No configuration**: Behavior is fixed by source code (GAMP 5 Category 3)
- **No randomness**: All operations are deterministic — same input always produces same output
- **Zero production dependencies**: No supply chain risk from transitive dependencies

### GAMP 5 Classification

| Usage | Category | Rationale |
|-------|----------|-----------|
| Consumed as-is from npm | **Category 3** (non-configured COTS) | No configuration; behavior fixed by source code |
| Used as dependency in a validated system | **Category 3** within parent system | Document version, verify behavior in system context |
| Forked or modified | **Category 5** (custom application) | Full lifecycle validation required |

## Risk Assessment Methodology

### Approach

Invariant risk levels are assigned using a simplified risk assessment aligned with ICH Q9 (Quality Risk Management). Because `@hex-di/result` is a deterministic library with no external I/O, no randomness, and no configuration, **probability of occurrence** is not a meaningful variable — a defect in a given invariant either exists in the code or does not. The assessment therefore uses a two-factor model rather than a full FMEA (Failure Mode and Effects Analysis).

> **Auditor note — Why not FMEA?** A full FMEA is disproportionate for a deterministic, stateless, zero-dependency library. FMEA's three-factor model (Severity x Occurrence x Detectability) requires estimating occurrence probability, which is not meaningful here — there are no stochastic failure modes, no environmental variability, and no I/O-dependent behavior. The simplified Severity x Detectability model retains the two factors that are meaningful for code-level defects and is consistent with ICH Q9's principle that "the level of effort, formality, and documentation of the quality risk management process should be commensurate with the level of risk" (ICH Q9 S2).

| Factor | Definition | Scale |
|--------|-----------|-------|
| **Severity** | Impact on data integrity and patient safety if the invariant is violated | Critical / Major / Minor |
| **Detectability** | Likelihood that a violation would be caught by the test suite before release | High / Medium / Low (lower detectability = harder to catch = higher risk) |

### Risk Level Determination

| Severity | Detectability | ICH Q9 Risk Level |
|----------|--------------|-------------------|
| Critical (data integrity / patient safety) | Any | **High** |
| Major (operational reliability) | Medium or Low | **High** |
| Major (operational reliability) | High | **Medium** |
| Minor (developer experience) | Any | **Low** |

### Classification Criteria

| Risk Level | Criteria | Examples |
|------------|----------|---------|
| **High** | Violation directly enables data corruption, forgery, or silent loss of error information. At least one ALCOA+ principle is at risk. | INV-1 (immutability — "Original"), INV-3 (brand — "Accurate"), INV-5 (error suppression — "Complete") |
| **Medium** | Violation affects operational reliability or diagnostic quality but does not directly compromise data integrity. Compensating controls (e.g., downstream validation) may partially mitigate. | INV-2 (promise safety), INV-4 (generator safety), INV-14 (delegation consistency) |
| **Low** | Violation affects developer experience, internal consistency, or type-level ergonomics. No runtime data integrity impact. | INV-6 (phantom types — compile-time only), INV-8 (lazy registration — internal wiring), INV-13 (subpath blocking — API surface control) |

## Per-Invariant FMEA

| Invariant | Description | Severity | Detectability | Risk | Failure Mode | Mitigation | Test Coverage |
|-----------|-------------|----------|--------------|------|-------------|------------|---------------|
| INV-1 | Frozen Result Instances | Critical | High | **High** | `Object.freeze()` removed — silent post-creation mutation enables data corruption. ALCOA+ "Original" violated. | Dedicated GxP integrity test (`gxp/freeze.test.ts`); mutation testing with zero surviving mutants on freeze paths | `core/result.test.ts`, `gxp/freeze.test.ts`, `immutability.feature` |
| INV-2 | Internal Promise Never Rejects | Major | High | **Medium** | Unhandled rejection in `ResultAsync` — operationally serious but does not corrupt stored data; downstream `await` still produces a value | Unit tests for rejection paths; Stryker mutation coverage | `async/result-async.test.ts`, `async-safety.feature` |
| INV-3 | Brand Symbol Prevents Forgery | Critical | High | **High** | Brand bypass allows acceptance of non-genuine Results, undermining ALCOA+ "Accurate" | Dedicated GxP tamper-evidence test; zero surviving mutants on brand check code | `core/guards.test.ts`, `guards.test-d.ts`, `gxp/tamper-evidence.test.ts`, `brand-validation.feature` |
| INV-4 | Err Generator Throws on Continuation | Major | High | **Medium** | Continuation past yield leads to incorrect data processing — detectable at call site | Unit tests for throw behavior; Stryker mutation coverage | `generators/safe-try.test.ts`, `generators.feature` |
| INV-5 | Error Suppression in Tee | Critical | High | **High** | Silent audit log failure via `andTee()`/`orTee()` — direct 21 CFR 11.10(e) violation per ATR-1 | Dedicated GxP error-suppression test; CI job 9 grep-based enforcement | `core/result.test.ts`, `gxp/error-suppression.test.ts`, `side-effects.feature` |
| INV-6 | Phantom Types Enable Free Composition | Minor | N/A (compile-time) | **Low** | Phantom type ergonomics failure — no runtime behavior; TypeScript compiler prevents misuse at compile time | Type-level tests only (proportionate for compile-time constraint) | `types.test-d.ts` |
| INV-7 | createError Output Is Frozen | Critical | High | **High** | Mutable error objects enable post-creation tampering, undermining ALCOA+ "Original" for error data | Dedicated GxP error-freeze test; mutation testing | `errors/create-error.test.ts`, `gxp/error-freeze.test.ts`, `error-patterns.feature` |
| INV-8 | Lazy ResultAsync Registration | Minor | High | **Low** | Incorrect registration throws immediately (fail-fast) — no silent data corruption possible | Unit tests; fail-fast behavior is self-detecting | `async/result-async.test.ts` |
| INV-9 | ResultAsync Brand Identity | Major | High | **Medium** | `ResultAsync` brand forgery — less critical than INV-3 since async Results are typically awaited, producing a sync Result subject to INV-3 | Dedicated GxP async-tamper test; Stryker mutation coverage | `core/guards.test.ts`, `guards.test-d.ts`, `gxp/async-tamper.test.ts`, `brand-validation.feature` |
| INV-10 | Frozen Option Instances | Critical | High | **High** | Identical to INV-1 for the Option type — mutable Options violate ALCOA+ "Original" | Dedicated GxP option-freeze test; mutation testing | `option/option.test.ts`, `gxp/option-freeze.test.ts`, `option.feature` |
| INV-11 | Option Brand Prevents Forgery | Critical | High | **High** | Identical to INV-3 for the Option type — forged Options undermine ALCOA+ "Accurate" | Dedicated GxP option-tamper test; Stryker mutation coverage | `option/guards.test.ts`, `guards.test-d.ts`, `gxp/option-tamper.test.ts`, `brand-validation.feature` |
| INV-12 | UnwrapError Contains Context | Major | High | **Medium** | Missing `.context` degrades debugging diagnostics but does not corrupt data or suppress errors | Unit tests for context structure; Stryker mutation coverage | `unsafe/unwrap.test.ts`, `unwrap.test-d.ts`, `unsafe.feature` |
| INV-13 | Subpath Blocking | Minor | Medium | **Low** | Bypass exposes internal implementation details but does not affect data integrity of correctly used public APIs | Unit tests; Cucumber acceptance tests | `exports.test.ts`, `subpath-exports.feature` |
| INV-14 | Standalone Functions Delegate | Major | High | **Medium** | Behavioral inconsistency between method and standalone APIs — confusing but both paths execute the same underlying logic, no data loss | Unit and type tests for delegation; Stryker mutation coverage | `fn/*.test.ts`, `fn/*.test-d.ts`, `gxp/delegation.test.ts`, `standalone-functions.feature` |

## Risk Summary

| Risk Level | Count | Invariants | Testing Requirement |
|------------|-------|------------|---------------------|
| High | 6 | INV-1, 3, 5, 7, 10, 11 | All 6 test levels + dedicated GxP integrity tests |
| Medium | 5 | INV-2, 4, 9, 12, 14 | Unit + Type + Mutation + Cucumber + GxP integrity (where applicable) |
| Low | 3 | INV-6, 8, 13 | Unit + Mutation (where applicable) |

### Low-Risk Invariant Justifications

**INV-6 (Phantom Types Enable Free Composition) — Low risk justification**: INV-6 is a compile-time-only property enforced by the TypeScript type system. It has no runtime behavior and cannot be violated at runtime — the TypeScript compiler prevents misuse at compile time. Detectability is rated N/A because violations are caught before code can execute. No ALCOA+ principle is at risk. Coverage consists of type-level tests (`types.test-d.ts`) only, which is proportionate for a purely compile-time constraint.

**INV-8 (Lazy ResultAsync Registration) — Low risk justification**: INV-8 governs internal module wiring for the `ResultAsync` class. Incorrect registration would cause an immediate fail-fast error (`throw`) on first use — there is no scenario where this invariant could silently fail or corrupt data. Detectability is High (fail-fast behavior). The invariant affects internal library bootstrapping, not data integrity or ALCOA+ properties.

**INV-13 (Subpath Blocking) — Low risk justification**: INV-13 prevents consumers from importing internal modules via subpath exports in `package.json`. Bypassing this control would expose internal implementation details but would not affect the data integrity, immutability, or brand validation of correctly used public APIs. Detectability is Medium (requires intentional circumvention of module resolution). No ALCOA+ principle is at risk when public APIs are used as documented.

### INV-12 Monitoring Note

INV-12 verifies that `UnwrapError` includes a `.context` property for structured debugging. This invariant affects developer diagnostic experience rather than data integrity or brand validation. If future usage patterns reveal that `.context` data is relied upon for GxP audit trail diagnostics, this assessment will be revisited and INV-12 may be escalated to High risk with a corresponding dedicated GxP integrity test. Re-evaluate at the next annual GxP compliance review (January 2027).

## Risk Acceptance Criteria

Residual risk is accepted when **all** of the following criteria are met for the applicable risk level:

| Risk Level | Acceptance Criteria |
|------------|---------------------|
| **High** | All 6 test levels pass (unit, type, mutation, Cucumber, GxP integrity, performance). Zero surviving mutants in brand validation (`core/brand.ts`, `core/guards.ts`) and freeze (`core/result.ts` freeze paths) code. Dedicated GxP integrity tests pass. |
| **Medium** | At least 4 test levels pass (unit, type, mutation, Cucumber). Mutation score >= 90% for the affected module. |
| **Low** | Standard unit test coverage sufficient. No formal mutation score target required. |

**Residual risk acceptance statement**: Residual risk is accepted when all criteria above are met for the applicable risk level and no open Critical or Major findings exist in the current GxP compliance review cycle. If any Critical or Major finding remains open, a formal risk acceptance decision must be documented by QA management with justification per ICH Q9 Section 6 (Risk Control), including identification of compensating controls and a timeline for closure.

## Residual Risk Summary

| ID | Risk Description | ALCOA+ Impact | Compensating Controls | Documented In | Review Cadence |
|----|-----------------|---------------|----------------------|---------------|----------------|
| RR-1 | **Shallow freeze**: `Object.freeze()` is shallow — nested objects inside `ok(value)` or `err(error)` can be mutated after Result creation | Original | Deep freeze wrapper pattern (`okGxP`/`errGxP`); development-mode detection wrapper (`okChecked`/`errChecked`); OQ-011 verifies known limitation | [gxp.md ALCOA+ Gap: Shallow Freeze](compliance/gxp.md#alcoa-gap-shallow-freeze) | Annual GxP review |
| RR-2 | **INV-12 potential escalation**: `UnwrapError.context` may be relied upon for GxP audit trail diagnostics in the future, which would escalate INV-12 from Medium to High risk | N/A (currently diagnostic only) | 4-level test coverage (unit, type, mutation, Cucumber); monitoring note for future usage patterns | [INV-12 Monitoring Note](#inv-12-monitoring-note) | Re-evaluate January 2027 or upon any escalation trigger (whichever is earlier) |
| RR-3 | **Non-contractual response targets**: GxP incident response targets are good-faith commitments, not contractual SLAs | Available | Consumer fork contingency documented; escalation procedure with compensating controls at 2x and 3x target; consumer notification mechanisms | [gxp.md GxP Incident Reporting](compliance/gxp.md#gxp-incident-reporting) | Annual GxP review |
| RR-4 | **Pre-repository review evidence**: Review History entries dated 2026-02-15 predate the Git repository and cannot be independently verified via commit history | Attributable, Contemporaneous | Attestation bridge requirement for Q2 2026 review; review findings are self-evident in current document content; all future reviews follow Git-verifiable process | [ci-maintenance.md Review History](process/ci-maintenance.md#review-history) | One-time (Q2 2026 attestation) |
| RR-5 | **Option serialization gap** *(Resolved)*: Option type now provides native `toJSON()` / `fromOptionJSON()` in v1.0.0 | N/A (resolved) | Native `toJSON()` on Some/None; `fromOptionJSON()` for deserialization; DRR-4 updated to reflect native support | [gxp.md Option Serialization](compliance/gxp.md#option-serialization-for-data-retention) | N/A (resolved) |
| RR-6 | **ATR-1 grep over-approximation**: CI job 9 uses syntactic grep (not semantic analysis) to enforce `andTee`/`orTee` prohibition, which may reject legitimate non-critical usage in GxP-annotated files | N/A (false positives only — no compliance risk) | Documented exemption process (move non-critical code to non-GxP module or add inline justification); ESLint plugin planned for semantic analysis | [gxp.md Interim Compensating Controls](compliance/gxp.md#interim-compensating-controls) | Until ESLint plugin replaces grep |
| RR-7 | **Sole-maintainer bus factor**: GxP incident response targets depend on a single maintainer's availability. Extended unavailability could leave `gxp-critical` issues unresolved beyond the documented response targets | Available | (1) Escalation procedure at 2x and 3x target with consumer compensating controls; (2) consumer fork contingency; (3) full source code and specifications are public under MIT license; (4) zero production dependencies reduces scope; (5) Reviewer Identification Plan targets engagement of a second qualified individual | [gxp.md GxP Incident Reporting](compliance/gxp.md#gxp-incident-reporting), [gxp.md Reviewer Identification Plan](compliance/gxp.md#reviewer-identification-plan) | Annual GxP review |

**Maintenance**: This table is updated whenever a new residual risk is identified or an existing risk is resolved. Resolved risks are not removed — they are marked with a "Resolved" status and the resolution date to maintain the audit trail. The table is reviewed as part of each annual GxP compliance review.

## Assessment Provenance

| Field | Value |
|-------|-------|
| Assessor role | Library maintainer with GxP domain knowledge |
| Independent reviewer role | Independent QA reviewer with no authorship of the assessed invariants |
| Last independent review date | Pending — required before v1.0 release |
| Initial assessment date | Part of specification v1.0.0 |
| Review cadence | Re-assessed annually (January) as part of the GxP compliance review cycle per [ci-maintenance.md](process/ci-maintenance.md#periodic-review), and upon introduction of any new invariant |
| Methodology reference | Adapted from ICH Q9 Section 5 (Risk Assessment) using a simplified Severity x Detectability model appropriate for a deterministic, zero-dependency library |

### Independent Review Sign-Off

The independent review is a **v1.0 release blocker**. The reviewer must satisfy all of the following criteria:

1. **Independence**: No authorship or co-authorship of any invariant (INV-1 through INV-14), behavior specification, or ADR in this specification suite
2. **Qualification**: Demonstrated GxP domain knowledge (regulatory affairs, quality assurance, or validation engineering experience in a regulated environment)
3. **Scope**: Review all 14 invariant risk classifications (severity, detectability, risk level) and the overall methodology

**Sign-off record** (to be completed before v1.0 GA):

| Field | Value |
|-------|-------|
| Reviewer name | _Pending_ |
| Reviewer role/affiliation | _Pending_ |
| Review date | _Pending_ |
| Classification changes | _Pending — document any invariants reclassified, with before/after and rationale_ |
| Outcome | _Pending — Accepted / Accepted with modifications / Rejected_ |

> **Process**: The completed sign-off record replaces the `_Pending_` entries above. The review is documented as a GitHub PR modifying this section, preserving the review discussion in the PR thread. The PR must be merged before the v1.0 release tag is created.

## Review Schedule

This FMEA must be re-evaluated under the following circumstances:

1. **New invariant addition** — When a new invariant (INV-15+) is added, assess its severity, detectability, and risk level. Update the FMEA table and risk summary.
2. **Major version release** — Review all invariant risk classifications before each major version release. Verify that mitigations remain effective and that no new high-risk failure modes have been introduced.
3. **Post-incident** — If a defect is reported in production use (data corruption, brand bypass, silent error suppression), add a new residual risk entry or update the affected invariant's risk classification.
4. **Annually** — As part of the periodic review defined in [change-control.md](process/change-control.md#periodic-review), re-evaluate the FMEA to confirm risk levels remain accurate and mitigations are still in place. The annual review must be completed within **Q1 of each calendar year** (by March 31).

### Re-Evaluation Log

Record each FMEA re-evaluation here. Each entry corresponds to a Git PR that reviewed this document.

| Date | Trigger | Reviewer | PR | Changes Made |
|------|---------|----------|-----|-------------|
| 2026-02-16 | Initial standalone creation | Mohammad AL Mechkor | — (factored from gxp.md) | Initial FMEA creation — 14 invariants assessed. 6 High-risk (INV-1, 3, 5, 7, 10, 11), 5 Medium-risk (INV-2, 4, 9, 12, 14), 3 Low-risk (INV-6, 8, 13). 7 residual risks documented with compensating controls. |
| _YYYY-MM-DD_ | _Trigger from list above_ | _Name_ | _#NNN_ | _Summary or "No changes required"_ |

### Re-Evaluation Process

1. Review each invariant entry: verify severity and detectability scores are still accurate
2. Update risk levels for any entries with changed scores
3. Verify mitigations are still implemented and effective (cross-reference with test coverage reports)
4. Add new entries for any newly identified failure modes or invariants
5. Update the Risk Summary table if risk level distributions change
6. Review all residual risks (RR-1 through RR-7): verify compensating controls are still adequate
7. Record the re-evaluation in the Git history via a PR (serves as the review record)
