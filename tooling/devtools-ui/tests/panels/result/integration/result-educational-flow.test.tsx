/**
 * Integration tests: educational walkthrough flow.
 *
 * Spec: 12-educational-features.md
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

describe("Integration: Educational Flow", () => {
  beforeEach(setupEnv);

  it("Starting walkthrough -> steps highlight correct elements", () => {
    const onHighlight = vi.fn();
    render(
      <ResultPanelIntegration
        chains={[{ id: "c1", label: "validateUser" }]}
        activeView="railway"
        walkthroughId="basics"
        walkthroughStep={0}
        onWalkthroughHighlight={onHighlight}
      />
    );

    expect(onHighlight).toHaveBeenCalled();
    const highlight = screen.getByTestId("walkthrough-highlight");
    expect(highlight).toBeDefined();
  });

  it("Walkthrough view-switch step -> panel navigates to specified view", () => {
    const onNavigate = vi.fn();
    render(
      <ResultPanelIntegration
        chains={[{ id: "c1", label: "validateUser" }]}
        activeView="railway"
        walkthroughId="basics"
        walkthroughStep={2}
        walkthroughTargetView="log"
        onWalkthroughNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("walkthrough-next"));
    expect(onNavigate).toHaveBeenCalledWith("log");
  });

  it("Context-aware sidebar -> selecting node -> sidebar content updates", () => {
    const onSidebarUpdate = vi.fn();
    render(
      <ResultPanelIntegration
        chains={[{ id: "c1", label: "validateUser" }]}
        activeView="railway"
        selectedMethod="andThen"
        onSidebarContentUpdate={onSidebarUpdate}
      />
    );

    expect(onSidebarUpdate).toHaveBeenCalledWith(expect.objectContaining({ method: "andThen" }));
  });
});
