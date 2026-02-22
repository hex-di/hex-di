# @hex-di/http-client — Requirement ID Scheme

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-PRC-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/process/requirement-id-scheme.md` |
| Status | Effective |

---

## Overview

The `@hex-di/http-client` specification uses **five parallel requirement ID schemes** targeting different specification levels and audiences. This document is the authoritative reference for all ID formats.

Package infix: **`HC`** (prevents cross-package ID collisions per the monorepo convention).

---

## ID Scheme Table

| Scheme | Format | Range | Source Document | Audience | Purpose |
|--------|--------|-------|-----------------|----------|---------|
| **URS-HTTP** | `URS-HTTP-NNN` | 001–999 | `00-urs.md` | QA, Regulatory | User requirements with risk levels and priorities |
| **Section** | `§N` | §1–§109 | All chapters | All contributors | Stable cross-reference to numbered spec sections |
| **INV-HC** | `INV-HC-N` | 1–99 | `invariants.md` | Developers, QA | Runtime invariant definitions and FMEA anchors |
| **ADR-HC** | `ADR-HC-NNN` | 001–999 | `decisions/NNN-*.md` | Architects, Developers | Architecture decision records |
| **Test IDs** | `<PREFIX>-NNN` | 001–999 per prefix | `17-definition-of-done.md` | Developers, QA | Test identification in DoD and OQ protocols |
| **OQ-HT** | `OQ-HT-NN` | 01–99 | `17-definition-of-done.md` | QA, Regulatory | Operational qualification check IDs |
| **DP** | `DP-NN` | 01–99 | `README.md` §Deployment Prerequisites | DevOps, QA | Deployment prerequisite IDs |

---

## Test ID Prefixes

Test IDs follow the format `<PREFIX>-NNN` where `PREFIX` identifies the feature domain:

| Prefix | Domain | Spec Chapter | Example |
|--------|--------|--------------|---------|
| `CT` | Core Types (Headers, UrlParams, HttpBody) | `02-core-types.md` | `CT-001` |
| `RQ` | HttpRequest constructors and combinators | `03-http-request.md` | `RQ-001` |
| `RS` | HttpResponse body accessors and utilities | `04-http-response.md` | `RS-001` |
| `ER` | Error types, constructors, guards | `05-error-types.md` | `ER-001` |
| `EF` | Error freeze and populate-freeze-return ordering | `05-error-types.md` §23 | `EF-001` |
| `PT` | HttpClient interface and port | `06-http-client-port.md` | `PT-001` |
| `CC` | Client combinators | `07-client-combinators.md` | `CC-001` |
| `FA` | Fetch transport adapter | `08-transport-adapters.md` | `FA-001` |
| `AX` | Axios transport adapter | `08-transport-adapters.md` | `AX-001` |
| `GT` | Got transport adapter | `08-transport-adapters.md` | `GT-001` |
| `KY` | Ky transport adapter | `08-transport-adapters.md` | `KY-001` |
| `OF` | Ofetch transport adapter | `08-transport-adapters.md` | `OF-001` |
| `IN` | HttpClientInspector and registry API | `11-introspection.md` | `IN-001` |
| `AI` | Audit chain integrity (hash chain, verification) | `11-introspection.md` | `AI-001` |
| `AS` | Audit sink integration | `11-introspection.md` | `AS-001` |
| `MT` | Monotonic timing and audit warnings | `11-introspection.md` | `MT-001` |
| `LI` | Library inspector bridge | `11-introspection.md` | `LI-001` |
| `CS` | Combinator state (circuit breakers, rate limiters, caches) | `11-introspection.md` | `CS-001` |
| `HL` | Health abstraction | `11-introspection.md` | `HL-001` |
| `CH` | Combinator chain introspection | `11-introspection.md` | `CH-001` |
| `MR` | MCP resource mapping | `11-introspection.md` | `MR-001` |
| `TU` | Testing utilities and mock client | `12-testing.md` | `TU-001` |
| `A2` | A2A skills | `13-advanced.md` | `A2-001` |
| `SEC` | HTTP transport security combinators | `16-http-transport-security.md` | `SEC-001` |
| `GX` | GxP compliance behaviors | `compliance/gxp.md` | `GX-001` |
| `TL` | Type-level tests (compile-time type contracts) | All chapters (type contracts) | `TL-001` |
| `IT` | Integration tests (cross-module, cross-library) | `10-integration.md`, `09-scoped-clients.md`, others | `IT-001` |
| `E2E` | End-to-end scenario tests | All chapters | `E2E-001` |

---

## Section Numbering (`§N`)

Section numbers are stable, permanent cross-references. They are assigned at document creation and never reassigned:

- `§1–§8`: Core types (`02-core-types.md`)
- `§9–§14`: HttpRequest (`03-http-request.md`)
- `§15–§18`: HttpResponse (`04-http-response.md`)
- `§19–§24`: Error types (`05-error-types.md`)
- `§25–§28`: HttpClient port (`06-http-client-port.md`)
- `§29–§38`: Client combinators (`07-client-combinators.md`)
- `§39–§44`: Transport adapters (`08-transport-adapters.md`)
- `§45–§48`: Scoped clients (`09-scoped-clients.md`)
- `§49–§53`: DI integration (`10-integration.md`)
- `§54–§57`: Introspection (`11-introspection.md`)
- `§58–§63`: Testing utilities (`12-testing.md`)
- `§64–§69`: Advanced patterns (`13-advanced.md`)
- `§70–§78`: API reference (`14-api-reference.md`)
- `§79–§109`: GxP compliance (`compliance/gxp.md`)

---

## `[OPERATIONAL]` Tag

Requirements that cannot be verified by automated tests are tagged `[OPERATIONAL]`. These represent procedural, organizational, or infrastructure requirements that are validated through human review, deployment checklists, or supplier assessments rather than automated test execution.

Format: `REQUIREMENT (ID) [OPERATIONAL]: <text>`

`[OPERATIONAL]` requirements are **excluded** from automated test coverage calculations. The `17-definition-of-done.md` DoD must not include them as failing items. They are tracked in `README.md` §Deployment Prerequisites and the `compliance/gxp.md` deployment prerequisites (`DP-NN`).

### Current `[OPERATIONAL]` Requirements

`DP-NN` IDs identify document-approval prerequisites that must be satisfied before this specification governs GxP qualification activities. They are procedural gates, not automated tests.

| ID | Location | Description |
|----|----------|-------------|
| `DP-01` | `README.md` §Deployment Prerequisites | Populate all three approval roles (Author, Technical Reviewer, QA Approver) in the Document Approval table with named, uniquely identifiable individuals per 21 CFR 11.100 |
| `DP-02` | `README.md` §Deployment Prerequisites | Verify separation of duties: Author ≠ Technical Reviewer; QA Approver is independent of the development team per 21 CFR 11.10(g) |
| `DP-03` | `README.md` §Deployment Prerequisites | Record approval dates in ISO 8601 format in the Document Approval table per GAMP 5 §D.3 |
| `DP-04` | `README.md` §Deployment Prerequisites | Populate the QA Approval column in the Revision History table for the revision being deployed per EU GMP Annex 11 §4 |
| `DP-05` | `README.md` §Deployment Prerequisites | Complete and approve the Validation Plan (`§25-validation-plan.md`); VP must transition from "Draft" to "Approved" before IQ begins per GAMP 5 §D.8 |
| `DP-06` | `README.md` §Deployment Prerequisites | Instantiate Consumer Validation templates (CV-01 through CV-11) in the site-specific Validation Plan with organization-specific infrastructure details per EU GMP Annex 11 §4 |

> **Note on operational configuration requirements**: Infrastructure configuration requirements for GxP deployments (audit trail sink, HTTPS enforcement, correlation IDs, personnel training, transport adapter QA review) are documented as `URS-HTTP-NNN` requirements in `00-urs.md` and as Consumer Validation items (`CV-01` through `CV-11`) in the compliance documents. They are not tracked as `DP-NN` IDs.

---

## ID Assignment Rules

1. **Permanent IDs**: Once assigned, IDs are never reused. Withdrawn requirements keep their ID with a "Withdrawn" marker.
2. **Sequential within scheme**: Within each scheme, IDs are assigned in ascending order. Gaps are acceptable (from withdrawn requirements) but new IDs must not fill gaps.
3. **Cross-package uniqueness**: The `HC` infix ensures IDs from this package cannot collide with IDs from other packages in the monorepo.
4. **New IDs must be documented here**: Any new ID prefix or scheme variant must be added to this document before use.

---

## Traceability Chain

Every requirement ID participates in the chain:

```
URS-HTTP-NNN (user requirement)
    ↓
§N (spec section — functional spec)
    ↓
INV-HC-N (invariant — design spec)
    ↓
<PREFIX>-NNN (test ID — DoD/OQ)
    ↓
OQ-HT-NN (operational qualification check)
```

The traceability matrix in [traceability.md](../traceability.md) documents all links in this chain.
