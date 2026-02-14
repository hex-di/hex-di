/**
 * Edge state handling and error boundaries for the Result Panel.
 *
 * Spec: 14-integration.md (14.8, 14.9)
 *
 * @packageDocumentation
 */

import { Component, useEffect, useRef, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface ChainEntry {
  readonly id: string;
  readonly label: string;
}

interface TruncatedValue {
  readonly stepIndex: number;
}

// ── EdgeStateHandler ────────────────────────────────────────────────────────

interface EdgeStateHandlerProps {
  readonly chains: readonly ChainEntry[];
  readonly executions?: readonly unknown[];
  readonly hasTracing: boolean;
  readonly activeView?: string;
  readonly connectionStatus: "connected" | "disconnected";
  readonly hasStatistics?: boolean;
  readonly isAsync?: boolean;
  readonly hasCombinator?: boolean;
  readonly operationCount?: number;
  readonly pathCount?: number;
  readonly truncatedValues?: readonly TruncatedValue[];
  readonly valuesNotCaptured?: boolean;
}

function EdgeStateHandler({
  chains,
  executions,
  hasTracing,
  activeView,
  connectionStatus,
  hasStatistics,
  isAsync,
  hasCombinator,
  operationCount,
  pathCount,
  truncatedValues,
  valuesNotCaptured,
}: EdgeStateHandlerProps): React.ReactElement {
  // No chains
  if (chains.length === 0) {
    return (
      <div data-testid="edge-state-container">
        <div data-testid="empty-chains-message">No Result chains detected</div>
      </div>
    );
  }

  // No executions
  if (executions !== undefined && executions.length === 0) {
    return (
      <div data-testid="edge-state-container">
        <div data-testid="empty-executions-message">No executions recorded</div>
      </div>
    );
  }

  // No tracing
  if (!hasTracing && (activeView === "railway" || activeView === "log")) {
    return (
      <div data-testid="edge-state-container">
        <div data-testid="no-tracing-message">
          Enable tracing to view detailed pipeline and log data
        </div>
      </div>
    );
  }

  // Empty Sankey
  if (activeView === "sankey" && hasStatistics === false) {
    return (
      <div data-testid="edge-state-container">
        <div data-testid="no-statistics-message">No statistics available</div>
      </div>
    );
  }

  // Sync chain in waterfall
  if (activeView === "waterfall" && isAsync === false) {
    return (
      <div data-testid="edge-state-container">
        <div data-testid="sync-chain-message">This chain is synchronous</div>
      </div>
    );
  }

  // Non-combinator chain in combinator view
  if (activeView === "combinator" && hasCombinator === false) {
    return (
      <div data-testid="edge-state-container">
        <div data-testid="no-combinator-message">No combinator operations</div>
      </div>
    );
  }

  return (
    <div data-testid="edge-state-container">
      {/* Disconnected banner */}
      {connectionStatus === "disconnected" && (
        <div data-testid="disconnected-banner">Disconnected</div>
      )}

      {/* Viewport culling indicator */}
      {operationCount !== undefined && (
        <div
          data-testid="viewport-culling-indicator"
          data-active={operationCount > 100 ? "true" : "false"}
        />
      )}

      {/* Path pagination */}
      {pathCount !== undefined && pathCount > 50 && (
        <div data-testid="path-pagination">{pathCount - 50} more paths...</div>
      )}

      {/* Truncated values */}
      {truncatedValues?.map(tv => (
        <div key={tv.stepIndex} data-testid={`truncated-value-${tv.stepIndex}`}>
          (truncated)
        </div>
      ))}

      {/* Values not captured */}
      {valuesNotCaptured && <div data-testid="values-not-captured">(values not captured)</div>}
    </div>
  );
}

// ── ViewErrorBoundary ───────────────────────────────────────────────────────

interface ViewErrorBoundaryProps {
  readonly viewName: string;
  readonly children: ReactNode;
  readonly onRetry?: () => void;
  readonly onSwitchToOverview?: () => void;
  readonly onAutoRetry?: () => void;
  readonly preservedChainId?: string;
  readonly preservedFilter?: string;
}

interface ViewErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | undefined;
}

class ViewErrorBoundary extends Component<ViewErrorBoundaryProps, ViewErrorBoundaryState> {
  constructor(props: ViewErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): ViewErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Error logging handled externally
  }

  handleRetry = (): void => {
    this.props.onRetry?.();
    this.setState({ hasError: false, error: undefined });
  };

  handleSwitchToOverview = (): void => {
    this.props.onSwitchToOverview?.();
  };

  handleCopyError = (): void => {
    const errorText = this.state.error?.message ?? "Unknown error";
    const stack = this.state.error?.stack ?? "";
    void navigator.clipboard.writeText(`${errorText}\n${stack}`);
  };

  handleAutoRetry = (): void => {
    this.props.onAutoRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          data-testid="error-boundary-fallback"
          data-preserved-chain={this.props.preservedChainId}
          data-preserved-filter={this.props.preservedFilter}
        >
          <p>The {this.props.viewName} view encountered an error.</p>
          <p>{this.state.error?.message}</p>

          <button data-testid="retry-view-btn" onClick={this.handleRetry}>
            Retry This View
          </button>
          <button data-testid="switch-overview-btn" onClick={this.handleSwitchToOverview}>
            Switch to Overview
          </button>
          <button data-testid="copy-error-btn" onClick={this.handleCopyError}>
            Copy Error Details
          </button>
          <button data-testid="simulate-data-event" onClick={this.handleAutoRetry}>
            Auto-retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ── ReconnectionManager ─────────────────────────────────────────────────────

interface ReconnectionManagerProps {
  readonly disconnected: boolean;
  readonly onReconnect: () => void;
  readonly onSnapshotFetch?: () => void;
}

function ReconnectionManager({
  disconnected,
  onReconnect,
  onSnapshotFetch,
}: ReconnectionManagerProps): React.ReactElement {
  const [permanent, setPermanent] = useState(false);
  const retryCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const permanentTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wasDisconnectedRef = useRef(false);

  useEffect(() => {
    if (disconnected) {
      wasDisconnectedRef.current = true;
      retryCountRef.current = 0;
      setPermanent(false);

      const scheduleRetry = (): void => {
        const delays = [1000, 2000, 4000, 8000, 16000, 30000];
        const delay = retryCountRef.current < delays.length ? delays[retryCountRef.current] : 30000;

        timerRef.current = setTimeout(() => {
          retryCountRef.current += 1;
          onReconnect();
          scheduleRetry();
        }, delay);
      };

      scheduleRetry();

      // After 5 minutes, show permanent disconnect
      permanentTimerRef.current = setTimeout(
        () => {
          setPermanent(true);
          if (timerRef.current) clearTimeout(timerRef.current);
        },
        5 * 60 * 1000
      );

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (permanentTimerRef.current) clearTimeout(permanentTimerRef.current);
      };
    }

    // Reconnected
    if (!disconnected && wasDisconnectedRef.current) {
      wasDisconnectedRef.current = false;
      setPermanent(false);
      onSnapshotFetch?.();
    }

    return undefined;
  }, [disconnected, onReconnect, onSnapshotFetch]);

  if (permanent) {
    return (
      <div data-testid="permanent-disconnect">
        Connection lost. Showing stale data.
        <button data-testid="manual-reconnect-btn" onClick={onReconnect}>
          Reconnect
        </button>
      </div>
    );
  }

  return <div data-testid="reconnection-manager" />;
}

export { EdgeStateHandler, ViewErrorBoundary, ReconnectionManager };
