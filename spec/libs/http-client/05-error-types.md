# 05 - Error Types

## §19. HttpClientError Union

All HTTP client errors are a discriminated union with `_tag` for exhaustive matching:

```typescript
type HttpClientError = HttpRequestError | HttpResponseError | HttpBodyError;
```

### Error Hierarchy

```
HttpClientError
├── HttpRequestError        (before response -- network, timeout, abort, invalid URL)
│   ├── reason: "Transport"
│   ├── reason: "Timeout"
│   ├── reason: "Aborted"
│   └── reason: "InvalidUrl"
├── HttpResponseError       (after response -- status, decode, empty body)
│   ├── reason: "StatusCode"
│   ├── reason: "Decode"
│   ├── reason: "EmptyBody"
│   └── reason: "BodyAlreadyConsumed"
└── HttpBodyError           (request body construction -- serialization)
    ├── reason: "JsonSerialize"
    └── reason: "Encode"
```

## §20. HttpRequestError

Represents errors that occur **before** a response is received -- network failures, DNS resolution failures, connection refused, timeout, abort, and invalid URLs.

```typescript
interface HttpRequestError {
  readonly _tag: "HttpRequestError";

  /**
   * The category of failure:
   * - "Transport": Network-level failure (DNS, connection refused, TLS error)
   * - "Timeout": Request exceeded the timeout duration
   * - "Aborted": Request was cancelled via AbortSignal
   * - "InvalidUrl": URL could not be parsed or resolved
   */
  readonly reason: "Transport" | "Timeout" | "Aborted" | "InvalidUrl";

  /** The originating request */
  readonly request: HttpRequest;

  /** Human-readable error message */
  readonly message: string;

  /** The underlying platform error (for debugging) */
  readonly cause: unknown;
}
```

### Reason Variants

| Reason         | When                                                    | Retryable |
| -------------- | ------------------------------------------------------- | --------- |
| `"Transport"`  | DNS failure, connection refused, TLS error, socket hang | Yes       |
| `"Timeout"`    | Request exceeded `timeoutMs` or `AbortSignal.timeout()` | Yes       |
| `"Aborted"`    | Caller aborted via `AbortController.abort()`            | No        |
| `"InvalidUrl"` | URL parsing failed (malformed URL)                      | No        |

### Examples

```typescript
// Network failure
{
  _tag: "HttpRequestError",
  reason: "Transport",
  request: { method: "GET", url: "https://api.example.com/users", ... },
  message: "ECONNREFUSED: Connection refused to api.example.com:443",
  cause: <TypeError: fetch failed>
}

// Timeout
{
  _tag: "HttpRequestError",
  reason: "Timeout",
  request: { method: "GET", url: "https://api.example.com/slow", ... },
  message: "Request timed out after 5000ms: GET https://api.example.com/slow",
  cause: <DOMException: The operation was aborted>
}
```

## §21. HttpResponseError

Represents errors derived from the **response** -- non-2xx status codes, body decode failures, empty bodies, and double-consumption of the body.

```typescript
interface HttpResponseError {
  readonly _tag: "HttpResponseError";

  /**
   * The category of failure:
   * - "StatusCode": Non-2xx status code (produced by filterStatusOk)
   * - "Decode": Failed to decode/parse the response body
   * - "EmptyBody": Expected a body but the response was empty
   * - "BodyAlreadyConsumed": Body was already read via a different accessor
   */
  readonly reason: "StatusCode" | "Decode" | "EmptyBody" | "BodyAlreadyConsumed";

  /** The originating request */
  readonly request: HttpRequest;

  /** The response that caused the error */
  readonly response: HttpResponse;

  /** HTTP status code (convenience -- same as response.status) */
  readonly status: number;

  /** Human-readable error message */
  readonly message: string;

  /** The underlying error (JSON parse error, etc.) */
  readonly cause: unknown;
}
```

### Reason Variants

| Reason                  | When                                                | Retryable |
| ----------------------- | --------------------------------------------------- | --------- |
| `"StatusCode"`          | `filterStatusOk` rejected a non-2xx response        | Depends   |
| `"Decode"`              | `response.json` failed to parse JSON                | No        |
| `"EmptyBody"`           | Body accessor called on an empty response           | No        |
| `"BodyAlreadyConsumed"` | Different body accessor called after first consumed | No        |

### Status-Based Retryability

```
4xx responses: Generally NOT retryable (client error)
  - 429 Too Many Requests: Retryable (rate limit)
5xx responses: Generally retryable (server error)
  - 501 Not Implemented: NOT retryable
  - 505 HTTP Version Not Supported: NOT retryable
```

### Examples

