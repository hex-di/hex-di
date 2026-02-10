import { ACT_BOUNDARIES, type Act, type SlideDefinition } from "../../content/types.js";
import styles from "./slide-overview-grid.module.css";

interface SlideOverviewGridProps {
  readonly slides: readonly SlideDefinition[];
  readonly currentSlide: number;
  readonly open: boolean;
  readonly onGoTo: (slide: number) => void;
  readonly onClose: () => void;
}

const ACT_LABELS: Record<Act, string> = {
  act1: "Act 1 -- The Problem",
  act2: "Act 2 -- The Solution",
  act3: "Act 3 -- The Vision",
};

export function SlideOverviewGrid({
  slides,
  currentSlide,
  open,
  onGoTo,
  onClose,
}: SlideOverviewGridProps): React.JSX.Element {
  function handleClick(slideIndex: number): void {
    onGoTo(slideIndex);
    onClose();
  }

  return (
    <div
      className={open ? styles.overlayOpen : styles.overlay}
      role="dialog"
      aria-label="Slide overview"
      aria-hidden={!open}
    >
      <div className={styles.header}>
        <span className={styles.title}>Slide Overview</span>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close overview">
          ESC
        </button>
      </div>

      {(["act1", "act2", "act3"] as const).map(act => {
        const [start, end] = ACT_BOUNDARIES[act];
        const actSlides = slides.filter(s => s.index >= start && s.index <= end);

        return (
          <div key={act} className={styles.actSection}>
            <div className={styles.actLabel}>{ACT_LABELS[act]}</div>
            <div className={styles.grid}>
              {actSlides.map(slide => {
                const isCurrent = slide.index === currentSlide;
                return (
                  <button
                    key={slide.index}
                    className={isCurrent ? styles.thumbnailCurrent : styles.thumbnail}
                    onClick={() => handleClick(slide.index)}
                    aria-label={`Slide ${slide.index}: ${slide.title}`}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <span className={styles.slideNumber}>{slide.index}</span>
                    <span className={styles.slideTitle}>{slide.title}</span>
                    <span className={styles.typeIndicator}>{slide.type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
