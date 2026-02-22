# 03 - Log Types

_Previous: [02 - Core Concepts](./02-core-concepts.md)_

---

## 9. LogLevel

The `LogLevel` type is a string literal union of the six severity levels. It is the fundamental discriminant for log entry classification.

```typescript
/**
 * Log level severity.
 * Ordered from least severe (trace) to most severe (fatal).
 */
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
```

### Why string literals, not numbers

1. **Readability** -- `"info"` is self-documenting; `30` requires a lookup table
2. **Type narrowing** -- TypeScript narrows string literals in `switch` statements and equality checks
3. **Serialization** -- string levels serialize to JSON without a mapping step
4. **Alignment** -- Pino, Winston, and Bunyan all accept string level names

The numeric comparison values exist separately in `LogLevelValue` and are used only for level filtering, never exposed to consumers in log entries.

### Exhaustive handling

Because `LogLevel` is a closed union, TypeScript enforces exhaustive handling:

```typescript
function levelToEmoji(level: LogLevel): string {
  switch (level) {
    case "trace":
      return "...";
    case "debug":
      return "?";
    case "info":
      return "i";
    case "warn":
      return "!";
    case "error":
      return "x";
    case "fatal":
      return "X";
    // No default needed -- TypeScript ensures all cases are covered
  }
}
```

## 10. LogEntry

`LogEntry` is the canonical representation of a log event. Every adapter receives and processes this structure.

```typescript
/**
 * Structured log entry.
 *
 * All fields are readonly to prevent mutation after creation.
 * The entry is created by the Logger implementation and passed
 * to LogHandler.handle().
 */
interface LogEntry {
  /** Severity level of this entry. */
  readonly level: LogLevel;

  /** Human-readable log message. */
  readonly message: string;

  /** Unix timestamp in milliseconds when the entry was created. */
  readonly timestamp: number;

  /** Request-scoped context (correlationId, userId, etc.). */
  readonly context: LogContext;

  /** Key-value annotations attached to this specific entry. */
  readonly annotations: Readonly<Record<string, unknown>>;

  /** Error object, present when logging errors. */
  readonly error?: Error;

  /** Active trace/span IDs when tracing is enabled. */
  readonly spans?: ReadonlyArray<{
    readonly traceId: string;
    readonly spanId: string;
  }>;
}
```

### Field semantics

| Field         | Type                       | Required | Description                                          |
| ------------- | -------------------------- | -------- | ---------------------------------------------------- |
| `level`       | `LogLevel`                 | Yes      | Severity: trace through fatal                        |
| `message`     | `string`                   | Yes      | Human-readable message, no interpolation             |
| `timestamp`   | `number`                   | Yes      | `Date.now()` at entry creation                       |
| `context`     | `LogContext`               | Yes      | Inherited from logger chain (may be empty `{}`)      |
| `annotations` | `Record<string, unknown>`  | Yes      | Merged from base annotations + call-site annotations |
| `error`       | `Error`                    | No       | Present only for `error()` and `fatal()` with Error  |
| `spans`       | `Array<{traceId, spanId}>` | No       | Present when tracing integration is active           |

### Immutability

All fields are `readonly`. The `annotations` record is wrapped in `Readonly<>`. The `spans` array is `ReadonlyArray` with readonly elements. Once a `LogEntry` is created, it cannot be mutated. This ensures that:

1. Handlers receive a consistent snapshot, even if the logger context changes concurrently
2. The Memory adapter stores entries that cannot be accidentally modified by test code
3. Formatter implementations cannot corrupt the original entry

### Annotation merging

When a logger with base annotations receives a call with additional annotations, the final `LogEntry.annotations` is the merge of both, with call-site annotations taking precedence:

```typescript
const logger = baseLogger.withAnnotations({ service: "orders", version: "1.0" });
logger.info("Order created", { orderId: "123", service: "overridden" });

// LogEntry.annotations:
// { service: "overridden", version: "1.0", orderId: "123" }
```

## 11. LogContext

`LogContext` carries request-scoped metadata that is inherited by child loggers and included in every log entry within that scope.

