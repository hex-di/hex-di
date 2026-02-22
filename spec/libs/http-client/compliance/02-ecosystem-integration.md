# GxP Compliance — @hex-di/http-client: Ecosystem Integration & Combinator Requirements

> Part of the `@hex-di/http-client` GxP compliance sub-document suite.
> [Governance index](./gxp.md) | [Sub-document index](./README.md)

---

## 81. Ecosystem Port Integration

This section maps the HTTP client's built-in features to the port-based GxP enhancements that extend them for full regulatory compliance. The "Enhancement" column describes the capability; the "Port" column identifies which HTTP client port provides it.

| HTTP Client Feature                  | GxP Enhancement                              | Port / Section      | Relationship                                                                                                                                               |
| ------------------------------------ | -------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FNV-1a hash chain (`__integrity`)    | SHA-256 hash chain                           | `HttpAuditTrailPort` §92 | Port adapter upgrades the hash algorithm from FNV-1a (tamper detection) to SHA-256 (cryptographic integrity)                                         |
| `HttpAuditSink.write()`              | Durable audit recording                      | `HttpAuditTrailPort` §92 | Port adapter provides write guarantees, sequential ordering, and regulatory-grade persistence                                                        |
| `monotonicNow()` timing              | Clock drift detection and correction         | `HttpClockSourcePort` §96 | Port adapter adds NTP monitoring, drift detection, and correction capabilities                                                                       |
| `Object.freeze()` error immutability | Credential redaction in error messages       | §87 (this spec)     | `withCredentialProtection()` sanitizes error messages before they reach callers; frozen errors contain only redacted content                                |
| `HTTP_WARN_001` audit warning        | Compliance warning framework                 | §55c (this spec)    | HTTP audit warnings integrate into ecosystem-wide compliance warning patterns                                                                              |
| `errorCode()` (HTTP0xx namespace)    | Transport security error codes               | §85-§90 (this spec) | Transport security combinators add HTTPS_xxx error codes that complement the HTTP client's error namespace                                                 |
| `HttpClientInspector` snapshot       | GxP inspection with regulatory metadata      | §92 (this spec)     | Regulatory context (validation status, qualification evidence) enriches snapshots                                                                           |
| `HttpHistoryEntry.scopeId`           | Actor attribution with electronic signatures | `HttpSubjectProviderPort` §93, `HttpSignatureServicePort` §93a | Port adapters bind scopeId to authenticated identities with signature evidence |

---

## 81a. GxP Combinator Requirement Levels

This section defines the normative requirement levels for GxP-related HTTP client combinators. Combinators are classified as REQUIRED, RECOMMENDED, or CONDITIONAL based on their regulatory significance.

