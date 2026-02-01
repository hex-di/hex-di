import { describe, it, expectTypeOf } from "vitest";
import { createPort, createAdapter, lazyPort } from "@hex-di/core";
import type { AdapterRequiresNames } from "../src/validation/types/adapter-extraction.js";

// Test services
interface ServiceA {
  doA(): void;
}

interface ServiceB {
  doB(): void;
}

interface ServiceC {
  doC(): void;
}

// Ports
const PortA = createPort<"ServiceA", ServiceA>("ServiceA");
const PortB = createPort<"ServiceB", ServiceB>("ServiceB");
const PortC = createPort<"ServiceC", ServiceC>("ServiceC");

describe("AdapterRequiresNames with lazy ports", () => {
  it("should extract lazy port names correctly", () => {
    // Adapter with one lazy dependency
    const Adapter1 = createAdapter({
      provides: PortC,
      requires: [lazyPort(PortA)] as const,
      lifetime: "singleton",
      factory: ({ LazyServiceA }) => ({
        doC: () => {
          const a = LazyServiceA();
          a.doA();
        },
      }),
    });

    type Names1 = AdapterRequiresNames<typeof Adapter1>;
    expectTypeOf<Names1>().toEqualTypeOf<"LazyServiceA">();

    // Adapter with mixed lazy and non-lazy dependencies
    const Adapter2 = createAdapter({
      provides: PortC,
      requires: [lazyPort(PortA), PortB] as const,
      lifetime: "singleton",
      factory: ({ LazyServiceA, ServiceB }) => ({
        doC: () => {
          const a = LazyServiceA();
          a.doA();
          ServiceB.doB();
        },
      }),
    });

    type Names2 = AdapterRequiresNames<typeof Adapter2>;
    expectTypeOf<Names2>().toEqualTypeOf<"LazyServiceA" | "ServiceB">();

    // Adapter with multiple lazy dependencies
    const Adapter3 = createAdapter({
      provides: PortC,
      requires: [lazyPort(PortA), lazyPort(PortB)] as const,
      lifetime: "singleton",
      factory: ({ LazyServiceA, LazyServiceB }) => ({
        doC: () => {
          const a = LazyServiceA();
          const b = LazyServiceB();
          a.doA();
          b.doB();
        },
      }),
    });

    type Names3 = AdapterRequiresNames<typeof Adapter3>;
    expectTypeOf<Names3>().toEqualTypeOf<"LazyServiceA" | "LazyServiceB">();
  });
});
