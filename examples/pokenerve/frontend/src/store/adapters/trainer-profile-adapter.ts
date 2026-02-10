/**
 * Trainer profile state adapter.
 *
 * @packageDocumentation
 */

import { createStateAdapter } from "@hex-di/store";
import { TrainerProfilePort } from "../ports/trainer-profile.js";
import type { TrainerProfileState } from "../ports/trainer-profile.js";

const trainerProfileAdapter = createStateAdapter({
  provides: TrainerProfilePort,
  lifetime: "singleton",
  initial: {
    name: "Researcher",
    avatar: "default",
    joinedAt: Date.now(),
  },
  actions: {
    setName: (state: TrainerProfileState, name: string): TrainerProfileState => ({
      ...state,
      name,
    }),
    setAvatar: (state: TrainerProfileState, avatar: string): TrainerProfileState => ({
      ...state,
      avatar,
    }),
  },
});

export { trainerProfileAdapter };
