# 14 - API Reference

## 70. Request Factories

| Function              | Signature                                                 | Returns       |
| --------------------- | --------------------------------------------------------- | ------------- |
| `HttpRequest.get`     | `(url: string \| URL) => HttpRequest`                     | `HttpRequest` |
| `HttpRequest.head`    | `(url: string \| URL) => HttpRequest`                     | `HttpRequest` |
| `HttpRequest.post`    | `(url: string \| URL) => HttpRequest`                     | `HttpRequest` |
| `HttpRequest.put`     | `(url: string \| URL) => HttpRequest`                     | `HttpRequest` |
| `HttpRequest.patch`   | `(url: string \| URL) => HttpRequest`                     | `HttpRequest` |
| `HttpRequest.del`     | `(url: string \| URL) => HttpRequest`                     | `HttpRequest` |
| `HttpRequest.options` | `(url: string \| URL) => HttpRequest`                     | `HttpRequest` |
| `HttpRequest.request` | `(method: HttpMethod, url: string \| URL) => HttpRequest` | `HttpRequest` |

## 71. Request Combinators

### Headers

| Function                          | Signature                                                      | Returns       |
| --------------------------------- | -------------------------------------------------------------- | ------------- |
| `HttpRequest.setRequestHeader`    | `(key: string, value: string) => (req) => HttpRequest`         | `HttpRequest` |
| `HttpRequest.setRequestHeaders`   | `(headers: Record<string, string>) => (req) => HttpRequest`    | `HttpRequest` |
| `HttpRequest.appendRequestHeader` | `(key: string, value: string) => (req) => HttpRequest`         | `HttpRequest` |
| `HttpRequest.removeRequestHeader` | `(key: string) => (req) => HttpRequest`                        | `HttpRequest` |
| `HttpRequest.bearerToken`         | `(token: string) => (req) => HttpRequest`                      | `HttpRequest` |
| `HttpRequest.basicAuth`           | `(username: string, password: string) => (req) => HttpRequest` | `HttpRequest` |
| `HttpRequest.acceptJson`          | `(req: HttpRequest) => HttpRequest`                            | `HttpRequest` |
| `HttpRequest.accept`              | `(mediaType: string) => (req) => HttpRequest`                  | `HttpRequest` |
| `HttpRequest.contentType`         | `(mediaType: string) => (req) => HttpRequest`                  | `HttpRequest` |

### URL

| Function                      | Signature                                                                   | Returns       |
| ----------------------------- | --------------------------------------------------------------------------- | ------------- |
| `HttpRequest.prependUrl`      | `(baseUrl: string) => (req) => HttpRequest`                                 | `HttpRequest` |
| `HttpRequest.appendUrl`       | `(path: string) => (req) => HttpRequest`                                    | `HttpRequest` |
| `HttpRequest.setUrlParams`    | `(params: UrlParamsInput) => (req) => HttpRequest`                          | `HttpRequest` |
| `HttpRequest.appendUrlParams` | `(params: UrlParamsInput) => (req) => HttpRequest`                          | `HttpRequest` |
| `HttpRequest.setUrlParam`     | `(key: string, value: string \| number \| boolean) => (req) => HttpRequest` | `HttpRequest` |

### Body

| Function                     | Signature                                                          | Returns                              |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------ |
| `HttpRequest.bodyText`       | `(text: string, contentType?: string) => (req) => HttpRequest`     | `HttpRequest`                        |
| `HttpRequest.bodyUint8Array` | `(data: Uint8Array, contentType?: string) => (req) => HttpRequest` | `HttpRequest`                        |
| `HttpRequest.bodyUrlEncoded` | `(params: UrlParamsInput) => (req) => HttpRequest`                 | `HttpRequest`                        |
| `HttpRequest.bodyFormData`   | `(data: FormData) => (req) => HttpRequest`                         | `HttpRequest`                        |
| `HttpRequest.bodyStream`     | `(stream: ReadableStream, options?) => (req) => HttpRequest`       | `HttpRequest`                        |
| `HttpRequest.bodyJson`       | `(value: unknown) => (req) => Result<HttpRequest, HttpBodyError>`  | `Result<HttpRequest, HttpBodyError>` |

### Signal

| Function                  | Signature                                       | Returns       |
| ------------------------- | ----------------------------------------------- | ------------- |
| `HttpRequest.withSignal`  | `(signal: AbortSignal) => (req) => HttpRequest` | `HttpRequest` |
| `HttpRequest.withTimeout` | `(ms: number) => (req) => HttpRequest`          | `HttpRequest` |