```typescript
// Status code error (from filterStatusOk)
{
  _tag: "HttpResponseError",
  reason: "StatusCode",
  request: { method: "POST", url: "https://api.example.com/users", ... },
  response: { status: 422, headers: { ... }, ... },
  status: 422,
  message: "HTTP 422 Unprocessable Entity: POST https://api.example.com/users",
  cause: undefined
}

// JSON decode error
{
  _tag: "HttpResponseError",
  reason: "Decode",
  request: { method: "GET", url: "https://api.example.com/data", ... },
  response: { status: 200, headers: { ... }, ... },
  status: 200,
  message: "Failed to parse response body as JSON: Unexpected token < in JSON at position 0",
  cause: <SyntaxError: Unexpected token <...>
}
```

## §22. HttpBodyError

Represents errors that occur during **request body construction** -- before the request is sent.

```typescript
interface HttpBodyError {
  readonly _tag: "HttpBodyError";

  /**
   * The category of failure:
   * - "JsonSerialize": JSON.stringify failed (circular reference, BigInt, etc.)
   * - "Encode": Body encoding failed (invalid encoding, stream error)
   */
  readonly reason: "JsonSerialize" | "Encode";

  /** Human-readable error message */
  readonly message: string;

  /** The underlying error */
  readonly cause: unknown;
}
```

### Examples

```typescript
// Circular reference in JSON body
const circular: Record<string, unknown> = {};
circular.self = circular;

HttpRequest.bodyJson(circular)(req);
// Err({
//   _tag: "HttpBodyError",
//   reason: "JsonSerialize",
//   message: "Failed to serialize request body as JSON: Converting circular structure to JSON",
//   cause: <TypeError: Converting circular structure to JSON>
// })
```

## §23. Error Constructors & Guards

### Constructors

```typescript
function httpRequestError(
  reason: HttpRequestError["reason"],
  request: HttpRequest,
  message: string,
  cause?: unknown
): HttpRequestError;

function httpResponseError(
  reason: HttpResponseError["reason"],
  request: HttpRequest,
  response: HttpResponse,
  message: string,
  cause?: unknown
): HttpResponseError;

function httpBodyError(
  reason: HttpBodyError["reason"],
  message: string,
  cause?: unknown
): HttpBodyError;
```

### Type Guards

```typescript
/** Check if a value is any HttpClientError */
function isHttpClientError(value: unknown): value is HttpClientError;

/** Check if an error is an HttpRequestError */
function isHttpRequestError(value: unknown): value is HttpRequestError;

/** Check if an error is an HttpResponseError */
function isHttpResponseError(value: unknown): value is HttpResponseError;

/** Check if an error is an HttpBodyError */
function isHttpBodyError(value: unknown): value is HttpBodyError;

/**
 * Check if an error is transient (worth retrying).
 * Returns true for:
 * - HttpRequestError with reason "Transport" or "Timeout"
 * - HttpResponseError with reason "StatusCode" and status 429 or 5xx (except 501, 505)
 */
function isTransientError(error: HttpClientError): boolean;

/**
 * Check if an error is a rate limit (429).
 * Useful for extracting Retry-After headers.
 */
function isRateLimitError(error: HttpClientError): boolean;
```

### Usage

```typescript
const result = await http.get("/api/users").promise;

result.mapErr(error => {
  if (isTransientError(error)) {
    // Worth retrying
    enqueueRetry(error.request);
  } else if (isRateLimitError(error) && isHttpResponseError(error)) {
    // Extract Retry-After header
    const retryAfter = getResponseHeader("retry-after")(error.response);
    scheduleRetry(error.request, Number(retryAfter) * 1000);
  }
});
```

### Immutability

All error constructors (`httpRequestError`, `httpResponseError`, `httpBodyError`) **freeze** the returned object with `Object.freeze()` before returning it. This follows the error freezing pattern established in `packages/core/tests/gxp-integrity.test.ts`.

**Rationale (ALCOA+):** In GxP environments, audit trail entries must be attributable, legible, contemporaneous, original, and accurate per WHO TRS 1033 Annex 4 and MHRA GxP Data Integrity Guidance. If error objects could be mutated after creation, a downstream handler could alter the `reason`, `message`, or `cause` fields -- destroying the original record of what failed (violates ALCOA+ Original principle). Freezing guarantees that the error captured in a history entry or audit sink is identical to the error produced at failure time.

```typescript
const error = httpRequestError("Transport", request, "ECONNREFUSED");

// Frozen -- mutation silently fails in non-strict mode, throws in strict mode
Object.isFrozen(error); // true
```

