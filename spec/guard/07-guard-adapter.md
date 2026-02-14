# 07 - Guard Adapter

<!-- Document Control
| Property         | Value                                    |
|------------------|------------------------------------------|
| Document ID      | GUARD-07                                 |
| Revision         | 1.0                                      |
| Effective Date   | 2026-02-13                               |
| Author           | HexDI Engineering                        |
| Reviewer         | GxP Compliance Review                    |
| Approved By      | Technical Lead, Quality Assurance Manager |
| Classification   | GxP Functional Specification             |
| Change History   | 1.0 (2026-02-13): Initial controlled release |
-->

_Previous: [06 - Subject](./06-subject.md)_

---

## 25. guard() Function

The `guard()` function wraps an existing adapter with authorization enforcement. The wrapped adapter provides the same port but requires the original dependencies PLUS `PolicyEnginePort`, `SubjectProviderPort`, and `AuditTrailPort`. The policy check happens synchronously inside the factory, before the original factory is called.

### Signature

```typescript
/**
 * Wraps an adapter with authorization enforcement.
 *
 * The returned adapter:
 * 1. Requires the same ports as the original PLUS PolicyEngine, SubjectProvider, and AuditTrail
 * 2. Before invoking the original factory, evaluates the provided policy
 * 3. If the policy denies, throws AccessDeniedError
 * 4. If the policy allows, delegates to the original factory
 * 5. After evaluation, records the decision to AuditTrailPort
 *
 * @typeParam A - The adapter type (fully inferred)
 * @param adapter - The adapter to wrap
 * @param options - Object with `resolve` (policy for resolve-time checks)
 * @returns A new adapter with the same provides but augmented requires
 */
/**
 * A map of method names to their per-method authorization policies.
 *
 * When present in guard options, method-level policies override the
 * adapter-level `resolve` policy for specific method invocations.
 */
export type MethodPolicyMap<TKeys extends string = string> = Readonly<
  Partial<Record<TKeys, PolicyConstraint>>
>;

export function guard<A extends AdapterConstraint>(
  adapter: A,
  options: {
    readonly resolve: PolicyConstraint;
    readonly methodPolicies?: MethodPolicyMap;
  }
): GuardedAdapter<A>;
```

### AuditTrail Types

```typescript
/**
 * Service interface for recording authorization audit entries.
 *
 * Every guard() evaluation (both allow and deny) is recorded through
 * this interface. Production implementations write to a database,
 * log stream, or external audit service. Non-regulated environments
 * can use NoopAuditTrail.
 *
 * **GxP Contract:** In regulated environments, implementations MUST:
 * 1. Use append-only storage (no UPDATE or DELETE on persisted entries)
 * 2. Guarantee atomic writes (complete entry or nothing)
 * 3. Record ALL evaluations (no filtering, sampling, or dropping)
 * 4. Use NTP-synchronized timestamps
 *
 * See 17-gxp-compliance/02-audit-trail-contract.md section 61 for the full behavioral contract.
 */
interface AuditTrail {
  /**
   * Records an audit entry. Returns Ok(undefined) on success, or
   * Err(AuditTrailWriteError) if the record could not be persisted.
   *
   * **Durability tiers:** The meaning of Ok depends on the adapter's durability tier:
   * - **Durable Ok:** Entry is synchronously committed to durable storage (survives crash).
   * - **Buffered Ok:** Entry is accepted into an in-memory buffer; durability depends on
   *   async flush. WAL is REQUIRED when gxp: true to recover buffered entries after crash.
   * See 17-gxp-compliance/02-audit-trail-contract.md section 61.3a for the full durability tier specification.
   *
   * **Synchronous contract:** This method returns `Result`, not `Promise<Result>`.
   * The guard wrapper is synchronous by design (see "Synchronous by Design" below).
   * For network-backed adapters, the RECOMMENDED pattern is to write synchronously
   * to an in-memory buffer and flush asynchronously to the backing store. See
   * 17-gxp-compliance/02-audit-trail-contract.md section 61 for the full buffering and crash recovery guidance.
   *
   * **Error handling with `failOnAuditError`:**
   * - When `failOnAuditError` is `true` (default, required for GxP): a failed
   *   `record()` causes the guard to throw `AuditTrailWriteError` (ACL008),
   *   blocking the resolution entirely. This ensures every authorization decision
   *   has a corresponding audit record per 21 CFR 11.10(e).
   * - When `failOnAuditError` is `false` (explicit opt-in for non-regulated
   *   environments): a failed `record()` logs a warning but does NOT block
   *   the authorization decision.
   *
   * In both cases, audit write failures (ACL008) in GxP environments are
   * compliance incidents that MUST trigger operational alerts.
   */
  record(entry: AuditEntry): Result<void, AuditTrailWriteError>;
}

/**
 * A single audit trail entry recording an authorization decision.
 *
 * All fields are readonly and use string-based identifiers and timestamps
 * for maximum portability and serialization compatibility.
 *
 * Required fields capture the full provenance of every authorization decision.
 * Optional fields support GxP-regulated environments requiring tamper detection
 * and electronic signatures. See 17-gxp-compliance.md for implementation guidance.
 */
interface AuditEntry {
  // ── Required Fields ─────────────────────────────────────────────

  /** UUID v4, matches Decision.evaluationId. Uniquely identifies this evaluation. */
  readonly evaluationId: string;
  /** ISO 8601 UTC timestamp of when the decision was recorded. Must use NTP-synchronized clock in production. */
  readonly timestamp: string;
  /** The subject's unique identifier. */
  readonly subjectId: string;
  /** How the subject authenticated (from AuthSubject.authenticationMethod). */
  readonly authenticationMethod: string;
  /** The policy label/name that was evaluated. */
  readonly policy: string;
  /** The authorization decision outcome. */
  readonly decision: "allow" | "deny";
  /** The port name that was being resolved. */
  readonly portName: string;
  /** The scope ID in which the resolution occurred. */
  readonly scopeId: string;
  /** Human-readable reason for the decision. Empty string for Allow decisions. */
  readonly reason: string;
  /** Evaluation duration in milliseconds. */
  readonly durationMs: number;
  /**
   * Schema version of this AuditEntry structure. Current version: 1.
   *
   * Enables forward-compatible deserialization: consumers check schemaVersion
   * before processing and can gracefully reject entries from newer versions
   * they do not understand. Included in hash chain computation to prevent
   * cross-version chain splicing.
   * Reference: ALCOA+ Consistent.
   */
  readonly schemaVersion: number;

  // ── Optional GxP Fields ─────────────────────────────────────────

  /**
   * Compact digest of the evaluation trace tree for audit review.
   *
   * Format: `policyLabel[verdict]` for leaf nodes, with `>` separating
   * parent from children in composite policies.
   *
   * Examples:
   * - Simple: `hasPermission(user:read)[allow]`
   * - Composite: `allOf[deny] > hasPermission(user:read)[allow], hasRole(admin)[deny]`
   * - Nested: `allOf[deny] > anyOf[allow] > hasRole(admin)[allow], hasRole(editor)[skip], not[deny] > hasPermission(admin:all)[allow]`
   */
  readonly traceDigest?: string;
  /** Chained hash for tamper detection (SHA-256 of previous entry + current fields). */
  readonly integrityHash?: string;
  /** Hash of the previous audit entry, forming a hash chain. Empty string for genesis entry. */
  readonly previousHash?: string;
  /**
   * The hash algorithm used to compute integrityHash (e.g., "sha256", "hmac-sha256", "sha3-256").
   *
   * Enables algorithm-agnostic verification throughout the retention period.
   * When integrityHash is present, this field SHOULD also be present so verifiers
   * can select the correct algorithm without external metadata.
   * Reference: 21 CFR 11.10(c), 17-gxp-compliance/02-audit-trail-contract.md section 61.4.
   */
  readonly hashAlgorithm?: string;
  /** Electronic signature for 21 CFR Part 11 compliance. */
  readonly signature?: ElectronicSignature;
  /** Monotonically increasing sequence number within a scope for gap detection and concurrent write ordering. */
  readonly sequenceNumber?: number;
  /** Git SHA or content hash of the policy definition at evaluation time. Enables change-control traceability. */
  readonly policySnapshot?: string;
}
```

```
REQUIREMENT: GxP audit trail adapters MUST populate ALL optional fields on AuditEntry
             (traceDigest, integrityHash, previousHash, hashAlgorithm, signature,
             sequenceNumber, policySnapshot) and MUST set schemaVersion to the
             current version (1). Use the GxPAuditEntry strict subtype
             to enforce this at compile time. Omitting any field in a GxP environment
             violates ALCOA+ completeness requirements.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

```typescript
/**
 * Strict subtype of AuditEntry for GxP-regulated environments.
 *
 * In non-regulated environments, `integrityHash`, `previousHash`, and
 * `signature` are optional on AuditEntry. GxPAuditEntry makes them
 * required, giving GxP adapter implementations compile-time guarantees
 * that these fields are always populated.
 *
 * See ADR #26 (15-appendices.md) for rationale on the subtype approach.
 */
interface GxPAuditEntry extends AuditEntry {
  /** Compact digest of the evaluation trace. Always populated in GxP environments. */
  readonly traceDigest: string;
  /** Chained hash for tamper detection (SHA-256). Always populated in GxP environments. */
  readonly integrityHash: string;
  /** Hash of the previous audit entry (empty string for genesis). Always populated in GxP environments. */
  readonly previousHash: string;
  /**
   * The hash algorithm used to compute integrityHash (e.g., "sha256", "hmac-sha256", "sha3-256").
   *
   * Required in GxP environments to enable self-contained, algorithm-agnostic verification
   * of audit entries without external metadata. Each entry carries its own algorithm identifier,
   * so verifiers can process entries across hash algorithm migration epochs (section 61.4).
   * Reference: 21 CFR 11.10(c).
   */
  readonly hashAlgorithm: string;
  /** Electronic signature for 21 CFR Part 11 compliance. Always populated in GxP environments. */
  readonly signature: ElectronicSignature;
  /** Monotonically increasing sequence number. Always populated in GxP environments. */
  readonly sequenceNumber: number;
  /** Git SHA or content hash of the policy definition at evaluation time. Always populated in GxP environments. */
  readonly policySnapshot: string;
}
```

```
REQUIREMENT: GxP audit trail adapters MUST use GxPAuditEntry (not AuditEntry) as the
             parameter type for their record() implementation. This provides compile-time
             enforcement that all integrity, signature, and traceability fields are
             populated. Using the base AuditEntry type in a GxP adapter allows optional
             fields to be silently omitted, which violates data integrity requirements.
             Reference: 21 CFR 11.10(e), ALCOA+ Completeness principle.
```

### AuditEntry Field Size Limits

To ensure consistent storage, indexing, and cross-system interoperability, AuditEntry fields have maximum size limits. These limits apply to all adapters and are enforced at the `record()` boundary.

| Field                  | Max Length | Format / Notes                                                 |
| ---------------------- | ---------- | -------------------------------------------------------------- |
| `evaluationId`         | 36 chars   | UUID v4 format (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`)        |
| `timestamp`            | 30 chars   | ISO 8601 UTC with optional sub-second precision                |
| `subjectId`            | 255 chars  | Identifier from identity provider                              |
| `authenticationMethod` | 64 chars   | e.g., `"password"`, `"smartcard"`, `"saml"`                    |
| `policy`               | 512 chars  | Policy label; composite policies use `>` separator             |
| `decision`             | 5 chars    | `"allow"` or `"deny"`                                          |
| `portName`             | 128 chars  | Port name string                                               |
| `scopeId`              | 36 chars   | UUID v4 format                                                 |
| `reason`               | 2048 chars | Human-readable; truncated with `…[truncated]` if exceeded      |
| `durationMs`           | —          | Numeric, no string length limit                                |
| `schemaVersion`        | —          | Numeric, no string length limit; current version: 1            |
| `traceDigest`          | 4096 chars | Compact trace; deeply nested policies may produce long digests |
| `integrityHash`        | 128 chars  | Hex-encoded hash value                                         |
| `previousHash`         | 128 chars  | Hex-encoded hash value (empty string for genesis)              |
| `hashAlgorithm`        | 32 chars   | Algorithm identifier (e.g., `"sha256"`, `"hmac-sha256"`)       |
| `sequenceNumber`       | —          | Numeric, no string length limit                                |
| `policySnapshot`       | 64 chars   | Git SHA (40) or content hash                                   |
| `signature.signerId`   | 255 chars  | Matches `subjectId` constraints                                |
| `signature.signedAt`   | 30 chars   | ISO 8601 UTC                                                   |
| `signature.meaning`    | 64 chars   | e.g., `"reviewed"`, `"approved"`, `"authored"`                 |
| `signature.value`      | 1024 chars | Base64 or hex-encoded cryptographic value                      |
| `signature.algorithm`  | 32 chars   | Algorithm identifier                                           |
| `signature.signerName` | 255 chars  | Human-readable name from identity provider                     |

