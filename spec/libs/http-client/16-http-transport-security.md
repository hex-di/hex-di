# 16 - HTTP Transport Security

_Previous: [15 - Appendices](./15-appendices.md) | Next: [17 - Definition of Done](./17-definition-of-done.md)_

---

This document specifies how `@hex-di/http-client` integrates GxP-compliant transport security when authorization decisions flow into outbound HTTP operations. It addresses critical gaps identified in GxP compliance reviews of the HTTP transport layer: HTTPS enforcement, payload integrity verification, credential protection, configuration change control, payload schema validation, and session/token lifecycle management.

These sections bridge the guard library's compliance infrastructure (guard spec sections 59-70) with the HTTP client combinator model (sections 29-44). Non-regulated environments can skip this document entirely.

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) and carry the same pharmaceutical alignment defined in guard spec section 59.

### Scope

The guard library does **not** implement HTTP transport. It provides **combinators** that wrap `HttpClient` instances with GxP-compliant security enforcement. The actual TLS handshake, certificate validation, and network I/O remain the responsibility of the platform adapter (spec/http-client section 39). This document specifies the behavioral contracts these combinators enforce.

---

## 84. HTTP Transport Security Overview

### Regulatory Drivers

| Regulation              | Requirement                                  | HTTP Transport Relevance                                                               |
| ----------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| **21 CFR 11.10(c)**     | Protection of records for accurate retrieval | GxP payloads in transit MUST be protected against tampering                            |
| **21 CFR 11.30**        | Controls for open systems                    | HTTP operations over untrusted networks require TLS, digital signatures, encryption    |
| **EU GMP Annex 11 §7**  | Data storage — data integrity                | Payloads transmitted via HTTP constitute data in transit; integrity MUST be verifiable |
| **EU GMP Annex 11 §12** | Security — access control                    | HTTP operations carrying GxP data MUST enforce access control at the transport level   |
| **ALCOA+ Accurate**     | Records reflect what happened                | Payload integrity verification ensures transmitted data matches origin                 |
| **ALCOA+ Complete**     | All events recorded                          | HTTP operations modifying GxP records MUST be audit-trailed (see section 92)           |
| **MHRA DI Guidance**    | Cloud-hosted data controls                   | HTTP operations to cloud APIs MUST enforce TLS and credential protection               |

### Guard's HTTP Transport Scope

`@hex-di/guard` provides the following HTTP transport security controls as `ClientCombinator` functions (see spec/http-client section 29):

- **In scope:** HTTPS enforcement, TLS version requirements, certificate validation policy, payload integrity verification (request/response hashing), credential redaction in logs and errors, HTTP configuration change audit, payload schema validation, token lifecycle management
- **Out of scope:** TLS implementation (platform adapter responsibility), key exchange algorithms (platform/OS TLS stack), network-level firewall rules, DNS security (DNSSEC — see mitigation guidance below), IP allowlisting

### DNS Security Mitigation Guidance

While DNSSEC implementation is outside the scope of `@hex-di/http-client` (it operates at the network/OS level), DNS-based attacks can undermine TLS security by redirecting connections to attacker-controlled servers before TLS negotiation begins. GxP deployments SHOULD implement the following compensating controls:

```
RECOMMENDED: GxP deployments SHOULD implement DNS security controls at the
             infrastructure level to mitigate DNS-based attacks that could
             redirect HTTP connections to unauthorized servers:

             1. **DNSSEC validation:** The DNS resolver used by the application
                runtime SHOULD validate DNSSEC signatures. On Linux, this can
                be configured via systemd-resolved (DNSSEC=yes) or a validating
                resolver like Unbound. On Kubernetes, CoreDNS can be configured
                with the dnssec plugin.

             2. **DNS-over-HTTPS (DoH) or DNS-over-TLS (DoT):** The application
                runtime SHOULD use encrypted DNS resolution to prevent DNS
                response tampering on the network path. Node.js 18+ supports
                custom DNS resolvers that can be configured for DoH/DoT.

             3. **Certificate pinning as compensating control:** When DNSSEC is
                not available, certificate pinning (§85) provides defense-in-depth
                against DNS hijacking. Even if DNS is compromised, the attacker
                cannot present a valid pinned certificate for the target host.

             4. **DNS resolution audit logging:** Organizations SHOULD log DNS
                resolution results (resolved IP addresses) for GxP HTTP endpoints.
                While this library does not perform DNS resolution, platform
                adapters or infrastructure-level logging can capture this data for
                incident investigation.

             5. **Static host resolution:** For critical GxP endpoints with stable
                IP addresses, organizations MAY use /etc/hosts entries or
                environment-level DNS overrides to bypass DNS resolution entirely,
                eliminating DNS-based attack surface. This approach requires
                operational procedures to update entries when IP addresses change.

             Reference: 21 CFR 11.30, NIST SP 800-81-2 (Secure DNS Deployment Guide).
```

### GxP Endpoint Data Classification

