# 18 - HTTP Transport Security

_Previous: [17 - GxP Compliance Guide](./17-gxp-compliance.md) | Next: [19 - HTTP Audit Bridge](./19-http-audit-bridge.md)_

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
   * Replaces the previous boolean checkRevocation flag with a comprehensive
   * revocation strategy supporting OCSP stapling, OCSP, and CRL methods.
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

Header and query parameter redaction (above) addresses credential leakage in HTTP metadata. However, credentials can also appear in **request and response bodies** — particularly in OAuth token exchange flows, authentication API calls, and webhook payloads. The `bodyCredentialPatterns` option extends `CredentialRedactionPolicy` to address this gap.

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
  /** Per-scope sequence number for ordering (same pattern as guard spec section 61.4a). */
  readonly sequenceNumber: number;
  /** Hash chain integrity hash (same algorithm as guard spec section 61.4). */
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
             defined in guard spec section 61.4. Configuration change entries and operation entries
             MUST be interleaved in a single chain — separate chains for configuration
             vs. operation entries are NOT permitted.
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(e).
```

```
REQUIREMENT: When gxp is true, every change to HTTP client configuration MUST produce
             an HttpClientConfigurationAuditEntry. The entry MUST be recorded via the
             same audit trail mechanism used for guard authorization decisions (guard spec section
             61). Configuration changes include: base URL, authentication credentials,
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
RECOMMENDED: Organizations SHOULD maintain a configuration history that retains
             the last N known-good configurations (RECOMMENDED minimum: 3) to
             enable multi-step rollback when consecutive changes fail. The
             configuration history SHOULD be stored independently of the HTTP
             client runtime (e.g., in configuration management tooling or version
             control) and SHOULD be referenced in the Validation Plan (§83a).
```

```
RECOMMENDED: Organizations SHOULD include configuration rollback testing in
             the OQ (§99b). The OQ test SHOULD verify: (1) rollback produces
             a functional client, (2) rollback is audited correctly, (3) in-flight
             requests complete without error during rollback, and (4) the restored
             client passes the standard health check.
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
             enable diagnosis. Invalid requests MUST NOT reach the platform adapter.
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
  /** Number of consecutive failures. */
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
4. If refresh fails and `consecutiveFailures >= maxRefreshFailures`, circuit-breaks: all subsequent requests return `Err(HttpRequestError)` with code `"TOKEN_LIFECYCLE_CIRCUIT_OPEN"` until a successful refresh
5. If `rejectOnExpired` is `true` and the token has expired (age > maxAge), rejects the request with `Err(HttpRequestError)` code `"TOKEN_EXPIRED"`
6. Records token refresh events in the request context for audit correlation (section 95)

```
REQUIREMENT: The withTokenLifecycle() combinator MUST reject requests when the
             authentication token has exceeded its maxAge and rejectOnExpired is true.
             Expired tokens MUST NOT be sent to GxP-critical APIs. The rejection MUST
             produce an HttpRequestError with code "TOKEN_EXPIRED" containing the
             token age and configured maxAge for diagnosis.
             Reference: 21 CFR 11.300 (controls for identification codes/passwords),
             EU GMP Annex 11 §12.
```

```
REQUIREMENT: Token refresh events (success and failure) MUST be recorded in the audit
             trail when gxp is true. Each refresh event MUST include: (1) timestamp
             (ISO 8601 UTC), (2) outcome (success/failure), (3) failure reason if
             applicable, (4) consecutive failure count, and (5) whether circuit-breaker
             state changed. Reference: 21 CFR 11.10(e).
```

```
REQUIREMENT: The circuit-breaker MUST automatically attempt recovery after a
             configurable cooldown period (default: 60 seconds). During the cooldown,
             all requests MUST be rejected with code "TOKEN_LIFECYCLE_CIRCUIT_OPEN".
             After the cooldown, the next request attempt triggers a refresh; if
             successful, the circuit closes and normal operation resumes.
             Reference: EU GMP Annex 11 §16 (business continuity).
```