```typescript
/**
 * Log context carrying request-scoped data.
 *
 * Known fields have typed optional properties.
 * Custom fields are supported via index signature.
 */
interface LogContext {
  /** Unique ID linking related operations across services. */
  readonly correlationId?: string;

  /** Unique ID for this specific request. */
  readonly requestId?: string;

  /** ID of the authenticated user. */
  readonly userId?: string;

  /** ID of the user session. */
  readonly sessionId?: string;

  /** ID of the DI scope (from container scope lifecycle). */
  readonly scopeId?: string;

  /** Name of the service producing the log. */
  readonly service?: string;

  /** Deployment environment (production, staging, development). */
  readonly environment?: string;

  /** Custom fields. */
  readonly [key: string]: unknown;
}
```

### Known fields vs custom fields

The known fields (`correlationId`, `requestId`, etc.) provide IDE autocomplete and documentation. The index signature `[key: string]: unknown` allows arbitrary context without type casting. This hybrid approach balances discoverability with flexibility.

### Context inheritance

Child loggers inherit their parent's context and merge any new values:

```typescript
const root = logger.child({ service: "api", environment: "production" });
const request = root.child({ correlationId: "abc-123", requestId: "req-456" });
const user = request.child({ userId: "user-789" });

user.info("Order placed");
// LogEntry.context:
// {
//   service: "api",
//   environment: "production",
//   correlationId: "abc-123",
//   requestId: "req-456",
//   userId: "user-789"
// }
```

### Context vs annotations

| Aspect          | Context (`LogContext`)             | Annotations (`Record<string, unknown>`) |
| --------------- | ---------------------------------- | --------------------------------------- |
| **Scope**       | Inherited by all child loggers     | Per-logger (via `withAnnotations`)      |
| **Purpose**     | Request-scoped identity metadata   | Event-specific data                     |
| **Examples**    | correlationId, userId, service     | orderId, amount, duration               |
| **Persistence** | Flows through entire request chain | Attached to individual entries          |
| **Override**    | Child context overrides parent     | Call-site overrides base annotations    |

## 12. LogLevelValue and shouldLog

### LogLevelValue

The numeric mapping used for level comparison:

```typescript
/**
 * Numeric values for log levels, enabling comparison.
 *
 * Values are spaced by 10 to allow future insertion of
 * intermediate levels without breaking existing comparisons.
 */
const LogLevelValue: Readonly<Record<LogLevel, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};
```

### shouldLog

The level comparison function used by all adapter implementations:

```typescript
/**
 * Check if a level should be logged given a minimum level.
 *
 * @param level - The level of the log entry
 * @param minLevel - The minimum level threshold
 * @returns true if the entry level meets or exceeds the minimum
 */
function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LogLevelValue[level] >= LogLevelValue[minLevel];
}
```

### Usage in adapters

Every adapter implementation uses `shouldLog` as a fast-path gate:

```typescript
private _log(level: LogLevel, message: string, ...): void {
  if (!shouldLog(level, this._minLevel)) {
    return; // Fast exit, no entry construction
  }

  const entry: LogEntry = {
    level,
    message,
    timestamp: Date.now(),
    context: this._context,
    annotations: mergedAnnotations,
  };

  // ... handler.handle(entry) or console output
}
```

This ensures that when `minLevel` is set to `"info"`, trace and debug calls exit immediately without constructing a `LogEntry` or merging annotations. The `isLevelEnabled` method on the Logger interface exposes this same check to callers who want to avoid constructing expensive annotation objects.

### Comparison table

| `shouldLog(level, minLevel)` | trace | debug | info  | warn  | error | fatal |
| ---------------------------- | ----- | ----- | ----- | ----- | ----- | ----- |
| **minLevel = trace**         | true  | true  | true  | true  | true  | true  |
| **minLevel = debug**         | false | true  | true  | true  | true  | true  |
| **minLevel = info**          | false | false | true  | true  | true  | true  |
| **minLevel = warn**          | false | false | false | true  | true  | true  |
| **minLevel = error**         | false | false | false | false | true  | true  |
| **minLevel = fatal**         | false | false | false | false | false | true  |

---

_Previous: [02 - Core Concepts](./02-core-concepts.md) | Next: [04 - Logger Port](./04-logger-port.md)_
