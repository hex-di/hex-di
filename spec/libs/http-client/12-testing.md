# 12 - Testing

## §58. Test Utilities

The primary testing strategy is **adapter swapping** -- replace the production HTTP client adapter with a mock adapter in the graph. This aligns with HexDI's universal testing pattern: same graph shape, different adapters.

### createHttpClientTestContainer

```typescript
function createHttpClientTestContainer(
  mockClient: HttpClient,
  additionalAdapters?: ReadonlyArray<
    Adapter<Port<unknown, string>, ReadonlyArray<Port<unknown, string>>, string, string>
  >
): {
  readonly container: Container;
  readonly dispose: () => void;
};
```

### Usage

```typescript
const mock = createMockHttpClient({
  "GET /api/users": mockJsonResponse(200, [{ id: 1, name: "Alice" }]),
  "POST /api/users": mockJsonResponse(201, { id: 2, name: "Bob" }),
});

const { container, dispose } = createHttpClientTestContainer(mock, [UserServiceAdapter]);

try {
  const userService = container.resolve(UserServicePort);
  const result = await userService.getAll().promise;
  expect(result.isOk()).toBe(true);
} finally {
  dispose();
}
```

## §59. Mock HttpClient

### createMockHttpClient

Creates a mock HTTP client with route-based response matching:

```typescript
function createMockHttpClient(routes: MockRoutes | MockHandler): HttpClient;

/**
 * Route map: "METHOD /path" → response.
 * Supports wildcard method (*) and glob patterns for paths.
 */
type MockRoutes = Readonly<Record<string, HttpResponse | MockResponseConfig>>;

/**
 * Dynamic handler: receives the request, returns a response or error.
 */
type MockHandler = (request: HttpRequest) => Result<HttpResponse, HttpRequestError>;

interface MockResponseConfig {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly text?: string;
  readonly delay?: number;
}
```

### Route Matching

Routes are matched by `"METHOD /path"` patterns:

| Pattern              | Matches                                           |
| -------------------- | ------------------------------------------------- |
| `"GET /api/users"`   | Exact match: GET /api/users                       |
| `"POST /api/users"`  | Exact match: POST /api/users                      |
| `"* /api/health"`    | Any method: GET, POST, etc. to /api/health        |
| `"GET /api/users/*"` | Glob: GET /api/users/123, /api/users/abc          |
| `"GET /api/**"`      | Deep glob: GET /api/users, /api/users/123/profile |

### Examples

```typescript
// Static route map
const mock = createMockHttpClient({
  "GET /api/users": mockJsonResponse(200, [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ]),
  "GET /api/users/*": mockJsonResponse(200, { id: 1, name: "Alice" }),
  "POST /api/users": mockJsonResponse(201, { id: 3, name: "Charlie" }),
  "DELETE /api/users/*": mockResponse(204),
  "* /api/health": mockResponse(200, { text: "ok" }),
});

// Dynamic handler
const dynamicMock = createMockHttpClient(request => {
  if (request.url.includes("/fail")) {
    return Result.err(httpRequestError("Transport", request, "Connection refused"));
  }

  if (request.method === "POST") {
    return Result.ok(createMockResponse(201, { id: crypto.randomUUID() }));
  }

  return Result.ok(createMockResponse(200, { message: "ok" }));
});
```

### No-Match Behavior

When a request does not match any route, the mock client returns:

```typescript
Err({
  _tag: "HttpRequestError",
  reason: "Transport",
  message: "No mock route matches: GET /api/unknown",
  ...
})
```

This makes missing mock routes visible immediately in tests rather than silently returning unexpected responses.

## §60. Recording Client

Wraps any `HttpClient` to record all requests for later assertion:

```typescript
function createRecordingClient(inner: HttpClient): {
  readonly client: HttpClient;
  readonly getRequests: () => readonly RecordedRequest[];
  readonly getResponses: () => readonly RecordedResponse[];
  readonly clear: () => void;
};

interface RecordedRequest {
  readonly request: HttpRequest;
  readonly timestamp: number;
}

interface RecordedResponse {
  readonly request: HttpRequest;
  readonly response: HttpResponse | undefined;
  readonly error: HttpClientError | undefined;
  readonly durationMs: number;
  readonly timestamp: number;
}
```

