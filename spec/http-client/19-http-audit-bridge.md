# 19 - HTTP Audit Bridge

_Previous: [18 - HTTP Transport Security](./18-http-transport-security.md) | Next: [20 - HTTP Transport Validation](./20-http-transport-validation.md)_

---

This document specifies how `@hex-di/http-client` bridges the guard authorization audit trail with HTTP operations. It covers HTTP operation audit entries, user attribution for outbound requests, role-based access control for HTTP operations, authentication failure auditing, clock synchronization for HTTP timestamps, and cross-correlation between guard evaluation records and HTTP operation records.

These sections build upon the guard audit trail infrastructure (guard spec sections 61-64), the subject model (guard spec sections 22-24), and the HTTP transport security combinators (sections 84-90).

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) and carry the same pharmaceutical alignment defined in guard spec section 59.

---

## 91. HTTP Audit Trail Bridge Overview

### Architecture

The guard library produces `AuditEntry` records for authorization decisions (guard spec section 61). The HTTP client produces request/response lifecycle events. In GxP environments, these two audit streams must be **correlated** so that auditors can trace from an authorization decision to the HTTP operations it authorized, and vice versa.

```
Guard Evaluation          HTTP Operation           Audit Trail
─────────────────         ──────────────           ──────────────

  evaluate()  ──────────► Decision (Allow)
       │                       │
       │                       ▼
       │                  HttpClient.execute()
       │                       │
       ▼                       ▼
  AuditEntry ◄─────────► HttpOperationAuditEntry
  (evaluationId)          (evaluationId, requestId)
       │                       │
       └───────────────────────┘
              Cross-correlation
              via evaluationId
```

The bridge operates at two levels:

1. **Entry-level correlation:** Each `HttpOperationAuditEntry` carries the `evaluationId` from the guard decision that authorized the operation. This enables forward tracing (decision → HTTP operation).

2. **Request-level correlation:** Each `HttpOperationAuditEntry` carries a unique `requestId`. The guard `AuditEntry` can optionally carry the `requestId` of the HTTP operation it authorized. This enables reverse tracing (HTTP operation → decision).

### Bridge Port

```typescript
/**
 * Port for recording HTTP operation audit entries.
 *
 * Outbound port. Singleton lifetime — one instance per application.
 * Follows the same behavioral contract as AuditTrailPort (guard spec section 61):
 * append-only, atomic writes, completeness, integrity verification.
 */
interface HttpAuditTrailPort {
  readonly _tag: "HttpAuditTrailPort";
  /**
   * Record an HTTP operation audit entry.
   * Returns Ok on success or Err on write failure.
   */
  readonly record: (entry: HttpOperationAuditEntry) => Result<void, AuditTrailWriteError>;
  /**
   * Confirm that a previously recorded entry has been durably persisted.
   *
   * The distinction between record() and confirm() is critical for GxP:
   * - record() = "accepted into local buffer / WAL" (synchronous, fast)
   * - confirm() = "durably persisted to backing store" (asynchronous callback)
   *
   * Implementations MUST call confirm() after the entry has been flushed to
   * durable storage (database, append-only log). The audit bridge tracks
   * unconfirmed entries and includes them in health reporting.
   *
   * Reference: ALCOA+ Enduring, 21 CFR 11.10(e).
   */
  readonly confirm: (sequenceNumber: number) => Result<void, AuditConfirmError>;
  /**
   * Query the persistence status of audit entries.
   * Returns entries that have been recorded but not yet confirmed as
   * durably persisted. Used for health monitoring and periodic review.
   */
  readonly unconfirmedEntries: () => ReadonlyArray<{
    readonly sequenceNumber: number;
    readonly recordedAt: string;
    readonly ageMs: number;
  }>;
}

interface AuditConfirmError {
  readonly _tag: "AuditConfirmError";
  readonly code: "SEQUENCE_NOT_FOUND" | "ALREADY_CONFIRMED" | "CONFIRMATION_FAILED";
  readonly message: string;
  readonly sequenceNumber: number;
}
```

```
REQUIREMENT: HttpAuditTrailPort implementations MUST satisfy the same behavioral
             contract as AuditTrailPort (guard spec section 61): append-only semantics, atomic
             write guarantee, completeness (every HTTP operation on GxP data produces
             an entry), and integrity verification (hash chain). The hash chain for
             HTTP operation entries MUST be independent of the guard decision audit
             chain but use the same hash algorithm and field-delimiter pattern.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

```
REQUIREMENT: HttpAuditTrailPort implementations MUST support the confirm() method
             to acknowledge durable persistence of audit entries. When gxp is true,
             implementations MUST track unconfirmed entries and expose them via
             unconfirmedEntries(). Entries that remain unconfirmed for longer than
             a configurable threshold (default: 30 seconds) MUST trigger a WARNING.
             Entries unconfirmed for longer than 5 minutes MUST trigger a CRITICAL
             alert via the error escalation mechanism. This ensures that the
             distinction between "accepted for writing" and "durably persisted"
             is actively monitored.
             Reference: ALCOA+ Enduring, 21 CFR 11.10(e).
```

```
REQUIREMENT: The confirm() method MUST be idempotent: calling confirm() on an
             already-confirmed sequence number MUST return
             Err(AuditConfirmError) with code "ALREADY_CONFIRMED" but MUST NOT
             cause data corruption or duplicate records. Calling confirm() on a
             sequence number that was never recorded MUST return
             Err(AuditConfirmError) with code "SEQUENCE_NOT_FOUND".
             Reference: ALCOA+ Consistent.
```

```
REQUIREMENT: The persistence semantics of record() and confirm() define a 4-point
             contract that implementations MUST satisfy:
             1. **record() writes to the local WAL before returning Ok.** The entry
                survives a process crash that occurs after record() returns but before
                flush to the remote backing store. If the WAL write itself fails,
                record() MUST return Err(AuditTrailWriteError).
             2. **confirm() indicates flush to the remote backing store.** A confirmed
                entry survives infrastructure failure (disk loss on the WAL host,
                network partition) because it has been replicated to the durable
                backing store (database, append-only log, object storage).
             3. **record() MUST NOT return Ok before the local WAL write completes.**
                Returning Ok optimistically (before the WAL fsync) would create a
                window where a crash loses the entry despite a successful return value.
             4. **Entries that are recorded but unconfirmed occupy a defined risk
                window.** They are safe during process crash (WAL recovers them) but
                at risk during infrastructure failure (WAL host disk loss). The
                unconfirmedEntries() method exposes this risk window for monitoring.
                Entries in this state for longer than the WARNING threshold (default:
                30 seconds) indicate a flush backlog that SHOULD be investigated.
             Reference: ALCOA+ Enduring, 21 CFR 11.10(e), EU GMP Annex 11 §16.
```

```
RECOMMENDED: Organizations SHOULD use the same backing store for both guard decision
             audit entries and HTTP operation audit entries to simplify cross-correlation
             queries. When separate stores are used, the evaluationId field provides
             the correlation key for cross-store joins.
```

```
REQUIREMENT: Implementations of HttpAuditTrailPort MUST NOT provide any method to
             modify, update, or delete recorded audit entries. The port interface
             intentionally exposes only append operations (record, confirm) and read
             operations (unconfirmedEntries). This append-only contract MUST be
             preserved across all future interface revisions. Adapter implementations
             that persist entries to mutable storage (e.g., relational databases)
             MUST enforce write-once semantics at the storage layer — UPDATE and
             DELETE operations on the audit table MUST be prohibited via database
             constraints, row-level security, or equivalent mechanism. Any attempt
             to mutate a recorded entry MUST be rejected by the storage layer and
             SHOULD trigger a security alert. Verification of write-once enforcement
             MUST be included in OQ (§99) via an adversarial test that attempts to
             modify a persisted entry and confirms the modification is rejected.
             Reference: ALCOA+ Original, 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

