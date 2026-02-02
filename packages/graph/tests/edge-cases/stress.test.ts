/**
 * Large graph stress tests.
 *
 * Tests behavior with large graphs, deep chains, and complex patterns.
 */

import { describe, expect, it } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../../src/index.js";

interface Service {
  name: string;
}

describe("large graph stress tests", () => {
  it("handles graph with 20 independent adapters", () => {
    // Create 20 independent ports with explicit names
    const S0 = port<Service>()({ name: "S0" });
    const S1 = port<Service>()({ name: "S1" });
    const S2 = port<Service>()({ name: "S2" });
    const S3 = port<Service>()({ name: "S3" });
    const S4 = port<Service>()({ name: "S4" });
    const S5 = port<Service>()({ name: "S5" });
    const S6 = port<Service>()({ name: "S6" });
    const S7 = port<Service>()({ name: "S7" });
    const S8 = port<Service>()({ name: "S8" });
    const S9 = port<Service>()({ name: "S9" });
    const S10 = port<Service>()({ name: "S10" });
    const S11 = port<Service>()({ name: "S11" });
    const S12 = port<Service>()({ name: "S12" });
    const S13 = port<Service>()({ name: "S13" });
    const S14 = port<Service>()({ name: "S14" });
    const S15 = port<Service>()({ name: "S15" });
    const S16 = port<Service>()({ name: "S16" });
    const S17 = port<Service>()({ name: "S17" });
    const S18 = port<Service>()({ name: "S18" });
    const S19 = port<Service>()({ name: "S19" });

    // Build graph with all 20 adapters
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: S0,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S0" }),
        })
      )
      .provide(
        createAdapter({
          provides: S1,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S1" }),
        })
      )
      .provide(
        createAdapter({
          provides: S2,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S2" }),
        })
      )
      .provide(
        createAdapter({
          provides: S3,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S3" }),
        })
      )
      .provide(
        createAdapter({
          provides: S4,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S4" }),
        })
      )
      .provide(
        createAdapter({
          provides: S5,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S5" }),
        })
      )
      .provide(
        createAdapter({
          provides: S6,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S6" }),
        })
      )
      .provide(
        createAdapter({
          provides: S7,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S7" }),
        })
      )
      .provide(
        createAdapter({
          provides: S8,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S8" }),
        })
      )
      .provide(
        createAdapter({
          provides: S9,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S9" }),
        })
      )
      .provide(
        createAdapter({
          provides: S10,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S10" }),
        })
      )
      .provide(
        createAdapter({
          provides: S11,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S11" }),
        })
      )
      .provide(
        createAdapter({
          provides: S12,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S12" }),
        })
      )
      .provide(
        createAdapter({
          provides: S13,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S13" }),
        })
      )
      .provide(
        createAdapter({
          provides: S14,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S14" }),
        })
      )
      .provide(
        createAdapter({
          provides: S15,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S15" }),
        })
      )
      .provide(
        createAdapter({
          provides: S16,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S16" }),
        })
      )
      .provide(
        createAdapter({
          provides: S17,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S17" }),
        })
      )
      .provide(
        createAdapter({
          provides: S18,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S18" }),
        })
      )
      .provide(
        createAdapter({
          provides: S19,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "S19" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(20);
    expect(Object.isFrozen(graph)).toBe(true);
  });

  it("handles graph with 15-level deep dependency chain", () => {
    // Create ports with explicit names for deep chain testing
    const Chain0Port = port<Service>()({ name: "Chain0" });
    const Chain1Port = port<Service>()({ name: "Chain1" });
    const Chain2Port = port<Service>()({ name: "Chain2" });
    const Chain3Port = port<Service>()({ name: "Chain3" });
    const Chain4Port = port<Service>()({ name: "Chain4" });
    const Chain5Port = port<Service>()({ name: "Chain5" });
    const Chain6Port = port<Service>()({ name: "Chain6" });
    const Chain7Port = port<Service>()({ name: "Chain7" });
    const Chain8Port = port<Service>()({ name: "Chain8" });
    const Chain9Port = port<Service>()({ name: "Chain9" });
    const Chain10Port = port<Service>()({ name: "Chain10" });
    const Chain11Port = port<Service>()({ name: "Chain11" });
    const Chain12Port = port<Service>()({ name: "Chain12" });
    const Chain13Port = port<Service>()({ name: "Chain13" });
    const Chain14Port = port<Service>()({ name: "Chain14" });

    // Build chain: Chain0 <- Chain1 <- Chain2 <- ... <- Chain14
    const adapter0 = createAdapter({
      provides: Chain0Port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "Chain0" }),
    });
    const adapter1 = createAdapter({
      provides: Chain1Port,
      requires: [Chain0Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain1" }),
    });
    const adapter2 = createAdapter({
      provides: Chain2Port,
      requires: [Chain1Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain2" }),
    });
    const adapter3 = createAdapter({
      provides: Chain3Port,
      requires: [Chain2Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain3" }),
    });
    const adapter4 = createAdapter({
      provides: Chain4Port,
      requires: [Chain3Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain4" }),
    });
    const adapter5 = createAdapter({
      provides: Chain5Port,
      requires: [Chain4Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain5" }),
    });
    const adapter6 = createAdapter({
      provides: Chain6Port,
      requires: [Chain5Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain6" }),
    });
    const adapter7 = createAdapter({
      provides: Chain7Port,
      requires: [Chain6Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain7" }),
    });
    const adapter8 = createAdapter({
      provides: Chain8Port,
      requires: [Chain7Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain8" }),
    });
    const adapter9 = createAdapter({
      provides: Chain9Port,
      requires: [Chain8Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain9" }),
    });
    const adapter10 = createAdapter({
      provides: Chain10Port,
      requires: [Chain9Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain10" }),
    });
    const adapter11 = createAdapter({
      provides: Chain11Port,
      requires: [Chain10Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain11" }),
    });
    const adapter12 = createAdapter({
      provides: Chain12Port,
      requires: [Chain11Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain12" }),
    });
    const adapter13 = createAdapter({
      provides: Chain13Port,
      requires: [Chain12Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain13" }),
    });
    const adapter14 = createAdapter({
      provides: Chain14Port,
      requires: [Chain13Port],
      lifetime: "singleton",
      factory: () => ({ name: "Chain14" }),
    });

    const graph = GraphBuilder.create()
      .provideMany([
        adapter0,
        adapter1,
        adapter2,
        adapter3,
        adapter4,
        adapter5,
        adapter6,
        adapter7,
        adapter8,
        adapter9,
        adapter10,
        adapter11,
        adapter12,
        adapter13,
        adapter14,
      ])
      .build();

    expect(graph.adapters.length).toBe(15);
  });

  it("handles graph with diamond dependency pattern", () => {
    // Diamond pattern:
    //       A
    //      / \
    //     B   C
    //      \ /
    //       D
    const PortA = port<Service>()({ name: "DiamondA" });
    const PortB = port<Service>()({ name: "DiamondB" });
    const PortC = port<Service>()({ name: "DiamondC" });
    const PortD = port<Service>()({ name: "DiamondD" });

    const adapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "A" }),
    });

    const adapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ name: "B" }),
    });

    const adapterC = createAdapter({
      provides: PortC,
      requires: [PortA],
      lifetime: "singleton",
      factory: () => ({ name: "C" }),
    });

    const adapterD = createAdapter({
      provides: PortD,
      requires: [PortB, PortC],
      lifetime: "singleton",
      factory: () => ({ name: "D" }),
    });

    const graph = GraphBuilder.create()
      .provide(adapterA)
      .provide(adapterB)
      .provide(adapterC)
      .provide(adapterD)
      .build();

    expect(graph.adapters.length).toBe(4);
  });

  it("handles multiple merges of medium-sized graphs", () => {
    // Create Group A ports and adapters
    const A0Port = port<Service>()({ name: "A0" });
    const A1Port = port<Service>()({ name: "A1" });
    const A2Port = port<Service>()({ name: "A2" });
    const A3Port = port<Service>()({ name: "A3" });
    const A4Port = port<Service>()({ name: "A4" });

    const graphA = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: A0Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "A0" }),
        })
      )
      .provide(
        createAdapter({
          provides: A1Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "A1" }),
        })
      )
      .provide(
        createAdapter({
          provides: A2Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "A2" }),
        })
      )
      .provide(
        createAdapter({
          provides: A3Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "A3" }),
        })
      )
      .provide(
        createAdapter({
          provides: A4Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "A4" }),
        })
      );

    // Create Group B ports and adapters
    const B0Port = port<Service>()({ name: "B0" });
    const B1Port = port<Service>()({ name: "B1" });
    const B2Port = port<Service>()({ name: "B2" });
    const B3Port = port<Service>()({ name: "B3" });
    const B4Port = port<Service>()({ name: "B4" });

    const graphB = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: B0Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "B0" }),
        })
      )
      .provide(
        createAdapter({
          provides: B1Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "B1" }),
        })
      )
      .provide(
        createAdapter({
          provides: B2Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "B2" }),
        })
      )
      .provide(
        createAdapter({
          provides: B3Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "B3" }),
        })
      )
      .provide(
        createAdapter({
          provides: B4Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "B4" }),
        })
      );

    // Create Group C ports and adapters
    const C0Port = port<Service>()({ name: "C0" });
    const C1Port = port<Service>()({ name: "C1" });
    const C2Port = port<Service>()({ name: "C2" });
    const C3Port = port<Service>()({ name: "C3" });
    const C4Port = port<Service>()({ name: "C4" });

    const graphC = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: C0Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "C0" }),
        })
      )
      .provide(
        createAdapter({
          provides: C1Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "C1" }),
        })
      )
      .provide(
        createAdapter({
          provides: C2Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "C2" }),
        })
      )
      .provide(
        createAdapter({
          provides: C3Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "C3" }),
        })
      )
      .provide(
        createAdapter({
          provides: C4Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "C4" }),
        })
      );

    const merged = graphA.merge(graphB).merge(graphC).build();

    expect(merged.adapters.length).toBe(15);
  });

  it("handles graph with mixed lifetimes", () => {
    // Create 9 ports with explicit names
    const M0Port = port<Service>()({ name: "M0" });
    const M1Port = port<Service>()({ name: "M1" });
    const M2Port = port<Service>()({ name: "M2" });
    const M3Port = port<Service>()({ name: "M3" });
    const M4Port = port<Service>()({ name: "M4" });
    const M5Port = port<Service>()({ name: "M5" });
    const M6Port = port<Service>()({ name: "M6" });
    const M7Port = port<Service>()({ name: "M7" });
    const M8Port = port<Service>()({ name: "M8" });

    // Create adapters with varying lifetimes (no dependencies to avoid captive issues)
    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: M0Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "M0" }),
        })
      )
      .provide(
        createAdapter({
          provides: M1Port,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ name: "M1" }),
        })
      )
      .provide(
        createAdapter({
          provides: M2Port,
          requires: [],
          lifetime: "transient",
          factory: () => ({ name: "M2" }),
        })
      )
      .provide(
        createAdapter({
          provides: M3Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "M3" }),
        })
      )
      .provide(
        createAdapter({
          provides: M4Port,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ name: "M4" }),
        })
      )
      .provide(
        createAdapter({
          provides: M5Port,
          requires: [],
          lifetime: "transient",
          factory: () => ({ name: "M5" }),
        })
      )
      .provide(
        createAdapter({
          provides: M6Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "M6" }),
        })
      )
      .provide(
        createAdapter({
          provides: M7Port,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ name: "M7" }),
        })
      )
      .provide(
        createAdapter({
          provides: M8Port,
          requires: [],
          lifetime: "transient",
          factory: () => ({ name: "M8" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(9);
    expect(graph.adapters.filter(a => a.lifetime === "singleton").length).toBe(3);
    expect(graph.adapters.filter(a => a.lifetime === "scoped").length).toBe(3);
    expect(graph.adapters.filter(a => a.lifetime === "transient").length).toBe(3);
  });
});
