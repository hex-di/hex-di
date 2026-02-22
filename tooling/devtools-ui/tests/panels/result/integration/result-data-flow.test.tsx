/**
 * Integration tests: data source -> panel rendering.
 *
 * Spec: 14-integration.md (14.2)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { ResultPanelIntegration } from "../../../../src/panels/result/integration.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

interface EventEmitter {
  emit(event: { readonly type: string }): void;
  subscribe(listener: (event: { readonly type: string }) => void): () => void;
}

function createEventEmitter(): EventEmitter {
  const listeners: Array<(event: { readonly type: string }) => void> = [];
  return {
    emit(event) {
      for (const l of listeners) l(event);
    },
    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
  };
}

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

describe("Integration: Data Flow", () => {
  beforeEach(setupEnv);

  it("DataSource with chains -> panel renders chain selector with entries", () => {
    const chains = [
      { id: "c1", label: "validateUser" },
      { id: "c2", label: "processPayment" },
    ];
    render(<ResultPanelIntegration chains={chains} activeView="railway" />);

    const selector = screen.getByTestId("chain-selector");
    expect(selector).toBeDefined();

    const options = screen.getAllByTestId("chain-option");
    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain("validateUser");
    expect(options[1].textContent).toContain("processPayment");
  });

  it("DataSource emits execution -> Railway Pipeline updates", () => {
    const emitter = createEventEmitter();
    const onExecutionUpdate = vi.fn();
    render(
      <ResultPanelIntegration
        chains={[{ id: "c1", label: "validateUser" }]}
        activeView="railway"
        subscribe={emitter.subscribe}
        onExecutionUpdate={onExecutionUpdate}
      />
    );

    act(() => {
      emitter.emit({ type: "execution-added" });
    });

    expect(onExecutionUpdate).toHaveBeenCalled();
  });

  it("DataSource emits stats update -> Overview Dashboard refreshes", () => {
    const emitter = createEventEmitter();
    const onStatsRefresh = vi.fn();
    render(
      <ResultPanelIntegration
        chains={[{ id: "c1", label: "validateUser" }]}
        activeView="overview"
        subscribe={emitter.subscribe}
        onStatsRefresh={onStatsRefresh}
      />
    );

    act(() => {
      emitter.emit({ type: "statistics-updated" });
    });

    expect(onStatsRefresh).toHaveBeenCalled();
  });
});
