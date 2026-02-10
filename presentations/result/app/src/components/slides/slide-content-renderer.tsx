import { Appear } from "spectacle";
import { motion } from "motion/react";
import type { SlideContent } from "../../content/types.js";
import { CodeBlock } from "../code/code-block.js";
import styles from "./slide-content-renderer.module.css";

interface SlideContentRendererProps {
  readonly content: SlideContent;
}

export function SlideContentRenderer({ content }: SlideContentRendererProps): React.JSX.Element {
  switch (content._tag) {
    case "text":
      return <p className={styles.text}>{content.body}</p>;

    case "bullets":
      return (
        <ul className={styles.bullets}>
          {content.items.map((item, i) => (
            <Appear key={i}>
              <motion.li
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={item.emphasis ? styles.bulletEmphasis : styles.bullet}
              >
                {item.text}
              </motion.li>
            </Appear>
          ))}
        </ul>
      );

    case "code":
      return (
        <CodeBlock
          code={content.content.code}
          language={content.content.language}
          filename={content.content.filename}
          highlights={content.content.highlights}
          annotations={content.content.annotations}
        />
      );

    case "comparison":
      return <div className={styles.comparisonNote}>Comparison: {content.content.exampleId}</div>;

    case "diagram":
      return <div className={styles.diagramPlaceholder}>[{content.diagramId} diagram]</div>;

    case "mixed":
      return (
        <div className={styles.mixed}>
          {content.sections.map((section, i) => (
            <SlideContentRenderer key={i} content={section} />
          ))}
        </div>
      );
  }
}