```
REQUIREMENT: When gxp is true, the circuit-breaker cooldown period MUST be
             configurable and MUST NOT exceed 300 seconds (5 minutes). The cooldown
             SHOULD align with the Recovery Time Objective (RTO) in the business
             continuity plan (guard spec section 61). The configured value MUST be documented
             in the validation plan (guard spec section 67).
             Reference: 21 CFR 11.300, EU GMP Annex 11 §12.
```

```
RECOMMENDED: Organizations SHOULD configure maxAge based on the authentication
             provider's token lifetime policy. The maxAge SHOULD be strictly less than
             the provider's actual token expiration to ensure tokens are refreshed
             before they expire at the server. A RECOMMENDED margin is refreshBefore
             >= 10% of maxAge or 60 seconds, whichever is greater.
```

### GxP Authentication Strength Policy

```typescript
/**
 * Policy for enforcing minimum authentication strength in GxP environments.
 * Addresses 21 CFR 11.200 requirement for at least two distinct identification
 * components in electronic signatures and strong authentication for GxP operations.
 */
interface GxPAuthenticationPolicy {
  readonly _tag: "GxPAuthenticationPolicy";
  /**
   * Minimum authentication strength level required for HTTP operations.
   * - "single-factor": Password, API key, or single token (default for non-GxP).
   * - "multi-factor": At least two distinct identification components
   *   (e.g., password + OTP, certificate + PIN). Required for 21 CFR 11.200.
   * - "certificate": Client certificate (mTLS). Strongest transport-level auth.
   */
  readonly minimumStrength: "single-factor" | "multi-factor" | "certificate";
  /**
   * Maximum session age in seconds before re-authentication is required.
   * After this duration, the subject must re-authenticate even if the
   * transport token is still valid. Default: 28800 (8 hours).
   * Reference: 21 CFR 11.300 (session controls).
   */
  readonly maxSessionAge: number;
  /**
   * Maximum inactivity period in seconds before session timeout.
   * If no HTTP operations are performed within this window, the next
   * operation requires re-authentication. Default: 1800 (30 minutes).
   * Reference: 21 CFR 11.300.
   */
  readonly inactivityTimeout: number;
  /**
   * Authentication methods accepted for GxP operations.
   * Empty array means all methods accepted. When specified, only listed
   * methods are permitted.
   */
  readonly acceptedMethods: ReadonlyArray<string>;
}
```

### withAuthenticationPolicy Combinator

```typescript
function withAuthenticationPolicy(
  policy: GxPAuthenticationPolicy
): (client: HttpClient) => HttpClient;
```

**Behavior:**

1. Before each request, reads the authentication metadata from the request context (attached by `withSubjectAttribution()` from §93)
2. Verifies that the authentication method meets the `minimumStrength` requirement
3. Verifies that the `authenticatedAt` timestamp is within `maxSessionAge`
4. Verifies that the time since the last HTTP operation is within `inactivityTimeout`
5. If any check fails, rejects the request with `Err(HttpRequestError)` and the appropriate code

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
             minimumStrength for GxP mode MUST be "multi-factor". Operations
             authenticated with single-factor methods MUST be rejected with code
             "AUTH_STRENGTH_INSUFFICIENT" when minimumStrength is "multi-factor"
             or "certificate".
             Reference: 21 CFR 11.200 (two distinct identification components).
```

```
REQUIREMENT: Session age and inactivity checks MUST use the same ClockSource
             as the guard graph (§96) to ensure temporal consistency. The
             combinator MUST NOT use Date.now() directly for session timing.
             Reference: 21 CFR 11.300, ALCOA+ Contemporaneous.
```

```
REQUIREMENT: Authentication policy violations (strength, session age, inactivity)
             MUST be recorded in the audit trail via HttpAuditTrailPort as
             AuthenticationFailureAuditEntry records (§95). Each violation MUST
             include the specific policy that was violated and the actual vs.
             required values for diagnosis.
             Reference: 21 CFR 11.10(e), 21 CFR 11.300.
