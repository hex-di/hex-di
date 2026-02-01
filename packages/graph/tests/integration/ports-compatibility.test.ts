/**
 * @hex-di/ports compatibility integration tests.
 *
 * Tests that ports work correctly with the graph package.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createAdapter, createPort, type InferService } from "@hex-di/core";
import { GraphBuilder } from "../../src/index.js";

describe("Integration: @hex-di/ports compatibility", () => {
  it("ports created with createPort work seamlessly with graph", () => {
    // Use types directly from @hex-di/ports
    const CustomPort = createPort<"Custom", { doSomething(): void }>("Custom");

    type PortType = typeof CustomPort;
    type ServiceType = InferService<PortType>;

    // Verify InferService works
    expectTypeOf<ServiceType>().toEqualTypeOf<{ doSomething(): void }>();

    // Create adapter using the port
    const adapter = createAdapter({
      provides: CustomPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doSomething: () => {} }),
    });
    expect(adapter).toBeDefined();

    // Build graph
    const graph = GraphBuilder.create().provide(adapter).build();
    expect(graph).toBeDefined();

    // Verify the graph correctly types the provides - use conditional inference
    type GraphProvides = typeof graph extends { __provides: infer P } ? P : never;
    expectTypeOf<GraphProvides>().toEqualTypeOf<typeof CustomPort>();
  });

  it("multiple ports with different service types work correctly", () => {
    interface ServiceA {
      methodA(): string;
    }
    interface ServiceB {
      methodB(): number;
    }
    interface ServiceC {
      methodC(a: ServiceA, b: ServiceB): boolean;
    }

    const PortA = createPort<"ServiceA", ServiceA>("ServiceA");
    const PortB = createPort<"ServiceB", ServiceB>("ServiceB");
    const PortC = createPort<"ServiceC", ServiceC>("ServiceC");

    const adapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ methodA: () => "a" }),
    });

    const adapterB = createAdapter({
      provides: PortB,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ methodB: () => 42 }),
    });

    const adapterC = createAdapter({
      provides: PortC,
      requires: [PortA, PortB],
      lifetime: "scoped",
      factory: deps => ({
        methodC: () => deps.ServiceA.methodA() === "a" && deps.ServiceB.methodB() === 42,
      }),
    });

    const graph = GraphBuilder.create()
      .provide(adapterA)
      .provide(adapterB)
      .provide(adapterC)
      .build();

    expect(graph.adapters.length).toBe(3);

    // Use conditional inference since __provides is optional
    type GraphProvides = typeof graph extends { __provides: infer P } ? P : never;
    expectTypeOf<GraphProvides>().toEqualTypeOf<typeof PortA | typeof PortB | typeof PortC>();
  });
});