## 72. Response API

### Body Accessors

| Property / Function    | Type                                          | Description            |
| ---------------------- | --------------------------------------------- | ---------------------- |
| `response.json`        | `ResultAsync<unknown, HttpResponseError>`     | Parse body as JSON     |
| `response.text`        | `ResultAsync<string, HttpResponseError>`      | Read body as string    |
| `response.arrayBuffer` | `ResultAsync<ArrayBuffer, HttpResponseError>` | Read body as binary    |
| `response.blob`        | `ResultAsync<Blob, HttpResponseError>`        | Read body as Blob      |
| `response.formData`    | `ResultAsync<FormData, HttpResponseError>`    | Parse body as FormData |
| `response.stream`      | `ReadableStream<Uint8Array>`                  | Raw body stream        |

### Status Utilities

| Function           | Signature                                             | Returns   |
| ------------------ | ----------------------------------------------------- | --------- |
| `isOk`             | `(response: HttpResponse) => boolean`                 | `boolean` |
| `isRedirect`       | `(response: HttpResponse) => boolean`                 | `boolean` |
| `isClientError`    | `(response: HttpResponse) => boolean`                 | `boolean` |
| `isServerError`    | `(response: HttpResponse) => boolean`                 | `boolean` |
| `isInformational`  | `(response: HttpResponse) => boolean`                 | `boolean` |
| `hasStatus`        | `(status: number) => (response) => boolean`           | `boolean` |
| `hasStatusInRange` | `(min: number, max: number) => (response) => boolean` | `boolean` |

### Header Utilities

| Function            | Signature                                            | Returns               |
| ------------------- | ---------------------------------------------------- | --------------------- |
| `getResponseHeader` | `(key: string) => (response) => string \| undefined` | `string \| undefined` |
| `getContentType`    | `(response: HttpResponse) => string \| undefined`    | `string \| undefined` |
| `getContentLength`  | `(response: HttpResponse) => number \| undefined`    | `number \| undefined` |
| `hasContentType`    | `(mediaType: string) => (response) => boolean`       | `boolean`             |
| `getLocation`       | `(response: HttpResponse) => string \| undefined`    | `string \| undefined` |
| `getSetCookies`     | `(response: HttpResponse) => readonly string[]`      | `readonly string[]`   |

## 73. Client Combinators

### Request Transformation

| Function                      | Signature                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `HttpClient.mapRequest`       | `(f: (req) => HttpRequest) => (client) => HttpClient`                           |
| `HttpClient.mapRequestResult` | `(f: (req) => Result<HttpRequest, HttpRequestError>) => (client) => HttpClient` |

### Response Transformation

| Function                       | Signature                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `HttpClient.mapResponse`       | `(f: (res) => HttpResponse) => (client) => HttpClient`                            |
| `HttpClient.mapResponseResult` | `(f: (res) => Result<HttpResponse, HttpResponseError>) => (client) => HttpClient` |

### Status Filtering

| Function                    | Signature                                                            |
| --------------------------- | -------------------------------------------------------------------- |
| `HttpClient.filterStatusOk` | `(client: HttpClient) => HttpClient`                                 |
| `HttpClient.filterStatus`   | `(predicate: (status: number) => boolean) => (client) => HttpClient` |

### Base URL & Headers

| Function                    | Signature                                                     |
| --------------------------- | ------------------------------------------------------------- |
| `HttpClient.baseUrl`        | `(url: string) => (client) => HttpClient`                     |
| `HttpClient.defaultHeaders` | `(headers: Record<string, string>) => (client) => HttpClient` |

### Authentication

| Function                 | Signature                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `HttpClient.bearerAuth`  | `(token: string) => (client) => HttpClient`                                            |
| `HttpClient.basicAuth`   | `(username: string, password: string) => (client) => HttpClient`                       |
| `HttpClient.dynamicAuth` | `(getToken: (req) => ResultAsync<string, HttpRequestError>) => (client) => HttpClient` |

### Side-Effects

| Function                 | Signature                                           |
| ------------------------ | --------------------------------------------------- |
| `HttpClient.tapRequest`  | `(f: (req) => void) => (client) => HttpClient`      |
| `HttpClient.tapResponse` | `(f: (res, req) => void) => (client) => HttpClient` |
| `HttpClient.tapError`    | `(f: (err, req) => void) => (client) => HttpClient` |

### Retry

| Function                    | Signature                                                     |
| --------------------------- | ------------------------------------------------------------- |
| `HttpClient.retry`          | `(options: RetryOptions) => (client) => HttpClient`           |
| `HttpClient.retryTransient` | `(options?: RetryTransientOptions) => (client) => HttpClient` |

