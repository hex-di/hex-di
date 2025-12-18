/**
 * DiffView - TUI implementation for snapshot comparison.
 *
 * Displays text-based diff format with +/- prefixes for changes.
 *
 * @packageDocumentation
 */

/// <reference path="./opentui.d.ts" />

import React from "react";
import type { DiffViewProps } from "../ports/render-primitives.port.js";
import {
  TUIText,
  TUISpan,
  TUIStrong,
} from "./opentui-elements.js";
import { TUIStyleSystem } from "./primitives.js";

/**
 * DiffView primitive component for TUI.
 *
 * Shows a text-based comparison between two container snapshots.
 */
export function DiffView({
  viewModel,
  onServiceSelect,
  showAdditions = true,
  showRemovals = true,
  showChanges = true,
}: DiffViewProps): React.ReactElement {
  if (!viewModel.isActive || viewModel.isEmpty) {
    return (
      <box paddingTop={2} paddingBottom={2} paddingLeft={2} paddingRight={2}>
        <TUIText>
          <TUISpan fg={TUIStyleSystem.getColor("muted")}>
            {!viewModel.isActive
              ? "Select two snapshots to compare"
              : "No data to compare"}
          </TUISpan>
        </TUIText>
      </box>
    );
  }

  if (!viewModel.hasChanges) {
    return (
      <box paddingTop={2} paddingBottom={2} paddingLeft={2} paddingRight={2}>
        <TUIText>
          <TUISpan fg={TUIStyleSystem.getColor("success")}>✓ No changes detected</TUISpan>
        </TUIText>
      </box>
    );
  }

  return (
    <box flexDirection="column" paddingTop={1} paddingBottom={1} paddingLeft={1} paddingRight={1}>
      {/* Summary Header */}
      <box flexDirection="row" gap={2} paddingBottom={1}>
        <box flexDirection="column">
          <TUIText><TUIStrong>{viewModel.leftSnapshot.label}</TUIStrong></TUIText>
          <TUIText>
            <TUISpan fg={TUIStyleSystem.getColor("muted")}>{viewModel.leftSnapshot.serviceCount} services</TUISpan>
          </TUIText>
        </box>
        <TUIText>
          <TUISpan fg={TUIStyleSystem.getColor("muted")}>→</TUISpan>
        </TUIText>
        <box flexDirection="column">
          <TUIText><TUIStrong>{viewModel.rightSnapshot.label}</TUIStrong></TUIText>
          <TUIText>
            <TUISpan fg={TUIStyleSystem.getColor("muted")}>{viewModel.rightSnapshot.serviceCount} services</TUISpan>
          </TUIText>
        </box>
      </box>

      {/* Added Services */}
      {showAdditions && viewModel.addedServices.length > 0 && (
        <box flexDirection="column" paddingTop={1}>
          <TUIText>
            <TUISpan fg={TUIStyleSystem.getColor("success")}>
              <TUIStrong>✓ Added ({viewModel.addedServices.length})</TUIStrong>
            </TUISpan>
          </TUIText>
          {viewModel.addedServices.map((portName) => (
            <TUIText key={portName}>
              <TUISpan fg={TUIStyleSystem.getColor("success")}>+ {portName}</TUISpan>
            </TUIText>
          ))}
        </box>
      )}

      {/* Removed Services */}
      {showRemovals && viewModel.removedServices.length > 0 && (
        <box flexDirection="column" paddingTop={1}>
          <TUIText>
            <TUISpan fg={TUIStyleSystem.getColor("error")}>
              <TUIStrong>✗ Removed ({viewModel.removedServices.length})</TUIStrong>
            </TUISpan>
          </TUIText>
          {viewModel.removedServices.map((portName) => (
            <TUIText key={portName}>
              <TUISpan fg={TUIStyleSystem.getColor("error")}>- {portName}</TUISpan>
            </TUIText>
          ))}
        </box>
      )}

      {/* Changed Services */}
      {showChanges && viewModel.changedServices.length > 0 && (
        <box flexDirection="column" paddingTop={1}>
          <TUIText>
            <TUISpan fg={TUIStyleSystem.getColor("warning")}>
              <TUIStrong>~ Changed ({viewModel.changedServices.length})</TUIStrong>
            </TUISpan>
          </TUIText>
          {viewModel.changedServices.map((diff) => (
            <box key={diff.portName} flexDirection="column">
              <TUIText>
                <TUISpan fg={TUIStyleSystem.getColor("warning")}>~ {diff.portName}</TUISpan>
              </TUIText>
              {diff.countDelta !== undefined && (
                <TUIText>
                  <TUISpan fg={TUIStyleSystem.getColor("muted")}>
                    {"  "}Resolutions: {diff.leftValue} → {diff.rightValue} (
                    {diff.countDelta > 0 ? "+" : ""}
                    {diff.countDelta})
                  </TUISpan>
                </TUIText>
              )}
              {diff.timingDeltaMs !== undefined && diff.timingDeltaMs !== null && (
                <TUIText>
                  <TUISpan fg={TUIStyleSystem.getColor("muted")}>
                    {"  "}Timing: {diff.leftTimingMs ?? 0}ms → {diff.rightTimingMs ?? 0}ms (
                    {diff.timingDeltaMs > 0 ? "+" : ""}
                    {diff.timingDeltaMs.toFixed(1)}ms)
                  </TUISpan>
                </TUIText>
              )}
            </box>
          ))}
        </box>
      )}
    </box>
  );
}
