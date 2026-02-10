import styles from "./failure-cascade.module.css";

interface PanelData {
  readonly emoji: string;
  readonly title: string;
  readonly description: string;
  readonly color: string;
  readonly bgTint: string;
}

const PANELS: readonly PanelData[] = [
  {
    emoji: "💥",
    title: "White Screen",
    description: "The user sees nothing. The app crashes silently. No feedback, no recovery path.",
    color: "#d72b3f",
    bgTint: "rgba(215, 43, 63, 0.08)",
  },
  {
    emoji: "🕳️",
    title: "Logging Void",
    description:
      "The error is logged somewhere — maybe. Console.error in production. No alerts, no dashboards.",
    color: "#ee7404",
    bgTint: "rgba(238, 116, 4, 0.08)",
  },
  {
    emoji: "❓",
    title: "Unknown Cause",
    description:
      "Nobody knows why it happened. The error message says 'Something went wrong.' Good luck debugging.",
    color: "#1570ef",
    bgTint: "rgba(21, 112, 239, 0.08)",
  },
];

export function FailureCascade(): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {PANELS.map(panel => (
          <div key={panel.title} className={styles.panel} style={{ background: panel.bgTint }}>
            <span className={styles.icon} style={{ background: panel.color }}>
              {panel.emoji}
            </span>
            <span className={styles.title}>{panel.title}</span>
            <span className={styles.description}>{panel.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
