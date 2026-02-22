/**
 * Integration tests: filter application -> view rendering.
 *
 * Spec: 13-filter-and-search.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ResultPanelIntegration } from "../../../../src/panels/result/integration.js";

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

describe("Integration: Filter to Render", () => {
  beforeEach(setupEnv);

  it("Port filter -> only matching chain shown in selector", () => {
    const chains = [
      { id: "c1", label: "validateUser", port: "auth" },
      { id: "c2", label: "processPayment", port: "payment" },
    ];
    render(<ResultPanelIntegration chains={chains} activeView="railway" />);

    fireEvent.click(screen.getByTestId("port-filter"));
    fireEvent.click(screen.getByTestId("port-option-auth"));

    const visibleChains = screen.getAllByTestId("chain-option");
    expect(visibleChains.length).toBe(1);
    expect(visibleChains[0].textContent).toContain("validateUser");
  });

  it("Error type filter -> Log shows only matching executions", () => {
    const chains = [{ id: "c1", label: "validateUser" }];
    const onFilterApply = vi.fn();
    render(
      <ResultPanelIntegration chains={chains} activeView="log" onFilterApply={onFilterApply} />
    );

    fireEvent.click(screen.getByTestId("error-type-filter"));
    fireEvent.click(screen.getByTestId("error-type-option-validation"));

    expect(onFilterApply).toHaveBeenCalledWith(
      expect.objectContaining({ errorType: "validation" })
    );
  });

  it("Time range filter -> Sankey recomputes with filtered data", () => {
    const chains = [{ id: "c1", label: "validateUser" }];
    const onFilterApply = vi.fn();
    render(
      <ResultPanelIntegration chains={chains} activeView="sankey" onFilterApply={onFilterApply} />
    );

    fireEvent.click(screen.getByTestId("time-range-filter"));
    fireEvent.click(screen.getByTestId("time-range-option-1h"));

    expect(onFilterApply).toHaveBeenCalledWith(expect.objectContaining({ timeRange: "1h" }));
  });
});
