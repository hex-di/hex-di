# 16 - Definition of Done

## Test Tables

### Core Types Tests

| Test ID | Description                                        | Type | File                 |
| ------- | -------------------------------------------------- | ---- | -------------------- |
| CT-001  | `createHeaders` lowercases all keys                | Unit | `headers.test.ts`    |
| CT-002  | `setHeader` overwrites existing header             | Unit | `headers.test.ts`    |
| CT-003  | `appendHeader` comma-separates values              | Unit | `headers.test.ts`    |
| CT-004  | `getHeader` is case-insensitive                    | Unit | `headers.test.ts`    |
| CT-005  | `removeHeader` removes by key                      | Unit | `headers.test.ts`    |
| CT-006  | `mergeHeaders` right wins on conflict              | Unit | `headers.test.ts`    |
| CT-007  | Headers are frozen after creation                  | Unit | `headers.test.ts`    |
| CT-008  | `createUrlParams` stringifies numbers and booleans | Unit | `url-params.test.ts` |
| CT-009  | `setParam` replaces all values for key             | Unit | `url-params.test.ts` |
| CT-010  | `appendParam` preserves existing values            | Unit | `url-params.test.ts` |
| CT-011  | `toQueryString` produces correct encoding          | Unit | `url-params.test.ts` |
| CT-012  | `fromQueryString` parses correctly                 | Unit | `url-params.test.ts` |
| CT-013  | Multi-value params serialize correctly             | Unit | `url-params.test.ts` |
| CT-014  | `emptyBody()` produces EmptyBody                   | Unit | `body.test.ts`       |
| CT-015  | `jsonBody()` produces JsonBody                     | Unit | `body.test.ts`       |
| CT-016  | `textBody()` sets correct content type             | Unit | `body.test.ts`       |
| CT-017  | Body type guards are exhaustive                    | Unit | `body.test.ts`       |

### HttpRequest Tests

| Test ID | Description                                            | Type | File                          |
| ------- | ------------------------------------------------------ | ---- | ----------------------------- |
| RQ-001  | `HttpRequest.get` creates GET request with correct URL | Unit | `request.test.ts`             |
| RQ-002  | `HttpRequest.post` creates POST request                | Unit | `request.test.ts`             |
| RQ-003  | URL query params are parsed into urlParams field       | Unit | `request.test.ts`             |
| RQ-004  | Request instances are frozen (immutable)               | Unit | `request.test.ts`             |
| RQ-005  | `setRequestHeader` returns new request                 | Unit | `request-combinators.test.ts` |
| RQ-006  | `bearerToken` sets Authorization header                | Unit | `request-combinators.test.ts` |
| RQ-007  | `basicAuth` sets Base64-encoded Authorization          | Unit | `request-combinators.test.ts` |
| RQ-008  | `prependUrl` prepends base URL correctly               | Unit | `request-combinators.test.ts` |
| RQ-009  | `prependUrl` normalizes double slashes                 | Unit | `request-combinators.test.ts` |
| RQ-010  | `appendUrl` appends path segment                       | Unit | `request-combinators.test.ts` |
| RQ-011  | `bodyJson` returns Ok for valid JSON                   | Unit | `request-combinators.test.ts` |
| RQ-012  | `bodyJson` returns Err for circular reference          | Unit | `request-combinators.test.ts` |
| RQ-013  | `bodyJson` sets Content-Type to application/json       | Unit | `request-combinators.test.ts` |
| RQ-014  | `bodyText` sets body and content type                  | Unit | `request-combinators.test.ts` |
| RQ-015  | `bodyUrlEncoded` sets correct content type             | Unit | `request-combinators.test.ts` |
| RQ-016  | `withSignal` attaches AbortSignal                      | Unit | `request-combinators.test.ts` |
| RQ-017  | `withTimeout` sets timeoutMs                           | Unit | `request-combinators.test.ts` |
| RQ-018  | `requestMethodAndUrl` formats correctly                | Unit | `request.test.ts`             |
| RQ-019  | `acceptJson` sets Accept header                        | Unit | `request-combinators.test.ts` |
| RQ-020  | `setUrlParams` replaces all params                     | Unit | `request-combinators.test.ts` |

### HttpResponse Tests

| Test ID | Description                                                            | Type | File                       |
| ------- | ---------------------------------------------------------------------- | ---- | -------------------------- |
| RS-001  | `response.json` parses valid JSON body                                 | Unit | `response.test.ts`         |
| RS-002  | `response.json` returns Err for invalid JSON                           | Unit | `response.test.ts`         |
| RS-003  | `response.text` returns body as string                                 | Unit | `response.test.ts`         |
| RS-004  | `response.json` caches result on second call                           | Unit | `response.test.ts`         |
| RS-005  | Different accessor after consumption returns BodyAlreadyConsumed error | Unit | `response.test.ts`         |
| RS-006  | `isOk` returns true for 200-299                                        | Unit | `response-status.test.ts`  |
| RS-007  | `isClientError` returns true for 400-499                               | Unit | `response-status.test.ts`  |
| RS-008  | `isServerError` returns true for 500-599                               | Unit | `response-status.test.ts`  |
| RS-009  | `getContentType` extracts header                                       | Unit | `response-headers.test.ts` |
| RS-010  | `getContentLength` parses to number                                    | Unit | `response-headers.test.ts` |
| RS-011  | Response back-references the originating request                       | Unit | `response.test.ts`         |

### Error Type Tests

| Test ID | Description                                                 | Type | File                   |
| ------- | ----------------------------------------------------------- | ---- | ---------------------- |
| ER-001  | `httpRequestError` creates correct structure                | Unit | `errors.test.ts`       |
| ER-002  | `httpResponseError` creates correct structure               | Unit | `errors.test.ts`       |
| ER-003  | `httpBodyError` creates correct structure                   | Unit | `errors.test.ts`       |
| ER-004  | `isHttpClientError` returns true for all error types        | Unit | `error-guards.test.ts` |
| ER-005  | `isHttpRequestError` returns true only for request errors   | Unit | `error-guards.test.ts` |
| ER-006  | `isHttpResponseError` returns true only for response errors | Unit | `error-guards.test.ts` |
| ER-007  | `isHttpBodyError` returns true only for body errors         | Unit | `error-guards.test.ts` |
| ER-008  | `isTransientError` returns true for Transport errors        | Unit | `error-guards.test.ts` |
| ER-009  | `isTransientError` returns true for Timeout errors          | Unit | `error-guards.test.ts` |
| ER-010  | `isTransientError` returns true for 5xx status errors       | Unit | `error-guards.test.ts` |
| ER-011  | `isTransientError` returns true for 429 status errors       | Unit | `error-guards.test.ts` |
| ER-012  | `isTransientError` returns false for 4xx (non-429)          | Unit | `error-guards.test.ts` |
| ER-013  | `isTransientError` returns false for Aborted errors         | Unit | `error-guards.test.ts` |
| ER-014  | `isRateLimitError` returns true for 429 status              | Unit | `error-guards.test.ts` |
| ER-015  | `errorCode` returns correct code for each error type        | Unit | `error-codes.test.ts`  |

### HttpClient Port Tests

| Test ID | Description                                            | Type        | File                        |
| ------- | ------------------------------------------------------ | ----------- | --------------------------- |
| PT-001  | `HttpClientPort` has correct name                      | Unit        | `port.test.ts`              |
| PT-002  | `HttpClientPort` has "outbound" direction              | Unit        | `port.test.ts`              |
| PT-003  | `isHttpClientPort` returns true for HttpClientPort     | Unit        | `port.test.ts`              |
| PT-004  | `isHttpClientPort` returns false for other ports       | Unit        | `port.test.ts`              |
| PT-005  | HttpClientPort participates in GraphBuilder validation | Integration | `graph-integration.test.ts` |

### Client Combinator Tests

