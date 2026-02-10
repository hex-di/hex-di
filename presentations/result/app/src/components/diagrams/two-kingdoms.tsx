import styles from "./two-kingdoms.module.css";

interface UseCase {
  readonly icon: string;
  readonly text: string;
}

const THROW_CASES: readonly UseCase[] = [
  { icon: "🐛", text: "Programmer mistakes — invariant violations, impossible states" },
  { icon: "🏗️", text: "Framework requirements — NestJS filters, React error boundaries" },
  { icon: "💣", text: "Fatal conditions — out of memory, missing config at startup" },
];

const RESULT_CASES: readonly UseCase[] = [
  { icon: "👤", text: "Valid user input can cause this error — form validation, bad IDs" },
  { icon: "🔀", text: "Caller needs to handle each failure mode differently" },
  { icon: "🔗", text: "Error must compose across multiple operations in a pipeline" },
];

export function TwoKingdoms(): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.kingdomThrow}>
        <span className={styles.kingdomTitle} style={{ color: "#d72b3f", borderColor: "#d72b3f" }}>
          throw
        </span>
        <ul className={styles.useCaseList}>
          {THROW_CASES.map(uc => (
            <li key={uc.text} className={styles.useCase}>
              <span className={styles.useCaseIcon}>{uc.icon}</span>
              <span>{uc.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.bridge}>
        <div className={styles.bridgeLine} />
        <span className={styles.bridgeLabel}>boundary</span>
        <div className={styles.bridgeLine} />
      </div>

      <div className={styles.kingdomResult}>
        <span className={styles.kingdomTitle} style={{ color: "#079455", borderColor: "#079455" }}>
          {"Result<T, E>"}
        </span>
        <ul className={styles.useCaseList}>
          {RESULT_CASES.map(uc => (
            <li key={uc.text} className={styles.useCase}>
              <span className={styles.useCaseIcon}>{uc.icon}</span>
              <span>{uc.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