GxP HTTP endpoints are classified into three risk categories that determine the mandatory security controls applied by the combinator pipeline. This classification scheme is referenced throughout the spec (§85, §98, §103, §113) and MUST be applied consistently.

| Category       | Risk Level | Description                                                                                                                                                                                | Examples                                                                                                                                                                            | Mandatory Controls                                                                                                                |
| -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Category 1** | Critical   | Endpoints transmitting or modifying patient safety data, batch release decisions, or critical quality records. Failure or compromise directly impacts patient safety or product quality.   | Batch record submissions, batch release approvals, adverse event reports, product recall triggers, critical quality attribute submissions, stability data affecting product release | Certificate pinning (§85), mTLS (§85), `rateLimit()` (§113), all REQUIRED combinators, hard-fail certificate revocation (§106)    |
| **Category 2** | High       | Endpoints transmitting or modifying GxP-regulated data that does not directly impact patient safety. Failure or compromise impacts regulatory compliance but not immediate patient safety. | Laboratory results (non-release), environmental monitoring data, equipment calibration records, training record submissions, deviation/CAPA reports, audit trail queries            | All REQUIRED combinators, certificate revocation checking (hard-fail or soft-fail per risk assessment), `rateLimit()` RECOMMENDED |
| **Category 3** | Moderate   | Endpoints transmitting GxP-adjacent data or performing read-only access to regulated systems. Failure impacts operational efficiency but not data integrity of regulated records.          | Read-only GxP data retrieval, reference data lookups, non-regulated reporting, system health checks against GxP infrastructure                                                      | All REQUIRED combinators, certificate revocation checking RECOMMENDED, `rateLimit()` RECOMMENDED                                  |

```
REQUIREMENT: Organizations deploying @hex-di/http-client in GxP environments MUST
             classify each HTTP endpoint into Category 1, 2, or 3 using the criteria
             defined above. The classification MUST be documented in the Validation
             Plan (§83a) and referenced in the FMEA (§98) for each endpoint. The
             classification determines the minimum set of mandatory security controls
             applied by the combinator pipeline. Endpoints that transmit mixed-
             category data (e.g., a single API that handles both Category 1 batch
             release and Category 2 lab results) MUST be classified at the highest
             applicable category.
             Reference: ICH Q9, 21 CFR 11.10(a), EU GMP Annex 11 §4.
```

```
RECOMMENDED: Organizations SHOULD maintain a GxP Endpoint Registry as a controlled
             document listing every HTTP endpoint accessed by the application, its
             data classification category, the security controls applied, and the
             justification for the classification. The registry SHOULD be reviewed
             during periodic reviews (§83b) and updated when new endpoints are added
             or endpoint data sensitivity changes.
```

### Combinator Composition Order

GxP transport security combinators compose with standard HTTP client combinators via `pipe()`. The RECOMMENDED composition order places security combinators **before** functional combinators:

```typescript
const gxpClient = pipe(
  baseClient,
  // 1. Transport security (this document)
  requireHttps({ minTlsVersion: "1.2" }),
  withCredentialProtection({ redactHeaders: ["authorization", "x-api-key"] }),
  withPayloadIntegrity({ algorithm: "sha256" }),
  withPayloadValidation({ request: requestSchema, response: responseSchema }),
  withTokenLifecycle({ maxAge: 3600, refreshBefore: 300 }),
  // 2. Audit bridge (section 92)
  withHttpAuditBridge(auditTrail),
  // 3. Standard HTTP combinators (spec/http-client)
  HttpClient.baseUrl("https://api.example.com"),
  HttpClient.bearerAuth(token),
  HttpClient.filterStatusOk,
  HttpClient.retryTransient({ times: 3 }),
  HttpClient.timeout(30_000)
);
```

```
REQUIREMENT: When gxp is true on the guard graph, the requireHttps() combinator
             MUST be the first combinator applied to any HttpClient that transmits
             GxP data. Applying functional combinators (e.g., baseUrl, bearerAuth)
             before requireHttps() creates a window where non-HTTPS requests could
             be constructed.
             Reference: 21 CFR 11.30, EU GMP Annex 11 §12.
```

---

## 85. HTTPS Enforcement

### Transport Security Policy

