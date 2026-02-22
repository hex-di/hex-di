/**
 * FileTree component tests.
 *
 * Covers spec Section 44.8 items 7-8:
 * 7. File tree shows files from VirtualFS
 * 8. Click file calls onSelect with path
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { FileTree } from "../../src/editor/file-tree.js";

describe("FileTree", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows files from the virtual filesystem", () => {
    const files = ["main.ts", "ports/logger.ts", "adapters/console.ts"];

    const { getByTestId } = render(
      <FileTree files={files} activeFile="main.ts" onSelect={vi.fn()} />
    );

    // File tree container exists
    expect(getByTestId("file-tree")).toBeDefined();

    // Individual files are rendered
    expect(getByTestId("tree-file-main.ts")).toBeDefined();
    expect(getByTestId("tree-file-ports/logger.ts")).toBeDefined();
    expect(getByTestId("tree-file-adapters/console.ts")).toBeDefined();

    // Directories are rendered
    expect(getByTestId("tree-dir-ports")).toBeDefined();
    expect(getByTestId("tree-dir-adapters")).toBeDefined();
  });

  it("calls onSelect with file path when a file is clicked", () => {
    const onSelect = vi.fn();
    const files = ["main.ts", "utils.ts"];

    const { getByTestId } = render(
      <FileTree files={files} activeFile="main.ts" onSelect={onSelect} />
    );

    fireEvent.click(getByTestId("tree-file-utils.ts"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("utils.ts");
  });

  it("highlights the active file", () => {
    const files = ["main.ts", "utils.ts"];

    const { getByTestId } = render(
      <FileTree files={files} activeFile="main.ts" onSelect={vi.fn()} />
    );

    const activeItem = getByTestId("tree-file-main.ts");
    expect(activeItem.getAttribute("aria-selected")).toBe("true");

    const inactiveItem = getByTestId("tree-file-utils.ts");
    expect(inactiveItem.getAttribute("aria-selected")).toBe("false");
  });

  it("shows new file button when onNewFile is provided", () => {
    const { getByTestId } = render(
      <FileTree files={["main.ts"]} activeFile="main.ts" onSelect={vi.fn()} onNewFile={vi.fn()} />
    );

    expect(getByTestId("new-file-button")).toBeDefined();
  });

  it("collapses and expands directories on click", () => {
    const files = ["ports/logger.ts", "ports/cache.ts"];

    const { getByTestId, queryByTestId } = render(
      <FileTree files={files} activeFile="ports/logger.ts" onSelect={vi.fn()} />
    );

    // Initially expanded (children visible)
    expect(queryByTestId("tree-file-ports/logger.ts")).toBeDefined();

    // Click to collapse
    fireEvent.click(getByTestId("tree-dir-ports"));

    // Children should be hidden
    expect(queryByTestId("tree-file-ports/logger.ts")).toBeNull();

    // Click to expand again
    fireEvent.click(getByTestId("tree-dir-ports"));

    // Children should be visible again
    expect(queryByTestId("tree-file-ports/logger.ts")).toBeDefined();
  });
});
