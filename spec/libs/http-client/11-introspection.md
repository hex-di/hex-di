# 11 - Introspection

HTTP client introspection provides runtime visibility into outgoing HTTP requests -- active requests, request history, latency statistics, error rates, and live events. It follows the same patterns used throughout HexDI:

- `InspectorAPI` pattern: pull-based queries + push-based subscriptions
- `ContainerSnapshot` pattern: frozen data with discriminated unions
- `InspectorEvent` pattern: discriminated union events with monotonic sequence numbers

## §54. HttpClientInspector

Read-only query API for HTTP client state. Combines pull-based queries with push-based subscriptions.

### Interface

```typescript
interface HttpClientInspector {
  /** Snapshot of all HTTP client state at this instant. */
  getSnapshot(): HttpClientSnapshot;

  /** Get active (in-flight) requests. */
  getActiveRequests(): readonly ActiveRequest[];

  /** Get request history with optional filtering. */
  getHistory(filter?: HttpHistoryFilter): readonly HttpHistoryEntry[];

  /** Get aggregate statistics. */
  getStats(): HttpClientStats;

  /** Get statistics for a specific URL pattern. */
  getStatsByUrl(pattern: string): HttpClientUrlStats | undefined;

  /** Subscribe to inspector events. */
  subscribe(listener: HttpClientInspectorListener): () => void;

  /** Derive health status from error rate, circuit breaker state, and latency. */
  getHealth(): HttpClientHealth;

  /** Get the combinator chain applied to the registered client. */
  getCombinatorChain(): readonly CombinatorInfo[];
}

type HttpClientInspectorListener = (event: HttpClientInspectorEvent) => void;
```

### HttpClientHealth

Health is derived -- not probed externally. The inspector computes it from existing statistics and combinator state.

```typescript
interface HttpClientHealth {
  readonly status: "healthy" | "degraded" | "unhealthy";
  readonly reasons: readonly string[];
  readonly timestamp: number;
}
```

**Health derivation rules (normative):**

- **unhealthy** if ANY of:
  - Any circuit breaker is `"open"`
  - Error rate > 50%
  - P99 latency > 10x average latency
- **degraded** if ANY of:
  - Any circuit breaker is `"half-open"`
  - Error rate > 10%
  - P95 latency > 5x average latency
  - Any rate limiter queue > 50% capacity
- **healthy** otherwise

Each trigger adds a human-readable string to `reasons` (e.g., `"Circuit breaker 'payments-api' is open"`, `"Error rate 52% exceeds 50% threshold"`).

### CombinatorInfo

```typescript
interface CombinatorInfo {
  readonly name: string; // e.g., "baseUrl", "retry", "circuitBreaker"
  readonly config: string; // Human-readable config summary
}
```

Combinator chain is tracked via a well-known symbol property on wrapped clients. Each combinator appends its entry when wrapping. The inspector reads this metadata -- the `HttpClient` interface itself is NOT modified.

### ActiveRequest

```typescript
interface ActiveRequest {
  /** Unique request identifier */
  readonly requestId: string;

  /** HTTP method */
  readonly method: HttpMethod;

  /** Request URL */
  readonly url: string;

  /** When the request started (Date.now()) */
  readonly startedAt: number;

  /** Monotonic timestamp (via monotonicNow()), immune to NTP jumps */
  readonly startedAtMono: number;

  /** Monotonic sequence number */
  readonly sequenceNumber: number;

  /** Elapsed time in ms (computed from monotonic clock) */
  readonly elapsedMs: number;

  /** Current retry attempt (0 = first attempt) */
  readonly retryAttempt: number;

  /** Scope ID if request was made from a scoped client */
  readonly scopeId?: string;
}
```

### HttpHistoryFilter

```typescript
interface HttpHistoryFilter {
  /** Filter by HTTP method */
  readonly method?: HttpMethod;

  /** Filter by URL pattern (substring match) */
  readonly url?: string;

  /** Filter by status code range */
  readonly statusMin?: number;
  readonly statusMax?: number;

  /** Filter by error type */
  readonly errorTag?: HttpClientError["_tag"];

  /** Filter by time range */
  readonly since?: number;
  readonly until?: number;

  /** Maximum entries to return. Default: 100. */
  readonly limit?: number;
}
```

### BodySnapshot

Structured metadata for request/response bodies, used for GxP audit completeness.

```typescript
interface BodySnapshot {
  /** MIME content type (e.g., "application/json") */
  readonly contentType: string;

  /** Body size in bytes */
  readonly sizeBytes: number;

  /** Truncated body preview, or undefined if body is empty or binary */
  readonly preview: string | undefined;

  /** Whether the preview was truncated to fit maxPreviewBytes */
  readonly truncated: boolean;

  /**
   * SHA-256 hex digest of the full body when gxp: true.
   * Empty string when gxp: false or body is empty.
   */
  readonly digest: string;
}
```

### Risk-Based Body Snapshot Guidance

When deploying in GxP environments, organizations SHOULD configure `captureBodySnapshot` based on the GxP endpoint classification (§84 of 18a-https-tls-enforcement.md):

| Endpoint Category | `captureBodySnapshot` Setting | Rationale |
| ----------------- | ----------------------------- | --------- |
| **Category 1** (Critical — batch records, clinical data) | `"request-and-response"` | Both request and response payloads carry regulated data requiring full audit trail per 21 CFR 11.10(e). The SHA-256 digest provides non-repudiation evidence for data submitted and received. |
| **Category 2** (High — lab results, quality events) | `"request-only"` | Request payloads create or modify regulated records; response bodies are typically acknowledgments. Request-only snapshots reduce storage while maintaining write audit completeness. |
| **Category 3** (Moderate — reference data, configuration) | `"off"` or `"request-only"` | Reference data reads (GET) rarely require body snapshots. State-changing operations (POST/PUT) SHOULD capture request body for change traceability per ALCOA+ Complete. |

