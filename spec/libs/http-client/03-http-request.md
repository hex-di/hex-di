# 03 - HttpRequest

## §9. HttpRequest Interface

An `HttpRequest` is an immutable, frozen value object representing an outgoing HTTP request. Requests are built with constructor functions and transformed with pipeable combinators. No mutation, no classes, no builder pattern.

```typescript
declare const HTTP_REQUEST_SYMBOL: unique symbol;

interface HttpRequest {
  readonly [HTTP_REQUEST_SYMBOL]: true;
  readonly method: HttpMethod;
  readonly url: string;
  readonly urlParams: UrlParams;
  readonly headers: Headers;
  readonly body: HttpBody;
  readonly signal: AbortSignal | undefined;
  readonly timeoutMs: number | undefined;
}
```

### Key Properties

- **Immutable** -- request instances are frozen after creation with `Object.freeze()`
- **Composable** -- every combinator returns a new `HttpRequest`; the original is unchanged
- **Inspectable** -- all fields are public and readable for logging, tracing, and testing
- **Serializable** -- the request structure (minus `signal` and stream body) is JSON-serializable for debugging

### Display String

Every request provides a human-readable method+URL string for logging and error messages:

```typescript
function requestMethodAndUrl(request: HttpRequest): string;
// "GET https://api.example.com/users?page=1"
```

## §10. Request Constructors

One constructor per HTTP method. Each returns a frozen `HttpRequest` with the given method and URL, empty headers, empty params, empty body, and no signal.

```typescript
function get(url: string | URL): HttpRequest;
function head(url: string | URL): HttpRequest;
function post(url: string | URL): HttpRequest;
function put(url: string | URL): HttpRequest;
function patch(url: string | URL): HttpRequest;
function del(url: string | URL): HttpRequest;
function options(url: string | URL): HttpRequest;
```

When a `URL` object is passed, it is converted to a string. Query parameters in the URL string are parsed into the `urlParams` field.

### Usage

```typescript
import { HttpRequest } from "@hex-di/http-client";

const req = HttpRequest.get("https://api.example.com/users");
// { method: "GET", url: "https://api.example.com/users", urlParams: {}, headers: {}, body: EmptyBody, ... }

const reqWithParams = HttpRequest.get("https://api.example.com/users?page=1&limit=20");
// urlParams contains [["page", "1"], ["limit", "20"]]
```

### Generic Constructor

For dynamic method selection:

```typescript
function request(method: HttpMethod, url: string | URL): HttpRequest;
```

## §11. Header Combinators

Pipeable functions that transform the request's headers. Each returns a new `HttpRequest`.

```typescript
/** Set a single header (overwrites existing) */
function setRequestHeader(key: string, value: string): (req: HttpRequest) => HttpRequest;

/** Set multiple headers at once (overwrites existing) */
function setRequestHeaders(
  headers: Readonly<Record<string, string>>
): (req: HttpRequest) => HttpRequest;

/** Append to an existing header (comma-separated) */
function appendRequestHeader(key: string, value: string): (req: HttpRequest) => HttpRequest;

/** Remove a header */
function removeRequestHeader(key: string): (req: HttpRequest) => HttpRequest;

/** Set Authorization: Bearer <token> */
function bearerToken(token: string): (req: HttpRequest) => HttpRequest;

/** Set Authorization: Basic <base64(user:pass)> */
function basicAuth(username: string, password: string): (req: HttpRequest) => HttpRequest;

/** Set Accept: application/json */
function acceptJson(req: HttpRequest): HttpRequest;

/** Set Accept header to a custom media type */
function accept(mediaType: string): (req: HttpRequest) => HttpRequest;

/** Set Content-Type header */
function contentType(mediaType: string): (req: HttpRequest) => HttpRequest;
```

### Usage

```typescript
const req = pipe(
  HttpRequest.post("https://api.example.com/users"),
  HttpRequest.bearerToken("tok_abc123"),
  HttpRequest.acceptJson,
  HttpRequest.setRequestHeader("x-request-id", "req_001")
);
```

## §12. URL Combinators

Pipeable functions that transform the request's URL and parameters.

```typescript
/** Prepend a base URL to the request URL */
function prependUrl(baseUrl: string): (req: HttpRequest) => HttpRequest;

/** Append a path segment to the request URL */
function appendUrl(path: string): (req: HttpRequest) => HttpRequest;

/** Set URL search parameters (replaces all existing params) */
function setUrlParams(params: UrlParamsInput): (req: HttpRequest) => HttpRequest;

/** Append URL search parameters (preserves existing) */
function appendUrlParams(params: UrlParamsInput): (req: HttpRequest) => HttpRequest;

/** Set a single URL search parameter */
function setUrlParam(
  key: string,
  value: string | number | boolean
): (req: HttpRequest) => HttpRequest;
```

