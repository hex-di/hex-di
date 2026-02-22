# Requirement ID Scheme

> **Extracted from:** README.md and traceability.md during spec restructure (CCR-GUARD-018, 2026-02-17)
> **Rev 2** (CCR-GUARD-020, 2026-02-19): Added BEH-GD-NNN scheme for functional behavior sections.

## ID Formats

The guard specification uses the following requirement identifier schemes:

### BEH-GD-NNN

Functional behavior requirement identifiers for sections in `behaviors/` files. Numbered sequentially BEH-GD-001 through BEH-GD-062. Each corresponds to a top-level `## NN.` section in a behaviors file. The legacy section number is preserved as a parenthetical suffix (e.g., `## BEH-GD-001: Permission Tokens (§5)`).

| Range | File | Sections |
|-------|------|----------|
| BEH-GD-001..004 | `behaviors/01-permission-types.md` | §5–§8 |
| BEH-GD-005..008 | `behaviors/02-role-types.md` | §9–§12 |
| BEH-GD-009..014 | `behaviors/03-policy-types.md` | §13–§17 |
| BEH-GD-015..019 | `behaviors/04-policy-evaluator.md` | §18–§21a |
| BEH-GD-020..024 | `behaviors/05-subject.md` | §22–§22b |
| BEH-GD-025..029 | `behaviors/06-guard-adapter.md` | §25–§28 |
| BEH-GD-030..031 | `behaviors/07-port-gate-hook.md` | §29–§30 |
| BEH-GD-032..037 | `behaviors/08-serialization.md` | §31–§36 |
| BEH-GD-038..041 | `behaviors/09-cross-library.md` | §37–§40 |
| BEH-GD-042..048 | `behaviors/10-react-integration.md` | §41–§46, §73 |
| BEH-GD-049..053 | `behaviors/11-inspection.md` | §47–§48d |
| BEH-GD-054..062 | `behaviors/12-testing.md` | §49–§57 |

IDs are permanent. A deprecated section retains its ID with a "Withdrawn" marker. Numbers are never reused.

### REQ-GUARD-NNN

Functional and design requirements. Numbered sequentially (REQ-GUARD-001 through REQ-GUARD-085). These trace through the traceability matrix to regulatory clauses.

### URS-GUARD-NNN

User Requirements Specification identifiers (URS-GUARD-001 through URS-GUARD-021). Defined in [urs.md](../urs.md) and traced to FS sections via [traceability.md §69h](../traceability.md#69h-urs-to-fs-traceability).

### ADR-GD-NNN

Architectural Decision Records (ADR-GD-001 through ADR-GD-056). Each is an individual file in [decisions/](../decisions/). ADR numbers are monorepo-wide (not guard-specific), so numbering may be non-contiguous.

### INV-GD-NNN

Invariant identifiers for runtime guarantees documented in [invariants.md](../invariants.md).

### FM-NN

FMEA failure mode identifiers (FM-01 through FM-36). Defined in [risk-assessment.md](../risk-assessment.md).

### OQ-NN / IQ-NN / PQ-NN

Qualification protocol identifiers. IQ (Installation), OQ (Operational), PQ (Performance). Defined in [17-gxp-compliance.md](../17-gxp-compliance.md) and [17-gxp-compliance.md](../17-gxp-compliance.md).

### ACL-NNN

Error code identifiers (ACL001 through ACL032). Defined in [appendices/error-code-reference.md](../appendices/error-code-reference.md).

### CCR-GUARD-NNN

Change Control Record identifiers. Each substantive change to the specification is tracked with a CCR number in Document History tables.

## Cross-Reference Rules

1. Every REQ-GUARD-NNN must appear in at least one traceability matrix row
2. Every URS-GUARD-NNN must trace to at least one REQ-GUARD-NNN via §69h
3. Every ADR must be referenced from at least one behavior spec or compliance section
4. Every FM must have an associated OQ test protocol
5. Every ACL error code must appear in the error code reference appendix
