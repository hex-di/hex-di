# 08 - Platform Adapters

## 39. Adapter Architecture

Platform adapters bridge the `HttpClient` interface to a concrete HTTP transport. Each adapter is a standard HexDI `Adapter` that provides `HttpClientPort`. Programs never import adapters directly -- they depend on `HttpClientPort` and the graph wiring selects the adapter.

```
HttpClientPort (contract)
        │
        ├── FetchHttpClientAdapter     (@hex-di/http-client)      -- universal fetch
        ├── NodeHttpClientAdapter      (@hex-di/http-client-node) -- node:http/node:https
        ├── UndiciHttpClientAdapter    (@hex-di/http-client-node) -- undici
        ├── BunHttpClientAdapter       (@hex-di/http-client-bun)  -- Bun.fetch
        └── MockHttpClientAdapter      (@hex-di/http-client-testing) -- testing
```

### Adapter Responsibilities

Each platform adapter must:

1. Convert `HttpRequest` to the platform's native request format
2. Execute the request using the platform's transport
3. Convert the platform's native response to `HttpResponse`
4. Map platform-specific errors to `HttpRequestError`
5. Respect `AbortSignal` / `timeoutMs` from the request
6. Handle body serialization based on `HttpBody._tag`
7. Support `ReadableStream` for streaming bodies and responses

### createHttpClientAdapter

Factory function for creating custom platform adapters:

```typescript
function createHttpClientAdapter(
  execute: (
    request: HttpRequest,
    signal: AbortSignal
  ) => ResultAsync<HttpResponse, HttpRequestError>
): HttpClient;
```

## 40. Fetch Adapter

Built into `@hex-di/http-client`. Uses the global `fetch` API, available in browsers, Node.js 18+, Deno, Bun, and Cloudflare Workers.

### Factory

```typescript
function createFetchHttpClient(options?: FetchHttpClientOptions): HttpClient;

interface FetchHttpClientOptions {
  /**
   * Custom fetch function. Default: globalThis.fetch.
   * Use this for environments with a non-standard fetch (Cloudflare Workers, testing).
   */
  readonly fetch?: typeof globalThis.fetch;

  /**
   * Default request init merged into every fetch call.
   * Useful for setting credentials, mode, cache, redirect policies.
   */
  readonly requestInit?: Omit<RequestInit, "method" | "headers" | "body" | "signal">;
}
```

### Adapter

```typescript
const FetchHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: "singleton",
  factory: () => createFetchHttpClient(),
});
```

### Custom Fetch Adapter

```typescript
// Cloudflare Workers: use the Workers fetch
const CfHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: "singleton",
  factory: () => createFetchHttpClient({ fetch: globalThis.fetch }),
});

// Custom credentials policy
const CredentialedFetchAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: "singleton",
  factory: () =>
    createFetchHttpClient({
      requestInit: { credentials: "include" },
    }),
});
```

### Body Serialization

The fetch adapter converts `HttpBody` variants to `BodyInit`:

| HttpBody Variant | BodyInit                                      |
| ---------------- | --------------------------------------------- |
| `EmptyBody`      | `undefined`                                   |
| `TextBody`       | `string`                                      |
| `JsonBody`       | `JSON.stringify(value)` + Content-Type header |
| `Uint8ArrayBody` | `Uint8Array`                                  |
| `UrlEncodedBody` | `URLSearchParams` from `UrlParams.entries`    |
| `FormDataBody`   | `FormData`                                    |
| `StreamBody`     | `ReadableStream<Uint8Array>`                  |

### Error Mapping

| Fetch Error            | HttpRequestError Reason |
| ---------------------- | ----------------------- |
| `TypeError` (network)  | `"Transport"`           |
| `AbortError` (timeout) | `"Timeout"`             |
| `AbortError` (manual)  | `"Aborted"`             |
| URL parse failure      | `"InvalidUrl"`          |

## 41. Node.js Adapter

