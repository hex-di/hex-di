# 15 - Appendices

## Appendix A: Comparison with HTTP Libraries

| Feature                | HexDI HttpClient                      | Effect HttpClient                | Axios                  | ky                  | ofetch             |
| ---------------------- | ------------------------------------- | -------------------------------- | ---------------------- | ------------------- | ------------------ |
| **Error handling**     | `ResultAsync` (never throws)          | `Effect<R, E, A>` (never throws) | Throws                 | Throws              | Throws             |
| **Error types**        | Discriminated union (`_tag`)          | Tagged errors (`_tag`)           | `AxiosError` class     | `HTTPError` class   | `FetchError` class |
| **DI integration**     | First-class port/adapter              | Layer/Service pattern            | None (create instance) | None                | None               |
| **Request building**   | Immutable + pipeable combinators      | Immutable + pipeable combinators | Config object          | Config object       | Options object     |
| **Response body**      | Lazy `ResultAsync` accessors          | Lazy `Effect` accessors          | Auto-parsed `.data`    | Auto-parsed methods | Auto-parsed        |
| **Middleware**         | Functional combinators                | Functional combinators           | Interceptor arrays     | Hooks               | Interceptors       |
| **Platform adapters**  | Fetch, Node, Undici, Bun              | Fetch, Node, Undici, Bun         | Node (XMLHttpRequest)  | Fetch only          | Fetch + Node       |
| **Retry**              | `retry` / `retryTransient` combinator | `retry` / `retryTransient`       | `axios-retry` plugin   | Built-in            | Built-in           |
| **Timeout**            | `timeout` combinator + `withTimeout`  | `Effect.timeout`                 | `timeout` config       | `timeout` option    | `timeout` option   |
| **Tracing**            | `withTracing` combinator (OTel)       | Effect tracing built-in          | Manual                 | None                | None               |
| **Testing**            | Mock client + recording + matchers    | Mock layers                      | Manual / nock          | Manual / msw        | Manual             |
| **Scoping**            | Container scopes (per-request)        | Fiber/Scope                      | Instance per config    | None                | None               |
| **Introspection**      | Inspector + MCP resources             | None                             | None                   | None                | None               |
| **Bundle size (core)** | Target: < 8KB gzipped                 | ~50KB (platform package)         | ~13KB                  | ~3KB                | ~2KB               |
| **TypeScript**         | First-class, no `any`                 | First-class, no `any`            | Good (`any` in places) | Good                | Good               |
| **Streaming**          | `ReadableStream<Uint8Array>`          | `Stream<Uint8Array>`             | Node streams           | `ReadableStream`    | `ReadableStream`   |

### Key Differentiators

1. **DI-native** -- HexDI HttpClient is a DI port, not a standalone library. It participates in compile-time graph validation.
2. **Result-based** -- All operations return `ResultAsync`, composing naturally with HexDI's error handling model.
3. **Self-aware** -- Built-in introspection with request history, latency stats, and MCP resource exposure.
4. **Scoped** -- Per-request clients via HexDI's scope model carry context (correlation IDs, auth) automatically.
5. **No implicit behavior** -- No auto-parsing, no auto-retry, no implicit error throwing. Every behavior is explicit via combinators.

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
| **Platform adapter**  | Adapter that provides `HttpClientPort` using a specific HTTP transport (fetch, node:http, undici).                                      |
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

## Appendix C: Design Decisions

| Decision                                          | Chosen                                      | Alternative                               | Rationale                                                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error handling                                    | `ResultAsync` (never throws)                | Exceptions (throw/catch)                  | Composes with HexDI's `Result` ecosystem. Exhaustive matching via `_tag`. No unhandled rejections.                                                                     |
| Request building                                  | Immutable value objects + combinators       | Mutable builder pattern                   | Immutability prevents mutation bugs. Combinators are tree-shakeable. Builder pattern encourages mutation.                                                              |
| Middleware model                                  | Functional combinators                      | Interceptor arrays                        | Visible execution order. No shared mutable state. Type-safe composition. Tree-shakeable.                                                                               |
| Body accessor return type                         | `ResultAsync<T, HttpResponseError>`         | `Promise<T>` (throwing)                   | Consistent with Result-based error handling. Body decode errors are typed values.                                                                                      |
| `bodyJson` returns Result                         | `Result<HttpRequest, HttpBodyError>`        | Throw on serialization failure            | JSON.stringify can fail. Capturing in Result chain avoids breaking the pipeline.                                                                                       |
| Port direction                                    | `"outbound"`                                | `"inbound"`                               | HTTP client sends requests to external services -- data flows outward from domain.                                                                                     |
| Fetch adapter in core                             | Built-in (zero extra dependencies)          | Separate package                          | `fetch` is universal (browser, Node 18+, Deno, Bun). One less package to install for the common case.                                                                  |
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