| Test ID | Description                                            | Type | File                             |
| ------- | ------------------------------------------------------ | ---- | -------------------------------- |
| CC-001  | `mapRequest` transforms outgoing request               | Unit | `combinators.test.ts`            |
| CC-002  | `mapResponse` transforms incoming response             | Unit | `combinators.test.ts`            |
| CC-003  | `filterStatusOk` passes 200-299 responses              | Unit | `combinators.test.ts`            |
| CC-004  | `filterStatusOk` rejects 404 with HttpResponseError    | Unit | `combinators.test.ts`            |
| CC-005  | `filterStatusOk` rejects 500 with HttpResponseError    | Unit | `combinators.test.ts`            |
| CC-006  | `filterStatus` with custom predicate                   | Unit | `combinators.test.ts`            |
| CC-007  | `baseUrl` prepends URL to all requests                 | Unit | `combinators.test.ts`            |
| CC-008  | `defaultHeaders` sets headers without overwriting      | Unit | `combinators.test.ts`            |
| CC-009  | `defaultHeaders` does not overwrite existing headers   | Unit | `combinators.test.ts`            |
| CC-010  | `bearerAuth` sets Authorization header                 | Unit | `combinators.test.ts`            |
| CC-011  | `tapRequest` runs side-effect on request               | Unit | `combinators.test.ts`            |
| CC-012  | `tapResponse` runs side-effect on response             | Unit | `combinators.test.ts`            |
| CC-013  | `tapError` runs side-effect on error                   | Unit | `combinators.test.ts`            |
| CC-014  | `retry` retries N times on error                       | Unit | `retry.test.ts`                  |
| CC-015  | `retry` stops on success                               | Unit | `retry.test.ts`                  |
| CC-016  | `retry` respects `while` predicate                     | Unit | `retry.test.ts`                  |
| CC-017  | `retry` applies delay between attempts                 | Unit | `retry.test.ts`                  |
| CC-018  | `retryTransient` retries transport errors              | Unit | `retry.test.ts`                  |
| CC-019  | `retryTransient` retries 5xx errors                    | Unit | `retry.test.ts`                  |
| CC-020  | `retryTransient` retries 429 errors                    | Unit | `retry.test.ts`                  |
| CC-021  | `retryTransient` does not retry 4xx (non-429)          | Unit | `retry.test.ts`                  |
| CC-022  | `retryTransient` does not retry Aborted errors         | Unit | `retry.test.ts`                  |
| CC-023  | `retryTransient` uses exponential backoff              | Unit | `retry.test.ts`                  |
| CC-024  | `timeout` aborts request after duration                | Unit | `timeout.test.ts`                |
| CC-025  | `timeout` returns HttpRequestError with reason Timeout | Unit | `timeout.test.ts`                |
| CC-026  | `catchError` recovers from specific error tag          | Unit | `error-recovery.test.ts`         |
| CC-027  | `catchAll` recovers from any error                     | Unit | `error-recovery.test.ts`         |
| CC-028  | Combinators compose in correct order                   | Unit | `combinator-composition.test.ts` |
| CC-029  | `mapRequestResult` rejects on Err                      | Unit | `combinators.test.ts`            |
| CC-030  | `dynamicAuth` calls getToken per request               | Unit | `combinators.test.ts`            |

### Fetch Adapter Tests

| Test ID | Description                                     | Type        | File                    |
| ------- | ----------------------------------------------- | ----------- | ----------------------- |
| FA-001  | Fetch adapter sends GET request                 | Integration | `fetch-adapter.test.ts` |
| FA-002  | Fetch adapter sends POST with JSON body         | Integration | `fetch-adapter.test.ts` |
| FA-003  | Fetch adapter sends FormData body               | Integration | `fetch-adapter.test.ts` |
| FA-004  | Fetch adapter maps network error to Transport   | Integration | `fetch-adapter.test.ts` |
| FA-005  | Fetch adapter maps timeout to Timeout reason    | Integration | `fetch-adapter.test.ts` |
| FA-006  | Fetch adapter maps AbortError to Aborted reason | Integration | `fetch-adapter.test.ts` |
| FA-007  | Fetch adapter sets correct headers              | Integration | `fetch-adapter.test.ts` |
| FA-008  | Fetch adapter handles streaming response        | Integration | `fetch-adapter.test.ts` |
| FA-009  | Custom fetch function is used when provided     | Integration | `fetch-adapter.test.ts` |
| FA-010  | Custom requestInit is merged                    | Integration | `fetch-adapter.test.ts` |

### Introspection Tests

| Test ID | Description                                           | Type | File                |
| ------- | ----------------------------------------------------- | ---- | ------------------- |
| IN-001  | Registry tracks active requests                       | Unit | `registry.test.ts`  |
| IN-002  | Registry emits request-started events                 | Unit | `registry.test.ts`  |
| IN-003  | Registry emits request-completed events               | Unit | `registry.test.ts`  |
| IN-004  | Inspector `getSnapshot()` returns frozen snapshot     | Unit | `inspector.test.ts` |
| IN-005  | Inspector `getHistory()` returns request history      | Unit | `inspector.test.ts` |
| IN-006  | Inspector `getHistory()` filters by method            | Unit | `inspector.test.ts` |
| IN-007  | Inspector `getHistory()` filters by URL               | Unit | `inspector.test.ts` |
| IN-008  | Inspector `getHistory()` filters by status range      | Unit | `inspector.test.ts` |
| IN-009  | Inspector `getStats()` computes correct averages      | Unit | `inspector.test.ts` |
| IN-010  | Inspector `getStats()` computes percentiles           | Unit | `inspector.test.ts` |
| IN-011  | Inspector `subscribe()` emits events                  | Unit | `inspector.test.ts` |
| IN-012  | Inspector respects maxHistoryEntries limit            | Unit | `inspector.test.ts` |
| IN-013  | Inspector with `locked: true` rejects reconfiguration | Unit | `inspector.test.ts` |
| IN-014  | `sequenceNumber` increments monotonically             | Unit | `inspector.test.ts` |

### Audit Integrity Tests

| Test ID | Description                                                          | Type | File                      |
| ------- | -------------------------------------------------------------------- | ---- | ------------------------- |
| AI-001  | `computeHttpEntryHash` produces 8-char hex string                    | Unit | `audit-integrity.test.ts` |
| AI-002  | `computeHttpEntryHash` is deterministic for same input               | Unit | `audit-integrity.test.ts` |
| AI-003  | `computeHttpEntryHash` differs when any field changes                | Unit | `audit-integrity.test.ts` |
| AI-004  | First entry has `previousHash` of empty string                       | Unit | `audit-integrity.test.ts` |
| AI-005  | Second entry's `previousHash` equals first entry's `hash`            | Unit | `audit-integrity.test.ts` |
| AI-006  | `verifyHistoryChain` returns true for intact chain                   | Unit | `audit-integrity.test.ts` |
| AI-007  | `verifyHistoryChain` returns false when entry hash is tampered       | Unit | `audit-integrity.test.ts` |
| AI-008  | `verifyHistoryChain` returns false when previousHash is tampered     | Unit | `audit-integrity.test.ts` |
| AI-009  | `verifyHistoryChain` returns true for empty array                    | Unit | `audit-integrity.test.ts` |
| AI-010  | Evicted entries do not break chain verification of surviving entries | Unit | `audit-integrity.test.ts` |

### Audit Sink Tests

| Test ID | Description                                                               | Type | File                 |
| ------- | ------------------------------------------------------------------------- | ---- | -------------------- |
| AS-001  | `auditSink.write()` called for each completed request when mode is "full" | Unit | `audit-sink.test.ts` |
| AS-002  | `auditSink.write()` receives entry with `__integrity` fields populated    | Unit | `audit-sink.test.ts` |
| AS-003  | `auditSink.write()` not called when mode is "off"                         | Unit | `audit-sink.test.ts` |
| AS-004  | `auditSink.flush()` called on inspector disposal                          | Unit | `audit-sink.test.ts` |
| AS-005  | Evicted entries are not re-sent to sink                                   | Unit | `audit-sink.test.ts` |
| AS-006  | `auditSink.write()` called for entries in "lightweight" mode              | Unit | `audit-sink.test.ts` |

### Error Freezing Tests

| Test ID | Description                                                 | Type | File                     |
| ------- | ----------------------------------------------------------- | ---- | ------------------------ |
| EF-001  | `httpRequestError` returns a frozen object                  | Unit | `error-freezing.test.ts` |
| EF-002  | `httpResponseError` returns a frozen object                 | Unit | `error-freezing.test.ts` |
| EF-003  | `httpBodyError` returns a frozen object                     | Unit | `error-freezing.test.ts` |
| EF-004  | Mutation of frozen error field is silently ignored          | Unit | `error-freezing.test.ts` |
| EF-005  | `Object.isFrozen()` returns true for all error constructors | Unit | `error-freezing.test.ts` |

### Monotonic Timing & Audit Warning Tests

| Test ID | Description                                                        | Type | File                       |
| ------- | ------------------------------------------------------------------ | ---- | -------------------------- |
| MT-001  | `ActiveRequest.startedAtMono` is populated via `monotonicNow()`    | Unit | `monotonic-timing.test.ts` |
| MT-002  | `HttpHistoryEntry.startedAtMono` is populated                      | Unit | `monotonic-timing.test.ts` |
| MT-003  | `HttpHistoryEntry.completedAtMono` is populated                    | Unit | `monotonic-timing.test.ts` |
| MT-004  | `durationMs` equals `completedAtMono - startedAtMono`              | Unit | `monotonic-timing.test.ts` |
| MT-005  | `elapsedMs` on `ActiveRequest` computed from monotonic clock       | Unit | `monotonic-timing.test.ts` |
| MT-006  | `HTTP_WARN_001` emitted when inspector mode is "off"               | Unit | `audit-warning.test.ts`    |
| MT-007  | `HTTP_WARN_001` emitted only once per container                    | Unit | `audit-warning.test.ts`    |
| MT-008  | `configureHttpAuditWarning({ suppress: true })` suppresses warning | Unit | `audit-warning.test.ts`    |
| MT-009  | `resetHttpAuditWarning()` allows warning to fire again             | Unit | `audit-warning.test.ts`    |