| Combinator                   | Level                                                  | Condition                                                           | Spec Section | Regulatory Driver                              |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- | ------------ | ---------------------------------------------- |
| `requireHttps()`             | **REQUIRED**                                           | Always; MUST be first combinator in chain                           | §85          | 21 CFR 11.30, EU GMP Annex 11 §12              |
| `withHttpAuditBridge()`      | **REQUIRED**                                           | Always; fail-fast validated at construction                         | §91, §97     | 21 CFR 11.10(e), ALCOA+ Complete               |
| `withCredentialProtection()` | **REQUIRED**                                           | Always                                                              | §87          | 21 CFR 11.300, OWASP                           |
| `withPayloadIntegrity()`     | **REQUIRED** (Category 1) / RECOMMENDED (Category 2-3) | REQUIRED for Category 1 GxP endpoints; RECOMMENDED for Category 2-3 | §86          | 21 CFR 11.10(c), ALCOA+ Accurate               |
| `withSubjectAttribution()`   | **REQUIRED**                                           | Always; user accountability is mandatory for all GxP operations     | §93          | 21 CFR 11.10(d), ALCOA+ Attributable           |
| `withPayloadValidation()`    | RECOMMENDED                                            | When structured data exchange is used                               | §89          | 21 CFR 11.10(h)                                |
| `withTokenLifecycle()`       | RECOMMENDED                                            | When session-based authentication is used                           | §90          | 21 CFR 11.300, EU GMP Annex 11 §12             |
| `withAuthFailureAudit()`     | CONDITIONAL                                            | REQUIRED when the system authenticates users for GxP HTTP operations; MAY be omitted only when authentication failure auditing is entirely delegated to an external system that provides equivalent 21 CFR 11.300 unauthorized use detection | §95          | 21 CFR 11.10(e), 11.300                        |
| `withAuthenticationPolicy()` | CONDITIONAL                                            | When MFA is mandated by organizational policy                       | §90          | 21 CFR 11.200, 11.300                          |
| `withElectronicSignature()`  | CONDITIONAL                                            | When electronic signatures are required for HTTP operations         | §93a         | 21 CFR 11.50, 11.70, 11.100                    |
| `withHttpGuard()`            | **REQUIRED**                                           | Always; default-deny posture enforced in GxP mode                   | §94          | 21 CFR 11.10(d), 11.10(g), EU GMP Annex 11 §12 |
| `withCorsHardening()`        | CONDITIONAL                                            | When browser-based GxP applications access regulated endpoints      | §112         | 21 CFR 11.30, EU GMP Annex 11 §12              |
| `rateLimit()`                | CONDITIONAL                                            | When endpoint rate limiting is needed for business continuity       | §113         | EU GMP Annex 11 §16                            |

```
REQUIREMENT: When `gxp: true` is set in the HTTP client configuration, omission of any
             REQUIRED combinator (requireHttps, withHttpAuditBridge, withCredentialProtection,
             withHttpGuard, withSubjectAttribution) MUST produce a ConfigurationError at
             construction time. The error MUST identify which REQUIRED combinator(s) are
             missing and reference the corresponding regulatory driver(s).
             The withHttpGuard() combinator is REQUIRED because all HTTP operations on
             regulated data MUST be gated by explicit access control policies with a
             default-deny posture. The withSubjectAttribution() combinator is REQUIRED
             because ALCOA+ Attributable mandates that every GxP operation be traceable
             to a specific individual — subject attribution is not optional in regulated
             environments. For Category 1 GxP endpoints (§84), withPayloadIntegrity()
             is also REQUIRED; its absence for a Category 1 endpoint MUST produce a
             ConfigurationError referencing §86 and the endpoint's data classification.
             Reference: GAMP 5 Category 5, 21 CFR 11.10(a), 21 CFR 11.10(c),
             21 CFR 11.10(d), EU GMP Annex 11 §12, ALCOA+ Attributable.
```

```
REQUIREMENT: When `gxp: true` is set and a CONDITIONAL combinator's condition applies
             (e.g., MFA mandated but withAuthenticationPolicy omitted), the system MUST
             emit a WARNING at construction time identifying the unmet condition and the
             regulatory implication of the omission.
             Reference: ICH Q9 Section 4 (Risk Communication).
```

```
RECOMMENDED: Organizations SHOULD use the `createGxPHttpClient` factory pattern (§103)
             to ensure all REQUIRED and applicable CONDITIONAL combinators are included
             by default. This factory pre-applies the REQUIRED combinators in the correct
             order and enables CONDITIONAL combinators based on the provided configuration.
```

### createGxPHttpClient Factory Usage Guidance

The `createGxPHttpClient` factory (§103) is the RECOMMENDED entry point for GxP deployments. It encapsulates the correct combinator ordering and ensures all REQUIRED combinators are applied. Usage:

