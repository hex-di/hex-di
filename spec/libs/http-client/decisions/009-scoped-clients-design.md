# ADR-HC-009: Scoped Clients Design

## Status

Accepted

## Context

Many HTTP client use cases require different client configurations for different request groups:

1. **Per-request correlation IDs** — each request to a backend service carries a unique `x-correlation-id` header.
2. **Multi-tenancy** — different tenants require different base URLs, auth tokens, or headers.
3. **Scoped authentication** — an authenticated sub-tree uses a different `Authorization` header than the unauthenticated root client.

The combinator model (ADR-HC-001) already supports scoping via composition: `pipe(baseClient, bearerAuth(tenantToken), baseUrl(tenantUrl))` produces a tenant-specific client. However, this composition happens at graph-wiring time, not at request time.

For request-time scoping (per-request context values that vary between calls), several patterns are possible:

1. **Create a new combinator chain per request** — compute the scoped client on every call. Simple but allocates a new client object chain per request.
2. **ScopedHttpClient interface** — a wrapper that binds per-request context (correlation ID, tenant ID) at call time via a method like `forScope(context)`.
3. **AsyncLocalStorage** — inject context via Node.js AsyncLocalStorage; the client reads it internally.
4. **Thread the context through `HttpRequest`** — store per-request context in request metadata that combinators can read.

## Decision

`@hex-di/http-client` provides a `ScopedHttpClient` interface (option 2) that wraps an `HttpClient` and provides a `forScope(context)` method returning a configured `HttpClient` for the given scope context.

```typescript
interface ScopedHttpClient<TContext> {
  readonly baseClient: HttpClient;
  forScope(context: TContext): HttpClient;
}

function createScopedHttpClient<TContext>(
  baseClient: HttpClient,
  configure: (context: TContext) => (client: HttpClient) => HttpClient
): ScopedHttpClient<TContext>
```

Usage:

```typescript
const scopedClient = createScopedHttpClient(
  baseClient,
  (ctx: { correlationId: string; tenantId: string }) =>
    pipe(
      baseUrl(`https://api.${ctx.tenantId}.example.com`),
      setRequestHeader("x-correlation-id", ctx.correlationId)
    )
);

// At call time:
const tenantClient = scopedClient.forScope({ correlationId: uuid(), tenantId: "acme" });
const result = await tenantClient.get("/api/users").promise;
```

Options 3 (AsyncLocalStorage) and 4 (request metadata threading) are not selected:
- AsyncLocalStorage ties the library to the Node.js runtime and is not available in browsers.
- Request metadata threading requires changes to `HttpRequest` to carry arbitrary context, which violates the clean separation between request structure and cross-cutting concerns.

Option 1 (new combinator chain per request) is functionally equivalent to `ScopedHttpClient.forScope()` — the `ScopedHttpClient` interface simply names and encapsulates this pattern.

## Consequences

**Positive**:
- `ScopedHttpClient` is a pure value: it holds a `baseClient` reference and a `configure` factory. No shared mutable state.
- The `forScope` call is explicit at the call site — it is visible in code review and logs.
- Works in all environments (browser, Node.js, Deno, Bun) — no runtime-specific dependencies.
- Combinators applied via `forScope` are visible in the composition function (`configure`), maintaining the combinator audibility property of ADR-HC-001.

**Negative**:
- `forScope` allocates a new client object chain per call. For extremely hot paths, this may create GC pressure.
- Automatic context propagation (e.g., inheriting a correlation ID from a parent async context) is not supported — callers must explicitly pass context to `forScope`.

**Trade-off accepted**: The allocation cost is negligible relative to HTTP I/O. Explicit context passing is a feature, not a bug — it prevents invisible side effects from context inheritance and keeps the scoped client pattern auditable.

**Affected invariants**: None directly — `ScopedHttpClient` composes existing invariants.

**Affected spec sections**: [§45–§48](../09-scoped-clients.md)
