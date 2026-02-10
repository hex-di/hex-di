import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import React, { useState } from "react";
import { HexDiContainerProvider } from "@hex-di/react";
import { useStateValue, useActions } from "../src/index.js";
import { createMockContainer, createMockStateService, CounterPort } from "./helpers.js";

afterEach(() => {
  cleanup();
});

describe("useActions", () => {
  it("returns bound actions from a state port", () => {
    const { service } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    function ActionComponent() {
      const actions = useActions(CounterPort);
      return <button onClick={() => actions.increment()}>Inc</button>;
    }

    function CounterDisplay() {
      const state = useStateValue(CounterPort);
      return <div>Count: {state.count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <ActionComponent />
        <CounterDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Count: 0")).toBeDefined();

    act(() => {
      fireEvent.click(screen.getByText("Inc"));
    });

    expect(screen.getByText("Count: 1")).toBeDefined();
  });

  it("is referentially stable across renders", () => {
    const { service } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    const refs: unknown[] = [];
    function Capture() {
      const actions = useActions(CounterPort);
      refs.push(actions);
      return null;
    }

    // Use a parent that can force re-renders
    function Parent() {
      const [tick, setTick] = useState(0);
      return (
        <>
          <Capture />
          <button onClick={() => setTick(t => t + 1)} data-testid="rerender">
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

    // Force re-render
    act(() => {
      fireEvent.click(screen.getByTestId("rerender"));
    });

    expect(refs.length).toBeGreaterThanOrEqual(2);
    expect(refs[0]).toBe(refs[1]);
  });

  it("does not cause re-render on state change", () => {
    const { service, setState } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    let renderCount = 0;
    function ActionsOnly() {
      renderCount++;
      const _actions = useActions(CounterPort);
      return <div data-testid="actions-only">Actions</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <ActionsOnly />
      </HexDiContainerProvider>
    );

    const initialRenders = renderCount;

    // Mutate state -- useActions does not subscribe to state, so no re-render
    act(() => {
      setState({ count: 10 });
    });

    expect(renderCount).toBe(initialRenders);

    act(() => {
      setState({ count: 999 });
    });

    expect(renderCount).toBe(initialRenders);
  });

  it("individual action functions are referentially stable across renders", () => {
    const { service } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    const incrementRefs: unknown[] = [];
    const decrementRefs: unknown[] = [];
    function Capture() {
      const actions = useActions(CounterPort);
      incrementRefs.push(actions.increment);
      decrementRefs.push(actions.decrement);
      return null;
    }

    function Parent() {
      const [tick, setTick] = useState(0);
      return (
        <>
          <Capture />
          <button onClick={() => setTick(t => t + 1)} data-testid="rerender">
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

    act(() => {
      fireEvent.click(screen.getByTestId("rerender"));
    });

    expect(incrementRefs.length).toBeGreaterThanOrEqual(2);
    expect(incrementRefs[0]).toBe(incrementRefs[1]);
    expect(decrementRefs[0]).toBe(decrementRefs[1]);
  });
});