```

```
RECOMMENDED: Organizations SHOULD configure maxSessionAge and inactivityTimeout
             based on their security risk assessment. RECOMMENDED values for
             GxP environments:
             - Batch record operations: maxSessionAge 28800s (8h), inactivityTimeout 1800s (30min)
             - Laboratory result submissions: maxSessionAge 14400s (4h), inactivityTimeout 900s (15min)
             - Administrative operations: maxSessionAge 3600s (1h), inactivityTimeout 300s (5min)
```

### Biometric Identification Component Support

21 CFR 11.200(a)(1)(ii) requires electronic signatures to employ at least two distinct identification components, such as an identification code and password, or a biometric device combined with an identification code. This section specifies how biometric identification integrates with `GxPAuthenticationPolicy`.

```typescript
/**
 * Extends GxPAuthenticationPolicy with biometric identification support.
 * When biometric authentication is used as one of the two distinct
 * identification components required by 21 CFR 11.200, the authentication
 * metadata must include biometric-specific fields for audit traceability.
 */
interface BiometricAuthenticationMetadata {
  readonly _tag: "BiometricAuthenticationMetadata";
  /**
   * Type of biometric used as an identification component.
   * - "fingerprint": Fingerprint recognition
   * - "facial": Facial recognition
   * - "iris": Iris scan
   * - "voice": Voice recognition
   * - "behavioral": Behavioral biometrics (typing pattern, gesture)
   * - "other": Other biometric method (described in description field)
   */
  readonly biometricType: "fingerprint" | "facial" | "iris" | "voice" | "behavioral" | "other";
  /** Human-readable description of the biometric method. */
  readonly description: string;
  /**
   * Whether the biometric verification was performed locally (on-device)
   * or remotely (server-side). Local verification is RECOMMENDED for
   * privacy and latency reasons.
   */
  readonly verificationLocation: "local" | "remote";
  /**
   * Confidence score from the biometric matching algorithm (0.0 to 1.0).
   * Included in audit entries for traceability. The threshold for acceptance
   * is configured by the biometric provider, not by this library.
   */
  readonly confidenceScore: number;
  /**
   * Whether this biometric serves as one of the two distinct identification
   * components per 21 CFR 11.200. When true, the other component is
   * identified by the companion authenticationMethod (e.g., "password",
   * "pin", "identification-code").
   */
  readonly isPrimaryComponent: boolean;
  /**
   * The companion identification component used alongside the biometric.
   * Example: "identification-code", "password", "pin".
   */
  readonly companionComponent: string;
}
```

```
REQUIREMENT: When biometric authentication is used as an identification component
             in GxP environments, the withAuthenticationPolicy() combinator MUST
             verify that the biometric metadata includes: (1) biometricType,
             (2) verificationLocation, (3) confidenceScore, and (4) companionComponent.
             The biometric MUST be paired with at least one non-biometric identification
             component (e.g., identification code, password, PIN) to satisfy the
             "two distinct identification components" requirement. A biometric
             alone does NOT satisfy the two-component requirement.
             Reference: 21 CFR 11.200(a)(1)(ii).
```

```
REQUIREMENT: BiometricAuthenticationMetadata MUST be included in the
             HttpOperationAuditEntry (§92) and AuthenticationFailureAuditEntry
             (§95) when biometric authentication is used. The confidenceScore
             MUST be recorded but the raw biometric data (fingerprint image,
             facial template, etc.) MUST NOT be stored in audit entries.
             Reference: 21 CFR 11.200, ALCOA+ Attributable.
```

```
RECOMMENDED: Organizations using biometric authentication SHOULD configure
             a minimum confidenceScore threshold in the BiometricAuthenticationMetadata.
             A RECOMMENDED minimum threshold is 0.95 for fingerprint and iris,
             0.90 for facial recognition, and 0.85 for behavioral biometrics.
             Failed biometric verifications below the threshold SHOULD be
             recorded as AuthenticationFailureAuditEntry records (§95) with
             failureType "biometric_verification_failed".
