/**
 * Tests for useResizeObserver hook.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useResizeObserver } from "../../src/hooks/use-resize-observer.js";

describe("useResizeObserver", () => {
  let observeCallback:
    | ((entries: Array<{ contentRect: { width: number; height: number } }>) => void)
    | undefined;
  let observedElement: Element | undefined;

  beforeEach(() => {
    observeCallback = undefined;
    observedElement = undefined;

    vi.stubGlobal(
      "ResizeObserver",
      class MockResizeObserver {
        constructor(cb: any) {
          observeCallback = cb;
        }
        observe(el: Element) {
          observedElement = el;
        }
        disconnect() {
          observeCallback = undefined;
          observedElement = undefined;
        }
      }
    );
  });

  it("returns initial dimensions of zero", () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      const dims = useResizeObserver(ref);
      return { ref, dims };
    });

    expect(result.current.dims.width).toBe(0);
    expect(result.current.dims.height).toBe(0);
  });

  it("observes the element and reports dimensions", () => {
    const element = document.createElement("div");

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(element);
      const dims = useResizeObserver(ref);
      return { ref, dims };
    });

    expect(observedElement).toBe(element);

    // Simulate resize
    act(() => {
      observeCallback?.([{ contentRect: { width: 400, height: 300 } }]);
    });

    expect(result.current.dims.width).toBe(400);
    expect(result.current.dims.height).toBe(300);
  });
});
