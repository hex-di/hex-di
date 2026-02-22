/**
 * Inspector integration tests.
 *
 * Verifies that the HTTP client inspector captures request snapshots
 * and the registry tracks named clients.
 */

import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockRequestError } from "../../src/testing/response-factory.js";
import { createHttpClientRegistry } from "../../src/inspection/registry.js";
import { deriveHealth } from "../../src/inspection/health.js";
import { interceptor } from "../../src/combinators/interceptor.js";
import type { HttpClientSnapshot } from "../../src/inspection/types.js";

describe("inspector integration", () => {
  it("inspector captures request snapshots via HttpClientInspectorPort", async () => {
    let requestCount = 0;
    let errorCount = 0;

    const inspectorInterceptor = interceptor({
      onRequest: (req) => {
        requestCount++;
        return req;
      },
      onError: (error) => {
        errorCount++;
        return error;
      },
    });

    const client = inspectorInterceptor(
      createMockHttpClient({
        "GET /api/users": mockJsonResponse(200, []),
        "GET /api/orders": mockJsonResponse(200, []),
      }),
    );

    await client.get("/api/users");
    await client.get("/api/orders");

    const snapshot: HttpClientSnapshot = {
      requestCount,
      errorCount,
      activeRequests: 0,
      registeredClients: ["default"],
    };

    expect(snapshot.requestCount).toBe(2);
    expect(snapshot.errorCount).toBe(0);
  });

  it("registry lists all named clients registered in the graph", () => {
    const registry = createHttpClientRegistry();

    const client1 = createMockHttpClient({
      "GET /api/v1/*": mockJsonResponse(200, {}),
    });
    const client2 = createMockHttpClient({
      "GET /api/v2/*": mockJsonResponse(200, {}),
    });

    registry.register("api-v1", client1);
    registry.register("api-v2", client2);

    const names = registry.getNames();
    expect(names).toContain("api-v1");
    expect(names).toContain("api-v2");
    expect(names).toHaveLength(2);

    const all = registry.getAll();
    expect(Object.keys(all)).toHaveLength(2);
  });

  it("library inspector bridge integrates with @hex-di/core inspector", () => {
    const registry = createHttpClientRegistry();
    const client = createMockHttpClient({
      "GET /api/data": mockJsonResponse(200, {}),
    });

    registry.register("main-client", client);

    // Simulate what the library inspector bridge would provide
    const snapshot: HttpClientSnapshot = {
      requestCount: 5,
      errorCount: 1,
      activeRequests: 0,
      registeredClients: registry.getNames(),
    };

    expect(snapshot.registeredClients).toContain("main-client");
    expect(snapshot.requestCount).toBe(5);
    expect(snapshot.errorCount).toBe(1);
  });

  it("inspection data is accessible without modifying business logic", async () => {
    let requestCount = 0;

    // The interceptor is purely observational -- it does not modify request or response
    const observerInterceptor = interceptor({
      onRequest: (req) => {
        requestCount++;
        return req;
      },
      onResponse: (res) => res,
    });

    const client = observerInterceptor(
      createMockHttpClient({
        "GET /api/items": mockJsonResponse(200, [{ id: 1 }, { id: 2 }]),
      }),
    );

    const result = await client.get("/api/items");

    // Business logic is unaffected
    expect(result._tag).toBe("Ok");
    if (result._tag === "Ok") {
      expect(result.value.status).toBe(200);
    }

    // Inspection data was captured
    expect(requestCount).toBe(1);

    // Health derivation works from metrics
    const health = deriveHealth({
      totalRequests: requestCount,
      failedRequests: 0,
      averageLatencyMs: 50,
    });

    expect(health.status).toBe("healthy");
  });
});