```

### Privilege Escalation Detection

21 CFR 11.10(d) requires limiting system access to authorized individuals. When a subject's permissions change during an active session (e.g., role assignment, permission grant), previously authorized HTTP operations may no longer be valid, or the subject may gain access to endpoints they should not reach within the current session context.

```typescript
/**
 * Configuration for detecting and handling mid-session privilege changes.
 */
interface PrivilegeEscalationPolicy {
  readonly _tag: "PrivilegeEscalationPolicy";
  /**
   * How to handle detected privilege escalation.
   * - "block-and-reauth": Block the request and require re-authentication.
   *   RECOMMENDED for GxP environments.
   * - "warn-and-allow": Log a WARNING and allow the request to proceed.
   *   Appropriate for non-critical operations during migration periods.
   * - "audit-only": Record the escalation in the audit trail but take no action.
   *   Appropriate for monitoring-only deployments.
   */
  readonly action: "block-and-reauth" | "warn-and-allow" | "audit-only";
  /**
   * How frequently to check for privilege changes (in seconds).
   * The combinator caches the subject's role set and re-checks at this interval.
   * Default: 60 (1 minute). Minimum: 10 seconds.
   */
  readonly checkInterval: number;
  /**
   * Whether to detect privilege reduction (loss of roles/permissions).
   * When true, a subject who loses a role mid-session will be blocked from
   * operations requiring that role, even if the cached role set still includes it.
   * Default: true.
   */
  readonly detectReduction: boolean;
  /**
   * Whether to detect privilege expansion (gain of new roles/permissions).
   * When true, a subject who gains new roles mid-session will trigger the
   * configured action. This prevents newly granted privileges from being
   * exercised without re-authentication.
   * Default: true in GxP mode.
   */
  readonly detectExpansion: boolean;
}
```

```
REQUIREMENT: When gxp is true, the withAuthenticationPolicy() combinator MUST
             support privilege escalation detection via PrivilegeEscalationPolicy.
             The combinator MUST periodically re-check the subject's role set
             (at checkInterval intervals) by querying the SubjectProviderPort
             (guard spec §23). If the subject's roles have changed since the
             session was established or since the last check, the combinator
             MUST take the configured action (block-and-reauth, warn-and-allow,
             or audit-only).
             Reference: 21 CFR 11.10(d), EU GMP Annex 11 §12.
```

```
REQUIREMENT: Detected privilege changes MUST be recorded in the audit trail
             as AuthenticationFailureAuditEntry records (§95) with a new
             failureType "privilege_change_detected". The entry MUST include:
             (1) the subjectId, (2) the previous role set, (3) the new role set,
             (4) whether the change was an escalation or reduction, and (5) the
             action taken (blocked, warned, or audit-only).
             Reference: 21 CFR 11.10(e), 21 CFR 11.10(d).
```

```
RECOMMENDED: Organizations SHOULD configure action: "block-and-reauth" for
             GxP-critical HTTP operations to ensure that privilege changes
             require explicit re-authentication before the new privilege level
             takes effect. The checkInterval SHOULD be set to 60 seconds or
             less for high-sensitivity endpoints.
```

### Connection to Electronic Signatures

The token lifecycle combinator manages **transport-level authentication tokens** (e.g., OAuth2 access tokens, API keys with rotation). This is distinct from the electronic signature lifecycle managed by `SignatureServicePort` (guard spec §65). The two mechanisms operate at different layers:

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
             invalidate or affect electronic signatures captured for GxP compliance
             purposes (guard spec section 65). The two mechanisms are independent.
             Reference: 21 CFR 11.50, 11.100.
```

## 90a. SSRF Mitigation

### Regulatory Context

Server-Side Request Forgery (SSRF) attacks can cause HTTP clients to make requests to internal infrastructure, bypassing network segmentation. In GxP environments, SSRF could allow unauthorized access to audit trail backends, internal APIs, or credential stores.

### SSRF Protection Policy

