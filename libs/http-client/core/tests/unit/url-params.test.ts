/**
 * Tests for the immutable UrlParams collection.
 */

import { describe, it, expect } from "vitest";
import {
  createUrlParams,
  setParam,
  appendParam,
  getParam,
  getParamAll,
  removeParam,
  hasParam,
  mergeParams,
  toQueryString,
  fromQueryString,
} from "../../src/types/url-params.js";

// ---------------------------------------------------------------------------
// createUrlParams
// ---------------------------------------------------------------------------

describe("createUrlParams", () => {
  it("creates empty params when no init provided", () => {
    const p = createUrlParams();
    expect(p.entries).toHaveLength(0);
  });

  it("creates params from a record", () => {
    const p = createUrlParams({ foo: "bar", page: "1" });
    expect(getParam("foo")(p)).toBe("bar");
    expect(getParam("page")(p)).toBe("1");
  });

  it("accepts number and boolean values in record", () => {
    const p = createUrlParams({ page: 2, active: true });
    expect(getParam("page")(p)).toBe("2");
    expect(getParam("active")(p)).toBe("true");
  });

  it("expands array values into multiple entries for the same key", () => {
    const p = createUrlParams({ ids: ["1", "2", "3"] });
    expect(getParamAll("ids")(p)).toEqual(["1", "2", "3"]);
  });

  it("creates params from an array of tuples", () => {
    const p = createUrlParams([["a", "1"], ["b", "2"]] as const);
    expect(getParam("a")(p)).toBe("1");
    expect(getParam("b")(p)).toBe("2");
  });

  it("returns a frozen object", () => {
    const p = createUrlParams({ x: "1" });
    expect(Object.isFrozen(p)).toBe(true);
  });

  it("has frozen entries array", () => {
    const p = createUrlParams({ x: "1" });
    expect(Object.isFrozen(p.entries)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setParam
// ---------------------------------------------------------------------------

describe("setParam", () => {
  it("sets a new parameter", () => {
    const p = createUrlParams();
    const result = setParam("foo", "bar")(p);
    expect(getParam("foo")(result)).toBe("bar");
  });

  it("replaces all existing values for the key", () => {
    const p = createUrlParams([["ids", "1"], ["ids", "2"]] as const);
    const result = setParam("ids", "99")(p);
    expect(getParamAll("ids")(result)).toEqual(["99"]);
  });

  it("preserves other parameters", () => {
    const p = createUrlParams({ page: "1", sort: "asc" });
    const result = setParam("page", "2")(p);
    expect(getParam("sort")(result)).toBe("asc");
  });

  it("returns a new UrlParams instance", () => {
    const p = createUrlParams({ a: "1" });
    const result = setParam("a", "2")(p);
    expect(result).not.toBe(p);
  });
});

// ---------------------------------------------------------------------------
// appendParam
// ---------------------------------------------------------------------------

describe("appendParam", () => {
  it("adds a parameter when none exists", () => {
    const p = createUrlParams();
    const result = appendParam("tag", "news")(p);
    expect(getParam("tag")(result)).toBe("news");
  });

  it("adds a duplicate key entry without removing existing values", () => {
    const p = createUrlParams({ tag: "news" });
    const result = appendParam("tag", "sports")(p);
    expect(getParamAll("tag")(result)).toEqual(["news", "sports"]);
  });

  it("returns a new UrlParams instance", () => {
    const p = createUrlParams({ tag: "news" });
    const result = appendParam("tag", "sports")(p);
    expect(result).not.toBe(p);
  });

  it("preserves ordering of entries", () => {
    const p = createUrlParams([["a", "1"]] as const);
    const result = appendParam("b", "2")(p);
    expect(result.entries[0]).toEqual(["a", "1"]);
    expect(result.entries[1]).toEqual(["b", "2"]);
  });
});

// ---------------------------------------------------------------------------
// getParam
// ---------------------------------------------------------------------------

describe("getParam", () => {
  it("returns the first value for a key with one value", () => {
    const p = createUrlParams({ sort: "asc" });
    expect(getParam("sort")(p)).toBe("asc");
  });

  it("returns the first value when multiple values exist", () => {
    const p = createUrlParams([["ids", "1"], ["ids", "2"]] as const);
    expect(getParam("ids")(p)).toBe("1");
  });

  it("returns undefined for a missing key", () => {
    const p = createUrlParams({ a: "1" });
    expect(getParam("missing")(p)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getParamAll
// ---------------------------------------------------------------------------

describe("getParamAll", () => {
  it("returns all values for a multi-value key", () => {
    const p = createUrlParams([["ids", "1"], ["ids", "2"], ["ids", "3"]] as const);
    expect(getParamAll("ids")(p)).toEqual(["1", "2", "3"]);
  });

  it("returns a single-element array for a single-value key", () => {
    const p = createUrlParams({ sort: "asc" });
    expect(getParamAll("sort")(p)).toEqual(["asc"]);
  });

  it("returns an empty array for a missing key", () => {
    const p = createUrlParams({ a: "1" });
    expect(getParamAll("missing")(p)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// removeParam
// ---------------------------------------------------------------------------

describe("removeParam", () => {
  it("removes all values for the given key", () => {
    const p = createUrlParams([["ids", "1"], ["ids", "2"], ["other", "x"]] as const);
    const result = removeParam("ids")(p);
    expect(hasParam("ids")(result)).toBe(false);
    expect(getParam("other")(result)).toBe("x");
  });

  it("is a no-op for a key that does not exist", () => {
    const p = createUrlParams({ a: "1" });
    const result = removeParam("missing")(p);
    expect(result.entries).toEqual(p.entries);
  });

  it("returns a new UrlParams instance", () => {
    const p = createUrlParams({ a: "1" });
    const result = removeParam("a")(p);
    expect(result).not.toBe(p);
  });
});

// ---------------------------------------------------------------------------
// hasParam
// ---------------------------------------------------------------------------

describe("hasParam", () => {
  it("returns true when the parameter exists", () => {
    const p = createUrlParams({ page: "1" });
    expect(hasParam("page")(p)).toBe(true);
  });

  it("returns false when the parameter does not exist", () => {
    const p = createUrlParams({ page: "1" });
    expect(hasParam("sort")(p)).toBe(false);
  });

  it("returns true for a multi-value parameter", () => {
    const p = createUrlParams([["ids", "1"], ["ids", "2"]] as const);
    expect(hasParam("ids")(p)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mergeParams
// ---------------------------------------------------------------------------

describe("mergeParams", () => {
  it("merges two params collections by appending right entries to left", () => {
    const left = createUrlParams({ a: "1" });
    const right = createUrlParams({ b: "2" });
    const result = mergeParams(right)(left);
    expect(getParam("a")(result)).toBe("1");
    expect(getParam("b")(result)).toBe("2");
  });

  it("allows duplicate keys when both sides have the same key", () => {
    const left = createUrlParams({ tag: "news" });
    const right = createUrlParams({ tag: "sports" });
    const result = mergeParams(right)(left);
    expect(getParamAll("tag")(result)).toEqual(["news", "sports"]);
  });

  it("returns a new UrlParams instance", () => {
    const left = createUrlParams({ a: "1" });
    const right = createUrlParams({ b: "2" });
    const result = mergeParams(right)(left);
    expect(result).not.toBe(left);
    expect(result).not.toBe(right);
  });
});

// ---------------------------------------------------------------------------
// toQueryString
// ---------------------------------------------------------------------------

describe("toQueryString", () => {
  it("returns an empty string for empty params", () => {
    const p = createUrlParams();
    expect(toQueryString(p)).toBe("");
  });

  it("serializes a single param", () => {
    const p = createUrlParams({ foo: "bar" });
    expect(toQueryString(p)).toBe("foo=bar");
  });

  it("serializes multiple params separated by &", () => {
    const p = createUrlParams([["a", "1"], ["b", "2"]] as const);
    expect(toQueryString(p)).toBe("a=1&b=2");
  });

  it("serializes multi-value params as repeated key=value pairs", () => {
    const p = createUrlParams([["ids", "1"], ["ids", "2"]] as const);
    expect(toQueryString(p)).toBe("ids=1&ids=2");
  });

  it("percent-encodes special characters in keys and values", () => {
    const p = createUrlParams({ "my key": "hello world" });
    expect(toQueryString(p)).toBe("my%20key=hello%20world");
  });
});

// ---------------------------------------------------------------------------
// fromQueryString
// ---------------------------------------------------------------------------

describe("fromQueryString", () => {
  it("returns empty params for an empty string", () => {
    const p = fromQueryString("");
    expect(p.entries).toHaveLength(0);
  });

  it("strips a leading '?' before parsing", () => {
    const p = fromQueryString("?foo=bar");
    expect(getParam("foo")(p)).toBe("bar");
  });

  it("parses a single key=value pair", () => {
    const p = fromQueryString("foo=bar");
    expect(getParam("foo")(p)).toBe("bar");
  });

  it("parses multiple key=value pairs", () => {
    const p = fromQueryString("a=1&b=2");
    expect(getParam("a")(p)).toBe("1");
    expect(getParam("b")(p)).toBe("2");
  });

  it("parses repeated keys as multi-value entries", () => {
    const p = fromQueryString("ids=1&ids=2&ids=3");
    expect(getParamAll("ids")(p)).toEqual(["1", "2", "3"]);
  });

  it("decodes percent-encoded characters", () => {
    const p = fromQueryString("my%20key=hello%20world");
    expect(getParam("my key")(p)).toBe("hello world");
  });

  it("round-trips through toQueryString", () => {
    const original = createUrlParams([
      ["a", "1"],
      ["b", "hello world"],
      ["ids", "x"],
      ["ids", "y"],
    ] as const);
    const qs = toQueryString(original);
    const roundTripped = fromQueryString(qs);
    expect(getParam("a")(roundTripped)).toBe("1");
    expect(getParam("b")(roundTripped)).toBe("hello world");
    expect(getParamAll("ids")(roundTripped)).toEqual(["x", "y"]);
  });

  it("treats a param without '=' as key with empty string value", () => {
    const p = fromQueryString("novalue");
    expect(getParam("novalue")(p)).toBe("");
  });
});
