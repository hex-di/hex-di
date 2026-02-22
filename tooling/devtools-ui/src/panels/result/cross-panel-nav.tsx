/**
 * CrossPanelNavigation — Navigation between Result Panel and other DevTools panels.
 *
 * Spec: 11-interactions.md (11.12)
 *
 * @packageDocumentation
 */

import { useCallback } from "react";

// ── Props ───────────────────────────────────────────────────────────────────

interface CrossPanelNavigationProps {
  readonly portName: string;
  readonly scopeId: string;
  readonly onNavigateToPanel: (panel: string, context: Record<string, unknown>) => void;
  readonly inboundSource?: string;
  readonly inboundChainId?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

function CrossPanelNavigation({
  portName,
  scopeId,
  onNavigateToPanel,
  inboundSource,
  inboundChainId,
}: CrossPanelNavigationProps): React.ReactElement {
  const navigateToGraph = useCallback(() => {
    onNavigateToPanel("graph", { portName });
  }, [onNavigateToPanel, portName]);

  const navigateToContainer = useCallback(() => {
    onNavigateToPanel("container", {});
  }, [onNavigateToPanel]);

  const navigateToScope = useCallback(() => {
    onNavigateToPanel("scope", { scopeId });
  }, [onNavigateToPanel, scopeId]);

  const showNotFound = inboundSource !== undefined && inboundChainId === undefined;

  const panelLabel =
    inboundSource === "graph"
      ? "Graph Panel"
      : inboundSource === "container"
        ? "Container Panel"
        : (inboundSource ?? "");

  return (
    <div data-testid="cross-panel-navigation">
      <button data-testid="nav-to-graph" onClick={navigateToGraph}>
        {portName}
      </button>
      <button data-testid="nav-to-container" onClick={navigateToContainer}>
        View Container
      </button>
      <button data-testid="nav-to-scope" onClick={navigateToScope}>
        {scopeId}
      </button>

      {/* Inbound indicator */}
      {inboundSource && inboundChainId && (
        <div data-testid="inbound-indicator" data-chain-id={inboundChainId}>
          From {panelLabel}
        </div>
      )}

      {/* Chain not found toast */}
      {showNotFound && <div data-testid="chain-not-found-toast">Chain not found</div>}
    </div>
  );
}

export { CrossPanelNavigation };
export type { CrossPanelNavigationProps };
