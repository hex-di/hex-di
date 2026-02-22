import { describe, it, expect } from "vitest";
import { createHttpResponse } from "../../src/response/http-response.js";
import {
  getResponseHeader,
  getContentType,
  getContentLength,
  hasContentType,
  getLocation,
  getSetCookies,
} from "../../src/response/response-headers.js";
import { get } from "../../src/request/http-request.js";
import { createHeaders } from "../../src/types/headers.js";

function makeResponse(
  headers: Readonly<Record<string, string>>,
  status = 200,
): ReturnType<typeof createHttpResponse> {
  const req = get("https://api.example.com/test");
  return createHttpResponse({
    status,
    statusText: "OK",
    headers: createHeaders(headers),
    request: req,
  });
}

describe("Response header utilities", () => {
  describe("getResponseHeader()", () => {
    it("returns the header value when present", () => {
      const response = makeResponse({ "content-type": "application/json" });
      expect(getResponseHeader("content-type")(response)).toBe("application/json");
    });

    it("is case-insensitive (uppercase key lookup)", () => {
      const response = makeResponse({ "x-request-id": "abc-123" });
      expect(getResponseHeader("X-Request-ID")(response)).toBe("abc-123");
    });

    it("returns undefined when the header is absent", () => {
      const response = makeResponse({});
      expect(getResponseHeader("x-missing")(response)).toBeUndefined();
    });

    it("returns values for multiple different headers", () => {
      const response = makeResponse({
        "content-type": "text/html",
        "cache-control": "no-store",
      });
      expect(getResponseHeader("cache-control")(response)).toBe("no-store");
    });
  });

  describe("getContentType()", () => {
    it("returns the Content-Type header value", () => {
      const response = makeResponse({ "content-type": "application/json; charset=utf-8" });
      expect(getContentType(response)).toBe("application/json; charset=utf-8");
    });

    it("returns undefined when Content-Type is absent", () => {
      const response = makeResponse({});
      expect(getContentType(response)).toBeUndefined();
    });

    it("is case-insensitive on the stored key", () => {
      // createHeaders normalises to lowercase already; verify the lookup works
      const response = makeResponse({ "Content-Type": "text/plain" });
      expect(getContentType(response)).toBe("text/plain");
    });
  });

  describe("getContentLength()", () => {
    it("returns the parsed integer when Content-Length is present", () => {
      const response = makeResponse({ "content-length": "1024" });
      expect(getContentLength(response)).toBe(1024);
    });

    it("returns undefined when Content-Length is absent", () => {
      const response = makeResponse({});
      expect(getContentLength(response)).toBeUndefined();
    });

    it("returns undefined when Content-Length is not a valid integer", () => {
      const response = makeResponse({ "content-length": "not-a-number" });
      expect(getContentLength(response)).toBeUndefined();
    });

    it("returns 0 for Content-Length: 0", () => {
      const response = makeResponse({ "content-length": "0" });
      expect(getContentLength(response)).toBe(0);
    });
  });

  describe("hasContentType()", () => {
    it("returns true when Content-Type matches exactly (no params)", () => {
      const response = makeResponse({ "content-type": "application/json" });
      expect(hasContentType("application/json")(response)).toBe(true);
    });

    it("returns true when Content-Type has charset param but base type matches", () => {
      const response = makeResponse({ "content-type": "application/json; charset=utf-8" });
      expect(hasContentType("application/json")(response)).toBe(true);
    });

    it("returns false when Content-Type does not match", () => {
      const response = makeResponse({ "content-type": "text/html" });
      expect(hasContentType("application/json")(response)).toBe(false);
    });

    it("is case-insensitive", () => {
      const response = makeResponse({ "content-type": "Application/JSON" });
      expect(hasContentType("application/json")(response)).toBe(true);
    });

    it("returns false when Content-Type header is absent", () => {
      const response = makeResponse({});
      expect(hasContentType("application/json")(response)).toBe(false);
    });

    it("works for text/html", () => {
      const response = makeResponse({ "content-type": "text/html; charset=utf-8" });
      expect(hasContentType("text/html")(response)).toBe(true);
    });
  });

  describe("getLocation()", () => {
    it("returns the Location header value when present", () => {
      const response = makeResponse(
        { location: "https://api.example.com/new-resource" },
        301,
      );
      expect(getLocation(response)).toBe("https://api.example.com/new-resource");
    });

    it("returns undefined when Location header is absent", () => {
      const response = makeResponse({}, 200);
      expect(getLocation(response)).toBeUndefined();
    });

    it("works with relative redirect URLs", () => {
      const response = makeResponse({ location: "/v2/users" }, 302);
      expect(getLocation(response)).toBe("/v2/users");
    });
  });

  describe("getSetCookies()", () => {
    it("returns an empty array when no Set-Cookie headers exist", () => {
      const response = makeResponse({ "content-type": "application/json" });
      expect(getSetCookies(response)).toEqual([]);
    });

    it("returns the Set-Cookie header value when one is present", () => {
      const response = makeResponse({ "set-cookie": "session=abc; HttpOnly" });
      const cookies = getSetCookies(response);
      expect(cookies).toHaveLength(1);
      expect(cookies[0]).toBe("session=abc; HttpOnly");
    });
  });
});

