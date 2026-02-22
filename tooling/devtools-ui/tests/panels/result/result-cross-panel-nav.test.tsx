/**
 * Component tests for cross-panel navigation.
 *
 * Spec: 11-interactions.md (11.12)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CrossPanelNavigation } from "../../../src/panels/result/cross-panel-nav.js";

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

describe("CrossPanelNavigation", () => {
  beforeEach(setupEnv);

  it("click port name navigates to Graph Panel with port selected", () => {
    const onNavigate = vi.fn();
    render(
      <CrossPanelNavigation portName="UserPort" scopeId="scope-1" onNavigateToPanel={onNavigate} />
    );

    fireEvent.click(screen.getByTestId("nav-to-graph"));
    expect(onNavigate).toHaveBeenCalledWith(
      "graph",
      expect.objectContaining({ portName: "UserPort" })
    );
  });

  it("click 'View Container' navigates to Container Panel", () => {
    const onNavigate = vi.fn();
    render(
      <CrossPanelNavigation portName="UserPort" scopeId="scope-1" onNavigateToPanel={onNavigate} />
    );

    fireEvent.click(screen.getByTestId("nav-to-container"));
    expect(onNavigate).toHaveBeenCalledWith("container", expect.objectContaining({}));
  });

  it("click scope ID navigates to Scope Tree Panel", () => {
    const onNavigate = vi.fn();
    render(
      <CrossPanelNavigation portName="UserPort" scopeId="scope-1" onNavigateToPanel={onNavigate} />
    );

    fireEvent.click(screen.getByTestId("nav-to-scope"));
    expect(onNavigate).toHaveBeenCalledWith(
      "scope",
      expect.objectContaining({ scopeId: "scope-1" })
    );
  });

  it("inbound from Graph Panel sets chain selector", () => {
    render(
      <CrossPanelNavigation
        portName="UserPort"
        scopeId="scope-1"
        inboundSource="graph"
        inboundChainId="chain-1"
        onNavigateToPanel={vi.fn()}
      />
    );

    const indicator = screen.getByTestId("inbound-indicator");
    expect(indicator.textContent).toContain("Graph Panel");
    expect(indicator.dataset["chainId"]).toBe("chain-1");
  });

  it("inbound from Container Panel sets chain selector", () => {
    render(
      <CrossPanelNavigation
        portName="UserPort"
        scopeId="scope-1"
        inboundSource="container"
        inboundChainId="chain-2"
        onNavigateToPanel={vi.fn()}
      />
    );

    const indicator = screen.getByTestId("inbound-indicator");
    expect(indicator.textContent).toContain("Container Panel");
    expect(indicator.dataset["chainId"]).toBe("chain-2");
  });

  it("navigation without matching chain shows 'Chain not found' toast", () => {
    render(
      <CrossPanelNavigation
        portName="UserPort"
        scopeId="scope-1"
        inboundSource="graph"
        inboundChainId={undefined}
        onNavigateToPanel={vi.fn()}
      />
    );

    const toast = screen.getByTestId("chain-not-found-toast");
    expect(toast.textContent).toContain("Chain not found");
  });
});
