# 08 - Transport Adapters

## §39. Transport Adapter Architecture

Transport adapters bridge the `HttpClient` interface to a concrete HTTP library or runtime. Each adapter is a standard HexDI `Adapter` that provides `HttpClientPort`. Programs never import adapters directly -- they depend on `HttpClientPort` and the graph wiring selects the adapter.

```
HttpClientPort (contract)
        │
        ├── FetchHttpClientAdapter     (@hex-di/http-client-fetch)   -- universal fetch
        ├── AxiosHttpClientAdapter     (@hex-di/http-client-axios)   -- axios
        ├── GotHttpClientAdapter       (@hex-di/http-client-got)     -- got (Node.js)
        ├── KyHttpClientAdapter        (@hex-di/http-client-ky)      -- ky (Fetch-based)
        ├── OfetchHttpClientAdapter    (@hex-di/http-client-ofetch)  -- ofetch (universal)
        ├── NodeHttpClientAdapter      (@hex-di/http-client-node)    -- node:http/node:https
        ├── UndiciHttpClientAdapter    (@hex-di/http-client-undici)  -- undici
        ├── BunHttpClientAdapter       (@hex-di/http-client-bun)     -- Bun.fetch
        └── MockHttpClientAdapter      (@hex-di/http-client-testing) -- testing
```

### Adapter Responsibilities

Each transport adapter must:

1. Convert `HttpRequest` to the library's native request format
2. Execute the request using the library's transport
3. Convert the library's native response to `HttpResponse`
4. Map library-specific errors to `HttpRequestError`
5. Respect `AbortSignal` / `timeoutMs` from the request
6. Handle body serialization based on `HttpBody._tag`
7. Support `ReadableStream` for streaming bodies and responses

### Transport Adapter Contract

Every transport adapter MUST provide three mapping tables that define its behavior:

1. **Body Serialization** -- how each `HttpBody` variant is converted to the library's native body type
2. **Error Mapping** -- how library-specific errors are mapped to `HttpRequestError` reason variants
3. **Response Construction** -- how the library's native response is converted to an `HttpResponse`

These tables are documented in each adapter section below and form the normative contract for adapter correctness.

### createHttpClientAdapter

Factory function for creating custom transport adapters:

```typescript
function createHttpClientAdapter(
  execute: (
    request: HttpRequest,
    signal: AbortSignal
  ) => ResultAsync<HttpResponse, HttpRequestError>
): HttpClient;
```

## §40. Fetch Adapter

Located in `@hex-di/http-client-fetch`. Uses the global `fetch` API, available in browsers, Node.js 18+, Deno, Bun, and Cloudflare Workers.

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
import { FetchHttpClientAdapter } from "@hex-di/http-client-fetch";

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

## §41. Node.js Adapter

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

## §42. Undici Adapter

Located in `@hex-di/http-client-undici`. Uses the [undici](https://undici.nodejs.org/) HTTP client for Node.js, offering HTTP/2 support, connection pooling, and better performance.

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
import { UndiciHttpClientAdapter } from "@hex-di/http-client-undici";

const UndiciHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: "singleton",
  factory: () => createUndiciHttpClient({ allowH2: true }),
});
```

## §43. Bun Adapter

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

## §44a. Axios Adapter

Located in `@hex-di/http-client-axios`. Uses [axios](https://axios-http.com/) as the HTTP transport. Works in browsers and Node.js.

### Factory

```typescript
function createAxiosHttpClient(options?: AxiosHttpClientOptions): HttpClient;

interface AxiosHttpClientOptions {
  /**
   * Custom axios instance. Default: axios.create().
   * Use this to share an axios instance with existing code.
   */
  readonly instance?: import("axios").AxiosInstance;

  /**
   * Disable axios's automatic response parsing.
   * Default: true (adapter controls parsing via responseType: "arraybuffer").
   */
  readonly disableAutoParse?: boolean;
}
```

### Adapter

```typescript
import { AxiosHttpClientAdapter } from "@hex-di/http-client-axios";

const AxiosHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: "singleton",
  factory: () => createAxiosHttpClient(),
});
```

### Body Serialization

The axios adapter converts `HttpBody` variants to axios request data:

| HttpBody Variant | Axios `data`                                  | Notes                                        |
| ---------------- | --------------------------------------------- | -------------------------------------------- |
| `EmptyBody`      | `undefined`                                   |                                              |
| `TextBody`       | `string`                                      |                                              |
| `JsonBody`       | `JSON.stringify(value)` + Content-Type header | Adapter pre-serializes to bypass axios auto  |
| `Uint8ArrayBody` | `Uint8Array`                                  | Uses `responseType: "arraybuffer"`           |
| `UrlEncodedBody` | `URLSearchParams` from `UrlParams.entries`    |                                              |
| `FormDataBody`   | `FormData`                                    |                                              |
| `StreamBody`     | `ReadableStream<Uint8Array>`                  | Node.js: converted to `Readable`             |

### Error Mapping

| Axios Error                             | HttpRequestError Reason |
| --------------------------------------- | ----------------------- |
| `AxiosError` with `code: "ERR_NETWORK"` | `"Transport"`           |
| `AxiosError` with `code: "ECONNABORTED"` + timeout | `"Timeout"` |
| `AxiosError` with `code: "ERR_CANCELED"` | `"Aborted"`            |
| URL parse failure                       | `"InvalidUrl"`          |

### Configuration Notes

The adapter disables axios's built-in features to maintain HexDI's explicit combinator model:

- `responseType: "arraybuffer"` -- prevents auto-parsing (adapter controls body access)
- `validateStatus: () => true` -- all status codes are passed through (HexDI combinators handle filtering)
- `timeout: 0` -- disables axios timeout (HexDI `timeout` combinator handles this)
- No interceptors -- HexDI combinators replace axios interceptors

## §44b. Got Adapter

Located in `@hex-di/http-client-got`. Uses [got](https://github.com/sindresorhus/got) as the HTTP transport. **Node.js only** (got does not support browsers).

### Factory

```typescript
function createGotHttpClient(options?: GotHttpClientOptions): HttpClient;

