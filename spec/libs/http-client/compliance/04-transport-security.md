# GxP Compliance — @hex-di/http-client: Transport Security

> Part of the `@hex-di/http-client` GxP compliance sub-document suite.
> [Governance index](./gxp.md) | [Sub-document index](./README.md)

---

## HTTPS/TLS Enforcement


---

This document is part 1 of 3 covering HTTP transport security for `@hex-di/http-client` in GxP environments. It specifies HTTPS enforcement, TLS requirements, certificate validation, and certificate pinning. See also [§18b](#payload-and-credential-security) (payload integrity, credential protection, configuration change control, payload validation) and [§18c](./05-session-authentication.md) (session/token lifecycle, authentication policy, SSRF, HSTS, CT, CSRF).

These sections define HTTP transport security combinators for `@hex-di/http-client` in GxP environments, building on the GxP compliance infrastructure (§17) and combinator model (sections 29-44). Non-regulated environments can skip this document entirely.

### Subsystem Overview: Transport Security (§84-§90)

```
┌─────────────────────────────────────────────────────────────────┐
│                   Transport Security Subsystem                   │
│                                                                  │
│  §84 Overview & Endpoint Classification (Category 1/2/3)        │
│    │                                                             │
│    ├── §85 HTTPS Enforcement ──── TLS, cert pinning, mTLS       │
│    ├── §86 Payload Integrity ──── SHA-256 request/response       │
│    ├── §87 Credential Protection ─ header/body redaction         │
│    ├── §88 Config Change Control ─ audit, rollback               │
│    ├── §89 Payload Validation ──── JSON Schema, XSD, multipart  │
│    └── §90 Session/Token/Auth ──── token lifecycle, MFA, SSRF,  │
│                                    HSTS, CT, CSRF, biometric,   │
│                                    privilege escalation          │
│                                                                  │
│  Regulatory: 21 CFR 11.10(c), 11.30, Annex 11 §7, §12         │
│                                                                  │
│  Split across: §18a (this file), §18b, §18c                    │
└─────────────────────────────────────────────────────────────────┘
```

This subsystem provides the outermost layer of the GxP combinator pipeline. Its combinators execute first (before audit, attribution, and authorization) to ensure that every HTTP operation occurs over a secure, validated transport channel.

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) and carry the same pharmaceutical alignment defined in the [GxP compliance guide](./gxp.md#normative-language).

### Scope

The HTTP client library provides **combinators** that wrap `HttpClient` instances with GxP-compliant security enforcement. The library does **not** implement the transport layer itself. The actual TLS handshake, certificate validation, and network I/O remain the responsibility of the transport adapter (section 39). This document specifies the behavioral contracts these combinators enforce.

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

### HTTP Transport Security Scope

The HTTP client library provides the following transport security controls as `ClientCombinator` functions (see section 29):

- **In scope:** HTTPS enforcement, TLS version requirements, certificate validation policy, payload integrity verification (request/response hashing), credential redaction in logs and errors, HTTP configuration change audit, payload schema validation, token lifecycle management
- **Out of scope:** TLS implementation (transport adapter responsibility), key exchange algorithms (platform/OS TLS stack), network-level firewall rules, DNS security (DNSSEC — see mitigation guidance below), IP allowlisting

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
REQUIREMENT: When gxp is true on the HTTP client configuration, the requireHttps() combinator
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
/**
 * Policy governing HTTP transport security controls including TLS version,
 * certificate validation, certificate pinning, and cipher suite restrictions.
 *
 * Reference: 21 CFR 11.30 (open system controls), EU GMP Annex 11 §12 (security).
 */
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
   * - "default": Transport adapter's default cipher suites.
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

/**
 * Policy controlling X.509 certificate chain validation, revocation checking,
 * and certificate lifetime limits.
 *
 * Reference: 21 CFR 11.10(d) (access limitation), EU GMP Annex 11 §12 (security),
 *            NIST SP 800-52 Rev. 2 (TLS implementation guidelines).
 */
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
3. Attaches TLS version requirement metadata to the request context for the transport adapter to enforce
4. On response, verifies that the transport adapter reports a TLS version >= `minTlsVersion`

```
REQUIREMENT: The requireHttps() combinator MUST reject any HttpRequest with a non-HTTPS
             URL before the request reaches the transport adapter. The rejection MUST
             produce an HttpRequestError with code "HTTPS_REQUIRED" containing the
             offending URL for diagnosis.
             Reference: 21 CFR 11.30(a).
```

```
REQUIREMENT: When minTlsVersion is "1.2", the combinator MUST reject connections
             negotiated at TLS 1.0 or TLS 1.1. When minTlsVersion is "1.3", the
             combinator MUST reject connections negotiated at TLS 1.2 or below. TLS
             version enforcement depends on the transport adapter reporting the
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
             disabled with documented justification in the validation plan (§83a).
```

### Certificate Validation

> **Forward Reference:** The `revocationPolicy` field on `CertificateValidationPolicy` is specified in detail in section 106 (Certificate Revocation Checking Protocol). Section 106 defines `CertificateRevocationPolicy` with method priority, hard-fail/soft-fail behavior, OCSP/CRL caching, and audit requirements.

```
REQUIREMENT: When certificateValidation.verifyCertificateChain is true, the platform
             adapter MUST verify the full certificate chain from the server certificate
             to a trusted root CA. Self-signed certificates MUST be rejected unless
             explicitly added to the trust store. The combinator MUST propagate
             certificate validation failures from the transport adapter as
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
             adapter. If the transport adapter negotiates a cipher suite outside the
             restricted set, the combinator MUST reject the connection with
             HttpRequestError code "CIPHER_SUITE_REJECTED". If the transport adapter
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
             certificate subject and issuer (if available from the transport adapter).
             Credential material (private keys, certificate contents beyond
             subject/issuer) MUST NOT appear in error messages.
             Reference: 21 CFR 11.10(d).
```

---


---


## Payload and Credential Security


---

This document is part 2 of 3 covering HTTP transport security for `@hex-di/http-client` in GxP environments. It specifies payload integrity verification, credential protection, HTTP configuration change control, and GxP payload schema validation. See also [§18a](#httpstls-enforcement) (HTTPS enforcement, TLS, certificate pinning) and [§18c](./05-session-authentication.md) (session/token lifecycle, authentication policy, SSRF, HSTS, CT, CSRF).

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) and carry the same pharmaceutical alignment defined in the [GxP compliance guide](./gxp.md#normative-language).

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


---


