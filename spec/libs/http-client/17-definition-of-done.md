# 17 - Definition of Done

_Previous: [16 - HTTP Transport Security](./16-http-transport-security.md)_

## Test Tables

### DoD 1: Core Types (Spec Sections §1–§8)

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

**Target: >= 90% mutation score.**

---

### DoD 2: HTTP Request (Spec Sections §9–§14)

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

**Target: >= 90% mutation score.**

---

### DoD 3: HTTP Response (Spec Sections §15–§18)

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

**Target: >= 90% mutation score.**

---

### DoD 4: Error Types (Spec Sections §19–§24)

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

**Target: >= 90% mutation score.**

---

### DoD 5: HTTP Client Port (Spec Sections §25–§28)

| Test ID | Description                                            | Type        | File                        |
| ------- | ------------------------------------------------------ | ----------- | --------------------------- |
| PT-001  | `HttpClientPort` has correct name                      | Unit        | `port.test.ts`              |
| PT-002  | `HttpClientPort` has "outbound" direction              | Unit        | `port.test.ts`              |
| PT-003  | `isHttpClientPort` returns true for HttpClientPort     | Unit        | `port.test.ts`              |
| PT-004  | `isHttpClientPort` returns false for other ports       | Unit        | `port.test.ts`              |
| PT-005  | HttpClientPort participates in GraphBuilder validation | Integration | `graph-integration.test.ts` |

**Target: >= 90% mutation score.**

---

### DoD 6: Client Combinators (Spec Sections §29–§38)

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

**Target: >= 90% mutation score.**

---

### DoD 7: Fetch Transport Adapter (Spec Sections §39–§44)

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

**Target: >= 90% mutation score.**

---

### DoD 7b: Axios Transport Adapter (Spec Sections §39–§44)

| Test ID | Description                                           | Type        | File                     |
| ------- | ----------------------------------------------------- | ----------- | ------------------------ |
| AX-001  | Axios adapter sends GET request                       | Integration | `axios-adapter.test.ts`  |
| AX-002  | Axios adapter sends POST with JSON body               | Integration | `axios-adapter.test.ts`  |
| AX-003  | Axios adapter sends FormData body                     | Integration | `axios-adapter.test.ts`  |
| AX-004  | Axios adapter maps ERR_NETWORK to Transport           | Integration | `axios-adapter.test.ts`  |
| AX-005  | Axios adapter maps ECONNABORTED to Timeout reason     | Integration | `axios-adapter.test.ts`  |
| AX-006  | Axios adapter maps ERR_CANCELED to Aborted reason     | Integration | `axios-adapter.test.ts`  |
| AX-007  | Axios adapter disables auto-parse (responseType)      | Integration | `axios-adapter.test.ts`  |
| AX-008  | Axios adapter passes all status codes through         | Integration | `axios-adapter.test.ts`  |
| AX-009  | Custom axios instance is used when provided           | Integration | `axios-adapter.test.ts`  |
| AX-010  | Axios adapter handles streaming response              | Integration | `axios-adapter.test.ts`  |

**Target: >= 90% mutation score.**

---

### DoD 7c: Got Transport Adapter (Spec Sections §39–§44)

| Test ID | Description                                           | Type        | File                   |
| ------- | ----------------------------------------------------- | ----------- | ---------------------- |
| GT-001  | Got adapter sends GET request                         | Integration | `got-adapter.test.ts`  |
| GT-002  | Got adapter sends POST with JSON body                 | Integration | `got-adapter.test.ts`  |
| GT-003  | Got adapter sends URLSearchParams body                | Integration | `got-adapter.test.ts`  |
| GT-004  | Got adapter maps RequestError to Transport            | Integration | `got-adapter.test.ts`  |
| GT-005  | Got adapter maps TimeoutError to Timeout reason       | Integration | `got-adapter.test.ts`  |
| GT-006  | Got adapter maps CancelError to Aborted reason        | Integration | `got-adapter.test.ts`  |
| GT-007  | Got adapter disables retry (limit: 0)                 | Integration | `got-adapter.test.ts`  |
| GT-008  | Got adapter converts ReadableStream to Node Readable  | Integration | `got-adapter.test.ts`  |
| GT-009  | Custom got instance is used when provided             | Integration | `got-adapter.test.ts`  |
| GT-010  | Got adapter passes all status codes through           | Integration | `got-adapter.test.ts`  |

**Target: >= 90% mutation score.**

---

### DoD 7d: Ky Transport Adapter (Spec Sections §39–§44)

| Test ID | Description                                           | Type        | File                  |
| ------- | ----------------------------------------------------- | ----------- | --------------------- |
| KY-001  | Ky adapter sends GET request                          | Integration | `ky-adapter.test.ts`  |
| KY-002  | Ky adapter sends POST with JSON body                  | Integration | `ky-adapter.test.ts`  |
| KY-003  | Ky adapter sends FormData body                        | Integration | `ky-adapter.test.ts`  |
| KY-004  | Ky adapter maps TypeError to Transport                | Integration | `ky-adapter.test.ts`  |
| KY-005  | Ky adapter maps TimeoutError to Timeout reason        | Integration | `ky-adapter.test.ts`  |
| KY-006  | Ky adapter maps AbortError to Aborted reason          | Integration | `ky-adapter.test.ts`  |
| KY-007  | Ky adapter disables retry (retry: 0)                  | Integration | `ky-adapter.test.ts`  |
| KY-008  | Ky adapter handles streaming response                 | Integration | `ky-adapter.test.ts`  |
| KY-009  | Custom ky instance is used when provided              | Integration | `ky-adapter.test.ts`  |
| KY-010  | Ky adapter passes all status codes through            | Integration | `ky-adapter.test.ts`  |

