/**
 * Performance Benchmarks for @hex-di/runtime
 *
 * This file contains Vitest benchmarks for measuring runtime performance
 * of core container operations. Use `pnpm test:bench` to run these benchmarks.
 *
 * ## Benchmark Categories
 *
 * 1. **Resolution performance**: Singleton cache hits, transient creation
 * 2. **Scope operations**: Create/dispose cycles
 * 3. **Disposal performance**: Child container cascade disposal
 *
 * @packageDocumentation
 */
// @ts-nocheck

import { bench, describe } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/index.js";

// =============================================================================
// Pre-created Ports and Adapters (avoid creation overhead in benchmarks)
// =============================================================================

const SingletonPort = port<object>()({ name: "SingletonPort" });
const TransientPort = port<object>()({ name: "TransientPort" });
const ScopedPort = port<object>()({ name: "ScopedPort" });

const SingletonAdapter = createAdapter({
  provides: SingletonPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

const TransientAdapter = createAdapter({
  provides: TransientPort,
  requires: [],
  lifetime: "transient",
  factory: () => ({}),
});

const ScopedAdapter = createAdapter({
  provides: ScopedPort,
  requires: [],
  lifetime: "scoped",
  factory: () => ({}),
});

// =============================================================================
// Resolution Performance Benchmarks
// =============================================================================

describe("resolution performance", () => {
  bench("100k singleton resolves (cached)", () => {
    const graph = GraphBuilder.create().provide(SingletonAdapter).build();
    const container = createContainer({ graph: graph, name: "ResolveBench" });

    // First resolve creates the instance
    container.resolve(SingletonPort);

    // Subsequent resolves are cache hits
    for (let i = 0; i < 100_000; i++) {
      container.resolve(SingletonPort);
    }
  });

  bench("100k transient resolves (uncached)", () => {
    const graph = GraphBuilder.create().provide(TransientAdapter).build();
    const container = createContainer({ graph: graph, name: "TransientBench" });

    for (let i = 0; i < 100_000; i++) {
      container.resolve(TransientPort);
    }
  });

  bench("100k mixed singleton/transient resolves", () => {
    const graph = GraphBuilder.create().provide(SingletonAdapter).provide(TransientAdapter).build();
    const container = createContainer({ graph: graph, name: "MixedBench" });

    // Resolve singletons and transients alternately
    for (let i = 0; i < 100_000; i++) {
      if (i % 2 === 0) {
        container.resolve(SingletonPort);
      } else {
        container.resolve(TransientPort);
      }
    }
  });
});

// =============================================================================
// Scope Operations Benchmarks
// =============================================================================

describe("scope operations", () => {
  bench("10k scope create/dispose cycles", async () => {
    const graph = GraphBuilder.create().provide(ScopedAdapter).build();
    const container = createContainer({ graph: graph, name: "ScopeBench" });

    for (let i = 0; i < 10_000; i++) {
      const scope = container.createScope(`Scope${i}`);
      scope.resolve(ScopedPort);
      await scope.dispose();
    }
  });

  bench("10k nested scope chains (depth 3)", async () => {
    const graph = GraphBuilder.create().provide(ScopedAdapter).build();
    const container = createContainer({ graph: graph, name: "NestedScopeBench" });

    for (let i = 0; i < 10_000; i++) {
      const scope1 = container.createScope("L1");
      const scope2 = scope1.createScope("L2");
      const scope3 = scope2.createScope("L3");
      scope3.resolve(ScopedPort);
      await scope1.dispose(); // Cascades to scope2 and scope3
    }
  });
});

// =============================================================================
// Disposal Performance Benchmarks
// =============================================================================

describe("disposal performance", () => {
  bench("dispose container with 1k child containers", async () => {
    const parentGraph = GraphBuilder.create().provide(SingletonAdapter).build();
    const childGraph = GraphBuilder.create().build();

    const container = createContainer({ graph: parentGraph, name: "DisposalBench" });

    // Create 1000 child containers
    for (let i = 0; i < 1000; i++) {
      container.createChild(childGraph, { name: `Child${i}` });
    }

    // Dispose parent (cascades to all children)
    await container.dispose();
  });

  bench("dispose container with 1k scopes", async () => {
    const graph = GraphBuilder.create().provide(ScopedAdapter).build();
    const container = createContainer({ graph: graph, name: "ScopeDisposalBench" });

    // Create 1000 scopes
    const scopes = [];
    for (let i = 0; i < 1000; i++) {
      scopes.push(container.createScope(`Scope${i}`));
    }

    // Dispose container (cascades to all scopes)
    await container.dispose();
  });
});