### URL Resolution

`prependUrl` performs simple string concatenation with normalization:

```typescript
const req = pipe(HttpRequest.get("/users"), HttpRequest.prependUrl("https://api.example.com"));
// URL: "https://api.example.com/users"

const req2 = pipe(HttpRequest.get("/users"), HttpRequest.prependUrl("https://api.example.com/v2/"));
// URL: "https://api.example.com/v2/users" (double slash normalized)
```

`appendUrl` appends a path segment:

```typescript
const req = pipe(
  HttpRequest.get("https://api.example.com/users"),
  HttpRequest.appendUrl("/123/profile")
);
// URL: "https://api.example.com/users/123/profile"
```

## §13. Body Combinators

Pipeable functions that set the request body. Most are pure (return `HttpRequest`). `bodyJson` is fallible (returns `Result<HttpRequest, HttpBodyError>`) because JSON serialization can fail.

### Pure Body Combinators

```typescript
/** Set a plain text body */
function bodyText(text: string, contentType?: string): (req: HttpRequest) => HttpRequest;

/** Set a binary body */
function bodyUint8Array(data: Uint8Array, contentType?: string): (req: HttpRequest) => HttpRequest;

/** Set a URL-encoded form body */
function bodyUrlEncoded(params: UrlParamsInput): (req: HttpRequest) => HttpRequest;

/** Set a FormData body */
function bodyFormData(data: FormData): (req: HttpRequest) => HttpRequest;

/** Set a streaming body */
function bodyStream(
  stream: ReadableStream<Uint8Array>,
  options?: {
    readonly contentType?: string;
    readonly contentLength?: number;
  }
): (req: HttpRequest) => HttpRequest;
```

### Fallible Body Combinator

```typescript
/** Set a JSON body. Returns Result because JSON.stringify can fail. */
function bodyJson(value: unknown): (req: HttpRequest) => Result<HttpRequest, HttpBodyError>;
```

`bodyJson` calls `JSON.stringify` and wraps any thrown error (e.g., circular reference) in an `HttpBodyError` with `reason: "JsonSerialize"`. On success, it also sets `Content-Type: application/json`.

### Usage

```typescript
// Pure body (text) -- no Result wrapping needed
const textReq = pipe(
  HttpRequest.post("https://api.example.com/log"),
  HttpRequest.bodyText("Something happened")
);

// Fallible body (JSON) -- returns Result
const jsonReqResult = pipe(
  HttpRequest.post("https://api.example.com/users"),
  HttpRequest.bearerToken("tok_abc"),
  HttpRequest.bodyJson({ name: "Alice", role: "admin" })
);
// Result<HttpRequest, HttpBodyError>

// Chain with HTTP client
const response = jsonReqResult.asyncAndThen(req => http.execute(req));
```

### Design Note: Why bodyJson Returns Result

JSON serialization can fail for values containing:

- Circular references
- BigInt values (without a custom replacer)
- Non-serializable objects (functions, symbols)

Rather than throwing at serialization time and losing the typed error chain, `bodyJson` captures the failure in the `Result` channel where it composes naturally with the rest of the pipeline.

## §14. Signal & Timeout

```typescript
/** Attach an AbortSignal to the request */
function withSignal(signal: AbortSignal): (req: HttpRequest) => HttpRequest;

/** Set a timeout in milliseconds. Creates an internal AbortSignal. */
function withTimeout(ms: number): (req: HttpRequest) => HttpRequest;
```

### Signal Semantics

- When `signal` is set, the transport adapter passes it to the underlying transport
- When `signal` is aborted, the request is cancelled and the client returns `HttpRequestError` with `reason: "Aborted"`
- `withTimeout` sets the `timeoutMs` field; the adapter creates an `AbortSignal.timeout(ms)` and combines it with any existing signal using `AbortSignal.any()`
- If both `withSignal` and `withTimeout` are used, the first abort wins

### Usage

```typescript
const controller = new AbortController();

const req = pipe(
  HttpRequest.get("https://api.example.com/slow"),
  HttpRequest.withSignal(controller.signal),
  HttpRequest.withTimeout(5_000)
);

// Later: cancel the request
controller.abort();
```

---

_Previous: [02 - Core Types](./02-core-types.md)_

_Next: [04 - HttpResponse](./04-http-response.md)_

> **Tests**: [HttpRequest Tests (RQ-001–RQ-020)](./17-definition-of-done.md#httprequest-tests)
