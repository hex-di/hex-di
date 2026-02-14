# 02 - Core Types

## 5. HttpMethod

The set of supported HTTP methods as a string literal union:

```typescript
type HttpMethod = "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";
```

### Method Classification

```typescript
/** Methods that MUST NOT have a request body (RFC 9110 §9.3.1, §9.3.2) */
type BodylessMethod = "GET" | "HEAD" | "OPTIONS";

/** Methods that conventionally carry a request body */
type BodyMethod = "POST" | "PUT" | "PATCH" | "DELETE";

/** Methods considered safe (no side effects on the server) */
type SafeMethod = "GET" | "HEAD" | "OPTIONS";

/** Methods considered idempotent (repeated calls produce the same result) */
type IdempotentMethod = "GET" | "HEAD" | "PUT" | "DELETE" | "OPTIONS";
```

These classification types are used internally by the request constructors to enforce type-safe body constraints -- `get()`, `head()`, and `options()` do not accept body combinators.

## 6. Headers

Immutable, case-insensitive header collection. Headers are plain `Readonly<Record<string, string>>` at the storage level. All keys are stored lowercased.

### Type Definition

```typescript
declare const HEADERS_SYMBOL: unique symbol;

interface Headers {
  readonly [HEADERS_SYMBOL]: true;
  readonly entries: Readonly<Record<string, string>>;
}
```

### Factory

```typescript
function createHeaders(init?: Readonly<Record<string, string>>): Headers;
```

All keys are lowercased during construction. Duplicate keys are overwritten (last wins).

### Combinators

```typescript
/** Set a header (overwrites existing) */
function setHeader(key: string, value: string): (headers: Headers) => Headers;

/** Append a value to an existing header (comma-separated per RFC 9110 §5.3) */
function appendHeader(key: string, value: string): (headers: Headers) => Headers;

/** Get a header value by key (case-insensitive lookup) */
function getHeader(key: string): (headers: Headers) => string | undefined;

/** Check if a header exists */
function hasHeader(key: string): (headers: Headers) => boolean;

/** Remove a header by key */
function removeHeader(key: string): (headers: Headers) => Headers;

/** Merge two header collections (right wins on conflict) */
function mergeHeaders(right: Headers): (left: Headers) => Headers;

/** Convert headers to a plain Record for platform adapters */
function headersToRecord(headers: Headers): Readonly<Record<string, string>>;
```

### Usage

```typescript
const h = pipe(
  createHeaders(),
  setHeader("content-type", "application/json"),
  setHeader("accept", "application/json"),
  setHeader("x-request-id", crypto.randomUUID())
);

getHeader("Content-Type")(h); // "application/json" (case-insensitive)
```

### Design Note

Headers are a dedicated type rather than a plain `Record<string, string>` for two reasons:

1. **Case-insensitive semantics** -- HTTP headers are case-insensitive. A plain record allows `headers["Content-Type"]` and `headers["content-type"]` to be different entries. The `Headers` type normalizes on construction.
2. **Immutability guarantee** -- The brand symbol and frozen structure prevent accidental mutation.

## 7. UrlParams

Immutable URL search parameter collection supporting single and multi-value parameters.

### Type Definition

```typescript
declare const URL_PARAMS_SYMBOL: unique symbol;

interface UrlParams {
  readonly [URL_PARAMS_SYMBOL]: true;
  readonly entries: ReadonlyArray<readonly [string, string]>;
}
```

Parameters are stored as an ordered list of `[key, value]` tuples rather than a record because:

1. URL parameters can have multiple values for the same key (`?role=admin&role=user`)
2. Order can matter for cache keys and debugging

### Input Type

```typescript
type UrlParamsInput =
  | Readonly<Record<string, string | number | boolean | ReadonlyArray<string>>>
  | ReadonlyArray<readonly [string, string]>;
```

### Factory

```typescript
function createUrlParams(init?: UrlParamsInput): UrlParams;
```

Values are stringified during construction: numbers via `String()`, booleans via `String()`.

### Combinators

