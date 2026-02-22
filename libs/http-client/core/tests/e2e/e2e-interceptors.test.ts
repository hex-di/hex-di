import { describe, it, expect } from "vitest";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockJsonResponse } from "../../src/testing/response-factory.js";
import { tapRequest, tapResponse } from "../../src/combinators/tap.js";
import type { HttpRequest } from "../../src/request/http-request.js";
import type { HttpResponse } from "../../src/response/http-response.js";
import { ok } from "@hex-di/result";

describe("E2E: interceptors (tap combinators)", () => {
  it("tapRequest observes all outgoing requests", async () => {
    const observed: HttpRequest[] = [];
    const mock = createMockHttpClient((_req) => ok(mockJsonResponse(200, {})));
    const client = tapRequest((req) => { observed.push(req); })(mock);

    await client.get("https://api.example.com/a");
    await client.post("https://api.example.com/b");

    expect(observed).toHaveLength(2);
  });

  it("tapResponse observes all successful responses", async () => {
    const observed: HttpResponse[] = [];
    const mock = createMockHttpClient((_req) => ok(mockJsonResponse(200, {})));
    const client = tapResponse((res) => { observed.push(res); })(mock);

    await client.get("https://api.example.com/x");
    expect(observed).toHaveLength(1);
    expect(observed[0]?.status).toBe(200);
  });
});
