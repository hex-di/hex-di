import { useEffect, useState } from "react";
import type { CodeAnnotation as CodeAnnotationType } from "../../content/types.js";
import { highlightCode } from "./highlighter.js";
import { CodeAnnotation } from "./code-annotation.js";
import styles from "./code-block.module.css";

interface CodeBlockProps {
  readonly code: string;
  readonly language: string;
  readonly filename?: string;
  readonly highlights?: readonly number[];
  readonly annotations?: readonly CodeAnnotationType[];
  readonly theme?: "sanofi-dark" | "sanofi-light";
}

export function CodeBlock({
  code,
  language,
  filename,
  highlights = [],
  annotations = [],
  theme = "sanofi-dark",
}: CodeBlockProps): React.JSX.Element {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    highlightCode(code, language, theme).then(r => {
      if (!stale) {
        r.match(
          highlighted => setHtml(highlighted),
          () => setHtml(null)
        );
      }
    });
    return () => {
      stale = true;
    };
  }, [code, language, theme]);

  const lines = code.split("\n");

  return (
    <div className={styles.wrapper}>
      {filename && <div className={styles.filename}>{filename}</div>}
      <div className={styles.codeArea}>
        {html ? (
          <div className={styles.highlighted} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className={styles.fallback}>
            <code>
              {lines.map((line, i) => {
                const lineNum = i + 1;
                const isHighlighted = highlights.includes(lineNum);
                const annotation = annotations.find(a => a.line === lineNum);
                return (
                  <div key={i} className={isHighlighted ? styles.lineHighlighted : styles.line}>
                    <span className={styles.lineNumber}>{lineNum}</span>
                    <span className={styles.lineContent}>{line}</span>
                    {annotation && <CodeAnnotation text={annotation.text} type={annotation.type} />}
                  </div>
                );
              })}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