This appendix consolidates all MCP resources and A2A skills defined across the HTTP client and guard specs for quick reference during integration planning and GxP validation.

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

### Guard Spec MCP Resources (Cross-Reference)

When `@hex-di/guard` is deployed alongside the HTTP client, the following guard MCP resources complement the HTTP client resources:

| #   | MCP Resource URI                  | Guard Feature                           | Guard Section |
| --- | --------------------------------- | --------------------------------------- | ------------- |
| 1   | `hexdi://guard/audit-trail`       | GxP audit trail entries (SHA-256 chain) | §61           |
| 2   | `hexdi://guard/authorization`     | Authorization decision history          | §63           |
| 3   | `hexdi://guard/signatures`        | Electronic signature records            | §65           |
| 4   | `hexdi://guard/compliance-status` | Overall GxP compliance status           | §59           |
| 5   | `hexdi://guard/http-transport`    | HTTP transport security policy status   | §84           |

### Guard Spec A2A Skills (Cross-Reference)

| #   | Skill ID                       | Name                         | Guard Section |
| --- | ------------------------------ | ---------------------------- | ------------- |
| 1   | `diagnose-authorization-issue` | Diagnose Authorization Issue | §63           |
| 2   | `gxp-compliance-check`         | GxP Compliance Check         | §59           |

### GxP Note

In GxP environments, access to MCP resources constitutes read access to audit-relevant data. Organizations SHOULD implement meta-audit logging for MCP resource access -- recording who accessed which resource, when, and from which agent context. This aligns with 21 CFR 11.10(e) requirements for audit trail review capabilities.

---

## Appendix E: GxP Minimum Configuration

This appendix documents which items specified as RECOMMENDED (per RFC 2119) in the main specification are effectively REQUIRED for most GxP deployments. While RFC 2119 allows RECOMMENDED items to be omitted when valid reasons exist, organizations deploying in FDA 21 CFR Part 11 or EU GMP Annex 11 environments should treat the following as mandatory unless a documented risk assessment (FMEA) justifies the deviation.

### Minimum GxP Combinator Pipeline

The following combinators are REQUIRED by the specification (§81b, §103) and enforced by `createGxPHttpClient`:

| #   | Combinator                   | Spec Section | Regulatory Reference             |
| --- | ---------------------------- | ------------ | -------------------------------- |
| 1   | `requireHttps()`             | §85          | 21 CFR 11.30                     |
| 2   | `withPayloadIntegrity()`     | §86          | 21 CFR 11.10(c), ALCOA+ Accurate |
| 3   | `withCredentialProtection()` | §87          | 21 CFR 11.300                    |
| 4   | `withHttpAuditBridge()`      | §97          | 21 CFR 11.10(e), ALCOA+ Complete |
| 5   | `withSubjectAttribution()`   | §93          | ALCOA+ Attributable              |

### RECOMMENDED Items That Should Be Treated as REQUIRED

The following items are specified as RECOMMENDED (SHOULD) in the specification but should be treated as REQUIRED (MUST) for most GxP deployments:

