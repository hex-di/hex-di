# ADR-HCR-002: Result-Typed Hook State

## Status

Accepted

## Context

React data-fetching hooks typically expose errors via a separate `error: Error | undefined` field or by throwing (for Suspense / ErrorBoundary integration). The `@hex-di/http-client` contract guarantees that the `HttpClient` never throws — all failures are `Err` Results. The React integration must decide:

1. **Re-throw errors** — unpack the `Err` Result and throw the error value in the hook, enabling React Error Boundaries
2. **Separate error field** — expose `{ data, error, isLoading }` similar to react-query / SWR
3. **Pass the Result directly** — expose `{ result: Result<HttpResponse, E> | undefined, status }`, preserving the full `Result` type

## Decision

Expose the `Result` directly in the `result` field of `UseHttpRequestState` and `UseHttpMutationState`, alongside convenience fields `response`, `error`, and `status`.

```typescript
interface UseHttpRequestState<E extends HttpRequestError = HttpRequestError> {
  status: HttpRequestStatus;
  isLoading: boolean;
  result: Result<HttpResponse, E> | undefined; // full Result
  response: HttpResponse | undefined;           // convenience: Ok value
  error: E | undefined;                         // convenience: Err value
}
```

Re-throwing (option 1) is rejected. Separate-error (option 2) is not rejected but is superseded by option 3 (convenience fields provide an equivalent API).

## Consequences

**Positive**:
- Preserves the `Result` ADT — consumers can use `.match()`, `.map()`, `.mapErr()` directly
- Type-safe error narrowing via generics: `useHttpRequest<HttpResponseError>()` narrows `error` to `HttpResponseError`
- Consistent with `@hex-di/http-client` never-throw contract
- Convenience fields (`response`, `error`) provide the same ergonomics as separate-error patterns without abandoning the `Result` type
- No dependency on React Error Boundaries for HTTP error handling

**Negative**:
- Suspense integration requires extra adapter code (wrapping the result in a Suspense-compatible resource) — not provided in this package
- Consumers who want Error Boundary integration for HTTP errors must re-throw manually

**Trade-off accepted**: The `@hex-di/http-client` ecosystem is Result-first. Consistency across the package boundary outweighs Suspense convenience. Applications that need Suspense HTTP errors can wrap `useHttpRequest` in a thin adapter.
