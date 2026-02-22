# 04 - HttpResponse

## §15. HttpResponse Interface

An `HttpResponse` is a frozen value object representing the HTTP response received from a server. Body accessors are lazy -- the body is consumed only when a specific accessor is called.

```typescript
declare const HTTP_RESPONSE_SYMBOL: unique symbol;

interface HttpResponse {
  readonly [HTTP_RESPONSE_SYMBOL]: true;

  /** HTTP status code (e.g., 200, 404, 500) */
  readonly status: number;

  /** HTTP status text (e.g., "OK", "Not Found") */
  readonly statusText: string;

  /** Response headers */
  readonly headers: Headers;

  /** The originating request (back-reference for error context) */
  readonly request: HttpRequest;

  /** Parse body as JSON. Lazy -- consumes the body on first call. */
  readonly json: ResultAsync<unknown, HttpResponseError>;

  /** Read body as string. Lazy -- consumes the body on first call. */
  readonly text: ResultAsync<string, HttpResponseError>;

  /** Read body as ArrayBuffer. Lazy -- consumes the body on first call. */
  readonly arrayBuffer: ResultAsync<ArrayBuffer, HttpResponseError>;

  /** Read body as Blob. Lazy -- consumes the body on first call. */
  readonly blob: ResultAsync<Blob, HttpResponseError>;

  /** Parse body as FormData. Lazy -- consumes the body on first call. */
  readonly formData: ResultAsync<FormData, HttpResponseError>;

  /** Access the raw body as a ReadableStream. Non-lazy -- can only be read once. */
  readonly stream: ReadableStream<Uint8Array>;
}
```

### Body Consumption Semantics

Each body accessor (`json`, `text`, `arrayBuffer`, `blob`, `formData`) is a **lazy `ResultAsync`**. The body is consumed on first access. Subsequent calls to the same accessor return the cached result. Calling a different accessor after the body has been consumed returns an `HttpResponseError` with `reason: "BodyAlreadyConsumed"`.

```typescript
const response = await http.get("/api/users").promise;

response.match(
  res => {
    // First access: parses JSON from the body
    const jsonResult = await res.json.promise;

    // Second access to same accessor: returns cached result
    const jsonAgain = await res.json.promise; // Same result, no re-parsing

    // Different accessor after consumption: error
    const textResult = await res.text.promise;
    // Err({ _tag: "HttpResponseError", reason: "BodyAlreadyConsumed", ... })
  },
  error => {
    /* handle */
  }
);
```

The `stream` accessor is an exception -- it provides the raw `ReadableStream` directly (not wrapped in `ResultAsync`) and can only be read once. It is intended for streaming large responses without buffering.

### Design Note: Back-Reference to Request

The `request` field on `HttpResponse` enables error messages that include both request and response context:

```typescript
// Error message includes method, URL, status
`${response.request.method} ${response.request.url} returned ${response.status}`;
// "POST https://api.example.com/users returned 422"
```

## §16. Body Accessors

### json

```typescript
readonly json: ResultAsync<unknown, HttpResponseError>;
```

Parses the response body as JSON. Returns `Err(HttpResponseError)` with:

- `reason: "Decode"` -- if `JSON.parse()` fails
- `reason: "EmptyBody"` -- if the response body is empty
- `reason: "BodyAlreadyConsumed"` -- if the body was already read via a different accessor

The return type is `unknown` -- callers must narrow the type themselves. This avoids the `any` problem where `response.json()` in native fetch returns `any`.

```typescript
const result = await http.get("/api/users").andThen(res => res.json).promise;

result.match(
  data => {
    const users = data as ReadonlyArray<User>; // Caller narrows type
  },
  error => {
    if (error.reason === "Decode") {
      console.error("Invalid JSON:", error.message);
    }
  }
);
```

### text

```typescript
readonly text: ResultAsync<string, HttpResponseError>;
```

Reads the response body as a UTF-8 string.

### arrayBuffer

```typescript
readonly arrayBuffer: ResultAsync<ArrayBuffer, HttpResponseError>;
```

Reads the response body as an `ArrayBuffer`. Useful for binary data (images, protobuf, etc.).

### blob

```typescript
readonly blob: ResultAsync<Blob, HttpResponseError>;
```

Reads the response body as a `Blob`. Useful for file downloads in browser environments.

### formData

```typescript
readonly formData: ResultAsync<FormData, HttpResponseError>;
```

Parses the response body as `FormData`. Returns `Err` with `reason: "Decode"` if the content type is not multipart.

### stream

```typescript
readonly stream: ReadableStream<Uint8Array>;
```

Direct access to the raw response body stream. Not wrapped in `ResultAsync` because streaming is an inherently imperative operation. Can only be read once.

```typescript
const response = await http.get("/api/large-file").promise;

response.match(
  res => {
    const reader = res.stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      processChunk(value);
    }
  },
  error => {
    /* handle */
  }
);
```

## §17. Status Utilities

Pure functions for classifying HTTP status codes:

```typescript
/** 200-299 */
function isOk(response: HttpResponse): boolean;

/** 300-399 */
function isRedirect(response: HttpResponse): boolean;

/** 400-499 */
function isClientError(response: HttpResponse): boolean;

/** 500-599 */
function isServerError(response: HttpResponse): boolean;

/** 100-199 */
function isInformational(response: HttpResponse): boolean;

/** Check for a specific status code */
function hasStatus(status: number): (response: HttpResponse) => boolean;

/** Check if the status is in a range (inclusive) */
function hasStatusInRange(min: number, max: number): (response: HttpResponse) => boolean;
```

### Usage

```typescript
const result = await http.get("/api/users").promise;

result.match(
  res => {
    if (isOk(res)) {
      // 2xx
    } else if (isClientError(res)) {
      // 4xx -- client error (bad request, unauthorized, not found)
    } else if (isServerError(res)) {
      // 5xx -- server error (internal error, gateway timeout)
    }
  },
  error => {
    /* network error */
  }
);
```

## §18. Header Utilities

Functions for reading response headers:

```typescript
/** Get a response header value (case-insensitive) */
function getResponseHeader(key: string): (response: HttpResponse) => string | undefined;

/** Get the Content-Type header */
function getContentType(response: HttpResponse): string | undefined;

/** Get the Content-Length header as a number */
function getContentLength(response: HttpResponse): number | undefined;

/** Check if the response has a specific content type */
function hasContentType(mediaType: string): (response: HttpResponse) => boolean;

/** Get the Location header (for redirects) */
function getLocation(response: HttpResponse): string | undefined;

/** Get all Set-Cookie headers */
function getSetCookies(response: HttpResponse): readonly string[];
```

### Usage

```typescript
const result = await http.get("/api/users").promise;

result.match(
  res => {
    const contentType = getContentType(res); // "application/json"
    const contentLength = getContentLength(res); // 1234
    const location = getLocation(res); // undefined (not a redirect)
  },
  error => {
    /* handle */
  }
);
```

---

_Previous: [03 - HttpRequest](./03-http-request.md)_

_Next: [05 - Error Types](./05-error-types.md)_

> **Tests**: [HttpResponse Tests (RS-001–RS-011)](./17-definition-of-done.md#httpresponse-tests)