### Testing Utility Tests

| Test ID | Description                                               | Type | File                       |
| ------- | --------------------------------------------------------- | ---- | -------------------------- |
| TU-001  | `createMockHttpClient` matches exact routes               | Unit | `mock-client.test.ts`      |
| TU-002  | `createMockHttpClient` matches wildcard method            | Unit | `mock-client.test.ts`      |
| TU-003  | `createMockHttpClient` matches glob patterns              | Unit | `mock-client.test.ts`      |
| TU-004  | `createMockHttpClient` returns error for unmatched routes | Unit | `mock-client.test.ts`      |
| TU-005  | `createMockHttpClient` with dynamic handler               | Unit | `mock-client.test.ts`      |
| TU-006  | `createRecordingClient` records requests                  | Unit | `recording-client.test.ts` |
| TU-007  | `createRecordingClient` records responses                 | Unit | `recording-client.test.ts` |
| TU-008  | `createRecordingClient` records errors                    | Unit | `recording-client.test.ts` |
| TU-009  | `createRecordingClient.clear()` resets recordings         | Unit | `recording-client.test.ts` |
| TU-010  | `mockResponse` creates correct HttpResponse               | Unit | `response-factory.test.ts` |
| TU-011  | `mockJsonResponse` creates response with JSON body        | Unit | `response-factory.test.ts` |
| TU-012  | `MockHttpClientAdapter` provides HttpClientPort           | Unit | `mock-adapter.test.ts`     |
| TU-013  | Vitest matcher `toRespondOk` works                        | Unit | `matchers.test.ts`         |
| TU-014  | Vitest matcher `toRespondWith` works                      | Unit | `matchers.test.ts`         |
| TU-015  | Vitest matcher `toFailWithRequestError` works             | Unit | `matchers.test.ts`         |

### Library Inspector Bridge Tests

| Test ID | Description                                                          | Type | File                               |
| ------- | -------------------------------------------------------------------- | ---- | ---------------------------------- |
| LI-001  | Bridge returns `name: "http-client"`                                 | Unit | `library-inspector-bridge.test.ts` |
| LI-002  | `getSnapshot()` returns frozen object                                | Unit | `library-inspector-bridge.test.ts` |
| LI-003  | Snapshot includes `totalRequests` field                              | Unit | `library-inspector-bridge.test.ts` |
| LI-004  | Snapshot includes `activeRequests` field                             | Unit | `library-inspector-bridge.test.ts` |
| LI-005  | Snapshot includes `errorRate` field                                  | Unit | `library-inspector-bridge.test.ts` |
| LI-006  | Snapshot includes `health` field                                     | Unit | `library-inspector-bridge.test.ts` |
| LI-007  | Snapshot includes `combinatorChain` field                            | Unit | `library-inspector-bridge.test.ts` |
| LI-008  | Snapshot includes `circuitBreakers`, `rateLimiters`, `caches` fields | Unit | `library-inspector-bridge.test.ts` |
| LI-009  | `subscribe()` wraps events with `source: "http-client"`              | Unit | `library-inspector-bridge.test.ts` |
| LI-010  | `subscribe()` returns unsubscribe function                           | Unit | `library-inspector-bridge.test.ts` |
| LI-011  | `isLibraryInspector()` returns true for bridge                       | Unit | `library-inspector-bridge.test.ts` |
| LI-012  | `HttpClientLibraryInspectorAdapter` is frozen singleton              | Unit | `library-inspector-bridge.test.ts` |

### Combinator State Tests

| Test ID | Description                                             | Type | File                       |
| ------- | ------------------------------------------------------- | ---- | -------------------------- |
| CS-001  | Circuit breaker state appears in snapshot               | Unit | `combinator-state.test.ts` |
| CS-002  | Rate limiter state appears in snapshot                  | Unit | `combinator-state.test.ts` |
| CS-003  | Cache state appears in snapshot                         | Unit | `combinator-state.test.ts` |
| CS-004  | Multiple circuit breakers tracked independently by name | Unit | `combinator-state.test.ts` |
| CS-005  | Multiple rate limiters tracked independently by name    | Unit | `combinator-state.test.ts` |
| CS-006  | Multiple caches tracked independently by name           | Unit | `combinator-state.test.ts` |
| CS-007  | Circuit breaker state transitions reflected in snapshot | Unit | `combinator-state.test.ts` |

### Health Abstraction Tests

| Test ID | Description                                                    | Type | File             |
| ------- | -------------------------------------------------------------- | ---- | ---------------- |
| HL-001  | Returns `"healthy"` with no errors and no tripped breakers     | Unit | `health.test.ts` |
| HL-002  | Returns `"degraded"` when error rate > 10%                     | Unit | `health.test.ts` |
| HL-003  | Returns `"unhealthy"` when error rate > 50%                    | Unit | `health.test.ts` |
| HL-004  | Returns `"unhealthy"` when any circuit breaker is `"open"`     | Unit | `health.test.ts` |
| HL-005  | Returns `"degraded"` when any circuit breaker is `"half-open"` | Unit | `health.test.ts` |
| HL-006  | Returns `"degraded"` when P95 > 5x average latency             | Unit | `health.test.ts` |
| HL-007  | Returns `"unhealthy"` when P99 > 10x average latency           | Unit | `health.test.ts` |
| HL-008  | `reasons` array includes human-readable trigger description    | Unit | `health.test.ts` |

### Combinator Chain Tests

| Test ID | Description                                                   | Type | File                       |
| ------- | ------------------------------------------------------------- | ---- | -------------------------- |
| CH-001  | Base client has empty combinator chain                        | Unit | `combinator-chain.test.ts` |
| CH-002  | Single combinator appends to chain                            | Unit | `combinator-chain.test.ts` |
| CH-003  | Multiple combinators compose in application order             | Unit | `combinator-chain.test.ts` |
| CH-004  | Chain entry includes name and config summary                  | Unit | `combinator-chain.test.ts` |
| CH-005  | Inspector returns chain from resolved client                  | Unit | `combinator-chain.test.ts` |
| CH-006  | Symbol-keyed metadata does not leak to `HttpClient` interface | Unit | `combinator-chain.test.ts` |

### MCP Resource Mapping Tests

| Test ID | Description                                                           | Type | File                    |
| ------- | --------------------------------------------------------------------- | ---- | ----------------------- |
| MR-001  | `hexdi://http/snapshot` maps to `inspector.getSnapshot()`             | Unit | `mcp-resources.test.ts` |
| MR-002  | `hexdi://http/active` maps to `inspector.getActiveRequests()`         | Unit | `mcp-resources.test.ts` |
| MR-003  | `hexdi://http/history` maps to `inspector.getHistory()`               | Unit | `mcp-resources.test.ts` |
| MR-004  | `hexdi://http/stats` maps to `inspector.getStats()`                   | Unit | `mcp-resources.test.ts` |
| MR-005  | `hexdi://http/stats/{urlPattern}` maps to `inspector.getStatsByUrl()` | Unit | `mcp-resources.test.ts` |
| MR-006  | `hexdi://http/health` maps to `inspector.getHealth()`                 | Unit | `mcp-resources.test.ts` |
| MR-007  | `hexdi://http/combinators` maps to `inspector.getCombinatorChain()`   | Unit | `mcp-resources.test.ts` |
| MR-008  | `hexdi://http/circuit-breakers` maps to `snapshot.circuitBreakers`    | Unit | `mcp-resources.test.ts` |
| MR-009  | `hexdi://http/audit/verify` maps to `verifyHistoryChain()`            | Unit | `mcp-resources.test.ts` |

### A2A Skill Tests

| Test ID | Description                                                                                             | Type | File                 |
| ------- | ------------------------------------------------------------------------------------------------------- | ---- | -------------------- |
| A2-001  | `diagnose-http-issue` skill definition has required fields (`id`, `name`, `description`, `inputSchema`) | Unit | `a2a-skills.test.ts` |
| A2-002  | `http-health-check` skill definition has required fields (`id`, `name`, `description`, `inputSchema`)   | Unit | `a2a-skills.test.ts` |

## Type-Level Tests

| Test ID | Description                                                                   | File                         |
| ------- | ----------------------------------------------------------------------------- | ---------------------------- |
| TL-001  | `InferHttpClient` extracts `HttpClient` from `HttpClientPort`                 | `http-client-port.test-d.ts` |
| TL-002  | `InferHttpClient<string>` produces `InferenceError`                           | `http-client-port.test-d.ts` |
| TL-003  | `HttpClientPort` extends `DirectedPort<HttpClient, "HttpClient", "outbound">` | `http-client-port.test-d.ts` |
| TL-004  | `HttpRequest.get()` returns `HttpRequest`                                     | `http-request.test-d.ts`     |
| TL-005  | `HttpRequest.bodyJson()` returns `Result<HttpRequest, HttpBodyError>`         | `http-request.test-d.ts`     |
| TL-006  | `HttpRequest.bearerToken()` returns `HttpRequest` (not Result)                | `http-request.test-d.ts`     |
| TL-007  | `HttpClient.execute()` returns `ResultAsync<HttpResponse, HttpRequestError>`  | `combinators.test-d.ts`      |
| TL-008  | `HttpClient.filterStatusOk()` returns `HttpClient`                            | `combinators.test-d.ts`      |
| TL-009  | `HttpClient.baseUrl()` returns `HttpClient`                                   | `combinators.test-d.ts`      |
| TL-010  | `response.json` has type `ResultAsync<unknown, HttpResponseError>`            | `http-response.test-d.ts`    |
| TL-011  | `response.text` has type `ResultAsync<string, HttpResponseError>`             | `http-response.test-d.ts`    |
| TL-012  | `HttpClientError` is `HttpRequestError \| HttpResponseError \| HttpBodyError` | `error-types.test-d.ts`      |

