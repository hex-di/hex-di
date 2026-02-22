/**
 * UAT Tests for Phase 6: Core Port API
 *
 * Validates all user-observable outcomes from the unified createPort() API.
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import {
  port,
  createPort,
  getPortDirection,
  getPortMetadata,
  type DirectedPort,
  type InferService,
  type InferPortDirection,
} from "../src/index.js";

// Test service interfaces
interface MyService {
  doSomething(): void;
}

interface Logger {
  log(message: string): void;
}

describe("Phase 6 UAT: Core Port API", () => {
  // ==========================================================================
  // Test 1: Basic port() with object config - TName inference
  // ==========================================================================
  describe("Test 1: port() builder infers literal name", () => {
    it("infers TName as literal type when TService is provided", () => {
      const LoggerPort = port<Logger>()({ name: "Logger" });

      // TName should be "Logger" (literal), not string
      expectTypeOf(LoggerPort.__portName).toEqualTypeOf<"Logger">();
      expect(LoggerPort.__portName).toBe("Logger");
    });

    it("preserves service type", () => {
      const LoggerPort = port<Logger>()({ name: "Logger" });

      expectTypeOf<InferService<typeof LoggerPort>>().toEqualTypeOf<Logger>();
    });

    it("returns correct DirectedPort type", () => {
      const LoggerPort = port<Logger>()({ name: "Logger" });

      expectTypeOf(LoggerPort).toEqualTypeOf<DirectedPort<"Logger", Logger, "outbound">>();
    });
  });

  // ==========================================================================
  // Test 2: Direction defaults to outbound
  // ==========================================================================
  describe("Test 2: Direction defaults to outbound", () => {
    it("defaults direction to 'outbound' when not specified", () => {
      const TestPort = port<MyService>()({ name: "Test" });

      expect(getPortDirection(TestPort)).toBe("outbound");
    });

    it("infers direction type as 'outbound'", () => {
      const TestPort = port<MyService>()({ name: "Test" });

      expectTypeOf<InferPortDirection<typeof TestPort>>().toEqualTypeOf<"outbound">();
    });
  });

  // ==========================================================================
  // Test 3: Explicit inbound direction
  // ==========================================================================
  describe("Test 3: Explicit inbound direction", () => {
    it("creates port with 'inbound' direction when specified", () => {
      const RequestPort = port<MyService>()({ name: "Request", direction: "inbound" });

      expect(getPortDirection(RequestPort)).toBe("inbound");
    });

    it("infers direction type as 'inbound'", () => {
      const RequestPort = port<MyService>()({ name: "Request", direction: "inbound" });

      expectTypeOf<InferPortDirection<typeof RequestPort>>().toEqualTypeOf<"inbound">();
    });
  });

  // ==========================================================================
  // Test 4: Metadata - description property
  // ==========================================================================
  describe("Test 4: Metadata - description property", () => {
    it("stores and returns description from metadata", () => {
      const TestPort = port<MyService>()({
        name: "Test",
        description: "My port description",
      });

      const metadata = getPortMetadata(TestPort);
      expect(metadata?.description).toBe("My port description");
    });
  });

  // ==========================================================================
  // Test 5: Metadata - category property
  // ==========================================================================
  describe("Test 5: Metadata - category property", () => {
    it("stores and returns category from metadata", () => {
      const TestPort = port<MyService>()({
        name: "Test",
        category: "infrastructure",
      });

      const metadata = getPortMetadata(TestPort);
      expect(metadata?.category).toBe("infrastructure");
    });

    it("accepts custom category strings", () => {
      const TestPort = port<MyService>()({
        name: "Test",
        category: "my-custom-category",
      });

      const metadata = getPortMetadata(TestPort);
      expect(metadata?.category).toBe("my-custom-category");
    });
  });

  // ==========================================================================
  // Test 6: Metadata - tags property
  // ==========================================================================
  describe("Test 6: Metadata - tags property", () => {
    it("stores and returns tags from metadata", () => {
      const TestPort = port<MyService>()({
        name: "Test",
        tags: ["logging", "core"],
      });

      const metadata = getPortMetadata(TestPort);
      expect(metadata?.tags).toEqual(["logging", "core"]);
    });
  });

  // ==========================================================================
  // Test 7: Default metadata values
  // ==========================================================================
  describe("Test 7: Default metadata values", () => {
    it("returns empty array for tags when not specified", () => {
      const TestPort = port<MyService>()({ name: "Test" });

      const metadata = getPortMetadata(TestPort);
      expect(metadata?.tags).toEqual([]);
    });

    it("returns undefined for description when not specified", () => {
      const TestPort = port<MyService>()({ name: "Test" });

      const metadata = getPortMetadata(TestPort);
      expect(metadata?.description).toBeUndefined();
    });

    it("returns undefined for category when not specified", () => {
      const TestPort = port<MyService>()({ name: "Test" });

      const metadata = getPortMetadata(TestPort);
      expect(metadata?.category).toBeUndefined();
    });
  });

  // ==========================================================================
  // Test 8: Full type inference (without explicit service type)
  // ==========================================================================
  describe("Test 8: Full type inference", () => {
    it("infers literal name with createPort (no type params)", () => {
      const TestPort = createPort({ name: "TestInferred" });

      // Name should be literal
      expectTypeOf(TestPort.__portName).toEqualTypeOf<"TestInferred">();
      expect(TestPort.__portName).toBe("TestInferred");
    });

    it("service type is unknown when not specified", () => {
      const TestPort = createPort({ name: "TestInferred" });

      expectTypeOf<InferService<typeof TestPort>>().toEqualTypeOf<unknown>();
    });

    it("direction defaults to outbound", () => {
      const TestPort = createPort({ name: "TestInferred" });

      expectTypeOf<InferPortDirection<typeof TestPort>>().toEqualTypeOf<"outbound">();
      expect(getPortDirection(TestPort)).toBe("outbound");
    });

    it("infers inbound direction when specified", () => {
      const TestPort = createPort({ name: "TestInferred", direction: "inbound" });

      expectTypeOf<InferPortDirection<typeof TestPort>>().toEqualTypeOf<"inbound">();
      expect(getPortDirection(TestPort)).toBe("inbound");
    });
  });

  // ==========================================================================
  // Test 9: Build passes (verified by test runner)
  // ==========================================================================
  describe("Test 9: Build verification", () => {
    it("all imports resolve correctly", () => {
      // If this test runs, the build is working
      expect(typeof port).toBe("function");
      expect(typeof createPort).toBe("function");
      expect(typeof getPortDirection).toBe("function");
      expect(typeof getPortMetadata).toBe("function");
    });
  });

  // ==========================================================================
  // Test 10: All functionality works together
  // ==========================================================================
  describe("Test 10: Full integration", () => {
    it("creates fully configured port with all options", () => {
      const FullPort = port<Logger>()({
        name: "FullLogger",
        direction: "outbound",
        description: "Full logging service",
        category: "infrastructure",
        tags: ["logging", "observability", "core"],
      });

      // Verify all properties
      expect(FullPort.__portName).toBe("FullLogger");
      expect(getPortDirection(FullPort)).toBe("outbound");

      const metadata = getPortMetadata(FullPort);
      expect(metadata?.description).toBe("Full logging service");
      expect(metadata?.category).toBe("infrastructure");
      expect(metadata?.tags).toEqual(["logging", "observability", "core"]);

      // Verify types
      expectTypeOf(FullPort).toEqualTypeOf<
        DirectedPort<"FullLogger", Logger, "outbound", "infrastructure">
      >();
    });

    it("different port names with same service work correctly", () => {
      const ConsoleLogger = port<Logger>()({ name: "ConsoleLogger" });
      const FileLogger = port<Logger>()({ name: "FileLogger" });

      expect(ConsoleLogger.__portName).toBe("ConsoleLogger");
      expect(FileLogger.__portName).toBe("FileLogger");

      expectTypeOf(ConsoleLogger.__portName).toEqualTypeOf<"ConsoleLogger">();
      expectTypeOf(FileLogger.__portName).toEqualTypeOf<"FileLogger">();
    });
  });
});
