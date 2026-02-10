# 14 - Testing

_Previous: [13 - Inspection & Reporting](./13-inspection.md)_

---

## 51. MemoryLogger

The `MemoryLogger` is the primary testing tool. It implements the `Logger` interface and stores all entries in memory for assertion.

### Interface

```typescript
interface MemoryLogger extends Logger {
  /** Get all collected log entries (returns a copy). */
  getEntries(): ReadonlyArray<LogEntry>;

  /** Get entries filtered by level. */
  getEntriesByLevel(level: LogLevel): ReadonlyArray<LogEntry>;

  /** Clear all collected entries. */
  clear(): void;

  /** Find an entry matching a predicate. */
  findEntry(predicate: (entry: LogEntry) => boolean): LogEntry | undefined;
}
```

### Factory

```typescript
/**
 * Create a new MemoryLogger instance.
 *
 * @param minLevel - Minimum log level to capture (default: "trace")
 * @returns A fresh MemoryLogger with an empty entry array
 */
function createMemoryLogger(minLevel?: LogLevel): MemoryLogger;
```

### Testing pattern

```typescript
import { createMemoryLogger } from "@hex-di/logger";

describe("OrderService", () => {
  it("logs order creation", () => {
    const logger = createMemoryLogger();
    const service = new OrderService(logger);

    service.createOrder({ item: "widget", quantity: 3 });

    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe("info");
    expect(entries[0].message).toBe("Order created");
    expect(entries[0].annotations).toEqual({
      item: "widget",
      quantity: 3,
    });
  });

  it("logs errors with Error objects", () => {
    const logger = createMemoryLogger();
    const service = new OrderService(logger);

    expect(() => service.createOrder({ item: "", quantity: 0 })).toThrow();

    const errors = logger.getEntriesByLevel("error");
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toBeInstanceOf(Error);
    expect(errors[0].message).toBe("Order creation failed");
  });
});
```

### Child logger testing

Child loggers share the parent's entry array, so you can assert on entries from any logger in the chain:

```typescript
it("child logger includes context", () => {
  const root = createMemoryLogger();
  const child = root.child({ requestId: "req-1" });

  child.info("Hello");

  const entries = root.getEntries();
  expect(entries[0].context).toEqual({ requestId: "req-1" });
});
```

### Level filtering in tests

Set `minLevel` on the MemoryLogger to filter noise in tests:

```typescript
// Only capture warn and above:
const logger = createMemoryLogger("warn");
logger.debug("This is dropped");
logger.warn("This is captured");

expect(logger.getEntries()).toHaveLength(1);
```

### clear() for test isolation

Call `clear()` between test phases or in `beforeEach`:

```typescript
const logger = createMemoryLogger();

beforeEach(() => {
  logger.clear();
});
```

## 52. assertLogEntry

`assertLogEntry` searches an array of log entries for one matching the given criteria. If found, it returns the entry. If not found, it throws with a descriptive error.

### LogEntryMatcher

```typescript
/**
 * Matcher for finding log entries in test assertions.
 */
interface LogEntryMatcher {
  /** Match entries at this level. */
  readonly level?: LogLevel;

  /** Match entries with this message (exact string or RegExp). */
  readonly message?: string | RegExp;

  /** Match entries containing these annotation key-value pairs. */
  readonly annotations?: Record<string, unknown>;

  /** Match entries containing these context key-value pairs. */
  readonly context?: Partial<LogContext>;

  /** Match entries that have (or don't have) an error. */
  readonly hasError?: boolean;
}
```

### assertLogEntry

```typescript
/**
 * Assert that a log entry matching the given criteria exists.
 *
 * @param entries - Array of log entries to search
 * @param matcher - Criteria to match against
 * @returns The matching log entry (for further assertions)
 * @throws Error if no matching entry is found
 */
function assertLogEntry(entries: ReadonlyArray<LogEntry>, matcher: LogEntryMatcher): LogEntry;
```

### Usage

```typescript
import { createMemoryLogger, assertLogEntry } from "@hex-di/logger";

it("logs with correct annotations", () => {
  const logger = createMemoryLogger();
  const service = new PaymentService(logger);

  service.processPayment({ amount: 99.99, currency: "USD" });

  const entry = assertLogEntry(logger.getEntries(), {
    level: "info",
    message: "Payment processed",
    annotations: { amount: 99.99, currency: "USD" },
  });

  // entry is the matching LogEntry -- can do further assertions
  expect(entry.timestamp).toBeGreaterThan(0);
});
```

### Matcher behavior

| Matcher field | Matching logic                                           |
| ------------- | -------------------------------------------------------- |
| `level`       | Exact match: `entry.level === matcher.level`             |
| `message`     | String: exact match. RegExp: `regex.test(entry.message)` |
| `annotations` | Subset match: every key-value in matcher exists in entry |
| `context`     | Subset match: every key-value in matcher exists in entry |
| `hasError`    | `(entry.error !== undefined) === matcher.hasError`       |

