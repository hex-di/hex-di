# 13 - Advanced Patterns

## §64. Interceptor Chains

Complex HTTP clients compose multiple combinators into reusable interceptor chains. A chain is just a function `(client: HttpClient) => HttpClient`:

```typescript
type HttpClientInterceptor = (client: HttpClient) => HttpClient;
```

### Composing Interceptors

```typescript
function composeInterceptors(
  ...interceptors: readonly HttpClientInterceptor[]
): HttpClientInterceptor;
```

```typescript
const loggingInterceptor: HttpClientInterceptor = client =>
  pipe(
    client,
    HttpClient.tapRequest(req => console.log(`→ ${req.method} ${req.url}`)),
    HttpClient.tapResponse((res, req) => console.log(`← ${res.status} ${req.url}`))
  );

const authInterceptor =
  (token: string): HttpClientInterceptor =>
  client =>
    pipe(client, HttpClient.bearerAuth(token));

const resilienceInterceptor: HttpClientInterceptor = client =>
  pipe(
    client,
    HttpClient.filterStatusOk,
    HttpClient.retryTransient({ times: 3 }),
    HttpClient.timeout(15_000)
  );

// Compose into a single interceptor
const apiInterceptor = composeInterceptors(
  authInterceptor("tok_abc"),
  resilienceInterceptor,
  loggingInterceptor
);

// Apply to any base client
const apiClient = apiInterceptor(baseClient);
```

### DI-Aware Interceptor Adapter

```typescript
const ApiHttpClientAdapter = createAdapter({
  provides: ApiHttpClientPort,
  requires: [HttpClientPort, AuthTokenPort, LoggerPort],
  lifetime: "scoped",
  factory: ({ HttpClient: base, AuthToken: token, Logger: logger }) =>
    pipe(
      base,
      HttpClient.baseUrl("https://api.example.com"),
      HttpClient.bearerAuth(token),
      HttpClient.filterStatusOk,
      HttpClient.retryTransient({ times: 3 }),
      HttpClient.timeout(15_000),
      HttpClient.withLogging(logger)
    ),
});
```

## §65. Circuit Breaker

A circuit breaker combinator prevents cascading failures by stopping requests to a failing endpoint after a threshold is reached:

```typescript
function circuitBreaker(options: CircuitBreakerOptions): (client: HttpClient) => HttpClient;

interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. Default: 5. */
  readonly failureThreshold: number;

  /** Time in ms to wait before attempting a half-open probe. Default: 30000. */
  readonly resetTimeout: number;

  /** Number of successful probes required to close the circuit. Default: 1. */
  readonly successThreshold?: number;

  /** Optional predicate to classify which errors count as failures. Default: all errors. */
  readonly isFailure?: (error: HttpClientError) => boolean;

  /** Optional callback when the circuit state changes. */
  readonly onStateChange?: (state: CircuitState) => void;

  /** Name for inspector tracking. Default: derived from base URL. */
  readonly name?: string;
}

type CircuitState = "closed" | "open" | "half-open";
```

### Behavior

```
closed ──(failures >= threshold)──► open
   ▲                                  │
   │                           (resetTimeout elapsed)
   │                                  ▼
   └────(success >= threshold)──── half-open
```

- **Closed** -- requests flow normally; failures are counted
- **Open** -- requests are immediately rejected with `HttpRequestError { reason: "Transport", message: "Circuit breaker is open" }`
- **Half-Open** -- a limited number of probe requests are allowed through; if they succeed, the circuit closes; if they fail, the circuit re-opens

### Usage

```typescript
const resilientClient = pipe(
  baseClient,
  HttpClient.filterStatusOk,
  HttpClient.circuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30_000,
    isFailure: error => isTransientError(error),
    onStateChange: state => console.log(`Circuit: ${state}`),
  })
);
```

### Inspector State

When an `HttpClientInspector` is available in the container, the circuit breaker reports its internal state. The inspector aggregates circuit breaker instances by name.

```typescript
interface CircuitBreakerSnapshot {
  readonly state: CircuitState;
  readonly consecutiveFailures: number;
  readonly totalTrips: number;
  readonly lastStateChange: number;
  readonly lastFailure: number | undefined;
}
```

## §66. Rate Limiting

> **GxP Note:** For GxP-specific rate limiting guidance including audit trail recording of rate-limited operations and Validation Plan documentation requirements, see §113.

A client-side rate limiter that throttles outgoing requests:

