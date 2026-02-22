# ADR-HC-005: Lazy Body Accessors with Single-Consumption Caching

## Status

Accepted

## Context

HTTP response bodies are streams. The underlying platform (`fetch`, `node:http`, `undici`) provides the body as a `ReadableStream` or similar, which can only be read once. This is an intrinsic platform constraint.

Options for surfacing this in the API:

1. **Eager consumption** — buffer the entire body into memory at response construction time. Simple API, but consumes memory unconditionally (including for large streaming responses) and requires a decision on default format (text? binary? JSON?).
2. **Single explicit accessor** — provide one method (e.g., `response.consume()`) that reads the body. Simple but forces callers to always know the format before calling.
3. **Multiple lazy accessors** — provide typed accessors (`json`, `text`, `arrayBuffer`, etc.) that are lazy `ResultAsync` values. The body is read only when an accessor is first awaited. Subsequent calls to the same accessor return a cached result; calls to a different accessor after consumption return an error.

The streaming use case must also be supported without buffering, for large file downloads.

## Decision

`HttpResponse` exposes typed body accessors as **lazy `ResultAsync` properties** with **same-accessor caching**:

```typescript
interface HttpResponse {
  readonly json: ResultAsync<unknown, HttpResponseError>;       // lazy + cached
  readonly text: ResultAsync<string, HttpResponseError>;        // lazy + cached
  readonly arrayBuffer: ResultAsync<ArrayBuffer, HttpResponseError>; // lazy + cached
  readonly blob: ResultAsync<Blob, HttpResponseError>;          // lazy + cached
  readonly formData: ResultAsync<FormData, HttpResponseError>;  // lazy + cached
  readonly stream: ReadableStream<Uint8Array>;                  // non-lazy, one-shot
}
```

Implementation: each accessor stores its result in a `let slot` initialized to `undefined`. On first access the slot is populated; subsequent calls return the slot value directly.

```typescript
function buildHttpResponse(request: HttpRequest, raw: Response): HttpResponse {
  let jsonCache: ResultAsync<unknown, HttpResponseError> | undefined;
  let consumed = false;

  return Object.freeze({
    status: raw.status,
    statusText: raw.statusText,
    headers: createHeaders(Object.fromEntries(raw.headers.entries())),
    request,
    get json(): ResultAsync<unknown, HttpResponseError> {
      if (!jsonCache) {
        if (consumed) return ResultAsync.err(httpResponseError("BodyAlreadyConsumed", ...));
        consumed = true;
        jsonCache = ResultAsync.fromPromise(raw.json(), err => httpResponseError("Decode", ...));
      }
      return jsonCache;
    },
    // ... similar for text, arrayBuffer, blob, formData
    stream: raw.body ?? new ReadableStream(),
  });
}
```

The `stream` property is excluded from caching — it provides direct access to the raw `ReadableStream` for streaming large responses without buffering.

## Consequences

**Positive**:
- Body parsing is deferred until actually needed — no cost for callers who only inspect status codes or headers.
- The same accessor can be called multiple times safely (idempotent after first resolution).
- The explicit `BodyAlreadyConsumed` error surfaces the platform constraint as a typed, debuggable failure rather than a silent stream error.
- `stream` remains available for high-throughput, low-memory streaming use cases.

**Negative**:
- The API is more complex than a single `consume(): Promise<Buffer>` method.
- The `BodyAlreadyConsumed` error requires callers to understand the single-consumption constraint and choose their accessor in advance.
- The caching implementation uses a closure slot, making it slightly harder to inspect during debugging.

**Trade-off accepted**: The lazy-with-caching model accurately represents the HTTP response body lifecycle. The `BodyAlreadyConsumed` error is a feature — it makes a runtime platform constraint visible as an explicit typed failure rather than a cryptic stream error.

**Affected invariants**: [INV-HC-2](../invariants.md#inv-hc-2-response-body-caching), [INV-HC-3](../invariants.md#inv-hc-3-body-single-consumption-boundary)

**Affected spec sections**: [§15](../04-http-response.md#15-httpresponse-interface), [§16](../04-http-response.md#16-body-accessors)
