# 15 - Appendices

## Appendix A: Architectural Comparison and Transport Adapter Compatibility

### Architectural Comparison

HexDI HttpClient and Effect HttpClient are the only two HTTP libraries that provide first-class DI integration, typed error channels, and functional composition. Other libraries (axios, got, ky, ofetch) serve as **transport backends** -- HexDI provides first-class adapter packages for each.

| Feature                | HexDI HttpClient                      | Effect HttpClient                |
| ---------------------- | ------------------------------------- | -------------------------------- |
| **Error handling**     | `ResultAsync` (never throws)          | `Effect<R, E, A>` (never throws) |
| **Error types**        | Discriminated union (`_tag`)          | Tagged errors (`_tag`)           |
| **DI integration**     | First-class port/adapter              | Layer/Service pattern            |
| **Request building**   | Immutable + pipeable combinators      | Immutable + pipeable combinators |
| **Response body**      | Lazy `ResultAsync` accessors          | Lazy `Effect` accessors          |
| **Middleware**         | Functional combinators                | Functional combinators           |
| **Transport adapters** | Fetch, Axios, Got, Ky, Ofetch, Node, Undici, Bun | Fetch, Node, Undici, Bun |
| **Retry**              | `retry` / `retryTransient` combinator | `retry` / `retryTransient`       |
| **Timeout**            | `timeout` combinator + `withTimeout`  | `Effect.timeout`                 |
| **Tracing**            | `withTracing` combinator (OTel)       | Effect tracing built-in          |
| **Testing**            | Mock client + recording + matchers    | Mock layers                      |
| **Scoping**            | Container scopes (per-request)        | Fiber/Scope                      |
| **Introspection**      | Inspector + MCP resources             | None                             |
| **Bundle size (core)** | Target: < 8KB gzipped                 | ~50KB (platform package)         |
| **TypeScript**         | First-class, no `any`                 | First-class, no `any`            |
| **Streaming**          | `ReadableStream<Uint8Array>`          | `Stream<Uint8Array>`             |

### Transport Adapter Compatibility Matrix

| Adapter Package                | HTTP Library | Browser | Node.js | Bun | Deno | Workers | HTTP/2 | Streaming | Bundle Size |
| ------------------------------ | ------------ | ------- | ------- | --- | ---- | ------- | ------ | --------- | ----------- |
| `@hex-di/http-client-fetch`    | Fetch API    | Yes     | 18+     | Yes | Yes  | Yes     | No     | Yes       | ~1KB        |
| `@hex-di/http-client-axios`    | axios        | Yes     | Yes     | Yes | No   | No      | No     | Limited   | ~13KB       |
| `@hex-di/http-client-got`      | got          | No      | Yes     | No  | No   | No      | Yes    | Yes       | ~20KB       |
| `@hex-di/http-client-ky`       | ky           | Yes     | Yes     | Yes | Yes  | Yes     | No     | Yes       | ~3KB        |
| `@hex-di/http-client-ofetch`   | ofetch       | Yes     | Yes     | Yes | Yes  | Yes     | No     | Yes       | ~2KB        |
| `@hex-di/http-client-node`     | node:http    | No      | Yes     | No  | No   | No      | No     | Yes       | ~2KB        |
| `@hex-di/http-client-undici`   | undici       | No      | Yes     | No  | No   | No      | Yes    | Yes       | ~3KB        |
| `@hex-di/http-client-bun`      | Bun.fetch    | No      | No      | Yes | No   | No      | No     | Yes       | ~1KB        |

### Key Differentiators

1. **DI-native** -- HexDI HttpClient is a DI port, not a standalone library. It participates in compile-time graph validation.
2. **Transport-agnostic** -- Any HTTP library can be used as a backend via the transport adapter contract. Axios, got, ky, and ofetch are first-class citizens, not competitors.
3. **Result-based** -- All operations return `ResultAsync`, composing naturally with HexDI's error handling model.
4. **Self-aware** -- Built-in introspection with request history, latency stats, and MCP resource exposure.
5. **Scoped** -- Per-request clients via HexDI's scope model carry context (correlation IDs, auth) automatically.
6. **No implicit behavior** -- No auto-parsing, no auto-retry, no implicit error throwing. Every behavior is explicit via combinators.

## Appendix B: Glossary

| Term                  | Definition                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **HttpClient**        | The core interface for executing HTTP requests. Returns `ResultAsync`.                                                                  |
| **HttpClientPort**    | DI port token (`DirectedPort<HttpClient, "HttpClient", "outbound">`) for dependency injection.                                          |
| **HttpRequest**       | Immutable value object representing an outgoing HTTP request.                                                                           |
| **HttpResponse**      | Frozen value object with lazy body accessors returning `ResultAsync`.                                                                   |
| **HttpClientError**   | Discriminated union of all HTTP error types (`HttpRequestError \| HttpResponseError \| HttpBodyError`).                                 |
| **HttpRequestError**  | Error before response (network, timeout, abort, invalid URL).                                                                           |
| **HttpResponseError** | Error from response (status code, decode, empty body).                                                                                  |
| **HttpBodyError**     | Error during request body construction (JSON serialization).                                                                            |
| **Combinator**        | Function `(HttpClient) => HttpClient` that wraps the client with additional behavior.                                                   |
| **Transport adapter** | Adapter that provides `HttpClientPort` using a specific HTTP library or runtime (fetch, axios, got, ky, ofetch, undici, node:http).     |
| **Scoped client**     | Per-scope `HttpClient` that carries request-specific context (auth, correlation ID).                                                    |
| **Interceptor**       | Synonym for combinator; a function that wraps request or response processing.                                                           |
| **Transient error**   | An error that is worth retrying (transport failure, timeout, 5xx, 429).                                                                 |
| **Circuit breaker**   | Pattern that stops requests to a failing endpoint after repeated failures.                                                              |
| **Inspector**         | Read-only API for querying HTTP client state (active requests, history, stats).                                                         |
| **ResultAsync**       | `@hex-di/result` type wrapping `Promise<Result<T, E>>` for composable async error handling.                                             |
| **DirectedPort**      | `@hex-di/core` port type with direction metadata (`"inbound"` or `"outbound"`).                                                         |
| **Hash chain**        | A sequence of entries where each entry's hash includes the previous entry's hash, forming a tamper-evident linked list. Uses FNV-1a.    |
| **HttpAuditSink**     | Interface for externalizing HTTP history entries with integrity hashes to long-term audit storage (GxP compliance).                     |
| **Monotonic clock**   | A clock source (`monotonicNow()`) immune to NTP adjustments and wall-clock jumps, used for reliable duration and ordering measurements. |
| **FMEA**              | Failure Mode and Effects Analysis. A systematic risk assessment method (per ICH Q9) that identifies potential failure modes, assesses their severity, likelihood, and detectability, and computes a Risk Priority Number (RPN) to prioritize mitigations. See §98. |
| **RPN**               | Risk Priority Number. Calculated as Severity x Likelihood x Detectability (S x L x D) per ICH Q9 methodology. Maximum value is 125 (5 x 5 x 5). Used in FMEA (§98) to prioritize risk mitigations. |
| **ALCOA+**            | Data integrity framework: Attributable, Legible, Contemporaneous, Original, Accurate (ALCOA) plus Complete, Consistent, Enduring, Available. Required by FDA, WHO TRS 996, WHO TRS 1033 Annex 4, MHRA DI guidance, and PIC/S PI 041. See §80. |
| **GAMP 5**            | Good Automated Manufacturing Practice, 5th edition. ISPE guide for validation of computerized systems in pharmaceutical manufacturing. Defines software categories (1-5) and V-model lifecycle. See §108. |
| **ICH Q9**            | International Council for Harmonisation guideline on Quality Risk Management. Provides risk assessment framework including FMEA methodology used in §98. |
| **IQ/OQ/PQ**          | Installation Qualification / Operational Qualification / Performance Qualification. Three-phase validation protocol per GAMP 5 V-model lifecycle. IQ verifies correct installation, OQ verifies functional requirements, PQ verifies performance under real-world conditions. See §99. |
| **WAL**               | Write-Ahead Log. A durable persistence mechanism that records audit entry intents before the primary audit write completes, enabling crash recovery without data loss. See §91 (`HttpWalStorePort`). |
| **Electronic signature** | The computer data compilation of any symbol or series of symbols executed, adopted, or authorized by an individual to be the legally binding equivalent of the individual's handwritten signature, per 21 CFR 11.3(b)(7). See §93a (`withElectronicSignature()`). |
| **Validation Plan**   | A document defining the strategy, scope, and acceptance criteria for qualifying software in a GxP environment, per GAMP 5 §D.8. Instantiated as a standalone document in §25. See §83a for the template. |
| **Configuration Specification** | A consolidated inventory of all configurable GxP parameters with types, defaults, allowed values, validation rules, and regulatory references, per GAMP 5 §D.6. See Appendix F. |
| **Periodic review**   | A scheduled review (typically annual) of the computerized system's validated state, per EU GMP Annex 11 §11. Reviews configuration drift, FMEA currency, training compliance, and continued suitability. See §83b. |
| **Revalidation**      | Re-execution of qualification protocols (IQ/OQ/PQ or subset) triggered by a change that affects the validated state of the system. Trigger criteria and scope defined in §117 (SemVer-to-revalidation mapping). |
| **OCSP**              | Online Certificate Status Protocol. A protocol (RFC 6960) for checking the revocation status of X.509 digital certificates in real time. Used in §106 (CertificateRevocationPolicy) as the primary revocation checking method. |
| **CRL**               | Certificate Revocation List. A list of revoked digital certificates published by a Certificate Authority (RFC 5280). Used as a fallback revocation checking method in §106 when OCSP is unavailable. |
| **DPA**               | Data Processing Agreement. A contractual agreement required by GDPR Article 28 between a data controller and a data processor governing the processing of personal data. Required for cloud audit trail storage providers per §104 and MIG-02 (Appendix I). |
| **DPIA**              | Data Protection Impact Assessment. An assessment required by GDPR Article 35 for processing operations that pose a high risk to individuals' rights and freedoms. REQUIRED for EU deployments per §110. |
| **SSRF**              | Server-Side Request Forgery. An attack (CWE-918) where an attacker induces the server to make requests to unintended locations. Mitigated by §90a (`withSsrfProtection()`). |
| **CAPA**              | Corrective and Preventive Action. A quality management process (per ICH Q10 §3.2) for systematically investigating, correcting, and preventing recurrence of deviations. See §83d. |
| **HSTS**              | HTTP Strict Transport Security. A web security mechanism (RFC 6797) that forces browsers to use HTTPS connections. See §90c (`withHstsEnforcement()`). |
| **CSRF**              | Cross-Site Request Forgery. An attack where unauthorized commands are transmitted from a user that the web application trusts. Mitigated by §90d (`withCsrfProtection()`). |
| **KMS**               | Key Management Service. A service (cloud-based or on-premises HSM) providing encryption key generation, storage, rotation, and access control for audit data-at-rest encryption. See §104c (`HttpAuditEncryptionPort`) and CV-06 (Key Management consumer validation). |
| **mTLS**              | Mutual TLS (Mutual Transport Layer Security). A TLS handshake where both client and server authenticate each other using X.509 certificates. REQUIRED for Category 1 GxP endpoints per §85. |
| **NTP**               | Network Time Protocol. A protocol (RFC 5905) for synchronizing clocks of computer systems over packet-switched networks. Used via `HttpClockSourcePort` (§96) to ensure audit trail timestamps are contemporaneous per ALCOA+. Clock drift threshold is 1 second for GxP environments. |
| **SPKI**              | Subject Public Key Info. A data structure in X.509 certificates containing the public key and its algorithm. Used for certificate pinning (RFC 7469) in §85 (`certificatePins`). |
| **MHRA**              | Medicines and Healthcare products Regulatory Agency. UK regulatory body for medicines, medical devices, and blood components. Issues data integrity guidance referenced in ALCOA+ mapping (§80). |
| **PIC/S PI 041**      | Pharmaceutical Inspection Co-operation Scheme, Good Practices for Data Management and Integrity in Regulated GMP/GDP Environments (PI 041-1). Provides guidance on ALCOA+ implementation, audit trail review, and data governance. Referenced in §80 (ALCOA+ mapping), §104 (retention), §105 (query/retrieval), and the Validation Plan (§25). |
| **WHO TRS 1033**      | World Health Organization Technical Report Series No. 1033, Annex 4: Guidance on Good Data and Record Management Practices. Provides data integrity requirements for pharmaceutical quality systems including audit trail retention, traceability, and validation. Referenced in §99 (IQ/OQ/PQ), §100 (traceability), §104 (retention), and the Validation Plan (§25). |