Located in `@hex-di/http-client-node`. Uses `node:http` and `node:https` modules.

### Factory

```typescript
function createNodeHttpClient(options?: NodeHttpClientOptions): HttpClient;

interface NodeHttpClientOptions {
  /** Custom HTTP agent. Default: new http.Agent with keep-alive. */
  readonly httpAgent?: import("node:http").Agent;

  /** Custom HTTPS agent. Default: new https.Agent with keep-alive. */
  readonly httpsAgent?: import("node:https").Agent;

  /** Maximum number of sockets per host. Default: 10. */
  readonly maxSockets?: number;

  /** Connection timeout in ms. Default: 30000. */
  readonly connectTimeout?: number;
}
```

### Adapter

```typescript
import { NodeHttpClientAdapter } from "@hex-di/http-client-node";

const NodeHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: "singleton",
  factory: () => createNodeHttpClient(),
});
```

### Graph Usage

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { NodeHttpClientAdapter } from "@hex-di/http-client-node";

const graph = GraphBuilder.create()
  .provide(NodeHttpClientAdapter)
  .provide(UserServiceAdapter)
  .build();
```

## 42. Undici Adapter

Also in `@hex-di/http-client-node`. Uses the [undici](https://undici.nodejs.org/) HTTP client for Node.js, offering HTTP/2 support, connection pooling, and better performance.

### Factory

```typescript
function createUndiciHttpClient(options?: UndiciHttpClientOptions): HttpClient;

interface UndiciHttpClientOptions {
  /** Maximum connections per origin. Default: 10. */
  readonly connections?: number;

  /** Pipeline connections per origin. Default: 1. */
  readonly pipelining?: number;

  /** Connect timeout in ms. Default: 30000. */
  readonly connectTimeout?: number;

  /** Idle timeout for keep-alive connections in ms. Default: 60000. */
  readonly keepAliveTimeout?: number;

  /** Enable HTTP/2 (ALPN negotiation). Default: false. */
  readonly allowH2?: boolean;
}
```

### Adapter

```typescript
import { UndiciHttpClientAdapter } from "@hex-di/http-client-node";

const UndiciHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: "singleton",
  factory: () => createUndiciHttpClient({ allowH2: true }),
});
```

## 43. Bun Adapter

Located in `@hex-di/http-client-bun`. Uses Bun's native fetch with Bun-specific optimizations.

### Adapter

```typescript
import { BunHttpClientAdapter } from "@hex-di/http-client-bun";

const BunHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: "singleton",
  factory: () => createBunHttpClient(),
});
```

## 44. Custom Adapter

For environments with custom HTTP transports (AWS Lambda with SDK, gRPC-HTTP bridge, etc.), use `createHttpClientAdapter`:

```typescript
const AwsHttpAdapter = createAdapter({
  provides: HttpClientPort,
  requires: [AwsCredentialsPort],
  lifetime: "singleton",
  factory: ({ AwsCredentials: creds }) =>
    createHttpClientAdapter((request, signal) => {
      // Convert HttpRequest to AWS SDK request format
      // Sign with SigV4 using creds
      // Execute via AWS SDK HTTP client
      // Convert response back to HttpResponse
      return ResultAsync.fromPromise(awsSdkFetch(request, creds, signal), cause =>
        httpRequestError("Transport", request, String(cause), cause)
      );
    }),
});
```

### Graph Wiring

The composition root selects the adapter based on the target environment:

```typescript
// Browser/universal
const graph = GraphBuilder.create().provide(FetchHttpClientAdapter).build();

// Node.js (production)
const graph = GraphBuilder.create().provide(UndiciHttpClientAdapter).build();

// Testing
const graph = GraphBuilder.create().provide(MockHttpClientAdapter).build();
```

---

_Previous: [07 - Client Combinators](./07-client-combinators.md)_

_Next: [09 - Scoped Clients](./09-scoped-clients.md)_
