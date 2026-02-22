/**
 * TabBar component tests.
 *
 * Covers spec Section 44.8 items 9-10:
 * 9. Tab bar shows open files as tabs
 * 10. Close button removes file from open tabs
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { TabBar } from "../../src/editor/tab-bar.js";

describe("TabBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows open files as tabs", () => {
    const openFiles = ["main.ts", "utils.ts", "ports/logger.ts"];

    const { getByTestId } = render(
      <TabBar
        openFiles={openFiles}
        activeFile="main.ts"
        modifiedFiles={new Set()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(getByTestId("tab-bar")).toBeDefined();
    expect(getByTestId("tab-main.ts")).toBeDefined();
    expect(getByTestId("tab-utils.ts")).toBeDefined();
    expect(getByTestId("tab-ports/logger.ts")).toBeDefined();
  });

  it("close button calls onClose with file path", () => {
    const onClose = vi.fn();
    const openFiles = ["main.ts", "utils.ts"];

    const { getByTestId } = render(
      <TabBar
        openFiles={openFiles}
        activeFile="main.ts"
        modifiedFiles={new Set()}
        onSelect={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(getByTestId("tab-close-utils.ts"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith("utils.ts");
  });

  it("highlights the active tab", () => {
    const openFiles = ["main.ts", "utils.ts"];

    const { getByTestId } = render(
      <TabBar
        openFiles={openFiles}
        activeFile="utils.ts"
        modifiedFiles={new Set()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(getByTestId("tab-utils.ts").getAttribute("aria-selected")).toBe("true");
    expect(getByTestId("tab-main.ts").getAttribute("aria-selected")).toBe("false");
  });

  it("shows modified indicator for modified files", () => {
    const openFiles = ["main.ts", "utils.ts"];
    const modifiedFiles = new Set(["main.ts"]);

    const { getByTestId, queryByTestId } = render(
      <TabBar
        openFiles={openFiles}
        activeFile="main.ts"
        modifiedFiles={modifiedFiles}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // main.ts should have modified indicator
    expect(getByTestId("tab-modified-main.ts")).toBeDefined();

    // utils.ts should not have modified indicator
    expect(queryByTestId("tab-modified-utils.ts")).toBeNull();
  });

  it("calls onSelect when a tab is clicked", () => {
    const onSelect = vi.fn();
    const openFiles = ["main.ts", "utils.ts"];

    const { getByTestId } = render(
      <TabBar
        openFiles={openFiles}
        activeFile="main.ts"
        modifiedFiles={new Set()}
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(getByTestId("tab-utils.ts"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("utils.ts");
  });

  it("displays file name (not full path) in tab text", () => {
    const openFiles = ["ports/logger.ts"];

    const { getByTestId } = render(
      <TabBar
        openFiles={openFiles}
        activeFile="ports/logger.ts"
        modifiedFiles={new Set()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const tab = getByTestId("tab-ports/logger.ts");
    expect(tab.textContent).toContain("logger.ts");
    // Full path should be in the tooltip (title attribute)
    expect(tab.getAttribute("title")).toBe("ports/logger.ts");
  });
});
