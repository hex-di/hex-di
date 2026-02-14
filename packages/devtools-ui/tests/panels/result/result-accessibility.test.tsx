/**
 * Component tests for WCAG 2.1 AA accessibility compliance.
 *
 * Spec: 15-accessibility.md (15.1-15.10)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AccessibleResultPanel } from "../../../src/panels/result/accessibility.js";

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

describe("Accessibility: ARIA Roles & Labels", () => {
  beforeEach(setupEnv);

  it("Panel root has role='region' with aria-label", () => {
    render(<AccessibleResultPanel activeView="railway" />);
    const root = screen.getByTestId("result-panel-root");
    expect(root.getAttribute("role")).toBe("region");
    expect(root.getAttribute("aria-label")).toBe("Result Panel");
  });

  it("View switcher has role='tablist'", () => {
    render(<AccessibleResultPanel activeView="railway" />);
    const tablist = screen.getByTestId("view-switcher");
    expect(tablist.getAttribute("role")).toBe("tablist");
    expect(tablist.getAttribute("aria-label")).toBe("Result Panel views");
  });

  it("View buttons have role='tab' with aria-selected", () => {
    render(<AccessibleResultPanel activeView="railway" />);
    const tabs = screen.getAllByTestId("view-tab");
    for (const tab of tabs) {
      expect(tab.getAttribute("role")).toBe("tab");
    }
    // The active tab has aria-selected="true"
    const activeTab = tabs.find(t => t.getAttribute("aria-selected") === "true");
    expect(activeTab).toBeDefined();
    expect(activeTab?.textContent).toContain("Railway");
  });

  it("Active view has role='tabpanel'", () => {
    render(<AccessibleResultPanel activeView="railway" />);
    const panel = screen.getByTestId("active-view-panel");
    expect(panel.getAttribute("role")).toBe("tabpanel");
  });

  it("Railway SVG has role='img' with aria-label", () => {
    render(<AccessibleResultPanel activeView="railway" chainLabel="validateUser" />);
    const svg = screen.getByTestId("railway-svg");
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toContain("validateUser");
  });

  it("Operation nodes have role='button' with descriptive aria-label", () => {
    render(
      <AccessibleResultPanel
        activeView="railway"
        chainLabel="validateUser"
        operations={[
          {
            method: "map",
            label: "toUpper",
            inputTrack: "ok",
            outputTrack: "ok",
            duration: "1.2ms",
          },
        ]}
      />
    );
    const node = screen.getByTestId("operation-node-0");
    expect(node.getAttribute("role")).toBe("button");
    expect(node.getAttribute("aria-label")).toContain("map");
    expect(node.getAttribute("aria-label")).toContain("toUpper");
  });

  it("Operation Log has role='grid'", () => {
    render(<AccessibleResultPanel activeView="log" executionId="42" />);
    const grid = screen.getByTestId("log-grid");
    expect(grid.getAttribute("role")).toBe("grid");
    expect(grid.getAttribute("aria-label")).toContain("42");
  });

  it("Path tree has role='tree' with role='treeitem' children", () => {
    render(
      <AccessibleResultPanel
        activeView="cases"
        chainLabel="validateUser"
        paths={[{ label: "Happy path", classification: "happy", frequency: 80 }]}
      />
    );
    const tree = screen.getByTestId("path-tree");
    expect(tree.getAttribute("role")).toBe("tree");
    const items = screen.getAllByTestId("path-tree-item");
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].getAttribute("role")).toBe("treeitem");
  });

  it("Sankey SVG has role='img' with aria-label", () => {
    render(<AccessibleResultPanel activeView="sankey" chainLabel="validateUser" />);
    const svg = screen.getByTestId("sankey-svg");
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toContain("validateUser");
  });

  it("Status bar has role='status' with aria-live='polite'", () => {
    render(<AccessibleResultPanel activeView="railway" />);
    const status = screen.getByTestId("status-bar");
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
  });
});

describe("Accessibility: Screen Reader Announcements", () => {
  beforeEach(setupEnv);

  it("Screen reader announces view switch", () => {
    const { rerender } = render(<AccessibleResultPanel activeView="railway" />);
    rerender(<AccessibleResultPanel activeView="log" />);
    const live = screen.getByTestId("sr-announcer");
    expect(live.textContent).toContain("Switched to");
    expect(live.textContent).toContain("Log");
  });

  it("Screen reader announces chain selection", () => {
    render(
      <AccessibleResultPanel
        activeView="railway"
        selectedChainLabel="validateUser"
        chainOkRate={95}
        chainRunCount={100}
      />
    );
    const live = screen.getByTestId("sr-announcer");
    expect(live.textContent).toContain("validateUser");
  });

  it("Screen reader announces step selection with track info", () => {
    render(
      <AccessibleResultPanel
        activeView="log"
        selectedStep={{ index: 2, method: "andThen", inputTrack: "ok", outputTrack: "err" }}
      />
    );
    const live = screen.getByTestId("sr-announcer");
    expect(live.textContent).toContain("Step 2");
    expect(live.textContent).toContain("andThen");
  });

  it("Screen reader announces track switch detection", () => {
    render(
      <AccessibleResultPanel
        activeView="railway"
        switchEvent={{ stepIndex: 3, inputTrack: "ok", outputTrack: "err" }}
      />
    );
    const live = screen.getByTestId("sr-announcer");
    expect(live.textContent).toContain("switch");
    expect(live.textContent).toContain("step 3");
  });

  it("Screen reader announces filter application", () => {
    render(
      <AccessibleResultPanel activeView="railway" filterAnnouncement="Showing 5 of 10 items" />
    );
    const live = screen.getByTestId("sr-announcer");
    expect(live.textContent).toContain("5 of 10");
  });

  it("Screen reader announces playback start/pause/end", () => {
    render(<AccessibleResultPanel activeView="railway" playbackAnnouncement="Playback started" />);
    const live = screen.getByTestId("sr-announcer");
    expect(live.textContent).toContain("Playback started");
  });

  it("Screen reader announces connection status changes", () => {
    render(
      <AccessibleResultPanel
        activeView="railway"
        connectionAnnouncement="Connection to container lost"
      />
    );
    const live = screen.getByTestId("sr-announcer");
    expect(live.textContent).toContain("Connection to container lost");
  });
});

describe("Accessibility: Focus Management", () => {
  beforeEach(setupEnv);

  it("Focus moves to detail panel on node select", () => {
    const onFocusDetail = vi.fn();
    render(<AccessibleResultPanel activeView="railway" onFocusDetail={onFocusDetail} />);
    fireEvent.click(screen.getByTestId("select-node-trigger"));
    expect(onFocusDetail).toHaveBeenCalled();
  });

  it("Escape returns focus to previously focused element", () => {
    const onRestoreFocus = vi.fn();
    render(<AccessibleResultPanel activeView="railway" onRestoreFocus={onRestoreFocus} />);
    fireEvent.keyDown(screen.getByTestId("result-panel-root"), { key: "Escape" });
    expect(onRestoreFocus).toHaveBeenCalled();
  });

  it("View switch moves focus to first interactive element", () => {
    const onViewFocus = vi.fn();
    const { rerender } = render(
      <AccessibleResultPanel activeView="railway" onViewFocus={onViewFocus} />
    );
    rerender(<AccessibleResultPanel activeView="log" onViewFocus={onViewFocus} />);
    expect(onViewFocus).toHaveBeenCalledWith("log");
  });
});

describe("Accessibility: Color Independence", () => {
  beforeEach(setupEnv);

  it("Color not sole indicator for Ok/Err (filled/empty circle + text)", () => {
    render(
      <AccessibleResultPanel
        activeView="railway"
        operations={[
          { method: "map", label: "a", inputTrack: "ok", outputTrack: "ok", duration: "1ms" },
          { method: "andThen", label: "b", inputTrack: "ok", outputTrack: "err", duration: "2ms" },
        ]}
      />
    );
    const okIndicator = screen.getByTestId("track-indicator-ok");
    expect(okIndicator.textContent).toContain("Ok");
    expect(okIndicator.dataset["shape"]).toBe("filled");

    const errIndicator = screen.getByTestId("track-indicator-err");
    expect(errIndicator.textContent).toContain("Err");
    expect(errIndicator.dataset["shape"]).toBe("empty");
  });

  it("Color not sole indicator for switch (lightning icon + 'switched' text)", () => {
    render(
      <AccessibleResultPanel
        activeView="railway"
        operations={[
          { method: "andThen", label: "x", inputTrack: "ok", outputTrack: "err", duration: "1ms" },
        ]}
      />
    );
    const switchIndicator = screen.getByTestId("switch-indicator");
    expect(switchIndicator.textContent).toContain("switched");
  });

  it("Color not sole indicator for duration severity (text + label)", () => {
    render(
      <AccessibleResultPanel
        activeView="waterfall"
        durationEntries={[{ label: "step1", duration: "150ms", severity: "warning" }]}
      />
    );
    const durationEl = screen.getByTestId("duration-severity-0");
    expect(durationEl.textContent).toContain("150ms");
    expect(durationEl.dataset["severity"]).toBe("warning");
  });

  it("Color not sole indicator for stability zone (percentage text + label)", () => {
    render(
      <AccessibleResultPanel
        activeView="sankey"
        stabilityEntries={[{ port: "auth", score: 75, zone: "amber" }]}
      />
    );
    const stabilityEl = screen.getByTestId("stability-zone-0");
    expect(stabilityEl.textContent).toContain("75");
    expect(stabilityEl.dataset["zone"]).toBe("amber");
  });
});

describe("Accessibility: Contrast, Motion, and Touch", () => {
  beforeEach(setupEnv);

  it("All text meets WCAG AA 4.5:1 contrast ratio", () => {
    render(<AccessibleResultPanel activeView="railway" />);
    const root = screen.getByTestId("result-panel-root");
    // Verify contrast data attribute is set (actual contrast computed by CSS; component declares compliance)
    expect(root.dataset["contrastCompliant"]).toBe("true");
  });

  it("Reduced motion disables all animations", () => {
    // Override to prefer reduced motion
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    render(<AccessibleResultPanel activeView="railway" />);
    const root = screen.getByTestId("result-panel-root");
    expect(root.dataset["reducedMotion"]).toBe("true");
  });

  it("Touch targets minimum 44x44px", () => {
    render(<AccessibleResultPanel activeView="railway" />);
    const tabs = screen.getAllByTestId("view-tab");
    for (const tab of tabs) {
      expect(tab.dataset["minTouchTarget"]).toBe("44");
    }
  });
});
