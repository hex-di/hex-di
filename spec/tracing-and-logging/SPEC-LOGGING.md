# @hex-di/logging Specification

## Overview

A structured logging package for HexDi that provides context-aware, type-safe logging with multiple backend support. Inspired by Effect's logging system with first-class DI integration.

## Goals

1. **Effect-TS-like API** - Familiar patterns for Effect users
2. **Structured by default** - JSON-ready log entries with metadata
3. **Context propagation** - Automatic inclusion of request context, correlation IDs
4. **Multiple backends** - Pino, Winston, Bunyan, Console adapters
5. **Request-scoped loggers** - Child loggers with scope-specific context
6. **Zero overhead option** - No-op implementation for production scenarios
7. **Type-safe** - Full TypeScript inference, no `any` types
8. **Tracing integration** - Automatic span correlation when tracing enabled

## Architecture

### Package Structure

```
packages/logging/
├── src/
│   ├── index.ts                    # Public API exports
│   ├── ports/
│   │   ├── logger.ts               # Logger port definition
│   │   ├── log-handler.ts          # Log handler port
│   │   └── log-formatter.ts        # Formatter port
│   ├── adapters/
│   │   ├── noop/                   # Zero-cost no-op implementation
│   │   ├── memory/                 # In-memory for testing
│   │   └── console/                # Console output (development)
│   ├── context/
│   │   ├── log-context.ts          # Logging context variable
│   │   └── annotations.ts          # Log annotations system
│   ├── instrumentation/
│   │   ├── auto.ts                 # Automatic DI logging
│   │   └── hooks.ts                # Resolution hook integration
│   └── utils/
│       ├── formatting.ts           # Log formatting utilities
│       └── redaction.ts            # Sensitive data redaction
├── tests/
└── package.json
```

### Separate Backend Packages

```
packages/logging-pino/              # Pino adapter
packages/logging-winston/           # Winston adapter
packages/logging-bunyan/            # Bunyan adapter
```

## Core Types

### Log Levels

```typescript
/**
 * Log level severity (numeric for comparison)
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Numeric log level values
 */
export const LogLevelValue: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
} as const;

/**
 * Check if a level should be logged
 */
export function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LogLevelValue[level] >= LogLevelValue[minLevel];
}
```

### Log Entry

```typescript
/**
 * Structured log entry
 */
export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: number;
  readonly context: LogContext;
  readonly annotations: Readonly<Record<string, unknown>>;
  readonly error?: Error;
  readonly spans?: ReadonlyArray<{
    readonly traceId: string;
    readonly spanId: string;
  }>;
}

/**
 * Log context carrying request-scoped data
 */
export interface LogContext {
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly scopeId?: string;
  readonly service?: string;
  readonly environment?: string;
  readonly [key: string]: unknown;
}
```

### Logger Port

```typescript
import { createPort, type Port } from "@hex-di/core";

/**
 * Logger interface for structured logging
 */
export interface Logger {
  /**
   * Log at trace level
   */
  trace(message: string, annotations?: Record<string, unknown>): void;

  /**
   * Log at debug level
   */
  debug(message: string, annotations?: Record<string, unknown>): void;

  /**
   * Log at info level
   */
  info(message: string, annotations?: Record<string, unknown>): void;

  /**
   * Log at warn level
   */
  warn(message: string, annotations?: Record<string, unknown>): void;

  /**
   * Log at error level
   */
  error(message: string, annotations?: Record<string, unknown>): void;
  error(message: string, error: Error, annotations?: Record<string, unknown>): void;

  /**
   * Log at fatal level
   */
  fatal(message: string, annotations?: Record<string, unknown>): void;
  fatal(message: string, error: Error, annotations?: Record<string, unknown>): void;

  /**
   * Create a child logger with additional context
   */
  child(context: Partial<LogContext>): Logger;

  /**
   * Create a child logger with annotations
   */
  withAnnotations(annotations: Record<string, unknown>): Logger;

  /**
   * Check if a level is enabled
   */
  isLevelEnabled(level: LogLevel): boolean;

  /**
   * Get current log context
   */
  getContext(): LogContext;

  /**
   * Time an operation and log duration
   */
  time<T>(name: string, fn: () => T): T;
  timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

/**
 * Logger port for DI registration
 */
export const LoggerPort = createPort<Logger>("Logger");
```