```typescript
/** Set a parameter (replaces all existing values for this key) */
function setParam(key: string, value: string): (params: UrlParams) => UrlParams;

/** Append a parameter value (preserves existing values for this key) */
function appendParam(key: string, value: string): (params: UrlParams) => UrlParams;

/** Get the first value for a parameter key */
function getParam(key: string): (params: UrlParams) => string | undefined;

/** Get all values for a parameter key */
function getParamAll(key: string): (params: UrlParams) => readonly string[];

/** Remove all values for a parameter key */
function removeParam(key: string): (params: UrlParams) => UrlParams;

/** Check if a parameter exists */
function hasParam(key: string): (params: UrlParams) => boolean;

/** Merge two UrlParams (right appends to left) */
function mergeParams(right: UrlParams): (left: UrlParams) => UrlParams;

/** Serialize to query string (without leading '?') */
function toQueryString(params: UrlParams): string;

/** Parse a query string into UrlParams */
function fromQueryString(query: string): UrlParams;
```

### Usage

```typescript
const params = pipe(
  createUrlParams({ page: 1, limit: 20 }),
  appendParam("sort", "name"),
  appendParam("sort", "date")
);

toQueryString(params); // "page=1&limit=20&sort=name&sort=date"
```

## 8. HttpBody

Discriminated union representing the possible request body types. The body is attached to an `HttpRequest` via body combinators.

### Type Definition

```typescript
type HttpBody =
  | EmptyBody
  | TextBody
  | JsonBody
  | Uint8ArrayBody
  | UrlEncodedBody
  | FormDataBody
  | StreamBody;

interface EmptyBody {
  readonly _tag: "EmptyBody";
}

interface TextBody {
  readonly _tag: "TextBody";
  readonly value: string;
  readonly contentType: string;
}

interface JsonBody {
  readonly _tag: "JsonBody";
  readonly value: unknown;
}

interface Uint8ArrayBody {
  readonly _tag: "Uint8ArrayBody";
  readonly value: Uint8Array;
  readonly contentType: string;
}

interface UrlEncodedBody {
  readonly _tag: "UrlEncodedBody";
  readonly value: UrlParams;
}

interface FormDataBody {
  readonly _tag: "FormDataBody";
  readonly value: FormData;
}

interface StreamBody {
  readonly _tag: "StreamBody";
  readonly value: ReadableStream<Uint8Array>;
  readonly contentType: string;
  readonly contentLength?: number;
}
```

### Factory Functions

```typescript
function emptyBody(): EmptyBody;
function textBody(value: string, contentType?: string): TextBody;
function jsonBody(value: unknown): JsonBody;
function uint8ArrayBody(value: Uint8Array, contentType?: string): Uint8ArrayBody;
function urlEncodedBody(value: UrlParamsInput): UrlEncodedBody;
function formDataBody(value: FormData): FormDataBody;
function streamBody(
  value: ReadableStream<Uint8Array>,
  options?: {
    readonly contentType?: string;
    readonly contentLength?: number;
  }
): StreamBody;
```

### Type Guards

```typescript
function isEmptyBody(body: HttpBody): body is EmptyBody;
function isTextBody(body: HttpBody): body is TextBody;
function isJsonBody(body: HttpBody): body is JsonBody;
function isUint8ArrayBody(body: HttpBody): body is Uint8ArrayBody;
function isUrlEncodedBody(body: HttpBody): body is UrlEncodedBody;
function isFormDataBody(body: HttpBody): body is FormDataBody;
function isStreamBody(body: HttpBody): body is StreamBody;
```

### Design Note: Why Discriminated Union

The body is a discriminated union rather than a generic `BodyInit` for three reasons:

1. **Type safety** -- platform adapters can pattern-match on `_tag` to serialize correctly without guessing
2. **Inspectability** -- introspection can report body type and size without consuming the body
3. **Immutability** -- body values are captured at construction time, preventing mutation races

---

_Previous: [01 - Overview & Philosophy](./01-overview.md)_

_Next: [03 - HttpRequest](./03-http-request.md)_
