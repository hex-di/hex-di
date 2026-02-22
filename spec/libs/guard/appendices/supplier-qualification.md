# Appendix G: Open-Source Supplier Qualification (GAMP 5)

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-G                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix F: Error Code Reference](./error-code-reference.md) | Next: [Appendix H: Reference Adapter Integration Patterns](./adapter-integration-patterns.md)_

---

Per GAMP 5 Section 10, organizations must assess suppliers of GxP-critical software. For open-source components like `@hex-di/guard` and its `@hex-di/*` dependencies, traditional supplier audit approaches (on-site audits, supplier questionnaires) are impractical. This appendix provides risk-based qualification guidance aligned with GAMP 5 Category 5 (custom software) and EU GMP Annex 11 Section 3 (suppliers and service providers).

```
REQUIREMENT: Organizations deploying @hex-di/guard in GxP environments MUST perform
             supplier qualification for the guard library and its @hex-di/* dependencies
             using the risk-based approach described below. The qualification MUST be
             documented and retained as part of the validation documentation.

REQUIREMENT: Initial qualification MUST include:
             (1) Source code availability: Confirm the library source code is publicly
                 accessible and the license permits use in GxP-regulated environments.
             (2) Specification review: Confirm the specification documents (spec/guard/*.md)
                 exist, are version-controlled, and define behavioral contracts for
                 GxP-relevant functionality (audit trail, electronic signatures, hash
                 chain integrity).
             (3) Test suite assessment: Confirm the library ships with a comprehensive
                 test suite covering the GxP-relevant contracts. Record the test count,
                 coverage metrics, and mutation testing results.
             (4) Integrity verification: Perform IQ-8 (package integrity) and IQ-9
                 (vulnerability scan) per the IQ checklist (section 67a).
             (5) SBOM generation: Generate a Software Bill of Materials for the full
                 dependency tree per the IQ recommendation.

REQUIREMENT: Re-qualification MUST be performed when:
             (1) The @hex-di/guard version is upgraded (major, minor, or patch).
             (2) A critical or high vulnerability is disclosed in any @hex-di/* dependency.
             (3) The library's license terms change.
             (4) A transitive dependency receives a critical or high severity security
                 patch. Even if @hex-di/guard itself is unchanged, a security-patched
                 transitive dependency alters the supply chain integrity baseline and
                 MUST trigger re-qualification of the affected IQ checks (IQ-8, IQ-9).
             Re-qualification follows the same steps as initial qualification, with
             focus on the delta from the previously qualified version.

RECOMMENDED: Organizations SHOULD subscribe to the @hex-di/guard release notifications
             and vulnerability advisories (e.g., GitHub security advisories, npm audit
             notifications) to enable timely re-qualification.
```

> **[ADR #34](../decisions/034-open-source-supplier-qualification.md) Rationale:** Traditional supplier qualification assumes a commercial vendor relationship with audit rights, quality agreements, and dedicated support. Open-source software operates under a different model: the source code IS the quality evidence, the test suite IS the functional verification, and the specification IS the design documentation. By treating the specification and test suite as the primary qualification evidence, organizations can satisfy GAMP 5 supplier qualification requirements without requiring a non-existent vendor relationship. The IQ/OQ/PQ framework (section 67) provides the formal verification structure that maps to traditional qualification activities.

---

_Previous: [Appendix F: Error Code Reference](./error-code-reference.md) | Next: [Appendix H: Reference Adapter Integration Patterns](./adapter-integration-patterns.md)_