```typescript
function rateLimit(options: RateLimitOptions): (client: HttpClient) => HttpClient;

interface RateLimitOptions {
  /** Maximum requests per window */
  readonly maxRequests: number;

  /** Window duration in ms */
  readonly windowMs: number;

  /**
   * Behavior when rate limit is exceeded:
   * - "queue": Queue requests and execute when a slot becomes available
   * - "reject": Immediately reject with HttpRequestError
   * Default: "queue".
   */
  readonly strategy?: "queue" | "reject";

  /** Name for inspector tracking. Default: derived from base URL. */
  readonly name?: string;
}
```

### Usage

```typescript
const rateLimitedClient = pipe(
  baseClient,
  HttpClient.rateLimit({
    maxRequests: 100,
    windowMs: 60_000, // 100 requests per minute
    strategy: "queue",
  })
);
```

### Inspector State

When an `HttpClientInspector` is available, the rate limiter reports its internal state. The inspector aggregates rate limiter instances by name.

```typescript
interface RateLimiterSnapshot {
  readonly currentWindowRequests: number;
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly queuedRequests: number;
  readonly totalThrottled: number;
}
```

## §67. Response Caching

A simple in-memory response cache for idempotent requests:

```typescript
function cache(options: CacheOptions): (client: HttpClient) => HttpClient;

interface CacheOptions {
  /** Cache TTL in ms. Default: 60000. */
  readonly ttlMs?: number;

  /** Maximum cache entries. Default: 100. */
  readonly maxEntries?: number;

  /** HTTP methods to cache. Default: ["GET", "HEAD"]. */
  readonly methods?: readonly HttpMethod[];

  /**
   * Custom cache key function.
   * Default: `${method} ${url}` (including query params).
   */
  readonly keyFn?: (request: HttpRequest) => string;

  /**
   * Predicate to determine if a response is cacheable.
   * Default: status 200-299.
   */
  readonly isCacheable?: (response: HttpResponse) => boolean;

  /** Name for inspector tracking. Default: derived from base URL. */
  readonly name?: string;
}
```

### Usage

```typescript
const cachedClient = pipe(
  baseClient,
  HttpClient.filterStatusOk,
  HttpClient.cache({
    ttlMs: 30_000,
    maxEntries: 200,
    methods: ["GET"],
  })
);

// First call: fetches from server
await cachedClient.get("/api/config").promise;

// Second call within TTL: returns cached response
await cachedClient.get("/api/config").promise; // No network request
```

### Inspector State

When an `HttpClientInspector` is available, the cache reports its internal state. The inspector aggregates cache instances by name.

```typescript
interface CacheSnapshot {
  readonly entries: number;
  readonly maxEntries: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly evictions: number;
}
```

### Design Note

This is a simple in-memory cache for common use cases. For production HTTP caching that respects `Cache-Control`, `ETag`, and `Last-Modified` headers, a dedicated caching adapter package (`@hex-di/http-client-cache`) with a cache store port is recommended.

## §68. Streaming Responses

For large responses, streaming avoids buffering the entire body in memory:

```typescript
const result = await http.get("/api/export/large-dataset").promise;

result.match(
  res => {
    // Stream processing with backpressure
    const reader = res.stream.getReader();

    const processStream = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await processBatch(value);
      }
    };

    return processStream();
  },
  error => console.error(error.message)
);
```

### Server-Sent Events (SSE) Pattern

For SSE endpoints, combine the HTTP client with `@hex-di/stream`:

```typescript
const SseStreamAdapter = createStreamAdapter({
  provides: ServerEventsPort,
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: http }) =>
    () =>
      createStream<ServerEvent>(sink => {
        const controller = new AbortController();

        const connect = async () => {
          const result = await http.get("/api/events", {
            headers: { Accept: "text/event-stream" },
            signal: controller.signal,
          }).promise;

          result.match(
            res => {
              const reader = res.stream.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              const read = async () => {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    sink.complete();
                    return;
                  }

                  buffer += decoder.decode(value, { stream: true });
                  const events = parseSSE(buffer);
                  buffer = events.remaining;
                  for (const event of events.parsed) {
                    sink.next(event);
                  }
                }
              };

              read().catch(err => sink.terminate(err));
            },
            error => sink.terminate(error)
          );
        };

        connect();

        return () => controller.abort();
      }),
});
```

## §69. SSR Considerations

### Server-Side Rendering

When running in SSR contexts (Next.js, Remix, Nuxt), the HTTP client works identically -- `FetchHttpClientAdapter` uses the server's `fetch`. For Node.js SSR, use `NodeHttpClientAdapter` or `UndiciHttpClientAdapter` for better performance.

### Request Deduplication

In SSR, multiple components may request the same data during a single render. The HTTP client does not deduplicate automatically -- that is `@hex-di/query`'s responsibility. However, the `cache` combinator (§67) can prevent duplicate network requests within a TTL window.

