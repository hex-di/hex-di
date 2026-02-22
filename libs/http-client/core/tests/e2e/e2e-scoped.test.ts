import { describe, it, expect } from "vitest";
import { ok } from "@hex-di/result";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse } from "../../src/testing/response-factory.js";
import { createScopedClient } from "../../src/context/scoped-http-client.js";
import type { HttpRequest } from "../../src/request/http-request.js";

describe("E2E: scoped client", () => {
  it("scoped client injects correlation-id into all requests", async () => {
    const captured: HttpRequest[] = [];
    const mock = createMockHttpClient((req) => {
      captured.push(req);
      return ok(mockJsonResponse(200, {}));
    });

    const scoped = createScopedClient(mock, {
      correlationId: "e2e-test-id",
      tenantId: "tenant-abc",
    });

    await scoped.get("https://api.example.com/resources");
    await scoped.post("https://api.example.com/items");

    for (const req of captured) {
      expect(req.headers.entries["x-correlation-id"]).toBe("e2e-test-id");
      expect(req.headers.entries["x-tenant-id"]).toBe("tenant-abc");
    }
  });
});
