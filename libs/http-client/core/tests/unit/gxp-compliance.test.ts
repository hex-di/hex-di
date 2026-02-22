/**
 * GxP compliance baseline — ALCOA+ invariants for the http-client core.
 */
import { describe, it, expect } from "vitest";
import { httpRequestError } from "../../src/errors/http-request-error.js";
import { httpResponseError } from "../../src/errors/http-response-error.js";
import { httpBodyError } from "../../src/errors/http-body-error.js";
import { get } from "../../src/request/http-request.js";
import { createHttpResponse } from "../../src/response/http-response.js";
import { createHeaders } from "../../src/types/headers.js";

describe("GxP: ALCOA+ — error immutability (INV-HC-3)", () => {
  it("HttpRequestError is frozen", () => {
    const req = get("https://example.com/");
    const err = httpRequestError("Transport", req, "network error");
    expect(Object.isFrozen(err)).toBe(true);
  });

  it("HttpResponseError is frozen", () => {
    const req = get("https://example.com/");
    const resp = createHttpResponse({
      status: 500,
      statusText: "Internal Server Error",
      headers: createHeaders(),
      request: req,
    });
    const err = httpResponseError("StatusCode", req, resp, "5xx error");
    expect(Object.isFrozen(err)).toBe(true);
  });

  it("HttpBodyError is frozen", () => {
    const err = httpBodyError("JsonSerialize", "failed to serialize");
    expect(Object.isFrozen(err)).toBe(true);
  });
});

describe("GxP: ALCOA+ — request immutability (INV-HC-1)", () => {
  it("HttpRequest is frozen", () => {
    const req = get("https://example.com/");
    expect(Object.isFrozen(req)).toBe(true);
  });

  it("request combinators return new instances (immutability)", () => {
    const req = get("https://example.com/");
    const req2 = get("https://example.com/");
    expect(req).not.toBe(req2);
  });
});

describe("GxP: ALCOA+ — response immutability", () => {
  it("HttpResponse is frozen", () => {
    const resp = createHttpResponse({
      status: 200,
      statusText: "OK",
      headers: createHeaders(),
      request: get("https://example.com/"),
      rawBody: new TextEncoder().encode("{}"),
    });
    expect(Object.isFrozen(resp)).toBe(true);
  });
});
