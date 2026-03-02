/**
 * Unit tests for GuardFilterSystem component.
 *
 * Spec: 13-filter-and-search.md (13.1-13.7)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GuardFilterSystem } from "../../../src/panels/guard/filter-system.js";
import type { GuardFilterState } from "../../../src/panels/guard/types.js";

function makeFilter(overrides?: Partial<GuardFilterState>): GuardFilterState {
  return {
    portSearch: "",
    subjectId: undefined,
    roleName: undefined,
    decision: "all",
    policyKind: undefined,
    timeRange: "all",
    ...overrides,
  };
}

describe("GuardFilterSystem", () => {
  afterEach(cleanup);

  it("renders filter system", () => {
    render(<GuardFilterSystem filter={makeFilter()} onChange={vi.fn()} />);

    expect(screen.getByTestId("guard-filter-system")).toBeDefined();
  });

  it("has port search input", () => {
    render(<GuardFilterSystem filter={makeFilter()} onChange={vi.fn()} />);

    expect(screen.getByTestId("guard-filter-port-search")).toBeDefined();
  });

  it("has subject ID input", () => {
    render(<GuardFilterSystem filter={makeFilter()} onChange={vi.fn()} />);

    expect(screen.getByTestId("guard-filter-subject")).toBeDefined();
  });

  it("has decision selector", () => {
    render(<GuardFilterSystem filter={makeFilter()} onChange={vi.fn()} />);

    expect(screen.getByTestId("guard-filter-decision")).toBeDefined();
  });

  it("has policy kind selector", () => {
    render(<GuardFilterSystem filter={makeFilter()} onChange={vi.fn()} />);

    expect(screen.getByTestId("guard-filter-policy-kind")).toBeDefined();
  });

  it("has time range selector", () => {
    render(<GuardFilterSystem filter={makeFilter()} onChange={vi.fn()} />);

    expect(screen.getByTestId("guard-filter-time-range")).toBeDefined();
  });

  it("shows active filter count", () => {
    const filter = makeFilter({ subjectId: "user-1" });
    render(<GuardFilterSystem filter={filter} onChange={vi.fn()} />);

    const count = screen.getByTestId("guard-filter-active-count");
    expect(count.textContent).toBe("1");
  });

  it("clears all filters on clear click", () => {
    const onChange = vi.fn();
    const filter = makeFilter({ subjectId: "user-1", decision: "deny" });
    render(<GuardFilterSystem filter={filter} onChange={onChange} />);

    fireEvent.click(screen.getByTestId("guard-filter-clear-all"));

    expect(onChange).toHaveBeenCalledWith({
      portSearch: "",
      subjectId: undefined,
      roleName: undefined,
      decision: "all",
      policyKind: undefined,
      timeRange: "all",
    });
  });

  it("updates subject filter on input", () => {
    const onChange = vi.fn();
    render(<GuardFilterSystem filter={makeFilter()} onChange={onChange} />);

    const subjectInput = screen.getByTestId("guard-filter-subject");
    fireEvent.change(subjectInput, { target: { value: "user-42" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ subjectId: "user-42" }));
  });

  it("updates decision filter on select", () => {
    const onChange = vi.fn();
    render(<GuardFilterSystem filter={makeFilter()} onChange={onChange} />);

    const decisionSelect = screen.getByTestId("guard-filter-decision");
    fireEvent.change(decisionSelect, { target: { value: "deny" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ decision: "deny" }));
  });
});
