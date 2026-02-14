/**
 * Tests for useKeyboardShortcuts hook.
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardShortcuts } from "../../src/hooks/use-keyboard-shortcuts.js";

describe("useKeyboardShortcuts", () => {
  it("fires handler for matching key", () => {
    const handler = vi.fn();
    const shortcuts = new Map([["Ctrl+k", handler]]);

    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
    });

    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", () => {
    const handler = vi.fn();
    const shortcuts = new Map([["Enter", handler]]);

    renderHook(() => useKeyboardShortcuts(shortcuts, false));

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not fire for unmatched keys", () => {
    const handler = vi.fn();
    const shortcuts = new Map([["Ctrl+k", handler]]);

    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "j", ctrlKey: true }));
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
