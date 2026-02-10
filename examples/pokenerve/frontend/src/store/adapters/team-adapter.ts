/**
 * Team state adapter.
 *
 * Manages a team of up to 6 Pokemon. Actions enforce the cap
 * and prevent duplicates.
 *
 * @packageDocumentation
 */

import { createStateAdapter } from "@hex-di/store";
import { TeamPort } from "../ports/team.js";
import type { TeamState } from "../ports/team.js";

const MAX_TEAM_SIZE = 6;

const teamAdapter = createStateAdapter({
  provides: TeamPort,
  lifetime: "singleton",
  initial: {
    members: [],
  },
  actions: {
    add: (state: TeamState, id: number): TeamState => {
      if (state.members.length >= MAX_TEAM_SIZE) return state;
      if (state.members.includes(id)) return state;
      return { ...state, members: [...state.members, id] };
    },
    remove: (state: TeamState, id: number): TeamState => ({
      ...state,
      members: state.members.filter(pid => pid !== id),
    }),
    reorder: (state: TeamState, members: readonly number[]): TeamState => ({
      ...state,
      members,
    }),
    clear: (): TeamState => ({
      members: [],
    }),
  },
});

export { teamAdapter };