## Integration Tests

| Test ID | Description                                                                  | File                                    |
| ------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| IT-001  | HttpClient adapter resolved from container executes requests                 | `container-integration.test.ts`         |
| IT-002  | Scoped HTTP client carries per-scope headers                                 | `scoped-client.test.ts`                 |
| IT-003  | Scoped HTTP client disposes cleanly                                          | `scoped-client.test.ts`                 |
| IT-004  | Missing HttpClientPort adapter fails at build time                           | `graph-integration.test.ts`             |
| IT-005  | Inspector reports correct stats after multiple requests                      | `inspector-integration.test.ts`         |
| IT-006  | Tracing bridge creates spans for HTTP requests (when tracer present)         | `tracing-integration.test.ts`           |
| IT-007  | Mock adapter works in DI graph                                               | `mock-adapter-integration.test.ts`      |
| IT-008  | Query adapter uses HttpClient for data fetching                              | `cross-library.test.ts`                 |
| IT-009  | Library inspector bridge auto-registers with container via afterResolve hook | `library-inspector-integration.test.ts` |
| IT-010  | Audit sink receives entries with integrity hashes during full recording      | `audit-sink-integration.test.ts`        |
| IT-011  | `HTTP_WARN_001` warning emitted when inspector mode is "off"                 | `audit-warning-integration.test.ts`     |

## E2E Tests

| Test ID | Description                                                                            | File                               |
| ------- | -------------------------------------------------------------------------------------- | ---------------------------------- |
| E2E-001 | Full pipeline: adapter → combinators → request → response → json                       | `e2e-pipeline.test.ts`             |
| E2E-002 | Retry + timeout: transient failure then success                                        | `e2e-resilience.test.ts`           |
| E2E-003 | Scoped client lifecycle: create scope → resolve → request → dispose                    | `e2e-scoped.test.ts`               |
| E2E-004 | Error classification: network error, 4xx, 5xx, decode error                            | `e2e-errors.test.ts`               |
| E2E-005 | Interceptor chain: auth → baseUrl → filterStatusOk → retry → timeout                   | `e2e-interceptors.test.ts`         |
| E2E-006 | GxP full pipeline: HTTPS + subject attribution + RBAC + e-sig + audit bridge           | `e2e-gxp-pipeline.test.ts`         |
| E2E-007 | Audit trail integrity: 100-operation chain with verification                           | `e2e-audit-chain.test.ts`          |
| E2E-008 | Transport security: HTTPS enforcement + payload integrity + credential redaction       | `e2e-transport-security.test.ts`   |
| E2E-009 | Cross-correlation: guard decision → HTTP operation → audit entry forward/reverse trace | `e2e-cross-correlation.test.ts`    |
| E2E-010 | Certificate pinning: pinned cert accepted, unpinned cert rejected                      | `e2e-cert-pinning.test.ts`         |
| E2E-011 | WAL crash recovery: simulate process crash → restart → verify WAL entries recovered    | `e2e-wal-recovery.test.ts`         |
| E2E-012 | Token lifecycle: expired token → auto-refresh → request succeeds                       | `e2e-token-lifecycle.test.ts`      |
| E2E-013 | SSRF protection: internal IP blocked, metadata endpoint blocked, DNS rebinding blocked | `e2e-ssrf-protection.test.ts`      |
| E2E-014 | Electronic signature: signing ceremony → verification → audit entry with signature     | `e2e-electronic-signature.test.ts` |
| E2E-015 | Multi-scope isolation: two concurrent scopes with independent audit chains             | `e2e-scope-isolation.test.ts`      |
| E2E-016 | Payload validation: schema-conforming request accepted, non-conforming rejected        | `e2e-payload-validation.test.ts`   |
| E2E-017 | HSTS enforcement: cached HSTS host rejects plaintext downgrade                         | `e2e-hsts.test.ts`                 |
| E2E-018 | Body snapshot: request/response body snapshots in GxP audit trail                      | `e2e-body-snapshot.test.ts`        |
| E2E-019 | Encryption round-trip: encrypt audit data → persist → retrieve → decrypt → verify      | `e2e-encryption.test.ts`           |
| E2E-020 | Degraded mode: slow audit backend → degraded mode entry → recovery → exit              | `e2e-degraded-mode.test.ts`        |

## GxP Regulatory Traceability

This section maps test groups to the regulatory requirements they satisfy, enabling auditors to trace from regulatory requirement to test evidence.

### Existing Test Group → Regulation Mapping

| Test Group                 | Test IDs                      | Regulatory Requirement                                              | ALCOA+ Principle                                    |
| -------------------------- | ----------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| Audit Integrity            | AI-001 through AI-010         | 21 CFR 11.10(e) — audit trails                                      | Attributable, Contemporaneous, Original, Consistent |
| Audit Sink                 | AS-001 through AS-006         | 21 CFR 11.10(e) — audit trails                                      | Complete, Enduring                                  |
| Error Freezing             | EF-001 through EF-005         | 21 CFR 11.10(c) — record protection; ALCOA+ Original                | Original                                            |
| Monotonic Timing           | MT-001 through MT-009         | EU GMP Annex 11 §9 — audit trails with timestamps                   | Contemporaneous                                     |
| Introspection              | IN-001 through IN-014         | ALCOA+ Available — real-time query access to audit data             | Available                                           |
| MCP Resources              | MR-001 through MR-009         | ALCOA+ Available — audit data exposed for inspection                | Available                                           |
| GxP Fail-Fast              | GX-016 through GX-019         | 21 CFR 11.10(c) — construction-time validation of GxP prerequisites | Consistent                                          |
| Sink Retry Queue           | GX-020 through GX-023         | 21 CFR 11.10(e) — audit trail completeness via retry                | Complete, Enduring                                  |
| Body Snapshot              | GX-024 through GX-029         | 21 CFR 11.10(e) — body content audit for write operations           | Complete                                            |
| Persistence-Aware Eviction | GX-030 through GX-036         | 21 CFR 11.10(e) — unpersisted entries protected from eviction       | Enduring                                            |
| SSRF Protection            | TS-046 through TS-053         | 21 CFR 11.30 — open system controls; OWASP SSRF Prevention          | Consistent                                          |
| Certificate Transparency   | TS-054 through TS-058         | 21 CFR 11.30 — certificate validity verification; RFC 6962          | Accurate                                            |
| HSTS Enforcement           | TS-059 through TS-063         | 21 CFR 11.30 — transport layer protection; RFC 6797                 | Consistent                                          |
| CSRF Protection            | TS-064 through TS-068, TS-075 | 21 CFR 11.30 — cross-site request forgery prevention                | Attributable                                        |
| External Correlation       | AB-036 through AB-040         | 21 CFR 11.10(e) — cross-system audit traceability                   | Attributable, Consistent                            |
| Data-at-Rest Encryption    | (DoD 24 extension)            | 21 CFR 11.30 — encryption of records in open systems                | Enduring                                            |
| Chaos Testing              | CF-001 through CF-010         | EU GMP Annex 11 §13 — incident management resilience                | Enduring, Complete                                  |
| Load/Soak Testing          | LT-001 through SK-003         | EU GMP Annex 11 §16 — business continuity under load                | Available                                           |

### GxP Compliance Tests

