/**
 * ErrorBoundary component for isolating panel render errors.
 *
 * Catches errors thrown during rendering and displays a fallback UI
 * instead of crashing the entire application.
 *
 * @packageDocumentation
 */

import { Component } from "react";

interface ErrorBoundaryProps {
  readonly fallback?: React.ReactNode;
  readonly children: React.ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: unknown;
}

/**
 * ErrorBoundary catches render errors in its children and renders
 * a fallback UI. Used to isolate panel failures.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      const errorMessage =
        this.state.error instanceof Error
          ? this.state.error.message
          : "An unexpected error occurred";

      return (
        <div
          data-testid="error-boundary-fallback"
          style={{
            padding: "var(--hex-space-md)",
            border: "1px solid var(--hex-error)",
            borderRadius: "var(--hex-radius-md)",
            backgroundColor: "var(--hex-error-muted)",
            color: "var(--hex-error)",
            fontFamily: "var(--hex-font-sans)",
            fontSize: "var(--hex-font-size-sm)",
          }}
        >
          <strong>Panel Error</strong>
          <p style={{ margin: "var(--hex-space-xs) 0 0" }}>{errorMessage}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
export type { ErrorBoundaryProps };
