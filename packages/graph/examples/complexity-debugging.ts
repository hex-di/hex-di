/**
 * Example: Using ComplexityBreakdown for AI-Friendly Debugging
 *
 * This example demonstrates how the complexity breakdown helps AI agents
 * understand and diagnose performance issues in dependency graphs.
 */
import { computeTypeComplexity, INSPECTION_CONFIG } from "../src/index.js";
import type { ComplexityBreakdown } from "../src/index.js";

/**
 * Analyzes a complexity breakdown and returns actionable recommendations.
 * This demonstrates how an AI agent can interpret the breakdown to provide
 * specific, targeted advice.
 */
function analyzeComplexity(breakdown: ComplexityBreakdown): {
  primaryIssue: "depth" | "fanout" | "size" | "balanced";
  recommendations: string[];
  severity: "low" | "medium" | "high";
} {
  const { totalScore, depthContribution, fanOutContribution, adapterContribution } = breakdown;

  // Calculate contribution percentages
  const depthPercent = (depthContribution / totalScore) * 100;
  const fanOutPercent = (fanOutContribution / totalScore) * 100;
  const adapterPercent = (adapterContribution / totalScore) * 100;

  // Determine primary issue
  let primaryIssue: "depth" | "fanout" | "size" | "balanced";
  if (depthPercent > 60) {
    primaryIssue = "depth";
  } else if (fanOutPercent > 40) {
    primaryIssue = "fanout";
  } else if (adapterPercent > 50) {
    primaryIssue = "size";
  } else {
    primaryIssue = "balanced";
  }

  // Generate recommendations based on breakdown
  const recommendations: string[] = [];

  if (breakdown.maxDepth >= INSPECTION_CONFIG.DEPTH_WARNING_THRESHOLD) {
    recommendations.push(
      `CRITICAL: Depth (${breakdown.maxDepth}) approaching compile-time detection limit (${INSPECTION_CONFIG.DEFAULT_MAX_DEPTH}).`
    );
    recommendations.push("Consider restructuring to reduce dependency chain depth.");
    recommendations.push("Use intermediate facades or aggregation services to flatten chains.");
  }

  if (breakdown.averageFanOut > 3) {
    recommendations.push(
      `High fan-out detected (avg: ${breakdown.averageFanOut.toFixed(2)} deps per adapter).`
    );
    recommendations.push("Consider introducing intermediate abstractions to reduce coupling.");
    recommendations.push("Use the Facade pattern to group related dependencies.");
  }

  if (breakdown.adapterCount > 50 && breakdown.totalScore > 100) {
    recommendations.push(`Large graph (${breakdown.adapterCount} adapters) with high complexity.`);
    recommendations.push("Consider splitting into multiple smaller graphs or modules.");
    recommendations.push("Use lazy loading for optional features.");
  }

  if (primaryIssue === "balanced" && breakdown.totalScore < 50) {
    recommendations.push("Graph complexity is well-balanced and within safe limits.");
  }

  // Determine severity
  let severity: "low" | "medium" | "high";
  if (breakdown.totalScore <= INSPECTION_CONFIG.PERFORMANCE_THRESHOLDS.low) {
    severity = "low";
  } else if (breakdown.totalScore <= INSPECTION_CONFIG.PERFORMANCE_THRESHOLDS.medium) {
    severity = "medium";
  } else {
    severity = "high";
  }

  return { primaryIssue, recommendations, severity };
}

// Example 1: Deep dependency chain
const deepChainGraph = {
  Controller: ["Service"],
  Service: ["Repository"],
  Repository: ["Database"],
  Database: ["ConnectionPool"],
  ConnectionPool: ["ConfigManager"],
  ConfigManager: ["EnvLoader"],
  EnvLoader: [],
};

const deepBreakdown = computeTypeComplexity(7, 6, deepChainGraph);
const deepAnalysis = analyzeComplexity(deepBreakdown);

console.log("=== Deep Chain Analysis ===");
console.log("Breakdown:", {
  totalScore: deepBreakdown.totalScore,
  depth: `${deepBreakdown.maxDepth} (contributes ${deepBreakdown.depthContribution} points)`,
  fanOut: `${deepBreakdown.averageFanOut.toFixed(2)} avg (contributes ${deepBreakdown.fanOutContribution} points)`,
  adapters: `${deepBreakdown.adapterCount} (contributes ${deepBreakdown.adapterContribution} points)`,
});
console.log("Analysis:", deepAnalysis);
console.log();

// Example 2: High fan-out graph
const fanOutGraph = {
  AppController: ["AuthService", "UserService", "LogService", "CacheService", "MetricsService"],
  AuthService: ["Database", "TokenManager", "CryptoService"],
  UserService: ["Database", "CacheService", "ValidationService"],
  LogService: ["FileSystem", "CloudLogger"],
  CacheService: ["RedisClient"],
  MetricsService: ["PrometheusClient", "StatsD"],
  Database: [],
  TokenManager: [],
  CryptoService: [],
  ValidationService: [],
  FileSystem: [],
  CloudLogger: [],
  RedisClient: [],
  PrometheusClient: [],
  StatsD: [],
};

const fanOutBreakdown = computeTypeComplexity(15, 3, fanOutGraph);
const fanOutAnalysis = analyzeComplexity(fanOutBreakdown);

console.log("=== High Fan-Out Analysis ===");
console.log("Breakdown:", {
  totalScore: fanOutBreakdown.totalScore,
  depth: `${fanOutBreakdown.maxDepth} (contributes ${fanOutBreakdown.depthContribution} points)`,
  fanOut: `${fanOutBreakdown.averageFanOut.toFixed(2)} avg (contributes ${fanOutBreakdown.fanOutContribution} points)`,
  adapters: `${fanOutBreakdown.adapterCount} (contributes ${fanOutBreakdown.adapterContribution} points)`,
  totalEdges: fanOutBreakdown.totalEdges,
});
console.log("Analysis:", fanOutAnalysis);
console.log();

// Example 3: Balanced graph
const balancedGraph = {
  API: ["AuthService", "DataService"],
  AuthService: ["TokenStore"],
  DataService: ["Database"],
  TokenStore: [],
  Database: [],
};

const balancedBreakdown = computeTypeComplexity(5, 2, balancedGraph);
const balancedAnalysis = analyzeComplexity(balancedBreakdown);

console.log("=== Balanced Graph Analysis ===");
console.log("Breakdown:", {
  totalScore: balancedBreakdown.totalScore,
  depth: `${balancedBreakdown.maxDepth} (contributes ${balancedBreakdown.depthContribution} points)`,
  fanOut: `${balancedBreakdown.averageFanOut.toFixed(2)} avg (contributes ${balancedBreakdown.fanOutContribution} points)`,
  adapters: `${balancedBreakdown.adapterCount} (contributes ${balancedBreakdown.adapterContribution} points)`,
});
console.log("Analysis:", balancedAnalysis);

/**
 * Benefits for AI Agents:
 *
 * 1. **Explicit Metrics**: Each contribution is quantified, making it clear
 *    what's driving complexity.
 *
 * 2. **Actionable Thresholds**: Constants like DEPTH_WARNING_THRESHOLD provide
 *    clear decision points for recommendations.
 *
 * 3. **Deterministic Analysis**: Same inputs always produce same outputs,
 *    reducing hallucination risk.
 *
 * 4. **Structured Output**: The breakdown interface ensures all necessary
 *    data is available for analysis.
 *
 * 5. **Traceable Calculations**: Each contribution can be verified against
 *    the documented formula.
 */
