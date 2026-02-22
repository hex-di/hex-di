/**
 * Integration tests: cross-view navigation with context preservation.
 *
 * Spec: 11-interactions.md (11.11)
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

describe("Integration: Cross-View Context", () => {
  beforeEach(setupEnv);

  it("Railway -> 'View in Log' -> Log shows correct step selected", () => {
    const onNavigate = vi.fn();
    render(
      <ResultPanelIntegration
        chains={[{ id: "c1", label: "validateUser" }]}
        activeView="railway"
        selectedChainId="c1"
        selectedStepIndex={3}
        onCrossViewNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("cross-view-to-log"));

    expect(onNavigate).toHaveBeenCalledWith(
      "log",
      expect.objectContaining({
        chainId: "c1",
        stepIndex: 3,
      })
    );
  });

  it("Log -> 'View in Pipeline' -> Railway scrolls to correct node", () => {
    const onNavigate = vi.fn();
    render(
      <ResultPanelIntegration
        chains={[{ id: "c1", label: "validateUser" }]}
        activeView="log"
        selectedChainId="c1"
        selectedExecutionId="e1"
        selectedStepIndex={2}
        onCrossViewNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("cross-view-to-railway"));

    expect(onNavigate).toHaveBeenCalledWith(
      "railway",
      expect.objectContaining({
        chainId: "c1",
        executionId: "e1",
        stepIndex: 2,
      })
    );
  });

  it("Case Explorer -> 'View in Pipeline' -> Railway with matching execution", () => {
    const onNavigate = vi.fn();
    render(
      <ResultPanelIntegration
        chains={[{ id: "c1", label: "validateUser" }]}
        activeView="cases"
        selectedChainId="c1"
        onCrossViewNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("cross-view-to-railway"));

    expect(onNavigate).toHaveBeenCalledWith(
      "railway",
      expect.objectContaining({
        chainId: "c1",
      })
    );
  });

  it("Overview -> top error click -> Log filtered to error type", () => {
    const onNavigate = vi.fn();
    render(
      <ResultPanelIntegration
        chains={[{ id: "c1", label: "validateUser" }]}
        activeView="overview"
        topErrors={[{ errorType: "ValidationError", count: 42 }]}
        onCrossViewNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("top-error-row-0"));

    expect(onNavigate).toHaveBeenCalledWith(
      "log",
      expect.objectContaining({
        errorType: "ValidationError",
      })
    );
  });
});
