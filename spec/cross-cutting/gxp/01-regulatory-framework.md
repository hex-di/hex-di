# 01 - Regulatory Framework

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-01 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/01-regulatory-framework.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## Applicable Regulations

The following regulations and guidelines govern GxP-regulated deployments of `@hex-di` libraries. Each per-package compliance specification maps its features to the applicable sections of these regulations.

### Primary Regulations

| Regulation | Scope | Key Requirements |
|-----------|-------|------------------|
| **FDA 21 CFR Part 11** | Electronic records and electronic signatures in US FDA-regulated industries | Audit trails (§11.10(e)), validation (§11.10(a)), access controls (§11.10(d)), record retention (§11.10(c)), operational checks (§11.10(f)), accountability (§11.10(j)), training (§11.10(i)) |
| **EU GMP Annex 11** | Computerised systems in EU pharmaceutical manufacturing | Risk management (§1), personnel (§2), suppliers (§5), validation (§4), data integrity (§5-7), audit trails (§9), change management (§10), periodic evaluation (§11), security (§12), incident management (§13), archiving (§17) |
| **GAMP 5** | Risk-based approach to compliant GxP computerised systems | Software categorization (Categories 1-5), V-model lifecycle, specification levels (URS→FS→DS→CS), risk-based testing (IQ/OQ/PQ) |

### Supporting Guidelines

| Guideline | Scope | Relevance |
|-----------|-------|-----------|
| **ICH Q9** | Quality Risk Management | FMEA methodology, risk acceptance criteria, risk-benefit analysis |
| **ICH Q7** | GMP for Active Pharmaceutical Ingredients | Equipment calibration (§6.5), applicable to timing equipment |
| **PIC/S PI 011-3** | GMP Guide for pharmaceutical inspection | Critical controls (§6.3), optional controls auditability (§6.5), periodic evaluation (§9.8) |
| **WHO TRS 996 Annex 5** | WHO guidance on good practices for computerized systems | Harmonized with EU GMP Annex 11 and PIC/S |
| **MHRA Data Integrity Guidance (2018)** | UK MHRA guidance on data integrity expectations | ALCOA+ principles, data lifecycle management, periodic verification of data accessibility (§6.12) |
| **FDA Guidance for Industry: Part 11 Scope and Application (2003)** | FDA risk-based approach to Part 11 compliance | Narrow vs. broad interpretation of Part 11; focus on predicate rule requirements |

### Electronic Signature Regulations

| Regulation | Scope |
|-----------|-------|
| **21 CFR 11.50** | Signature manifestation: printed name, date/time, meaning |
| **21 CFR 11.70** | Signature/record linking |
| **21 CFR 11.100** | General e-signature requirements: uniqueness, identity verification |
| **21 CFR 11.200** | Electronic signature components and controls |
| **21 CFR 11.300** | Controls for identification codes and passwords |

---

## Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in all GxP compliance documents are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

| Keyword | Meaning | Pharmaceutical Alignment |
|---------|---------|--------------------------|
| **MUST** / **REQUIRED** / **SHALL** | Absolute requirement. Non-compliance is a regulatory finding. | Equivalent to "critical" controls in GAMP 5 Appendix D4 and PIC/S PI 011-3 §6.3 |
| **MUST NOT** / **SHALL NOT** | Absolute prohibition. | Same severity as MUST — violation constitutes non-conformance |
| **SHOULD** / **RECOMMENDED** | Valid reasons may exist to deviate, but the full implications must be understood and documented before doing so. | Equivalent to "major" controls; deviation requires documented risk assessment per ICH Q9 |
| **MAY** / **OPTIONAL** | Truly optional. Implementation is at the organization's discretion. | Equivalent to "informational" guidance; no regulatory expectation |

> **Applicability:** REQUIREMENT and RECOMMENDED blocks throughout the GxP compliance documents use the above terms with their RFC 2119 meanings. Where a `REQUIREMENT` block specifies a MUST, non-compliance in a GxP deployment is a deviation that must be documented per the site's quality management system. Where a `RECOMMENDED` block specifies a SHOULD, organizations may choose an alternative approach provided the rationale is documented in the validation plan.

> **Note on MAY/OPTIONAL:** If an OPTIONAL control described in any GxP compliance document is implemented, its implementation becomes auditable under PIC/S PI 011-3 Section 6.5. The "optional" classification applies only to the _decision_ to implement, not to the quality of implementation. Once implemented, the control must meet the same quality and documentation standards as any other system feature.

---

## System Classification

### Open vs. Closed Systems (21 CFR 11.3)