## Appendix C: Design Decisions

| Decision                                          | Chosen                                      | Alternative                               | Rationale                                                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error handling                                    | `ResultAsync` (never throws)                | Exceptions (throw/catch)                  | Composes with HexDI's `Result` ecosystem. Exhaustive matching via `_tag`. No unhandled rejections.                                                                     |
| Request building                                  | Immutable value objects + combinators       | Mutable builder pattern                   | Immutability prevents mutation bugs. Combinators are tree-shakeable. Builder pattern encourages mutation.                                                              |
| Middleware model                                  | Functional combinators                      | Interceptor arrays                        | Visible execution order. No shared mutable state. Type-safe composition. Tree-shakeable.                                                                               |
| Body accessor return type                         | `ResultAsync<T, HttpResponseError>`         | `Promise<T>` (throwing)                   | Consistent with Result-based error handling. Body decode errors are typed values.                                                                                      |
| `bodyJson` returns Result                         | `Result<HttpRequest, HttpBodyError>`        | Throw on serialization failure            | JSON.stringify can fail. Capturing in Result chain avoids breaking the pipeline.                                                                                       |
| Port direction                                    | `"outbound"`                                | `"inbound"`                               | HTTP client sends requests to external services -- data flows outward from domain.                                                                                     |
| Fetch adapter packaging                           | Separate `@hex-di/http-client-fetch` package | Built-in to core                          | Core stays transport-agnostic. Follows monorepo pattern (`logger` + `logger-pino`). Teams choose their transport adapter explicitly -- no hidden default.              |
| No auto-parsing                                   | Body accessors are explicit                 | Auto-parse based on Content-Type          | Explicit is better than implicit. Avoids surprises with unexpected content types.                                                                                      |
| Separate `HttpRequestError` / `HttpResponseError` | Two types with `reason` variants            | Single `HttpClientError` class            | Different error categories need different handling. Discriminated union enables exhaustive matching.                                                                   |
| Circuit breaker as combinator                     | `HttpClient.circuitBreaker(opts)`           | Separate middleware class                 | Consistent with other combinators. No special registration or lifecycle management.                                                                                    |
| Inspector with sequence numbers                   | Monotonic `sequenceNumber`                  | Timestamp-only ordering                   | Monotonic sequence guarantees deterministic ordering even under system clock adjustments.                                                                              |
| `stream` accessor not wrapped in Result           | `ReadableStream<Uint8Array>` directly       | `ResultAsync<ReadableStream, ...>`        | Streaming is inherently imperative. Wrapping in Result adds indirection without value for stream consumers.                                                            |
| Scoped client via separate port                   | `ScopedHttpClientPort` (distinct)           | Same `HttpClientPort` with scoped adapter | Explicit separation prevents accidental singleton dependency on scoped service. Clear intent in graph.                                                                 |
| FNV-1a hash chain for audit integrity             | FNV-1a (32-bit) chained hashes              | SHA-256 or no integrity                   | FNV-1a is fast, deterministic, and sufficient for tamper detection (not cryptographic security). Follows `packages/logger/src/utils/integrity.ts`.                     |
| Monotonic clock for timing                        | `monotonicNow()` via `performance.now()`    | `Date.now()` only                         | Immune to NTP jumps and wall-clock adjustments. Follows `packages/runtime/src/util/monotonic-time.ts`.                                                                 |
| Error objects frozen after construction           | `Object.freeze()` in all error constructors | Mutable error objects                     | ALCOA+ requires original records to be unmodifiable. Prevents downstream mutation of audit-relevant error fields. Follows `packages/core/tests/gxp-integrity.test.ts`. |
| Audit recording warning                           | `HTTP_WARN_001` emitted once per container  | Silent when audit disabled                | GxP compliance requires awareness of disabled audit features. Follows `packages/core/src/inspection/tracing-warning.ts` pattern.                                       |

## Appendix D: MCP Resource & A2A Skill Inventory

This appendix consolidates all MCP resources and A2A skills defined in the HTTP client specification, plus cross-references to ecosystem adapter libraries, for quick reference during integration planning and GxP validation.

### HTTP Client MCP Resources (§57)

| #   | MCP Resource URI                  | Introspection API                  | Return Type                              |
| --- | --------------------------------- | ---------------------------------- | ---------------------------------------- |
| 1   | `hexdi://http/snapshot`           | `inspector.getSnapshot()`          | `HttpClientSnapshot`                     |
| 2   | `hexdi://http/active`             | `inspector.getActiveRequests()`    | `readonly ActiveRequest[]`               |
| 3   | `hexdi://http/history`            | `inspector.getHistory(filter)`     | `readonly HttpHistoryEntry[]`            |
| 4   | `hexdi://http/stats`              | `inspector.getStats()`             | `HttpClientStats`                        |
| 5   | `hexdi://http/stats/{urlPattern}` | `inspector.getStatsByUrl(pattern)` | `HttpClientUrlStats \| undefined`        |
| 6   | `hexdi://http/health`             | `inspector.getHealth()`            | `HttpClientHealth`                       |
| 7   | `hexdi://http/combinators`        | `inspector.getCombinatorChain()`   | `readonly CombinatorInfo[]`              |
| 8   | `hexdi://http/circuit-breakers`   | `snapshot.circuitBreakers`         | `Record<string, CircuitBreakerSnapshot>` |
| 9   | `hexdi://http/audit/verify`       | `verifyHistoryChain()`             | `boolean`                                |

### HTTP Client A2A Skills (§57)

| #   | Skill ID              | Name                | Purpose                                                                                |
| --- | --------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| 1   | `diagnose-http-issue` | Diagnose HTTP Issue | Analyzes request history, error patterns, circuit breaker state, and latency trends    |
| 2   | `http-health-check`   | HTTP Health Check   | Reports health status of all HTTP endpoints including circuit breakers and error rates |

### Ecosystem MCP Resources (Cross-Reference)

When ecosystem port adapter libraries are deployed alongside the HTTP client, the following MCP resources complement the HTTP client resources:

| #   | MCP Resource URI                  | Ecosystem Feature                       | Source Library   |
| --- | --------------------------------- | --------------------------------------- | ---------------- |
| 1   | `hexdi://guard/audit-trail`       | GxP audit trail entries (SHA-256 chain) | `@hex-di/guard`  |
| 2   | `hexdi://guard/authorization`     | Authorization decision history          | `@hex-di/guard`  |
| 3   | `hexdi://guard/signatures`        | Electronic signature records            | `@hex-di/guard`  |
| 4   | `hexdi://guard/compliance-status` | Overall GxP compliance status           | `@hex-di/guard`  |
| 5   | `hexdi://guard/http-transport`    | HTTP transport security policy status   | `@hex-di/guard`  |

### Ecosystem A2A Skills (Cross-Reference)