```typescript
// Recommended GxP entry point — all REQUIRED combinators applied automatically
const gxpClient = createGxPHttpClient({
  // REQUIRED port adapters — factory validates these at construction time
  auditTrail: httpAuditTrailAdapter,       // §91 — SHA-256 audit chain
  subjectProvider: httpSubjectAdapter,      // §93 — user attribution
  authorization: httpAuthorizationAdapter,  // §94 — RBAC evaluation
  clockSource: httpClockSourceAdapter,      // §96 — NTP-synchronized timestamps
  walStore: httpWalStoreAdapter,            // §91 — crash recovery WAL

  // CONDITIONAL combinators — enabled based on deployment needs
  electronicSignature: httpSignatureAdapter, // §93a — when e-sig required
  payloadValidation: {                       // §89 — when structured data
    schemas: endpointSchemaMap,
  },
  tokenLifecycle: {                          // §90 — when session-based auth
    refreshThresholdMs: 60_000,
  },

  // GxP endpoint classification (§84)
  endpointClassification: gxpEndpointMap,

  // Inspector configuration
  inspector: {
    mode: "full",
    captureBodySnapshot: "request-and-response",
    gxp: true,
  },
});
```

The factory performs the following at construction time:
1. Validates all REQUIRED port adapters are provided (throws `ConfigurationError` if missing)
2. Applies REQUIRED combinators in normative order: `requireHttps` → `withCredentialProtection` → `withPayloadIntegrity` → `withSubjectAttribution` → `withHttpGuard` → `withHttpAuditBridge`
3. Applies CONDITIONAL combinators based on provided configuration
4. Validates combinator chain via `getCombinatorChain()` (§81b)
5. Returns a fully-configured `HttpClient` ready for GxP operations

```
REQUIREMENT: Organizations that bypass createGxPHttpClient and manually compose the
             combinator pipeline via pipe() MUST document their pipeline configuration
             in the site-specific Validation Plan (§83a) and MUST include OQ test cases
             verifying all REQUIRED combinators are present per §81a. The HttpClientInspector
             WARNING mechanism provides defense-in-depth but MUST NOT be the sole
             mechanism for detecting missing combinators in production deployments.
             Reference: GAMP 5 §D.4, 21 CFR 11.10(a).
```

### Compliance Validation Lint Rules

Organizations MAY implement automated compliance validation via lint rules or static analysis to supplement the runtime GxP combinator validation (§81b). The following lint rules are RECOMMENDED for CI/CD pipelines:

| Rule ID | Severity | Pattern | Purpose |
| ------- | -------- | ------- | ------- |
| `gxp/require-factory` | Warning | Detect `pipe(httpClient, ...)` without `createGxPHttpClient` | Encourage use of the validated factory entry point |
| `gxp/no-mode-off` | Error | Detect `mode: "off"` in `HttpClientInspectorConfig` when `gxp: true` | Prevent accidental audit disablement |
| `gxp/require-body-snapshot` | Warning | Detect `captureBodySnapshot: "off"` for state-changing operations on Category 1 endpoints | Ensure body audit completeness for critical data |
| `gxp/no-missing-reason` | Error | Detect POST/PUT/PATCH/DELETE to GxP endpoints without `reason` parameter | Enforce reason-for-change per 21 CFR 11.10(e) |
| `gxp/require-audit-sink` | Error | Detect `gxp: true` without `auditSink` configuration | Prevent silent audit data loss |

```
RECOMMENDED: Organizations SHOULD integrate GxP compliance lint rules into their CI/CD
             pipeline as a pre-deployment gate. Lint failures with Error severity MUST
             block deployment. Lint failures with Warning severity SHOULD be reviewed
             and documented. The lint rule set SHOULD be maintained under change control
             (§116) and reviewed during periodic compliance reviews.
             Reference: GAMP 5 §D.4 (verification activities), 21 CFR 11.10(a).
```

---

## 81b. GxP Combinator Validation Protocol

When `gxp: true` is set, the HTTP client factory MUST validate at construction time that all REQUIRED combinators (§81a) are present in the combinator chain. This validation provides a fail-fast mechanism that catches misconfiguration at startup rather than at the first HTTP request.

### Validation Mechanism

The `createGxPHttpClient` factory (§103) reads the combinator chain via `getCombinatorChain()` (§54) and verifies that each REQUIRED combinator is present:

