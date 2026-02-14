# 17 - GxP Compliance Guide

### Normative Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt) and carry the same pharmaceutical alignment defined in guard spec section 59.

This chapter provides GxP compliance guidance specific to the HTTP transport layer implemented by `@hex-di/http-client`. It is intended for teams deploying this library in regulated environments (pharmaceutical, biotech, medical devices, clinical trials, laboratories) where 21 CFR Part 11, EU GMP Annex 11, and ALCOA+ data integrity principles apply.

> **Relationship to `@hex-di/guard`:** The guard library provides full GxP compliance infrastructure (authorization, electronic signatures, audit trails with SHA-256 chains, FMEA). This chapter documents the compliance controls **built into** `@hex-di/http-client` itself -- controls that are available even without `@hex-di/guard`. For full regulatory compliance in GxP environments, `@hex-di/guard` is **REQUIRED** (see SHA-256 mandate below and §81b combinator validation).

---

## 79. Regulatory Context (HTTP Transport Scope)

### Applicable Regulations

| Regulation                  | Requirement                     | HTTP Client Relevance                                                                                                                                                     |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **21 CFR 11.10(c)**         | Protection of records           | HTTP payloads in transit MUST be protected against tampering                                                                                                              |
| **21 CFR 11.10(e)**         | Audit trails for record changes | HTTP operations that create, modify, or delete GxP records MUST be audit-trailed                                                                                          |
| **21 CFR 11.30**            | Controls for open systems       | HTTP over untrusted networks requires TLS, digital signatures, encryption                                                                                                 |
| **21 CFR 11.50**            | Signature manifestations        | Electronic signatures applied to GxP records transmitted via HTTP MUST include signer identity, date/time, and meaning. **Out of scope for http-client -- see guard §65** |
| **21 CFR 11.100**           | Electronic signature controls   | Electronic signatures MUST be unique to one individual and verified before use. **Out of scope for http-client -- see guard §65**                                         |
| **EU GMP Annex 11 §7**      | Data storage and integrity      | HTTP payloads constitute data in transit; integrity MUST be verifiable                                                                                                    |
| **EU GMP Annex 11 §9**      | Audit trails                    | Changes to GxP-relevant data via HTTP MUST produce audit records                                                                                                          |
| **EU GMP Annex 11 §10**     | Change management               | Changes to HTTP client configuration MUST be controlled and documented. See §88 of this spec                                                                              |
| **EU GMP Annex 11 §12**     | Security and access control     | HTTP operations carrying GxP data MUST enforce access control. See §85-§87 of this spec                                                                                   |
| **EU GMP Annex 11 §16**     | Business continuity             | HTTP client MUST support continuity during transient failures (circuit breakers, retry). Crash recovery of audit data requires guard's WAL (§61.5)                        |
| **ALCOA+ (all principles)** | Data integrity                  | HTTP operations MUST satisfy Attributable, Legible, Contemporaneous, Original, Accurate, Complete, Consistent, Enduring, Available                                        |
| **MHRA DI Guidance**        | Cloud-hosted data controls      | HTTP operations to cloud APIs MUST enforce TLS and credential protection                                                                                                  |

> **Software Classification:** This library is classified as GAMP 5 Category 5 (Custom Applications) software for GxP environments. See §108 for the formal classification statement, supply chain classification, and Category 5 implications.

> **Training Requirements:** Personnel deploying this library in GxP environments MUST meet role-specific training requirements. See §109 for the training role matrix, record structure, and refresh triggers.

> **Guard Interface Dependencies:** GxP features depend on specific `@hex-di/guard` interfaces documented with version requirements in §118.

### In-Scope Controls (Built Into @hex-di/http-client)

The following GxP-relevant controls are built into `@hex-di/http-client` without requiring `@hex-di/guard`:

| Control                        | Implementation                                                                                                                 | Spec Section |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| **FNV-1a hash chain**          | `HttpHistoryEntry.__integrity` with chained hashes (non-GxP only; SHA-256 via HttpAuditTrailPort is REQUIRED when `gxp: true`) | §55a         |
| **Tamper detection**           | `verifyHistoryChain()` validates chain integrity                                                                               | §55a         |
| **Audit externalization**      | `HttpAuditSink` interface for long-term storage                                                                                | §55b         |
| **Error immutability**         | `Object.freeze()` on all error constructors                                                                                    | §23          |
| **Monotonic timing**           | `monotonicNow()` for immune-to-NTP duration measurement                                                                        | §54, §55a    |
| **Disabled-audit warning**     | `HTTP_WARN_001` emitted when recording is off                                                                                  | §55c         |
| **Request attribution**        | `scopeId`, `requestId` on every history entry                                                                                  | §54          |
| **Sequence ordering**          | Monotonic `sequenceNumber` on all entries and events                                                                           | §54, §56     |
| **GxP fail-fast**              | `gxp: true` validates `HttpAuditTrailPort` presence and rejects `mode: "off"` at construction time                             | §54, §55a    |
| **Body snapshot**              | `BodySnapshot` captures structured body metadata with SHA-256 digest for GxP audit completeness                                | §54          |
| **Persistence-aware eviction** | Entries with failed/pending sink writes protected from eviction when `gxp: true`                                               | §55a         |