### Log Handler Port

```typescript
import { createPort } from "@hex-di/core";

/**
 * Handler that processes log entries
 */
export interface LogHandler {
  /**
   * Handle a log entry
   */
  handle(entry: LogEntry): void;

  /**
   * Flush pending log entries
   */
  flush(): Promise<void>;

  /**
   * Shutdown handler
   */
  shutdown(): Promise<void>;
}

export const LogHandlerPort = createPort<LogHandler>("LogHandler");
```

### Log Formatter Port

```typescript
import { createPort } from "@hex-di/core";

/**
 * Formatter for log entries
 */
export interface LogFormatter {
  /**
   * Format a log entry to string
   */
  format(entry: LogEntry): string;
}

export const LogFormatterPort = createPort<LogFormatter>("LogFormatter");

/**
 * Built-in formatters
 */
export type FormatterType = "json" | "pretty" | "minimal";
```

## Context Propagation

### Log Context Variable

```typescript
import { createContextVariable } from "@hex-di/core";

/**
 * Current log context for propagation
 */
export const LogContextVar = createContextVariable<LogContext>("hex-di/log-context", {});

/**
 * Current annotations for propagation
 */
export const LogAnnotationsVar = createContextVariable<Record<string, unknown>>(
  "hex-di/log-annotations",
  {}
);
```

### Context Utilities

```typescript
/**
 * Merge context with new values
 */
export function mergeContext(base: LogContext, override: Partial<LogContext>): LogContext;

/**
 * Extract context from request headers
 */
export function extractContextFromHeaders(
  headers: Record<string, string | undefined>
): Partial<LogContext>;

/**
 * Standard header names
 */
export const CORRELATION_ID_HEADER = "x-correlation-id";
export const REQUEST_ID_HEADER = "x-request-id";
```

## Automatic Instrumentation

### DI Resolution Logging

```typescript
import type { Container } from "@hex-di/runtime";

/**
 * Options for automatic logging
 */
export interface AutoLogOptions {
  /**
   * Log level for resolution events
   */
  readonly resolutionLevel?: LogLevel;

  /**
   * Log level for errors
   */
  readonly errorLevel?: LogLevel;

  /**
   * Filter which ports to log
   */
  readonly portFilter?: (portName: string) => boolean;

  /**
   * Include timing information
   */
  readonly includeTiming?: boolean;

  /**
   * Minimum duration (ms) to log (skip fast resolutions)
   */
  readonly minDurationMs?: number;

  /**
   * Log scope lifecycle events
   */
  readonly logScopeLifecycle?: boolean;
}

/**
 * Enable automatic logging of DI resolutions
 */
export function instrumentContainer(
  container: Container,
  logger: Logger,
  options?: AutoLogOptions
): () => void; // Returns cleanup function
```

### Hook-Based Integration

```typescript
import type { ResolutionHook } from "@hex-di/runtime";

/**
 * Create a resolution hook that logs resolutions
 */
export function createLoggingHook(logger: Logger, options?: AutoLogOptions): ResolutionHook;
```

## Adapters

### No-Op Adapter (Zero Cost)

```typescript
import { createAdapter } from "@hex-di/core";

/**
 * No-op logger that does nothing
 * Zero runtime overhead when logging is disabled
 */
export const NoOpLoggerAdapter = createAdapter({
  port: LoggerPort,
  factory: () => noOpLogger,
  lifetime: "singleton",
});

const noOpLogger: Logger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => noOpLogger,
  withAnnotations: () => noOpLogger,
  isLevelEnabled: () => false,
  getContext: () => ({}),
  time: (_, fn) => fn(),
  timeAsync: (_, fn) => fn(),
};
```

### Memory Adapter (Testing)

```typescript
/**
 * In-memory logger that collects entries for assertions
 */
export interface MemoryLogger extends Logger {
  getEntries(): ReadonlyArray<LogEntry>;
  getEntriesByLevel(level: LogLevel): ReadonlyArray<LogEntry>;
  clear(): void;
  findEntry(predicate: (entry: LogEntry) => boolean): LogEntry | undefined;
}

export const MemoryLoggerAdapter = createAdapter({
  port: LoggerPort,
  factory: (): MemoryLogger => {
    const entries: LogEntry[] = [];
    // ... implementation
    return memoryLogger;
  },
  lifetime: "singleton",
});
```

