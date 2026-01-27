/**
 * Unit tests for the complexity scoring module.
 *
 * These tests verify:
 * 1. The complexity formula behaves correctly with known inputs
 * 2. Named constants are exported and used in the formula
 * 3. Edge cases are handled properly
 */
import { describe, it, expect } from "vitest";
import {
  computeTypeComplexityScore,
  computeTypeComplexity,
  getPerformanceRecommendation,
  INSPECTION_CONFIG,
} from "../src/graph/inspection/complexity.js";

// =============================================================================
// Constants Extraction Tests
// =============================================================================

describe("INSPECTION_CONFIG constants", () => {
  it("exports DEPTH_WEIGHT constant", () => {
    expect(INSPECTION_CONFIG).toHaveProperty("DEPTH_WEIGHT");
    expect(typeof INSPECTION_CONFIG.DEPTH_WEIGHT).toBe("number");
  });

  it("exports FANOUT_WEIGHT constant", () => {
    expect(INSPECTION_CONFIG).toHaveProperty("FANOUT_WEIGHT");
    expect(typeof INSPECTION_CONFIG.FANOUT_WEIGHT).toBe("number");
  });

  it("DEPTH_WEIGHT equals 2 (quadratic weight for depth)", () => {
    expect(INSPECTION_CONFIG.DEPTH_WEIGHT).toBe(2);
  });

  it("FANOUT_WEIGHT equals 0.5 (linear scaling for fan-out)", () => {
    expect(INSPECTION_CONFIG.FANOUT_WEIGHT).toBe(0.5);
  });
});

// =============================================================================
// Formula Verification Tests
// =============================================================================

describe("computeTypeComplexityScore formula", () => {
  it("returns 0 for empty graph", () => {
    const score = computeTypeComplexityScore(0, 0, {});
    expect(score).toBe(0);
  });

  it("computes correct score for single adapter with no deps", () => {
    // Formula: adapterCount + depth² × DEPTH_WEIGHT + avgFanOut × adapterCount × FANOUT_WEIGHT
    // = 1 + 1² × 2 + 0 × 1 × 0.5
    // = 1 + 2 + 0 = 3
    const score = computeTypeComplexityScore(1, 1, { A: [] });
    expect(score).toBe(3);
  });

  it("depth has quadratic impact", () => {
    // With depth=1: 1 + 1² × 2 + 0 = 3
    // With depth=2: 1 + 2² × 2 + 0 = 1 + 8 = 9
    // With depth=3: 1 + 3² × 2 + 0 = 1 + 18 = 19
    const scoreDepth1 = computeTypeComplexityScore(1, 1, { A: [] });
    const scoreDepth2 = computeTypeComplexityScore(1, 2, { A: [] });
    const scoreDepth3 = computeTypeComplexityScore(1, 3, { A: [] });

    expect(scoreDepth1).toBe(3);
    expect(scoreDepth2).toBe(9);
    expect(scoreDepth3).toBe(19);

    // Verify quadratic growth (difference grows linearly)
    const diff1 = scoreDepth2 - scoreDepth1; // 6
    const diff2 = scoreDepth3 - scoreDepth2; // 10
    expect(diff2 - diff1).toBe(4); // Constant second derivative = 2 * DEPTH_WEIGHT * 2
  });

  it("fan-out scales with adapter count", () => {
    // 2 adapters, depth=1, each has 1 dependency: avgFanOut = 1
    // = 2 + 1² × 2 + 1 × 2 × 0.5 = 2 + 2 + 1 = 5
    const score = computeTypeComplexityScore(2, 1, { A: ["B"], B: [] });
    expect(score).toBe(5);
  });

  it("uses DEPTH_WEIGHT constant in formula", () => {
    // Verify formula uses the exported constant
    // depth=10, adapters=1, no deps: 1 + 10² × DEPTH_WEIGHT + 0
    const score = computeTypeComplexityScore(1, 10, { A: [] });
    const expected = 1 + 10 * 10 * INSPECTION_CONFIG.DEPTH_WEIGHT;
    expect(score).toBe(expected);
  });

  it("uses FANOUT_WEIGHT constant in formula", () => {
    // adapters=4, depth=0, total deps=4 (A:2 + B:2 + C:0 + D:0): avgFanOut = 1
    // = 4 + 0 + 1 × 4 × FANOUT_WEIGHT = 4 + 2 = 6
    const depMap = { A: ["B", "C"], B: ["C", "D"], C: [], D: [] };
    const totalDeps = 4; // 2 + 2 + 0 + 0
    const avgFanOut = totalDeps / 4; // 1
    const score = computeTypeComplexityScore(4, 0, depMap);
    const expected = Math.round(4 + 0 + avgFanOut * 4 * INSPECTION_CONFIG.FANOUT_WEIGHT);
    expect(score).toBe(expected);
  });

  it("rounds result to integer", () => {
    // Create a case that produces a fractional result before rounding
    // 3 adapters, depth=1, 2 total deps: avgFanOut = 0.666...
    // = 3 + 1 × 2 + 0.666 × 3 × 0.5 = 3 + 2 + 1 = 6
    const score = computeTypeComplexityScore(3, 1, { A: ["B"], B: ["C"], C: [] });
    expect(Number.isInteger(score)).toBe(true);
  });
});