### Timeout

| Function             | Signature                                |
| -------------------- | ---------------------------------------- |
| `HttpClient.timeout` | `(ms: number) => (client) => HttpClient` |

### Error Recovery

| Function                | Signature                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `HttpClient.catchError` | `(tag: E, handler: (err) => ResultAsync<HttpResponse, HttpClientError>) => (client) => HttpClient` |
| `HttpClient.catchAll`   | `(handler: (err) => ResultAsync<HttpResponse, HttpClientError>) => (client) => HttpClient`         |

### Advanced

| Function                    | Signature                                                              |
| --------------------------- | ---------------------------------------------------------------------- |
| `HttpClient.circuitBreaker` | `(options: CircuitBreakerOptions) => (client) => HttpClient`           |
| `HttpClient.rateLimit`      | `(options: RateLimitOptions) => (client) => HttpClient`                |
| `HttpClient.cache`          | `(options: CacheOptions) => (client) => HttpClient`                    |
| `HttpClient.withTracing`    | `(options?: TracingOptions) => (client) => HttpClient`                 |
| `HttpClient.withLogging`    | `(logger: Logger, options?: LoggingOptions) => (client) => HttpClient` |

## 74. Error Types

| Type                | `_tag`                | Reason Variants                                                          |
| ------------------- | --------------------- | ------------------------------------------------------------------------ |
| `HttpRequestError`  | `"HttpRequestError"`  | `"Transport"` \| `"Timeout"` \| `"Aborted"` \| `"InvalidUrl"`            |
| `HttpResponseError` | `"HttpResponseError"` | `"StatusCode"` \| `"Decode"` \| `"EmptyBody"` \| `"BodyAlreadyConsumed"` |
| `HttpBodyError`     | `"HttpBodyError"`     | `"JsonSerialize"` \| `"Encode"`                                          |

### Type Guards

| Function              | Signature                                        |
| --------------------- | ------------------------------------------------ |
| `isHttpClientError`   | `(value: unknown) => value is HttpClientError`   |
| `isHttpRequestError`  | `(value: unknown) => value is HttpRequestError`  |
| `isHttpResponseError` | `(value: unknown) => value is HttpResponseError` |
| `isHttpBodyError`     | `(value: unknown) => value is HttpBodyError`     |
| `isTransientError`    | `(error: HttpClientError) => boolean`            |
| `isRateLimitError`    | `(error: HttpClientError) => boolean`            |

## 75. Port & Adapter Factories

| Export                                    | Type                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `HttpClientPort`                          | `DirectedPort<HttpClient, "HttpClient", "outbound">`                                                             |
| `HttpClientInspectorPort`                 | `Port<HttpClientInspector>`                                                                                      |
| `HttpClientRegistryPort`                  | `Port<HttpClientRegistry>`                                                                                       |
| `HttpClientLibraryInspectorPort`          | `LibraryInspectorPort`                                                                                           |
| `FetchHttpClientAdapter`                  | `Adapter<typeof HttpClientPort, [], "singleton", "sync">`                                                        |
| `createFetchHttpClient`                   | `(options?: FetchHttpClientOptions) => HttpClient`                                                               |
| `createHttpClientAdapter`                 | `(execute: ...) => HttpClient`                                                                                   |
| `createHttpClientRegistryAdapter`         | `() => Adapter<typeof HttpClientRegistryPort, ...>`                                                              |
| `createHttpClientInspectorAdapter`        | `(config?) => Adapter<typeof HttpClientInspectorPort, ...>`                                                      |
| `createHttpClientLibraryInspectorAdapter` | `() => Adapter<typeof HttpClientLibraryInspectorPort, ...>`                                                      |
| `createHttpClientLibraryInspector`        | `(inspector: HttpClientInspector) => LibraryInspector`                                                           |
| `HttpClientLibraryInspectorAdapter`       | `Adapter<typeof HttpClientLibraryInspectorPort, [typeof HttpClientInspectorPort], "singleton", "sync">` (frozen) |

### Platform Packages

| Package                    | Export                    | Adapter                                                   |
| -------------------------- | ------------------------- | --------------------------------------------------------- |
| `@hex-di/http-client-node` | `NodeHttpClientAdapter`   | `Adapter<typeof HttpClientPort, [], "singleton", "sync">` |
| `@hex-di/http-client-node` | `UndiciHttpClientAdapter` | `Adapter<typeof HttpClientPort, [], "singleton", "sync">` |
| `@hex-di/http-client-bun`  | `BunHttpClientAdapter`    | `Adapter<typeof HttpClientPort, [], "singleton", "sync">` |

