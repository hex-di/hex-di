/**
 * Tests for the errorCode mapping function.
 */

import { describe, it, expect } from "vitest";
import { errorCode } from "../../src/errors/error-codes.js";
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
// HttpRequestError codes
// ---------------------------------------------------------------------------

describe("errorCode — HttpRequestError", () => {
  it("returns HTTP001 for Transport", () => {
    const e = httpRequestError("Transport", makeRequest(), "msg");
    expect(errorCode(e)).toBe("HTTP001");
  });

  it("returns HTTP002 for Timeout", () => {
    const e = httpRequestError("Timeout", makeRequest(), "msg");
    expect(errorCode(e)).toBe("HTTP002");
  });

  it("returns HTTP003 for Aborted", () => {
    const e = httpRequestError("Aborted", makeRequest(), "msg");
    expect(errorCode(e)).toBe("HTTP003");
  });

  it("returns HTTP004 for InvalidUrl", () => {
    const e = httpRequestError("InvalidUrl", makeRequest(), "msg");
    expect(errorCode(e)).toBe("HTTP004");
  });
});

// ---------------------------------------------------------------------------
// HttpResponseError codes
// ---------------------------------------------------------------------------

describe("errorCode — HttpResponseError", () => {
  it("returns HTTP010 for StatusCode", () => {
    const req = makeRequest();
    const res = makeResponse(404);
    const e = httpResponseError("StatusCode", req, res, "not found");
    expect(errorCode(e)).toBe("HTTP010");
  });

  it("returns HTTP011 for Decode", () => {
    const req = makeRequest();
    const res = makeResponse(200);
    const e = httpResponseError("Decode", req, res, "decode error");
    expect(errorCode(e)).toBe("HTTP011");
  });

  it("returns HTTP012 for EmptyBody", () => {
    const req = makeRequest();
    const res = makeResponse(204);
    const e = httpResponseError("EmptyBody", req, res, "empty");
    expect(errorCode(e)).toBe("HTTP012");
  });

  it("returns HTTP013 for BodyAlreadyConsumed", () => {
    const req = makeRequest();
    const res = makeResponse(200);
    const e = httpResponseError("BodyAlreadyConsumed", req, res, "already consumed");
    expect(errorCode(e)).toBe("HTTP013");
  });
});

// ---------------------------------------------------------------------------
// HttpBodyError codes
// ---------------------------------------------------------------------------

describe("errorCode — HttpBodyError", () => {
  it("returns HTTP020 for JsonSerialize", () => {
    const e = httpBodyError("JsonSerialize", "serialization failed");
    expect(errorCode(e)).toBe("HTTP020");
  });

  it("returns HTTP021 for Encode", () => {
    const e = httpBodyError("Encode", "encoding failed");
    expect(errorCode(e)).toBe("HTTP021");
  });
});

// ---------------------------------------------------------------------------
// Coverage note: the "HTTP000" fallback
// ---------------------------------------------------------------------------
//
// The `errorCode` function returns "HTTP000" for any `${_tag}:${reason}` key
// that is NOT found in ERROR_CODES. However, the `HttpClientError` union type
// is fully closed — every valid (_tag, reason) combination is already mapped
// in the lookup table:
//
//   HttpRequestError.reason: "Transport" | "Timeout" | "Aborted" | "InvalidUrl"
//   HttpResponseError.reason: "StatusCode" | "Decode" | "EmptyBody" | "BodyAlreadyConsumed"
//   HttpBodyError.reason: "JsonSerialize" | "Encode"
//
// There is no type-safe way to produce an HttpClientError with an unknown
// combination without using `as` casting, which is prohibited by project rules.
// The "HTTP000" branch is therefore a defensive guard for future extensibility
// and is not reachable through the current public API.
//
// All 10 known error code mappings are already exercised by the tests above.

describe("errorCode — exhaustiveness confirmation", () => {
  it("covers all HttpRequestError reasons (Transport, Timeout, Aborted, InvalidUrl)", () => {
    const req = makeRequest();
    const reasons = ["Transport", "Timeout", "Aborted", "InvalidUrl"] as const;
    const expected = ["HTTP001", "HTTP002", "HTTP003", "HTTP004"];
    reasons.forEach((reason, i) => {
      const e = httpRequestError(reason, req, "test");
      expect(errorCode(e)).toBe(expected[i]);
    });
  });

  it("covers all HttpResponseError reasons (StatusCode, Decode, EmptyBody, BodyAlreadyConsumed)", () => {
    const req = makeRequest();
    const res = makeResponse(200);
    const reasons = ["StatusCode", "Decode", "EmptyBody", "BodyAlreadyConsumed"] as const;
    const expected = ["HTTP010", "HTTP011", "HTTP012", "HTTP013"];
    reasons.forEach((reason, i) => {
      const e = httpResponseError(reason, req, res, "test");
      expect(errorCode(e)).toBe(expected[i]);
    });
  });

  it("covers all HttpBodyError reasons (JsonSerialize, Encode)", () => {
    const reasons = ["JsonSerialize", "Encode"] as const;
    const expected = ["HTTP020", "HTTP021"];
    reasons.forEach((reason, i) => {
      const e = httpBodyError(reason, "test");
      expect(errorCode(e)).toBe(expected[i]);
    });
  });
});

// ---------------------------------------------------------------------------
// Mutation-killing: "HTTP000" fallback (StringLiteral mutant)
// ---------------------------------------------------------------------------
//
// Stryker mutates the fallback `"HTTP000"` to `""`. To kill this mutant,
// we need to call `errorCode` with an error whose `_tag:reason` key is NOT
// in ERROR_CODES. Since the `HttpClientError` union is fully closed, we
// construct a fake error object using `any` casting (permitted in test files).

describe("errorCode — HTTP000 fallback (mutation-killing)", () => {
  it("returns 'HTTP000' for an unrecognised _tag:reason combination", () => {
    // Construct a fake error that looks like an HttpClientError but has a
    // key not present in ERROR_CODES. This exercises the `?? "HTTP000"` branch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeError = { _tag: "HttpRequestError", reason: "UnknownReason" } as any;
    expect(errorCode(fakeError)).toBe("HTTP000");
  });

  it("returns a non-empty string ('HTTP000') for an unrecognised _tag:reason combination", () => {
    // Kills the StringLiteral mutant that replaces "HTTP000" with "".
    // If mutated to "", the returned value would be "" not "HTTP000".
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeError = { _tag: "HttpResponseError", reason: "UnknownResponseReason" } as any;
    const code = errorCode(fakeError);
    expect(code).not.toBe("");
    expect(code).toBe("HTTP000");
  });
});
