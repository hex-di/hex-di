# 13 - Inspection & Reporting

_Previous: [12 - Tracing Integration](./12-tracing-integration.md)_

---

## 47. LoggerInspector Interface

The `LoggerInspector` provides runtime introspection into the logging subsystem. It follows the `LibraryInspector` pattern used across all HexDI libraries, enabling the unified knowledge model to aggregate logging statistics alongside tracing, saga, store, and flow data.

### Interface

```typescript
interface LoggerInspector {
  /** Library identifier for the unified knowledge model. */
  readonly libraryName: "logging";

  /** Get a point-in-time snapshot of logging state. */
  getSnapshot(): LoggingSnapshot;

  /** Get cumulative entry counts per level (O(1) -- maintained as running counters). */
  getEntryCounts(): Readonly<Record<LogLevel, number>>;

  /** Get the error rate (error + fatal entries / total) within a sliding time window. */
  getErrorRate(options?: TimeWindowOptions): number;

  /** Get metadata about the active handler chain. */
  getHandlerInfo(): readonly HandlerInfo[];

  /** Get sampling accept/drop statistics per level. */
  getSamplingStatistics(): SamplingStatistics;

  /** Get redaction statistics (field frequency, pattern matches). */
  getRedactionStatistics(): RedactionStatistics;

  /** Get recent log entries (delegates to MemoryLogger if present, empty array otherwise). */
  getRecentEntries(options?: RecentEntriesOptions): readonly LogEntry[];

  /** Get context variable usage statistics. */
  getContextUsage(): ContextUsageStatistics;

  /** Subscribe to inspector events. Returns an unsubscribe function. */
  subscribe(listener: LoggerInspectorListener): () => void;
}

type LoggerInspectorListener = (event: LoggerInspectorEvent) => void;
```

### LoggerInspectorPort

```typescript
const LoggerInspectorPort = definePort<LoggerInspector>({
  name: "LoggerInspector",
  direction: "outbound",
  category: "infrastructure",
  tags: ["logging", "observability", "inspection"],
});
```

### Factory

```typescript
/**
 * Create a LoggerInspector adapter.
 *
 * The inspector wraps an existing Logger instance and handler chain,
 * instrumenting them to collect statistics without modifying behavior.
 */
function createLoggerInspectorAdapter(options: {
  logger: Logger;
  handlers: readonly LogHandler[];
  samplingConfig?: SamplingConfig;
  redactionConfig?: RedactionConfig;
}): LoggerInspector;
```

### Container integration

The inspector registers with the container's inspector registry:

```typescript
const container = createContainer(graph);

// Inspector is lazily created on first access
const loggerInspector = container.inspector.getLoggerInspector();

if (loggerInspector) {
  const snapshot = loggerInspector.getSnapshot();
  console.log(`Total log entries: ${snapshot.totalEntries}`);
  console.log(`Error rate: ${(snapshot.errorRate * 100).toFixed(1)}%`);
}
```

The inspector is only created when first accessed -- there is no overhead in production scenarios where inspection is never used.

### Lazy creation

```typescript
// Internal implementation detail:
// The container registers a lazy factory that creates the inspector
// only when container.inspector.getLoggerInspector() is called.
//
// Before first access: zero overhead
// After first access: inspector instruments the handler chain
```

## 48. LoggingSnapshot & Events

### LoggingSnapshot

The `LoggingSnapshot` captures the complete state of the logging subsystem at a point in time. It is the logger's contribution to the unified knowledge model.

```typescript
interface LoggingSnapshot {
  /** Timestamp when this snapshot was created. */
  readonly timestamp: number;

  /** Total number of log entries produced since container creation. */
  readonly totalEntries: number;

  /** Entry counts broken down by level. */
  readonly entriesByLevel: Readonly<Record<LogLevel, number>>;

  /** Current error rate: (error + fatal) / total within the default window. */
  readonly errorRate: number;

  /** Active handler chain metadata. */
  readonly handlers: readonly HandlerInfo[];

  /** Whether sampling is currently active. */
  readonly samplingActive: boolean;

  /** Whether redaction is currently active. */
  readonly redactionActive: boolean;

  /** Maximum child logger nesting depth currently in use. */
  readonly contextDepth: number;
}
```

### UnifiedSnapshot integration

