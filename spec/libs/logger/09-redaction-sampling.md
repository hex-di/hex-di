# 09 - Redaction & Sampling

_Previous: [08 - Context Propagation](./08-context-propagation.md)_

---

## 35. Sensitive Data Redaction

Sensitive data (passwords, tokens, credit card numbers) must never appear in log output. `@hex-di/logger` provides a redaction wrapper that sanitizes log entries before they reach any handler.

### RedactionConfig

```typescript
/**
 * Configuration for sensitive data redaction.
 */
interface RedactionConfig {
  /**
   * Paths to redact in annotations and context.
   *
   * Supports:
   *   - Exact field names: "password", "creditCard"
   *   - Wildcard prefix: "*.secret" (any object's "secret" field)
   *   - Nested paths: "user.ssn", "payment.card.number"
   */
  readonly paths: ReadonlyArray<string>;

  /**
   * Replacement value or function.
   *
   * String: replace with this string (default: "[REDACTED]")
   * Function: transform the original value
   */
  readonly censor?: string | ((value: unknown) => unknown);
}
```

### withRedaction

```typescript
/**
 * Create a redacting logger wrapper.
 *
 * Returns a new Logger that intercepts all log calls,
 * redacts matching annotation/context fields, and delegates
 * to the underlying logger.
 *
 * @param logger - The logger to wrap
 * @param config - Redaction configuration
 * @returns A new Logger with redaction applied
 */
function withRedaction(logger: Logger, config: RedactionConfig): Logger;
```

### Usage

```typescript
import { withRedaction } from "@hex-di/logger";

const logger = container.resolve(LoggerPort);
const redacted = withRedaction(logger, {
  paths: ["password", "creditCard", "ssn", "authorization", "*.secret"],
  censor: "[REDACTED]",
});

redacted.info("User login", {
  username: "john",
  password: "secret123", // Logged as "[REDACTED]"
  creditCard: "4111-1111-1111-1111", // Logged as "[REDACTED]"
});

// LogEntry.annotations:
// {
//   username: "john",
//   password: "[REDACTED]",
//   creditCard: "[REDACTED]"
// }
```

### Path matching rules

| Pattern           | Matches                                              | Does not match                         |
| ----------------- | ---------------------------------------------------- | -------------------------------------- |
| `"password"`      | `annotations.password`                               | `context.password` is a separate check |
| `"user.ssn"`      | `annotations.user.ssn` (nested)                      | `annotations.ssn`                      |
| `"*.secret"`      | `annotations.foo.secret`, `annotations.bar.secret`   | `annotations.secret`                   |
| `"authorization"` | `context.authorization`, `annotations.authorization` | Irrelevant keys                        |

Redaction is applied to both `annotations` and `context` fields. Headers in context (e.g., from `extractContextFromHeaders`) are also subject to redaction.

### Redaction ordering

Redaction happens before the entry is passed to the underlying logger. This ensures:

1. The original logger never sees sensitive values
2. Handlers and formatters never see sensitive values
3. Memory logger stores only redacted entries

### Custom censor function

```typescript
const redacted = withRedaction(logger, {
  paths: ["creditCard"],
  censor: value => {
    if (typeof value === "string" && value.length > 4) {
      return "****" + value.slice(-4);
    }
    return "[REDACTED]";
  },
});

redacted.info("Payment", { creditCard: "4111-1111-1111-1111" });
// creditCard: "****1111"
```

## 36. Log Sampling

High-throughput services can produce millions of log entries per minute. Sampling reduces volume while preserving statistical representativeness.

### SamplingConfig

```typescript
/**
 * Sampling configuration for log entry filtering.
 */
interface SamplingConfig {
  /**
   * Global sampling rate (0.0 to 1.0).
   * 1.0 = log everything, 0.1 = log 10% of entries.
   */
  readonly rate: number;

  /**
   * Per-level sampling rate overrides.
   * If specified for a level, overrides the global rate for that level.
   */
  readonly perLevel?: Partial<Record<LogLevel, number>>;

  /**
   * Always log error and fatal entries regardless of sampling rate.
   * Default: true.
   */
  readonly alwaysLogErrors?: boolean;
}
```

