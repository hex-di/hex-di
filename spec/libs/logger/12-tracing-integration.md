# 12 - Tracing Integration

_Previous: [11 - Framework Integration](./11-framework-integration.md)_

---

## 44. Span Correlation

When `@hex-di/tracing` is active, log entries can be correlated with trace spans. This enables navigation from a log entry to the trace that produced it in observability UIs.

### How correlation works

```
Tracer creates span:
  span { traceId: "trace-abc", spanId: "span-123" }
    |
    v
Logger detects active span:
  LogEntry.spans = [{ traceId: "trace-abc", spanId: "span-123" }]
    |
    v
Handler outputs trace context:
  {"level":"info","message":"...","traceId":"trace-abc","spanId":"span-123"}
```

### Implementation approaches

Two approaches exist for injecting trace context into log entries:

**Approach 1: Tracing-aware Logger adapter**

The Logger adapter detects the active span at log time and includes it in the entry:

```typescript
private _log(level: LogLevel, message: string, ...): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: Date.now(),
    context: this._context,
    annotations: mergedAnnotations,
    spans: getActiveSpans(),  // Read from tracing context
  };
  this._handler.handle(entry);
}
```

**Approach 2: Handler-level injection**

The handler reads the active span before writing:

```typescript
handle(entry: LogEntry): void {
  const enriched = {
    ...entry,
    spans: entry.spans ?? getActiveSpans(),
  };
  this._backend.write(enriched);
}
```

Approach 1 is preferred because it captures the span at the call site (which may differ from the handler execution context in async scenarios).

### Span lifecycle and log entries

```typescript
import { TracerPort } from "@hex-di/tracing";
import { LoggerPort } from "@hex-di/logger";

const tracer = container.resolve(TracerPort);
const logger = container.resolve(LoggerPort);

tracer.withSpan("process-order", span => {
  logger.info("Starting order processing");
  // LogEntry.spans: [{ traceId: span.traceId, spanId: span.spanId }]

  tracer.withSpan("validate-payment", childSpan => {
    logger.info("Validating payment");
    // LogEntry.spans: [{ traceId: span.traceId, spanId: childSpan.spanId }]
  });

  logger.info("Order processing complete");
  // LogEntry.spans: [{ traceId: span.traceId, spanId: span.spanId }]
});
```

### Optional integration

Tracing integration is optional. If `@hex-di/tracing` is not installed or no span is active, `LogEntry.spans` is `undefined`. Handlers must handle both cases:

```typescript
// In handler:
if (entry.spans && entry.spans.length > 0) {
  fields.traceId = entry.spans[0].traceId;
  fields.spanId = entry.spans[0].spanId;
}
```

## 45. Trace Context in Log Entries

### LogEntry.spans field

```typescript
interface LogEntry {
  // ... other fields ...

  /**
   * Active trace/span IDs when this entry was created.
   *
   * Present only when tracing is active. The first element
   * is the innermost (most specific) span.
   */
  readonly spans?: ReadonlyArray<{
    readonly traceId: string;
    readonly spanId: string;
  }>;
}
```

### Why an array

The `spans` field is an array (not a single object) to support:

1. **Nested spans** -- when log entries are created inside nested `withSpan` calls, the array can carry the full span stack
2. **Multiple trace systems** -- in rare cases, multiple tracing systems may be active simultaneously
3. **Future extensibility** -- additional span metadata (e.g., operation name) can be added

In practice, most entries have zero or one span. Handlers typically use `spans[0]` for the innermost span's trace/span IDs.

### Formatter output

The JSON formatter flattens the first span's IDs to top-level fields:

```json
{
  "level": "info",
  "message": "Order created",
  "traceId": "abc123def456",
  "spanId": "span789"
}
```

The pretty formatter appends trace context:

```
2026-02-08T12:00:00.000Z [ INFO] Order created traceId=abc123def456
```

### W3C Trace Context

