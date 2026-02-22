# 17 - GxP Compliance: Decommissioning

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-17-12                              |
| Revision         | 1.0                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Regulatory Affairs Lead, Quality Assurance Manager |
| Classification   | GxP Compliance Sub-Specification         |
| Change History   | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [Traceability Matrix](./11-traceability-matrix.md)_

---

## 70. System Decommissioning

When retiring a system that uses `@hex-di/guard` in a GxP-regulated environment, organizations must ensure continued access to audit trail data for the full retention period.

```
REQUIREMENT: Before decommissioning, all audit trail data MUST be exported to a
             format-independent archive (CSV and/or JSON) with the hash chain and
             electronic signatures intact. The export MUST include: (1) all audit
             entries with all fields (including integrityHash, previousHash,
             sequenceNumber, and signature), (2) the hash algorithm identifier for
             each chain epoch, and (3) the signing key public components (for
             asymmetric algorithms) or key identifiers (for HMAC). Reference:
             21 CFR 11.10(c) and EU GMP Annex 11 Section 17.
```

```
REQUIREMENT: A standalone `verifyAuditChain()` verification tool (independent of the
             guard library runtime) MUST be retained for the full retention period. This
             tool MUST be capable of verifying the exported archive without requiring the
             original application infrastructure. The tool MUST support all hash algorithms
             used during the system's operational lifetime.
             Reference: 21 CFR 11.10(c), EU GMP Annex 11 §17.
```

```
REQUIREMENT: Before finalizing decommissioning, the exported archive MUST be verified:
             (1) Run verifyAuditChain() on all exported chains and confirm all pass.
             (2) Confirm the exported entry count matches the source entry count.
             (3) Spot-check at least 1% of entries (minimum 100) for field-level
                 equality between the source and exported archive.
             Verification results MUST be recorded in the decommissioning report.
             Reference: ALCOA+ Complete, Enduring.
```

```
REQUIREMENT: Signing key material disposition during decommissioning MUST follow these
             procedures:
             - Asymmetric keys (RSA, ECDSA): archive public keys alongside exported data
               for future signature verification; securely destroy (zeroize) private keys
               unless future re-signing is anticipated.
             - Symmetric keys (HMAC-SHA256): archive the secret key alongside exported data
               for the full retention period under equivalent access controls, since the
               same key is required for verification.
             - Key destruction MUST be documented in the decommissioning report with:
               (1) key identifier, (2) destruction method (e.g., cryptographic zeroization,
               HSM key deletion), (3) timestamp of destruction (ISO 8601 UTC),
               (4) operator identity.
             Reference: 21 CFR 11.200, NIST SP 800-57 Part 1.
```

```
REQUIREMENT: A decommissioning report MUST be produced and retained. The report MUST
             reference EU GMP Annex 11 Section 17 (archiving) and MUST include:
             (1) the date of decommissioning, (2) the operator identity, (3) the scope
             of exported data (date range, scope IDs, entry counts), (4) verification
             results confirming the exported archive passes chain integrity checks,
             (5) the export format and hash algorithm(s), (6) the archive storage
             location, and (7) the verification procedure for future access.
```

```
REQUIREMENT: When decommissioned audit trail data is migrated to a successor system,
             the migration MUST preserve: (1) the data format (field names, types, and
             encoding) or include a documented format mapping that enables lossless
             conversion, (2) the hash chain integrity — verifyAuditChain() MUST pass
             on the migrated data using the same algorithm parameters, (3) electronic
             signature verifiability — signatures MUST remain verifiable against the
             archived key material, and (4) long-term readability — the archive format
             MUST be self-describing (include schema version, field definitions, and
             hash algorithm identifiers) so that future systems can interpret the data
             without relying on the original application code.
             Reference: EU GMP Annex 11 §17, 21 CFR 11.10(c), ALCOA+ Enduring.

REQUIREMENT: In GxP environments, organizations MUST perform a data migration dry-run
             during PQ using a representative subset of production audit data
             (recommended: at least 1% of entries or 1,000 entries, whichever is
             greater, spanning at least 3 distinct scope chains). The dry-run MUST
             verify all four preservation criteria above: (1) format preservation or
             documented lossless mapping, (2) hash chain integrity via
             verifyAuditChain(), (3) electronic signature verifiability, and
             (4) archive self-description. Results MUST be documented as PQ evidence
             including: entry counts, chain verification pass/fail per scope,
             signature verification sample results, and any discrepancies found.
             A failed dry-run MUST block production migration until the failure is
             resolved.
             Reference: GAMP 5 (data migration validation), ALCOA+ Enduring,
             EU GMP Annex 11 §17.

RECOMMENDED: In non-GxP environments, organizations SHOULD perform a migration
             dry-run during PQ using a representative subset of production audit
             data to verify the four preservation criteria above.
```