```typescript
/**
 * Policy for mitigating Server-Side Request Forgery (SSRF) attacks.
 * Restricts outbound HTTP requests to approved destinations.
 */
interface SsrfProtectionPolicy {
  readonly _tag: "SsrfProtectionPolicy";
  /**
   * Allowlist of permitted URL patterns (glob syntax).
   * Only requests matching at least one pattern are permitted.
   * When non-empty, all non-matching URLs are blocked.
   * Example: ["https://api.pharma.example.com/*", "https://auth.pharma.example.com/*"]
   */
  readonly allowedUrlPatterns: ReadonlyArray<string>;
  /**
   * Blocklist of denied URL patterns.
   * Evaluated after allowlist. Useful for excluding specific paths
   * from an otherwise-allowed domain.
   */
  readonly deniedUrlPatterns: ReadonlyArray<string>;
  /**
   * Whether to block requests to private/internal IP ranges.
   * When true, rejects requests to: 10.0.0.0/8, 172.16.0.0/12,
   * 192.168.0.0/16, 127.0.0.0/8, ::1, fd00::/8, link-local, and
   * metadata endpoints (169.254.169.254).
   * Default: true.
   */
  readonly blockPrivateIps: boolean;
  /**
   * Whether to block requests to cloud metadata endpoints.
   * Blocks: 169.254.169.254 (AWS/GCP/Azure metadata),
   * fd00:ec2::254 (AWS IMDSv2 IPv6).
   * Default: true.
   */
  readonly blockMetadataEndpoints: boolean;
  /**
   * Whether to resolve DNS and validate the resolved IP against
   * private IP blocklists before connecting. Prevents DNS rebinding
   * attacks where a public hostname resolves to a private IP.
   * Default: true for GxP mode.
   */
  readonly validateResolvedIp: boolean;
}
```

### SSRF Protection Combinator

```typescript
/**
 * Validates outbound request URLs against the SSRF protection policy.
 * Blocks requests to disallowed destinations before they reach the
 * platform adapter.
 */
function withSsrfProtection(policy: SsrfProtectionPolicy): (client: HttpClient) => HttpClient;
```

### Error Types

```typescript
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
```

```
REQUIREMENT: When gxp is true, the withSsrfProtection() combinator MUST be
             included in the combinator pipeline with blockPrivateIps: true and
             blockMetadataEndpoints: true. The combinator MUST block requests to
             private IP ranges (RFC 1918, RFC 4193, loopback), link-local addresses,
             and cloud metadata endpoints before the request reaches the platform
             adapter. Blocked requests MUST produce an HttpOperationAuditEntry
             with outcome "denied" and the applicable SSRF error code.
             Reference: OWASP SSRF Prevention, 21 CFR 11.30, EU GMP Annex 11 §12.
```

```
REQUIREMENT: When SsrfProtectionPolicy.validateResolvedIp is true, the combinator
             MUST resolve the target hostname's IP address and validate it against
             the private IP blocklist BEFORE establishing a connection. This prevents
             DNS rebinding attacks where a hostname initially resolves to a public
             IP during validation but later resolves to a private IP during
             connection. The DNS resolution result MUST be cached for the duration
             of the request to prevent time-of-check-to-time-of-use (TOCTOU) races.
             Reference: OWASP SSRF Prevention, CWE-918.
```

```
RECOMMENDED: Organizations SHOULD configure allowedUrlPatterns with the minimum
             set of external endpoints required for their GxP operations. A default-
             deny posture (only explicitly allowed URLs are permitted) provides
             stronger SSRF protection than blocklist-only approaches.
```

---

## 90b. Certificate Transparency Log Verification

### Regulatory Context

Certificate Transparency (CT) provides a public, append-only log of all TLS certificates issued by participating Certificate Authorities. Verifying CT log inclusion detects misissued or fraudulent certificates that could enable man-in-the-middle attacks on GxP data in transit.

### CT Verification Policy

