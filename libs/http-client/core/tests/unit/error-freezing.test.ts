/**
 * GxP test: All error constructors return frozen objects.
 * Verifies the populate-freeze-return invariant (ALCOA+, INV-HC-3).
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
  return get("https://api.example.com/test");
}

function makeResponse(status = 200) {
  return createHttpResponse({
    status,
    statusText: "OK",
    headers: createHeaders(),
    request: makeRequest(),
    rawBody: new TextEncoder().encode("{}"),
  });
}

// ---------------------------------------------------------------------------
// HttpRequestError — frozen
// ---------------------------------------------------------------------------

describe("httpRequestError — frozen object", () => {
  it("returns a frozen object for Transport reason", () => {
    const e = httpRequestError("Transport", makeRequest(), "failed");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("returns a frozen object for Timeout reason", () => {
    const e = httpRequestError("Timeout", makeRequest(), "timed out");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("returns a frozen object for Aborted reason", () => {
    const e = httpRequestError("Aborted", makeRequest(), "aborted");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("returns a frozen object for InvalidUrl reason", () => {
    const e = httpRequestError("InvalidUrl", makeRequest(), "bad url");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("mutation attempt on reason silently fails", () => {
    const e = httpRequestError("Transport", makeRequest(), "failed");
    const originalReason = e.reason;
    try {
      // @ts-expect-error intentional mutation attempt
      e.reason = "Aborted";
    } catch {
      // strict mode throws — either way, value must not change
    }
    expect(e.reason).toBe(originalReason);
  });

  it("mutation attempt on message silently fails", () => {
    const e = httpRequestError("Transport", makeRequest(), "original message");
    const originalMessage = e.message;
    try {
      // @ts-expect-error intentional mutation attempt
      e.message = "modified message";
    } catch {
      // acceptable
    }
    expect(e.message).toBe(originalMessage);
  });
});

// ---------------------------------------------------------------------------
// HttpResponseError — frozen
// ---------------------------------------------------------------------------

describe("httpResponseError — frozen object", () => {
  it("returns a frozen object for StatusCode reason", () => {
    const req = makeRequest();
    const res = makeResponse(404);
    const e = httpResponseError("StatusCode", req, res, "not found");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("returns a frozen object for Decode reason", () => {
    const req = makeRequest();
    const res = makeResponse(200);
    const e = httpResponseError("Decode", req, res, "decode error");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("returns a frozen object for EmptyBody reason", () => {
    const req = makeRequest();
    const res = makeResponse(204);
    const e = httpResponseError("EmptyBody", req, res, "empty");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("returns a frozen object for BodyAlreadyConsumed reason", () => {
    const req = makeRequest();
    const res = makeResponse(200);
    const e = httpResponseError("BodyAlreadyConsumed", req, res, "consumed");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("mutation attempt on status silently fails", () => {
    const req = makeRequest();
    const res = makeResponse(500);
    const e = httpResponseError("StatusCode", req, res, "server error");
    const originalStatus = e.status;
    try {
      // @ts-expect-error intentional mutation attempt
      e.status = 200;
    } catch {
      // acceptable
    }
    expect(e.status).toBe(originalStatus);
  });
});

// ---------------------------------------------------------------------------
// HttpBodyError — frozen
// ---------------------------------------------------------------------------

describe("httpBodyError — frozen object", () => {
  it("returns a frozen object for JsonSerialize reason", () => {
    const e = httpBodyError("JsonSerialize", "failed to serialize");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("returns a frozen object for Encode reason", () => {
    const e = httpBodyError("Encode", "failed to encode");
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("mutation attempt on reason silently fails", () => {
    const e = httpBodyError("JsonSerialize", "failed");
    const originalReason = e.reason;
    try {
      // @ts-expect-error intentional mutation attempt
      e.reason = "Encode";
    } catch {
      // acceptable
    }
    expect(e.reason).toBe(originalReason);
  });

  it("mutation attempt on _tag silently fails", () => {
    const e = httpBodyError("JsonSerialize", "failed");
    const originalTag = e._tag;
    try {
      // @ts-expect-error intentional mutation attempt
      e._tag = "HttpRequestError";
    } catch {
      // acceptable
    }
    expect(e._tag).toBe(originalTag);
  });
});
