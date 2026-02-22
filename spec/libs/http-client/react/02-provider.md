# 02 — HttpClientProvider

## §9. HttpClientProvider Component

`HttpClientProvider` injects an `HttpClient` instance into the React component tree via Context. Descendant components use `useHttpClient()` to access the instance.

### Signature

```tsx
interface HttpClientProviderProps {
  /** The HttpClient instance to provide. Required. */
  readonly client: HttpClient;
  /** Child components. */
  readonly children: ReactNode;
}

function HttpClientProvider(props: HttpClientProviderProps): ReactNode;
```

### Behavior

**REQUIREMENT (§9.1):** `HttpClientProvider` MUST make the `client` prop available to all descendant components via React Context.

**REQUIREMENT (§9.2):** When multiple `HttpClientProvider` components are nested, the innermost provider MUST take precedence for all descendants below it. The outer provider's client remains accessible to components between the outer and inner providers.

**REQUIREMENT (§9.3):** The `client` prop MUST be accepted as-is without cloning, wrapping, or transforming. Combinators are the caller's responsibility, not the provider's.

**REQUIREMENT (§9.4):** When the `client` prop changes between renders (referential inequality), the new client MUST be provided to descendants on the next render. Components that depend on `useHttpClient()` will re-render if they subscribe to the context value.

**REQUIREMENT (§9.5):** `HttpClientProvider` MUST NOT start, execute, or schedule any HTTP requests itself. It is a passive value container.

### Example: Basic Usage

```tsx
import { HttpClientProvider } from "@hex-di/http-client-react";

function App() {
  return (
    <HttpClientProvider client={httpClient}>
      <Routes />
    </HttpClientProvider>
  );
}
```

### Example: Nested Providers (Scoped Clients)

```tsx
// Outer: base client
// Inner: client with auth headers added via combinator
function AuthenticatedSection({ token }: { token: string }) {
  const baseClient = useHttpClient();
  const authClient = useMemo(
    () => HttpClient.bearerAuth(baseClient, token),
    [baseClient, token]
  );

  return (
    <HttpClientProvider client={authClient}>
      <ProtectedRoutes />
    </HttpClientProvider>
  );
}
```

### Example: With GraphBuilder

```tsx
const graph = GraphBuilder.create().add(FetchHttpClientAdapter).build();
const container = graph.createContainer();
const http = container.resolve(HttpClientPort);

function App() {
  return (
    <HttpClientProvider client={http}>
      <AppRoutes />
    </HttpClientProvider>
  );
}
```

## §10. Context Definition

The internal Context is not part of the public API. It is an implementation detail.

**REQUIREMENT (§10.1):** The default context value MUST be `null`. Hooks calling `useContext` on the internal context receive `null` if no provider is present, enabling a clear "missing provider" error message.

**REQUIREMENT (§10.2):** The context type MUST be `HttpClient | null`. No other type is permitted in the context value.

## §11. Missing Provider Error

**REQUIREMENT (§11.1):** When `useHttpClient()`, `useHttpRequest()`, or `useHttpMutation()` is called outside an `HttpClientProvider` tree, the hook MUST throw an `Error` with a descriptive message identifying the hook name and the required provider.

**REQUIREMENT (§11.2):** The error message MUST follow the pattern: `"<hookName> must be used within an HttpClientProvider"`.

**REQUIREMENT (§11.3):** This error is a **programming error**, not a runtime failure. It MUST NOT be caught by the hooks themselves. It propagates to the nearest React Error Boundary or crashes the component.

### Error Message Examples

```
"useHttpClient must be used within an HttpClientProvider"
"useHttpRequest must be used within an HttpClientProvider"
"useHttpMutation must be used within an HttpClientProvider"
```

## §12. Provider Identity and Re-rendering

**REQUIREMENT (§12.1):** `HttpClientProvider` MUST NOT create a new context value object on every render unless the `client` prop has changed. When the `client` prop is stable (same reference), the context value MUST be stable.

**REQUIREMENT (§12.2):** Implementation SHOULD use `useMemo` or equivalent to stabilize the context value when `client` is stable, preventing unnecessary re-renders in descendant components.

> **Definition of Done**: [DoD 1](./05-definition-of-done.md#dod-1-httpClientProvider)
