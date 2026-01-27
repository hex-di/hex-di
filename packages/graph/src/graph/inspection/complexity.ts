/**
 * Type Complexity and Performance Analysis.
 *
 * This module provides utilities for computing type complexity scores
 * and performance recommendations for dependency graphs.
 *
 * ## Configuration Values
 *
 * **DEFAULT_MAX_DEPTH (50):**
 * - Maximum chain depth before type-level cycle detection may have false negatives
 * - Based on typical application complexity and TypeScript's type recursion limits
 * - Higher values may cause IDE slowdown
 *
 * **DEPTH_WARNING_THRESHOLD (40):**
 * - 80% of max depth triggers "approaching limit" warning
 * - Gives users early warning with actionable guidance
 *
 * **DEPTH_WEIGHT (2):**
 * - Multiplier for depth^2 contribution to complexity score
 * - High value because type-level cycle detection is O(depth^2)
 *
 * **FANOUT_WEIGHT (0.5):**
 * - Multiplier for fan-out contribution to complexity score
 * - Moderate value since fan-out has linear impact per adapter
 *
 * **Performance Thresholds:**
 * - `low` (50): Safe for all applications
 * - `medium` (100): Monitor for slowdowns in large graphs
 * - Above 100: Consider splitting into multiple graphs
 *
 * ## Complexity Score Formula
 *
 * `adapterCount + maxDepth² × DEPTH_WEIGHT + avgFanOut × adapterCount × FANOUT_WEIGHT`
 *
 * - Weights depth heavily (quadratic) because deep chains are expensive
 * - Fan-out scales with adapter count (more adapters = more impact)
 *
 * @packageDocumentation
 */

/**
 * Inspection configuration constants.
 *
 * These values control warning thresholds and performance recommendations.
 */
export const INSPECTION_CONFIG = {
  /**
   * Default maximum depth for type-level cycle detection.
   * Matches the DefaultMaxDepth in validation/cycle/depth.ts.
   */
  DEFAULT_MAX_DEPTH: 50,

  /**
   * Threshold for depth warning. When maxChainDepth reaches this value,
   * a warning is generated to alert users that compile-time detection limits
   * are approaching.
   *
   * Set to 40 (80% of default MaxDepth of 50) to give users early warning.
   */
  DEPTH_WARNING_THRESHOLD: 40,

  /**
   * Weight for depth contribution in complexity formula.
   *
   * The formula applies depth^2 × DEPTH_WEIGHT because:
   * - Type-level cycle detection is O(depth^2)
   * - Deep chains compound TypeScript's type instantiation cost
   *
   * Value of 2 means depth has significant quadratic impact on complexity.
   */
  DEPTH_WEIGHT: 2,

  /**
   * Weight for fan-out contribution in complexity formula.
   *
   * The formula applies avgFanOut × adapterCount × FANOUT_WEIGHT because:
   * - More dependencies mean more type intersections to compute
   * - Impact scales with total graph size
   *
   * Value of 0.5 means fan-out has moderate linear impact per adapter.
   */
  FANOUT_WEIGHT: 0.5,

  /**
   * Performance score thresholds for recommendations.
   */
  PERFORMANCE_THRESHOLDS: {
    /** Score at or below this is "safe" */
    low: 50,
    /** Score between low and medium is "monitor" */
    medium: 100,
    /** Score above medium is "consider-splitting" */
  },
} as const;

/**
 * Breakdown of individual contributions to the complexity score.
 *
 * This provides transparency into what's driving the complexity,
 * helping developers understand where to focus optimization efforts.
 */
export interface ComplexityBreakdown {
  /** Total complexity score (sum of all contributions) */
  readonly totalScore: number;

  /** Number of adapters in the graph */
  readonly adapterCount: number;

  /** Contribution from adapter count (equal to adapterCount) */
  readonly adapterContribution: number;

  /** Maximum dependency chain depth */
  readonly maxDepth: number;

