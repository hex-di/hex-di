/**
 * Unit tests for GuardEducationalSidebar component.
 *
 * Spec: 12-educational-features.md (12.1-12.9)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GuardEducationalSidebar } from "../../../src/panels/guard/educational-sidebar.js";

describe("GuardEducationalSidebar", () => {
  afterEach(cleanup);

  it("renders closed sidebar", () => {
    render(<GuardEducationalSidebar isOpen={false} onClose={vi.fn()} />);

    const sidebar = screen.getByTestId("guard-educational-sidebar");
    expect(sidebar.getAttribute("data-open")).toBe("false");
  });

  it("renders open sidebar", () => {
    render(<GuardEducationalSidebar isOpen={true} onClose={vi.fn()} />);

    const sidebar = screen.getByTestId("guard-educational-sidebar");
    expect(sidebar.getAttribute("data-open")).toBe("true");
  });

  it("shows glossary tab by default", () => {
    render(<GuardEducationalSidebar isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId("guard-glossary-tab")).toBeDefined();
  });

  it("shows glossary entries", () => {
    render(<GuardEducationalSidebar isOpen={true} onClose={vi.fn()} />);

    const entries = screen.getAllByTestId("guard-glossary-entry");
    expect(entries.length).toBeGreaterThan(1);
  });

  it("filters glossary on search", () => {
    render(<GuardEducationalSidebar isOpen={true} onClose={vi.fn()} />);

    const allEntries = screen.getAllByTestId("guard-glossary-entry");
    const totalCount = allEntries.length;

    const searchInput = screen.getByTestId("guard-glossary-search");
    fireEvent.change(searchInput, { target: { value: "allOf" } });

    const filteredEntries = screen.getAllByTestId("guard-glossary-entry");
    expect(filteredEntries.length).toBeLessThan(totalCount);
    expect(filteredEntries.length).toBeGreaterThan(0);
  });

  it("switches to walkthrough tab", () => {
    render(<GuardEducationalSidebar isOpen={true} onClose={vi.fn()} />);

    const walkthroughTab = screen.getByTestId("guard-sidebar-tab-walkthrough");
    fireEvent.click(walkthroughTab);

    expect(screen.getByTestId("guard-walkthrough-list")).toBeDefined();
  });

  it("starts walkthrough", () => {
    render(<GuardEducationalSidebar isOpen={true} onClose={vi.fn()} />);

    const walkthroughTab = screen.getByTestId("guard-sidebar-tab-walkthrough");
    fireEvent.click(walkthroughTab);

    const startButtons = screen.getAllByTestId("guard-walkthrough-start");
    fireEvent.click(startButtons[0]);

    expect(screen.getByTestId("guard-walkthrough-active")).toBeDefined();
  });

  it("navigates walkthrough steps", () => {
    render(<GuardEducationalSidebar isOpen={true} onClose={vi.fn()} />);

    // Switch to walkthrough tab
    fireEvent.click(screen.getByTestId("guard-sidebar-tab-walkthrough"));

    // Start a walkthrough
    const startButtons = screen.getAllByTestId("guard-walkthrough-start");
    fireEvent.click(startButtons[0]);

    const progressBefore = screen.getByTestId("guard-walkthrough-progress").textContent;

    // Click next
    fireEvent.click(screen.getByTestId("guard-walkthrough-next"));

    const progressAfter = screen.getByTestId("guard-walkthrough-progress").textContent;
    expect(progressAfter).not.toBe(progressBefore);
  });

  it("exits walkthrough", () => {
    render(<GuardEducationalSidebar isOpen={true} onClose={vi.fn()} />);

    // Switch to walkthrough tab and start a walkthrough
    fireEvent.click(screen.getByTestId("guard-sidebar-tab-walkthrough"));
    const startButtons = screen.getAllByTestId("guard-walkthrough-start");
    fireEvent.click(startButtons[0]);

    expect(screen.getByTestId("guard-walkthrough-active")).toBeDefined();

    // Click exit
    fireEvent.click(screen.getByTestId("guard-walkthrough-exit"));

    // Should be back to the walkthrough list
    expect(screen.getByTestId("guard-walkthrough-list")).toBeDefined();
    expect(screen.queryByTestId("guard-walkthrough-active")).toBeNull();
  });

  it("calls onClose on close button click", () => {
    const onClose = vi.fn();
    render(<GuardEducationalSidebar isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByTestId("guard-sidebar-close"));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