> **Note:** All field size limits are measured in Unicode code points (not bytes). Adapter storage schemas MUST accommodate the maximum code point count multiplied by the maximum bytes-per-code-point for their storage encoding (e.g., 4 bytes for UTF-8).

```
REQUIREMENT: AuditTrail.record() MUST validate that all string fields conform to the
             maximum lengths defined in the table above. Fields exceeding their maximum
             length MUST be handled as follows:
             - reason: Truncate to 2048 characters with "…[truncated]" suffix appended.
               A WARNING-level log entry MUST be emitted when truncation occurs,
               including the original length and the truncated length.
               The original full-length reason MUST be preserved in a supplementary
               log or overflow store if available.
             - All other fields: Return Err(AuditTrailWriteError) with a message
               identifying the field name and actual vs. maximum length. Do NOT
               silently truncate identifier or cryptographic fields, as this would
               corrupt data integrity.
             Reference: EU GMP Annex 11 §6 (data accuracy checks), ALCOA+ Legible.

REQUIREMENT: GxP audit trail adapter storage schemas (database columns, event fields)
             MUST accommodate the maximum lengths defined above. Schema migrations
             that reduce column widths below these maximums MUST be treated as
             compliance-impacting changes requiring change control review.
             Reference: EU GMP Annex 11 §10 (data storage), §11 (printouts).
```

### AuditTrailPort

```typescript
/**
 * Port for the audit trail service.
 *
 * This is a well-known outbound port. The guard() wrapper injects
 * this dependency to record every authorization decision for
 * compliance and audit purposes.
 */
export const AuditTrailPort = createPort<"AuditTrail", AuditTrail>({
  name: "AuditTrail",
  direction: "outbound",
  category: "infrastructure",
  description: "Records authorization decisions for audit compliance",
});
```

### QueryableAuditTrail

For GxP environments requiring audit trail review capabilities, the `QueryableAuditTrail` interface extends the append-only `AuditTrail` with query methods.

```typescript
/**
 * Extended audit trail interface with query capabilities.
 *
 * The base AuditTrail is write-only (append-only). QueryableAuditTrail
 * adds read operations for audit review, compliance reporting, and
 * cross-correlation with HTTP audit entries (http-client spec section 97).
 */
interface QueryableAuditTrail extends AuditTrail {
  /**
   * Query audit entries matching the given criteria.
   *
   * @param filter - Query filter (all fields optional, AND semantics)
   * @returns Matching entries ordered by sequenceNumber ascending
   */
  readonly query: (
    filter: AuditQueryFilter
  ) => Result<ReadonlyArray<AuditEntry>, AuditTrailReadError>;

  /**
   * Retrieve a single audit entry by its evaluationId.
   *
   * @param evaluationId - The UUID of the evaluation to look up
   * @returns The matching entry, or Err if not found
   */
  readonly getByEvaluationId: (evaluationId: string) => Result<AuditEntry, AuditTrailReadError>;

  /**
   * Retrieve all audit entries for a given scope.
   *
   * @param scopeId - The scope identifier
   * @returns All entries in the scope, ordered by sequenceNumber
   */
  readonly getByScope: (scopeId: string) => Result<ReadonlyArray<AuditEntry>, AuditTrailReadError>;
}

interface AuditQueryFilter {
  readonly subjectId?: string;
  readonly decision?: "allow" | "deny";
  readonly portName?: string;
  readonly scopeId?: string;
  readonly fromTimestamp?: string;
  readonly toTimestamp?: string;
  readonly limit?: number;
  readonly offset?: number;
}

interface AuditTrailReadError {
  readonly code: "ACL015";
  readonly message: string;
  readonly cause: unknown;
}
```

### FieldMaskContextPort

```typescript
/**
 * Field-level visibility mask produced by guard evaluation.
 *
 * When the Allow decision carries `visibleFields`, the guard wrapper
 * registers a FieldMaskContext in the current scope. Downstream adapters
 * can resolve this port to apply field-level filtering on responses.
 */
interface FieldMaskContext {
  /** The set of field names the subject is authorized to see. undefined means all fields visible. */
  readonly visibleFields: ReadonlySet<string> | undefined;
  /** The evaluationId from the guard evaluation, for audit correlation. */
  readonly evaluationId: string;
}

/**
 * Outbound port providing field-level visibility mask from guard evaluation.
 *
 * Registered in the scope when the Allow decision carries visibleFields.
 * Downstream adapters resolve this to apply field masking.
 */
export const FieldMaskContextPort = createPort<"FieldMaskContext", FieldMaskContext>({
  name: "FieldMaskContext",
  direction: "outbound",
  category: "infrastructure",
  description: "Provides field-level visibility mask from guard evaluation",
});
```

### ElectronicSignature

```typescript
/**
 * Electronic signature for 21 CFR Part 11 compliance.
 *
 * Captures who signed, when, the meaning of the signature,
 * the cryptographic value, and the algorithm used.
 */
interface ElectronicSignature {
  /** Unique identifier of the signer (e.g., user ID). */
  readonly signerId: string;
  /** ISO 8601 UTC timestamp (with "Z" designator) of when the signature was applied. */
  readonly signedAt: string;
  /** The meaning or reason for the signature (e.g., "reviewed", "approved", "authored"). */
  readonly meaning: string;
  /** The cryptographic signature value (e.g., HMAC-SHA256 digest). */
  readonly value: string;
  /** The algorithm used to produce the signature (e.g., "HMAC-SHA256", "RSA-SHA256"). */
  readonly algorithm: string;
  /**
   * The signer's printed (human-readable) name at the time of signing.
   *
   * Supports 21 CFR 11.50 manifestation requirements: signed records must display
   * the printed name of the signer, the date/time of signing, and the meaning.
   * When populated, the audit trail display layer can render the signer's name
   * directly without resolving signerId through an external identity provider.
   *
   * Optional in non-regulated environments. GxP adapters MUST populate this
   * field during signature capture by resolving signerId via their identity provider.
   * When `gxp: true` and `signature` is present, `signerName` MUST be a non-empty string.
   */
  readonly signerName?: string;
  /**
   * Whether the signer re-authenticated before signing (21 CFR Part 11 section 11.100).
   *
   * In the guard workflow, this is always `true` because `capture()` requires a valid
   * `ReauthenticationToken`. It may be `false` for signatures imported from external
   * systems or legacy records where re-authentication status is unknown.
   */
  readonly reauthenticated: boolean;
  /**
   * Identifier of the key used to produce this signature.
   *
   * Enables correct key routing during verification after key rotation:
   * when old keys are in verify-only state and new keys are active,
   * validate() uses keyId to select the correct key for verification.
   *
   * Optional in non-regulated environments. GxP adapters MUST populate
   * this field to support post-rotation signature verification and
   * key revocation checks.
   */
  readonly keyId?: string;
}
```

```
REQUIREMENT: ElectronicSignature.signedAt MUST use ISO 8601 UTC format with the "Z"
             designator. Consumer adapters that receive signatures from external
             systems MUST normalize the signedAt value to UTC before persisting.
             Reference: ALCOA+ Contemporaneous principle, 21 CFR 11.50.

REQUIREMENT: In GxP environments, ElectronicSignature.reauthenticated MUST be true
             for all new signatures captured through the guard workflow. Signatures
             with reauthenticated=false are only acceptable for records imported from
             external systems or legacy data where re-authentication status is unknown.
             Reference: 21 CFR 11.100(a), 11.100(b).

REQUIREMENT: GxP adapters MUST populate ElectronicSignature.signerName during
             signature capture by resolving signerId through the site's identity
             provider. This enables direct manifestation of the signer's printed name
             per 21 CFR 11.50 without requiring external lookups at display time.

REQUIREMENT: When gxp: true and signature is present on a GxPAuditEntry, the
             signerName field MUST be a non-empty string. AuditTrail.record() MUST
             reject entries where signature.signerName is missing or empty with
             AuditTrailWriteError (ACL008). Reference: 21 CFR 11.50.
```

### SignatureService Interface

```typescript
/**
 * Service interface for electronic signature capture, validation,
 * and re-authentication.
 *
 * Consumer adapters implement the actual cryptography. Guard defines
 * the behavioral contract. This follows the same pattern as AuditTrailPort:
 * guard defines the port and types, consumers provide adapters.
 *
 * Required only when `hasSignature` policies are used in the policy tree.
 */
interface SignatureService {
  /**
   * Captures an electronic signature from the signer.
   *
   * The signer MUST have a valid ReauthenticationToken (i.e., they must
   * have re-authenticated within the token's validity window). If the
   * token is expired or missing, capture MUST return Err(SignatureError).
   *
   * @param request - The signature capture request
   * @returns Result containing the ElectronicSignature or a SignatureError
   */
  capture(request: SignatureCaptureRequest): Result<ElectronicSignature, SignatureError>;

  /**
   * Validates a previously captured signature.
   *
   * Verifies cryptographic integrity, binding integrity (the signature
   * is bound to the correct audit entry fields), and key status (the
   * signing key has not been revoked).
   *
   * @param signature - The signature to validate
   * @param entry - The audit entry fields the signature should be bound to
   * @returns Result containing the validation result or a SignatureError
   */
  validate(
    signature: ElectronicSignature,
    entry: Readonly<Record<string, unknown>>,
  ): Result<SignatureValidationResult, SignatureError>;
```

```
REQUIREMENT: The signature binding payload — the data passed as the `entry` parameter
             to SignatureService.validate() and signed during capture() — MUST consist
             of the following AuditEntry fields in alphabetical order, serialized as a
             pipe-delimited UTF-8 string (same delimiter as integrityHash):

             1. authenticationMethod
             2. decision
             3. durationMs          (String(value))
             4. evaluationId
             5. policySnapshot      ("" if undefined)
             6. portName
             7. reason
             8. schemaVersion       (String(value))
             9. scopeId
             10. sequenceNumber     (String(value))
             11. subjectId
             12. timestamp
             13. traceDigest        ("" if undefined)

             Excluded from the binding payload: integrityHash (computed after signing),
             previousHash (chain field, not record content), signature (self-referential),
             hashAlgorithm (infrastructure metadata).

             This canonical 13-field binding ensures deterministic signature verification
             across implementations and fulfills 21 CFR 11.70 (signatures linked to
             their respective records so they cannot be excised, copied, or transferred).
             Reference: 21 CFR 11.70, 21 CFR 11.10(a).
```

```typescript
  /**
   * Re-authenticates a signer before signature capture.
   *
   * Implements the two-component identification requirement of 11.100:
   * identification (signerId) + verification (credential).
   *
   * Returns a time-limited ReauthenticationToken on success.
   * Recommended token validity: 5 minutes.
   *
   * @param challenge - The re-authentication challenge
   * @returns Result containing a ReauthenticationToken or a SignatureError
   */
  reauthenticate(
    challenge: ReauthenticationChallenge,
  ): Result<ReauthenticationToken, SignatureError>;
}
```

