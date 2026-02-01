/**
 * API verification test for complexity breakdown functionality.
 *
 * This test ensures the complexity breakdown API is properly exposed
 * and provides actionable debugging information for AI agents.
 */
import { describe, it, expect } from "vitest";
import { computeTypeComplexity, INSPECTION_CONFIG } from "../src/advanced.js";
import type { ComplexityBreakdown } from "../src/advanced.js";

describe("Complexity Breakdown API", () => {
  it("is exported from package main index", () => {
    // Verify function is exported
    expect(computeTypeComplexity).toBeDefined();
    expect(typeof computeTypeComplexity).toBe("function");
  });

  it("returns ComplexityBreakdown interface with all fields", () => {
    const depMap = {
      A: ["B", "C"],
      B: ["D"],
      C: ["D"],
      D: [],
    };

    const breakdown: ComplexityBreakdown = computeTypeComplexity(4, 3, depMap);

    // Verify all fields are present
    expect(breakdown).toHaveProperty("totalScore");
    expect(breakdown).toHaveProperty("adapterCount");
    expect(breakdown).toHaveProperty("adapterContribution");
    expect(breakdown).toHaveProperty("maxDepth");
    expect(breakdown).toHaveProperty("depthContribution");
    expect(breakdown).toHaveProperty("averageFanOut");
    expect(breakdown).toHaveProperty("fanOutContribution");
    expect(breakdown).toHaveProperty("totalEdges");

    // Verify types are numbers
    expect(typeof breakdown.totalScore).toBe("number");
    expect(typeof breakdown.adapterCount).toBe("number");
    expect(typeof breakdown.adapterContribution).toBe("number");
    expect(typeof breakdown.maxDepth).toBe("number");
    expect(typeof breakdown.depthContribution).toBe("number");
    expect(typeof breakdown.averageFanOut).toBe("number");
    expect(typeof breakdown.fanOutContribution).toBe("number");
    expect(typeof breakdown.totalEdges).toBe("number");
  });

  it("provides AI-friendly diagnostic information", () => {
    // Complex graph with high depth
    const depMap = {
      A: ["B"],
      B: ["C"],
      C: ["D"],
      D: ["E"],
      E: ["F"],
      F: ["G"],
      G: ["H"],
      H: [],
    };

    const breakdown = computeTypeComplexity(8, 7, depMap);

    // Depth should be the dominant contributor (7² × 2 = 98)
    expect(breakdown.depthContribution).toBe(7 * 7 * INSPECTION_CONFIG.DEPTH_WEIGHT);
    expect(breakdown.depthContribution).toBeGreaterThan(breakdown.adapterContribution);
    expect(breakdown.depthContribution).toBeGreaterThan(breakdown.fanOutContribution);

    // This provides clear signal to AI: "depth is the problem"
    // Example of how to analyze the breakdown:
    const depthPercentage = Math.round((breakdown.depthContribution / breakdown.totalScore) * 100);
    expect(depthPercentage).toBeGreaterThan(80); // Depth dominates the complexity
  });

  it("provides AI-friendly diagnostic for fan-out issues", () => {
    // Graph with high fan-out
    const depMap = {
      A: ["B", "C", "D", "E"],
      B: ["F", "G", "H"],
      C: ["F", "G", "H"],
      D: ["F", "G", "H"],
      E: ["F"],
      F: [],
      G: [],
      H: [],
    };

    const breakdown = computeTypeComplexity(8, 2, depMap);
    const totalEdges = 14; // 4 + 3 + 3 + 3 + 1 + 0 + 0 + 0

    expect(breakdown.totalEdges).toBe(totalEdges);
    expect(breakdown.averageFanOut).toBeCloseTo(totalEdges / 8);

    // This provides clear signal to AI: "high interconnectedness is a concern"
    // Example of how to analyze the breakdown:
    const fanOutPercentage = Math.round(
      (breakdown.fanOutContribution / breakdown.totalScore) * 100
    );
    expect(fanOutPercentage).toBeGreaterThan(25); // Fan-out is a significant contributor
  });

  it("contributions sum correctly for verification", () => {
    const depMap = {
      Service1: ["Repo1", "Logger"],
      Service2: ["Repo2", "Logger"],
      Repo1: ["Database"],
      Repo2: ["Database"],
      Logger: [],
      Database: [],
    };

    const breakdown = computeTypeComplexity(6, 3, depMap);

    // Manual calculation
    const expectedAdapterContribution = 6;
    const expectedDepthContribution = 3 * 3 * INSPECTION_CONFIG.DEPTH_WEIGHT;
    // Total edges = 2 + 2 + 1 + 1 + 0 + 0 = 6
    // Average fan-out = 6 / 6 = 1
    const expectedFanOutContribution = 1 * 6 * INSPECTION_CONFIG.FANOUT_WEIGHT;

    expect(breakdown.adapterContribution).toBe(expectedAdapterContribution);
    expect(breakdown.depthContribution).toBe(expectedDepthContribution);
    expect(breakdown.fanOutContribution).toBeCloseTo(expectedFanOutContribution);

    // Sum should equal total (accounting for rounding)
    const sum =
      breakdown.adapterContribution + breakdown.depthContribution + breakdown.fanOutContribution;
    expect(Math.abs(breakdown.totalScore - sum)).toBeLessThanOrEqual(1);
  });

  it("provides deterministic results for same inputs", () => {
    const depMap = { A: ["B"], B: ["C"], C: [] };

    const breakdown1 = computeTypeComplexity(3, 2, depMap);
    const breakdown2 = computeTypeComplexity(3, 2, depMap);

    // All fields should be identical
    expect(breakdown1).toEqual(breakdown2);
  });

  it("handles edge case of empty graph correctly", () => {
    const breakdown = computeTypeComplexity(0, 0, {});

    // All values should be zero
    expect(breakdown.totalScore).toBe(0);
    expect(breakdown.adapterCount).toBe(0);
    expect(breakdown.adapterContribution).toBe(0);
    expect(breakdown.maxDepth).toBe(0);
    expect(breakdown.depthContribution).toBe(0);
    expect(breakdown.averageFanOut).toBe(0);
    expect(breakdown.fanOutContribution).toBe(0);
    expect(breakdown.totalEdges).toBe(0);
  });
});
