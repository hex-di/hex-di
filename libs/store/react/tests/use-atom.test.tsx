import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import React, { useState } from "react";
import { HexDiContainerProvider } from "@hex-di/react";
import { useAtom } from "../src/index.js";
import { createMockContainer, createMockAtomService, ThemePort } from "./helpers.js";

afterEach(() => {
  cleanup();
});

describe("useAtom", () => {
  it("returns value and setter tuple", () => {
    const { service } = createMockAtomService("light");
    const services = new Map<string, unknown>([["Theme", service]]);
    const container = createMockContainer(services);

    function ThemeToggle() {
      const [theme, setTheme] = useAtom(ThemePort);
      return (
        <div>
          <span>Theme: {theme}</span>
          <button onClick={() => setTheme("dark")}>Dark</button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <ThemeToggle />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Theme: light")).toBeDefined();

    act(() => {
      fireEvent.click(screen.getByText("Dark"));
    });

    expect(screen.getByText("Theme: dark")).toBeDefined();
  });

  it("supports functional updates", () => {
    const { service } = createMockAtomService("light");
    const services = new Map<string, unknown>([["Theme", service]]);
    const container = createMockContainer(services);

    function ThemeToggle() {
      const [theme, setTheme] = useAtom(ThemePort);
      return (
        <div>
          <span>Theme: {theme}</span>
          <button onClick={() => setTheme(prev => (prev === "light" ? "dark" : "light"))}>
            Toggle
          </button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <ThemeToggle />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Theme: light")).toBeDefined();

    act(() => {
      fireEvent.click(screen.getByText("Toggle"));
    });

    expect(screen.getByText("Theme: dark")).toBeDefined();

    act(() => {
      fireEvent.click(screen.getByText("Toggle"));
    });

    expect(screen.getByText("Theme: light")).toBeDefined();
  });

  it("setter is referentially stable across renders", () => {
    const { service } = createMockAtomService("light");
    const services = new Map<string, unknown>([["Theme", service]]);
    const container = createMockContainer(services);

    const setterRefs: unknown[] = [];
    function Capture() {
      const [, setTheme] = useAtom(ThemePort);
      setterRefs.push(setTheme);
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

    expect(setterRefs.length).toBeGreaterThanOrEqual(2);
    expect(setterRefs[0]).toBe(setterRefs[1]);
  });

  it("re-renders when atom value changes externally", () => {
    const { service } = createMockAtomService("light");
    const services = new Map<string, unknown>([["Theme", service]]);
    const container = createMockContainer(services);

    function ThemeDisplay() {
      const [theme] = useAtom(ThemePort);
      return <div>Theme: {theme}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <ThemeDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Theme: light")).toBeDefined();

    // Mutate externally via the service (not through the hook setter)
    act(() => {
      service.set("dark");
    });

    expect(screen.getByText("Theme: dark")).toBeDefined();
  });

  it("value reflects external mutations via set()", () => {
    const { service } = createMockAtomService("initial");
    const services = new Map<string, unknown>([["Theme", service]]);
    const container = createMockContainer(services);

    const captured: string[] = [];
    function ValueCapture() {
      const [value] = useAtom(ThemePort);
      captured.push(value);
      return <div>Value: {value}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <ValueCapture />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Value: initial")).toBeDefined();

    act(() => {
      service.set("updated-1");
    });

    expect(screen.getByText("Value: updated-1")).toBeDefined();

    act(() => {
      service.set("updated-2");
    });

    expect(screen.getByText("Value: updated-2")).toBeDefined();
    // Verify each external set caused a re-render with the correct value
    expect(captured).toContain("initial");
    expect(captured).toContain("updated-1");
    expect(captured).toContain("updated-2");
  });
});
