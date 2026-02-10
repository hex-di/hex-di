import { Appear } from "spectacle";
import { motion } from "motion/react";
import type { SlideDefinition } from "../../content/types.js";
import styles from "./impact-slide.module.css";

interface ImpactSlideProps {
  readonly slide: SlideDefinition;
}

export function ImpactSlide({ slide }: ImpactSlideProps): React.JSX.Element {
  const subtitleLines = slide.subtitle?.split("\n") ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <motion.h2
          className={styles.title}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {slide.title}
        </motion.h2>
        {subtitleLines.length > 0 && (
          <div className={styles.subtitleContainer}>
            {subtitleLines.map((line, i) => (
              <Appear key={i}>
                <motion.p
                  className={styles.subtitleLine}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.1,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  {line}
                </motion.p>
              </Appear>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
