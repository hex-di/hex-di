# @hex-di/http-client

Platform-agnostic HTTP client for HexDI with typed errors, immutable requests, and composable combinators. Transport adapters are separate packages -- pick the HTTP library your platform supports.

## Features

- **Immutable requests** -- `HttpRequest` values built with pipeable combinators
- **Typed errors** -- discriminated union (`HttpRequestError | HttpResponseError | HttpBodyError`), never thrown
- **8 transport adapters** -- Fetch, Axios, Got, Ky, Ofetch, Node.js, Undici, Bun (separate packages)
- **Client combinators** -- `baseUrl`, `filterStatusOk`, `retry`, `timeout`, `bearerAuth`, `mapRequest`, `mapResponse`
- **Security combinators** -- `requireHttps`, `withSsrfProtection`, `withCredentialProtection`, `withPayloadIntegrity`
- **ResultAsync responses** -- lazy body accessors (`json`, `text`, `arrayBuffer`, `blob`, `stream`)
- **Testing utilities** -- mock client, recording client, response factories, assertion matchers
- **Introspection** -- request history, latency stats, health derivation

## Installation

```bash
pnpm add @hex-di/http-client @hex-di/http-client-fetch
```

Peer dependencies: `@hex-di/core`, `@hex-di/result`

The core package contains types, ports, combinators, and testing utilities. Install a transport adapter package for the actual HTTP implementation.

## Quick Start

### With DI Container

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { HttpClientPort } from "@hex-di/http-client";
import { FetchHttpClientAdapter } from "@hex-di/http-client-fetch";

const graph = GraphBuilder.create().add(FetchHttpClientAdapter).build();

const container = createContainer({ graph, name: "App" });
const http = container.resolve(HttpClientPort);

const result = await http.get("https://api.example.com/users").promise;

result.match(
  response => console.log("Status:", response.status),
  error => console.error("Failed:", error._tag, error.message)
);
```

### Standalone

```typescript
import { createHttpClient } from "@hex-di/http-client";

// With any transport function
const http = createHttpClient(fetchTransport);

const result = await http.get("https://api.example.com/users").promise;
```

## HttpClient Port

`HttpClientPort` defines the primary interface. All request methods return a `ResultAsync` wrapping either an `HttpResponse` or an `HttpClientError`.

```typescript
import { HttpClientPort, createHttpClient } from "@hex-di/http-client";
import type { HttpClient } from "@hex-di/http-client";
```

Request methods: `get`, `post`, `put`, `patch`, `delete`, `head`, `options`.

```typescript
// GET
const users = await http.get("/users").promise;

// POST with JSON body
const created = await http.post("/users", {
  body: JSON.stringify({ name: "Alice" }),
  headers: { "content-type": "application/json" },
}).promise;

// Response body accessors (lazy, cached)
const response = users.unwrap();
const data = await response.json(); // parsed JSON
const text = await response.text(); // raw string
const buf = await response.arrayBuffer();
```

## Error Types

Errors form a discriminated union via the `_tag` field. They are always returned through `Result`, never thrown.

```typescript
import {
  httpRequestError,
  httpResponseError,
  httpBodyError,
  isHttpRequestError,
  isHttpResponseError,
  isHttpBodyError,
  isTransientError,
  isRateLimitError,
} from "@hex-di/http-client";
import type {
  HttpRequestError,
  HttpResponseError,
  HttpBodyError,
  HttpClientError,
} from "@hex-di/http-client";
```

| Error Type          | `_tag`                | Description                                      |
| ------------------- | --------------------- | ------------------------------------------------ |
| `HttpRequestError`  | `"HttpRequestError"`  | Request failed to send (network, DNS, timeout)   |
| `HttpResponseError` | `"HttpResponseError"` | Response received but status indicates error     |
| `HttpBodyError`     | `"HttpBodyError"`     | Body parsing failed (invalid JSON, stream error) |

```typescript
result.mapErr(error => {
  switch (error._tag) {
    case "HttpRequestError":
      console.error("Network error:", error.message);
      break;
    case "HttpResponseError":
      console.error("Status:", error.response.status);
      break;
    case "HttpBodyError":
      console.error("Parse error:", error.message);
      break;
  }
});
```

## Client Combinators

Combinators wrap an `HttpClient` to add cross-cutting behavior. They compose via function application.

```typescript
import {
  baseUrl,
  bearerAuth,
  filterStatusOk,
  retry,
  timeout,
  defaultHeaders,
  mapRequest,
  mapResponse,
  tapRequest,
  tapResponse,
  tapError,
  catchError,
  catchAll,
  dynamicAuth,
} from "@hex-di/http-client";