```
REQUIREMENT: Organizations MUST perform periodic archive readability verification
             throughout the entire retention period for decommissioned guard audit
             trail archives:

             1. Frequency: Archive readability MUST be verified at least annually.
                Additional verification MUST be performed whenever the reading
                infrastructure changes (e.g., operating system upgrades, storage
                system migrations, cryptographic library updates).
             2. Verification scope: Each verification MUST confirm that:
                (a) Archived data is parseable by current tooling
                (b) All audit entries are decodable to their original structure
                (c) Electronic signatures remain verifiable using the archived
                    public keys or certificates
                (d) Archive self-description metadata is intact and consistent
             3. Documentation: Each verification MUST be documented with: date,
                verifier identity and role, archive storage location, total entry
                count verified, pass/fail result per scope, and any discrepancies.
             4. Failure handling: A failed readability verification MUST trigger the
                incident classification matrix (section 68) at the MAJOR severity
                level. Remediation (e.g., format migration, re-export) MUST be
                completed before the next scheduled verification.

             This requirement ensures that archived audit trail data remains
             accessible and verifiable for the full regulatory retention period,
             even as underlying technology evolves.
             Reference: EU GMP Annex 11 §17, 21 CFR 11.10(c), ALCOA+ Enduring.

RECOMMENDED: Organizations SHOULD automate periodic archive readability
             verification via a scheduled job that invokes the standalone
             verifyAuditChain() tool against each archived scope and reports
             results to the designated data integrity officer.
```

### 70a. Decommissioning Archive Schema (JSON Schema 2020-12)

To ensure 25-year readability of decommissioned audit trail archives, the export format MUST conform to a versioned, self-describing JSON Schema. This schema enables future systems to interpret archived data without relying on the original application code.

