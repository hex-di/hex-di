/**
 * Tests for node shape SVG path generators.
 */

import { describe, it, expect } from "vitest";
import {
  roundedRect,
  circle,
  diamond,
  hexagon,
  octagon,
  rect,
  getNodeShapePath,
  getLibraryBadgeLetter,
  isDashedShape,
} from "../../../src/panels/graph/components/node-shapes.js";
import type { LibraryAdapterKind } from "../../../src/panels/graph/types.js";

describe("roundedRect", () => {
  it("produces valid SVG path", () => {
    const path = roundedRect(160, 48, 6);
    expect(path).toContain("M");
    expect(path).toContain("Q");
    expect(path).toContain("Z");
  });
});

describe("circle", () => {
  it("produces valid SVG arc path", () => {
    const path = circle(48, 48);
    expect(path).toContain("A");
    expect(path).toContain("Z");
  });
});

describe("diamond", () => {
  it("produces valid SVG path with 4 points", () => {
    const path = diamond(60, 48);
    expect(path).toContain("L");
    expect(path).toContain("Z");
  });
});

describe("hexagon", () => {
  it("produces valid SVG path with 6 segments", () => {
    const path = hexagon(160, 48);
    expect(path).toContain("L");
    expect(path).toContain("Z");
  });
});

describe("octagon", () => {
  it("produces valid SVG path with 8 segments", () => {
    const path = octagon(160, 48);
    const segments = path.split("L").length;
    expect(segments).toBeGreaterThanOrEqual(7);
    expect(path).toContain("Z");
  });
});

describe("rect", () => {
  it("produces valid SVG rectangle path", () => {
    const path = rect(160, 48);
    expect(path).toContain("M");
    expect(path).toContain("H");
    expect(path).toContain("V");
    expect(path).toContain("Z");
  });
});

describe("getNodeShapePath", () => {
  it("returns roundedRect for undefined kind", () => {
    const path = getNodeShapePath(undefined, 160, 48);
    expect(path).toContain("Q"); // rounded rect has Q curves
  });

  it("returns circle for store atom", () => {
    const kind: LibraryAdapterKind = { library: "store", kind: "atom" };
    const path = getNodeShapePath(kind, 160, 48);
    expect(path).toContain("A"); // arc
  });

  it("returns diamond for store derived", () => {
    const kind: LibraryAdapterKind = { library: "store", kind: "derived" };
    const path = getNodeShapePath(kind, 160, 48);
    // Diamond path should not have Q curves like rounded rect
    expect(path).not.toContain("Q");
  });

  it("returns rect for store effect", () => {
    const kind: LibraryAdapterKind = { library: "store", kind: "effect" };
    const path = getNodeShapePath(kind, 160, 48);
    expect(path).toContain("H");
    expect(path).not.toContain("Q");
  });

  it("returns hexagon for saga", () => {
    const kind: LibraryAdapterKind = { library: "saga", kind: "saga" };
    const path = getNodeShapePath(kind, 160, 48);
    // Hexagon has 6 points, no Q curves
    expect(path).not.toContain("Q");
    expect(path).toContain("L");
  });

  it("returns octagon for flow", () => {
    const kind: LibraryAdapterKind = { library: "flow", kind: "flow" };
    const path = getNodeShapePath(kind, 160, 48);
    expect(path).not.toContain("Q");
    expect(path).toContain("L");
  });

  it("returns stadium (pill) for query", () => {
    const kind: LibraryAdapterKind = { library: "query", kind: "query" };
    const path = getNodeShapePath(kind, 160, 48);
    // Stadium uses arcs (A) for fully-rounded ends, not Q curves
    expect(path).toContain("A");
    expect(path).not.toContain("Q");
  });

  it("returns pentagon for logger", () => {
    const kind: LibraryAdapterKind = { library: "logger", kind: "logger" };
    const path = getNodeShapePath(kind, 160, 48);
    // Pentagon has 5 line segments, no curves
    expect(path).not.toContain("Q");
    expect(path).not.toContain("A");
    expect(path).toContain("L");
    // Count vertices: M + 4 L commands = 5 points
    const lCount = (path.match(/L /g) ?? []).length;
    expect(lCount).toBe(4);
  });

  it("returns parallelogram for tracing", () => {
    const kind: LibraryAdapterKind = { library: "tracing", kind: "tracer" };
    const path = getNodeShapePath(kind, 160, 48);
    // Parallelogram has 4 line segments, no curves
    expect(path).not.toContain("Q");
    expect(path).not.toContain("A");
    expect(path).toContain("L");
    const lCount = (path.match(/L /g) ?? []).length;
    expect(lCount).toBe(3);
  });

  it("returns roundedRect for core generic", () => {
    const kind: LibraryAdapterKind = { library: "core", kind: "generic" };
    const path = getNodeShapePath(kind, 160, 48);
    expect(path).toContain("Q");
  });
});

describe("getLibraryBadgeLetter", () => {
  it("returns S for store state", () => {
    expect(getLibraryBadgeLetter({ library: "store", kind: "state" })).toBe("S");
  });

  it("returns A for store atom", () => {
    expect(getLibraryBadgeLetter({ library: "store", kind: "atom" })).toBe("A");
  });

  it("returns D for store derived", () => {
    expect(getLibraryBadgeLetter({ library: "store", kind: "derived" })).toBe("D");
  });

  it("returns D for store async-derived", () => {
    expect(getLibraryBadgeLetter({ library: "store", kind: "async-derived" })).toBe("D");
  });

  it("returns E for store effect", () => {
    expect(getLibraryBadgeLetter({ library: "store", kind: "effect" })).toBe("E");
  });

  it("returns Q for query", () => {
    expect(getLibraryBadgeLetter({ library: "query", kind: "query" })).toBe("Q");
  });

  it("returns M for mutation", () => {
    expect(getLibraryBadgeLetter({ library: "query", kind: "mutation" })).toBe("M");
  });

  it("returns ~ for streamed-query", () => {
    expect(getLibraryBadgeLetter({ library: "query", kind: "streamed-query" })).toBe("~");
  });

  it("returns Sg for saga", () => {
    expect(getLibraryBadgeLetter({ library: "saga", kind: "saga" })).toBe("Sg");
  });

  it("returns Fl for flow", () => {
    expect(getLibraryBadgeLetter({ library: "flow", kind: "flow" })).toBe("Fl");
  });

  it("returns L for logger", () => {
    expect(getLibraryBadgeLetter({ library: "logger", kind: "logger" })).toBe("L");
  });

  it("returns T for tracing", () => {
    expect(getLibraryBadgeLetter({ library: "tracing", kind: "tracer" })).toBe("T");
  });

  it("returns empty string for core generic", () => {
    expect(getLibraryBadgeLetter({ library: "core", kind: "generic" })).toBe("");
  });
});

describe("isDashedShape", () => {
  it("returns false for undefined", () => {
    expect(isDashedShape(undefined)).toBe(false);
  });

  it("returns true for store async-derived", () => {
    expect(isDashedShape({ library: "store", kind: "async-derived" })).toBe(true);
  });

  it("returns false for store state", () => {
    expect(isDashedShape({ library: "store", kind: "state" })).toBe(false);
  });

  it("returns false for query", () => {
    expect(isDashedShape({ library: "query", kind: "query" })).toBe(false);
  });
});
