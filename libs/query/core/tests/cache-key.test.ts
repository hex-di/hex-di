import { describe, it, expect } from "vitest";
import {
  createCacheKey,
  createCacheKeyFromName,
  serializeCacheKey,
  cacheKeyMatchesPort,
  stableStringify,
  createQueryPort,
} from "../src/index.js";

const UsersPort = createQueryPort<string[], unknown>()({ name: "Users" });
const PostsPort = createQueryPort<string[], unknown>()({ name: "Posts" });

describe("stableStringify", () => {
  it("insertion-order independence: { a: 1, b: 2 } equals { b: 2, a: 1 }", () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });

  it("returns '\"null\"' for null", () => {
    expect(stableStringify(null)).toBe("null");
  });

  it("returns '\"42\"' for 42", () => {
    expect(stableStringify(42)).toBe("42");
  });

  it('returns \'"hello"\' for "hello"', () => {
    expect(stableStringify("hello")).toBe('"hello"');
  });

  it("returns 'true' for true", () => {
    expect(stableStringify(true)).toBe("true");
  });

  it("returns expected value for undefined", () => {
    expect(stableStringify(undefined)).toBe("undefined");
  });

  it("preserves array order: [1, 2, 3]", () => {
    expect(stableStringify([1, 2, 3])).toBe("[1,2,3]");
  });

  it("handles nested objects with sorted keys", () => {
    const result = stableStringify({ z: { b: 2, a: 1 }, a: 3 });
    expect(result).toBe('{"a":3,"z":{"a":1,"b":2}}');
  });

  it("handles nested arrays within objects", () => {
    const result = stableStringify({ items: [1, 2, 3], name: "test" });
    expect(result).toBe('{"items":[1,2,3],"name":"test"}');
  });

  it("handles deeply nested mixed structures", () => {
    const value = { a: [{ z: 1, a: 2 }, [3, 4]], b: null };
    const result = stableStringify(value);
    expect(result).toBe('{"a":[{"a":2,"z":1},[3,4]],"b":null}');
  });

  it("returns '{}' for empty object (void params)", () => {
    expect(stableStringify({})).toBe("{}");
  });
});

describe("createCacheKey", () => {
  it("returns tuple [portName, paramsHash]", () => {
    const key = createCacheKey(UsersPort, { role: "admin" });
    expect(key[0]).toBe("Users");
    expect(typeof key[1]).toBe("string");
  });

  it("first element is the port name", () => {
    const key = createCacheKey(UsersPort, undefined);
    expect(key[0]).toBe("Users");
  });

  it("second element is the deterministic params hash", () => {
    const key1 = createCacheKey(UsersPort, { b: 2, a: 1 });
    const key2 = createCacheKey(UsersPort, { a: 1, b: 2 });
    expect(key1[1]).toBe(key2[1]);
  });

  it("same port + same params always produce the same cache key", () => {
    const key1 = createCacheKey(UsersPort, { role: "admin" });
    const key2 = createCacheKey(UsersPort, { role: "admin" });
    expect(key1[0]).toBe(key2[0]);
    expect(key1[1]).toBe(key2[1]);
  });

  it("same port + different params produce different cache keys", () => {
    const key1 = createCacheKey(UsersPort, { role: "admin" });
    const key2 = createCacheKey(UsersPort, { role: "user" });
    expect(key1[1]).not.toBe(key2[1]);
  });

  it("different ports + same params produce different cache keys", () => {
    const key1 = createCacheKey(UsersPort, { id: "1" });
    const key2 = createCacheKey(PostsPort, { id: "1" });
    expect(key1[0]).not.toBe(key2[0]);
  });
});

describe("serializeCacheKey", () => {
  it("serializes cache key to a single string", () => {
    const key = createCacheKey(UsersPort, { role: "admin" });
    const serialized = serializeCacheKey(key);
    expect(typeof serialized).toBe("string");
    expect(serialized).toContain("Users");
  });
});

describe("cacheKeyMatchesPort", () => {
  it("returns true when key belongs to the port", () => {
    const key = createCacheKey(UsersPort, undefined);
    expect(cacheKeyMatchesPort(key, "Users")).toBe(true);
  });

  it("returns false when key belongs to a different port", () => {
    const key = createCacheKey(UsersPort, undefined);
    expect(cacheKeyMatchesPort(key, "Posts")).toBe(false);
  });
});