The `LoggingSnapshot` integrates into the container-wide `UnifiedSnapshot`:

```typescript
interface UnifiedSnapshot {
  readonly timestamp: number;
  // ... other library snapshots ...
  readonly logging: LoggingSnapshot | undefined;
}
```

When `@hex-di/logger` is not installed or the inspector has not been accessed, `logging` is `undefined`.

### LoggerInspectorEvent

Events are emitted by the inspector to subscribers. They form a discriminated union on the `type` field:

```typescript
type LoggerInspectorEvent =
  | {
      readonly type: "entry-logged";
      readonly level: LogLevel;
      readonly message: string;
      readonly timestamp: number;
    }
  | {
      readonly type: "error-rate-threshold";
      readonly errorRate: number;
      readonly threshold: number;
      readonly windowMs: number;
    }
  | { readonly type: "handler-error"; readonly handlerName: string; readonly error: Error }
  | { readonly type: "sampling-dropped"; readonly level: LogLevel; readonly dropCount: number }
  | { readonly type: "redaction-applied"; readonly fieldPath: string; readonly count: number }
  | { readonly type: "handler-added"; readonly handler: HandlerInfo }
  | { readonly type: "handler-removed"; readonly handlerName: string }
  | { readonly type: "snapshot-changed" };
```

### Subscription pattern

```typescript
const inspector = container.inspector.getLoggerInspector();

if (inspector) {
  const unsubscribe = inspector.subscribe(event => {
    switch (event.type) {
      case "entry-logged":
        metrics.increment("log.entries", { level: event.level });
        break;
      case "error-rate-threshold":
        alerting.fire("high-error-rate", {
          rate: event.errorRate,
          threshold: event.threshold,
        });
        break;
      case "handler-error":
        console.error(`Handler ${event.handlerName} failed:`, event.error);
        break;
    }
  });

  // Later: clean up
  unsubscribe();
}
```

### Event bus integration

Inspector events can be bridged to the container's event bus for cross-library observation:

```typescript
const inspector = container.inspector.getLoggerInspector();
const eventBus = container.resolve(EventBusPort);

if (inspector && eventBus) {
  inspector.subscribe(event => {
    eventBus.emit({ source: "logging", ...event });
  });
}
```

## 49. Statistics & Diagnostics

### getEntryCounts()

Returns cumulative entry counts per level. Maintained as O(1) running counters -- not computed from stored entries.

```typescript
const counts = inspector.getEntryCounts();
// { trace: 0, debug: 1500, info: 8000, warn: 200, error: 50, fatal: 2 }
```

### getErrorRate(options?)

Calculates the error rate `(error + fatal) / total` within a sliding time window. Uses a circular buffer for efficient windowed computation.

```typescript
interface TimeWindowOptions {
  /** Window size in milliseconds. Default: 60_000 (60 seconds). */
  readonly windowMs?: number;
}
```

```typescript
// Default: last 60 seconds
const rate = inspector.getErrorRate();
// 0.05 (5% of entries in last 60s were error or fatal)

// Custom window: last 5 minutes
const rate5m = inspector.getErrorRate({ windowMs: 300_000 });
```

When no entries have been logged, returns `0`.

### getHandlerInfo()

Returns metadata about each handler in the active chain:

```typescript
interface HandlerInfo {
  /** Handler type discriminant (e.g., "pino", "winston", "console", "memory"). */
  readonly type: string;

  /** Human-readable handler name. */
  readonly name: string;

  /** Whether the handler is currently active. */
  readonly active: boolean;

  /** Number of entries processed by this handler. */
  readonly entryCount: number;

  /** Formatter type used by this handler (if applicable). */
  readonly formatterType?: string;

  /** Minimum level accepted by this handler. */
  readonly minLevel?: LogLevel;
}
```

```typescript
const handlers = inspector.getHandlerInfo();
// [
//   { type: "pino", name: "PinoHandler", active: true, entryCount: 9752, minLevel: "info" },
//   { type: "memory", name: "MemoryHandler", active: true, entryCount: 9752, formatterType: "json" }
// ]
```

### getSamplingStatistics()

Returns per-level statistics about sampling decisions:

```typescript
interface SamplingStatistics {
  /** Whether sampling is currently active. */
  readonly active: boolean;

  /** Per-level breakdown of accepted vs dropped entries. */
  readonly byLevel: Readonly<
    Record<
      LogLevel,
      {
        readonly received: number;
        readonly accepted: number;
        readonly dropped: number;
      }
    >
  >;

  /** Overall acceptance rate (0-1). */
  readonly acceptanceRate: number;
}
```

When sampling is not configured, `active` is `false` and all counters are zero.

### getRedactionStatistics()

Returns statistics about redaction operations:

```typescript
interface RedactionStatistics {
  /** Whether redaction is currently active. */
  readonly active: boolean;

  /** Total number of redaction operations performed. */
  readonly totalRedactions: number;

  /** Frequency of redacted field paths (e.g., { "password": 150, "creditCard": 30 }). */
  readonly fieldFrequency: Readonly<Record<string, number>>;

  /** Number of pattern-based matches (wildcard redaction). */
  readonly patternMatches: number;
}
```

### getRecentEntries(options?)

Delegates to the `MemoryLogger` adapter if present in the handler chain. Returns an empty array if no Memory adapter is active (e.g., in production with only Pino).

```typescript
interface RecentEntriesOptions {
  /** Maximum number of entries to return. Default: 100. */
  readonly limit?: number;

  /** Filter by level. */
  readonly level?: LogLevel;

  /** Filter by minimum timestamp. */
  readonly since?: number;
}
```

```typescript
const recent = inspector.getRecentEntries({ limit: 10, level: "error" });
// Returns last 10 error entries from MemoryLogger, or [] if no Memory adapter
```

### getContextUsage()

Returns statistics about context variable usage across active loggers:

```typescript
interface ContextUsageStatistics {
  /** Number of context variables currently set (non-default). */
  readonly activeVariables: number;

  /** Frequency of context field keys across log entries. */
  readonly fieldFrequency: Readonly<Record<string, number>>;

  /** Maximum child logger nesting depth observed. */
  readonly maxChildDepth: number;
}
```

## 50. MCP Resource Readiness

The inspector exposes logging data as MCP (Model Context Protocol) resources, enabling AI tools to query logging state for diagnostics and troubleshooting.

### Resource URIs

| URI                          | Description                      | Content Type       |
| ---------------------------- | -------------------------------- | ------------------ |
| `hexdi://logging/snapshot`   | Current `LoggingSnapshot`        | `application/json` |
| `hexdi://logging/entries`    | Recent log entries (from Memory) | `application/json` |
| `hexdi://logging/handlers`   | Handler chain information        | `application/json` |
| `hexdi://logging/error-rate` | Current error rate with window   | `application/json` |
| `hexdi://logging/sampling`   | Sampling statistics              | `application/json` |

### MCP Tool

| URI                         | Description              | Input                 |
| --------------------------- | ------------------------ | --------------------- |
| `hexdi://logging/set-level` | Change runtime log level | `{ level: LogLevel }` |

### JSON contract example

```json
// GET hexdi://logging/snapshot
{
  "timestamp": 1707350400000,
  "totalEntries": 9752,
  "entriesByLevel": {
    "trace": 0,
    "debug": 1500,
    "info": 8000,
    "warn": 200,
    "error": 50,
    "fatal": 2
  },
  "errorRate": 0.0053,
  "handlers": [{ "type": "pino", "name": "PinoHandler", "active": true, "entryCount": 9752 }],
  "samplingActive": false,
  "redactionActive": true,
  "contextDepth": 3
}
```

### AI diagnostic query examples

An AI assistant can use these resources to diagnose issues:

```
User: "Why is the API slow?"

AI queries:
1. hexdi://logging/error-rate -> { "errorRate": 0.15, "windowMs": 60000 }
   "Error rate is 15% -- significantly elevated."

2. hexdi://logging/entries?level=error&limit=5 -> [recent errors]
   "Recent errors are all 'Connection refused' from PaymentService."

3. hexdi://logging/handlers -> [handler chain]
   "Handler chain looks healthy. The issue is upstream."

Diagnosis: "High error rate caused by PaymentService connection failures."
```

### Forward reference

The full MCP server implementation is part of Phase 4 (`@hex-di/mcp`). This section defines the resource contracts that the MCP server will expose. The `LoggerInspector` provides the data; the MCP server provides the transport.

---

_Previous: [12 - Tracing Integration](./12-tracing-integration.md) | Next: [14 - Testing](./14-testing.md)_
