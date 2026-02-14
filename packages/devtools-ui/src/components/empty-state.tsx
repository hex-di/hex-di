/**
 * EmptyState component for displaying "no data" messages.
 *
 * @packageDocumentation
 */

interface EmptyStateProps {
  readonly message: string;
  readonly icon?: string;
  readonly description?: string;
}

/**
 * EmptyState renders a centered message with an optional icon,
 * used when panels have no data to display.
 */
function EmptyState({
  message,
  icon = "\u23F3",
  description,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      data-testid="empty-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--hex-space-xl)",
        color: "var(--hex-text-muted)",
        fontFamily: "var(--hex-font-sans)",
        textAlign: "center",
        height: "100%",
        minHeight: "200px",
        lineHeight: "var(--hex-line-height-normal)",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "var(--hex-radius-lg)",
          backgroundColor: "var(--hex-bg-secondary)",
          border: "1px solid var(--hex-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "var(--hex-space-lg)",
        }}
      >
        <span style={{ fontSize: "28px" }} aria-hidden="true">
          {icon}
        </span>
      </div>
      <span
        style={{
          fontSize: "var(--hex-font-size-md)",
          fontWeight: "var(--hex-font-weight-medium)",
          color: "var(--hex-text-secondary)",
        }}
      >
        {message}
      </span>
      {description !== undefined && (
        <span
          style={{
            fontSize: "var(--hex-font-size-sm)",
            marginTop: "var(--hex-space-xs)",
            color: "var(--hex-text-muted)",
            maxWidth: "360px",
          }}
        >
          {description}
        </span>
      )}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
