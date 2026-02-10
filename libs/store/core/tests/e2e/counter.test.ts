/**
 * E2E: Counter App
 *
 * Full end-to-end tests using real GraphBuilder + createContainer.
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
  increment: (state: CounterState): CounterState => ({ count: state.count + 1 }),
  decrement: (state: CounterState): CounterState => ({ count: state.count - 1 }),
  set: (_state: CounterState, value: number): CounterState => ({ count: value }),
};

type CounterActions = typeof counterActions;

// =============================================================================
// E2E Tests
// =============================================================================

describe("E2E: Counter", () => {
  it("counter: create container → resolve → increment → decrement → verify state", async () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });
    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: counterActions,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "e2e-counter" });

    const service = container.resolve(CounterPort);
    expect(service.state).toEqual({ count: 0 });

    service.actions.increment();
    service.actions.increment();
    service.actions.increment();
    expect(service.state).toEqual({ count: 3 });

    service.actions.decrement();
    expect(service.state).toEqual({ count: 2 });

    service.actions.set(100);
    expect(service.state).toEqual({ count: 100 });

    await container.dispose();
  });

  it("counter with derived DoubleCount stays in sync", async () => {
    const CounterPort = createStatePort<CounterState, CounterActions>()({
      name: "Counter",
    });

    const DoubleCountPort = createDerivedPort<number>()({
      name: "DoubleCount",
    });

    const counterAdapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: counterActions,
    });

    const doubleAdapter = createDerivedAdapter({
      provides: DoubleCountPort,
      requires: [CounterPort],
      select: deps => {
        return deps.Counter.state.count * 2;
      },
    });

    const graph = GraphBuilder.create().provide(counterAdapter).provide(doubleAdapter).build();
    const container = createContainer({ graph, name: "e2e-derived" });

    const counter = container.resolve(CounterPort);
    const doubled = container.resolve(DoubleCountPort) as DerivedService<number>;

    expect(counter.state).toEqual({ count: 0 });
    expect(doubled.value).toBe(0);

    counter.actions.increment();
    expect(counter.state).toEqual({ count: 1 });
    expect(doubled.value).toBe(2);

    counter.actions.set(10);
    expect(doubled.value).toBe(20);

    // Verify derived updates through subscription
    const derivedValues: number[] = [];
    doubled.subscribe(value => {
      derivedValues.push(value as number);
    });

    counter.actions.increment();
    expect(derivedValues).toEqual([22]);

    await container.dispose();
  });
});
