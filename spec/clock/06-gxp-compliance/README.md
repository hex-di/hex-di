# 06 - GxP Compliance

This section defines the GxP regulatory requirements that `@hex-di/clock` addresses and the boundaries of its responsibility.

- **[GxP Quick Reference Card](./quick-reference.md) — Start here: auditor navigation guide, regulatory coverage summary, qualification checklist**
- [Clock Source Requirements](./clock-source-requirements.md) — Scope, risk classification, NTP boundary, diagnostics, calibration (§ 6.1)
- [Qualification Protocols](./qualification-protocols.md) — IQ/OQ/PQ protocols and deployment qualification checklist (§ 6.2)
- [Verification and Change Control](./verification-and-change-control.md) — Periodic adapter integrity verification, change control requirements, emergency change control procedure, and CAPA closeout criteria (§ 6.3)
- [Resolution and Precision](./resolution-and-precision.md) — GxP resolution requirements and precision handling (§ 6.4)
- [ALCOA+ Mapping](./alcoa-mapping.md) — ALCOA+ principle mapping, attribution context, electronic signature binding, timezone requirement (§ 6.5)
- [Audit Trail Integration](./audit-trail-integration.md) — TemporalContext (utility, not port), failure handling, emergency overflow context, consumer usage, deployment mode guarantees, serialization schemas (§ 6.6)
- [Recovery Procedures](./recovery-procedures.md) — FM-1 and FM-2 recovery procedures; FM-3 through FM-6 cross-referenced to guard spec
- [Requirements Traceability Matrix](./requirements-traceability-matrix.md) — RTM mapping regulatory clauses to spec sections, implementation artifacts, and test cases; Not Applicable clause register; RTM completeness validation meta-requirements
- [Supplier Assessment](./supplier-assessment.md) — Supplier quality documentation for EU GMP Annex 11 Section 5 assessments, quality management representative
- [Personnel Qualification and Access Control](./personnel-and-access-control.md) — Role definitions, training requirements, re-training frequency schedule, operational access controls (EU GMP Annex 11 Section 3, 21 CFR 11.10(d))
- [FMEA Risk Analysis](./fmea-risk-analysis.md) — Failure Mode and Effects Analysis with Risk Priority Numbers (GAMP 5, ICH Q9)
- [Glossary](./glossary.md) — Technical and regulatory term definitions for non-technical reviewers

**Guard cross-references:** NTP adapter interface contracts (NC-1 through NC-7), FM-3 through FM-6 recovery procedures, and the consolidated CSV plan checklist are maintained in `spec/guard/17-gxp-compliance/03-clock-synchronization.md`.