| #   | Skill ID                       | Name                         | Source Library   |
| --- | ------------------------------ | ---------------------------- | ---------------- |
| 1   | `diagnose-authorization-issue` | Diagnose Authorization Issue | `@hex-di/guard`  |
| 2   | `gxp-compliance-check`         | GxP Compliance Check         | `@hex-di/guard`  |

### GxP Note

In production GxP environments, access to MCP resources constitutes read access to audit-relevant data. Organizations MUST implement meta-audit logging for MCP resource access when MCP resources expose GxP audit data — recording who accessed which resource, when, and from which agent context. This maintains parity with §105 `QueryableHttpAuditTrailPort` meta-audit requirements per 21 CFR 11.10(e). For non-production or non-GxP MCP deployments, meta-audit logging is RECOMMENDED.

---

## Appendix E: GxP Minimum Configuration

This appendix documents which items specified as RECOMMENDED (per RFC 2119) in the main specification are elevated to REQUIRED for GxP deployments. In FDA 21 CFR Part 11 or EU GMP Annex 11 environments, these items MUST be implemented unless a documented risk assessment (FMEA §98) with QA approval justifies the deviation. Items marked "High" deviation risk MUST NOT be omitted without QA-approved risk acceptance.

### Minimum GxP Combinator Pipeline

The following combinators are REQUIRED by the specification (§81b, §103) and enforced by `createGxPHttpClient`:

| #   | Combinator                   | Spec Section | Regulatory Reference             |
| --- | ---------------------------- | ------------ | -------------------------------- |
| 1   | `requireHttps()`             | §85          | 21 CFR 11.30                     |
| 2   | `withPayloadIntegrity()`     | §86          | 21 CFR 11.10(c), ALCOA+ Accurate |
| 3   | `withCredentialProtection()` | §87          | 21 CFR 11.300                    |
| 4   | `withHttpAuditBridge()`      | §97          | 21 CFR 11.10(e), ALCOA+ Complete |
| 5   | `withSubjectAttribution()`   | §93          | ALCOA+ Attributable              |
| 6   | `withHttpGuard()`            | §94          | 21 CFR 11.10(d), 11.10(g)       |

### RECOMMENDED Items Elevated to REQUIRED for GxP Deployments

The following items are specified as RECOMMENDED (SHOULD) in the general specification but are REQUIRED (MUST) for GxP deployments unless a documented risk assessment (FMEA §98) justifies the deviation with QA approval:

| #   | Item                                                                     | Spec Section        | Rationale                                                                                                                                                                   | Deviation Risk                                                                                             | Verification Test |
| --- | ------------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | Certificate pinning (SPKI) for Category 1 endpoints                      | §85                 | CA compromise enables MITM with valid certificates; pinning is the only defense against this attack. **Note: Now REQUIRED per §85 for Category 1 endpoints.**               | High — no alternative control exists for CA compromise                                                     | IQ-HT-03, OQ-HT-04, E2E-010 |
| 2   | Cross-chain verification (FNV-1a + SHA-256)                              | §82                 | Discrepancies between integrity chains indicate data corruption or tampering. **Note: Now REQUIRED per §82 when `gxp: true`.**                                              | Medium — SHA-256 chain alone provides integrity, but divergence from FNV-1a chain indicates upstream issue | GX-001 through GX-003, E2E-007 |
| 3   | `logicalOperationId` for retried operations                              | §97                 | Without logical grouping, retried operations appear as separate operations, confusing audit review. **Note: Now REQUIRED per §97 when `gxp: true` with retry combinators.** | Medium — auditors may misinterpret retry attempts as separate operations                                   | AB-028 through AB-032 |
| 4   | `failureMode: "hard-fail"` for certificate revocation                    | §106                | Soft-fail allows connections to endpoints with revoked certificates                                                                                                         | High — compromised certificates accepted for GxP data transmission                                         | OQ-HT-31, OQ-HT-32, CF-008 |
| 5   | Constant-time signature comparison                                       | §107                | Timing attacks can extract signature binding values                                                                                                                         | Medium — exploitable only by sophisticated attackers with network proximity                                | OQ-HT-33, OQ-HT-34 |
| 6   | CORS hardening for browser-based deployments                             | §68a                | Wildcard CORS permits unauthorized cross-origin access to GxP data. **Note: Now REQUIRED per §68a for browser-based GxP deployments.**                                      | High — browser-based GxP apps without CORS hardening expose data to cross-origin attacks                   | TS-069, TS-070 |
| 7   | Periodic signature re-verification                                       | §107                | Signer status changes (revocation, suspension) retroactively invalidate previously captured signatures                                                                      | Medium — undetected until next manual review                                                               | E2E-014 |
| 8   | `withPayloadValidation({ requestValidationMode: "reject" })`             | §89                 | `"warn"` mode allows malformed payloads to reach GxP APIs                                                                                                                   | High — data integrity violation at the API boundary                                                        | TS-020 through TS-024, E2E-016 |
| 9   | `withAuthenticationPolicy()` with `minimumStrength: "multi-factor"`      | §90                 | Single-factor authentication is insufficient for 21 CFR 11.200 electronic signatures                                                                                        | High — regulatory non-compliance for e-signature-dependent operations                                      | TS-025 through TS-030, E2E-012 |
| 10  | Automated backup verification                                            | §104a               | Unverified backups may be corrupted, leading to data loss during disaster recovery                                                                                          | Medium — discovered only during actual restore                                                             | OQ-HT-35, OQ-HT-36 |
| 11  | Three backup generations (grandfather-father-son)                        | §104a               | Single backup copy creates single point of failure for audit data                                                                                                           | Medium — mitigated by geographic separation                                                                | OQ-HT-35 |
| 12  | Trial migration before production                                        | §104b               | Production migration failures can cause audit trail data loss                                                                                                               | High — no rollback if hash chain is broken during production migration                                     | OQ-HT-37 |
| 13  | `withElectronicSignature()` for state-changing operations on GxP records | §93a                | Unsigned modifications to electronic records lack intent verification                                                                                                       | High — regulatory non-compliance for 21 CFR 11.50/11.70                                                    | OQ-HT-13 through OQ-HT-15, E2E-014 |
| 14  | NTP monitoring with clock drift threshold                                | §96 (HttpClockSourcePort) | Clock drift causes inconsistent timestamps between authorization and HTTP audit entries                                                                                     | Medium — temporal ordering of audit events becomes unreliable                                              | AB-025 through AB-027, CF-004, CF-005 |
| 15  | `withCorsHardening()` for browser-based GxP deployments                  | §112                | CORS misconfiguration permits unauthorized cross-origin access to GxP data; formal policy types ensure enforceable configuration                                           | High — browser-based GxP apps without typed CORS policy expose data to cross-origin attacks               | TS-069, TS-070 |
| 16  | `rateLimit()` with GxP audit recording                                   | §113                | Uncontrolled request volume can overwhelm GxP APIs during retry storms or batch migrations. **Note: Now REQUIRED per §113 for Category 1 GxP endpoints.**                  | High — no alternative client-side control for retry storm prevention                                       | LT-005 |

### Using This Appendix

Organizations MUST review this appendix during Validation Plan preparation (§83a) and document which items they have implemented and which they have omitted with justification. The Validation Plan MUST include a "GxP Configuration Profile" section (VP Section 12 in the template at §83a) mapping each item in this appendix to the organization's deployment configuration.

Items marked as "High" deviation risk MUST NOT be omitted without QA-approved risk acceptance documented in the FMEA (§98). Items marked as "Medium" deviation risk MAY be omitted with documented justification in the Validation Plan, provided the justification is reviewed during periodic review (§83b).

> **Note:** Items #1, #2, #3, and #6 in this appendix have been upgraded from RECOMMENDED to REQUIRED in the specification as of the GxP compliance review. They remain listed here for organizations consulting older versions of the specification and for completeness of the minimum configuration profile.

> **v5.0 Audit Additions:** Items #15 and #16 were added during the v5.0 GxP compliance audit (§108-118). Item #15 (`withCorsHardening`) is REQUIRED for browser-based GxP deployments per §112. Item #16 (`rateLimit` with GxP audit) is RECOMMENDED per §113.

---

## Appendix F: GxP Configuration Specification (CS)

This appendix consolidates all configurable GxP parameters into a standalone Configuration Specification per GAMP 5 §D.6 requirements. Each parameter is documented with its type, default, allowed values, validation rule, regulatory reference, and the spec section defining its behavior.

> **Relationship to Appendix E:** Appendix E lists RECOMMENDED items elevated to REQUIRED for GxP. This appendix (F) provides the complete parameter inventory including those items plus all other configurable parameters relevant to GxP deployments. Together they form the Configuration Specification for the Validation Plan (§83a, VP Section 12).

### CS-1: Transport Security Parameters

| # | Parameter | Type | Default | Allowed Values | Validation Rule | Regulatory Minimum | Spec Section | Regulatory Reference |
| - | --------- | ---- | ------- | -------------- | --------------- | ------------------ | ------------ | -------------------- |
| 1 | `minTlsVersion` | `TlsVersion` | `"1.2"` | `"1.2"`, `"1.3"` | MUST be `"1.2"` or higher; `"1.0"` and `"1.1"` MUST be rejected | `"1.2"` (NIST SP 800-52r2) | §85 | 21 CFR 11.30, RFC 8996 |
| 2 | `certificateValidation` | `CertificateValidationPolicy` | `"strict"` | `"strict"`, `"custom"` | MUST be `"strict"` in GxP mode; `"none"` rejected at construction | `"strict"` | §85 | 21 CFR 11.10(d), EU GMP Annex 11 §12 |
| 3 | `certificatePins` | `readonly CertificatePin[]` | `[]` | Array of `{ algorithm: "sha256", digest: string, label: string }` | REQUIRED for Category 1 endpoints; at least 2 pins (primary + backup) | ≥ 2 pins for Category 1 | §85 | RFC 7469, NIST SP 800-52r2 |
| 4 | `mTLS` | `MutualTlsConfig` | disabled | `{ clientCert, clientKey, ca? }` | REQUIRED for Category 1 endpoints | Enabled for Category 1 | §85 | 21 CFR 11.30 |
| 5 | `revocationPolicy` | `CertificateRevocationPolicy` | soft-fail | `{ failureMode, checkOrder, ocspTimeout, crlCacheTimeout }` | `failureMode` MUST be `"hard-fail"` in GxP mode | `"hard-fail"` | §106 | 21 CFR 11.30, NIST SP 800-52r2 |

