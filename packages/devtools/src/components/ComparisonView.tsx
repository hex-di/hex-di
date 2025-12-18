/**
 * ComparisonView - Snapshot comparison component.
 *
 * Provides UI for selecting and comparing two snapshots with
 * side-by-side diff visualization.
 *
 * @packageDocumentation
 */

import React, { useCallback, useState } from "react";
import { usePrimitives } from "../hooks/use-primitives.js";
import type { ComparisonViewModel } from "../view-models/comparison.vm.js";
import type { SnapshotSummary } from "../view-models/comparison.vm.js";

// =============================================================================
// Props Interface
// =============================================================================

/**
 * Props for the ComparisonView component.
 */
export interface ComparisonViewProps {
  /** The comparison view model */
  readonly viewModel: ComparisonViewModel;
  /** All available snapshots for selection */
  readonly availableSnapshots: readonly SnapshotSummary[];
  /** Callback when left snapshot is selected */
  readonly onSelectLeft?: (snapshotId: string | null) => void;
  /** Callback when right snapshot is selected */
  readonly onSelectRight?: (snapshotId: string | null) => void;
  /** Callback when a service in the diff is selected */
  readonly onServiceSelect?: (portName: string) => void;
  /** Whether the comparison view is enabled */
  readonly isEnabled?: boolean;
}

// =============================================================================
// ComparisonView Component
// =============================================================================

/**
 * ComparisonView component for snapshot comparison.
 *
 * Displays snapshot selectors and a diff view showing the differences
 * between two selected snapshots.
 *
 * @example
 * ```tsx
 * import { ComparisonView } from '@hex-di/devtools';
 * import { ComparisonPresenter } from '@hex-di/devtools/presenters';
 *
 * function MyDevTools() {
 *   const presenter = new ComparisonPresenter();
 *   const viewModel = presenter.getViewModel();
 *   const snapshots = timeTravelPresenter.getViewModel().snapshots;
 *
 *   return (
 *     <ComparisonView
 *       viewModel={viewModel}
 *       availableSnapshots={snapshots}
 *       onSelectLeft={(id) => {
 *         const snapshot = findSnapshot(id);
 *         presenter.setSnapshots(snapshot, null);
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export function ComparisonView({
  viewModel,
  availableSnapshots,
  onSelectLeft,
  onSelectRight,
  onServiceSelect,
  isEnabled = true,
}: ComparisonViewProps): React.ReactElement {
  const { Box, Text, Button, DiffView, ScrollView, Divider } = usePrimitives();

  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  const handleSelectLeft = useCallback(
    (snapshotId: string | null) => {
      setLeftId(snapshotId);
      onSelectLeft?.(snapshotId);
    },
    [onSelectLeft]
  );

  const handleSelectRight = useCallback(
    (snapshotId: string | null) => {
      setRightId(snapshotId);
      onSelectRight?.(snapshotId);
    },
    [onSelectRight]
  );

  if (!isEnabled) {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        padding="lg"
        data-testid="comparison-view-disabled"
      >
        <Text variant="body" color="muted">
          Comparison mode is disabled
        </Text>
      </Box>
    );
  }

  if (availableSnapshots.length === 0) {
    return (
      <Box
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        padding="lg"
        data-testid="comparison-view-no-snapshots"
      >
        <Text variant="body" color="muted">
          No snapshots available for comparison
        </Text>
        <Text variant="caption" color="muted">
          Capture some snapshots to compare
        </Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      height="100%"
      data-testid="comparison-view"
    >
      {/* Snapshot Selectors */}
      <Box
        flexDirection="row"
        gap="md"
        padding="md"
        alignItems="center"
      >
        {/* Left Snapshot Selector */}
        <Box flexDirection="column" flexGrow={1} gap="xs">
          <Text variant="label" color="muted">
            Baseline (Left)
          </Text>
          <SnapshotSelector
            snapshots={availableSnapshots}
            selectedId={leftId}
            onSelect={handleSelectLeft}
            label="Select baseline..."
          />
        </Box>

        {/* Arrow */}
        <Box paddingY="md">
          <Text variant="heading" color="muted">
            →
          </Text>
        </Box>

        {/* Right Snapshot Selector */}
        <Box flexDirection="column" flexGrow={1} gap="xs">
          <Text variant="label" color="muted">
            Current (Right)
          </Text>
          <SnapshotSelector
            snapshots={availableSnapshots}
            selectedId={rightId}
            onSelect={handleSelectRight}
            label="Select current..."
          />
        </Box>
      </Box>

      <Divider orientation="horizontal" color="border" />

      {/* Diff View */}
      <ScrollView vertical maxHeight="100%">
        <DiffView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          showAdditions
          showRemovals
          showChanges
        />
      </ScrollView>
    </Box>
  );
}

// =============================================================================
// Snapshot Selector Component
// =============================================================================

interface SnapshotSelectorProps {
  readonly snapshots: readonly SnapshotSummary[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly label: string;
}

function SnapshotSelector({
  snapshots,
  selectedId,
  onSelect,
  label,
}: SnapshotSelectorProps): React.ReactElement {
  const { Box, Text, Button } = usePrimitives();
  const [isOpen, setIsOpen] = useState(false);

  const selectedSnapshot = snapshots.find((s) => s.id === selectedId);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    onSelect(null);
    setIsOpen(false);
  }, [onSelect]);

  return (
    <Box flexDirection="column" gap="xs">
      {/* Selected Snapshot Display */}
      <Button
        label={selectedSnapshot?.label ?? label}
        onClick={handleToggle}
        variant={selectedSnapshot ? "primary" : "secondary"}
        size="md"
        data-testid="snapshot-selector-button"
      />

      {/* Dropdown List */}
      {isOpen && (
        <Box
          flexDirection="column"
          gap="xs"
          padding="xs"
          data-testid="snapshot-selector-dropdown"
        >
          {selectedId && (
            <>
              <Button
                label="Clear selection"
                onClick={handleClear}
                variant="ghost"
                size="sm"
              />
              <Box height={1} />
            </>
          )}
          {snapshots.map((snapshot) => (
            <Button
              key={snapshot.id}
              label={`${snapshot.label} (${snapshot.serviceCount} services)`}
              onClick={() => handleSelect(snapshot.id)}
              variant={snapshot.id === selectedId ? "primary" : "ghost"}
              size="sm"
              data-testid={`snapshot-option-${snapshot.id}`}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