### Console Adapter (Development)

```typescript
/**
 * Console logger options
 */
export interface ConsoleLoggerOptions {
  readonly level?: LogLevel;
  readonly colorize?: boolean;
  readonly includeTimestamp?: boolean;
  readonly formatter?: FormatterType | LogFormatter;
  readonly prettyPrint?: boolean;
}

export const ConsoleLoggerAdapter = createAdapter({
  port: LoggerPort,
  factory: (options: ConsoleLoggerOptions = {}) => {
    // ... implementation
  },
  lifetime: "singleton",
});
```

### Scoped Logger Adapter

```typescript
/**
 * Logger that automatically includes scope context
 */
export const ScopedLoggerAdapter = createAdapter({
  port: LoggerPort,
  requires: [LogHandlerPort],
  factory: (deps, scope) => {
    const baseLogger = createLogger(deps.logHandler);
    return baseLogger.child({
      scopeId: scope?.id,
    });
  },
  lifetime: "scoped", // New logger per scope
});
```

## Framework Integration

### Hono Middleware

```typescript
import type { MiddlewareHandler } from "hono";

/**
 * Logging middleware for Hono
 */
export interface HonoLoggingOptions {
  readonly logger: Logger;
  readonly level?: LogLevel;
  readonly includeRequestBody?: boolean;
  readonly includeResponseBody?: boolean;
  readonly redactHeaders?: string[];
  readonly redactPaths?: string[];
  readonly skipPaths?: string[];
}

export function loggingMiddleware(options: HonoLoggingOptions): MiddlewareHandler;

/**
 * Request logging with automatic context
 */
export function requestLoggingMiddleware(options: HonoLoggingOptions): MiddlewareHandler;
```

### React Integration

```typescript
import type { ReactNode } from "react";

/**
 * Provider that establishes log context for React tree
 */
export interface LoggingProviderProps {
  readonly logger: Logger;
  readonly context?: Partial<LogContext>;
  readonly children: ReactNode;
}

export function LoggingProvider(props: LoggingProviderProps): ReactNode;

/**
 * Hook to access logger in components
 */
export function useLogger(): Logger;

/**
 * Hook to create child logger with component context
 */
export function useChildLogger(context: Partial<LogContext>): Logger;

/**
 * Hook to log component lifecycle
 */
export function useLifecycleLogger(componentName: string): void;
```

## Backend Packages

### @hex-di/logging-pino

```typescript
import { LogHandlerPort, type LogEntry } from "@hex-di/logging";
import pino from "pino";

export interface PinoHandlerOptions {
  readonly destination?: pino.DestinationStream;
  readonly level?: string;
  readonly prettyPrint?: boolean | pino.PrettyOptions;
  readonly redact?: string[];
  readonly base?: Record<string, unknown>;
  readonly transport?: pino.TransportSingleOptions;
}

export const PinoHandlerAdapter = createAdapter({
  port: LogHandlerPort,
  factory: (options: PinoHandlerOptions = {}) => {
    const logger = pino(options);
    return {
      handle: (entry: LogEntry) => {
        const pinoLevel = mapLevel(entry.level);
        logger[pinoLevel](
          {
            ...entry.context,
            ...entry.annotations,
            err: entry.error,
          },
          entry.message
        );
      },
      flush: async () => {
        /* pino auto-flushes */
      },
      shutdown: async () => {
        logger.flush();
      },
    };
  },
  lifetime: "singleton",
});

/**
 * Create a Logger backed by Pino
 */
export const PinoLoggerAdapter = createAdapter({
  port: LoggerPort,
  requires: [PinoHandlerAdapter],
  factory: deps => createLogger(deps.pinoHandler),
  lifetime: "singleton",
});
```

### @hex-di/logging-winston

