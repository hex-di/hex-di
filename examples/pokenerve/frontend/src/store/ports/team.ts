/**
 * Team state port.
 *
 * Manages the active team of up to 6 Pokemon (stored as IDs).
 *
 * @packageDocumentation
 */

import { createStatePort } from "@hex-di/store";

interface TeamState {
  readonly members: readonly number[];
}

type TeamActions = {
  readonly add: (state: TeamState, id: number) => TeamState;
  readonly remove: (state: TeamState, id: number) => TeamState;
  readonly reorder: (state: TeamState, members: readonly number[]) => TeamState;
  readonly clear: (state: TeamState) => TeamState;
};

const TeamPort = createStatePort<TeamState, TeamActions>()({
  name: "Team",
  description: "Active team of up to 6 Pokemon",
  category: "store",
});

export { TeamPort };
export type { TeamState, TeamActions };