> **FNV-1a limitation:** The FNV-1a 32-bit hash used in `@hex-di/http-client` is a non-cryptographic hash with ~1 in 4.3 billion collision probability per pair. It is effective for detecting accidental corruption but trivially invertible and insufficient for defending against deliberate adversarial tampering. FNV-1a MUST NOT be the sole audit integrity mechanism in 21 CFR Part 11 or EU GMP Annex 11 regulated environments. Deploy `@hex-di/guard` for SHA-256 cryptographic audit chains.

```
REQUIREMENT: When `gxp: true` is set in HttpClientInspectorConfig, SHA-256 audit
             integrity via HttpAuditTrailPort (§91-§97 of this spec) MUST be active.
             The createHttpClientInspectorAdapter factory MUST verify at construction
             time that an HttpAuditTrailPort adapter providing SHA-256 hash chains is
             registered. If HttpAuditTrailPort is not registered, the factory MUST
             throw a ConfigurationError with error code "GXP_AUDIT_INSUFFICIENT" and
             the message: "GxP mode requires SHA-256 audit integrity via
             HttpAuditTrailPort. FNV-1a hash chains alone do not satisfy 21 CFR Part 11
             or EU GMP Annex 11 audit trail requirements." FNV-1a remains active as a
             secondary tamper-detection layer but is not sufficient on its own for GxP.
             Reference: 21 CFR 11.10(c), EU GMP Annex 11 §7.
```

### Now-In-Scope Controls (Moved to This Spec)

The following GxP controls were previously in the guard spec and have been moved to this spec as sections §84-§103:

| Control                          | Combinator / Feature                            | Spec Section | Regulatory Driver                   |
| -------------------------------- | ----------------------------------------------- | ------------ | ----------------------------------- |
| **HTTPS enforcement**            | `requireHttps()` combinator                     | §85          | 21 CFR 11.30                        |
| **Payload integrity**            | `withPayloadIntegrity()` combinator             | §86          | 21 CFR 11.10(c)                     |
| **Credential protection**        | `withCredentialProtection()` combinator         | §87          | 21 CFR 11.300                       |
| **Access control**               | `requireHttps()` + `withCredentialProtection()` | §85, §87     | EU GMP Annex 11 §12                 |
| **Configuration change control** | `HttpClientConfigurationAuditEntry`             | §88          | EU GMP Annex 11 §10                 |
| **Payload schema validation**    | `withPayloadValidation()` combinator            | §89          | 21 CFR 11.10(h)                     |
| **Token lifecycle management**   | `withTokenLifecycle()` combinator               | §90          | 21 CFR 11.300                       |
| **SHA-256 audit trail**          | `HttpAuditTrailPort` with cryptographic chains  | §92          | 21 CFR 11.10(e)                     |
| **Electronic signature bridge**  | `withElectronicSignature()` combinator          | §93a         | 21 CFR 11.50, 11.70, 11.100, 11.200 |

### Guard Dependency Requirement

```
REQUIREMENT: When `gxp: true` is set in the HTTP client configuration, @hex-di/guard
             is a REQUIRED runtime dependency, not merely a documentation dependency.
             The `createGxPHttpClient` factory (§103) and the `createHttpAuditTrailAdapter`
             factory (§91) MUST verify at construction time that @hex-di/guard is
             available and that the guard graph provides: (1) SHA-256 audit chain
             infrastructure via HttpAuditTrailPort, (2) WAL crash recovery via
             WalStore (guard spec §61.5), (3) ClockSource for temporal consistency
             (guard spec §62), and (4) SubjectProviderPort for attribution (guard
             spec §23). If any of these guard-provided capabilities are missing,
             the factory MUST throw a ConfigurationError with error code
             "GXP_GUARD_DEPENDENCY_MISSING" and a message identifying which
             guard capability is absent.
             Reference: GAMP 5 Category 5, 21 CFR 11.10(a), EU GMP Annex 11 §4.
```

### Out-of-Scope Controls (Provided by @hex-di/guard)

The following GxP controls remain in `@hex-di/guard`:

| Control                            | Guard Feature                                                                                                                                                 | Guard Section | Regulatory Driver    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------- |
| **Electronic signature lifecycle** | `SignatureServicePort`                                                                                                                                        | guard §65     | 21 CFR 11.50, 11.100 |
| **Crash recovery (WAL)**           | Write-ahead log for audit durability — out of scope for http-client implementation, but REQUIRED as a guard dependency when `gxp: true` (see §91 REQUIREMENT) | guard §61.5   | EU GMP Annex 11 §16  |

> **Electronic signatures:** The core electronic signature lifecycle (capture, verification, storage) is managed by `@hex-di/guard`'s `SignatureServicePort` (guard spec §65). However, `@hex-di/http-client` provides a **transport-level bridge** via the `withElectronicSignature()` combinator (§93a) that binds guard-captured signatures to specific HTTP operations. This bridge satisfies 21 CFR 11.70 (signature/record linking) by cryptographically binding signatures to HTTP request content. The `withElectronicSignature()` combinator delegates to `SignatureServicePort` for actual signature capture and 2FA verification — it does not implement signature lifecycle itself.

