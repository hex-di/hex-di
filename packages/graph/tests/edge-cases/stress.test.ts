/**
 * Large graph stress tests.
 *
 * Tests behavior with large graphs, deep chains, and complex patterns.
 */

import { describe, expect, it } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../../src/index.js";

interface Service {
  name: string;
}

describe("large graph stress tests", () => {
  it("handles graph with 20 independent adapters", () => {
    // Create 20 independent ports with explicit names
    const S0 = createPort<"S0", Service>("S0");
    const S1 = createPort<"S1", Service>("S1");
    const S2 = createPort<"S2", Service>("S2");
    const S3 = createPort<"S3", Service>("S3");
    const S4 = createPort<"S4", Service>("S4");
    const S5 = createPort<"S5", Service>("S5");
    const S6 = createPort<"S6", Service>("S6");
    const S7 = createPort<"S7", Service>("S7");
    const S8 = createPort<"S8", Service>("S8");
    const S9 = createPort<"S9", Service>("S9");
    const S10 = createPort<"S10", Service>("S10");
    const S11 = createPort<"S11", Service>("S11");
    const S12 = createPort<"S12", Service>("S12");
    const S13 = createPort<"S13", Service>("S13");
    const S14 = createPort<"S14", Service>("S14");
    const S15 = createPort<"S15", Service>("S15");
    const S16 = createPort<"S16", Service>("S16");
    const S17 = createPort<"S17", Service>("S17");
    const S18 = createPort<"S18", Service>("S18");
    const S19 = createPort<"S19", Service>("S19");

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
    const Chain0Port = createPort<"Chain0", Service>("Chain0");
    const Chain1Port = createPort<"Chain1", Service>("Chain1");
    const Chain2Port = createPort<"Chain2", Service>("Chain2");
    const Chain3Port = createPort<"Chain3", Service>("Chain3");
    const Chain4Port = createPort<"Chain4", Service>("Chain4");
    const Chain5Port = createPort<"Chain5", Service>("Chain5");
    const Chain6Port = createPort<"Chain6", Service>("Chain6");
    const Chain7Port = createPort<"Chain7", Service>("Chain7");
    const Chain8Port = createPort<"Chain8", Service>("Chain8");
    const Chain9Port = createPort<"Chain9", Service>("Chain9");
    const Chain10Port = createPort<"Chain10", Service>("Chain10");
    const Chain11Port = createPort<"Chain11", Service>("Chain11");
    const Chain12Port = createPort<"Chain12", Service>("Chain12");
    const Chain13Port = createPort<"Chain13", Service>("Chain13");
    const Chain14Port = createPort<"Chain14", Service>("Chain14");

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
    const PortA = createPort<"DiamondA", Service>("DiamondA");
    const PortB = createPort<"DiamondB", Service>("DiamondB");
    const PortC = createPort<"DiamondC", Service>("DiamondC");
    const PortD = createPort<"DiamondD", Service>("DiamondD");

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
    const A0Port = createPort<"A0", Service>("A0");
    const A1Port = createPort<"A1", Service>("A1");
    const A2Port = createPort<"A2", Service>("A2");
    const A3Port = createPort<"A3", Service>("A3");
    const A4Port = createPort<"A4", Service>("A4");

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
    const B0Port = createPort<"B0", Service>("B0");
    const B1Port = createPort<"B1", Service>("B1");
    const B2Port = createPort<"B2", Service>("B2");
    const B3Port = createPort<"B3", Service>("B3");
    const B4Port = createPort<"B4", Service>("B4");

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
    const C0Port = createPort<"C0", Service>("C0");
    const C1Port = createPort<"C1", Service>("C1");
    const C2Port = createPort<"C2", Service>("C2");
    const C3Port = createPort<"C3", Service>("C3");
    const C4Port = createPort<"C4", Service>("C4");

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
    const M0Port = createPort<"M0", Service>("M0");
    const M1Port = createPort<"M1", Service>("M1");
    const M2Port = createPort<"M2", Service>("M2");
    const M3Port = createPort<"M3", Service>("M3");
    const M4Port = createPort<"M4", Service>("M4");
    const M5Port = createPort<"M5", Service>("M5");
    const M6Port = createPort<"M6", Service>("M6");
    const M7Port = createPort<"M7", Service>("M7");
    const M8Port = createPort<"M8", Service>("M8");

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
