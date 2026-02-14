/**
 * JsonValue component for rendering a typed JSON value with syntax coloring.
 *
 * @packageDocumentation
 */

interface JsonValueProps {
  readonly value: unknown;
}

/**
 * Returns a color for a given value type.
 */
function getValueColor(value: unknown): string {
  if (typeof value === "string") return "var(--hex-success)";
  if (typeof value === "number") return "var(--hex-info)";
  if (typeof value === "boolean") return "var(--hex-accent)";
  if (value === null || value === undefined) return "var(--hex-text-muted)";
  return "var(--hex-text-primary)";
}

/**
 * Formats a value for display.
 */
function formatValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  return String(value);
}

/**
 * JsonValue renders a single value with syntax-appropriate coloring.
 */
function JsonValue({ value }: JsonValueProps): React.ReactElement {
  const color = getValueColor(value);
  const display = formatValue(value);

  return (
    <span
      data-testid="json-value"
      style={{
        color,
        fontFamily: "var(--hex-font-mono)",
        fontSize: "var(--hex-font-size-sm)",
      }}
    >
      {display}
    </span>
  );
}

export { JsonValue };
export type { JsonValueProps };
