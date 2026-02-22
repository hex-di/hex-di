# @hex-di/http-client-react — Glossary

Domain terminology used throughout the `@hex-di/http-client-react` specification.

---

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HCR-GLO-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/react/glossary.md` |
| Status | Effective |

---

## HttpClientProvider

A React component that injects an `HttpClient` instance into the component tree via React Context. Descendant components use `useHttpClient()` or the request hooks to consume the client. The provider is a passive value container — it does not execute requests.

See [§9](./02-provider.md#§9-httpclientprovider-component).

## useHttpClient

A React hook that resolves the `HttpClient` from the nearest `HttpClientProvider` ancestor. Returns the identical reference that was passed to the provider's `client` prop. Throws if called outside an `HttpClientProvider` tree.

See [§13](./03-hooks.md#§13-usehttpclient).

## useHttpRequest

A React hook that executes an `HttpRequest` reactively and returns a `UseHttpRequestState` object tracking the request lifecycle (`idle → loading → success | error`). Re-executes when the `deps` array changes. Aborts in-flight requests on dependency change or unmount.

See [§14–§15](./03-hooks.md#§14-usehttprequest-state-type).

## useHttpMutation

A React hook that returns `[mutate, state]` for imperative write operations. `mutate(request)` initiates a request and updates `state`. Unlike `useHttpRequest`, the request is not executed automatically — it runs only when `mutate` is called.

See [§16–§17](./03-hooks.md#§16-usehttpmutation-state-type).

## HttpRequestStatus

The lifecycle status union type for both `useHttpRequest` and `useHttpMutation` state:

- `"idle"` — no request in progress or `enabled: false`
- `"loading"` — request currently in-flight
- `"success"` — most recent request completed with `Ok` result
- `"error"` — most recent request completed with `Err` result

See [§14](./03-hooks.md#§14-usehttprequest-state-type).

## UseHttpRequestState

The state object returned by `useHttpRequest`. Contains `status`, `isLoading`, `result`, `response`, and `error` fields. `result` is a `Result<HttpResponse, E>` or `undefined`. Never throws.

See [§14](./03-hooks.md#§14-usehttprequest-state-type).

## UseHttpMutationState

The state object in the tuple returned by `useHttpMutation`. Same fields as `UseHttpRequestState` plus a `reset()` method that returns state to `"idle"`.

See [§16](./03-hooks.md#§16-usehttpmutation-state-type).

## createHttpClientTestProvider

A test utility that wraps a mock `HttpClient` in a minimal `HttpClientProvider` for use as a `renderHook` wrapper or component tree wrapper in unit tests. Avoids the need to manually render the full `HttpClientProvider` in each test.

See [§20](./04-testing.md).

## deps (dependency array)

The `deps` option of `useHttpRequest` — a `ReadonlyArray<unknown>` whose identity (shallow equality) determines when the hook re-executes the request. Mirrors React's `useEffect` dependency semantics. Callers are responsible for stability; a new array object on every render causes re-execution every render.

See [§15.1](./03-hooks.md#§15-usehttprequest-hook).

## Abort Signal

An `AbortController` signal passed via `HttpRequest.withSignal(signal)` that allows the in-flight request to be cancelled. `useHttpRequest` and `useHttpMutation` automatically manage `AbortController` lifecycle — aborting on unmount and on deps change. Adapters that do not propagate signals cannot be cancelled.

See [§18](./03-hooks.md#§18-abort-signal-integration) and [INV-HCR-4](./invariants.md#inv-hcr-4-abort-on-unmount).

## specRevision

A `string` constant exported by `@hex-di/http-client-react` whose value is the current specification revision (e.g., `"0.1"`). Allows automated tooling to verify that the installed package implements the expected specification version.

See [§5](./01-overview.md#§5-public-api-surface).

## Nearest Provider

The closest `HttpClientProvider` ancestor in the React component tree, resolved by React's standard Context algorithm. When providers are nested, the innermost provider wins for all descendants below it. See [INV-HCR-3](./invariants.md#inv-hcr-3-innermost-provider-wins).

## Stable Context Value

The property that the Context value object does not change identity (reference) across renders when `props.client` is unchanged. Stability prevents unnecessary re-renders in consumer components. Achieved via `useMemo` in the provider. See [INV-HCR-5](./invariants.md#inv-hcr-5-stable-context-value).

## Missing Provider Error

A programming error thrown when a hook (`useHttpClient`, `useHttpRequest`, or `useHttpMutation`) is called outside an `HttpClientProvider` tree. The error message follows the pattern `"<hookName> must be used within an HttpClientProvider"`. This is a programming error, not a runtime failure — it should not be caught and should propagate to an Error Boundary.

See [§11](./02-provider.md#§11-missing-provider-error).