All fields are optional. Omitted fields are not checked. An empty matcher `{}` matches the first entry.

### Error messages

When no match is found, `assertLogEntry` throws an Error with:

```
No log entry matching:
{
  "level": "error",
  "message": "Payment failed"
}

Available entries:
  info: Order created
  info: Payment processed
  debug: Cache hit
```

This helps quickly identify what was logged vs what was expected.

### RegExp message matching

```typescript
assertLogEntry(entries, {
  message: /order.*created/i,
});
```

## 53. Testing Patterns

### Pattern 1: Service logging verification

```typescript
describe("UserService", () => {
  let logger: MemoryLogger;
  let service: UserService;

  beforeEach(() => {
    logger = createMemoryLogger();
    service = new UserService(logger);
  });

  it("logs user lookup", async () => {
    await service.findUser("alice");

    assertLogEntry(logger.getEntries(), {
      level: "debug",
      message: "Looking up user",
      annotations: { userId: "alice" },
    });
  });

  it("logs not-found errors", async () => {
    await expect(service.findUser("unknown")).rejects.toThrow();

    assertLogEntry(logger.getEntries(), {
      level: "warn",
      message: "User not found",
      annotations: { userId: "unknown" },
    });
  });
});
```

### Pattern 2: DI container with MemoryLogger

```typescript
import { MemoryLoggerAdapter, LoggerPort } from "@hex-di/logger";

it("services log through DI", () => {
  const graph = createGraphBuilder()
    .provide(MemoryLoggerAdapter)
    .provide(UserServiceAdapter)
    .build();

  const container = createContainer(graph);
  const service = container.resolve(UserServicePort);
  const logger = container.resolve(LoggerPort);

  service.doSomething();

  // MemoryLoggerAdapter uses transient lifetime, so each resolve
  // creates a fresh logger. Use the same instance for assertions.
  expect((logger as MemoryLogger).getEntries()).toHaveLength(1);
});
```

### Pattern 3: Context propagation verification

```typescript
it("child logger carries context", () => {
  const logger = createMemoryLogger();
  const requestLogger = logger.child({
    correlationId: "corr-123",
    requestId: "req-456",
  });

  requestLogger.info("Request handled");

  assertLogEntry(logger.getEntries(), {
    context: { correlationId: "corr-123", requestId: "req-456" },
  });
});
```

### Pattern 4: Timing verification

```typescript
it("time() logs duration", () => {
  const logger = createMemoryLogger();

  const result = logger.time("compute", () => 42);

  expect(result).toBe(42);
  assertLogEntry(logger.getEntries(), {
    level: "debug",
    message: "compute completed",
  });

  const entry = logger.getEntries()[0];
  expect(entry.annotations.duration).toBeGreaterThanOrEqual(0);
});

it("time() logs error on failure", () => {
  const logger = createMemoryLogger();

  expect(() =>
    logger.time("fail", () => {
      throw new Error("boom");
    })
  ).toThrow("boom");

  assertLogEntry(logger.getEntries(), {
    level: "error",
    message: "fail failed",
    hasError: true,
  });
});
```

### Pattern 5: No logging verification

```typescript
it("does not log at suppressed levels", () => {
  const logger = createMemoryLogger("warn");

  logger.debug("Should be suppressed");
  logger.info("Should be suppressed");
  logger.warn("Should be captured");

  expect(logger.getEntries()).toHaveLength(1);
  expect(logger.getEntries()[0].level).toBe("warn");
});
```

## 54. Testing Utilities

### createMemoryLogger

The primary factory for test loggers. See section 51.

### assertLogEntry

The primary assertion helper. See section 52.

### MemoryLoggerAdapter

DI adapter for injecting MemoryLogger into the container. Uses `transient` lifetime for test isolation.

### NOOP_LOGGER for performance tests

When testing code that accepts a Logger but you don't need to verify logging output, use `NOOP_LOGGER` for zero overhead:

```typescript
import { NOOP_LOGGER } from "@hex-di/logger";

it("processes 10000 orders", () => {
  const service = new OrderService(NOOP_LOGGER);

  for (let i = 0; i < 10000; i++) {
    service.process(makeOrder(i));
  }
  // No logging overhead in the benchmark
});
```

### Future: Vitest custom matchers

A future `@hex-di/logger-testing` package could provide Vitest custom matchers:

```typescript
// Future API (not in 0.1.0):
expect(logger).toHaveLogged({ level: "info", message: "Order created" });
expect(logger).toHaveLoggedError(/failed/i);
expect(logger).not.toHaveLogged({ level: "fatal" });
```

---

_Previous: [13 - Inspection & Reporting](./13-inspection.md) | Next: [15 - API Reference](./15-api-reference.md)_