  /** Contribution from depth (depth² × DEPTH_WEIGHT) */
  readonly depthContribution: number;

  /** Average dependencies per adapter */
  readonly averageFanOut: number;

  /** Contribution from fan-out (avgFanOut × adapterCount × FANOUT_WEIGHT) */
  readonly fanOutContribution: number;

  /** Total number of dependency edges */
  readonly totalEdges: number;
}

/**
 * Computes detailed type complexity breakdown for performance monitoring.
 *
 * Returns a structured breakdown showing:
 * - Individual contributions from adapters, depth, and fan-out
 * - Raw metrics (adapter count, max depth, average fan-out)
 * - Total complexity score
 *
 * This is useful for understanding what's driving complexity and
 * where to focus optimization efforts.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param adapterCount - Number of adapters
 * @param maxDepth - Maximum dependency chain depth
 * @param dependencyMap - Map of port name to its dependencies
 * @returns Complexity breakdown with individual contributions
 *
 * @example Understanding complexity drivers
 * ```typescript
 * const breakdown = computeTypeComplexity(10, 5, dependencyMap);
 * console.log(`Depth contribution: ${breakdown.depthContribution}`);
 * // If depth contribution is high, consider restructuring to reduce chain depth
 * ```
 */
export function computeTypeComplexity(
  adapterCount: number,
  maxDepth: number,
  dependencyMap: Record<string, readonly string[]>
): ComplexityBreakdown {
  if (adapterCount === 0) {
    return {
      totalScore: 0,
      adapterCount: 0,
      adapterContribution: 0,
      maxDepth: 0,
      depthContribution: 0,
      averageFanOut: 0,
      fanOutContribution: 0,
      totalEdges: 0,
    };
  }

  // Count total edges
  let totalEdges = 0;
  for (const deps of Object.values(dependencyMap)) {
    totalEdges += deps.length;
  }

  const averageFanOut = totalEdges / adapterCount;

  // Individual contributions
  const adapterContribution = adapterCount;
  const depthContribution = maxDepth * maxDepth * INSPECTION_CONFIG.DEPTH_WEIGHT;
  const fanOutContribution = averageFanOut * adapterCount * INSPECTION_CONFIG.FANOUT_WEIGHT;

  // Total score
  const totalScore = Math.round(adapterContribution + depthContribution + fanOutContribution);

  return {
    totalScore,
    adapterCount,
    adapterContribution,
    maxDepth,
    depthContribution,
    averageFanOut,
    fanOutContribution,
    totalEdges,
  };
}

/**
 * Computes type complexity score for performance monitoring.
 *
 * The score is a heuristic based on:
 * - Number of adapters (linear impact)
 * - Maximum dependency chain depth (quadratic impact due to type recursion)
 * - Average fan-out (dependencies per adapter)
 *
 * For detailed breakdown of individual contributions, use `computeTypeComplexity()`.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param adapterCount - Number of adapters
 * @param maxDepth - Maximum dependency chain depth
 * @param dependencyMap - Map of port name to its dependencies
 * @returns Complexity score
 *
 * @internal
 */
export function computeTypeComplexityScore(
  adapterCount: number,
  maxDepth: number,
  dependencyMap: Record<string, readonly string[]>
): number {
  return computeTypeComplexity(adapterCount, maxDepth, dependencyMap).totalScore;
}

/**
 * Determines performance recommendation based on complexity score.
 *
 * @pure Same inputs always produce the same output.
 *
 * @param score - The computed complexity score
 * @returns Performance recommendation
 *
 * @internal
 */
export function getPerformanceRecommendation(
  score: number
): "safe" | "monitor" | "consider-splitting" {
  if (score <= INSPECTION_CONFIG.PERFORMANCE_THRESHOLDS.low) return "safe";
  if (score <= INSPECTION_CONFIG.PERFORMANCE_THRESHOLDS.medium) return "monitor";
  return "consider-splitting";
}