```
REQUIREMENT: GxP deployments that transmit, modify, or store regulated data via HTTP
             MUST use HTTP transport combinators (sections 84-90 of this spec) for
             full compliance coverage. The built-in controls in @hex-di/http-client
             provide basic audit integrity (FNV-1a hash chain, error freezing, monotonic
             timing) but do NOT satisfy the full scope of 21 CFR Part 11 or EU GMP
             Annex 11 requirements for transport security, credential management, or
             cryptographic audit trails.
             Reference: 21 CFR 11.10(e), 21 CFR 11.30, EU GMP Annex 11 §7, §9, §12.
```

```
REQUIREMENT: For browser-based GxP deployments, CORS hardening is REQUIRED per
             13-advanced.md section 68a (CORS Considerations for GxP Data). The
             CORS configuration MUST be validated during OQ (see OQ-HT-64 in §99b).
             For Content Security Policy (CSP) considerations when guard inspection
             data is displayed in browser-based review interfaces, see
             guard/11-react-integration.md section 42 (Security Considerations).
             These cross-cutting security controls complement the transport-level
             controls in this chapter and the transport guard controls in sections 84-90.
             Reference: 21 CFR 11.30, ALCOA+ Complete.
```

---

## 80. ALCOA+ Mapping for HTTP Operations

This section maps all 9 ALCOA+ data integrity principles to their implementation in `@hex-di/http-client`.

| ALCOA+ Principle    | HTTP Client Implementation                                                                                                                                                                                                                                                                                                                                                                  | Consumer Responsibility                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Attributable**    | `scopeId` on `ActiveRequest` and `HttpHistoryEntry` identifies the scope (user/session) that initiated the request. `requestId` uniquely identifies each operation.                                                                                                                                                                                                                         | Consumers MUST configure scoped clients with meaningful `scopeId` values that trace back to authenticated users.                                                                                               |
| **Legible**         | `HttpHistoryEntry` fields use standard types (string URLs, numeric status codes, ISO timestamps). Error messages are human-readable. `CombinatorInfo` provides readable config summaries.                                                                                                                                                                                                   | Consumers SHOULD externalize audit entries via `HttpAuditSink` to a searchable, queryable store.                                                                                                               |
| **Contemporaneous** | `monotonicNow()` timestamps on `startedAtMono` and `completedAtMono` are captured at the moment of request start and completion. `sequenceNumber` provides monotonic ordering.                                                                                                                                                                                                              | Consumers MUST NOT post-date or pre-date audit entries. `HttpAuditSink.write()` is called synchronously after entry creation.                                                                                  |
| **Original**        | `Object.freeze()` on all error objects prevents mutation after creation. `__integrity` hash chain ensures entries are not modified after recording. `HttpHistoryEntry` fields are `readonly`.                                                                                                                                                                                               | Consumers MUST NOT reconstruct or transform entries before writing to the audit sink. The sink receives the original entry.                                                                                    |
| **Accurate**        | `durationMs` is computed from `completedAtMono - startedAtMono` (monotonic, not wall-clock). Status codes, URLs, and error reasons are captured directly from the platform adapter response.                                                                                                                                                                                                | Consumers SHOULD enable `verifyHistoryChain()` checks periodically to confirm entry accuracy has not been compromised.                                                                                         |
| **Complete**        | Every completed request produces an `HttpHistoryEntry` (when mode is `"full"` or `"lightweight"`). `HTTP_WARN_001` is emitted when recording is disabled. `BodySnapshot` captures request/response body metadata when `captureBodySnapshot` is enabled. `gxp: true` rejects `mode: "off"` at construction time. Retry queue ensures failed sink writes are retried before data loss occurs. | Consumers in GxP environments MUST NOT set `mode: "off"`. The warning exists as a compliance safety net. Consumers SHOULD enable `captureBodySnapshot` for POST/PUT/PATCH/DELETE operations carrying GxP data. |
| **Consistent**      | Hash chain links entries in insertion order. `sequenceNumber` is strictly monotonic. `verifyHistoryChain()` detects gaps or reordering.                                                                                                                                                                                                                                                     | Consumers SHOULD compare `sequenceNumber` values in externalized entries to detect missing records.                                                                                                            |
| **Enduring**        | `HttpAuditSink` interface externalizes entries to persistent storage. In-memory buffer is bounded by `maxHistoryEntries` but sink receives entries before eviction. Retry queue recovers from transient sink failures. Persistence-aware eviction (when `gxp: true`) protects unpersisted entries from eviction. `gxp: true` requires a durable `auditSink` at construction time.           | Consumers MUST implement `HttpAuditSink` with durable storage (database, append-only log) for GxP retention requirements. For full crash recovery, deploy `@hex-di/guard` with WAL (§61.5).                    |
| **Available**       | `HttpClientInspector` provides real-time query access. MCP resources (§57) expose audit data to AI diagnostics. `HttpClientSnapshot` is serializable.                                                                                                                                                                                                                                       | Consumers SHOULD configure MCP resource exposure for regulatory inspection access.                                                                                                                             |

---

## 80a. Platform Adapter Switchover Data Integrity

When a GxP deployment changes the underlying platform adapter (e.g., migrating from `FetchHttpClientAdapter` to `UndiciHttpClientAdapter` or `BunHttpClientAdapter`), hash chain continuity and ALCOA+ Consistent compliance must be maintained.

