# @hex-di/http-client-react — State Generic Types

Compile-time safety patterns for `UseHttpRequestState<E>` and `UseHttpMutationState<E>`. These are the only non-trivial type-level patterns in `@hex-di/http-client-react`; all other types are straightforward interfaces or aliases.

---

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HCR-TYP-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/react/type-system/state-generics.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## 1. Generic Error Parameter (`E`)

### Pattern

Both hook state types carry a generic parameter `E` that propagates the error type from `HttpClient` to component code.

```typescript
interface UseHttpRequestState<E extends HttpRequestError = HttpRequestError> {
  readonly status: HttpRequestStatus;
  readonly isLoading: boolean;
  readonly result: Result<HttpResponse, E> | undefined;
  readonly response: HttpResponse | undefined;
  readonly error: E | undefined;
}

interface UseHttpMutationState<E extends HttpRequestError = HttpRequestError> {
  readonly status: HttpRequestStatus;
  readonly isLoading: boolean;
  readonly result: Result<HttpResponse, E> | undefined;
  readonly response: HttpResponse | undefined;
  readonly error: E | undefined;
  readonly reset: () => void;
}
```

### How `E` flows

The hooks accept `E` at the call site and thread it through to the state:

```typescript
// Unparameterized — E defaults to HttpRequestError
const state = useHttpRequest(request);
// state.error: HttpRequestError | undefined

// Narrowed — E is a specific subtype
const state = useHttpRequest<HttpResponseError>(request);
// state.error: HttpResponseError | undefined

// Mutation — same E flows through mutate's return type
const [mutate, state] = useHttpMutation<HttpResponseError>();
// state.error: HttpResponseError | undefined
// mutate(req): Promise<Result<HttpResponse, HttpResponseError>>
```

### Constraint: `E extends HttpRequestError`

`E` is constrained to `HttpRequestError`, not the broader `HttpClientError` union. This reflects the hook contract: hooks consume `HttpClient.execute`, which returns `ResultAsync<HttpResponse, HttpRequestError>`. `HttpBodyError` (which arises during request body construction, before `execute` is called) is excluded from the hook error channel — it surfaces synchronously during `HttpRequest` construction, not as a hook state error.

### Default type argument

Both state types default `E` to `HttpRequestError`. This allows non-generic usage:

```typescript
// These are equivalent:
const state: UseHttpRequestState = ...;
const state: UseHttpRequestState<HttpRequestError> = ...;
```

Callers that do not need error type precision should omit `E`. Callers that need to pattern-match on `error._tag` specifically (e.g., only handle `"Timeout"` differently from `"Transport"`) benefit from keeping `E` as the default `HttpRequestError` — TypeScript's discriminant narrowing on `._tag` works correctly since `HttpRequestError` is a concrete interface with a literal `_tag` field.

---

## 2. `HttpRequestStatus` Discriminant and State Narrowing

### The discriminant

```typescript
type HttpRequestStatus = "idle" | "loading" | "success" | "error";
```

`status` is a literal union. TypeScript understands its values as exhaustive, enabling compile-time exhaustiveness checking in switch statements:

```typescript
switch (state.status) {
  case "idle":    return <Placeholder />;
  case "loading": return <Spinner />;
  case "success": return <View data={state.response} />;
  case "error":   return <ErrorMessage error={state.error} />;
  // TypeScript: no default needed — all cases handled
}
```

### Why the state object is not a discriminated union

`UseHttpRequestState<E>` is a plain `interface`, not a tagged union of shapes. This means TypeScript does **not** automatically narrow `result`, `response`, or `error` when `status` is checked:

```typescript
// status narrowing does NOT automatically narrow result:
if (state.status === "success") {
  state.result; // still: Result<HttpResponse, E> | undefined
}
```

This is intentional. React state objects are updated by reference replacement — components cannot guarantee that `status` and `result` are checked in the same render. A tagged union approach would require a single discriminant-carrying object, which complicates state update semantics.

### The shorthand fields as the narrowing escape hatch

The `response` and `error` shorthand fields are the idiomatic way to access the narrowed values:

```typescript
// response: HttpResponse | undefined
// error:    E | undefined
if (state.status === "success") {
  // state.response is HttpResponse | undefined — safe to use directly
  // because the spec guarantees response !== undefined when status === "success"
  doSomething(state.response!); // the ! is justified by §14.4 invariant
}
```

