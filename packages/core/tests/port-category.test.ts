/**
 * Runtime Tests for Port Category Tracking
 *
 * Verifies that category metadata flows through the port factory
 * and is accessible via getPortMetadata at runtime.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { port, getPortMetadata } from "../src/index.js";
import { createLibraryInspectorPort } from "../src/inspection/library-inspector-types.js";

// =============================================================================
// Test Interfaces
// =============================================================================

interface Logger {
  log(msg: string): void;
}

// =============================================================================
// Runtime metadata
// =============================================================================

describe("port() with category preserves runtime metadata", () => {
  it("stores category in metadata", () => {
    const LoggerPort = port<Logger>()({ name: "Logger", category: "domain" });
    const meta = getPortMetadata(LoggerPort);
    expect(meta).toBeDefined();
    expect(meta?.category).toBe("domain");
  });

  it("stores undefined category when not specified", () => {
    const LoggerPort = port<Logger>()({ name: "Logger" });
    const meta = getPortMetadata(LoggerPort);
    expect(meta).toBeDefined();
    expect(meta?.category).toBeUndefined();
  });
});

describe("createLibraryInspectorPort", () => {
  it("sets correct runtime metadata", () => {
    const FlowPort = createLibraryInspectorPort({
      name: "FlowInspector",
      description: "Flow library inspection",
      tags: ["flow"],
    });

    const meta = getPortMetadata(FlowPort);
    expect(meta).toBeDefined();
    expect(meta?.category).toBe("library-inspector");
    expect(meta?.description).toBe("Flow library inspection");
    expect(meta?.tags).toEqual(["flow"]);
  });

  it("port name is correct", () => {
    const FlowPort = createLibraryInspectorPort({ name: "FlowInspector" });
    expect(FlowPort.__portName).toBe("FlowInspector");
  });
});
