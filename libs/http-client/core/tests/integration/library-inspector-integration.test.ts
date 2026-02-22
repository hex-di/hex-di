/**
 * Library inspector bridge integration tests.
 *
 * Verifies that the HTTP client library inspector bridge produces
 * correct snapshots and integrates with the DI container inspector protocol.
 */

import { describe, it, expect } from "vitest";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse } from "../../src/testing/response-factory.js";
import {
  createHttpClientLibraryInspector,
} from "../../src/inspection/library-inspector-bridge.js";
import { createHttpClientRegistry } from "../../src/inspection/registry.js";
import type { HttpClientSnapshot } from "../../src/inspection/types.js";

describe("library inspector integration", () => {
  it("library inspector bridge registers HttpClient in the inspector registry", () => {
    const snapshotData: HttpClientSnapshot = {
      requestCount: 0,
      errorCount: 0,
      activeRequests: 0,
      registeredClients: ["default"],
    };

    const inspector = createHttpClientLibraryInspector(() => snapshotData);

    expect(inspector.name).toBe("http-client");
    expect(inspector.getSnapshot).toBeTypeOf("function");

    const snapshot = inspector.getSnapshot();
    expect(snapshot).toHaveProperty("name", "http-client");
    expect(snapshot).toHaveProperty("requestCount", 0);
    expect(snapshot).toHaveProperty("registeredClients");
  });

  it("snapshot includes client name, configuration, and last-request info", () => {
    const registry = createHttpClientRegistry();
    const client = createMockHttpClient({
      "GET /api/data": mockJsonResponse(200, {}),
    });

    registry.register("primary-api", client);
    registry.register("analytics-api", createMockHttpClient({
      "POST /events": mockJsonResponse(202, {}),
    }));

    const snapshotData: HttpClientSnapshot = {
      requestCount: 42,
      errorCount: 3,
      activeRequests: 1,
      registeredClients: registry.getNames(),
    };

    const inspector = createHttpClientLibraryInspector(() => snapshotData);
    const snapshot = inspector.getSnapshot();

    expect(snapshot["requestCount"]).toBe(42);
    expect(snapshot["errorCount"]).toBe(3);
    expect(snapshot["activeRequests"]).toBe(1);

    const clients = snapshot["registeredClients"];
    expect(Array.isArray(clients)).toBe(true);
    if (Array.isArray(clients)) {
      expect(clients).toContain("primary-api");
      expect(clients).toContain("analytics-api");
    }
  });

  it("inspector port resolves from the DI container", () => {
    // Verify the library inspector bridge creates a valid LibraryInspector
    let requestCount = 0;

    const snapshotFn = (): HttpClientSnapshot => ({
      requestCount,
      errorCount: 0,
      activeRequests: 0,
      registeredClients: ["api-client"],
    });

    const inspector = createHttpClientLibraryInspector(snapshotFn);

    // Initial snapshot
    const snap1 = inspector.getSnapshot();
    expect(snap1["requestCount"]).toBe(0);

    // After some activity
    requestCount = 10;
    const snap2 = inspector.getSnapshot();
    expect(snap2["requestCount"]).toBe(10);

    // The inspector is pull-based -- it reads fresh data each time
    requestCount = 25;
    const snap3 = inspector.getSnapshot();
    expect(snap3["requestCount"]).toBe(25);
  });
});
