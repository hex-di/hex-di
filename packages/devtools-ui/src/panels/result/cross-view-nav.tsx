/**
 * CrossViewNavigation — Links between Result Panel views.
 *
 * Spec: 11-interactions.md (11.11)
 *
 * @packageDocumentation
 */

import { useCallback } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface NavContext {
  readonly chainId: string;
  readonly executionId?: string;
  readonly stepIndex?: number;
  readonly errorType?: string;
  readonly timeRange?: string;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface CrossViewNavigationProps {
  readonly sourceView: string;
  readonly context: NavContext;
  readonly onNavigate: (view: string, context: NavContext) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

function CrossViewNavigation({
  sourceView,
  context,
  onNavigate,
}: CrossViewNavigationProps): React.ReactElement {
  const navigateTo = useCallback(
    (view: string) => {
      onNavigate(view, context);
    },
    [onNavigate, context]
  );

  return (
    <div data-testid="cross-view-navigation" data-source={sourceView}>
      {/* View in Log */}
      {(sourceView === "railway" || sourceView === "overview" || sourceView === "sankey") && (
        <button data-testid="nav-view-in-log" onClick={() => navigateTo("log")}>
          View in Log
        </button>
      )}

      {/* View in Pipeline */}
      {(sourceView === "log" || sourceView === "sankey") && (
        <button data-testid="nav-view-in-pipeline" onClick={() => navigateTo("railway")}>
          View in Pipeline
        </button>
      )}

      {/* View Cases */}
      {sourceView === "railway" && (
        <button data-testid="nav-view-cases" onClick={() => navigateTo("cases")}>
          View Cases
        </button>
      )}

      {/* View Waterfall */}
      {sourceView === "log" && (
        <button data-testid="nav-view-waterfall" onClick={() => navigateTo("waterfall")}>
          View Waterfall
        </button>
      )}

      {/* View Sankey */}
      {sourceView === "overview" && (
        <button data-testid="nav-view-sankey" onClick={() => navigateTo("sankey")}>
          View Sankey
        </button>
      )}
    </div>
  );
}

export { CrossViewNavigation };
export type { CrossViewNavigationProps, NavContext };
