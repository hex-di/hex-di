# 03 — Hooks

## §13. useHttpClient

Resolves the `HttpClient` from the nearest `HttpClientProvider` ancestor.

### Signature

```typescript
function useHttpClient(): HttpClient;
```

### Behavior

**REQUIREMENT (§13.1):** `useHttpClient()` MUST return the `HttpClient` instance from the nearest `HttpClientProvider` ancestor.

**REQUIREMENT (§13.2):** `useHttpClient()` MUST throw if called outside an `HttpClientProvider` tree (see [§11](./02-provider.md#§11-missing-provider-error)).

**REQUIREMENT (§13.3):** The returned instance MUST be the same reference that was passed to the `client` prop of the nearest `HttpClientProvider`. No wrapping or copying is performed.

**REQUIREMENT (§13.4):** `useHttpClient()` MUST NOT execute any HTTP requests.

### Example

```tsx
function MyComponent() {
  const http = useHttpClient();

  const handleSubmit = useCallback(async () => {
    const result = await http.post("/api/submit", { body: HttpBody.json(data) }).promise;
    result.match(
      response => setSuccess(true),
      error => setError(error.message),
    );
  }, [http, data]);

  return <button onClick={handleSubmit}>Submit</button>;
}
```

> **Definition of Done**: [DoD 2](./05-definition-of-done.md#dod-2-usehttpclient)

---

## §14. useHttpRequest — State Type

`useHttpRequest` returns a `UseHttpRequestState<E>` value.

```typescript
type HttpRequestStatus = "idle" | "loading" | "success" | "error";

interface UseHttpRequestState<E extends HttpRequestError = HttpRequestError> {
  /** Current lifecycle status. */
  readonly status: HttpRequestStatus;
  /** True while the request is in-flight. */
  readonly isLoading: boolean;
  /** The Result from the most recent completed request, or undefined if none. */
  readonly result: Result<HttpResponse, E> | undefined;
  /** Shorthand: the success value if status === "success", else undefined. */
  readonly response: HttpResponse | undefined;
  /** Shorthand: the error value if status === "error", else undefined. */
  readonly error: E | undefined;
}
```

**REQUIREMENT (§14.1):** The `status` field MUST accurately reflect the current lifecycle phase:
- `"idle"` — no request has been made or the hook has been initialized with `enabled: false`
- `"loading"` — a request is currently in-flight
- `"success"` — the most recent request completed with an `Ok` Result
- `"error"` — the most recent request completed with an `Err` Result

**REQUIREMENT (§14.2):** `isLoading` MUST equal `status === "loading"` at all times.

**REQUIREMENT (§14.3):** `result` MUST hold the most recent completed Result until superseded by the next request completion or a reset. It MUST be `undefined` in the initial `"idle"` state.

**REQUIREMENT (§14.4):** `response` MUST equal `result?.isOk() ? result.value : undefined`. It MUST be `undefined` in `"idle"`, `"loading"`, and `"error"` states.

**REQUIREMENT (§14.5):** `error` MUST equal `result?.isErr() ? result.error : undefined`. It MUST be `undefined` in `"idle"`, `"loading"`, and `"success"` states.

---

## §15. useHttpRequest Hook

```typescript
interface UseHttpRequestOptions {
  /** If false, the request is not executed. Default: true. */
  readonly enabled?: boolean;
  /** Dependency list — request re-executes when deps change (like useEffect). Default: []. */
  readonly deps?: ReadonlyArray<unknown>;
}

function useHttpRequest<E extends HttpRequestError = HttpRequestError>(
  request: HttpRequest,
  options?: UseHttpRequestOptions,
): UseHttpRequestState<E>;
```

### Behavior

**REQUIREMENT (§15.1):** When `enabled` is `true` (default), `useHttpRequest` MUST execute the request immediately on mount and re-execute whenever `deps` changes.

**REQUIREMENT (§15.2):** When `enabled` is `false`, the hook MUST remain in `"idle"` state and MUST NOT execute the request.

**REQUIREMENT (§15.3):** `useHttpRequest` MUST use the `HttpClient` from the nearest `HttpClientProvider`. It MUST throw if no provider is present (see [§11](./02-provider.md#§11-missing-provider-error)).

**REQUIREMENT (§15.4):** Concurrent executions MUST NOT overlap. If `deps` changes while a request is in-flight, the in-flight request MUST be abandoned (via `AbortController`). Only the result of the most recently initiated request MUST be reflected in state.

**REQUIREMENT (§15.5):** On unmount, any in-flight request MUST be aborted to prevent state updates on unmounted components.

**REQUIREMENT (§15.6):** `useHttpRequest` MUST NOT throw in response to a network error or an `Err` Result. Errors MUST be reflected in the `result` and `error` state fields only.

**REQUIREMENT (§15.7):** `request` identity MUST be based on the `request` parameter itself. If the caller creates a new `HttpRequest` object with the same values on every render, `useHttpRequest` WILL re-execute on every render unless the caller memoizes the request. Callers are responsible for memoization.

### State Transitions

```
Initial: idle (result: undefined)
  → enabled becomes true  →  loading (result: previous | undefined)
  → request completes Ok  →  success (result: Ok(response))
  → request completes Err →  error   (result: Err(error))
  → deps change while loading → (abort in-flight) → loading (new request)
  → enabled becomes false  →  idle   (result: preserved from last completed request)
```

### Example: Basic Query

```tsx
function UserProfile({ userId }: { userId: string }) {
  const request = useMemo(
    () => HttpRequest.get(`/api/users/${userId}`),
    [userId]
  );
  const { status, response, error } = useHttpRequest(request, { deps: [userId] });

  if (status === "loading") return <Spinner />;
  if (status === "error") return <ErrorMessage error={error} />;
  if (status === "success") return <Profile data={response} />;
  return null;
}
```

### Example: Conditional Fetch

```tsx
function ConditionalFetch({ id, skip }: { id: string; skip: boolean }) {
  const request = useMemo(() => HttpRequest.get(`/api/items/${id}`), [id]);
  const { result } = useHttpRequest(request, { enabled: !skip, deps: [id] });
  // ...
}
```

> **Definition of Done**: [DoD 3](./05-definition-of-done.md#dod-3-usehttprequest)

---

## §16. useHttpMutation — State Type

```typescript
interface UseHttpMutationState<E extends HttpRequestError = HttpRequestError> {
  /** Current lifecycle status. */
  readonly status: HttpRequestStatus;
  /** True while the mutation is in-flight. */
  readonly isLoading: boolean;
  /** The Result from the most recent completed mutation, or undefined if none. */
  readonly result: Result<HttpResponse, E> | undefined;
  /** Shorthand: the success value if status === "success", else undefined. */
  readonly response: HttpResponse | undefined;
  /** Shorthand: the error value if status === "error", else undefined. */
  readonly error: E | undefined;
  /** Reset state back to idle. */
  readonly reset: () => void;
}
```

---

## §17. useHttpMutation Hook

```typescript
function useHttpMutation<E extends HttpRequestError = HttpRequestError>(): [
  mutate: (request: HttpRequest) => Promise<Result<HttpResponse, E>>,
  state: UseHttpMutationState<E>,
];
```

### Behavior

**REQUIREMENT (§17.1):** `useHttpMutation` MUST return a tuple `[mutate, state]`.

**REQUIREMENT (§17.2):** `mutate(request)` MUST execute the provided `HttpRequest` using the client from the nearest `HttpClientProvider` and return a `Promise<Result<HttpResponse, E>>`.

**REQUIREMENT (§17.3):** `mutate` MUST update `state` synchronously to `"loading"` before starting the request, and update to `"success"` or `"error"` upon completion.

**REQUIREMENT (§17.4):** `mutate` MUST NOT throw. All errors MUST be returned as `Err` Results and reflected in state.

**REQUIREMENT (§17.5):** Calling `mutate` while a previous mutation is in-flight is permitted. The in-flight mutation MUST NOT be aborted. State reflects the most recently completed mutation.

**REQUIREMENT (§17.6):** `state.reset()` MUST reset the state to `"idle"` with `result: undefined`. Any in-flight mutation is not affected by `reset()`.

**REQUIREMENT (§17.7):** `useHttpMutation` MUST throw if called outside an `HttpClientProvider` tree (see [§11](./02-provider.md#§11-missing-provider-error)).

**REQUIREMENT (§17.8):** On unmount, any in-flight mutation MUST be abandoned. State updates MUST NOT be applied after unmount.

### Example: Create Resource

```tsx
function CreateUserForm() {
  const [mutate, { status, response, error, reset }] = useHttpMutation();

  const handleSubmit = useCallback(async (formData: UserInput) => {
    const request = HttpRequest.post("/api/users", {
      body: HttpBody.json(formData),
    });
    const result = await mutate(request);
    // result is also available in state.result
    result.match(
      () => navigateTo("/users"),
      err => console.error(err.message),
    );
  }, [mutate]);

  return (
    <form onSubmit={handleSubmit}>
      {status === "error" && <Alert>{error.message}</Alert>}
      {status === "success" && <Alert variant="success">Created!</Alert>}
      <button type="button" onClick={reset}>Reset</button>
      <button type="submit" disabled={status === "loading"}>Create</button>
    </form>
  );
}
```

> **Definition of Done**: [DoD 4](./05-definition-of-done.md#dod-4-usehttpmutation)

---

## §18. Abort Signal Integration

**REQUIREMENT (§18.1):** `useHttpRequest` MUST create an `AbortController` for each request execution and pass its `signal` to `HttpClient` via `HttpRequest.withSignal(signal)`.

**REQUIREMENT (§18.2):** When a `useHttpRequest` unmounts or its `deps` change (triggering a new execution), the previous `AbortController` MUST be aborted.

**REQUIREMENT (§18.3):** When `useHttpMutation` unmounts, any in-flight `AbortController` MUST be aborted.

**REQUIREMENT (§18.4):** If `HttpRequest` already has a signal set (e.g., the caller composed an abort signal via `HttpRequest.withSignal`), `useHttpRequest` SHOULD NOT override it. The hook-managed signal MUST be used unless the caller explicitly provided one.

> See [INV-HCR-4](./invariants.md#inv-hcr-4-abort-on-unmount) for the invariant this enforces.
