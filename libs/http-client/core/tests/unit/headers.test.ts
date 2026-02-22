/**
 * Tests for the immutable Headers collection.
 */

import { describe, it, expect } from "vitest";
import {
  createHeaders,
  setHeader,
  appendHeader,
  getHeader,
  hasHeader,
  removeHeader,
  mergeHeaders,
  headersToRecord,
} from "../../src/types/headers.js";

// ---------------------------------------------------------------------------
// createHeaders
// ---------------------------------------------------------------------------

describe("createHeaders", () => {
  it("creates an empty headers collection when no init provided", () => {
    const h = createHeaders();
    expect(h.entries).toEqual({});
  });

  it("creates headers from an init record", () => {
    const h = createHeaders({ "Content-Type": "application/json" });
    expect(h.entries["content-type"]).toBe("application/json");
  });

  it("normalizes all keys to lowercase", () => {
    const h = createHeaders({
      "Content-Type": "application/json",
      "X-Request-ID": "abc-123",
      "AUTHORIZATION": "Bearer token",
    });
    expect(h.entries).toHaveProperty("content-type");
    expect(h.entries).toHaveProperty("x-request-id");
    expect(h.entries).toHaveProperty("authorization");
    expect(h.entries).not.toHaveProperty("Content-Type");
    expect(h.entries).not.toHaveProperty("AUTHORIZATION");
  });

  it("returns a frozen object", () => {
    const h = createHeaders({ "accept": "application/json" });
    expect(Object.isFrozen(h)).toBe(true);
  });

  it("has frozen entries record", () => {
    const h = createHeaders({ "accept": "text/html" });
    expect(Object.isFrozen(h.entries)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setHeader
// ---------------------------------------------------------------------------

describe("setHeader", () => {
  it("sets a new header", () => {
    const h = createHeaders();
    const result = setHeader("Content-Type", "application/json")(h);
    expect(getHeader("content-type")(result)).toBe("application/json");
  });

  it("overwrites an existing header value", () => {
    const h = createHeaders({ "content-type": "text/plain" });
    const result = setHeader("content-type", "application/json")(h);
    expect(getHeader("content-type")(result)).toBe("application/json");
  });

  it("normalizes the key to lowercase", () => {
    const h = createHeaders();
    const result = setHeader("ACCEPT", "text/html")(h);
    expect(result.entries["accept"]).toBe("text/html");
    expect(result.entries["ACCEPT"]).toBeUndefined();
  });

  it("returns a new Headers instance (immutability)", () => {
    const h = createHeaders({ "x-foo": "bar" });
    const result = setHeader("x-baz", "qux")(h);
    expect(result).not.toBe(h);
  });

  it("preserves other headers when setting", () => {
    const h = createHeaders({ "accept": "text/html", "x-custom": "value" });
    const result = setHeader("content-type", "application/json")(h);
    expect(getHeader("accept")(result)).toBe("text/html");
    expect(getHeader("x-custom")(result)).toBe("value");
  });
});

// ---------------------------------------------------------------------------
// appendHeader
// ---------------------------------------------------------------------------

describe("appendHeader", () => {
  it("sets a header when it does not yet exist", () => {
    const h = createHeaders();
    const result = appendHeader("accept", "text/html")(h);
    expect(getHeader("accept")(result)).toBe("text/html");
  });

  it("comma-separates when appending to an existing header", () => {
    const h = createHeaders({ "accept": "text/html" });
    const result = appendHeader("accept", "application/json")(h);
    expect(getHeader("accept")(result)).toBe("text/html, application/json");
  });

  it("normalizes key to lowercase before appending", () => {
    const h = createHeaders({ "accept": "text/html" });
    const result = appendHeader("ACCEPT", "application/json")(h);
    expect(result.entries["accept"]).toBe("text/html, application/json");
  });

  it("returns a new Headers instance", () => {
    const h = createHeaders({ "accept": "text/html" });
    const result = appendHeader("accept", "application/json")(h);
    expect(result).not.toBe(h);
  });
});

// ---------------------------------------------------------------------------
// getHeader
// ---------------------------------------------------------------------------

describe("getHeader", () => {
  it("returns the header value for a known key", () => {
    const h = createHeaders({ "content-type": "application/json" });
    expect(getHeader("content-type")(h)).toBe("application/json");
  });

  it("is case-insensitive on lookup", () => {
    const h = createHeaders({ "content-type": "application/json" });
    expect(getHeader("Content-Type")(h)).toBe("application/json");
    expect(getHeader("CONTENT-TYPE")(h)).toBe("application/json");
  });

  it("returns undefined for a missing key", () => {
    const h = createHeaders({ "accept": "text/html" });
    expect(getHeader("authorization")(h)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// hasHeader
// ---------------------------------------------------------------------------

describe("hasHeader", () => {
  it("returns true when the header exists", () => {
    const h = createHeaders({ "authorization": "Bearer token" });
    expect(hasHeader("authorization")(h)).toBe(true);
  });

  it("is case-insensitive", () => {
    const h = createHeaders({ "content-type": "text/plain" });
    expect(hasHeader("Content-Type")(h)).toBe(true);
    expect(hasHeader("CONTENT-TYPE")(h)).toBe(true);
  });

  it("returns false when the header does not exist", () => {
    const h = createHeaders({ "accept": "text/html" });
    expect(hasHeader("authorization")(h)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// removeHeader
// ---------------------------------------------------------------------------

describe("removeHeader", () => {
  it("removes an existing header", () => {
    const h = createHeaders({ "content-type": "application/json", "accept": "text/html" });
    const result = removeHeader("content-type")(h);
    expect(hasHeader("content-type")(result)).toBe(false);
  });

  it("preserves other headers when removing", () => {
    const h = createHeaders({ "content-type": "application/json", "accept": "text/html" });
    const result = removeHeader("content-type")(h);
    expect(getHeader("accept")(result)).toBe("text/html");
  });

  it("returns a new Headers instance (not the original)", () => {
    const h = createHeaders({ "x-foo": "bar" });
    const result = removeHeader("x-foo")(h);
    expect(result).not.toBe(h);
  });

  it("is case-insensitive when removing", () => {
    const h = createHeaders({ "content-type": "text/plain" });
    const result = removeHeader("Content-Type")(h);
    expect(hasHeader("content-type")(result)).toBe(false);
  });

  it("is a no-op when the key does not exist", () => {
    const h = createHeaders({ "accept": "text/html" });
    const result = removeHeader("authorization")(h);
    expect(result.entries).toEqual(h.entries);
  });
});

// ---------------------------------------------------------------------------
// mergeHeaders
// ---------------------------------------------------------------------------

describe("mergeHeaders", () => {
  it("merges two headers collections", () => {
    const left = createHeaders({ "accept": "text/html" });
    const right = createHeaders({ "content-type": "application/json" });
    const result = mergeHeaders(right)(left);
    expect(getHeader("accept")(result)).toBe("text/html");
    expect(getHeader("content-type")(result)).toBe("application/json");
  });

  it("right wins on conflict", () => {
    const left = createHeaders({ "content-type": "text/plain" });
    const right = createHeaders({ "content-type": "application/json" });
    const result = mergeHeaders(right)(left);
    expect(getHeader("content-type")(result)).toBe("application/json");
  });

  it("returns a new Headers instance", () => {
    const left = createHeaders({ "accept": "text/html" });
    const right = createHeaders({ "x-custom": "value" });
    const result = mergeHeaders(right)(left);
    expect(result).not.toBe(left);
    expect(result).not.toBe(right);
  });

  it("merging empty right does not change left entries", () => {
    const left = createHeaders({ "accept": "text/html", "x-id": "123" });
    const right = createHeaders();
    const result = mergeHeaders(right)(left);
    expect(result.entries).toEqual(left.entries);
  });
});

// ---------------------------------------------------------------------------
// headersToRecord
// ---------------------------------------------------------------------------

describe("headersToRecord", () => {
  it("returns the entries as a plain record", () => {
    const h = createHeaders({ "content-type": "application/json", "accept": "text/html" });
    const record = headersToRecord(h);
    expect(record["content-type"]).toBe("application/json");
    expect(record["accept"]).toBe("text/html");
  });

  it("returns an empty object for empty headers", () => {
    const h = createHeaders();
    expect(headersToRecord(h)).toEqual({});
  });
});
