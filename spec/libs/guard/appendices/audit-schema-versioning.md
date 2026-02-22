# Appendix J: Audit Entry Schema Versioning Policy

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-J                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix I: Regulatory Inspector Walkthrough Script](./inspector-walkthrough.md) | Next: [Appendix K: Deviation Report Template](./deviation-report-template.md)_

---

The `schemaVersion` field on `AuditEntry`, `GxPAuditEntry`, `AuditExportManifest`, and `WalIntent` enables forward-compatible evolution of the audit entry schema without breaking hash chain verification or compliance tooling.

### Version Increment Rules

```
REQUIREMENT: The `schemaVersion` field MUST follow semantic versioning (MAJOR.MINOR.PATCH)
             with the following increment rules:
             (a) MAJOR increment: when a field is removed, renamed, or its type changes in
                 a way that breaks existing hash chain verification or audit trail query
                 tooling. A MAJOR increment invalidates all prior hash chains and MUST
                 trigger a full OQ re-run (section 64a).
             (b) MINOR increment: when a new field is added to the audit entry schema.
                 Existing hash chain verification MUST continue to pass (new fields are
                 appended to the pipe-delimited hash input). A MINOR increment MUST
                 trigger OQ-6 and OQ-7 re-verification.
             (c) PATCH increment: when field documentation, validation rules, or
                 non-structural metadata changes without affecting the persisted schema.
                 No re-verification is required.
             The version MUST be stored as an integer for the initial release series
             (version 1, 2, 3, ...) and transition to "MAJOR.MINOR.PATCH" string format
             only if a MINOR or PATCH distinction becomes necessary. The initial integer
             format (version 1) is equivalent to "1.0.0".
             Reference: EU GMP Annex 11 §4.7, GAMP 5 (configuration management).
```

### Initial Version Matrix

| Entry Type            | Current `schemaVersion` | Introduced In | Notes                                      |
| --------------------- | ----------------------- | ------------- | ------------------------------------------ |
| `AuditEntry`          | 1                       | v1.0.0        | Base audit entry with 10 required fields   |
| `GxPAuditEntry`       | 1                       | v1.0.0        | Extends `AuditEntry` with integrity fields |
| `AuditExportManifest` | 1                       | v1.0.0        | Export manifest with checksum verification |
| `WalIntent`           | 1                       | v1.0.0        | Write-ahead log intent record              |

### Cross-Version Compatibility

```
REQUIREMENT: Audit trail query tooling and `verifyAuditChain()` MUST handle entries with
             different `schemaVersion` values within the same chain. Specifically:
             (a) Hash chain verification MUST use the hash computation algorithm
                 corresponding to each entry's `schemaVersion`, not the current version.
             (b) Query results MUST include the `schemaVersion` field so that consumers
                 can interpret each entry according to its schema.
             (c) Export manifests MUST record the set of `schemaVersion` values present
                 in the exported data (e.g., `schemaVersions: [1]`).
             (d) When a MAJOR version increment occurs, the migration procedure (below)
                 MUST be followed before mixed-version chains are created.
             Reference: 21 CFR 11.10(c), ALCOA+ Enduring.
```

### Migration Guidance

When a schema version increment is required:

1. **Document the change** in a change request per section 64a (policy change control), including the old and new schema definitions, the fields affected, and the increment type (MAJOR/MINOR/PATCH).
2. **Update the hash computation** (for MAJOR or MINOR) to include or exclude the changed fields, ensuring backward-compatible verification for prior entries.
3. **Update the version matrix** above and the `schemaVersion` default in the `AuditEntry` factory.
4. **Re-run the affected OQ checks** (OQ-6 for hash chain, OQ-7 for field completeness) and document the results in the OQ report.
5. **Retain the prior schema documentation** as an appendix to the migration change request, ensuring that auditors can reconstruct the meaning of historical entries.

---

_Previous: [Appendix I: Regulatory Inspector Walkthrough Script](./inspector-walkthrough.md) | Next: [Appendix K: Deviation Report Template](./deviation-report-template.md)_