```
RECOMMENDED: Organizations SHOULD document their body snapshot configuration rationale
             per endpoint category in the site-specific Validation Plan (§83a, Section 7).
             The storage impact of body snapshots SHOULD be estimated during PQ planning:
             - "request-only" with default maxPreviewBytes (1024): ~1.5 KB per audited operation
             - "request-and-response" with default maxPreviewBytes (1024): ~3 KB per audited operation
             - SHA-256 digest adds 64 bytes per snapshot (hex-encoded, 32-byte hash)
             Organizations exceeding 100,000 audited HTTP operations per day SHOULD provision
             audit storage accordingly and monitor via HttpClientSnapshot.failedWriteCount.
             Reference: ALCOA+ Complete, ALCOA+ Enduring.
```

### HttpHistoryEntry

```typescript
interface HttpHistoryEntry {
  /** Unique request identifier */
  readonly requestId: string;

  /** HTTP method */
  readonly method: HttpMethod;

  /** Request URL */
  readonly url: string;

  /** Response status code (undefined if request failed before response) */
  readonly status: number | undefined;

  /** Duration in milliseconds (computed from completedAtMono - startedAtMono) */
  readonly durationMs: number;

  /** When the request started */
  readonly startedAt: number;

  /** Monotonic timestamp at request start (via monotonicNow()) */
  readonly startedAtMono: number;

  /** When the request completed */
  readonly completedAt: number;

  /** Monotonic timestamp at request completion (via monotonicNow()) */
  readonly completedAtMono: number;

  /** Monotonic sequence number */
  readonly sequenceNumber: number;

  /** Error if the request failed */
  readonly error:
    | {
        readonly tag: HttpClientError["_tag"];
        readonly reason: string;
        readonly message: string;
      }
    | undefined;

  /** Number of retries attempted */
  readonly retryCount: number;

  /** Request body size in bytes (undefined if no body) */
  readonly requestBodySize: number | undefined;

  /** Response body size in bytes (undefined if no response) */
  readonly responseBodySize: number | undefined;

  /** Structured request body snapshot for audit completeness (undefined when captureBodySnapshot is "off" or method has no body) */
  readonly requestBodySnapshot: BodySnapshot | undefined;

  /** Structured response body snapshot for audit completeness (undefined when captureBodySnapshot is not "request-and-response" or no response) */
  readonly responseBodySnapshot: BodySnapshot | undefined;

  /** Scope ID if request was made from a scoped client */
  readonly scopeId?: string;

  /**
   * Sink persistence status for this entry.
   * - "pending": write() not yet called or in retry queue
   * - "success": write() returned Ok
   * - "failed": write() returned Err, queued for retry
   * - "exhausted": all retry attempts failed
   * - "lost": evicted before successful persistence (GxP critical event)
   * - undefined: no auditSink configured
   */
  readonly __sinkStatus: "pending" | "success" | "failed" | "exhausted" | "lost" | undefined;

  /** Integrity hash chain for audit trail tamper detection */
  readonly __integrity: {
    /** FNV-1a hash of this entry's auditable fields */
    readonly hash: string;
    /** Hash of the previous entry in the chain (empty string for first entry) */
    readonly previousHash: string;
  };
}
```

### HttpClientStats

```typescript
interface HttpClientStats {
  /** Total requests made since container start */
  readonly totalRequests: number;

  /** Currently in-flight requests */
  readonly activeRequests: number;

  /** Total successful requests (2xx after filters) */
  readonly successCount: number;

  /** Total failed requests */
  readonly errorCount: number;

  /** Error rate (errorCount / totalRequests) */
  readonly errorRate: number;

  /** Average response time in ms */
  readonly averageLatencyMs: number;

  /** P50 response time in ms */
  readonly p50LatencyMs: number;

  /** P95 response time in ms */
  readonly p95LatencyMs: number;

  /** P99 response time in ms */
  readonly p99LatencyMs: number;

  /** Total retries across all requests */
  readonly totalRetries: number;

  /** Requests by HTTP method */
  readonly byMethod: Readonly<Record<HttpMethod, number>>;

  /** Requests by status code */
  readonly byStatus: Readonly<Record<number, number>>;

  /** Requests by error tag */
  readonly byErrorTag: Readonly<Record<string, number>>;
}
```

### HttpClientUrlStats

```typescript
interface HttpClientUrlStats {
  readonly urlPattern: string;
  readonly totalRequests: number;
  readonly errorRate: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
}
```

### Registry & Inspector Adapters

