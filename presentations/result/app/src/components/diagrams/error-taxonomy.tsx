import styles from "./error-taxonomy.module.css";

interface CategoryData {
  readonly name: string;
  readonly icon: string;
  readonly color: string;
  readonly bgTint: string;
  readonly borderColor: string;
  readonly count: number;
  readonly leaves: readonly string[];
}

const CATEGORIES: readonly CategoryData[] = [
  {
    name: "Silent Failures",
    icon: "🔇",
    color: "#d72b3f",
    bgTint: "rgba(215, 43, 63, 0.06)",
    borderColor: "#d72b3f",
    count: 257,
    leaves: [".catch(() => null)", "empty catch blocks", "console.error only", "return false/null"],
  },
  {
    name: "Type Erasure",
    icon: "🎭",
    color: "#b54708",
    bgTint: "rgba(181, 71, 8, 0.06)",
    borderColor: "#b54708",
    count: 134,
    leaves: ["(err as Error)", "as unknown", "instanceof checks", "catch(e: any)"],
  },
  {
    name: "Lost Context",
    icon: "🕳️",
    color: "#7a00e6",
    bgTint: "rgba(122, 0, 230, 0.06)",
    borderColor: "#7a00e6",
    count: 797,
    leaves: [
      'throw new Error("msg")',
      "generic Error class",
      "string messages only",
      "no structured data",
    ],
  },
  {
    name: "Inconsistent Contracts",
    icon: "📋",
    color: "#1570ef",
    bgTint: "rgba(21, 112, 239, 0.06)",
    borderColor: "#1570ef",
    count: 595,
    leaves: [
      "try/catch at every call site",
      "boolean + error returns",
      "callback onError",
      "mixed Promise patterns",
    ],
  },
];

const SUMMARY_STATS = [
  { number: "797", label: "throws" },
  { number: "595", label: "catches" },
  { number: "257", label: "silent failures" },
  { number: "134", label: "unsafe casts" },
];

export function ErrorTaxonomy(): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.summary}>
        {SUMMARY_STATS.map(stat => (
          <div key={stat.label} className={styles.summaryCard}>
            <span className={styles.summaryNumber}>{stat.number}</span>
            <span className={styles.summaryLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.tree}>
        {CATEGORIES.map(cat => (
          <div key={cat.name} className={styles.category} style={{ background: cat.bgTint }}>
            <div className={styles.categoryHeader}>
              <span className={styles.categoryIcon} style={{ background: cat.color }}>
                {cat.icon}
              </span>
              <span className={styles.categoryName}>{cat.name}</span>
              <span className={styles.categoryCount}>{cat.count}</span>
            </div>
            <ul className={styles.leafList}>
              {cat.leaves.map(leaf => (
                <li key={leaf} className={styles.leaf} style={{ borderLeftColor: cat.borderColor }}>
                  {leaf}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
