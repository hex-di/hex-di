/**
 * Tests for src/inspection/api.ts (createInspector with WeakMap caching)
 */
import { describe, it, expect } from "vitest";
import { createInspector } from "../src/inspection/api.js";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { INTERNAL_ACCESS } from "../src/inspection/symbols.js";

const PortA = port<string>()({ name: "PortA" });

function createTestContainer() {
  const adapter = createAdapter({
    provides: PortA,
    requires: [],
    lifetime: "singleton",
    factory: () => "value",
  });
  const graph = GraphBuilder.create().provide(adapter).build();
  return createContainer({ graph, name: "Test" });
}

describe("createInspector (api.ts cached)", () => {
  it("creates an inspector from a container", () => {
    const container = createTestContainer();
    const inspector = createInspector(container);
    expect(inspector).toBeDefined();
    expect(typeof inspector.getSnapshot).toBe("function");
    expect(typeof inspector.listPorts).toBe("function");
  });

  it("returns the same inspector for the same container (WeakMap cache)", () => {
    const container = createTestContainer();
    const inspector1 = createInspector(container);
    const inspector2 = createInspector(container);
    expect(inspector1).toBe(inspector2);
  });

  it("returns different inspectors for different containers", () => {
    const container1 = createTestContainer();
    const container2 = createTestContainer();
    const inspector1 = createInspector(container1);
    const inspector2 = createInspector(container2);
    expect(inspector1).not.toBe(inspector2);
  });

  it("inspector methods work correctly", () => {
    const container = createTestContainer();
    const inspector = createInspector(container);

    const snapshot = inspector.getSnapshot();
    expect(snapshot).toBeDefined();

    const ports = inspector.listPorts();
    expect(ports).toContain("PortA");
  });
});
