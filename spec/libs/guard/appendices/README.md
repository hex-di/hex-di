# Appendices

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-IDX                             |
> | Revision         | 3.1                                      |
> | Effective Date   | 2026-02-20                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendices & Reference               |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 3.1 (2026-02-20): Assigned distinct Document ID GUARD-15-IDX (was GUARD-15) to eliminate collision with 15-appendices.md which retains GUARD-15 as the numbered chapter slot (CCR-GUARD-042) |
> |                  | 3.0 (2026-02-17): Restructured appendices into appendices/ directory with shortened filenames; moved glossary to top-level glossary.md, competitive comparison to comparisons/competitors.md, architectural decisions to decisions/ (CCR-GUARD-018) |
> |                  | 2.2 (2026-02-15): Split 21 appendices (A-V, excluding L) into individual files under 15-appendices/ directory; this file is now the index/navigation hub (CCR-GUARD-017) |
> |                  | 2.1 (2026-02-15): Updated Inspector Walkthrough IQ count to 12, OQ range to OQ-52, STRIDE threat count to 39 (CCR-GUARD-016) |
> |                  | 2.0 (2026-02-14): Replaced Appendix B competitive comparison with comprehensive 11-library rating matrix and feature comparison based on competitive analysis against CASL, Casbin, OPA/Rego, OpenFGA, Permit.io, Oso, Spring Security, Pundit, Django Guardian (CCR-GUARD-010) |
> |                  | 1.0 (2026-02-13): Initial controlled release |

---

## Appendix Index

| Letter | Title | File |
|--------|-------|------|
| **A** | [Architectural Decisions](../decisions/) | Expanded into 56 individual files in `decisions/` |
| **B** | [Competitive Comparison](../comparisons/competitors.md) | Moved to `comparisons/competitors.md` |
| **C** | [Glossary](../glossary.md) | Moved to top-level `glossary.md` |
| **D** | [Type Relationship Diagram](./type-relationship-diagram.md) | ASCII diagram of all major type relationships |
| **E** | [Comparison with Existing hex-di Patterns](./hex-di-pattern-comparison.md) | Guard concepts mapped to existing hex-di patterns |
| **F** | [Error Code Reference](./error-code-reference.md) | All 30 error codes (ACL001-ACL030) with severity and resolution |
| **G** | [Open-Source Supplier Qualification](./supplier-qualification.md) | Risk-based supplier qualification for open-source components |
| **H** | [Reference Adapter Integration Patterns](./adapter-integration-patterns.md) | PostgreSQL, QLDB, EventStoreDB, and HSM adapter patterns |
| **I** | [Regulatory Inspector Walkthrough Script](./inspector-walkthrough.md) | 60-minute regulatory demonstration procedure |
| **J** | [Audit Entry Schema Versioning Policy](./audit-schema-versioning.md) | Schema versioning rules and migration guidance |
| **K** | [Deviation Report Template](./deviation-report-template.md) | Standardized GxP deviation report with CAPA workflow |
| **M** | [Operational Risk Guidance](./operational-risk-guidance.md) | Low-severity operational concerns for deployment guidance |
| **N** | [STRIDE Threat Model](./stride-threat-model.md) | 39 threats across trust boundaries, mapped to FMEA |
| **O** | [Condensed Clock Specification Summary](./clock-spec-summary.md) | Standalone clock infrastructure requirements summary |
| **P** | [Predicate Rules Mapping Template](./predicate-rules-mapping.md) | Template for mapping predicate rules to regulated activities |
| **Q** | [Data Dictionary](./data-dictionary.md) | Field-level documentation for all audit and signature types |
| **R** | [Operational Log Event Schema](./operational-log-schema.md) | Structured schemas for 13 operational event types with SIEM guidance |
| **S** | [Consolidated Error Recovery Runbook](./error-recovery-runbook.md) | Step-by-step recovery procedures for all error codes |
| **T** | [Implementation Verification Requirements](./implementation-verification.md) | Conformance checkpoints, drift detection, revision management |
| **U** | [Cross-Enhancement Composition Examples](./composition-examples.md) | Async + field union + ReBAC composition examples |
| **V** | [Consumer Integration Validation Checklist](./consumer-validation-checklist.md) | 32-item pre-deployment GxP checklist across 7 phases |

> **Note on appendix letter ordering:** Letter L was not allocated (the appendix sequence skips from K to M).

---

_Previous: [API Reference](../14-api-reference.md) | Next: [Definition of Done](../process/definitions-of-done.md)_
