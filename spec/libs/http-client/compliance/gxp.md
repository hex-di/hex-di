# GxP Compliance -- @hex-di/http-client

Governance index for the `@hex-di/http-client` GxP compliance sub-document suite. This document maps the shared cross-cutting GxP methodology to the per-package sub-documents and provides the top-level compliance summary.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | GXP-HTTP-001 |
| Version | Derived from Git -- `git log -1 --format="%H %ai" -- spec/libs/http-client/compliance/gxp.md` |
| Author | Derived from Git -- `git log --format="%an" -1 -- spec/libs/http-client/compliance/gxp.md` |
| Approval Evidence | PR merge to `main` -- `git log --merges --first-parent main -- spec/libs/http-client/compliance/gxp.md` |
| Full Revision History | `git log --follow --format="%H %ai %an: %s" -- spec/libs/http-client/compliance/gxp.md` |

> **Auditor note**: This document is version-controlled via Git. The fields above provide pointers to the Git-managed metadata rather than duplicating it inline.

---

## Cross-Cutting GxP Framework

This document applies the shared GxP methodology maintained in `spec/cross-cutting/gxp/`. The table below maps each shared methodology document to the sub-document where it is applied.

| Cross-Cutting Document | Methodology Applied | Sub-Document |
|---|---|---|
| [01 — Regulatory Framework](../../../cross-cutting/gxp/01-regulatory-framework.md) | 21 CFR Part 11, EU GMP Annex 11, GAMP 5, ICH Q9, WHO TRS 1033, PIC/S PI 041 regulatory scope | [01-regulatory-context.md §79](./01-regulatory-context.md) |
| [02 — GAMP 5 Classification](../../../cross-cutting/gxp/02-gamp5-classification.md) | Category 5 classification criteria and combined FS/DS justification | [09-advanced-requirements.md §108](./09-advanced-requirements.md) |
| [03 — ALCOA+ Mapping Framework](../../../cross-cutting/gxp/03-alcoa-mapping.md) | Generic ALCOA+ principle definitions; HTTP-client-specific feature mapping | [01-regulatory-context.md §80](./01-regulatory-context.md) |
| [04 — Personnel Qualification](../../../cross-cutting/gxp/04-personnel-qualification.md) | Role qualification requirements applied to 5 roles in this library | [09-advanced-requirements.md §109](./09-advanced-requirements.md) |
| [05 — FMEA Methodology](../../../cross-cutting/gxp/05-fmea-methodology.md) | RPN scoring scale (S×O×D) and risk level thresholds used in [risk-assessment.md](../risk-assessment.md) | [07-validation-protocols.md §98](./07-validation-protocols.md) |
| [06 — Validation Protocol Template](../../../cross-cutting/gxp/06-validation-protocol-template.md) | IQ/OQ/PQ/DQ protocol structure | [07-validation-protocols.md §99](./07-validation-protocols.md) |
| [07 — Traceability Matrix Template](../../../cross-cutting/gxp/07-traceability-matrix-template.md) | RTM structure applied to 62 findings | [07-validation-protocols.md §100](./07-validation-protocols.md) |
| [08 — Change Control](../../../cross-cutting/gxp/08-change-control.md) | Change classification and approval workflow applied to HTTP client change categories | [09-advanced-requirements.md §116](./09-advanced-requirements.md) and [process/change-control.md](../process/change-control.md) |
| [09 — Data Retention](../../../cross-cutting/gxp/09-data-retention.md) | Retention period guidance applied to audit trail data | [08-compliance-extensions.md §104](./08-compliance-extensions.md) |
| [10 — Supplier Assessment](../../../cross-cutting/gxp/10-supplier-assessment.md) | Supplier assessment criteria applied to 8 transport adapter packages and 1 npm registry | [09-advanced-requirements.md §108a](./09-advanced-requirements.md) |
| [11 — Decommissioning](../../../cross-cutting/gxp/11-decommissioning.md) | Decommissioning procedure applied to HTTP client adapter lifecycle | [03-audit-schema.md §83b-1](./03-audit-schema.md) |
| [12 — Compliance Checklist Template](../../../cross-cutting/gxp/12-compliance-checklist-template.md) | Compliance checklist structure applied to HTTP client deployment | [07-validation-protocols.md §101](./07-validation-protocols.md) |
| [13 — Glossary](../../../cross-cutting/gxp/13-glossary.md) | Shared GxP terms extended with HTTP-client-specific terms | [01-regulatory-context.md](./01-regulatory-context.md) and [../glossary.md](../glossary.md) |

