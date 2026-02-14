# ALCOA+ Mapping

## 6.5 ALCOA+ Mapping

| Principle           | How `@hex-di/clock` Addresses It                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Attributable**    | Clock source is explicit and injectable. `ClockDiagnosticsPort` provides runtime attestation of adapter identity and platform source without requiring container graph access. The guard's audit bridge logs diagnostics at startup. **Attribution boundary:** `@hex-di/clock` provides the WHEN (temporal context). Binding timestamps to WHO (user identity), WHAT (operation type), and WHY (business reason) is the consumer's responsibility (see Attribution Context below).                                                                                                                                                                                                                 |
| **Legible**         | All time values are standard `number` in milliseconds. No opaque formats. Consumers convert to ISO 8601 as needed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Contemporaneous** | `monotonicNow()` and `highResNow()` capture time at the moment of the call, not retroactively. `SequenceGeneratorPort` provides ordering even when timestamps are coarsened.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Original**        | All adapter return objects are frozen (`Object.freeze()`). Return values are primitive numbers (immutable by nature). `SequenceOverflowError` is frozen at construction.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Accurate**        | `SystemClockAdapter` uses the best available platform API. No precision fabrication. Fallback to `Date.now()` is honest about reduced precision (no clamping pretends to be high-res).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Complete**        | `SequenceGeneratorPort` provides gapless ordering. Overflow is detected and returns `err()` rather than silently wrapping. Production sequences are structurally irresettable (no `reset()` on the production interface), preventing sequence number reuse that would create gaps in the audit trail. In multi-process deployments, completeness of the global audit trail requires a process-unique identifier alongside the sequence number (see section 3.3, Multi-Process Deployments); this is a consumer composition responsibility.                                                                                                                                                         |
| **Consistent**      | Single `ClockPort` interface across all packages. All packages get the same time source, eliminating cross-package timestamp inconsistency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Enduring**        | Time values are primitive numbers, trivially serializable. No custom formats that could become unreadable. Data retention and archival of timestamped records is a consumer/deployment responsibility outside the scope of `@hex-di/clock`. Organizations deploying in GxP environments MUST define retention policies for audit trail records containing clock-derived timestamps in their computerized system validation plan. GxP organizations SHOULD retain audit trail records for at least the product lifecycle plus the applicable regulatory retention period (typically 1 year post-expiry for pharmaceuticals per 21 CFR 211.180, or as specified by the relevant national authority). |
| **Available**       | `ClockPort` and `SequenceGeneratorPort` are always available once registered. No external dependencies that could fail (unlike NTP, which is guard's responsibility).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### Attribution Context (ALCOA+ Attributable)

ALCOA+ Attributable requires knowing WHO generated a record, WHEN, and WHY. `@hex-di/clock` provides the temporal dimension (WHEN) but deliberately does not define user identity or operation context (WHO/WHY), as these are application-domain concepts outside the scope of a clock library.

REQUIREMENT: Consumers recording GxP-relevant audit entries MUST include attribution context alongside clock-derived timestamps. At minimum, each audit entry MUST contain:

1. **Temporal context** (from `@hex-di/clock`): sequence number, monotonic timestamp, wall-clock timestamp.
2. **Identity context** (from consumer): user identifier, session identifier, or service principal.
3. **Operation context** (from consumer): operation type, business reason, or action description.

`@hex-di/clock` provides `TemporalContext` (see section 6.6) as a standardized structure for the temporal dimension. Consumers MUST compose this with their own attribution structures:

```typescript
// Consumer-defined audit entry composing temporal + attribution
interface GxpAuditEntry {
  readonly temporal: TemporalContext;
  readonly processInstanceId: string; // See section 3.3, Multi-Process Deployments
  readonly userId: string;
  readonly sessionId: string;
  readonly operation: string;
  readonly reason: string;
  // ... domain-specific fields
}
```

REQUIREMENT: Electronic signature binding to clock-derived timestamps (per 21 CFR 11.50) is a consumer responsibility. The clock library provides the timestamp infrastructure and a `SignableTemporalContext` extension interface (see below); the consumer MUST bind signatures that include the printed name of the signer, date/time of signing, and meaning of the signature alongside the `TemporalContext`.

### Electronic Signature Binding Interface (21 CFR 11.50)

21 CFR 11.50 requires that electronic signatures contain the printed name of the signer, the date and time the signature was executed, and the meaning (e.g., review, approval, responsibility) associated with the signature. While signature implementation is a consumer responsibility, `@hex-di/clock` provides a standardized extension interface to ensure consistent integration between temporal context and electronic signatures across the HexDI ecosystem.

```typescript
/**
 * Extension of TemporalContext that includes electronic signature binding fields.
 * Consumers MUST populate these fields when the audit entry requires an electronic signature.
 *
 * Per 21 CFR 11.50, each signature MUST include:
 * - The printed name of the signer
 * - The date and time the signature was executed
 * - The meaning of the signature (review, approval, responsibility, authorship)
 */
interface SignableTemporalContext extends TemporalContext {
  readonly signature?: {
    readonly signerName: string;
    readonly signerId: string;
    readonly signedAt: string; // ISO 8601 UTC timestamp of signature execution
    readonly meaning: string; // e.g., 'review', 'approval', 'responsibility', 'authorship'
    readonly method: string; // e.g., 'password', 'biometric', 'token', 'certificate'
  };
}
```

**Semantic contract:**

- `SignableTemporalContext` extends `TemporalContext` with an optional `signature` field. When present, the signature is bound to the temporal context of the audit event.
- `signerName` MUST be the printed (human-readable) name of the signer, not a username or identifier.
- `signerId` MUST be a unique, system-level identifier for the signer (e.g., employee ID, user principal name).
- `signedAt` MUST be an ISO 8601 UTC timestamp captured at the moment of signature execution (not the timestamp of the underlying event). This MAY differ from `wallClockTimestamp` if the signature is applied after the event occurs (e.g., a reviewer signing off on a batch record after the fact).
- `meaning` MUST describe the regulatory significance of the signature per 21 CFR 11.50.
- `method` MUST describe the authentication method used to execute the signature per 21 CFR 11.200.
- The `signature` object, when present, MUST be frozen with `Object.freeze()`.

REQUIREMENT: `SignableTemporalContext` MUST be exported from the main entry point (`@hex-di/clock`).

REQUIREMENT: Consumers using electronic signatures in GxP environments MUST use `SignableTemporalContext` rather than defining ad-hoc signature structures, ensuring interoperability across the HexDI ecosystem.

### Electronic Signature General Requirements Cross-Reference (21 CFR 11.100, 11.300)

21 CFR 11.100 establishes general requirements for electronic signatures, including that each electronic signature shall be unique to one individual and shall not be reused by, or reassigned to, anyone else. 21 CFR 11.300 establishes controls for identification codes and passwords used in electronic signatures, including requirements for unique codes, periodic revision, and loss management procedures.

These requirements are consumer responsibilities — `@hex-di/clock` provides the temporal infrastructure (`SignableTemporalContext`) but does not manage user identity, authentication, or credential lifecycle. The following cross-references document how consumers MUST address these requirements alongside `@hex-di/clock`:

| Regulation | Requirement                                                         | Consumer Responsibility                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11.100(a)  | Each electronic signature unique to one individual                  | Consumer's identity management system MUST ensure `signerId` in `SignableTemporalContext` maps to exactly one individual and is never reused or reassigned.                                                    |
| 11.100(b)  | Identity verification before establishing electronic signatures     | Consumer MUST verify signer identity through the organization's identity proofing process before populating `SignableTemporalContext.signature`.                                                               |
| 11.100(c)  | Certification to FDA that electronic signatures are legally binding | Consumer/organization responsibility; requires written certification submitted to the FDA Office of Regional Operations before or at time of use. Outside software scope.                                      |
| 11.300(a)  | Uniqueness of identification codes                                  | Consumer's authentication system MUST ensure `signerId` values are unique across all individuals and never reassigned, even after an individual leaves the organization.                                       |
| 11.300(b)  | Periodic revision of identification codes/passwords                 | Consumer's credential management system MUST enforce periodic password rotation per organizational policy (RECOMMENDED: at minimum every 90 days or per organizational SOP).                                   |
| 11.300(c)  | Loss management for compromised codes/passwords                     | Consumer MUST have documented SOPs for immediately deactivating compromised `signerId` credentials, issuing temporary replacements, investigating potential unauthorized signatures, and notifying management. |
| 11.300(d)  | Transaction safeguards against unauthorized use                     | Consumer MUST implement session timeout, re-authentication for each signature execution, and detection of attempts to use another individual's credentials.                                                    |

REQUIREMENT: GxP consumers using `SignableTemporalContext` MUST implement identity and credential management controls satisfying 21 CFR 11.100 and 11.300. The `signerId` field in `SignableTemporalContext` MUST correspond to a unique, non-reusable identifier managed by the consumer's identity system.

REQUIREMENT: Organizations MUST maintain a `signerId` registry that maps each identifier to exactly one natural person. The registry MUST be available for regulatory inspection and MUST record the issuance date, deactivation date (if applicable), and the individual's organizational role at the time of issuance.

**Design rationale:** The signature field is optional because not all audit entries require electronic signatures. Many audit trail events (e.g., automated system events, cache invalidations) are generated without human action and do not require signatures. Making the field required would force consumers to provide meaningless placeholder signatures for automated events, violating ALCOA+ Accurate.

### Electronic Signature Validation Utility (21 CFR 11.50 Enforcement)

While `SignableTemporalContext` defines the correct structure per 21 CFR 11.50, the interface alone does not prevent consumers from persisting incomplete or invalid signature records. A consumer could create a `SignableTemporalContext` with an empty `signerName` or missing `meaning` field, and no runtime check would catch it before persistence.

To close this gap, `@hex-di/clock` provides a `validateSignableTemporalContext()` utility function that verifies all required 21 CFR 11.50 fields are populated and non-empty when the `signature` field is present.

```typescript
interface SignatureValidationError {
  readonly _tag: "SignatureValidationError";
  readonly field: string;
  readonly message: string;
}

function validateSignableTemporalContext(
  ctx: SignableTemporalContext
): Result<SignableTemporalContext, SignatureValidationError>;
```

**Validation rules:**

1. If `ctx.signature` is `undefined`, validation succeeds immediately — unsigned temporal contexts are valid by design.
2. If `ctx.signature` is present, the following fields MUST be non-empty strings:
   - `signerName` — The printed name of the signer (21 CFR 11.50(a)).
   - `signerId` — The unique system identifier for the signer (21 CFR 11.100(a)).
   - `signedAt` — ISO 8601 UTC timestamp of signature execution (21 CFR 11.50(b)). MUST be a valid ISO 8601 string.
   - `meaning` — The regulatory meaning of the signature (21 CFR 11.50(c)). MUST be one of the recognized meanings or a non-empty custom string.
   - `method` — The authentication method (21 CFR 11.200). MUST be a non-empty string.
3. If `ctx.signature` is present but the `signature` object is not frozen, validation fails with field `'signature'` and message indicating the signature object must be frozen (ALCOA+ Original).
4. The temporal context base fields (`sequenceNumber`, `monotonicTimestamp`, `wallClockTimestamp`) MUST satisfy standard `TemporalContext` constraints (positive sequence number, plausible wall-clock).

**Semantic contract:**

- The function is pure and has no side effects.
- On success, returns `Ok` containing the validated `SignableTemporalContext` (same reference, not a copy).
- On failure, returns `Err` containing a frozen `SignatureValidationError` identifying the first failing field and a human-readable message.
- The function does NOT verify the authenticity of the signature (i.e., it does not check that `signerId` maps to a real user or that `signedAt` is temporally consistent with the underlying event). Authentication verification is a consumer identity system responsibility.

**Temporal consistency check:**

- If `signature.signedAt` is present and parseable, `validateSignableTemporalContext()` SHOULD warn (via the error path) if the parsed `signedAt` timestamp is more than 24 hours before `ctx.wallClockTimestamp`. While retrospective signing is permitted (e.g., a reviewer signing off on a batch record after the fact), a 24-hour gap is unusual and may indicate a data entry error. This check is advisory — consumers MAY choose to ignore this validation error for workflows where delayed signing is expected.

REQUIREMENT: `validateSignableTemporalContext()` MUST be exported from the main entry point (`@hex-di/clock`).

REQUIREMENT: `SignatureValidationError` MUST be frozen at construction, consistent with the project's error immutability pattern.

REQUIREMENT: GxP consumers using electronic signatures MUST call `validateSignableTemporalContext()` before persisting any `SignableTemporalContext` to the audit trail. Persisting a `SignableTemporalContext` without prior validation in a GxP environment is a compliance violation — incomplete or structurally invalid signatures that reach the audit trail undermine 21 CFR 11.50 and cannot be retroactively corrected without a deviation record.

REQUIREMENT: The consumer's audit persistence layer MUST reject `SignableTemporalContext` records that fail `validateSignableTemporalContext()`. The rejection MUST be logged as a validation failure event with the `SignatureValidationError` details, the identity of the signer (if available), and the operation context.

**Non-GxP deployments:** The validation utility is available but not required. Non-GxP consumers may use `SignableTemporalContext` without validation if electronic signature compliance is not a regulatory concern.

**Multi-timezone deployment requirement:** The `wallClockTimestamp` in `TemporalContext` is a UTC epoch value (milliseconds since 1970-01-01T00:00:00Z). It has no timezone information embedded.

REQUIREMENT: In multi-timezone GxP deployments (e.g., manufacturing sites across multiple countries), consumers MUST include the local timezone offset as a separate field alongside `TemporalContext` in their audit entries. This enables auditors to reconstruct local wall-clock time for regulatory review without ambiguity. Without the local timezone offset, auditors reviewing records from a site in UTC+9 cannot determine the local time of the event, which may be required by local regulatory authorities. For example:

```typescript
interface MultiTimezoneAuditEntry {
  readonly temporal: TemporalContext;
  readonly localTimezoneOffsetMinutes: number; // e.g., -300 for EST (UTC-5)
  // ... other attribution fields
}
```

This is a consumer composition responsibility, consistent with `TemporalContext`'s single responsibility as a temporal-only structure.

### Data Archival and Backup Requirements (ALCOA+ Enduring, 21 CFR 211.180)

ALCOA+ Enduring requires that records remain intact and retrievable throughout the required retention period. 21 CFR 211.180 requires that records be retained for at least 1 year after the expiry date of the product batch to which they relate. The following requirements apply to audit trail records containing clock-derived timestamps from `@hex-di/clock`.

REQUIREMENT: GxP organizations MUST define and document a data archival policy for audit trail records containing `TemporalContext`, `OverflowTemporalContext`, and `ClockDiagnostics` data in their computerized system validation plan. The policy MUST address:

1. **Retention period**: Minimum retention of the product lifecycle plus the applicable regulatory retention period (typically 1 year post-expiry for pharmaceuticals per 21 CFR 211.180, or as specified by the relevant national authority).
2. **Backup frequency**: Audit trail records MUST be backed up at a frequency commensurate with the acceptable data loss window. For GxP batch records, real-time or near-real-time replication is RECOMMENDED.
3. **Backup verification**: Backup integrity MUST be verified periodically (RECOMMENDED: monthly) by restoring a sample of archived records and confirming they are readable, parseable against the `TemporalContext` JSON schema, and match the original data.
4. **Media durability**: Archived records MUST be stored on media with a documented lifespan exceeding the retention period. Organizations MUST plan for media migration before end-of-life.
5. **Format preservation**: Archived `TemporalContext` records MUST include the `schemaVersion` field (see `audit-trail-integration.md` serialization schemas). When `@hex-di/clock` schema versions evolve, organizations MUST maintain the ability to deserialize records archived under previous schema versions.
6. **Disaster recovery**: At least one backup copy MUST be stored in a geographically separate location from the primary data store to protect against site-level failures (fire, flood, infrastructure outage).
7. **Restoration testing**: Organizations MUST test the full restoration procedure at least annually, including verifying that restored `TemporalContext` records can be deserialized, that sequence number ordering is preserved, and that `ClockDiagnostics` metadata is intact.

REQUIREMENT: Audit trail records MUST NOT be modified after creation. If correction is necessary (e.g., annotating a record with investigation findings), the correction MUST be appended as a separate linked record preserving the original record intact (ALCOA+ Original). The corrective record MUST include its own `TemporalContext` capturing when the correction was made.

REQUIREMENT: When migrating archived audit trail records to a new storage system or format, the migration MUST be documented, validated, and approved through the organization's change control process. The migration record MUST include: source and target systems, migration date, record count verification, sample integrity verification results, and approver signature.

**`@hex-di/clock` scope boundary:** The clock library produces temporal data (`TemporalContext` objects); it does not persist, backup, or archive them. All archival, backup, disaster recovery, and restoration testing responsibilities fall on the consumer and the deployment infrastructure. `@hex-di/clock` supports archival by providing primitive, trivially serializable values and versioned JSON schemas that ensure long-term readability.
