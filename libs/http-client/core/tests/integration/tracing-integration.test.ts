/**
 * Tracing integration tests.
 *
 * Verifies that tracing spans are correctly created, closed, and that
 * trace context propagates via W3C Trace Context headers.
 */

import { describe, it, expect, vi } from "vitest";
import { ok, err } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { interceptor } from "../../src/combinators/interceptor.js";
import { setRequestHeader } from "../../src/request/http-request.js";

describe("tracing integration", () => {
  it("HTTP requests create a child span under the active trace", async () => {
    const activeSpans: Array<{ name: string; parentId: string; endTime: number | undefined }> = [];
    const parentTraceId = "trace-root-001";

    const tracingInterceptor = interceptor({
      onRequest: (req) => {
        activeSpans.push({
          name: `HTTP ${req.method} ${req.url}`,
          parentId: parentTraceId,
          endTime: undefined,
        });
        return req;
      },
      onResponse: (res) => {
        const current = activeSpans[activeSpans.length - 1];
        if (current !== undefined) {
          activeSpans[activeSpans.length - 1] = { ...current, endTime: Date.now() };
        }
        return res;
      },
    });

    const client = tracingInterceptor(
      createMockHttpClient({
        "GET /api/users": mockJsonResponse(200, []),
      }),
    );

    await client.get("/api/users");

    expect(activeSpans).toHaveLength(1);
    expect(activeSpans[0]?.name).toContain("HTTP GET");
    expect(activeSpans[0]?.parentId).toBe(parentTraceId);
  });

  it("span is closed on response receipt", async () => {
    let spanOpen = false;
    let spanClosed = false;

    const tracingInterceptor = interceptor({
      onRequest: (req) => {
        spanOpen = true;
        spanClosed = false;
        return req;
      },
      onResponse: (res) => {
        spanClosed = true;
        return res;
      },
    });

    const client = tracingInterceptor(
      createMockHttpClient({
        "GET /api/data": mockJsonResponse(200, {}),
      }),
    );

    await client.get("/api/data");

    expect(spanOpen).toBe(true);
    expect(spanClosed).toBe(true);
  });

  it("span is closed on error", async () => {
    let spanOpen = false;
    let spanClosedWithError = false;

    const tracingInterceptor = interceptor({
      onRequest: (req) => {
        spanOpen = true;
        return req;
      },
      onError: (error) => {
        spanClosedWithError = true;
        return error;
      },
    });

    const client = tracingInterceptor(
      createMockHttpClient((req) =>
        err(mockRequestError("Transport", "Connection failed", req)),
      ),
    );

    await client.get("/api/failing");

    expect(spanOpen).toBe(true);
    expect(spanClosedWithError).toBe(true);
  });

  it("trace context is propagated via W3C Trace Context headers", async () => {
    let capturedTraceparent: string | undefined;
    let capturedTracestate: string | undefined;

    const traceId = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const traceState = "congo=t61rcWkgMzE";

    const w3cTracingInterceptor = interceptor({
      onRequest: (req) => {
        // Use proper header setters to maintain Headers structure
        const withTraceparent = setRequestHeader("traceparent", traceId)(req);
        return setRequestHeader("tracestate", traceState)(withTraceparent);
      },
    });

    const client = w3cTracingInterceptor(
      createMockHttpClient((req) => {
        capturedTraceparent = req.headers.entries["traceparent"];
        capturedTracestate = req.headers.entries["tracestate"];
        return ok(mockJsonResponse(200, {}));
      }),
    );

    await client.get("/api/traced");

    expect(capturedTraceparent).toBe(traceId);
    expect(capturedTracestate).toBe(traceState);
  });
});