**Target: >= 90% mutation score.**

---

### DoD 7e: Ofetch Transport Adapter (Spec Sections §39–§44)

| Test ID | Description                                            | Type        | File                      |
| ------- | ------------------------------------------------------ | ----------- | ------------------------- |
| OF-001  | Ofetch adapter sends GET request                       | Integration | `ofetch-adapter.test.ts`  |
| OF-002  | Ofetch adapter sends POST with JSON body               | Integration | `ofetch-adapter.test.ts`  |
| OF-003  | Ofetch adapter sends FormData body                     | Integration | `ofetch-adapter.test.ts`  |
| OF-004  | Ofetch adapter maps FetchError (network) to Transport  | Integration | `ofetch-adapter.test.ts`  |
| OF-005  | Ofetch adapter maps abort+timeout to Timeout reason    | Integration | `ofetch-adapter.test.ts`  |
| OF-006  | Ofetch adapter maps abort (manual) to Aborted reason   | Integration | `ofetch-adapter.test.ts`  |
| OF-007  | Ofetch adapter disables auto-parse (parseResponse)     | Integration | `ofetch-adapter.test.ts`  |
| OF-008  | Ofetch adapter handles streaming response              | Integration | `ofetch-adapter.test.ts`  |
| OF-009  | Custom ofetch instance is used when provided           | Integration | `ofetch-adapter.test.ts`  |
| OF-010  | Ofetch adapter passes all status codes through         | Integration | `ofetch-adapter.test.ts`  |

**Target: >= 90% mutation score.**

---

### DoD 7f: Scoped Clients (Spec Sections §45–§48)

| Test ID | Description | Type | File |
| ------- | ----------- | ---- | ---- |
| SC-001  | Scoped adapter applies per-scope headers (correlation ID, auth token) to every outgoing request | Unit | `scoped-client.test.ts` |
| SC-002  | Singleton base transport is shared across N scopes — not duplicated per scope | Unit | `scoped-client.test.ts` |
| SC-003  | Scope disposal releases the scoped adapter without affecting the singleton base transport | Unit | `scoped-client.test.ts` |
| SC-004  | GxP: scope creation emits audit entry with `scopeId`, `scopeName`, `createdAt`, `parentScopeId`, `combinatorChain` | GxP | `gxp-scope-lifecycle.test.ts` |
| SC-005  | GxP: scope disposal emits audit entry with `scopeId`, `disposedAt`, `operationCount`, `auditEntriesCount`, `allEntriesPersisted` | GxP | `gxp-scope-lifecycle.test.ts` |
| SC-006  | GxP: `allEntriesPersisted=false` and warning event emitted when any entry has `__sinkStatus` `"failed"`, `"exhausted"`, or `"pending"` at disposal | GxP | `gxp-scope-lifecycle.test.ts` |
| SC-007  | Correlation ID from scope injected as `X-Correlation-Id` header on every request | Unit | `scoped-client.test.ts` |
| SC-008  | W3C `traceparent` header injected when an active span is present in scope | Unit | `scoped-client.test.ts` |
| SC-009  | Multi-tenant scoped adapter applies correct `baseUrl`, API key, and API version from `TenantConfig` | Unit | `scoped-client.test.ts` |
| SC-010  | Two concurrent tenant scopes carry independent headers — no cross-contamination between scopes | Unit | `scoped-client.test.ts` |

**Target: >= 90% mutation score.**

---

### DoD 8: Introspection (Spec Sections §54–§57)

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

**Target: >= 90% mutation score.**

---

### DoD 9: Audit Integrity (Spec Sections §54–§57)

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

**Target: >= 90% mutation score.**

---

### DoD 10: Audit Sink (Spec Sections §54–§57)

| Test ID | Description                                                               | Type | File                 |
| ------- | ------------------------------------------------------------------------- | ---- | -------------------- |
| AS-001  | `auditSink.write()` called for each completed request when mode is "full" | Unit | `audit-sink.test.ts` |
| AS-002  | `auditSink.write()` receives entry with `__integrity` fields populated    | Unit | `audit-sink.test.ts` |
| AS-003  | `auditSink.write()` not called when mode is "off"                         | Unit | `audit-sink.test.ts` |
| AS-004  | `auditSink.flush()` called on inspector disposal                          | Unit | `audit-sink.test.ts` |
| AS-005  | Evicted entries are not re-sent to sink                                   | Unit | `audit-sink.test.ts` |
| AS-006  | `auditSink.write()` called for entries in "lightweight" mode              | Unit | `audit-sink.test.ts` |

**Target: >= 90% mutation score.**

---

### DoD 11: Error Freezing (Spec Sections §19–§24)

| Test ID | Description                                                 | Type | File                     |
| ------- | ----------------------------------------------------------- | ---- | ------------------------ |
| EF-001  | `httpRequestError` returns a frozen object                  | Unit | `error-freezing.test.ts` |
| EF-002  | `httpResponseError` returns a frozen object                 | Unit | `error-freezing.test.ts` |
| EF-003  | `httpBodyError` returns a frozen object                     | Unit | `error-freezing.test.ts` |
| EF-004  | Mutation of frozen error field is silently ignored          | Unit | `error-freezing.test.ts` |
| EF-005  | `Object.isFrozen()` returns true for all error constructors | Unit | `error-freezing.test.ts` |

**Target: >= 95% mutation score.**

---

