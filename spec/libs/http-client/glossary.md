# @hex-di/http-client — Glossary

Domain terminology used throughout the specification. Definitions are concise; detailed semantics are in the referenced spec sections.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-GLO-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/glossary.md` |
| Status | Effective |

---

## Transport Adapter

A HexDI `Adapter` that provides `HttpClientPort` by wrapping a concrete HTTP library (`fetch`, `axios`, `got`, `undici`, etc.). Transport adapters translate `HttpRequest` to the library's native request format and translate the native response to `HttpResponse`. Programs never import adapters directly; they depend on `HttpClientPort`. See [§39](./08-transport-adapters.md#39-transport-adapter-architecture), [ADR-HC-007](./decisions/007-transport-adapter-packages.md).

## HttpClient

The core abstraction: an object with `execute` and convenience methods (`get`, `post`, etc.) that return `ResultAsync<HttpResponse, HttpRequestError>` and never throw. See [§25](./06-http-client-port.md#25-httpclient-interface).

## HttpClientPort

The DI port definition (`port<HttpClient>()(...)`) that programs depend on. Registered in the graph with a transport adapter. See [§26](./06-http-client-port.md#26-httpclientport).

## HttpRequest

An immutable, frozen value object representing an outgoing HTTP request. Built with constructor functions (`HttpRequest.get`, `HttpRequest.post`, etc.) and transformed with pipeable combinators. See [§9](./03-http-request.md#9-httprequest-interface), [INV-HC-1](./invariants.md#inv-hc-1-request-immutability).

## HttpResponse

A frozen value object representing an HTTP response. Carries status, headers, a back-reference to the originating `HttpRequest`, and lazy body accessors (`json`, `text`, `arrayBuffer`, `blob`, `formData`, `stream`). See [§15](./04-http-response.md#15-httpresponse-interface), [INV-HC-8](./invariants.md#inv-hc-8-response-request-back-reference).

## HttpClientError

The discriminated union of all error types: `HttpRequestError | HttpResponseError | HttpBodyError`. Every variant carries `_tag`, `message`, and `cause`. See [§19](./05-error-types.md#19-httpclienterror-union), [INV-HC-6](./invariants.md#inv-hc-6-error-discriminant-exhaustiveness).

## HttpRequestError

An error that occurs **before** a response is received: network failure (`"Transport"`), timeout (`"Timeout"`), abort (`"Aborted"`), or invalid URL (`"InvalidUrl"`). See [§20](./05-error-types.md#20-httprequesterror).

## HttpResponseError

An error derived from the **response**: non-2xx status (`"StatusCode"`), body decode failure (`"Decode"`), empty body (`"EmptyBody"`), or double-consumption of the body (`"BodyAlreadyConsumed"`). See [§21](./05-error-types.md#21-httpresponseerror), [INV-HC-3](./invariants.md#inv-hc-3-body-single-consumption-boundary).

## HttpBodyError

An error during **request body construction** — before the request is sent. Variants: JSON serialization failure (`"JsonSerialize"`) and encoding failure (`"Encode"`). See [§22](./05-error-types.md#22-httpbodyerror).

## Client Combinator

A function of type `(client: HttpClient) => HttpClient` that wraps a client with additional behavior (authentication, retry, timeout, logging, etc.). Combinators compose via `pipe()`. See [§29](./07-client-combinators.md#29-combinator-philosophy), [ADR-HC-001](./decisions/001-combinator-over-middleware.md), [INV-HC-9](./invariants.md#inv-hc-9-combinator-composition-order-determinism).

## Request Combinator

A pipeable function of type `(req: HttpRequest) => HttpRequest` (or `(req: HttpRequest) => Result<HttpRequest, HttpBodyError>` for fallible combinators) that transforms a request. Returns a new frozen `HttpRequest`; the original is unchanged. See [§11–§14](./03-http-request.md).

## filterStatusOk

A client combinator that converts non-2xx responses into `Err(HttpResponseError)` with `reason: "StatusCode"`. Without this combinator, all HTTP responses (including 4xx and 5xx) are `Ok(HttpResponse)`. See [§32](./07-client-combinators.md#32-status-filtering).

## retryTransient

A client combinator that retries requests on transient errors: `HttpRequestError` with reason `"Transport"` or `"Timeout"`, and `HttpResponseError` with status `429` or `5xx` (except `501`, `505`). Uses exponential backoff by default. See [§36](./07-client-combinators.md#36-retry).

## Transient Error

An `HttpClientError` that is worth retrying: `Transport` and `Timeout` request errors, and `429`/`5xx` response errors (excluding non-retryable codes `501`, `505`). Detected via `isTransientError(error)`. See [§23](./05-error-types.md#23-error-constructors--guards).

## Body Accessor

A lazy `ResultAsync` property on `HttpResponse` (`json`, `text`, `arrayBuffer`, `blob`, `formData`) that reads the response body on first access and caches the result. See [§15–§16](./04-http-response.md), [INV-HC-2](./invariants.md#inv-hc-2-response-body-caching), [INV-HC-3](./invariants.md#inv-hc-3-body-single-consumption-boundary).

## BodyAlreadyConsumed

The `reason` variant of `HttpResponseError` returned when a different body accessor is called after the body has already been consumed by a prior accessor. See [§15](./04-http-response.md#15-httpresponse-interface).

## Headers

A frozen, case-normalized record of HTTP headers. All keys are lowercased on creation. Lookup is case-insensitive. See [§7](./02-core-types.md), [INV-HC-10](./invariants.md#inv-hc-10-header-key-case-normalization).

## UrlParams

A sequence of `[key, value]` pairs representing URL search parameters. Supports multi-value keys (e.g., `?tag=a&tag=b`). See [§8](./02-core-types.md).

## HttpBody

A discriminated union representing request body variants: `EmptyBody`, `JsonBody`, `TextBody`, `BinaryBody`, `FormBody`, `StreamBody`. See [§8](./02-core-types.md).

## HttpClientInspector

The introspection service for the HTTP client. Provides `getSnapshot()`, `getActiveRequests()`, `getHistory()`, `getStats()`, `subscribe()`, and `getHealth()`. See [§54](./11-introspection.md#54-httpclientinspector).

## HttpAuditSink

An optional GxP port that receives externalized audit history entries with cryptographic integrity hashes. Only required in GxP-regulated deployments. See [§49](./10-integration.md#49-di-ports), [compliance/gxp.md](./compliance/gxp.md).

## Error Code

A unique identifier for each error variant, following the `HTTP0xx` pattern (e.g., `HTTP001` for Transport, `HTTP010` for StatusCode). Accessed via `errorCode(error)`. See [§24](./05-error-types.md#24-error-codes).

## populate-freeze-return

The 3-step construction sequence required for all error constructors: (1) assign all fields in a single object literal, (2) immediately call `Object.freeze()`, (3) return the frozen object — with no intermediate mutable reference escaping between steps 1 and 2. See [ADR-HC-006](./decisions/006-error-freeze-for-alcoa.md), [INV-HC-5](./invariants.md#inv-hc-5-error-populate-freeze-return-ordering).

## Never-Throw Contract

The guarantee that `HttpClient` methods return `ResultAsync` and never throw synchronously or asynchronously. All platform exceptions are caught and wrapped in `Err(HttpRequestError)`. See [ADR-HC-003](./decisions/003-result-only-error-channel.md), [INV-HC-7](./invariants.md#inv-hc-7-never-throw-contract).

---

## ResultAsync

The asynchronous counterpart to `Result<T, E>` from `@hex-di/result`. Wraps a `Promise<Result<T, E>>` and exposes combinators (`map`, `flatMap`, `match`, `mapErr`) that chain without `await`. All `HttpClient` convenience methods return `ResultAsync<HttpResponse, HttpRequestError>`. Access the settled result via `.promise`. See [§25](./06-http-client-port.md#25-httpclient-interface).

## pipe

The functional composition utility from `@hex-di/result` used throughout the HTTP client API. Applies a sequence of unary functions left-to-right: `pipe(value, f1, f2, f3)` is equivalent to `f3(f2(f1(value)))`. Used to build `HttpRequest` from combinators (e.g., `pipe(HttpRequest.get(url), bearerToken(token), bodyJson(data))`) and to compose `HttpClient` wrappers (e.g., `pipe(base, baseUrl(...), bearerAuth(...))`). See [§12](./03-http-request.md#12-pipeable-request-combinators), [§29](./07-client-combinators.md#29-combinator-philosophy).

## ScopedHttpClient

An `HttpClient` variant that binds per-request context — such as tenant ID, correlation ID, or user identity — to every request it sends. Created via `createScopedHttpClient(base, context)`. The context object is frozen and merged into every outgoing request without mutating the base client. See [§45–§48](./09-scoped-clients.md), [overview.md](./overview.md#scoped-clients).

## InferHttpClient

A utility type that extracts the `HttpClient` type from an `HttpClientPort`. Useful when consumer code needs to reference the exact client interface without importing the adapter package. Pattern: `type MyClient = InferHttpClient<typeof HttpClientPort>`. See [overview.md](./overview.md#port--client-interface).

## specRevision

A `string` constant exported by every `@hex-di/http-client` package via `getMetadata()` whose value matches the current specification revision (e.g., `"0.1"`). Provides a machine-verifiable link between the installed npm package and the governing specification. In GxP deployments, automated compliance tooling MUST compare `specRevision` against the approved specification revision before qualification begins. See [§28b](./06-http-client-port.md), [README.md — Version Relationship Policy](./README.md#version-relationship-policy).

## HttpTransportAdapter

The low-level interface implemented by each concrete HTTP library adapter (`fetch`, `axios`, `got`, etc.). Receives a frozen `HttpRequest`, executes the network call, and resolves to `Result<HttpResponse, HttpRequestError>`. Never throws. Application code never calls this interface directly — it is consumed internally by `HttpClient`. Created via the `createHttpClientAdapter` factory. See [§39–§44](./08-transport-adapters.md), [ADR-HC-007](./decisions/007-transport-adapter-packages.md).

## HttpClientInspectorPort

The DI port that exposes runtime introspection of a running `HttpClient`: active request count, request history, aggregate stats, and health derivation. Registered alongside `HttpClientPort` in the DI graph. See [§54](./11-introspection.md#54-httpclientinspector), [overview.md](./overview.md#introspection).

## HttpClientRegistryPort

The DI port through which `HttpClient` instances register themselves with the introspection system. Each named client registers on first use and reports its state to the inspector. Consumed internally by the transport adapter infrastructure. See [§54](./11-introspection.md#54-httpclientinspector).

## HttpClientSnapshot

A point-in-time immutable record of a single `HttpClient`'s state: client name, active request count, recent history entries, aggregate latency statistics, and derived health status. Returned by `HttpClientInspectorPort.getSnapshot()`. See [§55](./11-introspection.md#55-httpclientsnapshot).

## HttpRequestHistoryEntry

A single entry in an `HttpClientSnapshot`'s history list. Contains the originating `HttpRequest`, the settled `Result<HttpResponse, HttpClientError>`, latency in milliseconds, and a UTC timestamp. History entries are frozen and append-only. See [§55](./11-introspection.md#55-httpclientsnapshot).

## createMockHttpClient

A testing utility factory that returns an `HttpClient` whose responses are pre-programmed via a `MockHttpClientAdapter`. Enables unit tests to exercise combinators and application logic without any network I/O. Responses are specified as `Result<HttpResponse, HttpClientError>` values keyed by URL pattern or response sequence. See [§59](./12-testing.md#59-mock-httpclient), [process/test-strategy.md](./process/test-strategy.md).

## createRecordingClient

A testing utility factory that wraps an `HttpClient` and records every `HttpRequest`/`Result` pair for later assertion. Used to verify that combinators (authentication headers, retry counts, timeout signals) apply correctly by inspecting what was actually sent. See [§60](./12-testing.md#60-recording-client), [process/test-strategy.md](./process/test-strategy.md).

---

## ALCOA+

The data integrity framework applied to GxP-regulated HTTP operations. Acronym:
- **A**ttributable — every audit entry is linked to the user or system that performed it
- **L**egible — audit entries are human-readable and machine-parseable
- **C**ontemporaneous — entries are recorded at the time of the operation, not retroactively
- **O**riginal — entries are the first-capture record and are not overwritten
- **A**ccurate — entry content faithfully represents what occurred
- **+** Complete, Consistent, Enduring, Available — extended principles

The `@hex-di/http-client` enforces ALCOA+ via error object immutability (INV-HC-4, INV-HC-5), hash chain integrity, and the `HttpAuditTrailPort` contract. See [compliance/gxp.md](./compliance/gxp.md), [§80](./compliance/01-regulatory-context.md#80-alcoa-mapping-for-http-operations), [ADR-HC-006](./decisions/006-error-freeze-for-alcoa.md).

## GAMP 5 Category 5

The Good Automated Manufacturing Practice classification for custom-developed software. `@hex-di/http-client` is classified Category 5 because it is purpose-built software with configurable transport behavior, not a configurable-off-the-shelf product (Category 4). Category 5 requires full software development lifecycle documentation, including URS, FS, DS, IQ/OQ/PQ, and change control. See [compliance/09-advanced-requirements.md §108](./compliance/09-advanced-requirements.md), [README.md — Combined Specification Approach](./README.md#combined-specification-approach-gamp-5).

## IQ / OQ / PQ

The three-phase qualification protocol framework applied when deploying `@hex-di/http-client` in regulated environments:
- **IQ (Installation Qualification)** — verifies the package installs correctly: dependency resolution, subpath exports, and TypeScript compilation succeed.
- **OQ (Operational Qualification)** — verifies the package operates as specified: all DoD test groups pass, all invariants hold, all FMEA mitigations verified.
- **PQ (Performance Qualification)** — verifies the package performs correctly under real operational conditions: integration tests, benchmark baselines, business-process scenarios.

See [compliance/07-validation-protocols.md §99](./compliance/07-validation-protocols.md), [process/test-strategy.md](./process/test-strategy.md).

## Hash Chain

A cryptographic integrity mechanism used in the `HttpAuditTrailPort` where each audit entry includes the SHA-256 hash of the previous entry. Breaking the append-only constraint (inserting, modifying, or deleting entries) produces a detectable hash chain discontinuity. Hash chain verification is exposed via `QueryableHttpAuditTrailPort.verifyChain()`. See [compliance/06-audit-bridge.md §91](./compliance/06-audit-bridge.md), [INV-HC-4](./invariants.md#inv-hc-4-error-object-immutability).

## HTTPS Enforcement

The GxP requirement that all outbound HTTP calls in regulated environments MUST use TLS (HTTPS). Enforced via the `withHttpsEnforcement()` combinator, which rejects requests to `http://` URLs with `HttpRequestError(reason: "InsecureUrl")` before the network call is made. Required (not merely recommended) per 21 CFR Part 11 transmission security requirements. See [compliance/04-transport-security.md §85](./compliance/04-transport-security.md), [§85](./16-http-transport-security.md#85-https-enforcement).

