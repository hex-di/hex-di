# @hex-di/guard — Traceability Matrix

## Document Control

| Property | Value |
|----------|-------|
| Document ID | GUARD-RTM |
| Revision | 6.3 |
| Effective Date | 2026-02-21 |
| Status | Effective |
| Author | HexDI Engineering |
| Reviewer | Independent QA Reviewer |
| Change History | 6.3 (2026-02-21): §69-VER: GUARD-17-13 1.6→1.7, GUARD-17-00 1.1 added, GUARD-TASKS 1.1 added, GUARD-RTM 6.2→6.3; section renaming §71→§87,§72→§88,§73→§89 in 17-gxp-compliance/13-test-protocols.md (resolve IQ/OQ/PQ collisions); tasks.md Groups 29/30/31 §72/73/74→§84/85/86 (CCR-GUARD-045) |
|                | 6.2 (2026-02-21): §7 DoD Traceability: DoD 5 add 05-policy-evaluator §86; DoD 21 behaviors/04 §71→04-policy-types §71,§84,§85; §69-VER: GUARD-04 1.0→1.1, GUARD-05 1.0→1.1, GUARD-00 2.4→2.5, GUARD-16 2.1→2.2, GUARD-PRC-DOD 2.3→2.4, GUARD-RTM 6.1→6.2 (CCR-GUARD-045) |
|                | 6.1 (2026-02-21): §7 DoD Traceability: DoD 9 §42→§38, DoD 10 §43–45→§39, DoD 11 §43–48→§40–42,§73, DoD 21 behaviors/14→behaviors/04 — stale from pre-renumbering of react sections; §69-VER: GUARD-16 2.0→2.1, GUARD-PRC-DOD 2.2→2.3 (CCR-GUARD-045) |
| | 6.0 (2026-02-20): Document ID GUARD-18→GUARD-RTM (resolved collision with roadmap/ecosystem-extensions.md which is the canonical GUARD-18 holder); §69-VER: GUARD-18 registry 2.0→1.1 (actual); added 6 missing entries: GUARD-68-FMEA, GUARD-TS-01, GUARD-TS-02, GUARD-15-B, GXP-GRD-001, GUARD-PRC-CI; GUARD-RTM self-ref added (CCR-GUARD-045) |
| | 5.9 (2026-02-20): §69-VER: corrected GUARD-17-11 5.8→1.7 (maps to 17-gxp-compliance/11-traceability-matrix.md, not root file); GUARD-10 2.0→2.1; GUARD-00-URS 1.5→2.0; resolved GUARD-10/GUARD-13 Document ID collisions (legacy files renamed to GUARD-10-LEGACY/GUARD-13-LEGACY) (CCR-GUARD-045) |
| | 5.8 (2026-02-20): §69-VER: GUARD-00 2.3→2.4 (DoD 18 link fix); added GUARD-PRC-DOD 2.2 entry; self-ref 5.7→5.8 (CCR-GUARD-045) |
| | 5.7 (2026-02-20): §69-VER: corrected GUARD-17-10 5.0→1.3, GUARD-16 1.5→2.0, GUARD-01 2.0→1.1 (inflated values); GUARD-17-11 self-ref 5.6→5.7 (CCR-GUARD-045) |
| | 5.6 (2026-02-20): §69-VER: GUARD-OVERVIEW 4.2→4.3 (CCR-GUARD-045) |
| | 5.5 (2026-02-20): §69-VER: GUARD-00 2.1→2.3, GUARD-13 1.3→1.5, GUARD-17-13 1.4→1.6, GUARD-15 2.1→2.2, GUARD-17-01 1.4→1.5, GUARD-17-06 1.7→1.4, GUARD-17-09 2.0→1.4, GUARD-17-11 4.9→5.5, GUARD-RMP 3.0→3.1 (stale test counts fixed: 1035/917/25 DoD → 1294/1176/29 DoD per CCR-GUARD-045) |
| | 5.4 (2026-02-20): §2 Capability-Level Traceability: corrected 8 Primary Source Module paths to match overview.md Source File Map — permissions/→tokens/, roles/→tokens/+utils/, policies/→policy/, evaluate.ts→evaluator/evaluate.ts, guard.ts→guard/guard.ts+ports/, port-gate-hook.ts→hook/port-gate.ts, serialize.ts→serialization/, events/+spans/→cross-library/ (CCR-GUARD-044) |
| | 5.3 (2026-02-20): §69-VER: GUARD-OVERVIEW 4.1→4.2; api-reference.md renamed to 14-api-reference.md; GUARD-14 now bound to 14-api-reference.md; all cross-references updated (CCR-GUARD-043) |
| | 5.2 (2026-02-20): §69-VER: GUARD-OVERVIEW 4.0→4.1; GUARD-14 unambiguously bound to api-reference.md (14-api-reference.md stub deleted); GUARD-15 re-bound to 15-appendices.md Rev 2.0; GUARD-15-IDX added for appendices/README.md Rev 3.1 (CCR-GUARD-042) |
| | 5.1 (2026-02-20): §69-VER: GUARD-GLOSSARY 3.1→3.2 (corrected Document ID GUARD-15-C→GUARD-GLOSSARY, title, classification per CCR-GUARD-041) |
| | 5.0 (2026-02-20): §69-VER: GUARD-OVERVIEW 3.0→4.0 (removed 9 dangling compliance/*.md rows — content lives in 17-gxp-compliance/ per CCR-GUARD-040) |
| | 4.9 (2026-02-20): §69-VER: GUARD-GLOSSARY 3.0→3.1 (added 12 missing cross-reference links per CCR-GUARD-039); GUARD-17-11 self-ref 4.8→4.9 |
| | 4.8 (2026-02-20): §69-VER: GUARD-17-10 Risk Assessment 4.0→5.0 (risk-assessment gap fixes — Invariant-to-FMEA Cross-Reference table per CCR-GUARD-038); GUARD-17-11 self-ref 4.7→4.8 |
| | 4.7 (2026-02-20): §69-VER: GUARD-RMP 2.0→3.0 (roadmap gap fixes — Document Control format, guard-validation package, Deliverable expansion per CCR-GUARD-037); GUARD-17-11 self-ref 4.6→4.7 |
| | 4.6 (2026-02-20): §69-VER: GUARD-OVERVIEW 2.0→3.0 (overview gap fixes — 36 missing spec files added, GUARD-URS→GUARD-00-URS corrected per CCR-GUARD-036); GUARD-17-11 self-ref 4.5→4.6 |
| | 4.5 (2026-02-20): §69-VER: GUARD-15 Appendices 2.2→2.3 (glossary gap fixes — 20 new entries, 2 new sections per CCR-GUARD-035); GUARD-17-11 self-ref 4.4→4.5 |
| | 4.4 (2026-02-20): §4 Invariant Traceability: added FM-01 to INV-GD-001, -002, -023, -028, -029, -030, -031; FM-11 to INV-GD-024, -032; fixed FM-15 for INV-GD-006, FM-02 for INV-GD-012, FM-03 for INV-GD-014; GUARD-INV 4.0→5.0 per CCR-GUARD-034 |
| | 4.3 (2026-02-20): Updated §69-VER registry: GUARD-17-10 Risk Assessment 3.0→4.0; GUARD-17-11 self-ref 4.2→4.3 per CCR-GUARD-033 |
| | 4.2 (2026-02-20): Updated §69-VER registry: added GUARD-OVERVIEW 2.0, GUARD-RMP 2.0; updated GUARD-17-11 to 4.2 per CCR-GUARD-032 |
| | 4.1 (2026-02-20): Updated §69-VER registry: GUARD-15 Appendices 2.1→2.2 (glossary gap fixes per CCR-GUARD-031) |
| | 4.0 (2026-02-20): Added FMEA column to §4 Invariant Traceability, added DoD 20–22/25–29 to §7 DoD Traceability, updated §69-VER version registry per CCR-GUARD-029 |
| | 3.0 (2026-02-19): Added canonical implementation traceability sections (Capability-Level, Requirement-Level, Invariant, ADR, Test File Map, DoD, Coverage Targets) per CCR-GUARD-022 |
| | 2.3 (2026-02-15): Prior revision — regulatory RTM only (§9) |

---

## Traceability Overview

The guard library traceability chain runs:

```
Requirement (BEH-GD-NNN / REQ-GUARD-NNN)
    → Source Module (packages/guard/src/…)
    → Test File (libs/guard/core/tests/…)
    → Invariant (INV-GD-N in invariants.md)
    → FMEA Failure Mode (FM-N in risk-assessment.md)
    → DoD Item (DoD N in 16-definition-of-done.md)
```

Every link in this chain is documented in the sections below. The full regulatory RTM (76 rows across 7 frameworks) is in [§9](#9-regulatory-requirements-traceability-matrix).

---

## §1 Requirement Identification Convention

See [process/requirement-id-scheme.md](./process/requirement-id-scheme.md) for the full scheme.

The guard spec uses a **hybrid dual-ID system**:

| ID Format | Source | Use |
|-----------|--------|-----|
| `BEH-GD-NNN` | `behaviors/NN-*.md` | Functional specification requirements (62 IDs, 001–062) |
| `REQ-GUARD-NNN` | Numbered chapters `01-17` | URS requirements and GxP compliance requirements (85+ IDs) |
| `URS-GUARD-NNN` | `01-overview.md` | User Requirement Specification items (21 IDs) |
| `INV-GD-N` | `invariants.md` | Runtime invariants (37 IDs, INV-GD-001–037) |
| `ADR-GD-NNN` | `decisions/NNN-*.md` | Architecture Decision Records (56 IDs, ADR-GD-001–056) |

`[OPERATIONAL]` requirements (deployment-procedure and organizational requirements not verifiable by automated tests) are documented in `process/requirement-id-scheme.md` and excluded from automated test coverage calculations.

---

## §2 Capability-Level Traceability

| # | Behavior Spec | Capability | Primary Source Module | Risk Level | Subpath |
|---|---------------|------------|-----------------------|------------|---------|
| 1 | [behaviors/01-permission-types.md](behaviors/01-permission-types.md) | Permission tokens and resource/action format | `packages/guard/src/tokens/permission.ts`, `packages/guard/src/tokens/permission-group.ts`, `packages/guard/src/utils/inference.ts` | Medium | `@hex-di/guard` |
| 2 | [behaviors/02-role-types.md](behaviors/02-role-types.md) | Role definitions and DAG hierarchy | `packages/guard/src/tokens/role.ts`, `packages/guard/src/utils/flatten.ts`, `packages/guard/src/utils/inference.ts` | Medium | `@hex-di/guard` |
| 3 | [behaviors/03-policy-types.md](behaviors/03-policy-types.md) | Policy kinds and combinator types | `packages/guard/src/policy/types.ts`, `packages/guard/src/policy/combinators.ts`, `packages/guard/src/policy/constraint.ts`, `packages/guard/src/policy/matchers.ts` | High | `@hex-di/guard` |
| 4 | [behaviors/04-policy-evaluator.md](behaviors/04-policy-evaluator.md) | Policy evaluation engine | `packages/guard/src/evaluator/evaluate.ts`, `packages/guard/src/evaluator/decision.ts`, `packages/guard/src/evaluator/trace.ts`, `packages/guard/src/evaluator/errors.ts` | High | `@hex-di/guard` |
| 5 | [behaviors/05-subject.md](behaviors/05-subject.md) | AuthSubject type and scope lifecycle | `packages/guard/src/subject/auth-subject.ts`, `packages/guard/src/subject/provider-port.ts`, `packages/guard/src/subject/adapter.ts`, `packages/guard/src/subject/attribute-resolver.ts`, `packages/guard/src/subject/relationship-resolver.ts` | Medium | `@hex-di/guard` |
| 6 | [behaviors/06-guard-adapter.md](behaviors/06-guard-adapter.md) | guard() factory and GuardPort | `packages/guard/src/guard/guard.ts`, `packages/guard/src/guard/types.ts`, `packages/guard/src/ports/policy-engine.ts`, `packages/guard/src/ports/audit-trail.ts` | High | `@hex-di/guard` |
| 7 | [behaviors/07-port-gate-hook.md](behaviors/07-port-gate-hook.md) | Port gate resolution hook | `packages/guard/src/hook/port-gate.ts` | Low | `@hex-di/guard` |
| 8 | [behaviors/08-serialization.md](behaviors/08-serialization.md) | Policy serialization/deserialization | `packages/guard/src/serialization/serialize.ts`, `packages/guard/src/serialization/deserialize.ts`, `packages/guard/src/serialization/explain.ts` | Medium | `@hex-di/guard` |
| 9 | [behaviors/09-cross-library.md](behaviors/09-cross-library.md) | Event and span sink integration contracts | `packages/guard/src/cross-library/event-sink.ts`, `packages/guard/src/cross-library/span-sink.ts` | Medium | `@hex-di/guard` |
| 10 | [behaviors/10-react-integration.md](behaviors/10-react-integration.md) | React hooks and components | `integrations/react-guard/src/` | Low | `@hex-di/guard/react` |
| 11 | [behaviors/11-inspection.md](behaviors/11-inspection.md) | DevTools inspection and MCP/A2A | `packages/guard/src/inspection/` | Low | `@hex-di/guard` |
| 12 | [behaviors/12-testing.md](behaviors/12-testing.md) | Testing utilities and conformance suites | `libs/guard/testing/src/` | Low | `@hex-di/guard-testing` |

---

## §3 Requirement-Level Traceability

| Behavior Spec | BEH-GD Range | Count | REQ-GUARD Range | Count |
|---------------|-------------|-------|-----------------|-------|
| behaviors/01-permission-types.md | BEH-GD-001–004 | 4 | — | — |
| behaviors/02-role-types.md | BEH-GD-005–008 | 4 | — | — |
| behaviors/03-policy-types.md | BEH-GD-009–014 | 6 | REQ-GUARD-001–025 | ~25 |
| behaviors/04-policy-evaluator.md | BEH-GD-015–019 | 5 | REQ-GUARD-026–040 | ~15 |
| behaviors/05-subject.md | BEH-GD-020–024 | 5 | REQ-GUARD-041–050 | ~10 |
| behaviors/06-guard-adapter.md | BEH-GD-025–029 | 5 | REQ-GUARD-051–060 | ~10 |
| behaviors/07-port-gate-hook.md | BEH-GD-030–031 | 2 | — | — |
| behaviors/08-serialization.md | BEH-GD-032–037 | 6 | REQ-GUARD-061–065 | ~5 |
| behaviors/09-cross-library.md | BEH-GD-038–041 | 4 | — | — |
| behaviors/10-react-integration.md | BEH-GD-042–048 | 7 | — | — |
| behaviors/11-inspection.md | BEH-GD-049–053 | 5 | — | — |
| behaviors/12-testing.md | BEH-GD-054–062 | 9 | — | — |
| 17-gxp-compliance/* | — | — | REQ-GUARD-066–085+ | ~20+ |
| **Totals** | **BEH-GD-001–062** | **62** | **REQ-GUARD-001–085+** | **85+** |

---

## §4 Invariant Traceability

| Invariant | Description | Unit Tests | Type Tests | GxP Tests | Mutation Target | FMEA | DoD |
|-----------|-------------|------------|------------|-----------|-----------------|------|-----|
| [INV-GD-001](invariants.md#inv-gd-001-policy-immutability) | Policy Immutability | policy-types.test.ts | policy-types.test-d.ts | — | behaviors/03 | FM-01 | DoD 3 |
| [INV-GD-002](invariants.md#inv-gd-002-permission-brand-integrity) | Permission Brand Integrity | permission-tokens.test.ts | permission-tokens.test-d.ts | — | behaviors/01 | FM-01 | DoD 1 |
| [INV-GD-003](invariants.md#inv-gd-003-role-dag-acyclicity) | Role DAG Acyclicity | role-tokens.test.ts | — | — | behaviors/02 | — | DoD 2 |
| [INV-GD-004](invariants.md#inv-gd-004-subject-immutability) | Subject Immutability | subject.test.ts | — | — | behaviors/05 | FM-08, FM-18 | DoD 6 |
| [INV-GD-005](invariants.md#inv-gd-005-deny-overrides) | Deny-Overrides | evaluate.test.ts | — | gxp-audit-trail.test.ts | behaviors/04 | FM-01, FM-02 | DoD 5, DoD 13 |
| [INV-GD-006](invariants.md#inv-gd-006-audit-trail-completeness) | Audit Trail Completeness | gxp-audit-trail.test.ts | — | gxp-audit-trail.test.ts, gxp-audit-trail.integration.test.ts | 17-gxp | FM-03, FM-15, FM-21, FM-26 | DoD 13 |
| [INV-GD-007](invariants.md#inv-gd-007-hash-chain-integrity) | Hash Chain Integrity | gxp-audit-trail.test.ts | — | gxp-audit-trail.test.ts, gxp-audit-trail.integration.test.ts | 17-gxp | FM-05, FM-14, FM-16, FM-23, FM-32 | DoD 13 |
| [INV-GD-008](invariants.md#inv-gd-008-per-scope-chain-ordering) | Per-Scope Chain Ordering | gxp-audit-trail.test.ts | — | gxp-audit-trail.test.ts | 17-gxp | FM-04, FM-22 | DoD 13 |
| [INV-GD-009](invariants.md#inv-gd-009-policy-serialization-round-trip) | Policy Serialization Round-Trip | serialize.test.ts | — | — | behaviors/08 | FM-11, FM-33, FM-35 | DoD 8 |
| [INV-GD-010](invariants.md#inv-gd-010-wal-enforcement) | WAL Enforcement | gxp-audit-trail.test.ts | — | gxp-audit-trail.test.ts, gxp-audit-trail.integration.test.ts | 17-gxp | FM-15, FM-17 | DoD 13 |
| [INV-GD-011](invariants.md#inv-gd-011-permission-set-precomputation) | Permission Set Precomputation | guard.test.ts | — | — | behaviors/06 | — | DoD 7 |
| [INV-GD-012](invariants.md#inv-gd-012-evaluation-determinism) | Evaluation Determinism | evaluate.test.ts | — | — | behaviors/04 | FM-01, FM-02, FM-27, FM-28, FM-36 | DoD 5 |
| [INV-GD-013](invariants.md#inv-gd-013-guard-throws-on-deny) | Guard Throws on Deny | guard.test.ts | guard.test-d.ts | gxp-audit-trail.test.ts | behaviors/06 | FM-12, FM-20, FM-31, FM-34 | DoD 7, DoD 13 |
| [INV-GD-014](invariants.md#inv-gd-014-audit-before-throw) | Audit Before Throw | gxp-audit-trail.test.ts | — | gxp-audit-trail.test.ts, gxp-audit-trail.integration.test.ts | 17-gxp | FM-03, FM-15 | DoD 13 |
| [INV-GD-015](invariants.md#inv-gd-015-failonauditerror-gxp-enforcement) | failOnAuditError GxP Enforcement | gxp-audit-trail.test.ts | — | gxp-audit-trail.test.ts | 17-gxp | FM-03 | DoD 13 |
| [INV-GD-016](invariants.md#inv-gd-016-noopaudittrail-rejection-in-gxp) | NoopAuditTrail Rejection in GxP | gxp-audit-trail.test.ts | — | gxp-audit-trail.test.ts | 17-gxp | FM-13 | DoD 13 |
| [INV-GD-017](invariants.md#inv-gd-017-signature-reauthentication) | Signature Reauthentication | gxp-signature.test.ts | — | gxp-signature.test.ts, signature.integration.test.ts | 17-gxp | FM-06, FM-07, FM-29, FM-30 | DoD 15 |
| [INV-GD-018](invariants.md#inv-gd-018-signature-replay-prevention) | Signature Replay Prevention | gxp-signature.test.ts | — | gxp-signature.test.ts | 17-gxp | FM-06 | DoD 15, DoD 19 |
| [INV-GD-019](invariants.md#inv-gd-019-signature-binding-atomicity) | Signature Binding Atomicity | gxp-signature.test.ts | — | gxp-signature.test.ts | 17-gxp | FM-29, FM-30 | DoD 15 |
| [INV-GD-020](invariants.md#inv-gd-020-scope-lifetime-enforcement) | Scope Lifetime Enforcement | subject.test.ts | — | — | behaviors/05 | FM-08, FM-19 | DoD 6 |
| [INV-GD-021](invariants.md#inv-gd-021-subject-authentication-staleness) | Subject Authentication Staleness | subject.test.ts | — | — | behaviors/05 | FM-19 | DoD 6 |
| [INV-GD-022](invariants.md#inv-gd-022-anonymous-subject-rejection) | Anonymous Subject Rejection | guard.test.ts | — | — | behaviors/06 | FM-08 | DoD 7 |
| [INV-GD-023](invariants.md#inv-gd-023-rebac-depth-limiting) | ReBAC Depth Limiting | evaluate.test.ts | — | — | behaviors/04 | FM-01 | DoD 27 |
| [INV-GD-024](invariants.md#inv-gd-024-rebac-cycle-tolerance) | ReBAC Cycle Tolerance | evaluate.test.ts | — | — | behaviors/04 | FM-11 | DoD 27 |
| [INV-GD-025](invariants.md#inv-gd-025-async-evaluation-timestamp) | Async Evaluation Timestamp | evaluate.test.ts | — | — | behaviors/04 | FM-09, FM-10 | DoD 25 |
| [INV-GD-026](invariants.md#inv-gd-026-per-pass-attribute-cache) | Per-Pass Attribute Cache | evaluate.test.ts | — | — | behaviors/04 | FM-28 | DoD 25 |
| [INV-GD-027](invariants.md#inv-gd-027-attribute-resolver-timeout) | Attribute Resolver Timeout | evaluate.test.ts | — | — | behaviors/04 | — | DoD 25 |
| [INV-GD-028](invariants.md#inv-gd-028-field-intersection-semantics) | Field Intersection Semantics | evaluate.test.ts, policy-types.test.ts | — | — | behaviors/04 | FM-01 | DoD 4, DoD 5 |
| [INV-GD-029](invariants.md#inv-gd-029-field-union-completeness) | Field Union Completeness | evaluate.test.ts | — | — | behaviors/04 | FM-01 | DoD 26 |
| [INV-GD-030](invariants.md#inv-gd-030-not-policy-field-nullification) | Not Policy Field Nullification | evaluate.test.ts | — | — | behaviors/04 | FM-01 | DoD 3, DoD 5 |
| [INV-GD-031](invariants.md#inv-gd-031-anyof-union-full-evaluation) | anyOf Union Full Evaluation | evaluate.test.ts | — | — | behaviors/04 | FM-01 | DoD 26 |
| [INV-GD-032](invariants.md#inv-gd-032-policy-evaluation-depth-limit) | Policy Evaluation Depth Limit | evaluate.test.ts, policy-types.test.ts | — | — | behaviors/04 | FM-11 | DoD 5 |
| [INV-GD-033](invariants.md#inv-gd-033-gxp-subject-identity-validation) | GxP Subject Identity Validation | gxp-audit-trail.test.ts | — | gxp-audit-trail.test.ts | 17-gxp | FM-25 | DoD 13 |
| [INV-GD-034](invariants.md#inv-gd-034-gxp-subject-attribute-sanitization) | GxP Subject Attribute Sanitization | subject.test.ts | — | gxp-audit-trail.test.ts | behaviors/05 | FM-24 | DoD 6, DoD 13 |
| [INV-GD-035](invariants.md#inv-gd-035-policy-tree-scan-for-signaturepolicy) | Policy Tree Scan for SignaturePolicy | guard.test.ts | — | gxp-signature.test.ts | behaviors/06 | FM-07, FM-29 | DoD 7, DoD 15 |
| [INV-GD-036](invariants.md#inv-gd-036-noopsignatureservice-rejection) | NoopSignatureService Rejection | gxp-signature.test.ts | — | gxp-signature.test.ts | 17-gxp | FM-13 | DoD 15 |
| [INV-GD-037](invariants.md#inv-gd-037-guardasync-singleton-lifetime) | guardAsync Singleton Lifetime | guard.test.ts, evaluate.test.ts | guard.test-d.ts | — | behaviors/06 | — | DoD 25 |

---

## §5 ADR Traceability

| ADR | Title | Affected Invariants | Affected Spec Files |
|-----|-------|---------------------|---------------------|
| [ADR-GD-001](decisions/001-branded-permission-tokens.md) | Branded permission tokens | INV-GD-002 | behaviors/01-permission-types.md |
| [ADR-GD-002](decisions/002-role-dag-cycle-detection.md) | Role DAG cycle detection | INV-GD-003 | behaviors/02-role-types.md |
| [ADR-GD-003](decisions/003-policy-discriminated-unions.md) | Policy discriminated unions | INV-GD-001 | behaviors/03-policy-types.md |
| [ADR-GD-004](decisions/004-deny-overrides-conflict-resolution.md) | Deny-overrides conflict resolution | INV-GD-005, INV-GD-012 | behaviors/03-policy-types.md, behaviors/04-policy-evaluator.md |
| [ADR-GD-005](decisions/005-react-subject-provider-context.md) | React subject provider context | — | behaviors/10-react-integration.md |
| [ADR-GD-006](decisions/006-permission-resource-action-format.md) | Permission resource/action format | INV-GD-002 | behaviors/01-permission-types.md |
| [ADR-GD-007](decisions/007-evaluate-returns-result.md) | Evaluate returns Result | INV-GD-012, INV-GD-013 | behaviors/04-policy-evaluator.md, behaviors/06-guard-adapter.md |
| [ADR-GD-008](decisions/008-guard-wraps-at-adapter-level.md) | Guard wraps at adapter level | INV-GD-013, INV-GD-014 | behaviors/06-guard-adapter.md |
| [ADR-GD-009](decisions/009-immutable-subject-within-scope.md) | Immutable subject within scope | INV-GD-004, INV-GD-020 | behaviors/05-subject.md |
| [ADR-GD-010](decisions/010-permission-set-precomputation.md) | Permission set precomputation | INV-GD-011 | behaviors/06-guard-adapter.md |
| [ADR-GD-011](decisions/011-separate-guard-testing-package.md) | Separate guard-testing package | — | behaviors/12-testing.md |
| [ADR-GD-012](decisions/012-mandatory-audit-trail-port.md) | Mandatory audit trail port | INV-GD-006, INV-GD-014, INV-GD-015 | behaviors/06-guard-adapter.md, 17-gxp-compliance |
| [ADR-GD-013](decisions/013-frozen-policy-objects.md) | Frozen policy objects | INV-GD-001 | behaviors/03-policy-types.md |
| [ADR-GD-014](decisions/014-error-code-allocation.md) | Error code allocation | — | behaviors/06-guard-adapter.md, 14-api-reference.md |
| [ADR-GD-015](decisions/015-create-guard-hooks-factory.md) | createGuardHooks factory | — | behaviors/10-react-integration.md |
| [ADR-GD-016](decisions/016-auth-subject-authentication-fields.md) | AuthSubject authentication fields | INV-GD-021, INV-GD-022 | behaviors/05-subject.md |
| [ADR-GD-017](decisions/017-iso-8601-timestamps.md) | ISO 8601 timestamps | INV-GD-006 | behaviors/06-guard-adapter.md |
| [ADR-GD-018](decisions/018-optional-integrity-hashing.md) | Optional integrity hashing | INV-GD-007 | 17-gxp-compliance |
| [ADR-GD-019](decisions/019-injectable-clock-source.md) | Injectable clock source | INV-GD-025 | 17-gxp-compliance |
| [ADR-GD-020](decisions/020-audit-entry-reason-duration.md) | Audit entry reason/duration | INV-GD-006 | behaviors/06-guard-adapter.md |
| [ADR-GD-021](decisions/021-append-only-behavioral-contract.md) | Append-only behavioral contract | INV-GD-006, INV-GD-010 | behaviors/06-guard-adapter.md, 17-gxp-compliance |
| [ADR-GD-022](decisions/022-mcp-a2a-concrete-schemas.md) | MCP/A2A concrete schemas | — | behaviors/11-inspection.md |
| [ADR-GD-023](decisions/023-optional-signature-service.md) | Optional signature service | INV-GD-035, INV-GD-036 | behaviors/06-guard-adapter.md |
| [ADR-GD-024](decisions/024-re-auth-on-signature-service.md) | Re-auth on signature service | INV-GD-017 | behaviors/06-guard-adapter.md, 17-gxp-compliance |
| [ADR-GD-025](decisions/025-has-signature-policy-variant.md) | hasSignature policy variant | INV-GD-017, INV-GD-019 | behaviors/03-policy-types.md, behaviors/06-guard-adapter.md |
| [ADR-GD-026](decisions/026-gxp-audit-entry-subtype.md) | GxP audit entry subtype | INV-GD-006, INV-GD-007 | 17-gxp-compliance |
| [ADR-GD-027](decisions/027-fail-on-audit-error-default.md) | failOnAuditError default | INV-GD-015 | behaviors/06-guard-adapter.md, 17-gxp-compliance |
| [ADR-GD-028](decisions/028-signer-role-from-validated-signature.md) | Signer role from validated signature | INV-GD-019 | behaviors/06-guard-adapter.md |
| [ADR-GD-029](decisions/029-hash-chain-all-fields.md) | Hash chain all fields | INV-GD-007 | 17-gxp-compliance |
| [ADR-GD-030](decisions/030-per-scope-chains-sequence-numbers.md) | Per-scope chains + sequence numbers | INV-GD-008 | 17-gxp-compliance |
| [ADR-GD-031](decisions/031-field-level-access-control.md) | Field-level access control | INV-GD-028, INV-GD-029, INV-GD-030 | behaviors/04-policy-evaluator.md |
| [ADR-GD-032](decisions/032-built-in-wal-gxp-enforcement.md) | Built-in WAL GxP enforcement | INV-GD-010 | 17-gxp-compliance |
| [ADR-GD-033](decisions/033-iq-oq-pq-validation-package.md) | IQ/OQ/PQ validation package | — | behaviors/12-testing.md, 17-gxp-compliance |
| [ADR-GD-034](decisions/034-open-source-supplier-qualification.md) | Open-source supplier qualification | — | compliance/gxp.md |
| [ADR-GD-035](decisions/035-record-durability-tiers.md) | Record durability tiers | INV-GD-010 | 17-gxp-compliance |
| [ADR-GD-036](decisions/036-audit-trail-conformance-suite.md) | Audit trail conformance suite | INV-GD-006, INV-GD-007 | behaviors/12-testing.md |
| [ADR-GD-037](decisions/037-guard-health-check.md) | Guard health check | INV-GD-006 | behaviors/06-guard-adapter.md, behaviors/12-testing.md |
| [ADR-GD-038](decisions/038-asymmetric-algorithms-gxp.md) | Asymmetric algorithms for GxP | INV-GD-017 | 17-gxp-compliance |
| [ADR-GD-039](decisions/039-max-reauth-token-lifetime.md) | Max reauth token lifetime | INV-GD-017, INV-GD-018 | 17-gxp-compliance |
| [ADR-GD-040](decisions/040-minimum-cryptographic-key-sizes.md) | Minimum cryptographic key sizes | INV-GD-017 | 17-gxp-compliance |
| [ADR-GD-041](decisions/041-memory-audit-trail-gxp-warn.md) | MemoryAuditTrail GxP warning | INV-GD-016 | behaviors/12-testing.md |
| [ADR-GD-042](decisions/042-audit-trail-storage-redundancy.md) | Audit trail storage redundancy | INV-GD-010 | 17-gxp-compliance |
| [ADR-GD-043](decisions/043-hsm-required-gxp-key-storage.md) | HSM required for GxP key storage | INV-GD-017 | 17-gxp-compliance |
| [ADR-GD-044](decisions/044-memory-audit-trail-production-escalation.md) | MemoryAuditTrail production escalation | INV-GD-016 | 17-gxp-compliance |
| [ADR-GD-045](decisions/045-max-scope-lifetime-gxp.md) | Max scope lifetime GxP | INV-GD-020, INV-GD-021 | behaviors/05-subject.md, 17-gxp-compliance |
| [ADR-GD-046](decisions/046-empty-string-response-timestamp.md) | Empty string for response timestamp | INV-GD-025 | behaviors/04-policy-evaluator.md |
| [ADR-GD-047](decisions/047-signature-payload-excludes-previous-hash.md) | Signature payload excludes previous hash | INV-GD-019 | 17-gxp-compliance |
| [ADR-GD-048](decisions/048-async-evaluation-wraps-sync.md) | Async evaluation wraps sync | INV-GD-012, INV-GD-025 | behaviors/04-policy-evaluator.md |
| [ADR-GD-049](decisions/049-async-guards-singleton-lifetime.md) | Async guards singleton lifetime | INV-GD-037 | behaviors/06-guard-adapter.md |
| [ADR-GD-050](decisions/050-field-strategy-per-combinator.md) | Field strategy per combinator | INV-GD-028, INV-GD-029 | behaviors/03-policy-types.md, behaviors/04-policy-evaluator.md |
| [ADR-GD-051](decisions/051-anyof-union-full-evaluation.md) | anyOf union full evaluation | INV-GD-031 | behaviors/04-policy-evaluator.md |
| [ADR-GD-052](decisions/052-has-relationship-policy-kind.md) | hasRelationship policy kind | INV-GD-023, INV-GD-024 | behaviors/03-policy-types.md |
| [ADR-GD-053](decisions/053-relationship-resolver-sync-async.md) | Relationship resolver sync/async | INV-GD-023 | behaviors/04-policy-evaluator.md |
| [ADR-GD-054](decisions/054-transitive-depth-per-policy.md) | Transitive depth per policy | INV-GD-023 | behaviors/04-policy-evaluator.md |
| [ADR-GD-055](decisions/055-guard-owned-sink-ports.md) | Guard-owned sink ports | INV-GD-006 | behaviors/09-cross-library.md |
| [ADR-GD-056](decisions/056-consumer-owned-integration-types.md) | Consumer-owned integration types | — | behaviors/09-cross-library.md |

---

## §6 Test File Map

| Test File | Spec Coverage | Test Level |
|-----------|--------------|------------|
| `libs/guard/core/tests/unit/permission-tokens.test.ts` | behaviors/01 (BEH-GD-001–004), INV-GD-002 | Unit |
| `libs/guard/core/tests/unit/permission-tokens.test-d.ts` | behaviors/01 (BEH-GD-001–004), INV-GD-002 | Type |
| `libs/guard/core/tests/unit/role-tokens.test.ts` | behaviors/02 (BEH-GD-005–008), INV-GD-003 | Unit |
| `libs/guard/core/tests/unit/role-tokens.test-d.ts` | behaviors/02 (BEH-GD-005–008) | Type |
| `libs/guard/core/tests/unit/policy-types.test.ts` | behaviors/03 (BEH-GD-009–014), INV-GD-001, INV-GD-032 | Unit |
| `libs/guard/core/tests/unit/policy-types.test-d.ts` | behaviors/03 (BEH-GD-009–014) | Type |
| `libs/guard/core/tests/unit/policy-combinators.test.ts` | behaviors/03–04 (BEH-GD-009–014), INV-GD-005 | Unit |
| `libs/guard/core/tests/unit/evaluate.test.ts` | behaviors/04 (BEH-GD-015–019), INV-GD-005, INV-GD-012, INV-GD-023–032 | Unit |
| `libs/guard/core/tests/unit/subject.test.ts` | behaviors/05 (BEH-GD-020–024), INV-GD-004, INV-GD-020–022, INV-GD-034 | Unit |
| `libs/guard/core/tests/unit/guard.test.ts` | behaviors/06 (BEH-GD-025–029), INV-GD-011, INV-GD-013, INV-GD-022, INV-GD-035, INV-GD-037 | Unit |
| `libs/guard/core/tests/unit/guard.test-d.ts` | behaviors/06 (BEH-GD-025–029), INV-GD-013, INV-GD-037 | Type |
| `libs/guard/core/tests/integration/guard.integration.test.ts` | behaviors/06 (BEH-GD-025–029), INV-GD-013 | Integration |
| `libs/guard/core/tests/unit/port-gate-hook.test.ts` | behaviors/07 (BEH-GD-030–031) | Unit |
| `libs/guard/core/tests/unit/port-gate-hook.test-d.ts` | behaviors/07 (BEH-GD-030–031) | Type |
| `libs/guard/core/tests/integration/port-gate-hook.integration.test.ts` | behaviors/07 (BEH-GD-030–031) | Integration |
| `libs/guard/core/tests/unit/serialize.test.ts` | behaviors/08 (BEH-GD-032–037), INV-GD-009 | Unit |
| `libs/guard/core/tests/unit/cross-library.test.ts` | behaviors/09 (BEH-GD-038–041) | Unit |
| `libs/guard/core/tests/integration/cross-library.integration.test.ts` | behaviors/09 (BEH-GD-038–041) | Integration |
| `integrations/react-guard/tests/subject-provider.test.tsx` | behaviors/10 (BEH-GD-042) | Unit |
| `integrations/react-guard/tests/can-cannot.test.tsx` | behaviors/10 (BEH-GD-043–045) | Unit |
| `integrations/react-guard/tests/hooks.test.tsx` | behaviors/10 (BEH-GD-043–048) | Unit |
| `integrations/react-guard/tests/mcp-types.test-d.ts` | behaviors/11 (BEH-GD-049–053) | Type |
| `libs/guard/core/tests/unit/inspector.test.ts` | behaviors/11 (BEH-GD-049–053) | Unit |
| `libs/guard/core/tests/unit/gxp-audit-trail.test.ts` | 17-gxp §59–64, INV-GD-005–010, INV-GD-013–016, INV-GD-033–034 | Unit (GxP) |
| `libs/guard/core/tests/integration/gxp-audit-trail.integration.test.ts` | 17-gxp §59–64, INV-GD-006–008, INV-GD-010, INV-GD-014 | Integration (GxP) |
| `libs/guard/core/tests/unit/gxp-signature.test.ts` | 17-gxp §65, INV-GD-017–019, INV-GD-035–036 | Unit (GxP) |
| `libs/guard/core/tests/unit/signature.test-d.ts` | behaviors/03, behaviors/06 (signature types) | Type |
| `libs/guard/core/tests/integration/signature.integration.test.ts` | 17-gxp §65, INV-GD-017–019 | Integration (GxP) |
| `packages/guard-validation/tests/unit/validation.test.ts` | 17-gxp §67e | Unit |
| `packages/guard-validation/tests/integration/validation.integration.test.ts` | 17-gxp §67e | Integration |
| `libs/guard/testing/tests/unit/testing-infra.test.ts` | behaviors/12 (BEH-GD-054–062) | Unit |
| `libs/guard/testing/tests/unit/testing-infra.test-d.ts` | behaviors/12 (BEH-GD-054–062) | Type |
| `libs/guard/core/tests/unit/meta-audit.test.ts` | behaviors/11 §48e, 17-gxp | Unit |
| `libs/guard/core/tests/integration/meta-audit.integration.test.ts` | behaviors/11 §48e | Integration |
| `libs/guard/core/tests/unit/decommissioning.test.ts` | 15-appendices §70a | Unit |
| `libs/guard/core/tests/unit/decommissioning.test-d.ts` | 15-appendices §70a | Type |
| `libs/guard/core/tests/integration/decommissioning.integration.test.ts` | 15-appendices §70a | Integration |
| `libs/guard/core/tests/unit/gxp-clock.test.ts` | 17-gxp §60 (ClockSource, SystemClock) | Unit (GxP) |
| `libs/guard/core/tests/unit/gxp-completeness.test.ts` | 17-gxp §61 (completeness monitoring), INV-GD-008 | Unit (GxP) |
| `libs/guard/core/tests/unit/gxp-policy-change.test.ts` | 17-gxp §61.4b (PolicyChangeAuditEntry, DoD 13 tests 38-45) | Unit (GxP) |
| `libs/guard/core/tests/unit/gxp-signature-meanings.test.ts` | 17-gxp §65 (SIGNATURE_MEANINGS constants, DoD 13 tests 81-83) | Unit (GxP) |
| `libs/guard/testing/tests/unit/gxp-query-port.test.ts` | 17-gxp §59.4 (AuditQueryPort interface, DoD 13 tests 60-65) | Unit (GxP) |
| `libs/guard/core/tests/integration/guard-adapter.test.ts` | behaviors/06 (BEH-GD-025-029), INV-GD-013 | Integration |
| `libs/guard/core/tests/integration/port-gate-hook.test.ts` | behaviors/07 (BEH-GD-030-031), DoD 17 gap tests | Integration |
| `libs/guard/core/tests/integration/array-matchers.test.ts` | behaviors/03 (array policy matchers) | Integration |
| `libs/guard/core/tests/integration/api-ergonomics.test.ts` | behaviors/06 §23a, 18-ecosystem §74 (ergonomics) | Integration |
| `libs/guard/testing/tests/unit/matchers.test.ts` | behaviors/12 (custom matchers, BEH-GD-054) | Unit |
| `libs/guard/testing/tests/unit/memory-audit-trail.test.ts` | behaviors/12 (MemoryAuditTrail, BEH-GD-055) | Unit |
| `libs/guard/testing/tests/unit/memory-audit-trail-validation.test.ts` | behaviors/12 (audit trail validation utilities) | Unit |
| `libs/guard/testing/tests/unit/memory-signature-service.test.ts` | behaviors/12 (MemorySignatureService, BEH-GD-058) | Unit |
| `libs/guard/testing/tests/unit/memory-subject-provider.test.ts` | behaviors/12 (MemorySubjectProvider, BEH-GD-056) | Unit |
| `libs/guard/testing/tests/unit/policy-engine.test.ts` | behaviors/12 (MemoryPolicyEngine, BEH-GD-057) | Unit |
| `libs/guard/testing/tests/unit/test-policy.test.ts` | behaviors/12 (testPolicy utilities, BEH-GD-060) | Unit |
| `libs/guard/testing/tests/unit/test-subject.test.ts` | behaviors/12 (createTestSubject, BEH-GD-059) | Unit |

---

## §7 DoD Traceability

| DoD | Title | Spec Sections | Unit Tests | Type Tests | GxP / Integration Tests |
|-----|-------|--------------|------------|------------|------------------------|
| [DoD 1](16-definition-of-done.md#dod-1-permission-tokens) | Permission Tokens | behaviors/01-permission-types.md | permission-tokens.test.ts | permission-tokens.test-d.ts | — |
| [DoD 2](16-definition-of-done.md#dod-2-role-tokens) | Role Tokens | behaviors/02-role-types.md | role-tokens.test.ts | role-tokens.test-d.ts | — |
| [DoD 3](16-definition-of-done.md#dod-3-policy-data-types) | Policy Data Types | behaviors/03-policy-types.md | policy-types.test.ts | policy-types.test-d.ts | — |
| [DoD 4](16-definition-of-done.md#dod-4-policy-combinators) | Policy Combinators | behaviors/03–04 | policy-combinators.test.ts | — | — |
| [DoD 5](16-definition-of-done.md#dod-5-policy-evaluator) | Policy Evaluator | behaviors/04-policy-evaluator.md, 05-policy-evaluator §86 | evaluate.test.ts | — | — |
| [DoD 6](16-definition-of-done.md#dod-6-subject-port) | Subject Port | behaviors/05-subject.md | subject.test.ts | — | — |
| [DoD 7](16-definition-of-done.md#dod-7-guard-adapter) | Guard Adapter | behaviors/06-guard-adapter.md | guard.test.ts | guard.test-d.ts | guard.integration.test.ts |
| [DoD 8](16-definition-of-done.md#dod-8-policy-serialization) | Policy Serialization | behaviors/08-serialization.md | serialize.test.ts | — | — |
| [DoD 9](16-definition-of-done.md#dod-9-react-subjectprovider) | React SubjectProvider | behaviors/10 §38 | subject-provider.test.tsx | — | — |
| [DoD 10](16-definition-of-done.md#dod-10-react-cancannot) | React Can/Cannot | behaviors/10 §39 | can-cannot.test.tsx | — | — |
| [DoD 11](16-definition-of-done.md#dod-11-react-hooks) | React Hooks | behaviors/10 §40–42, §73 | hooks.test.tsx | — | — |
| [DoD 12](16-definition-of-done.md#dod-12-devtools-integration) | DevTools Integration | behaviors/11 §47–48d | inspector.test.ts | — | — |
| [DoD 13](16-definition-of-done.md#dod-13-gxp-compliance) | GxP Compliance | 17-gxp-compliance §59–69 | gxp-audit-trail.test.ts | — | gxp-audit-trail.integration.test.ts |
| [DoD 14](16-definition-of-done.md#dod-14-vision-integration) | Vision Integration | behaviors/11 §48c–48d | — | mcp-types.test-d.ts | — |
| [DoD 15](16-definition-of-done.md#dod-15-electronic-signatures) | Electronic Signatures | behaviors/06, 17-gxp §65 | gxp-signature.test.ts | signature.test-d.ts | signature.integration.test.ts |
| [DoD 16](16-definition-of-done.md#dod-16-validation-tooling) | Validation Tooling | 17-gxp §67e | validation.test.ts | — | validation.integration.test.ts |
| [DoD 17](16-definition-of-done.md#dod-17-port-gate-hook) | Port Gate Hook | behaviors/07 §29–30 | port-gate-hook.test.ts | port-gate-hook.test-d.ts | port-gate-hook.integration.test.ts |
| [DoD 18](16-definition-of-done.md#dod-18-guard-integration-contracts) | Guard Integration Contracts | behaviors/09 §37–40 | cross-library.test.ts | — | cross-library.integration.test.ts |
| [DoD 19](16-definition-of-done.md#dod-19-testing-infrastructure) | Testing Infrastructure | behaviors/12 §49–56 | testing-infra.test.ts | testing-infra.test-d.ts | — |
| [DoD 20](16-definition-of-done.md#dod-20-array-matchers) | Array Matchers | behaviors/03 §66–70, behaviors/04 | array-matchers.test.ts | array-matchers.test-d.ts | array-matchers.integration.test.ts |
| [DoD 21](16-definition-of-done.md#dod-21-api-ergonomics) | API Ergonomics | behaviors/06 §23a, 04-policy-types §71, §84, §85, 18-ecosystem §74, behaviors/11 §42a | api-ergonomics.test.ts | api-ergonomics.test-d.ts | api-ergonomics.integration.test.ts |
| [DoD 22](16-definition-of-done.md#dod-22-cucumber-bdd-acceptance-tests) | Cucumber BDD Acceptance Tests | behaviors/12-testing.md §57 | — | — | libs/guard/features/**/*.feature (19 files, 86 scenarios) |
| [DoD 23](16-definition-of-done.md#dod-23-meta-audit-logging) | Meta-Audit Logging | behaviors/11 §48e, 17-gxp | meta-audit.test.ts | — | meta-audit.integration.test.ts |
| [DoD 24](16-definition-of-done.md#dod-24-system-decommissioning) | System Decommissioning | 15-appendices §70a | decommissioning.test.ts | decommissioning.test-d.ts | decommissioning.integration.test.ts |
| [DoD 25](16-definition-of-done.md#dod-25-async-evaluation) | Async Evaluation | behaviors/04 §21a, behaviors/06 §22a, behaviors/07 §25a | async-evaluation.test.ts | async-evaluation.test-d.ts | async-evaluation.integration.test.ts |
| [DoD 26](16-definition-of-done.md#dod-26-field-level-union-strategy) | Field-Level Union Strategy | behaviors/04 §13a, behaviors/04 §19 | field-strategy.test.ts | field-strategy.test-d.ts | field-strategy.integration.test.ts |
| [DoD 27](16-definition-of-done.md#dod-27-rebac) | ReBAC | behaviors/01, behaviors/04–06 §22b, behaviors/07, behaviors/09–15 | relationship.test.ts | relationship.test-d.ts | relationship.integration.test.ts |
| [DoD 28](16-definition-of-done.md#dod-28-ecosystem-extensions) | Ecosystem Extensions | 18-ecosystem §74–78 | ecosystem-extensions.test.ts | ecosystem-extensions.test-d.ts | ecosystem-extensions.integration.test.ts |
| [DoD 29](16-definition-of-done.md#dod-29-developer-experience) | Developer Experience | 19-developer §79–83 | packages/guard-cli/tests/unit/cli.test.ts | — | packages/guard-cli/tests/integration/cli.integration.test.ts |

---

## §8 Coverage Targets

| Metric | Target | Regulatory Basis | Applies To |
|--------|--------|-----------------|------------|
| Branch coverage | ≥ 90% | GAMP 5 Category 5 | All packages |
| Line coverage | ≥ 95% | GAMP 5 Category 5 | All packages |
| Mutation score (policy evaluation core and combinators) | 100% | ICH Q9 — zero tolerance for logic errors in authorization decisions | `libs/guard/core/src/evaluator/` |
| Mutation score (GxP-critical paths: hash chain, WAL, signatures, serialization) | ≥ 95% | ICH Q9 — high-risk invariant verification; FDA 21 CFR Part 11 | `libs/guard/core/src/guard/`, `libs/guard/core/src/serialization/`, `libs/guard/core/src/signature/` |
| Mutation score (standard paths: React, inspector, DevTools) | ≥ 90% | ICH Q9 — risk-proportionate testing | `libs/guard/react/`, `libs/guard/core/src/inspection/` |
| Type test coverage | 100% of exported public API types | ADR-GD-001 (branded tokens), ADR-GD-003 (discriminated unions) | All exported types |
| GxP integrity tests | All High-risk invariants covered | FDA 21 CFR Part 11; GAMP 5 Category 5 | INV-GD-005–010, INV-GD-013–019 |

---

## §9 Regulatory Requirements Traceability Matrix

> **Extracted from:** [compliance/gxp.md](./compliance/gxp.md) during spec restructure (CCR-GUARD-018, 2026-02-17). The regulatory Document Control block below (revision 2.3) is preserved for GxP audit continuity; the authoritative document-level control is §Document Control above (revision 3.0).

> For the generic RTM template, see [../../../cross-cutting/gxp/07-traceability-matrix-template.md](../../../cross-cutting/gxp/07-traceability-matrix-template.md). This section covers guard-specific traceability entries.

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-17-11                              |
> | Revision         | 2.3                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
> | Classification   | GxP Compliance Sub-Specification         |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 2.3 (2026-02-15): Clarified duplicate version history entries v1.7 and v1.9 to distinguish initial vs refined CCR-GUARD-012 changes (CCR-GUARD-017) |
> |                  | 2.2 (2026-02-15): Added §69-NUM requirement numbering convention documentation explaining URS-GUARD-NNN vs REQ-GUARD-NNN dual numbering system with relationship mapping and stability guarantees (CCR-GUARD-016) |
> |                  | 2.1 (2026-02-15): Synchronized version registry for GUARD-00 (2.1→2.2), GUARD-17-04 (1.2→1.3), GUARD-17-09 (1.8→1.9) per CCR-GUARD-015 gap closure |
> |                  | 2.0 (2026-02-15): Added URS-to-FS Traceability Coverage Verification subsection with metrics table, many-to-many documentation, and periodic verification REQUIREMENT (CCR-GUARD-013) |
> |                  | 1.9 (2026-02-14): Added §69i ecosystem extension traceability, added periodic specification review traceability to §58 (CCR-GUARD-012) |
> |                  | 1.8 (2026-02-14): Corrected §69h URS-GUARD-009 verification range from OQ-42 to OQ-43, added Regulatory Inspector user group to URS §3, added multi-persona diversity requirement to PQ-4 (CCR-GUARD-009) |
> |                  | 1.7 (2026-02-14): Added §58 document approval traceability (CCR-GUARD-012) |
> |                  | 1.6 (2026-02-14): Added REQ-GUARD-074 through REQ-GUARD-082 (ecosystem extensions §74-§83), OQ-44 through OQ-49, FM-32 through FM-36, updated version registry (CCR-GUARD-011) |
> |                  | 1.5 (2026-02-14): Corrected §69h URS-GUARD-009 verification range from OQ-42 to OQ-43 (GxP compliance review finding 1) |
> |                  | 1.4 (2026-02-14): Added URS-GUARD-019 (Data Retention), URS-GUARD-020 (Decommissioning), URS-GUARD-021 (Administrative Controls) to §69h URS-to-FS traceability (CCR-GUARD-006) |
> |                  | 1.3 (2026-02-14): Added REQ-GUARD-073 (Cucumber BDD acceptance tests), traceability rows for 21 CFR 11.10(a), EU Annex 11 §4.4, GAMP 5 Category 5, WHO TRS 996, bumped matrix version to 1.7 |
> |                  | 1.2 (2026-02-13): Added REQ-GUARD-066 through REQ-GUARD-072, EU GMP Annex 11 Sections 5/6/8/15, URS-to-FS traceability (§69h), updated version registry |
> |                  | 1.1 (2026-02-13): Added spec version management (§69-VER), document approval workflow (§69-DOC), extended REQ-GUARD registry (051-065) |
> |                  | 1.0 (2026-02-13): Initial controlled release |


---

## 69. Regulatory Traceability Matrix

This section maps specific regulatory requirements to spec sections, DoD items, and test references, providing end-to-end traceability from regulation to verification evidence.

```
REQUIREMENT: All matrix entries MUST have verification evidence (test references
             and DoD items) before @hex-di/guard is deployed in a GxP environment.

REQUIREMENT: The traceability matrix MUST be reviewed before each GxP deployment.
             Any matrix entry missing verification evidence MUST block deployment
             until evidence is provided or a documented deviation is approved by
             QA. The review MUST be recorded with reviewer identity, review date,
             and outcome (all entries evidenced / deviations noted).
             Reference: WHO TRS 996 Annex 5, GAMP 5.
```

> **Traceability Matrix Version:** 2.0 | **Last Reviewed:** 2026-02-15 | **Reviewer:** GxP Compliance Review
>
> | Version | Summary of Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
> | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | 1.0     | Initial matrix: 69a (21 CFR Part 11), 69b (EU GMP Annex 11), 69c (ALCOA+), 69d (GAMP 5), 69e (ICH Q9 / PIC/S), 69f (WHO TRS 996), 69g (MHRA DI). IQ-1 through IQ-11, OQ-1 through OQ-23, PQ-1 through PQ-9, FM-1 through FM-26. 26 failure modes (22 Low). Includes SignatureService conformance suite references and PolicyChangeAuditEntry coverage.                                                                                                                                                                                                                                                                                                                                          |
> | 1.1     | Applied 5 GxP compliance recommendations: R1 — elevated periodic security assessment from RECOMMENDED to REQUIREMENT (§64f-1); R2 — expanded document control to all spec documents chapters 01-17 (§67); R3 — reduced FM-15 Detectability from 2 to 1 (RPN 10→5), all 26 failure modes now Low (§68); R4 — added OQ-24 GxP regression test permanence verification with append-only registry (§67b); R5 — added cross-library validation coordination with @hex-di/http-client section 64a-2 and OQ-25 (§64a-2, §67b). OQ range updated to OQ-1 through OQ-31.                                                                                                                                 |
> | 1.2     | Applied 5 GxP compliance recommendations (second round): R1 — elevated in-transit encryption from RECOMMENDED to REQUIREMENT when gxp:true (§63); R2 — elevated SBOM generation from RECOMMENDED to REQUIREMENT when gxp:true, added IQ-12 (§67a); R3 — added optional `dataClassification` field to AuditEntry metadata for risk-based review categorization (§61); R4 — added REQUIREMENT for documented cross-region ordering strategy when gxp:true with multi-region deployment (§61.4a); R5 — added `checkPreDeploymentCompliance()` utility for static artifact validation with 8 check items (§07-guard-adapter.md). IQ range updated to IQ-1 through IQ-12. Test count updated to 707. |
> | 1.3     | GxP Compliance Finding Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Address all 30 findings from GxP compliance review: add §61.4b (PolicyChangeAuditEntry hash chain), §63c (archival strategy), §64a-ext-1 (production policy prohibition), §64a-3 (policy rollback), §65c-1 (HSM integration); add GxPAuthSubject type and validateGxPSubject() gate; add OQ-26 through OQ-31; add FM-26; upgrade 4 RECOMMENDED blocks to REQUIREMENT; add Appendix M (operational risk guidance).                              |
> | 1.4     | GxP Hardening Recommendations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Add §69-REQ stable requirement ID registry (REQ-GUARD-001 through REQ-GUARD-050); add GxP Quick Start guide to index; add ACL020-ACL025 GxP error codes with FMEA mapping; add §67c-1 concrete performance benchmarks; add §65c-2 PQC readiness section; add ad-hoc penetration testing triggers and rate limiting guidance; add ring buffer clarification, SIEM log format, cross-scope reconstruction utility, multi-tenant isolation notes. |
> | 1.5     | Adversarial Assessment Gap Closure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Add REQ-GUARD-051 through REQ-GUARD-065; add §69-DOC document approval workflow; add §69-VER specification version management with document registry; extend traceability to new sections (§61.4c, §61.9, §61.10, §64g-2 through §64g-5, §64a-4, §64a-5, §65b-2 through §65b-4, §65d-1). OQ range updated to OQ-1 through OQ-37.                                                                                                               |
> | 1.6     | GxP Compliance Gap Closure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Add REQ-GUARD-066 through REQ-GUARD-072; add EU GMP Annex 11 Sections 5, 6, 8, 15 to 69b; add §69h URS-to-FS traceability (18 entries); add FM-27 through FM-31 (31 total failure modes); add React STRIDE threats S/T/R/E/D-React-1 (32 total threats); add OQ-38 through OQ-42. Updated version registry for 7 spec documents.                                                                                                               |
> | 1.7     | Cucumber BDD Acceptance Test Layer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Add REQ-GUARD-073 (Cucumber BDD acceptance tests). Update 21 CFR 11.10(a) traceability to include OQ-43. Add EU GMP Annex 11 §4.4 Cucumber UAT alignment. Update GAMP 5 Category 5 OQ range to OQ-43. Update WHO TRS 996 traceability to include Cucumber report archival. Updated version registry for 4 spec documents.|
> | 1.8     | GxP Compliance Review Finding Resolution (CCR-GUARD-009) | Corrected §69h URS-GUARD-009 verification range from OQ-42 to OQ-43. Added Regulatory Inspector user group to URS §3. Added multi-persona diversity requirement to PQ-4. |
> | 1.9     | Ecosystem Extension Traceability (CCR-GUARD-012) | Added §69i ecosystem extension REQ-to-verification matrix for REQ-GUARD-074 through REQ-GUARD-082. Added §58 document approval and periodic specification review traceability. |
> | 2.0     | URS-to-FS Coverage Verification (CCR-GUARD-013) | Added URS-to-FS Traceability Coverage Verification subsection with metrics table (21/21 forward, 21/21 backward, 0 orphans), many-to-many documentation, and periodic verification REQUIREMENT. Synchronized version registry to match all document revisions updated under CCR-GUARD-013. |

```
RECOMMENDED: This traceability matrix SHOULD carry a version identifier, last review
             date, and reviewer identity to ensure auditors can confirm currency. The
             version SHOULD be incremented when matrix rows are added, removed, or
             substantively modified.
```

### 69-NUM. Requirement Numbering Convention

The Guard specification uses two distinct requirement numbering systems, each serving a different purpose:

| Prefix | Scope | Document | Purpose |
|--------|-------|----------|---------|
| `URS-GUARD-NNN` | User Requirements Specification | [00-urs.md](./urs.md) | Business-level user requirements written in stakeholder language, defining **what** the system must do. There are 21 URS requirements (URS-GUARD-001 through URS-GUARD-021). |
| `REQ-GUARD-NNN` | GxP Compliance Guide | compliance/gxp.md | Normative REQUIREMENT blocks within the GxP compliance specification, defining **how** regulatory obligations are met at the technical level. There are 85 REQ-GUARD requirements (REQ-GUARD-001 through REQ-GUARD-085). |

**Relationship:** URS-GUARD requirements are upstream (business needs); REQ-GUARD requirements are downstream (technical compliance controls). Section §69h provides the bidirectional traceability mapping between URS-GUARD and REQ-GUARD identifiers. A single URS-GUARD requirement may trace to multiple REQ-GUARD requirements (one-to-many), and a single REQ-GUARD requirement may satisfy aspects of multiple URS-GUARD requirements (many-to-one).

**Stability guarantee:** Both numbering systems are append-only. Identifiers are never reused or renumbered when documents are restructured. Retired identifiers are marked with a retirement reason and date.

### 69-REQ. Stable Requirement ID Registry

Each normative REQUIREMENT block across the GxP compliance guide is assigned a stable identifier (`REQ-GUARD-NNN`) that persists across document revisions, regardless of section renumbering. These IDs are suitable for use in validation plans, deviation reports, CAPA records, and traceability matrices.

```
REQUIREMENT: Every normative REQUIREMENT block in the GxP compliance guide MUST
             have a unique REQ-GUARD-NNN identifier. When sections are renumbered
             or restructured, the REQ-GUARD-NNN identifier MUST remain unchanged
             to preserve traceability to existing validation documentation.
             New requirements MUST be assigned the next available sequential ID.
             Retired requirements MUST be marked "RETIRED — [reason]" and MUST
             NOT be reused.
             Reference: WHO TRS 996 Annex 5 (bi-directional traceability).
```

| REQ ID        | Section              | Requirement Summary                                                                    |
| ------------- | -------------------- | -------------------------------------------------------------------------------------- |
| REQ-GUARD-001 | §59 (01)             | Open system classification: encrypt in transit TLS 1.2+, digital signatures on batches |
| REQ-GUARD-002 | §59 (01)             | System classification decision tree before initial GxP deployment                      |
| REQ-GUARD-003 | §59 (01)             | Predicate rule mapping prior to deployment                                             |
| REQ-GUARD-004 | §60 (01)             | Data integrity controls incorporated into site data governance framework               |
| REQ-GUARD-005 | §61 (02)             | Append-only audit trail behavioral contract (4 invariants)                             |
| REQ-GUARD-006 | §61 (02)             | WAL mandatory when gxp:true                                                            |
| REQ-GUARD-007 | §61 (02)             | Scope disposal triggers verifyAuditChain when gxp:true                                 |
| REQ-GUARD-008 | §61 (02)             | Completeness monitoring deployed when gxp:true                                         |
| REQ-GUARD-009 | §61 (02)             | Chain break response SLA (1h alert, 4h quarantine, 24h report)                         |
| REQ-GUARD-010 | §61 (02)             | Per-scope chain with monotonic sequence numbers                                        |
| REQ-GUARD-011 | §61 (02)             | Business continuity plan for audit trail infrastructure                                |
| REQ-GUARD-012 | §61 (02)             | Documented cross-region ordering strategy when gxp:true                                |
| REQ-GUARD-013 | §61 (02)             | PolicyChangeAuditEntry hash chain participation                                        |
| REQ-GUARD-014 | §62 (03)             | NTP-synchronized clock source in production                                            |
| REQ-GUARD-015 | §62 (03)             | RTC availability verification when gxp:true                                            |
| REQ-GUARD-016 | §63 (04)             | Data retention minimum periods (1yr allow, 3yr deny, lifetime signatures)              |
| REQ-GUARD-017 | §63 (04)             | In-transit encryption when gxp:true                                                    |
| REQ-GUARD-018 | §63 (04)             | Primary storage redundancy (RAID/replication/multi-AZ)                                 |
| REQ-GUARD-019 | §64 (05)             | Risk-based periodic audit trail review                                                 |
| REQ-GUARD-020 | §64a (06)            | Policy change control: change request, impact analysis, approval                       |
| REQ-GUARD-021 | §64a (06)            | Production policy prohibition (no runtime policy construction)                         |
| REQ-GUARD-022 | §64a (06)            | Re-validation triggers on framework/adapter/infrastructure changes                     |
| REQ-GUARD-023 | §64b (06)            | Administrative activity monitoring (append-only log)                                   |
| REQ-GUARD-024 | §64c (06)            | Training and competency for guard operators                                            |
| REQ-GUARD-025 | §64f-1 (06)          | Annual penetration testing of audit trail infrastructure                               |
| REQ-GUARD-026 | §64g (06)            | Administrative operations deny-by-default when gxp:true                                |
| REQ-GUARD-027 | §64g (06)            | checkGxPReadiness verifies AdminGuardConfig registration                               |
| REQ-GUARD-028 | §65a (07)            | Signature binding integrity (hash chain includes signature)                            |
| REQ-GUARD-029 | §65b (07)            | Re-authentication two-component identification                                         |
| REQ-GUARD-030 | §65b (07)            | Account lockout after failed re-authentication attempts                                |
| REQ-GUARD-031 | §65b-1 (07)          | Constant-time comparison for signatures when gxp:true                                  |
| REQ-GUARD-032 | §65c (07)            | Minimum cryptographic key sizes (RSA 2048, ECDSA P-256, HMAC 256-bit)                  |
| REQ-GUARD-033 | §65c (07)            | HSM/keystore/secrets manager required for GxP key storage                              |
| REQ-GUARD-034 | §65c (07)            | Asymmetric algorithms for GxP compliance evidence                                      |
| REQ-GUARD-035 | §65d (07)            | Standard signature meanings not redefinable                                            |
| REQ-GUARD-036 | §65d (07)            | Separation of duties: same-signer rejection per evaluationId                           |
| REQ-GUARD-037 | §66 (08)             | Compliance verification checklist before deployment                                    |
| REQ-GUARD-038 | §67 (09)             | Validation plan IQ/OQ/PQ documented and executed                                       |
| REQ-GUARD-039 | §67 (09)             | VMP linkage for guard validation plan                                                  |
| REQ-GUARD-040 | §67a (09)            | SBOM generation when gxp:true (IQ-12)                                                  |
| REQ-GUARD-041 | §67b (09)            | GxP regression tests permanently retained                                              |
| REQ-GUARD-042 | §67c (09)            | Soak test minimum 4 hours when gxp:true                                                |
| REQ-GUARD-043 | §68 (10)             | FMEA risk assessment covering all 36 failure modes (31 core + 5 ecosystem extension)   |
| REQ-GUARD-044 | §68 (10)             | Incident classification matrix                                                         |
| REQ-GUARD-045 | §69 (11)             | Traceability matrix reviewed before each GxP deployment                                |
| REQ-GUARD-046 | §70 (12)             | Decommissioning: audit trail archived with chain verification                          |
| REQ-GUARD-047 | §70 (12)             | Periodic archive readability verification                                              |
| REQ-GUARD-048 | Appendix G (15)      | Open-source supplier qualification                                                     |
| REQ-GUARD-049 | Appendix J (15)      | Schema version increment rules                                                         |
| REQ-GUARD-050 | Appendix J (15)      | Cross-version compatibility for verifyAuditChain                                       |
| REQ-GUARD-051 | §61.4c (02)          | Production chain re-verification daily cadence when gxp:true                           |
| REQ-GUARD-052 | §61.4c (02)          | scheduleChainVerification() utility with health events                                 |
| REQ-GUARD-053 | §61.9 (02)           | Circuit breaker for audit trail backend (CLOSED/OPEN/HALF-OPEN)                        |
| REQ-GUARD-054 | §61.10 (02)          | Error log retention: 1yr info/warn, 3yr error/critical                                 |
| REQ-GUARD-055 | §61.10 (02)          | Error log correlation metadata (6 fields)                                              |
| REQ-GUARD-056 | §64g-2 (06)          | Periodic user access review: quarterly high-risk, semi-annual standard                 |
| REQ-GUARD-057 | §64g-3 (06)          | Account provisioning/deprovisioning lifecycle                                          |
| REQ-GUARD-058 | §64g-4 (06)          | Recommended maxScopeLifetimeMs values for GxP risk profiles                            |
| REQ-GUARD-059 | §64a-4 (06)          | Change impact assessment template (13 fields)                                          |
| REQ-GUARD-060 | §64a-5 (06)          | Change freeze periods during critical operations                                       |
| REQ-GUARD-061 | §64g-5 (06)          | Role assignment/revocation auditing in admin event log                                 |
| REQ-GUARD-062 | §65b-2 (07)          | signedAt clock source MUST use guard ClockSource                                       |
| REQ-GUARD-063 | §65b-3 (07)          | Account lockout parameters REQUIRED when gxp:true                                      |
| REQ-GUARD-064 | §65b-4 (07)          | ReauthenticationToken replay protection with durable registry                          |
| REQ-GUARD-065 | §65d-1 (07)          | Minimum signer count (minSigners) for counter-signing workflows                        |
| REQ-GUARD-066 | §68 (10)             | FMEA ecosystem extension: FM-32 through FM-36, STRIDE threats T-5/T-6/E-5/E-6/D-5, and single-control-failure analysis for ecosystem FMs |
| REQ-GUARD-067 | §59 (01)             | predicateRuleMapping non-empty when gxp:true, checkGxPReadiness item 15                |
| REQ-GUARD-068 | §65c-3 (07)          | Certificate lifecycle management (issuance, renewal, revocation, chain archival)       |
| REQ-GUARD-069 | §65c-4 (07)          | Epoch-based signature algorithm migration with multi-algorithm verification            |
| REQ-GUARD-070 | §59 (01)             | Policy input schema validation when gxp:true (Annex 11 Section 5)                      |
| REQ-GUARD-071 | §59 (01)             | Resource attribute accuracy/freshness checks when gxp:true (Annex 11 Section 6)        |
| REQ-GUARD-072 | §01 (01-overview.md) | URS-to-FS traceability maintenance                                                     |
| REQ-GUARD-073 | §57 (13-testing.md)  | Cucumber BDD acceptance test suite: runner config, feature files, step definitions, CI integration, GxP traceability tags |
| REQ-GUARD-074 | §74 (roadmap/ecosystem-extensions.md) | PolicySyncPort distributed policy sync with contentHash verification on receipt                             |
| REQ-GUARD-075 | §74 (roadmap/ecosystem-extensions.md) | Distributed policy change control verification: all nodes MUST activate updated policy before change closure (§64a-0) |
| REQ-GUARD-076 | §75 (roadmap/ecosystem-extensions.md) | Framework middleware authorization enforcement: all guarded routes MUST have guard wrapper coverage         |
| REQ-GUARD-077 | §76 (roadmap/ecosystem-extensions.md) | Persistence adapter append-only contract: REVOKE constraints + hash chain integrity for Postgres/SQLite audit trail |
| REQ-GUARD-078 | §77 (roadmap/ecosystem-extensions.md) | policyToFilter() cross-validation: filter output MUST be subset of evaluate() allow set for all test cases |
| REQ-GUARD-079 | §78 (roadmap/ecosystem-extensions.md) | WASM evaluation cross-validation: WASM evaluate() MUST produce identical decisions to TypeScript evaluate() for 1000+ test cases |
| REQ-GUARD-080 | §80 (roadmap/developer-experience.md) | Playground GxP data classification: non-dismissible warning banner when loading policies from gxp:true configurations |
| REQ-GUARD-081 | §82 (roadmap/developer-experience.md) | Policy coverage analysis: node, branch, permission, role, and decision coverage metrics with --min-coverage CI gate |
| REQ-GUARD-082 | §83 (roadmap/developer-experience.md) | Policy diff and migration: PolicyDiff discriminated union, PolicyImpact analysis, GxP PolicyChangeAuditEntry integration |
| REQ-GUARD-083 | §67b (09-validation-plan.md) | Adverse condition OQ: simultaneous multi-component failure (IdP + audit backend concurrent failure with WAL capture and circuit breaker recovery) |
| REQ-GUARD-084 | §67b (09-validation-plan.md) | Adverse condition OQ: cascading failure chain verification (clock drift does NOT cascade to hash chain integrity failure; sequenceNumber ordering remains authoritative) |
| REQ-GUARD-085 | §67b (09-validation-plan.md) | Adverse condition OQ: recovery from partial state corruption (WAL recovery handles orphaned, corrupted, and completed intents correctly without process crash) |

> **Registry maintenance:** New requirements added in subsequent revisions continue from REQ-GUARD-086 onward. The registry MUST be updated in the same commit that adds a new REQUIREMENT block.

### 69a. FDA 21 CFR Part 11

| Regulation | Requirement                                                      | Spec Section(s)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | DoD Item(s)    | Test Reference                                                                                                                                                                      |
| ---------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11.2       | Predicate rules applicability                                    | Section 59 (01-regulatory-context.md: predicate rules)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | DoD 13         | Predicate rules documentation; OQ-1 (unit tests verify predicate rule enforcement for open/closed system classification)                                                            |
| 11.3(b)(6) | Electronic record definition                                     | Section 59 (01-regulatory-context.md: electronic record classification)                                                                                                                                                                                                                                                                                                                                                                                                                                                         | DoD 13         | Classification table; OQ-1 (unit tests verify AuditEntry qualifies as electronic record per classification criteria)                                                                |
| 11.10(a)   | System validation                                                | Section 67 (09-validation-plan.md: IQ/OQ/PQ), Section 57 (13-testing.md: Cucumber BDD acceptance tests — REQ-GUARD-073)                                                                                                                                                                                                                                                                                                                                                                                                         | DoD 13, DoD 22 | IQ/OQ/PQ checklists, OQ-43 (Cucumber BDD acceptance tests)                                                                                                                          |
| 11.10(b)   | Ability to generate accurate and complete copies of records      | Section 64 (05-audit-trail-review.md: QueryableAuditTrail export, self-contained audit exports), Section 09 (09-audit-entry.md: AuditEntry JSON Schema, Export Manifest)                                                                                                                                                                                                                                                                                                                                                        | DoD 13         | Export format tests, self-contained export REQUIREMENT, audit entry serialization round-trip tests                                                                                  |
| 11.10(c)   | Protection of records for accurate and ready retrieval           | Section 63 (04-data-retention.md: data retention, backup/DR, primary storage redundancy, in-transit encryption REQUIREMENT when gxp:true), Section 70 (12-decommissioning.md: decommissioning)                                                                                                                                                                                                                                                                                                                                  | DoD 13         | Retention verification, backup restore tests, redundancy REQUIREMENT, in-transit encryption verification (IQ)                                                                       |
| 11.10(d)   | Limiting system access to authorized individuals                 | Sections 25-28 (07-guard-adapter.md: guard adapter), Section 07 (07-guard-adapter.md: maxScopeLifetimeMs, ScopeExpiredError ACL013)                                                                                                                                                                                                                                                                                                                                                                                             | DoD 7          | Guard integration tests (23 tests), scope expiry tests                                                                                                                              |
| 11.10(e)   | Secure, computer-generated, time-stamped audit trails            | Section 61 (02-audit-trail-contract.md: AuditTrailPort contract), Section 61.3a (02-audit-trail-contract.md: durability tiers), Section 61.6 (02-audit-trail-contract.md: Non-Obscurement invariant), Section 64a (06-administrative-controls.md: policy change control), Section 64a-1 (06-administrative-controls.md: PolicyChangeAuditEntry), Section 61.4b (02-audit-trail-contract.md: PolicyChangeAuditEntry hash chain), Section 61 (02-audit-trail-contract.md: completeness monitoring REQUIREMENT when gxp:true — R1) | DoD 13         | Audit trail integration tests (10 tests), conformance suite (17 tests), OQ-23 (PolicyChangeAuditEntry recording), OQ-26 through OQ-31, completeness monitoring verification         |
| 11.10(f)   | Use of operational system checks to enforce permitted sequencing | Section 61.4a (02-audit-trail-contract.md: monotonic sequenceNumber), Sections 25-28 (07-guard-adapter.md: guard evaluation pipeline), Section 61 (02-audit-trail-contract.md: workflow sequencing guidance)                                                                                                                                                                                                                                                                                                                    | DoD 7, DoD 13  | Sequence ordering tests, pipeline enforcement tests                                                                                                                                 |
| 11.10(g)   | Authority checks for operation type                              | Sections 29-30 (07-guard-adapter.md: port gate hook), Section 64g (06-administrative-controls.md: administrative authority checks — AdminGuardConfig, AdminOperation, separation of duties, deny-by-default)                                                                                                                                                                                                                                                                                                                    | DoD 7, DoD 13  | Method-level policy tests, administrative authority check enforcement tests, checkGxPReadiness admin-authority-unconfigured diagnostic test, separation of duties enforcement tests |
| 11.10(h)   | Use of device checks for data input validity                     | Section 64a (06-administrative-controls.md: runtime policy schema validation), Section 65b (07-electronic-signatures.md: device checks for e-signatures)                                                                                                                                                                                                                                                                                                                                                                        | DoD 13, DoD 15 | Schema validation REQUIREMENT, device check REQUIREMENT (GxP) / RECOMMENDED (non-GxP)                                                                                               |
| 11.10(i)   | Training for personnel using e-record/e-signature systems        | Section 64c (06-administrative-controls.md: training and competency)                                                                                                                                                                                                                                                                                                                                                                                                                                                            | DoD 13         | Training REQUIREMENT block                                                                                                                                                          |
| 11.10(j)   | Written policies holding individuals accountable                 | Section 64a (06-administrative-controls.md: policy change control), Section 64a-ext-1 (06-administrative-controls.md: production policy prohibition), Section 64a-3 (06-administrative-controls.md: policy rollback), Section 64c (06-administrative-controls.md: training)                                                                                                                                                                                                                                                     | DoD 13         | Change request approval, training documentation, OQ-26 through OQ-31                                                                                                                |
| 11.10(k)   | Use of appropriate controls over systems documentation           | Section 63 (04-data-retention.md: data retention), ADR table                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | DoD 13         | Retention verification in checklist                                                                                                                                                 |
| 11.30      | Controls for open systems                                        | Section 59 (01-regulatory-context.md: open/closed system classification, TLS 1.2+ REQUIREMENT)                                                                                                                                                                                                                                                                                                                                                                                                                                  | DoD 13         | OQ-HT-01 through OQ-HT-05 (HTTP transport TLS enforcement, http-client spec §85); deployment-specific open-system controls verified during site IQ per section 59 classification    |
| 11.50      | Signature manifestations — signatures linked to records          | Section 65a (07-electronic-signatures.md: signature binding), Section 65c (07-electronic-signatures.md: asymmetric algorithm REQUIREMENT), Section 65 (07-electronic-signatures.md: deterministic multi-signature ordering REQUIREMENT — G2)                                                                                                                                                                                                                                                                                    | DoD 15         | Binding integrity validation tests (12 tests), asymmetric algorithm enforcement, signature ordering verification                                                                    |
| 11.70      | Signature/record linking — signatures not excisable              | Section 65a (07-electronic-signatures.md: hash chain includes signature)                                                                                                                                                                                                                                                                                                                                                                                                                                                        | DoD 15         | Hash chain with signature tests                                                                                                                                                     |
| 11.100     | Two-component identification for signing                         | Section 65b (07-electronic-signatures.md: re-authentication)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | DoD 15         | Re-authentication flow tests                                                                                                                                                        |
| 11.200     | Electronic signature components and controls                     | Section 65c (07-electronic-signatures.md: key management, minimum key sizes REQUIREMENT), Section 65c-1 (07-electronic-signatures.md: HSM integration)                                                                                                                                                                                                                                                                                                                                                                          | DoD 15         | Key rotation/revocation tests, minimum key size enforcement, OQ-26 through OQ-31                                                                                                    |
| 11.300     | Controls for identification codes/passwords                      | Section 65b (07-electronic-signatures.md: credential verification, signerId registry REQUIREMENT, account lockout REQUIREMENT)                                                                                                                                                                                                                                                                                                                                                                                                  | DoD 15         | ReauthenticationChallenge validation tests, OQ-16                                                                                                                                   |

### 69b. EU GMP Annex 11

| Regulation   | Requirement                                          | Spec Section(s)                                                                                                                                                                                                                                                                             | DoD Item(s)           | Test Reference                                                                                                                                               |
| ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Section 1    | Risk management                                      | Section 68 (10-risk-assessment.md: FMEA)                                                                                                                                                                                                                                                    | DoD 13                | FMEA coverage of 36 failure modes (31 core + 5 ecosystem extension)                                                                                          |
| Section 4.3  | Inventory and validation                             | Section 67 (09-validation-plan.md: IQ/OQ/PQ, IQ-12 SBOM REQUIREMENT when gxp:true)                                                                                                                                                                                                          | DoD 13                | IQ checklist (12 items, IQ-1 through IQ-12)                                                                                                                  |
| Section 7    | Data storage — ensuring data integrity               | Section 61 (02-audit-trail-contract.md: append-only, atomic writes)                                                                                                                                                                                                                         | DoD 13                | Hash chain integrity tests                                                                                                                                   |
| Section 7.1  | Backup and restore                                   | Section 63 (04-data-retention.md: backup requirements, primary storage redundancy)                                                                                                                                                                                                          | DoD 13                | Backup verification checklist, redundancy REQUIREMENT, OQ-18, OQ-21                                                                                          |
| Section 9    | Audit trails                                         | Section 61 (02-audit-trail-contract.md: completeness, integrity), Section 06-subject.md (attribute sanitization REQUIREMENT when gxp:true — R2), Section 12-inspection.md (ring buffer GxP minimum REQUIREMENT — R4)                                                                        | DoD 6, DoD 12, DoD 13 | Audit completeness tests (allow + deny), attribute sanitization verification, ring buffer size validation                                                    |
| Section 12   | Security — access control                            | Sections 25-28 (07-guard-adapter.md: guard adapter), Section 64g (06-administrative-controls.md: administrative authority checks)                                                                                                                                                           | DoD 7, DoD 13         | Guard enforcement tests (23 tests), administrative authority check enforcement tests                                                                         |
| Section 12.1 | Physical and logical access controls                 | Section 64 (05-audit-trail-review.md: audit trail access control), Section 64g (06-administrative-controls.md: administrative roles, separation of duties)                                                                                                                                  | DoD 13                | Access control requirements documented, administrative role mapping requirements                                                                             |
| Section 2    | Personnel — training and competency                  | Section 64c (06-administrative-controls.md: training requirements)                                                                                                                                                                                                                          | DoD 13                | Training REQUIREMENT block, documented training records                                                                                                      |
| Section 3    | Suppliers and service providers                      | Section 67a (09-validation-plan.md: IQ — dependency verification, IQ-12 SBOM REQUIREMENT when gxp:true), Section 61 (02-audit-trail-contract.md: adapter behavioral contract)                                                                                                               | DoD 13                | IQ-8 (package integrity), IQ-12 (SBOM REQUIREMENT when gxp:true), adapter contract documentation                                                             |
| Section 16   | Business continuity                                  | Section 61 (02-audit-trail-contract.md: business continuity planning)                                                                                                                                                                                                                       | DoD 13                | Business continuity REQUIREMENT block                                                                                                                        |
| Section 10   | Change management                                    | Section 64a (06-administrative-controls.md: policy change control), Section 64a-1 (06-administrative-controls.md: PolicyChangeAuditEntry), Section 64a-ext-1 (06-administrative-controls.md: production policy prohibition), Section 64a-3 (06-administrative-controls.md: policy rollback) | DoD 13                | Change request documentation, approval workflow, re-validation triggers, OQ-23 (PolicyChangeAuditEntry recording)                                            |
| Section 11   | Periodic evaluation                                  | Section 64 (05-audit-trail-review.md: periodic review REQUIREMENT, health check RECOMMENDED, periodic review report)                                                                                                                                                                        | DoD 13                | Annual OQ re-verification REQUIREMENT, periodic review report REQUIREMENT, health check verification                                                         |
| Section 4.7  | System parameter limits, data limits, error handling | Section 67b (09-validation-plan.md: OQ-12 through OQ-15)                                                                                                                                                                                                                                    | DoD 13                | Boundary condition and error handling OQ tests                                                                                                               |
| Section 12.3 | Administrative activity monitoring                   | Section 64b (06-administrative-controls.md: administrative activity monitoring)                                                                                                                                                                                                             | DoD 13                | Admin event logging REQUIREMENT blocks                                                                                                                       |
| Section 12.4 | Access lifecycle management                          | Section 64 (05-audit-trail-review.md: access rights lifecycle REQUIREMENT)                                                                                                                                                                                                                  | DoD 13                | Access lifecycle review REQUIREMENT, revocation procedures                                                                                                   |
| Section 13   | Incident management                                  | Section 61 (02-audit-trail-contract.md: chain break response, WAL recovery QA notification), Section 65c (07-electronic-signatures.md: key compromise response), Section 68 (10-risk-assessment.md: incident classification)                                                                | DoD 13                | Incident response REQUIREMENT blocks, CAPA procedures, WAL recovery notification                                                                             |
| Section 14   | Electronic signatures                                | Section 65 (07-electronic-signatures.md: electronic signatures)                                                                                                                                                                                                                             | DoD 15                | Signature workflow tests (OQ-8, OQ-10)                                                                                                                       |
| Section 17   | Archiving / decommissioning                          | Section 70 (12-decommissioning.md: system decommissioning, periodic archive readability verification REQUIREMENT — G3), Section 63c (04-data-retention.md: archival strategy)                                                                                                               | DoD 13, DoD 24        | Decommissioning export and report REQUIREMENT blocks, annual archive readability verification                                                                |
| Section 5    | Data — input validation and secure processing        | Section 59 (01-regulatory-context.md: policy input schema validation REQUIREMENT when gxp:true — REQ-GUARD-070)                                                                                                                                                                             | DoD 13                | OQ-41 (policy input schema validation: attribute type checking, matcher operand compatibility, runtime type enforcement)                                     |
| Section 6    | Accuracy checks — data correctness verification      | Section 59 (01-regulatory-context.md: resource attribute accuracy/freshness REQUIREMENT when gxp:true — REQ-GUARD-071)                                                                                                                                                                      | DoD 13                | OQ-42 (resource attribute freshness threshold, stale attribute denial, provenance timestamp WARNING)                                                         |
| Section 8    | Printouts — hardcopy audit trail reports             | Section 59 (01-regulatory-context.md: hardcopy report guidance RECOMMENDED), Section 64 (05-audit-trail-review.md: export mechanisms)                                                                                                                                                       | DoD 13                | Export format tests; print formatting is consumer responsibility (library provides structured data)                                                          |
| Section 15   | Batch release — authorised person certification      | Section 59 (01-regulatory-context.md: batch release integration guidance), Section 65d (07-electronic-signatures.md: hasSignature with minSigners), Section 65d-1 (07-electronic-signatures.md: counter-signing)                                                                            | DoD 15                | Out of scope for authorization library; integration guidance provided (guard gates + audit evidence + electronic signatures support batch release workflows) |

> **Out-of-scope Annex 11 sections:** Sections 4.5 (transferred/migrated systems — deployment-specific), 4.6 (functionality testing for intended use — covered by OQ testing in section 67b), and 4.8 (data transfer validation — addressed via audit trail data migration verification in section 63) are not individually traced because they fall outside the scope of an authorization library or are addressed through higher-level controls documented elsewhere.

> **Annex 11 §4.4 note:** User acceptance testing remains a consumer responsibility. The library now provides Cucumber BDD feature files (section 57, 13-testing.md) as a regulatory-readable basis for UAT scenario design, and the UAT script template (section 67g) includes a RECOMMENDED block for aligning Cucumber scenarios with UAT scripts. UAT execution and evidence are site-specific.

### 69c. ALCOA+ Data Integrity Principles

| Principle           | Requirement                          | Spec Section(s)                                                                                                                                                                    | DoD Item(s)          | Test Reference                                                                                        |
| ------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------- |
| **Attributable**    | Every record traceable to a person   | Section 60 (01-regulatory-context.md: ALCOA+ mapping), AuditEntry.subjectId, SubjectProvider conformance suite (13-testing.md)                                                     | DoD 7, DoD 6, DoD 13 | Subject provenance in audit entries, SubjectProvider conformance suite (12 tests)                     |
| **Legible**         | Records readable and permanent       | Section 60 (01-regulatory-context.md), `serializePolicy()`, `explainPolicy()`, Section 64 (05-audit-trail-review.md: internationalization of audit trail content RECOMMENDED — G1) | DoD 8, DoD 13        | Serialization round-trip tests (20 tests), i18n verification (UTF-8 encoding, non-ASCII preservation) |
| **Contemporaneous** | Records created at event time        | Section 62 (03-clock-synchronization.md: clock synchronization, RTC availability verification REQUIREMENT when gxp:true — G4)                                                      | DoD 13               | Clock source tests, timestamp verification, OQ-21 (NTP failover), RTC startup verification            |
| **Original**        | First capture of data, immutable     | Section 60 (01-regulatory-context.md), Object.freeze on Decision/AuditEntry                                                                                                        | DoD 7, DoD 13        | Immutability tests                                                                                    |
| **Accurate**        | Records reflect what happened        | Section 60 (01-regulatory-context.md), `evaluate()` deterministic function with trace (05-policy-evaluator.md)                                                                     | DoD 5                | Evaluator tests (38 unit tests)                                                                       |
| **Complete**        | All events recorded                  | Section 61.3 (02-audit-trail-contract.md: completeness requirement)                                                                                                                | DoD 13               | Completeness tests (both allow and deny)                                                              |
| **Consistent**      | Consistent formats and identifiers   | Section 60 (01-regulatory-context.md), UUID v4 evaluationId, ISO 8601 timestamps, AuditEntry.schemaVersion (07-guard-adapter.md)                                                   | DoD 13               | Format consistency tests, schemaVersion validation tests                                              |
| **Enduring**        | Records persist for retention period | Section 63 (04-data-retention.md: data retention)                                                                                                                                  | DoD 13               | Retention requirements documented                                                                     |
| **Available**       | Records accessible for review        | Section 64 (05-audit-trail-review.md: audit trail review), GuardInspector (12-inspection.md)                                                                                       | DoD 12, DoD 13       | Inspector snapshot tests (10 tests)                                                                   |

### 69d. GAMP 5

| GAMP 5 Requirement | Description                                                    | Spec Section(s)                                                                                                             | DoD Item(s)    | Test Reference                                                                       |
| ------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| Category 5 Testing | Custom software requires rigorous testing including IQ, OQ, PQ | Section 67 (09-validation-plan.md: IQ/OQ/PQ, mandatory 4-hour soak REQUIREMENT when gxp:true — R3), Section 57 (13-testing.md: Cucumber BDD acceptance tests — REQ-GUARD-073), DoD 13 | DoD 13, DoD 16, DoD 22 | IQ-1 through IQ-12, OQ-1 through OQ-52, PQ-1 through PQ-10, 4-hour soak test evidence, OQ-43 Cucumber report |
| Risk Management    | Risk-based approach to validation and testing                  | Section 68 (10-risk-assessment.md: FMEA), ICH Q9                                                                            | DoD 13         | FMEA table (36 failure modes with RPN scoring, 39 STRIDE threats)                    |
| Periodic Review    | Ongoing system suitability verification                        | Section 64 (05-audit-trail-review.md: periodic review), Section 64a (06-administrative-controls.md: re-validation triggers) | DoD 13         | Annual OQ re-verification, re-validation trigger checklist                           |
| Change Control     | Formal process for system configuration changes                | Section 64a (06-administrative-controls.md: policy change control)                                                          | DoD 13         | Change request documentation, approval workflow                                      |
| Appendix D4        | Critical and major controls classification                     | Section 59 (01-regulatory-context.md: normative language table — MUST/SHOULD alignment with D4)                             | DoD 13         | Normative language mapping, REQUIREMENT/RECOMMENDED classification                   |
| Appendix O3        | Training and competency                                        | Section 64c (06-administrative-controls.md: training requirements)                                                          | DoD 13         | Training REQUIREMENT block, competency documentation                                 |
| Appendix M3        | Incident management                                            | Section 68 (10-risk-assessment.md: incident classification matrix REQUIREMENT)                                              | DoD 13         | Incident classification matrix, escalation procedures                                |

### 69e. ICH Q9 / PIC/S PI 011-3

| Regulation          | Requirement                                                                       | Spec Section(s)                                                                                                                                                                                            | DoD Item(s)    | Test Reference                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| ICH Q9              | Quality risk management — systematic risk identification, evaluation, and control | Section 68 (10-risk-assessment.md: FMEA), risk scoring methodology                                                                                                                                         | DoD 13         | FMEA with RPN scoring, 36 failure modes mitigated to RPN < 10                                                         |
| PIC/S PI 011-3 §9   | Audit trail — complete record of GMP-relevant activities                          | Section 61 (02-audit-trail-contract.md: AuditTrailPort contract), DoD 13                                                                                                                                   | DoD 13         | Audit completeness tests, hash chain integrity tests                                                                  |
| PIC/S PI 011-3 §6.3 | Data integrity — ALCOA+ principles for electronic data                            | Section 60 (01-regulatory-context.md: ALCOA+ mapping), Section 61 (02-audit-trail-contract.md: AuditTrailPort)                                                                                             | DoD 7, DoD 13  | ALCOA+ verification in integration tests                                                                              |
| PIC/S PI 011-3 §9.4 | Audit trail access — controlled access to audit data                              | Section 64 (05-audit-trail-review.md: audit trail access control, inspector access procedure, digital inspector access RECOMMENDED — G5)                                                                   | DoD 13, DoD 23 | Access control requirements, meta-audit logging, inspector access REQUIREMENT, digital inspector MCP access procedure |
| PIC/S PI 011-3 §9.5 | Administrative monitoring — logging of admin activities                           | Section 64b (06-administrative-controls.md: administrative activity monitoring)                                                                                                                            | DoD 13         | Admin event logging requirements                                                                                      |
| PIC/S PI 011-3 §9.8 | Risk-based audit trail review                                                     | Section 64 (05-audit-trail-review.md: risk-based review REQUIREMENT block, dataClassification field for review categorization), Section 61 (02-audit-trail-contract.md: dataClassification metadata field) | DoD 13         | Risk-based review frequency REQUIREMENT documentation, dataClassification field specification                         |
| PIC/S PI 011-3 §6.1 | Data lifecycle management — integrity from creation through archival              | Section 60 (01-regulatory-context.md: ALCOA+ Enduring, Available), Section 63 (04-data-retention.md: retention), Section 70 (12-decommissioning.md: decommissioning)                                       | DoD 13         | Data lifecycle coverage across retention and decommissioning                                                          |
| PIC/S PI 011-3 §6.5 | Implemented optional controls become auditable                                    | Normative language note (section 59, 01-regulatory-context.md), all OPTIONAL/MAY controls                                                                                                                  | DoD 13         | Implementation quality of adopted optional controls                                                                   |

```
RECOMMENDED: Organizations SHOULD maintain a register of adopted optional controls
             per PIC/S PI 011-3 §6.5. For each OPTIONAL/MAY control from this
             specification that the organization has chosen to implement, the register
             SHOULD document: (1) the control identifier (section and RECOMMENDED
             block), (2) the implementation status, (3) the rationale for adoption,
             and (4) verification evidence. This register facilitates audits by
             providing a single inventory of which optional controls are in scope.
```

| PIC/S PI 011-3 §9.6 | System admin role separation — admin activities separated from routine operations | Section 64 (05-audit-trail-review.md: audit trail access control), Section 64b (06-administrative-controls.md: admin activity monitoring) | DoD 13 | Admin role separation REQUIREMENT blocks, meta-audit logging |
| PIC/S PI 011-3 §9.7 | Event logs for system configuration changes | Section 64b (06-administrative-controls.md: administrative activity monitoring), Section 64a (06-administrative-controls.md: policy change control) | DoD 13 | Admin event logging, policy change log REQUIREMENT |

### 69f. WHO TRS 996 Annex 5

| Requirement                 | Description                                           | Spec Section(s)                                                                                                                            | DoD Item(s)    | Test Reference                                                                                         |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------ |
| Validation planning         | Systematic approach to computerized system validation | Section 67 (09-validation-plan.md: IQ/OQ/PQ validation plan, VMP linkage REQUIREMENT, checkPreDeploymentCompliance pre-qualification step) | DoD 13, DoD 16 | IQ/OQ/PQ checklists, validation report template, VMP REQUIREMENT, checkPreDeploymentCompliance utility |
| Bi-directional traceability | Requirements mapped to test cases and vice versa      | Section 67 (09-validation-plan.md: VMP RECOMMENDED block), Section 69 (11-traceability-matrix.md: traceability matrices), Section 57 (13-testing.md: @REQ-GUARD-xxx tags in Cucumber feature files — REQ-GUARD-073) | DoD 13, DoD 22 | Traceability matrices 69a-69g, checklist cross-references (section 66, 08-compliance-verification.md), Cucumber @REQ-GUARD-xxx tag traceability |
| Risk-based testing          | Testing effort proportional to risk                   | Section 68 (10-risk-assessment.md: FMEA), Section 67b (09-validation-plan.md: OQ checklist)                                                | DoD 13         | FMEA with RPN scoring, risk-proportional OQ test coverage                                              |

### 69g. MHRA Data Integrity Guidance (2018)

| Requirement               | Description                                             | Spec Section(s)                                                                                                                                                                                                                             | DoD Item(s)   | Test Reference                                                                                                   |
| ------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Data governance framework | Data integrity controls integrated into site governance | Section 60 (01-regulatory-context.md: data governance REQUIREMENT block)                                                                                                                                                                    | DoD 13        | ALCOA+ mapping, governance integration documentation                                                             |
| ALCOA+ principles         | Electronic data must satisfy ALCOA+                     | Section 60 (01-regulatory-context.md: ALCOA+ compliance mapping), Section 61 (02-audit-trail-contract.md: AuditTrailPort contract)                                                                                                          | DoD 7, DoD 13 | ALCOA+ verification in integration tests (section 69c, 11-traceability-matrix.md)                                |
| Audit trail review        | Regular, documented review of audit trails              | Section 64 (05-audit-trail-review.md: audit trail review interface, periodic review)                                                                                                                                                        | DoD 13        | Risk-based review RECOMMENDED, periodic review report REQUIREMENT                                                |
| Data process mapping      | Documented data flow from creation to archival          | Section 60 (01-regulatory-context.md: ALCOA+ mapping), Section 61 (02-audit-trail-contract.md: AuditTrailPort contract), Section 63 (04-data-retention.md: retention)                                                                       | DoD 13        | ALCOA+ mapping table, audit entry lifecycle documentation                                                        |
| Blank/template controls   | Controls for blank forms and templates                  | Section 64a (06-administrative-controls.md: policy change control — policy templates under version control)                                                                                                                                 | DoD 13        | Policy snapshot versioning, change control documentation                                                         |
| Cloud-hosted audit trail  | Additional controls for cloud-hosted audit data         | Section 59 (01-regulatory-context.md: open/closed system classification), Section 63 (04-data-retention.md: in-transit encryption REQUIREMENT when gxp:true), Section 64 (05-audit-trail-review.md: audit trail access control, meta-audit) | DoD 13        | TLS REQUIREMENT for open systems, in-transit encryption REQUIREMENT when gxp:true, cloud access logging guidance |

> **HTTP Transport Traceability:** For HTTP transport security regulatory traceability covering 20 additional findings, see http-client spec Section 100 (20-http-transport-validation.md). Section 69 (this spec) and http-client spec Section 100 together constitute the complete regulatory traceability matrix for @hex-di/guard.

### 69h. URS-to-FS Traceability

This section maps User Requirement Specifications (URS) to Functional Specification (FS) sections, providing the bi-directional traceability required by GAMP 5 Appendix D4 and WHO TRS 996 Annex 5. The authoritative URS document is **[00-urs.md](./urs.md)** which contains the full URS-GUARD-001 through -021 requirements with SHALL statements, risk classifications, acceptance criteria, and regulatory drivers. This table provides the reverse mapping from FS sections to URS requirements.

| URS ID        | User Requirement Summary                              | FS Section(s)                                       | REQ-GUARD ID(s)                             | Verification (OQ/IQ/PQ)            |
| ------------- | ----------------------------------------------------- | --------------------------------------------------- | ------------------------------------------- | ---------------------------------- |
| URS-GUARD-001 | Permission-based access control enforcement           | §25-28 (07-guard-adapter.md)                        | REQ-GUARD-037, REQ-GUARD-038                | OQ-1, OQ-3                         |
| URS-GUARD-002 | Immutable audit trail for all decisions               | §61 (02-audit-trail-contract.md)                    | REQ-GUARD-005, REQ-GUARD-006                | OQ-6, OQ-7                         |
| URS-GUARD-003 | Person identification for every action (Attributable) | §60 (01-regulatory-context.md), §22 (06-subject.md) | REQ-GUARD-004                               | OQ-7, OQ-26                        |
| URS-GUARD-004 | Synchronized timestamps (Contemporaneous)             | §62 (03-clock-synchronization.md)                   | REQ-GUARD-014, REQ-GUARD-015                | OQ-17, PQ-6                        |
| URS-GUARD-005 | Tamper detection on audit records                     | §61.4 (02-audit-trail-contract.md)                  | REQ-GUARD-010, REQ-GUARD-013                | OQ-6, OQ-27                        |
| URS-GUARD-006 | Electronic signatures with re-authentication          | §65 (07-electronic-signatures.md)                   | REQ-GUARD-028, REQ-GUARD-029                | OQ-8, OQ-10                        |
| URS-GUARD-007 | Separation of duties for counter-signing              | §65d (07-electronic-signatures.md)                  | REQ-GUARD-036, REQ-GUARD-065                | OQ-10, OQ-23                       |
| URS-GUARD-008 | Regulatory retention period compliance                | §63 (04-data-retention.md)                          | REQ-GUARD-016, REQ-GUARD-017                | IQ                                 |
| URS-GUARD-009 | Formal IQ/OQ/PQ validation                            | §67 (09-validation-plan.md)                         | REQ-GUARD-038, REQ-GUARD-039, REQ-GUARD-042, REQ-GUARD-083, REQ-GUARD-084, REQ-GUARD-085 | IQ-1–IQ-12, OQ-1–OQ-52, PQ-1–PQ-10 |
| URS-GUARD-010 | Administrative access restriction                     | §64g (06-administrative-controls.md)                | REQ-GUARD-026, REQ-GUARD-027                | OQ-34, OQ-35                       |
| URS-GUARD-011 | Risk-based periodic review                            | §64 (05-audit-trail-review.md)                      | REQ-GUARD-019                               | Annual OQ re-verification          |
| URS-GUARD-012 | Controlled policy change process                      | §64a (06-administrative-controls.md)                | REQ-GUARD-020, REQ-GUARD-021                | OQ-23, OQ-31                       |
| URS-GUARD-013 | Hardware-protected signing keys                       | §65c (07-electronic-signatures.md)                  | REQ-GUARD-032, REQ-GUARD-033                | IQ-10, OQ-8                        |
| URS-GUARD-014 | Backup, restore, and DR for audit data                | §63 (04-data-retention.md)                          | REQ-GUARD-018                               | OQ-18, OQ-29                       |
| URS-GUARD-015 | Predicate rule documentation before GxP deployment    | §59 (01-regulatory-context.md)                      | REQ-GUARD-003, REQ-GUARD-067                | OQ-38                              |
| URS-GUARD-016 | Policy input data type validation                     | §59 (01-regulatory-context.md, Annex 11 §5)         | REQ-GUARD-070                               | OQ-41                              |
| URS-GUARD-017 | Resource attribute accuracy and freshness             | §59 (01-regulatory-context.md, Annex 11 §6)         | REQ-GUARD-071                               | OQ-42                              |
| URS-GUARD-018 | Certificate lifecycle and algorithm migration         | §65c-3, §65c-4 (07-electronic-signatures.md)        | REQ-GUARD-068, REQ-GUARD-069                | OQ-39, OQ-40                       |
| URS-GUARD-019 | Audit trail data retention and archival to long-term storage | §63, §63a, §63b, §63c (04-data-retention.md)       | REQ-GUARD-018                               | OQ-18, PQ-8, retention policy      |
| URS-GUARD-020 | Orderly decommissioning with archive export, chain preservation, key disposition | §70, §70a (12-decommissioning.md)                   | REQ-GUARD-046                               | PQ-10, decommissioning dry-run     |
| URS-GUARD-021 | Administrative authority checks, SoD, policy change control, training | §64a, §64b, §64c, §64g, §64h, §64i (06-administrative-controls.md) | REQ-GUARD-060, REQ-GUARD-061                | OQ-23, OQ-3, compliance checklist  |

#### URS-to-FS Traceability Coverage Verification

The mapping above contains 21 entries corresponding to URS-GUARD-001 through URS-GUARD-021. The relationship is predominantly 1:1 (one URS requirement maps to one or two FS sections), which is appropriate for a library specification where each user requirement maps to a specific functional module. The following coverage metrics have been verified:

| Metric | Value | Status |
|--------|-------|--------|
| URS requirements with FS coverage | 21/21 (100%) | Pass |
| URS requirements with REQ-GUARD ID(s) | 21/21 (100%) | Pass |
| URS requirements with OQ/IQ/PQ verification | 21/21 (100%) | Pass |
| Orphaned FS sections (no URS parent) | 0 | Pass |
| Many-to-many mappings (URS to multiple FS) | 5 (URS-003, URS-018, URS-019, URS-020, URS-021) | Documented |

> **Note on 1:1 prevalence:** The predominantly 1:1 mapping reflects the modular architecture of the guard library: each URS requirement corresponds to a distinct functional module (permissions, audit trail, clock synchronization, etc.). Where many-to-many mappings exist (e.g., URS-GUARD-021 maps to five FS sections), they are documented in the table above. The absence of many-to-many for most requirements is not a gap — it reflects clean separation of concerns in the library design.

```
REQUIREMENT: During each periodic review cycle (§64), the URS-to-FS traceability
             table MUST be verified for continued completeness. Any new URS
             requirements added during the review cycle MUST be traced to FS
             sections before the review is closed. Any FS sections added without
             a corresponding URS requirement MUST either be traced to an existing
             URS or trigger creation of a new URS requirement.
             Reference: GAMP 5 Appendix D4, WHO TRS 996 Annex 5.
```

### 69i. Ecosystem Extension Traceability

This section maps ecosystem extension requirements (sections 74-83, roadmap/ecosystem-extensions.md and roadmap/developer-experience.md) to REQ-GUARD identifiers, FMEA failure modes, STRIDE threats, and OQ verification. Only GxP-relevant ecosystem packages are traced; non-GxP packages (guard-playground UI rendering, guard-vscode extension UX) are excluded from formal traceability with documented rationale.

#### Ecosystem REQ-to-Verification Matrix

| REQ-GUARD ID   | Spec Section | Requirement Summary                                     | FMEA Cross-Ref | STRIDE Cross-Ref | OQ Verification | Risk Level |
| -------------- | ------------ | ------------------------------------------------------- | --------------- | ----------------- | --------------- | ---------- |
| REQ-GUARD-074  | §74          | PolicyBundle contentHash verified on receipt             | FM-33           | T-6               | OQ-44           | High       |
| REQ-GUARD-075  | §74, §64a-0  | Distributed policy propagation verified before change closure | FM-33     | T-6               | OQ-44           | High       |
| REQ-GUARD-076  | §75          | Framework middleware route coverage enforcement          | FM-34           | E-5               | OQ-45           | High       |
| REQ-GUARD-077  | §76          | Persistence adapter append-only + hash chain integrity   | FM-32           | T-5               | OQ-46           | Critical   |
| REQ-GUARD-078  | §77          | policyToFilter() cross-validation against evaluate()    | FM-35           | E-6               | OQ-47           | Critical   |
| REQ-GUARD-079  | §78          | WASM cross-validation against TypeScript evaluate()      | FM-36           | —                 | OQ-48           | High       |
| REQ-GUARD-080  | §80          | Playground GxP data classification warning               | —               | —                 | OQ-49           | Low        |
| REQ-GUARD-081  | §82          | Policy coverage metrics with CI gate                     | —               | —                 | —               | Low        |
| REQ-GUARD-082  | §83          | Policy diff with GxP PolicyChangeAuditEntry integration  | FM-23           | —                 | OQ-23           | Medium     |

> **Exclusion rationale:** REQ-GUARD-081 (policy coverage analysis) is a development-time quality metric, not a GxP runtime control. It does not have a dedicated OQ test case because policy coverage is a CI/CD tool, not a production system. Organizations MAY include coverage thresholds in their validation evidence as supporting documentation. REQ-GUARD-080 (playground warning) has OQ-49 verification because the warning is a GxP data classification control, even though the playground itself is a development tool.

#### Ecosystem FMEA Summary

| FMEA ID | Component                 | Ecosystem Package                | Pre-Mitigation RPN | Mitigated RPN | OQ Cross-Ref |
| ------- | ------------------------- | -------------------------------- | ------------------- | ------------- | ------------ |
| FM-32   | Persistence Adapter       | @hex-di/guard-postgres-audit, @hex-di/guard-sqlite-audit | 5                   | 5             | OQ-46        |
| FM-33   | PolicySyncPort            | @hex-di/guard (core port)        | 24                  | 4             | OQ-44        |
| FM-34   | Framework Middleware      | @hex-di/guard-express, guard-fastify, guard-trpc, guard-graphql, guard-nestjs | 20 | 5  | OQ-45        |
| FM-35   | Query Conversion          | @hex-di/guard-prisma, @hex-di/guard-drizzle | 20                  | 5             | OQ-47        |
| FM-36   | WASM Compilation          | @hex-di/guard-wasm               | 10                  | 5             | OQ-48        |

All 5 ecosystem failure modes are mitigated to RPN < 10 (Low risk). FM-33 (distributed policy inconsistency) had the highest pre-mitigation RPN at 24 and is mitigated to 4 by contentHash verification, health check integration, and change control propagation verification (§64a-0).

#### Adverse Condition REQ-to-Verification Matrix

REQ-GUARD-083 through REQ-GUARD-085 verify system resilience under compound failure conditions. These are REQUIRED for all GxP deployments (not scoped to v0.1.0).

| REQ-GUARD ID   | Spec Section              | Requirement Summary                                                                 | FMEA Cross-Ref | STRIDE Cross-Ref | OQ Verification | Risk Level |
| -------------- | ------------------------- | ----------------------------------------------------------------------------------- | --------------- | ----------------- | --------------- | ---------- |
| REQ-GUARD-083  | §67b (09-validation-plan) | Simultaneous multi-component failure: IdP + audit backend concurrent failure recovery | FM-15, FM-18    | D-4               | OQ-50           | High       |
| REQ-GUARD-084  | §67b (09-validation-plan) | Cascading failure chain: clock drift independence from hash chain integrity          | FM-09, FM-10    | —                 | OQ-51           | Medium     |
| REQ-GUARD-085  | §67b (09-validation-plan) | Partial state corruption recovery: WAL handles mixed-state intents correctly         | FM-15, FM-17    | —                 | OQ-52           | High       |

---

### 69-DOC. Document Approval Workflow

```
REQUIREMENT: Each GxP compliance specification document (chapters 01-12 plus
             appendices) MUST follow a formal approval workflow before changes
             are considered effective:

             1. **Draft:** Author creates or modifies the document. The
                document control header shows the new revision number with
                status "Draft".
             2. **Technical Review:** A technical reviewer (peer with domain
                knowledge) reviews the changes for technical accuracy,
                completeness, and consistency with other spec documents.
                The reviewer MUST NOT be the author.
             3. **Compliance Review:** The GxP Compliance Review team
                (identified in the document control header) reviews for
                regulatory alignment — verifying REQUIREMENT blocks against
                cited regulations, checking cross-references, and confirming
                FMEA/OQ impact is addressed.
             4. **Approval:** The Regulatory Affairs Lead and Quality
                Assurance Manager (identified in the document control header)
                approve the document. Both approvals are REQUIRED before the
                document becomes effective.
             5. **Effective:** The document control header is updated with
                the approval date and the change is merged to the controlled
                branch.

             The approval workflow MUST be evidenced via one of:
             (a) Pull request reviews with approver identities and timestamps.
             (b) Electronic signatures on the document.
             (c) A separate approval record in the quality management system.
             Reference: 21 CFR 11.10(k), EU GMP Annex 11 §10,
             GAMP 5 (documentation management).
```

### 69-VER. Specification Version Management Strategy

```
REQUIREMENT: The GxP compliance specification MUST follow semantic versioning
             for document revisions:
             (a) Major version (X.0): Breaking changes to normative REQUIREMENT
                 blocks that would invalidate existing validation evidence
                 (e.g., changing pass criteria, removing requirements, modifying
                 behavioral contracts). Major version changes MUST trigger
                 re-validation per §64a.
             (b) Minor version (x.Y): Additive changes that extend the
                 specification without invalidating existing compliance
                 (e.g., new REQUIREMENT blocks, new OQ items, new FMEA
                 failure modes, new STRIDE threats). Minor version changes
                 MUST be assessed for re-validation impact but do not
                 automatically trigger full re-validation.
             (c) Patch version (x.y.Z): Corrections to typographical errors,
                 clarifications that do not change normative meaning, and
                 cross-reference updates. Patch changes do not trigger
                 re-validation.

             The version MUST be recorded in each document's control header
             (Revision field). When multiple documents are updated in the
             same change, all affected documents MUST be versioned
             independently.

             A version history summary MUST be maintained in this traceability
             matrix document (section 69) to provide a single point of
             reference for the current revision status of all GxP compliance
             documents.
             Reference: 21 CFR 11.10(k), GAMP 5 (version control).

REQUIREMENT: The following version registry MUST be maintained and updated
             with each spec revision:

             | Document ID | Document Title | Current Revision | Last Change Date | Status |
             |-------------|---------------|-----------------|-----------------|--------|
             | GUARD-00 | README (Navigation Index) | 2.5 | 2026-02-21 | Effective |
             | GUARD-00-URS | User Requirements Specification | 2.0 | 2026-02-20 | Effective |
             | GUARD-INV | Invariants | 5.0 | 2026-02-20 | Effective |
             | GUARD-OVERVIEW | Overview | 4.3 | 2026-02-20 | Effective |
             | GUARD-RMP | Roadmap | 3.1 | 2026-02-20 | Effective |
             | GUARD-01 | Overview & Philosophy | 1.1 | 2026-02-13 | Effective |
             | GUARD-02 | Permission Types | 1.0 | 2026-02-13 | Effective |
             | GUARD-03 | Role Types | 1.0 | 2026-02-13 | Effective |
             | GUARD-04 | Policy Types | 1.1 | 2026-02-21 | Effective |
             | GUARD-05 | Policy Evaluator | 1.1 | 2026-02-21 | Effective |
             | GUARD-06 | Subject | 1.0 | 2026-02-13 | Effective |
             | GUARD-07 | Guard Adapter | 1.0 | 2026-02-13 | Effective |
             | GUARD-08 | Port Gate Hook | 1.0 | 2026-02-13 | Effective |
             | GUARD-09 | Serialization | 1.0 | 2026-02-13 | Effective |
             | GUARD-10 | Cross-Library Integration (behaviors/09-cross-library.md) | 2.1 | 2026-02-20 | Effective |
             | GUARD-11 | React Integration | 1.2 | 2026-02-15 | Effective |
             | GUARD-12 | Inspection | 1.1 | 2026-02-14 | Effective |
             | GUARD-13 | Testing | 1.5 | 2026-02-20 | Effective |
             | GUARD-14 | API Reference (14-api-reference.md) | 1.3 | 2026-02-14 | Effective |
             | GUARD-15 | Appendices (15-appendices.md) | 2.2 | 2026-02-20 | Effective |
             | GUARD-15-IDX | Appendices Index (appendices/README.md) | 3.1 | 2026-02-20 | Effective |
             | GUARD-GLOSSARY | Glossary | 3.2 | 2026-02-20 | Effective |
             | GUARD-16 | Definition of Done | 2.2 | 2026-02-21 | Effective |
             | GUARD-17 | GxP Compliance Guide (Index) | 1.6 | 2026-02-15 | Effective |
             | GUARD-17-01 | Regulatory Context | 1.5 | 2026-02-20 | Effective |
             | GUARD-17-02 | Audit Trail Contract | 1.1 | 2026-02-13 | Effective |
             | GUARD-17-03 | Clock Synchronization | 1.0 | 2026-02-13 | Effective |
             | GUARD-17-04 | Data Retention | 1.3 | 2026-02-15 | Effective |
             | GUARD-17-05 | Audit Trail Review | 1.0 | 2026-02-13 | Effective |
             | GUARD-17-06 | Administrative Controls | 1.4 | 2026-02-20 | Effective |
             | GUARD-17-07 | Electronic Signatures | 1.3 | 2026-02-14 | Effective |
             | GUARD-17-08 | Compliance Verification | 1.5 | 2026-02-15 | Effective |
             | GUARD-17-09 | Validation Plan | 1.4 | 2026-02-20 | Effective |
             | GUARD-17-10 | Risk Assessment | 1.3 | 2026-02-14 | Effective |
             | GUARD-17-11 | Traceability Matrix (17-gxp-compliance/11-traceability-matrix.md) | 1.7 | 2026-02-15 | Effective |
             | GUARD-17-12 | Decommissioning | 1.0 | 2026-02-13 | Effective |
             | GUARD-17-00 | GxP Compliance Sub-Index (17-gxp-compliance/README.md) | 1.1 | 2026-02-21 | Effective |
             | GUARD-17-13 | Formal Test Protocols | 1.7 | 2026-02-21 | Effective |
             | GUARD-18 | Ecosystem Extensions (roadmap/ecosystem-extensions.md) | 1.1 | 2026-02-20 | Effective |
             | GUARD-19 | Developer Experience | 1.1 | 2026-02-14 | Effective |
             | GUARD-68-FMEA | Risk Assessment (risk-assessment.md) | 5.0 | 2026-02-20 | Effective |
             | GUARD-TS-01 | Type System — Phantom Brands (type-system/phantom-brands.md) | 2.0 | 2026-02-20 | Effective |
             | GUARD-TS-02 | Type System — Structural Safety (type-system/structural-safety.md) | 2.0 | 2026-02-20 | Effective |
             | GUARD-15-B | Competitive Comparison (comparisons/competitors.md) | 2.0 | 2026-02-20 | Effective |
             | GXP-GRD-001 | GxP Compliance (compliance/gxp.md) | Git-managed | 2026-02-20 | Effective |
             | GUARD-PRC-CI | CI Maintenance (process/ci-maintenance.md) | 1.0 | 2026-02-20 | Effective |
             | GUARD-PRC-DOD | Feature Definition of Done (process/definitions-of-done.md) | 2.4 | 2026-02-21 | Effective |
             | GUARD-TASKS | Implementation Tasks (tasks.md) | 1.1 | 2026-02-21 | Effective |
             | GUARD-RTM | Traceability Matrix (this document) | 6.3 | 2026-02-21 | Effective |

             Reference: WHO TRS 996 Annex 5, 21 CFR 11.10(k).
```

---