---

## Compliance Guide -- HTTP-Client-Specific

> For the generic regulatory framework, see [../../../cross-cutting/gxp/01-regulatory-framework.md](../../../cross-cutting/gxp/01-regulatory-framework.md) and [../../../cross-cutting/gxp/02-gamp5-classification.md](../../../cross-cutting/gxp/02-gamp5-classification.md). This section covers HTTP-client-specific compliance guidance.

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt). In pharmaceutical context, "MUST" carries the same weight as "SHALL" per ICH guidelines.

This chapter provides GxP compliance guidance specific to the HTTP transport layer implemented by `@hex-di/http-client`. It is intended for teams deploying this library in regulated environments (pharmaceutical, biotech, medical devices, clinical trials, laboratories) where 21 CFR Part 11, EU GMP Annex 11, and ALCOA+ data integrity principles apply.

> **Ecosystem Integration:** This library follows the HexDi port-based architecture. GxP capabilities (audit trails, authorization, electronic signatures, clock synchronization, crash recovery) are consumed through **ports defined by this spec**. Any HexDi ecosystem library — or custom adapter — can satisfy these ports. The `@hex-di/guard`, `@hex-di/clock`, and `@hex-di/audit` libraries are examples of adapter providers, but no specific library is a hard dependency. For full regulatory compliance, adapters MUST be registered for all REQUIRED ports (see [01-regulatory-context.md §79](./01-regulatory-context.md) Port-Based Requirements).

---

## Sub-Document Directory

The full GxP compliance content for `@hex-di/http-client` is organized into numbered sub-documents. See [README.md](./README.md) for the auditor navigation quick reference.

> **Structural Note**: The canonical hex-di spec pattern places GxP sub-documents in a separate numbered sub-directory (`NN-gxp-compliance/`) alongside `compliance/gxp.md`. This specification uses a flat layout instead — all 10 sub-documents, the governance index (`gxp.md`), and the auditor navigation index (`README.md`) live together in `compliance/`. The flat layout was chosen because the compliance content for `@hex-di/http-client` is tightly cross-referential: each sub-document links to the others, and keeping them in one directory eliminates extra path nesting while providing equivalent auditability. All canonical governance elements (cross-cutting reference table in `gxp.md`, auditor navigation Quick Reference Card in `README.md`, numbered sub-documents, ALCOA+ mapping, FMEA, IQ/OQ/PQ) are present regardless of the directory layout choice.

| # | Sub-Document | Sections | Primary Content |
|---|---|---|---|
| 01 | [01-regulatory-context.md](./01-regulatory-context.md) | §79–§80b | Regulatory scope, data flow diagrams, ALCOA+ mapping, consumer validation |
| 02 | [02-ecosystem-integration.md](./02-ecosystem-integration.md) | §81–§81b | Ecosystem port integration, GxP combinator requirement levels, combinator validation protocol |
| 03 | [03-audit-schema.md](./03-audit-schema.md) | §82–§83c | Cross-chain integrity, audit entry schema versioning, periodic review, decommissioning, incident classification |
| 04 | [04-transport-security.md](./04-transport-security.md) | §84–§89 | HTTPS/TLS enforcement, payload integrity, credential protection, config change control, payload schema validation |
| 05 | [05-session-authentication.md](./05-session-authentication.md) | §90–§90d | Session/token lifecycle, SSRF mitigation, certificate transparency, HSTS, CSRF, additional transport security |
| 06 | [06-audit-bridge.md](./06-audit-bridge.md) | §91–§97 | Audit bridge, operation audit entry, user attribution, ESIG bridge, RBAC, clock sync, cross-correlation |
| 07 | [07-validation-protocols.md](./07-validation-protocols.md) | §98–§103 | HTTP transport FMEA, IQ/OQ/PQ, RTM, compliance checklist, DoD guards, GxP combinator composition |
| 08 | [08-compliance-extensions.md](./08-compliance-extensions.md) | §104–§107 | Audit trail retention, backup/restore, migration, data-at-rest encryption, archive integrity, query port, cert revocation, ESIG verification |
| 09 | [09-advanced-requirements.md](./09-advanced-requirements.md) | §108–§118 | GAMP 5 classification, training, IAM integration, transport boundary, CORS, rate limiting, ESIG UI, catastrophic recovery, change control, SemVer mapping |
| 10 | [10-reference-materials.md](./10-reference-materials.md) | §118, DoD 26–27, Quick Ref | Port inventory, v5.0 audit findings, DoD 26–27, quick reference cards, RTM, validation plan (VP §1–§18), references |

