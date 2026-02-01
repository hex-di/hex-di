import { describe, it, expect } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "./index.js";

describe("Runtime Safety Verification", () => {
  it("should implement has(port) correctly across all interfaces", () => {
    // Setup
    interface Service {
      name: string;
    }
    const PortA = createPort<Service>({ name: "A" });
    const PortB = createPort<Service>({ name: "B" });
    const PortScoped = createPort<Service>({ name: "Scoped" });

    const AdapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "A" }),
    });

    const AdapterScoped = createAdapter({
      provides: PortScoped,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ name: "Scoped" }),
    });

    const graph = GraphBuilder.create().provide(AdapterA).provide(AdapterScoped).build();

    const container = createContainer(graph, { name: "Test" });

    // 1. Container.has checks
    expect(container.has(PortA)).toBe(true);
    expect(container.has(PortB)).toBe(false);
    expect(container.has(PortScoped)).toBe(false); // Root container cannot resolve scoped directly

    // 2. Scope.has checks
    const scope = container.createScope();
    expect(scope.has(PortA)).toBe(true);
    expect(scope.has(PortScoped)).toBe(true);
    expect(scope.has(PortB)).toBe(false);

    // 3. ChildContainer.has checks
    // Use extend for new port
    const AdapterB = createAdapter({
      provides: PortB,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "B" }),
    });

    // createChild accepts a Graph and returns a child container
    const childGraph = GraphBuilder.create().provide(AdapterB).build();

    const childContainer = container.createChild(childGraph, { name: "Child" });

    expect(childContainer.has(PortA)).toBe(true); // Inherited
    expect(childContainer.has(PortB)).toBe(true); // Extended
    expect(childContainer.has(PortScoped)).toBe(false); // Inherits "false" from root parent for scoped

    // Note: RuntimeResolver.has tests are in @hex-di/react package
  });
});