```
REQUIREMENT: SignatureService.capture() MUST implement replay protection at two levels:
             1. Token replay: A consumed ReauthenticationToken.tokenValue MUST be
                rejected on subsequent capture() calls. See ReauthenticationToken
                Security Requirements above.
             2. Duplicate signature: A capture() request with the same combination
                of (evaluationId, signerId, meaning) as a previously captured signature
                MUST be rejected with SignatureError (category: "capture_failed") and
                a message indicating duplicate signature attempt. This prevents a
                single re-authentication from being used to produce multiple signatures
                for the same evaluation.
             Reference: 21 CFR 11.10(a), 11.100(a).
```

### Signature Supporting Types

```typescript
/**
 * Request to capture an electronic signature.
 */
interface SignatureCaptureRequest {
  /** The signer's unique identifier. */
  readonly signerId: string;
  /** The meaning of the signature (from SignatureMeanings). */
  readonly meaning: string;
  /** The re-authentication token proving the signer recently re-authenticated. */
  readonly reauthToken: ReauthenticationToken;
  /** The data to be signed (serialized audit entry fields). */
  readonly payload: string;
}

/**
 * Challenge for re-authentication before signing (11.100).
 *
 * Two-component identification: signerId (identification) +
 * credential (verification).
 */
interface ReauthenticationChallenge {
  /** The signer's unique identifier (identification component). */
  readonly signerId: string;
  /** The signer's credential (verification component). */
  readonly credential: string;
  /** The authentication method used (e.g., "password", "biometric", "smartcard"). */
  readonly method: string;
}
```

```
REQUIREMENT: The credential field MUST NOT appear in any log output, audit entry,
             error message, or diagnostic output. Consumer adapters MUST ensure that
             error messages from reauthenticate() do not include credential values.
             Reference: 21 CFR 11.300(c).

REQUIREMENT (when gxp: true) / RECOMMENDED (otherwise):
             Consumer adapters MUST minimize the lifetime of the credential string.
             The credential MUST NOT be stored in persistent state (fields, closures,
             caches); it MUST be used only for the immediate reauthenticate() call
             and released promptly. Reference: 21 CFR 11.300(c).

REQUIREMENT (when gxp: true) / RECOMMENDED (otherwise):
             Consumer adapters MUST implement at least two of the following mitigations
             for credential memory exposure (JavaScript strings are immutable and
             garbage-collected nondeterministically):
             (1) Avoid passing credential through intermediate variables or closures
             (2) Ensure production environments disable heap dump access for
                 non-privileged users
             (3) Use typed arrays (Uint8Array) for credential handling at the adapter
                 boundary, converting to string only at the immediate point of use
             (4) In high-security deployments, use native addons that perform explicit
                 memory clearing after credential verification
             The implemented mitigations MUST be documented in the adapter's OQ
             evidence as part of the credential handling assessment.
             Reference: 21 CFR 11.300(c), 11.10(a).
```

```typescript
/**
 * Time-limited token issued after successful re-authentication.
 *
 * The token carries the signer ID and an expiration timestamp.
 * Recommended validity window: 5 minutes.
 */
interface ReauthenticationToken {
  /** The signer who was re-authenticated. */
  readonly signerId: string;
  /** ISO 8601 timestamp when the token was issued. */
  readonly issuedAt: string;
  /** ISO 8601 timestamp when the token expires. */
  readonly expiresAt: string;
  /** Opaque token value for internal validation. */
  readonly tokenValue: string;
}

### ReauthenticationToken Security Requirements

```

REQUIREMENT: ReauthenticationToken.tokenValue MUST be generated using a
cryptographically secure pseudo-random number generator (CSPRNG).
Use crypto.getRandomValues() or crypto.randomBytes() on the
platform. Predictable token values enable replay attacks.

REQUIREMENT: ReauthenticationToken MUST be one-time-use and session-bound.
After a single successful capture() call consumes the token,
the same tokenValue MUST NOT be accepted again.

REQUIREMENT: ReauthenticationToken MUST NOT be stored in plaintext on disk
(file system, database, logs). If persistence is required for
distributed deployments, encrypt at rest.

REQUIREMENT: ReauthenticationToken MUST NOT be transmitted in plaintext
over the network. If the token must cross a network boundary,
use TLS or an equivalent encrypted transport.

REQUIREMENT: The SignatureService adapter MUST implement replay protection.
A consumed tokenValue MUST be rejected with SignatureError
(category: "reauth_expired") if presented a second time.

```

Implementation guidance:

- **Single-process deployments:** Track consumed tokens in an in-memory `Set<string>`. Evict entries after `expiresAt` passes (they are expired anyway).
- **Distributed deployments:** Use Redis `SETNX` with TTL matching the token validity window, or a Memcached equivalent. The key is the tokenValue; existence means "already consumed."

```

RECOMMENDED: Organizations SHOULD implement one of the following concrete replay
protection patterns based on their deployment model. Each pattern
guarantees that a consumed tokenValue is rejected on subsequent
capture() calls.

````

**Pattern 1: Single-process with lazy TTL eviction**

```typescript
// In-memory replay protection for single-process deployments
const consumedTokens = new Map<string, number>(); // tokenValue -> expiresAt (epoch ms)

function consumeToken(tokenValue: string, expiresAt: string): boolean {
  // Lazy eviction: remove expired entries on each call
  const now = Date.now();
  for (const [key, expiry] of consumedTokens) {
    if (expiry <= now) consumedTokens.delete(key);
  }
  // Reject if already consumed
  if (consumedTokens.has(tokenValue)) return false;
  // Mark as consumed
  consumedTokens.set(tokenValue, new Date(expiresAt).getTime());
  return true;
}
````

**Pattern 2: Distributed via Redis atomic set**

```
// Redis-based replay protection for distributed deployments
// SET tokenValue "consumed" NX EX <ttl_seconds>
// Returns OK if set (token not previously consumed), null if already consumed
const result = await redis.set(tokenValue, "consumed", { NX: true, EX: tokenTtlSeconds });
if (result === null) {
  // Token already consumed — reject
  return err({ code: "ACL009", category: "reauth_expired", message: "Token already consumed" });
}
```

**Pattern 3: Database with UNIQUE constraint**

```sql
-- Schema: consumed_tokens table
CREATE TABLE consumed_tokens (
  token_value VARCHAR(256) PRIMARY KEY,
  consumed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  TIMESTAMP NOT NULL
);

-- Consume: INSERT fails on duplicate (UNIQUE constraint violation = already consumed)
INSERT INTO consumed_tokens (token_value, expires_at) VALUES ($1, $2);

-- Scheduled cleanup: remove expired entries (e.g., hourly cron)
DELETE FROM consumed_tokens WHERE expires_at < CURRENT_TIMESTAMP;
```

### Signer Identity Verification

> **Regulatory References:** 21 CFR 11.100 (general requirements for electronic signatures), 21 CFR 11.300(a) (controls for identification codes/passwords — each combination uniquely identifies one individual).

```
REQUIREMENT: capture() MUST verify that reauthToken.signerId === request.signerId.
             A ReauthenticationToken issued for signer A MUST NOT be accepted
             for a capture request from signer B. Mismatched signer IDs MUST
             return Err(SignatureError) with category "reauth_failed" and a
             message indicating the signer identity mismatch.
```

/\*\*

- Result of validating an electronic signature.
  _/
  interface SignatureValidationResult {
  /\*\* Whether the cryptographic signature is valid. _/
  readonly valid: boolean;
  /** Whether the signature is bound to the correct data. \*/
  readonly bindingIntact: boolean;
  /** Whether the signing key is still active (not revoked). _/
  readonly keyActive: boolean;
  /\*\* Human-readable validation summary. _/
  readonly summary: string;
  }

/\*\*

- Error from signature operations (capture, validate, reauthenticate).
  \*/
  interface SignatureError {
  readonly code: "ACL009";
  readonly message: string;
  readonly category:
  | "capture_failed"
  | "validation_failed"
  | "reauth_failed"
  | "reauth_expired"
  | "key_revoked"
  | "binding_broken"
  | "missing_service";
  }

````

### SignatureServicePort

```typescript
/**
 * Optional outbound port for the electronic signature service.
 *
 * Direction: outbound
 * Category: compliance
 * Lifetime: singleton
 *
 * Unlike AuditTrailPort (which is mandatory for all guard() calls),
 * SignatureServicePort is **optional** -- it is only required when
 * the policy tree contains `hasSignature` policies.
 *
 * If a `hasSignature` policy is evaluated but SignatureServicePort is
 * not in the graph, the guard wrapper uses NoopSignatureService which
 * returns Err for all operations with a GxP warning.
 */
export const SignatureServicePort = createPort<"SignatureService", SignatureService>({
  name: "SignatureService",
  direction: "outbound",
  category: "compliance",
  description: "Electronic signature capture, validation, and re-authentication",
});
````

### NoopSignatureServiceAdapter

```typescript
/**
 * Default adapter when no SignatureService is configured.
 *
 * All operations return Err(SignatureError) with category "missing_service".
 * This ensures that hasSignature policies always deny when no real
 * signature service is registered, preventing accidental bypass.
 *
 * @warning **GxP Warning:** This adapter cannot capture or validate signatures.
 * For 21 CFR Part 11 compliance, provide a real SignatureService adapter that
 * implements cryptographic signature operations.
 */
const NoopSignatureService: SignatureService = {
  capture(_request: SignatureCaptureRequest): Result<ElectronicSignature, SignatureError> {
    return err({
      code: "ACL009",
      message:
        "No SignatureService configured. Register a SignatureService adapter to use hasSignature policies.",
      category: "missing_service",
    });
  },
  validate(
    _signature: ElectronicSignature,
    _entry: Readonly<Record<string, unknown>>
  ): Result<SignatureValidationResult, SignatureError> {
    return err({
      code: "ACL009",
      message: "No SignatureService configured. Cannot validate signatures.",
      category: "missing_service",
    });
  },
  reauthenticate(
    _challenge: ReauthenticationChallenge
  ): Result<ReauthenticationToken, SignatureError> {
    return err({
      code: "ACL009",
      message: "No SignatureService configured. Cannot re-authenticate.",
      category: "missing_service",
    });
  },
};

export function createNoopSignatureServiceAdapter(): Adapter<typeof SignatureServicePort>;
```

```
REQUIREMENT: When gxp is true and the policy tree contains any hasSignature policy,
             createGuardGraph() MUST verify that a real SignatureServicePort adapter
             (not NoopSignatureService) is registered. If no real adapter is found,
             createGuardGraph() MUST throw a ConfigurationError with code ACL011 and
             message indicating which hasSignature policy requires the service. The
             NoopSignatureService fallback MUST NOT be used silently in GxP mode.
             Reference: 21 CFR 11.50, 21 CFR 11.100.
```

### Audit Record Integrity

For GxP-regulated environments, the audit trail supports tamper detection via chained hashing:

1. **Genesis entry:** The first audit record has `previousHash: ""` and `integrityHash` computed as `SHA-256([evaluationId, timestamp, subjectId, authenticationMethod, policy, decision, portName, scopeId, reason, String(durationMs), String(schemaVersion), String(sequenceNumber ?? 0), traceDigest ?? "", policySnapshot ?? "", ""].join("|"))`. The pipe delimiter prevents field-boundary ambiguity (see 17-gxp-compliance/02-audit-trail-contract.md section 61.4 for the HMAC-SHA256 option).
2. **Subsequent entries:** Each entry's `integrityHash` is `SHA-256([evaluationId, timestamp, subjectId, authenticationMethod, policy, decision, portName, scopeId, reason, String(durationMs), String(schemaVersion), String(sequenceNumber ?? 0), traceDigest ?? "", policySnapshot ?? "", previousHash].join("|"))` where `previousHash` is the `integrityHash` of the preceding entry.
3. **Verification:** To verify integrity, replay the chain from genesis and confirm each `integrityHash` matches the recomputed value. A mismatch indicates tampering.
4. **Electronic signatures** are optional and independent of hash chaining. When present, the `signature.value` is computed over the serialized entry fields using the specified algorithm.

> **Note:** Integrity hashing and electronic signatures are optional. They are present only when the `AuditTrail` adapter populates them. Non-regulated environments using `NoopAuditTrail` or simple audit adapters omit these fields entirely.

