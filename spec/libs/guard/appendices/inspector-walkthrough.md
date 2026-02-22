# Appendix I: Regulatory Inspector Walkthrough Script

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-I                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix H: Reference Adapter Integration Patterns](./adapter-integration-patterns.md) | Next: [Appendix J: Audit Entry Schema Versioning Policy](./audit-schema-versioning.md)_

---

This appendix provides a structured demonstration procedure for presenting `@hex-di/guard` to regulatory inspectors (FDA, EU GMP, WHO). The walkthrough covers all major compliance areas and is designed to be completed in approximately 60 minutes.

### Prerequisites

- Production-representative environment with `@hex-di/guard` deployed
- Access to audit trail data (minimum 100 entries across multiple scopes)
- `checkGxPReadiness()` report showing all items passing
- IQ/OQ/PQ validation reports available
- Designated demonstrator with system knowledge

### Step 1: System Overview (5 min)

Present the system architecture:

- Show the guard pipeline (SubjectProvider → PolicyEngine → AuditTrail)
- Identify the `@hex-di/guard` components in the application architecture diagram
- Explain the port/adapter pattern and how it enables testability
- Reference GAMP 5 Category 5 classification

### Step 2: Access Control Demonstration (10 min)

Demonstrate authorization in action:

- Show a successful (Allow) resolution with audit entry
- Show a failed (Deny) resolution with reason and audit entry
- Show the `AuditEntry` fields and explain each (evaluationId, timestamp, subjectId, etc.)
- Demonstrate that both Allow and Deny produce audit entries (ALCOA+ Complete)

### Step 3: Audit Trail Integrity (10 min)

Demonstrate tamper detection:

- Run `verifyAuditChain()` on a scope and show passing result
- Explain hash chain computation (show the field list and pipe delimiter)
- Demonstrate tamper detection: modify an entry and show `verifyAuditChain()` failure
- Show `schemaVersion` in entries and explain forward-compatible deserialization

### Step 4: Electronic Signature Workflow (10 min)

Demonstrate the complete signature lifecycle:

- Show re-authentication (`reauthenticate()` → `ReauthenticationToken`)
- Show signature capture (`capture()` → `ElectronicSignature` with `reauthenticated: true`)
- Show signature validation (`validate()` → integrity and binding checks)
- Show key revocation and its effect on new captures vs existing validations

### Step 5: Health Check and GxP Readiness (5 min)

Run diagnostic tools:

- Execute `checkGxPReadiness()` and walk through all 15 items
- Execute `createGuardHealthCheck()` and show the structured result
- Show clock drift measurement and tolerance

### Step 6: Export and Archival (10 min)

Demonstrate data portability:

- Export audit entries to JSON with `AuditExportManifest`
- Show the manifest checksum verification process
- Export to CSV and show column mapping
- Verify chain integrity on the exported data
- Reference retention requirements (section 63)

### Step 7: Validation Evidence (5 min)

Present qualification documentation:

- IQ report with all 12 checks passing
- OQ report with all 53 checks passing (OQ-1 through OQ-52 plus OQ-19a: unit, type, integration, adversarial, adverse condition tests)
- PQ report with performance benchmarks
- Traceability matrix (section 69) showing regulation-to-test mapping
- FMEA (section 68) showing all 36 failure modes mitigated (all Low), 39 STRIDE threats

### Step 8: Q&A and Supporting Documents (5 min)

Provide reference materials:

- Guard specification document set (`spec/guard/*.md`)
- Validation reports (IQ/OQ/PQ)
- Change control procedures (section 64a)
- Incident classification matrix (section 68)
- Training documentation (section 64c)

---

_Previous: [Appendix H: Reference Adapter Integration Patterns](./adapter-integration-patterns.md) | Next: [Appendix J: Audit Entry Schema Versioning Policy](./audit-schema-versioning.md)_
