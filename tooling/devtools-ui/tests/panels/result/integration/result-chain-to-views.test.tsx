/**
 * Integration tests: chain selection -> view updates.
 *
 * Spec: 14-integration.md
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

describe("Integration: Chain to Views", () => {
  beforeEach(setupEnv);

  it("Selecting chain updates Railway Pipeline with chain operations", () => {
    const chains = [
      { id: "c1", label: "validateUser", operationCount: 5 },
      { id: "c2", label: "processPayment", operationCount: 3 },
    ];
    render(<ResultPanelIntegration chains={chains} activeView="railway" />);

    fireEvent.click(screen.getAllByTestId("chain-option")[0]);

    const pipeline = screen.getByTestId("view-content");
    expect(pipeline.dataset["chainId"]).toBe("c1");
    expect(pipeline.dataset["view"]).toBe("railway");
  });

  it("Selecting chain updates Case Explorer with computed paths", () => {
    const chains = [{ id: "c1", label: "validateUser", operationCount: 5 }];
    render(<ResultPanelIntegration chains={chains} activeView="cases" />);

    fireEvent.click(screen.getAllByTestId("chain-option")[0]);

    const content = screen.getByTestId("view-content");
    expect(content.dataset["chainId"]).toBe("c1");
    expect(content.dataset["view"]).toBe("cases");
  });

  it("Selecting chain updates Sankey with port statistics", () => {
    const chains = [{ id: "c1", label: "validateUser", operationCount: 5 }];
    render(<ResultPanelIntegration chains={chains} activeView="sankey" />);

    fireEvent.click(screen.getAllByTestId("chain-option")[0]);

    const content = screen.getByTestId("view-content");
    expect(content.dataset["chainId"]).toBe("c1");
    expect(content.dataset["view"]).toBe("sankey");
  });

  it("Selecting execution updates Operation Log with step traces", () => {
    const chains = [{ id: "c1", label: "validateUser", operationCount: 5 }];
    const executions = [
      { id: "e1", chainId: "c1", stepCount: 5 },
      { id: "e2", chainId: "c1", stepCount: 5 },
    ];
    render(<ResultPanelIntegration chains={chains} executions={executions} activeView="log" />);

    fireEvent.click(screen.getAllByTestId("execution-option")[0]);

    const content = screen.getByTestId("view-content");
    expect(content.dataset["executionId"]).toBe("e1");
    expect(content.dataset["view"]).toBe("log");
  });
});