```typescript
import { LogHandlerPort } from "@hex-di/logging";
import winston from "winston";

export interface WinstonHandlerOptions {
  readonly level?: string;
  readonly format?: winston.Logform.Format;
  readonly transports?: winston.transport[];
  readonly defaultMeta?: Record<string, unknown>;
}

export const WinstonHandlerAdapter = createAdapter({
  port: LogHandlerPort,
  factory: (options: WinstonHandlerOptions = {}) => {
    const logger = winston.createLogger({
      level: options.level ?? "info",
      format: options.format ?? winston.format.json(),
      transports: options.transports ?? [new winston.transports.Console()],
      defaultMeta: options.defaultMeta,
    });

    return {
      handle: entry => {
        logger.log({
          level: entry.level,
          message: entry.message,
          ...entry.context,
          ...entry.annotations,
          error: entry.error,
          timestamp: entry.timestamp,
        });
      },
      flush: async () => {
        await new Promise<void>(resolve => {
          logger.on("finish", resolve);
          logger.end();
        });
      },
      shutdown: async () => {
        await logger.close();
      },
    };
  },
  lifetime: "singleton",
});
```

### @hex-di/logging-bunyan

```typescript
import { LogHandlerPort } from "@hex-di/logging";
import bunyan from "bunyan";

export interface BunyanHandlerOptions {
  readonly name: string;
  readonly level?: bunyan.LogLevel;
  readonly streams?: bunyan.Stream[];
  readonly serializers?: bunyan.Serializers;
}

export const BunyanHandlerAdapter = createAdapter({
  port: LogHandlerPort,
  factory: (options: BunyanHandlerOptions) => {
    const logger = bunyan.createLogger(options);

    return {
      handle: entry => {
        const bunyanLevel = mapLevel(entry.level);
        logger[bunyanLevel](
          {
            ...entry.context,
            ...entry.annotations,
            err: entry.error,
          },
          entry.message
        );
      },
      flush: async () => {
        /* bunyan auto-flushes */
      },
      shutdown: async () => {
        logger.close();
      },
    };
  },
  lifetime: "singleton",
});
```

## Usage Examples

### Basic Usage

```typescript
import { LoggerPort, ConsoleLoggerAdapter } from "@hex-di/logging";
import { createGraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

const graph = createGraphBuilder().provide(ConsoleLoggerAdapter).build();

const container = createContainer(graph);
const logger = container.resolve(LoggerPort);

// Basic logging
logger.info("Application started");
logger.debug("Processing request", { requestId: "123" });
logger.error("Failed to process", new Error("Something went wrong"));

// Child logger with context
const requestLogger = logger.child({
  correlationId: "abc-123",
  userId: "user-456",
});

requestLogger.info("Processing order"); // Includes correlationId and userId

// Timed operations
const result = logger.time("database-query", () => {
  return database.query("SELECT * FROM users");
});
// Logs: "database-query completed" with duration
```

### With Annotations

```typescript
const logger = container.resolve(LoggerPort);

// Add persistent annotations
const orderLogger = logger.withAnnotations({
  orderId: "12345",
  customerId: "67890",
});

orderLogger.info("Order created");
// Output: { message: "Order created", orderId: "12345", customerId: "67890", ... }

orderLogger.info("Payment processed", { amount: 99.99 });
// Output: { message: "Payment processed", orderId: "12345", customerId: "67890", amount: 99.99, ... }
```

### Automatic DI Instrumentation

```typescript
import { instrumentContainer, LoggerPort } from "@hex-di/logging";

const container = createContainer(graph);
const logger = container.resolve(LoggerPort);

// Enable automatic logging
const cleanup = instrumentContainer(container, logger, {
  resolutionLevel: "debug",
  includeTiming: true,
  logScopeLifecycle: true,
  minDurationMs: 1, // Only log resolutions > 1ms
});

// All subsequent resolutions are logged
const userService = container.resolve(UserServicePort);
// Logs: "Resolved UserService" { lifetime: "singleton", cached: false, duration: 5 }

cleanup();
```

### With Hono

```typescript
import { Hono } from "hono";
import { hexDiMiddleware } from "@hex-di/hono";
import { loggingMiddleware, LoggerPort } from "@hex-di/logging";

const app = new Hono();

app.use("*", hexDiMiddleware({ container }));
app.use(
  "*",
  loggingMiddleware({
    logger: container.resolve(LoggerPort),
    level: "info",
    redactHeaders: ["authorization", "cookie"],
    skipPaths: ["/health", "/metrics"],
  })
);

app.get("/users/:id", async c => {
  const logger = c.get("logger");
  logger.info("Fetching user", { userId: c.req.param("id") });
  // ...
});
```

