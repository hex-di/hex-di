import { describe, it, expect } from "vitest";
import { HttpClientPort } from "../../src/ports/http-client-port.js";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse } from "../../src/testing/response-factory.js";
import { filterStatusOk } from "../../src/combinators/status.js";
import { bearerAuth } from "../../src/combinators/auth.js";
import { ok } from "@hex-di/result";

describe("container integration", () => {
  it("client can be composed from port and combinators", async () => {
    const baseClient = createMockHttpClient((_req) => ok(mockJsonResponse(200, { data: "value" })));
    const client = filterStatusOk(bearerAuth("test-token")(baseClient));

    const result = await client.get("https://api.example.com/data");
    expect(result._tag).toBe("Ok");
  });

  it("port name matches expected string", () => {
    expect(HttpClientPort.__portName).toBe("HttpClient");
  });
});
