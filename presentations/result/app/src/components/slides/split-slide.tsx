import { Appear } from "spectacle";
import { motion } from "motion/react";
import type { SlideDefinition } from "../../content/types.js";
import { CodeBlock } from "../code/code-block.js";
import styles from "./split-slide.module.css";

interface SplitSlideProps {
  readonly slide: SlideDefinition;
}

export function SplitSlide({ slide }: SplitSlideProps): React.JSX.Element {
  const comparison = slide.content?._tag === "comparison" ? slide.content : null;

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{slide.title}</h2>
        <div className={styles.columns}>
          <div className={styles.columnBefore}>
            <span className={styles.badgeBefore}>BEFORE</span>
            {comparison && (
              <CodeBlock
                code={comparison.content.before.code}
                language={comparison.content.before.language}
                filename={comparison.content.before.filename}
                highlights={comparison.content.before.highlights}
                annotations={comparison.content.before.annotations}
              />
            )}
          </div>
          <div className={styles.divider} />
          <div className={styles.columnAfter}>
            <Appear>
              <motion.div
                className={styles.afterContent}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <span className={styles.badgeAfter}>AFTER</span>
                {comparison && (
                  <CodeBlock
                    code={comparison.content.after.code}
                    language={comparison.content.after.language}
                    filename={comparison.content.after.filename}
                    highlights={comparison.content.after.highlights}
                    annotations={comparison.content.after.annotations}
                  />
                )}
              </motion.div>
            </Appear>
          </div>
        </div>
      </div>
    </div>
  );
}
