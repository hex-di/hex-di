/**
 * Tests for SearchInput component.
 *
 * Spec Section 43.4
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { SearchInput } from "../../src/components/search-input.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("SearchInput", () => {
  it("renders with placeholder", () => {
    render(<SearchInput placeholder="Filter..." onChange={vi.fn()} />);

    const input = screen.getByRole("searchbox");
    expect(input).toBeDefined();
    expect(input.getAttribute("placeholder")).toBe("Filter...");
  });

  it("calls onChange after debounce", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    render(<SearchInput onChange={onChange} debounceMs={100} />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "test" } });

    // Should not have fired yet
    expect(onChange).not.toHaveBeenCalled();

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(onChange).toHaveBeenCalledWith("test");
  });

  it("clears on Escape key", () => {
    const onChange = vi.fn();

    render(<SearchInput onChange={onChange} value="hello" />);

    const input = screen.getByRole("searchbox");
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onChange).toHaveBeenCalledWith("");
  });
});