// =============================================================================
// Performance Recommendation Tests
// =============================================================================

describe("getPerformanceRecommendation", () => {
  it("returns 'safe' for score at or below low threshold", () => {
    expect(getPerformanceRecommendation(0)).toBe("safe");
    expect(getPerformanceRecommendation(50)).toBe("safe");
    expect(getPerformanceRecommendation(INSPECTION_CONFIG.PERFORMANCE_THRESHOLDS.low)).toBe("safe");
  });

  it("returns 'monitor' for score between low and medium thresholds", () => {
    expect(getPerformanceRecommendation(51)).toBe("monitor");
    expect(getPerformanceRecommendation(75)).toBe("monitor");
    expect(getPerformanceRecommendation(100)).toBe("monitor");
    expect(getPerformanceRecommendation(INSPECTION_CONFIG.PERFORMANCE_THRESHOLDS.medium)).toBe(
      "monitor"
    );
  });

  it("returns 'consider-splitting' for score above medium threshold", () => {
    expect(getPerformanceRecommendation(101)).toBe("consider-splitting");
    expect(getPerformanceRecommendation(200)).toBe("consider-splitting");
    expect(getPerformanceRecommendation(1000)).toBe("consider-splitting");
  });
});

// =============================================================================
// Complexity Breakdown Tests
// =============================================================================

