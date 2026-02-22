# ADR-HC-008: Back-Reference from Response to Originating Request

## Status

Accepted

## Context

When an HTTP error occurs (non-2xx status, body decode failure, etc.), error messages that include both request context (method, URL) and response context (status code, body) are significantly more useful than messages with only one side. Without a back-reference, code that receives an `HttpResponseError` must maintain a separate variable for the request to produce useful error messages.

This pattern appears repeatedly in HTTP client usage:

```typescript
// Without back-reference: awkward
const req = HttpRequest.get("/api/users");
const result = await http.execute(req).promise;
result.mapErr(err => {
  logger.error(`${req.method} ${req.url} failed with ${err.status}`); // req must be in scope
});
```

The alternative — requiring callers to always keep the request in scope — leads to tedious code in deeply nested async chains. Error handlers in combinators (e.g., `catchError`) receive only the error object, not the request.

## Decision

Every `HttpResponse` carries a `request` field with a reference to the `HttpRequest` that produced it:

```typescript
interface HttpResponse {
  readonly request: HttpRequest; // back-reference, always set
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  // body accessors...
}
```

Transport adapters are responsible for setting this field when constructing the `HttpResponse`:

```typescript
function buildHttpResponse(request: HttpRequest, raw: Response): HttpResponse {
  return Object.freeze({
    request,       // back-reference
    status: raw.status,
    statusText: raw.statusText,
    // ...
  });
}
```

`HttpResponseError` and `HttpRequestError` also carry `request` directly, enabling error-only contexts to produce full request+response messages:

```typescript
result.mapErr(err => {
  // err has err.request.method, err.request.url, and err.status
  logger.error(`${err.request.method} ${err.request.url} returned ${err.status}`);
});
```

## Consequences

**Positive**:
- Error messages can include both request and response context without keeping the request in scope.
- Combinators that receive only an error object (e.g., `catchError`, `tapError`) have full context for logging and retry decisions.
- Audit trail entries generated from errors are self-contained — no need to join against a separate request log.

**Negative**:
- `HttpResponse` holds a reference to `HttpRequest`, preventing either from being garbage-collected while the other is live. For long-running request histories (e.g., large inspector buffers), this doubles memory per entry.
- The back-reference creates a slight asymmetry: the request knows nothing about the response, but the response always knows the request.

**Trade-off accepted**: Memory pressure from back-references is bounded by the inspector's history buffer size, which is configurable. The debugging and audit value of self-contained error context justifies the overhead.

**Affected invariants**: [INV-HC-8](../invariants.md#inv-hc-8-response-request-back-reference)

**Affected spec sections**: [§15](../04-http-response.md#15-httpresponse-interface), [§20](../05-error-types.md#20-httprequesterror), [§21](../05-error-types.md#21-httpresponseerror)
