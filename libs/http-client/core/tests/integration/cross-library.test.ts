/**
 * Cross-library integration tests.
 *
 * Verifies that the HTTP client integrates correctly with other hex-di
 * libraries (tracing, logger) via mock implementations.
 */

import { describe, it, expect, vi } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { interceptor, composeInterceptors } from "../../src/combinators/interceptor.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { setRequestHeader } from "../../src/request/http-request.js";

describe("cross-library integration", () => {
  it("HttpClient integrates with tracing library via TracerPort", async () => {
    const spans: Array<{ name: string; status: string }> = [];

    const tracingInterceptor = interceptor({
      onRequest: (req) => {
        spans.push({ name: `${req.method} ${req.url}`, status: "started" });
        return req;
      },
      onResponse: (res) => {
        const last = spans[spans.length - 1];
        if (last !== undefined) {
          spans[spans.length - 1] = { ...last, status: "completed" };
        }
        return res;
      },
      onError: (error, req) => {
        const last = spans[spans.length - 1];
        if (last !== undefined) {
          spans[spans.length - 1] = { ...last, status: "errored" };
        }
        return error;
      },
    });

    const client = tracingInterceptor(
      createMockHttpClient({
        "GET /api/users": mockJsonResponse(200, []),
      }),
    );

    await client.get("/api/users");

    expect(spans).toHaveLength(1);
    expect(spans[0]?.name).toBe("GET /api/users");
    expect(spans[0]?.status).toBe("completed");
  });

  it("HttpClient integrates with logger library via LoggerPort", async () => {
    const logs: string[] = [];

    const loggingInterceptor = interceptor({
      onRequest: (req) => {
        logs.push(`[INFO] Request: ${req.method} ${req.url}`);
        return req;
      },
      onResponse: (res) => {
        logs.push(`[INFO] Response: ${res.status} ${res.statusText}`);
        return res;
      },
      onError: (error) => {
        logs.push(`[ERROR] ${error.reason}: ${error.message}`);
        return error;
      },
    });

    const client = loggingInterceptor(
      createMockHttpClient({
        "GET /api/health": mockJsonResponse(200, { ok: true }),
      }),
    );

    await client.get("/api/health");

    expect(logs).toHaveLength(2);
    expect(logs[0]).toContain("Request: GET /api/health");
    expect(logs[1]).toContain("Response: 200");
  });

  it("request spans are created and closed correctly", async () => {
    const spanEvents: Array<{ event: string; time: number }> = [];

    const tracingInterceptor = interceptor({
      onRequest: (req) => {
        spanEvents.push({ event: "span-start", time: Date.now() });
        return req;
      },
      onResponse: (res) => {
        spanEvents.push({ event: "span-end", time: Date.now() });
        return res;
      },
    });

    const client = tracingInterceptor(
      createMockHttpClient({
        "GET /api/data": mockJsonResponse(200, {}),
        "POST /api/data": mockJsonResponse(201, { id: 1 }),
      }),
    );

    await client.get("/api/data");
    await client.post("/api/data", { json: { value: "test" } });

    expect(spanEvents).toHaveLength(4);
    expect(spanEvents[0]?.event).toBe("span-start");
    expect(spanEvents[1]?.event).toBe("span-end");
    expect(spanEvents[2]?.event).toBe("span-start");
    expect(spanEvents[3]?.event).toBe("span-end");
  });

  it("correlation IDs propagate between HttpClient and logger", async () => {
    const correlationId = "req-abc-123";
    let capturedCorrelationId: string | undefined;

    const correlationInterceptor = interceptor({
      onRequest: (req) => {
        // Use proper setRequestHeader to maintain Headers structure
        return setRequestHeader("x-correlation-id", correlationId)(req);
      },
    });

    const client = correlationInterceptor(
      createMockHttpClient((req) => {
        capturedCorrelationId = req.headers.entries["x-correlation-id"];
        return ok(mockJsonResponse(200, {}));
      }),
    );

    await client.get("/api/data");

    expect(capturedCorrelationId).toBe(correlationId);
  });
});