```typescript
interface HttpTransportSecurityPolicy {
  readonly _tag: "HttpTransportSecurityPolicy";
  /** Minimum accepted TLS version. */
  readonly minTlsVersion: "1.2" | "1.3";
  /** Certificate validation behavior. */
  readonly certificateValidation: CertificateValidationPolicy;
  /** Whether to reject HTTP (non-TLS) URLs entirely. */
  readonly rejectPlainHttp: boolean;
  /** Allowed hostnames for certificate pinning (empty = no pinning). */
  readonly pinnedHosts: ReadonlyArray<string>;
  /**
   * Certificate pin digests for HPKP-style pinning.
   * Each pin specifies a hash algorithm and the base64-encoded digest
   * of the Subject Public Key Info (SPKI) of a certificate in the chain.
   * When non-empty, at least one pin MUST match a certificate in the
   * server's chain for the connection to succeed.
   *
   * REQUIRED for Category 1 GxP endpoints (patient safety data, batch
   * release decisions, critical quality records) to prevent MITM attacks
   * even under CA compromise. RECOMMENDED for Category 2 and 3 endpoints.
   * Reference: RFC 7469, NIST SP 800-52 Rev. 2.
   */
  readonly certificatePins: ReadonlyArray<CertificatePin>;
  /**
   * Cipher suite restriction policy.
   * - "default": Platform adapter's default cipher suites.
   * - "gxp-restricted": Only NIST SP 800-52r2 recommended cipher suites
   *   (TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384,
   *    TLS_CHACHA20_POLY1305_SHA256 for TLS 1.3;
   *    ECDHE+AESGCM, DHE+AESGCM for TLS 1.2).
   * Default: "default".
   */
  readonly cipherSuitePolicy: "default" | "gxp-restricted";
}

/**
 * A certificate pin identifying a specific SPKI digest.
 * Follows the format from RFC 7469 (HTTP Public Key Pinning).
 */
interface CertificatePin {
  readonly _tag: "CertificatePin";
  /** Hash algorithm used to compute the digest. */
  readonly algorithm: "sha256";
  /** Base64-encoded digest of the certificate's SPKI. */
  readonly digest: string;
  /**
   * Human-readable label identifying which certificate this pin represents.
   * Example: "production-ca-2025", "backup-ca-intermediate".
   */
  readonly label: string;
}

interface CertificateValidationPolicy {
  readonly _tag: "CertificateValidationPolicy";
  /** Whether to verify the server certificate chain. */
  readonly verifyCertificateChain: boolean;
  /**
   * Certificate revocation checking policy.
   * See section 106 (CertificateRevocationPolicy) for full specification.
   */
  readonly revocationPolicy: CertificateRevocationPolicy;
  /** Maximum certificate validity period in days (0 = no limit). */
  readonly maxCertificateValidityDays: number;
}
```

### requireHttps Combinator

```typescript
function requireHttps(
  options?: Partial<HttpTransportSecurityPolicy>
): (client: HttpClient) => HttpClient;
```

**Defaults:**

| Option                                             | Default     | Rationale                                                                                 |
| -------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `minTlsVersion`                                    | `"1.2"`     | 21 CFR 11.30 requires encryption for open systems; TLS 1.0/1.1 deprecated per RFC 8996    |
| `rejectPlainHttp`                                  | `true`      | GxP data MUST NOT traverse unencrypted connections                                        |
| `certificateValidation.verifyCertificateChain`     | `true`      | 21 CFR 11.10(d) access control requires server authentication                             |
| `certificateValidation.revocationPolicy.enabled`   | `false`     | RECOMMENDED but may be impractical in air-gapped environments; see §106 for full policy   |
| `certificateValidation.maxCertificateValidityDays` | `0`         | No limit by default; configurable for strict environments                                 |
| `pinnedHosts`                                      | `[]`        | No pinning by default; use for high-security endpoints                                    |
| `certificatePins`                                  | `[]`        | No SPKI pinning by default; REQUIRED for Category 1 GxP endpoints (see REQUIREMENT below) |
| `cipherSuitePolicy`                                | `"default"` | Platform default; use `"gxp-restricted"` for NIST SP 800-52r2 compliance                  |

**Behavior:**

1. Intercepts every outgoing `HttpRequest` via `mapRequestResult` (spec/http-client section 30)
2. Rejects any request whose URL scheme is not `https://` — returns `Err(HttpRequestError)` with code `"HTTPS_REQUIRED"` and the offending URL
3. Attaches TLS version requirement metadata to the request context for the platform adapter to enforce
4. On response, verifies that the platform adapter reports a TLS version >= `minTlsVersion`

```
REQUIREMENT: The requireHttps() combinator MUST reject any HttpRequest with a non-HTTPS
             URL before the request reaches the platform adapter. The rejection MUST
             produce an HttpRequestError with code "HTTPS_REQUIRED" containing the
             offending URL for diagnosis.
             Reference: 21 CFR 11.30(a).
```

```
REQUIREMENT: When minTlsVersion is "1.2", the combinator MUST reject connections
             negotiated at TLS 1.0 or TLS 1.1. When minTlsVersion is "1.3", the
             combinator MUST reject connections negotiated at TLS 1.2 or below. TLS
             version enforcement depends on the platform adapter reporting the
             negotiated TLS version in the HttpResponse metadata. If the platform
             adapter does not report TLS version, the combinator MUST log a WARNING
             and proceed (best-effort enforcement).
             Reference: RFC 8996, NIST SP 800-52 Rev. 2.
```