```
REQUIREMENT: AuditEntry.schemaVersion MUST be set to the current schema version (1)
             for all new entries. Hash chain computation MUST include
             String(entry.schemaVersion) in the pipe-delimited field list.
             Consumers deserializing audit entries MUST check schemaVersion before
             processing. Entries with an unrecognized schemaVersion MUST be rejected
             with an AuditEntryParseError (ACL014). This prevents cross-version chain
             splicing and ensures forward-compatible deserialization.
             Reference: ALCOA+ Consistent, 21 CFR 11.10(c).
```

### Clock Source

```typescript
/**
 * ISO 8601 bridge over `ClockPort.wallClockNow()` from `@hex-di/clock`.
 *
 * `ClockSource.now()` converts the epoch-millisecond value returned by
 * `ClockPort.wallClockNow()` to an ISO 8601 UTC string. The bridge is
 * created by `createClockSourceBridge()` (spec/clock/07-integration.md §24).
 *
 * Production code uses SystemClock (Date-based) as a standalone fallback.
 * Tests inject a fixed or controllable clock for deterministic timestamps.
 *
 * See 17-gxp-compliance/03-clock-synchronization.md section 62 for guard-specific
 * timestamp fields and ordering. See spec/clock/06-gxp-compliance/ntp-synchronization.md
 * section 18 for NTP synchronization requirements.
 */
interface ClockSource {
  /** Returns the current time as an ISO 8601 UTC string. */
  now(): string;
}

/**
 * Default clock source using the system clock.
 *
 * Uses `new Date().toISOString()` which produces ISO 8601 UTC timestamps.
 * In production GxP environments, ensure the host system runs NTP
 * (chrony, ntpd, or cloud-provider time synchronization).
 */
const SystemClock: ClockSource = {
  now(): string {
    return new Date().toISOString();
  },
};
```

The guard wrapper uses the clock source for `AuditEntry.timestamp` and `Decision.evaluatedAt`. The clock source is configurable in `createGuardGraph()`:

```typescript
export function createGuardGraph(options: {
  readonly subjectAdapter: Adapter<typeof SubjectProviderPort>;
  readonly auditTrailAdapter: Adapter<typeof AuditTrailPort>;
  readonly clock?: ClockSource;
  /** Optional. Only needed when hasSignature policies are used. */
  readonly signatureAdapter?: Adapter<typeof SignatureServicePort>;
  /**
   * Whether to throw AuditTrailWriteError (ACL008) when audit trail
   * write fails. Default: true.
   *
   * - true (default): Throw AuditTrailWriteError, failing the resolution.
   *   This is the safe default per 21 CFR 11.10(e) completeness requirement:
   *   every authorization decision MUST have a corresponding audit record.
   *   Required for GxP-regulated environments where a missing audit record
   *   is a compliance violation.
   *
   * - false (explicit opt-in): Log a warning but allow resolution to proceed.
   *   Suitable for non-regulated environments where audit availability
   *   should not block application functionality. Setting this to false
   *   requires a conscious decision to accept incomplete audit trails.
   */
  readonly failOnAuditError?: boolean;
}): GraphFragment;
```

> **GxP Note:** The default value of `failOnAuditError` is `true` to comply with 21 CFR 11.10(e), which requires complete, unbroken audit trails. Non-regulated environments may set this to `false` as an explicit opt-in to weaker audit guarantees.

```
REQUIREMENT: When gxp is true, failOnAuditError MUST be true. Setting
             failOnAuditError: false with gxp: true MUST produce a compile-time
             type error (via the overload signature above that constrains
             failOnAuditError to true | undefined). If a runtime check detects
             this invalid combination (e.g., via dynamic configuration), the
             createGuardGraph() function MUST throw a ConfigurationError with
             code "ACL011" and a message stating that GxP mode requires
             failOnAuditError to be true.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

When `clock` is omitted, `SystemClock` is used. When `signatureAdapter` is omitted and `hasSignature` policies are in the tree, `NoopSignatureService` is used (all operations return `Err`). When `failOnAuditError` is `true` (default), an `AuditTrailWriteError` (ACL008) is thrown, preventing the guarded adapter from resolving — this ensures every authorization decision has a corresponding audit record. When `failOnAuditError` is `false`, audit write failures are logged as warnings but do not block resolution — this is an explicit opt-in for non-regulated environments.

### Data Retention and Archival

Audit records have recommended retention periods based on regulatory requirements:

| Record Type           | Minimum Retention             | Rationale                                                             |
| --------------------- | ----------------------------- | --------------------------------------------------------------------- |
| Allow decisions       | 1 year                        | Operational audit — demonstrates authorized access patterns           |
| Deny decisions        | 3 years                       | Security audit — tracks unauthorized access attempts                  |
| Electronic signatures | Lifetime of the signed record | 21 CFR Part 11 §11.50 — signatures must remain bound to their records |
| Integrity hash chains | Lifetime of the audit trail   | Breaking the chain invalidates subsequent verification                |

> **Note:** These are recommended minimums. Specific regulations (21 CFR Part 11, EU GMP Annex 11, SOX) may impose longer retention periods. Consult your compliance team for site-specific requirements.

```
REQUIREMENT: GxP audit trail adapters MUST enforce retention periods that meet or
             exceed the jurisdiction-specific minimums defined in 17-gxp-compliance/04-data-retention.md
             section 63. The minimums in the table above are mandatory for GxP
             environments — the adapter MUST NOT delete, archive-without-access, or
             otherwise make records unavailable before the applicable retention period
             expires. Adapters MUST map each record type to a retention policy and
             document the mapping as part of the site's data governance framework.
             Reference: 21 CFR 11.10(c), EU GMP Annex 11 §17, ALCOA+ Enduring.
```

The `AuditTrail` adapter is responsible for implementing retention policies. The guard library does not enforce retention — it only produces records.

### NoopAuditTrail

The `AuditTrailPort` is a **mandatory dependency** of every `guard()` wrapper. The port MUST always be provided in the graph. However, the adapter implementation varies by environment:

- **GxP-regulated:** Use a persistent adapter (database, event store, file system)
- **Non-regulated:** Use `createNoopAuditTrailAdapter()` as an explicit opt-in to discarding records

This design ensures that every graph containing guarded adapters explicitly addresses audit trail concerns. There is no silent default.

```typescript
/**
 * Built-in adapter for non-regulated environments.
 *
 * Implements the AuditTrail interface but intentionally discards
 * all entries. Use this when audit trail recording is not required
 * (e.g., development, non-GxP applications).
 *
 * @warning **GxP Warning:** This adapter discards ALL audit records.
 * Do NOT use in GxP-regulated environments where 21 CFR Part 11
 * or EU GMP Annex 11 audit trail requirements apply. Use a persistent
 * AuditTrail adapter that satisfies the append-only, atomic-write,
 * and completeness requirements in 17-gxp-compliance/02-audit-trail-contract.md section 61.
 */
const NoopAuditTrail: AuditTrail = {
  record(_entry: AuditEntry): Result<void, AuditTrailWriteError> {
    return ok(undefined);
  },
};
```

```typescript
/**
 * Creates a NoopAuditTrail adapter for explicit opt-in to silent audit trail.
 *
 * This is the only way to satisfy AuditTrailPort without persisting records.
 * The explicit factory call forces a conscious decision to discard audit data,
 * which is appropriate for development and non-regulated production environments.
 *
 * @warning **GxP Warning:** This adapter discards ALL audit records silently.
 * Do NOT use in GxP-regulated environments where 21 CFR Part 11 or
 * EU GMP Annex 11 audit trail requirements apply.
 *
 * @returns An adapter providing AuditTrailPort with NoopAuditTrail
 */
export function createNoopAuditTrailAdapter(): Adapter<typeof AuditTrailPort>;
```

```
REQUIREMENT: When gxp is true, createGuardGraph() MUST reject NoopAuditTrail at
             compile time. The type-level overload for gxp: true uses a conditional
             type on auditTrailAdapter that excludes the return type of
             createNoopAuditTrailAdapter(). Attempting to pass a NoopAuditTrail
             adapter with gxp: true MUST produce a compile-time error.

REQUIREMENT: As a defense-in-depth measure, createGuardGraph() MUST also perform
             a runtime check when gxp is true. If the provided auditTrailAdapter
             is detected as a NoopAuditTrail instance (via a branded type marker
             or adapter name check), the function MUST throw a ConfigurationError
             with code "ACL012" and a message stating that NoopAuditTrail is not
             permitted in GxP mode. This catches dynamic configuration scenarios
             where the type system cannot enforce the constraint.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

### Write-Ahead Log (WAL) Types

The WAL provides crash recovery between `evaluate()` and `record()`. When `gxp: true`, the WAL is mandatory.

```
REQUIREMENT: When gxp is true, walStore MUST be provided to createGuardGraph().
             The type-level overload for gxp: true makes walStore a required
             (non-optional) property. Omitting walStore with gxp: true MUST
             produce a compile-time type error. Without a WAL, a crash between
             evaluate() and record() loses the audit entry, violating the
             completeness requirement of 21 CFR 11.10(e).
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9, 17-gxp-compliance/02-audit-trail-contract.md
             section 61.
```

```typescript
/**
 * A write-ahead log intent capturing the evaluation about to occur.
 *
 * Written BEFORE evaluate() runs. Marked "completed" after successful
 * AuditTrail.record(). Orphaned "pending" intents indicate a crash
 * between evaluation and audit write.
 */
interface WalIntent {
  /** UUID v4, pre-generated to match the evaluationId. */
  readonly evaluationId: string;
  /** The port being resolved under guard. */
  readonly portName: string;
  /** The subject initiating the evaluation. */
  readonly subjectId: string;
  /** ISO 8601 timestamp of when the intent was created. */
  readonly timestamp: string;
  /**
   * "pending" until audit write succeeds, then "completed".
   * "evaluation_failed" if the evaluation itself threw an error
   * (distinct from a clean Deny decision).
   */
  readonly status: "pending" | "completed" | "evaluation_failed";
}

/**
 * Durable storage for write-ahead log intents.
 *
 * Implementations MUST persist intents to durable storage (file system
 * with fsync, database with transactional guarantees) — not in-memory.
 * An in-memory WAL cannot survive the process crash it is designed to mitigate.
 */
interface WalStore {
  /** Write an intent before evaluation begins. */
  writeIntent(intent: WalIntent): Result<void, WalError>;
  /** Mark an intent as completed after successful audit write. */
  markCompleted(evaluationId: string): Result<void, WalError>;
  /** Retrieve all pending (non-completed) intents for crash recovery. */
  getPendingIntents(): Result<ReadonlyArray<WalIntent>, WalError>;
}
```

> **Synchronous Write Semantics:** `WalStore.writeIntent()` returns `Result<void, WalError>` synchronously to align with the guard wrapper's synchronous execution model (the guard evaluation must not proceed until the intent is durably recorded). File-system implementations SHOULD use synchronous write APIs (e.g., `fs.writeFileSync` with `O_SYNC` or `O_DSYNC` flags) to ensure durability before the function returns. Database-backed implementations SHOULD pre-initialize connections at construction time so that `writeIntent()` can issue a synchronous transactional write without asynchronous connection setup. The durability mechanism used by a `WalStore` implementation SHOULD be documented in the adapter's design specification and verified during OQ (section 67b) to confirm that intents survive process crash. Reference: 21 CFR 11.10(e), ALCOA+ Complete.

```typescript
/**
 * Error from WAL operations.
 */
interface WalError {
  readonly code: "ACL010";
  readonly message: string;
  readonly cause: unknown;
}

/**
 * Creates a WAL-wrapping audit trail that writes intent records
 * before delegating to the inner AuditTrail.
 *
 * The returned AuditTrail:
 * 1. Calls walStore.writeIntent() with a "pending" intent
 * 2. Delegates to inner.record()
 * 3. On success, calls walStore.markCompleted()
 * 4. On inner failure, the intent remains "pending" for crash recovery
 *
 * @param inner - The actual AuditTrail adapter to delegate to
 * @param walStore - The durable WAL storage
 * @returns An AuditTrail with WAL crash recovery
 */
function createWalAuditTrail(inner: AuditTrail, walStore: WalStore): AuditTrail;
```

