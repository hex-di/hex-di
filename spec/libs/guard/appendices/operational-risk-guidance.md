# Appendix M: Operational Risk Guidance

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-M                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix P: Predicate Rules Mapping Template](./predicate-rules-mapping.md) | Next: [Appendix N: STRIDE Threat Model](./stride-threat-model.md)_

---

This appendix provides guidance for low-severity operational concerns that fall outside the scope of the library-level FMEA (section 68) but are relevant to production deployments.

> **Scope note:** The FMEA in section 68 covers library-level failure modes with Severity >= 4 (Major and Critical). The operational concerns below have Severity 1-3 and are included as deployment guidance rather than formal failure modes. Organizations MAY incorporate these into their site-level risk assessment.

### Low-Severity Operational Concerns

| ID    | Concern                                      | Severity       | Guidance                                                                                                                     |
| ----- | -------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| OP-01 | Audit trail query latency degradation        | 2 (Minor)      | Monitor query response times; implement indexing per §63a recommendations; consider partitioning for >10K entries per query. |
| OP-02 | Excessive WARNING logs from field truncation | 1 (Negligible) | Review field length limits in validation plan; consider increasing limits for fields that routinely exceed defaults.         |
| OP-03 | Clock drift approaching 1-second threshold   | 2 (Minor)      | NTP monitoring (section 62) detects drift; investigate NTP infrastructure before threshold breach.                           |
| OP-04 | Multi-part export complexity                 | 2 (Minor)      | Use recommended 500MB part boundaries (section 64e); verify chain continuity across parts during PQ.                         |
| OP-05 | Policy diff report storage growth            | 1 (Negligible) | Archive diff reports per §64a-1 retention requirements; consider compression for large diff reports.                         |

---

_Previous: [Appendix P: Predicate Rules Mapping Template](./predicate-rules-mapping.md) | Next: [Appendix N: STRIDE Threat Model](./stride-threat-model.md)_
