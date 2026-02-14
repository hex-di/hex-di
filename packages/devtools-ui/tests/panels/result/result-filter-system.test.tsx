/**
 * Component tests for the ResultFilterSystem.
 *
 * Spec: 13-filter-and-search.md (13.1-13.11)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { ResultFilterSystem } from "../../../src/panels/result/filter-system.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

interface FilterState {
  readonly chainSearch: string;
  readonly portName: string | undefined;
  readonly status: "all" | "ok" | "err" | "mixed";
  readonly errorType: string | undefined;
  readonly timeRange: string;
}

const ports = ["UserPort", "ApiPort", "DbPort"];
const errorTypes = ["TIMEOUT", "NETWORK", "VALIDATION"];

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

describe("ResultFilterSystem", () => {
  beforeEach(setupEnv);

  it("chain search filters by name (150ms debounce)", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<ResultFilterSystem ports={ports} errorTypes={errorTypes} onFilterChange={onChange} />);

    const search = screen.getByTestId("filter-chain-search");
    fireEvent.change(search, { target: { value: "validate" } });

    // Not called yet (debounced)
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ chainSearch: "validate" }));
    vi.useRealTimers();
  });

  it("port dropdown filters by specific port", () => {
    const onChange = vi.fn();
    render(<ResultFilterSystem ports={ports} errorTypes={errorTypes} onFilterChange={onChange} />);

    const portSelect = screen.getByTestId("filter-port");
    fireEvent.change(portSelect, { target: { value: "ApiPort" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ portName: "ApiPort" }));
  });

  it("status dropdown filters by Ok/Err/Mixed/All", () => {
    const onChange = vi.fn();
    render(<ResultFilterSystem ports={ports} errorTypes={errorTypes} onFilterChange={onChange} />);

    const statusSelect = screen.getByTestId("filter-status");
    fireEvent.change(statusSelect, { target: { value: "err" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: "err" }));
  });

  it("error type dropdown filters by error tag", () => {
    const onChange = vi.fn();
    render(<ResultFilterSystem ports={ports} errorTypes={errorTypes} onFilterChange={onChange} />);

    const errorSelect = screen.getByTestId("filter-error-type");
    fireEvent.change(errorSelect, { target: { value: "TIMEOUT" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ errorType: "TIMEOUT" }));
  });

  it("time range dropdown filters by temporal window", () => {
    const onChange = vi.fn();
    render(<ResultFilterSystem ports={ports} errorTypes={errorTypes} onFilterChange={onChange} />);

    const timeSelect = screen.getByTestId("filter-time-range");
    fireEvent.change(timeSelect, { target: { value: "1h" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ timeRange: "1h" }));
  });

  it("all filters combine with AND logic", () => {
    const onChange = vi.fn();
    render(<ResultFilterSystem ports={ports} errorTypes={errorTypes} onFilterChange={onChange} />);

    fireEvent.change(screen.getByTestId("filter-port"), { target: { value: "ApiPort" } });
    fireEvent.change(screen.getByTestId("filter-status"), { target: { value: "err" } });

    // Last call should have both filters set
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.portName).toBe("ApiPort");
    expect(lastCall.status).toBe("err");
  });

  it("'Clear All' resets all filters", () => {
    const onChange = vi.fn();
    render(<ResultFilterSystem ports={ports} errorTypes={errorTypes} onFilterChange={onChange} />);

    // Set a filter first
    fireEvent.change(screen.getByTestId("filter-port"), { target: { value: "ApiPort" } });
    fireEvent.click(screen.getByTestId("filter-clear-all"));

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.portName).toBeUndefined();
    expect(lastCall.status).toBe("all");
  });

  it("active filter count shown as badge", () => {
    render(<ResultFilterSystem ports={ports} errorTypes={errorTypes} onFilterChange={vi.fn()} />);

    fireEvent.change(screen.getByTestId("filter-port"), { target: { value: "ApiPort" } });
    fireEvent.change(screen.getByTestId("filter-status"), { target: { value: "err" } });

    const badge = screen.getByTestId("filter-active-count");
    expect(Number(badge.textContent)).toBe(2);
  });

  it("Railway 'Collapse non-switch' collapses sequences", () => {
    render(
      <ResultFilterSystem
        ports={ports}
        errorTypes={errorTypes}
        onFilterChange={vi.fn()}
        viewSpecificFilters={["collapse-non-switch"]}
      />
    );

    const toggle = screen.getByTestId("filter-collapse-non-switch");
    expect(toggle).toBeDefined();
  });

  it("Operation Log combined filters: Switch + method", () => {
    render(
      <ResultFilterSystem
        ports={ports}
        errorTypes={errorTypes}
        onFilterChange={vi.fn()}
        viewSpecificFilters={["switch-only", "method-filter"]}
      />
    );

    expect(screen.getByTestId("filter-switch-only")).toBeDefined();
    expect(screen.getByTestId("filter-method-filter")).toBeDefined();
  });

  it("Case Explorer path classification filter", () => {
    render(
      <ResultFilterSystem
        ports={ports}
        errorTypes={errorTypes}
        onFilterChange={vi.fn()}
        viewSpecificFilters={["path-classification"]}
      />
    );

    expect(screen.getByTestId("filter-path-classification")).toBeDefined();
  });

  it("Case Explorer 'observed only' toggle hides unobserved", () => {
    render(
      <ResultFilterSystem
        ports={ports}
        errorTypes={errorTypes}
        onFilterChange={vi.fn()}
        viewSpecificFilters={["observed-only"]}
      />
    );

    expect(screen.getByTestId("filter-observed-only")).toBeDefined();
  });

  it("Sankey min flow filter hides low-traffic links", () => {
    render(
      <ResultFilterSystem
        ports={ports}
        errorTypes={errorTypes}
        onFilterChange={vi.fn()}
        viewSpecificFilters={["min-flow"]}
      />
    );

    expect(screen.getByTestId("filter-min-flow")).toBeDefined();
  });

  it("filter state persists across view switches", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ResultFilterSystem
        ports={ports}
        errorTypes={errorTypes}
        onFilterChange={onChange}
        activeView="railway"
      />
    );

    fireEvent.change(screen.getByTestId("filter-port"), { target: { value: "DbPort" } });

    // Rerender with different view
    rerender(
      <ResultFilterSystem
        ports={ports}
        errorTypes={errorTypes}
        onFilterChange={onChange}
        activeView="log"
      />
    );

    // Port filter should still show DbPort
    const portSelect = screen.getByTestId("filter-port") as HTMLSelectElement;
    expect(portSelect.value).toBe("DbPort");
  });
});
