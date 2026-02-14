# 07 - Client Combinators

## 29. Combinator Philosophy

HexDI HttpClient does **not** have a middleware stack. Instead, the client itself is transformed via composable functions. Each combinator takes an `HttpClient` and returns a new `HttpClient` that wraps the original. Execution order is visible in the code -- read top to bottom.

```typescript
type ClientCombinator = (client: HttpClient) => HttpClient;
```

Combinators compose via `pipe()`:

```typescript
const apiClient = pipe(
  baseClient,
  HttpClient.baseUrl("https://api.example.com"),
  HttpClient.bearerAuth(token),
  HttpClient.filterStatusOk,
  HttpClient.retryTransient({ times: 3 }),
  HttpClient.timeout(10_000)
);
```

### Execution Order

Combinators execute in the order they are composed:

1. `baseUrl` -- prepends the base URL to the request
2. `bearerAuth` -- adds the Authorization header
3. `filterStatusOk` -- wraps the response to reject non-2xx status codes
4. `retryTransient` -- retries on transient failures (transport errors, 5xx, 429)
5. `timeout` -- aborts if the entire operation (including retries) exceeds the timeout

The **request** flows top-to-bottom through request transformers. The **response** flows bottom-to-top through response transformers. This is the same evaluation model as function composition: `timeout(retryTransient(filterStatusOk(bearerAuth(baseUrl(baseClient)))))`.

## 30. Request Transformation

### mapRequest

Synchronously transform every outgoing request:

```typescript
function mapRequest(f: (request: HttpRequest) => HttpRequest): (client: HttpClient) => HttpClient;
```

```typescript
const client = pipe(
  baseClient,
  HttpClient.mapRequest(req => pipe(req, HttpRequest.setRequestHeader("x-app-version", "1.2.3")))
);
```

### mapRequestResult

Transform every outgoing request with a fallible operation:

```typescript
function mapRequestResult(
  f: (request: HttpRequest) => Result<HttpRequest, HttpRequestError>
): (client: HttpClient) => HttpClient;
```

```typescript
const client = pipe(
  baseClient,
  HttpClient.mapRequestResult(req => {
    const url = req.url;
    if (!url.startsWith("https://")) {
      return Result.err(httpRequestError("InvalidUrl", req, "Only HTTPS allowed"));
    }
    return Result.ok(req);
  })
);
```

## 31. Response Transformation

### mapResponse

Synchronously transform every incoming response:

```typescript
function mapResponse(
  f: (response: HttpResponse) => HttpResponse
): (client: HttpClient) => HttpClient;
```

```typescript
// Add a custom header to every response (e.g., for debugging)
const client = pipe(
  baseClient,
  HttpClient.mapResponse(res => ({
    ...res,
    headers: pipe(res.headers, setHeader("x-received-at", String(Date.now()))),
  }))
);
```

### mapResponseResult

Transform every incoming response with a fallible operation:

```typescript
function mapResponseResult(
  f: (response: HttpResponse) => Result<HttpResponse, HttpResponseError>
): (client: HttpClient) => HttpClient;
```

## 32. Status Filtering

### filterStatusOk

Reject non-2xx responses as `HttpResponseError`:

```typescript
function filterStatusOk(client: HttpClient): HttpClient;
```

After applying `filterStatusOk`, any response with a status code outside 200-299 is converted to an `HttpResponseError` with `reason: "StatusCode"`. The original response is preserved in the error for inspection.

```typescript
const client = HttpClient.filterStatusOk(baseClient);

const result = await client.get("/api/users").promise;
// If status 200: Ok(response)
// If status 404: Err({ _tag: "HttpResponseError", reason: "StatusCode", status: 404, response, ... })
```

### filterStatus

Custom status filter:

```typescript
function filterStatus(predicate: (status: number) => boolean): (client: HttpClient) => HttpClient;
```

```typescript
// Accept 2xx and 3xx
const client = pipe(
  baseClient,
  HttpClient.filterStatus(s => s >= 200 && s < 400)
);
```

## 33. Base URL & Default Headers

### baseUrl

Prepend a base URL to every request:

```typescript
function baseUrl(url: string): (client: HttpClient) => HttpClient;
```

Internally calls `mapRequest(req => pipe(req, HttpRequest.prependUrl(url)))`.

```typescript
const client = pipe(baseClient, HttpClient.baseUrl("https://api.example.com/v2"));

// client.get("/users") → GET https://api.example.com/v2/users
// client.get("/orders/123") → GET https://api.example.com/v2/orders/123
```

### defaultHeaders

Set default headers on every request (does not overwrite existing headers):

```typescript
function defaultHeaders(
  headers: Readonly<Record<string, string>>
): (client: HttpClient) => HttpClient;
```

```typescript
const client = pipe(
  baseClient,
  HttpClient.defaultHeaders({
    Accept: "application/json",
    "X-Api-Version": "2024-01-01",
  })
);
```

**Merge behavior:** Default headers are applied only when the request does not already have a header with the same key. This allows per-request overrides.

## 34. Authentication

### bearerAuth

Set the `Authorization: Bearer <token>` header on every request:

```typescript
function bearerAuth(token: string): (client: HttpClient) => HttpClient;
```

```typescript
const client = pipe(
  baseClient,
  HttpClient.baseUrl("https://api.example.com"),
  HttpClient.bearerAuth("tok_abc123")
);
```

### basicAuth

Set the `Authorization: Basic <base64>` header on every request:

```typescript
function basicAuth(username: string, password: string): (client: HttpClient) => HttpClient;
```