```
RECOMMENDED: Organizations SHOULD enable certificate revocation checking
             (revocationPolicy.enabled: true) for production GxP deployments where
             network connectivity to OCSP responders or CRL distribution points is
             available. See section 106 for the full CertificateRevocationPolicy
             specification, including method priority (OCSP stapling > OCSP > CRL),
             hard-fail vs. soft-fail behavior, and caching configuration.
             For air-gapped or isolated environments, revocation checking MAY be
             disabled with documented justification in the validation plan (guard spec section 67).
```

### Certificate Validation

> **Forward Reference:** The `revocationPolicy` field on `CertificateValidationPolicy` is specified in detail in section 106 (Certificate Revocation Checking Protocol). Section 106 defines `CertificateRevocationPolicy` with method priority, hard-fail/soft-fail behavior, OCSP/CRL caching, and audit requirements.

```
REQUIREMENT: When certificateValidation.verifyCertificateChain is true, the platform
             adapter MUST verify the full certificate chain from the server certificate
             to a trusted root CA. Self-signed certificates MUST be rejected unless
             explicitly added to the trust store. The combinator MUST propagate
             certificate validation failures from the platform adapter as
             HttpRequestError with code "CERTIFICATE_VALIDATION_FAILED".
             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

```
REQUIREMENT: When certificatePins is non-empty, the requireHttps() combinator MUST
             verify that at least one pin matches a certificate in the server's
             certificate chain. The match is computed by hashing the Subject Public
             Key Info (SPKI) of each certificate in the chain using the pin's
             algorithm and comparing the base64-encoded result against the pin's
             digest. If no pin matches, the connection MUST be rejected with
             HttpRequestError code "CERTIFICATE_PIN_FAILED" containing the hostname
             and the expected pin labels. Certificate pin failures MUST be recorded
             as HttpClientConfigurationAuditEntry records (§88) with severity "critical".
             Reference: RFC 7469, NIST SP 800-52 Rev. 2.
```

```
REQUIREMENT: When cipherSuitePolicy is "gxp-restricted", the requireHttps()
             combinator MUST communicate the cipher suite restriction to the platform
             adapter. If the platform adapter negotiates a cipher suite outside the
             restricted set, the combinator MUST reject the connection with
             HttpRequestError code "CIPHER_SUITE_REJECTED". If the platform adapter
             does not report the negotiated cipher suite, the combinator MUST log a
             WARNING and proceed (best-effort enforcement).
             Reference: NIST SP 800-52 Rev. 2.
```

```
REQUIREMENT: For Category 1 GxP endpoints (endpoints transmitting or modifying
             patient safety data, batch release decisions, or critical quality
             records as classified in the FMEA §98), the requireHttps() combinator
             MUST be configured with non-empty certificatePins. Certificate pinning
             provides mandatory defense-in-depth against Certificate Authority (CA)
             compromise, ensuring that even if a CA is compromised and issues a
             fraudulent certificate for the target hostname, the connection is
             rejected because the fraudulent certificate's SPKI will not match the
             pinned digests. When `gxp: true` and the target endpoint is classified
             as Category 1, the `createGxPHttpClient` factory (§103) MUST validate
             that certificatePins is non-empty for that endpoint. If certificatePins
             is empty for a Category 1 endpoint, the factory MUST throw a
             ConfigurationError with error code "CERTIFICATE_PIN_REQUIRED_CAT1"
             and a message referencing the Category 1 classification and RFC 7469.
             Reference: RFC 7469, NIST SP 800-52 Rev. 2, 21 CFR 11.30.
```

```
RECOMMENDED: Organizations deploying certificate pinning SHOULD always include at
             least two pins: one for the active certificate and one for a backup
             certificate. This prevents service disruption during certificate
             rotation. Pin changes MUST produce HttpClientConfigurationAuditEntry
             records (§88). Organizations SHOULD schedule periodic pin rotation
             reviews as part of the periodic review cycle (§83b).
```

```
REQUIREMENT: Certificate validation errors MUST include diagnostic information:
             (1) the hostname that failed validation, (2) the failure reason
             (expired, untrusted root, hostname mismatch, revoked), and (3) the
             certificate subject and issuer (if available from the platform adapter).
             Credential material (private keys, certificate contents beyond
             subject/issuer) MUST NOT appear in error messages.
             Reference: 21 CFR 11.10(d).
```

---

## 86. Payload Integrity Verification

### Configuration

```typescript
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
interface CredentialRedactionPolicy {
  readonly _tag: "CredentialRedactionPolicy";
  /** Header names whose values MUST be redacted in logs and errors. */
  readonly redactHeaders: ReadonlyArray<string>;
  /** Query parameter names whose values MUST be redacted. */
  readonly redactQueryParams: ReadonlyArray<string>;
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

### Body Credential Leakage Protection

Header and query parameter redaction (above) addresses credential leakage in HTTP metadata. However, credentials can also appear in **request and response bodies** — particularly in OAuth token exchange flows, authentication API calls, and webhook payloads.

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