### DoD 12: Monotonic Timing & Audit Warnings (Spec Sections §54–§57)

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

**Target: >= 90% mutation score.**

---

### DoD 13: Testing Utilities (Spec Sections §58–§63)

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

**Target: >= 90% mutation score.**

---

### DoD 14: Library Inspector Bridge (Spec Sections §54–§57)

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

**Target: >= 90% mutation score.**

---

### DoD 15: Combinator State (Spec Sections §54–§57)

| Test ID | Description                                             | Type | File                       |
| ------- | ------------------------------------------------------- | ---- | -------------------------- |
| CS-001  | Circuit breaker state appears in snapshot               | Unit | `combinator-state.test.ts` |
| CS-002  | Rate limiter state appears in snapshot                  | Unit | `combinator-state.test.ts` |
| CS-003  | Cache state appears in snapshot                         | Unit | `combinator-state.test.ts` |
| CS-004  | Multiple circuit breakers tracked independently by name | Unit | `combinator-state.test.ts` |
| CS-005  | Multiple rate limiters tracked independently by name    | Unit | `combinator-state.test.ts` |
| CS-006  | Multiple caches tracked independently by name           | Unit | `combinator-state.test.ts` |
| CS-007  | Circuit breaker state transitions reflected in snapshot | Unit | `combinator-state.test.ts` |

**Target: >= 90% mutation score.**

---

### DoD 16: Health Abstraction (Spec Sections §54–§57)

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

**Target: >= 90% mutation score.**

---

### DoD 17: Combinator Chain (Spec Sections §54–§57)

| Test ID | Description                                                   | Type | File                       |
| ------- | ------------------------------------------------------------- | ---- | -------------------------- |
| CH-001  | Base client has empty combinator chain                        | Unit | `combinator-chain.test.ts` |
| CH-002  | Single combinator appends to chain                            | Unit | `combinator-chain.test.ts` |
| CH-003  | Multiple combinators compose in application order             | Unit | `combinator-chain.test.ts` |
| CH-004  | Chain entry includes name and config summary                  | Unit | `combinator-chain.test.ts` |
| CH-005  | Inspector returns chain from resolved client                  | Unit | `combinator-chain.test.ts` |
| CH-006  | Symbol-keyed metadata does not leak to `HttpClient` interface | Unit | `combinator-chain.test.ts` |

**Target: >= 90% mutation score.**

---

### DoD 18: MCP Resource Mapping (Spec Sections §54–§57)

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

**Target: >= 90% mutation score.**

---

### DoD 19: A2A Skills (Spec Section §69)

| Test ID | Description                                                                                             | Type | File                 |
| ------- | ------------------------------------------------------------------------------------------------------- | ---- | -------------------- |
| A2-001  | `diagnose-http-issue` skill definition has required fields (`id`, `name`, `description`, `inputSchema`) | Unit | `a2a-skills.test.ts` |
| A2-002  | `http-health-check` skill definition has required fields (`id`, `name`, `description`, `inputSchema`)   | Unit | `a2a-skills.test.ts` |

**Target: >= 90% mutation score.**

---

### DoD 19d: Interceptor Chains (Spec Section §64)

| Test ID | Description                                                                                | Type | File                        |
| ------- | ------------------------------------------------------------------------------------------ | ---- | --------------------------- |
| IC-001  | `composeInterceptors()` with zero interceptors returns identity (passes client unchanged)  | Unit | `interceptor-chain.test.ts` |
| IC-002  | `composeInterceptors(a, b)` applies `a` then `b` left-to-right                            | Unit | `interceptor-chain.test.ts` |
| IC-003  | `composeInterceptors(a, b, c)` is equivalent to manual nesting `a(b(c(client)))`          | Unit | `interceptor-chain.test.ts` |
| IC-004  | DI-Aware Interceptor Adapter resolves required ports and applies interceptors via `pipe()` | Unit | `interceptor-chain.test.ts` |
| IC-005  | Result of `composeInterceptors` is itself a valid `HttpClientInterceptor`                  | Unit | `interceptor-chain.test.ts` |

**Target: >= 90% mutation score.**

---

### DoD 19e: Circuit Breaker (Spec Section §65)

| Test ID | Description                                                                                        | Type | File                      |
| ------- | -------------------------------------------------------------------------------------------------- | ---- | ------------------------- |
| CB-001  | Circuit starts in `closed` state                                                                   | Unit | `circuit-breaker.test.ts` |
| CB-002  | Circuit transitions to `open` after `failureThreshold` consecutive failures                       | Unit | `circuit-breaker.test.ts` |
| CB-003  | Requests in `open` state are immediately rejected with `Transport` reason                          | Unit | `circuit-breaker.test.ts` |
| CB-004  | Circuit transitions to `half-open` after `resetTimeout` ms elapses                                | Unit | `circuit-breaker.test.ts` |
| CB-005  | Successful probe in `half-open` closes the circuit                                                 | Unit | `circuit-breaker.test.ts` |
| CB-006  | Failed probe in `half-open` re-opens the circuit and resets `resetTimeout`                         | Unit | `circuit-breaker.test.ts` |
| CB-007  | `isFailure` predicate controls which errors increment the failure counter                          | Unit | `circuit-breaker.test.ts` |
| CB-008  | `onStateChange` callback is invoked on every state transition with the new state                   | Unit | `circuit-breaker.test.ts` |

**Target: >= 90% mutation score.**

---

### DoD 19f: Rate Limiting (Spec Section §66)

