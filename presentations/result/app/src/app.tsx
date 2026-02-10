import { useCallback, useContext, useEffect, useRef } from "react";
import { Deck, Slide, Notes, DeckContext } from "spectacle";
import { useAtom } from "@hex-di/store-react";
import { SlideProgress } from "./components/navigation/slide-progress.js";
import { SlideOverviewGrid } from "./components/panels/slide-overview-grid.js";
import { TitleSlide } from "./components/slides/title-slide.js";
import { ContentSlide } from "./components/slides/content-slide.js";
import { CodeSlide } from "./components/slides/code-slide.js";
import { SplitSlide } from "./components/slides/split-slide.js";
import { ImpactSlide } from "./components/slides/impact-slide.js";
import { DiagramSlide } from "./components/slides/diagram-slide.js";
import { useNavigation } from "./hooks/use-navigation.js";
import { useSlides } from "./hooks/use-slides.js";
import { useTheme } from "./hooks/use-theme.js";
import { spectacleTheme, defaultTransition } from "./theme/spectacle-theme.js";
import { CurrentSlideAtom } from "./ports/navigation.port.js";
import type { SlideDefinition } from "./content/types.js";
import type { ThemeMode } from "./ports/theme.port.js";

const THEME_CYCLE: readonly ThemeMode[] = ["mixed", "light", "dark"];

function nextThemeMode(current: ThemeMode): ThemeMode {
  const idx = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {
      // Fullscreen API not available or exit failed
    });
  } else {
    document.documentElement.requestFullscreen().catch(() => {
      // Fullscreen API not available
    });
  }
}

function SlideContent({ slide }: { readonly slide: SlideDefinition }): React.JSX.Element {
  switch (slide.type) {
    case "title":
      return <TitleSlide slide={slide} />;
    case "content":
      return <ContentSlide slide={slide} />;
    case "code":
      return <CodeSlide slide={slide} />;
    case "split":
      return <SplitSlide slide={slide} />;
    case "impact":
      return <ImpactSlide slide={slide} />;
    case "diagram":
      return <DiagramSlide slide={slide} />;
  }
}

function getSlideBackground(background: SlideDefinition["background"]): string {
  switch (background) {
    case "dark":
      return "#23004c";
    case "light":
      return "#faf5ff";
    case "white":
      return "#ffffff";
  }
}

/**
 * Template component rendered by Spectacle on every slide.
 * It bridges the Spectacle deck state into HexDI's store and renders
 * the progress bar. This runs inside Spectacle's DeckContext.
 */
function DeckTemplate({
  slideNumber,
  numberOfSlides,
}: {
  readonly slideNumber: number;
  readonly numberOfSlides: number;
}): React.JSX.Element {
  const [, setCurrentSlide] = useAtom(CurrentSlideAtom);

  // Bridge: sync Spectacle's 1-based slideNumber to HexDI atom
  useEffect(() => {
    setCurrentSlide(slideNumber);
  }, [slideNumber, setCurrentSlide]);

  return <SlideProgress currentSlide={slideNumber} totalSlides={numberOfSlides} />;
}

export function App(): React.JSX.Element {
  const nav = useNavigation();
  const slides = useSlides();
  const { mode: themeMode, setMode } = useTheme();
  const allSlides = slides.allSlides;
  const skipToRef = useRef<((opts: { slideIndex: number; stepIndex: number }) => void) | undefined>(
    undefined
  );

  // Keyboard handler for non-navigation keys
  // Spectacle handles: arrows, space, enter, backspace, page up/down, fragments
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;

        case "o":
        case "O":
          e.preventDefault();
          if (nav.mode === "overview") {
            nav.closeOverview();
          } else if (nav.mode === "presenting") {
            nav.openOverview();
          }
          break;

        case "d":
        case "D":
          e.preventDefault();
          setMode(nextThemeMode(themeMode));
          break;

        case "Escape":
          if (nav.mode !== "presenting") {
            e.preventDefault();
            nav.closeAllPanels();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nav, themeMode, setMode]);

  const handleOverviewGoTo = useCallback(
    (slideNum: number) => {
      skipToRef.current?.({ slideIndex: slideNum - 1, stepIndex: 0 });
      nav.closeOverview();
    },
    [nav]
  );

  return (
    <div data-theme={themeMode}>
      <Deck
        theme={spectacleTheme}
        template={({ slideNumber, numberOfSlides }) => (
          <DeckTemplate slideNumber={slideNumber} numberOfSlides={numberOfSlides} />
        )}
        transition={defaultTransition}
      >
        {allSlides.map(slide => (
          <Slide
            key={slide.index}
            backgroundColor={getSlideBackground(slide.background)}
            padding={0}
            transition={defaultTransition}
          >
            <SlideContent slide={slide} />
            <Notes>{slide.presenterNotes}</Notes>
          </Slide>
        ))}
        <SkipToCapture skipToRef={skipToRef} />
      </Deck>
      <SlideOverviewGrid
        slides={allSlides}
        currentSlide={nav.currentSlide}
        open={nav.mode === "overview"}
        onGoTo={handleOverviewGoTo}
        onClose={() => nav.closeOverview()}
      />
    </div>
  );
}

/**
 * Captures Spectacle's skipTo function from DeckContext via a ref,
 * making it available to components outside the Deck.
 */
function SkipToCapture({
  skipToRef,
}: {
  readonly skipToRef: React.RefObject<
    ((opts: { slideIndex: number; stepIndex: number }) => void) | undefined
  >;
}): null {
  const deckContext = useContext(DeckContext);
  skipToRef.current = deckContext.skipTo;
  return null;
}