| Test ID | Description                                                                                                                                                                           | Type        | File                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------- |
| GX-001  | `CrossChainVerificationResult` has all required fields (`evaluationId`, `guardChainIntact`, `httpChainIntact`, `timestampConsistent`, `correlationValid`)                             | Unit        | `gxp-compliance.test.ts`        |
| GX-002  | Cross-chain verification detects timestamp inconsistency between FNV-1a and SHA-256 chains                                                                                            | Unit        | `gxp-compliance.test.ts`        |
| GX-003  | Cross-chain verification detects correlation mismatch (different `requestId` for same operation)                                                                                      | Unit        | `gxp-compliance.test.ts`        |
| GX-004  | `createGxPAuditSinkAdapter` bridges `HttpAuditSink` to `HttpAuditTrailPort`                                                                                                           | Unit        | `gxp-audit-bridge.test.ts`      |
| GX-005  | Bridged audit sink calls `auditTrail.record()` with correct fields                                                                                                                    | Unit        | `gxp-audit-bridge.test.ts`      |
| GX-006  | Bridged audit sink calls `auditTrail.flush()` on disposal                                                                                                                             | Unit        | `gxp-audit-bridge.test.ts`      |
| GX-007  | `VersionedAuditEntry` includes `schemaVersion` field                                                                                                                                  | Unit        | `gxp-schema-versioning.test.ts` |
| GX-008  | Unknown schema version is rejected by consumer                                                                                                                                        | Unit        | `gxp-schema-versioning.test.ts` |
| GX-009  | Missing optional fields in newer schema version default correctly                                                                                                                     | Unit        | `gxp-schema-versioning.test.ts` |
| GX-010  | ALCOA+ mapping table covers all 9 principles (verify §80 contains entries for: Attributable, Legible, Contemporaneous, Original, Accurate, Complete, Consistent, Enduring, Available) | Unit        | `gxp-compliance.test.ts`        |
| GX-011  | Entries written to `HttpAuditSink` survive inspector disposal (Enduring)                                                                                                              | Integration | `gxp-enduring.test.ts`          |
| GX-012  | `HttpClientInspector` provides real-time query access after requests complete (Available)                                                                                             | Unit        | `gxp-available.test.ts`         |
| GX-013  | `auditSink.write()` returning `Err` emits `sink-write-failed` event                                                                                                                   | Unit        | `audit-sink.test.ts`            |
| GX-014  | `auditSink.flush()` returning `Err` during disposal is logged via `console.error`                                                                                                     | Unit        | `audit-sink.test.ts`            |
| GX-015  | Constructor throws `ConfigurationError` when `mode: "off"` and `auditSink` is provided                                                                                                | Unit        | `audit-sink.test.ts`            |
| GX-016  | Constructor throws `ConfigurationError` when `gxp: true` and `HttpAuditTrailPort` not registered                                                                                      | Unit        | `gxp-fail-fast.test.ts`         |
| GX-017  | Constructor throws `ConfigurationError` when `gxp: true` and `mode: "off"`                                                                                                            | Unit        | `gxp-fail-fast.test.ts`         |
| GX-018  | Constructor throws `ConfigurationError` when `gxp: true` and no `auditSink` provided                                                                                                  | Unit        | `gxp-fail-fast.test.ts`         |
| GX-019  | Constructor succeeds when `gxp: true`, `HttpAuditTrailPort` registered, `mode: "full"`, and `auditSink` provided                                                                      | Unit        | `gxp-fail-fast.test.ts`         |
| GX-020  | Failed `write()` appends entry to retry queue with `retryCount: 0`                                                                                                                    | Unit        | `gxp-sink-retry.test.ts`        |
| GX-021  | Retry queue drains at `retryDelayMs` intervals and retries oldest entry                                                                                                               | Unit        | `gxp-sink-retry.test.ts`        |
| GX-022  | Entry removed from retry queue and `__sinkStatus` set to `"success"` on successful retry                                                                                              | Unit        | `gxp-sink-retry.test.ts`        |
| GX-023  | Entry exhausted after `maxRetryAttempts` emits `"sink-write-exhausted"` event and remains in buffer                                                                                   | Unit        | `gxp-sink-retry.test.ts`        |
| GX-024  | `requestBodySnapshot` populated for POST when `captureBodySnapshot: "request-only"`                                                                                                   | Unit        | `gxp-body-snapshot.test.ts`     |
| GX-025  | `requestBodySnapshot` populated for PUT/PATCH/DELETE when `captureBodySnapshot` enabled                                                                                               | Unit        | `gxp-body-snapshot.test.ts`     |
| GX-026  | `requestBodySnapshot` undefined for GET requests regardless of `captureBodySnapshot` setting                                                                                          | Unit        | `gxp-body-snapshot.test.ts`     |
| GX-027  | `responseBodySnapshot` populated when `captureBodySnapshot: "request-and-response"`                                                                                                   | Unit        | `gxp-body-snapshot.test.ts`     |
| GX-028  | `BodySnapshot.digest` contains SHA-256 hex when `gxp: true`                                                                                                                           | Unit        | `gxp-body-snapshot.test.ts`     |
| GX-029  | `BodySnapshot.preview` truncated at `maxPreviewBytes` with `truncated: true`                                                                                                          | Unit        | `gxp-body-snapshot.test.ts`     |
| GX-030  | Non-GxP eviction evicts oldest entry regardless of `__sinkStatus`                                                                                                                     | Unit        | `gxp-eviction.test.ts`          |
| GX-031  | GxP eviction skips entries with `__sinkStatus: "failed"` and evicts oldest `"success"` entry                                                                                          | Unit        | `gxp-eviction.test.ts`          |
| GX-032  | GxP eviction skips entries with `__sinkStatus: "pending"` and evicts oldest `"success"` entry                                                                                         | Unit        | `gxp-eviction.test.ts`          |
| GX-033  | GxP eviction emits `"sink-eviction-blocked"` when all entries are unpersisted                                                                                                         | Unit        | `gxp-eviction.test.ts`          |
| GX-034  | GxP buffer grows to emergency ceiling (`maxHistoryEntries * 2`) when eviction is blocked                                                                                              | Unit        | `gxp-eviction.test.ts`          |
| GX-035  | At emergency ceiling, oldest `"failed"` entry is forcibly evicted with `__sinkStatus: "lost"`                                                                                         | Unit        | `gxp-eviction.test.ts`          |
| GX-036  | Forcible eviction at emergency ceiling emits `"sink-write-lost"` critical event                                                                                                       | Unit        | `gxp-eviction.test.ts`          |
| GX-037  | Hash chain input includes `requestBodySnapshotDigest` (non-empty when body snapshot present)                                                                                          | Unit        | `audit-integrity.test.ts`       |
| GX-038  | Hash chain input uses empty string for `requestBodySnapshotDigest` when no body snapshot (backward compatible)                                                                        | Unit        | `audit-integrity.test.ts`       |

## Mutation Testing

All HTTP client core modules must achieve **mutation score >= 90%** using Stryker:

| Module                                  | Target Score | Priority |
| --------------------------------------- | ------------ | -------- |
| `request/request.ts`                    | >= 90%       | Critical |
| `request/headers.ts`                    | >= 90%       | Critical |
| `request/url-params.ts`                 | >= 90%       | Critical |
| `request/body.ts`                       | >= 90%       | Critical |
| `response/response.ts`                  | >= 90%       | Critical |
| `response/status.ts`                    | >= 90%       | Critical |
| `client/combinators.ts`                 | >= 90%       | Critical |
| `errors/constructors.ts`                | >= 90%       | Critical |
| `errors/guards.ts`                      | >= 90%       | Critical |
| `adapters/fetch/fetch-client.ts`        | >= 85%       | High     |
| `ports/http-client-port.ts`             | >= 85%       | Medium   |
| `introspection/inspector.ts`            | >= 85%       | Medium   |
| `introspection/registry.ts`             | >= 85%       | Medium   |
| `introspection/audit-integrity.ts`      | >= 90%       | High     |
| `introspection/audit-warning.ts`        | >= 85%       | Medium   |
| `introspection/sink-retry-queue.ts`     | >= 90%       | High     |
| `introspection/body-snapshot.ts`        | >= 85%       | Medium   |
| `introspection/persistence-eviction.ts` | >= 90%       | High     |

## Verification Checklist

