/**
 * Tests for JsonTree component.
 *
 * Spec Section 43.3.4
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { JsonTree } from "../../src/visualization/json-tree/json-tree.js";

afterEach(() => {
  cleanup();
});

describe("JsonTree", () => {
  it("renders a simple string value", () => {
    render(<JsonTree data="hello" />);

    expect(screen.getByTestId("json-tree")).toBeDefined();
    expect(screen.getByTestId("json-value").textContent).toBe('"hello"');
  });

  it("renders an object with keys", () => {
    render(<JsonTree data={{ name: "test", value: 42 }} />);

    const tree = screen.getByTestId("json-tree");
    expect(tree).toBeDefined();
    // The object is expanded by default at depth < 2
    expect(tree.textContent).toContain("name");
    expect(tree.textContent).toContain('"test"');
    expect(tree.textContent).toContain("value");
    expect(tree.textContent).toContain("42");
  });

  it("collapses on click", () => {
    render(<JsonTree data={{ name: "test", nested: { deep: "value" } }} defaultExpandDepth={2} />);

    const tree = screen.getByTestId("json-tree");
    // Initially expanded
    expect(tree.textContent).toContain("deep");

    // Find and click the root toggle to collapse
    const toggles = tree.querySelectorAll("div[style*='cursor: pointer']");
    // First one is the root object
    if (toggles[0]) {
      fireEvent.click(toggles[0]);
    }

    // After collapse, deep content should not be visible
    // The root object has 2 keys (name, nested), so collapsed shows "2 keys"
    expect(tree.textContent).toContain("2 keys");
  });

  it("renders null and undefined values", () => {
    render(<JsonTree data={{ a: null, b: undefined }} />);

    const tree = screen.getByTestId("json-tree");
    expect(tree.textContent).toContain("null");
  });
});
