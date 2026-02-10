/**
 * Trainer profile state port.
 *
 * Manages the trainer's identity (name, avatar, join date).
 *
 * @packageDocumentation
 */

import { createStatePort } from "@hex-di/store";

interface TrainerProfileState {
  readonly name: string;
  readonly avatar: string;
  readonly joinedAt: number;
}

type TrainerProfileActions = {
  readonly setName: (state: TrainerProfileState, name: string) => TrainerProfileState;
  readonly setAvatar: (state: TrainerProfileState, avatar: string) => TrainerProfileState;
};

const TrainerProfilePort = createStatePort<TrainerProfileState, TrainerProfileActions>()({
  name: "TrainerProfile",
  description: "Trainer identity state",
  category: "store",
});

export { TrainerProfilePort };
export type { TrainerProfileState, TrainerProfileActions };
