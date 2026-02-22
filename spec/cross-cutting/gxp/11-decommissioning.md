# 11 - Decommissioning

> **Document Control**
>
> | Property | Value |
> |----------|-------|
> | Document ID | GXP-CC-11 |
> | Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/cross-cutting/gxp/11-decommissioning.md` |
> | Status | Effective |
> | Classification | Cross-Cutting GxP Framework |

---

## Purpose

When retiring a system that uses `@hex-di` packages in a GxP-regulated environment, organizations must ensure continued access to data for the full retention period. This section defines the generic decommissioning framework.

Per-package compliance documents may add package-specific decommissioning requirements (e.g., audit chain export formats, key disposition for signed records).

---

## Data Export Requirements

```
REQUIREMENT: Before decommissioning, all GxP-relevant data MUST be exported to a
             format-independent archive (CSV and/or JSON) with integrity verification
             data intact. The export MUST include:

             (a) All records with all fields (no field truncation or omission)
             (b) Integrity verification data (hash chains, checksums, sequence numbers)
             (c) Schema version identifiers for each record format
             (d) Signing key public components (for asymmetric algorithms) or key
                 identifiers (for HMAC) if applicable
             Reference: 21 CFR 11.10(c), EU GMP Annex 11 §17.
```

---

## Standalone Verification Tooling

```
REQUIREMENT: A standalone verification tool (independent of the library runtime) MUST
             be retained for the full retention period. This tool MUST be capable of
             verifying the exported archive without requiring the original application
             infrastructure. The tool MUST support all data formats and algorithms
             used during the system's operational lifetime.
             Reference: 21 CFR 11.10(c), EU GMP Annex 11 §17.
```

---

## Pre-Decommissioning Verification

```
REQUIREMENT: Before finalizing decommissioning, the exported archive MUST be verified:

             (a) Run integrity verification on all exported data and confirm all pass
             (b) Confirm the exported record count matches the source record count
             (c) Spot-check at least 1% of records (minimum 100) for field-level
                 equality between source and exported archive
             Verification results MUST be recorded in the decommissioning report.
             Reference: ALCOA+ Complete, Enduring.
```

---

## Key Material Disposition

```
REQUIREMENT: Signing key material disposition during decommissioning MUST follow:

             - Asymmetric keys (RSA, ECDSA): Archive public keys alongside exported
               data for future signature verification; securely destroy (zeroize)
               private keys unless future re-signing is anticipated.
             - Symmetric keys (HMAC-SHA256): Archive the secret key alongside exported
               data for the full retention period under equivalent access controls.
             - Key destruction MUST be documented in the decommissioning report with:
               (a) key identifier, (b) destruction method (e.g., cryptographic
               zeroization, HSM key deletion), (c) timestamp of destruction (ISO 8601
               UTC), (d) operator identity.
             Reference: 21 CFR 11.200, NIST SP 800-57 Part 1.
```

---

## Decommissioning Report

```
REQUIREMENT: A decommissioning report MUST be produced and retained. The report MUST
             reference EU GMP Annex 11 §17 (archiving) and MUST include:

             (a) Date of decommissioning
             (b) Operator identity
             (c) Scope of exported data (date range, record counts)
             (d) Verification results confirming the archive passes integrity checks
             (e) Export format and algorithms used
             (f) Archive storage location
             (g) Verification procedure for future access
             (h) Key material disposition records (if applicable)
```

---

## Data Migration to Successor Systems

```
REQUIREMENT: When decommissioned data is migrated to a successor system, the migration
             MUST preserve:

             (a) Data format (field names, types, encoding) or include a documented
                 format mapping that enables lossless conversion
             (b) Integrity verification data (hash chains, checksums must remain
                 verifiable)
             (c) Electronic signature verifiability (signatures MUST remain verifiable
                 against archived key material)
             (d) Long-term readability (archive format MUST be self-describing: include
                 schema version, field definitions, and algorithm identifiers)
             Reference: EU GMP Annex 11 §17, 21 CFR 11.10(c), ALCOA+ Enduring.

REQUIREMENT: In GxP environments, organizations MUST perform a data migration dry-run
             during PQ using a representative subset of production data (recommended:
             at least 1% or 1,000 records, whichever is greater). The dry-run MUST
             verify all four preservation criteria above. Results MUST be documented
             as PQ evidence. A failed dry-run MUST block production migration.
             Reference: GAMP 5 (data migration validation), ALCOA+ Enduring.
```

---

## Periodic Archive Readability Verification

```
REQUIREMENT: Organizations MUST perform periodic archive readability verification
             throughout the entire retention period for decommissioned data:

             (a) Frequency: At least annually. Additional verification MUST be performed
                 whenever the reading infrastructure changes.
             (b) Verification scope: Each verification MUST confirm that archived data
                 is parseable by current tooling, all records are decodable to their
                 original structure, signatures remain verifiable using archived keys,
                 and metadata is intact and consistent.
             (c) Documentation: Each verification MUST be documented with: date,
                 verifier identity, archive storage location, total record count,
                 pass/fail result, and any discrepancies.
             (d) Failure handling: A failed readability verification MUST trigger
                 incident management. Remediation MUST be completed before the next
                 scheduled verification.
             Reference: EU GMP Annex 11 §17, 21 CFR 11.10(c), ALCOA+ Enduring.
```

---

## Archive Schema Versioning

```
REQUIREMENT: Archive schema versions MUST follow semantic versioning. Breaking changes
             to the archive format MUST increment the major version. Archive consumer
             tooling MUST support all previously released major versions to ensure
             backward compatibility across the full retention period.
             Reference: EU GMP Annex 11 §17, ALCOA+ Enduring.

RECOMMENDED: Organizations SHOULD validate decommissioning exports against a published
             JSON Schema using a standard validator as part of the pre-decommissioning
             verification step.
```