| Test ID | Description                                                                                       | Type | File                   |
| ------- | ------------------------------------------------------------------------------------------------- | ---- | ---------------------- |
| RL-001  | Requests within `maxRequests` per window pass through without throttling                          | Unit | `rate-limiter.test.ts` |
| RL-002  | `strategy: "reject"` immediately rejects excess requests with `Transport` reason                  | Unit | `rate-limiter.test.ts` |
| RL-003  | `strategy: "queue"` holds excess requests and executes them in the next window slot               | Unit | `rate-limiter.test.ts` |
| RL-004  | Window counter resets after `windowMs` elapses                                                    | Unit | `rate-limiter.test.ts` |

**Target: >= 90% mutation score.**

---

### DoD 19g: Response Caching (Spec Section §67)

| Test ID | Description                                                                                           | Type | File             |
| ------- | ----------------------------------------------------------------------------------------------------- | ---- | ---------------- |
| RC-001  | Second identical GET request returns cached response without invoking the transport                   | Unit | `cache.test.ts`  |
| RC-002  | Cache entry expires after `ttlMs` ms; subsequent request invokes transport again                      | Unit | `cache.test.ts`  |
| RC-003  | Non-GET/HEAD requests bypass the cache by default                                                     | Unit | `cache.test.ts`  |
| RC-004  | `maxEntries` limit evicts the oldest entry when exceeded (LRU)                                        | Unit | `cache.test.ts`  |
| RC-005  | `isCacheable` predicate prevents caching responses that fail the predicate                            | Unit | `cache.test.ts`  |

**Target: >= 90% mutation score.**

---

### DoD 19b: Transport Security Combinators (Spec Sections §84–§90d)

| Test ID | Description                                                                        | Type        | File                              |
| ------- | ---------------------------------------------------------------------------------- | ----------- | --------------------------------- |
| SEC-001 | `requireHttps` rejects non-HTTPS URL with `HTTPS_REQUIRED` error code             | Unit        | `transport-security.test.ts`      |
| SEC-002 | `requireHttps` allows HTTPS URL through unchanged                                 | Unit        | `transport-security.test.ts`      |
| SEC-003 | `requireHttps` with `minTlsVersion: "1.3"` attaches TLS 1.3 metadata             | Unit        | `transport-security.test.ts`      |
| SEC-004 | `requireHttps` with `certificatePins` validates SPKI digest match                 | Unit        | `transport-security.test.ts`      |
| SEC-005 | `requireHttps` rejects request when no certificate pin matches                    | Unit        | `transport-security.test.ts`      |
| SEC-006 | `requireHttps` with `rejectPlainHttp: false` allows HTTP URL                     | Unit        | `transport-security.test.ts`      |
| SEC-007 | `requireHttps` with `cipherSuitePolicy: "gxp-restricted"` attaches cipher metadata | Unit      | `transport-security.test.ts`      |
| SEC-008 | `requireHttps` never throws — all rejections are `Err(HttpRequestError)`          | Unit        | `transport-security.test.ts`      |
| SEC-009 | `withPayloadIntegrity` computes SHA-256 hash of request body                      | Unit        | `payload-integrity.test.ts`       |
| SEC-010 | `withPayloadIntegrity` attaches integrity header to outgoing request               | Unit        | `payload-integrity.test.ts`       |
| SEC-011 | `withPayloadIntegrity` verifies SHA-256 hash of response body                     | Unit        | `payload-integrity.test.ts`       |
| SEC-012 | `withPayloadIntegrity` returns `Err` when response hash mismatches                | Unit        | `payload-integrity.test.ts`       |
| SEC-013 | `withPayloadIntegrity` skips body-less requests (GET, HEAD)                       | Unit        | `payload-integrity.test.ts`       |
| SEC-014 | `withPayloadIntegrity` emits audit entry for integrity event                      | Unit        | `payload-integrity.test.ts`       |
| SEC-015 | `withPayloadIntegrity` never throws — integrity failures are `Err`                | Unit        | `payload-integrity.test.ts`       |
| SEC-016 | `withCredentialProtection` redacts `authorization` header in error objects        | Unit        | `credential-protection.test.ts`   |
| SEC-017 | `withCredentialProtection` redacts `x-api-key` header in error objects            | Unit        | `credential-protection.test.ts`   |
| SEC-018 | `withCredentialProtection` redacts configured body credential patterns            | Unit        | `credential-protection.test.ts`   |
| SEC-019 | `withCredentialProtection` does not modify the actual outgoing request             | Unit        | `credential-protection.test.ts`   |
| SEC-020 | `withCredentialProtection` does not mutate original request headers               | Unit        | `credential-protection.test.ts`   |
| SEC-021 | `withCredentialProtection` redaction applies to nested body patterns              | Unit        | `credential-protection.test.ts`   |
| SEC-022 | `withCredentialProtection` marks audit entry with `credentialRedacted: true`      | Unit        | `credential-protection.test.ts`   |
| SEC-023 | `withPayloadValidation` returns `Err` for request that fails schema               | Unit        | `payload-validation.test.ts`      |
| SEC-024 | `withPayloadValidation` returns `Err` for response that fails schema              | Unit        | `payload-validation.test.ts`      |
| SEC-025 | `withPayloadValidation` allows request that passes schema                         | Unit        | `payload-validation.test.ts`      |
| SEC-026 | `withPayloadValidation` allows response that passes schema                        | Unit        | `payload-validation.test.ts`      |
| SEC-027 | `withPayloadValidation` schema error includes failing field path                  | Unit        | `payload-validation.test.ts`      |
| SEC-028 | `withPayloadValidation` never throws — schema failures are `Err`                  | Unit        | `payload-validation.test.ts`      |
| SEC-029 | `withTokenLifecycle` refreshes token when `maxAge` is exceeded                    | Unit        | `token-lifecycle.test.ts`         |
| SEC-030 | `withTokenLifecycle` refreshes token `refreshBefore` seconds before expiry        | Unit        | `token-lifecycle.test.ts`         |
| SEC-031 | `withTokenLifecycle` uses cached token within valid window                        | Unit        | `token-lifecycle.test.ts`         |
| SEC-032 | `withTokenLifecycle` emits audit entry on token refresh                            | Unit        | `token-lifecycle.test.ts`         |
| SEC-033 | `withTokenLifecycle` returns `Err` when token refresh fails                       | Unit        | `token-lifecycle.test.ts`         |
| SEC-034 | `withAuthenticationPolicy` enforces MFA for critical GxP operations              | Unit        | `token-lifecycle.test.ts`         |
| SEC-035 | `withTokenLifecycle` never throws — refresh failures are `Err`                    | Unit        | `token-lifecycle.test.ts`         |
| SEC-036 | `withSsrfProtection` blocks RFC 1918 private IP ranges (10.x, 192.168.x, 172.x)  | Unit        | `ssrf-protection.test.ts`         |
| SEC-037 | `withSsrfProtection` blocks localhost and loopback addresses                      | Unit        | `ssrf-protection.test.ts`         |
| SEC-038 | `withSsrfProtection` allows configured `allowedHosts` to bypass block             | Unit        | `ssrf-protection.test.ts`         |
| SEC-039 | `withSsrfProtection` returns `Err` with `SSRF_BLOCKED` code for blocked targets   | Unit        | `ssrf-protection.test.ts`         |
| SEC-040 | `withSsrfProtection` never throws — SSRF blocks are `Err`                         | Unit        | `ssrf-protection.test.ts`         |
| SEC-041 | `withHstsEnforcement` rejects redirect from HTTPS to HTTP (downgrade)             | Unit        | `hsts-csrf.test.ts`               |
| SEC-042 | `withHstsEnforcement` respects `Strict-Transport-Security` max-age on response    | Unit        | `hsts-csrf.test.ts`               |
| SEC-043 | `withCsrfProtection` adds CSRF token header to state-mutating requests            | Unit        | `hsts-csrf.test.ts`               |
| SEC-044 | `withCsrfProtection` does not add CSRF header to GET and HEAD requests            | Unit        | `hsts-csrf.test.ts`               |
| SEC-045 | `withCsrfProtection` returns `Err` when CSRF validation fails on response         | Unit        | `hsts-csrf.test.ts`               |
| SEC-046 | `withCsrfProtection` never throws — CSRF failures are `Err`                       | Unit        | `hsts-csrf.test.ts`               |
| SEC-047 | Security combinators compose with standard combinators via `pipe()`               | Integration | `gxp-security-pipeline.test.ts`   |
| SEC-048 | `requireHttps` as first combinator rejects HTTP before any other combinator runs  | Integration | `gxp-security-pipeline.test.ts`   |
| SEC-049 | Full GxP combinator pipeline rejects HTTP URL even after `baseUrl` combinator     | Integration | `gxp-security-pipeline.test.ts`   |
| SEC-050 | Security combinator chain entries are visible in `inspector.getCombinatorChain()` | Integration | `gxp-security-pipeline.test.ts`   |

