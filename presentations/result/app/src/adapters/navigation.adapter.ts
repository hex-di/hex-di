import { createAtomAdapter } from "@hex-di/store";
import { defineMachine, createFlowAdapter } from "@hex-di/flow";
import {
  CurrentSlideAtom,
  PresentationModePort,
  type PresentationModeContext,
} from "../ports/navigation.port.js";

// =============================================================================
// Slide Position Atom (Store)
// =============================================================================

export const currentSlideAdapter = createAtomAdapter({
  provides: CurrentSlideAtom,
  initial: 1,
  lifetime: "singleton",
});

// =============================================================================
// Presentation Mode State Machine (Flow)
// =============================================================================

const presentationModeMachine = defineMachine({
  id: "presentation-mode",
  initial: "presenting",
  context: { lastTransition: "init" },
  states: {
    presenting: {
      on: {
        OPEN_OVERVIEW: {
          target: "overview",
          actions: [(): PresentationModeContext => ({ lastTransition: "open-overview" })],
        },
        TOGGLE_NOTES: {
          target: "presenterNotes",
          actions: [(): PresentationModeContext => ({ lastTransition: "open-notes" })],
        },
      },
    },
    overview: {
      on: {
        CLOSE_OVERVIEW: {
          target: "presenting",
          actions: [(): PresentationModeContext => ({ lastTransition: "close-overview" })],
        },
      },
    },
    presenterNotes: {
      on: {
        TOGGLE_NOTES: {
          target: "presenting",
          actions: [(): PresentationModeContext => ({ lastTransition: "close-notes" })],
        },
        CLOSE_NOTES: {
          target: "presenting",
          actions: [(): PresentationModeContext => ({ lastTransition: "close-notes" })],
        },
      },
    },
  },
});

const flowAdapterResult = createFlowAdapter({
  provides: PresentationModePort,
  requires: [],
  machine: presentationModeMachine,
  lifetime: "singleton",
});

export const presentationModeAdapter = flowAdapterResult.match(
  adapter => adapter,
  error => {
    throw new Error(`PresentationMode FlowAdapter creation failed: ${error._tag}`);
  }
);
