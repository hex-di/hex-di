import { Appear } from "spectacle";
import { motion } from "motion/react";
import type { SlideDefinition } from "../../content/types.js";
import styles from "./title-slide.module.css";

interface TitleSlideProps {
  readonly slide: SlideDefinition;
}

export function TitleSlide({ slide }: TitleSlideProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {slide.title}
        </motion.h1>
        {slide.subtitle && (
          <Appear>
            <p className={styles.subtitle}>{slide.subtitle}</p>
          </Appear>
        )}
      </div>
    </div>
  );
}
