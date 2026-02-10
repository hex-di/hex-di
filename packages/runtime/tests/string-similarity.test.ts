/**
 * Tests for src/util/string-similarity.ts
 */
import { describe, it, expect } from "vitest";
import { levenshteinDistance, suggestSimilarPort } from "../src/util/string-similarity.js";

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("abc", "abc")).toBe(0);
    expect(levenshteinDistance("", "")).toBe(0);
    expect(levenshteinDistance("Hello", "Hello")).toBe(0);
  });

  it("returns length of b when a is empty", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("", "x")).toBe(1);
  });

  it("returns length of a when b is empty", () => {
    expect(levenshteinDistance("abc", "")).toBe(3);
    expect(levenshteinDistance("x", "")).toBe(1);
  });

  it("returns 1 for single character substitution", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1);
  });

  it("returns 1 for single character insertion", () => {
    expect(levenshteinDistance("ab", "abc")).toBe(1);
  });

  it("returns 1 for single character deletion", () => {
    expect(levenshteinDistance("abc", "ab")).toBe(1);
  });

  it("returns correct distance for common examples", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    expect(levenshteinDistance("UserService", "UserServce")).toBe(1);
  });

  it("handles completely different strings", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(3);
  });

  it("is symmetric (distance(a,b) === distance(b,a))", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(levenshteinDistance("xyz", "abc"));
    expect(levenshteinDistance("kitten", "sitting")).toBe(levenshteinDistance("sitting", "kitten"));
  });
});

describe("suggestSimilarPort", () => {
  it("returns undefined when no close match exists", () => {
    const result = suggestSimilarPort("CompletelyDifferent", ["Logger", "Database"]);
    expect(result).toBeUndefined();
  });

  it("returns closest match within MAX_DISTANCE (2)", () => {
    const result = suggestSimilarPort("Logge", ["Logger", "Database", "Cache"]);
    expect(result).toBe("Logger");
  });

  it("returns exact match (distance 0)", () => {
    const result = suggestSimilarPort("Logger", ["Logger", "Database"]);
    expect(result).toBe("Logger");
  });

  it("returns match with distance 1", () => {
    const result = suggestSimilarPort("Loger", ["Logger", "Database"]);
    expect(result).toBe("Logger");
  });

  it("returns match with distance 2", () => {
    const result = suggestSimilarPort("Lgger", ["Logger", "Database"]);
    expect(result).toBe("Logger");
  });

  it("returns undefined when distance is greater than 2", () => {
    // "XYZ" vs "Logger" has distance 6 - way above threshold
    const result = suggestSimilarPort("XYZ", ["Logger", "Database"]);
    expect(result).toBeUndefined();
  });

  it("returns the closest match among multiple candidates", () => {
    const result = suggestSimilarPort("Loggor", ["Logger", "Loggar"]);
    // Both are distance 1, but "Logger" comes first
    expect(result).toBe("Logger");
  });

  it("returns undefined for empty available ports", () => {
    const result = suggestSimilarPort("Logger", []);
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty attempted name with no close matches", () => {
    const result = suggestSimilarPort("", ["SomeVeryLongName"]);
    expect(result).toBeUndefined();
  });

  it("returns short port name for empty attempted name within distance", () => {
    const result = suggestSimilarPort("", ["AB"]);
    expect(result).toBe("AB");
  });
});
