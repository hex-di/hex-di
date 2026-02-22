/**
 * Framework integration tests - Hono middleware.
 *
 * Tests 1-7: Hono logging middleware behavior.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { loggingMiddleware } from "../src/framework/hono.js";
import type { HonoContext, NextFunction } from "../src/framework/hono.js";
import { createMemoryLogger } from "../src/adapters/memory/logger.js";

// =============================================================================
// Mock Helpers
// =============================================================================

function createMockHonoContext(overrides?: {
  method?: string;
  path?: string;
  url?: string;
  status?: number;
  headers?: Record<string, string>;
}): HonoContext {
  const method = overrides?.method ?? "GET";
  const path = overrides?.path ?? "/api/test";
  const url = overrides?.url ?? `http://localhost${path}`;
  const status = overrides?.status ?? 200;
  const headers = overrides?.headers ?? {};
  const store = new Map<string, unknown>();

  return {
    req: {
      method,
      path,
      url,
      header(name: string): string | undefined {
        return headers[name.toLowerCase()];
      },
    },
    res: { status },
    set(key: string, value: unknown): void {
      store.set(key, value);
    },
    get(key: string): unknown {
      return store.get(key);
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("Hono loggingMiddleware", () => {
  let logger: ReturnType<typeof createMemoryLogger>;

  beforeEach(() => {
    logger = createMemoryLogger();
  });

  it("creates child logger with request context", async () => {
    const middleware = loggingMiddleware({ logger });
    const ctx = createMockHonoContext({
      headers: {
        "x-correlation-id": "corr-123",
        "x-request-id": "req-456",
      },
    });
    const next: NextFunction = async () => {};

    await middleware(ctx, next);

    // The child logger should have been set on the context
    const childLogger = ctx.get("logger");
    expect(childLogger).toBeDefined();

    // Verify the child logger has the extracted context via the shared entries
    // The child logger writes to the same entries array as the parent
    const entries = logger.getEntries();
    const entry = entries.find(e => e.message === "Incoming request");
    expect(entry).toBeDefined();
    expect(entry?.context.correlationId).toBe("corr-123");
    expect(entry?.context.requestId).toBe("req-456");
  });

  it("logs request start with method and path", async () => {
    const middleware = loggingMiddleware({ logger });
    const ctx = createMockHonoContext({
      method: "POST",
      path: "/api/users",
    });
    const next: NextFunction = async () => {};

    await middleware(ctx, next);

    const entries = logger.getEntries();
    const startEntry = entries.find(e => e.message === "Incoming request");
    expect(startEntry).toBeDefined();
    expect(startEntry?.annotations.method).toBe("POST");
    expect(startEntry?.annotations.path).toBe("/api/users");
    expect(startEntry?.level).toBe("info");
  });

  it("logs response with status and duration", async () => {
    const middleware = loggingMiddleware({ logger });
    const ctx = createMockHonoContext({ status: 200 });
    const next: NextFunction = async () => {};

    await middleware(ctx, next);

    const entries = logger.getEntries();
    const responseEntry = entries.find(e => e.message === "Request completed");
    expect(responseEntry).toBeDefined();
    expect(responseEntry?.annotations.status).toBe(200);
    expect(typeof responseEntry?.annotations.duration).toBe("number");
  });

  it("skips paths in skipPaths config", async () => {
    const middleware = loggingMiddleware({
      logger,
      skipPaths: ["/health", "/metrics"],
    });
    const ctx = createMockHonoContext({ path: "/health" });
    let nextCalled = false;
    const next: NextFunction = async () => {
      nextCalled = true;
    };

    await middleware(ctx, next);

    expect(nextCalled).toBe(true);
    expect(logger.getEntries()).toHaveLength(0);
  });

  it("redacts configured headers", async () => {
    const middleware = loggingMiddleware({
      logger,
      redactHeaders: ["authorization"],
    });
    const ctx = createMockHonoContext({
      headers: {
        authorization: "Bearer secret-token",
      },
    });
    const next: NextFunction = async () => {};

    await middleware(ctx, next);

    const entries = logger.getEntries();
    const startEntry = entries.find(e => e.message === "Incoming request");
    expect(startEntry).toBeDefined();
    expect(startEntry?.annotations["header.authorization"]).toBe("[REDACTED]");
  });

  it("uses warn level for 4xx status", async () => {
    const middleware = loggingMiddleware({ logger });
    const ctx = createMockHonoContext({ status: 404 });
    const next: NextFunction = async () => {};

    await middleware(ctx, next);

    const entries = logger.getEntries();
    const responseEntry = entries.find(e => e.message === "Request completed");
    expect(responseEntry).toBeDefined();
    expect(responseEntry?.level).toBe("warn");
  });

  it("uses error level for 5xx status", async () => {
    const middleware = loggingMiddleware({ logger });
    const ctx = createMockHonoContext({ status: 503 });
    const next: NextFunction = async () => {};

    await middleware(ctx, next);

    const entries = logger.getEntries();
    const responseEntry = entries.find(e => e.message === "Request completed");
    expect(responseEntry).toBeDefined();
    expect(responseEntry?.level).toBe("error");
  });
});