```typescript
function createHttpClientRegistryAdapter(): Adapter<
  typeof HttpClientRegistryPort,
  [],
  "singleton",
  "sync"
>;

function createHttpClientInspectorAdapter(
  config?: HttpClientInspectorConfig
): Adapter<typeof HttpClientInspectorPort, [typeof HttpClientRegistryPort], "singleton", "sync">;

interface HttpClientInspectorConfig {
  /** Maximum history entries to retain. Default: 500. */
  readonly maxHistoryEntries?: number;

  /**
   * History recording mode:
   * - "full": Record all requests with full metadata (development default)
   * - "lightweight": Record request metadata without headers/body sizes
   * - "off": Disable history recording (production)
   */
  readonly mode?: "full" | "lightweight" | "off";

  /** When true, prevents runtime changes to inspector configuration. Default: false. */
  readonly locked?: boolean;

  /** Latency percentile calculation window size. Default: 1000. */
  readonly percentileWindowSize?: number;

  /**
   * Enable GxP compliance mode. When true, the inspector validates at construction
   * time that an HttpAuditTrailPort adapter (§91) is registered in the
   * container, rejects mode: "off", and requires an auditSink. Default: false.
   */
  readonly gxp?: boolean;

  /** Optional audit sink for GxP-compliant history externalization */
  readonly auditSink?: HttpAuditSink;

  /**
   * Body snapshot capture mode:
   * - "off": No body snapshots (default)
   * - "request-only": Capture request body snapshots for POST/PUT/PATCH/DELETE
   * - "request-and-response": Capture both request and response body snapshots
   */
  readonly captureBodySnapshot?: "off" | "request-only" | "request-and-response";

  /**
   * Maximum bytes to include in BodySnapshot.preview. Default: 1024. Max: 8192.
   * Previews exceeding this limit are truncated with truncated: true.
   */
  readonly maxPreviewBytes?: number;

  /** Configuration for the sink write retry queue. When gxp is true, defaults are applied if omitted. */
  readonly retryQueue?: SinkRetryQueueConfig;
}
```

## §55. HttpClientSnapshot

A serializable snapshot of all HTTP client state at a point in time.

```typescript
interface HttpClientSnapshot {
  readonly timestamp: number;
  readonly sequenceNumber: number;
  readonly stats: HttpClientStats;
  readonly activeRequests: readonly ActiveRequest[];
  readonly recentHistory: readonly HttpHistoryEntry[];
  readonly health: HttpClientHealth;
  readonly circuitBreakers: Readonly<Record<string, CircuitBreakerSnapshot>>;
  readonly rateLimiters: Readonly<Record<string, RateLimiterSnapshot>>;
  readonly caches: Readonly<Record<string, CacheSnapshot>>;
  readonly combinatorChain: readonly CombinatorInfo[];

  /** Whether the history hash chain is intact (no tampering detected) */
  readonly chainIntact: boolean;

  /** Number of entries where auditSink.write() returned Err (includes entries in retry queue) */
  readonly failedWriteCount: number;

  /** Number of entries currently queued for sink write retry */
  readonly retryQueueSize: number;
}
```

The snapshot types `CircuitBreakerSnapshot`, `RateLimiterSnapshot`, and `CacheSnapshot` are defined in [13 - Advanced Patterns](./13-advanced.md) alongside their respective combinators.

All returned data is frozen with `Object.freeze()`. Snapshots are safe to serialize for devtools or logging.

### Usage

```typescript
const snapshot = inspector.getSnapshot();

console.log("Active requests:", snapshot.activeRequests.length);
console.log("Total requests:", snapshot.stats.totalRequests);
console.log("Error rate:", (snapshot.stats.errorRate * 100).toFixed(1) + "%");
console.log("P95 latency:", snapshot.stats.p95LatencyMs + "ms");
```

## §55a. Audit Integrity

History entries form a **hash chain** for tamper detection. Each entry's `__integrity.hash` is computed over its auditable fields plus the previous entry's hash. This follows the FNV-1a hash chain pattern established in `packages/logger/src/utils/integrity.ts`.

### computeHttpEntryHash

```typescript
/**
 * Compute the FNV-1a hash for a history entry.
 *
 * ## Canonical Serialization (RFC 8785 Alignment)
 *
 * The hash input is constructed using deterministic field serialization to ensure
 * that identical entries always produce identical hashes regardless of platform,
 * locale, or runtime environment:
 *
 * 1. **Field order**: Fixed, lexicographic by field name:
 *    completedAtMono | durationMs | method | previousHash | requestBodySnapshotDigest | requestId | sequenceNumber | startedAtMono | status | url
 *
 * 2. **Number serialization**: IEEE 754 double-precision values are serialized
 *    using the ECMAScript Number-to-String algorithm (identical to JSON.stringify
 *    for numbers per RFC 8785 §3.2.2.3). No locale-specific formatting. Examples:
 *    - `0` → "0" (not "0.0" or "0.00")
 *    - `1.5` → "1.5" (not "1.50")
 *    - `100` → "100" (not "1e2")
 *    - `NaN` and `Infinity` MUST NOT appear in hash inputs (these indicate
 *      a timing or measurement error and MUST be rejected before hashing)
 *
 * 3. **String serialization**: UTF-8 encoded, no escaping, no normalization.
 *    Empty strings are included as zero-length values between delimiters.
 *
 * 4. **Delimiter**: Fields are joined with "|" (U+007C VERTICAL LINE).
 *    The delimiter MUST NOT appear within field values. URL fields that
 *    contain "|" MUST percent-encode it as "%7C" before hashing.
 *
 * 5. **Missing/undefined fields**: Serialized as the empty string "".
 *    requestBodySnapshotDigest is "" when requestBodySnapshot is undefined.
 *
 * This canonical serialization ensures cross-platform determinism for audit
 * integrity verification per ALCOA+ Consistent.
 * Reference: RFC 8785 (JSON Canonicalization Scheme), 21 CFR 11.10(e).
 */
function computeHttpEntryHash(
  entry: Omit<HttpHistoryEntry, "__integrity">,
  previousHash: string
): string;
```

### verifyHistoryChain