```typescript
/**
 * Policy for Certificate Transparency log verification.
 * Verifies that server certificates have been logged in CT logs
 * per RFC 6962 and RFC 9162.
 */
interface CertificateTransparencyPolicy {
  readonly _tag: "CertificateTransparencyPolicy";
  /**
   * Enforcement mode for CT verification.
   * - "enforce": Reject connections to servers whose certificates
   *   lack valid Signed Certificate Timestamps (SCTs). DEFAULT for GxP.
   * - "report-only": Log CT violations but do not block connections.
   *   Useful for initial deployment and monitoring.
   * - "off": No CT verification (NOT permitted for GxP).
   */
  readonly mode: "enforce" | "report-only" | "off";
  /**
   * Minimum number of valid SCTs required.
   * Chrome requires 2-3 SCTs depending on certificate lifetime.
   * Default: 2.
   */
  readonly minimumScts: number;
  /**
   * Maximum age in seconds for SCT timestamps.
   * SCTs older than this value are considered stale.
   * Default: 86400 (24 hours).
   */
  readonly maxSctAge: number;
  /**
   * Trusted CT log identifiers (log IDs as base64-encoded strings).
   * When non-empty, only SCTs from these logs are accepted.
   * When empty, SCTs from any known CT log are accepted.
   */
  readonly trustedLogs: ReadonlyArray<string>;
}
```

```
REQUIREMENT: When gxp is true, Certificate Transparency verification MUST be
             enabled with mode "enforce" or "report-only". Mode "off" MUST NOT
             be used in GxP deployments. The requireHttps() combinator (§85) MUST
             accept an optional certificateTransparency field in
             HttpTransportSecurityPolicy. When mode is "enforce", connections to
             servers lacking valid SCTs MUST be rejected with HttpRequestError code
             "CT_VERIFICATION_FAILED". The rejection MUST be recorded in the audit
             trail. When mode is "report-only", connections proceed but a WARNING
             is logged and an audit entry is recorded.
             Reference: RFC 6962, RFC 9162, 21 CFR 11.30.
```

```
REQUIREMENT: CT verification MUST validate at least minimumScts (default: 2)
             Signed Certificate Timestamps from distinct CT logs. Each SCT MUST
             be verified against the corresponding CT log's public key. SCTs with
             timestamps older than maxSctAge MUST be treated as invalid. This
             prevents reliance on stale CT proofs.
             Reference: RFC 6962 §3.3, Chromium CT Policy.
```

```
RECOMMENDED: Organizations SHOULD start with mode "report-only" during initial
             deployment to identify endpoints with missing CT support, then
             transition to "enforce" after confirming all GxP endpoints serve
             valid SCTs. The transition SHOULD be documented as a Change Request
             (§116) and validated during OQ.
```

---

## 90c. HSTS Enforcement Combinator

### Regulatory Context

HTTP Strict Transport Security (HSTS, RFC 6797) instructs browsers and HTTP clients to only communicate with servers over HTTPS. Verifying HSTS headers provides defense-in-depth against TLS downgrade attacks and ensures GxP API endpoints maintain transport security.

### HSTS Policy

```typescript
/**
 * Policy for HSTS header verification on responses from GxP endpoints.
 */
interface HstsPolicy {
  readonly _tag: "HstsPolicy";
  /**
   * Enforcement mode.
   * - "enforce": Block subsequent requests to endpoints that do not serve
   *   valid HSTS headers. After a valid HSTS header is received, the client
   *   MUST refuse plaintext connections to that host for the duration of max-age.
   * - "warn": Log warnings for missing/weak HSTS but do not block requests.
   * Default: "enforce" for GxP, "warn" for non-GxP.
   */
  readonly mode: "enforce" | "warn";
  /**
   * Minimum acceptable max-age value in seconds.
   * Default: 31536000 (1 year). Responses with max-age below this
   * threshold are treated as missing HSTS.
   */
  readonly minimumMaxAge: number;
  /**
   * Whether includeSubDomains directive is required.
   * Default: true for GxP.
   */
  readonly requireIncludeSubDomains: boolean;
  /**
   * Whether to maintain an internal HSTS preload list of known-good hosts.
   * When true, hosts that have previously served valid HSTS headers are
   * cached and enforced for subsequent requests.
   * Default: true.
   */
  readonly enablePreloadCache: boolean;
}
```

