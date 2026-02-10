import styles from "./code-annotation.module.css";

interface CodeAnnotationProps {
  readonly text: string;
  readonly type: "error" | "ok" | "info";
}

const TYPE_CLASSES: Record<CodeAnnotationProps["type"], string> = {
  error: styles.error ?? "",
  ok: styles.ok ?? "",
  info: styles.info ?? "",
};

export function CodeAnnotation({ text, type }: CodeAnnotationProps): React.JSX.Element {
  return <span className={`${styles.annotation} ${TYPE_CLASSES[type]}`}>{text}</span>;
}
