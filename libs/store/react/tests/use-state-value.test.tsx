import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import React, { useState } from "react";
import { HexDiContainerProvider } from "@hex-di/react";
import type { DeepReadonly } from "@hex-di/store";
import { useStateValue } from "../src/index.js";
import {
  createMockContainer,
  createMockStateService,
  createMockMultiStateService,
  CounterPort,
  MultiPort,
} from "./helpers.js";
import type { CounterState, MultiState } from "./helpers.js";

afterEach(() => {
  cleanup();
});

describe("useStateValue", () => {
  it("reads full state from a state port", () => {
    const { service } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    function CounterDisplay() {
      const state = useStateValue(CounterPort);
      return <div>Count: {state.count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <CounterDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Count: 0")).toBeDefined();
  });

  it("updates when state changes", () => {
    const { service, setState } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    function CounterDisplay() {
      const state = useStateValue(CounterPort);
      return <div>Count: {state.count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <CounterDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Count: 0")).toBeDefined();

    act(() => {
      setState({ count: 42 });
    });

    expect(screen.getByText("Count: 42")).toBeDefined();
  });

  it("supports selector for fine-grained subscriptions", () => {
    const { service, setState } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);
    function CountDisplay() {
      const count = useStateValue(CounterPort, (s: DeepReadonly<CounterState>) => s.count);
      return <div>Selected: {count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <CountDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Selected: 0")).toBeDefined();

    act(() => {
      setState({ count: 5 });
    });

    expect(screen.getByText("Selected: 5")).toBeDefined();
  });

  it("re-renders only when selected value changes, not other state props", () => {
    const { service, setState } = createMockMultiStateService();
    const services = new Map<string, unknown>([["Multi", service]]);
    const container = createMockContainer(services);

    let renderCount = 0;
    function CountOnly() {
      renderCount++;
      const count = useStateValue(MultiPort, (s: DeepReadonly<MultiState>) => s.count);
      return <div>Count: {count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <CountOnly />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Count: 0")).toBeDefined();
    const initialRenders = renderCount;

    // Change label only -- should NOT cause re-render since selector returns count
    act(() => {
      setState({ count: 0, label: "changed" });
    });

    expect(renderCount).toBe(initialRenders);
    expect(screen.getByText("Count: 0")).toBeDefined();

    // Change count -- SHOULD cause re-render
    act(() => {
      setState({ count: 99, label: "changed" });
    });

    expect(renderCount).toBe(initialRenders + 1);
    expect(screen.getByText("Count: 99")).toBeDefined();
  });

  it("uses custom equality function to suppress re-renders", () => {
    const { service, setState } = createMockMultiStateService();
    const services = new Map<string, unknown>([["Multi", service]]);
    const container = createMockContainer(services);

    let renderCount = 0;
    // Select count, but treat values within 5 of each other as equal
    function CountDisplay() {
      renderCount++;
      const count = useStateValue(
        MultiPort,
        (s: DeepReadonly<MultiState>) => s.count,
        (a: number, b: number) => Math.abs(a - b) < 5
      );
      return <div>Count: {count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <CountDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Count: 0")).toBeDefined();
    const initialRenders = renderCount;

    // Change count by 3 -- within tolerance, should NOT re-render
    act(() => {
      setState({ count: 3, label: "initial" });
    });

    expect(renderCount).toBe(initialRenders);
    expect(screen.getByText("Count: 0")).toBeDefined();

    // Change count by a large amount -- exceeds tolerance, SHOULD re-render
    act(() => {
      setState({ count: 100, label: "initial" });
    });

    expect(renderCount).toBe(initialRenders + 1);
    expect(screen.getByText("Count: 100")).toBeDefined();
  });

  it("uses useSyncExternalStore internally (state survives concurrent re-render)", () => {
    const { service, setState } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    // This test verifies the hook maintains consistent state across renders.
    // useSyncExternalStore guarantees getSnapshot is called every render,
    // ensuring the value is always in sync with the store.
    const snapshots: number[] = [];
    function SnapshotCapture() {
      const state = useStateValue(CounterPort);
      snapshots.push(state.count);
      return <div>Count: {state.count}</div>;
    }

    // Use a parent that triggers additional renders to simulate concurrent-like behavior
    function Parent() {
      const [tick, setTick] = useState(0);
      return (
        <>
          <SnapshotCapture />
          <button onClick={() => setTick(t => t + 1)} data-testid="tick">
            Tick {tick}
          </button>
        </>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <Parent />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Count: 0")).toBeDefined();

    // Update external store then trigger a parent re-render
    act(() => {
      setState({ count: 7 });
    });

    expect(screen.getByText("Count: 7")).toBeDefined();

    // Force an additional parent re-render -- useSyncExternalStore should
    // still return the latest value from the store (7), not lose it
    act(() => {
      fireEvent.click(screen.getByTestId("tick"));
    });

    expect(screen.getByText("Count: 7")).toBeDefined();
    // The last captured snapshot should still be 7
    expect(snapshots[snapshots.length - 1]).toBe(7);
  });
});
