/**
 * TimelineView - Resolution trace timeline component.
 *
 * This is a shared headless component that renders the resolution timeline.
 * It displays trace entries with timestamps, durations, and phase information.
 *
 * Features:
 * - Live trace stream display
 * - Hierarchical trace display with expand/collapse
 * - Duration color coding (green/yellow/red)
 * - Grouping modes (none, port, scope, lifetime)
 * - Pause/resume controls
 * - Clear traces button
 * - Slow threshold configuration
 * - Performance indicators
 * - Pinned trace filtering
 * - Flame graph toggle
 *
 * @packageDocumentation
 */

import React, { useState, useCallback } from "react";
import { usePrimitives } from "../hooks/use-primitives.js";
import type {
  TimelineViewModel,
  TraceEntryViewModel,
  TimelineGrouping,
  FlameGraphViewModel,
} from "../view-models/index.js";
import { getLifetimeColor, getLifetimeIcon } from "../shared/lifetime-colors.js";

// =============================================================================
// Props Interface
// =============================================================================

/**
 * Props for the TimelineView component.
 */
export interface TimelineViewProps {
  /** The timeline view model containing all display state */
  readonly viewModel: TimelineViewModel;
  /** Optional flame graph view model for flame graph mode */
  readonly flameGraphViewModel?: FlameGraphViewModel;
  /** Callback when a trace entry is selected */
  readonly onEntrySelect?: (entryId: string) => void;
  /** Callback when a trace entry is expanded/collapsed */
  readonly onEntryToggle?: (entryId: string) => void;
  /** Callback when grouping mode changes */
  readonly onGroupingChange?: (grouping: TimelineGrouping) => void;
  /** Callback when pause/resume is toggled */
  readonly onPauseToggle?: () => void;
  /** Callback when traces are cleared */
  readonly onClearTraces?: () => void;
  /** Callback when slow threshold changes */
  readonly onSlowThresholdChange?: (ms: number) => void;
  /** Callback when a trace is pinned */
  readonly onPinTrace?: (traceId: string) => void;
  /** Callback when a trace is unpinned */
  readonly onUnpinTrace?: (traceId: string) => void;
  /** Callback when show only pinned filter changes */
  readonly onShowOnlyPinnedChange?: (show: boolean) => void;
  /** Whether to show only pinned traces */
  readonly showOnlyPinned?: boolean;
  /** Callback when view mode changes (timeline/flame) */
  readonly onViewModeChange?: (mode: "timeline" | "flame") => void;
  /** Current view mode */
  readonly viewMode?: "timeline" | "flame";
  /** Callback when a flame frame is selected */
  readonly onFlameFrameSelect?: (frameId: string) => void;
}

// =============================================================================
// Trace Entry Component
// =============================================================================

interface TraceEntryProps {
  readonly entry: TraceEntryViewModel;
  readonly slowThresholdMs: number;
  readonly onSelect?: (() => void) | undefined;
  readonly onToggle?: (() => void) | undefined;
  readonly onPin?: (() => void) | undefined;
  readonly onUnpin?: (() => void) | undefined;
}

