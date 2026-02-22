# ADR-HC-002: Frozen Value Objects for Requests

## Status

Accepted

## Context

`HttpRequest` objects need to flow through combinator chains, be passed to transport adapters, be stored in history entries, and be logged — often concurrently. A mutable request object creates several risks:

1. A combinator could mutate the incoming request instead of returning a new one, creating invisible side effects for other callers holding a reference to the same object.
2. A transport adapter could accidentally modify a field (e.g., append a header) after sending the request, corrupting the record stored in history.
3. In GxP environments, the request captured in an audit trail entry must be identical to the request that was sent. Mutable requests cannot guarantee this.

The alternative — requiring consumers to perform defensive copies — shifts the burden to every caller and is error-prone.

## Decision

All `HttpRequest` instances are frozen with `Object.freeze()` immediately after construction, before any reference to the object escapes the constructor or combinator:

```typescript
function get(url: string | URL): HttpRequest {
  return Object.freeze({
    [HTTP_REQUEST_SYMBOL]: true,
    method: "GET",
    url: typeof url === "string" ? url : url.toString(),
    urlParams: Object.freeze([]),
    headers: Object.freeze({}),
    body: EmptyBody,
    signal: undefined,
    timeoutMs: undefined,
  });
}
```

Combinators create new frozen instances rather than mutating the input:

```typescript
function setRequestHeader(key: string, value: string) {
  return (req: HttpRequest): HttpRequest =>
    Object.freeze({
      ...req,
      headers: Object.freeze({ ...req.headers, [key.toLowerCase()]: value }),
    });
}
```

## Consequences

**Positive**:
- Requests are safe to share across concurrent calls, across combinator pipelines, and across logging/tracing integrations without defensive copies.
- Audit trail entries capture the exact request object at the time it was recorded.
- TypeScript's `readonly` modifiers on the interface properties are enforced at runtime by `Object.freeze()`, not just at compile time.
- Combinators are pure functions — no hidden mutation, easy to test in isolation.

**Negative**:
- Constructing modified requests requires creating new objects. For hot paths (e.g., adding a correlation ID to every request), this incurs repeated allocations.
- `Object.freeze()` is shallow — nested objects (`headers`, `urlParams`) must be frozen separately.

**Trade-off accepted**: HTTP requests are created at most once per call and the object is small (< 10 fields). Allocation cost is unmeasurable relative to network I/O. The safety and auditability benefits justify the pattern.

**Affected invariants**: [INV-HC-1](../invariants.md#inv-hc-1-request-immutability)

**Affected spec sections**: [§9](../03-http-request.md#9-httprequest-interface), [§10–§14](../03-http-request.md)