### CS-2: Credential Protection Parameters

| # | Parameter | Type | Default | Allowed Values | Validation Rule | Regulatory Minimum | Spec Section | Regulatory Reference |
| - | --------- | ---- | ------- | -------------- | --------------- | ------------------ | ------------ | -------------------- |
| 6 | `redactedHeaders` | `readonly string[]` | `["authorization", "cookie", "set-cookie", "x-api-key"]` | Array of header names (case-insensitive) | MUST include at minimum `"authorization"`; additional headers per org policy | `["authorization"]` minimum | §87 | 21 CFR 11.300, OWASP |
| 7 | `sanitizeErrors` | `boolean` | `true` | `true`, `false` | MUST be `true` in GxP mode | `true` | §87 | 21 CFR 11.300 |
| 8 | `redactionMarker` | `string` | `"[REDACTED]"` | Non-empty string | MUST NOT resemble a credential pattern | Non-empty string | §87 | 21 CFR 11.300 |

### CS-3: Audit Trail Parameters

| # | Parameter | Type | Default | Allowed Values | Validation Rule | Regulatory Minimum | Spec Section | Regulatory Reference |
| - | --------- | ---- | ------- | -------------- | --------------- | ------------------ | ------------ | -------------------- |
| 9 | `gxp` | `boolean` | `false` | `true`, `false` | When `true`, enables all GxP enforcement rules | `true` (GxP environments) | §54, §79 | GAMP 5 Category 5 |
| 10 | `mode` | `RecordingMode` | `"full"` | `"full"`, `"lightweight"`, `"off"` | `"off"` MUST be rejected when `gxp: true` | `"full"` | §54 | 21 CFR 11.10(e), ALCOA+ Complete |
| 11 | `captureBodySnapshot` | `boolean` | `false` | `true`, `false` | SHOULD be `true` for POST/PUT/PATCH/DELETE on GxP data | `true` for write operations | §54 | ALCOA+ Complete |
| 12 | `maxHistoryEntries` | `number` | `1000` | Positive integer | Persistence-aware eviction enforced when `gxp: true` | ≥ 1000 | §55a | ALCOA+ Enduring |
| 13 | `failOnAuditError` | `boolean` | `false` | `true`, `false` | SHOULD be `true` in GxP mode to block operations when audit fails | `true` | §97 | 21 CFR 11.10(e) |
| 14 | `rejectOnMissingReason` | `boolean` | `false` | `true`, `false` | MUST be `true` in GxP mode for state-changing operations | `true` | §97 | 21 CFR 11.10(e), EU GMP Annex 11 §9 |

### CS-4: Retention and Archival Parameters

| # | Parameter | Type | Default | Allowed Values | Validation Rule | Regulatory Minimum | Spec Section | Regulatory Reference |
| - | --------- | ---- | ------- | -------------- | --------------- | ------------------ | ------------ | -------------------- |
| 15 | `retentionPeriodYears` | `number` | **REQUIRED — no default** | 5-30 | MUST be explicitly configured; FDA: ≥ 5; EU GMP: ≥ 10; org policy may require longer. Omission MUST produce ConfigurationError `"RETENTION_PERIOD_NOT_CONFIGURED"` with the error message specified below. | FDA: ≥ 5 years (21 CFR 211.180); EU: ≥ 10 years (EU GMP Annex 11 §17) | §104 | 21 CFR 211.180, EU GMP Annex 11 §7 |

#### RETENTION_PERIOD_NOT_CONFIGURED Error Specification

When `retentionPeriodYears` is omitted from the GxP configuration, the system MUST produce a `ConfigurationError` with the following properties:

```typescript
{
  readonly _tag: "ConfigurationError";
  readonly code: "RETENTION_PERIOD_NOT_CONFIGURED";
  readonly message: "GxP configuration error: 'retentionPeriodYears' is required but was not configured. "
    + "This parameter defines the minimum audit trail retention period required by applicable regulations. "
    + "Set retentionPeriodYears >= 5 for FDA 21 CFR 211.180 environments, "
    + ">= 10 for EU GMP Annex 11 §17 environments, "
    + "or the longest applicable period when multiple jurisdictions apply. "
    + "See SPEC-HTTP-001 §104 (Audit Trail Retention and Archival Strategy) for configuration guidance.";
  readonly regulatoryReferences: readonly ["21 CFR 211.180", "EU GMP Annex 11 §17"];
  readonly suggestedValues: {
    readonly fda: 5;
    readonly euGmp: 10;
    readonly recommendation: "Use the longest applicable period for your regulatory jurisdictions";
  };
}
```

```
REQUIREMENT: When retentionPeriodYears is not provided in the GxP configuration, the
             ConfigurationError MUST include: (1) error code "RETENTION_PERIOD_NOT_CONFIGURED",
             (2) a human-readable message explaining the regulatory requirement,
             (3) suggested minimum values for FDA (≥ 5) and EU GMP (≥ 10) environments,
             and (4) a reference to §104 for full configuration guidance. The error MUST
             be raised at construction time (in createGxPHttpClient §103 or equivalent
             factory) — not deferred to first use — to fail fast and prevent the system
             from operating without a configured retention period.
             Reference: 21 CFR 211.180, EU GMP Annex 11 §17, 21 CFR 11.10(c).
```
| 16 | `archivalEncryption` | `ArchivalEncryptionConfig` | N/A | `{ algorithm: "AES-256-GCM", keyManagement: "envelope" }` | Algorithm MUST be AES-256-GCM; key rotation period ≤ 365 days | AES-256-GCM with key rotation ≤ 365 days | §104c | 21 CFR 11.10(c) |
| 17 | `backupGenerations` | `number` | `3` | 1-10 | SHOULD be ≥ 3 (grandfather-father-son) | ≥ 3 (grandfather-father-son) | §104a | EU GMP Annex 11 §7 |
| 18 | `backupVerificationSchedule` | `string` | `"monthly"` | `"weekly"`, `"monthly"`, `"quarterly"` | SHOULD be automated; manual verification acceptable with justification | ≤ monthly | §104a | EU GMP Annex 11 §7 |

### CS-5: Authentication and Authorization Parameters

| # | Parameter | Type | Default | Allowed Values | Validation Rule | Regulatory Minimum | Spec Section | Regulatory Reference |
| - | --------- | ---- | ------- | -------------- | --------------- | ------------------ | ------------ | -------------------- |
| 19 | `minimumStrength` | `AuthenticationStrength` | `"single-factor"` | `"single-factor"`, `"multi-factor"`, `"biometric"` | MUST be `"multi-factor"` for e-signature operations per 21 CFR 11.200 | `"multi-factor"` for e-sig | §90 | 21 CFR 11.200, 11.300 |
| 20 | `sessionTimeout` | `number` (ms) | N/A (org-specific) | Positive integer | MUST be set; RECOMMENDED ≤ 30 minutes for GxP | ≤ 1,800,000ms (30 min, NIST SP 800-63B) | §90 | 21 CFR 11.300, EU GMP Annex 11 §12 |
| 21 | `defaultDeny` | `boolean` | `true` | `true`, `false` | MUST be `true` in GxP mode; `false` rejected at construction | `true` | §94 | 21 CFR 11.10(d), 11.10(g) |
| 22 | `conflictingRoles` | `readonly [string, string][]` | `[]` | Array of role-pair tuples | SHOULD define separation of duties per org policy | ≥ 1 pair per org SoD policy | §94 | 21 CFR 11.10(g), EU GMP Annex 11 §12 |

### CS-6: Electronic Signature Parameters

| # | Parameter | Type | Default | Allowed Values | Validation Rule | Regulatory Minimum | Spec Section | Regulatory Reference |
| - | --------- | ---- | ------- | -------------- | --------------- | ------------------ | ------------ | -------------------- |
| 23 | `signatureCaptureTimeout` | `number` (ms) | `300_000` (5 min) | Positive integer | MUST NOT exceed 600_000 (10 min); RECOMMENDED ≤ 300_000 | ≤ 600,000ms (10 min) | §93a | 21 CFR 11.100(a) |
| 24 | `signatureBindingAlgorithm` | `string` | `"SHA-256"` | `"SHA-256"` | MUST be `"SHA-256"`; no other algorithms permitted | `"SHA-256"` | §93a | 21 CFR 11.70 |
| 25 | `requireReAuthentication` | `boolean` | `true` | `true`, `false` | MUST be `true` for electronic signatures | `true` | §93a | 21 CFR 11.200 |

### CS-7: Payload Validation Parameters

| # | Parameter | Type | Default | Allowed Values | Validation Rule | Regulatory Minimum | Spec Section | Regulatory Reference |
| - | --------- | ---- | ------- | -------------- | --------------- | ------------------ | ------------ | -------------------- |
| 26 | `requestValidationMode` | `ValidationMode` | `"warn"` | `"reject"`, `"warn"`, `"off"` | MUST be `"reject"` in GxP mode | `"reject"` | §89 | 21 CFR 11.10(h) |
| 27 | `payloadIntegrityAlgorithm` | `string` | `"SHA-256"` | `"SHA-256"` | MUST be `"SHA-256"` | `"SHA-256"` | §86 | 21 CFR 11.10(c), ALCOA+ Accurate |