**Target: >= 90% mutation score.**

---

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
| E2E-009 | Cross-correlation: authorization decision → HTTP operation → audit entry forward/reverse trace | `e2e-cross-correlation.test.ts`    |
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
| E2E-021 | Configuration change control: config mutation → audit entry with before/after → rollback → audit entry with rollback reason | `e2e-config-change-control.test.ts` |
| E2E-022 | Authentication strength enforcement: single-factor rejected when multi-factor required → MFA succeeds → session timeout → re-authentication required | `e2e-auth-strength.test.ts` |

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

### DoD 19c: GxP Compliance Requirements (Spec Sections §79–§109)

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

**Target: >= 90% mutation score.**

---

## DoD-to-OQ Test ID Cross-Reference

This section provides a traceable mapping between the Definition of Done (DoD) test IDs defined above and the corresponding Operational Qualification (OQ) test IDs in §99b ([20 - HTTP Transport Validation](./compliance/gxp.md)). This mapping enables auditors to trace from unit/integration test evidence to qualification protocol evidence.

> **Important:** OQ-HT IDs in this table reference the authoritative OQ checklist in §99b. Each OQ-HT-XX ID has a fixed definition in §99b; the mapping below identifies which OQ checks verify the same functional area as each DoD test group.

| DoD Test Group | DoD Test IDs | OQ Check IDs (§99b) | Qualification Coverage |
| -------------- | ------------ | -------------------- | ---------------------- |
| HTTPS Enforcement | TS-001–TS-005 | OQ-HT-01, OQ-HT-02, OQ-HT-03, OQ-HT-04 | HTTPS rejection, TLS version, certificate chain |
| Payload Integrity | TS-006–TS-010 | OQ-HT-05, OQ-HT-06 | SHA-256 digest computation, response verification |
| Credential Protection | TS-011–TS-015 | OQ-HT-07, OQ-HT-08, OQ-HT-86 | Header redaction, query param redaction, cookie redaction |
| Payload Validation | TS-020–TS-024 | OQ-HT-09 | Schema validation rejection |
| Token Lifecycle | TS-025–TS-030 | OQ-HT-10, OQ-HT-11, OQ-HT-84, OQ-HT-85 | Token expiry, circuit breaker, active revocation |
| Audit Bridge | AB-001–AB-010 | OQ-HT-12 | Audit entry completeness, failOnAuditError |
| Electronic Signature | E2E-014 | OQ-HT-13, OQ-HT-14, OQ-HT-15 | Signature capture, signer mismatch, 2FA |
| Authentication Policy | TS-025–TS-030, E2E-022 | OQ-HT-16, OQ-HT-17, OQ-HT-18 | Auth strength, session timeout, inactivity |
| RBAC / Separation of Duties | AB-015–AB-019 | OQ-HT-19 | Conflicting role enforcement |
| Certificate Pinning | E2E-010 | OQ-HT-20 | SPKI digest mismatch rejection |
| Audit Persistence | AI-001–AI-010 | OQ-HT-21, OQ-HT-91 | Confirm/unconfirmed lifecycle, append-only enforcement |
| Reason for Change | AB-007, AB-009 | OQ-HT-22, OQ-HT-23, OQ-HT-70–OQ-HT-73 | Reason field, blocking enforcement |
| Audit Retention | GX-030–GX-036 | OQ-HT-24, OQ-HT-25, OQ-HT-26, OQ-HT-27 | Retention period, archive verification |
| Audit Query | AB-005, AB-006 | OQ-HT-28, OQ-HT-29, OQ-HT-30, OQ-HT-93 | Query filters, export, meta-audit, meta-entry type |
| Certificate Revocation | CF-008 | OQ-HT-31, OQ-HT-32, OQ-HT-87, OQ-HT-88, OQ-HT-89, OQ-HT-90 | Hard-fail, revoked cert, OCSP staple, Must-Staple, CRL CDP, CT |
| Signature Verification | E2E-014 | OQ-HT-33, OQ-HT-34 | 3-property check, revoked signer |
| Backup/Restore | GX-024–GX-029 | OQ-HT-35, OQ-HT-36 | Backup integrity, hash chain continuity |
| Migration | IT-008 | OQ-HT-37 | Hash chain preservation |
| Adapter Switchover | TS-016–TS-019 | OQ-HT-38 | Switchover audit entry |
| Privilege Escalation | AB-020–AB-024 | OQ-HT-39, OQ-HT-40 | Block-and-reauth, audit-only |
| Biometric Auth | CF-007 | OQ-HT-41 | Biometric metadata, no raw data |
| Config Change Control | E2E-021 | OQ-HT-42 | Config mutation audit, before/after capture, rollback audit |
| Config Rollback | TS-016–TS-019 | OQ-HT-42 | Rollback audit entry |
| XML Validation | TS-020–TS-024 | OQ-HT-43, OQ-HT-44, OQ-HT-45 | XSD validation, XXE prevention, multipart |
| mTLS | TS-001–TS-005 | OQ-HT-46 | Category 1 client certificate |
| E-Sig Display | E2E-014 | OQ-HT-47 | Block layout, mandatory fields |
| Incident Classification | CF-001–CF-010 | OQ-HT-48 | Critical incident audit entry |
| HTTP/2 | TS-069–TS-070 | OQ-HT-49, OQ-HT-50 | Server push audit, HPACK credential protection |
| Schema Versioning | GX-007–GX-009 | OQ-HT-51, OQ-HT-52, OQ-HT-53 | Forward/backward migration, unknown version |
| WAL Recovery | E2E-011 | OQ-HT-54, OQ-HT-55, OQ-HT-92 | Crash recovery, scope prefix, GxP prefix REQUIRED |
| Clock Drift | CF-004, CF-005 | OQ-HT-56 | GxP mode clock enforcement |
| GxP Fail-Fast | GX-016–GX-019 | OQ-HT-57, OQ-HT-58, OQ-HT-59, OQ-HT-60, OQ-HT-61 | SHA-256 mandate, missing combinators, mode conflicts |
| Body Credential Redaction | TS-011–TS-015 | OQ-HT-62 | 8 default body patterns |
| WAL Construction Validation | GX-016–GX-019 | OQ-HT-63 | GxP WAL requirement |
| CORS Hardening | TS-069–TS-070 | OQ-HT-64 | Browser GxP CORS enforcement |
| Certificate Pin Required | E2E-010 | OQ-HT-65 | Category 1 pin requirement |
| Logical Operation ID | AB-028–AB-032 | OQ-HT-66 | Retry correlation in GxP mode |
| Cross-Chain Verification | GX-001–GX-003 | OQ-HT-67 | FNV-1a / SHA-256 cross-check |
| Port Adapter Validation | GX-016–GX-019 | OQ-HT-68 | GxP port adapter presence |
| Biometric False Positive | CF-007 | OQ-HT-69 | Below-threshold confidence |
| Guard Required | AB-015–AB-019 | OQ-HT-74, OQ-HT-75 | Missing withHttpGuard, default-deny |
| Archival Port | GX-030–GX-036 | OQ-HT-76, OQ-HT-77, OQ-HT-78, OQ-HT-79, OQ-HT-80, OQ-HT-81 | Archival lifecycle, purge, verify |
| E-Sig Timeout | E2E-014 | OQ-HT-82, OQ-HT-83 | Capture timeout, default 120s |
| Token Revocation | TS-025–TS-030 | OQ-HT-84, OQ-HT-85 | Active revocation check via RFC 7662, cache behavior |
| Cookie Redaction | TS-011–TS-015 | OQ-HT-86 | Granular per-cookie redaction via redactCookieNames |
| Cert Revocation Fields | CF-008 | OQ-HT-87, OQ-HT-88, OQ-HT-89, OQ-HT-90 | OCSP staple timeout, Must-Staple, CRL CDP override, CT cross-ref |
| Audit Append-Only | AI-001–AI-010 | OQ-HT-91 | Adversarial update/delete prohibition on recorded entries |
| WAL Scope Prefix | E2E-011 | OQ-HT-92 | GxP REQUIRED "http:" prefix for WAL entry partitioning |
| Meta-Audit Entry | AB-005, AB-006 | OQ-HT-93 | HttpAuditMetaEntry field completeness, operationType validation |
| Adversarial Tests | E2E-013, E2E-008 | OQ-HT-ADV-01–OQ-HT-ADV-05 | URL manipulation, header injection, Unicode, oversized body, response splitting |
| Chaos Testing | CF-001–CF-010 | OQ-HT-CF-01–OQ-HT-CF-10 | Audit backend failure, network partition, clock drift, KMS outage, concurrent disposal, memory pressure |
| Load Testing | LT-001–LT-005 | OQ-HT-LT-01–OQ-HT-LT-05 | Throughput baseline, audit under load, hash chain at volume, concurrent scopes, retry storm |
| Soak Testing | SK-001–SK-003 | OQ-HT-SK-01–OQ-HT-SK-03 | Memory stability, audit trail rotation, connection pool stability |

