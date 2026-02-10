import { motion } from "motion/react";
import type { SlideDefinition } from "../../content/types.js";
import { SlideContentRenderer } from "./slide-content-renderer.js";
import styles from "./content-slide.module.css";

interface ContentSlideProps {
  readonly slide: SlideDefinition;
}

export function ContentSlide({ slide }: ContentSlideProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <motion.h2
          className={styles.title}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {slide.title}
        </motion.h2>
        {slide.content && (
          <div className={styles.body}>
            <SlideContentRenderer content={slide.content} />
          </div>
        )}
      </div>
    </div>
  );
}
