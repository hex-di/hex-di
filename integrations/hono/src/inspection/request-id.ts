import type { MiddlewareHandler } from "hono";
import { generateSpanId } from "@hex-di/tracing";

/**
 * Options for the request ID middleware.
 */
export interface RequestIdOptions {
  /** HTTP header name to read/write the request ID. Defaults to "X-Request-ID". */
  readonly headerName?: string;
}

/**
 * Middleware that assigns a unique request ID to every request.
 *
 * If the incoming request already carries the configured header, its value is
 * re-used. Otherwise a new 16-character hex ID is generated via
 * {@link generateSpanId}.
 *
 * The ID is:
 * - Stored on the Hono context as `"requestId"`
 * - Echoed back in the configured response header
 *
 * @param options - Optional configuration
 * @returns Hono middleware handler
 */
export function requestIdMiddleware(options?: RequestIdOptions): MiddlewareHandler {
  const headerName = options?.headerName ?? "X-Request-ID";

  return async (context, next) => {
    const existing = context.req.header(headerName);
    const requestId = existing ?? generateSpanId();

    context.set("requestId", requestId);
    context.header(headerName, requestId);

    await next();
  };
}