### dynamicAuth

Set the `Authorization` header dynamically per request:

```typescript
function dynamicAuth(
  getToken: (request: HttpRequest) => ResultAsync<string, HttpRequestError>
): (client: HttpClient) => HttpClient;
```

```typescript
// Token that refreshes on expiry
const client = pipe(
  baseClient,
  HttpClient.dynamicAuth(async () => {
    const token = await tokenStore.getValidToken();
    return Result.ok(`Bearer ${token}`);
  })
);
```

## 35. Side-Effect Tapping

### tapRequest

Run a side-effect on every outgoing request (logging, metrics, tracing):

```typescript
function tapRequest(f: (request: HttpRequest) => void): (client: HttpClient) => HttpClient;
```

```typescript
const client = pipe(
  baseClient,
  HttpClient.tapRequest(req => console.log(`→ ${req.method} ${req.url}`))
);
```

### tapResponse

Run a side-effect on every successful response:

```typescript
function tapResponse(
  f: (response: HttpResponse, request: HttpRequest) => void
): (client: HttpClient) => HttpClient;
```

```typescript
const client = pipe(
  baseClient,
  HttpClient.tapResponse((res, req) => console.log(`← ${res.status} ${req.method} ${req.url}`))
);
```

### tapError

Run a side-effect on every error:

```typescript
function tapError(
  f: (error: HttpClientError, request: HttpRequest) => void
): (client: HttpClient) => HttpClient;
```

```typescript
const client = pipe(
  baseClient,
  HttpClient.tapError((err, req) =>
    metrics.increment("http.errors", {
      method: req.method,
      tag: err._tag,
      reason: err.reason,
    })
  )
);
```

## 36. Retry

### retry

Retry failed requests with configurable policy:

```typescript
function retry(options: RetryOptions): (client: HttpClient) => HttpClient;

interface RetryOptions {
  /** Maximum number of retry attempts */
  readonly times: number;

  /** Only retry if this predicate returns true. Default: retry all errors. */
  readonly while?: (error: HttpClientError) => boolean;

  /**
   * Delay before each retry attempt (in ms).
   * Receives the attempt number (0-based) and the error.
   * Default: no delay.
   */
  readonly delay?: (attempt: number, error: HttpClientError) => number;
}
```

```typescript
const client = pipe(
  baseClient,
  HttpClient.retry({
    times: 3,
    while: isTransientError,
    delay: attempt => Math.min(1000 * Math.pow(2, attempt), 10_000), // exponential backoff
  })
);
```

### retryTransient

Convenience combinator that retries only transient errors with exponential backoff:

```typescript
function retryTransient(options?: {
  /** Maximum retry attempts. Default: 3. */
  readonly times?: number;

  /**
   * Delay function. Default: exponential backoff with jitter.
   * Base delay: 500ms, max delay: 10s.
   */
  readonly delay?: (attempt: number, error: HttpClientError) => number;

  /** Additional predicate (ANDed with built-in transient check). */
  readonly while?: (error: HttpClientError) => boolean;
}): (client: HttpClient) => HttpClient;
```

The built-in transient check retries:

- `HttpRequestError` with reason `"Transport"` or `"Timeout"`
- `HttpResponseError` with reason `"StatusCode"` and status `429` or `5xx` (except `501`, `505`)

```typescript
// Default: 3 retries with exponential backoff
const client = pipe(baseClient, HttpClient.filterStatusOk, HttpClient.retryTransient());

// Custom: 5 retries, fixed delay
const client2 = pipe(
  baseClient,
  HttpClient.filterStatusOk,
  HttpClient.retryTransient({
    times: 5,
    delay: () => 1_000, // fixed 1s delay
  })
);
```

### Design Note: Retry Placement

`retryTransient` should be placed **after** `filterStatusOk` in the combinator chain so that status code errors are converted to `HttpResponseError` before the retry predicate evaluates them.

## 37. Timeout

### timeout

Set a timeout for the entire operation (including retries):

```typescript
function timeout(ms: number): (client: HttpClient) => HttpClient;
```

When the timeout is exceeded, the client returns `HttpRequestError` with `reason: "Timeout"`.

```typescript
const client = pipe(
  baseClient,
  HttpClient.retryTransient({ times: 3 }),
  HttpClient.timeout(30_000) // 30s total including retries
);
```

### Per-Request vs Client-Level Timeout

- **Per-request:** `HttpRequest.withTimeout(ms)` applies to a single request
- **Client-level:** `HttpClient.timeout(ms)` applies to every request made through this client (including retries)

When both are set, the shorter timeout wins.

## 38. Error Recovery

### catchError

Catch and recover from specific error types:

```typescript
function catchError<E extends HttpClientError["_tag"]>(
  tag: E,
  handler: (
    error: Extract<HttpClientError, { _tag: E }>
  ) => ResultAsync<HttpResponse, HttpClientError>
): (client: HttpClient) => HttpClient;
```

```typescript
// Fall back to a cached response on network failure
const client = pipe(
  baseClient,
  HttpClient.catchError("HttpRequestError", error => {
    if (error.reason === "Transport") {
      return cache.getResponse(error.request.url);
    }
    return ResultAsync.err(error);
  })
);
```

### catchAll

Catch all errors:

```typescript
function catchAll(
  handler: (error: HttpClientError) => ResultAsync<HttpResponse, HttpClientError>
): (client: HttpClient) => HttpClient;
```

---

_Previous: [06 - HttpClient Port](./06-http-client-port.md)_

_Next: [08 - Platform Adapters](./08-platform-adapters.md)_
