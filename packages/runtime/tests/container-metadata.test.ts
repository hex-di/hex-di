/**
 * Tests for Container Naming API.
 *
 * Verifies that containers expose name, parentName, and kind properties.
 * Child containers should automatically derive parentName from their parent.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Config {
  apiUrl: string;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const ConfigPort = createPort<"Config", Config>("Config");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ apiUrl: "http://localhost" }),
});

const rootGraph = GraphBuilder.create().provide(LoggerAdapter).build();

const childGraph = GraphBuilder.create().provide(ConfigAdapter).buildFragment();

// =============================================================================
// Container Naming Tests
// =============================================================================

describe("Container Naming", () => {
  describe("Root Container", () => {
    it("should have name and null parentName", () => {
      const root = createContainer(rootGraph, { name: "Root Container" });

      expect(root.name).toBe("Root Container");
      expect(root.parentName).toBeNull();
      expect(root.kind).toBe("root");
    });

    it("should expose name directly", () => {
      const root = createContainer(rootGraph, { name: "My Root" });

      expect(root.name).toBe("My Root");
    });

    it("should have kind 'root'", () => {
      const root = createContainer(rootGraph, { name: "Root" });

      expect(root.kind).toBe("root");
    });
  });

  describe("Child Container", () => {
    it("should derive parentName from parent container", () => {
      const root = createContainer(rootGraph, { name: "Root" });

      const child = root.createChild(childGraph, { name: "Feature Container" });

      expect(child.name).toBe("Feature Container");
      expect(child.parentName).toBe("Root");
      expect(child.kind).toBe("child");
    });

    it("should have kind 'child'", () => {
      const root = createContainer(rootGraph, { name: "Root" });

      const child = root.createChild(childGraph, { name: "Auth Feature" });

      expect(child.kind).toBe("child");
    });

    it("should support inheritance modes in options", () => {
      const root = createContainer(rootGraph, { name: "Root" });

      const child = root.createChild(childGraph, {
        name: "Child",
        inheritanceModes: { Logger: "forked" },
      });

      expect(child.name).toBe("Child");
    });
  });

  describe("Grandchild Container", () => {
    it("should have correct parent chain", () => {
      const root = createContainer(rootGraph, { name: "Root" });

      const child = root.createChild(childGraph, { name: "Child" });

      const grandchild = child.createChild(childGraph, { name: "Grandchild" });

      expect(grandchild.parentName).toBe("Child");
      expect(grandchild.kind).toBe("child");
    });

    it("should form correct hierarchy", () => {
      const root = createContainer(rootGraph, { name: "Level 0" });

      const level1 = root.createChild(childGraph, { name: "Level 1" });

      const level2 = level1.createChild(childGraph, { name: "Level 2" });

      expect(root.parentName).toBeNull();
      expect(level1.parentName).toBe("Level 0");
      expect(level2.parentName).toBe("Level 1");
    });
  });
});