> **Note:** OQ check IDs reference the authoritative qualification protocol in §99b of [20 - HTTP Transport Validation](./compliance/gxp.md). Deployment-specific adjustments to test execution order are governed by the Validation Plan (§25) approval process but MUST NOT change the functional scope of each OQ check.

## Mutation Testing

**Deliverable:** `libs/http-client/core/stryker.config.json` — Stryker configuration using `@stryker-mutator/vitest-runner`. Excludes `tests/unit/gxp-*.test.ts` from mutation (GxP tests are verification tests, not mutation targets). Run via `pnpm --filter @hex-di/http-client test:mutation`.

All HTTP client core modules must achieve **mutation score >= 90%** using Stryker. The aggregate mutation score across all listed modules MUST be **>= 88%**.

**Aggregate Target:** >= 88% overall mutation score across all modules listed below. This aggregate target accounts for the 13 GxP modules (prefixed `gxp/`) that were added after the initial core module list. The aggregate is calculated as the weighted average of individual module scores, where the weight is the number of mutants per module. If additional GxP modules are introduced, the aggregate target MUST be recalculated and documented in the Validation Plan (§83a) via Change Request (§116).

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
| `adapters/create-adapter.ts`            | >= 85%       | High     |
| `ports/http-client-port.ts`             | >= 85%       | Medium   |
| `introspection/inspector.ts`            | >= 85%       | Medium   |
| `introspection/registry.ts`             | >= 85%       | Medium   |
| `introspection/audit-integrity.ts`      | >= 90%       | High     |
| `introspection/audit-warning.ts`        | >= 85%       | Medium   |
| `introspection/sink-retry-queue.ts`     | >= 90%       | High     |
| `introspection/body-snapshot.ts`        | >= 85%       | Medium   |
| `introspection/persistence-eviction.ts` | >= 90%       | High     |
| `gxp/require-https.ts`                  | >= 90%       | Critical |
| `gxp/payload-integrity.ts`              | >= 90%       | Critical |
| `gxp/credential-protection.ts`          | >= 90%       | Critical |
| `gxp/audit-bridge.ts`                   | >= 90%       | Critical |
| `gxp/subject-attribution.ts`            | >= 90%       | Critical |
| `gxp/http-guard.ts`                     | >= 90%       | Critical |
| `gxp/electronic-signature.ts`           | >= 90%       | Critical |
| `gxp/token-lifecycle.ts`                | >= 85%       | High     |
| `gxp/authentication-policy.ts`          | >= 85%       | High     |
| `gxp/certificate-revocation.ts`         | >= 85%       | High     |
| `gxp/archival-port.ts`                  | >= 85%       | High     |
| `gxp/queryable-audit-trail.ts`          | >= 85%       | High     |