### With Tracing Integration

```typescript
import { LoggerPort } from "@hex-di/logging";
import { TracerPort } from "@hex-di/tracing";

const graph = createGraphBuilder().provide(PinoLoggerAdapter).provide(ConsoleTracerAdapter).build();

const container = createContainer(graph);
const logger = container.resolve(LoggerPort);
const tracer = container.resolve(TracerPort);

// Logger automatically includes trace context when available
tracer.withSpan("process-order", span => {
  logger.info("Processing order");
  // Output includes: { traceId: "...", spanId: "...", message: "Processing order" }
});
```

### Request-Scoped Logging

```typescript
import { ScopedLoggerAdapter, LoggerPort } from "@hex-di/logging";

const graph = createGraphBuilder()
  .provide(ScopedLoggerAdapter) // scoped lifetime
  .provide(PinoHandlerAdapter)
  .build();

// In Hono middleware
app.use("*", async (c, next) => {
  const scope = c.get("scope");
  const logger = scope.resolve(LoggerPort); // Gets scoped logger

  // Logger automatically has scope context
  logger.info("Handling request"); // Includes scopeId

  c.set("logger", logger);
  await next();
});
```

## Sensitive Data Redaction

```typescript
/**
 * Redaction configuration
 */
export interface RedactionConfig {
  readonly paths: string[];
  readonly censor?: string | ((value: unknown) => unknown);
}

/**
 * Create a redacting logger wrapper
 */
export function withRedaction(logger: Logger, config: RedactionConfig): Logger;

// Usage
const redactedLogger = withRedaction(logger, {
  paths: ["password", "creditCard", "ssn", "*.secret"],
  censor: "[REDACTED]",
});

redactedLogger.info("User login", {
  username: "john",
  password: "secret123", // Will be logged as "[REDACTED]"
});
```

## Testing Utilities

```typescript
import { MemoryLoggerAdapter, assertLogEntry } from "@hex-di/logging/testing";

describe("MyService", () => {
  it("logs operations", async () => {
    const logger = createMemoryLogger();

    const service = new MyService(logger);
    await service.doSomething();

    const entries = logger.getEntries();
    expect(entries).toHaveLength(1);

    assertLogEntry(entries[0], {
      level: "info",
      message: "Operation completed",
      annotations: { operationType: "something" },
    });
  });

  it("logs errors correctly", async () => {
    const logger = createMemoryLogger();

    const service = new MyService(logger);
    await expect(service.failingOperation()).rejects.toThrow();

    const errorEntries = logger.getEntriesByLevel("error");
    expect(errorEntries).toHaveLength(1);
    expect(errorEntries[0].error).toBeInstanceOf(Error);
  });
});
```

## Performance Considerations

1. **Lazy Evaluation** - Log message formatting only when level enabled
2. **Batched Writing** - Backend handlers batch writes for performance
3. **Async by Default** - Non-blocking log writes
4. **Level Checks** - Fast path for disabled levels
5. **Object Reuse** - Minimize allocations in hot paths

## Log Sampling

```typescript
/**
 * Sampling configuration
 */
export interface SamplingConfig {
  readonly rate: number; // 0.0 to 1.0
  readonly perLevel?: Partial<Record<LogLevel, number>>;
  readonly alwaysLogErrors?: boolean;
}

/**
 * Create a sampling logger wrapper
 */
export function withSampling(logger: Logger, config: SamplingConfig): Logger;

// Usage
const sampledLogger = withSampling(logger, {
  rate: 0.1, // Log 10% of messages
  perLevel: {
    error: 1.0, // Always log errors
    warn: 0.5, // Log 50% of warnings
  },
  alwaysLogErrors: true,
});
```

## Dependencies

### @hex-di/logging (core)

- `@hex-di/core` (peer)
- `@hex-di/runtime` (peer)
- No external dependencies

### @hex-di/logging-pino

- `@hex-di/logging` (peer)
- `pino`
- `pino-pretty` (optional)

### @hex-di/logging-winston

- `@hex-di/logging` (peer)
- `winston`

### @hex-di/logging-bunyan

- `@hex-di/logging` (peer)
- `bunyan`
