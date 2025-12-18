/**
 * StatsView - Statistics dashboard component.
 *
 * This is a shared headless component that displays aggregated statistics
 * about resolutions, cache efficiency, and performance.
 *
 * @packageDocumentation
 */

import React from "react";
import { usePrimitives } from "../hooks/use-primitives.js";
import type { StatsViewModel, MetricViewModel } from "../view-models/stats.vm.js";
import { getTrendColor } from "../shared/lifetime-colors.js";

// =============================================================================
// Props Interface
// =============================================================================

/**
 * Props for the StatsView component.
 */
export interface StatsViewProps {
  /** The stats view model containing all display state */
  readonly viewModel: StatsViewModel;
}

// =============================================================================
// Metric Card Component
// =============================================================================

interface MetricCardProps {
  readonly metric: MetricViewModel;
}

function MetricCard({ metric }: MetricCardProps): React.ReactElement {
  const { Box, Text } = usePrimitives();

  return (
    <Box flexDirection="column" padding="sm" gap="xs">
      <Text variant="caption" color="muted">
        {metric.label}
      </Text>
      <Box flexDirection="row" alignItems="flex-end" gap="xs">
        <Text variant="heading" color="foreground">
          {metric.formattedValue}
        </Text>
        {metric.unit && (
          <Text variant="caption" color="muted">
            {metric.unit}
          </Text>
        )}
      </Box>
      {metric.trend !== "none" && (
        <Text variant="caption" color={getTrendColor(metric.trend)}>
          {metric.trend === "up" ? "+" : metric.trend === "down" ? "" : ""}
          {metric.trendPercent}%
        </Text>
      )}
    </Box>
  );
}

// =============================================================================
// StatsView Component
// =============================================================================

/**
 * Statistics dashboard component.
 *
 * Displays service counts by lifetime, resolution metrics, and
 * performance statistics in a grid layout.
 *
 * @example
 * ```tsx
 * import { StatsView } from '@hex-di/devtools';
 * import { PrimitivesProvider } from '@hex-di/devtools';
 * import { DOMPrimitives } from '@hex-di/devtools/dom';
 *
 * function App() {
 *   const [viewModel, setViewModel] = useState(createEmptyStatsViewModel());
 *
 *   return (
 *     <PrimitivesProvider primitives={DOMPrimitives}>
 *       <StatsView viewModel={viewModel} />
 *     </PrimitivesProvider>
 *   );
 * }
 * ```
 */
export function StatsView({ viewModel }: StatsViewProps): React.ReactElement {
  const { Box, Text, Icon, Divider, ScrollView } = usePrimitives();

  // Render empty state
  if (viewModel.isEmpty) {
    return (
      <Box
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        padding="lg"
        flexGrow={1}
        data-testid="stats-empty-state"
      >
        <Icon name="stats" size="lg" color="muted" />
        <Text variant="body" color="muted">
          No data available
        </Text>
        <Text variant="caption" color="muted">
          Resolve services to see statistics
        </Text>
      </Box>
    );
  }

  return (
    <ScrollView vertical>
      <Box flexDirection="column" flexGrow={1} padding="sm" gap="md" data-testid="stats-view">
        {/* Summary Metrics */}
        <Box flexDirection="column" gap="sm">
          <Text variant="subheading" color="foreground">
            Summary
          </Text>
          <Box flexDirection="row" gap="md">
            <MetricCard metric={viewModel.metrics.totalResolutions} />
            <MetricCard metric={viewModel.metrics.averageDuration} />
            <MetricCard metric={viewModel.metrics.cacheHitRate} />
          </Box>
        </Box>

        <Divider orientation="horizontal" color="border" />

        {/* Lifetime Breakdown */}
        <Box flexDirection="column" gap="sm">
          <Text variant="subheading" color="foreground">
            Lifetime Breakdown
          </Text>
          <Box flexDirection="row" gap="lg">
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Icon name="singleton" size="sm" color="success" />
              <Text variant="body" color="foreground">
                Singleton
              </Text>
              <Text variant="body" color="muted">
                {viewModel.lifetimeBreakdownFormatted.singleton}
              </Text>
            </Box>
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Icon name="scoped" size="sm" color="warning" />
              <Text variant="body" color="foreground">
                Scoped
              </Text>
              <Text variant="body" color="muted">
                {viewModel.lifetimeBreakdownFormatted.scoped}
              </Text>
            </Box>
            <Box flexDirection="row" alignItems="center" gap="xs">
              <Icon name="transient" size="sm" color="muted" />
              <Text variant="body" color="foreground">
                Transient
              </Text>
              <Text variant="body" color="muted">
                {viewModel.lifetimeBreakdownFormatted.request}
              </Text>
            </Box>
          </Box>
        </Box>

        <Divider orientation="horizontal" color="border" />

        {/* Performance Metrics */}
        <Box flexDirection="column" gap="sm">
          <Text variant="subheading" color="foreground">
            Performance
          </Text>
          <Box flexDirection="row" gap="md">
            <MetricCard metric={viewModel.metrics.slowResolutions} />
            <MetricCard metric={viewModel.metrics.resolutionsPerSecond} />
            <MetricCard metric={viewModel.metrics.sessionDuration} />
          </Box>
        </Box>

        {/* Footer */}
        <Divider orientation="horizontal" color="border" />
        <Box flexDirection="row" justifyContent="space-between" paddingX="sm">
          <Text variant="caption" color="muted">
            Session: {viewModel.sessionDuration}
          </Text>
          <Text variant="caption" color="muted">
            Updated: {viewModel.lastUpdated}
          </Text>
        </Box>
      </Box>
    </ScrollView>
  );
}
