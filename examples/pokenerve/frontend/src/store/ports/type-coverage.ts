/**
 * Type coverage derived port.
 *
 * Computes type coverage analysis from the TeamPort state:
 * which types the team can hit super-effectively, which types
 * are weaknesses, and overall coverage percentage.
 *
 * @packageDocumentation
 */

import { createDerivedPort } from "@hex-di/store";

interface TypeCoverageValue {
  readonly coveredTypes: readonly string[];
  readonly weakTypes: readonly string[];
  readonly uncoveredTypes: readonly string[];
  readonly coveragePercentage: number;
}

const TypeCoveragePort = createDerivedPort<TypeCoverageValue>()({
  name: "TypeCoverage",
  description: "Team type coverage analysis",
  category: "store",
});

export { TypeCoveragePort };
export type { TypeCoverageValue };
