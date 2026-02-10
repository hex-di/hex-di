import type { CodeContent } from "../../content/types.js";
import { CodeBlock } from "./code-block.js";
import styles from "./code-comparison.module.css";

interface CodeComparisonProps {
  readonly before: CodeContent;
  readonly after: CodeContent;
}

export function CodeComparison({ before, after }: CodeComparisonProps): React.JSX.Element {
  const beforeLines = before.code.split("\n").length;
  const afterLines = after.code.split("\n").length;

  return (
    <div className={styles.container}>
      <div className={styles.column}>
        <div className={styles.header}>
          <span className={styles.badgeBefore}>BEFORE</span>
        </div>
        <div className={styles.codeWrapper}>
          <CodeBlock
            code={before.code}
            language={before.language}
            filename={before.filename}
            highlights={before.highlights ? [...before.highlights] : undefined}
            annotations={before.annotations ? [...before.annotations] : undefined}
          />
        </div>
        <div className={styles.footer}>{beforeLines} lines</div>
      </div>

      <div className={styles.divider} />

      <div className={styles.column}>
        <div className={styles.header}>
          <span className={styles.badgeAfter}>AFTER</span>
        </div>
        <div className={styles.codeWrapper}>
          <CodeBlock
            code={after.code}
            language={after.language}
            filename={after.filename}
            highlights={after.highlights ? [...after.highlights] : undefined}
            annotations={after.annotations ? [...after.annotations] : undefined}
          />
        </div>
        <div className={styles.footerSuccess}>{afterLines} lines &middot; 0 issues</div>
      </div>
    </div>
  );
}
