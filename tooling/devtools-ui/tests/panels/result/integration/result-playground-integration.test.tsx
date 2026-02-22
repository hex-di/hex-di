/**
 * Integration tests: Playground auto-patching and live re-execution.
 *
 * Spec: 14-integration.md (14.4)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
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

describe("Integration: Playground", () => {
  beforeEach(setupEnv);

  it("Playground auto-patches ok/err -> chain traced automatically", () => {
    render(
      <ResultPanelIntegration
        chains={[{ id: "c1", label: "validateUser" }]}
        activeView="railway"
        playgroundMode={true}
      />
    );

    const indicator = screen.getByTestId("auto-trace-indicator");
    expect(indicator.dataset["active"]).toBe("true");
  });

  it("Code edit -> re-execution -> panel updates with new execution", () => {
    const onExecutionUpdate = vi.fn();
    const emitter = {
      listeners: [] as Array<(event: { readonly type: string }) => void>,
      emit(event: { readonly type: string }) {
        for (const l of this.listeners) l(event);
      },
      subscribe(listener: (event: { readonly type: string }) => void) {
        emitter.listeners.push(listener);
        return () => {
          const idx = emitter.listeners.indexOf(listener);
          if (idx >= 0) emitter.listeners.splice(idx, 1);
        };
      },
    };

    render(
      <ResultPanelIntegration
        chains={[{ id: "c1", label: "validateUser" }]}
        activeView="railway"
        playgroundMode={true}
        subscribe={emitter.subscribe}
        onExecutionUpdate={onExecutionUpdate}
      />
    );

    act(() => {
      emitter.emit({ type: "execution-added" });
    });

    expect(onExecutionUpdate).toHaveBeenCalled();
  });

  it("Level 1 tracing enabled by default in Playground context", () => {
    render(
      <ResultPanelIntegration
        chains={[{ id: "c1", label: "validateUser" }]}
        activeView="railway"
        playgroundMode={true}
      />
    );

    const tracingIndicator = screen.getByTestId("tracing-level-indicator");
    expect(tracingIndicator.dataset["level"]).toBe("1");
  });
});