### Usage

```typescript
const mock = createMockHttpClient({
  "GET /api/users": mockJsonResponse(200, []),
  "POST /api/users": mockJsonResponse(201, { id: 1 }),
});

const { client, getRequests, getResponses } = createRecordingClient(mock);

// Use the recording client in tests
await client.get("/api/users").promise;
await client.post("/api/users", { json: { name: "Alice" } }).promise;

// Assert on recorded requests
expect(getRequests()).toHaveLength(2);
expect(getRequests()[0].request.method).toBe("GET");
expect(getRequests()[0].request.url).toContain("/api/users");

expect(getRequests()[1].request.method).toBe("POST");

// Assert on recorded responses
expect(getResponses()).toHaveLength(2);
expect(getResponses()[0].response?.status).toBe(200);
expect(getResponses()[1].response?.status).toBe(201);
```

## §61. Response Factories

Helper functions for creating mock responses:

```typescript
/** Create a mock response with a status code */
function mockResponse(
  status: number,
  options?: {
    readonly headers?: Readonly<Record<string, string>>;
    readonly text?: string;
  }
): HttpResponse;

/** Create a mock response with a JSON body */
function mockJsonResponse(
  status: number,
  body: unknown,
  options?: {
    readonly headers?: Readonly<Record<string, string>>;
  }
): HttpResponse;

/** Create a mock response that simulates a network error */
function mockRequestError(reason: HttpRequestError["reason"], message?: string): HttpRequestError;

/** Create a mock response with streaming body */
function mockStreamResponse(
  status: number,
  chunks: readonly Uint8Array[],
  options?: {
    readonly headers?: Readonly<Record<string, string>>;
    readonly delayBetweenChunks?: number;
  }
): HttpResponse;
```

### Usage

```typescript
// Simple 200 OK
const ok = mockResponse(200);

// JSON response with custom headers
const users = mockJsonResponse(200, [{ id: 1 }], {
  headers: { "X-Total-Count": "42" },
});

// Error responses
const notFound = mockJsonResponse(404, { error: "Not found" });
const serverError = mockJsonResponse(500, { error: "Internal server error" });

// Network error
const networkError = mockRequestError("Transport", "ECONNREFUSED");
```

### MockHttpClientAdapter

For use in HexDI graphs during testing:

```typescript
function createMockHttpClientAdapter(
  routesOrHandler: MockRoutes | MockHandler
): Adapter<typeof HttpClientPort, [], "singleton", "sync">;
```

```typescript
const testGraph = GraphBuilder.create()
  .provide(
    createMockHttpClientAdapter({
      "GET /api/users": mockJsonResponse(200, []),
    })
  )
  .provide(UserServiceAdapter)
  .build();
```

## §62. Vitest Matchers

Custom vitest matchers for HTTP client testing. Registered via `setupHttpClientMatchers()`.

### Setup

```typescript
// vitest.setup.ts
import { setupHttpClientMatchers } from "@hex-di/http-client-testing";

setupHttpClientMatchers();
```

### Matchers

```typescript
interface HttpClientMatchers {
  /** Assert that a ResultAsync resolved to an Ok HttpResponse with the given status */
  toRespondWith(status: number): Promise<void>;

  /** Assert that a ResultAsync resolved to an Ok HttpResponse with status 200-299 */
  toRespondOk(): Promise<void>;

  /** Assert that a ResultAsync resolved to an Err HttpRequestError */
  toFailWithRequestError(reason?: HttpRequestError["reason"]): Promise<void>;

  /** Assert that a ResultAsync resolved to an Err HttpResponseError */
  toFailWithResponseError(reason?: HttpResponseError["reason"]): Promise<void>;

  /** Assert that a RecordedRequest has the given method */
  toHaveMethod(method: HttpMethod): void;

  /** Assert that a RecordedRequest has a URL containing the given substring */
  toHaveUrl(url: string): void;

  /** Assert that a RecordedRequest has a specific header */
  toHaveRequestHeader(key: string, value?: string): void;

  /** Assert the recording client received N requests */
  toHaveRequestCount(count: number): void;
}
```

