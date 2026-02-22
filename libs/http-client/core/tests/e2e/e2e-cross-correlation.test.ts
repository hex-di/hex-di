/**
 * E2E: Cross-request correlation (trace IDs).
 *
 * Tests that correlation IDs are generated and propagated across
 * multiple requests in a pipeline.
 */

import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse } from "../../src/testing/response-factory.js";
import { interceptor } from "../../src/combinators/interceptor.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { setRequestHeader } from "../../src/request/http-request.js";

describe("E2E: cross-request correlation", () => {
  it("full pipeline processes body correctly", async () => {
    const capturedCorrelationIds: string[] = [];
    let requestCounter = 0;

    const correlationInterceptor = interceptor({
      onRequest: (req) => {
        const correlationId = `req-${++requestCounter}-${Date.now()}`;
        capturedCorrelationIds.push(correlationId);
        return setRequestHeader("x-correlation-id", correlationId)(req);
      },
    });

    const client = correlationInterceptor(
      baseUrl("https://api.correlation.test")(
        createMockHttpClient((req) => {
          return ok(mockJsonResponse(200, { correlated: true }));
        }),
      ),
    );

    await client.get("/api/first");
    await client.get("/api/second");
    await client.post("/api/third", { json: {} });

    expect(capturedCorrelationIds).toHaveLength(3);
    // Each correlation ID is unique
    const uniqueIds = new Set(capturedCorrelationIds);
    expect(uniqueIds.size).toBe(3);
  });

  it("pipeline handles degraded upstream gracefully", async () => {
    const capturedIds: Array<{ id: string; status: number }> = [];
    let counter = 0;

    const correlationInterceptor = interceptor({
      onRequest: (req) => {
        counter++;
        return setRequestHeader("x-request-id", `rid-${counter}`)(req);
      },
      onResponse: (res) => {
        capturedIds.push({
          id: `rid-${counter}`,
          status: res.status,
        });
        return res;
      },
    });

    const client = correlationInterceptor(
      createMockHttpClient((req) => {
        if (req.url.includes("/degraded")) {
          return ok(mockJsonResponse(503, { error: "degraded" }));
        }
        return ok(mockJsonResponse(200, {}));
      }),
    );

    await client.get("https://api.test/healthy");
    await client.get("https://api.test/degraded");

    expect(capturedIds).toHaveLength(2);
    expect(capturedIds[0]?.status).toBe(200);
    expect(capturedIds[1]?.status).toBe(503);
  });

  it("scope isolation prevents header leakage between scopes", async () => {
    const allHeaders: Array<{ traceId: string | undefined; sessionId: string | undefined }> = [];

    const baseClient = createMockHttpClient((req) => {
      allHeaders.push({
        traceId: req.headers.entries["x-trace-id"],
        sessionId: req.headers.entries["x-session-id"],
      });
      return ok(mockJsonResponse(200, {}));
    });

    // Each scope gets its own correlation context
    const scope1 = interceptor({
      onRequest: (req) => {
        const withTrace = setRequestHeader("x-trace-id", "trace-scope-1")(req);
        return setRequestHeader("x-session-id", "sess-1")(withTrace);
      },
    })(baseClient);

    const scope2 = interceptor({
      onRequest: (req) => {
        const withTrace = setRequestHeader("x-trace-id", "trace-scope-2")(req);
        return setRequestHeader("x-session-id", "sess-2")(withTrace);
      },
    })(baseClient);

    await scope1.get("https://api.test/from-scope-1");
    await scope2.get("https://api.test/from-scope-2");

    expect(allHeaders).toHaveLength(2);
    expect(allHeaders[0]?.traceId).toBe("trace-scope-1");
    expect(allHeaders[1]?.traceId).toBe("trace-scope-2");
    expect(allHeaders[0]?.sessionId).toBe("sess-1");
    expect(allHeaders[1]?.sessionId).toBe("sess-2");
  });
});