interface GotHttpClientOptions {
  /**
   * Custom got instance. Default: got.extend().
   * Use this to share a got instance with existing code.
   */
  readonly instance?: import("got").Got;

  /**
   * Disable got's automatic retry.
   * Default: true (HexDI retry combinator handles retries).
   */
  readonly disableRetry?: boolean;
}
```

### Adapter

```typescript
import { GotHttpClientAdapter } from "@hex-di/http-client-got";

const GotHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: "singleton",
  factory: () => createGotHttpClient(),
});
```

### Body Serialization

The got adapter converts `HttpBody` variants to got request options:

| HttpBody Variant | Got Option                                    | Notes                                   |
| ---------------- | --------------------------------------------- | --------------------------------------- |
| `EmptyBody`      | (no body)                                     |                                         |
| `TextBody`       | `body: string`                                |                                         |
| `JsonBody`       | `body: JSON.stringify(value)` + Content-Type  | Adapter pre-serializes to bypass got    |
| `Uint8ArrayBody` | `body: Buffer.from(data)`                     |                                         |
| `UrlEncodedBody` | `form: Object.fromEntries(entries)`           |                                         |
| `FormDataBody`   | `body: FormData` (via `form-data` package)    |                                         |
| `StreamBody`     | `body: Readable.fromWeb(stream)`              | Converts `ReadableStream` to Node stream |

### Error Mapping

| Got Error                      | HttpRequestError Reason |
| ------------------------------ | ----------------------- |
| `RequestError` (network)       | `"Transport"`           |
| `TimeoutError`                 | `"Timeout"`             |
| `CancelError`                  | `"Aborted"`             |
| URL parse failure              | `"InvalidUrl"`          |

### Configuration Notes

The adapter disables got's built-in features to maintain HexDI's explicit combinator model:

- `retry: { limit: 0 }` -- disables got retry (HexDI `retry` combinator handles this)
- `responseType: "buffer"` -- prevents auto-parsing (adapter controls body access)
- `throwHttpErrors: false` -- all status codes are passed through
- `timeout: {}` -- disables got timeout (HexDI `timeout` combinator handles this)
- No hooks -- HexDI combinators replace got hooks

## §44c. Ky Adapter

Located in `@hex-di/http-client-ky`. Uses [ky](https://github.com/sindresorhus/ky) as the HTTP transport. Universal (browsers and Node.js via fetch).

### Factory

```typescript
function createKyHttpClient(options?: KyHttpClientOptions): HttpClient;

interface KyHttpClientOptions {
  /**
   * Custom ky instance. Default: ky.create().
   * Use this to share a ky instance with existing code.
   */
  readonly instance?: import("ky").KyInstance;

  /**
   * Disable ky's automatic retry.
   * Default: true (HexDI retry combinator handles retries).
   */
  readonly disableRetry?: boolean;
}
```

### Adapter

```typescript
import { KyHttpClientAdapter } from "@hex-di/http-client-ky";

const KyHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: "singleton",
  factory: () => createKyHttpClient(),
});
```

### Body Serialization

The ky adapter converts `HttpBody` variants to ky request options (Fetch-based):

| HttpBody Variant | Ky Option                                     |
| ---------------- | --------------------------------------------- |
| `EmptyBody`      | (no body)                                     |
| `TextBody`       | `body: string`                                |
| `JsonBody`       | `body: JSON.stringify(value)` + Content-Type  |
| `Uint8ArrayBody` | `body: Uint8Array`                            |
| `UrlEncodedBody` | `body: URLSearchParams`                       |
| `FormDataBody`   | `body: FormData`                              |
| `StreamBody`     | `body: ReadableStream<Uint8Array>`            |

### Error Mapping

| Ky Error                 | HttpRequestError Reason |
| ------------------------ | ----------------------- |
| `TypeError` (network)    | `"Transport"`           |
| `TimeoutError`           | `"Timeout"`             |
| `AbortError`             | `"Aborted"`             |
| URL parse failure        | `"InvalidUrl"`          |

### Configuration Notes

The adapter disables ky's built-in features to maintain HexDI's explicit combinator model:

- `retry: 0` -- disables ky retry (HexDI `retry` combinator handles this)
- `throwHttpErrors: false` -- all status codes are passed through
- `timeout: false` -- disables ky timeout (HexDI `timeout` combinator handles this)
- No hooks -- HexDI combinators replace ky hooks

## §44d. Ofetch Adapter

Located in `@hex-di/http-client-ofetch`. Uses [ofetch](https://github.com/unjs/ofetch) as the HTTP transport. Universal (browsers, Node.js, Deno, Bun, Workers).

### Factory

```typescript
function createOfetchHttpClient(options?: OfetchHttpClientOptions): HttpClient;