```
REQUIREMENT: Each GxP deployment MUST classify the system as "closed" or "open" per
             21 CFR 11.3. A system is "open" if any of the following conditions apply:
             (a) Audit data traverses a public network
             (b) Electronic signatures cross organizational boundaries
             (c) API endpoints (MCP, A2A, REST, etc.) are exposed beyond the site LAN
             (d) Data is stored on third-party cloud infrastructure without contractual
                 controls equivalent to physical access controls

             The classification MUST be documented with rationale and reviewed annually
             or upon infrastructure changes.
```

### Closed System Requirements (21 CFR 11.10)

Closed systems MUST implement controls per 21 CFR 11.10, including: validation (§11.10(a)), accurate copies (§11.10(b)), record retention (§11.10(c)), access controls (§11.10(d)), audit trails (§11.10(e)), operational checks (§11.10(f)), authority checks (§11.10(g)), device checks (§11.10(h)), training (§11.10(i)), and accountability (§11.10(j)).

### Open System Requirements (21 CFR 11.10(k))

Open systems MUST implement all closed system controls PLUS additional controls per 21 CFR 11.10(k): encryption of records during transmission, use of digital signatures to ensure integrity, and additional authentication measures for system access.

---

## Document Approval Mechanism

```
REQUIREMENT: All specification documents in the @hex-di suite MUST be approved via
             GPG-signed git tags before becoming normative for GxP deployment. The DMS
             Reference field in each document's Document Control block identifies the
             signed tag. A document is considered "Approved" when ALL of the following
             conditions are met:

             (a) The document's Status field is "Effective."
             (b) The document's DMS Reference references a GPG-signed tag that has been
                 pushed to the authoritative repository.
             (c) The GPG key used to sign the tag is traceable to a named individual
                 listed in the document's "Approved By" field.
             (d) The signed tag encompasses the exact file content (git commit SHA) that
                 was reviewed and approved.

             Documents with Status "Draft" are NOT normative for the tagged release and
             MUST NOT be included in validation evidence for that release.
             Reference: 21 CFR 11.10(j) (document controls), EU GMP Annex 11 §10
             (change management), GAMP 5 §D.4.
```

```
RECOMMENDED: Organizations SHOULD maintain a GPG key registry that maps signing key
             fingerprints to personnel identities and their organizational roles. This
             registry provides the audit trail linking document approval (the signed tag)
             to the approver's identity and authority. The registry SHOULD be maintained
             alongside the specification suite under version control.
```

### Reviewer Attribution

```
REQUIREMENT: When gxp is true, the "Reviewer" field in document control headers MAY
             reference a role (e.g., "GxP Compliance Review") rather than a named
             individual, provided that the individual reviewer identity is recorded in
             the DMS commit history (GPG-signed commits or equivalent). When a role
             reference is used, the organization MUST maintain a mapping from the role
             to the named individual(s) who performed the review for each revision. This
             mapping MUST be maintained under version control alongside the specification
             suite and MUST be included in the GPG-signed tag that constitutes the
             approval artifact.
             Reference: 21 CFR 11.10(k), ALCOA+ Attributable.
```

---

## Periodic Specification Review

```
REQUIREMENT: The @hex-di specification suite MUST be reviewed at minimum annually.
             The specification review MUST cover:

             (a) Currency: All regulatory references (21 CFR Part 11, EU GMP Annex 11,
                 GAMP 5, ICH Q9, PIC/S PI 011-3, WHO TRS 996, MHRA DI) are checked
                 against current published versions.
             (b) Traceability completeness: The traceability matrix is verified for
                 bidirectional coverage — every URS requirement has FS/DS/test evidence,
                 and no orphaned specs or tests exist.
             (c) Consistency: Cross-references between specification documents are
                 verified (no broken links, no stale section numbers).
             (d) Deviation closure: Any open deviations from previous reviews are
                 verified as closed or re-assessed.

             The review MUST produce a dated record with reviewer identity, review
             outcome, and a list of any corrective actions. The record MUST be retained
             for the duration of the current specification version's effective period.
             Reference: EU GMP Annex 11 §11, GAMP 5 §D.4, PIC/S PI 011-3 §9.8.
```

---

## Validation Scope Definition

```
REQUIREMENT: Each GxP deployment MUST define its validation scope by referencing a
             specific GPG-signed tag. Only specification documents with Status "Effective"
             under that tag are normative. Documents with Status "Draft" or DMS References
             pointing to a future tag are explicitly excluded from the validation baseline.
             The validation scope MUST be documented in the site's validation plan or
             Validation Master Plan (VMP).
             Reference: GAMP 5 §D.4 (validation scope definition).
```
