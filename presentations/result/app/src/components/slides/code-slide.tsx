import { motion } from "motion/react";
import type { SlideDefinition } from "../../content/types.js";
import { SlideContentRenderer } from "./slide-content-renderer.js";
import styles from "./code-slide.module.css";

interface CodeSlideProps {
  readonly slide: SlideDefinition;
}

export function CodeSlide({ slide }: CodeSlideProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{slide.title}</h2>
        <motion.div
          className={styles.codeArea}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          {slide.content && <SlideContentRenderer content={slide.content} />}
        </motion.div>
      </div>
    </div>
  );
}
