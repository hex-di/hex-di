import { describe, it, expect } from "vitest";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse } from "../../src/testing/response-factory.js";
import { baseUrl } from "../../src/combinators/base-url.js";
import { bearerAuth } from "../../src/combinators/auth.js";
import { filterStatusOk } from "../../src/combinators/status.js";
import { defaultHeaders } from "../../src/combinators/headers.js";
import { get } from "../../src/request/http-request.js";
import type { HttpRequest } from "../../src/request/http-request.js";
import { ok } from "@hex-di/result";

describe("E2E: combinator pipeline", () => {
  it("baseUrl + bearerAuth + filterStatusOk pipeline works end-to-end", async () => {
    const captured: HttpRequest[] = [];
    const mock = createMockHttpClient((req) => {
      captured.push(req);
      return ok(mockJsonResponse(200, { ok: true }));
    });

    const client = filterStatusOk(bearerAuth("tok123")(baseUrl("https://api.example.com")(mock)));
    const result = await client.get("/users");

    expect(result._tag).toBe("Ok");
    expect(captured[0]?.url).toContain("https://api.example.com");
    expect(captured[0]?.headers.entries["authorization"]).toBe("Bearer tok123");
  });

  it("defaultHeaders + filterStatusOk pipeline adds headers to all requests", async () => {
    const captured: HttpRequest[] = [];
    const mock = createMockHttpClient((req) => {
      captured.push(req);
      return ok(mockJsonResponse(200, {}));
    });

    const client = filterStatusOk(
      defaultHeaders({ "x-api-key": "key123" })(mock),
    );
    await client.get("https://api.example.com/data");
    expect(captured[0]?.headers.entries["x-api-key"]).toBe("key123");
  });
});