### Hash Chain Concurrency Model

The hash chain (section 61.4 / Audit Record Integrity above) requires sequential writes to maintain the `previousHash` chain. When multiple evaluations occur concurrently within the same scope, the following concurrency model applies:

```
REQUIREMENT: Audit trail writes within a single scope MUST be serialized to maintain
             hash chain integrity. Concurrent evaluations in the same scope MUST
             acquire an exclusive lock (mutex) or use a sequential queue before
             computing integrityHash and calling AuditTrail.record(). This ensures
             that previousHash always references the immediately preceding entry.
             Cross-scope writes are independent and MAY proceed concurrently.
             Reference: ALCOA+ Complete, Consistent.
```

The RECOMMENDED implementation pattern is a per-scope async queue:

1. Each scope maintains a `Promise` chain for audit writes
2. New writes chain onto the previous write's `Promise` (serial execution)
3. The queue is scoped to the DI scope lifetime (garbage collected with the scope)
4. Cross-scope writes have no ordering dependency and proceed independently

### Method-Level Policy Evaluation

When a guarded adapter exposes multiple methods (e.g., `UserRepository.findById()`, `UserRepository.create()`), each method-level policy evaluation produces its own `AuditEntry`. This provides granular audit tracing:

- The `portName` field in the `AuditEntry` includes the method name: `"UserRepository.findById"`, `"UserRepository.create"`
- Each method evaluation gets a unique `evaluationId`
- The scope-level `sequenceNumber` increments for each method call within the scope

This means a single HTTP request that calls three guarded methods produces three audit entries, each traceable to the same scope via `scopeId`.

### WAL Recovery Lifecycle

On application startup, the WAL recovery process handles orphaned intents from previous crashes:

1. **Scan**: Call `walStore.getPendingIntents()` to find all intents with status `"pending"`
2. **Classify**: For each pending intent:
   - Check if the corresponding `AuditEntry` exists in the audit trail (the crash may have occurred after the write but before `markCompleted`)
   - If the entry exists: call `walStore.markCompleted(evaluationId)` to reconcile
   - If the entry does not exist: the evaluation was interrupted; mark the intent as `"evaluation_failed"`
3. **Report**: Log the recovery summary: N intents reconciled, M intents marked as failed
4. **Alert**: If any intents are marked `"evaluation_failed"`, log a WARNING indicating potential missing audit entries. In GxP mode, these SHOULD trigger an investigation per the incident classification matrix (section 68).

```
RECOMMENDED: WAL recovery SHOULD run automatically during container creation
             (createContainer / createGuardGraph). The recovery scan SHOULD complete
             before the container accepts resolution requests. This ensures that
             orphaned intents are reconciled before new evaluations begin.
```

### Synchronous by Design

