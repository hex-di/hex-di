# @hex-di/http-client — Type-Level Structural Safety

Compile-time safety patterns enforced by the type system in `@hex-di/http-client`. These patterns make certain classes of misuse structurally impossible without requiring runtime checks.

---

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-TYP-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/type-system/structural-safety.md` |
| Status | Effective |

---

## 1. Frozen Value Object Immutability

### Pattern

`HttpRequest` and `HttpClientError` subtypes are frozen with `Object.freeze()` immediately after construction. This is enforced at the **structural level** by declaring all fields `readonly` in the TypeScript interface.

```typescript
interface HttpRequest {
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly urlParams: Readonly<Record<string, string | string[]>>;
  readonly body: HttpBody | undefined;
  readonly signal: AbortSignal | undefined;
}
```

### Structural Safety Guarantee

TypeScript prevents assignment to `readonly` fields at compile time:

```typescript
const req = HttpRequest.get("https://api.example.com/users");

// Compile error: Cannot assign to 'method' because it is a read-only property.
req.method = "POST";

// Compile error: Cannot assign to 'url' because it is a read-only property.
req.url = "https://other.example.com";
```

The combinator functions are the **only** way to produce modified requests:

```typescript
// Correct: returns a new frozen HttpRequest
const postReq = pipe(req, setRequestMethod("POST"));
```

### Why `readonly` + `Object.freeze()` Together

`readonly` is a compile-time constraint only — it does not prevent JavaScript runtime mutation via type assertions or `Object.assign`. `Object.freeze()` closes this gap at runtime. The combination provides defence-in-depth:

| Layer | Mechanism | Catches |
|-------|-----------|---------|
| Compile-time | `readonly` fields | TypeScript-visible assignment |
| Runtime | `Object.freeze()` | Mutation via `as any`, `Object.assign`, `Reflect.set` |

**Related invariants**: [INV-HC-1](../invariants.md#inv-hc-1-request-immutability), [INV-HC-4](../invariants.md#inv-hc-4-error-object-immutability), [INV-HC-5](../invariants.md#inv-hc-5-error-populate-freeze-return-ordering)

**Related ADRs**: [ADR-HC-002](../decisions/002-frozen-value-objects.md), [ADR-HC-006](../decisions/006-error-freeze-for-alcoa.md)

---

## 2. Discriminated Error Union Exhaustiveness

### Pattern

`HttpClientError` is a sealed discriminated union using literal `_tag` fields:

```typescript
interface HttpRequestError {
  readonly _tag: "HttpRequestError";
  readonly message: string;
  readonly reason: HttpRequestErrorReason;
  readonly request: HttpRequest;
  readonly cause: unknown;
}

interface HttpResponseError {
  readonly _tag: "HttpResponseError";
  readonly message: string;
  readonly reason: HttpResponseErrorReason;
  readonly request: HttpRequest;
  readonly response: HttpResponse;
  readonly cause: unknown;
}

interface HttpBodyError {
  readonly _tag: "HttpBodyError";
  readonly message: string;
  readonly reason: HttpBodyErrorReason;
  readonly request: HttpRequest;
  readonly response: HttpResponse;
  readonly cause: unknown;
}

type HttpClientError = HttpRequestError | HttpResponseError | HttpBodyError;
```

### Structural Safety Guarantee

TypeScript enforces exhaustiveness checking on `_tag` switches:

```typescript
function handleError(error: HttpClientError): string {
  switch (error._tag) {
    case "HttpRequestError":
      return `Request failed: ${error.reason}`;
    case "HttpResponseError":
      return `HTTP ${error.response.status}: ${error.reason}`;
    case "HttpBodyError":
      return `Body parse failed: ${error.reason}`;
    // No default needed — TypeScript knows the union is exhaustive.
    // Adding a new variant to HttpClientError causes a compile error here.
  }
}
```

Adding a new variant without updating `switch` statements produces:

```
error TS2366: Function lacks ending return statement and return type does not
include 'undefined'.
```

Or with `assertNever`:

```typescript
default:
  assertNever(error); // Compile error if any case is missing
```

### Narrowing via Type Guards

The exported type guards narrow `HttpClientError` to specific subtypes:

```typescript
function isHttpRequestError(e: HttpClientError): e is HttpRequestError {
  return e._tag === "HttpRequestError";
}

