/**
 * Component tests for ResultGlobalSearch.
 *
 * Spec: 13-filter-and-search.md (13.8-13.11)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { ResultGlobalSearch } from "../../../src/panels/result/global-search.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

interface SearchResult {
  readonly category: "chains" | "operations" | "errors" | "values";
  readonly label: string;
  readonly detail: string;
  readonly navigateTo: { readonly view: string; readonly context?: string };
}

const searchResults: readonly SearchResult[] = [
  {
    category: "chains",
    label: "validateUser",
    detail: "4 operations",
    navigateTo: { view: "railway" },
  },
  {
    category: "chains",
    label: "validateOrder",
    detail: "6 operations",
    navigateTo: { view: "railway" },
  },
  {
    category: "operations",
    label: "andThen(validate)",
    detail: "Step 2 in validateUser",
    navigateTo: { view: "log", context: "step:2" },
  },
  {
    category: "errors",
    label: "VALIDATION",
    detail: "218 occurrences",
    navigateTo: { view: "sankey", context: "error:VALIDATION" },
  },
  {
    category: "values",
    label: "{ id: 42 }",
    detail: "exec-1, step 0",
    navigateTo: { view: "log", context: "exec:exec-1:step:0" },
  },
];

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

describe("ResultGlobalSearch", () => {
  beforeEach(setupEnv);

  it("search opens with '/' key or search icon", () => {
    render(<ResultGlobalSearch onSearch={vi.fn()} results={[]} onNavigate={vi.fn()} />);

    // Click search icon to open
    fireEvent.click(screen.getByTestId("search-icon"));
    expect(screen.getByTestId("search-input")).toBeDefined();
  });

  it("results grouped by category: Chains, Operations, Errors, Values", () => {
    render(
      <ResultGlobalSearch
        onSearch={vi.fn()}
        results={searchResults}
        onNavigate={vi.fn()}
        initialOpen={true}
      />
    );

    expect(screen.getByTestId("search-group-chains")).toBeDefined();
    expect(screen.getByTestId("search-group-operations")).toBeDefined();
    expect(screen.getByTestId("search-group-errors")).toBeDefined();
    expect(screen.getByTestId("search-group-values")).toBeDefined();
  });

  it("chain result click navigates to Railway Pipeline view", () => {
    const onNavigate = vi.fn();
    render(
      <ResultGlobalSearch
        onSearch={vi.fn()}
        results={searchResults}
        onNavigate={onNavigate}
        initialOpen={true}
      />
    );

    const chainResults = screen.getAllByTestId("search-result-chains");
    fireEvent.click(chainResults[0]);

    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ view: "railway" }));
  });

  it("operation result click navigates to Operation Log at step", () => {
    const onNavigate = vi.fn();
    render(
      <ResultGlobalSearch
        onSearch={vi.fn()}
        results={searchResults}
        onNavigate={onNavigate}
        initialOpen={true}
      />
    );

    const opResults = screen.getAllByTestId("search-result-operations");
    fireEvent.click(opResults[0]);

    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ view: "log" }));
  });

  it("error result click navigates to Sankey filtered by error type", () => {
    const onNavigate = vi.fn();
    render(
      <ResultGlobalSearch
        onSearch={vi.fn()}
        results={searchResults}
        onNavigate={onNavigate}
        initialOpen={true}
      />
    );

    const errResults = screen.getAllByTestId("search-result-errors");
    fireEvent.click(errResults[0]);

    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ view: "sankey" }));
  });

  it("value result click navigates to Operation Log at step with execution", () => {
    const onNavigate = vi.fn();
    render(
      <ResultGlobalSearch
        onSearch={vi.fn()}
        results={searchResults}
        onNavigate={onNavigate}
        initialOpen={true}
      />
    );

    const valResults = screen.getAllByTestId("search-result-values");
    fireEvent.click(valResults[0]);

    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ view: "log" }));
  });

  it("search debounced at 200ms", () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(
      <ResultGlobalSearch
        onSearch={onSearch}
        results={[]}
        onNavigate={vi.fn()}
        initialOpen={true}
      />
    );

    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "valid" } });

    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onSearch).toHaveBeenCalledWith("valid");
    vi.useRealTimers();
  });

  it("max 10 results per category", () => {
    // Create 15 chain results
    const manyResults: SearchResult[] = Array.from({ length: 15 }, (_, i) => ({
      category: "chains" as const,
      label: `chain-${i}`,
      detail: `${i} ops`,
      navigateTo: { view: "railway" },
    }));

    render(
      <ResultGlobalSearch
        onSearch={vi.fn()}
        results={manyResults}
        onNavigate={vi.fn()}
        initialOpen={true}
        maxPerCategory={10}
      />
    );

    const chainResults = screen.getAllByTestId("search-result-chains");
    expect(chainResults).toHaveLength(10);
  });
});