## Payload Integrity

The GxP requirement that HTTP request and response bodies can be cryptographically verified to have not been tampered with in transit. Applied via the `withPayloadIntegrity()` combinator, which computes and attaches a HMAC-SHA-256 digest to request bodies and verifies response digests. Required for audit trail submissions and electronic signature payloads. See [compliance/04-transport-security.md §86](./compliance/04-transport-security.md), [§86](./16-http-transport-security.md#86-payload-integrity-verification).

## Certificate Revocation

The process of checking whether a TLS certificate presented by a server has been invalidated before its natural expiry — due to compromise, mis-issuance, or policy change. `@hex-di/http-client` enforces revocation checking in GxP deployments via the `CertificateRevocationPolicy` with OCSP/CRL priority chain. Hard-fail mode (connection refused on revocation check failure) is REQUIRED for GxP environments. See [compliance/08-compliance-extensions.md §106](./compliance/08-compliance-extensions.md).

## Electronic Signature

A representation of a human approval captured per 21 CFR Part 11 §11.50 requirements. In the context of `@hex-di/http-client`, electronic signatures are attached to specific HTTP request payloads (e.g., record approval, result sign-off) via the `HttpSignatureVerificationPort`. A compliant signature contains: meaning (what is being approved), printed name, date/time, and the signer's unique user ID. See [compliance/06-audit-bridge.md §93a](./compliance/06-audit-bridge.md), [compliance/09-advanced-requirements.md §107](./compliance/09-advanced-requirements.md).

## HttpAuditTrailPort

The DI port that receives structured `HttpOperationAuditEntry` records from the HTTP client at operation time. Implementations write entries to an append-only audit store (database, file, message queue). Only REQUIRED in GxP-regulated deployments; has no effect on non-GxP usage. See [compliance/06-audit-bridge.md §91](./compliance/06-audit-bridge.md), [§49](./10-integration.md#49-di-ports).

## HttpOperationAuditEntry

The structured record of a single HTTP operation captured by the audit trail. Contains: timestamp (ISO 8601), user attribution, HTTP method and URL, response status, latency, hash of preceding entry (hash chain), and optional electronic signature reference. All fields are frozen at capture time per ALCOA+ Contemporaneous and Original principles. See [compliance/06-audit-bridge.md §92](./compliance/06-audit-bridge.md).

## HttpAuditArchivalPort

The DI port responsible for long-term audit trail retention. Implementations write audit entries to archival storage (encrypted at rest with AES-256-GCM), enforce the 5-year minimum retention period required by EU GMP Annex 11 §17, and expose backup/restore operations. Required in GxP deployments where the primary audit store does not provide durable long-term retention. See [compliance/08-compliance-extensions.md §104](./compliance/08-compliance-extensions.md).

## QueryableHttpAuditTrailPort

The DI port that exposes search and integrity-verification operations over the audit trail. Supports 12 filter fields (by user, date range, URL pattern, status code, etc.), returns paginated results within a 4-hour SLA, and exposes `verifyChain()` for hash chain integrity checking. Read-only; does not mutate the audit store. See [compliance/08-compliance-extensions.md §105](./compliance/08-compliance-extensions.md).

## withHttpGuard

A client combinator that integrates the `@hex-di/guard` authorization port with the HTTP client. Evaluates the active subject's permissions before each request is sent; rejects unauthorized requests with `HttpRequestError(reason: "Unauthorized")` without making a network call. **REQUIRED** (not optional) in GxP deployments — default-deny enforcement per 21 CFR 11.10(d). See [§65b](./16-http-transport-security.md), [compliance/07-validation-protocols.md](./compliance/07-validation-protocols.md).
