import styles from "./language-comparison.module.css";

interface LanguageCard {
  readonly language: string;
  readonly syntax: string;
  readonly status: string;
  readonly highlight?: boolean;
  readonly badge?: string;
}

const LANGUAGES: readonly LanguageCard[] = [
  {
    language: "Rust",
    syntax: "Result<T, E>",
    status: "Built-in",
  },
  {
    language: "Go",
    syntax: "value, err := fn()",
    status: "Convention",
  },
  {
    language: "Haskell",
    syntax: "Either a b",
    status: "Built-in",
  },
  {
    language: "TypeScript",
    syntax: "Result<T, E>",
    status: "@hex-di/result",
    highlight: true,
    badge: "now!",
  },
];

export function LanguageComparison(): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {LANGUAGES.map(lang => (
          <div key={lang.language} className={lang.highlight ? styles.cardHighlight : styles.card}>
            {lang.badge && <span className={styles.badge}>{lang.badge}</span>}
            <div className={styles.header}>
              <span className={styles.language}>{lang.language}</span>
              <span className={styles.status}>{lang.status}</span>
            </div>
            <code className={styles.syntax}>{lang.syntax}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