// Compose a configured client
const api = baseUrl(
  "https://api.example.com",
  bearerAuth("my-token", filterStatusOk(timeout(5000, retry({ times: 3 }, http))))
);

const result = await api.get("/users").promise;
```

| Combinator                        | Description                                      |
| --------------------------------- | ------------------------------------------------ |
| `baseUrl(url, client)`            | Prepend base URL to all requests                 |
| `bearerAuth(token, client)`       | Add `Authorization: Bearer` header               |
| `dynamicAuth(getToken, client)`   | Dynamic token resolution per request             |
| `defaultHeaders(headers, client)` | Merge default headers                            |
| `filterStatusOk(client)`          | Convert non-2xx responses to `HttpResponseError` |
| `filterStatus(predicate, client)` | Custom status filtering                          |
| `retry(opts, client)`             | Retry failed requests with backoff               |
| `retryTransient(opts, client)`    | Retry only transient errors                      |
| `timeout(ms, client)`             | Abort requests exceeding timeout                 |
| `mapRequest(fn, client)`          | Transform outgoing requests                      |
| `mapResponse(fn, client)`         | Transform incoming responses                     |
| `tapRequest(fn, client)`          | Side-effect on request (logging, metrics)        |
| `tapResponse(fn, client)`         | Side-effect on response                          |
| `tapError(fn, client)`            | Side-effect on error                             |
| `catchError(fn, client)`          | Recover from specific errors                     |
| `catchAll(fn, client)`            | Recover from all errors                          |

### Resilience Combinators

```typescript
import { circuitBreaker, rateLimit, responseCache } from "@hex-di/http-client";

const resilient = circuitBreaker(
  { threshold: 5, resetTimeout: 30000 },
  rateLimit({ maxRequests: 100, window: 60000 }, http)
);
```

### Interceptor Chains

```typescript
import { interceptor, composeInterceptors } from "@hex-di/http-client";

const logging = interceptor({
  onRequest: req => {
    console.log("->", req.method, req.url);
    return req;
  },
  onResponse: res => {
    console.log("<-", res.status);
    return res;
  },
});

const client = composeInterceptors([logging], http);
```

## Security Combinators

For hardening HTTP clients in production and regulated environments:

```typescript
import {
  requireHttps,
  withSsrfProtection,
  withCredentialProtection,
  withHstsEnforcement,
  withCsrfProtection,
  withPayloadIntegrity,
  withPayloadValidation,
  withTokenLifecycle,
} from "@hex-di/http-client";
```

| Combinator                         | Description                                 |
| ---------------------------------- | ------------------------------------------- |
| `requireHttps(client)`             | Reject non-HTTPS requests                   |
| `withSsrfProtection(client)`       | Block requests to private/internal IPs      |
| `withCredentialProtection(client)` | Strip credentials on cross-origin redirects |
| `withHstsEnforcement(client)`      | Enforce HSTS policy                         |
| `withCsrfProtection(client)`       | Add CSRF tokens                             |
| `withPayloadIntegrity(client)`     | Verify response payload integrity           |
| `withPayloadValidation(client)`    | Validate request/response payloads          |
| `withTokenLifecycle(client)`       | Token refresh and revocation                |

## Transport Adapters

Transport adapters are separate packages. Each implements the transport layer for a specific HTTP library.

| Package                      | Platform                               | Peer Dependencies |
| ---------------------------- | -------------------------------------- | ----------------- |
| `@hex-di/http-client-fetch`  | Browsers, Node 18+, Deno, Bun, Workers | --                |
| `@hex-di/http-client-axios`  | Browsers, Node.js                      | `axios >= 1.6`    |
| `@hex-di/http-client-got`    | Node.js only                           | `got >= 14`       |
| `@hex-di/http-client-ky`     | Universal (Fetch-based)                | `ky >= 1.0`       |
| `@hex-di/http-client-ofetch` | Universal                              | `ofetch >= 1.3`   |
| `@hex-di/http-client-node`   | Node.js                                | --                |
| `@hex-di/http-client-undici` | Node.js (HTTP/2)                       | `undici >= 6`     |
| `@hex-di/http-client-bun`    | Bun                                    | --                |

## Testing

The core package includes testing utilities with no additional peer dependencies required.

```typescript
import {
  createMockHttpClient,
  createRecordingClient,
  mockResponse,
  mockJsonResponse,
  mockStreamResponse,
  mockRequestError,
  createMockHttpClientAdapter,
  assertOk,
  assertErr,
  assertStatus,
  assertRequestError,
  assertResponseError,
  assertMethod,
  assertUrlContains,
} from "@hex-di/http-client";
```

### Mock Client

Route-based mock client with glob matching:

```typescript
const mock = createMockHttpClient({
  "GET /users": () => mockJsonResponse(200, { users: [] }),
  "POST /users": () => mockJsonResponse(201, { id: "1" }),
  "GET /users/*": () => mockJsonResponse(200, { id: "1", name: "Alice" }),
});

