/**
 * TDD Tests for depth limit boundary condition.
 *
 * ## Issue
 * The `isDepthLimitExceeded` function uses `>=` instead of `>`, which means
 * a graph with exactly DEFAULT_MAX_DEPTH (50) levels is incorrectly flagged
 * as "exceeded" when it should be valid.
 *
 * ## Expected Behavior
 * - Depth of 49: NOT exceeded (within limit)
 * - Depth of 50: NOT exceeded (AT the limit, but valid)
 * - Depth of 51: EXCEEDED (beyond limit)
 *
 * @packageDocumentation
 */

import { describe, expect, it } from "vitest";
import {
  isDepthLimitExceeded,
  computeMaxChainDepth,
} from "../src/graph/inspection/depth-analysis.js";
import { INSPECTION_CONFIG } from "../src/graph/inspection/complexity.js";

describe("isDepthLimitExceeded boundary conditions", () => {
  it("should have DEFAULT_MAX_DEPTH of 50", () => {
    expect(INSPECTION_CONFIG.DEFAULT_MAX_DEPTH).toBe(50);
  });

  describe("boundary behavior", () => {
    it("should return false for depth below limit (49)", () => {
      expect(isDepthLimitExceeded(49)).toBe(false);
    });

    it("should return false for depth exactly at limit (50)", () => {
      // This is the boundary case - 50 is the max, so 50 should be VALID
      // The function doc says "True if depth EXCEEDS" - 50 does not exceed 50
      expect(isDepthLimitExceeded(50)).toBe(false);
    });

    it("should return true for depth above limit (51)", () => {
      expect(isDepthLimitExceeded(51)).toBe(true);
    });

    it("should return true for depth well above limit (100)", () => {
      expect(isDepthLimitExceeded(100)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should return false for depth 0", () => {
      expect(isDepthLimitExceeded(0)).toBe(false);
    });

    it("should return false for depth 1", () => {
      expect(isDepthLimitExceeded(1)).toBe(false);
    });
  });
});

describe("computeMaxChainDepth consistency", () => {
  it("should return 0 for empty dependency map", () => {
    expect(computeMaxChainDepth({})).toBe(0);
  });

  it("should return 0 for single node with no deps", () => {
    expect(computeMaxChainDepth({ A: [] })).toBe(0);
  });

  it("should return 1 for single dependency", () => {
    expect(computeMaxChainDepth({ A: ["B"], B: [] })).toBe(1);
  });

  it("should return correct depth for linear chain", () => {
    // A -> B -> C -> D (depth 3)
    expect(
      computeMaxChainDepth({
        A: ["B"],
        B: ["C"],
        C: ["D"],
        D: [],
      })
    ).toBe(3);
  });
});