- [ ] All 24 files exist under `spec/http-client/` (README.md + files 01-23)
- [ ] `README.md` has complete table of contents linking all sections
- [ ] Each file has prev/next navigation links
- [ ] All public APIs have TypeScript type signatures in code blocks
- [ ] All concepts have usage examples
- [ ] Design decisions have rationale table (Appendix C)
- [ ] Error codes are documented with descriptions (§24)
- [ ] Type inference utilities follow `InferenceError` pattern from `@hex-di/core`
- [ ] Port type extends `DirectedPort` (structural subtyping verified)
- [ ] Adapter factories bridge to `@hex-di/core` `createAdapter`
- [ ] Inspector/Registry follow `@hex-di/store` patterns
- [ ] MCP resource URIs are documented for AI consumption
- [ ] Test tables cover all public API surface
- [ ] All combinators have documented execution order
- [ ] Fetch adapter is built into core package (zero extra dependencies)
- [ ] Platform adapters in separate packages (node, bun)
- [ ] Scoped client pattern documented with correlation propagation
- [ ] No `any` types in public API signatures
- [ ] No type casts (`as X`) in specification examples
- [ ] Bundle size target: core < 8KB gzipped (TBD after implementation)
- [ ] Library inspector bridge follows `LibraryInspector` protocol
- [ ] Health derivation rules produce correct status for each threshold
- [ ] MCP resource URIs all have corresponding DoD tests
- [ ] A2A skill definitions have valid schemas
- [ ] Error constructors freeze returned objects with `Object.freeze()`
- [ ] `HttpHistoryEntry.__integrity` contains `hash` and `previousHash` fields
- [ ] `computeHttpEntryHash()` uses FNV-1a and produces 8-char hex strings
- [ ] `verifyHistoryChain()` validates the full chain from first to last entry
- [ ] `HttpAuditSink` interface has `write()` returning `Result<void, AuditSinkWriteError>` and `flush()` returning `Result<void, AuditSinkFlushError>`
- [ ] `ActiveRequest.startedAtMono` and `HttpHistoryEntry.startedAtMono`/`completedAtMono` use monotonic clock
- [ ] `durationMs` is computed from `completedAtMono - startedAtMono` (not wall-clock)
- [ ] `HTTP_WARN_001` warning emitted once per container when mode is "off"
- [ ] `configureHttpAuditWarning()` and `resetHttpAuditWarning()` control warning behavior
- [ ] Design decisions table includes entries for hash chain, monotonic clock, error freezing, and audit warning
- [ ] GxP compliance chapter (17) documents regulatory context scoped to HTTP transport
- [ ] ALCOA+ mapping table covers all 9 principles with HTTP client implementations
- [ ] Cross-reference table maps HTTP client features to guard spec sections
- [ ] `CrossChainVerificationResult` interface specified with all required fields
- [ ] Audit entry schema versioning strategy documented with migration rules
- [ ] Error code namespace cross-reference table includes HTTP0xx, ACL0xx, and guard transport codes
- [ ] `HttpClientInspectorConfig` has `gxp`, `captureBodySnapshot`, `maxPreviewBytes`, and `retryQueue` fields
- [ ] `BodySnapshot` interface defined with `contentType`, `sizeBytes`, `preview`, `truncated`, `digest` fields
- [ ] `SinkRetryQueueConfig` interface defined with `maxRetryQueueSize`, `maxRetryAttempts`, `retryDelayMs` fields
- [ ] `HttpHistoryEntry` has `requestBodySnapshot`, `responseBodySnapshot`, and `__sinkStatus` fields
- [ ] `HttpClientSnapshot` has `failedWriteCount` and `retryQueueSize` fields
- [ ] Hash input spec includes `requestBodySnapshotDigest` (empty string when undefined)
- [ ] Eviction rule 5 has both GxP (persistence-aware) and non-GxP branches
- [ ] Emergency ceiling defined as `maxHistoryEntries * 2` for GxP eviction
- [ ] Event union includes `sink-write-exhausted`, `sink-queue-overflow`, `sink-eviction-blocked`, `sink-write-lost` variants
- [ ] GxP fail-fast: `gxp: true` + missing `HttpAuditTrailPort` throws `ConfigurationError`
- [ ] GxP fail-fast: `gxp: true` + `mode: "off"` throws `ConfigurationError`
- [ ] GxP fail-fast: `gxp: true` + missing `auditSink` throws `ConfigurationError`
- [ ] Comparison table has "Crash recovery" row distinguishing retry queue from guard WAL
- [ ] Data-at-rest encryption specified with `HttpAuditEncryptionPort` and `HttpAuditEncryptionPolicy` (§104c)
- [ ] Canonical serialization for hash chain uses deterministic field ordering and number formatting (§55a, RFC 8785)
- [ ] SSRF mitigation combinator `withSsrfProtection()` blocks private IPs and metadata endpoints (§90a)
- [ ] Certificate Transparency verification with SCT validation (§90b)
- [ ] HSTS enforcement combinator `withHstsEnforcement()` with preload cache (§90c)
- [ ] CSRF protection combinator `withCsrfProtection()` for browser contexts (§90d)
- [ ] External correlation ID field in `HttpOperationAuditEntry` for cross-system traceability (§92)
- [ ] Degraded mode operation guidance with formal entry/exit criteria (§115.6)
- [ ] E2E test count increased from 5 to 20 covering GxP pipeline scenarios
- [ ] Chaos and fault injection tests specified (10 tests covering subsystem failures)
- [ ] Load and soak tests specified (5 load + 3 soak tests)

## Chaos and Fault Injection Tests

These tests verify system resilience under adverse conditions by injecting failures into subsystem boundaries. All chaos tests MUST run in isolated environments and MUST NOT affect production data.

| Test ID | Description                                                                                                          | Type  | File                                |
| ------- | -------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------- |
| CF-001  | Audit backend intermittent failure: 50% write failures over 100 operations → WAL absorbs, no data loss               | Chaos | `chaos-audit-backend.test.ts`       |
| CF-002  | Audit backend total failure: all writes fail → operations blocked (failOnAuditError) → backend recovers → WAL drains | Chaos | `chaos-audit-backend.test.ts`       |
| CF-003  | Network partition during request: TCP connection drops mid-response → timeout fires → audit entry recorded           | Chaos | `chaos-network.test.ts`             |
| CF-004  | Clock jump forward: wall-clock jumps 60s mid-test → monotonic timing unaffected → durationMs correct                 | Chaos | `chaos-clock.test.ts`               |
| CF-005  | Clock jump backward: wall-clock rewinds → drift detection triggers → operations paused in GxP mode                   | Chaos | `chaos-clock.test.ts`               |
| CF-006  | KMS unavailable: encryption port fails → new audit writes blocked → KMS recovers → writes resume                     | Chaos | `chaos-kms.test.ts`                 |
| CF-007  | Subject provider intermittent: 30% resolution failures → retried operations succeed → attribution intact             | Chaos | `chaos-subject-provider.test.ts`    |
| CF-008  | Certificate revocation check timeout: OCSP responder slow → soft-fail allows (with warning) or hard-fail blocks      | Chaos | `chaos-cert-revocation.test.ts`     |
| CF-009  | Concurrent scope disposal: 10 scopes disposing simultaneously → no audit entries lost → all chains valid             | Chaos | `chaos-concurrent-disposal.test.ts` |
| CF-010  | Memory pressure: buffer at emergency ceiling → forced eviction → sink-write-lost event emitted                       | Chaos | `chaos-memory-pressure.test.ts`     |

## Load and Soak Tests

These tests verify performance characteristics and resource leak detection under sustained load. Load tests run for minutes; soak tests run for hours.

| Test ID | Description                                                                                   | Type | Duration | File                             |
| ------- | --------------------------------------------------------------------------------------------- | ---- | -------- | -------------------------------- |
| LT-001  | Throughput baseline: 1000 req/s for 60s → p99 latency < 50ms (mock adapter)                   | Load | 60s      | `load-throughput.test.ts`        |
| LT-002  | Audit recording under load: 500 req/s with GxP audit → no audit entries dropped               | Load | 120s     | `load-audit.test.ts`             |
| LT-003  | Hash chain integrity under load: 10,000 entries → verifyHistoryChain() returns true           | Load | 30s      | `load-hash-chain.test.ts`        |
| LT-004  | Concurrent scopes: 50 concurrent scopes, 100 req/scope → all scopes clean up                  | Load | 60s      | `load-concurrent-scopes.test.ts` |
| LT-005  | Retry storm: 100 concurrent requests, all failing → retry limiter prevents exponential growth | Load | 30s      | `load-retry-storm.test.ts`       |
| SK-001  | Memory stability: 10 req/s for 1 hour → RSS growth < 10MB (detects memory leaks)              | Soak | 3600s    | `soak-memory.test.ts`            |
| SK-002  | Audit trail rotation: sustained writes for 1 hour → archival triggered → hot storage bounded  | Soak | 3600s    | `soak-audit-rotation.test.ts`    |
| SK-003  | Connection pool stability: 50 req/s for 1 hour → no connection leaks → pool size stable       | Soak | 3600s    | `soak-connections.test.ts`       |

## DoD 20: Transport Security

**Section:** [18 - HTTP Transport Security](./18-http-transport-security.md) (§84-§90d)
**Test count:** 82 tests (75 enumerated below + 7 type-level tests per DoD summary)

