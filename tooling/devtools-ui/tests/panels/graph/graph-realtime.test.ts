/**
 * Tests for useGraphRealtime hook and checkReducedMotion.
 */

import { describe, it, expect, vi, afterEach, beforeEach, beforeAll, afterAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useGraphRealtime,
  checkReducedMotion,
} from "../../../src/panels/graph/use-graph-realtime.js";

// jsdom doesn't provide window.matchMedia — stub it for these tests
const originalMatchMedia = window.matchMedia;

beforeAll(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterAll(() => {
  window.matchMedia = originalMatchMedia;
});

describe("checkReducedMotion", () => {
  it("returns false when prefers-reduced-motion is not set", () => {
    expect(checkReducedMotion()).toBe(false);
  });

  it("returns true when prefers-reduced-motion matches", () => {
    vi.mocked(window.matchMedia).mockReturnValueOnce({ matches: true } as MediaQueryList);
    expect(checkReducedMotion()).toBe(true);
  });
});

describe("useGraphRealtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with no pending updates", () => {
    const { result } = renderHook(() => useGraphRealtime());
    expect(result.current.pendingUpdates).toHaveLength(0);
  });

  it("returns prefersReducedMotion flag", () => {
    const { result } = renderHook(() => useGraphRealtime());
    expect(typeof result.current.prefersReducedMotion).toBe("boolean");
  });

  it("recordEnter adds an enter update", () => {
    const { result } = renderHook(() => useGraphRealtime());
    act(() => result.current.recordEnter("PortA"));
    expect(result.current.pendingUpdates.length).toBeGreaterThanOrEqual(1);
    const enterUpdates = result.current.pendingUpdates.filter(u => u.type === "enter");
    expect(enterUpdates.some(u => u.portName === "PortA")).toBe(true);
  });

  it("recordExit adds an exit update", () => {
    const { result } = renderHook(() => useGraphRealtime());
    act(() => result.current.recordExit("PortB"));
    const exitUpdates = result.current.pendingUpdates.filter(u => u.type === "exit");
    expect(exitUpdates.some(u => u.portName === "PortB")).toBe(true);
  });

  it("recordUpdate adds an update update", () => {
    const { result } = renderHook(() => useGraphRealtime());
    act(() => result.current.recordUpdate("PortC"));
    const updateUpdates = result.current.pendingUpdates.filter(u => u.type === "update");
    expect(updateUpdates.some(u => u.portName === "PortC")).toBe(true);
  });

  it("updates include timestamp", () => {
    const { result } = renderHook(() => useGraphRealtime());
    const before = Date.now();
    act(() => result.current.recordEnter("PortD"));
    const update = result.current.pendingUpdates[0];
    expect(update).toBeDefined();
    expect(update!.timestamp).toBeGreaterThanOrEqual(before);
  });

  it("cleans up old updates after timeout", () => {
    const { result } = renderHook(() => useGraphRealtime());
    act(() => result.current.recordEnter("PortE"));
    expect(result.current.pendingUpdates.length).toBe(1);

    // Advance past ENTER_EXIT_DURATION_MS (300ms)
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current.pendingUpdates.length).toBe(0);
  });

  it("multiple updates accumulate", () => {
    const { result } = renderHook(() => useGraphRealtime());
    act(() => {
      result.current.recordEnter("A");
      result.current.recordEnter("B");
      result.current.recordExit("C");
    });
    expect(result.current.pendingUpdates.length).toBe(3);
  });
});
