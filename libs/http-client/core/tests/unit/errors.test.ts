/**
 * Tests for all three HTTP error constructors.
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

function makeRequest(url = "https://api.example.com/test") {
  return get(url);
}

function makeResponse(status = 200) {
  const req = makeRequest();
  return createHttpResponse({
    status,
    statusText: "OK",
    headers: createHeaders(),
    request: req,
    rawBody: new TextEncoder().encode("{}"),
  });
}

// ---------------------------------------------------------------------------
// httpRequestError
// ---------------------------------------------------------------------------

describe("httpRequestError", () => {
  it("has _tag 'HttpRequestError'", () => {
    const req = makeRequest();
    const e = httpRequestError("Transport", req, "network failure");
    expect(e._tag).toBe("HttpRequestError");
  });

  it("stores the reason", () => {
    const req = makeRequest();
    const e = httpRequestError("Timeout", req, "timed out");
    expect(e.reason).toBe("Timeout");
  });

  it("stores the request reference", () => {
    const req = makeRequest();
    const e = httpRequestError("Transport", req, "err");
    expect(e.request).toBe(req);
  });

  it("stores the message", () => {
    const req = makeRequest();
    const e = httpRequestError("Transport", req, "connection refused");
    expect(e.message).toBe("connection refused");
  });

  it("cause defaults to undefined when not provided", () => {
    const req = makeRequest();
    const e = httpRequestError("Aborted", req, "aborted");
    expect(e.cause).toBeUndefined();
  });

  it("stores the cause when provided", () => {
    const req = makeRequest();
    const originalError = new Error("socket hangup");
    const e = httpRequestError("Transport", req, "failed", originalError);
    expect(e.cause).toBe(originalError);
  });

  it("returns a frozen object", () => {
    const req = makeRequest();
    const e = httpRequestError("Transport", req, "failed");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("supports all reason variants", () => {
    const req = makeRequest();
    const reasons = ["Transport", "Timeout", "Aborted", "InvalidUrl"] as const;
    for (const reason of reasons) {
      const e = httpRequestError(reason, req, "msg");
      expect(e.reason).toBe(reason);
    }
  });
});

// ---------------------------------------------------------------------------
// httpResponseError
// ---------------------------------------------------------------------------

describe("httpResponseError", () => {
  it("has _tag 'HttpResponseError'", () => {
    const req = makeRequest();
    const res = makeResponse(404);
    const e = httpResponseError("StatusCode", req, res, "not found");
    expect(e._tag).toBe("HttpResponseError");
  });

  it("stores the reason", () => {
    const req = makeRequest();
    const res = makeResponse(422);
    const e = httpResponseError("Decode", req, res, "decode error");
    expect(e.reason).toBe("Decode");
  });

  it("stores the request reference", () => {
    const req = makeRequest();
    const res = makeResponse(200);
    const e = httpResponseError("EmptyBody", req, res, "empty");
    expect(e.request).toBe(req);
  });

  it("stores the response reference", () => {
    const req = makeRequest();
    const res = makeResponse(200);
    const e = httpResponseError("EmptyBody", req, res, "empty");
    expect(e.response).toBe(res);
  });

  it("derives status from the response", () => {
    const req = makeRequest();
    const res = makeResponse(404);
    const e = httpResponseError("StatusCode", req, res, "not found");
    expect(e.status).toBe(404);
  });

  it("stores the message", () => {
    const req = makeRequest();
    const res = makeResponse(500);
    const e = httpResponseError("StatusCode", req, res, "server error");
    expect(e.message).toBe("server error");
  });

  it("cause defaults to undefined when not provided", () => {
    const req = makeRequest();
    const res = makeResponse(200);
    const e = httpResponseError("EmptyBody", req, res, "empty");
    expect(e.cause).toBeUndefined();
  });

  it("stores the cause when provided", () => {
    const req = makeRequest();
    const res = makeResponse(500);
    const originalError = new SyntaxError("unexpected token");
    const e = httpResponseError("Decode", req, res, "decode failed", originalError);
    expect(e.cause).toBe(originalError);
  });

  it("returns a frozen object", () => {
    const req = makeRequest();
    const res = makeResponse(200);
    const e = httpResponseError("EmptyBody", req, res, "empty");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("supports all reason variants", () => {
    const req = makeRequest();
    const reasons = ["StatusCode", "Decode", "EmptyBody", "BodyAlreadyConsumed"] as const;
    for (const reason of reasons) {
      const res = makeResponse(200);
      const e = httpResponseError(reason, req, res, "msg");
      expect(e.reason).toBe(reason);
    }
  });
});

// ---------------------------------------------------------------------------
// httpBodyError
// ---------------------------------------------------------------------------

describe("httpBodyError", () => {
  it("has _tag 'HttpBodyError'", () => {
    const e = httpBodyError("JsonSerialize", "failed to serialize");
    expect(e._tag).toBe("HttpBodyError");
  });

  it("stores the reason", () => {
    const e = httpBodyError("Encode", "encoding failed");
    expect(e.reason).toBe("Encode");
  });

  it("stores the message", () => {
    const e = httpBodyError("JsonSerialize", "circular reference detected");
    expect(e.message).toBe("circular reference detected");
  });

  it("cause defaults to undefined when not provided", () => {
    const e = httpBodyError("JsonSerialize", "failed");
    expect(e.cause).toBeUndefined();
  });

  it("stores the cause when provided", () => {
    const originalError = new TypeError("circular");
    const e = httpBodyError("JsonSerialize", "failed", originalError);
    expect(e.cause).toBe(originalError);
  });

  it("returns a frozen object", () => {
    const e = httpBodyError("Encode", "failed");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("supports all reason variants", () => {
    const reasons = ["JsonSerialize", "Encode"] as const;
    for (const reason of reasons) {
      const e = httpBodyError(reason, "msg");
      expect(e.reason).toBe(reason);
    }
  });
});
