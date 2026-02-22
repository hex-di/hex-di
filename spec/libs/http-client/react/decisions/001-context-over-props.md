# ADR-HCR-001: Context Over Prop-Drilling

## Status

Accepted

## Context

React components that need to execute HTTP requests must somehow access an `HttpClient` instance. The options are:

1. **Prop drilling** — pass `HttpClient` as a prop to every component that needs it
2. **React Context** — inject `HttpClient` once at a provider and let components subscribe
3. **Module-level singleton** — export a default global client from the package
4. **Custom hook with hardcoded construction** — `useHttpClient()` constructs its own client internally

`@hex-di/http-client-react` exists to solve the React-layer binding problem for the `HttpClientPort` abstraction. The binding mechanism must be ergonomic, testable, and consistent with HexDI's hexagonal architecture principle (domain code has no React dependency).

## Decision

Use React Context (`createContext`) for `HttpClient` injection. `HttpClientProvider` injects the client; `useHttpClient()` subscribes to the context.

```tsx
// Provider: inject once at a boundary
<HttpClientProvider client={http}>
  <AppTree />
</HttpClientProvider>

// Consumer: subscribe from anywhere in the tree
function MyComponent() {
  const http = useHttpClient();
  // ...
}
```

Prop drilling (option 1) and module-level singleton (option 3) are explicitly rejected. Custom hook internal construction (option 4) is rejected because it makes testing impossible without module mocking.

## Consequences

**Positive**:
- Standard React pattern — familiar to all React developers
- Testable: replace the `HttpClient` in the `wrapper` option of `renderHook` or `render` — no module mocking required
- Supports nested providers (scoped clients per sub-tree)
- Components remain decoupled from how the `HttpClient` is constructed or wired
- Clear programming error when context is missing (`null` default + runtime check)

**Negative**:
- Adds `HttpClientProvider` as a mandatory ancestor for components using HTTP hooks
- Context re-renders propagate to all subscribers when the context value changes (mitigated by INV-HCR-5 stable context value guarantee)

**Trade-off accepted**: The mandatory provider is a feature, not a bug — it makes the HTTP client dependency explicit and testable. The re-render concern is mitigated by requiring callers to pass a stable `client` reference and by the `useMemo`-based stable context value guarantee.
