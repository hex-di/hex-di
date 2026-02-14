# 09 - Scoped Clients

## 45. Per-Request Context

HexDI's scoping model enables per-request HTTP clients that automatically carry request-scoped context -- correlation IDs, auth tokens, tenant identifiers -- without passing them manually through every service call.

The pattern: a **singleton** base adapter provides the raw HTTP transport. A **scoped** adapter wraps it with context-specific headers. Each scope (HTTP request, job, WebSocket connection) gets its own wrapped client.

```
Root Container (singleton)
├── FetchHttpClientAdapter         → raw HTTP transport
│
├── Request Scope A (correlation: "abc-123")
│   └── ScopedHttpClientAdapter    → wraps base + correlation + auth headers
│
├── Request Scope B (correlation: "def-456")
│   └── ScopedHttpClientAdapter    → wraps base + correlation + auth headers
│
└── Request Scope C (correlation: "ghi-789")
    └── ScopedHttpClientAdapter    → wraps base + correlation + auth headers
```

## 46. Scoped Adapter Pattern

A scoped adapter depends on the base `HttpClientPort` (singleton) and context ports (scoped), then composes a client with per-scope headers:

```typescript
// The scoped HTTP client port -- distinct from the base HttpClientPort
const ScopedHttpClientPort = port<HttpClient>()({
  name: "ScopedHttpClient",
  direction: "outbound",
  description: "HTTP client with per-scope context (correlation, auth)",
  category: "infrastructure",
});

const ScopedHttpClientAdapter = createAdapter({
  provides: ScopedHttpClientPort,
  requires: [HttpClientPort, CorrelationIdPort, AuthTokenPort],
  lifetime: "scoped",
  factory: ({ HttpClient: base, CorrelationId: corrId, AuthToken: token }) =>
    pipe(
      base,
      HttpClient.defaultHeaders({
        "X-Correlation-Id": corrId,
        Authorization: `Bearer ${token}`,
      })
    ),
});
```

### Usage in Services

Services that need per-request context depend on `ScopedHttpClientPort`:

```typescript
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [ScopedHttpClientPort],
  lifetime: "scoped",
  factory: ({ ScopedHttpClient: http }) => ({
    getById: (id: string) =>
      pipe(http, HttpClient.baseUrl("https://api.example.com"))
        .get(`/users/${id}`)
        .andThen(res => res.json)
        .map(data => data as User),
  }),
});
```

### Scope Lifecycle

When a scope is disposed, all scoped HTTP client instances are released. No cleanup is needed beyond scope disposal -- the scoped client holds no resources (the singleton base transport manages connections).

## 47. Correlation Propagation

HTTP requests propagate correlation IDs for distributed tracing across service boundaries:

```typescript
// Correlation ID port (scoped -- one per request)
const CorrelationIdPort = port<string>()({
  name: "CorrelationId",
  direction: "inbound",
  description: "Request correlation ID for distributed tracing",
  category: "observability",
});

// Adapter that reads from incoming request header or generates a new one
const CorrelationIdAdapter = createAdapter({
  provides: CorrelationIdPort,
  requires: [IncomingRequestPort],
  lifetime: "scoped",
  factory: ({ IncomingRequest: req }) => req.headers["x-correlation-id"] ?? crypto.randomUUID(),
});
```

The scoped HTTP client adapter (§46) picks up the correlation ID from the scope and attaches it to every outgoing request. This creates an end-to-end trace:

```
Client → [X-Correlation-Id: abc-123] → API Gateway
  → [X-Correlation-Id: abc-123] → User Service
    → [X-Correlation-Id: abc-123] → Database Service
```

### W3C Traceparent Integration

When `@hex-di/tracing` is in the graph, the scoped client can also propagate W3C `traceparent` and `tracestate` headers:

```typescript
const TracingHttpClientAdapter = createAdapter({
  provides: ScopedHttpClientPort,
  requires: [HttpClientPort, TracerPort],
  lifetime: "scoped",
  factory: ({ HttpClient: base, Tracer: tracer }) => {
    const span = tracer.getActiveSpan();
    const traceparent = span ? `00-${span.context.traceId}-${span.context.spanId}-01` : undefined;

    return pipe(
      base,
      HttpClient.mapRequest(req =>
        traceparent ? pipe(req, HttpRequest.setRequestHeader("traceparent", traceparent)) : req
      )
    );
  },
});
```

## 48. Multi-Tenancy

Scoped clients enable multi-tenant configurations where each tenant has a different base URL, credentials, or API version:

```typescript
const TenantConfigPort = port<TenantConfig>()({
  name: "TenantConfig",
  direction: "inbound",
});

interface TenantConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly apiVersion: string;
}

const TenantHttpClientAdapter = createAdapter({
  provides: ScopedHttpClientPort,
  requires: [HttpClientPort, TenantConfigPort],
  lifetime: "scoped",
  factory: ({ HttpClient: base, TenantConfig: tenant }) =>
    pipe(
      base,
      HttpClient.baseUrl(tenant.baseUrl),
      HttpClient.defaultHeaders({
        "X-Api-Key": tenant.apiKey,
        "X-Api-Version": tenant.apiVersion,
      })
    ),
});
```

### Graph Wiring

```typescript
const graph = GraphBuilder.create()
  // Singleton: raw transport
  .provide(FetchHttpClientAdapter)
  // Scoped: per-tenant configuration
  .provide(TenantConfigAdapter)
  .provide(TenantHttpClientAdapter)
  // Application services depend on ScopedHttpClientPort
  .provide(OrderServiceAdapter)
  .provide(InventoryServiceAdapter)
  .build();

// Per-request: create a scope with tenant context
const tenantScope = container.createScope({
  name: `tenant-${tenantId}`,
});
const orderService = tenantScope.resolve(OrderServicePort);
// All outgoing HTTP requests through orderService use the tenant's base URL and API key
```

---

_Previous: [08 - Platform Adapters](./08-platform-adapters.md)_

_Next: [10 - Integration](./10-integration.md)_