## Verification Checklist

- [ ] All spec files exist under `spec/libs/http-client/` (README.md + 00-urs.md + 01–15 + 17-definition-of-done.md + compliance/ subdirectory with gxp.md, README.md, 01-audit-trail.md through 10-reference-materials.md)
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
- [ ] Core package contains no transport adapter (transport-agnostic)
- [ ] Transport adapters in separate packages (fetch, axios, got, ky, ofetch, node, undici, bun)
- [ ] Scoped client pattern documented with correlation propagation
- [ ] No `any` types in public API signatures
- [ ] No type casts (`as X`) in specification examples
- [ ] Bundle size target: core < 8KB gzipped
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
- [ ] Cross-reference table maps HTTP client features to GxP compliance sections (§17-§25)
- [ ] `CrossChainVerificationResult` interface specified with all required fields
- [ ] Audit entry schema versioning strategy documented with migration rules
- [ ] Error code namespace cross-reference table includes HTTP0xx, ACL0xx, and GxP transport codes
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
- [ ] Comparison table has "Crash recovery" row distinguishing retry queue from HttpWalStorePort WAL
- [ ] Data-at-rest encryption specified with `HttpAuditEncryptionPort` and `HttpAuditEncryptionPolicy` (§104c)
- [ ] Canonical serialization for hash chain uses deterministic field ordering and number formatting (§55a, RFC 8785)
- [ ] SSRF mitigation combinator `withSsrfProtection()` blocks private IPs and metadata endpoints (§90a)
- [ ] Certificate Transparency verification with SCT validation (§90b)
- [ ] HSTS enforcement combinator `withHstsEnforcement()` with preload cache (§90c)
- [ ] CSRF protection combinator `withCsrfProtection()` for browser contexts (§90d)
- [ ] External correlation ID field in `HttpOperationAuditEntry` for cross-system traceability (§92)
- [ ] Degraded mode operation guidance with formal entry/exit criteria (§115.6)
- [ ] E2E test count increased from 5 to 22 covering GxP pipeline scenarios (E2E-001 through E2E-022)
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