```
REQUIREMENT: Decommissioning exports in JSON format MUST conform to the
             guard-audit-archive JSON Schema defined below. The schema version
             MUST be embedded in every archive file. Archive consumers MUST
             validate the schema version before processing.
             Reference: EU GMP Annex 11 §17, 21 CFR 11.10(c), ALCOA+ Enduring.
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://hex-di.dev/schemas/guard-audit-archive/v1.0.0",
  "title": "Guard Audit Trail Decommissioning Archive",
  "description": "Self-describing archive format for decommissioned @hex-di/guard audit trail data. Designed for 25-year retention readability per EU GMP Annex 11 §17 and 21 CFR 11.10(c).",
  "type": "object",
  "required": ["archiveVersion", "metadata", "chains"],
  "additionalProperties": false,
  "properties": {
    "archiveVersion": {
      "type": "string",
      "const": "1.0.0",
      "description": "Semantic version of this archive schema. Consumers MUST check this field before processing."
    },
    "metadata": {
      "$ref": "#/$defs/ArchiveMetadata"
    },
    "chains": {
      "type": "array",
      "items": { "$ref": "#/$defs/AuditChain" },
      "minItems": 1,
      "description": "One entry per scope chain exported."
    },
    "keyMaterial": {
      "type": "array",
      "items": { "$ref": "#/$defs/ArchivedKey" },
      "description": "Public keys and key identifiers retained for future signature verification."
    }
  },
  "$defs": {
    "ArchiveMetadata": {
      "type": "object",
      "required": [
        "exportTimestamp",
        "exporterIdentity",
        "sourceSystem",
        "guardVersion",
        "schemaVersion",
        "dateRangeStart",
        "dateRangeEnd",
        "totalEntryCount",
        "scopeIds",
        "hashAlgorithms",
        "checksum"
      ],
      "properties": {
        "exportTimestamp": {
          "type": "string",
          "format": "date-time",
          "description": "ISO 8601 UTC timestamp of export."
        },
        "exporterIdentity": {
          "type": "string",
          "description": "Identity of the operator who performed the export."
        },
        "sourceSystem": {
          "type": "string",
          "description": "Identifier of the originating system."
        },
        "guardVersion": {
          "type": "string",
          "description": "Semantic version of @hex-di/guard at export time."
        },
        "schemaVersion": {
          "type": "integer",
          "minimum": 1,
          "description": "AuditEntry schema version at export time."
        },
        "dateRangeStart": {
          "type": "string",
          "format": "date-time",
          "description": "Earliest audit entry timestamp in the archive."
        },
        "dateRangeEnd": {
          "type": "string",
          "format": "date-time",
          "description": "Latest audit entry timestamp in the archive."
        },
        "totalEntryCount": {
          "type": "integer",
          "minimum": 0,
          "description": "Total number of audit entries across all chains."
        },
        "scopeIds": {
          "type": "array",
          "items": { "type": "string" },
          "description": "All scope IDs included in this archive."
        },
        "hashAlgorithms": {
          "type": "array",
          "items": { "type": "string" },
          "description": "All hash algorithms used across chain epochs (e.g., [\"SHA-256\"])."
        },
        "checksum": {
          "type": "string",
          "description": "SHA-256 checksum of the entire archive payload (excluding this field)."
        },
        "decommissioningReportRef": {
          "type": "string",
          "description": "Reference to the decommissioning report document."
        }
      }
    },
    "AuditChain": {
      "type": "object",
      "required": ["scopeId", "hashAlgorithm", "genesisHash", "entryCount", "entries"],
      "properties": {
        "scopeId": {
          "type": "string",
          "description": "Scope identifier for this chain."
        },
        "hashAlgorithm": {
          "type": "string",
          "description": "Primary hash algorithm for this chain (e.g., \"SHA-256\")."
        },
        "genesisHash": {
          "type": "string",
          "description": "integrityHash of the first entry in this chain."
        },
        "entryCount": {
          "type": "integer",
          "minimum": 1,
          "description": "Number of entries in this chain."
        },
        "epochs": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["algorithmId", "startSequence", "endSequence"],
            "properties": {
              "algorithmId": { "type": "string" },
              "startSequence": { "type": "integer" },
              "endSequence": { "type": "integer" }
            }
          },
          "description": "Hash algorithm epoch boundaries for chains that span algorithm migrations."
        },
        "entries": {
          "type": "array",
          "items": { "$ref": "#/$defs/ArchivedAuditEntry" },
          "minItems": 1
        }
      }
    },
    "ArchivedAuditEntry": {
      "type": "object",
      "required": [
        "evaluationId",
        "timestamp",
        "subjectId",
        "authenticationMethod",
        "policy",
        "decision",
        "portName",
        "scopeId",
        "reason",
        "durationMs",
        "schemaVersion",
        "sequenceNumber",
        "integrityHash",
        "previousHash"
      ],
      "properties": {
        "evaluationId": { "type": "string", "format": "uuid" },
        "timestamp": { "type": "string", "format": "date-time" },
        "subjectId": { "type": "string", "maxLength": 255 },
        "authenticationMethod": { "type": "string", "maxLength": 64 },
        "policy": { "type": "string", "maxLength": 512 },
        "decision": { "type": "string", "enum": ["allow", "deny"] },
        "portName": { "type": "string", "maxLength": 128 },
        "scopeId": { "type": "string" },
        "reason": { "type": "string", "maxLength": 2048 },
        "durationMs": { "type": "number", "minimum": 0 },
        "schemaVersion": { "type": "integer", "minimum": 1 },
        "sequenceNumber": { "type": "integer", "minimum": 0 },
        "integrityHash": { "type": "string" },
        "previousHash": { "type": "string" },
        "hashAlgorithm": { "type": "string" },
        "traceDigest": { "type": "string" },
        "policySnapshot": { "type": "string" },
        "signature": { "$ref": "#/$defs/ArchivedSignature" }
      }
    },
    "ArchivedSignature": {
      "type": "object",
      "required": ["signerId", "signedAt", "meaning", "value", "algorithm"],
      "properties": {
        "signerId": { "type": "string" },
        "signedAt": { "type": "string", "format": "date-time" },
        "meaning": { "type": "string" },
        "value": { "type": "string" },
        "algorithm": { "type": "string" },
        "signerName": { "type": "string" },
        "signerRoles": {
          "type": "array",
          "items": { "type": "string" }
        },
        "reauthenticated": { "type": "boolean" }
      }
    },
    "ArchivedKey": {
      "type": "object",
      "required": ["keyId", "algorithm", "archivedAt"],
      "properties": {
        "keyId": { "type": "string" },
        "algorithm": {
          "type": "string",
          "description": "Algorithm identifier (e.g., \"RSA-SHA256\", \"ECDSA-P256\", \"HMAC-SHA256\")."
        },
        "publicKey": {
          "type": "string",
          "description": "PEM-encoded public key (for asymmetric algorithms)."
        },
        "secretKey": {
          "type": "string",
          "description": "Encrypted secret key (for HMAC; encrypted with archive encryption key)."
        },
        "archivedAt": { "type": "string", "format": "date-time" },
        "dispositionMethod": {
          "type": "string",
          "description": "How the original key was disposed (e.g., \"zeroized\", \"hsm-deleted\", \"retained\")."
        }
      }
    }
  }
}
```

```
REQUIREMENT: The archive schema version MUST follow semantic versioning. Breaking
             changes to the archive format (field removals, type changes, semantic
             changes) MUST increment the major version. Additive changes (new optional
             fields) MUST increment the minor version. The archive consumer tooling
             (standalone verifyAuditChain()) MUST support all previously released
             major versions to ensure backward compatibility across the full
             retention period.
             Reference: EU GMP Annex 11 §17, ALCOA+ Enduring.
```

```
RECOMMENDED: Organizations SHOULD validate their decommissioning exports against
             this JSON Schema using a standard JSON Schema 2020-12 validator (e.g.,
             ajv) as part of the pre-decommissioning verification step. Schema
             validation failures SHOULD block the decommissioning process.
```

---

_Previous: [Traceability Matrix](./11-traceability-matrix.md)_