const result = await mock.get("/users").promise;
assertOk(result);
assertStatus(result, 200);
```

### Recording Client

Wraps any client to record all requests and responses:

```typescript
const { client, getRecordings } = createRecordingClient(http);

await client.get("/users").promise;
await client.post("/users", { body: "{}" }).promise;

const recordings = getRecordings();
// recordings[0].request.method === "GET"
// recordings[1].request.method === "POST"
```

### Response Factories

```typescript
const ok = mockResponse(200);
const notFound = mockResponse(404, { text: "Not found" });
const json = mockJsonResponse(200, { data: [1, 2, 3] });
const error = mockRequestError("Transport", "Connection refused");
```

### Assertion Matchers

```typescript
assertOk(result); // Assert result is Ok, returns HttpResponse
assertErr(result); // Assert result is Err, returns error
assertStatus(result, 200); // Assert response status, returns HttpResponse
assertRequestError(result, "Transport"); // Assert HttpRequestError with reason
assertResponseError(result); // Assert HttpResponseError

// assertMethod and assertUrlContains take HttpResponse (from assertOk/assertStatus)
const response = assertOk(result);
assertMethod(response, "GET");
assertUrlContains(response, "/users");
```

## API Reference

### Ports

| Export                        | Kind     | Description                                      |
| ----------------------------- | -------- | ------------------------------------------------ |
| `HttpClientPort`              | port     | Primary HTTP client port                         |
| `createHttpClient(transport)` | function | Create standalone client from transport function |

### Core Types

| Export                   | Kind | Description              |
| ------------------------ | ---- | ------------------------ |
| `HttpClient`             | type | HTTP client interface    |
| `HttpClientError`        | type | Union of all error types |
| `RequestOptions`         | type | Request configuration    |
| `RequestOptionsWithBody` | type | Request config with body |

### Error Types

| Export                                              | Kind     | Description                 |
| --------------------------------------------------- | -------- | --------------------------- |
| `HttpRequestError`                                  | type     | Network/transport error     |
| `HttpResponseError`                                 | type     | Non-OK status error         |
| `HttpBodyError`                                     | type     | Body parsing error          |
| `httpRequestError(reason, request, msg)`            | function | Create request error        |
| `httpResponseError(reason, request, response, msg)` | function | Create response error       |
| `httpBodyError(reason, msg)`                        | function | Create body error           |
| `isHttpClientError(e)`                              | function | Guard for any HTTP error    |
| `isHttpRequestError(e)`                             | function | Guard for request error     |
| `isHttpResponseError(e)`                            | function | Guard for response error    |
| `isHttpBodyError(e)`                                | function | Guard for body error        |
| `isTransientError(e)`                               | function | Guard for retryable errors  |
| `isRateLimitError(e)`                               | function | Guard for rate limit errors |

### Client Combinators

| Export                               | Kind     | Description               |
| ------------------------------------ | -------- | ------------------------- |
| `baseUrl(url, client)`               | function | Prepend base URL          |
| `bearerAuth(token, client)`          | function | Bearer token auth         |
| `dynamicAuth(fn, client)`            | function | Dynamic auth              |
| `defaultHeaders(h, client)`          | function | Merge default headers     |
| `filterStatusOk(client)`             | function | Reject non-2xx            |
| `filterStatus(pred, client)`         | function | Custom status filter      |
| `retry(opts, client)`                | function | Retry with backoff        |
| `retryTransient(opts, client)`       | function | Retry transient errors    |
| `timeout(ms, client)`                | function | Request timeout           |
| `mapRequest(fn, client)`             | function | Transform requests        |
| `mapResponse(fn, client)`            | function | Transform responses       |
| `mapRequestResult(fn, client)`       | function | Transform request Result  |
| `mapResponseResult(fn, client)`      | function | Transform response Result |
| `tapRequest(fn, client)`             | function | Side-effect on request    |
| `tapResponse(fn, client)`            | function | Side-effect on response   |
| `tapError(fn, client)`               | function | Side-effect on error      |
| `catchError(fn, client)`             | function | Recover from error        |
| `catchAll(fn, client)`               | function | Recover from all errors   |
| `wrapClient(client, wrapper)`        | function | Generic client wrapper    |
| `circuitBreaker(config, client)`     | function | Circuit breaker pattern   |
| `rateLimit(config, client)`          | function | Rate limiting             |
| `responseCache(config, client)`      | function | Response caching          |
| `interceptor(config)`                | function | Create interceptor        |
| `composeInterceptors(chain, client)` | function | Compose interceptor chain |

### Security Combinators

| Export                             | Kind     | Description             |
| ---------------------------------- | -------- | ----------------------- |
| `requireHttps(client)`             | function | Reject non-HTTPS        |
| `withSsrfProtection(client)`       | function | Block private IPs       |
| `withCredentialProtection(client)` | function | Strip creds on redirect |
| `withHstsEnforcement(client)`      | function | HSTS enforcement        |
| `withCsrfProtection(client)`       | function | CSRF tokens             |
| `withPayloadIntegrity(client)`     | function | Payload integrity       |
| `withPayloadValidation(client)`    | function | Payload validation      |
| `withTokenLifecycle(client)`       | function | Token lifecycle         |

### Testing

| Export                                      | Kind     | Description                          |
| ------------------------------------------- | -------- | ------------------------------------ |
| `createMockHttpClient(routes)`              | function | Route-based mock client              |
| `createRecordingClient(client)`             | function | Record all requests                  |
| `createMockHttpClientAdapter(config)`       | function | DI adapter for mock client           |
| `mockResponse(status, opts?)`               | function | Create mock response                 |
| `mockJsonResponse(status, body, opts?)`     | function | Create JSON mock response            |
| `mockStreamResponse(status, chunks, opts?)` | function | Create streaming mock response       |
| `mockRequestError(reason, msg?, req?)`      | function | Create mock request error            |
| `assertOk(result)`                          | function | Assert Result is Ok, return response |
| `assertErr(result)`                         | function | Assert Result is Err, return error   |
| `assertStatus(result, status)`              | function | Assert response status               |
| `assertRequestError(result, reason)`        | function | Assert HttpRequestError with reason  |
| `assertResponseError(result)`               | function | Assert HttpResponseError             |
| `assertMethod(response, method)`            | function | Assert request method on response    |
| `assertUrlContains(response, substr)`       | function | Assert URL contains string           |

## Related Packages

| Package                       | Description                                                          |
| ----------------------------- | -------------------------------------------------------------------- |
| `@hex-di/http-client-fetch`   | Fetch API transport adapter (browsers, Node 18+, Deno, Bun, Workers) |
| `@hex-di/http-client-axios`   | Axios transport adapter                                              |
| `@hex-di/http-client-got`     | Got transport adapter (Node.js)                                      |
| `@hex-di/http-client-ky`      | Ky transport adapter (universal)                                     |
| `@hex-di/http-client-ofetch`  | Ofetch transport adapter (universal)                                 |
| `@hex-di/http-client-node`    | Node.js native transport adapter                                     |
| `@hex-di/http-client-undici`  | Undici transport adapter (HTTP/2)                                    |
| `@hex-di/http-client-bun`     | Bun-native transport adapter                                         |
| `@hex-di/http-client-testing` | Extended test utilities with Vitest matchers                         |
| `@hex-di/http-client-react`   | React hooks: `useHttpClient`, `useHttpRequest`, `useHttpMutation`    |

## License

MIT