### HSTS Combinator

```typescript
/**
 * Verifies and enforces HSTS headers on responses from GxP endpoints.
 * Provides client-side HSTS enforcement independent of browser behavior.
 */
function withHstsEnforcement(policy: HstsPolicy): (client: HttpClient) => HttpClient;
```

```
REQUIREMENT: When gxp is true, the withHstsEnforcement() combinator MUST be
             included in the combinator pipeline with mode "enforce". The
             combinator MUST verify that responses from GxP endpoints include a
             Strict-Transport-Security header with max-age >= minimumMaxAge
             (default: 31536000). Missing or weak HSTS headers MUST produce an
             HttpOperationAuditEntry with a WARNING diagnostic. When mode is
             "enforce" and a host has previously served a valid HSTS header,
             subsequent plaintext connections to that host MUST be rejected
             with HttpRequestError code "HSTS_ENFORCEMENT_FAILED".
             Reference: RFC 6797, OWASP Transport Layer Protection, 21 CFR 11.30.
```

```
REQUIREMENT: The HSTS preload cache maintained by withHstsEnforcement() MUST
             persist across HTTP client instances within the same process. The
             cache MUST respect max-age expiration: entries older than their
             max-age value MUST be re-verified on the next request to that host.
             The cache MUST NOT be shared across different GxP scopes to prevent
             cross-tenant HSTS poisoning.
             Reference: RFC 6797 §8.1.
```

---

## 90d. CSRF Protection Combinator

### Regulatory Context

Cross-Site Request Forgery (CSRF) attacks can cause authenticated users to unknowingly submit state-changing requests. In GxP browser environments, CSRF could lead to unauthorized modifications of regulated records.

### CSRF Policy

```typescript
/**
 * CSRF protection policy for browser-based GxP deployments.
 */
interface CsrfPolicy {
  readonly _tag: "CsrfPolicy";
  /**
   * CSRF protection strategy.
   * - "synchronizer-token": Attach a unique CSRF token header to every
   *   state-changing request. The token is obtained from the server.
   * - "double-submit-cookie": Read the CSRF token from a cookie and
   *   include it as a header. Requires SameSite cookie attribute.
   * - "custom-header": Rely on a custom header (e.g., "X-Requested-With")
   *   that cannot be set by cross-origin form submissions.
   * Default: "synchronizer-token".
   */
  readonly strategy: "synchronizer-token" | "double-submit-cookie" | "custom-header";
  /**
   * Header name for the CSRF token.
   * Default: "X-CSRF-Token".
   */
  readonly headerName: string;
  /**
   * Cookie name for double-submit-cookie strategy.
   * Default: "XSRF-TOKEN".
   */
  readonly cookieName: string;
  /**
   * HTTP methods that require CSRF protection.
   * Default: ["POST", "PUT", "PATCH", "DELETE"].
   */
  readonly protectedMethods: ReadonlyArray<string>;
  /**
   * Callback to obtain the CSRF token from the server.
   * Used by "synchronizer-token" strategy.
   */
  readonly tokenProvider?: () => ResultAsync<string, CsrfTokenError>;
}

interface CsrfTokenError {
  readonly _tag: "CsrfTokenError";
  readonly code: "CSRF_TOKEN_FETCH_FAILED" | "CSRF_TOKEN_EXPIRED" | "CSRF_TOKEN_MISSING";
  readonly message: string;
}
```

### CSRF Combinator

```typescript
/**
 * Attaches CSRF tokens to state-changing HTTP requests.
 * Operates at the client level, applying tokens before the request
 * reaches the platform adapter.
 */
function withCsrfProtection(policy: CsrfPolicy): (client: HttpClient) => HttpClient;
```

```
REQUIREMENT: When gxp is true and the platform adapter operates in a browser
             context, the withCsrfProtection() combinator MUST be included in
             the combinator pipeline. The combinator MUST attach a CSRF token
             to every state-changing request (POST, PUT, PATCH, DELETE). Missing
             or expired CSRF tokens MUST produce an HttpRequestError with code
             "CSRF_TOKEN_MISSING" or "CSRF_TOKEN_EXPIRED". CSRF protection
             failures MUST be recorded in the audit trail.
             Reference: OWASP CSRF Prevention Cheat Sheet, 21 CFR 11.30.
```

