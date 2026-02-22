# Requirement Identification Scheme

Naming conventions and uniqueness guarantees for all identifiers used in the `@hex-di/result-react` specification.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-REACT-PRC-003 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- process/requirement-id-scheme.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- process/requirement-id-scheme.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- process/requirement-id-scheme.md` |
| Status | Effective |

## Identifier Formats

### Behavior Requirements — `BEH-RXX-NNN`

| Component | Format | Meaning |
|-----------|--------|---------|
| `BEH` | Prefix | Behavior specification |
| `R` | Literal | React package (distinguishes from core library `BEH-XX-NNN`) |
| `XX` | Two-digit integer (01–07) | Capability number (corresponds to behavior spec file number) |
| `NNN` | Three-digit integer (001–999) | Sub-requirement within the capability |

**Examples**: `BEH-R01-001` (Components, Match), `BEH-R05-003` (Adapters, toSwrFetcher).

**Allocation rule**: Capability numbers are assigned sequentially starting from `01`. Sub-requirement numbers are assigned sequentially within each capability starting from `001`. Gaps in the sequence (from deleted requirements) are never reused.

**Stability**: Once assigned, a `BEH-RXX-NNN` identifier is permanent. If a requirement is removed, its ID is marked as "Withdrawn" in the behavior spec — the number is not reused.

### React Invariants — `INV-RN`

| Component | Format | Meaning |
|-----------|--------|---------|
| `INV-R` | Prefix | React package invariant (distinguishes from core `INV-N`) |
| `N` | Integer (1–99) | Sequential invariant number |

**Examples**: `INV-R1` (Stable Action References), `INV-R11` (React Version Fail-Fast).

**Stability**: Same as BEH — numbers are permanent and never reused.

### Architecture Decision Records — `ADR-RNNN`

| Component | Format | Meaning |
|-----------|--------|---------|
| `ADR-R` | Prefix | React package ADR (distinguishes from core `ADR-NNN`) |
| `NNN` | Three-digit integer (001–999) | Sequential decision number |

**Examples**: `ADR-R001` (No ResultBoundary), `ADR-R008` (No Do-Notation Hook).

### Audit Trail Requirements — `ATR-RN`

| Component | Format | Meaning |
|-----------|--------|---------|
| `ATR-R` | Prefix | React package audit trail requirement |
| `N` | Integer (1–9) | Sequential requirement number |

**Examples**: `ATR-R1` (Hook result logging), `ATR-R3` (Match branch logging).

### Data Retention Requirements — `DRR-RN`

| Component | Format | Meaning |
|-----------|--------|---------|
| `DRR-R` | Prefix | React package data retention requirement |
| `N` | Integer (1–9) | Sequential requirement number |

**Examples**: `DRR-R1` (Core toJSON serialization), `DRR-R3` (Adapter envelope loss).

### Residual Risks — `RR-RN`

| Component | Format | Meaning |
|-----------|--------|---------|
| `RR-R` | Prefix | React package residual risk |
| `N` | Integer (1–9) | Sequential risk number |

**Examples**: `RR-R1` (React state shallow reference), `RR-R6` (Concurrent Mode audit timing).

### Document Identifiers — `SPEC-REACT-{CAT}-{NNN}`

| Component | Format | Meaning |
|-----------|--------|---------|
| `SPEC-REACT` | Prefix | React package specification document |
| `CAT` | 3-letter category code | Document category (see table below) |
| `NNN` | Three-digit integer | Sequential within category |

| Category Code | Document Type | Examples |
|---------------|--------------|---------|
| `OVW` | Overview | `SPEC-REACT-OVW-001` |
| `BEH` | Behavior specification | `SPEC-REACT-BEH-001` through `SPEC-REACT-BEH-007` |
| `INV` | Invariants | `SPEC-REACT-INV-001` |
| `ADR` | Architecture Decision Record | `SPEC-REACT-ADR-001` through `SPEC-REACT-ADR-008` |
| `GLO` | Glossary | `SPEC-REACT-GLO-001` |
| `PRC` | Process document | `SPEC-REACT-PRC-001` through `SPEC-REACT-PRC-004` |
| `CMP` | Comparison | `SPEC-REACT-CMP-001` |
| `GXP` | GxP compliance | `SPEC-REACT-GXP-001` (= SPEC-GXP-R001) |
| `TRC` | Traceability | `SPEC-REACT-TRC-001` |
| `RSK` | Risk assessment | `SPEC-REACT-RSK-001` |
| `TYP` | Type system | `SPEC-REACT-TYP-001` |

## Uniqueness Guarantee

1. Every identifier is unique across the entire specification
2. The `R` infix in `BEH-RXX-NNN`, `INV-RN`, `ADR-RNNN`, `ATR-RN`, `DRR-RN`, and `RR-RN` prevents collisions with core library identifiers (`BEH-XX-NNN`, `INV-N`, `ADR-NNN`, etc.)
3. Identifiers are assigned once and never reused for a different purpose
4. Withdrawn requirements retain their identifier with a "Withdrawn" marker
5. The authoritative list of all assigned identifiers is maintained in the [traceability matrix](../traceability.md)

## Cross-References

When referencing identifiers across documents, use the full identifier with a markdown link to the source:

```markdown
See [BEH-R02-001](behaviors/02-async-hooks.md#beh-r02-001-useresultasync).
See [INV-R3](invariants.md#inv-r3-generation-guard).
See [ADR-R001](decisions/R001-no-error-boundary.md).
See [ATR-R1](compliance/gxp.md#normative-requirements).
```