```typescript
/**
 * Verify that an entire history array has an intact hash chain.
 * Returns true if every entry's hash matches recomputation from its fields
 * and the previous entry's hash.
 */
function verifyHistoryChain(history: readonly HttpHistoryEntry[]): boolean;
```

### Chain Behavior Rules

1. **First entry**: `previousHash` is the empty string `""`.
2. **Subsequent entries**: `previousHash` equals the `hash` of the immediately preceding entry in insertion order.
3. **Hash algorithm**: FNV-1a (32-bit), producing an 8-character lowercase hex string.
4. **Immutability**: `__integrity` is assigned at entry creation and never mutated.
5. **Eviction interaction**:
   - **When `gxp` is `false` (default)**: When `maxHistoryEntries` is reached and the oldest entry is evicted, the chain is **not** recomputed. The surviving entries retain their original hashes. `verifyHistoryChain()` operates only on the entries currently in the buffer -- it treats the first surviving entry's `previousHash` as an opaque root. Entries are evicted regardless of `__sinkStatus`.
   - **When `gxp` is `true` (persistence-aware eviction)**: When `maxHistoryEntries` is reached, the inspector skips entries with `__sinkStatus` of `"pending"`, `"failed"`, or `"exhausted"` and evicts the oldest entry with `__sinkStatus` of `"success"` or `undefined`. If **all** entries are unpersisted, the inspector emits a `"sink-eviction-blocked"` event and allows the buffer to grow up to `maxHistoryEntries * 2` (emergency ceiling). At the emergency ceiling, the oldest entry with `__sinkStatus` `"failed"` or `"exhausted"` is forcibly evicted, its `__sinkStatus` is set to `"lost"`, and a `"sink-write-lost"` **critical** event is emitted.
6. **Snapshot inclusion**: `HttpClientSnapshot.chainIntact` is the result of calling `verifyHistoryChain(recentHistory)` at snapshot creation time.

```
REQUIREMENT: When captureBodySnapshot is "request-only" or "request-and-response",
             requestBodySnapshot MUST be populated for POST, PUT, PATCH, and DELETE
             requests. The digest field MUST contain a SHA-256 hex digest of the full
             body when gxp is true, and the empty string otherwise. The preview field
             MUST be subject to credential redaction when the
             withCredentialProtection() combinator (§87) is active. maxPreviewBytes MUST NOT
             exceed 8192; values above 8192 MUST be clamped to 8192.
             Reference: 21 CFR 11.10(e) (audit trail completeness), ALCOA+ Complete.
```

```
REQUIREMENT: When gxp is true, eviction MUST be persistence-aware. Entries with
             __sinkStatus "pending", "failed", or "exhausted" MUST NOT be evicted
             while any entry with __sinkStatus "success" or undefined exists in the
             buffer. When the buffer reaches the emergency ceiling (maxHistoryEntries
             * 2) and all entries are unpersisted, the oldest "failed" or "exhausted"
             entry MAY be forcibly evicted. Forcibly evicted entries MUST have their
             __sinkStatus set to "lost" and a "sink-write-lost" critical event MUST
             be emitted. This event indicates permanent audit data loss and SHOULD
             trigger alerting in GxP monitoring systems.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete, ALCOA+ Enduring.
```

### Usage

```typescript
const history = inspector.getHistory();
const intact = verifyHistoryChain(history);

if (!intact) {
  logger.error("HTTP audit trail has been tampered with");
}
```

### Audit Layer Classification

The HTTP client provides **two layers** of audit integrity, each suited to different deployment contexts:

| Layer                | Algorithm       | Purpose                                             | When to Use                                                             |
| -------------------- | --------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| **Basic (built-in)** | FNV-1a (32-bit) | Tamper detection for in-memory history              | Non-GxP environments, development, debugging                            |
| **Full GxP (HttpAuditTrailPort)** | SHA-256         | Cryptographic integrity for regulatory audit trails | GxP environments requiring 21 CFR Part 11 or EU GMP Annex 11 compliance |

The basic layer (`computeHttpEntryHash`, `verifyHistoryChain`) is always available in `@hex-di/http-client`. The full GxP layer requires an `HttpAuditTrailPort` adapter (§91-§97 of this spec), which provides SHA-256 hash chains, write guarantees, and regulatory-grade persistence. Ecosystem libraries such as `@hex-di/guard` can provide this adapter.

FNV-1a is sufficient for detecting accidental corruption or in-process tampering. It is **not** a cryptographic hash and does not protect against deliberate adversarial modification. FNV-1a 32-bit has approximately 1 in 2^32 (~4.3 billion) collision probability per entry pair, making accidental collisions extremely unlikely in typical request volumes. However, FNV-1a is trivially invertible and offers no resistance to deliberate forgery.

```
REQUIREMENT: FNV-1a hash chains MUST NOT be relied upon as the sole audit integrity
             mechanism in environments subject to 21 CFR Part 11 or EU GMP Annex 11.
             For regulatory-grade cryptographic audit integrity, register an
             HttpAuditTrailPort adapter (§91-§97 of this spec) that provides SHA-256 hash chains.
             Reference: 21 CFR 11.10(c), EU GMP Annex 11 §7.
```

