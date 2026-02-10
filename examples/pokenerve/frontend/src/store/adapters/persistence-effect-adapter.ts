/**
 * Persistence effect adapter.
 *
 * Persists team, favorites, and trainer profile to localStorage
 * whenever store actions are dispatched.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { port } from "@hex-di/core";
import { PersistencePort } from "../../ports/storage.js";

// ---------------------------------------------------------------------------
// Port for the effect
// ---------------------------------------------------------------------------

interface PersistenceEffect {
  onAction(event: {
    readonly portName: string;
    readonly actionName: string;
    readonly nextState: unknown;
  }): void;
}

const PersistenceEffectPort = port<PersistenceEffect>()({
  name: "PersistenceEffect",
  description: "Persists store state to localStorage",
  category: "effect",
});

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

const persistenceEffectAdapter = createAdapter({
  provides: PersistenceEffectPort,
  requires: [PersistencePort],
  lifetime: "singleton",
  factory: ({ Persistence }) => {
    return {
      onAction(event: {
        readonly portName: string;
        readonly actionName: string;
        readonly nextState: unknown;
      }): void {
        const { portName, nextState } = event;
        if (portName === "Team" || portName === "TrainerProfile") {
          Persistence.set(`pokenerve:${portName}`, nextState);
        }
      },
    };
  },
});

export { persistenceEffectAdapter, PersistenceEffectPort };