### CS-8: Clock and Timing Parameters

| # | Parameter | Type | Default | Allowed Values | Validation Rule | Regulatory Minimum | Spec Section | Regulatory Reference |
| - | --------- | ---- | ------- | -------------- | --------------- | ------------------ | ------------ | -------------------- |
| 28 | `maxClockDrift` | `number` (ms) | `1000` | Positive integer | MUST be ≤ 1000ms in GxP mode | ≤ 1,000ms | §96 | ALCOA+ Contemporaneous |
| 29 | `maxDecisionAge` | `number` (ms) | `5000` | Positive integer | MUST be set; stale authorization decisions MUST be rejected | ≤ 5,000ms | §97 | 21 CFR 11.10(d) |

### CS-9: Incident and Monitoring Parameters

| # | Parameter | Type | Default | Allowed Values | Validation Rule | Regulatory Minimum | Spec Section | Regulatory Reference |
| - | --------- | ---- | ------- | -------------- | --------------- | ------------------ | ------------ | -------------------- |
| 30 | `crossChainVerificationInterval` | `number` (ms) | `3_600_000` (1 hr) | Positive integer | RECOMMENDED hourly; MUST be ≤ 86_400_000 (24 hrs) | ≤ 86,400,000ms (24 hrs) | §82 | EU GMP Annex 11 §7, ALCOA+ Consistent |
| 31 | `unconfirmedEntryWarningThreshold` | `number` (ms) | `30_000` | Positive integer | WARNING at this threshold; CRITICAL at 5x this value | ≤ 30,000ms | §91 | ALCOA+ Enduring |
| 32 | `auditSinkRetryAttempts` | `number` | `3` | Non-negative integer | SHOULD be ≥ 3 for transient failure recovery | ≥ 3 | §55a | ALCOA+ Complete |
| 33 | `hashChainVerificationInterval` | `number` (ms) | `86_400_000` (24 hrs) | Positive integer | MUST be ≤ 604_800_000 (7 days); RECOMMENDED ≤ 86_400_000 (24 hrs) | ≤ 604,800,000ms (7 days) | §91 (verifyAuditChain) | 21 CFR 11.10(e), ALCOA+ Original, EU GMP Annex 11 §9 |
| 34 | `keyRotationMaxInterval` | `number` (days) | `365` | 1-365 | Key rotation interval MUST be ≤ 365 days per NIST SP 800-57 | ≤ 365 days | §104c | NIST SP 800-57, 21 CFR 11.10(d) |

### CS-10: Degraded Mode Parameters

| # | Parameter | Type | Default | Allowed Values | Validation Rule | Regulatory Minimum | Spec Section | Regulatory Reference |
| - | --------- | ---- | ------- | -------------- | --------------- | ------------------ | ------------ | -------------------- |
| 35 | `degradedModeMaxDuration.auditBackend` | `number` (ms) | `1_800_000` (30 min) | Positive integer | Maximum time in degraded mode before escalation to S1 incident | ≤ 1,800,000ms (30 min) | §115.6 | EU GMP Annex 11 §13, §16 |
| 36 | `degradedModeMaxDuration.revocationSoftFail` | `number` (ms) | `3_600_000` (60 min) | Positive integer | Maximum time in soft-fail mode before escalation | ≤ 3,600,000ms (60 min) | §115.6 | 21 CFR 11.30 |
| 37 | `degradedModeMaxDuration.clockDrift` | `number` (ms) | `900_000` (15 min) | Positive integer | Maximum time with detected clock drift before escalation | ≤ 900,000ms (15 min) | §115.6 | ALCOA+ Contemporaneous |
| 38 | `degradedModeMaxDuration.subjectProvider` | `number` (ms) | `600_000` (10 min) | Positive integer | Maximum time with intermittent subject provider before escalation | ≤ 600,000ms (10 min) | §115.6 | ALCOA+ Attributable |
| 39 | `maxRollbackDepth` | `number` | `3` | 1-10 | Maximum configuration rollback depth; attempts beyond this depth rejected | ≥ 3 | §88 | EU GMP Annex 11 §10 |

### Using This Configuration Specification

1. **During Validation Plan preparation** (§83a, VP Section 12): Map each parameter in this appendix to the organization's deployment configuration value.
2. **During IQ**: Verify all parameters are set to values within their allowed ranges.
3. **During OQ**: Verify enforcement behavior (e.g., `gxp: true` rejects `mode: "off"`, `defaultDeny: true` blocks unauthorized requests).
4. **During periodic review** (§83b): Compare current parameter values against the validated baseline to detect configuration drift.

```
REQUIREMENT: Organizations deploying @hex-di/http-client in GxP environments MUST
             document their configuration values for all 39 parameters listed in this
             appendix as part of the Validation Plan (§83a, VP Section 12). Parameters
             where the organization's value deviates from the GxP recommendation MUST
             have a documented justification reviewed by QA.
             Reference: GAMP 5 §D.6, EU GMP Annex 11 §4.
```

---

## Appendix G: Training Requirements Matrix

This appendix consolidates all training requirements referenced throughout the specification into a single matrix. It maps organizational roles to required training modules, assessment criteria, and regulatory references. This satisfies EU GMP Annex 11 §2 ("Personnel involved with computerised systems should have appropriate qualifications, level of access and defined responsibilities") and GAMP 5 training documentation requirements.

### Training Roles

| Role ID | Role | Description | Typical Personnel |
|---------|------|-------------|-------------------|
| TR-01 | **Developer** | Engineers who implement, modify, or extend `@hex-di/http-client` or its transport adapters | Software engineers, library maintainers |
| TR-02 | **QA Validator** | Personnel who execute IQ/OQ/PQ protocols and review validation evidence | Quality assurance engineers, validation specialists |
| TR-03 | **System Administrator** | Personnel who deploy, configure, and maintain HTTP client instances in GxP environments | DevOps engineers, platform engineers, infrastructure operators |
| TR-04 | **GxP Auditor** | Personnel who review audit trails, perform periodic reviews, and support regulatory inspections | Quality managers, compliance officers, regulatory inspectors |
| TR-05 | **Application Developer** | Engineers who consume `@hex-di/http-client` as a dependency in GxP application code | Application engineers integrating the HTTP client into domain services |
| TR-06 | **Incident Responder** | Personnel who respond to HTTP transport security incidents per §83c classification framework | On-call engineers, security operations personnel |

### Training Modules

| Module ID | Module Name | Description | Regulatory Driver |
|-----------|-------------|-------------|-------------------|
| TM-01 | **Library Architecture** | Hexagonal architecture, port/adapter model, combinator pipeline, DI integration, transport adapter contract (§01, §06, §07, §08) | GAMP 5 (design understanding) |
| TM-02 | **GxP Combinator Pipeline** | Required GxP combinators (§85-§90, §93, §97), composition order, `createGxPHttpClient` factory (§103), GxP configuration parameters (Appendix F) | 21 CFR 11.10(a), EU GMP Annex 11 §4 |
| TM-03 | **Audit Trail Operation** | HttpAuditTrailPort contract (§91), record/confirm lifecycle, WAL crash recovery, hash chain integrity, unconfirmed entry monitoring, HttpAuditSink integration (§55a) | 21 CFR 11.10(e), EU GMP Annex 11 §9 |
| TM-04 | **Transport Security** | HTTPS enforcement (§85), TLS requirements, certificate pinning, mTLS, credential protection (§87), SSRF mitigation (§90a), HSTS (§90c), CT verification (§90b), CSRF (§90d) | 21 CFR 11.30, EU GMP Annex 11 §12 |
| TM-05 | **Electronic Signatures** | HttpSignatureServicePort (§93a), signature capture workflow, signature binding (SHA-256), signature manifestation (§93b), signature verification (§107) | 21 CFR 11.50, 11.70, 11.100, 11.200 |
| TM-06 | **IQ/OQ/PQ Execution** | Qualification protocols (§99), test case execution, evidence collection, deviation handling, deferred field inventory completion | GAMP 5 Appendix D, EU GMP Annex 11 §4 |
| TM-07 | **Configuration Management** | GxP configuration parameters (Appendix F, 39 parameters), configuration change control (§88), rollback procedures, configuration audit entries | EU GMP Annex 11 §10, 21 CFR 11.10(e) |
| TM-08 | **Incident Response** | Incident classification framework (§83c), severity levels, response SLAs, diagnostic procedures using MCP resources (§57), catastrophic failure recovery (§115), escalation paths | EU GMP Annex 11 §13 |
| TM-09 | **Audit Trail Review** | QueryableHttpAuditTrailPort (§105), query filters, cross-correlation via evaluationId (§97), export procedures, meta-audit logging, retention/archival (§104) | 21 CFR 11.10(e), EU GMP Annex 11 §9 |
| TM-10 | **Periodic Review** | Review cycle execution (§83b), configuration drift detection, FMEA re-assessment (§98), compliance verification checklist, archive integrity verification | EU GMP Annex 11 §11 |
| TM-11 | **Retention & Archival** | Retention policies (§104), archival lifecycle (HttpAuditArchivalPort), backup/restore procedures (§104a), migration procedures (§104b), data-at-rest encryption (§104c) | 21 CFR 211.180, EU GMP Annex 11 §17 |
| TM-12 | **FMEA & Risk Assessment** | FMEA methodology (§98), 43 failure modes, RPN scoring, mitigation verification, risk-based testing, ICH Q9 risk management principles | ICH Q9, GAMP 5 |

### Role-to-Module Matrix

