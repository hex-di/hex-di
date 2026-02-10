/**
 * Type coverage derived adapter.
 *
 * Computes type coverage from the team state using the type chart data.
 *
 * @packageDocumentation
 */

import { createDerivedAdapter } from "@hex-di/store";
import { TeamPort } from "../ports/team.js";
import { TypeCoveragePort } from "../ports/type-coverage.js";
import {
  computeCoveredTypes,
  computeWeakTypes,
  computeUncoveredTypes,
  computeCoveragePercentage,
} from "../utils/type-coverage-calc.js";

const typeCoverageAdapter = createDerivedAdapter({
  provides: TypeCoveragePort,
  requires: [TeamPort],
  select: deps => {
    const members = deps.Team.state.members;
    const coveredTypes = computeCoveredTypes(members);
    const weakTypes = computeWeakTypes(members);
    const uncoveredTypes = computeUncoveredTypes(coveredTypes);
    const coveragePercentage = computeCoveragePercentage(coveredTypes);
    return { coveredTypes, weakTypes, uncoveredTypes, coveragePercentage };
  },
});

export { typeCoverageAdapter };
