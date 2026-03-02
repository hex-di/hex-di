/**
 * CrossViewNavigation — Links between Guard Panel views.
 *
 * Provides contextual navigation links to related views within the
 * Guard Panel based on the current view and selection state.
 *
 * Spec: 11-interactions.md (11.11)
 *
 * @packageDocumentation
 */

import { useCallback } from "react";
import type { GuardViewId } from "./types.js";

// ── Props ───────────────────────────────────────────────────────────────────

interface GuardCrossViewNavProps {
  readonly onNavigate: (viewId: GuardViewId) => void;
}

// ── View Link Definitions ───────────────────────────────────────────────────

const VIEW_LINKS: readonly {
  readonly id: GuardViewId;
  readonly label: string;
  readonly description: string;
}[] = [
  { id: "tree", label: "Policy Tree", description: "View policy tree structure" },
  { id: "log", label: "Decision Log", description: "View evaluation history" },
  { id: "paths", label: "Path Analysis", description: "Explore evaluation paths" },
  { id: "sankey", label: "Access Flow", description: "View access flow statistics" },
  { id: "timeline", label: "Timeline", description: "View evaluation durations" },
  { id: "roles", label: "Roles", description: "View role hierarchy" },
  { id: "overview", label: "Overview", description: "View summary dashboard" },
];

// ── Component ───────────────────────────────────────────────────────────────

function GuardCrossViewNav({ onNavigate }: GuardCrossViewNavProps): React.ReactElement {
  const handleNavigate = useCallback(
    (viewId: GuardViewId) => {
      onNavigate(viewId);
    },
    [onNavigate]
  );

  return (
    <nav data-testid="guard-cross-view-nav" role="navigation" aria-label="Guard view navigation">
      {VIEW_LINKS.map(link => (
        <button
          key={link.id}
          data-testid={`guard-nav-${link.id}`}
          onClick={() => handleNavigate(link.id)}
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

export { GuardCrossViewNav };
export type { GuardCrossViewNavProps };