```
REQUIREMENT: HttpAuditTrailPort.record() follows the same synchronous return contract
             as AuditTrailPort.record() (guard spec section 61): the method MUST return
             Result<void, AuditTrailWriteError> synchronously. For network-backed
             implementations, the buffer-flush pattern from guard spec section 61 applies — the
             adapter buffers entries locally and flushes asynchronously, but record()
             itself returns synchronously after the local buffer write. When gxp is
             true and the adapter uses buffered writes, WAL crash recovery (guard spec section 61)
             MUST be used to prevent audit entry loss on process interruption between
             buffer write and flush.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

```
REQUIREMENT: When `gxp: true` is set in the HTTP client configuration, the
             HttpAuditTrailPort adapter MUST use a Write-Ahead Log (WAL) as specified
             in guard spec section 61.5. The WAL ensures that audit entries survive
             process crashes between the record() call and the asynchronous flush to
             the backing store. The `createHttpAuditTrailAdapter` factory MUST throw
             a ConfigurationError with the message: "GxP mode requires a Write-Ahead
             Log (WAL) for audit trail crash recovery. Configure a WalStore
             implementation via the walStore option." if `gxp: true` and no WalStore
             is provided. Non-GxP deployments MAY omit the WAL and rely on the
             in-memory retry queue (§55b) for transient failure recovery, accepting
             the risk of audit entry loss on process crash.
             Reference: EU GMP Annex 11 §16 (business continuity),
             21 CFR 11.10(e), ALCOA+ Enduring.
```

---

## 92. HTTP Operation Audit Entry

### Entry Structure

```typescript
interface HttpOperationAuditEntry {
  readonly _tag: "HttpOperationAuditEntry";
  /** Schema version for forward compatibility (same semantics as AuditEntry.schemaVersion). */
  readonly schemaVersion: number;
  /** Unique identifier for this HTTP operation. */
  readonly requestId: string;
  /**
   * Logical operation identifier that groups retry attempts.
   * All retry attempts for the same logical operation share this ID.
   * When no retries occur, equals requestId. REQUIRED in GxP mode
   * when retry combinators are active.
   */
  readonly logicalOperationId: string;
  /** Correlation to the guard evaluation that authorized this operation. */
  readonly evaluationId: string;
  /** ISO 8601 UTC timestamp when the request was sent. */
  readonly requestTimestamp: string;
  /** ISO 8601 UTC timestamp when the response was received (empty for failures). */
  readonly responseTimestamp: string;
  /** Identity of the subject who initiated the operation (from guard evaluation). */
  readonly subjectId: string;
  /** Authentication method used for the HTTP request (e.g., "bearer", "api-key"). */
  readonly httpAuthMethod: string;
  /** HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). */
  readonly httpMethod: string;
  /** Request URL (with query parameters redacted per section 87). */
  readonly url: string;
  /** HTTP response status code (0 for transport failures). */
  readonly statusCode: number;
  /** Request body digest (from section 86, empty for bodyless methods). */
  readonly requestDigest: string;
  /** Response body digest (empty when not verified). */
  readonly responseDigest: string;
  /** Payload validation result (from section 89, undefined when not configured). */
  readonly payloadValidation: PayloadValidationResult | undefined;
  /** Duration of the HTTP operation in milliseconds. */
  readonly durationMs: number;
  /** Outcome: "success" (2xx), "client_error" (4xx), "server_error" (5xx), "transport_error". */
  readonly outcome: "success" | "client_error" | "server_error" | "transport_error";
  /** Error code if the operation failed (empty on success). */
  readonly errorCode: string;
  /**
   * Reason or justification for this operation, per 21 CFR 11.10(e).
   * Populated by the caller when the HTTP operation creates, modifies, or
   * deletes regulated records. Empty string when not applicable (e.g., read
   * operations). When present, the reason MUST be included in the hash chain
   * computation.
   */
  readonly reason: string;
  /** Scope identifier from the guard evaluation context. */
  readonly scopeId: string;
  /** Per-scope sequence number for ordering (same pattern as guard spec section 61.4a). */
  readonly sequenceNumber: number;
  /** Hash chain integrity hash (same algorithm as guard spec section 61.4). */
  readonly integrityHash: string;
  /** Previous entry's integrity hash (empty for genesis). */
  readonly previousHash: string;
  /** Hash algorithm identifier. */
  readonly hashAlgorithm: string;
  /**
   * External correlation identifier for cross-system traceability.
   *
   * Populated from an inbound request header (e.g., "X-Correlation-Id",
   * "X-Request-Id", or "traceparent" W3C Trace Context) when the HTTP
   * operation is part of a larger distributed transaction spanning
   * multiple systems (e.g., LIMS → ERP → batch record API).
   *
   * Enables auditors to trace a single business operation across
   * organizational system boundaries. When populated, this value
   * MUST be included in the hash chain computation.
   *
   * Empty string when no external correlation context is available.
   */
  readonly externalCorrelationId: string;
}

