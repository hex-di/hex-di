/**
 * Team power derived adapter.
 *
 * Computes aggregated BST statistics from the team state.
 *
 * @packageDocumentation
 */

import { createDerivedAdapter } from "@hex-di/store";
import { TeamPort } from "../ports/team.js";
import { TeamPowerPort } from "../ports/team-power.js";
import { getBaseStatTotal } from "../utils/type-coverage-calc.js";

const teamPowerAdapter = createDerivedAdapter({
  provides: TeamPowerPort,
  requires: [TeamPort],
  select: deps => {
    const members = deps.Team.state.members;
    const totalBst = members.reduce((sum, id) => sum + getBaseStatTotal(id), 0);
    const memberCount = members.length;
    const averageBst = memberCount > 0 ? Math.round(totalBst / memberCount) : 0;
    return { totalBst, averageBst, memberCount };
  },
});

export { teamPowerAdapter };