describe("createCacheKeyFromName", () => {
  it("creates a cache key from port name and params", () => {
    const key = createCacheKeyFromName("Users", { role: "admin" });
    expect(key[0]).toBe("Users");
    expect(typeof key[1]).toBe("string");
  });
});

// =============================================================================
// New mutation-killing tests for stableStringify below
// =============================================================================

describe("stableStringify edge cases", () => {
  it("empty array produces '[]'", () => {
    expect(stableStringify([])).toBe("[]");
  });

  it("deeply nested sorted keys produce correct output", () => {
    const value = { z: { y: { b: 2, a: 1 }, x: 3 }, a: 0 };
    const result = stableStringify(value);
    expect(result).toBe('{"a":0,"z":{"x":3,"y":{"a":1,"b":2}}}');
  });

  it("special characters in strings are properly escaped", () => {
    const result = stableStringify({ key: 'value with "quotes" and \n newline' });
    // JSON.stringify handles escaping
    expect(result).toContain('\\"quotes\\"');
    expect(result).toContain("\\n");
  });

  it("array with undefined elements", () => {
    const result = stableStringify([1, undefined, 3]);
    // stableStringify maps each element, and stableStringify(undefined) returns "undefined"
    expect(result).toBe("[1,undefined,3]");
  });

  it("{b:1, a:2} produces exact output with sorted keys", () => {
    const result = stableStringify({ b: 1, a: 2 });
    expect(result).toBe('{"a":2,"b":1}');
  });

  it("false produces 'false'", () => {
    expect(stableStringify(false)).toBe("false");
  });

  it("0 produces '0'", () => {
    expect(stableStringify(0)).toBe("0");
  });

  it("empty string produces '\"\"'", () => {
    expect(stableStringify("")).toBe('""');
  });

  it("Date object is treated as record (has Object keys)", () => {
    // Date passes isRecord (typeof === "object", not null, not array)
    // Object.keys(date) returns [] since Date has no own enumerable string keys
    const date = new Date("2024-01-01T00:00:00.000Z");
    const result = stableStringify(date);
    // Object.keys on a Date returns [], so it becomes "{}"
    expect(result).toBe("{}");
  });

  it("nested array within array preserves order", () => {
    const result = stableStringify([
      [3, 2, 1],
      [6, 5, 4],
    ]);
    expect(result).toBe("[[3,2,1],[6,5,4]]");
  });
});

describe("stableStringify isRecord boundary tests", () => {
  it("null is NOT a record - returns 'null'", () => {
    // Tests the null check in isRecord: value === null returns false
    const result = stableStringify(null);
    expect(result).toBe("null");
    // Ensure it's exactly 4 characters
    expect(result.length).toBe(4);
  });

  it("array is NOT a record - returns '[1,2]'", () => {
    // Tests the Array.isArray check in isRecord
    const result = stableStringify([1, 2]);
    expect(result).toBe("[1,2]");
  });

  it("simple {a:1} uses sorted keys and produces exact output", () => {
    const result = stableStringify({ a: 1 });
    expect(result).toBe('{"a":1}');
  });
});

describe("stableStringify primitive exact outputs", () => {
  it("number 42 returns exact string '42'", () => {
    const result = stableStringify(42);
    expect(result).toBe("42");
    expect(typeof result).toBe("string");
  });

  it("boolean true returns exact string 'true'", () => {
    const result = stableStringify(true);
    expect(result).toBe("true");
    expect(typeof result).toBe("string");
  });

  it("boolean false returns exact string 'false'", () => {
    const result = stableStringify(false);
    expect(result).toBe("false");
  });

  it("string 'str' returns exact string '\"str\"'", () => {
    const result = stableStringify("str");
    expect(result).toBe('"str"');
  });

  it("number 0 returns exact string '0'", () => {
    const result = stableStringify(0);
    expect(result).toBe("0");
  });

  it("negative number returns correct string", () => {
    const result = stableStringify(-1);
    expect(result).toBe("-1");
  });

  it("null returns exact string 'null' (not a record despite typeof 'object')", () => {
    // This specifically tests the early return path for null
    // typeof null === "object" but value === null, so it goes to JSON.stringify
    const result = stableStringify(null);
    expect(result).toBe("null");
  });
});