// ---------------------------------------------------------------------------
// Additional tests for surviving mutants
// ---------------------------------------------------------------------------

describe("getContentLength() — non-finite parsed values", () => {
  it("returns undefined when content-length is NaN (e.g. 'not-a-number')", () => {
    const response = makeResponse({ "content-length": "not-a-number" });
    expect(getContentLength(response)).toBeUndefined();
  });

  it("returns undefined when content-length parses as Infinity", () => {
    // parseInt("Infinity", 10) returns NaN, but confirm the guard covers it
    const response = makeResponse({ "content-length": "Infinity" });
    expect(getContentLength(response)).toBeUndefined();
  });

  it("returns undefined when content-length is an empty string", () => {
    const response = makeResponse({ "content-length": "" });
    expect(getContentLength(response)).toBeUndefined();
  });

  it("parses a valid large integer correctly", () => {
    const response = makeResponse({ "content-length": "999999" });
    expect(getContentLength(response)).toBe(999999);
  });
});

describe("hasContentType() — with charset and other parameters", () => {
  it("matches 'application/json' when header is 'application/json; charset=utf-8'", () => {
    const response = makeResponse({ "content-type": "application/json; charset=utf-8" });
    expect(hasContentType("application/json")(response)).toBe(true);
  });

  it("matches 'text/html' when header is 'text/html; charset=UTF-8'", () => {
    const response = makeResponse({ "content-type": "text/html; charset=UTF-8" });
    expect(hasContentType("text/html")(response)).toBe(true);
  });

  it("is case-insensitive on the base media type portion", () => {
    const response = makeResponse({ "content-type": "APPLICATION/JSON; charset=utf-8" });
    expect(hasContentType("application/json")(response)).toBe(true);
  });

  it("returns false when base type differs even with matching charset param", () => {
    const response = makeResponse({ "content-type": "text/plain; charset=utf-8" });
    expect(hasContentType("application/json")(response)).toBe(false);
  });

  it("matches when content-type has leading/trailing spaces around the base type", () => {
    // The split(';')[0].trim() call handles spaces around the base type
    const response = makeResponse({ "content-type": "  application/json  ; charset=utf-8" });
    expect(hasContentType("application/json")(response)).toBe(true);
  });

  it("matches 'multipart/form-data' when header contains a boundary param", () => {
    const response = makeResponse({ "content-type": "multipart/form-data; boundary=----WebKit" });
    expect(hasContentType("multipart/form-data")(response)).toBe(true);
  });

  it("returns false for a completely different media type with params", () => {
    const response = makeResponse({ "content-type": "image/png; quality=90" });
    expect(hasContentType("application/json")(response)).toBe(false);
  });
});
