/**
 * GxP: Body snapshot — body is cached after first successful access (INV-HC-6).
 */
import { describe, it, expect } from "vitest";
import { createHttpResponse } from "../../src/response/http-response.js";
import { get } from "../../src/request/http-request.js";
import { createHeaders } from "../../src/types/headers.js";

function makeResponse(body?: string) {
  return createHttpResponse({
    status: 200,
    statusText: "OK",
    headers: createHeaders(),
    request: get("https://example.com/data"),
    rawBody: body !== undefined ? new TextEncoder().encode(body) : undefined,
  });
}

describe("GxP: body caching — same value across repeated access", () => {
  it("json accessor returns identical ResultAsync instance on repeated access", () => {
    const response = makeResponse('{"id":1}');
    expect(response.json).toBe(response.json);
  });

  it("text accessor returns identical ResultAsync instance on repeated access", () => {
    const response = makeResponse("hello");
    expect(response.text).toBe(response.text);
  });

  it("arrayBuffer accessor is cached after first access", () => {
    const response = makeResponse("data");
    expect(response.arrayBuffer).toBe(response.arrayBuffer);
  });

  it("blob accessor is cached after first access", () => {
    const response = makeResponse("blob");
    expect(response.blob).toBe(response.blob);
  });

  it("resolves to equal values across independent awaits", async () => {
    const response = makeResponse('{"count":42}');
    const r1 = await response.json;
    const r2 = await response.json;
    expect(r1._tag).toBe("Ok");
    expect(r2._tag).toBe("Ok");
    if (r1._tag === "Ok" && r2._tag === "Ok") {
      expect(r1.value).toEqual(r2.value);
    }
  });
});