// After narrowing, TypeScript knows e.reason is HttpRequestErrorReason:
if (isHttpRequestError(error)) {
  error.reason; // type: HttpRequestErrorReason
  error.response; // Compile error: Property 'response' does not exist on HttpRequestError
}
```

**Related invariants**: [INV-HC-6](../invariants.md#inv-hc-6-error-discriminant-exhaustiveness)

---

## 3. Body Single-Consumption Boundary

### Pattern

`HttpResponse` body accessors return `ResultAsync` — consuming a body produces a `Result`, not raw data. The type system reflects the single-consumption constraint:

```typescript
interface HttpResponse {
  readonly request: HttpRequest;
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly json: <T = unknown>() => ResultAsync<T, HttpBodyError>;
  readonly text: () => ResultAsync<string, HttpBodyError>;
  readonly arrayBuffer: () => ResultAsync<ArrayBuffer, HttpBodyError>;
  readonly blob: () => ResultAsync<Blob, HttpBodyError>;
  readonly formData: () => ResultAsync<FormData, HttpBodyError>;
  readonly stream: ReadableStream | undefined;
}
```

### Structural Safety Guarantee

Because body accessors return `ResultAsync` rather than raw values, callers are structurally forced to handle the `Err(HttpBodyError)` path. The `BodyAlreadyConsumed` error reason surfaces as a typed value in the `Err` channel:

```typescript
const first = await response.json().promise;
const second = await response.text().promise; // Returns Err(HttpBodyError) at runtime

// The type system requires handling both cases:
second.match(
  data => ...,
  error => {
    if (error.reason === "BodyAlreadyConsumed") {
      // Compile-time reachable — type system cannot eliminate this branch
    }
  }
);
```

There is no structural mechanism to make the double-consumption error impossible at compile time (HTTP body streams are a runtime concept). The `ResultAsync` return type ensures the error is **visible** rather than thrown or silently swallowed.

**Related invariants**: [INV-HC-2](../invariants.md#inv-hc-2-response-body-caching), [INV-HC-3](../invariants.md#inv-hc-3-body-single-consumption-boundary)

**Related ADR**: [ADR-HC-005](../decisions/005-lazy-body-accessors.md)

---

## 4. Response-to-Request Back-Reference

### Pattern

`HttpResponse` structurally requires a `request` field:

```typescript
interface HttpResponse {
  readonly request: HttpRequest;  // never undefined
  // ...
}
```

### Structural Safety Guarantee

The `request` field is non-optional (`HttpRequest`, not `HttpRequest | undefined`). Transport adapters that implement the `HttpTransportAdapter` contract must provide the `request` field or the TypeScript compiler rejects the implementation:

```typescript
interface HttpTransportAdapter {
  execute(request: HttpRequest): ResultAsync<HttpResponse, HttpRequestError>;
}

// A transport returning a response without `request` fails to compile:
const badAdapter: HttpTransportAdapter = {
  execute: (req) => ResultAsync.ok({
    status: 200,
    headers: {},
    // Missing `request` field — compile error:
    // Property 'request' is missing in type '{ status: number; headers: {}; ... }'
    // but required in type 'HttpResponse'.
  }),
};
```

This structural requirement ensures `HttpResponseError` always has access to the originating request context — a requirement for GxP audit trail completeness (ALCOA+ Attributable).

**Related invariants**: [INV-HC-8](../invariants.md#inv-hc-8-response-request-back-reference)

**Related ADR**: [ADR-HC-008](../decisions/008-request-back-reference-on-response.md)

---

## 5. Never-Throw Contract via ResultAsync Return Type

### Pattern

`HttpClient` methods return `ResultAsync`, not `Promise`:

```typescript
interface HttpClient {
  execute(request: HttpRequest): ResultAsync<HttpResponse, HttpRequestError>;
  get(url: string): ResultAsync<HttpResponse, HttpRequestError>;
  post(url: string, body?: HttpBody): ResultAsync<HttpResponse, HttpRequestError>;
  put(url: string, body?: HttpBody): ResultAsync<HttpResponse, HttpRequestError>;
  patch(url: string, body?: HttpBody): ResultAsync<HttpResponse, HttpRequestError>;
  del(url: string): ResultAsync<HttpResponse, HttpRequestError>;
  head(url: string): ResultAsync<HttpResponse, HttpRequestError>;
}
```

### Structural Safety Guarantee

`ResultAsync<HttpResponse, HttpRequestError>` structurally forbids callers from ignoring the error channel. There is no `Promise<HttpResponse>` that could throw — callers must call `.match()`, `.map()`, `.mapErr()`, or `.promise` and handle both branches.

TypeScript infers the full error type at the call site:

```typescript
const result = await http.get("https://api.example.com/data").promise;
//    ^--- type: Result<HttpResponse, HttpRequestError>

// Missing .match() or error branch handling causes TypeScript to
// report unused Result warnings with @hex-di/result's eslint plugin.
```

**Related invariants**: [INV-HC-7](../invariants.md#inv-hc-7-never-throw-contract)

**Related ADR**: [ADR-HC-003](../decisions/003-result-only-error-channel.md)
