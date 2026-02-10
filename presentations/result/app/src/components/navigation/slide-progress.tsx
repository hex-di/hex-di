import { useContext, useCallback } from "react";
import { DeckContext } from "spectacle";
import { ACT_BOUNDARIES, TOTAL_SLIDES, type Act } from "../../content/types.js";
import styles from "./slide-progress.module.css";

interface SlideProgressProps {
  readonly currentSlide: number;
  readonly totalSlides: number;
}

const ACT_LABELS: Record<Act, string> = {
  act1: "The Problem",
  act2: "The Solution",
  act3: "The Vision",
};

export function SlideProgress({
  currentSlide,
  totalSlides,
}: SlideProgressProps): React.JSX.Element {
  const deckContext = useContext(DeckContext);

  const goTo = useCallback(
    (slideNum: number) => {
      // Spectacle's skipTo uses 0-based slide indices
      deckContext.skipTo({ slideIndex: slideNum - 1, stepIndex: 0 });
    },
    [deckContext]
  );

  return (
    <div className={styles.bar}>
      <span className={styles.hint} aria-hidden="true">
        arrows / F / O / D
      </span>

      <div className={styles.dots}>
        {(["act1", "act2", "act3"] as const).map(act => {
          const [start, end] = ACT_BOUNDARIES[act];
          return (
            <div key={act} className={styles.actGroup}>
              <span className={styles.actLabel}>{ACT_LABELS[act]}</span>
              <div className={styles.actDots}>
                {Array.from({ length: end - start + 1 }, (_, i) => {
                  const slideNum = start + i;
                  const isCurrent = slideNum === currentSlide;
                  return (
                    <button
                      key={slideNum}
                      className={isCurrent ? styles.dotActive : styles.dot}
                      onClick={() => goTo(slideNum)}
                      aria-label={`Go to slide ${slideNum}`}
                      aria-current={isCurrent ? "step" : undefined}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <span className={styles.counter}>
        {currentSlide}
        <span className={styles.counterSep}>/</span>
        {totalSlides ?? TOTAL_SLIDES}
      </span>
    </div>
  );
}
