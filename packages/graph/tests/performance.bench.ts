/**
 * Performance Benchmarks for @hex-di/graph
 *
 * This file contains Vitest benchmarks for measuring the runtime performance
 * of core GraphBuilder operations. Use `pnpm test:bench` to run these benchmarks.
 *
 * ## Benchmark Categories
 *
 * 1. **provide() performance**: Single and sequential adapter registration
 * 2. **build() performance**: Graph finalization
 * 3. **inspect() performance**: Graph introspection
 * 4. **clone() performance**: Graph cloning
 *
 * @packageDocumentation
 */

import { bench, describe } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "../src/index.js";

// =============================================================================
// Fixture Ports and Adapters (created once, reused in benchmarks)
// =============================================================================

// Pre-create ports for benchmarks
const Port0 = createPort<"Port0", object>("Port0");
const Port1 = createPort<"Port1", object>("Port1");
const Port2 = createPort<"Port2", object>("Port2");
const Port3 = createPort<"Port3", object>("Port3");
const Port4 = createPort<"Port4", object>("Port4");
const Port5 = createPort<"Port5", object>("Port5");
const Port6 = createPort<"Port6", object>("Port6");
const Port7 = createPort<"Port7", object>("Port7");
const Port8 = createPort<"Port8", object>("Port8");
const Port9 = createPort<"Port9", object>("Port9");

// Pre-create adapters for benchmarks
const Adapter0 = createAdapter({
  provides: Port0,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

const Adapter1 = createAdapter({
  provides: Port1,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

const Adapter2 = createAdapter({
  provides: Port2,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

const Adapter3 = createAdapter({
  provides: Port3,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

const Adapter4 = createAdapter({
  provides: Port4,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

const Adapter5 = createAdapter({
  provides: Port5,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

const Adapter6 = createAdapter({
  provides: Port6,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

const Adapter7 = createAdapter({
  provides: Port7,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

const Adapter8 = createAdapter({
  provides: Port8,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

const Adapter9 = createAdapter({
  provides: Port9,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

// Chained adapters (each depends on previous)
const ChainPort0 = createPort<"ChainPort0", object>("ChainPort0");
const ChainPort1 = createPort<"ChainPort1", object>("ChainPort1");
const ChainPort2 = createPort<"ChainPort2", object>("ChainPort2");
const ChainPort3 = createPort<"ChainPort3", object>("ChainPort3");
const ChainPort4 = createPort<"ChainPort4", object>("ChainPort4");

const ChainAdapter0 = createAdapter({
  provides: ChainPort0,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

const ChainAdapter1 = createAdapter({
  provides: ChainPort1,
  requires: [ChainPort0],
  lifetime: "singleton",
  factory: () => ({}),
});

const ChainAdapter2 = createAdapter({
  provides: ChainPort2,
  requires: [ChainPort1],
  lifetime: "singleton",
  factory: () => ({}),
});

const ChainAdapter3 = createAdapter({
  provides: ChainPort3,
  requires: [ChainPort2],
  lifetime: "singleton",
  factory: () => ({}),
});

const ChainAdapter4 = createAdapter({
  provides: ChainPort4,
  requires: [ChainPort3],
  lifetime: "singleton",
  factory: () => ({}),
});

// =============================================================================
// provide() Performance Benchmarks
// =============================================================================

describe("provide() performance", () => {
  bench("single provide() - no dependencies", () => {
    GraphBuilder.create().provide(Adapter0);
  });

  bench("5 sequential provide() - no dependencies", () => {
    GraphBuilder.create()
      .provide(Adapter0)
      .provide(Adapter1)
      .provide(Adapter2)
      .provide(Adapter3)
      .provide(Adapter4);
  });

  bench("10 sequential provide() - no dependencies", () => {
    GraphBuilder.create()
      .provide(Adapter0)
      .provide(Adapter1)
      .provide(Adapter2)
      .provide(Adapter3)
      .provide(Adapter4)
      .provide(Adapter5)
      .provide(Adapter6)
      .provide(Adapter7)
      .provide(Adapter8)
      .provide(Adapter9);
  });

  bench("5 sequential provide() - chained dependencies", () => {
    GraphBuilder.create()
      .provide(ChainAdapter0)
      .provide(ChainAdapter1)
      .provide(ChainAdapter2)
      .provide(ChainAdapter3)
      .provide(ChainAdapter4);
  });
});

// =============================================================================
// build() Performance Benchmarks
// =============================================================================

describe("build() performance", () => {
  bench("build() - 5-adapter graph", () => {
    GraphBuilder.create()
      .provide(Adapter0)
      .provide(Adapter1)
      .provide(Adapter2)
      .provide(Adapter3)
      .provide(Adapter4)
      .build();
  });

  bench("build() - 10-adapter graph", () => {
    GraphBuilder.create()
      .provide(Adapter0)
      .provide(Adapter1)
      .provide(Adapter2)
      .provide(Adapter3)
      .provide(Adapter4)
      .provide(Adapter5)
      .provide(Adapter6)
      .provide(Adapter7)
      .provide(Adapter8)
      .provide(Adapter9)
      .build();
  });

  bench("build() - 5-adapter chained graph", () => {
    GraphBuilder.create()
      .provide(ChainAdapter0)
      .provide(ChainAdapter1)
      .provide(ChainAdapter2)
      .provide(ChainAdapter3)
      .provide(ChainAdapter4)
      .build();
  });
});

// =============================================================================
// merge() Performance Benchmarks
// =============================================================================

describe("merge() performance", () => {
  // Pre-build graphs for merge benchmarks
  const graph1 = GraphBuilder.create()
    .provide(Adapter0)
    .provide(Adapter1)
    .provide(Adapter2)
    .provide(Adapter3)
    .provide(Adapter4);

  const graph2 = GraphBuilder.create()
    .provide(Adapter5)
    .provide(Adapter6)
    .provide(Adapter7)
    .provide(Adapter8)
    .provide(Adapter9);

  bench("merge two 5-adapter graphs", () => {
    graph1.merge(graph2);
  });
});
