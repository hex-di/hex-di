# Requirement Identification Scheme

Naming conventions and uniqueness guarantees for all identifiers used in the `@hex-di/result` specification.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CORE-PRC-003 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- process/requirement-id-scheme.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- process/requirement-id-scheme.md` |
| Approval Evidence | PR merge to `main` |
| Reviewer | PR approval record — see Git merge commit |
| Change History | `git log --oneline --follow -- process/requirement-id-scheme.md` |
| Status | Effective |

## Identifier Formats

### Behavior Requirements — `BEH-XX-NNN`

| Component | Format | Meaning |
|-----------|--------|---------|
| `BEH` | Prefix | Behavior specification |
| `XX` | Two-digit integer (01–14) | Capability number (corresponds to behavior spec file number) |
| `NNN` | Three-digit integer (001–999) | Sub-requirement within the capability |

**Examples**: `BEH-01-001` (Types and Guards, first requirement), `BEH-03-007` (Transformation, seventh requirement).

**Allocation rule**: Capability numbers are assigned sequentially starting from `01`. Sub-requirement numbers are assigned sequentially within each capability starting from `001`. Gaps in the sequence (from deleted requirements) are never reused.

**Stability**: Once assigned, a `BEH-XX-NNN` identifier is permanent. If a requirement is removed, its ID is marked as "Withdrawn" in the behavior spec — the number is not reused.

### Current Allocation

| Behavior Spec | File | ID Range | Count | Domain |
|---------------|------|----------|:-----:|--------|
| 01 — Types and Guards | `behaviors/01-types-and-guards.md` | BEH-01-001 – BEH-01-011 | 11 | Core type definitions, brand symbols, type guards |
| 02 — Creation | `behaviors/02-creation.md` | BEH-02-001 – BEH-02-007 | 7 | Factory functions (`ok`, `err`, `fromThrowable`, etc.) |
| 03 — Transformation | `behaviors/03-transformation.md` | BEH-03-001 – BEH-03-021 | 21 | `map`, `mapErr`, `mapBoth`, `flatten`, `flip` |
| 04 — Extraction | `behaviors/04-extraction.md` | BEH-04-001 – BEH-04-011 | 11 | `match`, `unwrapOr`, `toNullable`, `toJSON`, etc. |
| 05 — Composition | `behaviors/05-composition.md` | BEH-05-001 – BEH-05-008 | 8 | `all`, `allSettled`, `any`, `collect`, `partition`, etc. |
| 06 — Async | `behaviors/06-async.md` | BEH-06-001 – BEH-06-011 | 11 | `ResultAsync` class and async operations |
| 07 — Generators | `behaviors/07-generators.md` | BEH-07-001 – BEH-07-005 | 5 | `safeTry` generator-based early return |
| 08 — Error Patterns | `behaviors/08-error-patterns.md` | BEH-08-001 – BEH-08-004 | 4 | `createError`, `createErrorGroup`, `assertNever` |
| 09 — Option | `behaviors/09-option.md` | BEH-09-001 – BEH-09-010 | 10 | `Option<T>`, `some`, `none`, `isOption`, `toJSON`, `fromOptionJSON` |
| 10 — Standalone Functions | `behaviors/10-standalone-functions.md` | BEH-10-001 – BEH-10-004 | 4 | Curried pipe-style functions in `fn/*` |
| 11 — Unsafe | `behaviors/11-unsafe.md` | BEH-11-001 – BEH-11-005 | 5 | `unwrap`, `unwrapErr`, `UnwrapError` |
| 12 — Do Notation | `behaviors/12-do-notation.md` | BEH-12-001 – BEH-12-008 | 8 | `Do`, `bind`, `let_` |
| 13 — Interop | `behaviors/13-interop.md` | BEH-13-001 – BEH-13-006 | 6 | `fromJSON`, `toSchema`, Standard Schema, Option serialization interop |
| 14 — Benchmarks | `behaviors/14-benchmarks.md` | BEH-14-001 – BEH-14-008 | 8 | Performance targets and thresholds |

**Total**: 119 testable requirements across 14 behavior specifications.

### Invariants — `INV-N`

| Component | Format | Meaning |
|-----------|--------|---------|
| `INV` | Prefix | Runtime invariant |
| `N` | Integer (1–14) | Sequential invariant number |

**Examples**: `INV-1` (Frozen Result Instances), `INV-14` (Standalone Functions Delegate).

**Stability**: Same as BEH — numbers are permanent and never reused.

### Architecture Decision Records — `ADR-NNN`

| Component | Format | Meaning |
|-----------|--------|---------|
| `ADR` | Prefix | Architecture Decision Record |
| `NNN` | Three-digit integer (001–013) | Sequential decision number |

**Examples**: `ADR-001` (Closures Over Classes), `ADR-013` (Performance Strategy).

### Current ADR Allocation

| ADR | Title | File |
|-----|-------|------|
| ADR-001 | Closures Over Classes | `decisions/001-closures-over-classes.md` |
| ADR-002 | Brand Symbol Validation | `decisions/002-brand-symbol-validation.md` |
| ADR-003 | Phantom Type Parameters | `decisions/003-phantom-type-parameters.md` |
| ADR-004 | Object.freeze() Immutability | `decisions/004-object-freeze-immutability.md` |
| ADR-005 | Lazy Async Registration | `decisions/005-lazy-async-registration.md` |
| ADR-006 | Error Swallowing in Tee | `decisions/006-error-swallowing-in-tee.md` |
| ADR-007 | Dual API Surface | `decisions/007-dual-api-surface.md` |
| ADR-008 | ResultAsync Brand | `decisions/008-result-async-brand.md` |
| ADR-009 | Option Type | `decisions/009-option-type.md` |
| ADR-010 | Unsafe Subpath | `decisions/010-unsafe-subpath.md` |
| ADR-011 | Subpath Exports | `decisions/011-subpath-exports.md` |
| ADR-012 | Do Notation | `decisions/012-do-notation.md` |
| ADR-013 | Performance Strategy | `decisions/013-performance-strategy.md` |

### Audit Trail Requirements — `ATR-N`

| Component | Format | Meaning |
|-----------|--------|---------|
| `ATR` | Prefix | Audit trail requirement |
| `N` | Integer (1–3) | Sequential requirement number |

**Examples**: `ATR-1` (andTee/orTee prohibition in critical paths), `ATR-3` (audit logging guidance).

### Data Retention Requirements — `DRR-N`

| Component | Format | Meaning |
|-----------|--------|---------|
| `DRR` | Prefix | Data retention requirement |
| `N` | Integer (1–5) | Sequential requirement number |

**Examples**: `DRR-1` (toJSON storage procedure), `DRR-5` (periodic readability verification).

### Residual Risks — `RR-N`

| Component | Format | Meaning |
|-----------|--------|---------|
| `RR` | Prefix | Residual risk |
| `N` | Integer (1–7) | Sequential risk number |

**Examples**: `RR-1` (Shallow freeze), `RR-7` (Sole-maintainer bus factor).

### Document Identifiers — `SPEC-CORE-{CAT}-{NNN}`

| Component | Format | Meaning |
|-----------|--------|---------|
| `SPEC-CORE` | Prefix | Core library specification document |
| `CAT` | 3-letter category code | Document category (see table below) |
| `NNN` | Three-digit integer | Sequential within category |

| Category Code | Document Type | Examples |
|---------------|--------------|---------|
| `OVW` | Overview | `SPEC-CORE-OVW-001` |
| `BEH` | Behavior specification | `SPEC-CORE-BEH-001` through `SPEC-CORE-BEH-014` |
| `INV` | Invariants | `SPEC-CORE-INV-001` |
| `ADR` | Architecture Decision Record | `SPEC-CORE-ADR-001` through `SPEC-CORE-ADR-013` |
| `GLO` | Glossary | `SPEC-CORE-GLO-001` |
| `PRC` | Process document | `SPEC-CORE-PRC-001` through `SPEC-CORE-PRC-003` |
| `CMP` | Comparison | `SPEC-CORE-CMP-001` |
| `GXP` | GxP compliance | `SPEC-CORE-GXP-001` (= SPEC-GXP-001) |
| `TRC` | Traceability | `SPEC-CORE-TRC-001` |
| `RSK` | Risk assessment | `SPEC-CORE-RSK-001` |
| `TYP` | Type system | `SPEC-CORE-TYP-001` through `SPEC-CORE-TYP-003` |
| `TST` | Test strategy | `SPEC-CORE-TST-001` |
| `RMP` | Roadmap | `SPEC-CORE-RMP-001` |

## Uniqueness Guarantee

1. Every identifier is unique across the entire specification
2. Core library identifiers use no infix: `BEH-XX-NNN`, `INV-N`, `ADR-NNN`, `ATR-N`, `DRR-N`, `RR-N` — this prevents collisions with the React package identifiers which use an `R` infix (`BEH-RXX-NNN`, `INV-RN`, `ADR-RNNN`, etc.)
3. Identifiers are assigned once and never reused for a different purpose
4. Withdrawn requirements retain their identifier with a "Withdrawn" marker
5. The authoritative list of all assigned identifiers is maintained in the [traceability matrix](../traceability.md)

## Cross-References

When referencing identifiers across documents, use the full identifier with a markdown link to the source:

```markdown
See [BEH-03-001](../behaviors/03-transformation.md#beh-03-001-okmap-applies-f-to-the-value-and-returns-a-new-frozen-ok).
See [INV-1](../invariants.md#inv-1-frozen-result-instances).
See [ADR-001](../decisions/001-closures-over-classes.md).
See [ATR-1](../compliance/gxp.md#normative-requirements).
```
