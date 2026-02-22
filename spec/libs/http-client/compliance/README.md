# @hex-di/http-client — GxP Compliance Sub-Document Index

> **Auditor navigation**: Start here. This index maps regulatory topics to the sub-document that addresses them.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | GXP-HTTP-INDEX-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/compliance/README.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- spec/libs/http-client/compliance/README.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## Sub-Document Suite

| # | File | Sections | Primary Content | Regulatory Basis |
|---|------|----------|-----------------|-----------------|
| Governance Index | [gxp.md](./gxp.md) | Cross-cutting framework | GAMP 5 classification, ALCOA+ summary, cross-cutting links | All regulations |
| 01 | [01-regulatory-context.md](./01-regulatory-context.md) | §79–§80b | Regulatory scope, data flow diagrams, ALCOA+ mapping, consumer validation responsibilities | 21 CFR Part 11, EU GMP Annex 11, ALCOA+ |
| 02 | [02-ecosystem-integration.md](./02-ecosystem-integration.md) | §81–§81b | Ecosystem port integration, GxP combinator requirement levels, combinator validation protocol | GAMP 5 §5, ICH Q9 |
| 03 | [03-audit-schema.md](./03-audit-schema.md) | §82–§83c | Cross-chain integrity verification, audit entry schema versioning, periodic review, decommissioning, incident classification | 21 CFR Part 11.10(e), EU GMP Annex 11 §12 |
| 04 | [04-transport-security.md](./04-transport-security.md) | §84–§89 | HTTPS/TLS enforcement, payload integrity verification, credential protection, HTTP configuration change control, GxP payload schema validation | 21 CFR Part 11.10(d), NIST SP 800-52 |
| 05 | [05-session-authentication.md](./05-session-authentication.md) | §90–§90d | Session and token lifecycle, SSRF mitigation, certificate transparency, HSTS enforcement, CSRF protection | 21 CFR Part 11.10(d), OWASP, NIST |
| 06 | [06-audit-bridge.md](./06-audit-bridge.md) | §91–§97 | HTTP audit trail bridge, operation audit entry, user attribution, electronic signature bridge, RBAC, clock synchronization, cross-correlation | 21 CFR Part 11.10(e), EU GMP Annex 11 §8–§12 |
| 07 | [07-validation-protocols.md](./07-validation-protocols.md) | §98–§103 | HTTP transport FMEA, IQ/OQ/PQ qualification protocol, regulatory traceability matrix, compliance verification checklist, DoD for HTTP transport guards | GAMP 5 Appendix D, ICH Q9 |
| 08 | [08-compliance-extensions.md](./08-compliance-extensions.md) | §104–§107 | Audit trail retention and archival, backup/restore, cross-system migration, data-at-rest encryption, archive integrity risk, audit trail query port, certificate revocation, ESIG verification | 21 CFR Part 11.10(c), EU GMP Annex 11 §17 |
| 09 | [09-advanced-requirements.md](./09-advanced-requirements.md) | §108–§118 | GAMP 5 software classification, training requirements, IAM integration, transport/business validation boundary, CORS policy, rate limiting, ESIG UI workflow, catastrophic failure recovery, spec change control, SemVer-to-revalidation mapping | GAMP 5, 21 CFR Part 11.50, EU GMP Annex 11 §6 |
| 10 | [10-reference-materials.md](./10-reference-materials.md) | §118, DoD 26–27, Quick Reference | Port dependency inventory, v5.0 audit findings remediations, GxP hardening DoD, quick reference cards (FDA, EU GMP, ALCOA+, GAMP 5), combinator-to-regulation lookup, validation plan (VP §1–§18), references | All regulations |

---

## Quick Reference Card — Auditor Navigation

### "Where is the ALCOA+ mapping?"
→ [01-regulatory-context.md §80](./01-regulatory-context.md) — full ALCOA+ principle-to-feature mapping table

### "Where is the FMEA?"
→ [07-validation-protocols.md §98](./07-validation-protocols.md) — HTTP transport FMEA (RPN table)
→ Also: [../risk-assessment.md](../risk-assessment.md) — invariant-level FMEA

### "Where is the IQ/OQ/PQ protocol?"
→ [07-validation-protocols.md §99](./07-validation-protocols.md) — full IQ/OQ/PQ qualification protocol

### "Where is the audit trail specification?"
→ [06-audit-bridge.md §91–§92](./06-audit-bridge.md) — audit bridge overview and audit entry schema

### "Where are electronic signature requirements?"
→ [06-audit-bridge.md §93a–§93b](./06-audit-bridge.md) — ESIG bridge and display format
→ [09-advanced-requirements.md §114](./09-advanced-requirements.md) — ESIG capture UI workflow

### "Where is HTTPS/TLS enforcement?"
→ [04-transport-security.md §84–§85](./04-transport-security.md) — HTTP transport security overview and HTTPS enforcement

### "Where is the Requirements Traceability Matrix (RTM)?"
→ [07-validation-protocols.md §100](./07-validation-protocols.md) — primary RTM
→ [10-reference-materials.md](./10-reference-materials.md) — extended RTM (v5.0 audit findings)

### "Where is the change control procedure?"
→ [09-advanced-requirements.md §116](./09-advanced-requirements.md) — specification change control process
→ [../process/change-control.md](../process/change-control.md) — implementation-level change control

### "Where is the GAMP 5 software classification?"
→ [09-advanced-requirements.md §108](./09-advanced-requirements.md) — GAMP 5 Category 5 justification

### "Where are the v5.0 audit findings and remediations?"
→ [10-reference-materials.md](./10-reference-materials.md) — DoD 26–27, v5.0 audit findings RTM

### "Where is the validation plan?"
→ [10-reference-materials.md VP §1–§18](./10-reference-materials.md) — full validation plan (purpose, strategy, system description, roles, risk assessment, qualification protocol, test environment, traceability, deviation handling, validation report, periodic review, configuration profile, IAM integration, data sovereignty, consumer-deferred controls, PQ scenarios, deployment readiness, test execution evidence)

---

## Governance Index

The root [gxp.md](./gxp.md) file serves as the governance index for this sub-document suite. It contains:
- Cross-cutting GxP framework reference table (shared methodology links)
- HTTP-client-specific compliance guidance overview
- Sub-document directory (this table)

Sub-documents are self-contained: each opens with a back-reference to this README and the governance index.
