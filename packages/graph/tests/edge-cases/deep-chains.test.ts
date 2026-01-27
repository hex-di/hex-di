/**
 * Deep dependency chain edge case tests.
 *
 * Tests behavior with deep dependency chains.
 */

import { describe, expect, it } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "../../src/index.js";

interface Service {
  name: string;
}

describe("deep dependency chains", () => {
  it("handles dependency chain of 5 levels", () => {
    // Create explicit ports for a 5-level chain: S1 <- S2 <- S3 <- S4 <- S5
    const S1Port = createPort<"S1", Service>("S1");
    const S2Port = createPort<"S2", Service>("S2");
    const S3Port = createPort<"S3", Service>("S3");
    const S4Port = createPort<"S4", Service>("S4");
    const S5Port = createPort<"S5", Service>("S5");

    const adapterS1 = createAdapter({
      provides: S1Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "S1" }),
    });

    const adapterS2 = createAdapter({
      provides: S2Port,
      requires: [S1Port],
      lifetime: "singleton",
      factory: () => ({ name: "S2" }),
    });

    const adapterS3 = createAdapter({
      provides: S3Port,
      requires: [S2Port],
      lifetime: "singleton",
      factory: () => ({ name: "S3" }),
    });

    const adapterS4 = createAdapter({
      provides: S4Port,
      requires: [S3Port],
      lifetime: "singleton",
      factory: () => ({ name: "S4" }),
    });

    const adapterS5 = createAdapter({
      provides: S5Port,
      requires: [S4Port],
      lifetime: "singleton",
      factory: () => ({ name: "S5" }),
    });

    const graph = GraphBuilder.create()
      .provide(adapterS1)
      .provide(adapterS2)
      .provide(adapterS3)
      .provide(adapterS4)
      .provide(adapterS5)
      .build();

    expect(graph.adapters.length).toBe(5);
    expect(graph.adapters[0]).toBe(adapterS1);
    expect(graph.adapters[4]).toBe(adapterS5);
  });

  it("preserves adapter order in deep chains", () => {
    const ServiceAPort = createPort<"ServiceA", Service>("ServiceA");
    const ServiceBPort = createPort<"ServiceB", Service>("ServiceB");
    const ServiceCPort = createPort<"ServiceC", Service>("ServiceC");

    const adapterA = createAdapter({
      provides: ServiceAPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "A" }),
    });

    const adapterB = createAdapter({
      provides: ServiceBPort,
      requires: [ServiceAPort],
      lifetime: "singleton",
      factory: () => ({ name: "B" }),
    });

    const adapterC = createAdapter({
      provides: ServiceCPort,
      requires: [ServiceBPort],
      lifetime: "singleton",
      factory: () => ({ name: "C" }),
    });

    const graph = GraphBuilder.create()
      .provide(adapterA)
      .provide(adapterB)
      .provide(adapterC)
      .build();

    expect(graph.adapters[0]).toBe(adapterA);
    expect(graph.adapters[1]).toBe(adapterB);
    expect(graph.adapters[2]).toBe(adapterC);
  });
});
