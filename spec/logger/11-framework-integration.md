# 11 - Framework Integration

_Previous: [10 - Instrumentation](./10-instrumentation.md)_

---

## 41. Hono Middleware

`@hex-di/logger` provides middleware for the Hono web framework that automatically logs request/response cycles with context propagation.

### loggingMiddleware

```typescript
import type { MiddlewareHandler } from "hono";

/**
 * Options for Hono logging middleware.
 */
interface HonoLoggingOptions {
  /** Base logger instance (pre-configured with service context). */
  readonly logger: Logger;

  /** Log level for request/response entries (default: "info"). */
  readonly level?: LogLevel;

  /** Include request body in annotations (default: false). */
  readonly includeRequestBody?: boolean;

  /** Include response body in annotations (default: false). */
  readonly includeResponseBody?: boolean;

  /** Headers to redact from log output (case-insensitive). */
  readonly redactHeaders?: ReadonlyArray<string>;

  /** Annotation paths to redact from log output. */
  readonly redactPaths?: ReadonlyArray<string>;

  /** Request paths to skip logging entirely (e.g., health checks). */
  readonly skipPaths?: ReadonlyArray<string>;
}

/**
 * Create Hono logging middleware.
 *
 * Logs request start and response completion with timing.
 * Extracts correlation context from headers and creates
 * a child logger for the request scope.
 *
 * @param options - Middleware configuration
 * @returns Hono MiddlewareHandler
 */
function loggingMiddleware(options: HonoLoggingOptions): MiddlewareHandler;
```

### Middleware behavior

```
Request arrives:
  1. Check skipPaths -- if matched, skip logging, call next()
  2. Extract context from headers (x-correlation-id, x-request-id)
  3. Create child logger with request context
  4. Log request start: "Incoming request" { method, path, ... }
  5. Set child logger on Hono context: c.set("logger", childLogger)
  6. Call next()
  7. Log response: "Request completed" { method, path, status, duration }
```

### Request logging

```typescript
// Request start entry:
{
  level: "info",
  message: "Incoming request",
  context: { correlationId: "abc-123", requestId: "req-456" },
  annotations: {
    method: "GET",
    path: "/api/users/123",
    userAgent: "...",
  }
}
```

### Response logging

```typescript
// Response entry:
{
  level: "info",  // or "warn" if status >= 400, "error" if status >= 500
  message: "Request completed",
  context: { correlationId: "abc-123", requestId: "req-456" },
  annotations: {
    method: "GET",
    path: "/api/users/123",
    status: 200,
    duration: 45,
  }
}
```

### Response level mapping

| Status Code Range | Log Level                            |
| ----------------- | ------------------------------------ |
| 2xx               | Configured `level` (default: "info") |
| 3xx               | Configured `level` (default: "info") |
| 4xx               | `"warn"`                             |
| 5xx               | `"error"`                            |

### Usage

```typescript
import { Hono } from "hono";
import { loggingMiddleware, LoggerPort } from "@hex-di/logger";

const app = new Hono();
const logger = container.resolve(LoggerPort);

app.use(
  "*",
  loggingMiddleware({
    logger,
    level: "info",
    redactHeaders: ["authorization", "cookie", "x-api-key"],
    skipPaths: ["/health", "/metrics", "/ready"],
  })
);

app.get("/users/:id", async c => {
  const logger = c.get("logger"); // Child logger with request context
  logger.info("Fetching user", { userId: c.req.param("id") });
  // ...
});
```

## 42. React Hooks and Providers

`@hex-di/logger` provides React integration for client-side logging with context propagation through the component tree.

### LoggingProvider

```typescript
import type { ReactNode } from "react";

/**
 * Props for LoggingProvider.
 */
interface LoggingProviderProps {
  /** Logger instance to provide to the component tree. */
  readonly logger: Logger;
  /** Additional context to merge into the logger. */
  readonly context?: Partial<LogContext>;
  /** React children. */
  readonly children: ReactNode;
}

/**
 * Provider that establishes log context for the React tree.
 *
 * Creates a child logger with the provided context and makes it
 * available to all descendant components via useLogger().
 */
function LoggingProvider(props: LoggingProviderProps): ReactNode;
```

### useLogger

```typescript
/**
 * Hook to access the current logger from LoggingProvider.
 *
 * @returns The Logger from the nearest LoggingProvider ancestor
 * @throws If no LoggingProvider is found in the component tree
 */
function useLogger(): Logger;
```

### useChildLogger