### Scoped Clients in SSR

Each SSR request should create a scope with its own auth context:

```typescript
// Next.js middleware pattern
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const scope = container.createScope({ name: `ssr-${req.url}` });
  try {
    // Scope provides per-request context
    scope.provide(AuthTokenPort, extractAuthToken(req));
    scope.provide(CorrelationIdPort, req.headers["x-correlation-id"] ?? crypto.randomUUID());

    // All HTTP requests within this render carry the correct auth/correlation
    const html = await renderApp(scope);
    res.end(html);
  } finally {
    scope.dispose();
  }
}
```

## §68a. CORS Considerations for GxP Data

> **Extended in §112:** Formal `CorsPolicy` type definition, `withCorsHardening()` combinator, and `CorsViolationError` types are specified in [§112 — CORS Policy Types and Combinator](./compliance/gxp.md#112-cors-policy-types-and-combinator) (compliance/gxp.md). This section (§68a) provides the foundational CORS hardening guidance and GxP REQUIREMENT for browser-based deployments; §112 provides the concrete `CorsPolicy` type (5 fields), `withCorsHardening()` combinator API, `CorsViolationError` discriminated union (4 error codes: `CORS_ORIGIN_REJECTED`, `CORS_METHOD_REJECTED`, `CORS_HEADER_REJECTED`, `CORS_WILDCARD_REJECTED`), and the `CorsAuditEntry` type for audit trail recording. **Implementers MUST read both §68a and §112 together** to understand the complete CORS requirement for GxP browser-based deployments.

When HTTP operations carry GxP-regulated data (electronic records, audit trail entries, electronic signatures), Cross-Origin Resource Sharing (CORS) configuration has compliance implications.

```
RECOMMENDED: GxP deployments transmitting regulated data via HTTP SHOULD observe the
             following CORS hardening practices:

             1. **Preflight handling:** CORS preflight responses SHOULD NOT use wildcard
                methods (Access-Control-Allow-Methods: *). Explicitly enumerate permitted
                methods (GET, POST, PUT, DELETE) to limit the attack surface.

             2. **Credential inclusion:** When requests include credentials (cookies,
                authorization headers), the origin MUST NOT be wildcarded
                (Access-Control-Allow-Origin: *). Use an explicit allowlist of trusted
                origins.

             3. **Origin allowlists:** Origin validation SHOULD use exact string matching
                against a maintained allowlist. Regular expression-based origin matching
                introduces bypass risks (e.g., subdomain matching patterns that
                inadvertently permit attacker-controlled subdomains).

             4. **CORS failure recording:** When a CORS preflight or actual request is
                blocked by the browser, the HTTP client SHOULD produce an HttpHistoryEntry
                with error tag "Transport" and a reason indicating the CORS failure. This
                ensures CORS-blocked operations appear in the audit trail for
                troubleshooting and compliance review.

             5. **Audit trail coverage:** CORS-blocked responses that prevent GxP data
                operations from completing SHOULD be recorded in the audit trail to
                maintain ALCOA+ Complete compliance. A CORS block that silently prevents
                an operation without an audit record creates a completeness gap.

             Reference: 21 CFR 11.30 (open system controls).
```

```
REQUIREMENT: When `gxp: true` is set and @hex-di/http-client operates in a browser
             context (transport adapter is FetchHttpClientAdapter running in a browser
             environment), CORS hardening MUST be enforced for all endpoints
             transmitting GxP-regulated data. Specifically:
             (1) The origin allowlist MUST use exact string matching (no wildcards,
                 no regex patterns) for Access-Control-Allow-Origin responses.
             (2) CORS-blocked operations MUST produce an HttpOperationAuditEntry
                 (§92) with outcome "transport_error" and errorCode "CORS_BLOCKED"
                 to satisfy ALCOA+ Complete.
             (3) CORS preflight failures for GxP endpoints MUST be classified as
                 Minor (S4) incidents per the HTTP Transport Incident Classification
                 Framework (§83c).
             (4) The Validation Plan (§83a) MUST include a section documenting the
                 CORS configuration for browser-based GxP deployments.
             Reference: 21 CFR 11.30 (open system controls), ALCOA+ Complete.
```

---

## §68b. HTTP/2 and HTTP/3 Security Considerations for GxP

When transport adapters support HTTP/2 (RFC 9113) or HTTP/3 (RFC 9114), additional security considerations apply to GxP deployments. These protocol versions introduce connection multiplexing, header compression, and UDP-based transport (HTTP/3) that affect audit traceability, TLS requirements, and performance qualification.

### Protocol-Specific Security Implications

| Feature                     | HTTP/1.1                   | HTTP/2                                                   | HTTP/3                           | GxP Impact                                                                                                                        |
| --------------------------- | -------------------------- | -------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Connection multiplexing** | One request per connection | Multiple streams over one TCP connection                 | Multiple streams over QUIC (UDP) | Multiple GxP operations may share a single TLS session; certificate validation applies to the connection, not individual requests |
| **Header compression**      | No compression             | HPACK (RFC 7541)                                         | QPACK (RFC 9204)                 | Compressed headers may contain credential material; `withCredentialProtection()` (§87) MUST operate on decompressed headers       |
| **Server push**             | Not supported              | Server can push responses                                | Server can push responses        | Unsolicited server push responses MUST NOT bypass audit trail recording (§97)                                                     |
| **Stream prioritization**   | N/A                        | Stream priority and dependency                           | Stream priority                  | GxP audit entries SHOULD NOT be deprioritized relative to data streams                                                            |
| **Transport**               | TCP                        | TCP with TLS 1.2+                                        | QUIC (UDP) with TLS 1.3          | HTTP/3 mandates TLS 1.3; `requireHttps({ minTlsVersion })` MUST recognize QUIC-based TLS                                          |
| **Connection coalescing**   | N/A                        | Multiple origins over one connection if cert covers both | Same as HTTP/2                   | Coalesced connections MUST validate certificate coverage for each origin independently                                            |

### Requirements

```
REQUIREMENT: When the transport adapter negotiates HTTP/2 or HTTP/3, the
             withCredentialProtection() combinator (§87) MUST operate on
             decompressed headers. Credential redaction MUST NOT be applied
             to the compressed wire format — it MUST be applied to the
             logical header name/value pairs after HPACK or QPACK decompression.
             This ensures credential patterns are correctly detected regardless
             of compression state.
             Reference: 21 CFR 11.300, OWASP.
```

```
REQUIREMENT: When HTTP/2 server push is enabled, pushed responses MUST be
             subject to the same audit trail recording as client-initiated
             responses. Pushed responses MUST produce HttpHistoryEntry records
             (§55a) and HttpOperationAuditEntry records (§92) when the HTTP
             audit bridge (§97) is active. If server push cannot be audited
             by the transport adapter, server push MUST be disabled for GxP
             connections (via SETTINGS_ENABLE_PUSH=0 in the HTTP/2 SETTINGS
             frame).
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

```
REQUIREMENT: HTTP/3 connections MUST satisfy the same TLS requirements as
             HTTP/1.1 and HTTP/2 connections. The requireHttps() combinator
             (§85) MUST recognize QUIC-based TLS 1.3 negotiation. Certificate
             validation (§85), certificate pinning (§85), certificate revocation
             checking (§106), and cipher suite restriction MUST apply to QUIC
             connections. The transport adapter MUST expose TLS metadata (version,
             cipher suite, certificate chain) for QUIC connections in the same
             format as TCP-based TLS metadata.
             Reference: 21 CFR 11.30, NIST SP 800-52 Rev. 2.
```

```
REQUIREMENT: When HTTP/2 connection coalescing is active (multiple origins
             sharing a single TCP/TLS connection), certificate validation and
             certificate pinning MUST be performed per-origin, not per-connection.
             A certificate that covers origin A but not origin B MUST NOT be
             used for requests to origin B, even if the transport connection is
             shared. The transport adapter MUST expose per-origin certificate
             metadata.
             Reference: 21 CFR 11.30, RFC 9113 §9.1.1.
```

```
RECOMMENDED: GxP deployments using HTTP/2 SHOULD disable server push
             (SETTINGS_ENABLE_PUSH=0) unless the organization has validated
             that pushed responses are correctly captured in the audit trail.
             Server push introduces unsolicited data that complicates the
             request/response pairing model used by HttpHistoryEntry and
             HttpOperationAuditEntry.
```

```
RECOMMENDED: GxP deployments SHOULD include protocol version (HTTP/1.1, h2,
             h3) in the HttpOperationAuditEntry metadata to enable post-hoc
             analysis of protocol-specific behavior. The protocol version
             SHOULD be captured from the transport adapter's connection metadata
             and included as an additional field in audit entries.
```

```
RECOMMENDED: PQ benchmarks (§99c) SHOULD be executed for each protocol version
             supported by the deployment. Multiplexing behavior in HTTP/2 and
             HTTP/3 can significantly affect concurrent operation throughput
             (PQ-HT-04) and audit bridge throughput (PQ-HT-02). Organizations
             SHOULD document protocol-specific PQ results separately.
```

---

_Previous: [12 - Testing](./12-testing.md)_

_Next: [14 - API Reference](./14-api-reference.md)_