```
REQUIREMENT: When the HTTP client inspector is configured with gxp: true in
             HttpClientInspectorConfig, the createHttpClientInspectorAdapter factory
             MUST verify at construction time that an HttpAuditTrailPort adapter (§91)
             is registered in the container. If HttpAuditTrailPort is
             not registered, the factory MUST throw a ConfigurationError with the
             message: "GxP mode requires an HttpAuditTrailPort adapter to be
             registered. FNV-1a hash chains alone do not satisfy 21 CFR Part 11
             or EU GMP Annex 11 audit trail requirements." This fail-fast behavior
             ensures that GxP misconfiguration is detected at startup, not deferred
             to the first HTTP request.
             Reference: 21 CFR 11.10(c), EU GMP Annex 11 §7.
```

## §55b. Audit Sink

An optional `HttpAuditSink` externalizes history entries for long-term audit storage. This follows the sink pattern used by `@hex-di/graph` for build-time audit events.

### HttpAuditSink Interface

```typescript
interface AuditSinkWriteError {
  readonly _tag: "AuditSinkWriteError";
  readonly message: string;
  readonly entry: HttpHistoryEntry;
}

interface AuditSinkFlushError {
  readonly _tag: "AuditSinkFlushError";
  readonly message: string;
  readonly unflushedCount: number;
}

interface HttpAuditSink {
  /**
   * Write a completed history entry to the audit store.
   * Called synchronously after each entry is appended to the in-memory history buffer.
   * The entry includes `__integrity` fields.
   *
   * Returns Ok(void) on success, Err(AuditSinkWriteError) on failure.
   * When the inspector is in mode "full" and write returns Err, the inspector
   * emits a "sink-write-failed" event and increments the failedWriteCount
   * on the snapshot. The entry remains in the in-memory buffer regardless
   * of sink write outcome.
   */
  write(entry: HttpHistoryEntry): Result<void, AuditSinkWriteError>;

  /**
   * Flush any buffered entries to the underlying store.
   * Called during container disposal.
   *
   * Returns Ok(void) on success, Err(AuditSinkFlushError) on failure.
   * When flush returns Err during disposal, the inspector logs the error
   * via console.error with the structured format:
   *   [HTTP_AUDIT_FLUSH_FAILED] <message> (unflushed=<count>)
   */
  flush(): Result<void, AuditSinkFlushError>;
}
```

```
REQUIREMENT: HttpAuditSink.write() MUST return a Result indicating success or failure.
             When write() returns Err and the inspector mode is "full", the inspector
             MUST emit an event of type "sink-write-failed" containing the requestId,
             the error message, and a monotonic timestamp. The inspector MUST NOT
             discard the in-memory entry on sink write failure -- the entry remains
             in the history buffer for retry or manual recovery.
             Reference: 21 CFR 11.10(e) (audit trail completeness), ALCOA+ Complete.
```

```
REQUIREMENT: HttpAuditSink.flush() MUST return a Result indicating success or failure.
             When flush() returns Err during container disposal, the inspector MUST
             log the failure via console.error and include the count of unflushed
             entries. The disposal process MUST NOT swallow flush errors silently.
             Reference: ALCOA+ Enduring (records must persist beyond session lifetime).
```

### Lifecycle

1. **Recording**: When `mode` is `"full"` or `"lightweight"`, each completed request triggers `auditSink.write(entry)` after the entry is appended to the in-memory buffer. The entry already has `__integrity` fields populated. If `write()` returns `Err`, a `"sink-write-failed"` event is emitted.
2. **Eviction**: When an entry is evicted from the in-memory buffer due to `maxHistoryEntries`, it is **not** re-sent to the sink. The sink received the entry at creation time.
3. **Disposal**: When the inspector adapter is disposed, `auditSink.flush()` is called once. If `flush()` returns `Err`, the error is logged via `console.error` with the count of unflushed entries.
4. **Mode `"off"` with `auditSink`**: Configuring `mode: "off"` while providing an `auditSink` is a **construction error**. The `createHttpClientInspectorAdapter` factory MUST throw a `ConfigurationError` with error code `"AUDIT_SINK_MODE_CONFLICT"` at construction time if both conditions are true. This prevents silent audit data loss in GxP environments where an audit sink is configured but recording is accidentally disabled.
5. **Mode `"off"` without `auditSink`**: When `mode` is `"off"` and no `auditSink` is configured, the `HTTP_WARN_001` warning (§55c) is emitted.
6. **GxP mode + `"off"`**: When `gxp` is `true` and `mode` is `"off"`, the factory MUST throw a `ConfigurationError` with error code `"GXP_AUDIT_DISABLED"` and the message: `"GxP mode requires audit recording. Set mode to 'full' or 'lightweight'."`. This is stricter than lifecycle rule 4 -- even without an `auditSink`, GxP mode rejects disabled recording.

```
REQUIREMENT: When mode is "off" and auditSink is provided, the
             createHttpClientInspectorAdapter factory MUST throw a ConfigurationError
             at construction time with the message: "Cannot configure auditSink with
             mode 'off'. Either set mode to 'full' or 'lightweight', or remove the
             auditSink configuration." This prevents silent loss of audit data in
             GxP environments where the sink is configured but recording is disabled.
             Reference: 21 CFR 11.10(e), ALCOA+ Complete.
```

```
REQUIREMENT: When gxp is true and no auditSink is provided, the
             createHttpClientInspectorAdapter factory MUST throw a ConfigurationError
             at construction time with the message: "GxP mode requires a durable
             HttpAuditSink." GxP environments MUST externalize audit entries to
             persistent storage; relying solely on the in-memory buffer is insufficient.
             Reference: 21 CFR 11.10(e), ALCOA+ Enduring.
```

### Sink Write Retry Queue