```
REQUIREMENT: Error constructors (httpRequestError, httpResponseError, httpBodyError) MUST
             follow an exact 3-step construction sequence with zero mutation window:
             1. **Populate**: All fields (reason, message, cause, request, response, status)
                are assigned to a plain object literal in a single expression.
             2. **Freeze**: Object.freeze() is called on the fully-populated object
                immediately — before any reference to the object escapes the constructor.
             3. **Return**: The frozen object is returned to the caller.
             No intermediate reference to the mutable object may be stored, yielded,
             or passed to a callback between steps 1 and 2. This eliminates the
             mutation window between construction and freezing that could allow a
             downstream interceptor to alter error fields before the audit trail
             captures them.
             Test references: EF-001 (populate-freeze-return ordering), EF-002 (no
             intermediate escape), EF-003 (freeze before return), EF-004 (nested cause
             not frozen — intentional, platform errors are opaque), EF-005 (concurrent
             construction produces independent frozen instances).
             Reference: 21 CFR 11.10(e) (audit trail integrity), ALCOA+ Original.
```

## §24. Error Codes

Error codes follow the `HTTP0xx` pattern for identification in logs and monitoring:

| Code      | Error               | Reason                  | Description                            |
| --------- | ------------------- | ----------------------- | -------------------------------------- |
| `HTTP001` | `HttpRequestError`  | `"Transport"`           | Network-level transport failure        |
| `HTTP002` | `HttpRequestError`  | `"Timeout"`             | Request exceeded timeout duration      |
| `HTTP003` | `HttpRequestError`  | `"Aborted"`             | Request cancelled via AbortSignal      |
| `HTTP004` | `HttpRequestError`  | `"InvalidUrl"`          | URL parsing or resolution failed       |
| `HTTP010` | `HttpResponseError` | `"StatusCode"`          | Non-2xx status code rejected by filter |
| `HTTP011` | `HttpResponseError` | `"Decode"`              | Response body decode/parse failed      |
| `HTTP012` | `HttpResponseError` | `"EmptyBody"`           | Expected body but response was empty   |
| `HTTP013` | `HttpResponseError` | `"BodyAlreadyConsumed"` | Body accessed after prior consumption  |
| `HTTP020` | `HttpBodyError`     | `"JsonSerialize"`       | JSON.stringify failed on request body  |
| `HTTP021` | `HttpBodyError`     | `"Encode"`              | Request body encoding failed           |

### Code Accessor

```typescript
function errorCode(error: HttpClientError): string;
```

### Error Code Namespace Cross-Reference

When GxP transport security combinators are deployed alongside `@hex-di/http-client`, additional error codes from the transport security layer supplement the `HTTP0xx` namespace. The namespaces are designed to be non-overlapping:

| Namespace              | Source                              | Error Codes                                                                                                                                                                        | Scope                                            |
| ---------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `HTTP0xx`              | `@hex-di/http-client`               | `HTTP001`-`HTTP021`                                                                                                                                                                | Core HTTP operations (transport, response, body) |
| `ACL0xx`               | HttpAuthorizationPort adapter (§94) | `ACL001`-`ACL0xx`                                                                                                                                                                  | Authorization and access control decisions       |
| GxP HTTP transport     | Transport security combinators      | `HTTPS_REQUIRED`, `CERTIFICATE_VALIDATION_FAILED`, `PAYLOAD_INTEGRITY_FAILED`, `PAYLOAD_VALIDATION_FAILED`, `TOKEN_EXPIRED`, `TOKEN_LIFECYCLE_CIRCUIT_OPEN`, `RATE_LIMIT_EXCEEDED` | GxP transport security (§85-§90 of this spec)    |

**Cross-library error correlation:** When a transport security combinator (e.g., `requireHttps()`) wraps an HTTP client error, both error codes are available. The security error code identifies the security violation; the underlying HTTP client error code identifies the transport-level failure. Correlation is achieved through the shared `evaluationId` field attached to errors originating from GxP-evaluated operations.

```typescript
// Example: HTTPS enforcement error wrapping an HTTP client transport error
{
  code: "HTTPS_REQUIRED",           // Transport security code
  innerError: {
    _tag: "HttpRequestError",
    reason: "Transport",             // HTTP client error
    // errorCode() returns "HTTP001"
  },
  evaluationId: "eval-abc-123",     // Links to HttpAuditTrailPort (§91)
}
```

> **Cross-reference:** GxP transport security error codes are documented in sections §85-§90 of this spec. See also [17 - GxP Compliance Guide](./compliance/gxp.md) §81 for the full feature-to-section mapping.

---

_Previous: [04 - HttpResponse](./04-http-response.md)_

_Next: [06 - HttpClient Port](./06-http-client-port.md)_

> **Tests**: [Error Type Tests (ER-001–ER-015, EF-001–EF-005)](./17-definition-of-done.md#error-type-tests)
