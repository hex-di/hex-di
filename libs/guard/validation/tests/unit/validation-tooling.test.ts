import { describe, it, expect } from "vitest";
import { runIQ, runOQ, runPQ, generateTraceabilityMatrix } from "../../src/index.js";

// ---------------------------------------------------------------------------
// IQ Tests
// ---------------------------------------------------------------------------

describe("runIQ", () => {
  it("returns IQResult with protocol: 'IQ'", () => {
    const result = runIQ({ packageName: "@hex-di/guard" });
    expect(result.protocol).toBe("IQ");
  });

  it("passes when package name matches", () => {
    const result = runIQ({ packageName: "@hex-di/guard" });
    expect(result.passed).toBe(true);
  });

  it("fails when package name does not match", () => {
    const result = runIQ({ packageName: "@wrong/package" });
    const step = result.steps.find((s) => s.id === "IQ-001");
    expect(step?.passed).toBe(false);
    expect(step?.errorMessage).toContain("@wrong/package");
  });

  it("includes executedAt ISO timestamp", () => {
    const result = runIQ({ packageName: "@hex-di/guard" });
    expect(new Date(result.executedAt).toISOString()).toBe(result.executedAt);
  });

  it("includes IQ evidence with package info", () => {
    const result = runIQ({ packageName: "@hex-di/guard" });
    expect(result.evidence?.packageName).toBe("@hex-di/guard");
    expect(result.evidence?.nodeVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("fails when Node.js version is below minimum", () => {
    const result = runIQ({
      packageName: "@hex-di/guard",
      minNodeVersion: "999.0.0",
    });
    const step = result.steps.find((s) => s.id === "IQ-002");
    expect(step?.passed).toBe(false);
  });

  it("passes Node.js version check for current version", () => {
    const result = runIQ({
      packageName: "@hex-di/guard",
      minNodeVersion: "18.0.0",
    });
    const step = result.steps.find((s) => s.id === "IQ-002");
    expect(step?.passed).toBe(true);
  });

  it("verifies expected exports", () => {
    const result = runIQ({
      packageName: "@hex-di/guard",
      expectedExports: [".", "./testing"],
    });
    const step = result.steps.find((s) => s.id === "IQ-004");
    expect(step?.passed).toBe(true);
  });

  it("collects failedSteps when some checks fail", () => {
    const result = runIQ({ packageName: "wrong" });
    expect(result.failedSteps.length).toBeGreaterThan(0);
    expect(result.failedSteps.every((s) => !s.passed)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// OQ Tests
// ---------------------------------------------------------------------------

describe("runOQ", () => {
  it("returns OQResult with protocol: 'OQ'", () => {
    const result = runOQ();
    expect(result.protocol).toBe("OQ");
  });

  it("passes basic OQ without options", () => {
    const result = runOQ();
    // At minimum, OQ-001 through OQ-004 and OQ-006 should pass
    const coreSteps = result.steps.filter((s) =>
      ["OQ-001", "OQ-002", "OQ-003", "OQ-004"].includes(s.id),
    );
    expect(coreSteps.every((s) => s.passed)).toBe(true);
  });

  it("OQ-005 fails when mutation score is below threshold", () => {
    const result = runOQ({ mutationScore: 50, mutationScoreThreshold: 80 });
    const step = result.steps.find((s) => s.id === "OQ-005");
    expect(step?.passed).toBe(false);
  });

  it("OQ-005 passes when mutation score meets threshold", () => {
    const result = runOQ({ mutationScore: 90, mutationScoreThreshold: 80 });
    const step = result.steps.find((s) => s.id === "OQ-005");
    expect(step?.passed).toBe(true);
  });

  it("includes executedAt ISO timestamp", () => {
    const result = runOQ();
    expect(new Date(result.executedAt).toISOString()).toBe(result.executedAt);
  });

  it("includes evidence with test counts", () => {
    const result = runOQ({ totalTestsPassed: 100, totalTestsFailed: 0 });
    expect(result.evidence?.totalTests).toBe(100);
    expect(result.evidence?.passedTests).toBe(100);
    expect(result.evidence?.failedTests).toBe(0);
  });

  it("includes DoD items in evidence", () => {
    const result = runOQ({ verifiedDodItems: ["DoD-1", "DoD-2", "DoD-3"] });
    expect(result.evidence?.dodItemsVerified).toEqual(["DoD-1", "DoD-2", "DoD-3"]);
  });

  it("OQ-007 checks expected test count", () => {
    const result = runOQ({ expectedTestCount: 100, totalTestsPassed: 50, totalTestsFailed: 0 });
    const step = result.steps.find((s) => s.id === "OQ-007");
    expect(step?.passed).toBe(false);
  });

  it("OQ-007 passes when actual tests meet expectation", () => {
    const result = runOQ({ expectedTestCount: 50, totalTestsPassed: 60, totalTestsFailed: 0 });
    const step = result.steps.find((s) => s.id === "OQ-007");
    expect(step?.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PQ Tests
// ---------------------------------------------------------------------------

describe("runPQ", () => {
  it("returns PQResult with protocol: 'PQ'", () => {
    const result = runPQ();
    expect(result.protocol).toBe("PQ");
  });

  it("latency benchmark passes with lenient thresholds", () => {
    const result = runPQ({ maxP99LatencyMs: 1000, maxP95LatencyMs: 500 });
    const p95Step = result.steps.find((s) => s.id === "PQ-001");
    const p99Step = result.steps.find((s) => s.id === "PQ-002");
    expect(p95Step?.passed).toBe(true);
    expect(p99Step?.passed).toBe(true);
  });

  it("includes latency evidence", () => {
    const result = runPQ({ benchmarkIterations: 100, maxP99LatencyMs: 1000, maxP95LatencyMs: 500 });
    expect(result.evidence?.evaluationLatency.p50).toBeGreaterThanOrEqual(0);
    expect(result.evidence?.evaluationLatency.p95).toBeGreaterThanOrEqual(0);
    expect(result.evidence?.evaluationLatency.p99).toBeGreaterThanOrEqual(0);
  });

  it("PQ-004 uses integration tests passed flag", () => {
    const passed = runPQ({ integrationTestsPassed: true });
    const failed = runPQ({ integrationTestsPassed: false });
    const passedStep = passed.steps.find((s) => s.id === "PQ-004");
    const failedStep = failed.steps.find((s) => s.id === "PQ-004");
    expect(passedStep?.passed).toBe(true);
    expect(failedStep?.passed).toBe(false);
  });

  it("includes executedAt ISO timestamp", () => {
    const result = runPQ({ benchmarkIterations: 10 });
    expect(new Date(result.executedAt).toISOString()).toBe(result.executedAt);
  });

  it("collects failedSteps correctly", () => {
    const result = runPQ({ integrationTestsPassed: false, maxP99LatencyMs: 1000, maxP95LatencyMs: 500 });
    expect(result.failedSteps.find((s) => s.id === "PQ-004")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Traceability matrix tests
// ---------------------------------------------------------------------------

describe("generateTraceabilityMatrix", () => {
  it("returns a traceability matrix with all rows", () => {
    const matrix = generateTraceabilityMatrix();
    expect(matrix.totalRequirements).toBeGreaterThan(0);
    expect(matrix.rows.length).toBe(matrix.totalRequirements);
  });

  it("includes a generatedAt ISO timestamp", () => {
    const matrix = generateTraceabilityMatrix();
    expect(new Date(matrix.generatedAt).toISOString()).toBe(matrix.generatedAt);
  });

  it("calculates coverage percent correctly", () => {
    const matrix = generateTraceabilityMatrix();
    const expectedPercent =
      Math.round((matrix.coveredRequirements / matrix.totalRequirements) * 100);
    expect(matrix.coveragePercent).toBe(expectedPercent);
  });

  it("filters rows by requirement pattern", () => {
    const matrix = generateTraceabilityMatrix({
      requirementPattern: "REQ-GUARD-00[1-5]",
    });
    expect(matrix.rows.every((r) => r.requirementId.match(/REQ-GUARD-00[1-5]/))).toBe(true);
  });

  it("filters rows by test type", () => {
    const matrix = generateTraceabilityMatrix({ testTypes: ["gxp"] });
    expect(matrix.rows.every((r) => r.testType === "gxp")).toBe(true);
  });

  it("returns zero coverage for empty result", () => {
    const matrix = generateTraceabilityMatrix({
      requirementPattern: "NONEXISTENT-999",
    });
    expect(matrix.totalRequirements).toBe(0);
    expect(matrix.coveragePercent).toBe(0);
  });

  it("counts covered, partial, and missing requirements", () => {
    const matrix = generateTraceabilityMatrix();
    expect(matrix.coveredRequirements + matrix.partialRequirements + matrix.missingRequirements).toBe(
      matrix.totalRequirements,
    );
  });

  it("all default rows have required fields", () => {
    const matrix = generateTraceabilityMatrix();
    for (const row of matrix.rows) {
      expect(row.requirementId).toBeTruthy();
      expect(row.description).toBeTruthy();
      expect(row.specSection).toBeTruthy();
      expect(row.sourceModule).toBeTruthy();
      expect(row.testFile).toBeTruthy();
      expect(["unit", "type", "gxp", "integration", "mutation"]).toContain(row.testType);
      expect(["covered", "partial", "missing"]).toContain(row.status);
    }
  });
});