function TraceEntry({
  entry,
  slowThresholdMs,
  onSelect,
  onToggle,
  onPin,
  onUnpin,
}: TraceEntryProps): React.ReactElement {
  const { Box, Text, Icon, PerformanceBadge } = usePrimitives();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      padding="xs"
      paddingX="sm"
      gap="sm"
      {...(onSelect !== undefined ? { onClick: onSelect } : {})}
      data-testid={`trace-entry-${entry.id}`}
    >
      {/* Expand/collapse indicator for entries with children */}
      {entry.childIds.length > 0 && (
        <Box {...(onToggle !== undefined ? { onClick: onToggle } : {})}>
          <Icon
            name={entry.isExpanded ? "chevron-down" : "chevron-right"}
            size="sm"
            color="muted"
          />
        </Box>
      )}

      {/* Indentation based on depth */}
      {entry.depth > 0 && <Box width={entry.depth * 16} />}

      {/* Visual connector for hierarchy */}
      {entry.depth > 0 && (
        <Text variant="code" color="border">
          {entry.childIds.length > 0 ? "\u251C" : "\u2514"}
          {"\u2500"}
        </Text>
      )}

      {/* Lifetime badge */}
      <Icon
        name={getLifetimeIcon(entry.lifetime)}
        size="sm"
        color={getLifetimeColor(entry.lifetime)}
      />

      {/* Port name */}
      <Box flexGrow={1}>
        <Text
          variant="code"
          color={entry.isSelected ? "primary" : "foreground"}
          bold={entry.isSelected}
        >
          {entry.portName}
        </Text>
      </Box>

      {/* Cache hit indicator */}
      {entry.isCacheHit && (
        <Text variant="caption" color="success">
          cached
        </Text>
      )}

      {/* Pinned indicator */}
      {entry.isPinned && (
        <Box {...(onUnpin ? { onClick: onUnpin } : {})} data-testid={`unpin-${entry.id}`}>
          <Text variant="caption" color="accent">
            pinned
          </Text>
        </Box>
      )}

      {/* Pin button for slow traces */}
      {!entry.isPinned && entry.isSlow && onPin && (
        <Box onClick={onPin} data-testid={`pin-${entry.id}`}>
          <Text variant="caption" color="muted">
            pin
          </Text>
        </Box>
      )}

      {/* Duration badge with color coding */}
      <PerformanceBadge durationMs={entry.durationMs} thresholdMs={slowThresholdMs} size="sm" />

      {/* Timestamp */}
      <Text variant="caption" color="muted">
        {entry.startTime.split("T")[1]?.slice(0, 12) ?? entry.startTime}
      </Text>
    </Box>
  );
}

// =============================================================================
// Controls Component
// =============================================================================

interface ControlsProps {
  readonly grouping: TimelineGrouping;
  readonly isPaused: boolean;
  readonly slowThresholdMs: number;
  readonly showOnlyPinned?: boolean | undefined;
  readonly viewMode?: "timeline" | "flame" | undefined;
  readonly onGroupingChange?: ((grouping: TimelineGrouping) => void) | undefined;
  readonly onPauseToggle?: (() => void) | undefined;
  readonly onClearTraces?: (() => void) | undefined;
  readonly onSlowThresholdChange?: ((ms: number) => void) | undefined;
  readonly onShowOnlyPinnedChange?: ((show: boolean) => void) | undefined;
  readonly onViewModeChange?: ((mode: "timeline" | "flame") => void) | undefined;
}

