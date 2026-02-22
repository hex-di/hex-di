# Appendix Q: Data Dictionary

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-Q                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix O: Condensed Clock Specification Summary](./clock-spec-summary.md) | Next: [Appendix R: Operational Log Event Schema](./operational-log-schema.md)_

---

This appendix provides a comprehensive data dictionary for all audit and signature types in the guard system. Every field is documented with its data type, constraints, and regulatory purpose.

### AuditEntry Fields

| Field                  | Type                  | Required                                            | Constraints                                                                                    | Regulatory Purpose                                                                            |
| ---------------------- | --------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `evaluationId`         | `string`              | Yes                                                 | UUID v4 format; CSPRNG-backed (`crypto.randomUUID()`); unique per evaluation                   | Unique identification for audit correlation; ALCOA+ Attributable; hash chain input field 1/14 |
| `timestamp`            | `string`              | Yes                                                 | ISO 8601 UTC with "Z" designator; NTP-synchronized in production                               | Contemporaneous recording; ALCOA+ Contemporaneous; hash chain input field 2/14                |
| `subjectId`            | `string`              | Yes                                                 | Max 255 characters; matches `AuthSubject.id`                                                   | Identity attribution; ALCOA+ Attributable; 21 CFR 11.10(e); hash chain input field 3/14       |
| `authenticationMethod` | `string`              | Yes                                                 | Max 64 characters; from `AuthSubject.authenticationMethod` (e.g., "oauth2", "api-key", "saml") | Authentication provenance; 21 CFR 11.10(d); hash chain input field 4/14                       |
| `policy`               | `string`              | Yes                                                 | Max 512 characters; human-readable policy label                                                | Decision rationale traceability; ALCOA+ Accurate; hash chain input field 5/14                 |
| `decision`             | `"allow" \| "deny"`   | Yes                                                 | Exactly "allow" or "deny" (no other values)                                                    | Authorization outcome; ALCOA+ Accurate; hash chain input field 6/14                           |
| `portName`             | `string`              | Yes                                                 | Max 128 characters; identifies the guarded port                                                | Resource identification for audit review; ALCOA+ Attributable; hash chain input field 7/14    |
| `scopeId`              | `string`              | Yes                                                 | UUID format; identifies the DI scope                                                           | Chain partitioning; per-scope hash chain integrity ([ADR #30](../decisions/030-per-scope-chains-sequence-numbers.md)); hash chain input field 8/14     |
| `reason`               | `string`              | Yes                                                 | Max 2048 characters; empty string `""` for Allow decisions (not undefined)                     | Decision explanation; ALCOA+ Accurate; hash chain input field 9/14                            |
| `durationMs`           | `number`              | Yes                                                 | Non-negative; measured via `performance.now()` (monotonic)                                     | Performance monitoring; operational metric; hash chain input field 10/14                      |
| `schemaVersion`        | `number`              | Yes                                                 | Current version: 1; positive integer; enables forward-compatible deserialization               | Version-tagged processing; ALCOA+ Consistent; hash chain input field 11/14                    |
| `traceDigest`          | `string`              | Optional (GxP: required)                            | Compact trace format: `policyLabel[verdict] > child[verdict]`                                  | Evaluation path visibility without full trace tree; hash chain input field 12/14              |
| `integrityHash`        | `string`              | Optional (GxP: required)                            | SHA-256 hex digest of 14-field canonical input                                                 | Tamper detection; hash chain integrity; 21 CFR 11.10(c)                                       |
| `previousHash`         | `string`              | Optional (GxP: required)                            | SHA-256 hex digest; empty string `""` for genesis entry                                        | Chain linkage; tamper detection; hash chain input field 14/14                                 |
| `hashAlgorithm`        | `string`              | Optional (GxP: required)                            | Algorithm identifier (e.g., "sha256", "hmac-sha256", "sha3-256")                               | Algorithm-agnostic verification across retention period                                       |
| `signature`            | `ElectronicSignature` | Optional (GxP: required when signatures configured) | Full ElectronicSignature object                                                                | Non-repudiation; 21 CFR 11.50-11.70                                                           |
| `sequenceNumber`       | `number`              | Optional (GxP: required)                            | Non-negative integer; monotonically increasing per scope; no gaps                              | Gap detection; concurrent write ordering ([ADR #30](../decisions/030-per-scope-chains-sequence-numbers.md)); hash chain input field 13/14              |
| `policySnapshot`       | `string`              | Optional (GxP: required)                            | Git SHA or content hash of policy definition at evaluation time                                | Change-control traceability; policy version correlation                                       |

### GxPAuditEntry Additional Constraints

`GxPAuditEntry` extends `AuditEntry` and makes all optional fields required:

| Field            | Change from AuditEntry | Constraint                                             |
| ---------------- | ---------------------- | ------------------------------------------------------ |
| `traceDigest`    | Optional -> Required   | Must be non-empty string                               |
| `integrityHash`  | Optional -> Required   | Must be valid SHA-256 hex (64 chars)                   |
| `previousHash`   | Optional -> Required   | Must be valid SHA-256 hex or empty string (genesis)    |
| `hashAlgorithm`  | Optional -> Required   | Must be non-empty algorithm identifier                 |
| `signature`      | Optional -> Required   | Must be complete ElectronicSignature                   |
| `sequenceNumber` | Optional -> Required   | Must be non-negative integer, monotonically increasing |
| `policySnapshot` | Optional -> Required   | Must be non-empty hash string                          |

### ElectronicSignature Fields

| Field             | Type      | Required                 | Constraints                                                                      | Regulatory Purpose                                               |
| ----------------- | --------- | ------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `signerId`        | `string`  | Yes                      | Non-empty; unique identifier of the signer                                       | Identity attribution; 21 CFR 11.50 (printed name requirement)    |
| `signedAt`        | `string`  | Yes                      | ISO 8601 UTC with "Z" designator                                                 | Contemporaneous signing; 21 CFR 11.50 (date/time of signing)     |
| `meaning`         | `string`  | Yes                      | Standard meanings: "authored", "reviewed", "approved"; custom meanings allowed   | Signing intent; 21 CFR 11.50 (meaning associated with signature) |
| `value`           | `string`  | Yes                      | Cryptographic digest of the 13-field canonical payload (excludes `previousHash`) | Cryptographic binding; 21 CFR 11.70 (signature/record linking)   |
| `algorithm`       | `string`  | Yes                      | Algorithm identifier (e.g., "HMAC-SHA256", "RSA-SHA256", "ECDSA-P256")           | Algorithm traceability; NIST SP 800-131A compliance              |
| `signerName`      | `string`  | Optional (GxP: required) | Human-readable signer name; non-empty when present                               | 21 CFR 11.50 manifestation: printed name of signer               |
| `reauthenticated` | `boolean` | Yes                      | `true` when signer re-authenticated before signing; `false` for imported/legacy  | 21 CFR 11.100 re-authentication verification                     |
| `keyId`           | `string`  | Optional (GxP: required) | Key identifier for routing during verification after key rotation                | Key lifecycle management; post-rotation verification support     |

### PolicyChangeAuditEntry Fields

| Field                      | Type                       | Required                 | Constraints                                                     | Regulatory Purpose                                   |
| -------------------------- | -------------------------- | ------------------------ | --------------------------------------------------------------- | ---------------------------------------------------- |
| `_tag`                     | `"PolicyChangeAuditEntry"` | Yes                      | Literal discriminant                                            | Type discrimination for audit trail consumers        |
| `changeId`                 | `string`                   | Yes                      | UUID; unique per change event                                   | Change identification; change control traceability   |
| `timestamp`                | `string`                   | Yes                      | ISO 8601 UTC with "Z" designator                                | Contemporaneous recording of policy change           |
| `actorId`                  | `string`                   | Yes                      | Identity of who initiated the change                            | 21 CFR 11.10(d) accountability; ALCOA+ Attributable  |
| `portName`                 | `string`                   | Yes                      | Affected port name; `"*"` for graph-wide changes                | Scope of change; impact analysis                     |
| `previousPolicyHash`       | `string`                   | Yes                      | `hashPolicy()` digest of the prior policy                       | Before-state traceability; change delta verification |
| `newPolicyHash`            | `string`                   | Yes                      | `hashPolicy()` digest of the new policy                         | After-state traceability; change delta verification  |
| `reason`                   | `string`                   | Yes                      | Human-readable change justification                             | Change rationale; 21 CFR 11.10(e) documentation      |
| `applied`                  | `boolean`                  | Yes                      | Whether the change was successfully applied                     | Change outcome recording                             |
| `changeRequestId`          | `string`                   | Yes                      | Link to external change control system                          | Cross-system change traceability; §64a               |
| `approverId`               | `string`                   | Yes                      | Identity of who approved the change; must differ from `actorId` | Separation of duties; 21 CFR 11.10(g)                |
| `approvedAt`               | `string`                   | Yes                      | ISO 8601 UTC timestamp of approval                              | Approval timing; ALCOA+ Contemporaneous              |
| `previousPolicySerialized` | `string`                   | Optional                 | Full JSON of the prior policy                                   | Complete reconstruction capability; ALCOA+ Original  |
| `newPolicySerialized`      | `string`                   | Optional                 | Full JSON of the new policy                                     | Complete reconstruction capability; ALCOA+ Original  |
| `diffReportChecksum`       | `string`                   | Optional (GxP: required) | SHA-256 of the policy diff report                               | Diff report integrity; change impact verification    |

### GxPPolicyChangeAuditEntry Additional Fields

| Field                | Type     | Required                     | Constraints                                                        | Regulatory Purpose                 |
| -------------------- | -------- | ---------------------------- | ------------------------------------------------------------------ | ---------------------------------- |
| `sequenceNumber`     | `number` | Yes                          | Monotonically increasing; participates in same chain as AuditEntry | Chain ordering; gap detection      |
| `integrityHash`      | `string` | Yes                          | SHA-256 hex digest                                                 | Tamper detection; chain integrity  |
| `previousHash`       | `string` | Yes                          | SHA-256 hex digest or empty string (genesis)                       | Chain linkage                      |
| `hashAlgorithm`      | `string` | Yes                          | Algorithm identifier                                               | Algorithm traceability             |
| `diffReportChecksum` | `string` | Yes (elevated from optional) | SHA-256 of diff report                                             | Diff report integrity verification |

### Hash Chain Field Ordering

The 14-field canonical input for `integrityHash` computation (in order):

| Position | Field                  | Notes                                  |
| -------- | ---------------------- | -------------------------------------- |
| 1        | `evaluationId`         | UUID v4                                |
| 2        | `timestamp`            | ISO 8601 UTC                           |
| 3        | `subjectId`            | Max 255 chars                          |
| 4        | `authenticationMethod` | Max 64 chars                           |
| 5        | `policy`               | Max 512 chars                          |
| 6        | `decision`             | "allow" or "deny"                      |
| 7        | `portName`             | Max 128 chars                          |
| 8        | `scopeId`              | UUID                                   |
| 9        | `reason`               | Max 2048 chars; empty string for allow |
| 10       | `durationMs`           | Number (decimal)                       |
| 11       | `schemaVersion`        | Integer                                |
| 12       | `sequenceNumber`       | Integer                                |
| 13       | `traceDigest`          | Compact trace string                   |
| 14       | `previousHash`         | SHA-256 hex or empty string            |

> **Note:** The electronic signature canonical payload uses fields 1-13 (excluding `previousHash`). See [ADR #47](../decisions/047-signature-payload-excludes-previous-hash.md) for the rationale: signatures attest to content, while `previousHash` encodes positional integrity -- independent concerns.

---

_Previous: [Appendix O: Condensed Clock Specification Summary](./clock-spec-summary.md) | Next: [Appendix R: Operational Log Event Schema](./operational-log-schema.md)_
