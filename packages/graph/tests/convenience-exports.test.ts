/**
 * Tests for @hex-di/graph/convenience subpath export.
 *
 * Verifies that the convenience subpath correctly exports defineService
 * and defineAsyncService, and that they work identically to the main exports.
 */

import { describe, expect, it } from "vitest";

// Import from convenience subpath
import {
  defineService as defineServiceConvenience,
  defineAsyncService as defineAsyncServiceConvenience,
} from "../src/convenience.js";

// Import from main entry for comparison
import { defineService, defineAsyncService } from "../src/index.js";

import type { Logger, Database } from "./fixtures.js";

describe("@hex-di/graph/convenience exports", () => {
  describe("defineService", () => {
    it("is exported and creates port/adapter tuple", () => {
      const [port, adapter] = defineServiceConvenience<"Logger", Logger>("Logger", {
        factory: () => ({ log: () => {} }),
      });

      expect(port.__portName).toBe("Logger");
      expect(adapter.provides).toBe(port);
      expect(adapter.lifetime).toBe("singleton");
    });

    it("behaves identically to main export", () => {
      // Use inferred types (let overloads work) for lifetime variant
      const [conveniencePort, convenienceAdapter] = defineServiceConvenience("Test", {
        lifetime: "scoped",
        factory: (): Logger => ({ log: () => {} }),
      });

      const [mainPort, mainAdapter] = defineService("Test", {
        lifetime: "scoped",
        factory: (): Logger => ({ log: () => {} }),
      });

      // Ports should have same structure
      expect(conveniencePort.__portName).toBe(mainPort.__portName);

      // Adapters should have same configuration
      expect(convenienceAdapter.lifetime).toBe(mainAdapter.lifetime);
      expect(convenienceAdapter.requires).toEqual(mainAdapter.requires);
    });
  });

  describe("defineAsyncService", () => {
    it("is exported and creates port/adapter tuple", async () => {
      const [port, adapter] = defineAsyncServiceConvenience<"Database", Database>("Database", {
        factory: async () => ({ query: async () => ({}) }),
      });

      expect(port.__portName).toBe("Database");
      expect(adapter.provides).toBe(port);
      expect(adapter.lifetime).toBe("singleton");
      expect(adapter.factoryKind).toBe("async");
    });

    it("behaves identically to main export", async () => {
      const [conveniencePort, convenienceAdapter] = defineAsyncServiceConvenience<
        "Async",
        Database
      >("Async", {
        factory: async () => ({ query: async () => ({}) }),
      });

      const [mainPort, mainAdapter] = defineAsyncService<"Async", Database>("Async", {
        factory: async () => ({ query: async () => ({}) }),
      });

      // Ports should have same structure
      expect(conveniencePort.__portName).toBe(mainPort.__portName);

      // Adapters should have same configuration
      expect(convenienceAdapter.lifetime).toBe(mainAdapter.lifetime);
      expect(convenienceAdapter.factoryKind).toBe(mainAdapter.factoryKind);
    });
  });
});