function Controls({
  grouping,
  isPaused,
  slowThresholdMs,
  showOnlyPinned = false,
  viewMode = "timeline",
  onGroupingChange,
  onPauseToggle,
  onClearTraces,
  onSlowThresholdChange,
  onShowOnlyPinnedChange,
  onViewModeChange,
}: ControlsProps): React.ReactElement {
  const { Box, Text, Button } = usePrimitives();
  const [showThresholdInput, setShowThresholdInput] = useState(false);

  const handleGroupingClick = useCallback(() => {
    if (!onGroupingChange) return;
    const groupingOptions: TimelineGrouping[] = ["none", "port", "scope", "lifetime"];
    const currentIndex = groupingOptions.indexOf(grouping);
    const nextIndex = (currentIndex + 1) % groupingOptions.length;
    // nextIndex is guaranteed to be within bounds due to modulo operation

    onGroupingChange(groupingOptions[nextIndex]!);
  }, [grouping, onGroupingChange]);

  const handleThresholdClick = useCallback(() => {
    setShowThresholdInput(!showThresholdInput);
  }, [showThresholdInput]);

  return (
    <Box flexDirection="column" gap="xs" padding="sm">
      {/* First row: Main controls */}
      <Box flexDirection="row" gap="sm" alignItems="center">
        {/* Grouping dropdown */}
        {onGroupingChange && (
          <Box onClick={handleGroupingClick}>
            <Button label={`Group: ${grouping}`} variant="ghost" size="sm" />
          </Box>
        )}

        {/* View mode toggle */}
        {onViewModeChange && (
          <Box onClick={() => onViewModeChange(viewMode === "timeline" ? "flame" : "timeline")}>
            <Button
              label={viewMode === "timeline" ? "Flame Graph" : "Timeline"}
              variant="ghost"
              size="sm"
            />
          </Box>
        )}

        {/* Pause/Resume button */}
        {onPauseToggle && (
          <Box onClick={onPauseToggle}>
            <Button
              label={isPaused ? "Resume" : "Pause"}
              variant={isPaused ? "primary" : "ghost"}
              size="sm"
            />
          </Box>
        )}

        {/* Clear traces button */}
        {onClearTraces && (
          <Box onClick={onClearTraces}>
            <Button label="Clear" variant="ghost" size="sm" />
          </Box>
        )}
      </Box>

      {/* Second row: Filters */}
      <Box flexDirection="row" gap="sm" alignItems="center">
        {/* Slow threshold */}
        {onSlowThresholdChange && (
          <Box flexDirection="row" gap="xs" alignItems="center">
            <Text variant="caption" color="muted">
              Slow:
            </Text>
            <Box onClick={handleThresholdClick}>
              <Text variant="code" color="foreground">
                {slowThresholdMs}ms
              </Text>
            </Box>
          </Box>
        )}

        {/* Show only pinned toggle */}
        {onShowOnlyPinnedChange && (
          <Box onClick={() => onShowOnlyPinnedChange(!showOnlyPinned)}>
            <Button
              label={showOnlyPinned ? "All" : "Pinned Only"}
              variant={showOnlyPinned ? "primary" : "ghost"}
              size="sm"
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

// =============================================================================
// TimelineView Component
// =============================================================================

/**
 * Resolution trace timeline component.
 *
 * Displays trace entries in a scrollable list with timing information,
 * cache hit indicators, and hierarchical grouping.
 *
 * @example
 * ```tsx
 * import { TimelineView } from '@hex-di/devtools';
 * import { PrimitivesProvider } from '@hex-di/devtools';
 * import { DOMPrimitives } from '@hex-di/devtools/dom';
 *
 * function App() {
 *   const [viewModel, setViewModel] = useState(createEmptyTimelineViewModel());
 *
 *   return (
 *     <PrimitivesProvider primitives={DOMPrimitives}>
 *       <TimelineView
 *         viewModel={viewModel}
 *         onEntrySelect={(id) => console.log('Selected:', id)}
 *         onGroupingChange={(grouping) => console.log('Grouping:', grouping)}
 *         onPauseToggle={() => console.log('Pause toggled')}
 *       />
 *     </PrimitivesProvider>
 *   );
 * }
 * ```
 */
export function TimelineView({
  viewModel,
  flameGraphViewModel,
  onEntrySelect,
  onEntryToggle,
  onGroupingChange,
  onPauseToggle,
  onClearTraces,
  onSlowThresholdChange,
  onPinTrace,
  onUnpinTrace,
  onShowOnlyPinnedChange,
  showOnlyPinned = false,
  onViewModeChange,
  viewMode = "timeline",
  onFlameFrameSelect,
}: TimelineViewProps): React.ReactElement {
  const { Box, Text, Icon, ScrollView, Divider, FlameGraph } = usePrimitives();

  // Render empty state
  if (viewModel.isEmpty) {
    return (
      <Box
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        padding="lg"
        flexGrow={1}
        data-testid="timeline-empty-state"
      >
        <Icon name="timeline" size="lg" color="muted" />
        <Text variant="body" color="muted">
          No traces recorded
        </Text>
        <Text variant="caption" color="muted">
          Resolve services to see the timeline
        </Text>
      </Box>
    );
  }

  // Render flame graph mode
  if (viewMode === "flame" && flameGraphViewModel) {
    return (
      <Box flexDirection="column" flexGrow={1} data-testid="timeline-view">
        {/* Controls */}
        <Controls
          grouping={viewModel.grouping}
          isPaused={viewModel.isPaused}
          slowThresholdMs={viewModel.slowThresholdMs}
          showOnlyPinned={showOnlyPinned}
          viewMode={viewMode}
          onGroupingChange={onGroupingChange}
          onPauseToggle={onPauseToggle}
          onClearTraces={onClearTraces}
          onSlowThresholdChange={onSlowThresholdChange}
          onShowOnlyPinnedChange={onShowOnlyPinnedChange}
          onViewModeChange={onViewModeChange}
        />

        <Divider orientation="horizontal" color="border" />

        {/* Flame Graph */}
        <Box flexGrow={1} padding="sm">
          <FlameGraph
            viewModel={flameGraphViewModel}
            onFrameSelect={onFlameFrameSelect}
            thresholdMs={viewModel.slowThresholdMs}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} data-testid="timeline-view">
      {/* Controls */}
      <Controls
        grouping={viewModel.grouping}
        isPaused={viewModel.isPaused}
        slowThresholdMs={viewModel.slowThresholdMs}
        showOnlyPinned={showOnlyPinned}
        viewMode={viewMode}
        onGroupingChange={onGroupingChange}
        onPauseToggle={onPauseToggle}
        onClearTraces={onClearTraces}
        onSlowThresholdChange={onSlowThresholdChange}
        onShowOnlyPinnedChange={onShowOnlyPinnedChange}
        onViewModeChange={onViewModeChange}
      />

      <Divider orientation="horizontal" color="border" />

      {/* Header with stats */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" padding="sm">
        <Text variant="subheading" color="foreground">
          Timeline
        </Text>
        <Box flexDirection="row" gap="md">
          <Text variant="caption" color="muted">
            {viewModel.visibleCount} / {viewModel.totalCount} traces
          </Text>
          {viewModel.isPaused && (
            <Text variant="caption" color="warning">
              Paused
            </Text>
          )}
        </Box>
      </Box>

      <Divider orientation="horizontal" color="border" />

      {/* Grouped view */}
      {viewModel.groups.length > 0 ? (
        <ScrollView vertical maxHeight={400}>
          <Box flexDirection="column">
            {viewModel.groups.map(group => (
              <Box key={group.id} flexDirection="column">
                {/* Group header */}
                <Box
                  flexDirection="row"
                  justifyContent="space-between"
                  alignItems="center"
                  padding="sm"
                  paddingX="md"
                >
                  <Text variant="subheading" color="primary" bold>
                    {group.label}
                  </Text>
                  <Box flexDirection="row" gap="sm">
                    <Text variant="caption" color="muted">
                      {group.entries.length} traces
                    </Text>
                    <Text variant="caption" color="muted">
                      {group.totalDurationMs.toFixed(2)}ms total
                    </Text>
                    {group.cacheHitCount > 0 && (
                      <Text variant="caption" color="success">
                        {group.cacheHitCount} cached
                      </Text>
                    )}
                    {group.slowCount > 0 && (
                      <Text variant="caption" color="error">
                        {group.slowCount} slow
                      </Text>
                    )}
                  </Box>
                </Box>

                {/* Group entries */}
                {group.entries.map(entry => (
                  <TraceEntry
                    key={entry.id}
                    entry={entry}
                    slowThresholdMs={viewModel.slowThresholdMs}
                    onSelect={() => onEntrySelect?.(entry.id)}
                    onToggle={() => onEntryToggle?.(entry.id)}
                    onPin={onPinTrace ? () => onPinTrace(entry.id) : undefined}
                    onUnpin={onUnpinTrace ? () => onUnpinTrace(entry.id) : undefined}
                  />
                ))}

                <Divider orientation="horizontal" color="border" />
              </Box>
            ))}
          </Box>
        </ScrollView>
      ) : (
        /* Flat view */
        <ScrollView vertical maxHeight={400}>
          <Box flexDirection="column">
            {viewModel.entries.map(entry => (
              <TraceEntry
                key={entry.id}
                entry={entry}
                slowThresholdMs={viewModel.slowThresholdMs}
                onSelect={() => onEntrySelect?.(entry.id)}
                onToggle={() => onEntryToggle?.(entry.id)}
                onPin={onPinTrace ? () => onPinTrace(entry.id) : undefined}
                onUnpin={onUnpinTrace ? () => onUnpinTrace(entry.id) : undefined}
              />
            ))}
          </Box>
        </ScrollView>
      )}

      {/* Time range footer */}
      <Divider orientation="horizontal" color="border" />
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        padding="xs"
        paddingX="sm"
      >
        <Text variant="caption" color="muted">
          Duration: {viewModel.timeRange.durationMs.toFixed(2)}ms
        </Text>
        <Text variant="caption" color="muted">
          Slow threshold: {viewModel.slowThresholdMs}ms
        </Text>
      </Box>
    </Box>
  );
}