When `auditSink.write()` fails, entries can be retried automatically via an internal retry queue. This prevents transient sink failures from causing permanent audit data loss.

#### SinkRetryQueueConfig

```typescript
interface SinkRetryQueueConfig {
  /** Maximum entries in the retry queue. Default: 100. */
  readonly maxRetryQueueSize: number;

  /** Maximum retry attempts per entry before exhaustion. Default: 3. */
  readonly maxRetryAttempts: number;

  /** Delay in milliseconds between retry queue drain cycles. Default: 1000. */
  readonly retryDelayMs: number;
}
```

The `SinkRetryQueueConfig` is an optional field on `HttpClientInspectorConfig`:

```typescript
// Addition to HttpClientInspectorConfig:
readonly retryQueue?: SinkRetryQueueConfig;
```

#### Retry Queue Behavior

1. **On `write()` Err**: The failed entry is appended to the retry queue with `retryCount: 0`. The entry's `__sinkStatus` is set to `"failed"`.
2. **Queue drain**: The retry queue is drained periodically at `retryDelayMs` intervals. Each drain cycle retries the oldest entry in the queue by calling `auditSink.write()` again.
3. **Retry success**: When a retried `write()` returns `Ok`, the entry is removed from the queue and its `__sinkStatus` is updated to `"success"`.
4. **Retry exhaustion**: When an entry's `retryCount >= maxRetryAttempts`, the entry is removed from the retry queue. Its `__sinkStatus` is set to `"exhausted"`. A `"sink-write-exhausted"` event is emitted. The entry remains in the in-memory history buffer.
5. **Queue overflow**: When the retry queue reaches `maxRetryQueueSize`, the oldest entry in the queue is dropped to make room. A `"sink-queue-overflow"` event is emitted.
6. **GxP behavior**: When `gxp` is `true`, the retry queue is **always enabled** (defaults apply if `retryQueue` is not explicitly configured). When `gxp` is `false` or unset and `retryQueue` is not configured, the retry queue is **disabled** and the existing single-attempt behavior is preserved.

```
REQUIREMENT: When gxp is true, the inspector MUST retry failed auditSink.write()
             calls using the retry queue. Entries that exhaust all retry attempts
             MUST trigger a "sink-write-exhausted" event but MUST remain in the
             in-memory history buffer -- they are NOT silently dropped. Exhausted
             entries are available for manual recovery via getHistory().
             Reference: 21 CFR 11.10(e), ALCOA+ Complete, ALCOA+ Enduring.
```

### Port Definition

The audit sink port is defined in [10 - Integration](./10-integration.md):

```typescript
const HttpAuditSinkPort = port<HttpAuditSink>()({
  name: "HttpAuditSink",
});
```

### Usage

```typescript
const inspector = createHttpClientInspectorAdapter({
  mode: "full",
  maxHistoryEntries: 1000,
  auditSink: myDatabaseAuditSink,
});
```

### HttpAuditSink vs. HttpAuditTrailPort

The HTTP client defines `HttpAuditSink` (this section) and the GxP audit bridge defines `HttpAuditTrailPort` (§91-§92 of this spec). These serve different roles:

| Aspect               | `HttpAuditSink` (http-client)                                   | `HttpAuditTrailPort` (§91)                                 |
| -------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| **Purpose**          | Externalize history entries for long-term storage               | Full GxP-compliant audit trail with regulatory guarantees  |
| **API**              | `write(entry)` + `flush()`                                      | `record(entry)` + `verify()` + `query()`                   |
| **Hash algorithm**   | FNV-1a (32-bit, non-cryptographic)                              | SHA-256 (cryptographic)                                    |
| **Write guarantees** | Consumer-managed durability with `Result` error reporting       | Sequential, ordered, durable writes                        |
| **Chain scope**      | Single HTTP client instance                                     | Cross-library (HTTP + authorization + signatures)          |
| **Error handling**   | `Result`-based error reporting; consumer decides retry strategy | Built-in retry with dead-letter queue                      |
| **Crash recovery**   | Retry queue only (in-memory, lost on process crash)             | Write-ahead log (WAL) survives process crash (HttpWalStorePort §91) |
| **When to use**      | Non-GxP environments, lightweight audit, development            | GxP environments, regulatory compliance                    |

> **WAL limitation:** The `HttpAuditSink` retry queue is an in-memory mechanism. It recovers from transient sink failures (e.g., database connection blips) but does **not** survive process crashes. For full GxP crash recovery, register an `HttpWalStorePort` adapter (§91) that provides a write-ahead log (WAL) persisting audit entries to disk before acknowledging writes. The WAL guarantees that no audit entries are lost even if the process terminates unexpectedly. Ecosystem adapter libraries can provide `HttpWalStorePort` implementations.

### Bridging Pattern

When an `HttpAuditTrailPort` adapter is registered, use a bridging adapter that wraps `HttpAuditTrailPort` as an `HttpAuditSink`. This routes HTTP audit entries into the SHA-256 chain:

