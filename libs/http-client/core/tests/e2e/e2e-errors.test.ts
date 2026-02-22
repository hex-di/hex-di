import { describe, it, expect } from "vitest";
import { createMockHttpClient } from "../../src/testing/mock-client.js";
import { mockRequestError } from "../../src/testing/response-factory.js";
import { get } from "../../src/request/http-request.js";
import { filterStatusOk } from "../../src/combinators/status.js";
import { catchError } from "../../src/combinators/error.js";
import { ResultAsync, ok, err } from "@hex-di/result";
import { mockResponse } from "../../src/testing/response-factory.js";

describe("E2E: error handling pipeline", () => {
  it("Transport error is propagated as Err(HttpRequestError)", async () => {
    const req = get("https://api.example.com/");
    const client = createMockHttpClient((_r) => err(mockRequestError("Transport")));
    const result = await client.execute(req);
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
      expect(result.error.reason).toBe("Transport");
    }
  });

  it("filterStatusOk converts 404 to HttpResponseError", async () => {
    const req = get("https://api.example.com/missing");
    const client = filterStatusOk(createMockHttpClient((_r) => ok(mockResponse(404))));
    const result = await client.execute(req);
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error._tag).toBe("HttpRequestError");
    }
  });

  it("catchError recovers from Transport error with fallback", async () => {
    const req = get("https://api.example.com/");
    const fallback = mockResponse(200);
    const client = catchError(
      "HttpRequestError",
      () => ResultAsync.ok(fallback),
    )(createMockHttpClient((_r) => err(mockRequestError("Transport"))));
    const result = await client.execute(req);
    expect(result._tag).toBe("Ok");
  });
});