| #   | Item                                                                     | Spec Section        | Rationale                                                                                                                                                                   | Deviation Risk                                                                                             |
| --- | ------------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Certificate pinning (SPKI) for Category 1 endpoints                      | §85                 | CA compromise enables MITM with valid certificates; pinning is the only defense against this attack. **Note: Now REQUIRED per §85 for Category 1 endpoints.**               | High — no alternative control exists for CA compromise                                                     |
| 2   | Cross-chain verification (FNV-1a + SHA-256)                              | §82                 | Discrepancies between integrity chains indicate data corruption or tampering. **Note: Now REQUIRED per §82 when `gxp: true`.**                                              | Medium — SHA-256 chain alone provides integrity, but divergence from FNV-1a chain indicates upstream issue |
| 3   | `logicalOperationId` for retried operations                              | §97                 | Without logical grouping, retried operations appear as separate operations, confusing audit review. **Note: Now REQUIRED per §97 when `gxp: true` with retry combinators.** | Medium — auditors may misinterpret retry attempts as separate operations                                   |
| 4   | `failureMode: "hard-fail"` for certificate revocation                    | §106                | Soft-fail allows connections to endpoints with revoked certificates                                                                                                         | High — compromised certificates accepted for GxP data transmission                                         |
| 5   | Constant-time signature comparison                                       | §107                | Timing attacks can extract signature binding values                                                                                                                         | Medium — exploitable only by sophisticated attackers with network proximity                                |
| 6   | CORS hardening for browser-based deployments                             | §68a                | Wildcard CORS permits unauthorized cross-origin access to GxP data. **Note: Now REQUIRED per §68a for browser-based GxP deployments.**                                      | High — browser-based GxP apps without CORS hardening expose data to cross-origin attacks                   |
| 7   | Periodic signature re-verification                                       | §107                | Signer status changes (revocation, suspension) retroactively invalidate previously captured signatures                                                                      | Medium — undetected until next manual review                                                               |
| 8   | `withPayloadValidation({ requestValidationMode: "reject" })`             | §89                 | `"warn"` mode allows malformed payloads to reach GxP APIs                                                                                                                   | High — data integrity violation at the API boundary                                                        |
| 9   | `withAuthenticationPolicy()` with `minimumStrength: "multi-factor"`      | §90                 | Single-factor authentication is insufficient for 21 CFR 11.200 electronic signatures                                                                                        | High — regulatory non-compliance for e-signature-dependent operations                                      |
| 10  | Automated backup verification                                            | §104a               | Unverified backups may be corrupted, leading to data loss during disaster recovery                                                                                          | Medium — discovered only during actual restore                                                             |
| 11  | Three backup generations (grandfather-father-son)                        | §104a               | Single backup copy creates single point of failure for audit data                                                                                                           | Medium — mitigated by geographic separation                                                                |
| 12  | Trial migration before production                                        | §104b               | Production migration failures can cause audit trail data loss                                                                                                               | High — no rollback if hash chain is broken during production migration                                     |
| 13  | `withElectronicSignature()` for state-changing operations on GxP records | §93a                | Unsigned modifications to electronic records lack intent verification                                                                                                       | High — regulatory non-compliance for 21 CFR 11.50/11.70                                                    |
| 14  | NTP monitoring with clock drift threshold                                | §96, guard spec §62 | Clock drift causes inconsistent timestamps between guard and HTTP audit entries                                                                                             | Medium — temporal ordering of audit events becomes unreliable                                              |

| 15 | `withCorsHardening()` for browser-based GxP deployments | §112 | CORS misconfiguration permits unauthorized cross-origin access to GxP data; formal policy types ensure enforceable configuration | High — browser-based GxP apps without typed CORS policy expose data to cross-origin attacks |
| 16 | `rateLimit()` with GxP audit recording | §113 | Uncontrolled request volume can overwhelm GxP APIs during retry storms or batch migrations. **Note: Now REQUIRED per §113 for Category 1 GxP endpoints.** | High — no alternative client-side control for retry storm prevention |

### Using This Appendix

Organizations should review this appendix during Validation Plan preparation (§83a) and document which RECOMMENDED items they have adopted and which they have chosen to omit with justification. The Validation Plan SHOULD include a "GxP Configuration Profile" section mapping each item in this appendix to the organization's deployment configuration.

Items marked as "High" deviation risk should only be omitted with QA-approved risk acceptance documented in the FMEA (§98). Items marked as "Medium" deviation risk may be omitted with documented justification in the Validation Plan.

> **Note:** Items #1, #2, #3, and #6 in this appendix have been upgraded from RECOMMENDED to REQUIRED in the specification as of the GxP compliance review. They remain listed here for organizations consulting older versions of the specification and for completeness of the minimum configuration profile.

> **v5.0 Audit Additions:** Items #15 and #16 were added during the v5.0 GxP compliance audit (§108-118). Item #15 (`withCorsHardening`) is REQUIRED for browser-based GxP deployments per §112. Item #16 (`rateLimit` with GxP audit) is RECOMMENDED per §113.

---

_Previous: [14 - API Reference](./14-api-reference.md)_

_Next: [16 - Definition of Done](./16-definition-of-done.md)_