### Switchover Scenarios

| Scenario                        | Example                                               | Risk Level                                                          |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| **Runtime adapter replacement** | Switching from Fetch to Undici in a new release       | Medium — hash chain continues if same `HttpAuditTrailPort` instance |
| **Gradual traffic migration**   | Canary deployment routing % of traffic to new adapter | High — two adapter instances may produce interleaved audit entries  |
| **Platform migration**          | Moving from Node.js to Bun runtime                    | High — adapter change coincides with runtime change                 |

### Requirements

```
REQUIREMENT: Platform adapter switchovers MUST NOT break hash chain continuity.
             The hash chain is maintained by HttpAuditTrailPort (§91 of this spec)
             and HttpHistoryEntry.__integrity (§55a), NOT by the platform adapter.
             When the platform adapter changes, the audit trail port instance MUST
             remain the same (or be migrated per §104b) to preserve sequential
             hash chaining. The new adapter's first request MUST chain from the
             previous adapter's last entry.
             Reference: ALCOA+ Consistent, 21 CFR 11.10(e).
```

```
REQUIREMENT: During gradual traffic migration (canary/blue-green deployments)
             where two adapter instances serve traffic concurrently, both instances
             MUST share the same HttpAuditTrailPort instance or use a coordinated
             sequencing mechanism that guarantees: (1) globally monotonic
             sequenceNumber values across both adapters, (2) unbroken hash chain
             linking entries from both adapters in sequence order, and (3) no
             duplicate sequenceNumber values. If shared HttpAuditTrailPort is
             not feasible, the deployment MUST use a merge-and-rechain procedure
             after cutover that produces a unified, verified hash chain.
             Reference: ALCOA+ Consistent, ALCOA+ Complete.
```

```
REQUIREMENT: Platform adapter switchovers in GxP environments MUST be recorded
             as HttpClientConfigurationAuditEntry records (§88) with: (1) the
             previous adapter identifier, (2) the new adapter identifier,
             (3) the switchover timestamp, (4) the reason for the change, and
             (5) the sequenceNumber of the last entry produced by the previous
             adapter. This enables auditors to identify the exact point in the
             audit trail where the adapter changed.
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(e).
```

```
RECOMMENDED: Organizations SHOULD validate adapter switchovers as part of OQ
             (§99b). The validation SHOULD include: (1) hash chain verification
             spanning entries from both the old and new adapters, (2) cross-
             correlation check confirming evaluationId links remain valid,
             (3) timestamp consistency check confirming monotonic ordering
             across the switchover boundary, and (4) comparison of HTTP response
             metadata fields populated by each adapter to detect behavioral
             differences. Switchover validation results SHOULD be documented
             as part of the change control record (§88).
```

---

## 81. Relationship to @hex-di/guard GxP Chapters

This section provides a cross-reference between HTTP client features and the guard spec enhancements that extend them for full GxP compliance.

| HTTP Client Feature                  | Guard Enhancement                            | Guard Section       | Relationship                                                                                                                                                |
| ------------------------------------ | -------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FNV-1a hash chain (`__integrity`)    | SHA-256 hash chain (`HttpAuditTrailPort`)    | §92 (this spec)     | Guard upgrades the hash algorithm from FNV-1a (tamper detection) to SHA-256 (cryptographic integrity)                                                       |
| `HttpAuditSink.write()`              | `HttpAuditTrailPort.record()`                | §92 (this spec)     | Guard's audit trail port provides write guarantees, sequential ordering, and regulatory-grade persistence                                                   |
| `monotonicNow()` timing              | Monotonic timing with drift detection        | §92 (this spec)     | Guard adds clock drift detection and correction capabilities                                                                                                |
| `Object.freeze()` error immutability | Credential redaction in error messages       | §87 (this spec)     | Guard's `withCredentialProtection()` sanitizes error messages (removing credentials) before they reach callers; frozen errors contain only redacted content |
| `HTTP_WARN_001` audit warning        | Compliance warning framework                 | §59                 | Guard integrates HTTP warnings into the unified compliance warning system                                                                                   |
| `errorCode()` (HTTP0xx namespace)    | Guard error codes (ACL0xx, HTTPS_xxx)        | §85-§90 (this spec) | Guard adds transport security error codes that complement the HTTP client's error namespace                                                                 |
| `HttpClientInspector` snapshot       | GxP inspection with regulatory metadata      | §92 (this spec)     | Guard enriches snapshots with regulatory context (validation status, qualification evidence)                                                                |
| `HttpHistoryEntry.scopeId`           | Actor attribution with electronic signatures | guard §65           | Guard binds scopeId to authenticated identities with signature evidence                                                                                     |

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
| `withAuthFailureAudit()`     | RECOMMENDED                                            | When authentication events must be audited                          | §95          | 21 CFR 11.10(e), 11.300                        |
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
             REQUIRED combinator from §81a is present (requireHttps, withHttpAuditBridge,
             withCredentialProtection, withHttpGuard, withSubjectAttribution). If any
             REQUIRED combinator is missing, the factory MUST throw a ConfigurationError
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

---

## 82. Cross-Chain Integrity Verification

When both `@hex-di/http-client` (FNV-1a chain) and `@hex-di/guard` (SHA-256 chain) are deployed together, two independent hash chains exist for HTTP operations. This section specifies how to verify consistency between them.

