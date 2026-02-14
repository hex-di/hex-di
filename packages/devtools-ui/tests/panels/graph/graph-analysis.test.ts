/**
 * Tests for graph analysis logic.
 */

import { describe, it, expect } from "vitest";
import {
  analyzeFromGraphData,
  createEmptyAnalysis,
} from "../../../src/panels/graph/use-graph-analysis.js";
import type { ContainerGraphData } from "@hex-di/core";

function createGraphData(overrides: Partial<ContainerGraphData> = {}): ContainerGraphData {
  return {
    adapters: [
      {
        portName: "Logger",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "own",
      },
      {
        portName: "Database",
        lifetime: "scoped",
        factoryKind: "sync",
        dependencyNames: ["Logger"],
        origin: "own",
      },
      {
        portName: "UserService",
        lifetime: "transient",
        factoryKind: "sync",
        dependencyNames: ["Database", "Logger"],
        origin: "own",
      },
    ],
    containerName: "TestApp",
    kind: "root",
    parentName: null,
    ...overrides,
  };
}

describe("createEmptyAnalysis", () => {
  it("returns zeroed analysis state", () => {
    const result = createEmptyAnalysis();
    expect(result.complexityScore).toBe(0);
    expect(result.recommendation).toBe("safe");
    expect(result.orphanPorts).toEqual([]);
    expect(result.isComplete).toBe(true);
    expect(result.maxChainDepth).toBe(0);
  });
});

describe("analyzeFromGraphData", () => {
  it("returns empty analysis for undefined graph data", () => {
    const result = analyzeFromGraphData(undefined);
    expect(result.complexityScore).toBe(0);
    expect(result.isComplete).toBe(true);
  });

  it("computes complexity score", () => {
    const result = analyzeFromGraphData(createGraphData());
    expect(result.complexityScore).toBeGreaterThan(0);
  });

  it("detects orphan ports (never depended on)", () => {
    const result = analyzeFromGraphData(createGraphData());
    // UserService has no dependents
    expect(result.orphanPorts).toContain("UserService");
  });

  it("computes max chain depth", () => {
    const result = analyzeFromGraphData(createGraphData());
    // Logger -> Database -> UserService = depth 3
    expect(result.maxChainDepth).toBeGreaterThanOrEqual(2);
  });

  it("marks complete when all dependencies are satisfied", () => {
    const result = analyzeFromGraphData(createGraphData());
    expect(result.isComplete).toBe(true);
    expect(result.unsatisfiedRequirements).toEqual([]);
  });

  it("detects unsatisfied requirements", () => {
    const data = createGraphData({
      adapters: [
        {
          portName: "Service",
          lifetime: "singleton",
          factoryKind: "sync",
          dependencyNames: ["Missing"],
          origin: "own",
        },
      ],
    });
    const result = analyzeFromGraphData(data);
    expect(result.isComplete).toBe(false);
    expect(result.unsatisfiedRequirements).toContain("Missing");
  });

  it("provides recommendation based on score", () => {
    // Small graph should be "safe"
    const smallData = createGraphData({
      adapters: [
        {
          portName: "A",
          lifetime: "singleton",
          factoryKind: "sync",
          dependencyNames: [],
          origin: "own",
        },
      ],
    });
    const result = analyzeFromGraphData(smallData);
    expect(result.recommendation).toBe("safe");
  });

  it("computes direction summary from metadata", () => {
    const data = createGraphData({
      adapters: [
        {
          portName: "Api",
          lifetime: "singleton",
          factoryKind: "sync",
          dependencyNames: [],
          origin: "own",
          metadata: { direction: "inbound" },
        },
        {
          portName: "Database",
          lifetime: "singleton",
          factoryKind: "sync",
          dependencyNames: [],
          origin: "own",
          metadata: { direction: "outbound" },
        },
      ],
    });
    const result = analyzeFromGraphData(data);
    expect(result.directionSummary.inbound).toBe(1);
    expect(result.directionSummary.outbound).toBe(1);
  });

  it("handles empty adapter list", () => {
    const data = createGraphData({ adapters: [] });
    const result = analyzeFromGraphData(data);
    expect(result.complexityScore).toBe(0);
    expect(result.orphanPorts).toEqual([]);
  });

  it("generates correlation ID", () => {
    const result = analyzeFromGraphData(createGraphData());
    expect(result.correlationId).toContain("graph_ui_");
  });

  it("sets depthLimitExceeded for deep graphs", () => {
    // Build a chain of 60 adapters
    const adapters = [];
    for (let i = 0; i < 60; i++) {
      adapters.push({
        portName: `P${i}`,
        lifetime: "singleton" as const,
        factoryKind: "sync" as const,
        dependencyNames: i > 0 ? [`P${i - 1}`] : [],
        origin: "own" as const,
      });
    }
    const data = createGraphData({ adapters });
    const result = analyzeFromGraphData(data);
    expect(result.depthLimitExceeded).toBe(true);
  });
});