```typescript
/**
 * Hook to create a child logger with component-specific context.
 *
 * The child logger is memoized based on the context values.
 *
 * @param context - Context to merge into the parent logger
 * @returns A child Logger with the merged context
 */
function useChildLogger(context: Partial<LogContext>): Logger;
```

### useLifecycleLogger

```typescript
/**
 * Hook to log component mount and unmount events.
 *
 * Logs at debug level:
 *   - "Component mounted" { component: componentName }
 *   - "Component unmounted" { component: componentName }
 *
 * @param componentName - Name of the component for log entries
 */
function useLifecycleLogger(componentName: string): void;
```

### Usage

```typescript
import { LoggingProvider, useLogger, useChildLogger, useLifecycleLogger } from "@hex-di/logger";

function App() {
  const logger = createConsoleLogger({ level: "debug" });

  return (
    <LoggingProvider logger={logger} context={{ service: "web-app" }}>
      <UserDashboard />
    </LoggingProvider>
  );
}

function UserDashboard() {
  const logger = useChildLogger({ component: "UserDashboard" });
  useLifecycleLogger("UserDashboard");

  const handleClick = () => {
    logger.info("Dashboard action", { action: "refresh" });
  };

  return <button onClick={handleClick}>Refresh</button>;
}

function UserProfile({ userId }: { userId: string }) {
  const logger = useChildLogger({ component: "UserProfile", userId });

  useEffect(() => {
    logger.debug("Loading user profile");
    // ...
  }, [userId]);

  return <div>...</div>;
}
```

### Context nesting

LoggingProviders can be nested. Each level creates a child logger from its parent:

```typescript
<LoggingProvider logger={rootLogger} context={{ service: "app" }}>
  {/* logger.getContext() → { service: "app" } */}

  <LoggingProvider context={{ section: "admin" }}>
    {/* logger.getContext() → { service: "app", section: "admin" } */}

    <LoggingProvider context={{ page: "users" }}>
      {/* logger.getContext() → { service: "app", section: "admin", page: "users" } */}
    </LoggingProvider>
  </LoggingProvider>
</LoggingProvider>
```

## 43. Request-Scoped Logging

Combining DI scopes with the logging middleware creates a fully request-scoped logging pipeline.

### Architecture

```
                    Hono Request
                        |
                        v
            +------------------------+
            | Scope Middleware        |
            | - Create DI scope      |
            | - Set LogContextVar    |
            +------------------------+
                        |
                        v
            +------------------------+
            | Logging Middleware      |
            | - Extract headers      |
            | - Create child logger  |
            | - Log request/response |
            +------------------------+
                        |
                        v
            +------------------------+
            | Route Handler          |
            | - scope.resolve(...)   |
            | - Services get scoped  |
            |   logger automatically |
            +------------------------+
```

### Full example

```typescript
import { Hono } from "hono";
import { ScopedLoggerAdapter, LoggerPort, loggingMiddleware } from "@hex-di/logger";
import { PinoHandlerAdapter } from "@hex-di/logger-pino";

const graph = createGraphBuilder()
  .provide(PinoHandlerAdapter)
  .provide(ScopedLoggerAdapter)
  .provide(UserServiceAdapter)
  .build();

const rootContainer = createContainer(graph);
const app = new Hono();

// Scope middleware: creates a DI scope per request
app.use("*", async (c, next) => {
  const scope = rootContainer.createScope();
  c.set("scope", scope);
  await next();
  scope.dispose();
});

// Logging middleware: creates request-scoped logger
app.use(
  "*",
  loggingMiddleware({
    logger: rootContainer.resolve(LoggerPort),
    redactHeaders: ["authorization"],
    skipPaths: ["/health"],
  })
);

// Route handler: services get scoped logger via DI
app.get("/orders/:id", async c => {
  const scope = c.get("scope");
  const orderService = scope.resolve(OrderServicePort);
  // OrderService receives a Logger with { scopeId, correlationId, requestId }

  const order = await orderService.findById(c.req.param("id"));
  return c.json(order);
});
```

### What each layer provides

| Layer             | Adds to context                | Source             |
| ----------------- | ------------------------------ | ------------------ |
| Root logger       | `{ service, environment }`     | Application config |
| Scope creation    | `{ scopeId }`                  | DI scope lifecycle |
| Header extraction | `{ correlationId, requestId }` | HTTP headers       |
| Route handler     | `{ orderId, ... }`             | Application logic  |

The final log entries carry all context layers merged together, providing full request traceability without any manual plumbing.

---

_Previous: [10 - Instrumentation](./10-instrumentation.md) | Next: [12 - Tracing Integration](./12-tracing-integration.md)_