### CrossChainVerificationResult

```typescript
interface CrossChainVerificationResult {
  /** Unique identifier for this verification evaluation. */
  readonly evaluationId: string;

  /** Whether the guard's SHA-256 chain is intact. */
  readonly guardChainIntact: boolean;

  /** Whether the HTTP client's FNV-1a chain is intact. */
  readonly httpChainIntact: boolean;

  /**
   * Whether timestamps are consistent between chains.
   * Checks that entries with the same requestId have matching
   * monotonic timestamps (within a tolerance of 1ms).
   */
  readonly timestampConsistent: boolean;

  /**
   * Whether correlation IDs (requestId, scopeId) match between chains.
   * Every entry in the HTTP chain with a corresponding guard audit entry
   * must have matching requestId and scopeId values.
   */
  readonly correlationValid: boolean;

  /** ISO 8601 UTC timestamp of the verification. */
  readonly verifiedAt: string;

  /** Number of entries compared. */
  readonly entriesCompared: number;

  /** Discrepancies found (empty when all checks pass). */
  readonly discrepancies: ReadonlyArray<{
    readonly requestId: string;
    readonly field: string;
    readonly httpValue: string;
    readonly guardValue: string;
  }>;
}
```

```
REQUIREMENT: When `gxp: true` is set and both @hex-di/http-client (FNV-1a chain) and
             @hex-di/guard (SHA-256 chain) are deployed together, cross-chain consistency
             checks using CrossChainVerificationResult MUST be performed at least once
             per container lifecycle (e.g., during graceful shutdown) and on-demand
             when audit integrity concerns arise. When both chains are active, the
             runtime MUST execute cross-chain verification during graceful shutdown
             and MUST expose a `verifyCrossChain()` method on the HttpClientInspector
             for on-demand verification. Discrepancies between the two chains MUST
             produce a CRITICAL alert and MUST be recorded as an
             HttpClientConfigurationAuditEntry with configurationKey
             "CROSS_CHAIN_INTEGRITY_VIOLATION".
             Reference: EU GMP Annex 11 §7 (data integrity), ALCOA+ Consistent,
             21 CFR 11.10(e).
```

```
RECOMMENDED: Organizations SHOULD additionally schedule periodic cross-chain
             verification at a configurable interval (RECOMMENDED: hourly for
             active scopes) to detect integrity divergence earlier than graceful
             shutdown. Automated cross-chain verification results SHOULD be
             included in periodic review documentation (§83b).
```

### Verification Logic

Cross-chain verification proceeds as follows:

1. Call `verifyHistoryChain()` on the HTTP client history to verify the FNV-1a chain.
2. Call the guard's `verifyAuditChain()` on the HTTP audit trail to verify the SHA-256 chain.
3. For each `requestId` present in both chains, compare monotonic timestamps and correlation fields.
4. Report discrepancies with the specific field and values that differ.

```typescript
// Example: periodic cross-chain verification
const httpHistory = inspector.getHistory();
const guardTrail = auditTrail.getEntries();

const result: CrossChainVerificationResult = {
  evaluationId: generateEvaluationId(),
  httpChainIntact: verifyHistoryChain(httpHistory),
  guardChainIntact: auditTrail.verifyChain(),
  timestampConsistent: verifyTimestampConsistency(httpHistory, guardTrail),
  correlationValid: verifyCorrelation(httpHistory, guardTrail),
  verifiedAt: new Date().toISOString(),
  entriesCompared: httpHistory.length,
  discrepancies: findDiscrepancies(httpHistory, guardTrail),
};

if (!result.httpChainIntact || !result.guardChainIntact) {
  logger.error("Audit chain integrity violation detected", { evaluationId: result.evaluationId });
}
```

---

## 83. Audit Entry Schema Versioning Strategy

When `HttpAuditSink` entries are externalized to persistent storage, the entry schema may evolve across library versions. This section specifies versioning conventions for externalized audit entries.

```
RECOMMENDED: Externalized HttpHistoryEntry records SHOULD include a schemaVersion field
             indicating the version of the entry schema used at creation time. The
             schemaVersion follows the library's semver version (e.g., "0.1.0") and
             enables downstream consumers to apply appropriate deserialization logic.
             Reference: EU GMP Annex 11 §7 (data integrity), ALCOA+ Enduring.
```

### Schema Versioning Interface

```typescript
interface VersionedAuditEntry {
  /** Schema version of this entry (semver, e.g., "0.1.0"). */
  readonly schemaVersion: string;

  /** The audit entry data. */
  readonly entry: HttpHistoryEntry;

  /** ISO 8601 UTC timestamp of externalization. */
  readonly externalizedAt: string;

  /** Source library identifier. */
  readonly source: "http-client";
}
```

### Migration Rules

