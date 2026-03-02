/**
 * Unit tests for Guard Panel path analysis engine.
 *
 * Spec: 06-policy-path-explorer.md Sections 6.4, 6.6, 6.7
 */

import { describe, it, expect } from "vitest";
import {
  computeCoverage,
  computeFrequencies,
  describeGuardPath,
  enumeratePaths,
  PATH_EXPLOSION_LIMIT,
} from "../../../src/panels/guard/path-analysis.js";
import type { PolicyNodeDescriptor } from "../../../src/panels/guard/types.js";

// ── Test Fixture Factories ──────────────────────────────────────────────────

function makeLeaf(overrides?: Partial<PolicyNodeDescriptor>): PolicyNodeDescriptor {
  return {
    nodeId: "leaf-0",
    kind: "hasRole",
    label: undefined,
    children: [],
    leafData: { type: "hasRole", roleName: "admin" },
    depth: 0,
    fieldStrategy: undefined,
    ...overrides,
  };
}

function makeAllOf(
  children: PolicyNodeDescriptor[],
  overrides?: Partial<PolicyNodeDescriptor>
): PolicyNodeDescriptor {
  return {
    nodeId: "allof-0",
    kind: "allOf",
    label: undefined,
    children,
    leafData: undefined,
    depth: 0,
    fieldStrategy: "intersection",
    ...overrides,
  };
}

function makeAnyOf(
  children: PolicyNodeDescriptor[],
  overrides?: Partial<PolicyNodeDescriptor>
): PolicyNodeDescriptor {
  return {
    nodeId: "anyof-0",
    kind: "anyOf",
    label: undefined,
    children,
    leafData: undefined,
    depth: 0,
    fieldStrategy: "first",
    ...overrides,
  };
}

function makeNot(
  child: PolicyNodeDescriptor,
  overrides?: Partial<PolicyNodeDescriptor>
): PolicyNodeDescriptor {
  return {
    nodeId: "not-0",
    kind: "not",
    label: undefined,
    children: [child],
    leafData: undefined,
    depth: 0,
    fieldStrategy: undefined,
    ...overrides,
  };
}

// ── enumeratePaths ──────────────────────────────────────────────────────────

describe("enumeratePaths", () => {
  it("enumerates 2 paths for a single leaf", () => {
    const leaf = makeLeaf();
    const paths = enumeratePaths(leaf, "desc-1");

    expect(paths.length).toBe(2);
    expect(paths[0].finalOutcome).toBe("allow");
    expect(paths[1].finalOutcome).toBe("deny");
  });

  it("enumerates correct paths for allOf with 2 children", () => {
    const tree = makeAllOf([makeLeaf({ nodeId: "leaf-1" }), makeLeaf({ nodeId: "leaf-2" })]);

    const paths = enumeratePaths(tree, "desc-1");

    // allOf(A, B):
    // 1. A allow, B allow → allow
    // 2. A allow, B deny → deny
    // 3. A deny, B skip → deny
    expect(paths.length).toBe(3);

    const allowPaths = paths.filter(p => p.finalOutcome === "allow");
    const denyPaths = paths.filter(p => p.finalOutcome === "deny");
    expect(allowPaths.length).toBe(1);
    expect(denyPaths.length).toBe(2);
  });

  it("enumerates correct paths for anyOf with 2 children", () => {
    const tree = makeAnyOf([makeLeaf({ nodeId: "leaf-1" }), makeLeaf({ nodeId: "leaf-2" })]);

    const paths = enumeratePaths(tree, "desc-1");

    // anyOf(A, B):
    // 1. A allow, B skip → allow
    // 2. A deny, B allow → allow
    // 3. A deny, B deny → deny
    expect(paths.length).toBe(3);

    const allowPaths = paths.filter(p => p.finalOutcome === "allow");
    const denyPaths = paths.filter(p => p.finalOutcome === "deny");
    expect(allowPaths.length).toBe(2);
    expect(denyPaths.length).toBe(1);
  });

  it("inverts outcomes for not", () => {
    const tree = makeNot(makeLeaf({ nodeId: "leaf-1" }));
    const paths = enumeratePaths(tree, "desc-1");

    expect(paths.length).toBe(2);
    // not(allow) → deny, not(deny) → allow
    expect(paths[0].finalOutcome).toBe("deny");
    expect(paths[1].finalOutcome).toBe("allow");
  });

  it("tracks skip outcomes for short-circuited children", () => {
    const tree = makeAllOf([makeLeaf({ nodeId: "leaf-1" }), makeLeaf({ nodeId: "leaf-2" })]);

    const paths = enumeratePaths(tree, "desc-1");
    const denyPath = paths.find(p => p.finalOutcome === "deny" && p.nodeOutcomes.includes("skip"));
    expect(denyPath).toBeDefined();
  });

  it("assigns descriptorId to all paths", () => {
    const paths = enumeratePaths(makeLeaf(), "my-desc");
    for (const path of paths) {
      expect(path.descriptorId).toBe("my-desc");
    }
  });

  it("assigns sequential pathIds", () => {
    const paths = enumeratePaths(makeLeaf(), "desc-1");
    expect(paths[0].pathId).toBe("path-0");
    expect(paths[1].pathId).toBe("path-1");
  });

  it("respects PATH_EXPLOSION_LIMIT", () => {
    expect(PATH_EXPLOSION_LIMIT).toBe(256);
  });

  it("handles empty allOf as allow", () => {
    const tree = makeAllOf([]);
    const paths = enumeratePaths(tree, "desc-1");
    expect(paths.length).toBe(1);
    expect(paths[0].finalOutcome).toBe("allow");
  });

  it("handles empty anyOf as deny", () => {
    const tree = makeAnyOf([]);
    const paths = enumeratePaths(tree, "desc-1");
    expect(paths.length).toBe(1);
    expect(paths[0].finalOutcome).toBe("deny");
  });
});

// ── describeGuardPath ───────────────────────────────────────────────────────

describe("describeGuardPath", () => {
  it("describes an allow path with no skips", () => {
    const desc = describeGuardPath(["allow", "allow"], "allow");
    expect(desc).toContain("allowed");
    expect(desc).not.toContain("skipped");
  });

  it("describes a deny path with skips", () => {
    const desc = describeGuardPath(["deny", "deny", "skip"], "deny");
    expect(desc).toContain("skipped");
    expect(desc).toContain("denied");
  });
});

// ── computeFrequencies ──────────────────────────────────────────────────────

describe("computeFrequencies", () => {
  it("returns zeros for empty counts", () => {
    expect(computeFrequencies([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("returns proportional frequencies", () => {
    const freqs = computeFrequencies([3, 7]);
    expect(freqs[0]).toBeCloseTo(0.3);
    expect(freqs[1]).toBeCloseTo(0.7);
  });
});

// ── computeCoverage ─────────────────────────────────────────────────────────

describe("computeCoverage", () => {
  it("returns 0 for no paths", () => {
    expect(computeCoverage({ totalPaths: 0, observedPaths: 0 })).toBe(0);
  });

  it("computes correct ratio", () => {
    expect(computeCoverage({ totalPaths: 10, observedPaths: 7 })).toBeCloseTo(0.7);
  });

  it("returns 1.0 for full coverage", () => {
    expect(computeCoverage({ totalPaths: 5, observedPaths: 5 })).toBe(1);
  });
});
