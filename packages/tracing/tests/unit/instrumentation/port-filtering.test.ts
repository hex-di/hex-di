/**
 * Tests for port filter evaluation logic.
 *
 * Verifies:
 * - Undefined filter behavior (returns true for all ports)
 * - Predicate filter execution and return value
 * - Declarative include filter (only included ports traced)
 * - Declarative exclude filter (all except excluded ports traced)
 * - Include + exclude combination (include takes precedence)
 * - Empty array behavior (include [] traces nothing, exclude [] traces everything)
 */

import { describe, it, expect, vi } from "vitest";
import { evaluatePortFilter } from "../../../src/instrumentation/types.js";

describe("evaluatePortFilter", () => {
  describe("undefined filter", () => {
    it("should return true for all ports when filter is undefined", () => {
      expect(evaluatePortFilter(undefined, "Logger")).toBe(true);
      expect(evaluatePortFilter(undefined, "Database")).toBe(true);
      expect(evaluatePortFilter(undefined, "Cache")).toBe(true);
      expect(evaluatePortFilter(undefined, "AnyPort")).toBe(true);
    });
  });

  describe("predicate filter", () => {
    it("should call predicate function with port name", () => {
      const predicate = vi.fn().mockReturnValue(true);

      evaluatePortFilter(predicate, "TestPort");

      expect(predicate).toHaveBeenCalledTimes(1);
      expect(predicate).toHaveBeenCalledWith("TestPort");
    });

    it("should return predicate result when true", () => {
      const predicate = vi.fn().mockReturnValue(true);

      const result = evaluatePortFilter(predicate, "Logger");

      expect(result).toBe(true);
    });

    it("should return predicate result when false", () => {
      const predicate = vi.fn().mockReturnValue(false);

      const result = evaluatePortFilter(predicate, "Logger");

      expect(result).toBe(false);
    });

    it("should work with prefix matching predicate", () => {
      const predicate = (name: string) => name.startsWith("Api");

      expect(evaluatePortFilter(predicate, "ApiService")).toBe(true);
      expect(evaluatePortFilter(predicate, "ApiClient")).toBe(true);
      expect(evaluatePortFilter(predicate, "DatabaseService")).toBe(false);
    });

    it("should work with suffix matching predicate", () => {
      const predicate = (name: string) => name.endsWith("Service");

      expect(evaluatePortFilter(predicate, "UserService")).toBe(true);
      expect(evaluatePortFilter(predicate, "AuthService")).toBe(true);
      expect(evaluatePortFilter(predicate, "Logger")).toBe(false);
    });

    it("should work with complex predicate logic", () => {
      const predicate = (name: string) => name.length > 8 && name.includes("Service");

      expect(evaluatePortFilter(predicate, "UserService")).toBe(true); // length 11
      expect(evaluatePortFilter(predicate, "Service")).toBe(false); // length 7, too short
      expect(evaluatePortFilter(predicate, "Logger")).toBe(false); // Doesn't include "Service"
    });
  });

  describe("declarative filter - include", () => {
    it("should include only listed ports when include specified", () => {
      const filter = { include: ["Logger", "Database"] };

      expect(evaluatePortFilter(filter, "Logger")).toBe(true);
      expect(evaluatePortFilter(filter, "Database")).toBe(true);
      expect(evaluatePortFilter(filter, "Cache")).toBe(false);
      expect(evaluatePortFilter(filter, "ApiService")).toBe(false);
    });

    it("should handle empty include array", () => {
      const filter = { include: [] };

      // Empty include means nothing is included
      expect(evaluatePortFilter(filter, "Logger")).toBe(false);
      expect(evaluatePortFilter(filter, "Database")).toBe(false);
      expect(evaluatePortFilter(filter, "AnyPort")).toBe(false);
    });

    it("should be case-sensitive", () => {
      const filter = { include: ["Logger"] };

      expect(evaluatePortFilter(filter, "Logger")).toBe(true);
      expect(evaluatePortFilter(filter, "logger")).toBe(false);
      expect(evaluatePortFilter(filter, "LOGGER")).toBe(false);
    });

    it("should handle single port in include array", () => {
      const filter = { include: ["Logger"] };

      expect(evaluatePortFilter(filter, "Logger")).toBe(true);
      expect(evaluatePortFilter(filter, "Database")).toBe(false);
    });

    it("should handle many ports in include array", () => {
      const filter = {
        include: ["Logger", "Database", "Cache", "ApiService", "AuthService"],
      };

      expect(evaluatePortFilter(filter, "Logger")).toBe(true);
      expect(evaluatePortFilter(filter, "Database")).toBe(true);
      expect(evaluatePortFilter(filter, "Cache")).toBe(true);
      expect(evaluatePortFilter(filter, "ApiService")).toBe(true);
      expect(evaluatePortFilter(filter, "AuthService")).toBe(true);
      expect(evaluatePortFilter(filter, "OtherService")).toBe(false);
    });
  });

  describe("declarative filter - exclude", () => {
    it("should exclude listed ports when exclude specified", () => {
      const filter = { exclude: ["InternalCache", "DebugHelper"] };

      expect(evaluatePortFilter(filter, "Logger")).toBe(true);
      expect(evaluatePortFilter(filter, "Database")).toBe(true);
      expect(evaluatePortFilter(filter, "InternalCache")).toBe(false);
      expect(evaluatePortFilter(filter, "DebugHelper")).toBe(false);
    });

    it("should handle empty exclude array", () => {
      const filter = { exclude: [] };

      // Empty exclude means nothing is excluded, everything is traced
      expect(evaluatePortFilter(filter, "Logger")).toBe(true);
      expect(evaluatePortFilter(filter, "Database")).toBe(true);
      expect(evaluatePortFilter(filter, "AnyPort")).toBe(true);
    });

    it("should be case-sensitive", () => {
      const filter = { exclude: ["Logger"] };

      expect(evaluatePortFilter(filter, "Logger")).toBe(false);
      expect(evaluatePortFilter(filter, "logger")).toBe(true);
      expect(evaluatePortFilter(filter, "LOGGER")).toBe(true);
    });

    it("should handle single port in exclude array", () => {
      const filter = { exclude: ["Logger"] };

      expect(evaluatePortFilter(filter, "Logger")).toBe(false);
      expect(evaluatePortFilter(filter, "Database")).toBe(true);
    });

    it("should handle many ports in exclude array", () => {
      const filter = {
        exclude: ["InternalCache", "DebugHelper", "TestUtil", "MockService"],
      };

      expect(evaluatePortFilter(filter, "Logger")).toBe(true);
      expect(evaluatePortFilter(filter, "Database")).toBe(true);
      expect(evaluatePortFilter(filter, "InternalCache")).toBe(false);
      expect(evaluatePortFilter(filter, "DebugHelper")).toBe(false);
      expect(evaluatePortFilter(filter, "TestUtil")).toBe(false);
      expect(evaluatePortFilter(filter, "MockService")).toBe(false);
    });
  });

  describe("declarative filter - include + exclude", () => {
    it("should prioritize include over exclude", () => {
      const filter = {
        include: ["Logger", "Database"],
        exclude: ["Cache", "ApiService"],
      };

      // Include takes precedence - only Logger and Database are included
      expect(evaluatePortFilter(filter, "Logger")).toBe(true);
      expect(evaluatePortFilter(filter, "Database")).toBe(true);
      expect(evaluatePortFilter(filter, "Cache")).toBe(false); // Excluded but not included
      expect(evaluatePortFilter(filter, "ApiService")).toBe(false); // Excluded but not included
      expect(evaluatePortFilter(filter, "OtherService")).toBe(false); // Not in include list
    });

    it("should ignore exclude when include is specified", () => {
      const filter = {
        include: ["Logger", "Database", "Cache"],
        exclude: ["Cache"], // This is ignored because include is present
      };

      // Include list determines what's traced, exclude is ignored
      expect(evaluatePortFilter(filter, "Logger")).toBe(true);
      expect(evaluatePortFilter(filter, "Database")).toBe(true);
      expect(evaluatePortFilter(filter, "Cache")).toBe(true); // In include list, so traced
    });

    it("should handle empty include with exclude", () => {
      const filter = {
        include: [],
        exclude: ["Logger"],
      };

      // Empty include means nothing is included, regardless of exclude
      expect(evaluatePortFilter(filter, "Logger")).toBe(false);
      expect(evaluatePortFilter(filter, "Database")).toBe(false);
      expect(evaluatePortFilter(filter, "Cache")).toBe(false);
    });

    it("should handle include with empty exclude", () => {
      const filter = {
        include: ["Logger", "Database"],
        exclude: [],
      };

      // Include determines what's traced
      expect(evaluatePortFilter(filter, "Logger")).toBe(true);
      expect(evaluatePortFilter(filter, "Database")).toBe(true);
      expect(evaluatePortFilter(filter, "Cache")).toBe(false);
    });
  });

  describe("declarative filter - edge cases", () => {
    it("should handle filter with neither include nor exclude", () => {
      const filter = {};

      // Neither include nor exclude means trace everything
      expect(evaluatePortFilter(filter, "Logger")).toBe(true);
      expect(evaluatePortFilter(filter, "Database")).toBe(true);
      expect(evaluatePortFilter(filter, "AnyPort")).toBe(true);
    });

    it("should handle filter with undefined include and exclude", () => {
      const filter = { include: undefined, exclude: undefined };

      // Explicitly undefined include/exclude means trace everything
      expect(evaluatePortFilter(filter, "Logger")).toBe(true);
      expect(evaluatePortFilter(filter, "Database")).toBe(true);
      expect(evaluatePortFilter(filter, "AnyPort")).toBe(true);
    });
  });
});
