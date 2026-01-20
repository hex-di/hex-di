/**
 * PluginErrorBoundary Component
 *
 * Error boundary specifically for DevTools plugins. Catches errors in plugin
 * components and displays a fallback UI instead of crashing the entire DevTools.
 *
 * @packageDocumentation
 */

import React, { Component, type ReactNode, type ErrorInfo, type ReactElement } from "react";
import type { CSSProperties } from "react";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the PluginErrorBoundary component.
 */
export interface PluginErrorBoundaryProps {
  /** The plugin ID for error messages */
  readonly pluginId: string;
  /** The plugin label for display */
  readonly pluginLabel: string;
  /** Child components to render */
  readonly children: ReactNode;
  /** Optional callback when an error occurs */
  readonly onError?: (error: Error, pluginId: string) => void;
}

/**
 * State for the error boundary.
 */
interface PluginErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

// =============================================================================
// Styles
// =============================================================================

const errorBoundaryStyles: {
  readonly container: CSSProperties;
  readonly title: CSSProperties;
  readonly message: CSSProperties;
  readonly details: CSSProperties;
  readonly retryButton: CSSProperties;
} = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    gap: "12px",
    color: "var(--hex-devtools-text-error, #f38ba8)",
    backgroundColor: "var(--hex-devtools-bg-error, rgba(243, 139, 168, 0.1))",
    borderRadius: "8px",
    margin: "8px",
    minHeight: "200px",
  },
  title: {
    fontSize: "16px",
    fontWeight: 600,
    margin: 0,
  },
  message: {
    fontSize: "14px",
    color: "var(--hex-devtools-text-secondary, #a6adc8)",
    textAlign: "center",
    margin: 0,
    maxWidth: "400px",
  },
  details: {
    fontSize: "12px",
    fontFamily: "monospace",
    color: "var(--hex-devtools-text-muted, #6c7086)",
    backgroundColor: "var(--hex-devtools-bg-tertiary, #1e1e2e)",
    padding: "8px 12px",
    borderRadius: "4px",
    maxWidth: "100%",
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  retryButton: {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--hex-devtools-text-primary, #cdd6f4)",
    backgroundColor: "var(--hex-devtools-bg-secondary, #313244)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Error boundary for DevTools plugins.
 *
 * Catches JavaScript errors in child component tree and displays a fallback UI.
 * Prevents plugin errors from crashing the entire DevTools panel.
 *
 * @example
 * ```tsx
 * <PluginErrorBoundary pluginId="graph" pluginLabel="Graph">
 *   <GraphPluginContent {...props} />
 * </PluginErrorBoundary>
 * ```
 */
export class PluginErrorBoundary extends Component<
  PluginErrorBoundaryProps,
  PluginErrorBoundaryState
> {
  constructor(props: PluginErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PluginErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
      console.error(
        `[DevTools] Plugin "${this.props.pluginId}" crashed:`,
        error,
        errorInfo.componentStack
      );
    }

    // Call optional error callback
    this.props.onError?.(error, this.props.pluginId);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { pluginLabel } = this.props;
      const errorMessage = this.state.error?.message ?? "Unknown error";

      return (
        <div style={errorBoundaryStyles.container}>
          <h3 style={errorBoundaryStyles.title}>Plugin Error</h3>
          <p style={errorBoundaryStyles.message}>
            The {pluginLabel} plugin encountered an error and could not render.
          </p>
          <code style={errorBoundaryStyles.details}>{errorMessage}</code>
          <button style={errorBoundaryStyles.retryButton} onClick={this.handleRetry} type="button">
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component that provides error boundary with plugin context.
 *
 * Use this when you need to wrap plugin content with an error boundary
 * but want to maintain functional component patterns.
 */
export function withPluginErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  pluginId: string,
  pluginLabel: string
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props: P): ReactElement => {
    return (
      <PluginErrorBoundary pluginId={pluginId} pluginLabel={pluginLabel}>
        <WrappedComponent {...props} />
      </PluginErrorBoundary>
    );
  };

  WithErrorBoundary.displayName = `WithPluginErrorBoundary(${pluginId})`;
  return WithErrorBoundary;
}
