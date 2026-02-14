/**
 * Tests for StatusBadge component.
 *
 * Spec Section 43.4
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StatusBadge } from "../../src/components/status-badge.js";

afterEach(() => {
  cleanup();
});

describe("StatusBadge", () => {
  it("renders with singleton variant", () => {
    render(<StatusBadge variant="singleton" />);

    const badge = screen.getByTestId("status-badge-singleton");
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe("singleton");
  });

  it("renders with custom label", () => {
    render(<StatusBadge variant="scoped" label="Scoped Instance" />);

    const badge = screen.getByTestId("status-badge-scoped");
    expect(badge.textContent).toBe("Scoped Instance");
  });

  it("renders all supported variants", () => {
    const variants = [
      "singleton",
      "scoped",
      "transient",
      "resolved",
      "unresolved",
      "error",
      "disposed",
    ] as const;

    for (const variant of variants) {
      const { unmount } = render(<StatusBadge variant={variant} />);
      const badge = screen.getByTestId(`status-badge-${variant}`);
      expect(badge).toBeDefined();
      unmount();
    }
  });
});