interface OfetchHttpClientOptions {
  /**
   * Custom ofetch instance. Default: ofetch.create().
   * Use this to share an ofetch instance with existing code.
   */
  readonly instance?: import("ofetch").ofetch;

  /**
   * Disable ofetch's automatic response parsing.
   * Default: true (adapter uses parseResponse: identity).
   */
  readonly disableAutoParse?: boolean;
}
```

### Adapter

```typescript
import { OfetchHttpClientAdapter } from "@hex-di/http-client-ofetch";

const OfetchHttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  lifetime: "singleton",
  factory: () => createOfetchHttpClient(),
});
```

### Body Serialization

The ofetch adapter converts `HttpBody` variants to ofetch request options:

| HttpBody Variant | Ofetch Option                                 | Notes                                    |
| ---------------- | --------------------------------------------- | ---------------------------------------- |
| `EmptyBody`      | (no body)                                     |                                          |
| `TextBody`       | `body: string`                                |                                          |
| `JsonBody`       | `body: JSON.stringify(value)` + Content-Type  | Adapter pre-serializes to bypass ofetch  |
| `Uint8ArrayBody` | `body: Uint8Array`                            |                                          |
| `UrlEncodedBody` | `body: URLSearchParams`                       |                                          |
| `FormDataBody`   | `body: FormData`                              |                                          |
| `StreamBody`     | `body: ReadableStream<Uint8Array>`            |                                          |

### Error Mapping

| Ofetch Error                       | HttpRequestError Reason |
| ---------------------------------- | ----------------------- |
| `FetchError` (network)             | `"Transport"`           |
| `FetchError` with abort + timeout  | `"Timeout"`             |
| `FetchError` with abort (manual)   | `"Aborted"`             |
| URL parse failure                  | `"InvalidUrl"`          |

### Configuration Notes

The adapter disables ofetch's built-in features to maintain HexDI's explicit combinator model:

- `parseResponse: (text) => text` -- disables auto-parsing (adapter controls body access)
- `retry: 0` -- disables ofetch retry (HexDI `retry` combinator handles this)
- `timeout: undefined` -- disables ofetch timeout (HexDI `timeout` combinator handles this)
- No interceptors -- HexDI combinators replace ofetch interceptors

## §44e. Choosing a Transport Adapter

| Scenario                          | Recommended Adapter | Rationale                                                                          |
| --------------------------------- | ------------------- | ---------------------------------------------------------------------------------- |
| Browser-only SPA                  | Fetch               | Zero dependencies, native `fetch` API                                              |
| Universal (browser + Node + edge) | Fetch or Ofetch     | Both use `fetch` under the hood; ofetch adds convenience if already in your stack  |
| Node.js microservice (HTTP/1.1)   | Node.js             | Minimal dependencies, direct `node:http` usage                                     |
| Node.js microservice (HTTP/2)     | Undici              | HTTP/2 via ALPN, connection pooling, best Node.js performance                      |
| Bun runtime                       | Bun                 | Bun-native optimizations                                                           |
| Existing axios codebase           | Axios               | Reuse existing axios instance and interceptors during migration                    |
| Existing got codebase (Node.js)   | Got                 | Reuse existing got instance during migration                                       |
| Existing ky codebase              | Ky                  | Reuse existing ky instance during migration; Fetch-based, works in browser + Node  |
| Existing ofetch/nuxt codebase     | Ofetch              | Reuse existing ofetch instance; universal, minimal                                 |
| Cloudflare Workers / Deno Deploy  | Fetch               | Fetch is the only available API in these runtimes                                  |
| Testing                           | Mock                | `@hex-di/http-client-testing` provides `MockHttpClientAdapter`                     |

## §44f. Custom Adapter

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

The composition root selects the adapter based on the target environment and team preference:

```typescript
// Browser/universal (fetch)
const graph = GraphBuilder.create().provide(FetchHttpClientAdapter).build();

// Node.js with undici (HTTP/2 support)
const graph = GraphBuilder.create().provide(UndiciHttpClientAdapter).build();

// Migrating from axios
const graph = GraphBuilder.create().provide(AxiosHttpClientAdapter).build();

// Testing
const graph = GraphBuilder.create().provide(MockHttpClientAdapter).build();
```

---

_Previous: [07 - Client Combinators](./07-client-combinators.md)_

_Next: [09 - Scoped Clients](./09-scoped-clients.md)_

> **Tests**: [Adapter Tests (FA/AX/GT/KY/OF)](./17-definition-of-done.md#fetch-adapter-tests-hex-dihttp-client-fetch)
