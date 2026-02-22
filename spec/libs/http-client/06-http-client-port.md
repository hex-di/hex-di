# 06 - HttpClient Port

## §25. HttpClient Interface

The core abstraction. `HttpClient` provides a `ResultAsync`-based API for executing HTTP requests. All methods return `ResultAsync<HttpResponse, HttpRequestError>` -- never throw.

```typescript
interface HttpClient {
  /**
   * Execute an arbitrary pre-built HttpRequest.
   * This is the low-level method that all convenience methods delegate to.
   */
  readonly execute: (request: HttpRequest) => ResultAsync<HttpResponse, HttpRequestError>;

  /** Send a GET request */
  readonly get: (
    url: string | URL,
    options?: RequestOptions
  ) => ResultAsync<HttpResponse, HttpRequestError>;

  /** Send a POST request */
  readonly post: (
    url: string | URL,
    options?: RequestOptionsWithBody
  ) => ResultAsync<HttpResponse, HttpRequestError>;

  /** Send a PUT request */
  readonly put: (
    url: string | URL,
    options?: RequestOptionsWithBody
  ) => ResultAsync<HttpResponse, HttpRequestError>;

  /** Send a PATCH request */
  readonly patch: (
    url: string | URL,
    options?: RequestOptionsWithBody
  ) => ResultAsync<HttpResponse, HttpRequestError>;

  /** Send a DELETE request */
  readonly del: (
    url: string | URL,
    options?: RequestOptions
  ) => ResultAsync<HttpResponse, HttpRequestError>;

  /** Send a HEAD request */
  readonly head: (
    url: string | URL,
    options?: RequestOptions
  ) => ResultAsync<HttpResponse, HttpRequestError>;
}
```

### Convenience Methods

The convenience methods (`get`, `post`, `put`, `patch`, `del`, `head`) are syntactic sugar over `execute`. They construct an `HttpRequest` from the URL and options, then delegate:

```typescript
// These are equivalent:
http.get("/api/users", { headers: { Accept: "application/json" } });

http.execute(
  pipe(HttpRequest.get("/api/users"), HttpRequest.setRequestHeaders({ Accept: "application/json" }))
);
```

### Error Type

The base `HttpClient` returns `ResultAsync<HttpResponse, HttpRequestError>`. Client combinators like `filterStatusOk` widen the error type to include `HttpResponseError`. The error type is structural -- downstream code sees the actual error union returned by the composed client.

```typescript
// Base client: only network errors
const base: HttpClient;
base.get("/api/users"); // ResultAsync<HttpResponse, HttpRequestError>

// After filterStatusOk: network + status errors
const filtered = HttpClient.filterStatusOk(base);
filtered.get("/api/users"); // ResultAsync<HttpResponse, HttpRequestError | HttpResponseError>
```

## §26. HttpClientPort

The DI port definition. Programs depend on this -- never on a concrete adapter.

```typescript
declare const HTTP_CLIENT_PORT_SYMBOL: unique symbol;

const HttpClientPort = port<HttpClient>()({
  name: "HttpClient",
  direction: "outbound",
  description: "Platform-agnostic HTTP client for making outbound requests",
  category: "infrastructure",
  tags: ["http", "network", "io"],
});
```

### Port Direction

`HttpClientPort` uses `"outbound"` direction. The application sends requests to external infrastructure -- data flows outward from domain to infrastructure. This is the opposite of `StreamPort` (inbound) or `QueryPort` (inbound) which provide data into the application.

### Relationship to DirectedPort

```typescript
// HttpClientPort IS a DirectedPort, not a wrapper
type AssertHttpClientIsDirected =
  typeof HttpClientPort extends DirectedPort<HttpClient, "HttpClient", "outbound"> ? true : never;

// Participates in GraphBuilder validation
const graph = GraphBuilder.create()
  .provide(FetchHttpClientAdapter) // Provides HttpClientPort
  .provide(UserServiceAdapter) // Requires HttpClientPort
  .build();
// If FetchHttpClientAdapter is missing, TypeScript reports a compile-time error
```

### Brand Symbol

The `HTTP_CLIENT_PORT_SYMBOL` allows runtime identification:

```typescript
function isHttpClientPort(value: unknown): value is typeof HttpClientPort {
  return (
    typeof value === "object" &&
    value !== null &&
    HTTP_CLIENT_PORT_SYMBOL in value &&
    value[HTTP_CLIENT_PORT_SYMBOL] === true
  );
}
```

## §27. RequestOptions

Options passed to convenience methods (`get`, `post`, etc.) as an alternative to building requests with combinators.

```typescript
interface RequestOptions {
  /** Headers to include in the request */
  readonly headers?: Readonly<Record<string, string>>;

  /** URL search parameters to append */
  readonly urlParams?: UrlParamsInput;

  /** AbortSignal for cancellation */
  readonly signal?: AbortSignal;

  /** Timeout in milliseconds */
  readonly timeout?: number;
}

interface RequestOptionsWithBody extends RequestOptions {
  /** Request body (raw HttpBody) */
  readonly body?: HttpBody;

  /**
   * JSON body (convenience -- serialized via JSON.stringify).
   * If both `body` and `json` are provided, `json` takes precedence.
   */
  readonly json?: unknown;
}
```

### Usage

```typescript
// Using options (convenient for simple cases)
const result = await http.post("/api/users", {
  json: { name: "Alice", role: "admin" },
  headers: { "X-Request-Id": "req_001" },
  timeout: 5_000,
}).promise;

// Using combinators (powerful for complex cases)
const req = pipe(
  HttpRequest.post("/api/users"),
  HttpRequest.bearerToken("tok_abc"),
  HttpRequest.setRequestHeader("X-Request-Id", "req_001"),
  HttpRequest.withTimeout(5_000),
  HttpRequest.bodyJson({ name: "Alice", role: "admin" })
);
// req is Result<HttpRequest, HttpBodyError>
```

### Design Note: Two Styles

The HttpClient API supports two request-building styles:

1. **Options object** -- for simple, one-off requests where brevity matters
2. **Combinator pipeline** -- for complex requests with multiple transformations, reusable request templates, or when working with the `Result` chain from `bodyJson`

Both styles are first-class. The options style delegates to the combinator style internally.

## §28. Type Inference Utilities

Following the established `InferenceError` pattern from `@hex-di/core`:

```typescript
/** Extract the HttpClient service type from HttpClientPort */
type InferHttpClient<T> = [T] extends [DirectedPort<infer TService, string, "outbound">]
  ? TService extends HttpClient
    ? TService
    : InferenceError<"InferHttpClient", "Port service type does not extend HttpClient.", T>
  : InferenceError<
      "InferHttpClient",
      "Expected an outbound DirectedPort. Use InferHttpClient<typeof HttpClientPort>.",
      T
    >;
```

### Usage

```typescript
type Client = InferHttpClient<typeof HttpClientPort>; // HttpClient

// Error case
type Bad = InferHttpClient<string>;
// InferenceError<"InferHttpClient", "Expected an outbound DirectedPort...", string>
```

---

_Previous: [05 - Error Types](./05-error-types.md)_

_Next: [07 - Client Combinators](./07-client-combinators.md)_

> **Tests**: [HttpClient Port Tests (PT-001–PT-005)](./17-definition-of-done.md#httpclient-port-tests)