### withSampling

```typescript
/**
 * Create a sampling logger wrapper.
 *
 * Returns a new Logger that probabilistically drops log entries
 * based on the configured sampling rate.
 *
 * @param logger - The logger to wrap
 * @param config - Sampling configuration
 * @returns A new Logger with sampling applied
 */
function withSampling(logger: Logger, config: SamplingConfig): Logger;
```

### Usage

```typescript
import { withSampling } from "@hex-di/logger";

const sampled = withSampling(logger, {
  rate: 0.1, // Log 10% of all entries
  perLevel: {
    error: 1.0, // Always log errors
    warn: 0.5, // Log 50% of warnings
    info: 0.1, // Log 10% of info
    debug: 0.01, // Log 1% of debug
  },
  alwaysLogErrors: true, // error and fatal always pass through
});

// ~10% of these will be logged:
sampled.info("Request processed", { requestId: "req-123" });

// 100% of these will be logged:
sampled.error("Database connection failed", new Error("timeout"));
```

### Sampling algorithm

1. If `alwaysLogErrors` is true and level is `"error"` or `"fatal"`, always log
2. Look up per-level rate override; if not present, use global `rate`
3. Generate a random number in `[0, 1)`
4. If random < rate, log the entry; otherwise drop it

### Deterministic sampling (optional)

For consistent sampling across replicas, use a hash-based approach:

```typescript
const sampled = withSampling(logger, {
  rate: 0.1,
  // When a correlationId is present, hash it to determine sampling.
  // Same correlationId = same sampling decision across all replicas.
  deterministicField: "correlationId",
});
```

This ensures that all log entries for a given request are either all sampled in or all sampled out, rather than a random mix.

### Sampling and child loggers

`withSampling` returns a wrapper Logger. Calling `child()` or `withAnnotations()` on the wrapper returns a new wrapper that preserves the sampling configuration. The sampling decision is made per-call, not per-logger.

## 37. Rate Limiting

Rate limiting provides a hard cap on log throughput, complementing probabilistic sampling.

### RateLimitConfig

```typescript
/**
 * Rate limiting configuration.
 */
interface RateLimitConfig {
  /**
   * Maximum entries per time window.
   */
  readonly maxEntries: number;

  /**
   * Time window in milliseconds.
   */
  readonly windowMs: number;

  /**
   * Per-level limits (optional, overrides global).
   */
  readonly perLevel?: Partial<Record<LogLevel, number>>;

  /**
   * Strategy when limit is reached.
   * "drop" = silently discard entries (default)
   * "sample" = switch to 10% sampling when near limit
   */
  readonly strategy?: "drop" | "sample";
}
```

### withRateLimit

```typescript
/**
 * Create a rate-limited logger wrapper.
 *
 * @param logger - The logger to wrap
 * @param config - Rate limit configuration
 * @returns A new Logger with rate limiting applied
 */
function withRateLimit(logger: Logger, config: RateLimitConfig): Logger;
```

### Usage

```typescript
const limited = withRateLimit(logger, {
  maxEntries: 1000,
  windowMs: 60_000, // 1000 entries per minute
  perLevel: {
    error: 100, // At most 100 errors per minute
    debug: 5000, // More permissive for debug
  },
  strategy: "drop",
});
```

### Combining redaction, sampling, and rate limiting

These wrappers compose naturally:

```typescript
const logger = container.resolve(LoggerPort);

const enhanced = withRateLimit(
  withSampling(
    withRedaction(logger, {
      paths: ["password", "token"],
    }),
    { rate: 0.1, alwaysLogErrors: true }
  ),
  { maxEntries: 10000, windowMs: 60_000 }
);

// Entry flow:
// 1. Redaction removes sensitive fields
// 2. Sampling decides whether to log (probabilistic)
// 3. Rate limiting enforces hard cap
// 4. Entry reaches the actual logger/handler
```

---

_Previous: [08 - Context Propagation](./08-context-propagation.md) | Next: [10 - Instrumentation](./10-instrumentation.md)_