```typescript
function createGxPAuditSinkAdapter(auditTrail: HttpAuditTrailPort): HttpAuditSink {
  return {
    write(entry: HttpHistoryEntry): Result<void, AuditSinkWriteError> {
      // Bridge: convert HttpHistoryEntry to authorization audit entry format
      // and record via the HttpAuditTrailPort SHA-256 chain
      const result = auditTrail.record({
        type: "http-operation",
        requestId: entry.requestId,
        method: entry.method,
        url: entry.url,
        status: entry.status,
        durationMs: entry.durationMs,
        error: entry.error,
        scopeId: entry.scopeId,
        timestamp: new Date(entry.startedAt).toISOString(),
        requestDigest: entry.requestBodySnapshot?.digest ?? "",
      });
      if (result.isErr()) {
        return err({ _tag: "AuditSinkWriteError", message: result.error.message, entry });
      }
      return ok(undefined);
    },
    flush(): Result<void, AuditSinkFlushError> {
      const result = auditTrail.flush();
      if (result.isErr()) {
        return err({
          _tag: "AuditSinkFlushError",
          message: result.error.message,
          unflushedCount: 0,
        });
      }
      return ok(undefined);
    },
  };
}
```

### Non-GxP Usage

`HttpAuditSink` can also be used standalone without an `HttpAuditTrailPort` adapter for lightweight audit logging:

```typescript
// Simple database sink for non-GxP audit
const dbAuditSink: HttpAuditSink = {
  write(entry) {
    try {
      db.insert("http_audit_log", {
        request_id: entry.requestId,
        method: entry.method,
        url: entry.url,
        status: entry.status,
        duration_ms: entry.durationMs,
        hash: entry.__integrity.hash,
        recorded_at: new Date().toISOString(),
      });
      return ok(undefined);
    } catch (e) {
      return err({
        _tag: "AuditSinkWriteError",
        message: e instanceof Error ? e.message : "Unknown write error",
        entry,
      });
    }
  },
  flush() {
    return ok(undefined); // No-op for synchronous DB writes
  },
};
```

> **Cross-reference:** For full GxP audit trail capabilities, see §91-§92 of this spec (HTTP Audit Trail) and §82 (Cross-Chain Integrity Verification in this document's [17 - GxP Compliance Guide](./compliance/gxp.md)).

## §55c. Audit Recording Warning

When the inspector's `mode` is `"off"`, HTTP request history is not recorded. In GxP environments, disabling audit recording is a compliance risk. The HTTP client emits a structured warning following the pattern established in `packages/core/src/inspection/tracing-warning.ts`.

### Warning Code

| Code            | Message                                                                                                                       | Severity |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| `HTTP_WARN_001` | `"HTTP audit recording is disabled. In GxP environments, all outbound HTTP requests must be recorded for ALCOA+ compliance."` | `"warn"` |

### Behavior

1. **Emission**: The warning is emitted **once per container** when the inspector adapter is first resolved with `mode: "off"`.
2. **Mechanism**: Uses `console.warn()` with the structured format: `[HTTP_WARN_001] <message>`.
3. **Suppression**: The warning can be suppressed by calling `configureHttpAuditWarning({ suppress: true })` before the inspector is resolved.
4. **Reset**: `resetHttpAuditWarning()` clears the "already emitted" flag, allowing the warning to fire again on next resolution. Intended for testing.
5. **Monotonic timing**: The warning includes a monotonic timestamp via `monotonicNow()` for deterministic ordering in log aggregation.

### API

```typescript
const HTTP_AUDIT_DISABLED_CODE = "HTTP_WARN_001" as const;

function configureHttpAuditWarning(options: { readonly suppress?: boolean }): void;

function resetHttpAuditWarning(): void;
```

### Warning Output Format

```
[HTTP_WARN_001] HTTP audit recording is disabled. In GxP environments, all outbound HTTP requests must be recorded for ALCOA+ compliance. (mono=1234567890)
```

## §56. HttpClientInspectorEvent

Push-based events emitted by the inspector when request state changes.

```typescript
type HttpClientInspectorEvent =
  | {
      readonly type: "request-started";
      readonly requestId: string;
      readonly method: HttpMethod;
      readonly url: string;
      readonly timestamp: number;
      readonly sequenceNumber: number;
      readonly scopeId?: string;
    }
  | {
      readonly type: "request-completed";
      readonly requestId: string;
      readonly method: HttpMethod;
      readonly url: string;
      readonly status: number;
      readonly durationMs: number;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "request-failed";
      readonly requestId: string;
      readonly method: HttpMethod;
      readonly url: string;
      readonly errorTag: HttpClientError["_tag"];
      readonly errorReason: string;
      readonly durationMs: number;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "request-retried";
      readonly requestId: string;
      readonly method: HttpMethod;
      readonly url: string;
      readonly attempt: number;
      readonly errorTag: HttpClientError["_tag"];
      readonly errorReason: string;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "snapshot-changed";
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "reconfiguration-rejected";
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "sink-write-failed";
      readonly requestId: string;
      readonly errorMessage: string;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "sink-write-exhausted";
      readonly requestId: string;
      readonly retryAttempts: number;
      readonly errorMessage: string;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "sink-queue-overflow";
      readonly droppedRequestId: string;
      readonly queueSize: number;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "sink-eviction-blocked";
      readonly bufferSize: number;
      readonly unpersisted: number;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    }
  | {
      readonly type: "sink-write-lost";
      readonly requestId: string;
      readonly reason: string;
      readonly timestamp: number;
      readonly sequenceNumber: number;
    };
```

### Event Ordering

Events are emitted in the following order per request:

1. `request-started` -- when `execute` is called
2. `request-retried` -- on each retry attempt (0 or more)
3. `request-completed` or `request-failed` -- when the request finishes
4. `snapshot-changed` -- after any of the above (coalesced)

### Usage

```typescript
const unsubscribe = inspector.subscribe(event => {
  switch (event.type) {
    case "request-started":
      console.log(`→ ${event.method} ${event.url}`);
      break;
    case "request-completed":
      console.log(`← ${event.status} ${event.method} ${event.url} (${event.durationMs}ms)`);
      break;
    case "request-failed":
      console.warn(`✗ ${event.errorTag} ${event.method} ${event.url} (${event.durationMs}ms)`);
      break;
    case "request-retried":
      console.log(`↻ retry #${event.attempt} ${event.method} ${event.url}`);
      break;
  }
});
```

## §57. MCP Resource Readiness

The HTTP client introspection API maps directly to MCP resources:

| MCP Resource URI                  | Introspection API                  | Return Type                              |
| --------------------------------- | ---------------------------------- | ---------------------------------------- |
| `hexdi://http/snapshot`           | `inspector.getSnapshot()`          | `HttpClientSnapshot`                     |
| `hexdi://http/active`             | `inspector.getActiveRequests()`    | `readonly ActiveRequest[]`               |
| `hexdi://http/history`            | `inspector.getHistory(filter)`     | `readonly HttpHistoryEntry[]`            |
| `hexdi://http/stats`              | `inspector.getStats()`             | `HttpClientStats`                        |
| `hexdi://http/stats/{urlPattern}` | `inspector.getStatsByUrl(pattern)` | `HttpClientUrlStats \| undefined`        |
| `hexdi://http/health`             | `inspector.getHealth()`            | `HttpClientHealth`                       |
| `hexdi://http/combinators`        | `inspector.getCombinatorChain()`   | `readonly CombinatorInfo[]`              |
| `hexdi://http/circuit-breakers`   | `snapshot.circuitBreakers`         | `Record<string, CircuitBreakerSnapshot>` |
| `hexdi://http/audit/verify`       | `verifyHistoryChain()`             | `boolean`                                |