| Test ID | Description                                                                             | Type        | File                                     |
| ------- | --------------------------------------------------------------------------------------- | ----------- | ---------------------------------------- |
| TS-001  | `requireHttps()` rejects `http://` URLs with `HTTPS_REQUIRED` error                     | Unit        | `transport-security.test.ts`             |
| TS-002  | `requireHttps()` allows `https://` URLs                                                 | Unit        | `transport-security.test.ts`             |
| TS-003  | `requireHttps({ allowLocalhost: true })` allows `http://localhost`                      | Unit        | `transport-security.test.ts`             |
| TS-004  | `requireHttps({ allowLocalhost: true })` allows `http://127.0.0.1`                      | Unit        | `transport-security.test.ts`             |
| TS-005  | `requireHttps()` audit entry records enforcement decision                               | Unit        | `transport-security.test.ts`             |
| TS-006  | `withPayloadIntegrity()` computes SHA-256 digest of request body                        | Unit        | `payload-integrity.test.ts`              |
| TS-007  | `withPayloadIntegrity()` attaches `X-Payload-Digest` header                             | Unit        | `payload-integrity.test.ts`              |
| TS-008  | `withPayloadIntegrity()` verifies response body digest when `X-Response-Digest` present | Unit        | `payload-integrity.test.ts`              |
| TS-009  | `withPayloadIntegrity()` returns `PAYLOAD_INTEGRITY_FAILED` on digest mismatch          | Unit        | `payload-integrity.test.ts`              |
| TS-010  | `withPayloadIntegrity()` skips digest for GET/HEAD/OPTIONS requests                     | Unit        | `payload-integrity.test.ts`              |
| TS-011  | `withCredentialProtection()` redacts Authorization header from audit entries            | Unit        | `credential-protection.test.ts`          |
| TS-012  | `withCredentialProtection()` redacts Bearer tokens from error messages                  | Unit        | `credential-protection.test.ts`          |
| TS-013  | `withCredentialProtection()` redacts Basic auth from error messages                     | Unit        | `credential-protection.test.ts`          |
| TS-014  | `withCredentialProtection()` preserves non-credential headers                           | Unit        | `credential-protection.test.ts`          |
| TS-015  | `withCredentialProtection()` redacts custom credential patterns                         | Unit        | `credential-protection.test.ts`          |
| TS-016  | `HttpClientConfigurationAuditEntry` records config changes with before/after            | Unit        | `config-change-control.test.ts`          |
| TS-017  | Configuration change control records actor identity                                     | Unit        | `config-change-control.test.ts`          |
| TS-018  | Configuration change control records change reason                                      | Unit        | `config-change-control.test.ts`          |
| TS-019  | Configuration change is rejected when locked                                            | Unit        | `config-change-control.test.ts`          |
| TS-020  | `withPayloadValidation()` validates request body against schema                         | Unit        | `payload-validation.test.ts`             |
| TS-021  | `withPayloadValidation()` validates response body against schema                        | Unit        | `payload-validation.test.ts`             |
| TS-022  | `withPayloadValidation()` returns `PAYLOAD_VALIDATION_FAILED` on schema mismatch        | Unit        | `payload-validation.test.ts`             |
| TS-023  | `withPayloadValidation()` skips validation for empty bodies                             | Unit        | `payload-validation.test.ts`             |
| TS-024  | `withPayloadValidation()` records validation result in audit entry                      | Unit        | `payload-validation.test.ts`             |
| TS-025  | `withTokenLifecycle()` refreshes expired tokens before request                          | Unit        | `token-lifecycle.test.ts`                |
| TS-026  | `withTokenLifecycle()` caches valid tokens until expiry                                 | Unit        | `token-lifecycle.test.ts`                |
| TS-027  | `withTokenLifecycle()` trips circuit breaker on repeated refresh failures               | Unit        | `token-lifecycle.test.ts`                |
| TS-028  | `withTokenLifecycle()` returns `TOKEN_EXPIRED` when refresh fails                       | Unit        | `token-lifecycle.test.ts`                |
| TS-029  | `withTokenLifecycle()` returns `TOKEN_LIFECYCLE_CIRCUIT_OPEN` when circuit is open      | Unit        | `token-lifecycle.test.ts`                |
| TS-030  | `withTokenLifecycle()` records token refresh in audit entry                             | Unit        | `token-lifecycle.test.ts`                |
| TS-031  | Transport security overview (§84) documents all combinator composition rules            | Unit        | `transport-overview.test.ts`             |
| TS-032  | HTTPS enforcement audit entry has correct schema                                        | Unit        | `transport-security.test.ts`             |
| TS-033  | Payload integrity audit entry has correct schema                                        | Unit        | `payload-integrity.test.ts`              |
| TS-034  | Credential protection audit entry has correct schema                                    | Unit        | `credential-protection.test.ts`          |
| TS-035  | Payload validation audit entry has correct schema                                       | Unit        | `payload-validation.test.ts`             |
| TS-036  | Token lifecycle audit entry has correct schema                                          | Unit        | `token-lifecycle.test.ts`                |
| TS-037  | All transport combinators compose with standard client combinators                      | Integration | `transport-composition.test.ts`          |
| TS-038  | `requireHttps()` + `withPayloadIntegrity()` compose correctly                           | Integration | `transport-composition.test.ts`          |
| TS-039  | `withCredentialProtection()` + `withPayloadValidation()` compose correctly              | Integration | `transport-composition.test.ts`          |
| TS-040  | `withTokenLifecycle()` + `requireHttps()` compose correctly                             | Integration | `transport-composition.test.ts`          |
| TS-041  | Full transport security chain: HTTPS + credentials + payload + token                    | Integration | `transport-composition.test.ts`          |
| TS-042  | Transport combinators appear in combinator chain inspector                              | Unit        | `transport-security.test.ts`             |
| TS-043  | `requireHttps()` combinator has `CombinatorInfo` entry                                  | Unit        | `transport-security.test.ts`             |
| TS-044  | `withPayloadIntegrity()` combinator has `CombinatorInfo` entry                          | Unit        | `payload-integrity.test.ts`              |
| TS-045  | `withTokenLifecycle()` combinator has `CombinatorInfo` entry                            | Unit        | `token-lifecycle.test.ts`                |
| TS-046  | `withSsrfProtection()` blocks private IP addresses (10.x, 172.16.x, 192.168.x)          | Unit        | `ssrf-protection.test.ts`                |
| TS-047  | `withSsrfProtection()` blocks loopback addresses (127.0.0.1, ::1)                       | Unit        | `ssrf-protection.test.ts`                |
| TS-048  | `withSsrfProtection()` blocks cloud metadata endpoints (169.254.169.254)                | Unit        | `ssrf-protection.test.ts`                |
| TS-049  | `withSsrfProtection()` allows requests to allowlisted URL patterns                      | Unit        | `ssrf-protection.test.ts`                |
| TS-050  | `withSsrfProtection()` denies requests matching deniedUrlPatterns                       | Unit        | `ssrf-protection.test.ts`                |
| TS-051  | `withSsrfProtection()` detects DNS rebinding (public hostname → private IP)             | Unit        | `ssrf-protection.test.ts`                |
| TS-052  | `withSsrfProtection()` records blocked request in audit trail                           | Unit        | `ssrf-protection.test.ts`                |
| TS-053  | `withSsrfProtection()` produces correct `SsrfViolationError` codes                      | Unit        | `ssrf-protection.test.ts`                |
| TS-054  | CT verification rejects certificate without SCTs in enforce mode                        | Unit        | `ct-verification.test.ts`                |
| TS-055  | CT verification accepts certificate with >= minimumScts valid SCTs                      | Unit        | `ct-verification.test.ts`                |
| TS-056  | CT verification rejects stale SCTs older than maxSctAge                                 | Unit        | `ct-verification.test.ts`                |
| TS-057  | CT verification logs warning in report-only mode for missing SCTs                       | Unit        | `ct-verification.test.ts`                |
| TS-058  | CT verification validates SCTs from trusted logs only when trustedLogs configured       | Unit        | `ct-verification.test.ts`                |
| TS-059  | `withHstsEnforcement()` warns on missing HSTS header from GxP endpoint                  | Unit        | `hsts-enforcement.test.ts`               |
| TS-060  | `withHstsEnforcement()` warns on HSTS max-age below minimumMaxAge                       | Unit        | `hsts-enforcement.test.ts`               |
| TS-061  | `withHstsEnforcement()` caches HSTS host in preload cache                               | Unit        | `hsts-enforcement.test.ts`               |
| TS-062  | `withHstsEnforcement()` blocks plaintext request to cached HSTS host in enforce mode    | Unit        | `hsts-enforcement.test.ts`               |
| TS-063  | `withHstsEnforcement()` respects max-age expiration on cached entries                   | Unit        | `hsts-enforcement.test.ts`               |
| TS-064  | `withCsrfProtection()` attaches CSRF token header to POST requests                      | Unit        | `csrf-protection.test.ts`                |
| TS-065  | `withCsrfProtection()` attaches CSRF token header to PUT/PATCH/DELETE requests          | Unit        | `csrf-protection.test.ts`                |
| TS-066  | `withCsrfProtection()` does not attach CSRF token to GET/HEAD/OPTIONS requests          | Unit        | `csrf-protection.test.ts`                |
| TS-067  | `withCsrfProtection()` returns `CSRF_TOKEN_MISSING` when tokenProvider returns error    | Unit        | `csrf-protection.test.ts`                |
| TS-068  | `withCsrfProtection()` double-submit-cookie reads token from cookie                     | Unit        | `csrf-protection.test.ts`                |
| TS-069  | SSRF + HSTS + CSRF combinators compose with standard transport chain                    | Integration | `extended-transport-composition.test.ts` |
| TS-070  | Full extended transport chain: HTTPS + SSRF + CT + HSTS + CSRF + credentials            | Integration | `extended-transport-composition.test.ts` |
| TS-071  | `withSsrfProtection()` combinator has `CombinatorInfo` entry                            | Unit        | `ssrf-protection.test.ts`                |
| TS-072  | `withHstsEnforcement()` combinator has `CombinatorInfo` entry                           | Unit        | `hsts-enforcement.test.ts`               |
| TS-073  | `withCsrfProtection()` combinator has `CombinatorInfo` entry                            | Unit        | `csrf-protection.test.ts`                |
| TS-074  | CT verification records enforcement decision in audit trail                             | Unit        | `ct-verification.test.ts`                |
| TS-075  | CSRF protection failure recorded in audit trail                                         | Unit        | `csrf-protection.test.ts`                |

