# @hex-di/http-client-react — Requirement ID Scheme

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HCR-PRC-003 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/react/process/requirement-id-scheme.md` |
| Status | Effective |

---

## Overview

`@hex-di/http-client-react` uses section-numbered requirement IDs (`§N`) consistent with the Pattern B convention used by the parent `@hex-di/http-client` package.

---

## Requirement ID Table

| ID Type | Format | Example | Source Document |
|---------|--------|---------|----------------|
| Spec section requirement | `§N` or `§N.M` | `§9.1`, `§15.4` | Chapter files `02-provider.md`, `03-hooks.md`, `04-testing.md` |
| Invariant | `INV-HCR-N` | `INV-HCR-1` | `invariants.md` |
| Architecture decision | `ADR-HCR-NNN` | `ADR-HCR-001` | `decisions/NNN-*.md` |
| FMEA failure mode | `FM-HCR-N` | `FM-HCR-4` | `risk-assessment.md` |
| Residual risk | `RR-HCR-N` | `RR-HCR-1` | `risk-assessment.md` |
| Document ID | `SPEC-HCR-CAT-NNN` | `SPEC-HCR-TRC-001` | This document |

---

## Section Numbering

Spec requirements are identified by their section number within the chapter where they appear:

| Section Range | Chapter | Capability |
|--------------|---------|------------|
| §1–§8 | `01-overview.md` | Mission, scope, API surface |
| §9–§12 | `02-provider.md` | `HttpClientProvider` |
| §13 | `03-hooks.md` | `useHttpClient` |
| §14–§15, §18 | `03-hooks.md` | `useHttpRequest` |
| §16–§17, §18 | `03-hooks.md` | `useHttpMutation` |
| §18 | `03-hooks.md` | Abort signal integration (shared by §15 and §17) |
| §19 | `03-hooks.md` | (reserved) |
| §20–§22 | `04-testing.md` | Testing utilities |

---

## Document ID Category Codes

| Code | Category |
|------|----------|
| `OVW` | Overview |
| `INV` | Invariants |
| `TRC` | Traceability |
| `RSK` | Risk Assessment |
| `GLO` | Glossary |
| `RMP` | Roadmap |
| `ADR` | Architecture Decision Record |
| `PRC` | Process document |

---

## `[OPERATIONAL]` Requirements

Requirements that cannot be verified by automated tests are tagged `[OPERATIONAL]`. These are procedural or organisational obligations, not code-level contracts.

Current `[OPERATIONAL]` requirements in `@hex-di/http-client-react`:

| ID | Text | Location |
|----|------|----------|
| §1.OP-1 | The `specRevision` constant in the installed package MUST match the current specification revision before the package is used in a GxP deployment. | `01-overview.md §1` |

`[OPERATIONAL]` requirements are excluded from automated test coverage calculations. They are listed in the DoD as manual verification steps.

---

## Cross-Package ID Coordination

To prevent ID collisions with the parent `@hex-di/http-client` spec, all React-layer identifiers use the `HCR` infix:

| Package | Infix | Example IDs |
|---------|-------|-------------|
| `@hex-di/http-client` | `HC` | `INV-HC-N`, `ADR-HC-NNN`, `FM-N` |
| `@hex-di/http-client-react` | `HCR` | `INV-HCR-N`, `ADR-HCR-NNN`, `FM-HCR-N` |