| Module | TR-01 Developer | TR-02 QA Validator | TR-03 Sys Admin | TR-04 GxP Auditor | TR-05 App Developer | TR-06 Incident Responder |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|
| TM-01 Architecture | **R** | A | A | A | **R** | A |
| TM-02 GxP Pipeline | **R** | **R** | **R** | A | **R** | A |
| TM-03 Audit Trail | **R** | **R** | **R** | **R** | A | **R** |
| TM-04 Transport Security | **R** | **R** | **R** | A | A | **R** |
| TM-05 E-Signatures | **R** | **R** | A | **R** | A | — |
| TM-06 IQ/OQ/PQ | A | **R** | A | **R** | — | — |
| TM-07 Configuration | A | A | **R** | A | A | **R** |
| TM-08 Incident Response | A | — | **R** | A | — | **R** |
| TM-09 Audit Trail Review | — | **R** | A | **R** | — | A |
| TM-10 Periodic Review | A | **R** | A | **R** | — | — |
| TM-11 Retention & Archival | A | **R** | **R** | **R** | — | A |
| TM-12 FMEA & Risk | A | **R** | A | **R** | — | A |

**Legend:** **R** = Required (MUST complete before performing role duties), A = Awareness (SHOULD complete within 90 days of role assignment), — = Not applicable.

### Assessment Criteria

| Assessment Type | Passing Threshold | Applies To | Frequency |
|-----------------|-------------------|------------|-----------|
| Written examination (multiple choice + short answer) | ≥ 80% correct | All **R** modules | Initial qualification + annually |
| Practical demonstration (supervised task execution) | Pass/Fail per checklist | TM-06, TM-07, TM-08, TM-11 | Initial qualification |
| Awareness confirmation (read and acknowledge) | Signed attestation | All **A** modules | Initial + upon major specification revision |

### Training Documentation Requirements

```
REQUIREMENT: Organizations deploying @hex-di/http-client in GxP environments MUST
             maintain training records documenting: (1) the trainee's name and role,
             (2) the training module(s) completed, (3) the date of completion,
             (4) the assessment type and result, (5) the trainer's identity, and
             (6) the specification version the training was based on. Training records
             MUST be retained for the duration of the individual's role assignment
             plus 2 years. Training records MUST be available for regulatory inspection.
             Reference: EU GMP Annex 11 §2, 21 CFR 11.10(i).
```

```
REQUIREMENT: When a major specification revision occurs (new GxP sections, new
             REQUIRED combinators, new port interfaces, or FMEA updates affecting
             mitigations), affected personnel MUST complete retraining on the
             changed modules within 60 days of the revision's effective date.
             Retraining completion MUST be verified before the individual performs
             GxP-critical tasks under the new specification revision.
             Reference: EU GMP Annex 11 §2, 21 CFR 11.10(i).
```

```
RECOMMENDED: Organizations SHOULD integrate training module assessments into the
             IQ/OQ/PQ workflow. IQ-HT-05 (deferred field inventory) SHOULD include
             verification that all personnel assigned to OQ execution have completed
             the required training modules (TM-02, TM-03, TM-04, TM-06 at minimum).
```

---

## Appendix H: Incident Response Runbook

This appendix consolidates incident classification, diagnostic procedures, escalation paths, and recovery actions for HTTP transport security incidents. It draws from the Incident Classification Framework (§83c), the FMEA (§98), the WAL crash recovery procedures (§91), configuration rollback (§88), and the catastrophic failure recovery procedures (§115).

### Incident Severity Classification

| Severity | Response SLA | Escalation Path | Criteria |
|----------|-------------|-----------------|----------|
| **SEV-1 Critical** | 1 hour | Incident Responder → System Admin → QA Manager → Site Quality Head | Patient safety data at risk, audit trail integrity compromised, cryptographic controls breached, catastrophic multi-subsystem failure |
| **SEV-2 High** | 4 hours | Incident Responder → System Admin → QA Manager | GxP data integrity at risk, single subsystem failure with no compensating control, electronic signature system unavailable |
| **SEV-3 Medium** | 24 hours | Incident Responder → System Admin | Degraded GxP functionality with compensating controls active, performance SLA breaches, configuration drift detected |
| **SEV-4 Low** | 72 hours | Incident Responder | Non-critical warnings, informational alerts, minor configuration deviations |

### Incident Type Catalog

| Incident ID | Type | FMEA Ref | Severity | Description |
|-------------|------|----------|----------|-------------|
| INC-01 | **Audit Trail Write Failure** | FM-HT-10, FM-HT-19 | SEV-1 | HttpAuditTrailPort.record() returns Err; entries not persisted |
| INC-02 | **Hash Chain Break** | FM-HT-25, FM-HT-34 | SEV-1 | Cross-chain verification (FNV-1a vs. SHA-256) detects divergence |
| INC-03 | **Certificate Compromise** | FM-HT-03, FM-HT-18, FM-HT-28 | SEV-1 | Certificate pinning failure, revoked certificate detected, CA compromise suspected |
| INC-04 | **Credential Exposure** | FM-HT-06 | SEV-1 | Credentials detected in logs, error messages, or audit entries despite redaction |
| INC-05 | **Clock Drift Exceeded** | FM-HT-13 | SEV-2 | HttpClockSourcePort reports clock drift > maxClockDrift threshold |
| INC-06 | **Token Lifecycle Circuit Open** | FM-HT-09 | SEV-2 | Token refresh circuit-breaker opens; all GxP requests blocked |
| INC-07 | **Electronic Signature Failure** | FM-HT-14, FM-HT-30 | SEV-2 | Signature capture fails, signature verification fails, signer revoked |
| INC-08 | **Privilege Escalation Detected** | FM-HT-36 | SEV-2 | Mid-session role change detected by PrivilegeEscalationPolicy |
| INC-09 | **Configuration Change Failure** | FM-HT-07, FM-HT-38 | SEV-3 | Configuration change produces errors; rollback required |
| INC-10 | **Payload Integrity Mismatch** | FM-HT-04, FM-HT-05 | SEV-2 | Request or response body digest does not match declared hash |
| INC-11 | **Authentication Strength Violation** | FM-HT-16 | SEV-3 | Single-factor auth attempted for multi-factor-required operation |
| INC-12 | **Separation of Duties Violation** | FM-HT-17 | SEV-2 | Subject holds conflicting roles for same GxP operation |
| INC-13 | **Audit Capacity Warning** | FM-HT-24 | SEV-3 | Storage capacity at 85% (WARNING) or 95% (CRITICAL → SEV-2) |
| INC-14 | **Archive Integrity Failure** | FM-HT-25 | SEV-2 | HttpAuditArchivalPort.verify() fails checksum, hash chain, or entry count |
| INC-15 | **SSRF Attempt Blocked** | — | SEV-3 | withSsrfProtection() blocks request to private IP or metadata endpoint |
| INC-16 | **Catastrophic Multi-Subsystem Failure** | FM-HT-40 | SEV-1 | Audit backend + WAL + crypto + clock fail simultaneously |

### Diagnostic Procedures

For each incident type, use the following diagnostic sequence. MCP resources (§57, Appendix D) provide programmatic access to diagnostic data.

#### Step 1: Gather Context

```
1. Identify the affected scope(s) using MCP resource: hexdi://http/snapshot
2. Check active requests: hexdi://http/active
3. Review recent history: hexdi://http/history (filter by timeframe)
4. Check health status: hexdi://http/health
5. Verify audit chain integrity: hexdi://http/audit/verify
6. Review circuit breaker states: hexdi://http/circuit-breakers
7. Check combinator chain: hexdi://http/combinators
```

#### Step 2: Incident-Specific Diagnostics

| Incident | Diagnostic Action |
|----------|-------------------|
| INC-01 Audit Write Failure | Check HttpAuditTrailPort.unconfirmedEntries() count; inspect WAL state via HttpWalStorePort; verify backing store connectivity; check audit sink health |
| INC-02 Hash Chain Break | Run verifyAuditChain() on both FNV-1a and SHA-256 chains; identify divergence point by sequenceNumber; compare entry-by-entry from divergence; check for out-of-order writes |
| INC-03 Certificate Compromise | Inspect CertificateRevocationResult in recent audit entries; check CERTIFICATE_PIN_FAILED or CERTIFICATE_REVOKED error codes; verify certificate serial and issuer CN against known-good values |
| INC-04 Credential Exposure | Search audit entries, log files, and error outputs for unredacted credential patterns; verify withCredentialProtection() is in combinator chain; check bodyCredentialPatterns configuration |
| INC-05 Clock Drift | Query HttpClockSourcePort for current drift value; compare wall clock vs. monotonic clock; check NTP synchronization status at infrastructure level |
| INC-06 Token Circuit Open | Check TokenRefreshError.consecutiveFailures count; verify token provider endpoint availability; check circuit-breaker cooldown timer remaining |
| INC-07 E-Signature Failure | Run HttpSignatureVerificationPort.verify() on failed signature; check signer status via checkSignerStatus(); verify signature binding recomputation |
| INC-08 Privilege Escalation | Query SubjectProviderPort for subject's current vs. cached role set; identify changed roles; check checkInterval timing |
| INC-09 Configuration Failure | Review HttpClientConfigurationAuditEntry for the failed change; identify configurationKey and previousValue/newValue; check ConfigurationError code |
| INC-10 Payload Integrity | Compare Content-Digest header value against recomputed body hash; check algorithm match; verify body was not modified by intermediate proxy |
| INC-16 Catastrophic Failure | Execute §115 catastrophic failure recovery runbook; verify each subsystem independently before restoring GxP operations |

#### Step 3: Containment

| Severity | Containment Action |
|----------|-------------------|
| SEV-1 | **Immediately block all GxP HTTP operations** by replacing the active HttpClient with a deny-all client. Record containment action as HttpClientConfigurationAuditEntry with configurationKey "INCIDENT_CONTAINMENT". Do NOT destroy or modify any audit data. |
| SEV-2 | **Block affected operations only** (e.g., specific endpoint, specific subject). Continue unaffected GxP operations. Record containment scope in audit trail. |
| SEV-3 | **Log and monitor**. No immediate operational impact. Increase monitoring frequency for the affected subsystem. |
| SEV-4 | **Acknowledge and schedule**. Create change request for remediation in next maintenance window. |