### Usage

```typescript
import { createMockHttpClient, mockJsonResponse } from "@hex-di/http-client-testing";

test("fetches users successfully", async () => {
  const mock = createMockHttpClient({
    "GET /api/users": mockJsonResponse(200, [{ id: 1 }]),
  });

  const result = mock.get("/api/users");

  await expect(result).toRespondOk();
  await expect(result).toRespondWith(200);
});

test("handles network errors", async () => {
  const mock = createMockHttpClient(req =>
    Result.err(httpRequestError("Transport", req, "Connection refused"))
  );

  const result = mock.get("/api/users");

  await expect(result).toFailWithRequestError("Transport");
});

test("sends correct headers", async () => {
  const { client, getRequests } = createRecordingClient(
    createMockHttpClient({ "GET /api/users": mockResponse(200) })
  );

  await pipe(client, HttpClient.bearerAuth("tok_abc")).get("/api/users").promise;

  expect(getRequests()[0]).toHaveRequestHeader("authorization", "Bearer tok_abc");
});
```

## §63. Type-Level Tests

Type-level tests verify that HTTP client types, port inference, and combinator composition produce correct types.

### File Naming

```
packages/http-client/core/tests/
  http-client-port.test.ts       # Runtime tests
  http-client-port.test-d.ts     # Type-level tests
  http-request.test-d.ts         # Request combinator types
  combinators.test-d.ts          # Client combinator types
```

### Port Type Inference

```typescript
import { expectTypeOf, it } from "vitest";

it("HttpClientPort resolves to HttpClient", () => {
  expectTypeOf<InferHttpClient<typeof HttpClientPort>>().toEqualTypeOf<HttpClient>();
});

it("HttpClientPort is an outbound DirectedPort", () => {
  expectTypeOf<typeof HttpClientPort>().toMatchTypeOf<
    DirectedPort<HttpClient, "HttpClient", "outbound">
  >();
});

it("InferHttpClient produces InferenceError for non-port", () => {
  type Result = InferHttpClient<string>;
  expectTypeOf<Result>().toMatchTypeOf<{
    readonly __inferenceError: true;
    readonly __source: "InferHttpClient";
  }>();
});
```

### Request Combinator Types

```typescript
it("get returns HttpRequest with GET method", () => {
  const req = HttpRequest.get("https://example.com");
  expectTypeOf(req).toEqualTypeOf<HttpRequest>();
});

it("bodyJson returns Result<HttpRequest, HttpBodyError>", () => {
  const req = HttpRequest.get("https://example.com");
  const result = HttpRequest.bodyJson({ name: "Alice" })(req);
  expectTypeOf(result).toEqualTypeOf<Result<HttpRequest, HttpBodyError>>();
});

it("bearerToken returns HttpRequest (not Result)", () => {
  const req = HttpRequest.get("https://example.com");
  const result = HttpRequest.bearerToken("tok_abc")(req);
  expectTypeOf(result).toEqualTypeOf<HttpRequest>();
});
```

### Client Combinator Types

```typescript
it("execute returns ResultAsync<HttpResponse, HttpRequestError>", () => {
  declare const client: HttpClient;
  const result = client.execute(HttpRequest.get("https://example.com"));
  expectTypeOf(result).toEqualTypeOf<ResultAsync<HttpResponse, HttpRequestError>>();
});

it("filterStatusOk returns HttpClient", () => {
  declare const client: HttpClient;
  const filtered = HttpClient.filterStatusOk(client);
  expectTypeOf(filtered).toEqualTypeOf<HttpClient>();
});

it("baseUrl returns HttpClient", () => {
  declare const client: HttpClient;
  const withBase = HttpClient.baseUrl("https://api.example.com")(client);
  expectTypeOf(withBase).toEqualTypeOf<HttpClient>();
});
```

---

_Previous: [11 - Introspection](./11-introspection.md)_

_Next: [13 - Advanced Patterns](./13-advanced.md)_

> **Tests**: [Testing Utility Tests (TST-001–TST-020)](./17-definition-of-done.md#testing-utility-tests)
