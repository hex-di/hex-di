import { describe, it, expect } from "vitest";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse, mockResponse } from "../../src/testing/response-factory.js";
import { get, post } from "../../src/request/http-request.js";
import type { HttpRequest } from "../../src/request/http-request.js";
import { ok } from "@hex-di/result";

describe("mock adapter integration", () => {
  it("routes GET requests to the correct handler", async () => {
    const client = createMockHttpClient((req) => {
      if (req.method === "GET" && req.url.includes("/users")) {
        return ok(mockJsonResponse(200, { users: [] }));
      }
      return ok(mockResponse(404));
    });

    const result = await client.get("https://api.example.com/users");
    expect(result._tag).toBe("Ok");
  });

  it("records all requests made through the client", async () => {
    const requests: HttpRequest[] = [];
    const client = createMockHttpClient((req) => {
      requests.push(req);
      return ok(mockResponse(200));
    });

    await client.execute(get("https://a.example.com/1"));
    await client.execute(post("https://a.example.com/2"));
    expect(requests).toHaveLength(2);
  });
});
