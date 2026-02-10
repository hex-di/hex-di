/**
 * Tests for library inspector types: isLibraryInspector() and createLibraryInspectorPort().
 */

import { describe, it, expect } from "vitest";
import {
  isLibraryInspector,
  createLibraryInspectorPort,
  getPortDirection,
  getPortMetadata,
} from "../src/index.js";

// =============================================================================
// isLibraryInspector()
// =============================================================================

describe("isLibraryInspector()", () => {
  it("returns true for a minimal valid inspector (name + getSnapshot)", () => {
    const inspector = {
      name: "test-lib",
      getSnapshot: () => ({}),
    };
    expect(isLibraryInspector(inspector)).toBe(true);
  });

  it("returns true for inspector with subscribe and dispose", () => {
    const inspector = {
      name: "test-lib",
      getSnapshot: () => ({}),
      subscribe: () => () => {},
      dispose: () => {},
    };
    expect(isLibraryInspector(inspector)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isLibraryInspector(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isLibraryInspector(undefined)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isLibraryInspector("inspector")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isLibraryInspector(42)).toBe(false);
  });

  it("returns false for an empty object (missing name and getSnapshot)", () => {
    expect(isLibraryInspector({})).toBe(false);
  });

  it("returns false when name is missing", () => {
    expect(isLibraryInspector({ getSnapshot: () => ({}) })).toBe(false);
  });

  it("returns false when name is not a string", () => {
    expect(isLibraryInspector({ name: 42, getSnapshot: () => ({}) })).toBe(false);
  });

  it("returns false when name is empty string", () => {
    expect(isLibraryInspector({ name: "", getSnapshot: () => ({}) })).toBe(false);
  });

  it("returns false when getSnapshot is missing", () => {
    expect(isLibraryInspector({ name: "test" })).toBe(false);
  });

  it("returns false when getSnapshot is not a function", () => {
    expect(isLibraryInspector({ name: "test", getSnapshot: "not-a-fn" })).toBe(false);
  });

  it("returns false when subscribe is present but not a function", () => {
    expect(
      isLibraryInspector({
        name: "test",
        getSnapshot: () => ({}),
        subscribe: "not-a-fn",
      })
    ).toBe(false);
  });

  it("returns false when dispose is present but not a function", () => {
    expect(
      isLibraryInspector({
        name: "test",
        getSnapshot: () => ({}),
        dispose: "not-a-fn",
      })
    ).toBe(false);
  });

  it("returns true when subscribe is absent (optional)", () => {
    expect(
      isLibraryInspector({
        name: "test",
        getSnapshot: () => ({}),
      })
    ).toBe(true);
  });

  it("returns true when dispose is absent (optional)", () => {
    expect(
      isLibraryInspector({
        name: "test",
        getSnapshot: () => ({}),
      })
    ).toBe(true);
  });
});

// =============================================================================
// createLibraryInspectorPort()
// =============================================================================

describe("createLibraryInspectorPort()", () => {
  it("creates a port with the given name", () => {
    const port = createLibraryInspectorPort({ name: "FlowInspector" });
    expect(port.__portName).toBe("FlowInspector");
  });

  it("creates a port with 'outbound' direction", () => {
    const port = createLibraryInspectorPort({ name: "FlowInspector" });
    expect(getPortDirection(port)).toBe("outbound");
  });

  it("creates a port with 'library-inspector' category in metadata", () => {
    const port = createLibraryInspectorPort({ name: "FlowInspector" });
    const metadata = getPortMetadata(port);
    expect(metadata).toBeDefined();
    expect(metadata?.category).toBe("library-inspector");
  });

  it("passes description through to metadata", () => {
    const port = createLibraryInspectorPort({
      name: "StoreInspector",
      description: "Store inspection port",
    });
    const metadata = getPortMetadata(port);
    expect(metadata?.description).toBe("Store inspection port");
  });

  it("passes tags through to metadata", () => {
    const port = createLibraryInspectorPort({
      name: "StoreInspector",
      tags: ["store", "inspection"],
    });
    const metadata = getPortMetadata(port);
    expect(metadata?.tags).toEqual(["store", "inspection"]);
  });

  it("returns a frozen port object", () => {
    const port = createLibraryInspectorPort({ name: "TestInspector" });
    expect(Object.isFrozen(port)).toBe(true);
  });
});
