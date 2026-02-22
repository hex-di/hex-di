# 18c - Session, Auth & Extended Transport Controls

_Previous: [18b - Payload & Credential Security](./18b-payload-credential-security.md) | Next: [19 - HTTP Audit Bridge](./19-http-audit-bridge.md)_

---

This document is part 3 of 3 covering HTTP transport security for `@hex-di/http-client` in GxP environments. It specifies session and token lifecycle, GxP authentication strength policy, biometric identification, privilege escalation detection, SSRF mitigation, Certificate Transparency, HSTS enforcement, CSRF protection, and additional transport security requirements. See also [18a](./18a-https-tls-enforcement.md) (HTTPS enforcement, TLS, certificate pinning) and [18b](./18b-payload-credential-security.md) (payload integrity, credential protection, configuration change control, payload validation).

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) and carry the same pharmaceutical alignment defined in the [GxP compliance guide](./17-gxp-compliance.md#normative-language).

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
  /**
   * Optional token revocation checking policy.
   * When provided, the combinator actively checks token revocation status
   * before each request (subject to caching). See TokenRevocationPolicy below.
   * RECOMMENDED for GxP environments per 21 CFR 11.300(c).
   */
  readonly revocationPolicy?: TokenRevocationPolicy;
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
             continuity plan (HttpWalStorePort §91). The configured value MUST be documented
             in the validation plan (§83a).
             Reference: 21 CFR 11.300, EU GMP Annex 11 §12.
```

```
RECOMMENDED: Organizations SHOULD configure maxAge based on the authentication
             provider's token lifetime policy. The maxAge SHOULD be strictly less than
             the provider's actual token expiration to ensure tokens are refreshed
             before they expire at the server. A RECOMMENDED margin is refreshBefore
             >= 10% of maxAge or 60 seconds, whichever is greater.
```

### Token Revocation Checking

In addition to expiration-based token lifecycle management, GxP environments MUST support token revocation checking to immediately invalidate compromised or administratively revoked tokens without waiting for natural expiration.

```typescript
/**
 * Configuration for server-side token revocation checking.
 * Extends TokenLifecyclePolicy with active revocation detection.
 */
interface TokenRevocationPolicy {
  readonly _tag: "TokenRevocationPolicy";
  /**
   * Whether to check token revocation status before each request.
   * When true, the combinator queries the revocation endpoint to verify
   * the token has not been revoked. Default: false (relies on expiration only).
   * RECOMMENDED: true for GxP environments.
   */
  readonly enabled: boolean;
  /**
   * Callback to check token revocation status.
   * Returns true if the token is revoked (and MUST be rejected).
   * The implementation SHOULD check the OAuth2 token introspection endpoint
   * (RFC 7662) or a local token revocation list.
   */
  readonly checkRevocation: (token: string) => ResultAsync<boolean, TokenRevocationCheckError>;
  /**
   * Maximum age of cached revocation check results in seconds.
   * To avoid querying the revocation endpoint on every request, results
   * are cached for this duration. Default: 60 (1 minute).
   * For Category 1 GxP endpoints, RECOMMENDED value: 30 seconds.
   */
  readonly cacheMaxAge: number;
  /**
   * Behavior when the revocation check fails (network error, timeout).
   * - "hard-fail": Reject the request. RECOMMENDED for Category 1 endpoints.
   * - "soft-fail": Allow the request with a WARNING. Appropriate for
   *   environments where the introspection endpoint may be intermittently unavailable.
   * Default: "hard-fail".
   */
  readonly failureMode: "hard-fail" | "soft-fail";
}

interface TokenRevocationCheckError {
  readonly _tag: "TokenRevocationCheckError";
  readonly code: "REVOCATION_CHECK_NETWORK_ERROR" | "REVOCATION_CHECK_TIMEOUT" | "REVOCATION_CHECK_INVALID_RESPONSE";
  readonly message: string;
}
```

```
REQUIREMENT: When gxp is true and TokenRevocationPolicy.enabled is true, the
             withTokenLifecycle() combinator MUST check token revocation status
             before each request (subject to cacheMaxAge caching). A revoked token
             MUST be rejected with HttpRequestError code "TOKEN_REVOKED". Revocation
             events MUST be recorded in the audit trail as TokenRefreshError entries
             with code "TOKEN_REVOKED". When a token is found to be revoked, the
             circuit-breaker MUST NOT be triggered (revocation is an intentional
             administrative action, not a transient failure); instead, the combinator
             MUST attempt to obtain a new token via onRefresh().
             Reference: 21 CFR 11.300(c) (loss management), RFC 7662.
```

```
RECOMMENDED: Organizations SHOULD use the OAuth2 Token Introspection endpoint
             (RFC 7662) as the revocation check mechanism. The introspection
             endpoint provides real-time token status including revocation. For
             environments without an introspection endpoint, a local token
             revocation list (maintained by the IAM system) MAY be used as an
             alternative, with the cacheMaxAge set to 30 seconds or less to
             minimize the window of continued access after revocation.
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
             as the HttpClockSourcePort (§96) to ensure temporal consistency. The
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
REQUIREMENT: Organizations using biometric authentication MUST configure
             a minimum confidenceScore threshold in the BiometricAuthenticationMetadata.
             The minimum threshold MUST be ≥ 0.95 for fingerprint and iris,
             ≥ 0.90 for facial recognition, and ≥ 0.85 for behavioral biometrics.
             Organizations MAY adopt higher thresholds based on their risk assessment.
             Organizations that require thresholds below these minimums MUST document
             a formal risk acceptance per ICH Q9 with QA approval, identifying the
             compensating controls that mitigate the reduced biometric assurance.
             Failed biometric verifications below the configured threshold MUST be
             recorded as AuthenticationFailureAuditEntry records (§95) with
             failureType "biometric_verification_failed".
             Reference: 21 CFR 11.200(a)(1)(ii), ICH Q9, NIST SP 800-63B §5.2.3.
```

### Biometric Device Qualification Guidance

Biometric device qualification is out-of-scope for `@hex-di/http-client` — it requires organizational-level device procurement, testing, and validation. However, organizations implementing biometric authentication for 21 CFR 11.200(b) compliance MUST ensure biometric devices are qualified per the following guidance.

```
REQUIREMENT: Organizations using biometric identification as an electronic signature
             component per 21 CFR 11.200(b) MUST consult the following standards
             for biometric device qualification:

             1. **NIST SP 800-76-2** (Biometric Specifications for Personal Identity
                Verification) — defines biometric data format, quality, and interoperability
                requirements for identity verification systems. Organizations SHOULD
                use NIST SP 800-76-2 as the baseline for biometric image quality,
                matcher accuracy thresholds, and template storage requirements.

             2. **NIST SP 800-63B §5.2.3** (Authentication and Lifecycle Management) —
                defines biometric comparison requirements for authentication assurance
                levels, including False Match Rate (FMR) and False Non-Match Rate (FNMR)
                thresholds. GxP deployments SHOULD target FMR ≤ 1:10,000 for fingerprint
                and iris, and FMR ≤ 1:1,000 for facial recognition.

             3. **FDA Guidance on 21 CFR 11.200(b)** — FDA accepts biometrics as an
                identification component when the device is "designed to measure and
                identify a unique physical feature." Organizations MUST document that
                their biometric device satisfies this definition.

             4. **ISO/IEC 19795-1** (Biometric Performance Testing) — defines framework
                for biometric performance evaluation. Organizations SHOULD conduct
                performance testing per ISO 19795-1 and document results in the
                Validation Plan (§83a).

             Organizations MUST create an organizational addendum documenting: (a) the
             biometric device make, model, and firmware version, (b) the qualification
             test protocol and results, (c) the biometric data handling and privacy
             controls, and (d) the linkage between the biometric device and the
             BiometricAuthenticationMetadata fields defined above.
             Reference: 21 CFR 11.200(b), NIST SP 800-76-2, NIST SP 800-63B §5.2.3.
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
             (HttpSubjectProviderPort §93). If the subject's roles have changed since the
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

The token lifecycle combinator manages **transport-level authentication tokens** (e.g., OAuth2 access tokens, API keys with rotation). This is distinct from the electronic signature lifecycle managed by `HttpSignatureServicePort` (§93a). The two mechanisms operate at different layers:

| Concern    | Token Lifecycle (§90)             | Electronic Signatures (§93a) |
| ---------- | --------------------------------- | -------------------------------------- |
| Purpose    | HTTP transport authentication     | GxP record signing                     |
| Scope      | Per-request authentication        | Per-decision compliance evidence       |
| Managed by | `withTokenLifecycle()` combinator | `HttpSignatureServicePort`             |
| Expiration | Token maxAge                      | Re-authentication window               |
| Refresh    | Automatic (via `onRefresh`)       | Manual (re-authentication required)    |

```
REQUIREMENT: Token lifecycle management MUST NOT be conflated with electronic signature
             management. Expiration or refresh of an HTTP authentication token MUST NOT
             invalidate or affect electronic signatures captured for GxP compliance
             purposes (HttpSignatureServicePort §93a). The two mechanisms are independent.
             Reference: 21 CFR 11.50, 11.100.
```

---

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
   * When true, rejects requests to:
   * - IPv4 private: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
   * - IPv4 loopback: 127.0.0.0/8
   * - IPv6 loopback: ::1
   * - IPv6 unique local: fd00::/8 (fc00::/7)
   * - IPv4-mapped IPv6: ::ffff:10.0.0.0/104, ::ffff:172.16.0.0/108,
   *   ::ffff:192.168.0.0/112, ::ffff:127.0.0.0/104
   * - IPv4-compatible IPv6: ::10.0.0.0/104, etc. (deprecated but must be blocked)
   * - Link-local: 169.254.0.0/16, fe80::/10
   * - Metadata endpoints: 169.254.169.254, fd00:ec2::254
   * - IPv4-mapped metadata: ::ffff:169.254.169.254
   *
   * The implementation MUST normalize all IP addresses to a canonical form
   * before matching against the blocklist. IPv4-mapped IPv6 addresses
   * (::ffff:a.b.c.d) MUST be treated as their IPv4 equivalents for
   * blocklist evaluation to prevent bypasses via address encoding.
   * Default: true.
   * Reference: RFC 1918, RFC 4193, RFC 4291 §2.5.5, CWE-918, OWASP SSRF.
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
 * transport adapter.
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
 * reaches the transport adapter.
 */
function withCsrfProtection(policy: CsrfPolicy): (client: HttpClient) => HttpClient;
```

```
REQUIREMENT: When gxp is true and the transport adapter operates in a browser
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
             configuration that the transport adapter uses during the TLS handshake.
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
REQUIREMENT: When gxp is true on the HTTP client configuration, the withPayloadIntegrity()
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

_Previous: [18b - Payload & Credential Security](./18b-payload-credential-security.md) | Next: [19 - HTTP Audit Bridge](./19-http-audit-bridge.md)_
