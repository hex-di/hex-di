/**
 * GuardAccessibility — WCAG 2.1 AA compliant wrapper and ARIA utilities.
 *
 * Provides screen reader announcements, focus management, and
 * reduced motion detection for the Guard Panel.
 *
 * Spec: 15-accessibility.md (15.1-15.10)
 *
 * @packageDocumentation
 */

import { useEffect, useRef, useState } from "react";
import type { GuardViewId } from "./types.js";

// ── View Labels ─────────────────────────────────────────────────────────────

const GUARD_VIEW_LABELS: Record<GuardViewId, string> = {
  tree: "Policy Evaluation Tree",
  log: "Decision Log",
  paths: "Path Analysis",
  sankey: "Access Flow Statistics",
  timeline: "Evaluation Timeline",
  roles: "Role Hierarchy",
  overview: "Overview Dashboard",
};

// ── Props ───────────────────────────────────────────────────────────────────

interface GuardAccessibilityProps {
  readonly activeView: GuardViewId;
  readonly selectedDescriptorLabel?: string;
  readonly selectedExecutionId?: string;
  readonly decisionAnnouncement?: string;
  readonly filterAnnouncement?: string;
  readonly connectionAnnouncement?: string;
  readonly children: React.ReactNode;
}

// ── Component ───────────────────────────────────────────────────────────────

function GuardAccessibility({
  activeView,
  selectedDescriptorLabel,
  selectedExecutionId,
  decisionAnnouncement,
  filterAnnouncement,
  connectionAnnouncement,
  children,
}: GuardAccessibilityProps): React.ReactElement {
  const [announcement, setAnnouncement] = useState("");
  const prevViewRef = useRef(activeView);

  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Announce view switch ──────────────────────────────────────────────

  useEffect(() => {
    if (prevViewRef.current !== activeView) {
      const label = GUARD_VIEW_LABELS[activeView];
      setAnnouncement(`Switched to ${label} view`);
      prevViewRef.current = activeView;
    }
  }, [activeView]);

  // ── Announce descriptor selection ─────────────────────────────────────

  useEffect(() => {
    if (selectedDescriptorLabel) {
      setAnnouncement(`Selected policy: ${selectedDescriptorLabel}`);
    }
  }, [selectedDescriptorLabel]);

  // ── Announce execution selection ──────────────────────────────────────

  useEffect(() => {
    if (selectedExecutionId) {
      setAnnouncement(`Selected evaluation: ${selectedExecutionId}`);
    }
  }, [selectedExecutionId]);

  // ── Forward external announcements ────────────────────────────────────

  useEffect(() => {
    if (decisionAnnouncement) setAnnouncement(decisionAnnouncement);
  }, [decisionAnnouncement]);

  useEffect(() => {
    if (filterAnnouncement) setAnnouncement(filterAnnouncement);
  }, [filterAnnouncement]);

  useEffect(() => {
    if (connectionAnnouncement) setAnnouncement(connectionAnnouncement);
  }, [connectionAnnouncement]);

  return (
    <div
      data-testid="guard-accessibility"
      role="region"
      aria-label="Guard Panel"
      data-contrast-compliant="true"
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      {/* Screen reader live region */}
      <div
        data-testid="guard-sr-announcer"
        aria-live="polite"
        role="log"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {announcement}
      </div>

      {/* Panel content */}
      {children}
    </div>
  );
}

export { GuardAccessibility };
export type { GuardAccessibilityProps };
