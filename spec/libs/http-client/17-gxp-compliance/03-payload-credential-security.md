# 18b - Payload & Credential Security

_Previous: [18a - HTTPS & TLS Enforcement](./18a-https-tls-enforcement.md) | Next: [18c - Session, Auth & Extended Controls](./18c-session-auth-extended.md)_

---

This document is part 2 of 3 covering HTTP transport security for `@hex-di/http-client` in GxP environments. It specifies payload integrity verification, credential protection, HTTP configuration change control, and GxP payload schema validation. See also [18a](./18a-https-tls-enforcement.md) (HTTPS enforcement, TLS, certificate pinning) and [18c](./18c-session-auth-extended.md) (session/token lifecycle, authentication policy, SSRF, HSTS, CT, CSRF).

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) and carry the same pharmaceutical alignment defined in the [GxP compliance guide](./17-gxp-compliance.md#normative-language).

---

## 86. Payload Integrity Verification

### Configuration

```typescript
/**
 * Configuration for cryptographic payload integrity verification.
 * Ensures request and response bodies are not tampered with in transit.
 *
 * Reference: 21 CFR 11.10(c) (protection of records), ALCOA+ Accurate.
 */
interface PayloadIntegrityConfig {
  readonly _tag: "PayloadIntegrityConfig";
  /** Hash algorithm for payload integrity. */
  readonly algorithm: "sha256" | "sha384" | "sha512";
  /** Whether to hash outgoing request bodies. */
  readonly hashRequests: boolean;
  /** Whether to verify incoming response body hashes. */
  readonly verifyResponses: boolean;
  /** Header name for the request body digest. */
  readonly requestDigestHeader: string;
  /** Header name(s) to check for response body digest. */
  readonly responseDigestHeaders: ReadonlyArray<string>;
}
```

### withPayloadIntegrity Combinator

```typescript
function withPayloadIntegrity(
  options?: Partial<PayloadIntegrityConfig>
): (client: HttpClient) => HttpClient;
```

**Defaults:**

| Option                  | Default                        | Rationale                                                     |
| ----------------------- | ------------------------------ | ------------------------------------------------------------- |
| `algorithm`             | `"sha256"`                     | Widely supported; sufficient for integrity verification       |
| `hashRequests`          | `true`                         | Outgoing GxP payloads MUST have verifiable integrity          |
| `verifyResponses`       | `false`                        | Server must support digest headers; not universally available |
| `requestDigestHeader`   | `"content-digest"`             | Per RFC 9530 (HTTP Message Signatures)                        |
| `responseDigestHeaders` | `["content-digest", "digest"]` | Check both RFC 9530 and legacy RFC 3230 headers               |

**Behavior:**

1. For outgoing requests with a body (`POST`, `PUT`, `PATCH`):
   - Computes the hash of the serialized request body using the configured algorithm
   - Attaches the digest as a request header (e.g., `Content-Digest: sha-256=:base64hash:`)
   - Records the computed digest in the request context for audit correlation (section 92)

2. For incoming responses (when `verifyResponses` is `true`):
   - Reads the response body digest from the configured header(s)
   - Computes the hash of the response body
   - Compares computed hash against the declared digest
   - On mismatch: returns `Err(HttpResponseError)` with code `"PAYLOAD_INTEGRITY_FAILED"`

```
REQUIREMENT: When hashRequests is true, the combinator MUST compute a digest of every
             outgoing request body and attach it as a header before the request is sent.
             The digest MUST use the configured algorithm. Bodyless requests (GET, HEAD,
             OPTIONS) MUST NOT receive a digest header.
             Reference: 21 CFR 11.10(c), ALCOA+ Accurate.
```

```
REQUIREMENT: When verifyResponses is true and the response includes a digest header,
             the combinator MUST verify the response body against the declared digest.
             A mismatch MUST produce an HttpResponseError with code
             "PAYLOAD_INTEGRITY_FAILED" containing the expected and actual digests.
             The original response body MUST NOT be returned to the caller on
             integrity failure.
             Reference: EU GMP Annex 11 §7, ALCOA+ Accurate.
```

```
RECOMMENDED: Organizations SHOULD enable response verification (verifyResponses: true)
             when communicating with GxP-critical APIs that support RFC 9530
             Content-Digest headers. For APIs that do not support digest headers,
             organizations SHOULD document the absence of response integrity
             verification as a risk acceptance in the FMEA (section 98).
```

---

## 87. Credential Protection

### Redaction Policy

```typescript
/**
 * Policy governing credential redaction from HTTP headers, query parameters,
 * request/response bodies, and cookies to prevent credential exposure in
 * logs, error messages, and audit trails.
 *
 * Reference: 21 CFR 11.300 (controls for identification codes/passwords),
 *            OWASP Sensitive Data Exposure.
 */
interface CredentialRedactionPolicy {
  readonly _tag: "CredentialRedactionPolicy";
  /** Header names whose values MUST be redacted in logs and errors. */
  readonly redactHeaders: ReadonlyArray<string>;
  /** Query parameter names whose values MUST be redacted. */
  readonly redactQueryParams: ReadonlyArray<string>;
  /**
   * Cookie names whose values MUST be selectively redacted within Cookie headers.
   * When non-empty, only the named cookies are redacted from Cookie/Set-Cookie
   * headers (preserving non-credential cookies for diagnostic visibility).
   * When empty, the entire Cookie/Set-Cookie header value is redacted via
   * redactHeaders (default behavior).
   * Default: [] (entire cookie header redacted).
   * Example: ["sessionId", "JSESSIONID", "connect.sid", "__session"]
   */
  readonly redactCookieNames: ReadonlyArray<string>;
  /** Whether to redact request/response bodies in error messages. */
  readonly redactBodies: boolean;
  /** Replacement string for redacted values. */
  readonly redactionMarker: string;
  /** Whether to sanitize error messages before they reach callers. */
  readonly sanitizeErrors: boolean;
}
```

### withCredentialProtection Combinator

```typescript
function withCredentialProtection(
  options?: Partial<CredentialRedactionPolicy>
): (client: HttpClient) => HttpClient;
```

**Defaults:**

| Option              | Default                                                                         | Rationale                                                        |
| ------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `redactHeaders`     | `["authorization", "cookie", "set-cookie", "x-api-key", "proxy-authorization"]` | Standard credential-bearing headers                              |
| `redactQueryParams` | `["token", "api_key", "access_token", "key"]`                                   | Common credential query parameters                               |
| `redactCookieNames` | `[]`                                                                            | Empty = entire cookie header redacted; populate for granular per-cookie redaction |
| `redactBodies`      | `false`                                                                         | Bodies may contain GxP data needed for audit; redact selectively |
| `redactionMarker`   | `"[REDACTED]"`                                                                  | Consistent with `packages/logger/src/utils/sanitize.ts` pattern  |
| `sanitizeErrors`    | `true`                                                                          | Error messages MUST NOT leak credentials                         |

**Behavior:**

1. Wraps the inner client's error path to sanitize `HttpRequestError` and `HttpResponseError` messages
2. Before any error is returned to the caller, scans the error message and any attached request/response metadata for credential values and replaces them with the redaction marker
3. When `sanitizeErrors` is `true`, applies the same sanitization rules from `packages/logger/src/utils/sanitize.ts` to error messages
4. Redaction applies to logging, error messages, and audit entries — but NOT to the actual outgoing request (credentials must still be sent)

```
REQUIREMENT: The withCredentialProtection() combinator MUST ensure that credential
             values from redacted headers and query parameters NEVER appear in:
             (1) error messages returned to callers, (2) log entries produced by
             the HTTP client, (3) audit trail entries (section 92), or (4) inspection
             snapshots. The actual outgoing request MUST still carry the original
             credential values for server authentication.
             Reference: 21 CFR 11.300 (controls for identification codes/passwords),
             EU GMP Annex 11 §12.
```

```
REQUIREMENT: Error messages produced by HTTP operations on GxP data MUST be sanitized
             before they reach the caller. Sanitization MUST remove: (1) credential
             values (per redactHeaders and redactQueryParams), (2) full request/response
             bodies (replaced with size and content-type summary), and (3) internal
             server hostnames or IP addresses when sanitizeErrors is true. The
             sanitized error MUST retain sufficient diagnostic information (HTTP method,
             URL path without query string, status code, error code) for troubleshooting.
             Reference: OWASP Sensitive Data Exposure, 21 CFR 11.300.
```

```
RECOMMENDED: Organizations SHOULD extend the default redactHeaders list with any
             custom authentication headers used by their APIs (e.g., "x-custom-token",
             "x-session-id"). The redaction configuration SHOULD be reviewed during
             Operational Qualification (section 99) to ensure all credential-bearing
             headers are covered.
```

### Credential Vector Coverage

The `withCredentialProtection()` combinator MUST address all four HTTP credential vectors to satisfy 21 CFR 11.300 comprehensive credential protection requirements:

| Vector | Protection Mechanism | Default Patterns | Example Credentials |
|--------|---------------------|-----------------|-------------------|
| **Headers** | `redactHeaders` | `authorization`, `cookie`, `set-cookie`, `x-api-key`, `proxy-authorization` | Bearer tokens, API keys, session IDs in cookies, basic auth |
| **Query Parameters** | `redactQueryParams` | `token`, `api_key`, `access_token`, `key` | URL-embedded API keys, access tokens, SAS tokens |
| **Request/Response Bodies** | `bodyCredentialPatterns` (RECOMMENDED) | `$.password`, `$.access_token`, `$.refresh_token`, `$.client_secret` | OAuth token responses, authentication request payloads, webhook secrets |
| **Cookies** | `redactHeaders` (via `cookie`/`set-cookie`) + `redactCookieNames` | All `cookie`/`set-cookie` header values; specific cookie names: `sessionId`, `JSESSIONID`, `connect.sid`, `__session` | Session cookies, authentication cookies, CSRF tokens in cookies |

```
REQUIREMENT: The withCredentialProtection() combinator MUST protect all four
             credential vectors: (1) HTTP headers (via redactHeaders), (2) query
             parameters (via redactQueryParams), (3) request/response bodies (via
             bodyCredentialPatterns when configured), and (4) cookies (via
             redactHeaders covering "cookie"/"set-cookie" headers, and optionally
             via redactCookieNames for granular per-cookie-name redaction). The
             default redactHeaders list MUST include "cookie" and "set-cookie" to
             ensure cookie-based session credentials are redacted from all
             diagnostic and audit surfaces. When redactCookieNames is configured,
             only the named cookies are redacted from Cookie headers (rather than
             redacting the entire header value), allowing non-credential cookies
             to remain visible in audit entries.
             Reference: 21 CFR 11.300 (controls for identification codes/passwords),
             OWASP Session Management, EU GMP Annex 11 §12.
```

### Body Credential Leakage Protection

Header and query parameter redaction (above) addresses credential leakage in HTTP metadata. However, credentials can also appear in **request and response bodies** -- particularly in OAuth token exchange flows, authentication API calls, and webhook payloads. The `bodyCredentialPatterns` option extends `CredentialRedactionPolicy` to address this gap.

```typescript
interface BodyCredentialPattern {
  /** JSON path expression identifying the credential field (e.g., "$.password"). */
  readonly jsonPath: string;
  /** Content types this pattern applies to. Default: ["application/json"]. */
  readonly contentTypes: ReadonlyArray<string>;
  /** Human-readable description of what this pattern protects. */
  readonly description: string;
}
```

```
RECOMMENDED: The CredentialRedactionPolicy SHOULD support an optional
             bodyCredentialPatterns property that identifies credential-bearing
             fields in request and response bodies. When bodyCredentialPatterns is
             configured, the withCredentialProtection() combinator SHOULD scan
             request and response bodies matching the specified content types and
             replace credential field values with the redactionMarker before the
             body appears in error messages, log entries, audit trail entries, or
             inspection snapshots. The actual outgoing request body MUST NOT be
             modified — redaction applies only to diagnostic and audit surfaces.

             Default bodyCredentialPatterns SHOULD include the following 8 patterns:

             | # | jsonPath            | contentTypes                                       | Description                  |
             |---|---------------------|----------------------------------------------------|------------------------------|
             | 1 | $.password          | application/json, application/x-www-form-urlencoded | User password field          |
             | 2 | $.token             | application/json                                   | Generic token field          |
             | 3 | $.access_token      | application/json, application/x-www-form-urlencoded | OAuth access token           |
             | 4 | $.refresh_token     | application/json, application/x-www-form-urlencoded | OAuth refresh token          |
             | 5 | $.client_secret     | application/json, application/x-www-form-urlencoded | OAuth client secret          |
             | 6 | $.secret            | application/json                                   | Generic secret field         |
             | 7 | $.api_key           | application/json                                   | API key field                |
             | 8 | $.credentials       | application/json                                   | Generic credentials object   |

             For application/json bodies, field matching SHOULD use top-level JSON
             property lookup. For application/x-www-form-urlencoded bodies, field
             matching SHOULD use form parameter name lookup. OAuth token exchange
             responses (grant_type=authorization_code, grant_type=client_credentials)
             SHOULD be automatically matched for access_token, refresh_token, and
             token_type fields.

             Nested structure scanning is best-effort: the combinator SHOULD scan
             top-level fields and one level of nesting (e.g., $.auth.password) but
             is NOT REQUIRED to perform deep recursive scanning of arbitrarily nested
             objects. Organizations with deeply nested credential structures SHOULD
             add explicit jsonPath patterns for those fields.

             Reference: OWASP Sensitive Data Exposure, 21 CFR 11.300.
```

```
REQUIREMENT: When `gxp: true` is set in the HTTP client configuration, the
             withCredentialProtection() combinator MUST enable bodyCredentialPatterns
             with the 8 default patterns listed above ($.password, $.token,
             $.access_token, $.refresh_token, $.client_secret, $.secret, $.api_key,
             $.credentials). If the caller does not explicitly configure
             bodyCredentialPatterns, the combinator MUST auto-apply the 8 defaults.
             If the caller provides a custom bodyCredentialPatterns list, the combinator
             MUST merge it with the 8 defaults (caller patterns take precedence on
             jsonPath collision). This ensures that GxP environments always have
             baseline body credential protection without requiring explicit opt-in.
             Reference: 21 CFR 11.300 (controls for identification codes/passwords),
             OWASP Sensitive Data Exposure, ALCOA+ Attributable.
```

---

## 88. HTTP Configuration Change Control

### Configuration Audit Entry

```typescript
/**
 * Audit entry capturing HTTP client configuration changes for change traceability.
 *
 * Reference: EU GMP Annex 11 §10 (change management), 21 CFR 11.10(e) (audit trails).
 */
interface HttpClientConfigurationAuditEntry {
  readonly _tag: "HttpClientConfigurationAuditEntry";
  /** Unique identifier for this configuration change event. */
  readonly changeId: string;
  /** ISO 8601 UTC timestamp of the configuration change. */
  readonly timestamp: string;
  /** Identity of the actor who initiated the change (system or user). */
  readonly actorId: string;
  /** Which configuration was changed. */
  readonly configurationKey: string;
  /** Previous value (redacted if credential-bearing). */
  readonly previousValue: string;
  /** New value (redacted if credential-bearing). */
  readonly newValue: string;
  /** Reason for the change. */
  readonly reason: string;
  /** Whether the change was applied successfully. */
  readonly applied: boolean;
  /** Per-scope sequence number for ordering (same pattern as HttpAuditTrailPort contract §91). */
  readonly sequenceNumber: number;
  /** Hash chain integrity hash (same algorithm as HttpAuditTrailPort contract §91). */
  readonly integrityHash: string;
  /** Previous entry's integrity hash (empty for genesis). */
  readonly previousHash: string;
  /** Hash algorithm identifier. */
  readonly hashAlgorithm: string;
}
```

### Change Control Requirements

HTTP client configuration changes in GxP environments MUST be auditable. Configuration includes:

| Configuration Area     | Examples                               | Change Sensitivity                           |
| ---------------------- | -------------------------------------- | -------------------------------------------- |
| Base URL               | API endpoint changes                   | High — may redirect GxP data to wrong system |
| Authentication         | Token rotation, credential changes     | High — may affect access control             |
| TLS settings           | Certificate pinning, TLS version       | High — may weaken transport security         |
| Timeout/retry          | Timeout values, retry policies         | Medium — may affect data availability        |
| Combinator composition | Adding/removing/reordering combinators | High — may bypass security controls          |

```
REQUIREMENT: HttpClientConfigurationAuditEntry records MUST participate in the same
             hash chain as HttpOperationAuditEntry records within the HttpAuditTrailPort
             scope. The sequenceNumber, integrityHash, previousHash, and hashAlgorithm
             fields MUST follow the same monotonic sequencing and hash chaining pattern
             defined in HttpAuditTrailPort contract (§91). Configuration change entries and operation entries
             MUST be interleaved in a single chain — separate chains for configuration
             vs. operation entries are NOT permitted.
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(e).
```

```
REQUIREMENT: When gxp is true, every change to HTTP client configuration MUST produce
             an HttpClientConfigurationAuditEntry. The entry MUST be recorded via the
             same audit trail mechanism via HttpAuditTrailPort (§91). Configuration changes include: base URL, authentication credentials,
             TLS settings, combinator composition order, and timeout/retry parameters.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §10.
```

```
REQUIREMENT: HTTP client configuration MUST be immutable after construction in GxP
             environments. Runtime reconfiguration MUST NOT be permitted without
             producing a new client instance through the combinator pipeline. The
             previous client instance MUST remain available for in-flight requests
             until they complete.
             Reference: EU GMP Annex 11 §10 (change management).
```

```
RECOMMENDED: Organizations SHOULD version their HTTP client configurations and include
             the configuration version in audit entries (section 92) to enable
             traceability between HTTP operations and the configuration active at the
             time of the operation.
```

### Configuration Change Rollback Procedures

When a configuration change causes failures (e.g., wrong base URL, invalid TLS settings, misconfigured combinator ordering), a documented rollback procedure MUST be available to restore the previous working configuration.

```
REQUIREMENT: GxP deployments MUST implement a configuration rollback procedure
             that enables reverting to the previous known-good HTTP client
             configuration. The rollback procedure MUST:
             (1) Create a new HTTP client instance using the previous configuration
                 (the immutable client design means the original client is still
                 available as long as it has not been garbage-collected)
             (2) Record the rollback as an HttpClientConfigurationAuditEntry with
                 configurationKey "ROLLBACK", previousValue set to the failed
                 configuration identifier, newValue set to the restored configuration
                 identifier, and reason documenting why the rollback was necessary
             (3) Verify the restored client by executing a health check request
                 (non-GxP endpoint) before routing GxP traffic to it
             (4) Drain in-flight requests on the failed client before decommissioning
                 it — in-flight requests MUST NOT be aborted during rollback
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(c).
```

```
REQUIREMENT: Configuration rollback events MUST be distinguishable from normal
             configuration changes in the audit trail. The HttpClientConfigurationAuditEntry
             for a rollback MUST include configurationKey "ROLLBACK" and the reason
             field MUST reference the changeId of the failed configuration change
             that triggered the rollback. This enables auditors to trace the full
             sequence: original config → failed change → rollback.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
```

```
REQUIREMENT: Configuration rollback MUST target only configurations within a
             bounded rollback depth. The maximum rollback depth MUST be
             configurable with a default of 3 (the immediately preceding
             configuration plus 2 additional predecessors). Rollback attempts
             beyond the maximum depth MUST be rejected with a ConfigurationError
             code "ROLLBACK_DEPTH_EXCEEDED" and message "Cannot rollback beyond
             N configurations. Use the change control process (§116) to deploy
             a new configuration instead." This prevents unbounded rollback
             chains that could bypass change control review.
             Reference: EU GMP Annex 11 §10.
```

```
RECOMMENDED: Organizations SHOULD maintain a configuration history that retains
             the last N known-good configurations (matching the maximum rollback
             depth, RECOMMENDED minimum: 3) to enable multi-step rollback when
             consecutive changes fail. The configuration history SHOULD be stored
             independently of the HTTP client runtime (e.g., in configuration
             management tooling or version control) and SHOULD be referenced in
             the Validation Plan (§83a).
```

```
REQUIREMENT: When the health check verification (step 3 of rollback) fails for
             the restored configuration, the rollback procedure MUST:
             (1) Record an HttpClientConfigurationAuditEntry with configurationKey
                 "ROLLBACK_HEALTH_CHECK_FAILED" documenting the failure details
             (2) NOT route GxP traffic to the restored client
             (3) Classify the situation as an S2 (Major) incident per §83c
             (4) Block all new GxP HTTP operations until a functional configuration
                 is established through the standard change control process (§116)
             (5) Retain both the failed and rolled-back client instances for
                 diagnostic purposes until the incident is resolved
             Reference: EU GMP Annex 11 §10, §13, 21 CFR 11.10(c).
```

```
RECOMMENDED: Organizations SHOULD include configuration rollback testing in
             the OQ (§99b). The OQ test SHOULD verify: (1) rollback produces
             a functional client, (2) rollback is audited correctly, (3) in-flight
             requests complete without error during rollback, (4) the restored
             client passes the standard health check, and (5) rollback health check
             failure correctly escalates to incident classification.
```

---

## 89. GxP Payload Schema Validation

### Configuration

```typescript
interface PayloadSchemaValidationConfig {
  readonly _tag: "PayloadSchemaValidationConfig";
  /** Schema for validating outgoing request bodies. */
  readonly requestSchema: PayloadSchema | undefined;
  /** Schema for validating incoming response bodies. */
  readonly responseSchema: PayloadSchema | undefined;
  /** Whether to reject requests with invalid bodies or log a warning. */
  readonly requestValidationMode: "reject" | "warn";
  /** Whether to reject responses with invalid bodies or log a warning. */
  readonly responseValidationMode: "reject" | "warn";
}

/**
 * A payload schema defines the expected structure of an HTTP body.
 * Schemas are plain data (JSON-serializable) for audit trail inclusion.
 */
interface PayloadSchema {
  readonly _tag: "PayloadSchema";
  /** Schema identifier (e.g., "batch-record-v2", "lab-result-v1"). */
  readonly schemaId: string;
  /** Schema version. */
  readonly version: string;
  /** JSON Schema (draft 2020-12) defining the expected structure. */
  readonly jsonSchema: Readonly<Record<string, unknown>>;
}

interface PayloadValidationResult {
  readonly _tag: "PayloadValidationResult";
  /** Whether validation passed. */
  readonly valid: boolean;
  /** Validation errors (empty array when valid). */
  readonly errors: ReadonlyArray<PayloadValidationError>;
  /** The schema used for validation. */
  readonly schemaId: string;
  /** The schema version used. */
  readonly schemaVersion: string;
}

interface PayloadValidationError {
  readonly path: string;
  readonly message: string;
  readonly keyword: string;
}
```

### withPayloadValidation Combinator

```typescript
function withPayloadValidation(
  config: PayloadSchemaValidationConfig
): (client: HttpClient) => HttpClient;
```

**Behavior:**

1. For outgoing requests with a body and a configured `requestSchema`:
   - Validates the request body against the JSON Schema
   - In `"reject"` mode: returns `Err(HttpRequestError)` with code `"PAYLOAD_VALIDATION_FAILED"` and the validation errors
   - In `"warn"` mode: logs a WARNING with the validation errors and proceeds with the request

2. For incoming responses with a configured `responseSchema`:
   - Validates the response body against the JSON Schema
   - In `"reject"` mode: returns `Err(HttpResponseError)` with code `"PAYLOAD_VALIDATION_FAILED"` and the validation errors
   - In `"warn"` mode: logs a WARNING with the validation errors and returns the response

3. Records the `PayloadValidationResult` in the request/response context for audit correlation (section 92)

```
REQUIREMENT: When requestValidationMode is "reject", the combinator MUST prevent
             sending requests with bodies that fail schema validation. The rejection
             MUST include the schemaId, schemaVersion, and all validation errors to
             enable diagnosis. Invalid requests MUST NOT reach the transport adapter.
             Reference: 21 CFR 11.10(h) (device checks for data input validity),
             ALCOA+ Accurate.
```

```
REQUIREMENT: PayloadSchema definitions MUST be JSON-serializable plain data so they
             can be included in audit entries and configuration change records. Schemas
             MUST NOT contain executable code (functions, RegExp objects with side
             effects, or eval-based validators).
             Reference: EU GMP Annex 11 §7 (data integrity).
```

```
RECOMMENDED: Organizations SHOULD use "reject" mode for both request and response
             validation in GxP-critical integrations (e.g., batch record submissions,
             laboratory result uploads). "warn" mode SHOULD be reserved for
             non-critical integrations or during migration periods where schemas are
             being stabilized. The chosen mode SHOULD be documented in the validation
             plan (section 99).
```

> **Validation Scope Note:** `withPayloadValidation()` performs **structural validation** (JSON Schema / XSD conformance) at the HTTP transport layer. It does not perform semantic validation (business rules, referential integrity, cross-field consistency), which MUST be implemented at the application domain layer. See §111 for the complete transport vs. business validation boundary definition and the recommended layered validation matrix for GxP deployments.

### Non-JSON Payload Validation

The `withPayloadValidation()` combinator's default behavior uses JSON Schema for `application/json` payloads. GxP integrations may use non-JSON content types, including XML (common in HL7, FHIR, and legacy pharmaceutical systems) and multipart/form-data (common in file uploads such as certificate of analysis documents, chromatography data, and batch record attachments).

#### XML Payload Validation

```typescript
/**
 * Configuration for XML payload validation.
 * Extends PayloadSchemaValidationConfig with XML-specific options.
 */
interface XmlPayloadValidationConfig {
  readonly _tag: "XmlPayloadValidationConfig";
  /** XSD (XML Schema Definition) for validating XML payloads. */
  readonly xsdSchema: string;
  /** Schema identifier for audit traceability. */
  readonly schemaId: string;
  /** Schema version. */
  readonly version: string;
  /**
   * Content types this XML schema applies to.
   * Default: ["application/xml", "text/xml", "application/fhir+xml"].
   */
  readonly contentTypes: ReadonlyArray<string>;
  /**
   * Whether to validate against DTD declarations in the XML.
   * MUST be false in GxP environments to prevent XXE attacks.
   * Default: false.
   */
  readonly allowDtd: boolean;
  /**
   * Maximum XML document size in bytes.
   * Prevents denial-of-service via oversized XML payloads.
   * Default: 10_485_760 (10 MB).
   */
  readonly maxDocumentSize: number;
}
```

```
REQUIREMENT: When XML payloads are used for GxP data exchange, the
             withPayloadValidation() combinator MUST support XSD-based
             validation via XmlPayloadValidationConfig. The XML parser
             MUST disable DTD processing (allowDtd: false) to prevent
             XML External Entity (XXE) injection attacks. XML validation
             results MUST be recorded in the PayloadValidationResult
             included in audit entries (§92), using the same schemaId
             and version fields as JSON Schema validation.
             Reference: 21 CFR 11.10(h), OWASP XXE Prevention.
```

```
RECOMMENDED: Organizations exchanging GxP data in XML format (e.g., HL7v2
             messages, FHIR XML resources, FDA ESG submissions) SHOULD
             configure XmlPayloadValidationConfig with the appropriate XSD
             for each integration endpoint. The XSD SHOULD be versioned
             and included in the Validation Plan (§83a) configuration baseline.
```

#### Multipart/Form-Data Validation

```typescript
/**
 * Configuration for multipart/form-data payload validation.
 * Addresses file upload scenarios common in GxP environments.
 */
interface MultipartValidationConfig {
  readonly _tag: "MultipartValidationConfig";
  /** Schema identifier for audit traceability. */
  readonly schemaId: string;
  /** Schema version. */
  readonly version: string;
  /**
   * Allowed part names and their constraints.
   * Parts not listed here are rejected when strictParts is true.
   */
  readonly parts: ReadonlyArray<MultipartPartConstraint>;
  /**
   * Whether to reject parts not listed in the parts array.
   * When true, unexpected parts cause validation failure.
   * Default: true in GxP mode.
   */
  readonly strictParts: boolean;
  /**
   * Maximum total multipart payload size in bytes.
   * Default: 104_857_600 (100 MB).
   */
  readonly maxTotalSize: number;
}

interface MultipartPartConstraint {
  readonly _tag: "MultipartPartConstraint";
  /** Expected part name (field name in the form). */
  readonly partName: string;
  /** Whether this part is required. */
  readonly required: boolean;
  /** Allowed content types for this part. Empty array = any type. */
  readonly allowedContentTypes: ReadonlyArray<string>;
  /** Maximum size for this part in bytes. 0 = no limit (uses maxTotalSize). */
  readonly maxPartSize: number;
  /** Human-readable description for audit traceability. */
  readonly description: string;
}
```

```
REQUIREMENT: When multipart/form-data payloads are used for GxP data exchange
             (e.g., file uploads, document submissions), the withPayloadValidation()
             combinator MUST support validation via MultipartValidationConfig.
             Validation MUST check: (1) required parts are present, (2) part
             content types match allowedContentTypes, (3) individual part sizes
             do not exceed maxPartSize, (4) total payload size does not exceed
             maxTotalSize, and (5) no unexpected parts when strictParts is true.
             Validation results MUST be recorded in audit entries (§92).
             Reference: 21 CFR 11.10(h).
```

```
RECOMMENDED: Organizations uploading GxP documents (certificates of analysis,
             chromatography data files, signed batch record PDFs) via multipart
             form submissions SHOULD configure MultipartValidationConfig with:
             (1) strictParts: true to prevent injection of unexpected form fields,
             (2) allowedContentTypes restricted to expected document formats
             (e.g., ["application/pdf", "application/xml"]), and (3) maxPartSize
             appropriate for the expected document sizes.
```

---

_Previous: [18a - HTTPS & TLS Enforcement](./18a-https-tls-enforcement.md) | Next: [18c - Session, Auth & Extended Controls](./18c-session-auth-extended.md)_
