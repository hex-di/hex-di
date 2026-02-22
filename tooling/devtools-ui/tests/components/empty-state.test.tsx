/**
 * Tests for EmptyState component.
 *
 * Spec Section 43.4
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EmptyState } from "../../src/components/empty-state.js";

afterEach(() => {
  cleanup();
});

describe("EmptyState", () => {
  it("renders the message", () => {
    render(<EmptyState message="No data available" />);

    const el = screen.getByTestId("empty-state");
    expect(el).toBeDefined();
    expect(el.textContent).toContain("No data available");
  });

  it("renders with an icon", () => {
    render(<EmptyState message="Empty" icon="~" />);

    const el = screen.getByTestId("empty-state");
    expect(el.textContent).toContain("~");
    expect(el.textContent).toContain("Empty");
  });
});
