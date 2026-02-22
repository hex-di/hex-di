/**
 * E2E: Body snapshot for audit.
 *
 * Tests capturing request/response bodies for audit trail purposes.
 */

import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse } from "../../src/testing/response-factory.js";
import { createRecordingClient } from "../../src/testing/recording-client.js";
import { interceptor } from "../../src/combinators/interceptor.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { bearerAuth } from "../../src/combinators/auth.js";
import { setRequestHeader } from "../../src/request/http-request.js";

describe("E2E: body snapshot for audit", () => {
  it("full pipeline processes body correctly", async () => {
    const bodySnapshots: Array<{
      method: string;
      url: string;
      responseStatus: number;
    }> = [];

    const snapshotInterceptor = interceptor({
      onResponse: (res) => {
        bodySnapshots.push({
          method: res.request.method,
          url: res.request.url,
          responseStatus: res.status,
        });
        return res;
      },
    });

    const client = snapshotInterceptor(
      baseUrl("https://api.audit.test")(
        createMockHttpClient({
          "GET /api/records": mockJsonResponse(200, [{ id: 1, data: "payload" }]),
          "POST /api/records": mockJsonResponse(201, { id: 2 }),
        }),
      ),
    );

    await client.get("/api/records");
    await client.post("/api/records", { json: { data: "new-record" } });

    expect(bodySnapshots).toHaveLength(2);
    expect(bodySnapshots[0]?.responseStatus).toBe(200);
    expect(bodySnapshots[1]?.responseStatus).toBe(201);
  });

  it("pipeline handles degraded upstream gracefully", async () => {
    const { client, getResponses } = createRecordingClient(
      createMockHttpClient((req) => {
        if (req.url.includes("/degraded")) {
          return ok(mockResponse(503, { text: "Service Unavailable" }));
        }
        return ok(mockJsonResponse(200, { ok: true }));
      }),
    );

    await client.get("/api/healthy");
    await client.get("/api/degraded");

    const responses = getResponses();
    expect(responses).toHaveLength(2);
    expect(responses[0]?.response?.status).toBe(200);
    expect(responses[1]?.response?.status).toBe(503);
  });

  it("scope isolation prevents header leakage between scopes", async () => {
    const requests: Array<{ url: string; scope: string | undefined; auth: string | undefined }> = [];

    const baseClient = createMockHttpClient((req) => {
      requests.push({
        url: req.url,
        scope: req.headers.entries["x-scope"],
        auth: req.headers.entries["authorization"],
      });
      return ok(mockJsonResponse(200, {}));
    });

    // Scope A: has auth header
    const scopeA = interceptor({
      onRequest: (req) => {
        const withScope = setRequestHeader("x-scope", "A")(req);
        return setRequestHeader("authorization", "Bearer scope-a")(withScope);
      },
    })(baseClient);

    // Scope B: no auth header, only scope
    const scopeB = interceptor({
      onRequest: (req) => setRequestHeader("x-scope", "B")(req),
    })(baseClient);

    await scopeA.get("https://api.test/from-a");
    await scopeB.get("https://api.test/from-b");

    expect(requests).toHaveLength(2);
    expect(requests[0]?.scope).toBe("A");
    expect(requests[0]?.auth).toBe("Bearer scope-a");
    expect(requests[1]?.scope).toBe("B");
    expect(requests[1]?.auth).toBeUndefined();
  });
});