// =============================================================================
// Targeted mutation-killing tests (round 2) for stableStringify
// =============================================================================

describe("stableStringify isRecord three-part check", () => {
  it("typeof check: number is not object → JSON.stringify path", () => {
    // Tests typeof value === "object" returning false
    expect(stableStringify(42)).toBe("42");
    expect(stableStringify(42)).not.toBe("");
  });

  it("typeof check: string is not object → JSON.stringify path", () => {
    expect(stableStringify("abc")).toBe('"abc"');
    expect(stableStringify("abc")).not.toBe("abc");
  });

  it("null check: null is object but rejected by !== null", () => {
    const result = stableStringify(null);
    // null goes through JSON.stringify path (not the sorted-keys path)
    expect(result).toBe("null");
    expect(result).not.toBe("{}");
  });

  it("Array.isArray check: array goes through map path not sorted-keys", () => {
    const result = stableStringify([3, 1, 2]);
    // Arrays preserve order (not sorted like object keys)
    expect(result).toBe("[3,1,2]");
    expect(result).not.toBe("[1,2,3]");
  });

  it("plain object goes through sorted-keys path", () => {
    const result = stableStringify({ c: 3, a: 1, b: 2 });
    // Keys are sorted alphabetically
    expect(result).toBe('{"a":1,"b":2,"c":3}');
  });
});

describe("stableStringify Object.keys sorting (targeted)", () => {
  it("two-key object with reverse alphabetical keys", () => {
    const result = stableStringify({ z: 0, a: 0 });
    expect(result).toBe('{"a":0,"z":0}');
  });

  it("single key object", () => {
    const result = stableStringify({ x: 5 });
    expect(result).toBe('{"x":5}');
  });

  it("keys with numbers sort lexicographically", () => {
    const result = stableStringify({ "2": "b", "10": "a", "1": "c" });
    // Lexicographic: "1" < "10" < "2"
    expect(result).toBe('{"1":"c","10":"a","2":"b"}');
  });
});

describe("stableStringify array map recursion (targeted)", () => {
  it("array with objects recursively applies stableStringify", () => {
    const result = stableStringify([{ b: 2, a: 1 }]);
    // Inner object should have sorted keys
    expect(result).toBe('[{"a":1,"b":2}]');
  });

  it("array with null element", () => {
    const result = stableStringify([null]);
    expect(result).toBe("[null]");
  });
});

// =============================================================================
// Cache key integration tests that exercise stableStringify through createCacheKey
// =============================================================================

describe("createCacheKey exercises stableStringify paths", () => {
  it("null params produces 'null' hash (isRecord false path)", () => {
    const key = createCacheKey({ __portName: "P" }, null);
    expect(key[1]).toBe("null");
  });

  it("undefined params produces 'undefined' hash", () => {
    const key = createCacheKey({ __portName: "P" }, undefined);
    expect(key[1]).toBe("undefined");
  });

  it("number params produces number string hash", () => {
    const key = createCacheKey({ __portName: "P" }, 42);
    expect(key[1]).toBe("42");
  });

  it("string params produces quoted string hash", () => {
    const key = createCacheKey({ __portName: "P" }, "hello");
    expect(key[1]).toBe('"hello"');
  });

  it("boolean params produces boolean string hash", () => {
    const key = createCacheKey({ __portName: "P" }, true);
    expect(key[1]).toBe("true");
  });

  it("array params produces array string hash", () => {
    const key = createCacheKey({ __portName: "P" }, [1, 2]);
    expect(key[1]).toBe("[1,2]");
  });

  it("object params produces sorted-keys string hash", () => {
    const key = createCacheKey({ __portName: "P" }, { b: 1, a: 2 });
    expect(key[1]).toBe('{"a":2,"b":1}');
  });

  it("empty object params produces '{}' hash", () => {
    const key = createCacheKey({ __portName: "P" }, {});
    expect(key[1]).toBe("{}");
  });

  it("empty array params produces '[]' hash", () => {
    const key = createCacheKey({ __portName: "P" }, []);
    expect(key[1]).toBe("[]");
  });
});

// =============================================================================
// Round 3: Aggressive mutant-killing tests for stable-stringify
// =============================================================================