The relationship between `status` and the shorthand fields is guaranteed by spec invariants (§14.4, §14.5), not by the TypeScript type system. Implementations must enforce it at runtime. The type system cannot express "when `status === "success"`, `response` is `HttpResponse` (not `undefined`)" without a discriminated union — this is an accepted limitation documented in the spec.

---

## 3. Structural Incompatibility via `reset()`

### The structural relationship

`UseHttpMutationState<E>` is a structural superset of `UseHttpRequestState<E>`:

```
UseHttpMutationState<E> = UseHttpRequestState<E> + { reset: () => void }
```

This has precise structural assignment consequences:

| Assignment | Valid? | Reason |
|---|---|---|
| `UseHttpMutationState<E>` → `UseHttpRequestState<E>` | ✅ Yes | Structural: mutation state has all required fields plus extras |
| `UseHttpRequestState<E>` → `UseHttpMutationState<E>` | ❌ No | Structural: request state is missing `reset` |

### Intended incompatibility

The one-directional incompatibility is intentional. Components that call `state.reset()` must receive a `UseHttpMutationState`, and TypeScript will reject passing a `UseHttpRequestState` at compile time:

```typescript
function StatusBadge({ state }: { state: UseHttpMutationState }) {
  return (
    <button onClick={state.reset}>
      {state.status}
    </button>
  );
}

// Compile error — UseHttpRequestState lacks reset:
<StatusBadge state={requestState} />  // ❌ Type error

// Valid — UseHttpMutationState is structurally compatible:
<StatusBadge state={mutationState} />  // ✅
```

### Covariant reuse

Components that only read status/result fields accept either type:

```typescript
function StatusIndicator({ state }: { state: UseHttpRequestState }) {
  return <span>{state.status}</span>;
}

// Both valid — mutation state satisfies request state contract:
<StatusIndicator state={requestState} />   // ✅
<StatusIndicator state={mutationState} />  // ✅ (reset is excess)
```

This enables shared display components (e.g., a loading spinner, an error banner) to accept either hook state type without a union parameter.

---

## 4. Consistent `E` Across `mutate` Return and State

The `useHttpMutation<E>` hook returns a tuple `[mutate, state]` where `E` is shared:

```typescript
function useHttpMutation<E extends HttpRequestError = HttpRequestError>(): [
  mutate: (request: HttpRequest) => Promise<Result<HttpResponse, E>>,
  state: UseHttpMutationState<E>,
];
```

`mutate`'s return type `Promise<Result<HttpResponse, E>>` and `state.result: Result<HttpResponse, E> | undefined` use the **same** `E`. This means:

- The `Err` value in the awaited promise is the same type as `state.error`.
- There is no type mismatch between the imperative call path and the state-based reactive path.
- Callers can handle the error once, from either the awaited result or the state:

```typescript
const [mutate, { error }] = useHttpMutation<HttpResponseError>();

// Imperative handling:
const result = await mutate(request);
result.mapErr(e => console.error(e.reason)); // e: HttpResponseError

// State-based handling:
if (error) console.error(error.reason);      // error: HttpResponseError
```

**Invariant**: `state.error === (await mutate(request)).error` when the mutation completes with `Err`. Both are the identical frozen object from the HTTP client's error channel.

---

## 5. Related Invariants and ADRs

| Pattern | Enforced By | Spec Reference |
|---|---|---|
| Generic error `E` flows through state | TypeScript generics | [§14](../03-hooks.md#§14-usehttprequest-state-type), [§16](../03-hooks.md#§16-usehttpmutation-state-type) |
| `status` is a literal discriminant | `HttpRequestStatus` union | [§14.1](../03-hooks.md#§14-usehttprequest-state-type) |
| `response`/`error` shorthand narrowing | Runtime spec invariant §14.4/14.5 | [INV-HCR-2](../invariants.md#inv-hcr-2-never-throw-hook-contract) |
| `reset` structural incompatibility | TypeScript structural typing | [§17.6](../03-hooks.md#§17-usehttpmutation-hook) |
| `mutate` return matches state `E` | Shared generic parameter | [§17.2](../03-hooks.md#§17-usehttpmutation-hook) |
| No React leakage into domain types | One-way dependency | [ADR-HCR-003](../decisions/003-no-global-fetch.md), [overview.md Design Philosophy §1](../overview.md#design-philosophy) |
