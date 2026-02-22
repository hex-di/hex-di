/**
 * GxP ALCOA+ invariant tests: error objects must be immutable after construction.
 *
 * Verifies:
 * - INV-HC-3: populate-freeze-return sequence
 * - All three error types: HttpRequestError, HttpResponseError, HttpBodyError
 * - Field mutation attempts are rejected by the runtime
 */

import { describe, it, expect } from "vitest";
import { httpRequestError } from "../../src/errors/http-request-error.js";
import { httpResponseError } from "../../src/errors/http-response-error.js";
import { httpBodyError } from "../../src/errors/http-body-error.js";
import { get } from "../../src/request/http-request.js";
import { createHttpResponse } from "../../src/response/http-response.js";
import { createHeaders } from "../../src/types/headers.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest() {
  return get("https://api.example.com/resource");
}

function makeResponse(status = 200) {
  return createHttpResponse({
    status,
    statusText: "OK",
    headers: createHeaders(),
    request: makeRequest(),
    rawBody: new TextEncoder().encode('{"ok":true}'),
  });
}

// ---------------------------------------------------------------------------
// HttpRequestError — ALCOA+ immutability
// ---------------------------------------------------------------------------

describe("HttpRequestError — ALCOA+ immutability (INV-HC-3)", () => {
  it("Object.isFrozen returns true immediately after construction", () => {
    const e = httpRequestError("Transport", makeRequest(), "connection failed");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("cannot mutate _tag field", () => {
    const e = httpRequestError("Transport", makeRequest(), "msg");
    const before = e._tag;
    try {
      // @ts-expect-error intentional ALCOA+ mutation test
      e._tag = "SpoofedTag";
    } catch {
      // strict-mode TypeError is acceptable
    }
    expect(e._tag).toBe(before);
  });

  it("cannot mutate reason field", () => {
    const e = httpRequestError("Timeout", makeRequest(), "msg");
    try {
      // @ts-expect-error intentional mutation
      e.reason = "Transport";
    } catch {
      // acceptable
    }
    expect(e.reason).toBe("Timeout");
  });

  it("cannot mutate message field", () => {
    const e = httpRequestError("Aborted", makeRequest(), "original");
    try {
      // @ts-expect-error intentional mutation
      e.message = "tampered";
    } catch {
      // acceptable
    }
    expect(e.message).toBe("original");
  });

  it("cannot mutate cause field", () => {
    const cause = new Error("root cause");
    const e = httpRequestError("Transport", makeRequest(), "msg", cause);
    try {
      // @ts-expect-error intentional mutation
      e.cause = new Error("injected");
    } catch {
      // acceptable
    }
    expect(e.cause).toBe(cause);
  });

  it("cannot add new properties to the frozen object", () => {
    const e = httpRequestError("Transport", makeRequest(), "msg");
    try {
      // @ts-expect-error intentional mutation
      (e as Record<string, unknown>).extra = "injected";
    } catch {
      // acceptable
    }
    expect((e as unknown as Record<string, unknown>)["extra"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// HttpResponseError — ALCOA+ immutability
// ---------------------------------------------------------------------------

describe("HttpResponseError — ALCOA+ immutability (INV-HC-3)", () => {
  it("Object.isFrozen returns true immediately after construction", () => {
    const req = makeRequest();
    const res = makeResponse(500);
    const e = httpResponseError("StatusCode", req, res, "server error");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("cannot mutate _tag field", () => {
    const req = makeRequest();
    const res = makeResponse(404);
    const e = httpResponseError("StatusCode", req, res, "not found");
    const before = e._tag;
    try {
      // @ts-expect-error intentional mutation
      e._tag = "Spoofed";
    } catch {
      // acceptable
    }
    expect(e._tag).toBe(before);
  });

  it("cannot mutate reason field", () => {
    const req = makeRequest();
    const res = makeResponse(422);
    const e = httpResponseError("Decode", req, res, "decode error");
    try {
      // @ts-expect-error intentional mutation
      e.reason = "StatusCode";
    } catch {
      // acceptable
    }
    expect(e.reason).toBe("Decode");
  });

  it("cannot mutate status field", () => {
    const req = makeRequest();
    const res = makeResponse(503);
    const e = httpResponseError("StatusCode", req, res, "unavailable");
    try {
      // @ts-expect-error intentional mutation
      e.status = 200;
    } catch {
      // acceptable
    }
    expect(e.status).toBe(503);
  });

  it("cannot mutate message field", () => {
    const req = makeRequest();
    const res = makeResponse(400);
    const e = httpResponseError("StatusCode", req, res, "bad request");
    try {
      // @ts-expect-error intentional mutation
      e.message = "overwritten";
    } catch {
      // acceptable
    }
    expect(e.message).toBe("bad request");
  });

  it("cannot mutate request field", () => {
    const req = makeRequest();
    const res = makeResponse(404);
    const e = httpResponseError("StatusCode", req, res, "not found");
    const originalReq = e.request;
    const spoofReq = get("https://evil.example.com/spoof");
    try {
      // @ts-expect-error intentional mutation
      e.request = spoofReq;
    } catch {
      // acceptable
    }
    expect(e.request).toBe(originalReq);
  });

  it("cannot mutate response field", () => {
    const req = makeRequest();
    const res = makeResponse(404);
    const e = httpResponseError("StatusCode", req, res, "not found");
    const originalRes = e.response;
    const spoofRes = makeResponse(200);
    try {
      // @ts-expect-error intentional mutation
      e.response = spoofRes;
    } catch {
      // acceptable
    }
    expect(e.response).toBe(originalRes);
  });
});

// ---------------------------------------------------------------------------
// HttpBodyError — ALCOA+ immutability
// ---------------------------------------------------------------------------

describe("HttpBodyError — ALCOA+ immutability (INV-HC-3)", () => {
  it("Object.isFrozen returns true immediately after construction", () => {
    const e = httpBodyError("JsonSerialize", "circular reference");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("cannot mutate _tag field", () => {
    const e = httpBodyError("Encode", "encode failed");
    const before = e._tag;
    try {
      // @ts-expect-error intentional mutation
      e._tag = "HttpRequestError";
    } catch {
      // acceptable
    }
    expect(e._tag).toBe(before);
  });

  it("cannot mutate reason field", () => {
    const e = httpBodyError("JsonSerialize", "circular");
    try {
      // @ts-expect-error intentional mutation
      e.reason = "Encode";
    } catch {
      // acceptable
    }
    expect(e.reason).toBe("JsonSerialize");
  });

  it("cannot mutate message field", () => {
    const e = httpBodyError("Encode", "original message");
    try {
      // @ts-expect-error intentional mutation
      e.message = "tampered message";
    } catch {
      // acceptable
    }
    expect(e.message).toBe("original message");
  });

  it("cannot mutate cause field when set", () => {
    const cause = new TypeError("root");
    const e = httpBodyError("JsonSerialize", "failed", cause);
    try {
      // @ts-expect-error intentional mutation
      e.cause = new Error("injected");
    } catch {
      // acceptable
    }
    expect(e.cause).toBe(cause);
  });

  it("cannot add properties to the frozen object", () => {
    const e = httpBodyError("Encode", "failed");
    try {
      // @ts-expect-error intentional property injection
      (e as Record<string, unknown>).injected = "value";
    } catch {
      // acceptable
    }
    expect((e as unknown as Record<string, unknown>)["injected"]).toBeUndefined();
  });
});
