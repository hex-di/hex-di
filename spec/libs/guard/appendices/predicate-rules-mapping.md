# Appendix P: Predicate Rules Mapping Template

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-P                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix K: Deviation Report Template](./deviation-report-template.md) | Next: [Appendix M: Operational Risk Guidance](./operational-risk-guidance.md)_

---

Section 59 (01-regulatory-context.md) REQUIRES that predicate rule mapping be performed prior to deployment. Section 63 (04-data-retention.md) defines port-to-record-type retention mapping. Section 67 (09-validation-plan.md) requires traceability between regulatory requirements and test evidence. This appendix provides a comprehensive template and worked examples for mapping predicate rules to regulated activities, bridging those three requirements.

### Template

| Predicate Rule                           | Regulated Activity                      | Affected Guard Ports                | Retention Period                   | Audit Trail Fields                                           | Signature Requirements                             |
| ---------------------------------------- | --------------------------------------- | ----------------------------------- | ---------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| _Policy expression (e.g., `allOf(...)`)_ | _Regulatory activity this rule governs_ | _Port names protected by this rule_ | _Minimum retention per section 63_ | _Additional audit fields required beyond the 10 base fields_ | _Electronic signature requirements per section 65_ |

### Worked Examples

#### Example 1: Pharmaceutical Batch Records

| Predicate Rule                                                                        | Regulated Activity                         | Affected Guard Ports                  | Retention Period                                        | Audit Trail Fields                                                                       | Signature Requirements                                                                                                                                   |
| ------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allOf(hasRole("qa_manager"), hasSignature("approved"))`                              | Batch release authorization                | `BatchReleasePort`, `BatchRecordPort` | 5 years after batch certification (EU GMP Chapter 4.10) | `policySnapshot` capturing active release policy; `traceDigest` for full evaluation path | Asymmetric signature (RSA-SHA256 2048-bit or ECDSA P-256) per section 65c; meaning: "approved"; re-authentication required per 11.100                    |
| `allOf(hasRole("production_operator"), hasPermission("batch:execute"))`               | Batch execution step recording             | `BatchExecutionPort`                  | 5 years after batch certification (EU GMP Chapter 4.10) | Standard 10 required fields                                                              | None (operational access, not approval)                                                                                                                  |
| `allOf(hasRole("qa_reviewer"), hasSignature("reviewed"), not(hasRole("qa_manager")))` | Batch record review (separation of duties) | `BatchReviewPort`                     | 5 years after batch certification (EU GMP Chapter 4.10) | `policySnapshot`; `traceDigest`                                                          | Asymmetric signature; meaning: "reviewed"; `signerRole` must be `qa_reviewer`; counter-signing with `qa_manager` via separate `hasSignature("approved")` |

#### Example 2: Medical Device Design History

| Predicate Rule                                                  | Regulated Activity                             | Affected Guard Ports                   | Retention Period                              | Audit Trail Fields                                        | Signature Requirements                                                                                                                                                 |
| --------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------- | --------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allOf(hasRole("design_engineer"), hasPermission("dhf:write"))` | Design History File (DHF) modification         | `DesignHistoryPort`, `DesignInputPort` | Lifetime of device + 2 years (21 CFR 820.184) | Standard 10 required fields; `traceDigest`                | None for drafts                                                                                                                                                        |
| `allOf(hasRole("design_authority"), hasSignature("approved"))`  | Design review approval                         | `DesignReviewPort`                     | Lifetime of device + 2 years (21 CFR 820.184) | `policySnapshot`; `traceDigest`                           | Asymmetric signature; meaning: "approved"; re-authentication required                                                                                                  |
| `allOf(hasSignature("authored"), hasSignature("reviewed"))`     | Design verification sign-off (counter-signing) | `DesignVerificationPort`               | Lifetime of device + 2 years (21 CFR 820.184) | `policySnapshot`; `traceDigest`; both signatures recorded | Counter-signing per section 65d: `signerRole: "test_engineer"` (authored) + `signerRole: "design_authority"` (reviewed); independent re-authentication for each signer |

#### Example 3: Clinical Trial Laboratory Results

| Predicate Rule                                                      | Regulated Activity                    | Affected Guard Ports               | Retention Period                                        | Audit Trail Fields              | Signature Requirements                                                                                                         |
| ------------------------------------------------------------------- | ------------------------------------- | ---------------------------------- | ------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `allOf(hasRole("lab_analyst"), hasPermission("lab:enter_results"))` | Laboratory result entry               | `LabResultPort`                    | Duration of clinical trial + 25 years (ICH E6(R2) §8.1) | Standard 10 required fields     | None for initial entry                                                                                                         |
| `allOf(hasRole("lab_analyst"), hasSignature("authored"))`           | Laboratory result attestation         | `LabResultPort`                    | Duration of clinical trial + 25 years (ICH E6(R2) §8.1) | `policySnapshot`; `traceDigest` | Asymmetric signature; meaning: "authored"; re-authentication required                                                          |
| `allOf(hasRole("lab_supervisor"), hasSignature("reviewed"))`        | Laboratory result review and approval | `LabResultPort`, `LabApprovalPort` | Duration of clinical trial + 25 years (ICH E6(R2) §8.1) | `policySnapshot`; `traceDigest` | Asymmetric signature; meaning: "reviewed"; `signerRole: "lab_supervisor"`; counter-signing with analyst's "authored" signature |

> **Note:** These examples are illustrative. Organizations MUST adapt the predicate rules, port names, retention periods, and signature requirements to their specific regulatory context and operational workflows. The mapping MUST be documented in the validation plan (section 67) and reviewed during periodic review (section 64). See section 59 for open system classification requirements, section 63 for retention period guidance, and section 67 for validation traceability.

---

_Previous: [Appendix K: Deviation Report Template](./deviation-report-template.md) | Next: [Appendix M: Operational Risk Guidance](./operational-risk-guidance.md)_