### AI Diagnostic Query Example

```
Agent: "Are there any slow HTTP endpoints causing performance issues?"

  → GET hexdi://http/stats
  ← { totalRequests: 1234, errorRate: 0.02, p95LatencyMs: 450, p99LatencyMs: 2100, ... }

  → GET hexdi://http/history?statusMin=500&limit=10
  ← [{ url: "/api/search", status: 503, durationMs: 5000, retryCount: 3, ... }]

Agent: "The /api/search endpoint has a P99 latency of 2100ms and is returning
        503 errors. It was retried 3 times before failing. Consider adding a
        circuit breaker or increasing the timeout for this endpoint."
```

### A2A Skill Definitions

The HTTP client exposes two skills for the Agent-to-Agent (A2A) protocol, enabling AI agents to diagnose HTTP-related issues autonomously.

#### `diagnose-http-issue`

```typescript
{
  id: "diagnose-http-issue",
  name: "Diagnose HTTP Issue",
  description: "Analyzes HTTP request history, error patterns, circuit breaker state, and latency trends to diagnose connectivity and performance issues with outbound HTTP endpoints.",
  examples: [
    "Why are requests to the payments API failing?",
    "What is causing high latency on outbound HTTP calls?",
    "Are there any circuit breakers tripped?",
  ],
  inputSchema: {
    type: "object",
    properties: {
      urlPattern: {
        type: "string",
        description: "Optional URL pattern to scope the diagnosis (substring match).",
      },
      timeRangeMs: {
        type: "number",
        description: "How far back to analyze in milliseconds. Default: 300000 (5 minutes).",
      },
    },
  },
}
```

#### `http-health-check`

```typescript
{
  id: "http-health-check",
  name: "HTTP Health Check",
  description: "Reports the current health status of all HTTP endpoints, including circuit breaker states, error rates, latency percentiles, and rate limiter utilization.",
  examples: [
    "What is the health of our HTTP clients?",
    "Are all external APIs healthy?",
    "Show me HTTP client health status.",
  ],
  inputSchema: {
    type: "object",
    properties: {
      includeHistory: {
        type: "boolean",
        description: "Whether to include recent request history in the report. Default: false.",
      },
    },
  },
}
```

### GxP Audit Data Export Format (EU GMP Annex 11 §8)

Per EU GMP Annex 11 §8, stored data MUST be available as printouts in a clear and unambiguous format. All MCP resources that expose audit-relevant data (history, audit/verify, snapshot, stats) MUST serialize their output as JSON conforming to RFC 8259. Consumers MAY convert this JSON to CSV or PDF for printed review.

When audit data is exported via MCP resources for regulatory review, the following ALCOA+ metadata MUST be preserved in every exported record:

| Field | ALCOA+ Principle | Description |
| ----- | ---------------- | ----------- |
| `timestamp` | Contemporaneous | ISO 8601 UTC timestamp of the operation |
| `subjectId` / `actorId` | Attributable | Identity of the user who performed the operation |
| `sequenceNumber` | Consistent | Monotonic sequence number for ordering |
| `__integrity.hash` | Original | FNV-1a tamper-detection hash |
| `__integrity.previousHash` | Consistent | Chain link to previous entry |

In production GxP environments, organizations MUST implement meta-audit logging for MCP resource access when MCP resources expose GxP audit data — recording who accessed which resource, when, and from which agent context. This maintains parity with §105 `QueryableHttpAuditTrailPort` meta-audit requirements and ensures all access paths to GxP audit data are audited per 21 CFR 11.10(e). For non-production or non-GxP MCP deployments, meta-audit logging is RECOMMENDED.

---

_Previous: [10 - Integration](./10-integration.md)_

_Next: [12 - Testing](./12-testing.md)_

> **Tests**: [Introspection Tests (INS-001–INS-030)](./17-definition-of-done.md#introspection-tests)
