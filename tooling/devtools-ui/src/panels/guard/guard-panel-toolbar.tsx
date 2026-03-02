/**
 * GuardPanelToolbar — 7 view tabs, port/execution selectors, controls.
 *
 * Spec: 03-views-and-wireframes.md Section 3.2
 *
 * @packageDocumentation
 */

import { useCallback, useMemo } from "react";
import type { GuardViewId, GuardEvaluationDescriptor } from "./types.js";

// ── View Registry ───────────────────────────────────────────────────────────

interface ViewDef {
  readonly id: GuardViewId;
  readonly label: string;
}

const VIEWS: readonly ViewDef[] = [
  { id: "tree", label: "Tree" },
  { id: "log", label: "Log" },
  { id: "paths", label: "Paths" },
  { id: "sankey", label: "Sankey" },
  { id: "timeline", label: "Timeline" },
  { id: "roles", label: "Roles" },
  { id: "overview", label: "Overview" },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface GuardPanelToolbarProps {
  readonly activeView: GuardViewId;
  readonly onViewChange: (viewId: GuardViewId) => void;
  readonly descriptors: ReadonlyMap<string, GuardEvaluationDescriptor>;
  readonly selectedDescriptorId: string | undefined;
  readonly onDescriptorChange: (descriptorId: string) => void;
  readonly educationalSidebarOpen: boolean;
  readonly onToggleEducational: () => void;
  readonly connectionStatus: "connected" | "disconnected";
}

// ── Component ───────────────────────────────────────────────────────────────

function GuardPanelToolbar({
  activeView,
  onViewChange,
  descriptors,
  selectedDescriptorId,
  onDescriptorChange,
  educationalSidebarOpen,
  onToggleEducational,
  connectionStatus,
}: GuardPanelToolbarProps): React.ReactElement {
  const descriptorList = useMemo(() => [...descriptors.values()], [descriptors]);

  const handleDescriptorSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onDescriptorChange(e.target.value);
    },
    [onDescriptorChange]
  );

  return (
    <div
      data-testid="guard-toolbar"
      role="toolbar"
      aria-label="Guard Panel controls"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--hex-space-sm)",
        padding: "var(--hex-space-sm) var(--hex-space-md)",
        borderBottom: "1px solid var(--hex-border)",
        backgroundColor: "var(--hex-bg-secondary)",
      }}
    >
      {/* View tabs */}
      <div
        role="tablist"
        aria-label="Guard Panel views"
        style={{ display: "flex", gap: "var(--hex-space-xxs)" }}
      >
        {VIEWS.map(v => (
          <button
            key={v.id}
            role="tab"
            aria-selected={v.id === activeView}
            data-testid={`guard-tab-${v.id}`}
            onClick={() => onViewChange(v.id)}
            style={{
              padding: "var(--hex-space-xs) var(--hex-space-md)",
              borderRadius: "var(--hex-radius-sm)",
              fontSize: "var(--hex-font-size-xs)",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              backgroundColor: v.id === activeView ? "var(--hex-accent-muted)" : "transparent",
              color: v.id === activeView ? "var(--hex-accent)" : "var(--hex-text-muted)",
              transition: "all var(--hex-transition-fast)",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Port selector */}
      {descriptorList.length > 0 && (
        <select
          data-testid="guard-port-selector"
          aria-label="Select guarded port"
          value={selectedDescriptorId ?? ""}
          onChange={handleDescriptorSelect}
          style={{
            backgroundColor: "var(--hex-bg-tertiary)",
            color: "var(--hex-text-primary)",
            border: "1px solid var(--hex-border)",
            borderRadius: "var(--hex-radius-sm)",
            padding: "var(--hex-space-xs) var(--hex-space-sm)",
            fontSize: "var(--hex-font-size-xs)",
            fontFamily: "var(--hex-font-mono)",
          }}
        >
          <option value="">All ports</option>
          {descriptorList.map(d => (
            <option key={d.descriptorId} value={d.descriptorId}>
              {d.label}
            </option>
          ))}
        </select>
      )}

      {/* Controls */}
      <button
        data-testid="guard-educational-toggle"
        aria-pressed={educationalSidebarOpen}
        aria-label="Toggle educational sidebar"
        onClick={onToggleEducational}
        style={{
          width: 24,
          height: 24,
          borderRadius: "var(--hex-radius-pill)",
          border: "none",
          cursor: "pointer",
          fontSize: "var(--hex-font-size-xs)",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: educationalSidebarOpen ? "var(--hex-accent-muted)" : "transparent",
          color: educationalSidebarOpen ? "var(--hex-accent)" : "var(--hex-text-muted)",
          transition: "all var(--hex-transition-fast)",
        }}
      >
        ?
      </button>

      {/* Connection indicator */}
      {connectionStatus === "disconnected" && (
        <span
          data-testid="guard-disconnected-indicator"
          role="status"
          aria-label="Disconnected"
          style={{
            fontSize: "var(--hex-font-size-xs)",
            fontWeight: 600,
            color: "var(--hex-status-disconnected)",
            marginLeft: "auto",
          }}
        >
          Disconnected
        </span>
      )}

      {connectionStatus === "connected" && (
        <span
          data-testid="guard-live-indicator"
          role="status"
          aria-label="Live"
          style={{
            fontSize: "var(--hex-font-size-xs)",
            fontWeight: 600,
            color: "var(--hex-status-connected)",
            marginLeft: "auto",
          }}
        >
          Live
        </span>
      )}
    </div>
  );
}

export { GuardPanelToolbar, VIEWS };
export type { GuardPanelToolbarProps };
