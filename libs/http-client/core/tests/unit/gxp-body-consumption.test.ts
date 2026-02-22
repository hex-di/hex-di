/**
 * GxP: Body consumption invariant — body parsed at most once (INV-HC-6).
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
    request: get("https://example.com/"),
    rawBody: body !== undefined ? new TextEncoder().encode(body) : undefined,
  });
}

describe("GxP: INV-HC-6 — body parsed at most once", () => {
  it("returns BodyAlreadyConsumed on second access via different accessor", async () => {
    const response = makeResponse('{"key":"value"}');
    await response.json;
    const result = await response.text;
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("BodyAlreadyConsumed");
    }
  });

  it("same accessor returns cached result (not BodyAlreadyConsumed)", async () => {
    const response = makeResponse('{"key":"value"}');
    const first = await response.json;
    const second = await response.json;
    expect(first._tag).toBe("Ok");
    expect(second._tag).toBe("Ok");
  });

  it("arrayBuffer returns BodyAlreadyConsumed after json consumed", async () => {
    const response = makeResponse('{"x":1}');
    await response.json;
    const result = await response.arrayBuffer;
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("BodyAlreadyConsumed");
    }
  });

  it("blob returns BodyAlreadyConsumed after text consumed", async () => {
    const response = makeResponse("hello");
    await response.text;
    const result = await response.blob;
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      expect(result.error.reason).toBe("BodyAlreadyConsumed");
    }
  });

  it("consumption is tracked even before first await completes", async () => {
    const response = makeResponse("hello");
    // Access two different accessors without awaiting between them
    const _textRef = response.text;
    const jsonResult = await response.json;
    expect(jsonResult._tag).toBe("Err");
    if (jsonResult._tag === "Err") {
      expect(jsonResult.error.reason).toBe("BodyAlreadyConsumed");
    }
  });
});