#### Step 4: Recovery

| Incident | Recovery Procedure |
|----------|-------------------|
| INC-01 | Restore audit sink connectivity. Replay unconfirmed entries from WAL (§91). Verify confirm() succeeds for all replayed entries. Run verifyAuditChain() post-recovery. |
| INC-02 | Identify root cause of chain divergence. If data corruption: restore from last known-good backup (§104a). If software bug: fix and re-verify. Record recovery in ConfigurationAuditEntry. |
| INC-03 | Revoke compromised certificate. Update certificatePins with new certificate SPKI digest. Deploy new client via createGxPHttpClient(). Record pin change as ConfigurationAuditEntry. |
| INC-04 | Identify all locations where credentials appeared. Rotate exposed credentials immediately. Patch redaction configuration. Re-deploy withCredentialProtection() with updated patterns. |
| INC-05 | Synchronize NTP. Verify drift returns below threshold. Document timestamp uncertainty window in incident report. Review audit entries in drift window for temporal consistency. |
| INC-06 | Verify token provider availability. Reset circuit-breaker by deploying new client instance with fresh token. Verify token refresh succeeds before routing GxP traffic. |
| INC-09 | Execute configuration rollback (§88): create new client from previous config, record ROLLBACK audit entry, verify health check, drain in-flight requests on failed client. |
| INC-16 | Follow §115 catastrophic failure recovery: (1) restore audit backend, (2) replay WAL, (3) verify hash chains, (4) restore clock sync, (5) verify crypto key access, (6) run full health check before resuming GxP operations. |

#### Step 5: Post-Incident

1. Record incident resolution as HttpClientConfigurationAuditEntry with configurationKey "INCIDENT_RESOLVED" and reason documenting the root cause and corrective action.
2. Update FMEA (§98) if the incident reveals a new failure mode or if an existing mitigation was insufficient.
3. Create CAPA (Corrective and Preventive Action) if the incident is SEV-1 or SEV-2.
4. Schedule retraining (Appendix G, TM-08) for incident responders if the incident revealed a gap in response procedures.
5. Include incident in next periodic review (§83b) evidence package.

```
REQUIREMENT: Every SEV-1 and SEV-2 incident MUST produce a written incident report
             within 5 business days of resolution. The report MUST include: (1) incident
             timeline (detection, containment, diagnosis, recovery, resolution),
             (2) root cause analysis, (3) affected GxP data scope, (4) FMEA impact
             assessment (new failure mode or existing mitigation update), (5) corrective
             actions taken, (6) preventive actions planned, and (7) references to all
             audit trail entries produced during the incident. The incident report MUST
             be reviewed by QA and retained for the audit trail retention period (§104).
             Reference: EU GMP Annex 11 §13, 21 CFR 11.10(e).
```

```
REQUIREMENT: All containment and recovery actions MUST be recorded in the audit trail
             via HttpClientConfigurationAuditEntry (§88). When the primary audit trail
             is unavailable (INC-01, INC-16), containment actions MUST be recorded in
             the WAL (§91) or, if the WAL is also unavailable, in an out-of-band
             incident log that is reconciled with the primary audit trail during
             recovery. The out-of-band log MUST include: timestamp (from an
             independent clock source if HttpClockSourcePort is unavailable), actor
             identity, action taken, and justification.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

```
RECOMMENDED: Organizations SHOULD conduct annual incident response rehearsals
             covering at least one SEV-1 scenario (INC-01, INC-02, INC-03, or INC-16)
             and one SEV-2 scenario. Rehearsal results SHOULD be documented and
             included in the periodic review (§83b) evidence package. Rehearsals
             SHOULD use the staging environment with production-representative
             configuration.