The guard wrapper is synchronous. This is a critical architectural decision (architecture-review #3):

1. **Subject is pre-resolved.** The `SubjectProviderPort` returns the subject synchronously (it was cached when the scope was created).
2. **Policy evaluation is synchronous.** The `evaluate()` function operates on in-memory data only.
3. **Synchronous guard preserves lifetimes.** If the guard were async, scoped and transient adapters would need async factories, forcing singleton lifetime. This defeats the purpose of per-request authorization.

### Usage

```typescript
import { guard, hasPermission, hasRole, allOf } from "@hex-di/guard";

// Wrap an adapter with a simple permission check
const GuardedUserRepo = guard(UserRepoAdapter, {
  resolve: hasPermission(ReadUser),
});

// Wrap with a complex composed policy
const GuardedPaymentService = guard(PaymentServiceAdapter, {
  resolve: allOf(hasPermission(ProcessPayment), hasRole("admin")),
});

// Use in graph builder
const graph = createGraphBuilder()
  .provide(GuardedUserRepo)
  .provide(GuardedPaymentService)
  .provide(SubjectProviderAdapter)
  .provide(PolicyEngineAdapter)
  .provide(AuditTrailAdapter)
  .build();
```

## 26. Type Transformation

The `GuardedAdapter<A>` type preserves all adapter type parameters except `TRequires` and `TRequiresTuple`, which gain the ACL infrastructure ports.

### GuardedAdapter Type

```typescript
/**
 * Type transformation applied by guard() to an adapter.
 *
 * Preserves provides, lifetime, factoryKind, and clonability.
 * Augments requires with PolicyEnginePort, SubjectProviderPort,
 * and AuditTrailPort, deduplicating any that already exist.
 *
 * @typeParam TAdapter - The adapter type to guard
 */
export type GuardedAdapter<TAdapter> =
  TAdapter extends Adapter<
    infer TProvides,
    infer _TRequires,
    infer TLifetime,
    infer TFactoryKind,
    infer TClonable,
    infer TRequiresTuple extends readonly Port<unknown, string>[]
  >
    ? Adapter<
        TProvides,
        TupleToUnion<AppendAclPorts<TRequiresTuple>>,
        TLifetime,
        TFactoryKind,
        TClonable,
        AppendAclPorts<TRequiresTuple>
      >
    : NotAnAdapterError<TAdapter>;
```

### AppendAclPorts with Deduplication

```typescript
/**
 * Tuple of ACL infrastructure ports that guard() injects.
 */
type AclPorts = readonly [
  typeof PolicyEnginePort,
  typeof SubjectProviderPort,
  typeof AuditTrailPort,
  typeof FieldMaskContextPort,
];

/**
 * Checks if a port name is already present in a port tuple.
 */
type HasPortNamed<
  TTuple extends readonly Port<unknown, string>[],
  TName extends string,
> = TTuple extends readonly [
  infer THead extends Port<unknown, string>,
  ...infer TRest extends readonly Port<unknown, string>[],
]
  ? InferPortName<THead> extends TName
    ? true
    : HasPortNamed<TRest, TName>
  : false;

/**
 * Appends ACL ports to a requires tuple, skipping duplicates.
 *
 * For each ACL port, checks if a port with the same name already
 * exists in the original requires tuple. If so, it is not added.
 */
type AppendAclPorts<
  TOriginal extends readonly Port<unknown, string>[],
  TToAdd extends readonly Port<unknown, string>[] = AclPorts,
> = TToAdd extends readonly [
  infer THead extends Port<unknown, string>,
  ...infer TRest extends readonly Port<unknown, string>[],
]
  ? HasPortNamed<TOriginal, InferPortName<THead> & string> extends true
    ? AppendAclPorts<TOriginal, TRest>
    : AppendAclPorts<readonly [...TOriginal, THead], TRest>
  : TOriginal;
```

### Type Transformation Examples

```typescript
// Input adapter:
//   Adapter<UserRepoPort, DbPort, 'scoped', 'sync', false, readonly [DbPort]>
//
// Output type:
//   Adapter<UserRepoPort, DbPort | PolicyEnginePort | SubjectProviderPort | AuditTrailPort,
//           'scoped', 'sync', false,
//           readonly [DbPort, PolicyEnginePort, SubjectProviderPort, AuditTrailPort]>

// No overlap: all ACL ports added
type R1 = AppendAclPorts<readonly [DbPort]>;
// readonly [DbPort, typeof PolicyEnginePort, typeof SubjectProviderPort, typeof AuditTrailPort]

// PolicyEnginePort already present: only SubjectProviderPort and AuditTrailPort added
type R2 = AppendAclPorts<readonly [DbPort, typeof PolicyEnginePort]>;
// readonly [DbPort, typeof PolicyEnginePort, typeof SubjectProviderPort, typeof AuditTrailPort]

// All already present: nothing added
type R3 = AppendAclPorts<
  readonly [typeof PolicyEnginePort, typeof SubjectProviderPort, typeof AuditTrailPort]
>;
// readonly [typeof PolicyEnginePort, typeof SubjectProviderPort, typeof AuditTrailPort]
```

### Preserved Properties

| Property          | Preserved? | Notes                                        |
| ----------------- | ---------- | -------------------------------------------- |
| `provides`        | Yes        | Same port as the original adapter            |
| `requires`        | Augmented  | Original requires + ACL ports (deduplicated) |
| `lifetime`        | Yes        | Scoped, singleton, or transient unchanged    |
| `factoryKind`     | Yes        | Sync or async unchanged                      |
| `clonable`        | Yes        | Clonability unchanged                        |
| Port service type | Yes        | `resolve(port)` returns the same type        |

## 27. Requires Deduplication

### The Problem

If an adapter already requires `PolicyEnginePort` (e.g., because it was guarded previously or because it directly depends on the policy engine), `guard()` must not add it again. The `createAdapter` factory validates no duplicate ports in requires (`"ERROR[HEX017]: Duplicate port in requires array."`), so naively concatenating would throw.

### Solution: Union Deduplication

**At the type level,** union types automatically deduplicate:

```typescript
type Combined = DbPort | PolicyEnginePort | SubjectProviderPort | AuditTrailPort | PolicyEnginePort;
// Equivalent to: DbPort | PolicyEnginePort | SubjectProviderPort | AuditTrailPort
```

**At the runtime level,** `AppendAclPorts` checks `HasPortNamed` before adding each port. The runtime implementation mirrors this:

```typescript
function deduplicateRequires(
  original: readonly PortConstraint[],
  toAdd: readonly PortConstraint[]
): readonly PortConstraint[] {
  const existingNames = new Set(original.map(p => p.__portName));
  const filtered = toAdd.filter(p => !existingNames.has(p.__portName));
  return [...original, ...filtered];
}
```

### Double-Guard Scenario

```typescript
// First guard
const GuardedOnce = guard(UserRepoAdapter, { resolve: policyA });
// requires: [DbPort, PolicyEnginePort, SubjectProviderPort, AuditTrailPort]

// Second guard -- does NOT double the ACL ports
const GuardedTwice = guard(GuardedOnce, { resolve: policyB });
// requires: [DbPort, PolicyEnginePort, SubjectProviderPort, AuditTrailPort]
// (PolicyEnginePort, SubjectProviderPort, and AuditTrailPort already present -- not added again)
```

### Prefer Composition Over Nesting

While double-guarding works, the recommended approach is to compose policies rather than nest guards:

```typescript
// PREFERRED: compose policies
const Guarded = guard(UserRepoAdapter, {
  resolve: allOf(policyA, policyB),
});

// WORKS BUT DISCOURAGED: nested guards
const Guarded = guard(guard(UserRepoAdapter, { resolve: policyA }), { resolve: policyB });
```

The composed approach:

1. Evaluates the policy tree once (not twice)
2. Produces a single trace tree (not two separate traces)
3. Avoids the type complexity of nested `GuardedAdapter<GuardedAdapter<A>>`

## 28. Guard Factory Behavior

### Execution Flow

When a guarded adapter's factory is invoked during resolution:

```
1. Container calls the guarded factory
2. Factory resolves SubjectProviderPort -> gets AuthSubject
3. Factory resolves PolicyEnginePort -> gets PolicyEngine
3a. If policy tree contains hasSignature nodes:
    Factory resolves SignatureServicePort -> gets SignatureService (or NoopSignatureService)
    For EACH distinct meaning required by hasSignature nodes in the policy tree:
      a. Invoke SignatureService.reauthenticate() for the signer
      b. Invoke SignatureService.capture() with the ReauthenticationToken
      c. Validate the captured signature via SignatureService.validate()
      d. Append the ValidatedSignature to the signatures array
    Each meaning triggers an independent re-authentication cycle.
    Construct EvaluationContext with signatures array populated from SignatureService
3b. [GxP only] Execute validateGxPSubject() (defined in 06-subject.md §22):
    If validation fails (subject is anonymous or has empty subjectId):
      - Skip policy evaluation entirely
      - Record AuditEntry with decision "deny", reason "GxP subject validation
        failed: anonymous or unidentified subject", error code ACL014
      - Throw AccessDeniedError immediately
    If validation succeeds: proceed with the branded GxPAuthSubject
4. PolicyEngine.evaluate(policy, { subject, signatures? }) -> Result<Decision, Error>
5. Record decision to AuditTrailPort (BEFORE throwing or proceeding):
   Factory resolves AuditTrailPort -> gets AuditTrail
   Construct AuditEntry from Decision (all required fields populated):
     evaluationId, timestamp, subjectId, authenticationMethod,
     policy, decision, portName, scopeId, reason, durationMs
   AuditTrail.record(entry) -> Result<void, AuditTrailWriteError>
   If Err and failOnAuditError is true (default): throw AuditTrailWriteError (ACL008), failing the resolution
   If Err and failOnAuditError is false (explicit opt-in): log warning via logger (if available), do NOT block resolution
6a. If Ok(Allow):
    If the Allow decision carries visibleFields, register a FieldMaskContext
    in the scope with the visible fields set and evaluationId.
    Call the original adapter's factory, return service
6b. If Ok(Deny): throw AccessDeniedError
6c. If Err from step 4: throw PolicyEvaluationError (wrapped)
```

> **Note:** Audit recording (step 5) happens BEFORE the allow/deny action (step 6). This ensures that denied attempts are always recorded, even if the `AccessDeniedError` is caught and suppressed by the consumer.

```
REQUIREMENT: When gxp is true, validateGxPSubject() (defined in 06-subject.md §22)
             MUST be executed before policy evaluation. If validation fails (subject
             is anonymous or has empty subjectId), the guard MUST:
             (a) Return Deny immediately without invoking the policy evaluator.
             (b) Record an AuditEntry with decision "deny", reason "GxP subject
                 validation failed: anonymous or unidentified subject", and
                 error code ACL014.
             (c) NOT invoke the SignatureService or any downstream policy logic.
             This pre-evaluation gate ensures that anonymous subjects cannot
             reach the policy evaluator in GxP environments, satisfying the
             ALCOA+ Attributable principle at the earliest possible point in
             the evaluation pipeline.
             Reference: 21 CFR 11.10(d), ALCOA+ Attributable.
```

### Operational Log Event Schema

All WARNING and INFO log events emitted by the guard pipeline (rate limiting activation, scope expiry, clock drift, audit write failure, field truncation, WAL recovery) conform to the structured `GuardOperationalEvent` schema defined in Appendix R (15-appendices.md). This schema provides consistent event typing for SIEM ingestion and alerting.

```
REQUIREMENT: When the logger integration is active (section 34), all guard operational
             events MUST be emitted as structured JSON objects conforming to the
             GuardOperationalEvent schema (Appendix R). The _tag field is the primary
             event type discriminant. Each event MUST include timestamp, severity,
             source ("hex-di/guard"), and category fields.
             Reference: EU GMP Annex 11 §9, PIC/S PI 011-3 §6.3.
```

### AccessDeniedError

The guard throws `AccessDeniedError` from the factory (architecture-review #12). This integrates with the existing container error model:

```typescript
// resolve() throws -- the AccessDeniedError is wrapped in FactoryError
try {
  const service = scope.resolve(GuardedUserRepoPort);
} catch (error) {
  // error is FactoryError with cause: AccessDeniedError
}

// tryResolve() returns Result
const result = scope.tryResolve(GuardedUserRepoPort);
if (result.isErr()) {
  // result.error is ContainerError (FactoryError wrapping AccessDeniedError)
}
```

### Port Service Type Unchanged

The guard does NOT change the port's service type. `resolve(UserRepoPort)` returns `UserRepository`, not `Result<UserRepository, AccessDeniedError>`. Authorization denial is a resolution failure, like `FactoryError` or `CircularDependencyError`. Users who want Result-based handling use `tryResolve()`.

### Response Sanitization for End Users

```
RECOMMENDED: The full Decision object and evaluation trace are valuable for server-side
             logging and debugging but SHOULD NOT be exposed directly in API responses
             to end users. The trace may reveal internal policy structure, permission
             names, role hierarchies, and subject attributes that an attacker could use
             to map the authorization model and craft targeted privilege escalation
             attempts.
             Reference: OWASP Authorization Testing Guide (OTG-AUTHZ), CWE-209
             (Generation of Error Message Containing Sensitive Information).

RECOMMENDED: API handlers SHOULD catch AccessDeniedError, log the full Decision
             server-side (including trace and reason), and return a sanitized response
             to the client. The sanitized response SHOULD include only the evaluationId
             for client-server correlation and a generic denial message.
```

Example sanitization pattern:

```typescript
// Server-side API handler
app.get("/users", async ctx => {
  try {
    const userRepo = scope.resolve(GuardedUserRepoPort);
    ctx.body = await userRepo.findAll();
  } catch (error) {
    if (error.cause instanceof AccessDeniedError) {
      const decision = error.cause.decision;
      // Log full decision server-side for debugging and audit
      logger.warn("guard.api.deny", {
        evaluationId: decision.evaluationId,
        subject: decision.subjectId,
        port: "UserRepository",
        reason: decision.reason,
        trace: decision.trace,
      });
      // Return sanitized 403 to client
      ctx.status = 403;
      ctx.body = {
        error: "Forbidden",
        evaluationId: decision.evaluationId,
      };
      return;
    }
    throw error;
  }
});
```

```
RECOMMENDED: In GxP environments, sanitized API responses SHOULD still include
             the evaluationId so that end users and support teams can reference
             specific denials in audit trail queries and incident reports. The
             evaluationId is a UUID v4 that does not leak policy structure.
```

### Emergency Access ("Break Glass") Pattern

For critical situations where normal authorization rules must be overridden (e.g., emergency patient care, system recovery), the guard library supports an emergency access pattern using policy composition:

```
RECOMMENDED: Implement emergency access ("break glass") using policy composition
             rather than bypassing the guard entirely. This preserves the audit trail
             and ensures that emergency access is subject to the same recording and
             traceability requirements as normal access.
             Reference: EU GMP Annex 11 Section 12, PIC/S PI 011-3 Section 9.5.
```

Example break-glass policy pattern:

```typescript
import { guard, hasPermission, hasAttribute, hasSignature, anyOf, allOf, eq } from "@hex-di/guard";

// Normal access: subject has the required permission
const normalAccess = hasPermission(PatientPerms.write);

// Emergency access: subject has emergency override attribute AND
// provides an emergency_override electronic signature
const emergencyAccess = allOf(
  hasAttribute("emergencyOverride", eq(true)),
  hasSignature("emergency_override")
);

// Combined policy: normal access OR emergency access
const patientWritePolicy = anyOf(normalAccess, emergencyAccess);

const GuardedPatientRepo = guard(PatientRepoAdapter, {
  resolve: patientWritePolicy,
});
```

```
REQUIREMENT: Emergency access AuditEntry records MUST include: (a) the evaluation
             trace showing that the emergency path was taken (the traceDigest will
             show the anyOf > emergencyAccess path), (b) the electronic signature
             with meaning "emergency_override" including a justification reason in
             the signature payload, and (c) the full subject identity and
             authentication method. These fields are already captured by the
             standard guard audit mechanism — no special emergency audit handling
             is needed provided the policy is composed as shown above.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.

REQUIREMENT: Emergency access events MUST be flagged for mandatory review within
             24 hours per the incident classification matrix (17-gxp-compliance/10-risk-assessment.md
             section 68). The review MUST assess whether the emergency was justified
             and whether normal access controls should be restored.
             Reference: PIC/S PI 011-3 Section 9.5.

RECOMMENDED: Emergency access events SHOULD trigger an immediate alert to the
             compliance team via the site's operational alerting infrastructure.
             The alert SHOULD include the evaluationId, subjectId, portName,
             and timestamp to facilitate rapid review.

RECOMMENDED: Organizations SHOULD document their break-glass procedure in the
             validation plan (17-gxp-compliance/09-validation-plan.md section 67), including: (a) the
             criteria for invoking emergency access, (b) the personnel authorized
             to use emergency access, (c) the review and closeout procedure, and
             (d) the mechanism for revoking the emergencyOverride attribute after
             the emergency concludes.
```

### Time-Based Access Control Pattern

For deployments requiring temporal restrictions (e.g., business hours only, maintenance windows, regulatory cutoff dates), the guard library supports time-based access control using `hasAttribute` with time-attribute matchers:

```
RECOMMENDED: Implement time-based access restrictions using hasAttribute policies
             with resource context populated by application middleware. The
             middleware SHOULD obtain the current time from the NTP-synchronized
             ClockSource (17-gxp-compliance/03-clock-synchronization.md section 62) to ensure temporal
             consistency with audit trail timestamps.
             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

Example time-restricted policy pattern:

```typescript
import { guard, hasPermission, hasAttribute, allOf, inValues } from "@hex-di/guard";

// Restrict batch release approvals to business hours (8:00-17:59 UTC)
const businessHoursOnly = hasAttribute(
  "currentHour",
  inValues([8, 9, 10, 11, 12, 13, 14, 15, 16, 17])
);

// Combined policy: must have permission AND be within business hours
const batchReleasePolicy = allOf(hasPermission(BatchPerms.release), businessHoursOnly);

const GuardedBatchService = guard(BatchServiceAdapter, {
  resolve: batchReleasePolicy,
});
```

> **Resource context population:** The `currentHour` attribute is populated by application middleware that reads from `ClockSource.now()` and extracts the UTC hour. This ensures that time-based decisions are synchronized with the same clock source used for audit trail timestamps (section 62 of 17-gxp-compliance/03-clock-synchronization.md). Organizations SHOULD document their time-attribute population strategy in the validation plan.

### createGuardGraph Helper

Because guarded adapters require `PolicyEnginePort`, `SubjectProviderPort`, and `AuditTrailPort`, users must provide adapters for these ports in their graph. The `createGuardGraph` helper bundles the default infrastructure:

```typescript
/**
 * Creates a graph fragment with the default guard infrastructure adapters.
 *
 * Includes:
 * - PolicyEngineAdapter (default evaluator)
 * - AuditTrailAdapter (user-provided; use createNoopAuditTrailAdapter() for non-regulated environments)
 * - A SubjectProviderAdapter slot (user must provide their own)
 *
 * @param options - Configuration including the subject adapter and audit trail adapter
 * @returns A graph fragment to merge into the application graph
 */
export function createGuardGraph(options: {
  readonly subjectAdapter: Adapter<typeof SubjectProviderPort>;
  readonly auditTrailAdapter: Adapter<typeof AuditTrailPort>;
  readonly clock?: ClockSource;
  readonly signatureAdapter?: Adapter<typeof SignatureServicePort>;
  /** Default: true. Set to false for non-regulated environments. */
  readonly failOnAuditError?: boolean;
  /**
   * When true, enforces GxP-grade controls:
   * - walStore is required (type error if omitted)
   * - NoopAuditTrail is rejected at the type level
   * - WAL crash recovery is mandatory
   * - All RECOMMENDED crash recovery patterns become REQUIREMENTS
   */
  readonly gxp?: boolean;
  /**
   * Required when gxp is true. WAL store for crash recovery between
   * evaluation and audit write. Must be backed by durable storage.
   */
  readonly walStore?: WalStore;
  /**
   * Maximum scope lifetime in milliseconds. When a scope exceeds this
   * duration, guard evaluations within it return ScopeExpiredError (ACL013).
   *
   * Required when gxp is true. Prevents stale permissions from persisting
   * indefinitely in long-lived scopes (e.g., WebSocket connections, background
   * workers). The subject's permissions may have been revoked since scope
   * creation; this limit forces re-authentication and fresh subject resolution.
   *
   * Recommended values: 30 minutes (1_800_000) for interactive sessions,
   * 5 minutes (300_000) for batch processing scopes.
   */
  readonly maxScopeLifetimeMs?: number;
  /**
   * Maximum number of guard evaluations permitted per second across all
   * scopes. When the rate is exceeded, the guard returns
   * RateLimitExceededError (ACL015) without evaluating the policy.
   *
   * Rate-limited evaluations are NOT recorded in the audit trail because
   * the evaluation never occurred. A WARNING-level log entry is emitted.
   *
   * This protects against denial-of-service via evaluation flooding.
   */
  readonly maxEvaluationsPerSecond?: number;
}): GraphFragment;
```

**Type-level GxP enforcement:** When `gxp: true`, the type system enforces:

```typescript
// Overload: gxp: true requires walStore, maxScopeLifetimeMs and rejects NoopAuditTrail
export function createGuardGraph(options: {
  readonly subjectAdapter: Adapter<typeof SubjectProviderPort>;
  readonly auditTrailAdapter: Adapter<typeof AuditTrailPort>; // NoopAuditTrail rejected via conditional type
  readonly clock?: ClockSource;
  readonly signatureAdapter?: Adapter<typeof SignatureServicePort>;
  readonly failOnAuditError?: true; // Must be true (or omitted, defaulting to true) in GxP mode
  readonly gxp: true;
  readonly walStore: WalStore; // Required, not optional
  readonly maxScopeLifetimeMs: number; // Required in GxP mode
  readonly maxEvaluationsPerSecond: number; // Required in GxP mode (FM-20 mitigation)
}): GraphFragment;
```

When `gxp: true`, the `auditTrailAdapter` type uses a conditional type that excludes the `NoopAuditTrail` adapter. Attempting to pass `createNoopAuditTrailAdapter()` with `gxp: true` produces a compile-time error.

### Usage

```typescript
// Non-regulated environment (unchanged)
const guardGraph = createGuardGraph({
  subjectAdapter: createSubjectAdapter(() => currentSubject),
  auditTrailAdapter: createNoopAuditTrailAdapter(), // Explicit opt-in to no-op audit trail
  failOnAuditError: false, // Non-regulated: opt-in to weaker audit guarantees
});

// GxP-regulated environment with WAL
const gxpGuardGraph = createGuardGraph({
  subjectAdapter: createSubjectAdapter(() => currentSubject),
  auditTrailAdapter: createPostgresAuditTrailAdapter(pool), // Real adapter required
  gxp: true,
  walStore: createFileWalStore("/var/data/guard-wal"), // Durable WAL required
});

const graph = createGraphBuilder()
  .merge(guardGraph)
  .provide(GuardedUserRepo)
  .provide(GuardedPaymentService)
  .build();
```

### createGuardHealthCheck

A runtime canary function that evaluates a known policy against a canary subject, writes to the audit trail, and verifies hash chain integrity over the most recent entries. Designed for scheduled execution (e.g., daily cron) to detect silent degradation of the guard pipeline before it impacts production evaluations.

````typescript
/**
 * Configuration for a guard health check.
 */
interface GuardHealthCheckConfig {
  /** A policy that produces a deterministic outcome for the canary subject. */
  readonly canaryPolicy: Policy;
  /** A synthetic subject used for the health check evaluation. */
  readonly canarySubject: AuthSubject;
  /** The expected outcome of evaluating canaryPolicy against canarySubject. */
  readonly expectedOutcome: "allow" | "deny";
  /** The audit trail adapter to test responsiveness. */
  readonly auditTrail: AuditTrail;
  /** Scope ID for the health check chain verification. */
  readonly scopeId: string;
  /** Number of recent chain entries to verify (default: 10). */
  readonly chainDepth?: number;
  /** Optional NTP server hostname for clock drift measurement (e.g., "pool.ntp.org"). */
  readonly ntpServer?: string;
}

/**
 * Result of a guard health check.
 */
interface GuardHealthCheckResult {
  /** True if the canary policy evaluated to the expected outcome. */
  readonly policyEvaluationOk: boolean;
  /** True if the audit trail accepted the canary entry without error. */
  readonly auditTrailResponsive: boolean;
  /** True if the most recent `chainDepth` entries pass hash chain verification. */
  readonly chainIntegrityOk: boolean;
  /** True if clock drift is within tolerance (< 1 second from NTP reference). Null if NTP check was not configured. */
  readonly clockDriftOk: boolean | null;
  /** Measured clock drift in milliseconds. Null if NTP check was not configured. */
  readonly clockDriftMs: number | null;
  /** ISO 8601 UTC timestamp of when the health check was performed. */
  readonly checkedAt: string;
  /** Number of chain entries verified. */
  readonly chainEntriesVerified: number;
  /** Storage utilization percentage (0-100) from the most recent capacity check. Null if capacity monitoring is not configured. */
  readonly storageUtilizationPct: number | null;
  /** Capacity status from the most recent capacity check. Null if capacity monitoring is not configured. */
  readonly capacityStatus: "ok" | "warning" | "critical" | "emergency" | null;
}

/**
 * Error returned when the health check itself fails to execute.
 */
interface GuardHealthCheckError {
  readonly code: "HEALTH_CHECK_FAILED";
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Performs a runtime health check of the guard pipeline.
 *
 * Steps:
 * 1. Evaluates canaryPolicy against canarySubject.
 * 2. Compares the result to expectedOutcome.
 * 3. Writes a canary audit entry via auditTrail.record().
 * 4. Verifies the hash chain for the most recent `chainDepth` entries in the specified scope.
 * 5. Optionally queries an NTP server (if `ntpServer` is configured) to measure clock drift.
 *
 * @returns Ok(GuardHealthCheckResult) on successful execution (even if sub-checks fail),
 *          Err(GuardHealthCheckError) if the health check itself cannot execute.
 *
 * @example
 * ```typescript
 * const result = createGuardHealthCheck({
 *   canaryPolicy: hasPermission(canaryPermission),
 *   canarySubject: { id: "health-check", roles: [], permissions: new Set(["canary:read"]),
 *     attributes: {}, authenticationMethod: "system", authenticatedAt: new Date().toISOString() },
 *   expectedOutcome: "allow",
 *   auditTrail: productionAuditTrail,
 *   scopeId: "health-check-scope",
 *   chainDepth: 10,
 * });
 * ```
 */
function createGuardHealthCheck(
  config: GuardHealthCheckConfig
): Result<GuardHealthCheckResult, GuardHealthCheckError>;
````

```
RECOMMENDED: When gxp is true, the `ntpServer` field in GuardHealthCheckConfig SHOULD
             be configured with the site's NTP reference server. Health checks executed
             without NTP drift measurement in a GxP environment emit a WARNING-level log
             indicating that clock drift cannot be verified programmatically. The
             `clockDriftOk` field in the result will be null, and `checkGxPReadiness()`
             item 10 will report "warn" for unverifiable clock drift monitoring.
             Reference: ALCOA+ Contemporaneous, 21 CFR 11.10(e).
```

### Scope Lifetime Enforcement

When `maxScopeLifetimeMs` is configured, the guard wrapper checks the scope's age before every evaluation. If the scope has exceeded its maximum lifetime, the guard returns `ScopeExpiredError` without evaluating the policy.

```typescript
/**
 * Error returned when a guard evaluation is attempted in an expired scope.
 *
 * The subject's permissions may have changed since scope creation.
 * The caller must create a new scope with a fresh subject.
 */
interface ScopeExpiredError {
  readonly code: "ACL013";
  readonly message: string;
  /** The scope ID that has expired. */
  readonly scopeId: string;
  /** How long the scope has been alive, in milliseconds. */
  readonly elapsedMs: number;
  /** The configured maximum scope lifetime, in milliseconds. */
  readonly maxLifetimeMs: number;
}
```

```
REQUIREMENT: When maxScopeLifetimeMs is configured, the guard wrapper MUST check the
             scope's elapsed time (using the configured ClockSource) before every policy
             evaluation. If elapsedMs >= maxScopeLifetimeMs, the guard MUST return
             Err(ScopeExpiredError) with code ACL013 without evaluating the policy.
             The ScopeExpiredError MUST NOT be recorded in the audit trail because no
             evaluation occurred. A WARNING-level log entry MUST be emitted including
             the scopeId, elapsedMs, and maxLifetimeMs.
             Reference: 21 CFR 11.10(d) (limiting system access), ALCOA+ Attributable.

REQUIREMENT: When gxp is true, maxScopeLifetimeMs MUST be provided in
             createGuardGraph() options. Omitting it when gxp is true produces a
             compile-time type error and a runtime ConfigurationError (ACL011).
             This prevents stale scope permissions from persisting indefinitely in
             GxP environments, where revoked access must take effect promptly.
             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.4.
```

### Session Revocation Hooks

The `maxScopeLifetimeMs` setting provides a ceiling on scope duration, but it does not address the case where a subject's session is terminated before the scope expires (e.g., logout, forced session invalidation by an administrator, or account suspension). Session revocation provides prompt access removal rather than waiting for the scope to naturally expire.

```typescript
/**
 * Hook interface for receiving session revocation notifications.
 *
 * When a subject's session is terminated (logout, admin revocation,
 * account suspension), the consumer's session management system
 * invokes this hook to immediately invalidate all guard scopes
 * associated with that session.
 */
interface SessionRevocationHook {
  /**
   * Called when a session is revoked. Implementations MUST dispose all
   * guard scopes associated with the given sessionId.
   *
   * @param sessionId - The session identifier being revoked
   */
  onSessionRevoked(sessionId: string): void;
}
```

```
RECOMMENDED: Consumer adapters SHOULD implement a SessionRevocationHook that
             invalidates active guard scopes when a subject's session is terminated.
             The hook receives the sessionId and disposes all scopes associated with
             that session. This provides prompt access removal that complements the
             maxScopeLifetimeMs ceiling — revocation handles immediate termination
             while maxScopeLifetimeMs handles the case where revocation is not
             triggered (e.g., session timeout without explicit logout).

REQUIREMENT: When gxp is true and the AuthSubject includes a sessionId field,
             scope disposal upon session revocation MUST be immediate — meaning
             within the next evaluation cycle. Any guard evaluation attempted on a
             scope whose associated session has been revoked MUST return
             Err(ScopeExpiredError) with code ACL013 and a message indicating
             session revocation as the cause. The revocation event MUST be logged
             at INFO level including the sessionId and the number of scopes
             disposed.
             Reference: EU GMP Annex 11 §12.4 (access lifecycle),
             21 CFR 11.10(d) (limiting system access to authorized individuals).
```

### Chain Verification at Scope Disposal

```
RECOMMENDED: At scope disposal, implementations SHOULD invoke verifyAuditChain()
             (section 61.4) on the scope's audit entries to detect integrity
             violations as early as possible. This provides per-scope chain
             verification rather than relying solely on periodic full-chain
             verification.
```

```
REQUIREMENT: When gxp is true, verifyAuditChain() MUST be invoked at scope
             disposal for any scope that recorded at least one audit entry.
             Verification failure MUST trigger the chain break response defined
             in section 61.4 (17-gxp-compliance/02-audit-trail-contract.md). The verification MUST NOT
             block scope disposal itself — if verifyAuditChain() fails, the scope
             is still disposed, but the chain break alert and quarantine procedures
             are initiated asynchronously.
             Reference: 21 CFR 11.10(c) (protection of records),
             ALCOA+ Consistent principle.
```

### Evaluation Rate Limiting

When `maxEvaluationsPerSecond` is configured, the guard tracks evaluation frequency across all scopes using a sliding window counter.

```typescript
/**
 * Error returned when the evaluation rate limit is exceeded.
 *
 * The evaluation was not performed. The caller should retry after
 * the rate limit window resets, or reduce evaluation frequency.
 */
interface RateLimitExceededError {
  readonly code: "ACL015";
  readonly message: string;
  /** The current evaluation rate (evaluations per second). */
  readonly currentRate: number;
  /** The configured maximum evaluation rate. */
  readonly maxRate: number;
}
```

```
REQUIREMENT: When gxp is true, maxEvaluationsPerSecond MUST be configured on
             createGuardGraph(). Evaluations exceeding the rate limit MUST return
             Err(RateLimitExceededError) with code ACL015. A WARNING-level log entry
             MUST be emitted when rate limiting activates, including the currentRate
             and maxRate. This protects against denial-of-service attacks via
             evaluation flooding (see FMEA FM-20 in
             17-gxp-compliance/10-risk-assessment.md section 68).
             Reference: 21 CFR 11.10(a), ALCOA+ Complete.

REQUIREMENT: When gxp is true and rate limiting activates, the guard MUST produce a
             summarized RateLimitSummaryAuditEntry at the end of each rate-limiting
             window (sliding window boundary). Individual rate-limited evaluations are
             NOT recorded (the evaluation never occurred), but the summary entry
             ensures the audit trail captures the fact that evaluations were rejected.
             The summary entry MUST include: (1) windowStartTimestamp (ISO 8601 UTC),
             (2) windowEndTimestamp (ISO 8601 UTC), (3) evaluationsRejected (count of
             evaluations rejected in the window), (4) configuredMaxRate (the
             maxEvaluationsPerSecond value), (5) peakObservedRate (highest instantaneous
             rate observed during the window). The summary entry MUST participate in the
             hash chain (section 61.4) using a dedicated canonical field ordering
             discriminated by _tag "RateLimitSummaryAuditEntry".
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.

RECOMMENDED: In non-GxP environments, maxEvaluationsPerSecond SHOULD be configured as
             a defense-in-depth control. When configured, evaluations exceeding the
             rate limit SHOULD return Err(RateLimitExceededError) with code ACL015.
             Rate-limited evaluations are not recorded in the audit trail in non-GxP
             mode. A WARNING-level log entry MUST be emitted when rate limiting
             activates.
```

#### RateLimitSummaryAuditEntry

```typescript
/**
 * Summary audit entry produced at the end of each rate-limiting window
 * when evaluations were rejected. Ensures the audit trail captures rate
 * limiting activity without recording individual rejected evaluations.
 *
 * Only produced when gxp is true and at least one evaluation was
 * rate-limited during the window.
 */
interface RateLimitSummaryAuditEntry {
  readonly _tag: "RateLimitSummaryAuditEntry";
  /** ISO 8601 UTC timestamp of the window start. */
  readonly windowStartTimestamp: string;
  /** ISO 8601 UTC timestamp of the window end. */
  readonly windowEndTimestamp: string;
  /** Number of evaluations rejected during this window. */
  readonly evaluationsRejected: number;
  /** The configured maxEvaluationsPerSecond value. */
  readonly configuredMaxRate: number;
  /** Highest instantaneous rate observed during the window. */
  readonly peakObservedRate: number;
  /** Scope ID for hash chain participation. */
  readonly scopeId: string;
  /** Monotonically increasing sequence number within the scope. */
  readonly sequenceNumber: number;
  /** Hash chain integrity hash. */
  readonly integrityHash: string;
  /** Hash of the previous entry in the chain. */
  readonly previousHash: string;
  /** Hash algorithm identifier. */
  readonly hashAlgorithm: string;
}
```

### checkGxPReadiness

A diagnostic function that inspects a `createGuardGraph()` configuration and reports whether it satisfies the prerequisites for GxP deployment. Returns a structured report with pass/warn/fail items. Intended for use during development, CI pipelines, and pre-deployment checks — not as a runtime gate.

````typescript
/**
 * A single readiness check item.
 */
interface GxPReadinessItem {
  /** What was checked. */
  readonly check: string;
  /** Result of the check. */
  readonly status: "pass" | "warn" | "fail";
  /** Human-readable explanation. */
  readonly detail: string;
}

/**
 * Result of a GxP readiness diagnostic.
 */
interface GxPReadinessReport {
  /** True if all checks pass (no failures; warnings are acceptable). */
  readonly ready: boolean;
  /** Individual check results. */
  readonly items: ReadonlyArray<GxPReadinessItem>;
  /** ISO 8601 UTC timestamp of when the check was performed. */
  readonly checkedAt: string;
}

/**
 * Inspects a guard graph configuration for GxP deployment readiness.
 *
 * Checks 13 items:
 * 1. `gxp: true` is set on createGuardGraph options.
 * 2. AuditTrail adapter is NOT NoopAuditTrail.
 * 3. `failOnAuditError` is `true` (default).
 * 4. WalStore is configured (required for Buffered Ok adapters).
 * 5. At least one guarded port has a policy configured.
 * 6. SignatureServicePort is registered (if hasSignature policies exist).
 * 7. ClockSource is not the default SystemClock in test environments
 *    (warn if SystemClock is used, as NTP sync should be verified).
 *    Note: NTP synchronization cannot be verified programmatically from
 *    JavaScript; operational procedures must confirm clock sync.
 * 8. If hasSignature policies exist and gxp is true, checks whether the
 *    configured SignatureService uses an asymmetric algorithm. Emits warn
 *    if symmetric-only (HMAC-SHA256).
 * 9. AuditTrail adapter is not MemoryAuditTrail (from @hex-di/guard-testing).
 *    Emits warn — MemoryAuditTrail is non-durable and intended for testing only.
 * 10. When gxp is true, verifies that automated clock drift monitoring is
 *     configured (ClockSource provides drift measurement or an external NTP
 *     monitor is documented). Emits warn if not verifiable.
 * 11. When gxp is true AND NODE_ENV === "production" (or a deployment
 *     environment indicator suggests production), MemoryAuditTrail detection
 *     escalates from warn to fail. In non-production environments,
 *     MemoryAuditTrail remains warn per ADR #41.
 * 12. When gxp is true, verifies that maxScopeLifetimeMs is configured.
 *     Emits fail if not configured (stale scope permissions are a compliance
 *     risk per 21 CFR 11.10(d)).
 * 13. Detects ports that have a PortGateHook rule but no guard() wrapper.
 *     Emits fail when gxp is true because port gate hook alone does not
 *     produce audit entries and is not suitable as a sole GxP authorization
 *     mechanism (see 08-port-gate-hook.md).
 *
 * @param config - The createGuardGraph configuration to inspect.
 * @returns A GxPReadinessReport with pass/warn/fail items.
 *
 * @example
 * ```typescript
 * const report = checkGxPReadiness(guardGraphConfig);
 * if (!report.ready) {
 *   console.error("GxP readiness check failed:", report.items.filter(i => i.status === "fail"));
 * }
 * ```
 */
function checkGxPReadiness(config: GuardGraphOptions): GxPReadinessReport;
````

### checkPreDeploymentCompliance

`checkPreDeploymentCompliance()` validates static configuration artifacts and procedural documentation against the compliance verification checklist (section 66). It complements `checkGxPReadiness()` which validates runtime configuration. While `checkGxPReadiness()` inspects the guard graph configuration object, `checkPreDeploymentCompliance()` verifies that the surrounding organizational artifacts exist and are properly referenced.

````typescript
/**
 * A single pre-deployment compliance check result.
 */
interface PreDeploymentComplianceItem {
  /** Unique identifier for the check (e.g., "PDC-01"). */
  readonly id: string;
  /** Human-readable description of what is being checked. */
  readonly description: string;
  /** Whether the check passed, produced a warning, or failed. */
  readonly status: "pass" | "warn" | "fail";
  /** Detailed result or failure explanation. */
  readonly detail: string;
}

/**
 * Result of running pre-deployment compliance checks.
 */
interface PreDeploymentComplianceReport {
  /** Individual check results (PDC-01 through PDC-08). */
  readonly items: ReadonlyArray<PreDeploymentComplianceItem>;
  /** True if all items are "pass" or "warn" (no "fail" items). */
  readonly compliant: boolean;
  /** Count of items in each status category. */
  readonly summary: {
    readonly pass: number;
    readonly warn: number;
    readonly fail: number;
  };
}

/**
 * Configuration for pre-deployment compliance validation.
 *
 * Each field references a documentation artifact or configuration
 * that must exist for GxP compliance. String fields are paths or
 * document identifiers; boolean fields indicate presence of a
 * required configuration.
 */
interface PreDeploymentComplianceConfig {
  /** Path or document identifier for the retention policy document. */
  readonly retentionPolicyRef?: string;
  /** Path or document identifier for the change control procedure. */
  readonly changeControlProcedureRef?: string;
  /** Path or document identifier for training records configuration. */
  readonly trainingRecordsRef?: string;
  /** Path or document identifier for the inspector access procedure. */
  readonly inspectorAccessProcedureRef?: string;
  /** Whether a periodic review schedule is defined. */
  readonly periodicReviewScheduleDefined?: boolean;
  /** Path to the SBOM file (CycloneDX or SPDX format). */
  readonly sbomRef?: string;
  /** Path or document identifier for backup/DR documentation. */
  readonly backupDrDocumentationRef?: string;
  /** Whether risk-based review frequency is defined per port category. */
  readonly riskBasedReviewFrequencyDefined?: boolean;
}

/**
 * Validates static configuration artifacts and procedural documentation
 * against the compliance verification checklist (section 66).
 *
 * Complements checkGxPReadiness() which validates runtime configuration.
 * This function checks:
 *
 * 1. PDC-01: Retention policy document exists and covers all
 *    port-to-record-type mappings (section 63).
 * 2. PDC-02: Change control procedure document is referenced
 *    (section 64a).
 * 3. PDC-03: Training records configuration is referenced
 *    (section 64c).
 * 4. PDC-04: Inspector access procedure is documented
 *    (section 64).
 * 5. PDC-05: Periodic review schedule is defined
 *    (section 64).
 * 6. PDC-06: SBOM is generated in a recognized format
 *    (section 67a, IQ-12).
 * 7. PDC-07: Backup/DR documentation exists
 *    (section 63).
 * 8. PDC-08: Risk-based review frequency is defined per port category
 *    (section 64).
 *
 * @param config - References to organizational artifacts to validate.
 * @returns A PreDeploymentComplianceReport with pass/warn/fail items.
 *
 * @example
 * ```typescript
 * const report = checkPreDeploymentCompliance({
 *   retentionPolicyRef: "DOC-RET-001",
 *   changeControlProcedureRef: "SOP-CC-003",
 *   trainingRecordsRef: "DOC-TRAIN-001",
 *   inspectorAccessProcedureRef: "SOP-INSP-001",
 *   periodicReviewScheduleDefined: true,
 *   sbomRef: "./sbom/guard-sbom.cdx.json",
 *   backupDrDocumentationRef: "DOC-DR-002",
 *   riskBasedReviewFrequencyDefined: true,
 * });
 *
 * if (!report.compliant) {
 *   console.error(
 *     "Pre-deployment compliance check failed:",
 *     report.items.filter(i => i.status === "fail"),
 *   );
 * }
 * ```
 */
function checkPreDeploymentCompliance(
  config: PreDeploymentComplianceConfig
): PreDeploymentComplianceReport;
````

### Edge Cases

| Scenario                                                            | Behavior                                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Original adapter has async factory                                  | Preserved; guard wraps the async factory                                                           |
| Original adapter has no requires                                    | ACL ports become the only requires                                                                 |
| SubjectProviderPort not in graph                                    | Resolution fails with standard container "missing dependency" error                                |
| PolicyEnginePort not in graph                                       | Resolution fails with standard container "missing dependency" error                                |
| AuditTrailPort not in graph                                         | Resolution fails with "missing dependency" error                                                   |
| SignatureServicePort not in graph                                   | NoopSignatureService used; hasSignature policies always deny                                       |
| hasSignature policy with no signature in context                    | Deny with reason "No signatures provided"                                                          |
| `failOnAuditError` is true (default) and audit write fails          | Throws AuditTrailWriteError (ACL008), resolution fails                                             |
| `failOnAuditError` is false (explicit opt-in) and audit write fails | Logs warning, resolution proceeds                                                                  |
| Policy evaluates to Err                                             | Guard propagates as FactoryError                                                                   |
| Subject is null/undefined                                           | PolicyEvaluationError with code ACL003                                                             |
| Allow decision has visibleFields                                    | FieldMaskContext registered in scope with the visible fields set                                   |
| Scope lifetime exceeded `maxScopeLifetimeMs`                        | Returns `Err(ScopeExpiredError)` (ACL013); no evaluation, no audit entry                           |
| Evaluation rate exceeds `maxEvaluationsPerSecond`                   | Returns `Err(RateLimitExceededError)` (ACL015); no evaluation, no audit entry; WARNING log emitted |

---

_Next: [08 - Port Gate Hook](./08-port-gate-hook.md)_
