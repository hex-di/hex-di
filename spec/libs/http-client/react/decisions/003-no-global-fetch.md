# ADR-HCR-003: No Default or Global Client Instance

## Status

Accepted

## Context

Several React HTTP libraries (Axios, ky, `node-fetch`) provide a default exported instance that works out of the box with no configuration. This pattern is convenient for quick starts but creates hidden global state and makes testing difficult without module-level mocking.

`@hex-di/http-client-react` could offer a default global `HttpClient` (e.g., backed by `fetch`) so that components work without wrapping in `HttpClientProvider`.

## Decision

`@hex-di/http-client-react` does **not** export a default, global, or shared `HttpClient` instance. Every component tree that makes HTTP requests must be wrapped in an `HttpClientProvider` with an explicitly provided `client`.

```typescript
// Rejected design:
// import { defaultHttpClient } from "@hex-di/http-client-react";
// useHttpRequest() automatically uses defaultHttpClient if no provider present

// Accepted design:
function App() {
  return (
    <HttpClientProvider client={myExplicitClient}>
      <Subtree />
    </HttpClientProvider>
  );
}
```

## Consequences

**Positive**:
- No global state — every usage is explicit and traceable
- Testable without module mocking: swap the `client` in `createHttpClientTestProvider` or `HttpClientProvider`
- Transport adapter is configurable per application (Fetch, Axios, Undici, etc.)
- Aligns with HexDI's principle that adapters are wired explicitly, not discovered globally
- Missing provider is a compile-time + runtime detectable error (`null` default context value → clear throw)

**Negative**:
- More boilerplate for simple applications that would be satisfied with a default Fetch client
- "Quick start" experience requires three packages (`@hex-di/http-client`, `@hex-di/http-client-fetch`, `@hex-di/http-client-react`) and `GraphBuilder` wiring

**Trade-off accepted**: The boilerplate cost is a one-time setup. The benefits (testability, explicit wiring, no hidden globals) outweigh the quick-start friction. Applications that want a "batteries-included" default client can create a thin wrapper in their own codebase.