For HTTP propagation, `@hex-di/tracing` handles W3C Trace Context headers (`traceparent`, `tracestate`). The logging system consumes the resulting span IDs. There is no direct interaction between `@hex-di/logger` and W3C headers -- that boundary belongs to the tracing package.

## 46. Cross-Observability

Logging and tracing are two pillars of observability. Their integration creates a unified view of application behavior.

### Log-to-trace navigation

When log entries carry trace IDs, observability platforms enable:

```
Log Entry:
  "Order processing failed" traceId=abc123
                                 |
                                 v
  Trace: abc123
    |-- process-order (200ms)
    |   |-- validate-payment (50ms)
    |   |-- charge-card (100ms) [ERROR]
    |   |-- update-inventory (50ms) [skipped]
```

Clicking a log entry's traceId navigates to the full trace waterfall.

### Trace-to-log navigation

Conversely, a trace span can link to all log entries produced within its duration:

```
Trace Span: charge-card
  Duration: 100ms
  Status: ERROR
  |
  +-- Log entries:
      [INFO]  "Charging card" { amount: 99.99 }
      [ERROR] "Card declined" { reason: "insufficient_funds" }
```

### Unified context

Both logging and tracing share context via HexDI's container:

```
Request arrives
  |
  v
Container scope created:
  - correlationId: "corr-abc"
  - requestId: "req-123"
  |
  +-- Logger: context includes correlationId, requestId
  +-- Tracer: span attributes include correlationId, requestId
  |
  v
Both log entries and trace spans share the same identifiers
```

### Inspector integration

The HexDI inspector can aggregate both logging and tracing statistics. The `LoggerInspector` provides the logging side of this cross-observability view. See [Section 47](./13-inspection.md#47-loggerinspector-interface) for the complete inspector API.

```typescript
const loggerInspector = container.inspector.getLoggerInspector();

// Logging statistics via LoggerInspector:
loggerInspector?.getEntryCounts();
// { trace: 0, debug: 1500, info: 8000, warn: 200, error: 50, fatal: 2 }

loggerInspector?.getErrorRate();
// 0.05 (5% error rate in the default 60-second window)

// Tracing statistics (via TracingInspector):
const tracingInspector = container.inspector.getTracingInspector();
tracingInspector?.getSpanStatistics("UserService");
// { totalSpans: 1000, errorCount: 50, p99Duration: 150 }

// Correlated view via unified snapshot:
const snapshot = container.inspector.getUnifiedSnapshot();
// {
//   logging: { totalEntries: 9752, errorRate: 0.05, ... },
//   tracing: { totalSpans: 1000, p99Duration: 150, ... },
// }
```

### Observability architecture diagram

```
+------------------------------------------------------------------+
|                     Application Code                             |
|                                                                  |
|  logger.info("Processing order", { orderId });                   |
|  tracer.withSpan("process-order", () => { ... });               |
+------------------------------------------------------------------+
         |                                      |
         v                                      v
+-----------------+                    +-----------------+
| @hex-di/logger |                    | @hex-di/tracing |
|                 |                    |                 |
| LogEntry {      |                    | Span {          |
|   traceId,      |<--- shared IDs --->|   traceId,      |
|   spanId        |                    |   spanId        |
| }               |                    | }               |
+-----------------+                    +-----------------+
         |                                      |
         v                                      v
+-----------------+                    +-----------------+
| Log Backend     |                    | Trace Backend   |
| (Pino/Winston/  |                    | (Jaeger/Zipkin/ |
|  Bunyan/Loki)   |                    |  Datadog)       |
+-----------------+                    +-----------------+
         |                                      |
         +------------------+-------------------+
                            |
                            v
                +-----------------------+
                | Observability Platform|
                | (Grafana/Datadog/etc) |
                |                       |
                | Correlated view:      |
                | logs + traces linked  |
                | by traceId            |
                +-----------------------+
```

---

_Previous: [11 - Framework Integration](./11-framework-integration.md) | Next: [13 - Inspection & Reporting](./13-inspection.md)_
