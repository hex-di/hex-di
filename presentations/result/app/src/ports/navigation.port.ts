import { createAtomPort } from "@hex-di/store";
import { createFlowPort } from "@hex-di/flow";

// =============================================================================
// Slide Position (Store Atom)
// =============================================================================

export const CurrentSlideAtom = createAtomPort<number>()({
  name: "CurrentSlide",
  description: "Current slide index (1-based)",
  category: "presentation",
});

// =============================================================================
// Presentation Mode (Flow State Machine)
// =============================================================================

export type PresentationMode = "presenting" | "overview" | "presenterNotes";

export type PresentationEvent = "OPEN_OVERVIEW" | "CLOSE_OVERVIEW" | "TOGGLE_NOTES" | "CLOSE_NOTES";

export interface PresentationModeContext {
  readonly lastTransition: string;
}

export const PresentationModePort = createFlowPort<
  PresentationMode,
  PresentationEvent,
  PresentationModeContext
>("PresentationMode");
