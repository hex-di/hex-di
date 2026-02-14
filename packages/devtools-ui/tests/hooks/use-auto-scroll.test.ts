/**
 * Tests for useAutoScroll hook.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { useAutoScroll } from "../../src/hooks/use-auto-scroll.js";

describe("useAutoScroll", () => {
  let mockObserveCallback: (() => void) | undefined;

  beforeEach(() => {
    mockObserveCallback = undefined;

    vi.stubGlobal(
      "MutationObserver",
      class MockMutationObserver {
        constructor(cb: any) {
          mockObserveCallback = cb;
        }
        observe() {}
        disconnect() {
          mockObserveCallback = undefined;
        }
      }
    );
  });

  it("starts with auto-scrolling enabled", () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      return useAutoScroll(ref);
    });

    expect(result.current.isAutoScrolling).toBe(true);
  });

  it("provides a scrollToBottom function", () => {
    const element = document.createElement("div");
    Object.defineProperty(element, "scrollHeight", { value: 500, writable: true });

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(element);
      return useAutoScroll(ref);
    });

    expect(typeof result.current.scrollToBottom).toBe("function");
  });
});
