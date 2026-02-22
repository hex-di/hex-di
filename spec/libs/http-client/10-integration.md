# 10 - Integration

## §49. DI Ports

The HTTP client library exposes three DI ports for integration with the HexDI container inspection system, following the pattern established by `@hex-di/flow` and `@hex-di/store`:

```typescript
import { port, createLibraryInspectorPort } from "@hex-di/core";

/** Port for the HTTP client inspector service */
const HttpClientInspectorPort = port<HttpClientInspector>()({
  name: "HttpClientInspector",
});

/** Port for the HTTP client registry service */
const HttpClientRegistryPort = port<HttpClientRegistry>()({
  name: "HttpClientRegistry",
});

/** Port for the library-level inspector bridge */
const HttpClientLibraryInspectorPort = createLibraryInspectorPort()({
  name: "HttpClientLibraryInspector",
});

/**
 * Port for the optional audit sink (GxP-only).
 * When provided, the inspector externalizes history entries
 * with integrity hashes to this sink for long-term storage.
 * See §55b for the HttpAuditSink interface.
 */
const HttpAuditSinkPort = port<HttpAuditSink>()({
  name: "HttpAuditSink",
});
```

These ports are resolved from Container like any other service. They must be explicitly registered via their respective adapter factories. `HttpAuditSinkPort` is optional and only needed in GxP environments where audit externalization is required.

### Library Inspector Bridge

The `HttpClientLibraryInspectorPort` bridges the HTTP client's domain-specific inspector into the ecosystem-wide `LibraryInspector` protocol. This follows the exact pattern from `packages/tracing/src/inspection/library-inspector-bridge.ts` and the 5 other libraries (`tracing`, `logger`, `store`, `saga`, `flow`, `query`).

#### Bridge Factory

```typescript
function createHttpClientLibraryInspector(inspector: HttpClientInspector): LibraryInspector;
```

The bridge MUST:

- Return `name: "http-client"`
- `getSnapshot()` returns `Object.freeze({...})` containing: `totalRequests`, `activeRequests`, `errorRate`, `averageLatencyMs`, `p95LatencyMs`, `p99LatencyMs`, `totalRetries`, `health`, `combinatorChain`, `circuitBreakers`, `rateLimiters`, `caches`
- `subscribe(listener)` wraps `HttpClientInspectorEvent` into `LibraryEvent` with `source: "http-client"`
- `isLibraryInspector()` type guard returns `true`

#### Frozen Singleton Adapter

```typescript
const HttpClientLibraryInspectorAdapter = Object.freeze({
  provides: HttpClientLibraryInspectorPort,
  requires: [HttpClientInspectorPort] as const,
  lifetime: "singleton" as const,
  factoryKind: "sync" as const,
  clonable: false as const,
  factory: (deps: { readonly HttpClientInspector: HttpClientInspector }) =>
    createHttpClientLibraryInspector(deps.HttpClientInspector),
});
```

#### Auto-Registration

Because the port uses `createLibraryInspectorPort()` (which sets `category: "library-inspector"`), the container's `afterResolve` hook auto-registers it -- no manual `registerLibrary()` call is needed. The bridge becomes available to the ecosystem inspector as soon as it is resolved.

### Graph Registration

```typescript
const graph = GraphBuilder.create()
  // Application adapters
  .provide(FetchHttpClientAdapter)
  .provide(UserServiceAdapter)
  // Introspection adapters (explicit registration)
  .provide(createHttpClientRegistryAdapter())
  .provide(createHttpClientInspectorAdapter({ maxHistoryEntries: 500 }))
  .provide(createHttpClientLibraryInspectorAdapter())
  .build();

const container = await createContainer({ graph, name: "app" }).initialize();
const inspector = container.resolve(HttpClientInspectorPort);
```

### Graph Registration with Audit Sink (GxP)

In GxP environments, register an audit sink adapter to externalize history entries with integrity hashes:

```typescript
const graph = GraphBuilder.create()
  // Application adapters
  .provide(FetchHttpClientAdapter)
  .provide(UserServiceAdapter)
  // Audit sink adapter (GxP-only)
  .provide(
    createAdapter({
      provides: HttpAuditSinkPort,
      lifetime: "singleton",
      factory: () => createDatabaseAuditSink({ table: "http_audit_log" }),
    })
  )
  // Introspection adapters with audit sink
  .provide(createHttpClientRegistryAdapter())
  .provide(
    createHttpClientInspectorAdapter({
      mode: "full",
      maxHistoryEntries: 1000,
      auditSink: container.resolve(HttpAuditSinkPort),
    })
  )
  .provide(createHttpClientLibraryInspectorAdapter())
  .build();
```

