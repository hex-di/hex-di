import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import React from "react";
import { HexDiContainerProvider } from "@hex-di/react";
import { useStateValue, useDerived } from "../src/index.js";
import {
  createMockContainer,
  createMockStateService,
  createMockDerivedService,
  CounterPort,
  DoubleCountPort,
} from "./helpers.js";

afterEach(() => {
  cleanup();
});

describe("useDerived", () => {
  it("reads derived value and updates on change", () => {
    const { service, setValue } = createMockDerivedService(0);
    const services = new Map<string, unknown>([["DoubleCount", service]]);
    const container = createMockContainer(services);

    function DerivedDisplay() {
      const value = useDerived(DoubleCountPort);
      return <div>Derived: {value}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <DerivedDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Derived: 0")).toBeDefined();

    act(() => {
      setValue(10);
    });

    expect(screen.getByText("Derived: 10")).toBeDefined();
  });

  it("does not re-render when unrelated state changes", () => {
    // Two separate services: a derived service and a counter state service.
    // Changing the counter state should not trigger a re-render
    // of the component using useDerived.
    const { service: derivedService } = createMockDerivedService(42);
    const { service: counterService, setState } = createMockStateService();
    const services = new Map<string, unknown>([
      ["DoubleCount", derivedService],
      ["Counter", counterService],
    ]);
    const container = createMockContainer(services);

    let derivedRenderCount = 0;
    function DerivedDisplay() {
      derivedRenderCount++;
      const value = useDerived(DoubleCountPort);
      return <div>Derived: {value}</div>;
    }

    // Also render something using the counter so the counter service is subscribed
    function CounterDisplay() {
      const state = useStateValue(CounterPort);
      return <div>Count: {state.count}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <DerivedDisplay />
        <CounterDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Derived: 42")).toBeDefined();
    const initialDerivedRenders = derivedRenderCount;

    // Changing counter state should not affect derived display
    act(() => {
      setState({ count: 999 });
    });

    expect(screen.getByText("Count: 999")).toBeDefined();
    expect(derivedRenderCount).toBe(initialDerivedRenders);
  });

  it("re-renders when derived value changes", () => {
    const { service, setValue } = createMockDerivedService(0);
    const services = new Map<string, unknown>([["DoubleCount", service]]);
    const container = createMockContainer(services);

    let renderCount = 0;
    function DerivedDisplay() {
      renderCount++;
      const value = useDerived(DoubleCountPort);
      return <div>Derived: {value}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <DerivedDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Derived: 0")).toBeDefined();
    const initialRenders = renderCount;

    act(() => {
      setValue(20);
    });

    expect(screen.getByText("Derived: 20")).toBeDefined();
    expect(renderCount).toBeGreaterThan(initialRenders);

    const afterFirstUpdate = renderCount;

    act(() => {
      setValue(30);
    });

    expect(screen.getByText("Derived: 30")).toBeDefined();
    expect(renderCount).toBeGreaterThan(afterFirstUpdate);
  });
});