describe("stableStringify join/concat mutations (targeted)", () => {
  it("array join uses comma separator: [1,2] not [12]", () => {
    const result = stableStringify([1, 2]);
    expect(result).toBe("[1,2]");
    expect(result).not.toBe("[12]");
    expect(result).not.toBe("12");
    expect(result.length).toBe(5); // "[1,2]" = 5 chars
  });

  it("object pairs join uses comma separator: {a:1,b:2}", () => {
    const result = stableStringify({ a: 1, b: 2 });
    expect(result).toBe('{"a":1,"b":2}');
    expect(result).not.toBe('{"a":1"b":2}');
    expect(result).toContain(",");
  });

  it("key-value separator is colon: 'key:value'", () => {
    const result = stableStringify({ x: 5 });
    expect(result).toBe('{"x":5}');
    expect(result).toContain(":");
  });

  it("array brackets are present", () => {
    const result = stableStringify([42]);
    expect(result).toBe("[42]");
    expect(result.startsWith("[")).toBe(true);
    expect(result.endsWith("]")).toBe(true);
  });

  it("object braces are present", () => {
    const result = stableStringify({ z: 0 });
    expect(result).toBe('{"z":0}');
    expect(result.startsWith("{")).toBe(true);
    expect(result.endsWith("}")).toBe(true);
  });

  it("three-element array with correct comma count", () => {
    const result = stableStringify([10, 20, 30]);
    expect(result).toBe("[10,20,30]");
    // Exactly 2 commas for 3 elements
    const commaCount = (result.match(/,/g) ?? []).length;
    expect(commaCount).toBe(2);
  });

  it("three-key object with correct comma count", () => {
    const result = stableStringify({ c: 3, b: 2, a: 1 });
    expect(result).toBe('{"a":1,"b":2,"c":3}');
    // Keys sorted, 2 commas between 3 pairs
    const commaCount = (result.match(/,/g) ?? []).length;
    expect(commaCount).toBe(2);
  });
});

describe("stableStringify ?? operator on JSON.stringify (targeted)", () => {
  it("undefined goes through JSON.stringify which returns undefined, then ?? gives 'undefined'", () => {
    const result = stableStringify(undefined);
    expect(result).toBe("undefined");
    expect(typeof result).toBe("string");
    // Must be the string "undefined", not the value undefined
    expect(result).not.toBeUndefined();
  });

  it("null goes through JSON.stringify which returns 'null' (not nullish)", () => {
    const result = stableStringify(null);
    expect(result).toBe("null");
    expect(result).not.toBe("undefined"); // ?? should not trigger for null input
  });

  it("number goes through JSON.stringify which returns string (not nullish)", () => {
    const result = stableStringify(42);
    expect(result).toBe("42");
    expect(result).not.toBe("undefined"); // ?? should not trigger for numbers
  });
});

describe("stableStringify sort behavior (targeted)", () => {
  it("three keys in reverse alphabetical order are sorted", () => {
    const result = stableStringify({ z: 3, m: 2, a: 1 });
    expect(result).toBe('{"a":1,"m":2,"z":3}');
  });

  it("sort is stable for same-length keys", () => {
    const result = stableStringify({ bb: 2, aa: 1, cc: 3 });
    expect(result).toBe('{"aa":1,"bb":2,"cc":3}');
  });

  it("nested objects also have sorted keys", () => {
    const result = stableStringify({ outer: { z: 1, a: 2 } });
    expect(result).toBe('{"outer":{"a":2,"z":1}}');
  });
});

describe("stableStringify map recursion (targeted)", () => {
  it("array.map calls stableStringify recursively for each element", () => {
    const result = stableStringify([{ b: 1, a: 2 }, [3], null, "hi", 42]);
    expect(result).toBe('[{"a":2,"b":1},[3],null,"hi",42]');
  });

  it("single-element array preserves brackets", () => {
    const result = stableStringify([1]);
    expect(result).toBe("[1]");
    expect(result).not.toBe("1");
  });
});

describe("stableStringify JSON.stringify key escaping (targeted)", () => {
  it("key with special characters is properly escaped via JSON.stringify", () => {
    const result = stableStringify({ 'key"with"quotes': 1 });
    expect(result).toContain('key\\"with\\"quotes');
  });
});
