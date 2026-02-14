# 01 - Overview & Philosophy

## 1. Overview

`@hex-di/http-client` extends HexDI with a platform-agnostic HTTP client that respects hexagonal architecture. The HTTP client is a real `DirectedPort`, every platform implementation is a real `Adapter`, and Container is the single runtime managing resolution, scoping, and disposal.

There is no global fetch wrapper. There is no axios instance. There is no request configuration scattered across services. HTTP requests flow through Container like any other service:

```typescript
const http = container.resolve(HttpClientPort);

const result = await http.get("https://api.example.com/users").promise;

result.match(
  response => console.log("Status:", response.status),
  error => console.error("Failed:", error.message)
);
```

### What this package provides

- **Core types** (`HttpRequest`, `HttpResponse`, `Headers`, `UrlParams`, `HttpBody`) as immutable value objects
- **Request builders** (`get`, `post`, `put`, `patch`, `del`, `head`, `options`) with pipeable combinators for headers, URL params, body, auth, and signals
- **Response accessors** (`json`, `text`, `arrayBuffer`, `blob`, `formData`, `stream`) returning `ResultAsync<T, HttpResponseError>`
- **Error types** (`HttpRequestError`, `HttpResponseError`, `HttpBodyError`) as discriminated unions with typed reason variants
- **HttpClient port** (`HttpClientPort`) as a real `DirectedPort<HttpClient, "HttpClient", "outbound">`
- **Client combinators** (`baseUrl`, `filterStatusOk`, `retry`, `retryTransient`, `timeout`, `mapRequest`, `mapResponse`, `tapRequest`, `tapResponse`, `catchError`) for composable middleware
- **Fetch adapter** (built-in, zero external dependencies) for browsers, Node 18+, Deno, Bun, Cloudflare Workers
- **Introspection** (`HttpClientInspectorPort`) for request history, active requests, latency stats, and live events
- **Testing utilities** (`createMockHttpClient`, `recordingClient`, `mockResponse`, vitest matchers) in `@hex-di/http-client-testing`

### What this package does NOT provide

- No WebSocket/SSE client (protocol-specific adapters belong in `@hex-di/stream` adapters)
- No GraphQL client (GraphQL-specific concerns belong in a dedicated package)
- No cookie jar / session management (stateful session handling belongs in framework-specific middleware)
- No HTML parsing or DOM manipulation (response consumption is raw data -- JSON, text, binary, stream)
- No built-in caching layer (HTTP caching belongs in a combinator or separate cache package; `@hex-di/query` handles data-level caching)
- No automatic retry-after parsing (retry policies are explicit combinators, not implicit behaviors)

### 0.1.0 Scope

- `HttpRequest` immutable value objects with all combinators
- `HttpResponse` with lazy body accessors returning `ResultAsync`
- `HttpClientError` discriminated union (`HttpRequestError | HttpResponseError | HttpBodyError`)
- `HttpClientPort` as `DirectedPort<HttpClient, "HttpClient", "outbound">`
- `HttpClient` interface with `execute`, `get`, `post`, `put`, `patch`, `del`, `head`
- Client combinators: `baseUrl`, `defaultHeaders`, `bearerAuth`, `filterStatusOk`, `filterStatus`, `mapRequest`, `mapRequestResult`, `mapResponse`, `tapRequest`, `tapResponse`, `tapError`, `retry`, `retryTransient`, `timeout`, `catchError`
- `FetchHttpClientAdapter` (built-in, universal)
- `HttpClientInspectorPort` / `HttpClientRegistryPort` -- introspection
- Testing: `createMockHttpClient`, `createRecordingClient`, `mockResponse`, `MockHttpClientAdapter`, vitest matchers

## 2. Philosophy

### HTTP is a service

In HexDI, services are provided through ports and implemented by adapters. An HTTP client is no different. A REST API client is a service that sends requests and receives responses. The port defines the contract (what operations are available). The adapter provides the implementation (fetch, node:http, undici, mock).

### The port IS the dependency

Traditional HTTP libraries create client instances ad-hoc in services or modules. Client configuration is scattered across factory functions, interceptors, and middleware. There is no compile-time validation that an HTTP client is available.

In HexDI HttpClient, the **port IS the dependency**. `HttpClientPort` is a unique, type-safe token. It participates in the dependency graph. If no adapter provides it, `GraphBuilder` reports a compile-time error.

```typescript
// Traditional: ad-hoc, no DI, no graph validation
const client = axios.create({ baseURL: "https://api.example.com" });

// HexDI: port-based, fully typed, graph-validated
const http = container.resolve(HttpClientPort);
```

### Adapters replace platform coupling

Traditional HTTP libraries embed platform-specific code wherever requests are made:

```typescript
// Service knows about fetch, AbortController, JSON parsing, error handling
const response = await fetch("https://api.example.com/users", {
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(5000),
});
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const users = await response.json();
```

HexDI HttpClient separates the contract from the implementation:

```typescript
// Port: declares WHAT HTTP capability is needed
const HttpClientPort = port<HttpClient>()({
  name: "HttpClient",
  direction: "outbound",
});

// Adapter: declares HOW to implement it (platform-specific)
const FetchHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: "singleton",
  factory: () => createFetchHttpClient(),
});

// Service: declares WHAT it needs, nothing about HOW
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [HttpClientPort],
  factory: ({ HttpClient: http }) => ({
    getAll: () =>
      http
        .get("/api/users")
        .andThen(res => res.json)
        .map(data => data as ReadonlyArray<User>),
  }),
});
```

Benefits:

1. **Testability** -- swap `FetchHttpClientAdapter` for `MockHttpClientAdapter` without touching services
2. **Platform agnosticism** -- same service code runs in browser, Node.js, Bun, Cloudflare Workers
3. **DI integration** -- adapters declare dependencies on `AuthPort`, `LoggerPort`, `TracerPort`
4. **Multi-tenancy** -- different graphs per tenant with different base URLs or credentials
5. **Type safety** -- errors are typed values, not thrown exceptions
6. **GxP compliance** -- built-in audit integrity (FNV-1a hash chains on history entries), monotonic timing (`monotonicNow()` for NTP-immune durations), immutable error objects (`Object.freeze()`), audit externalization (`HttpAuditSink`), and disabled-audit warnings (`HTTP_WARN_001`). For full regulatory compliance (HTTPS enforcement, SHA-256 audit trails, credential protection, payload integrity), deploy with `@hex-di/guard`. See [17 - GxP Compliance Guide](./17-gxp-compliance.md) for the complete regulatory mapping

### Errors are values

HTTP operations fail. Networks are unreliable. Servers return errors. Bodies fail to parse. HexDI HttpClient treats every failure as a typed value in the `Result` channel:

```typescript
// Every method returns ResultAsync -- never throws
const result = await http.get("/api/users").promise;

result.match(
  response => handleSuccess(response),
  error => {
    switch (error._tag) {
      case "HttpRequestError":
        // Network failure, timeout, abort
        log.warn("Request failed:", error.reason, error.message);
        break;
      case "HttpResponseError":
        // Non-2xx status, decode failure
        log.error("Response error:", error.status, error.reason);
        break;
    }
  }
);
```

### Combinators replace middleware

Traditional HTTP libraries use middleware stacks with opaque execution order, shared mutable state, and framework-specific APIs. HexDI HttpClient uses **functional composition** -- each combinator wraps the client and returns a new client:

```typescript
// No middleware stack. No interceptor array. No global state.
// Each combinator wraps the client -- execution order is visible in the code.
const apiClient = pipe(
  baseClient,
  HttpClient.baseUrl("https://api.example.com"),
  HttpClient.bearerAuth(token),
  HttpClient.filterStatusOk,
  HttpClient.retryTransient({ times: 3 }),
  HttpClient.timeout(10_000)
);
```

## 3. Package Structure

