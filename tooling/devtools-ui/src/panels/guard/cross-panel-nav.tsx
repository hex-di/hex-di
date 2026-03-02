/**
 * CrossPanelNavigation — Navigation between Guard Panel and other DevTools panels.
 *
 * Provides links to navigate from the Guard Panel to the Graph Panel,
 * Container Panel, Result Panel, and Scope views.
 *
 * Spec: 11-interactions.md (11.12)
 *
 * @packageDocumentation
 */

import { useCallback } from "react";

// ── Props ───────────────────────────────────────────────────────────────────

interface GuardCrossPanelNavProps {
  readonly navigateTo: (panel: string, context: Record<string, unknown>) => void;
}

// ── Panel Link Definitions ──────────────────────────────────────────────────

const PANEL_LINKS: readonly {
  readonly panel: string;
  readonly label: string;
  readonly description: string;
}[] = [
  { panel: "graph", label: "Graph Panel", description: "View dependency graph" },
  { panel: "container", label: "Container Panel", description: "View container details" },
  { panel: "result", label: "Result Panel", description: "View Result chain analysis" },
  { panel: "scope", label: "Scope Panel", description: "View scope hierarchy" },
];

// ── Component ───────────────────────────────────────────────────────────────

function GuardCrossPanelNav({ navigateTo }: GuardCrossPanelNavProps): React.ReactElement {
  const handleNavigate = useCallback(
    (panel: string) => {
      navigateTo(panel, {});
    },
    [navigateTo]
  );

  return (
    <nav data-testid="guard-cross-panel-nav" role="navigation" aria-label="Cross-panel navigation">
      {PANEL_LINKS.map(link => (
        <button
          key={link.panel}
          data-testid={`guard-panel-nav-${link.panel}`}
          onClick={() => handleNavigate(link.panel)}
          aria-label={link.description}
          style={{
            fontSize: "var(--hex-font-size-sm, 12px)",
            color: "var(--hex-text-primary, #e4e4f0)",
            cursor: "pointer",
          }}
        >
          {link.label}
        </button>
      ))}
    </nav>
  );
}

export { GuardCrossPanelNav };
export type { GuardCrossPanelNavProps };
