# 18a - HTTPS & TLS Enforcement

_Previous: [17 - GxP Compliance Guide](./17-gxp-compliance.md) | Next: [18b - Payload & Credential Security](./18b-payload-credential-security.md)_

---

This document is part 1 of 3 covering HTTP transport security for `@hex-di/http-client` in GxP environments. It specifies HTTPS enforcement, TLS requirements, certificate validation, and certificate pinning. See also [18b](./18b-payload-credential-security.md) (payload integrity, credential protection, configuration change control, payload validation) and [18c](./18c-session-auth-extended.md) (session/token lifecycle, authentication policy, SSRF, HSTS, CT, CSRF).

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

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) and carry the same pharmaceutical alignment defined in the [GxP compliance guide](./17-gxp-compliance.md#normative-language).

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

_Previous: [17 - GxP Compliance Guide](./17-gxp-compliance.md) | Next: [18b - Payload & Credential Security](./18b-payload-credential-security.md)_
