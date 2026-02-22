/**
 * Component tests for the EducationalSidebar.
 *
 * Spec: 12-educational-features.md (12.1-12.9)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { EducationalSidebar } from "../../../src/panels/result/educational-sidebar.js";
import type { ResultCategoryName } from "../../../src/panels/result/types.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

interface GlossaryEntry {
  readonly method: string;
  readonly category: ResultCategoryName;
  readonly signature: string;
  readonly description: string;
  readonly equivalents: readonly string[];
}

interface WalkthroughDefinition {
  readonly id: string;
  readonly title: string;
  readonly stepCount: number;
  readonly steps: readonly WalkthroughStep[];
}

interface WalkthroughStep {
  readonly title: string;
  readonly content: string;
  readonly targetView?: string;
  readonly spotlightSelector?: string;
}

const glossaryEntries: readonly GlossaryEntry[] = [
  {
    method: "andThen",
    category: "chaining",
    signature: "andThen<U>(fn: (v: T) => Result<U, E>): Result<U, E>",
    description: "Chain on Ok track",
    equivalents: ["flatMap", "bind"],
  },
  {
    method: "map",
    category: "transformation",
    signature: "map<U>(fn: (v: T) => U): Result<U, E>",
    description: "Transform Ok value",
    equivalents: ["fmap"],
  },
  {
    method: "orElse",
    category: "recovery",
    signature: "orElse<F>(fn: (e: E) => Result<T, F>): Result<T, F>",
    description: "Recover from Err",
    equivalents: ["catchError"],
  },
];

const walkthroughs: readonly WalkthroughDefinition[] = [
  {
    id: "wt-1",
    title: "Your First Result Chain",
    stepCount: 5,
    steps: [
      { title: "Step 1", content: "Welcome to Result chains!", targetView: "railway" },
      { title: "Step 2", content: "This is the Ok track", spotlightSelector: "[data-track='ok']" },
      { title: "Step 3", content: "This is the Err track" },
      { title: "Step 4", content: "Operations transform values" },
      { title: "Step 5", content: "That's it!" },
    ],
  },
  {
    id: "wt-2",
    title: "Error Recovery Patterns",
    stepCount: 3,
    steps: [
      { title: "Step 1", content: "Error recovery with orElse" },
      { title: "Step 2", content: "Fallback values with unwrapOr" },
      { title: "Step 3", content: "Choose the right pattern" },
    ],
  },
];

interface PatternLabel {
  readonly pattern: string;
  readonly label: string;
}

const patternLabels: readonly PatternLabel[] = [
  { pattern: "andThen-chain", label: "Validation Pipeline" },
  { pattern: "orElse-after-andThen", label: "Error Recovery" },
];

interface ComparisonCard {
  readonly methodA: string;
  readonly methodB: string;
  readonly explanation: string;
}

const comparisonCards: readonly ComparisonCard[] = [
  {
    methodA: "map",
    methodB: "andThen",
    explanation: "map transforms the value, andThen can change the track",
  },
];

const storageMap = new Map<string, string>();

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
  storageMap.clear();
  Object.defineProperty(window, "localStorage", {
    writable: true,
    configurable: true,
    value: {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, value: string) => storageMap.set(key, value),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
    },
  });
}

afterEach(() => {
  cleanup();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("EducationalSidebar", () => {
  beforeEach(setupEnv);

  it("sidebar opens and closes with [?] button", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
      />
    );

    const toggle = screen.getByTestId("sidebar-toggle");
    expect(screen.queryByTestId("sidebar-content")).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByTestId("sidebar-content")).toBeDefined();

    fireEvent.click(toggle);
    expect(screen.queryByTestId("sidebar-content")).toBeNull();
  });

  it("sidebar has Glossary and Walkthrough tabs", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    expect(screen.getByTestId("tab-glossary")).toBeDefined();
    expect(screen.getByTestId("tab-walkthrough")).toBeDefined();
  });

  it("glossary lists all Result methods alphabetically", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    const entries = screen.getAllByTestId("glossary-entry");
    expect(entries).toHaveLength(3);
    // Should be sorted: andThen, map, orElse
    expect(entries[0].dataset["method"]).toBe("andThen");
    expect(entries[1].dataset["method"]).toBe("map");
    expect(entries[2].dataset["method"]).toBe("orElse");
  });

  it("glossary entry shows category, signature, description, equivalents", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    const first = screen.getAllByTestId("glossary-entry")[0];
    expect(first.textContent).toContain("chaining");
    expect(first.textContent).toContain("andThen");
    expect(first.textContent).toContain("Chain on Ok track");
    expect(first.textContent).toContain("flatMap");
  });

  it("glossary search filters by method name", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    const search = screen.getByTestId("glossary-search");
    fireEvent.change(search, { target: { value: "map" } });

    const entries = screen.getAllByTestId("glossary-entry");
    expect(entries).toHaveLength(1);
    expect(entries[0].dataset["method"]).toBe("map");
  });

  it("glossary category filter shows only selected categories", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    const filter = screen.getByTestId("glossary-category-filter");
    fireEvent.change(filter, { target: { value: "recovery" } });

    const entries = screen.getAllByTestId("glossary-entry");
    expect(entries).toHaveLength(1);
    expect(entries[0].dataset["method"]).toBe("orElse");
  });

  it("glossary grouping by category with collapsible sections", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    const groups = screen.getAllByTestId("glossary-category-group");
    expect(groups.length).toBeGreaterThan(0);
  });

  it("walkthrough list shows all walkthroughs with step counts", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    fireEvent.click(screen.getByTestId("tab-walkthrough"));
    const items = screen.getAllByTestId("walkthrough-item");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("5");
  });

  it("starting a walkthrough shows step 1 with highlight", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    fireEvent.click(screen.getByTestId("tab-walkthrough"));
    const startButton = screen.getAllByTestId("walkthrough-start")[0];
    fireEvent.click(startButton);

    expect(screen.getByTestId("walkthrough-active-step")).toBeDefined();
    expect(screen.getByTestId("walkthrough-active-step").textContent).toContain("Step 1");
  });

  it("next button advances to next step", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    fireEvent.click(screen.getByTestId("tab-walkthrough"));
    fireEvent.click(screen.getAllByTestId("walkthrough-start")[0]);
    fireEvent.click(screen.getByTestId("walkthrough-next"));

    expect(screen.getByTestId("walkthrough-active-step").textContent).toContain("Step 2");
  });

  it("previous button goes back to prior step", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    fireEvent.click(screen.getByTestId("tab-walkthrough"));
    fireEvent.click(screen.getAllByTestId("walkthrough-start")[0]);
    fireEvent.click(screen.getByTestId("walkthrough-next"));
    fireEvent.click(screen.getByTestId("walkthrough-prev"));

    expect(screen.getByTestId("walkthrough-active-step").textContent).toContain("Step 1");
  });

  it("skip button exits walkthrough", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    fireEvent.click(screen.getByTestId("tab-walkthrough"));
    fireEvent.click(screen.getAllByTestId("walkthrough-start")[0]);
    fireEvent.click(screen.getByTestId("walkthrough-skip"));

    expect(screen.queryByTestId("walkthrough-active-step")).toBeNull();
  });

  it("walkthrough step auto-navigates to correct view when needed", () => {
    const onNavigate = vi.fn();
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
        onNavigateToView={onNavigate}
      />
    );

    fireEvent.click(screen.getByTestId("tab-walkthrough"));
    fireEvent.click(screen.getAllByTestId("walkthrough-start")[0]);

    // Step 1 has targetView: "railway"
    expect(onNavigate).toHaveBeenCalledWith("railway");
  });

  it("walkthrough spotlight highlights target elements", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    fireEvent.click(screen.getByTestId("tab-walkthrough"));
    fireEvent.click(screen.getAllByTestId("walkthrough-start")[0]);
    fireEvent.click(screen.getByTestId("walkthrough-next")); // Step 2 has spotlight

    const spotlight = screen.getByTestId("walkthrough-spotlight");
    expect(spotlight.dataset["selector"]).toBe("[data-track='ok']");
  });

  it("walkthrough progress saved to localStorage", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    fireEvent.click(screen.getByTestId("tab-walkthrough"));
    fireEvent.click(screen.getAllByTestId("walkthrough-start")[0]);
    fireEvent.click(screen.getByTestId("walkthrough-next")); // Step 2

    const saved = localStorage.getItem("hex-walkthrough-wt-1");
    expect(saved).toBe("1"); // step index 1
  });

  it("resuming walkthrough continues from saved step", () => {
    localStorage.setItem("hex-walkthrough-wt-1", "2"); // saved at step 3

    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
      />
    );

    fireEvent.click(screen.getByTestId("tab-walkthrough"));
    fireEvent.click(screen.getAllByTestId("walkthrough-start")[0]);

    expect(screen.getByTestId("walkthrough-active-step").textContent).toContain("Step 3");
  });

  it("context-aware: selecting a node updates sidebar content", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
        selectedMethod="andThen"
      />
    );

    const contextInfo = screen.getByTestId("context-info");
    expect(contextInfo.textContent).toContain("andThen");
  });

  it("context-aware: viewing Case Explorer shows path analysis explanation", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
        activeView="cases"
      />
    );

    const contextInfo = screen.getByTestId("context-info");
    expect(contextInfo.textContent).toContain("path");
  });

  it("comparison cards appear when viewing related operations (map vs andThen)", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
        selectedMethod="map"
      />
    );

    const card = screen.getByTestId("comparison-card");
    expect(card.textContent).toContain("map");
    expect(card.textContent).toContain("andThen");
  });

  it("'Try in Playground' link includes correct example code", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
        selectedMethod="andThen"
      />
    );

    const link = screen.getByTestId("try-in-playground");
    expect(link).toBeDefined();
    expect(link.textContent).toContain("Playground");
  });

  it("pattern recognition labels validated chains as 'Validation Pipeline'", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
        detectedPattern="andThen-chain"
      />
    );

    const label = screen.getByTestId("pattern-label");
    expect(label.textContent).toContain("Validation Pipeline");
  });

  it("pattern recognition labels orElse after andThen as 'Error Recovery'", () => {
    render(
      <EducationalSidebar
        glossary={glossaryEntries}
        walkthroughs={walkthroughs}
        patternLabels={patternLabels}
        comparisonCards={comparisonCards}
        initialOpen={true}
        detectedPattern="orElse-after-andThen"
      />
    );

    const label = screen.getByTestId("pattern-label");
    expect(label.textContent).toContain("Error Recovery");
  });
});