> **Note on `responseTimestamp` empty string (ADR #46):** An empty string `""` is a valid sentinel value for `responseTimestamp` when the HTTP operation fails at the transport level (e.g., connection refused, DNS resolution failure, timeout) and no response is received. ISO 8601 format validation MUST NOT be applied to an empty `responseTimestamp`. The hash chain computation (guard spec section 61.4) MUST include the empty string as-is — it MUST NOT be replaced with a placeholder or omitted from the hash input.

/**
 * GxP-enforced variant of HttpOperationAuditEntry.
 * Makes integrity fields non-optional at the type level.
 * Mirrors the GxPAuditEntry pattern from guard spec Section 61.
 */
interface GxPHttpOperationAuditEntry extends HttpOperationAuditEntry {
  readonly schemaVersion: number;
  readonly sequenceNumber: number;
  readonly integrityHash: string;
  readonly previousHash: string;
  readonly hashAlgorithm: string;
}

/**
 * GxP-enforced variant of AuthenticationFailureAuditEntry.
 * Makes integrity fields non-optional at the type level.
 * Mirrors the GxPAuditEntry pattern from guard spec Section 61.
 */
interface GxPAuthenticationFailureAuditEntry extends AuthenticationFailureAuditEntry {
  readonly schemaVersion: number;
  readonly sequenceNumber: number;
  readonly integrityHash: string;
  readonly previousHash: string;
  readonly hashAlgorithm: string;
}
```

```
REQUIREMENT: When gxp is true, HttpAuditTrailPort adapters MUST use
             GxPHttpOperationAuditEntry and GxPAuthenticationFailureAuditEntry to
             enforce integrity fields (sequenceNumber, integrityHash, previousHash,
             hashAlgorithm) at the type level. This mirrors the GxPAuditEntry pattern
             from guard spec Section 61 — non-GxP adapters MAY leave integrity fields as empty
             strings and zero, but GxP adapters MUST populate them with valid values.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

```
REQUIREMENT: Every HTTP operation that transmits or receives GxP data MUST produce
             an HttpOperationAuditEntry. The entry MUST be recorded via
             HttpAuditTrailPort.record() before the response is returned to the
             caller. When failOnAuditError is true (the default in GxP mode),
             failure to record the entry MUST cause the HTTP operation to return
             Err(AuditTrailWriteError) even if the HTTP request itself succeeded.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete, Contemporaneous.
```

```
REQUIREMENT: The url field in HttpOperationAuditEntry MUST be redacted according
             to the CredentialRedactionPolicy (section 87). Query parameters listed
             in redactQueryParams MUST have their values replaced with the
             redactionMarker. The URL path MUST be preserved for audit traceability.
             Reference: 21 CFR 11.300, ALCOA+ Legible.
```

```
REQUIREMENT: The externalCorrelationId field in HttpOperationAuditEntry MUST be
             populated from the inbound request context when an external correlation
             header is present. The withHttpAuditBridge() combinator MUST accept an
             externalCorrelationHeader option (default: "X-Correlation-Id") specifying
             which request header carries the external correlation ID. When the header
             is present, its value MUST be copied to externalCorrelationId. When the
             header is absent, externalCorrelationId MUST be the empty string. When
             externalCorrelationId is non-empty, it MUST be included in the hash chain
             computation (appended after hashAlgorithm in the hash input). This enables
             end-to-end traceability across systems: an auditor can query all HTTP
             operations associated with a distributed business transaction by searching
             for the externalCorrelationId across multiple audit stores.
             Reference: W3C Trace Context, 21 CFR 11.10(e), ALCOA+ Attributable.
```

```
REQUIREMENT: The requestDigest and responseDigest fields MUST be populated when the
             withPayloadIntegrity() combinator (section 86) is active. These digests
             enable auditors to verify that the data transmitted matches the data
             authorized by the guard evaluation.
             Reference: 21 CFR 11.10(c), ALCOA+ Accurate.
```

```
REQUIREMENT: Individual fields in HttpOperationAuditEntry MUST NOT exceed the
             following size limits:
             - url: 8192 bytes (URLs exceeding this limit MUST be truncated to
               8192 bytes with the suffix "...[TRUNCATED]" appended, and the
               truncation MUST be noted in the hash chain computation)
             - reason: 4096 bytes (reasons exceeding this limit MUST be rejected
               with HttpRequestError code "REASON_TOO_LONG" before the operation
               proceeds — this prevents truncation of regulatory justifications)
             - errorCode: 256 bytes
             - externalCorrelationId: 512 bytes
             - httpAuthMethod: 256 bytes
             The total serialized size of an HttpOperationAuditEntry MUST NOT
             exceed 1 MiB (1,048,576 bytes). Entries exceeding this limit MUST
             be rejected by HttpAuditTrailPort.record() with
             AuditTrailWriteError code "ENTRY_SIZE_EXCEEDED". Body snapshots
             (§55a) are governed by their own maxPreviewBytes limit (max 8192)
             and are NOT included in the 1 MiB entry size budget — they are
             stored as associated metadata.
             When an entry is rejected due to size limits, the rejection MUST
             itself be recorded as an AuditTrailWriteError audit event (without
             the oversized payload) to prevent silent audit gaps.
             Reference: ALCOA+ Legible, ALCOA+ Complete, EU GMP Annex 11 §7.
```

```
REQUIREMENT: The reason field in HttpOperationAuditEntry MUST be populated when the
             HTTP operation creates, modifies, or deletes GxP-regulated records
             (POST, PUT, PATCH, DELETE to GxP endpoints). The reason provides the
             regulatory "reason for change" required by 21 CFR 11.10(e). When the
             reason field is non-empty, it MUST be included in the hash chain
             computation (appended to the hash input after the errorCode field).
             For read operations (GET, HEAD, OPTIONS), the reason field MAY be
             empty. When gxp is true, the withHttpAuditBridge() combinator MUST
             enforce the rejectOnMissingReason policy (default: true in GxP mode):
             - When rejectOnMissingReason is true: state-changing operations with
               an empty reason field MUST be rejected with HttpRequestError code
               "MISSING_REASON_FOR_CHANGE". The rejection MUST include the
               httpMethod and url in the error for diagnosis. The rejection MUST
               be recorded in the audit trail before the error is returned.
             - When rejectOnMissingReason is false: a WARNING MUST be logged but
               the operation proceeds. This mode is NOT RECOMMENDED for GxP
               deployments.
             Organizations that set rejectOnMissingReason to false in GxP mode
             MUST document the risk acceptance in their Validation Plan (§83a).
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

---

## 93. User Attribution for HTTP Operations

### GxP Active Request

```typescript
/**
 * Represents an HTTP request with GxP user attribution.
 * Created by the withSubjectAttribution() combinator.
 */
interface GxPActiveRequest {
  readonly _tag: "GxPActiveRequest";
  /** The original HttpRequest. */
  readonly request: HttpRequest;
  /** The authenticated subject from the guard evaluation. */
  readonly subjectId: string;
  /** Authentication method from the subject provider (guard spec section 23). */
  readonly authenticationMethod: string;
  /** Timestamp when the subject was authenticated (ISO 8601 UTC). */
  readonly authenticatedAt: string;
  /** The guard evaluationId that authorized this request. */
  readonly evaluationId: string;
}

/**
 * A history entry capturing the full lifecycle of a GxP HTTP operation.
 * Produced after the HTTP operation completes.
 */
interface GxPHttpHistoryEntry {
  readonly _tag: "GxPHttpHistoryEntry";
  /** The GxP-attributed request. */
  readonly request: GxPActiveRequest;
  /** HTTP response status code. */
  readonly statusCode: number;
  /** Operation outcome. */
  readonly outcome: "success" | "client_error" | "server_error" | "transport_error";
  /** Duration in milliseconds. */
  readonly durationMs: number;
  /** ISO 8601 UTC timestamp of request send. */
  readonly requestTimestamp: string;
  /** ISO 8601 UTC timestamp of response receipt. */
  readonly responseTimestamp: string;
}
```

### withSubjectAttribution Combinator

```typescript
function withSubjectAttribution(
  subjectProvider: SubjectProviderPort
): (client: HttpClient) => HttpClient;
```

**Behavior:**

1. Before each request, resolves the current subject from the `SubjectProviderPort` (guard spec section 23)
2. Attaches the subject's identity (`subjectId`, `authenticationMethod`, `authenticatedAt`) to the request context
3. The subject identity flows into the `HttpOperationAuditEntry.subjectId` field (section 92)
4. If subject resolution fails, the request is rejected with `Err(HttpRequestError)` code `"SUBJECT_RESOLUTION_FAILED"`

```
REQUIREMENT: Every HTTP operation on GxP data MUST be attributable to an authenticated
             subject. The withSubjectAttribution() combinator MUST resolve the subject
             from the scoped SubjectProviderPort (guard spec section 23) and attach the subjectId
             to the HTTP operation audit entry. Anonymous or system-initiated HTTP
             operations MUST use a documented system identity (e.g., "system:scheduler",
             "system:migration") — never an empty or null subjectId.
             Reference: 21 CFR 11.10(d), 21 CFR 11.10(e), ALCOA+ Attributable.
```

```
REQUIREMENT: The subject identity attached to the HTTP operation MUST match the
             subject identity in the guard evaluation that authorized the operation.
             The evaluationId field provides the correlation key for this match.
             A mismatch between HttpOperationAuditEntry.subjectId and the
             corresponding AuditEntry.subjectId for the same evaluationId constitutes
             an attribution integrity violation and MUST be detectable via audit
             trail review queries.
             Reference: ALCOA+ Attributable, Consistent.
```

```
RECOMMENDED: Organizations SHOULD implement a periodic attribution consistency check
             that compares subjectId values between guard AuditEntry records and
             HttpOperationAuditEntry records sharing the same evaluationId. Any
             mismatches SHOULD trigger an investigation per the incident
             classification matrix (guard spec section 68).
```

---

## 93a. Electronic Signature Bridge for HTTP Operations

### Regulatory Driver

21 CFR Part 11 Subpart C (§11.50, §11.100, §11.200) requires that electronic signatures be unique to one individual, include at least two distinct identification components, and be linked to their respective electronic records with the signer's identity, date/time, and meaning. While the guard library's `SignatureServicePort` (guard spec §65) manages electronic signature lifecycle, HTTP operations that create, modify, or approve regulated records require a **transport-level bridge** that binds signatures to specific HTTP operations.

> **Distinction from Transport Authentication:** The `withSubjectAttribution()` combinator (§93) establishes **identity** (who is making the request). The `withElectronicSignature()` combinator establishes **intent** (what the signer means by this operation: authored, reviewed, approved). Transport authentication tokens (§90) are not electronic signatures.

### Electronic Signature Types

```typescript
/**
 * Represents an electronic signature bound to an HTTP operation.
 * Satisfies 21 CFR 11.50 (signature manifestations) and 11.100 (signature controls).
 */
interface HttpElectronicSignature {
  readonly _tag: "HttpElectronicSignature";
  /** Unique identifier of the signer (MUST match subjectId from §93). */
  readonly signerId: string;
  /** Role of the signer at the time of signing. */
  readonly signerRole: string;
  /** ISO 8601 UTC timestamp of signature creation. */
  readonly signedAt: string;
  /**
   * Meaning of the signature per 21 CFR 11.50(b).
   * Standard meanings: "authored", "reviewed", "approved", "verified", "witnessed".
   * Organizations MAY define additional meanings.
   */
  readonly signatureMeaning: string;
  /**
   * Cryptographic binding of the signature to the HTTP operation.
   * SHA-256 hash of: signerId + signedAt + signatureMeaning + requestDigest.
   * This ensures the signature is inseparable from the specific operation content.
   */
  readonly signatureBinding: string;
  /** The guard evaluation that captured the signature evidence. */
  readonly evaluationId: string;
  /**
   * Whether the signature was captured with two distinct identification
   * components per 21 CFR 11.200 (e.g., user ID + password, user ID + biometric).
   */
  readonly twoFactorVerified: boolean;
}

/**
 * Configuration for the electronic signature bridge combinator.
 */
interface ElectronicSignatureConfig {
  readonly _tag: "ElectronicSignatureConfig";
  /**
   * HTTP methods that require electronic signatures.
   * Default: ["POST", "PUT", "PATCH", "DELETE"] — state-changing operations.
   */
  readonly signableMethods: ReadonlyArray<HttpMethod>;
  /**
   * URL patterns that require electronic signatures (glob syntax).
   * Default: ["*"] — all URLs matched by signableMethods.
   */
  readonly signableUrlPatterns: ReadonlyArray<string>;
  /**
   * Whether to require two-factor verification for all signatures.
   * When true, signatures without twoFactorVerified: true are rejected.
   * Default: true in GxP mode.
   */
  readonly requireTwoFactor: boolean;
  /**
   * Callback to capture the electronic signature from the user.
   * This is invoked before the HTTP request is sent and may trigger
   * a re-authentication prompt (e.g., password re-entry).
   *
   * The callback MUST complete within `signatureCaptureTimeout` milliseconds.
   * If the callback does not resolve within the timeout, the combinator
   * produces an ElectronicSignatureError with code "SIGNATURE_TIMEOUT".
   */
  readonly captureSignature: (
    request: HttpRequest,
    subject: AuthSubject,
    meaning: string
  ) => ResultAsync<HttpElectronicSignature, ElectronicSignatureError>;
  /**
   * Maximum time in milliseconds to wait for the `captureSignature` callback
   * to resolve before aborting with a "SIGNATURE_TIMEOUT" error.
   *
   * This timeout prevents indefinite hangs when the underlying
   * `SignatureServicePort` (guard spec §65) is temporarily unreachable,
   * the re-authentication prompt is abandoned by the user, or the
   * signature capture UI encounters an unrecoverable error.
   *
   * Default: 120000ms (2 minutes) when `gxp: true`, undefined (no timeout)
   * when `gxp: false`.
   *
   * The GxP default of 120 seconds allows sufficient time for a complete
   * signing ceremony (re-authentication + meaning selection + confirmation)
   * while preventing abandoned sessions from blocking other operations.
   *
   * When the timeout fires:
   * 1. The HTTP operation is rejected with ElectronicSignatureError code
   *    "SIGNATURE_TIMEOUT" and a message including the configured timeout
   *    value and the URL of the pending operation.
   * 2. The timeout event is recorded in the audit trail via
   *    HttpAuditTrailPort.record() with outcome "denied" and errorCode
   *    "SIGNATURE_TIMEOUT".
   * 3. Any in-progress re-authentication or signature UI is cancelled via
   *    the AbortSignal propagated to the captureSignature callback.
   *
   * Reference: 21 CFR 11.100(a), EU GMP Annex 11 §14.
   */
  readonly signatureCaptureTimeout?: number;
}

interface ElectronicSignatureError {
  readonly _tag: "ElectronicSignatureError";
  readonly code:
    | "SIGNATURE_DECLINED"
    | "SIGNATURE_TIMEOUT"
    | "TWO_FACTOR_FAILED"
    | "SIGNATURE_BINDING_FAILED"
    | "SIGNER_MISMATCH";
  readonly message: string;
}
```

### withElectronicSignature Combinator

```typescript
function withElectronicSignature(
  config: ElectronicSignatureConfig
): (client: HttpClient) => HttpClient;
```

**Behavior:**

1. Before each request, checks if the HTTP method and URL match `signableMethods` and `signableUrlPatterns`
2. If the operation requires a signature, calls `captureSignature()` to obtain the signer's intent
3. Verifies that `signerId` matches the `subjectId` from `withSubjectAttribution()` — a mismatch produces `Err(HttpRequestError)` with code `"SIGNER_MISMATCH"`
4. If `requireTwoFactor` is `true`, verifies that `twoFactorVerified` is `true` — otherwise produces `Err(HttpRequestError)` with code `"TWO_FACTOR_REQUIRED"`
5. Computes the `signatureBinding` hash (SHA-256 of signerId + signedAt + signatureMeaning + requestDigest from `withPayloadIntegrity()`)
6. Attaches the signature to the request context for inclusion in the `HttpOperationAuditEntry`
7. The signature is recorded in the audit trail via `HttpAuditTrailPort`

```
REQUIREMENT: The withElectronicSignature() combinator MUST verify that the signerId
             matches the subjectId resolved by withSubjectAttribution() (§93). A
             mismatch between the signer and the authenticated subject MUST produce
             an HttpRequestError with code "SIGNER_MISMATCH". This prevents one user
             from applying another user's signature to an HTTP operation.
             Reference: 21 CFR 11.100(a) (unique to one individual).
```

```
REQUIREMENT: When requireTwoFactor is true, the withElectronicSignature() combinator
             MUST reject signatures where twoFactorVerified is false. The rejection
             MUST produce an HttpRequestError with code "TWO_FACTOR_REQUIRED"
             containing the signerId and signatureMeaning for diagnosis.
             Reference: 21 CFR 11.200 (at least two distinct identification components).
```

```
REQUIREMENT: The signatureBinding field MUST be computed as
             SHA-256(signerId + "|" + signedAt + "|" + signatureMeaning + "|" + requestDigest)
             where requestDigest is the payload integrity digest from
             withPayloadIntegrity() (§86). If withPayloadIntegrity() is not active,
             the requestDigest MUST be computed on-the-fly for the signature binding.
             This cryptographic binding ensures the signature is inseparable from the
             specific operation content — changing the request body would invalidate
             the signature binding.
             Reference: 21 CFR 11.70 (signature/record linking).
```

```
REQUIREMENT: Electronic signature events (capture, verification, rejection) MUST
             be recorded in the audit trail via HttpAuditTrailPort. Each signature
             event MUST include: signerId, signerRole, signedAt, signatureMeaning,
             signatureBinding, twoFactorVerified, and the outcome (success/failure).
             Reference: 21 CFR 11.10(e), ALCOA+ Attributable.
```

```
REQUIREMENT: The withElectronicSignature() combinator MUST be placed in the
             combinator pipeline AFTER withSubjectAttribution() and
             withPayloadIntegrity() but BEFORE withHttpAuditBridge(). This ordering
             ensures: (1) subject identity is resolved before signature verification,
             (2) the request digest is available for signature binding, and
             (3) the signature is included in the audit entry.
             Reference: §103 (combinator ordering guidance).
```

```
REQUIREMENT: When gxp is true and signatureCaptureTimeout is not explicitly set,
             the withElectronicSignature() combinator MUST default signatureCaptureTimeout
             to 120000ms (2 minutes). The combinator MUST enforce this timeout by
             racing the captureSignature callback against a timer. If the timer fires
             before captureSignature resolves:
             (1) The pending captureSignature callback MUST be cancelled (if the
             underlying SignatureServicePort supports cancellation via AbortSignal).
             (2) The HTTP operation MUST be rejected with ElectronicSignatureError
             code "SIGNATURE_TIMEOUT" and a message: "Electronic signature capture
             timed out after <timeout>ms for <method> <url>. The SignatureServicePort
             may be temporarily unavailable or the signing ceremony was abandoned."
             (3) The timeout event MUST be recorded in the audit trail with outcome
             "denied" and errorCode "SIGNATURE_TIMEOUT", including the configured
             timeout value, the URL, and the subject ID.
             (4) No retry of the signature capture is attempted by the combinator.
             The caller receives the error and decides whether to retry the entire
             HTTP operation (which will trigger a new signature capture attempt).
             This prevents indefinite hangs when the SignatureServicePort is
             temporarily unreachable and ensures that abandoned signing ceremonies
             do not silently block system operations.
             Reference: 21 CFR 11.100(a), EU GMP Annex 11 §14.
```

```
RECOMMENDED: Organizations SHOULD configure signatureCaptureTimeout based on the
             complexity of their signing ceremony:
             - Simple re-authentication (password only): 60000ms (60 seconds)
             - Two-factor re-authentication (password + token): 120000ms (120 seconds)
             - Biometric re-authentication with companion: 90000ms (90 seconds)
             - Complex multi-signer ceremonies: 300000ms (5 minutes)
             The chosen value SHOULD be documented in the Validation Plan (§83a).
             Timeout events that exceed a configurable frequency threshold (default:
             5 per hour) SHOULD trigger an operational alert for investigation.
```

### Electronic Signature Audit Entry Extension

When an electronic signature is captured, the `HttpOperationAuditEntry` (§92) is extended with signature fields:

```typescript
interface SignedHttpOperationAuditEntry extends HttpOperationAuditEntry {
  /** The electronic signature bound to this operation. */
  readonly signature: HttpElectronicSignature;
}
```

### Connection to Guard SignatureServicePort

The `captureSignature` callback in `ElectronicSignatureConfig` is the bridge point to `@hex-di/guard`'s `SignatureServicePort` (guard spec §65). A typical implementation:

```typescript
const config: ElectronicSignatureConfig = {
  _tag: "ElectronicSignatureConfig",
  signableMethods: ["POST", "PUT", "PATCH", "DELETE"],
  signableUrlPatterns: ["/api/batches/*", "/api/lab-results/*"],
  requireTwoFactor: true,
  captureSignature: async (request, subject, meaning) => {
    // Delegates to guard's SignatureServicePort
    const signatureResult = await signatureService.capture({
      subjectId: subject.id,
      meaning,
      context: { url: request.url, method: request.method },
    });
    return signatureResult.map(sig => ({
      _tag: "HttpElectronicSignature" as const,
      signerId: sig.signerId,
      signerRole: sig.signerRole,
      signedAt: sig.signedAt,
      signatureMeaning: meaning,
      signatureBinding: "", // computed by combinator
      evaluationId: sig.evaluationId,
      twoFactorVerified: sig.twoFactorVerified,
    }));
  },
};
```

---

## 93b. Electronic Signature Display Format

### Regulatory Driver

21 CFR 11.50(a) requires that signed electronic records shall contain information associated with the signing that clearly indicates: (1) the printed name of the signer, (2) the date and time when the signature was executed, and (3) the meaning associated with the signature. This section specifies how `HttpElectronicSignature` (§93a) manifestations MUST be rendered in audit review interfaces.

### Signature Display Requirements

```
REQUIREMENT: When electronic signatures bound to HTTP operations are displayed
             in audit review interfaces (web dashboards, PDF reports, regulatory
             inspection views), the display MUST include all five mandatory
             manifestation fields from the HttpElectronicSignature (§93a):
             (1) signerId — the printed name or unique identifier of the signer
             (2) signerRole — the role of the signer at the time of signing
             (3) signedAt — the date and time of signature in ISO 8601 UTC format,
                 displayed in the reviewer's local timezone with UTC offset visible
             (4) signatureMeaning — the meaning of the signature (e.g., "authored",
                 "reviewed", "approved", "verified", "witnessed")
             (5) signatureBinding — the cryptographic binding hash (truncated to
                 first 16 characters for display, with full value available on
                 expansion)
             Reference: 21 CFR 11.50(a), 21 CFR 11.50(b).
```

### Display Format Specification

```typescript
/**
 * Defines the rendering format for electronic signature manifestations
 * in audit review interfaces.
 *
 * This type describes the display contract — implementations render this
 * structure in their chosen UI framework (React, PDF, HTML table, etc.).
 */
interface HttpSignatureDisplayFormat {
  readonly _tag: "HttpSignatureDisplayFormat";
  /**
   * Layout for signature manifestation rendering.
   * - "inline": Compact single-line format for table cells and list items.
   *   Example: "Jane Smith (Reviewer) — Approved — 2025-01-15T14:30:00Z"
   * - "block": Multi-line block format for detailed audit views.
   *   Displays each field on its own line with labels.
   * - "badge": Compact visual badge showing meaning and signer.
   *   Example: [APPROVED] Jane Smith, 2025-01-15
   */
  readonly layout: "inline" | "block" | "badge";
  /**
   * Whether to show the signatureBinding hash.
   * When true, displays truncated hash (first 16 chars) with expand option.
   * Default: true for "block" layout, false for "inline" and "badge".
   */
  readonly showBinding: boolean;
  /**
   * Whether to show the verification status alongside the signature.
   * When true, displays the HttpSignatureVerificationResult (§107)
   * status (verified/failed) next to the signature.
   * Default: true.
   */
  readonly showVerificationStatus: boolean;
  /**
   * Timezone for displaying signedAt timestamp.
   * - "utc": Display in UTC (ISO 8601 Z suffix)
   * - "local": Display in reviewer's local timezone with UTC offset
   * - "both": Display both UTC and local time
   * Default: "both".
   */
  readonly timestampDisplay: "utc" | "local" | "both";
}
```

### Block Layout Example

```
┌─────────────────────────────────────────────────┐
│ Electronic Signature                    ✓ Verified │
│                                                    │
│ Signer:    Jane Smith (jane.smith@pharma.com)     │
│ Role:      Quality Reviewer                        │
│ Meaning:   APPROVED                                │
│ Signed:    2025-01-15 14:30:00 UTC                │
│            (2025-01-15 09:30:00 EST, UTC-05:00)   │
│ Binding:   a1b2c3d4e5f6g7h8... [expand]           │
│ 2FA:       ✓ Two-factor verified                   │
└─────────────────────────────────────────────────┘
```

```
REQUIREMENT: Audit review interfaces that display HttpElectronicSignature
             data MUST NOT truncate or omit any of the five mandatory fields
             (signerId, signerRole, signedAt, signatureMeaning, signatureBinding)
             even when using compact layout modes. The "inline" and "badge"
             layouts MAY abbreviate signatureBinding to a truncated hash but
             MUST provide an expansion mechanism to view the full value.
             Reference: 21 CFR 11.50(a).
```

```
REQUIREMENT: When the signature's verification status is available
             (HttpSignatureVerificationResult from §107), the display MUST
             indicate whether the signature has been verified and the outcome
             of the three-property check (bindingIntact, signerActive,
             temporallyValid). Failed verifications MUST be visually
             distinguished from successful verifications (e.g., red indicator
             vs. green indicator, or "FAILED" vs. "VERIFIED" text).
             Reference: 21 CFR 11.50(a), 21 CFR 11.100.
```

```
RECOMMENDED: Organizations SHOULD use the "block" layout for detailed audit
             review and regulatory inspection views, and the "inline" or "badge"
             layout for summary tables and dashboards. The display format
             configuration SHOULD be documented in the Validation Plan (§83a)
             and validated during OQ to confirm all five mandatory fields are
             rendered correctly.
```

---

## 94. RBAC for HTTP Operations

### HTTP Operation Policy

```typescript
/**
 * Defines which subjects are authorized to perform which HTTP operations.
 * Evaluated by the withHttpGuard() combinator before each request.
 */
interface HttpOperationPolicy {
  readonly _tag: "HttpOperationPolicy";
  /** HTTP method this policy applies to. "*" matches all methods. */
  readonly method: HttpMethod | "*";
  /** URL pattern this policy applies to (glob syntax). "*" matches all URLs. */
  readonly urlPattern: string;
  /** The guard policy to evaluate (same Policy type as guard spec section 13). */
  readonly policy: Policy;
  /**
   * Role pairs that are mutually exclusive for this operation.
   * Enforces separation of duties per 21 CFR 11.10(g) and EU GMP Annex 11 §12.
   *
   * Each entry is a tuple of two role identifiers that MUST NOT be held
   * simultaneously by the same subject for this operation. Example:
   * [["data-entry", "data-approval"]] prevents a subject who entered data
   * from also approving it via the same HTTP endpoint.
   *
   * Empty array means no separation of duties enforcement (default).
   */
  readonly conflictingRoles: ReadonlyArray<readonly [string, string]>;
}

/**
 * Port for evaluating HTTP operation policies.
 *
 * Outbound port. Scoped lifetime — one instance per request scope.
 * This port is resolved from the DI container and evaluated before each
 * HTTP operation to determine if the current subject is authorized.
 */
interface HttpOperationGatePort {
  readonly _tag: "HttpOperationGatePort";
  /**
   * Evaluate whether the current subject is authorized to perform the
   * given HTTP operation.
   */
  readonly evaluate: (
    method: HttpMethod,
    url: string,
    subject: AuthSubject
  ) => Result<Decision, PolicyEvaluationError>;
}
```

### withHttpGuard Combinator

```typescript
function withHttpGuard(
  gate: HttpOperationGatePort,
  policies: ReadonlyArray<HttpOperationPolicy>
): (client: HttpClient) => HttpClient;
```

**Behavior:**

1. Before each request, determines the applicable `HttpOperationPolicy` by matching the request's HTTP method and URL against the configured policies
2. Evaluates the matched policy against the current subject (resolved from the scoped context)
3. If evaluation produces `Allow`: proceeds with the request
4. If evaluation produces `Deny`: returns `Err(HttpRequestError)` with code `"HTTP_OPERATION_DENIED"` containing the denial reason
5. If no policy matches: behavior depends on the default policy (`deny` or `allow`), configurable via the gate

```
REQUIREMENT: When gxp is true, HTTP operations that transmit or modify GxP data
             MUST be gated by RBAC policies. The withHttpGuard() combinator MUST
             evaluate the applicable HttpOperationPolicy before the request reaches
             the platform adapter. Denied operations MUST produce an audit entry
             recording the denial (via the standard guard audit trail, guard spec section 61).
             Reference: 21 CFR 11.10(d), 21 CFR 11.10(g), EU GMP Annex 11 §12.
```

```
REQUIREMENT: HttpOperationPolicy definitions MUST be JSON-serializable plain data
             (same constraint as guard policies, guard spec section 17). The policy, method,
             and urlPattern fields MUST be included in audit entries for traceability.
             Reference: EU GMP Annex 11 §10 (change management).
```

```
REQUIREMENT: Policy matching MUST be deterministic: given the same method, URL, and
             policy set, the same policy MUST be selected. When multiple policies
             match, the MOST SPECIFIC policy wins (exact method over wildcard,
             longer URL pattern over shorter). Ties MUST be resolved by policy
             declaration order (first declared wins).
             Reference: ALCOA+ Consistent.
```

```
REQUIREMENT: When conflictingRoles is non-empty on an HttpOperationPolicy, the
             withHttpGuard() combinator MUST verify that the current subject does
             not simultaneously hold both roles in any conflicting pair. If the
             subject holds both roles in a pair (e.g., "data-entry" and "data-approval"),
             the operation MUST be denied with HttpRequestError code
             "SEPARATION_OF_DUTIES_VIOLATION" containing the conflicting role pair
             and the subjectId. The denial MUST be recorded as an audit entry.
             Reference: 21 CFR 11.10(g) (operational system checks),
             EU GMP Annex 11 §12 (security).
```

```
RECOMMENDED: Organizations SHOULD define conflictingRoles for all GxP-critical
             write operations where the four-eyes principle applies. Common
             separation of duties pairs include:
             - ["data-entry", "data-approval"] — data entry vs. data approval
             - ["batch-operator", "batch-reviewer"] — execution vs. review
             - ["config-author", "config-approver"] — configuration change vs. approval
             - ["test-executor", "test-approver"] — test execution vs. approval
             The conflicting role definitions SHOULD be reviewed during OQ
             and documented in the Validation Plan (§83a).
```

```
REQUIREMENT: When gxp is true, the withHttpGuard() combinator is REQUIRED in the
             combinator pipeline (see §81a) and MUST enforce a default-deny posture
             for HTTP operations: any request that does not match an explicit allow
             policy MUST be denied with HttpRequestError code "NO_MATCHING_POLICY".
             This prevents unintended data access if a new endpoint is added without
             a corresponding policy. The denial MUST be recorded as an audit entry
             including the httpMethod, url, and subjectId. Non-GxP deployments MAY
             use a default-allow posture. Omission of withHttpGuard() when gxp is
             true MUST produce a ConfigurationError at construction time with error
             code "MISSING_REQUIRED_GXP_COMBINATOR" (see §81b).
             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

```
RECOMMENDED: Non-GxP deployments SHOULD also adopt a default-deny posture for
             defense-in-depth. When default-allow is used, organizations SHOULD
             document the risk acceptance in their security posture assessment.
```

---

## 95. Authentication Failure Audit

### Authentication Failure Entry

```typescript
interface AuthenticationFailureAuditEntry {
  readonly _tag: "AuthenticationFailureAuditEntry";
  /** Schema version for forward compatibility (same semantics as AuditEntry.schemaVersion). */
  readonly schemaVersion: number;
  /** Unique identifier for this failure event. */
  readonly failureId: string;
  /** ISO 8601 UTC timestamp of the failure. */
  readonly timestamp: string;
  /** Type of authentication failure. */
  readonly failureType:
    | "token_expired"
    | "token_revoked"
    | "token_invalid"
    | "refresh_failed"
    | "certificate_rejected"
    | "credential_missing"
    | "subject_resolution_failed";
  /** HTTP method of the failed request. */
  readonly httpMethod: string;
  /** URL of the failed request (redacted per section 87). */
  readonly url: string;
  /** Subject identity if available (may be empty for pre-auth failures). */
  readonly subjectId: string;
  /** Diagnostic details (sanitized per section 87). */
  readonly detail: string;
  /** Scope identifier. */
  readonly scopeId: string;
  /** Correlation to guard evaluation if available. */
  readonly evaluationId: string;
  /** Per-scope sequence number. */
  readonly sequenceNumber: number;
  /** Hash chain integrity. */
  readonly integrityHash: string;
  readonly previousHash: string;
  readonly hashAlgorithm: string;
}
```

### withAuthFailureAudit Combinator

```typescript
function withAuthFailureAudit(auditTrail: HttpAuditTrailPort): (client: HttpClient) => HttpClient;
```

**Behavior:**

1. Wraps the inner client's error path
2. When an HTTP operation fails due to an authentication-related error (401 Unauthorized, 403 Forbidden, token expiration, certificate rejection), produces an `AuthenticationFailureAuditEntry`
3. Records the entry via `HttpAuditTrailPort.record()`
4. Propagates the original error to the caller (does not swallow it)

```
REQUIREMENT: Authentication failures for HTTP operations on GxP data MUST be recorded
             in the audit trail. Each failure MUST produce an AuthenticationFailureAuditEntry
             with the failureType, timestamp, httpMethod, url, and available subjectId.
             Authentication failures include: expired tokens, revoked tokens, invalid
             tokens, failed token refreshes, rejected certificates, missing credentials,
             and failed subject resolution.
             Reference: 21 CFR 11.10(e), 21 CFR 11.300, EU GMP Annex 11 §12.
```

```
REQUIREMENT: Authentication failure audit entries MUST be sanitized per the
             CredentialRedactionPolicy (section 87) before recording. The detail
             field MUST NOT contain credential values, tokens, or certificate private
             key material.
             Reference: 21 CFR 11.300.
```

```
RECOMMENDED: Organizations SHOULD configure alerting thresholds on authentication
             failure rates. A RECOMMENDED threshold is: >= 5 authentication failures
             from the same subjectId within a 5-minute window triggers an operational
             alert. This helps detect credential compromise or misconfiguration.
             The threshold SHOULD be configurable per deployment.
```

```
REQUIREMENT: AuthenticationFailureAuditEntry records MUST participate in the same
             hash chain as HttpOperationAuditEntry records within the HttpAuditTrailPort
             scope. The sequenceNumber MUST be monotonically increasing across both
             entry types. verifyAuditChain() MUST validate both entry types in
             interleaved sequence order. Separate hash chains for operation entries
             vs. failure entries are NOT permitted — a single chain provides tamper
             evidence for the complete HTTP audit trail.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete, EU GMP Annex 11 §9.
```

```
REQUIREMENT: HTTP audit chains (HttpAuditTrailPort) and guard audit chains
             (AuditTrailPort from guard spec 07-guard-adapter.md) are independent chain
             namespaces. They do NOT share scopeId values and MUST NOT be
             interleaved. verifyAuditChain() operates on a single chain type at
             a time — it validates either guard audit entries or HTTP audit entries,
             not both mixed together. The evaluationId field provides the cross-
             reference between HTTP audit entries and their corresponding guard
             audit entries when a single HTTP request triggers a guard evaluation.
             Reference: ALCOA+ Consistent, 21 CFR 11.10(e).
```

---

## 96. Clock Synchronization for HTTP Timestamps

### Extension of guard spec Section 62

All timestamps in `HttpOperationAuditEntry` and `AuthenticationFailureAuditEntry` MUST use the same `ClockSource` defined in guard spec section 62. This ensures temporal consistency between guard evaluation timestamps and HTTP operation timestamps.

```
REQUIREMENT: The withHttpAuditBridge() combinator MUST use the ClockSource from the
             guard graph configuration (guard spec section 62) for all timestamps in HTTP audit
             entries. Using a different clock source (e.g., Date.now() directly)
             would create temporal inconsistency between guard and HTTP audit streams,
             violating the ALCOA+ Contemporaneous and Consistent principles.
             Reference: 21 CFR 11.10(e), ALCOA+ Contemporaneous, Consistent.
```

```
REQUIREMENT: The dual-timing strategy from guard spec section 62 applies to HTTP operations:
             (1) ClockSource.now() provides the wall-clock timestamp for audit
             entries (ISO 8601 UTC), and (2) performance.now() (monotonic) measures
             operation duration (durationMs). The durationMs field MUST use the
             monotonic clock, not the difference between responseTimestamp and
             requestTimestamp, to avoid clock adjustment artifacts.
             Reference: guard spec Section 62 (Dual-Timing Strategy).
```

```
REQUIREMENT: When `gxp: true` is set, the HTTP client MUST enforce a maximum clock drift
             threshold of 1 second. If the ClockSource health check detects drift exceeding
             1 second, all HTTP operations on GxP data MUST be paused and return an
             HttpRequestError with code "CLOCK_DRIFT_EXCEEDED" until clock synchronization
             is restored. The drift check MUST occur before each HTTP operation that
             produces an audit entry.
             Reference: guard spec §62, 21 CFR 11.10(e), ALCOA+ Contemporaneous.
```

```
REQUIREMENT: All timestamp fields in HttpOperationAuditEntry (§92),
             AuthenticationFailureAuditEntry (§95), HttpClientConfigurationAuditEntry
             (§88), HttpElectronicSignature (§93a), and all other audit-related types
             defined in this specification MUST be serialized in UTC with the "Z"
             suffix per ISO 8601 (e.g., "2025-06-15T14:30:00.000Z"). Local timezone
             offsets MUST NOT be used in stored audit data. Display layers (§93b)
             MAY convert to local time for human readability but MUST preserve the
             original UTC value. This ensures temporal consistency across geographically
             distributed GxP deployments and eliminates ambiguity from daylight saving
             time transitions. Audit entries with non-UTC timestamps MUST be rejected
             by HttpAuditTrailPort.record() with AuditTrailWriteError code
             "INVALID_TIMESTAMP_FORMAT".
             Reference: 21 CFR 11.10(e), ALCOA+ Contemporaneous, ISO 8601.
```

```
RECOMMENDED: For non-GxP mode, organizations SHOULD include HTTP operation timestamps
             in their NTP drift monitoring (guard spec section 62). If the ClockSource
             health check detects drift exceeding 1 second, HTTP operations SHOULD be
             flagged in the audit trail. The response to clock drift SHOULD be documented
             in the business continuity plan.
```

---

## 97. Cross-Correlation: Guard to HTTP

### Correlation Structure

```typescript
interface HttpGuardCorrelation {
  readonly _tag: "HttpGuardCorrelation";
  /** The guard evaluation that authorized the HTTP operation. */
  readonly evaluationId: string;
  /** The HTTP operation's unique identifier. */
  readonly requestId: string;
  /** The subject who initiated both the guard evaluation and HTTP operation. */
  readonly subjectId: string;
  /** Guard decision timestamp (ISO 8601 UTC). */
  readonly decisionTimestamp: string;
  /** HTTP request timestamp (ISO 8601 UTC). */
  readonly requestTimestamp: string;
  /** Time elapsed between guard decision and HTTP request in milliseconds. */
  readonly decisionToRequestMs: number;
}
```

### withHttpAuditBridge Combinator

```typescript
function withHttpAuditBridge(
  auditTrail: HttpAuditTrailPort,
  options?: {
    /** Maximum allowed time between guard decision and HTTP request. */
    readonly maxDecisionAge?: number;
    /** Whether to include payload digests in audit entries. */
    readonly includeDigests?: boolean;
    /**
     * Provider for the "reason for change" field per 21 CFR 11.10(e).
     * Called for state-changing operations (POST, PUT, PATCH, DELETE).
     * Returns the reason string to include in the audit entry.
     * When not provided, the reason is read from the request context
     * (e.g., set via a custom header or request metadata).
     */
    readonly reasonProvider?: (request: HttpRequest) => Result<string, ReasonProviderError>;
    /**
     * Whether to reject state-changing operations that lack a "reason for change".
     *
     * - When `true`: state-changing operations (POST, PUT, PATCH, DELETE) to GxP
     *   endpoints that have an empty `reason` field are rejected with
     *   HttpRequestError code "MISSING_REASON_FOR_CHANGE" before the HTTP request
     *   is sent. The rejection is recorded in the audit trail.
     * - When `false` (default for non-GxP): a WARNING is logged but the operation
     *   proceeds.
     *
     * Default: `true` when `gxp: true`, `false` otherwise.
     *
     * This enforcement mode addresses 21 CFR 11.10(e) which requires that audit
     * trails document the reason for changes to electronic records. The WARNING-only
     * mode is insufficient for strict regulatory compliance because it allows
     * operations to proceed without a documented justification.
     *
     * Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
     */
    readonly rejectOnMissingReason?: boolean;
    /**
     * Default maxDecisionAge for GxP mode.
     * When gxp is true, maxDecisionAge MUST be configured. If omitted in
     * GxP mode, defaults to 5000ms (5 seconds). Maximum allowed value
     * is 30000ms (30 seconds) in GxP mode.
     */
  }
): (client: HttpClient) => HttpClient;
```

**Behavior:**

This is the primary bridging combinator that connects all HTTP audit concerns:

1. Intercepts every outgoing request
2. Reads the `evaluationId` and `subjectId` from the request context (attached by `withSubjectAttribution`)
3. Creates an `HttpOperationAuditEntry` populated with all available fields
4. After the HTTP operation completes (success or failure), finalizes the entry with response data
5. Records the entry via `HttpAuditTrailPort.record()`
6. Optionally validates that the guard decision is recent enough (`decisionToRequestMs <= maxDecisionAge`)

```
REQUIREMENT: The withHttpAuditBridge() combinator MUST produce an HttpOperationAuditEntry
             for every HTTP operation on GxP data, regardless of outcome (success,
             client error, server error, transport error). This ensures audit
             completeness equivalent to the guard audit trail (guard spec section 61.3).
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

```
REQUIREMENT: The evaluationId in HttpOperationAuditEntry MUST match the evaluationId
             of the guard AuditEntry that authorized the operation. This bidirectional
             correlation MUST be verifiable via audit trail queries: given an
             evaluationId, an auditor MUST be able to find both the guard decision
             record and all HTTP operation records associated with that decision.
             Reference: ALCOA+ Attributable, ALCOA+ Consistent.
```

```
REQUIREMENT: When maxDecisionAge is configured, the combinator MUST reject HTTP
             requests where the time elapsed since the guard decision exceeds
             maxDecisionAge milliseconds. This prevents stale authorization decisions
             from being used to execute HTTP operations long after the decision was
             made. The rejection MUST produce an HttpRequestError with code
             "STALE_AUTHORIZATION" containing the elapsed time and configured maximum.
             Reference: 21 CFR 11.10(d) (access control timeliness).
```

```
RECOMMENDED: Organizations SHOULD configure maxDecisionAge based on the sensitivity
             of the GxP data being transmitted. RECOMMENDED values:
             - Batch record modifications: <= 30 seconds
             - Laboratory result submissions: <= 60 seconds
             - Read-only data retrieval: <= 300 seconds
             - Background synchronization: <= 600 seconds
             The chosen values SHOULD be documented in the validation plan (section 99).
```

```
REQUIREMENT: When gxp is true on the guard graph, maxDecisionAge MUST be configured
             on withHttpAuditBridge(). Omitting maxDecisionAge in GxP mode MUST
             produce a ConfigurationError at combinator construction time. This ensures
             that stale authorization detection is always active for GxP HTTP operations.
             The configured value MUST be documented in the validation plan (section 99).
             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

```
REQUIREMENT: When gxp is true, the rejectOnMissingReason option on withHttpAuditBridge()
             MUST default to true. When rejectOnMissingReason is true, the combinator
             MUST reject state-changing HTTP operations (POST, PUT, PATCH, DELETE) that
             have an empty reason field with HttpRequestError code
             "MISSING_REASON_FOR_CHANGE" and the message: "GxP mode requires a reason
             for change on state-changing HTTP operations. Provide a reason via the
             reasonProvider option or request context per 21 CFR 11.10(e)." The
             rejection MUST occur before the HTTP request is sent to the platform
             adapter, ensuring no unattributed state change reaches the downstream
             system. The rejection event MUST be recorded in the audit trail via
             HttpAuditTrailPort.record() with outcome "denied" and the errorCode
             "MISSING_REASON_FOR_CHANGE". Organizations MAY set rejectOnMissingReason
             to false in GxP mode, but MUST document a risk acceptance in their
             Validation Plan (§83a) explaining why WARNING-only enforcement is
             acceptable for their regulatory context.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9, ALCOA+ Attributable.
```

```
REQUIREMENT: When gxp is true and rejectOnMissingReason is explicitly set to false,
             the withHttpAuditBridge() combinator MUST at construction time:
             (1) Log a WARNING with the message: "GxP mode: rejectOnMissingReason is
             disabled. State-changing operations will proceed without a documented
             reason for change. This may not satisfy 21 CFR 11.10(e). Ensure risk
             acceptance is documented in the Validation Plan (§83a)."
             (2) Record an HttpClientConfigurationAuditEntry (§88) with
             configurationKey "REJECT_ON_MISSING_REASON_OVERRIDE", previousValue
             "true" (the GxP default), newValue "false", and reason containing
             the justification provided by the deployer (if available) or
             "Override provided without justification — risk acceptance required."
             This ensures that deliberate weakening of GxP controls is itself audited
             and traceable, even if the deployer's organizational risk acceptance
             document is external to the system.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9, ICH Q9 §4.
```

### Audit Trail Query Patterns

For auditors to trace from guard decisions to HTTP operations and back:

**Forward trace (decision → HTTP operations):**

```
SELECT * FROM http_operation_audit
WHERE evaluationId = '<evaluationId from guard AuditEntry>'
ORDER BY sequenceNumber;
```

**Reverse trace (HTTP operation → guard decision):**

```
SELECT * FROM guard_audit
WHERE evaluationId = '<evaluationId from HttpOperationAuditEntry>'
LIMIT 1;
```

**Subject activity report (all operations by a subject in a time window):**

```
SELECT
  g.evaluationId, g.decision, g.portName, g.timestamp AS decision_time,
  h.requestId, h.httpMethod, h.url, h.statusCode, h.requestTimestamp
FROM guard_audit g
JOIN http_operation_audit h ON g.evaluationId = h.evaluationId
WHERE g.subjectId = '<subjectId>'
  AND g.timestamp BETWEEN '<start>' AND '<end>'
ORDER BY g.timestamp;
```

```
RECOMMENDED: Organizations SHOULD implement the above query patterns (or equivalent)
             as part of their audit trail review interface (guard spec section 64). The queries
             SHOULD be available through the @hex-di/guard-validation programmatic
             tooling for use during periodic reviews.
```

## Additional HTTP Audit Requirements

```
REQUIREMENT: The requireHttps() combinator (section 85) MUST apply HTTPS enforcement
             to redirect targets, not just the initial URL. When an HTTP response
             includes a 3xx redirect to a non-HTTPS URL, the combinator MUST reject
             the redirect with HttpRequestError code "HTTPS_REQUIRED" and include
             the redirect target URL in the error. This prevents GxP data from being
             sent to an unencrypted endpoint via redirect-based downgrade attacks.
             Reference: 21 CFR 11.30, OWASP Unvalidated Redirects.
```

```
REQUIREMENT: When `gxp: true` is set and retry combinators are active in the
             combinator pipeline (e.g., retryTransient, retry), HTTP operation
             audit entries MUST include a logicalOperationId field that correlates
             retried requests. All retry attempts for the same logical operation
             MUST share the same logicalOperationId while having distinct requestId
             values. This ensures auditors can distinguish "the same operation
             retried 3 times" from "3 separate operations" when reviewing the
             audit trail. The logicalOperationId MUST be generated before the
             first attempt and propagated through all retries. When retry
             combinators are not active, the logicalOperationId MUST equal the
             requestId (single-attempt identity). The logicalOperationId MUST
             be included in the hash chain computation.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete, ALCOA+ Consistent.
```

```
RECOMMENDED: Non-GxP deployments SHOULD also include logicalOperationId for
             retried requests to improve audit trail readability. The same
             generation and propagation semantics apply.
```

```
RECOMMENDED: For GxP write operations (POST, PUT, PATCH, DELETE), HTTP audit entries
             SHOULD optionally capture a content hash of the request body (using the
             same algorithm as withPayloadIntegrity). This provides an additional
             correlation point: auditors can verify that the body hash in the HTTP
             audit entry matches the requestDigest computed by the integrity combinator.
             Full body capture is NOT recommended due to storage and privacy concerns;
             the hash is sufficient for integrity verification.
```

### WAL Extension for HTTP Audit Trail

The Write-Ahead Log (WAL) pattern from guard spec section 61.5 applies to HTTP audit entries. When `failOnAuditError` is true (the GxP default), an HTTP operation that cannot record its audit entry MUST fail. The WAL provides crash recovery:

1. **Before** the HTTP request is sent, a WAL intent is written with status `"pending"`
2. **After** the HTTP response is received and the audit entry is recorded, the WAL intent transitions to `"committed"`
3. If the process crashes between steps 1 and 2, the WAL recovery scan on startup detects the orphaned intent and reconciles it (either by re-recording the entry if the HTTP response is known, or by marking the intent as `"evaluation_failed"`)

```
RECOMMENDED: HTTP audit implementations SHOULD use the same WalStore infrastructure
             as the guard decision audit trail (guard spec section 61.5) to avoid maintaining
             separate WAL implementations. The WAL scope identifier for HTTP entries
             SHOULD be prefixed with "http:" to distinguish them from guard decision
             WAL entries (e.g., "http:scope-uuid").
```

---

_Previous: [18 - HTTP Transport Security](./18-http-transport-security.md) | Next: [20 - HTTP Transport Validation](./20-http-transport-validation.md)_
