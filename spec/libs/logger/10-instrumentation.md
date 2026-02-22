# 10 - Instrumentation

_Previous: [09 - Redaction & Sampling](./09-redaction-sampling.md)_

---

## 38. Container Instrumentation

`@hex-di/logger` can automatically log DI container resolution events. This provides observability into the dependency graph without manual instrumentation.

### instrumentContainer

```typescript
/**
 * Options for automatic container logging.
 */
interface AutoLogOptions {
  /** Log level for successful resolution events (default: "debug"). */
  readonly resolutionLevel?: LogLevel;

  /** Log level for resolution errors (default: "error"). */
  readonly errorLevel?: LogLevel;

  /** Filter which ports to log. Return true to log, false to skip. */
  readonly portFilter?: (portName: string) => boolean;

  /** Include timing information for resolutions (default: false). */
  readonly includeTiming?: boolean;

  /** Minimum duration (ms) to log. Skip fast resolutions (default: 0). */
  readonly minDurationMs?: number;

  /** Log scope lifecycle events (creation/disposal) (default: false). */
  readonly logScopeLifecycle?: boolean;
}

/**
 * Enable automatic logging of DI resolutions.
 *
 * Installs hooks on the container that log resolution events.
 * Returns a cleanup function that removes the hooks.
 *
 * @param container - The DI container to instrument
 * @param logger - The logger to use for output
 * @param options - Configuration options
 * @returns Cleanup function to remove instrumentation
 */
function instrumentContainer(
  container: Container,
  logger: Logger,
  options?: AutoLogOptions
): () => void;
```

### Usage

```typescript
import { instrumentContainer, LoggerPort } from "@hex-di/logger";

const container = createContainer(graph);
const logger = container.resolve(LoggerPort);

const cleanup = instrumentContainer(container, logger, {
  resolutionLevel: "debug",
  includeTiming: true,
  minDurationMs: 1,
  logScopeLifecycle: true,
  portFilter: name => name !== "Logger", // Skip logging the logger itself
});

// All subsequent resolutions are logged:
const userService = container.resolve(UserServicePort);
// debug: "Resolved UserService" { lifetime: "singleton", cached: false, duration: 5 }

const cached = container.resolve(UserServicePort);
// debug: "Resolved UserService" { lifetime: "singleton", cached: true, duration: 0 }

// Remove instrumentation when done:
cleanup();
```

### Logged fields

| Event              | Level             | Message                          | Annotations                       |
| ------------------ | ----------------- | -------------------------------- | --------------------------------- |
| Resolution success | `resolutionLevel` | `"Resolved {portName}"`          | `{ lifetime, cached, duration? }` |
| Resolution failure | `errorLevel`      | `"Failed to resolve {portName}"` | `{ error: Error }`                |
| Scope creation     | `"debug"`         | `"Scope created"`                | `{ scopeId }`                     |
| Scope disposal     | `"debug"`         | `"Scope disposed"`               | `{ scopeId, resolvedCount }`      |

### Avoiding infinite loops

When the container is instrumented, resolving the Logger itself would trigger a log entry, which would try to resolve the Logger, creating an infinite loop. The instrumentation guards against this by:

1. Default `portFilter` skips `"Logger"` and `"LogHandler"`
2. The hook checks a reentrance flag to prevent recursive logging
3. The logger instance is captured at instrumentation time, not resolved per-event

## 39. Resolution Hooks

For finer-grained control, `@hex-di/logger` provides a resolution hook factory that can be registered with the container.

### createLoggingHook

```typescript
import type { ResolutionHook } from "@hex-di/runtime";

/**
 * Create a resolution hook that logs resolutions.
 *
 * The hook can be registered with the container's hook system
 * for custom integration with the resolution pipeline.
 *
 * @param logger - The logger to use
 * @param options - Configuration options
 * @returns A ResolutionHook compatible with the container
 */
function createLoggingHook(logger: Logger, options?: AutoLogOptions): ResolutionHook;
```

### Hook integration

```typescript
import { createLoggingHook } from "@hex-di/logger";

const hook = createLoggingHook(logger, {
  resolutionLevel: "trace",
  includeTiming: true,
});

const container = createContainer(graph, {
  hooks: [hook],
});
```

### Hook vs instrumentContainer

| Aspect          | `instrumentContainer`       | `createLoggingHook`            |
| --------------- | --------------------------- | ------------------------------ |
| **When**        | After container creation    | During container creation      |
| **Removal**     | Cleanup function            | Not removable (part of config) |
| **Use case**    | Dynamic, toggleable logging | Static, always-on logging      |
| **Integration** | Wraps resolution calls      | Part of the hook pipeline      |

## 40. Scope Lifecycle Logging

When `logScopeLifecycle` is enabled, the instrumentation logs scope creation and disposal events.

### Scope creation

```typescript
// When a scope is created:
logger.debug("Scope created", { scopeId: "scope-abc-123" });
```

### Scope disposal

```typescript
// When a scope is disposed:
logger.debug("Scope disposed", {
  scopeId: "scope-abc-123",
  resolvedCount: 5, // Number of ports resolved in this scope
});
```

### Lifecycle flow

```
Request arrives:
  debug: "Scope created" { scopeId: "scope-1" }

  During request:
    debug: "Resolved UserService" { lifetime: "scoped", scopeId: "scope-1", cached: false }
    debug: "Resolved OrderService" { lifetime: "scoped", scopeId: "scope-1", cached: false }

Request completes:
  debug: "Scope disposed" { scopeId: "scope-1", resolvedCount: 2 }
```

### Scope lifecycle + timing

When `includeTiming` is enabled, scope events also include duration:

```typescript
// Scope disposal with timing:
logger.debug("Scope disposed", {
  scopeId: "scope-1",
  resolvedCount: 5,
  durationMs: 45, // Time from scope creation to disposal
});
```

### Production considerations

Scope lifecycle logging is disabled by default (`logScopeLifecycle: false`). In high-throughput services, enabling it adds two log entries per request (creation + disposal). Use `minDurationMs` to log only long-lived scopes, or set `resolutionLevel: "trace"` and filter at the log aggregator.

---

_Previous: [09 - Redaction & Sampling](./09-redaction-sampling.md) | Next: [11 - Framework Integration](./11-framework-integration.md)_
