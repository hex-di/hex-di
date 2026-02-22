# ADR-HC-001: Combinator Composition Over Middleware Stack

## Status

Accepted

## Context

HTTP client libraries commonly use a **middleware stack** (also called interceptors or hooks) to apply cross-cutting concerns such as authentication, retry, timeout, and logging. In this pattern, middleware is registered with the client at construction time, and every request passes through the stack in registration order.

The middleware pattern has several drawbacks:
- Execution order depends on registration order, which is implicit and hard to audit at the call site.
- Middleware is registered globally on the client instance, making it difficult to apply different policies to different request groups without creating multiple client instances.
- Debugging requires understanding the entire middleware stack, not just the code at the call site.
- Middleware stacks often require a "next" callback pattern that is error-prone when async operations are involved.

For a HexDI library, the port/adapter model also demands that the `HttpClient` interface remain stable and simple — middleware registration must not leak into the port definition.

## Decision

`@hex-di/http-client` uses **combinator composition** instead of a middleware stack. A combinator is a function of type `(client: HttpClient) => HttpClient` that wraps the original client with additional behavior.

```typescript
type ClientCombinator = (client: HttpClient) => HttpClient;

const apiClient = pipe(
  baseClient,
  HttpClient.baseUrl("https://api.example.com"),
  HttpClient.bearerAuth(token),
  HttpClient.filterStatusOk,
  HttpClient.retryTransient({ times: 3 }),
  HttpClient.timeout(10_000)
);
```

Execution order is visible in the `pipe()` call: request transformations apply top-to-bottom; response transformations apply bottom-to-top (as the call stack unwinds).

Custom combinators are plain functions — no registration, no special lifecycle, no framework coupling:

```typescript
function withCorrelationId(correlationId: string): ClientCombinator {
  return client =>
    HttpClient.mapRequest(req =>
      pipe(req, HttpRequest.setRequestHeader("x-correlation-id", correlationId))
    )(client);
}
```

## Consequences

**Positive**:
- Execution order is explicit and visible at the composition site — no need to trace through a registration list.
- Different policies can be applied to different client instances without shared state.
- Combinators compose via standard function composition — no framework-specific lifecycle.
- The `HttpClient` interface remains minimal and stable; cross-cutting behavior lives outside it.
- Tree-shaking eliminates unused combinators — only imported combinators are included in the bundle.

**Negative**:
- Every new "configured client" creates a new object chain. For applications with many client variants, this can create more object allocations than a single shared middleware stack.
- Global concerns (e.g., a company-wide request logger) must be applied at the composition root, not injected globally. This is by design but requires discipline.

**Trade-off accepted**: The object allocation overhead is negligible compared to the cost of an HTTP request itself, and the explicit composition model makes the library significantly more predictable and auditable.

**Affected invariants**: [INV-HC-9](../invariants.md#inv-hc-9-combinator-composition-order-determinism)

**Affected spec sections**: [§29](../07-client-combinators.md#29-combinator-philosophy)