             Reference: OWASP Sensitive Data Exposure, 21 CFR 11.300.
```

```
REQUIREMENT: When `gxp: true` is set in the HTTP client configuration, the
             withCredentialProtection() combinator MUST enable bodyCredentialPatterns
             with the 8 default patterns listed above. If the caller does not explicitly
             configure bodyCredentialPatterns, the combinator MUST auto-apply the
             8 defaults. If the caller provides a custom bodyCredentialPatterns list,
             the combinator MUST merge it with the 8 defaults (caller patterns take
             precedence on jsonPath collision).
             Reference: 21 CFR 11.300, OWASP Sensitive Data Exposure, ALCOA+ Attributable.
```

---

## 88. HTTP Configuration Change Control

### Configuration Audit Entry

```typescript
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
  /** Per-scope sequence number for ordering. */
  readonly sequenceNumber: number;
  /** Hash chain integrity hash. */
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
             scope. Configuration change entries and operation entries MUST be
             interleaved in a single chain — separate chains for configuration vs.
             operation entries are NOT permitted.
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(e).
```

```
REQUIREMENT: When gxp is true, every change to HTTP client configuration MUST produce
             an HttpClientConfigurationAuditEntry. The entry MUST be recorded via the
             same audit trail mechanism used for guard authorization decisions.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §10.
```

```
REQUIREMENT: HTTP client configuration MUST be immutable after construction in GxP
             environments. Runtime reconfiguration MUST NOT be permitted without
             producing a new client instance through the combinator pipeline.
             Reference: EU GMP Annex 11 §10 (change management).
```

### Configuration Change Rollback Procedures

```
REQUIREMENT: GxP deployments MUST implement a configuration rollback procedure
             that enables reverting to the previous known-good HTTP client
             configuration. The rollback procedure MUST:
             (1) Create a new HTTP client instance using the previous configuration
             (2) Record the rollback as an HttpClientConfigurationAuditEntry with
                 configurationKey "ROLLBACK"
             (3) Verify the restored client by executing a health check request
                 before routing GxP traffic to it
             (4) Drain in-flight requests on the failed client before decommissioning
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(c).
```

```
REQUIREMENT: Configuration rollback events MUST be distinguishable from normal
             configuration changes in the audit trail. The HttpClientConfigurationAuditEntry
             for a rollback MUST include configurationKey "ROLLBACK" and the reason
             field MUST reference the changeId of the failed configuration change.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §9.
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
  readonly valid: boolean;
  readonly errors: ReadonlyArray<PayloadValidationError>;
  readonly schemaId: string;
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
   - In `"reject"` mode: returns `Err(HttpRequestError)` with code `"PAYLOAD_VALIDATION_FAILED"` and validation errors on schema mismatch
   - In `"warn"` mode: logs a WARNING with validation errors and proceeds

2. For incoming responses with a configured `responseSchema`:
   - In `"reject"` mode: returns `Err(HttpResponseError)` with code `"PAYLOAD_VALIDATION_FAILED"` on schema mismatch
   - In `"warn"` mode: logs a WARNING and returns the response

3. Records the `PayloadValidationResult` in the request/response context for audit correlation (section 92)

```
REQUIREMENT: When requestValidationMode is "reject", the combinator MUST prevent
             sending requests with bodies that fail schema validation. Invalid
             requests MUST NOT reach the platform adapter.
             Reference: 21 CFR 11.10(h), ALCOA+ Accurate.
```

```
REQUIREMENT: PayloadSchema definitions MUST be JSON-serializable plain data so they
             can be included in audit entries and configuration change records. Schemas
             MUST NOT contain executable code.
             Reference: EU GMP Annex 11 §7.
```

> **Validation Scope Note:** `withPayloadValidation()` performs **structural validation** (JSON Schema / XSD conformance) at the HTTP transport layer. It does not perform semantic validation (business rules, referential integrity, cross-field consistency), which MUST be implemented at the application domain layer.

### XML Payload Validation

```typescript
interface XmlPayloadValidationConfig {
  readonly _tag: "XmlPayloadValidationConfig";
  readonly xsdSchema: string;
  readonly schemaId: string;
  readonly version: string;
  readonly contentTypes: ReadonlyArray<string>;
  /**
   * Whether to validate against DTD declarations in the XML.
   * MUST be false in GxP environments to prevent XXE attacks.
   * Default: false.
   */
  readonly allowDtd: boolean;
  readonly maxDocumentSize: number;
}
```

```
REQUIREMENT: When XML payloads are used for GxP data exchange, the
             withPayloadValidation() combinator MUST support XSD-based
             validation via XmlPayloadValidationConfig. The XML parser
             MUST disable DTD processing (allowDtd: false) to prevent
             XML External Entity (XXE) injection attacks.
             Reference: 21 CFR 11.10(h), OWASP XXE Prevention.
```

### Multipart/Form-Data Validation

```typescript
interface MultipartValidationConfig {
  readonly _tag: "MultipartValidationConfig";
  readonly schemaId: string;
  readonly version: string;
  readonly parts: ReadonlyArray<MultipartPartConstraint>;
  readonly strictParts: boolean;
  readonly maxTotalSize: number;
}

interface MultipartPartConstraint {
  readonly _tag: "MultipartPartConstraint";
  readonly partName: string;
  readonly required: boolean;
  readonly allowedContentTypes: ReadonlyArray<string>;
  readonly maxPartSize: number;
  readonly description: string;
}
```

```
REQUIREMENT: When multipart/form-data payloads are used for GxP data exchange,
             the withPayloadValidation() combinator MUST support validation via
             MultipartValidationConfig. Validation MUST check: (1) required parts
             are present, (2) part content types match allowedContentTypes,
             (3) individual part sizes do not exceed maxPartSize, (4) total payload
             size does not exceed maxTotalSize, and (5) no unexpected parts when
             strictParts is true.
             Reference: 21 CFR 11.10(h).
```

---

## 90. Session and Token Lifecycle

### Token Lifecycle Policy

```typescript
interface TokenLifecyclePolicy {
  readonly _tag: "TokenLifecyclePolicy";
  /** Maximum token age in seconds. Tokens older than this MUST be rejected. */
  readonly maxAge: number;
  /** Seconds before expiration to attempt proactive refresh. */
  readonly refreshBefore: number;
  /** Maximum number of consecutive refresh failures before circuit-breaking. */
  readonly maxRefreshFailures: number;
  /** Whether to reject requests when the token cannot be refreshed. */
  readonly rejectOnExpired: boolean;
  /** Callback to refresh the token. Returns the new token value. */
  readonly onRefresh: () => ResultAsync<string, TokenRefreshError>;
}

interface TokenRefreshError {
  readonly _tag: "TokenRefreshError";
  readonly code: "REFRESH_FAILED" | "REFRESH_TIMEOUT" | "TOKEN_REVOKED";
  readonly message: string;
  readonly consecutiveFailures: number;
}
```

### withTokenLifecycle Combinator

```typescript
function withTokenLifecycle(policy: TokenLifecyclePolicy): (client: HttpClient) => HttpClient;
```

**Behavior:**

1. Tracks the current token's age based on when it was last refreshed
2. Before each request, checks if the token will expire within `refreshBefore` seconds
3. If proactive refresh is needed, calls `onRefresh()` to obtain a new token
4. If refresh fails and `consecutiveFailures >= maxRefreshFailures`, circuit-breaks
5. If `rejectOnExpired` is `true` and the token has expired, rejects with code `"TOKEN_EXPIRED"`

```
REQUIREMENT: The withTokenLifecycle() combinator MUST reject requests when the
             authentication token has exceeded its maxAge and rejectOnExpired is true.
             Reference: 21 CFR 11.300, EU GMP Annex 11 §12.
```

```
REQUIREMENT: Token refresh events MUST be recorded in the audit trail when gxp is
             true. Each refresh event MUST include: (1) timestamp, (2) outcome,
             (3) failure reason if applicable, (4) consecutive failure count, and
             (5) whether circuit-breaker state changed.
             Reference: 21 CFR 11.10(e).
```

```
REQUIREMENT: The circuit-breaker MUST automatically attempt recovery after a
             configurable cooldown period (default: 60 seconds). When gxp is true,
             the cooldown period MUST NOT exceed 300 seconds.
             Reference: EU GMP Annex 11 §16, 21 CFR 11.300.
```

### GxP Authentication Strength Policy

```typescript
interface GxPAuthenticationPolicy {
  readonly _tag: "GxPAuthenticationPolicy";
  readonly minimumStrength: "single-factor" | "multi-factor" | "certificate";
  readonly maxSessionAge: number;
  readonly inactivityTimeout: number;
  readonly acceptedMethods: ReadonlyArray<string>;
}
```

### withAuthenticationPolicy Combinator

```typescript
function withAuthenticationPolicy(
  policy: GxPAuthenticationPolicy
): (client: HttpClient) => HttpClient;
```

**Error Codes:**

| Code                           | Condition                                             | 21 CFR Reference |
| ------------------------------ | ----------------------------------------------------- | ---------------- |
| `"AUTH_STRENGTH_INSUFFICIENT"` | Authentication method does not meet `minimumStrength` | 11.200           |
| `"SESSION_EXPIRED"`            | Time since `authenticatedAt` exceeds `maxSessionAge`  | 11.300           |
| `"INACTIVITY_TIMEOUT"`         | Time since last operation exceeds `inactivityTimeout` | 11.300           |
| `"AUTH_METHOD_NOT_ACCEPTED"`   | Authentication method not in `acceptedMethods`        | 11.300           |

```
REQUIREMENT: When gxp is true, the withAuthenticationPolicy() combinator MUST
             enforce the configured GxPAuthenticationPolicy. The default
             minimumStrength for GxP mode MUST be "multi-factor".
             Reference: 21 CFR 11.200 (two distinct identification components).
```

```
REQUIREMENT: Session age and inactivity checks MUST use the same ClockSource
             as the guard graph to ensure temporal consistency. The combinator
             MUST NOT use Date.now() directly for session timing.
             Reference: 21 CFR 11.300, ALCOA+ Contemporaneous.
```

### Biometric Identification Component Support

21 CFR 11.200(a)(1)(ii) requires electronic signatures to employ at least two distinct identification components.

```typescript
interface BiometricAuthenticationMetadata {
  readonly _tag: "BiometricAuthenticationMetadata";
  readonly biometricType: "fingerprint" | "facial" | "iris" | "voice" | "behavioral" | "other";
  readonly description: string;
  readonly verificationLocation: "local" | "remote";
  readonly confidenceScore: number;
  readonly isPrimaryComponent: boolean;
  readonly companionComponent: string;
}
```

```
REQUIREMENT: When biometric authentication is used, the withAuthenticationPolicy()
             combinator MUST verify that the biometric is paired with at least one
             non-biometric identification component (identification code, password,
             or PIN). A biometric alone does NOT satisfy the two-component requirement.
             Reference: 21 CFR 11.200(a)(1)(ii).
```

### Connection to Electronic Signatures

| Concern    | Token Lifecycle (§90)             | Electronic Signatures (guard spec §65) |
| ---------- | --------------------------------- | -------------------------------------- |
| Purpose    | HTTP transport authentication     | GxP record signing                     |
| Scope      | Per-request authentication        | Per-decision compliance evidence       |
| Managed by | `withTokenLifecycle()` combinator | `SignatureServicePort`                 |
| Expiration | Token maxAge                      | Re-authentication window               |
| Refresh    | Automatic (via `onRefresh`)       | Manual (re-authentication required)    |

```
REQUIREMENT: Token lifecycle management MUST NOT be conflated with electronic signature
             management. Expiration or refresh of an HTTP authentication token MUST NOT
             invalidate or affect electronic signatures captured for GxP compliance.
             Reference: 21 CFR 11.50, 11.100.
```

---

## 90a. SSRF Mitigation

### SSRF Protection Policy

```typescript
interface SsrfProtectionPolicy {
  readonly _tag: "SsrfProtectionPolicy";
  readonly allowedUrlPatterns: ReadonlyArray<string>;
  readonly deniedUrlPatterns: ReadonlyArray<string>;
  /** Default: true. Blocks RFC 1918, loopback, and link-local addresses. */
  readonly blockPrivateIps: boolean;
  /** Default: true. Blocks 169.254.169.254 (AWS/GCP/Azure metadata). */
  readonly blockMetadataEndpoints: boolean;
  /**
   * When true, resolves DNS and validates resolved IP before connecting.
   * Prevents DNS rebinding attacks.
   * Default: true for GxP mode.
   */
  readonly validateResolvedIp: boolean;
}

interface SsrfViolationError {
  readonly _tag: "SsrfViolationError";
  readonly code:
    | "SSRF_URL_BLOCKED"
    | "SSRF_PRIVATE_IP"
    | "SSRF_METADATA_ENDPOINT"
    | "SSRF_DNS_REBINDING";
  readonly message: string;
  readonly blockedUrl: string;
}

function withSsrfProtection(policy: SsrfProtectionPolicy): (client: HttpClient) => HttpClient;
```

```
REQUIREMENT: When gxp is true, the withSsrfProtection() combinator MUST be
             included in the combinator pipeline with blockPrivateIps: true and
             blockMetadataEndpoints: true. Blocked requests MUST produce an
             HttpOperationAuditEntry with outcome "denied".
             Reference: OWASP SSRF Prevention, 21 CFR 11.30, EU GMP Annex 11 §12.
```

```
REQUIREMENT: When SsrfProtectionPolicy.validateResolvedIp is true, the combinator
             MUST resolve the target hostname and validate the resolved IP against
             the private IP blocklist BEFORE establishing a connection. The DNS
             resolution result MUST be cached for the duration of the request
             to prevent TOCTOU races.
             Reference: OWASP SSRF Prevention, CWE-918.
```

---

## 90b. Certificate Transparency Log Verification

```typescript
interface CertificateTransparencyPolicy {
  readonly _tag: "CertificateTransparencyPolicy";
  readonly mode: "enforce" | "report-only" | "off";
  readonly minimumScts: number;
  readonly maxSctAge: number;
  readonly trustedLogs: ReadonlyArray<string>;
}
```

```
REQUIREMENT: When gxp is true, Certificate Transparency verification MUST be
             enabled with mode "enforce" or "report-only". Mode "off" MUST NOT
             be used in GxP deployments. In "enforce" mode, connections to servers
             lacking valid SCTs MUST be rejected with HttpRequestError code
             "CT_VERIFICATION_FAILED".
             Reference: RFC 6962, RFC 9162, 21 CFR 11.30.
```

```
REQUIREMENT: CT verification MUST validate at least minimumScts (default: 2)
             Signed Certificate Timestamps from distinct CT logs. SCTs older
             than maxSctAge MUST be treated as invalid.
             Reference: RFC 6962 §3.3, Chromium CT Policy.
```

---

## 90c. HSTS Enforcement Combinator

```typescript
interface HstsPolicy {
  readonly _tag: "HstsPolicy";
  readonly mode: "enforce" | "warn";
  /** Minimum acceptable max-age in seconds. Default: 31536000 (1 year). */
  readonly minimumMaxAge: number;
  readonly requireIncludeSubDomains: boolean;
  readonly enablePreloadCache: boolean;
}

function withHstsEnforcement(policy: HstsPolicy): (client: HttpClient) => HttpClient;
```

```
REQUIREMENT: When gxp is true, the withHstsEnforcement() combinator MUST be
             included with mode "enforce". Responses from GxP endpoints MUST
             include a Strict-Transport-Security header with max-age >= minimumMaxAge.
             When a host has previously served a valid HSTS header, subsequent
             plaintext connections MUST be rejected with code "HSTS_ENFORCEMENT_FAILED".
             Reference: RFC 6797, 21 CFR 11.30.
```

```
REQUIREMENT: The HSTS preload cache MUST respect max-age expiration and MUST NOT
             be shared across different GxP scopes to prevent cross-tenant poisoning.
             Reference: RFC 6797 §8.1.
```

---

## 90d. CSRF Protection Combinator

```typescript
interface CsrfPolicy {
  readonly _tag: "CsrfPolicy";
  readonly strategy: "synchronizer-token" | "double-submit-cookie" | "custom-header";
  readonly headerName: string;
  readonly cookieName: string;
  readonly protectedMethods: ReadonlyArray<string>;
  readonly tokenProvider?: () => ResultAsync<string, CsrfTokenError>;
}

interface CsrfTokenError {
  readonly _tag: "CsrfTokenError";
  readonly code: "CSRF_TOKEN_FETCH_FAILED" | "CSRF_TOKEN_EXPIRED" | "CSRF_TOKEN_MISSING";
  readonly message: string;
}

function withCsrfProtection(policy: CsrfPolicy): (client: HttpClient) => HttpClient;
```

```
REQUIREMENT: When gxp is true and the platform adapter operates in a browser
             context, the withCsrfProtection() combinator MUST be included. The
             combinator MUST attach a CSRF token to every state-changing request
             (POST, PUT, PATCH, DELETE). CSRF protection failures MUST be recorded
             in the audit trail.
             Reference: OWASP CSRF Prevention Cheat Sheet, 21 CFR 11.30.
```

```
RECOMMENDED: Non-browser GxP deployments (Node.js, Deno, Bun) SHOULD omit
             CSRF protection as CSRF attacks require a browser context. Server-
             to-server communication is protected by mTLS (§85) and authentication
             tokens (§90) rather than CSRF tokens.
```

---

## Additional Transport Security Requirements

```
REQUIREMENT: For Category 1 GxP endpoints, the requireHttps() combinator MUST be
             configured with mutual TLS (mTLS) authentication. The requireHttps()
             combinator MUST accept an optional clientCertificate configuration that
             the platform adapter uses during the TLS handshake. TLS handshake
             failures due to client certificate rejection MUST produce
             HttpRequestError with code "CLIENT_CERTIFICATE_REJECTED".
             Reference: 21 CFR 11.30, NIST SP 800-52 Rev. 2.
```

```
REQUIREMENT: For Category 1 GxP endpoints (§84), the withPayloadIntegrity()
             combinator is REQUIRED. When gxp is true and an endpoint is classified
             as Category 1, omission of withPayloadIntegrity() from the combinator
             pipeline MUST produce a ConfigurationError at construction time with
             code "PAYLOAD_INTEGRITY_REQUIRED_CAT1".
             Reference: 21 CFR 11.10(c), ALCOA+ Accurate, ICH Q9.
```

```
REQUIREMENT: When gxp is true, the withPayloadIntegrity() combinator's
             verifyResponses option MUST default to true. If the server does not
             provide digest headers, the combinator MUST log a WARNING per response
             indicating unverified integrity.
             Reference: 21 CFR 11.10(c), ALCOA+ Accurate.
```

```
RECOMMENDED: GxP HTTP clients SHOULD implement outbound rate limiting to prevent
             overwhelming GxP API endpoints. When the rate limit is exceeded, the
             client SHOULD return Err(HttpRequestError) with code "RATE_LIMIT_EXCEEDED"
             rather than queuing indefinitely.
             Reference: EU GMP Annex 11 §16.
```

---

> **Tests**: Transport Security Tests (SEC-001–SEC-050) — see [17 - Definition of Done](./17-definition-of-done.md#transport-security-tests)
