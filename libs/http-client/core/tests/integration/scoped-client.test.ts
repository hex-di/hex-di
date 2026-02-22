import { describe, it, expect } from "vitest";
import { createScopedClient } from "../../src/context/scoped-http-client.js";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse } from "../../src/testing/response-factory.js";
import type { HttpRequest } from "../../src/request/http-request.js";
import { ok } from "@hex-di/result";

describe("scoped client integration", () => {
  it("propagates correlation-id across all convenience methods", async () => {
    const captured: HttpRequest[] = [];
    const mock = createMockHttpClient((req) => {
      captured.push(req);
      return ok(mockJsonResponse(200, {}));
    });
    const scoped = createScopedClient(mock, { correlationId: "integ-001" });

    await scoped.get("https://a.example.com/");
    await scoped.post("https://b.example.com/");
    await scoped.put("https://c.example.com/");
    await scoped.patch("https://d.example.com/");
    await scoped.del("https://e.example.com/");
    await scoped.head("https://f.example.com/");

    expect(captured).toHaveLength(6);
    for (const req of captured) {
      expect(req.headers.entries["x-correlation-id"]).toBe("integ-001");
    }
  });
});
