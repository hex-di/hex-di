/**
 * Test that InspectorAPI has emit method
 */

import { describe, it, expect } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../../src/container/factory.js";

const ServiceA = port<{ value: string }>()({ name: "ServiceA" });

describe("InspectorAPI emit method", () => {
  it("should have emit method", () => {
    const rootGraph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: ServiceA,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ value: "A" }),
        })
      )
      .build();
    const root = createContainer({ graph: rootGraph, name: "Root" });

    expect(root.inspector).toBeDefined();
    expect(root.inspector.emit).toBeDefined();
    expect(typeof root.inspector.emit).toBe("function");
  });
});