## DoD 21: Audit Bridge

**Section:** [19 - HTTP Audit Bridge](./19-http-audit-bridge.md) (§91-§97)
**Test count:** 52 tests (40 enumerated below + 7 type-level + 5 additional integration tests per DoD summary)

| Test ID | Description                                                               | Type        | File                               |
| ------- | ------------------------------------------------------------------------- | ----------- | ---------------------------------- |
| AB-001  | `HttpAuditTrailPort` records HTTP operation with SHA-256 chain            | Unit        | `audit-bridge.test.ts`             |
| AB-002  | `HttpAuditTrailPort` maintains chain integrity across operations          | Unit        | `audit-bridge.test.ts`             |
| AB-003  | `HttpAuditTrailPort.verify()` returns true for intact chain               | Unit        | `audit-bridge.test.ts`             |
| AB-004  | `HttpAuditTrailPort.verify()` returns false for tampered chain            | Unit        | `audit-bridge.test.ts`             |
| AB-005  | `HttpAuditTrailPort.query()` filters by requestId                         | Unit        | `audit-bridge.test.ts`             |
| AB-006  | `HttpAuditTrailPort.query()` filters by time range                        | Unit        | `audit-bridge.test.ts`             |
| AB-007  | `HttpOperationAuditEntry` contains all required fields                    | Unit        | `audit-entry.test.ts`              |
| AB-008  | `HttpOperationAuditEntry` includes method, url, status, duration          | Unit        | `audit-entry.test.ts`              |
| AB-009  | `HttpOperationAuditEntry` includes actor attribution                      | Unit        | `audit-entry.test.ts`              |
| AB-010  | `HttpOperationAuditEntry` includes request/response digests               | Unit        | `audit-entry.test.ts`              |
| AB-011  | User attribution extracts identity from scope context                     | Unit        | `user-attribution.test.ts`         |
| AB-012  | User attribution falls back to scopeId when no identity                   | Unit        | `user-attribution.test.ts`         |
| AB-013  | User attribution records IP address when available                        | Unit        | `user-attribution.test.ts`         |
| AB-014  | User attribution records user agent when available                        | Unit        | `user-attribution.test.ts`         |
| AB-015  | RBAC evaluates permission before HTTP operation                           | Unit        | `rbac.test.ts`                     |
| AB-016  | RBAC denies unauthorized HTTP operations                                  | Unit        | `rbac.test.ts`                     |
| AB-017  | RBAC records authorization decision in audit entry                        | Unit        | `rbac.test.ts`                     |
| AB-018  | RBAC supports role-based policies                                         | Unit        | `rbac.test.ts`                     |
| AB-019  | RBAC supports resource-based policies                                     | Unit        | `rbac.test.ts`                     |
| AB-020  | Authentication failure creates audit entry                                | Unit        | `auth-failure-audit.test.ts`       |
| AB-021  | Authentication failure audit entry includes failure reason                | Unit        | `auth-failure-audit.test.ts`       |
| AB-022  | Authentication failure audit entry includes attempted identity            | Unit        | `auth-failure-audit.test.ts`       |
| AB-023  | Authentication failure audit entry includes timestamp                     | Unit        | `auth-failure-audit.test.ts`       |
| AB-024  | Repeated authentication failures trigger alert event                      | Unit        | `auth-failure-audit.test.ts`       |
| AB-025  | Clock synchronization validates monotonic timing                          | Unit        | `clock-sync.test.ts`               |
| AB-026  | Clock synchronization detects drift between wall-clock and monotonic      | Unit        | `clock-sync.test.ts`               |
| AB-027  | Clock synchronization records drift warning in audit                      | Unit        | `clock-sync.test.ts`               |
| AB-028  | Cross-correlation links guard evaluation to HTTP operation                | Unit        | `cross-correlation.test.ts`        |
| AB-029  | Cross-correlation preserves evaluationId across chains                    | Unit        | `cross-correlation.test.ts`        |
| AB-030  | Cross-correlation validates requestId consistency                         | Unit        | `cross-correlation.test.ts`        |
| AB-031  | Cross-correlation validates scopeId consistency                           | Unit        | `cross-correlation.test.ts`        |
| AB-032  | Cross-correlation validates timestamp ordering                            | Unit        | `cross-correlation.test.ts`        |
| AB-033  | Audit bridge integration: transport security + audit trail                | Integration | `audit-bridge-integration.test.ts` |
| AB-034  | Audit bridge integration: full pipeline with attribution                  | Integration | `audit-bridge-integration.test.ts` |
| AB-035  | Audit bridge integration: cross-chain verification                        | Integration | `audit-bridge-integration.test.ts` |
| AB-036  | `externalCorrelationId` populated from `X-Correlation-Id` header          | Unit        | `external-correlation.test.ts`     |
| AB-037  | `externalCorrelationId` is empty string when header absent                | Unit        | `external-correlation.test.ts`     |
| AB-038  | `externalCorrelationId` included in hash chain computation when non-empty | Unit        | `external-correlation.test.ts`     |
| AB-039  | Custom `externalCorrelationHeader` option respected                       | Unit        | `external-correlation.test.ts`     |
| AB-040  | External correlation ID enables cross-system audit query                  | Integration | `audit-bridge-integration.test.ts` |

## DoD 22: Attribution and RBAC

**Section:** [20 - HTTP Transport Validation](./20-http-transport-validation.md) (§98-§103)
**Test count:** 33 tests (25 enumerated below + 6 type-level + 2 additional integration tests per DoD summary)

| Test ID | Description                                                                 | Type        | File                           |
| ------- | --------------------------------------------------------------------------- | ----------- | ------------------------------ |
| TV-001  | FMEA table covers all transport security failure modes                      | Unit        | `transport-validation.test.ts` |
| TV-002  | FMEA RPN scores calculated correctly                                        | Unit        | `transport-validation.test.ts` |
| TV-003  | FMEA mitigation maps to specific sections                                   | Unit        | `transport-validation.test.ts` |
| TV-004  | IQ verifies all transport combinators are registered                        | Unit        | `transport-iq.test.ts`         |
| TV-005  | IQ verifies audit trail port is registered                                  | Unit        | `transport-iq.test.ts`         |
| TV-006  | OQ verifies HTTPS enforcement under load                                    | Unit        | `transport-oq.test.ts`         |
| TV-007  | OQ verifies payload integrity under concurrent requests                     | Unit        | `transport-oq.test.ts`         |
| TV-008  | OQ verifies credential protection under concurrent requests                 | Unit        | `transport-oq.test.ts`         |
| TV-009  | PQ verifies end-to-end transport security pipeline                          | Integration | `transport-pq.test.ts`         |
| TV-010  | PQ verifies audit trail completeness after pipeline run                     | Integration | `transport-pq.test.ts`         |
| TV-011  | Regulatory traceability matrix covers 21 CFR 11.10(c)                       | Unit        | `traceability-matrix.test.ts`  |
| TV-012  | Regulatory traceability matrix covers 21 CFR 11.10(e)                       | Unit        | `traceability-matrix.test.ts`  |
| TV-013  | Regulatory traceability matrix covers 21 CFR 11.30                          | Unit        | `traceability-matrix.test.ts`  |
| TV-014  | Regulatory traceability matrix covers EU GMP Annex 11 §7                    | Unit        | `traceability-matrix.test.ts`  |
| TV-015  | Regulatory traceability matrix covers EU GMP Annex 11 §9                    | Unit        | `traceability-matrix.test.ts`  |
| TV-016  | Regulatory traceability matrix covers EU GMP Annex 11 §12                   | Unit        | `traceability-matrix.test.ts`  |
| TV-017  | Compliance checklist item: HTTPS enforcement active                         | Unit        | `compliance-checklist.test.ts` |
| TV-018  | Compliance checklist item: payload integrity active                         | Unit        | `compliance-checklist.test.ts` |
| TV-019  | Compliance checklist item: credential protection active                     | Unit        | `compliance-checklist.test.ts` |
| TV-020  | Compliance checklist item: audit trail active                               | Unit        | `compliance-checklist.test.ts` |
| TV-021  | Compliance checklist item: token lifecycle active                           | Unit        | `compliance-checklist.test.ts` |
| TV-022  | GxP combinator composition: all combinators compose without conflict        | Integration | `gxp-composition.test.ts`      |
| TV-023  | GxP combinator composition: ordering rules enforced                         | Integration | `gxp-composition.test.ts`      |
| TV-024  | GxP combinator composition: duplicate combinator detection                  | Unit        | `gxp-composition.test.ts`      |
| TV-025  | GxP combinator composition: composition produces valid CombinatorInfo chain | Unit        | `gxp-composition.test.ts`      |

---

_Previous: [15 - Appendices](./15-appendices.md)_

_Next: [17 - GxP Compliance Guide](./17-gxp-compliance.md)_
