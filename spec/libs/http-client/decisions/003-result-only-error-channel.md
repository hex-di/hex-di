# ADR-HC-003: Result-Only Error Channel — Never Throw

## Status

Accepted

## Context

Native `fetch` and most HTTP libraries signal errors in two ways: (1) throwing for network failures (rejected promise), and (2) returning a response object for HTTP status errors (including 4xx and 5xx). This split error channel forces consumers to handle errors in two places: `try/catch` for network errors and a status check for HTTP errors.

Additionally, thrown errors in TypeScript are `unknown` — their type is not enforced by the type system. A consumer can easily miss an error type or handle it incorrectly. In HexDI, the `Result` type from `@hex-di/result` is the canonical error-handling mechanism, providing type-safe, composable error representation without exceptions.

## Decision

`HttpClient.execute` and all convenience methods return `ResultAsync<HttpResponse, HttpRequestError>` and **never throw**. All platform exceptions from the underlying transport are caught and wrapped in `Err(HttpRequestError)`:

```typescript
interface HttpClient {
  readonly execute: (request: HttpRequest) => ResultAsync<HttpResponse, HttpRequestError>;
  readonly get: (url: string | URL, options?: RequestOptions) => ResultAsync<HttpResponse, HttpRequestError>;
  // ... all methods return ResultAsync, never throw
}
```

The transport adapter wraps the underlying fetch call:

```typescript
function createFetchAdapter(): HttpClient {
  return {
    execute: (request) =>
      ResultAsync.fromPromise(
        fetch(request.url, { /* ... */ }),
        (err) => httpRequestError("Transport", request, String(err), err)
      ).andThen(res => buildHttpResponse(request, res)),
  };
}
```

After `filterStatusOk`, non-2xx responses are also surfaced as `Err(HttpResponseError)` — not as thrown exceptions:

```typescript
// Before filterStatusOk: status errors are silent (caller checks response.status)
// After filterStatusOk: status errors are Err(HttpResponseError) in the Result chain
const client = pipe(base, HttpClient.filterStatusOk);
```

## Consequences

**Positive**:
- The complete error space is visible in the type signature — no hidden throw paths.
- Consumers compose error handling with `mapErr`, `andThen`, `match` — the same combinators used everywhere in HexDI.
- No `try/catch` boilerplate required around HTTP calls.
- Async error handling is uniform: both network failures and status errors are `Err` in the same `ResultAsync`.

**Negative**:
- Consumers unfamiliar with `Result` must learn the `Result`/`ResultAsync` API before using the library.
- Wrapping every fetch call in `ResultAsync.fromPromise` adds a small Promise allocation overhead per request.

**Trade-off accepted**: The `Result`-based model is the core abstraction of HexDI. HTTP is a primary I/O boundary where robust error handling is critical — making errors explicit and typed is worth the learning curve.

**Affected invariants**: [INV-HC-7](../invariants.md#inv-hc-7-never-throw-contract)

**Affected spec sections**: [§25](../06-http-client-port.md#25-httpclient-interface)
