import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import React from "react";
import { HexDiContainerProvider } from "@hex-di/react";
import { useStatePort } from "../src/index.js";
import { createMockContainer, createMockStateService, CounterPort } from "./helpers.js";

afterEach(() => {
  cleanup();
});

describe("useStatePort", () => {
  it("returns both state and actions", () => {
    const { service } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    function Counter() {
      const { state, actions } = useStatePort(CounterPort);
      return (
        <div>
          <span>Count: {state.count}</span>
          <button onClick={() => actions.increment()}>Inc</button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <Counter />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Count: 0")).toBeDefined();

    act(() => {
      fireEvent.click(screen.getByText("Inc"));
    });

    expect(screen.getByText("Count: 1")).toBeDefined();
  });

  it("re-renders when state changes via setState", () => {
    const { service, setState } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    let renderCount = 0;
    function Counter() {
      renderCount++;
      const { state } = useStatePort(CounterPort);
      return <div>Count: {state.count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <Counter />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Count: 0")).toBeDefined();
    const initialRenders = renderCount;

    act(() => {
      setState({ count: 15 });
    });

    expect(screen.getByText("Count: 15")).toBeDefined();
    expect(renderCount).toBeGreaterThan(initialRenders);
  });

  it("actions is referentially stable across renders", () => {
    const { service, setState } = createMockStateService();
    const services = new Map<string, unknown>([["Counter", service]]);
    const container = createMockContainer(services);

    const actionsRefs: unknown[] = [];
    function Capture() {
      const { actions } = useStatePort(CounterPort);
      actionsRefs.push(actions);
      return null;
    }

    render(
      <HexDiContainerProvider container={container}>
        <Capture />
      </HexDiContainerProvider>
    );

    // Trigger a re-render by changing state
    act(() => {
      setState({ count: 5 });
    });

    expect(actionsRefs.length).toBeGreaterThanOrEqual(2);
    expect(actionsRefs[0]).toBe(actionsRefs[1]);
  });
});
