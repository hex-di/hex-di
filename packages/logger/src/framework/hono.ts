/**
 * Hono framework integration for structured logging.
 *
 * Provides middleware that creates request-scoped child loggers
 * with correlation context extracted from headers.
 *
 * @packageDocumentation
 */

import type { Logger } from "../ports/logger.js";
import type { LogLevel } from "../types/log-level.js";
import { extractContextFromHeaders } from "../utils/context.js";

/**
 * Generates a simple unique request ID from timestamp and random value.
 * Avoids dependency on node:crypto for portability across runtimes.
 */
function generateRequestId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${time}-${random}`;
}

/**
 * Minimal Hono context type for structural compatibility.
 * Avoids importing from hono directly since it's an optional dependency.
 */
export interface HonoContext {
  readonly req: {
    readonly method: string;
    readonly path: string;
    header(name: string): string | undefined;
    readonly url: string;
  };
  readonly res: { readonly status: number };
  set(key: string, value: unknown): void;
  get(key: string): unknown;
}

/**
 * Hono next function type.
 */
export type NextFunction = () => Promise<void>;

/**
 * Hono middleware handler type.
 */
export type MiddlewareHandler = (c: HonoContext, next: NextFunction) => Promise<void>;

/**
 * Configuration options for the logging middleware.
 */
export interface HonoLoggingOptions {
  /** The logger instance to use. */
  readonly logger: Logger;
  /** Default log level for successful requests. Defaults to "info". */
  readonly level?: LogLevel;
  /** Whether to include request body in logs. */
  readonly includeRequestBody?: boolean;
  /** Whether to include response body in logs. */
  readonly includeResponseBody?: boolean;
  /** Header names to redact from logs. */
  readonly redactHeaders?: ReadonlyArray<string>;
  /** URL paths to redact from logs. */
  readonly redactPaths?: ReadonlyArray<string>;
  /** URL paths to skip logging entirely. */
  readonly skipPaths?: ReadonlyArray<string>;
}

/**
 * Determines the log level for a response based on HTTP status code.
 */
function responseLevel(status: number, defaultLevel: LogLevel): LogLevel {
  if (status >= 500) {
    return "error";
  }
  if (status >= 400) {
    return "warn";
  }
  return defaultLevel;
}

/**
 * Creates a Hono middleware that provides request-scoped structured logging.
 *
 * The middleware:
 * 1. Extracts correlation/request IDs from headers
 * 2. Creates a child logger with request context
 * 3. Makes the child logger available via `c.get("logger")`
 * 4. Logs request start and completion with timing
 *
 * @param options - Middleware configuration
 * @returns A Hono middleware handler
 */
export function loggingMiddleware(options: HonoLoggingOptions): MiddlewareHandler {
  const defaultLevel = options.level ?? "info";
  const skipPaths = options.skipPaths ?? [];
  const redactHeaders = new Set((options.redactHeaders ?? []).map(h => h.toLowerCase()));

  return async (c: HonoContext, next: NextFunction): Promise<void> => {
    // Check if this path should be skipped
    if (skipPaths.includes(c.req.path)) {
      await next();
      return;
    }

    // Extract context from headers
    const headers: Record<string, string | undefined> = {};
    headers["x-correlation-id"] = c.req.header("x-correlation-id");
    headers["x-request-id"] = c.req.header("x-request-id");

    // Redact configured headers (store redacted marker for logging)
    const headerAnnotations: Record<string, unknown> = {};
    for (const name of redactHeaders) {
      const value = c.req.header(name);
      if (value !== undefined) {
        headerAnnotations[`header.${name}`] = "[REDACTED]";
      }
    }

    const extractedContext = extractContextFromHeaders(headers);

    // Create child logger with request context
    const childLogger = options.logger.child({
      ...extractedContext,
      requestId: extractedContext.requestId ?? generateRequestId(),
    });

    // Make child logger available on the Hono context
    c.set("logger", childLogger);

    // Log request start
    childLogger[defaultLevel]("Incoming request", {
      method: c.req.method,
      path: c.req.path,
      ...headerAnnotations,
    });

    // Execute downstream handlers and measure duration
    const start = Date.now();
    await next();
    const duration = Date.now() - start;

    // Determine log level based on response status
    const level = responseLevel(c.res.status, defaultLevel);

    // Log response
    childLogger[level]("Request completed", {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
    });
  };
}
