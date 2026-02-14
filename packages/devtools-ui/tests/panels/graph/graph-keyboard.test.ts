/**
 * Tests for useGraphKeyboard hook (logic paths, not React rendering)
 * and computeInitialViewport (pure function for centering).
 *
 * Since useGraphKeyboard is a thin wrapper around useKeyboardShortcuts
 * that builds a shortcut map, we test the shortcut map construction logic
 * by examining what the hook registers.
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGraphKeyboard } from "../../../src/panels/graph/use-graph-keyboard.js";
import { computeInitialViewport } from "../../../src/panels/graph/viewport.js";
import type { GraphPanelDispatch } from "../../../src/panels/graph/use-graph-panel-state.js";

function createMockDispatch(): GraphPanelDispatch {
  return {
    selectNode: vi.fn(),
    toggleMultiSelect: vi.fn(),
    clearSelection: vi.fn(),
    setHovered: vi.fn(),
    setViewport: vi.fn(),
    setFilter: vi.fn(),
    resetFilter: vi.fn(),
    toggleAnalysis: vi.fn(),
    toggleMetadata: vi.fn(),
    toggleFilterPanel: vi.fn(),
    setLayoutDirection: vi.fn(),
    toggleMinimap: vi.fn(),
    setContainer: vi.fn(),
    setBlastRadius: vi.fn(),
    setActivePreset: vi.fn(),
  };
}

describe("useGraphKeyboard", () => {
  it("renders without throwing", () => {
    const dispatch = createMockDispatch();
    const { result } = renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    // Hook returns void
    expect(result.current).toBeUndefined();
  });

  it("Escape triggers clearSelection via keydown", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(dispatch.clearSelection).toHaveBeenCalled();
  });

  it("f toggles filter panel", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
    expect(dispatch.toggleFilterPanel).toHaveBeenCalled();
  });

  it("a toggles analysis sidebar", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(dispatch.toggleAnalysis).toHaveBeenCalled();
  });

  it("m toggles metadata inspector", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "m" }));
    expect(dispatch.toggleMetadata).toHaveBeenCalled();
  });

  it("n toggles minimap", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "n" }));
    expect(dispatch.toggleMinimap).toHaveBeenCalled();
  });

  it("+ zooms in", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "+" }));
    expect(dispatch.setViewport).toHaveBeenCalledWith(
      expect.objectContaining({ zoom: expect.any(Number) })
    );
  });

  it("- zooms out", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "-" }));
    expect(dispatch.setViewport).toHaveBeenCalledWith(
      expect.objectContaining({ zoom: expect.any(Number) })
    );
  });

  it("0 resets zoom to 1", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 100, panY: 50, zoom: 2 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "0" }));
    expect(dispatch.setViewport).toHaveBeenCalledWith({ panX: 0, panY: 0, zoom: 1 });
  });

  it("does not fire when enabled is false", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
        enabled: false,
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(dispatch.clearSelection).not.toHaveBeenCalled();
  });

  it("does not fire when typing in input", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true }));
    expect(dispatch.toggleFilterPanel).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("d toggles layout direction", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    expect(dispatch.setLayoutDirection).toHaveBeenCalled();
  });

  it("ArrowUp pans viewport up", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    expect(dispatch.setViewport).toHaveBeenCalledWith(expect.objectContaining({ panY: 50 }));
  });

  it("ArrowDown pans viewport down", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(dispatch.setViewport).toHaveBeenCalledWith(expect.objectContaining({ panY: -50 }));
  });

  it("ArrowLeft pans viewport left", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    expect(dispatch.setViewport).toHaveBeenCalledWith(expect.objectContaining({ panX: 50 }));
  });

  it("ArrowRight pans viewport right", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(dispatch.setViewport).toHaveBeenCalledWith(expect.objectContaining({ panX: -50 }));
  });

  it("ArrowRight accumulates from existing pan position", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: -100, panY: 200, zoom: 1.5 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(dispatch.setViewport).toHaveBeenCalledWith({
      panX: -150,
      panY: 200,
      zoom: 1.5,
    });
  });

  it("ArrowUp accumulates from existing pan position", () => {
    const dispatch = createMockDispatch();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 30, panY: -80, zoom: 0.5 },
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    expect(dispatch.setViewport).toHaveBeenCalledWith({
      panX: 30,
      panY: -30,
      zoom: 0.5,
    });
  });

  it("Ctrl+e triggers export when onExport provided", () => {
    const dispatch = createMockDispatch();
    const onExport = vi.fn();
    renderHook(() =>
      useGraphKeyboard({
        dispatch,
        viewport: { panX: 0, panY: 0, zoom: 1 },
        onExport,
      })
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "e", ctrlKey: true }));
    expect(onExport).toHaveBeenCalledWith("dot");
  });
});

describe("computeInitialViewport", () => {
  it("centers a small graph in a large canvas at zoom 1", () => {
    const viewport = computeInitialViewport(200, 100, 800, 600);
    // Graph 200x100 in canvas 800x600 at zoom 1:
    // panX = (800 - 200) / 2 = 300
    // panY = (600 - 100) / 2 = 250
    expect(viewport).toEqual({ panX: 300, panY: 250, zoom: 1 });
  });

  it("scales down when graph is wider than canvas", () => {
    const viewport = computeInitialViewport(1600, 400, 800, 600);
    // Graph too wide: 1600 > 800, must scale down
    // scaleX = (800 - 80) / 1600 = 0.45
    // scaleY = (600 - 80) / 400 = 1.3
    // zoom = min(0.45, 1.3) = 0.45
    expect(viewport.zoom).toBeCloseTo(0.45, 2);
    // Center at that zoom:
    // panX = (800 - 1600 * 0.45) / 2 = (800 - 720) / 2 = 40
    // panY = (600 - 400 * 0.45) / 2 = (600 - 180) / 2 = 210
    expect(viewport.panX).toBeCloseTo(40, 0);
    expect(viewport.panY).toBeCloseTo(210, 0);
  });

  it("scales down when graph is taller than canvas", () => {
    const viewport = computeInitialViewport(300, 1200, 800, 600);
    // scaleX = (800 - 80) / 300 = 2.4
    // scaleY = (600 - 80) / 1200 = 0.4333
    // zoom = min(0.4333, 1) = 0.4333 (capped at 1 but also min of scales)
    expect(viewport.zoom).toBeCloseTo(0.4333, 2);
  });

  it("does not zoom beyond 1.0 for small graphs", () => {
    const viewport = computeInitialViewport(50, 50, 800, 600);
    // scaleX = (800 - 80) / 50 = 14.4
    // scaleY = (600 - 80) / 50 = 10.4
    // zoom = min(14.4, 10.4, 1) = 1 (capped)
    expect(viewport.zoom).toBe(1);
  });

  it("returns default viewport for zero-size layout", () => {
    const viewport = computeInitialViewport(0, 0, 800, 600);
    expect(viewport).toEqual({ panX: 0, panY: 0, zoom: 1 });
  });
});