describe("computeTypeComplexity breakdown", () => {
  it("returns all zeros for empty graph", () => {
    const breakdown = computeTypeComplexity(0, 0, {});

    expect(breakdown.totalScore).toBe(0);
    expect(breakdown.adapterCount).toBe(0);
    expect(breakdown.adapterContribution).toBe(0);
    expect(breakdown.maxDepth).toBe(0);
    expect(breakdown.depthContribution).toBe(0);
    expect(breakdown.averageFanOut).toBe(0);
    expect(breakdown.fanOutContribution).toBe(0);
    expect(breakdown.totalEdges).toBe(0);
  });

  it("returns correct breakdown for single adapter with no deps", () => {
    const breakdown = computeTypeComplexity(1, 1, { A: [] });

    // adapterContribution = 1
    // depthContribution = 1² × 2 = 2
    // fanOutContribution = 0 × 1 × 0.5 = 0
    // totalScore = 1 + 2 + 0 = 3
    expect(breakdown.adapterCount).toBe(1);
    expect(breakdown.adapterContribution).toBe(1);
    expect(breakdown.maxDepth).toBe(1);
    expect(breakdown.depthContribution).toBe(2);
    expect(breakdown.averageFanOut).toBe(0);
    expect(breakdown.fanOutContribution).toBe(0);
    expect(breakdown.totalEdges).toBe(0);
    expect(breakdown.totalScore).toBe(3);
  });

  it("returns correct breakdown showing depth contribution", () => {
    const breakdown = computeTypeComplexity(1, 5, { A: [] });

    // depthContribution = 5² × 2 = 50
    expect(breakdown.maxDepth).toBe(5);
    expect(breakdown.depthContribution).toBe(50);
    expect(breakdown.totalScore).toBe(51); // 1 + 50 + 0
  });

  it("returns correct breakdown showing fan-out contribution", () => {
    // 2 adapters, 2 deps each: totalEdges = 4, avgFanOut = 2
    const breakdown = computeTypeComplexity(2, 0, { A: ["B", "C"], B: ["C", "D"] });

    // adapterCount = 2 (passed in)
    // totalEdges = 4 (2 + 2)
    // avgFanOut = 4/2 = 2
    // fanOutContribution = 2 × 2 × 0.5 = 2
    expect(breakdown.adapterCount).toBe(2);
    expect(breakdown.adapterContribution).toBe(2);
    expect(breakdown.totalEdges).toBe(4);
    expect(breakdown.averageFanOut).toBe(2);
    expect(breakdown.fanOutContribution).toBe(2);
    expect(breakdown.totalScore).toBe(4); // 2 + 0 + 2 = 4
  });

  it("returns correct breakdown with consistent inputs", () => {
    // 3 adapters, depth=0, 2 total edges: avgFanOut = 2/3
    const depMap = { A: ["B"], B: ["C"], C: [] };
    const breakdown = computeTypeComplexity(3, 0, depMap);

    expect(breakdown.adapterCount).toBe(3);
    expect(breakdown.adapterContribution).toBe(3);
    expect(breakdown.maxDepth).toBe(0);
    expect(breakdown.depthContribution).toBe(0);
    expect(breakdown.totalEdges).toBe(2);
    expect(breakdown.averageFanOut).toBeCloseTo(2 / 3);
    expect(breakdown.fanOutContribution).toBeCloseTo((2 / 3) * 3 * 0.5); // = 1
    expect(breakdown.totalScore).toBe(4); // 3 + 0 + 1 = 4
  });

  it("breakdown totalScore matches computeTypeComplexityScore", () => {
    const depMap = { A: ["B", "C"], B: ["C"], C: [] };

    const score = computeTypeComplexityScore(3, 2, depMap);
    const breakdown = computeTypeComplexity(3, 2, depMap);

    expect(breakdown.totalScore).toBe(score);
  });

  it("contributions sum to totalScore (before rounding)", () => {
    const depMap = { A: ["B", "C"], B: ["C", "D"], C: [], D: [] };
    const breakdown = computeTypeComplexity(4, 3, depMap);

    const sum =
      breakdown.adapterContribution + breakdown.depthContribution + breakdown.fanOutContribution;

    // Should be equal or differ by at most 1 due to rounding
    expect(Math.abs(breakdown.totalScore - sum)).toBeLessThanOrEqual(1);
  });

  it("provides all fields for understanding complexity drivers", () => {
    const breakdown = computeTypeComplexity(10, 5, {
      A: ["B"],
      B: ["C"],
      C: ["D"],
      D: ["E"],
      E: [],
      F: ["G"],
      G: [],
      H: [],
      I: [],
      J: [],
    });

    // Verify all fields are present and numeric
    expect(typeof breakdown.totalScore).toBe("number");
    expect(typeof breakdown.adapterCount).toBe("number");
    expect(typeof breakdown.adapterContribution).toBe("number");
    expect(typeof breakdown.maxDepth).toBe("number");
    expect(typeof breakdown.depthContribution).toBe("number");
    expect(typeof breakdown.averageFanOut).toBe("number");
    expect(typeof breakdown.fanOutContribution).toBe("number");
    expect(typeof breakdown.totalEdges).toBe("number");

    // Verify values make sense
    expect(breakdown.adapterCount).toBe(10);
    expect(breakdown.maxDepth).toBe(5);
    expect(breakdown.totalEdges).toBe(5); // 5 edges total

    // Depth should be the dominant contributor (5² × 2 = 50)
    expect(breakdown.depthContribution).toBe(50);
    expect(breakdown.depthContribution).toBeGreaterThan(breakdown.fanOutContribution);
  });
});
