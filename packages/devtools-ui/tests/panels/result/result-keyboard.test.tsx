/**
 * Component tests for keyboard navigation.
 *
 * Spec: 11-interactions.md (11.13), 15-accessibility.md (15.2)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { KeyboardNavigationHandler } from "../../../src/panels/result/keyboard-nav.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

function setupEnv(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

afterEach(() => {
  cleanup();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("KeyboardNavigationHandler", () => {
  beforeEach(setupEnv);

  it("`1`-`7` keys switch to views 1-7", () => {
    const onViewSwitch = vi.fn();
    render(<KeyboardNavigationHandler onViewSwitch={onViewSwitch} activeView="railway" />);

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "2" });
    expect(onViewSwitch).toHaveBeenCalledWith(1); // 0-indexed: view 2 = index 1
  });

  it("`Tab` cycles focus between interactive elements", () => {
    render(<KeyboardNavigationHandler onViewSwitch={vi.fn()} activeView="railway" />);

    const handler = screen.getByTestId("keyboard-handler");
    fireEvent.keyDown(handler, { key: "Tab" });
    // Tab is handled natively; we just verify handler doesn't prevent it
    expect(handler.dataset["tabHandled"]).toBe("true");
  });

  it("`Enter` activates focused element", () => {
    const onActivate = vi.fn();
    render(
      <KeyboardNavigationHandler
        onViewSwitch={vi.fn()}
        activeView="railway"
        onActivate={onActivate}
      />
    );

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "Enter" });
    expect(onActivate).toHaveBeenCalled();
  });

  it("`Escape` closes open panel/overlay", () => {
    const onEscape = vi.fn();
    render(
      <KeyboardNavigationHandler onViewSwitch={vi.fn()} activeView="railway" onEscape={onEscape} />
    );

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "Escape" });
    expect(onEscape).toHaveBeenCalled();
  });

  it("`Space` toggles playback in Railway Pipeline", () => {
    const onTogglePlayback = vi.fn();
    render(
      <KeyboardNavigationHandler
        onViewSwitch={vi.fn()}
        activeView="railway"
        onTogglePlayback={onTogglePlayback}
      />
    );

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: " " });
    expect(onTogglePlayback).toHaveBeenCalled();
  });

  it("Left/Right step through operations in Railway playback", () => {
    const onStepPrev = vi.fn();
    const onStepNext = vi.fn();
    render(
      <KeyboardNavigationHandler
        onViewSwitch={vi.fn()}
        activeView="railway"
        onStepPrev={onStepPrev}
        onStepNext={onStepNext}
      />
    );

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "ArrowLeft" });
    expect(onStepPrev).toHaveBeenCalled();

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "ArrowRight" });
    expect(onStepNext).toHaveBeenCalled();
  });

  it("Up/Down move step selection in Operation Log", () => {
    const onStepUp = vi.fn();
    const onStepDown = vi.fn();
    render(
      <KeyboardNavigationHandler
        onViewSwitch={vi.fn()}
        activeView="log"
        onStepUp={onStepUp}
        onStepDown={onStepDown}
      />
    );

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "ArrowUp" });
    expect(onStepUp).toHaveBeenCalled();

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "ArrowDown" });
    expect(onStepDown).toHaveBeenCalled();
  });

  it("`+`/`-` zoom in/out in Railway Pipeline", () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    render(
      <KeyboardNavigationHandler
        onViewSwitch={vi.fn()}
        activeView="railway"
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />
    );

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "+" });
    expect(onZoomIn).toHaveBeenCalled();

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "-" });
    expect(onZoomOut).toHaveBeenCalled();
  });

  it("`0` fits Railway Pipeline to view", () => {
    const onFitToView = vi.fn();
    render(
      <KeyboardNavigationHandler
        onViewSwitch={vi.fn()}
        activeView="railway"
        onFitToView={onFitToView}
      />
    );

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "0" });
    expect(onFitToView).toHaveBeenCalled();
  });

  it("`d` toggles diff mode in Operation Log", () => {
    const onToggleDiff = vi.fn();
    render(
      <KeyboardNavigationHandler
        onViewSwitch={vi.fn()}
        activeView="log"
        onToggleDiff={onToggleDiff}
      />
    );

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "d" });
    expect(onToggleDiff).toHaveBeenCalled();
  });

  it("`f` opens filter controls", () => {
    const onOpenFilter = vi.fn();
    render(
      <KeyboardNavigationHandler
        onViewSwitch={vi.fn()}
        activeView="railway"
        onOpenFilter={onOpenFilter}
      />
    );

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "f" });
    expect(onOpenFilter).toHaveBeenCalled();
  });

  it("`?` toggles educational sidebar", () => {
    const onToggleEducational = vi.fn();
    render(
      <KeyboardNavigationHandler
        onViewSwitch={vi.fn()}
        activeView="railway"
        onToggleEducational={onToggleEducational}
      />
    );

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "?" });
    expect(onToggleEducational).toHaveBeenCalled();
  });

  it("`/` opens global search", () => {
    const onOpenSearch = vi.fn();
    render(
      <KeyboardNavigationHandler
        onViewSwitch={vi.fn()}
        activeView="railway"
        onOpenSearch={onOpenSearch}
      />
    );

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "/" });
    expect(onOpenSearch).toHaveBeenCalled();
  });

  it("`s` opens What-If Simulator in Case Explorer", () => {
    const onOpenSimulator = vi.fn();
    render(
      <KeyboardNavigationHandler
        onViewSwitch={vi.fn()}
        activeView="cases"
        onOpenSimulator={onOpenSimulator}
      />
    );

    fireEvent.keyDown(screen.getByTestId("keyboard-handler"), { key: "s" });
    expect(onOpenSimulator).toHaveBeenCalled();
  });
});
