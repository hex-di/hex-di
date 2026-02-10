import { useCallback } from "react";
import { useAtom } from "@hex-di/store-react";
import { useMachine } from "@hex-di/flow-react";
import {
  CurrentSlideAtom,
  PresentationModePort,
  type PresentationMode,
} from "../ports/navigation.port.js";
import { getActForSlide, type Act } from "../content/types.js";

export interface NavigationState {
  readonly currentSlide: number;
  readonly currentAct: Act;
  readonly mode: PresentationMode;
  openOverview(): void;
  closeOverview(): void;
  toggleNotes(): void;
  closeNotes(): void;
  closeAllPanels(): void;
}

/**
 * Navigation state hook.
 *
 * Spectacle owns slide navigation (next/previous/goTo via arrow keys and fragments).
 * This hook only exposes the current slide position (bridged from Spectacle via DeckBridge)
 * and the overlay mode state machine (overview grid, presenter notes) that Spectacle
 * does not manage.
 */
export function useNavigation(): NavigationState {
  const [currentSlide] = useAtom(CurrentSlideAtom);
  const { state: mode, send } = useMachine(PresentationModePort);

  const openOverview = useCallback(() => {
    send({ type: "OPEN_OVERVIEW" });
  }, [send]);

  const closeOverview = useCallback(() => {
    send({ type: "CLOSE_OVERVIEW" });
  }, [send]);

  const toggleNotes = useCallback(() => {
    send({ type: "TOGGLE_NOTES" });
  }, [send]);

  const closeNotes = useCallback(() => {
    send({ type: "CLOSE_NOTES" });
  }, [send]);

  const closeAllPanels = useCallback(() => {
    if (mode === "overview") {
      send({ type: "CLOSE_OVERVIEW" });
    } else if (mode === "presenterNotes") {
      send({ type: "CLOSE_NOTES" });
    }
  }, [mode, send]);

  return {
    currentSlide,
    currentAct: getActForSlide(currentSlide),
    mode,
    openOverview,
    closeOverview,
    toggleNotes,
    closeNotes,
    closeAllPanels,
  };
}
