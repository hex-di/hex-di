/**
 * Team power derived port.
 *
 * Computes aggregated team statistics (total BST, average BST,
 * member count) from the TeamPort state.
 *
 * @packageDocumentation
 */

import { createDerivedPort } from "@hex-di/store";

interface TeamPowerValue {
  readonly totalBst: number;
  readonly averageBst: number;
  readonly memberCount: number;
}

const TeamPowerPort = createDerivedPort<TeamPowerValue>()({
  name: "TeamPower",
  description: "Computed team power statistics",
  category: "store",
});

export { TeamPowerPort };
export type { TeamPowerValue };