```
http-client/
├── core/                              # @hex-di/http-client
│   ├── src/
│   │   ├── request/
│   │   │   ├── request.ts             # HttpRequest type & constructors
│   │   │   ├── headers.ts             # Headers type & combinators
│   │   │   ├── url-params.ts          # UrlParams type & combinators
│   │   │   ├── body.ts                # HttpBody type & combinators
│   │   │   └── types.ts               # Shared request types
│   │   ├── response/
│   │   │   ├── response.ts            # HttpResponse type & accessors
│   │   │   ├── status.ts              # Status utilities (isOk, isRedirect, etc.)
│   │   │   └── types.ts               # Shared response types
│   │   ├── client/
│   │   │   ├── client.ts              # HttpClient interface
│   │   │   ├── combinators.ts         # Client combinators (baseUrl, retry, etc.)
│   │   │   └── types.ts               # RequestOptions, client config types
│   │   ├── errors/
│   │   │   ├── types.ts               # Error discriminated unions
│   │   │   ├── constructors.ts        # Error factory functions
│   │   │   ├── guards.ts              # Type guards
│   │   │   └── codes.ts               # HTTP0xx error codes
│   │   ├── ports/
│   │   │   ├── http-client-port.ts    # HttpClientPort definition
│   │   │   ├── guards.ts             # Port type guards
│   │   │   └── types.ts              # Port type definitions
│   │   ├── adapters/
│   │   │   ├── fetch/
│   │   │   │   ├── fetch-client.ts    # createFetchHttpClient implementation
│   │   │   │   └── adapter.ts         # FetchHttpClientAdapter
│   │   │   └── types.ts              # Adapter config types
│   │   ├── introspection/
│   │   │   ├── inspector.ts           # HttpClientInspector implementation
│   │   │   ├── registry.ts            # HttpClientRegistry implementation
│   │   │   ├── snapshot.ts            # Snapshot types
│   │   │   └── events.ts             # InspectorEvent types
│   │   ├── integration/
│   │   │   ├── ports.ts               # Inspector/Registry ports
│   │   │   ├── inspector-adapter.ts   # createHttpClientInspectorAdapter
│   │   │   ├── registry-adapter.ts    # createHttpClientRegistryAdapter
│   │   │   └── tracing-bridge.ts      # HttpClientTracingHook
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── node/                              # @hex-di/http-client-node
│   ├── src/
│   │   ├── node-client.ts             # node:http/node:https implementation
│   │   ├── undici-client.ts           # undici-based implementation
│   │   ├── adapters.ts                # NodeHttpClientAdapter, UndiciHttpClientAdapter
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── bun/                               # @hex-di/http-client-bun
│   ├── src/
│   │   ├── bun-client.ts             # Bun-native implementation
│   │   ├── adapter.ts                # BunHttpClientAdapter
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── testing/                           # @hex-di/http-client-testing
    ├── src/
    │   ├── mock-client.ts             # createMockHttpClient
    │   ├── recording-client.ts        # createRecordingClient
    │   ├── response-factory.ts        # mockResponse, mockJsonResponse
    │   ├── mock-adapter.ts            # MockHttpClientAdapter for graph
    │   ├── matchers.ts                # setupHttpClientMatchers for vitest
    │   └── index.ts
    ├── package.json
    └── tsconfig.json
```

### Dependency Graph

```
                    @hex-di/core
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    @hex-di/graph   @hex-di/runtime  @hex-di/result
          │              │              │
          └──────────────┼──────────────┘
                         │
                  @hex-di/http-client
                    │    │    │
              ┌─────┘    │    └──────────────────┐
              ▼     (optional)                   ▼
    @hex-di/        ▼                   @hex-di/
    http-client-  @hex-di/tracing       http-client-
    node                                bun
              │                              │
              └──────────┬───────────────────┘
                         ▼
                  @hex-di/http-client-testing
```

**Optional integration:** When `@hex-di/tracing` is in the graph, HTTP requests automatically produce tracing spans via the resolution hooks system. When `@hex-di/logger` is in the graph, request/response logging is available via the `withLogging` combinator. No explicit dependency is required -- the integrations are hook-based or combinator-based.

## 4. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Application Services                              │
│        UserService  OrderService  PaymentService  NotificationService       │
├─────────────────────────────────────────────────────────────────────────────┤
│                       Container (single runtime)                            │
│                                                                             │
│  ┌────────────────────┐  ┌────────────────────────────────┐                │
│  │ HttpClientInspector │  │ Infrastructure Ports            │                │
│  │ (singleton)         │  │ Auth, Logger, Tracer, Config    │                │
│  └────────────────────┘  └────────────────────────────────┘                │
├─────────────────────────────────────────────────────────────────────────────┤
│                          Client Resolution                                  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       Client Combinators                              │  │
│  │                                                                       │  │
│  │  baseUrl ──► bearerAuth ──► filterStatusOk ──► retryTransient        │  │
│  │  ──► timeout ──► tapRequest (logging) ──► tapResponse (metrics)       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      Platform Adapters                                │  │
│  │                                                                       │  │
│  │  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐              │  │
│  │  │ Fetch        │  │ Node.js       │  │ Bun          │              │  │
│  │  │ Adapter      │  │ Adapter       │  │ Adapter      │              │  │
│  │  │ (universal)  │  │ (node:http)   │  │ (bun native) │              │  │
│  │  └──────────────┘  └───────────────┘  └──────────────┘              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                              PORT (Contract)                                │
│                                                                             │
│  HttpClientPort = DirectedPort<HttpClient, "HttpClient", "outbound">        │
│  Defines WHAT HTTP capability is needed. Direction: outbound (sends         │
│  requests to external infrastructure).                                      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                          REQUEST / RESPONSE                                 │
│                                                                             │
│  HttpRequest  ──execute()──►  HttpResponse                                  │
│  (immutable)                  (lazy body accessors)                         │
│                                                                             │
│  Errors: HttpRequestError | HttpResponseError | HttpBodyError               │
│  (discriminated unions, never thrown, always Result)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

_Next: [02 - Core Types](./02-core-types.md)_
