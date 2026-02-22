/**
 * Component tests for cross-view navigation.
 *
 * Spec: 11-interactions.md (11.11)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CrossViewNavigation } from "../../../src/panels/result/cross-view-nav.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

interface NavContext {
  readonly chainId: string;
  readonly executionId?: string;
  readonly stepIndex?: number;
  readonly errorType?: string;
  readonly timeRange?: string;
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

describe("CrossViewNavigation", () => {
  beforeEach(setupEnv);

  it("'View in Log' from Railway preserves chain, execution, step", () => {
    const onNavigate = vi.fn();
    render(
      <CrossViewNavigation
        sourceView="railway"
        context={{ chainId: "c1", executionId: "e1", stepIndex: 2 }}
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("nav-view-in-log"));
    expect(onNavigate).toHaveBeenCalledWith(
      "log",
      expect.objectContaining({
        chainId: "c1",
        executionId: "e1",
        stepIndex: 2,
      })
    );
  });

  it("'View in Pipeline' from Log preserves chain, execution, step", () => {
    const onNavigate = vi.fn();
    render(
      <CrossViewNavigation
        sourceView="log"
        context={{ chainId: "c1", executionId: "e1", stepIndex: 3 }}
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("nav-view-in-pipeline"));
    expect(onNavigate).toHaveBeenCalledWith(
      "railway",
      expect.objectContaining({
        chainId: "c1",
        executionId: "e1",
        stepIndex: 3,
      })
    );
  });

  it("'View Cases' from Railway preserves chain", () => {
    const onNavigate = vi.fn();
    render(
      <CrossViewNavigation
        sourceView="railway"
        context={{ chainId: "c1" }}
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("nav-view-cases"));
    expect(onNavigate).toHaveBeenCalledWith("cases", expect.objectContaining({ chainId: "c1" }));
  });

  it("'View Waterfall' from Log preserves chain, execution", () => {
    const onNavigate = vi.fn();
    render(
      <CrossViewNavigation
        sourceView="log"
        context={{ chainId: "c1", executionId: "e1" }}
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("nav-view-waterfall"));
    expect(onNavigate).toHaveBeenCalledWith(
      "waterfall",
      expect.objectContaining({
        chainId: "c1",
        executionId: "e1",
      })
    );
  });

  it("Sankey hotspot click opens Railway focused on operation", () => {
    const onNavigate = vi.fn();
    render(
      <CrossViewNavigation
        sourceView="sankey"
        context={{ chainId: "c1", stepIndex: 2 }}
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("nav-view-in-pipeline"));
    expect(onNavigate).toHaveBeenCalledWith(
      "railway",
      expect.objectContaining({
        chainId: "c1",
        stepIndex: 2,
      })
    );
  });

  it("Overview top error click opens Log filtered to error type", () => {
    const onNavigate = vi.fn();
    render(
      <CrossViewNavigation
        sourceView="overview"
        context={{ chainId: "c1", errorType: "TIMEOUT" }}
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("nav-view-in-log"));
    expect(onNavigate).toHaveBeenCalledWith(
      "log",
      expect.objectContaining({
        errorType: "TIMEOUT",
      })
    );
  });

  it("Overview stability dip click opens Sankey with time range", () => {
    const onNavigate = vi.fn();
    render(
      <CrossViewNavigation
        sourceView="overview"
        context={{ chainId: "c1", timeRange: "1h" }}
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("nav-view-sankey"));
    expect(onNavigate).toHaveBeenCalledWith(
      "sankey",
      expect.objectContaining({
        timeRange: "1h",
      })
    );
  });
});
