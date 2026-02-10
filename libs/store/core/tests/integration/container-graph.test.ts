/**
 * Integration Tests: Container + GraphBuilder
 *
 * Tests with real GraphBuilder + createContainer for state, derived,
 * effect, and scoped adapters.
 */

import { describe, it, expect } from "vitest";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  createStatePort,
  createStateAdapter,
  createDerivedPort,
  createDerivedAdapter,
} from "../../src/index.js";
import type { DerivedService } from "../../src/index.js";

// =============================================================================
// Types
// =============================================================================

interface CounterState {
  readonly count: number;
}

const counterActions = {
  increment: (state: CounterState): CounterState => ({
    count: state.count + 1,
  }),
  set: (_state: CounterState, value: number): CounterState => ({
    count: value,
  }),
};

type CounterActions = typeof counterActions;

// =============================================================================
// Tests
// =============================================================================

describe("Container + GraphBuilder integration", () => {
  it("state + derived adapters: derived tracks state changes", async () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const DoublePort = createDerivedPort<number>()({
      name: "Double",
    });

    const counterAdapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: counterActions,
    });

    const doubleAdapter = createDerivedAdapter({
      provides: DoublePort,
      requires: [CounterPort],
      select: deps => {
        return deps.Counter.state.count * 2;
      },
    });

    const graph = GraphBuilder.create().provide(counterAdapter).provide(doubleAdapter).build();
    const container = createContainer({ graph, name: "integration" });

    const counter = container.resolve(CounterPort);
    const doubled = container.resolve(DoublePort) as DerivedService<number>;

    expect(doubled.value).toBe(0);
    counter.actions.increment();
    expect(doubled.value).toBe(2);
    counter.actions.set(50);
    expect(doubled.value).toBe(100);

    await container.dispose();
  });

  it("state adapter with effects: effects fire on dispatch", async () => {
    const effectCalls: Array<{ count: number }> = [];

    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });

    const counterAdapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: counterActions,
      effects: {
        increment: (ctx: { state: unknown }) => {
          effectCalls.push({ count: (ctx.state as CounterState).count });
        },
      },
    });

    const graph = GraphBuilder.create().provide(counterAdapter).build();
    const container = createContainer({ graph, name: "integration-effects" });

    const counter = container.resolve(CounterPort);
    counter.actions.increment();
    counter.actions.increment();

    expect(effectCalls).toEqual([{ count: 1 }, { count: 2 }]);

    await container.dispose();
  });

  it("scoped state adapter: scopes are isolated", async () => {
    const ScopedPort = createStatePort<CounterState, CounterActions>()({
      name: "ScopedCounter",
    });

    const adapter = createStateAdapter({
      provides: ScopedPort,
      lifetime: "scoped",
      initial: { count: 0 },
      actions: counterActions,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "integration-scoped" });

    const scope1 = container.createScope("scope-a");
    const scope2 = container.createScope("scope-b");

    const svc1 = scope1.resolve(ScopedPort);
    const svc2 = scope2.resolve(ScopedPort);

    svc1.actions.increment();
    svc1.actions.increment();
    svc2.actions.set(100);

    // Isolated: each scope has its own instance
    expect(svc1.state).toEqual({ count: 2 });
    expect(svc2.state).toEqual({ count: 100 });

    await scope1.dispose();
    await scope2.dispose();
    await container.dispose();
  });

  it("container dispose → container is disposed, no new resolutions", async () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });

    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: counterActions,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "integration-dispose" });

    const service = container.resolve(CounterPort);
    service.actions.increment();
    expect(service.state).toEqual({ count: 1 });

    await container.dispose();

    // Container is disposed — no new resolutions
    expect(container.isDisposed).toBe(true);
    expect(() => container.resolve(CounterPort)).toThrow();
  });
});