```
RECOMMENDED: Non-browser GxP deployments (Node.js, Deno, Bun) SHOULD omit
             CSRF protection as CSRF attacks require a browser context. Server-
             to-server communication is protected by mutual TLS (§85) and
             authentication tokens (§90) rather than CSRF tokens.
```

---

## Additional Transport Security Requirements

```
REQUIREMENT: For Category 1 GxP endpoints (endpoints transmitting or modifying
             patient safety data, batch release decisions, or critical quality
             records as classified in the FMEA §98), the requireHttps() combinator
             MUST be configured with mutual TLS (mTLS) authentication. The
             requireHttps() combinator MUST accept an optional clientCertificate
             configuration that the platform adapter uses during the TLS handshake.
             The clientCertificate configuration MUST include: (1) the client
             certificate chain, (2) the private key reference (key material MUST
             NOT be logged or included in audit entries), and (3) a human-readable
             label for audit traceability. When mTLS is configured, TLS handshake
             failures due to client certificate rejection MUST produce
             HttpRequestError with code "CLIENT_CERTIFICATE_REJECTED".
             Reference: 21 CFR 11.30, NIST SP 800-52 Rev. 2.
```

```
RECOMMENDED: For Category 2 and Category 3 GxP endpoints (non-patient-safety
             GxP data), organizations SHOULD implement mutual TLS (mTLS)
             authentication where infrastructure supports it. When mTLS is not
             feasible, the risk acceptance MUST be documented in the FMEA (§98)
             with compensating controls (e.g., API key rotation, IP allowlisting).
             Client certificate rotation events MUST produce
             HttpClientConfigurationAuditEntry records (section 88).
             Reference: 21 CFR 11.30, NIST SP 800-52 Rev. 2.
```

```
REQUIREMENT: For Category 1 GxP endpoints (§84), the withPayloadIntegrity()
             combinator is REQUIRED. When gxp is true and an endpoint is classified
             as Category 1, omission of withPayloadIntegrity() from the combinator
             pipeline MUST produce a ConfigurationError at construction time with
             code "PAYLOAD_INTEGRITY_REQUIRED_CAT1". Category 1 endpoints transmit
             patient safety data, batch release decisions, and critical quality records
             where data corruption has direct patient safety implications.
             For Category 2 and Category 3 endpoints, withPayloadIntegrity() remains
             RECOMMENDED. Organizations SHOULD document the rationale for omission
             in the Validation Plan if withPayloadIntegrity() is not used for
             Category 2 endpoints.
             Reference: 21 CFR 11.10(c), ALCOA+ Accurate, ICH Q9.
```

```
REQUIREMENT: When gxp is true on the guard graph, the withPayloadIntegrity()
             combinator's verifyResponses option MUST default to true (overriding
             the standard default of false). GxP environments MUST verify response
             integrity to satisfy 21 CFR 11.10(c) data accuracy requirements.
             If the server does not provide digest headers, the combinator MUST
             log a WARNING per response indicating unverified integrity.
             Reference: 21 CFR 11.10(c), ALCOA+ Accurate.
```

```
RECOMMENDED: GxP HTTP clients SHOULD implement outbound rate limiting to prevent
             overwhelming GxP API endpoints. The RECOMMENDED approach is a sliding
             window rate limiter configured per-endpoint. When the rate limit is
             exceeded, the client SHOULD return Err(HttpRequestError) with code
             "RATE_LIMIT_EXCEEDED" rather than queuing indefinitely. Rate limit
             configuration SHOULD be documented in the validation plan.
             Reference: EU GMP Annex 11 §16 (business continuity).
```

---

_Previous: [17 - GxP Compliance Guide](./17-gxp-compliance.md) | Next: [19 - HTTP Audit Bridge](./19-http-audit-bridge.md)_
