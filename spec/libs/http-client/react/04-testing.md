# 04 — Testing

## §19. Testing Philosophy

`@hex-di/http-client-react` follows the same adapter-swapping testing strategy as the parent `@hex-di/http-client` package. Tests replace the production `HttpClient` with a `MockHttpClient` from `@hex-di/http-client-testing` by wrapping the component under test with `createHttpClientTestProvider`.

React hook tests use `@testing-library/react`'s `renderHook` and `act` utilities.

## §20. createHttpClientTestProvider

A minimal wrapper around `HttpClientProvider` for test environments.

### Signature

```typescript
interface HttpClientTestProviderProps {
  /** The mock or stub HttpClient to inject. */
  readonly client: HttpClient;
  /** Child components. */
  readonly children: ReactNode;
}

function createHttpClientTestProvider(
  client: HttpClient,
): React.ComponentType<{ children: ReactNode }>;
```

**REQUIREMENT (§20.1):** `createHttpClientTestProvider(client)` MUST return a React component that wraps its `children` in an `HttpClientProvider` with the given `client`.

**REQUIREMENT (§20.2):** The returned component MUST be usable as the `wrapper` option in `@testing-library/react`'s `renderHook`.

**REQUIREMENT (§20.3):** `createHttpClientTestProvider` MUST NOT set up any global state or module-level mocks.

### Usage with renderHook

```typescript
import { renderHook, act } from "@testing-library/react";
import { createMockHttpClient, mockJsonResponse } from "@hex-di/http-client-testing";
import { createHttpClientTestProvider, useHttpRequest } from "@hex-di/http-client-react";
import { HttpRequest } from "@hex-di/http-client";

it("resolves a successful request", async () => {
  const mockClient = createMockHttpClient({
    "GET /api/users": mockJsonResponse(200, [{ id: 1, name: "Alice" }]),
  });
  const wrapper = createHttpClientTestProvider(mockClient);

  const request = HttpRequest.get("/api/users");
  const { result } = renderHook(() => useHttpRequest(request), { wrapper });

  expect(result.current.status).toBe("loading");

  await act(async () => {
    await result.current.result; // wait for completion
  });

  expect(result.current.status).toBe("success");
  expect(result.current.response?.status).toBe(200);
});
```

### Usage with render

```tsx
import { render, screen } from "@testing-library/react";
import { createMockHttpClient, mockErrorResponse } from "@hex-di/http-client-testing";

it("renders error state on request failure", async () => {
  const mockClient = createMockHttpClient({
    "GET /api/users": mockErrorResponse("NetworkError"),
  });
  const Wrapper = createHttpClientTestProvider(mockClient);

  render(
    <Wrapper>
      <UserList />
    </Wrapper>
  );

  await screen.findByText(/error/i);
});
```

## §21. Recommended Test Patterns

### §21.1: Testing useHttpClient

```typescript
it("resolves the HttpClient from context", () => {
  const mockClient = createMockHttpClient({});
  const wrapper = createHttpClientTestProvider(mockClient);
  const { result } = renderHook(() => useHttpClient(), { wrapper });
  expect(result.current).toBe(mockClient);
});
```

### §21.2: Testing missing provider

```typescript
it("throws when used outside a provider", () => {
  // Suppress expected error output
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => renderHook(() => useHttpClient())).toThrow(
    "useHttpClient must be used within an HttpClientProvider"
  );
  spy.mockRestore();
});
```

### §21.3: Testing useHttpRequest loading state

```typescript
it("starts in loading state", () => {
  const mockClient = createMockHttpClient({
    "GET /api/data": () => new Promise(() => {}), // never resolves
  });
  const wrapper = createHttpClientTestProvider(mockClient);
  const request = HttpRequest.get("/api/data");
  const { result } = renderHook(() => useHttpRequest(request), { wrapper });

  expect(result.current.status).toBe("loading");
  expect(result.current.isLoading).toBe(true);
  expect(result.current.result).toBeUndefined();
});
```

### §21.4: Testing useHttpRequest with enabled: false

```typescript
it("remains idle when enabled is false", () => {
  const mockClient = createMockHttpClient({});
  const wrapper = createHttpClientTestProvider(mockClient);
  const request = HttpRequest.get("/api/data");
  const { result } = renderHook(
    () => useHttpRequest(request, { enabled: false }),
    { wrapper }
  );

  expect(result.current.status).toBe("idle");
  expect(result.current.isLoading).toBe(false);
});
```

### §21.5: Testing useHttpMutation

```typescript
it("executes mutation and updates state", async () => {
  const mockClient = createMockHttpClient({
    "POST /api/items": mockJsonResponse(201, { id: 42 }),
  });
  const wrapper = createHttpClientTestProvider(mockClient);
  const { result } = renderHook(() => useHttpMutation(), { wrapper });
  const [mutate, state] = result.current;

  let mutateResult: Result<HttpResponse, HttpRequestError> | undefined;

  await act(async () => {
    mutateResult = await mutate(HttpRequest.post("/api/items", {
      body: HttpBody.json({ name: "New Item" }),
    }));
  });

  expect(result.current[1].status).toBe("success");
  expect(mutateResult?.isOk()).toBe(true);
});
```

## §22. Coverage Requirements

**REQUIREMENT (§22.1):** Every hook exported by `@hex-di/http-client-react` MUST have a test for the missing-provider error (§11 behavior).

**REQUIREMENT (§22.2):** `useHttpRequest` MUST have tests covering all four `HttpRequestStatus` transitions: `idle → loading`, `loading → success`, `loading → error`, and `deps` change mid-flight (abort behavior).

**REQUIREMENT (§22.3):** `useHttpMutation` MUST have tests covering: initial state, loading state during mutation, success state, error state, and `reset()` behavior.

**REQUIREMENT (§22.4):** Type tests (`.test-d.ts`) MUST verify that `UseHttpRequestState<E>` and `UseHttpMutationState<E>` correctly narrow the `error` field type when a specific `E` is provided.

> **Definition of Done**: [DoD 5](./05-definition-of-done.md#dod-5-testing-utilities)