## §50. Tracing Integration

Optional integration with `@hex-di/tracing`. When a tracer is available in the container, HTTP requests automatically produce tracing spans.

### withTracing Combinator

```typescript
function withTracing(options?: HttpClientTracingOptions): (client: HttpClient) => HttpClient;

interface HttpClientTracingOptions {
  /** Span name prefix. Default: "HTTP". */
  readonly spanNamePrefix?: string;

  /** Record request headers as span attributes. Default: false. */
  readonly recordRequestHeaders?: boolean;

  /** Record response headers as span attributes. Default: false. */
  readonly recordResponseHeaders?: boolean;

  /** Record request body size as span attribute. Default: true. */
  readonly recordBodySize?: boolean;

  /** Headers to redact from span attributes. Default: ["authorization", "cookie", "set-cookie"]. */
  readonly redactHeaders?: readonly string[];

  /** Propagate W3C traceparent header on outgoing requests. Default: true. */
  readonly propagateContext?: boolean;
}
```

### Span Attributes

HTTP tracing spans use OpenTelemetry semantic conventions:

| Attribute                   | Type   | Description                        |
| --------------------------- | ------ | ---------------------------------- |
| `http.request.method`       | string | HTTP method (GET, POST, etc.)      |
| `url.full`                  | string | Full request URL                   |
| `url.path`                  | string | URL path component                 |
| `http.response.status_code` | number | HTTP status code                   |
| `http.request.body.size`    | number | Request body size in bytes         |
| `http.response.body.size`   | number | Response body size in bytes        |
| `server.address`            | string | Server hostname                    |
| `server.port`               | number | Server port                        |
| `error.type`                | string | Error tag (HttpRequestError, etc.) |
| `hex-di.http.retry_count`   | number | Number of retries attempted        |
| `hex-di.http.scope_id`      | string | Scope ID if scoped client          |

### Span Hierarchy

```
[http] HTTP POST https://api.example.com/users        (request lifetime)
  ├── attribute: http.request.method = "POST"
  ├── attribute: url.full = "https://api.example.com/users"
  ├── attribute: http.response.status_code = 201
  ├── attribute: http.request.body.size = 42
  └── attribute: http.response.body.size = 128
```

### Usage

```typescript
const client = pipe(
  baseClient,
  HttpClient.withTracing({
    recordRequestHeaders: true,
    redactHeaders: ["authorization", "x-api-key"],
  }),
  HttpClient.baseUrl("https://api.example.com"),
  HttpClient.filterStatusOk
);
```

### Conditional Integration

Tracing is opt-in. When `@hex-di/tracing` is not in the dependency graph, the `withTracing` combinator is a no-op passthrough:

```typescript
// With tracing: spans are created per request
const graph = GraphBuilder.create()
  .provide(FetchHttpClientAdapter)
  .provide(tracerAdapter) // Enables tracing
  .build();

// Without tracing: no overhead
const graph = GraphBuilder.create().provide(FetchHttpClientAdapter).build();
```

## §51. Logger Integration

Optional integration with `@hex-di/logger`. The `withLogging` combinator adds structured request/response logging.

### withLogging Combinator

```typescript
function withLogging(
  logger: Logger,
  options?: HttpClientLoggingOptions
): (client: HttpClient) => HttpClient;

interface HttpClientLoggingOptions {
  /** Log level for successful requests. Default: "debug". */
  readonly successLevel?: "trace" | "debug" | "info";

  /** Log level for client errors (4xx). Default: "warn". */
  readonly clientErrorLevel?: "warn" | "error";

  /** Log level for server errors (5xx). Default: "error". */
  readonly serverErrorLevel?: "error";

  /** Log level for network errors. Default: "error". */
  readonly networkErrorLevel?: "error";

  /** Log request body (truncated). Default: false. */
  readonly logRequestBody?: boolean;

  /** Maximum body length to log. Default: 1024. */
  readonly maxBodyLength?: number;

  /** Headers to redact in logs. Default: ["authorization", "cookie", "x-api-key"]. */
  readonly redactHeaders?: readonly string[];
}
```

### Log Format

```typescript
// Request log
logger.debug("HTTP request", {
  method: "POST",
  url: "https://api.example.com/users",
  headers: { "content-type": "application/json", authorization: "[REDACTED]" },
});

// Response log
logger.debug("HTTP response", {
  method: "POST",
  url: "https://api.example.com/users",
  status: 201,
  durationMs: 142,
  bodySize: 128,
});

// Error log
logger.error("HTTP error", {
  method: "POST",
  url: "https://api.example.com/users",
  error: "HttpRequestError",
  reason: "Transport",
  message: "ECONNREFUSED",
});
```