```

---

## Appendix I: Operational Migration Runbook

This appendix provides step-by-step procedures for common audit trail migration scenarios. It consolidates requirements from §104b (cross-system migration), §104 (retention/archival), §104a (backup/restore), §105 (query/retrieval), and §88 (configuration change control) into executable runbooks.

### Migration Scenarios

| Scenario ID | Scenario | Risk Level | Typical Trigger |
|-------------|----------|------------|-----------------|
| MIG-01 | **Audit Sink Backend Migration** | High | Database engine change (e.g., PostgreSQL → Oracle), managed service migration |
| MIG-02 | **On-Premise to Cloud Migration** | High | Infrastructure modernization, cloud-first strategy |
| MIG-03 | **Schema Version Migration** | Medium | Specification revision adding new audit entry fields (§83 VersionedAuditEntry) |
| MIG-04 | **Transport Adapter Switchover** | Medium | Replacing one transport adapter with another (e.g., fetch → undici) within the same audit trail |
| MIG-05 | **Archive Storage Migration** | Medium | Moving cold-storage archives to a new storage provider |

### Pre-Migration Checklist (All Scenarios)

This checklist MUST be completed before any migration begins. Each item MUST be signed off by the responsible role.

| # | Check | Responsible | Sign-off |
|---|-------|-------------|----------|
| PM-01 | Change Request approved per §88 change control process | QA Manager | _____ |
| PM-02 | Current audit trail integrity verified: `verifyAuditChain()` returns `true` for both FNV-1a and SHA-256 chains | System Admin | _____ |
| PM-03 | Full backup created and verified per §104a (checksum, hash chain, entry count all pass) | System Admin | _____ |
| PM-04 | Backup stored in geographically separate location from source and target | System Admin | _____ |
| PM-05 | Trial migration completed successfully in staging environment (§104b REQUIREMENT) | QA Validator | _____ |
| PM-06 | Trial migration evidence documented: entry count, hash chain verification, cross-correlation query test results | QA Validator | _____ |
| PM-07 | Data sovereignty compliance verified for target system location (§104, data sovereignty requirement) | Compliance Officer | _____ |
| PM-08 | Encryption key access verified in target system via `HttpAuditEncryptionPort.verifyKeyAccess()` (§104c) | System Admin | _____ |
| PM-09 | Affected personnel completed TM-11 (Retention & Archival) training per Appendix G | QA Manager | _____ |
| PM-10 | Rollback plan documented and reviewed (see Post-Migration Rollback below) | System Admin + QA | _____ |
| PM-11 | Maintenance window scheduled; stakeholders notified | System Admin | _____ |
| PM-12 | GxP HTTP operations paused (no in-flight requests) during migration window | System Admin | _____ |

### MIG-01: Audit Sink Backend Migration

**Scope:** Moving all active audit entries from one database/storage system to another while preserving hash chain integrity, cross-correlation capability, and regulatory compliance.

#### Execution Steps

| Step | Action | Verification | Rollback Point |
|------|--------|-------------|----------------|
| 1 | Record migration start as HttpClientConfigurationAuditEntry (§88) with configurationKey `"MIGRATION_STARTED"` in the **source** system | Audit entry recorded and confirmed | N/A |
| 2 | Export full audit trail from source using `QueryableHttpAuditTrailPort.export()` (§105) with no filter (all entries) in JSON format | Export produces HttpAuditExportResult with valid HttpAuditArchiveManifest | Abort; source unchanged |
| 3 | Verify export manifest: `archiveChecksum` matches file content, `entryCount` matches actual count, `firstEntryHash` and `lastEntryHash` match chain endpoints | All 3 verifications pass | Abort; source unchanged |
| 4 | Import entries into target system preserving ALL fields: `integrityHash`, `previousHash`, `hashAlgorithm`, `sequenceNumber`, `requestId`, `evaluationId`, all timestamps | Import completes without error | Delete target entries; source unchanged |
| 5 | Verify hash chain in target: run `verifyAuditChain()` against imported data | Chain verification passes for both FNV-1a and SHA-256 | Delete target entries; source unchanged |
| 6 | Verify manifest match: target system's computed manifest matches source manifest (`entryCount`, `firstEntryHash`, `lastEntryHash`) | All 3 fields match | Delete target entries; source unchanged |
| 7 | Run cross-correlation query test: select 10 random `evaluationId` values and verify `getByEvaluationId()` returns the same entries in source and target | All 10 queries return identical results | Delete target entries; source unchanged |
| 8 | Run performance benchmark: execute the 5 QueryableHttpAuditTrailPort SLA queries (§105) against target and verify they meet performance thresholds | All 5 queries within SLA | Delete target entries; source unchanged |
| 9 | Record migration completion as HttpClientConfigurationAuditEntry in **both** source and target with configurationKey `"MIGRATION_COMPLETED"` | Audit entries recorded in both systems | — |
| 10 | Reconfigure HttpAuditTrailPort to point to target system | New audit entries written to target | Reconfigure back to source |
| 11 | Verify new entries: execute a test HTTP operation and confirm audit entry appears in target with correct hash chain continuation | Entry recorded with previousHash linking to last migrated entry | Reconfigure back to source |
| 12 | Place source system in read-only mode for 90-day observation period (§104b RECOMMENDED) | Source accessible for read-only queries | — |
| 13 | After 90-day observation: verify target system passed periodic review (§83b), then decommission source | Periodic review evidence documented | — |

### MIG-02: On-Premise to Cloud Migration

**Scope:** Same as MIG-01, plus additional checks for data sovereignty, encryption, and network security.

#### Additional Pre-Migration Checks

| # | Check | Responsible |
|---|-------|-------------|
| PM-C01 | Cloud provider's data processing agreement (DPA) covers GxP data requirements | Legal / Compliance |
| PM-C02 | Cloud region complies with data sovereignty requirements (§104, EU GMP Annex 11 §7) | Compliance Officer |
| PM-C03 | Encryption at rest verified: cloud storage uses AES-256-GCM or equivalent (§104c) | System Admin |
| PM-C04 | Encryption in transit verified: TLS 1.2+ for all data transfer between on-premise and cloud | System Admin |
| PM-C05 | Cloud KMS integration tested: `HttpAuditEncryptionPort.verifyKeyAccess()` succeeds from cloud environment | System Admin |
| PM-C06 | Network path between application and cloud audit store satisfies QueryableHttpAuditTrailPort SLAs (§105) | System Admin |
| PM-C07 | Cloud provider supplier assessment completed per §108a (GAMP 5 third-party supplier checklist) | QA Manager |

#### Execution

Follow MIG-01 steps 1-13 with these modifications:

- **Step 2:** Transfer export file to cloud over encrypted channel (TLS 1.2+). Verify file checksum after transfer.
- **Step 4:** Before import, verify cloud storage encryption is active (`HttpAuditEncryptionPort.encrypt()` round-trip test).
- **Step 8:** Run performance benchmarks from the application's production network location (not from within the cloud environment) to measure realistic latency.

### MIG-03: Schema Version Migration

**Scope:** Updating audit entry schema when the specification adds new fields to `HttpOperationAuditEntry` or related types per §83 VersionedAuditEntry rules.

#### Execution Steps

| Step | Action | Verification |
|------|--------|-------------|
| 1 | Identify new fields and their default values per §83 migration rules (new fields are optional with defaults; existing fields never removed) | Field mapping document reviewed by QA |
| 2 | Record schema migration start as HttpClientConfigurationAuditEntry with configurationKey `"SCHEMA_MIGRATION_STARTED"`, `previousValue` = old schemaVersion, `newValue` = new schemaVersion | Audit entry recorded |
| 3 | In staging: apply schema migration to a copy of production data | Migration completes without error |
| 4 | Verify hash chain integrity post-migration: entries MUST NOT be modified beyond adding new optional fields with default values (§104b) | `verifyAuditChain()` passes |
| 5 | Verify that `integrityHash` values are unchanged (new optional fields with defaults do NOT alter the hash of existing entries) | All existing entry hashes match pre-migration values |
| 6 | Apply schema migration to production | Migration completes without error |
| 7 | Verify production hash chain integrity | `verifyAuditChain()` passes |
| 8 | Record schema migration completion as HttpClientConfigurationAuditEntry with configurationKey `"SCHEMA_MIGRATION_COMPLETED"` | Audit entry recorded |

### MIG-04: Transport Adapter Switchover

**Scope:** Replacing one transport adapter (e.g., `@hex-di/http-client-fetch`) with another (e.g., `@hex-di/http-client-undici`) while maintaining audit trail continuity per §80a.

#### Execution Steps

| Step | Action | Verification |
|------|--------|-------------|
| 1 | Verify both adapters share the same `HttpAuditTrailPort` instance (§80a requirement) | DI container configuration inspection |
| 2 | Record adapter switchover as HttpClientConfigurationAuditEntry with configurationKey `"ADAPTER_SWITCHOVER"` | Audit entry recorded |
| 3 | Drain in-flight requests on the outgoing adapter (§88 rollback requirement: in-flight requests MUST NOT be aborted) | Active request count reaches 0 |
| 4 | Create new HttpClient instance with new adapter via `createGxPHttpClient()` | Factory validates all required GxP combinators present |
| 5 | Verify first request with new adapter produces audit entry with correct `previousHash` linking to last entry from old adapter | Hash chain continuity preserved across adapter boundary |
| 6 | Run OQ test subset: TLS verification, payload integrity, credential protection, audit recording | All tests pass with new adapter |

### MIG-05: Archive Storage Migration

**Scope:** Moving cold-storage archives (HttpAuditArchiveManifest bundles) to a new storage provider.

#### Execution Steps

| Step | Action | Verification |
|------|--------|-------------|
| 1 | List all archives via `HttpAuditArchivalPort.listArchives()` | Complete inventory with archive IDs and manifests |
| 2 | For each archive: verify integrity via `HttpAuditArchivalPort.verify()` before transfer | All archives pass 3-level verification (checksum, hash chain, entry count) |
| 3 | Transfer archives to new storage with encryption preserved (do not decrypt/re-encrypt unless key migration is also required) | File checksums match post-transfer |
| 4 | Register archives in new storage provider | `listArchives()` on new provider returns same inventory |
| 5 | For each archive in new storage: run `verify()` again | All archives pass verification in new location |
| 6 | Record migration as HttpClientConfigurationAuditEntry | Audit entry recorded |
| 7 | Maintain read-only access to old storage for 90 days | Old storage accessible |
| 8 | Decommission old storage after verification in next periodic review | Periodic review evidence |

### Post-Migration Rollback Procedures

If any verification step fails during migration, the following rollback procedure MUST be executed.

| Step | Action |
|------|--------|
| 1 | **STOP** the migration immediately. Do NOT proceed to subsequent steps. |
| 2 | Record the failure as HttpClientConfigurationAuditEntry with configurationKey `"MIGRATION_ROLLBACK"` and reason documenting which verification failed and the actual vs. expected values. |
| 3 | If target system has been partially populated: delete ALL entries from the target system. Partial migration states MUST NOT persist (§104b atomicity requirement). |
| 4 | Verify source system integrity: run `verifyAuditChain()` on source to confirm no modifications occurred during the failed migration. |
| 5 | If source system was modified (should not happen per migration procedure): restore from the pre-migration backup (§104a restore procedure). |
| 6 | Reconfigure HttpAuditTrailPort back to the source system if it was redirected. |
| 7 | Verify normal operation: execute a test HTTP operation and confirm audit entry is recorded correctly in the source system. |
| 8 | File incident report per Appendix H (INC-09 for configuration failures or INC-02 for hash chain issues). |

```
REQUIREMENT: Every migration (MIG-01 through MIG-05) MUST complete the pre-migration
             checklist (PM-01 through PM-12) before execution begins. Incomplete pre-
             migration checklists MUST NOT be overridden without QA-approved deviation
             documentation. The completed checklist MUST be retained as part of the
             change control record and included in the next periodic review (§83b).
             Reference: EU GMP Annex 11 §10, 21 CFR 11.10(c).
```

```
REQUIREMENT: Migration procedures MUST be executed by personnel who have completed
             TM-11 (Retention & Archival) training per Appendix G. At least one QA
             Validator (TR-02) MUST witness the verification steps and sign off on
             each verification result. The QA Validator's sign-off MUST be recorded
             in the change control record.
             Reference: EU GMP Annex 11 §2, GAMP 5.
```

```
RECOMMENDED: Organizations SHOULD maintain a migration history log that records all
             completed migrations (scenario, date, source system, target system,
             entry count migrated, verification results, personnel involved). The
             migration history SHOULD be included in the periodic review (§83b)
             evidence package and available for regulatory inspection.
```

---

## Appendix J: Progressive Disclosure Guide

This appendix describes the recommended learning path for `@hex-di/http-client`. Each layer builds on the previous one. Most applications only need Layers 1-2.

### Layer 1: Port & Adapter Basics

**Focus:** Resolve an HTTP client from the DI container, handle errors.

| Topic | Spec File |
|-------|-----------|
| `HttpClientPort` and the `HttpClient` interface | [06 - HttpClient Port](./06-http-client-port.md) |
| Transport adapters (Fetch, Axios, Got, etc.) | [08 - Transport Adapters](./08-transport-adapters.md) |
| Core types (`HttpMethod`, `Headers`, `UrlParams`) | [02 - Core Types](./02-core-types.md) |
| Error types and matching | [05 - Error Types](./05-error-types.md) |

**When to move to Layer 2:** When you need lifecycle management (startup/shutdown), scoped clients, or multiple services sharing an HTTP client.

### Layer 2: Integration & Scoping

**Focus:** Container lifecycle, tracing, logging, per-request scoping.

| Topic | Spec File |
|-------|-----------|
| DI container integration, tracing, logging | [10 - Integration](./10-integration.md) |
| Scoped clients (per-request context, multi-tenancy) | [09 - Scoped Clients](./09-scoped-clients.md) |

**When to move to Layer 3:** When you need request interceptors, circuit breakers, caching, rate limiting, or custom retry logic.

### Layer 3: Composition

**Focus:** Client combinators, advanced patterns, interceptors.

| Topic | Spec File |
|-------|-----------|
| Client combinators (`baseUrl`, `retry`, `timeout`, etc.) | [07 - Client Combinators](./07-client-combinators.md) |
| Request building with combinator pipelines | [03 - HttpRequest](./03-http-request.md) |
| Response body accessors and lazy evaluation | [04 - HttpResponse](./04-http-response.md) |
| Circuit breakers, caching, streaming, interceptors | [13 - Advanced Patterns](./13-advanced.md) |
| Inspector API, snapshots, MCP resources | [11 - Introspection](./11-introspection.md) |

**When to move to Layer 4:** When your application operates in a regulated environment (pharmaceutical, biotech, medical devices, clinical trials, laboratories).

### Layer 4: GxP Compliance

**Focus:** Regulatory requirements, audit trails, validation protocols.

| Topic | Spec File |
|-------|-----------|
| GxP compliance overview and quick reference | [17 - GxP Compliance](./compliance/gxp.md) |
| HTTPS/TLS enforcement, credential protection | [18a](./compliance/gxp.md), [18b](./compliance/gxp.md) |
| Audit bridge and transport validation | [19](./compliance/gxp.md), [20](./compliance/gxp.md) |
| Traceability matrix and validation plan | [24](./compliance/gxp.md), [25](./compliance/gxp.md) |

---

_Previous: [14 - API Reference](./14-api-reference.md)_

_Next: [16 - HTTP Transport Security](./16-http-transport-security.md)_