1. **New fields are optional.** When a new library version adds fields to `HttpHistoryEntry`, the new fields MUST have default values. Consumers MUST treat missing fields as their default values.
2. **Existing fields are not removed.** Fields present in a schema version MUST NOT be removed in subsequent versions. They MAY be deprecated (ignored by consumers) but MUST remain in the serialized form.
3. **Unknown versions are rejected.** When a consumer encounters a `schemaVersion` it does not recognize (i.e., a version newer than the consumer's library), it MUST reject the entry with a clear error rather than silently misinterpreting fields.
4. **Backward compatibility window.** Consumers SHOULD support at least the current major version and one prior major version of the schema.

### Relationship to Guard Audit Schema

The guard library (`@hex-di/guard`) defines its own audit entry schema versioning in §61. When both libraries are deployed:

- HTTP client entries use `source: "http-client"` and the HTTP client's `schemaVersion`.
- Guard entries use `source: "guard"` and the guard's `schemaVersion`.
- Cross-chain verification (§82) operates on entries from both sources and MUST handle schema version differences gracefully.

---

## 83a. Validation Plan Reference

This section defines the Validation Plan outline for HTTP transport controls in GxP environments, as required by GAMP 5 (Category 5 software validation) and EU GMP Annex 11 §4 (Validation).

> **Relationship to Guard Validation Plan:** When `@hex-di/guard` is deployed alongside `@hex-di/http-client`, the HTTP transport validation activities described here SHOULD be incorporated into the guard's master Validation Plan (guard spec §67). When `@hex-di/http-client` is deployed independently (without guard), this section serves as the standalone Validation Plan outline.

### Validation Plan Outline

The Validation Plan for `@hex-di/http-client` GxP transport controls MUST address the following:

| Section                               | Content                                                                                                                                                                                                                          | Reference            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **1. Purpose and Scope**              | Define the scope of validation: which HTTP endpoints carry GxP data, which combinators are required, which regulatory frameworks apply.                                                                                          | GAMP 5 §D.4          |
| **2. Validation Strategy**            | Specify the approach: risk-based validation per ICH Q9, leveraging FMEA (§98) for risk assessment, IQ/OQ/PQ (§99) for qualification.                                                                                             | GAMP 5 §D.5          |
| **3. System Description**             | Describe the HTTP client architecture: platform adapters, combinator pipeline, audit bridge, integration with guard authorization. Reference spec sections 01-16 for base HTTP client and sections 84-97 for transport security. | EU GMP Annex 11 §4.2 |
| **4. Roles and Responsibilities**     | Define who performs validation activities: system owner, QA reviewer, IT infrastructure team. Include shared responsibilities between library (this spec) and consumer (ALCOA+ mapping §80).                                     | GAMP 5 §D.6          |
| **5. Risk Assessment**                | Reference the FMEA in §98. Document the risk classification of each HTTP endpoint (critical, major, minor) based on ICH Q9 severity criteria.                                                                                    | ICH Q9 §4            |
| **6. Qualification Protocol**         | Reference IQ/OQ/PQ in §99. Specify acceptance criteria for each qualification phase. Document any deviations from the standard protocol.                                                                                         | GAMP 5 §D.8          |
| **7. Test Environment Specification** | Document the test environment: network isolation requirements, test certificate authority configuration, controlled clock sources (NTP server or mock), known-good TLS endpoints for OQ verification.                            | GAMP 5 §D.9          |
| **8. Traceability Matrix**            | Reference the regulatory traceability matrix in §100. Map each requirement to its test evidence.                                                                                                                                 | EU GMP Annex 11 §4.3 |
| **9. Deviation Handling**             | Define the process for handling deviations: how PQ threshold failures are escalated, who approves risk acceptances, how deviations are documented.                                                                               | GAMP 5 §D.10         |
| **10. Validation Report**             | Define the format and content of the final validation report: summary of IQ/OQ/PQ results, list of deviations and resolutions, overall compliance assessment.                                                                    | EU GMP Annex 11 §4.4 |
| **11. Periodic Review Schedule**      | Reference §83b (Periodic Review and Revalidation). Define the initial periodic review schedule.                                                                                                                                  | EU GMP Annex 11 §11  |

```
REQUIREMENT: GxP deployments of @hex-di/http-client MUST have a documented
             Validation Plan that covers at minimum sections 1-10 of the outline
             above. The Validation Plan MUST be approved by the system owner and
             QA before qualification activities commence. The Plan MUST reference
             the specific version of @hex-di/http-client being validated.
             Reference: GAMP 5 §D.4, EU GMP Annex 11 §4.
```

```
REQUIREMENT: The Validation Plan MUST include a Test Environment Specification
             (section 7) documenting: (a) network isolation controls preventing
             test HTTP traffic from reaching production GxP systems, (b) test
             certificate authority used for TLS verification tests, (c) clock
             source configuration (real NTP or deterministic mock for timestamp
             tests), (d) test audit sink configuration and retention, and
             (e) test subject identities used for attribution and RBAC tests.
             Reference: GAMP 5 §D.9.
```

```
RECOMMENDED: Organizations SHOULD use the @hex-di/guard-validation programmatic
             runner (guard spec §67) to automate IQ/OQ/PQ execution and report
             generation. The runner produces machine-readable JSON reports suitable
             for regulatory submission and supports headless CI/CD execution.
```

---

## 83b. Periodic Review and Revalidation

This section defines the periodic review and revalidation requirements for HTTP transport controls in GxP environments, as required by EU GMP Annex 11 §11 and GAMP 5 operational phase guidance.

### Review Schedule

```
REQUIREMENT: GxP deployments of @hex-di/http-client MUST undergo periodic review
             at least annually to confirm that the system remains in a validated
             state. The review MUST be documented and approved by QA.
             Reference: EU GMP Annex 11 §11.
```

### Periodic Review Scope

Each periodic review MUST include:

| Area                      | Review Activity                                                                                                                                                                      | Evidence Required                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| **Configuration Drift**   | Compare current HTTP client configuration against the validated baseline. Verify combinator pipeline, TLS settings, RBAC policies, and audit sink configuration.                     | Configuration comparison report  |
| **IQ Re-execution**       | Re-run Installation Qualification checks (IQ-HT-01 through IQ-HT-04 from §99a).                                                                                                      | IQ report with pass/fail results |
| **OQ Sampling**           | Re-run a representative subset of Operational Qualification checks. At minimum: OQ-HT-01 (HTTPS enforcement), OQ-HT-07 (credential redaction), OQ-HT-12 (audit bridge completeness). | OQ report with pass/fail results |
| **Audit Trail Integrity** | Run `verifyAuditChain()` on the HTTP audit trail to confirm hash chain integrity. If cross-chain verification (§82) is configured, run `CrossChainVerificationResult` check.         | Chain verification report        |
| **Change History**        | Review all `HttpClientConfigurationAuditEntry` records since the last review. Verify all changes were authorized and documented.                                                     | Change log review summary        |
| **Incident Review**       | Review any incidents related to HTTP transport security (credential leaks, TLS failures, audit gaps) since the last review.                                                          | Incident resolution evidence     |
| **Dependency Updates**    | Review security advisories for `@hex-di/http-client` and its dependencies. Verify that critical/high severity patches have been applied.                                             | Dependency audit report          |
| **FMEA Currency**         | Review the FMEA (§98) for any new failure modes introduced by changes since the last review.                                                                                         | Updated FMEA if changes found    |

### Revalidation Triggers

Beyond the annual schedule, revalidation MUST be triggered by:

| Trigger                                                                                        | Scope of Revalidation            | Reference                |
| ---------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| **Major version upgrade** of `@hex-di/http-client`                                             | Full IQ/OQ/PQ                    | GAMP 5 operational phase |
| **Minor version upgrade** with GxP-affecting changes                                           | OQ + affected PQ checks          | GAMP 5 operational phase |
| **Regulatory change** affecting 21 CFR Part 11 or EU GMP Annex 11                              | FMEA review + affected OQ checks | EU GMP Annex 11 §11      |
| **Security incident** involving HTTP transport (credential leak, MITM, audit gap)              | Full OQ + root cause analysis    | ICH Q9 §4                |
| **Infrastructure change** (TLS stack upgrade, certificate authority change, NTP server change) | IQ + affected OQ checks          | EU GMP Annex 11 §10      |
| **FMEA revision** introducing new failure modes with RPN >= 15                                 | OQ checks for new mitigations    | ICH Q9 §4                |

```
REQUIREMENT: Revalidation triggered by security incidents MUST include a root
             cause analysis and verification that the incident has been fully
             remediated. The revalidation report MUST reference the incident
             number and resolution evidence. Revalidation MUST be completed
             before the system is returned to GxP production use.
             Reference: EU GMP Annex 11 §11, ICH Q9 §4.
```

```
RECOMMENDED: Organizations SHOULD automate periodic review checks using CI/CD
             pipelines that run IQ and OQ sampling checks on a scheduled basis
             (e.g., monthly). Automated checks SHOULD produce reports that feed
             into the annual periodic review documentation, reducing manual
             review effort while maintaining continuous compliance assurance.
```

---

## 83c. HTTP Transport Incident Classification Framework

EU GMP Annex 11 §13 requires that all incidents, not only system failures and data errors, shall be reported and assessed. This section defines an incident classification framework specific to HTTP transport security events, enabling consistent severity assessment, escalation, and response across GxP deployments.

### Incident Severity Levels

| Severity          | Definition                                                                                                  | Response SLA                                                 | Escalation                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Critical (S1)** | Patient safety impact, data integrity breach, or regulatory non-compliance. Requires immediate containment. | Response within 1 hour; containment within 4 hours           | Immediate notification to QA, system owner, and Qualified Person (QP). Regulatory notification if required. |
| **Major (S2)**    | GxP data at risk but no confirmed breach. Security control failure detected. Requires urgent investigation. | Response within 4 hours; remediation within 24 hours         | Notification to QA and system owner within 4 hours.                                                         |
| **Moderate (S3)** | Degraded security posture without confirmed data impact. Compensating controls in effect.                   | Response within 24 hours; remediation within 5 business days | Included in next periodic review (§83b).                                                                    |
| **Minor (S4)**    | Configuration issue or warning condition. No security control failure.                                      | Response within 5 business days                              | Tracked in operational log; reviewed during periodic review.                                                |

### HTTP Transport Incident Types

| Incident Type                      | Description                                                                                                                        | Default Severity | Example                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| **CREDENTIAL_EXPOSURE**            | Authentication credentials detected in logs, errors, audit entries, or external systems despite `withCredentialProtection()` (§87) | Critical (S1)    | Authorization header value appeared in application log file                           |
| **AUDIT_CHAIN_BREAK**              | Hash chain verification failure detected in HTTP audit trail                                                                       | Critical (S1)    | `verifyAuditChain()` reports gap between sequenceNumber 1042 and 1044                 |
| **AUDIT_ENTRY_LOSS**               | HTTP operations executed without corresponding audit entries                                                                       | Critical (S1)    | Request count exceeds audit entry count for a scope                                   |
| **CERTIFICATE_COMPROMISE**         | Server or client certificate private key compromised or revoked unexpectedly                                                       | Critical (S1)    | OCSP check returns "revoked" for a previously valid production certificate            |
| **TLS_DOWNGRADE**                  | Connection negotiated TLS version below configured minimum                                                                         | Major (S2)       | TLS 1.1 connection detected when `minTlsVersion` is "1.2"                             |
| **SIGNATURE_VERIFICATION_FAILURE** | Electronic signature binding verification failed for a GxP record                                                                  | Major (S2)       | `verify()` returns `bindingIntact: false` for a previously captured signature         |
| **SIGNER_REVOCATION**              | Signer identity revoked after signature capture; signed records at risk                                                            | Major (S2)       | `checkSignerStatus()` returns "revoked" for signer with active signed records         |
| **SEPARATION_OF_DUTIES_BYPASS**    | Subject performed conflicting roles despite `conflictingRoles` enforcement                                                         | Major (S2)       | Same subjectId appears as both data-entry and data-approval on same batch record      |
| **REVOCATION_CHECK_DEGRADED**      | All certificate revocation checking methods failing (OCSP/CRL unavailable)                                                         | Moderate (S3)    | Soft-fail mode allowing connections without revocation verification for >1 hour       |
| **AUDIT_CONFIRMATION_DELAY**       | Audit entries unconfirmed beyond WARNING threshold (>30s)                                                                          | Moderate (S3)    | `unconfirmedEntries()` returns entries older than 30 seconds                          |
| **TOKEN_LIFECYCLE_CIRCUIT_OPEN**   | Token refresh circuit-breaker opened; all authenticated requests blocked                                                           | Moderate (S3)    | Token provider returning errors; circuit-breaker tripped after 3 consecutive failures |
| **CONFIGURATION_DRIFT**            | Current HTTP client configuration does not match validated baseline                                                                | Moderate (S3)    | Periodic review detects combinator ordering different from Validation Plan            |
| **PIN_ROTATION_OVERDUE**           | Certificate pin rotation not performed within scheduled window                                                                     | Minor (S4)       | Pin label "production-ca-2024" still active 30 days after scheduled rotation          |
| **PAYLOAD_VALIDATION_WARNING**     | Payload schema validation in "warn" mode detecting invalid payloads                                                                | Minor (S4)       | Response body failing JSON Schema validation but not rejected                         |
| **CLOCK_SKEW_WARNING**             | Clock drift detected between HTTP client and guard service                                                                         | Minor (S4)       | Timestamps differ by >500ms between guard AuditEntry and HttpOperationAuditEntry      |
| **CORS_BLOCK**                     | CORS preflight or actual request blocked for GxP data endpoint                                                                     | Minor (S4)       | Browser CORS policy preventing data submission to GxP API                             |

### Incident Response Requirements

```
REQUIREMENT: GxP deployments MUST implement an incident classification and
             response procedure that covers all HTTP transport incident types
             listed above. Each incident MUST be classified by severity using
             the severity levels defined in this section. Classification MUST
             be documented at the time of detection — severity MUST NOT be
             retroactively downgraded without QA approval and documented
             justification.
             Reference: EU GMP Annex 11 §13, ICH Q9 §4.
```

```
REQUIREMENT: Critical (S1) and Major (S2) incidents MUST produce an
             HttpClientConfigurationAuditEntry (§88) with configurationKey
             "INCIDENT" and the incident details in the reason field. The
             entry MUST be recorded before any containment actions are taken,
             ensuring the audit trail captures the pre-containment system state.
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §13.
```

```
REQUIREMENT: Each incident MUST have a documented resolution that includes:
             (1) root cause analysis, (2) immediate containment actions taken,
             (3) corrective actions to prevent recurrence, (4) verification
             that corrective actions are effective, and (5) assessment of
             whether revalidation is required per §83b trigger criteria.
             Critical incidents MUST trigger revalidation. Major incidents
             MUST trigger revalidation if root cause analysis reveals a
             control failure.
             Reference: EU GMP Annex 11 §13, ICH Q9 §4.
```

```
RECOMMENDED: Organizations SHOULD implement automated incident detection for
             the following high-value scenarios:
             (1) Audit chain integrity verification on a scheduled basis
                 (RECOMMENDED: hourly for active scopes)
             (2) Unconfirmed entry monitoring with escalating alerts
                 (WARNING at 30s, CRITICAL at 5min per §91)
             (3) Credential pattern scanning in application logs
             (4) Certificate expiration monitoring with 30/7/1-day alerts
             (5) Token lifecycle circuit-breaker state monitoring
             Automated detection SHOULD feed into the organization's incident
             management system (e.g., ServiceNow, Jira Service Management)
             for tracking and SLA enforcement.
```

---

_Previous: [16 - Definition of Done](./16-definition-of-done.md) | Next: [18 - HTTP Transport Security](./18-http-transport-security.md)_