### GxP Log Retention Alignment

```
REQUIREMENT: When gxp is true, operational logs produced by the withLogging()
             combinator for HTTP operations on GxP data MUST be retained for at
             least the same duration as the corresponding HttpOperationAuditEntry
             records defined by the HttpAuditRetentionPolicy (§104). This ensures
             that diagnostic context (request/response details, timing, error
             classification) remains available for the full regulatory retention
             period alongside audit trail entries. The log retention period MUST
             be documented in the Validation Plan (§83a).
             Reference: 21 CFR 11.10(e), EU GMP Annex 11 §7, ALCOA+ Enduring.
```

```
RECOMMENDED: Non-GxP deployments SHOULD align log retention with audit trail
             retention when using both withLogging() and withHttpAuditBridge()
             (§97) to ensure complete diagnostic context is available for
             incident investigation. When log retention is shorter than audit
             retention, the organization SHOULD document the rationale.
```

### Usage as Scoped Adapter

For per-scope logging with request context:

```typescript
const LoggingHttpClientAdapter = createAdapter({
  provides: ScopedHttpClientPort,
  requires: [HttpClientPort, LoggerPort],
  lifetime: "scoped",
  factory: ({ HttpClient: base, Logger: logger }) => pipe(base, HttpClient.withLogging(logger)),
});
```

## §52. Query Integration

`@hex-di/query` adapters use `HttpClientPort` as a dependency for data fetching:

```typescript
import { createQueryAdapter } from "@hex-di/query";

const RestUsersAdapter = createQueryAdapter(UsersPort, {
  requires: [HttpClientPort],
  factory:
    ({ HttpClient: http }) =>
    (params, { signal }) => {
      const client = pipe(
        http,
        HttpClient.baseUrl("https://api.example.com"),
        HttpClient.filterStatusOk
      );

      return client
        .get("/api/users", {
          urlParams: params,
          signal,
        })
        .andThen(res => res.json)
        .map(data => data as ReadonlyArray<User>)
        .mapErr(classifyHttpError);
    },
});
```

### Error Classification

A utility function maps `HttpClientError` to domain-specific query errors:

```typescript
function classifyHttpError(error: HttpClientError): QueryError {
  if (isHttpResponseError(error)) {
    switch (error.status) {
      case 401:
        return { _tag: "Unauthorized" };
      case 403:
        return { _tag: "Forbidden" };
      case 404:
        return { _tag: "NotFound" };
      case 429:
        return { _tag: "RateLimited", retryAfterMs: parseRetryAfter(error.response) };
      default:
        if (error.status >= 500) return { _tag: "ServerError", status: error.status };
        return { _tag: "ClientError", status: error.status };
    }
  }
  if (isHttpRequestError(error)) {
    switch (error.reason) {
      case "Timeout":
        return { _tag: "Timeout" };
      case "Aborted":
        return { _tag: "Cancelled" };
      default:
        return { _tag: "NetworkError", message: error.message };
    }
  }
  return { _tag: "Unknown", cause: error };
}
```

## §53. Lifecycle Management

### Singleton Client Lifecycle

The base HTTP client adapter is a singleton -- created once, shared across the application, disposed when the root container is disposed.

```typescript
const container = createContainer(graph);
const http = container.resolve(HttpClientPort);
// http is the same instance throughout the container's lifetime

container.dispose();
// Platform-specific cleanup:
// - Node.js: close HTTP agents, destroy connection pools
// - Undici: close pool, destroy dispatcher
// - Fetch: no cleanup needed (uses shared browser/runtime pool)
```

### Scoped Client Lifecycle

Scoped HTTP clients live for the lifetime of their scope. No special cleanup is needed -- they hold no resources beyond a reference to the singleton base client.

### In-Flight Request Cancellation

When a scope is disposed, any in-flight requests made through scoped clients should be cancelled via `AbortSignal`. The inspector tracks active requests for observability:

```typescript
const scope = container.createScope();
const http = scope.resolve(ScopedHttpClientPort);

// Start a long request
const pendingResult = http.get("/api/slow-endpoint");

// Dispose the scope -- in-flight request is aborted
scope.dispose();

// pendingResult resolves to Err(HttpRequestError { reason: "Aborted" })
```

---

_Previous: [09 - Scoped Clients](./09-scoped-clients.md)_

_Next: [11 - Introspection](./11-introspection.md)_

> **Tests**: [Integration Tests (IT-001–IT-020)](./17-definition-of-done.md#integration-tests)