**Section:** [18a](./compliance/gxp.md)/[18b](./compliance/gxp.md)/[18c](./compliance/gxp.md) - HTTP Transport Security (§84-§90d)
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

**Section:** [19 - HTTP Audit Bridge](./compliance/gxp.md) (§91-§97)
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
| AB-028  | Cross-correlation links authorization evaluation to HTTP operation                | Unit        | `cross-correlation.test.ts`        |
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

**Section:** [20 - HTTP Transport Validation](./compliance/gxp.md) (§98-§103)
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

## DoD 23: GxP Compliance Guide and Validation Framework

**Section:** [17 - GxP Compliance Guide](./compliance/gxp.md) (§79-§83c)
**Coverage:** Electronic signatures (§93a), Validation Plan (§83a), periodic review (§83b), incident classification (§83c). Test evidence from ESB, VP, PR test prefixes.

> **Note:** Tests for this DoD section are enumerated in the OQ checklist (§99b). Findings #21, #22, #28 in the [traceability matrix](./compliance/gxp.md) reference DoD 23 as the verification domain. Test IDs ESB-001 through ESB-015, VP-001 through VP-005, and PR-001 through PR-008 provide the evidence base.

## DoD 24: GxP Compliance Extensions

**Section:** [21 - GxP Compliance Extensions](./compliance/gxp.md) (§104-§107)
**Coverage:** Audit retention (§104), queryable audit trail (§105), certificate revocation (§106), signature verification (§107). Test evidence from RET, QRY, REV, SIG test prefixes.

> **Note:** Tests for this DoD section are enumerated in the OQ checklist (§99b). Findings #29-#32 in the [traceability matrix](./compliance/gxp.md) reference DoD 24. Test IDs RET-001 through RET-010, QRY-001 through QRY-012, REV-001 through REV-010, and SIG-001 through SIG-014 provide the evidence base. Data-at-rest encryption tests are an extension of this DoD section.

## DoD 25: GxP Compliance Audit v4.0 Remediations

**Section:** [18a](./compliance/gxp.md)/[18b](./compliance/gxp.md)/[18c](./compliance/gxp.md)/[19](./compliance/gxp.md)/[20](./compliance/gxp.md) (§84-§103, extensions from findings #33-#52)
**Coverage:** Backup/restore (§104a), cross-system migration (§104b), adapter switchover (§80a), e-signature display (§93b), biometric support (§90), privilege escalation (§90), mTLS enforcement, XML validation, HTTP/2 security, incident classification, CORS hardening. Test evidence from BKP, MIG, ASW, SDF, BIO, PED, MTLS, XPV, MPV, H2S, DNS, RBK, ICF, COR, XCV, RID, GDR test prefixes.

> **Note:** Tests for this DoD section are enumerated in the OQ checklist (§99b). Findings #33-#52 in the [traceability matrix](./compliance/gxp.md) reference DoD 25.

## DoD 26: GxP Compliance Audit v5.0 Remediations

**Section:** [22 - GxP Compliance Audit v5.0 Remediations](./compliance/gxp.md) (§108-§118)
**Coverage:** GAMP 5 classification (§108), training requirements (§109), IAM integration (§110), transport vs. business validation (§111), CORS hardening (§112), rate limiting (§113), e-signature UI workflow (§114), catastrophic failure recovery (§115), change control (§116), SemVer-to-revalidation (§117), port dependency inventory (§118). Test evidence from F-GAMP, F-CFR, F-AX11, F-SEC, F-ERR, F-CC, F-INT finding prefixes.

> **Note:** Tests for this DoD section are enumerated in the DoD 26 section of [22 - GxP Compliance Audit v5.0 Remediations](./compliance/gxp.md). Total: 48 tests (28 unit + 8 type + 12 integration). OQ coverage for DoD 26 is procedural (IQ verification of classification, training records, IAM documentation, port contracts) rather than functional; see the Finding-to-DoD table in §22 for traceability.

## DoD 27: GxP Compliance Hardening v6.0

**Section:** [17 - GxP Compliance Guide](./compliance/gxp.md) / [22 - GxP Compliance Audit v5.0](./compliance/gxp.md) (§92, §94, §97, §104, §81a, §81b, §93a, README)
**Coverage:** Reason-for-change enforcement (§92/§97), withHttpGuard REQUIRED (§81a/§81b/§94), HttpAuditArchivalPort formalization (§104), e-signature capture timeout (§93a), formal document control (README). Test evidence from RFR, DDG, ARC, SCT test prefixes.

> **Note:** Tests for this DoD section are enumerated in the OQ checklist (§99b). Findings #53-#57 in the [traceability matrix](./compliance/gxp.md) reference DoD 27. Test IDs RFR-001 through RFR-006, DDG-001 through DDG-004, ARC-001 through ARC-010, and SCT-001 through SCT-004 provide the evidence base.

---

_Previous: [15 - Appendices](./15-appendices.md)_

_Next: [17 - GxP Compliance](./compliance/gxp.md)_
