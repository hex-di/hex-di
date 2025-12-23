/**
 * TimelineScrubber - TUI implementation for time-travel navigation.
 *
 * Renders a text-based timeline with keyboard navigation support.
 *
 * @packageDocumentation
 */

/// <reference path="./opentui.d.ts" />

import React from "react";
import type { TimelineScrubberProps } from "../ports/render-primitives.port.js";
import { TUIText, TUISpan, TUIStrong } from "./opentui-elements.js";
import { TUIStyleSystem } from "./primitives.js";

/**
 * Format timestamp for TUI display.
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * TimelineScrubber primitive component for TUI.
 *
 * Displays a text-based timeline with navigation controls.
 */
export function TimelineScrubber({
  snapshots,
  currentIndex,
  onCapture,
}: TimelineScrubberProps): React.ReactElement {
  if (snapshots.length === 0) {
    return (
      <box flexDirection="row" gap={1}>
        <TUIText>
          <TUISpan fg={TUIStyleSystem.getColor("muted")}>No snapshots yet</TUISpan>
        </TUIText>
        {onCapture !== undefined && (
          <TUIText>
            <TUISpan fg={TUIStyleSystem.getColor("primary")}> - Press [C] to capture</TUISpan>
          </TUIText>
        )}
      </box>
    );
  }

  const current = snapshots[currentIndex];
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < snapshots.length - 1;

  return (
    <box flexDirection="column" paddingTop={1} paddingBottom={1} paddingLeft={1} paddingRight={1}>
      {/* Navigation Controls */}
      <box flexDirection="row" gap={2}>
        <TUIText>
          <TUISpan
            fg={canGoBack ? TUIStyleSystem.getColor("primary") : TUIStyleSystem.getColor("muted")}
          >
            {canGoBack ? "[←] Prev" : "[ ] Prev"}
          </TUISpan>
        </TUIText>
        <TUIText>
          <TUISpan fg={TUIStyleSystem.getColor("foreground")}>
            {currentIndex + 1}/{snapshots.length}
          </TUISpan>
        </TUIText>
        <TUIText>
          <TUISpan
            fg={
              canGoForward ? TUIStyleSystem.getColor("primary") : TUIStyleSystem.getColor("muted")
            }
          >
            {canGoForward ? "[→] Next" : "[ ] Next"}
          </TUISpan>
        </TUIText>
        {onCapture !== undefined && (
          <TUIText>
            <TUISpan fg={TUIStyleSystem.getColor("primary")}> [C] Capture</TUISpan>
          </TUIText>
        )}
      </box>

      {/* Timeline Visualization */}
      <box flexDirection="row" paddingTop={1}>
        {snapshots.map((snapshot, index) => {
          const isCurrent = index === currentIndex;
          const marker = isCurrent ? "●" : "○";
          const fgColor = isCurrent
            ? TUIStyleSystem.getColor("primary")
            : TUIStyleSystem.getColor("muted");

          return (
            <TUIText key={snapshot.id}>
              <TUISpan fg={fgColor}>
                {marker}
                {index < snapshots.length - 1 && "─"}
              </TUISpan>
            </TUIText>
          );
        })}
      </box>

      {/* Current Snapshot Info */}
      {current !== undefined && (
        <box flexDirection="column" paddingTop={1}>
          <TUIText>
            <TUISpan fg={TUIStyleSystem.getColor("foreground")}>
              <TUIStrong>{current.label}</TUIStrong>
            </TUISpan>
          </TUIText>
          <TUIText>
            <TUISpan fg={TUIStyleSystem.getColor("muted")}>
              {formatTime(current.timestamp)} · {current.serviceCount} services
            </TUISpan>
          </TUIText>
        </box>
      )}
    </box>
  );
}