## 76. Introspection

| Interface / Function     | Key Methods                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HttpClientInspector`    | `getSnapshot()`, `getActiveRequests()`, `getHistory(filter?)`, `getStats()`, `getStatsByUrl(pattern)`, `subscribe(listener)`, `getHealth()`, `getCombinatorChain()` |
| `HttpClientRegistry`     | `register(entry)`, `unregister(requestId)`, `getActive()`, `subscribe(listener)`                                                                                    |
| `HttpClientSnapshot`     | `{ timestamp, sequenceNumber, stats, activeRequests, recentHistory, health, circuitBreakers, rateLimiters, caches, combinatorChain, chainIntact }`                  |
| `HttpClientStats`        | `{ totalRequests, activeRequests, errorRate, averageLatencyMs, p50/p95/p99LatencyMs, byMethod, byStatus, byErrorTag }`                                              |
| `HttpClientHealth`       | `{ status: "healthy" \| "degraded" \| "unhealthy", reasons: readonly string[], timestamp: number }`                                                                 |
| `CombinatorInfo`         | `{ name: string, config: string }`                                                                                                                                  |
| `CircuitBreakerSnapshot` | `{ state, consecutiveFailures, totalTrips, lastStateChange, lastFailure }`                                                                                          |
| `RateLimiterSnapshot`    | `{ currentWindowRequests, maxRequests, windowMs, queuedRequests, totalThrottled }`                                                                                  |
| `CacheSnapshot`          | `{ entries, maxEntries, hits, misses, hitRate, evictions }`                                                                                                         |

### Audit Integrity

| Export / Interface          | Description                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `computeHttpEntryHash`      | `(entry, previousHash: string) => string` -- FNV-1a hash for a history entry                                                          |
| `verifyHistoryChain`        | `(history: readonly HttpHistoryEntry[]) => boolean` -- verify chain integrity                                                         |
| `HttpAuditSink`             | Interface: `{ write(entry): Result<void, AuditSinkWriteError>; flush(): Result<void, AuditSinkFlushError> }` -- audit externalization |
| `HttpAuditSinkPort`         | `Port<HttpAuditSink>` -- optional DI port for audit sink                                                                              |
| `configureHttpAuditWarning` | `(options: { suppress?: boolean }) => void` -- suppress `HTTP_WARN_001`                                                               |
| `resetHttpAuditWarning`     | `() => void` -- reset warning emission flag (testing)                                                                                 |
| `HTTP_AUDIT_DISABLED_CODE`  | `"HTTP_WARN_001"` -- warning code constant                                                                                            |

## 77. Testing API

| Export                          | Description                                                   |
| ------------------------------- | ------------------------------------------------------------- |
| `createMockHttpClient`          | Create mock client with route matching or dynamic handler     |
| `createRecordingClient`         | Wrap any client to record requests/responses                  |
| `mockResponse`                  | Create mock `HttpResponse` with status and optional text body |
| `mockJsonResponse`              | Create mock `HttpResponse` with status and JSON body          |
| `mockRequestError`              | Create mock `HttpRequestError`                                |
| `mockStreamResponse`            | Create mock `HttpResponse` with streaming body                |
| `createMockHttpClientAdapter`   | Create mock adapter for HexDI graph                           |
| `createHttpClientTestContainer` | Create test container with mock client                        |
| `setupHttpClientMatchers`       | Register vitest matchers                                      |

## 78. Type Utilities

| Type                 | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `InferHttpClient<T>` | Extract `HttpClient` service type from `HttpClientPort`                  |
| `HttpMethod`         | `"GET" \| "HEAD" \| "POST" \| "PUT" \| "PATCH" \| "DELETE" \| "OPTIONS"` |
| `BodylessMethod`     | `"GET" \| "HEAD" \| "OPTIONS"`                                           |
| `BodyMethod`         | `"POST" \| "PUT" \| "PATCH" \| "DELETE"`                                 |
| `SafeMethod`         | `"GET" \| "HEAD" \| "OPTIONS"`                                           |
| `IdempotentMethod`   | `"GET" \| "HEAD" \| "PUT" \| "DELETE" \| "OPTIONS"`                      |
| `HttpClientError`    | `HttpRequestError \| HttpResponseError \| HttpBodyError`                 |

---

_Previous: [13 - Advanced Patterns](./13-advanced.md)_

_Next: [15 - Appendices](./15-appendices.md)_