---

## GAMP 5 Software Classification

`@hex-di/http-client` is classified as **GAMP 5 Category 5 — Bespoke Software**. See [09-advanced-requirements.md §108](./09-advanced-requirements.md) for the full classification justification.

**Combined Specification Approach**: Per GAMP 5 Appendix D scalability principle, URS, FS, and DS are combined into a single document set. See [../README.md §Combined Specification Approach](../README.md) for justification.

---

## ALCOA+ Principle Summary

Full ALCOA+ mapping in [01-regulatory-context.md §80](./01-regulatory-context.md). Summary:

| Principle | Primary Library Feature |
|---|---|
| **Attributable** | User attribution via `UserAttributionPort` (§93), ESIG bridge (§93a) |
| **Legible** | Frozen, immutable audit entries (`INV-HC-4`); structured JSON schema (§92) |
| **Contemporaneous** | Clock synchronization via `ClockPort` (§96); monotonic timestamp enforcement |
| **Original** | Audit entry schema versioning (§83); cross-chain hash integrity (§82) |
| **Accurate** | Never-throw contract (`INV-HC-7`); populate-freeze-return sequence (`INV-HC-5`) |
| **Complete** | Error discriminant exhaustiveness (`INV-HC-6`); body single-consumption (§92) |
| **Consistent** | Header case normalization (`INV-HC-10`); combinator order determinism (`INV-HC-9`) |
| **Enduring** | Audit trail retention strategy (§104); archival and backup (§104a–§104d) |
| **Available** | Audit trail query port (§105); compliance extensions (§104+) |

---

## FMEA Summary

Invariant-level FMEA (10 items) in [../risk-assessment.md](../risk-assessment.md). HTTP transport FMEA (43 failure modes, 1-5 scale) in [07-validation-protocols.md §98](./07-validation-protocols.md).

| Risk Level | Count | Invariants | Required Action |
|---|---|---|---|
| High | 1 | INV-HC-3 | Unit + type + GxP integrity test + mutation test |
| Medium | 4 | INV-HC-1, INV-HC-7, INV-HC-8, INV-HC-10 | Unit + type tests |
| Low | 3 | INV-HC-2, INV-HC-4, INV-HC-9 | Unit test with prose justification |
| Negligible | 2 | INV-HC-5, INV-HC-6 | Compile-time enforcement only |
| **Total** | **10** | | |

---

## Qualification Protocol Coverage

| Protocol | Location | Tests |
|---|---|---|
| IQ (Installation Qualification) | [07-validation-protocols.md §99 IQ](./07-validation-protocols.md) | Package install, dependency resolution, subpath exports |
| OQ (Operational Qualification) | [07-validation-protocols.md §99 OQ](./07-validation-protocols.md) | All DoD items pass, test pyramid green |
| PQ (Performance Qualification) | [07-validation-protocols.md §99 PQ](./07-validation-protocols.md) | Integration tests, benchmark baselines, stress tests |

---

## Traceability

Requirements traceability: [../traceability.md](../traceability.md). HTTP-specific RTM: [07-validation-protocols.md §100](./07-validation-protocols.md).