| REQUIRED Combinator          | Combinator Name in Chain     | Regulatory Driver                              |
| ---------------------------- | ---------------------------- | ---------------------------------------------- |
| `requireHttps()`             | `"requireHttps"`             | 21 CFR 11.30, EU GMP Annex 11 §12              |
| `withHttpAuditBridge()`      | `"withHttpAuditBridge"`      | 21 CFR 11.10(e), ALCOA+ Complete               |
| `withCredentialProtection()` | `"withCredentialProtection"` | 21 CFR 11.300, OWASP                           |
| `withHttpGuard()`            | `"withHttpGuard"`            | 21 CFR 11.10(d), 11.10(g), EU GMP Annex 11 §12 |
| `withSubjectAttribution()`   | `"withSubjectAttribution"`   | 21 CFR 11.10(d), ALCOA+ Attributable           |

```
REQUIREMENT: The `createGxPHttpClient` factory MUST read the combinator chain via
             getCombinatorChain() after pipeline construction and verify that every
             REQUIRED combinator from §81a is present (requireHttps, withPayloadIntegrity,
             withCredentialProtection, withHttpGuard, withSubjectAttribution,
             withHttpAuditBridge). For Category 1 endpoints (§84), withPayloadIntegrity
             is unconditionally REQUIRED. If any REQUIRED combinator is missing, the
             factory MUST throw a ConfigurationError
             with error code "MISSING_REQUIRED_GXP_COMBINATOR" and a message that identifies:
             (1) the missing combinator name, (2) the regulatory driver requiring it,
             and (3) the spec section defining the combinator.
             Example message: "GxP validation failed: REQUIRED combinator
             'withHttpGuard' is missing from the combinator chain. This combinator
             is required by 21 CFR 11.10(d), 11.10(g) and EU GMP Annex 11 §12.
             See spec §94."
             Reference: GAMP 5 Category 5, 21 CFR 11.10(a).
```

```
REQUIREMENT: When the `createGxPHttpClient` factory is NOT used (i.e., the caller
             constructs the combinator pipeline manually via pipe()), the
             HttpClientInspector MUST emit a WARNING at construction time for each
             missing REQUIRED combinator detected via getCombinatorChain(). This
             defense-in-depth mechanism catches misconfiguration even when the
             recommended factory is bypassed. The WARNING MUST include the same
             diagnostic information as the ConfigurationError (combinator name,
             regulatory driver, spec section).
             Reference: ICH Q9 Section 4 (Risk Communication).
```

### Known Limitation: Runtime-Only Enforcement

The GxP combinator validation protocol operates at **runtime** (construction time), not at **compile time**. TypeScript's type system cannot currently enforce that a specific set of combinators has been applied to an `HttpClient` pipeline, because all combinators share the same function signature `(client: HttpClient) => HttpClient`. This means:

1. **Missing REQUIRED combinators are detected at application startup**, not during `tsc` compilation. The `createGxPHttpClient` factory throws `ConfigurationError` immediately, so the failure is deterministic and early — but it is not a compile-time guarantee.

2. **Compensating controls** that mitigate this limitation:
   - The `createGxPHttpClient` factory (§103) provides a single validated entry point that enforces all REQUIRED combinators at construction time
   - The `HttpClientInspector` WARNING mechanism (above) provides defense-in-depth when the factory is bypassed
   - OQ checks OQ-HT-70 through OQ-HT-73 verify combinator presence in the qualification protocol
   - The Validation Plan (§83a) requires documentation of the combinator pipeline configuration
   - Periodic review (§83b) checks for configuration drift

3. **Future consideration:** If TypeScript introduces branded function composition or effect-tracking capabilities, compile-time enforcement of REQUIRED combinators could be explored. Until then, the runtime factory + OQ verification approach provides equivalent assurance for GxP purposes.

```
OBSERVATION: The runtime-only enforcement of REQUIRED combinators is a known limitation
             documented per ICH Q9 risk communication principles. The compensating
             controls (factory validation, inspector warnings, OQ checks, Validation Plan
             documentation, periodic review) collectively provide equivalent assurance to
             compile-time enforcement. Organizations SHOULD document this limitation and
             its compensating controls in their site-specific Validation Plan (§83a
             section 5, Risk Assessment).
```

---

