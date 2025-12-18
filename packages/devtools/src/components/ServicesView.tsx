/**
 * ServicesView - Services Tab component.
 *
 * This is a shared headless component that displays a sortable, filterable
 * list of registered services with container grouping, captive warnings,
 * and async factory indicators.
 *
 * @packageDocumentation
 */

import React from "react";
import { usePrimitives } from "../hooks/use-primitives.js";
import type {
  ServicesViewModel,
  ServiceRowViewModel,
  ContainerGroupViewModel,
  ServicesSortColumn,
} from "../view-models/services.vm.js";
import { getLifetimeColor } from "../shared/lifetime-colors.js";

// Shared column widths to keep headers and rows aligned
const COLUMN_WIDTHS = {
  lifetime: 140,
  count: 70,
  cache: 80,
  duration: 90,
  deps: 80,
  asyncStatus: 110,
} as const;

// =============================================================================
// Props Interface
// =============================================================================

/**
 * Props for the ServicesView component.
 */
export interface ServicesViewProps {
  /** The services view model containing all display state */
  readonly viewModel: ServicesViewModel;
  /** Callback when a service is selected (navigates to Inspector) */
  readonly onServiceSelect: (portName: string) => void;
  /** Callback when sort column changes */
  readonly onSort: (column: ServicesSortColumn) => void;
  /** Callback when filter text changes */
  readonly onFilterChange: (text: string) => void;
  /** Callback to toggle container group expansion */
  readonly onToggleContainerGroup?: (containerId: string) => void;
  /** Callback to toggle captive filter */
  readonly onToggleCaptiveFilter?: () => void;
  /** Callback to toggle async filter */
  readonly onToggleAsyncFilter?: () => void;
  /** Callback to navigate to inspector tab */
  readonly onNavigateToInspector?: () => void;
}

// =============================================================================
// Sort Header Component
// =============================================================================

interface SortHeaderProps {
  readonly column: ServicesSortColumn;
  readonly label: string;
  readonly currentSort: ServicesSortColumn;
  readonly sortDirection: "asc" | "desc";
  readonly onSort: (column: ServicesSortColumn) => void;
}

function SortHeader({
  column,
  label,
  currentSort,
  sortDirection,
  onSort,
}: SortHeaderProps): React.ReactElement {
  const { Box, Text } = usePrimitives();
  const isActive = currentSort === column;
  const indicator = isActive ? (sortDirection === "asc" ? "\u25B2" : "\u25BC") : "\u21C5";

  return (
    <Box
      onClick={() => onSort(column)}
      data-testid={`sort-header-${column}`}
      style={{
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Text variant="label" color={isActive ? "accent" : "muted"} bold={isActive}>
        {label.toUpperCase()}
      </Text>
      <Text variant="caption" color={isActive ? "accent" : "muted"} bold>
        {indicator}
      </Text>
    </Box>
  );
}

// =============================================================================
// Service Row Component
// =============================================================================

interface ServiceRowProps {
  readonly service: ServiceRowViewModel;
  readonly onSelect: (portName: string) => void;
}

function ServiceRow({ service, onSelect }: ServiceRowProps): React.ReactElement {
  const { Box, Text, Icon } = usePrimitives();
  const lifetimeColor = getLifetimeColor(service.lifetime);

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      paddingY="xs"
      paddingX="sm"
      gap="md"
      data-testid={`service-row-${service.portName}`}
      onClick={() => onSelect(service.portName)}
      style={{
        border: "1px solid var(--hex-devtools-border)",
        borderRadius: 10,
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        margin: "4px 0",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        cursor: "pointer",
      }}
    >
      {/* Service Name with optional warning */}
      <Box flexDirection="row" alignItems="center" gap="sm" flexGrow={1}>
        {service.hasCaptiveWarning && (
          <span
            data-testid={`captive-warning-${service.portName}`}
            title={service.captiveWarningMessage ?? "Captive dependency warning"}
            style={{ cursor: "help" }}
          >
            <Icon name="settings" size="sm" color="warning" />
          </span>
        )}
        {service.isAsync && (
          <Icon name="async" size="sm" color="primary" />
        )}
        <Box data-testid={`service-link-${service.portName}`}>
          <Text variant="subheading" color="foreground" bold>
            {service.portName}
          </Text>
        </Box>
      </Box>

      {/* Lifetime */}
      <Box width={COLUMN_WIDTHS.lifetime} style={{ display: "flex", justifyContent: "flex-end" }}>
        <Box
          style={{
            borderRadius: 999,
            padding: "4px 8px",
            border: `1px solid var(--hex-devtools-${lifetimeColor}, var(--hex-devtools-border))`,
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          <Text variant="caption" color={lifetimeColor} bold>
            {service.lifetime}
          </Text>
        </Box>
      </Box>

      {/* Resolution Count */}
      <Box width={COLUMN_WIDTHS.count} style={{ textAlign: "right" }}>
        <Text variant="body" color="foreground">
          {service.resolutionCount}
        </Text>
      </Box>

      {/* Cache Hit Rate */}
      <Box width={COLUMN_WIDTHS.cache} style={{ textAlign: "right" }}>
        <Text variant="caption" color="muted">
          {(service.cacheHitRate * 100).toFixed(0)}%
        </Text>
      </Box>

      {/* Duration */}
      <Box width={COLUMN_WIDTHS.duration} style={{ textAlign: "right" }}>
        <Text variant="body" color="foreground" bold>
          {service.avgDurationFormatted}
        </Text>
      </Box>

      {/* Dependencies */}
      <Box width={COLUMN_WIDTHS.deps} style={{ textAlign: "right" }}>
        <Text variant="caption" color="muted" bold>
          {service.dependencyCount}/{service.dependentCount}
        </Text>
      </Box>

      {/* Async Status */}
      <Box width={COLUMN_WIDTHS.asyncStatus} style={{ textAlign: "right" }}>
        {service.isAsync && service.asyncStatus ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 6,
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid var(--hex-devtools-border)",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            <Text
              variant="caption"
              color={
                service.asyncStatus === "resolved"
                  ? "success"
                  : service.asyncStatus === "pending"
                  ? "warning"
                  : "error"
              }
              bold
            >
              {service.asyncStatus}
            </Text>
          </span>
        ) : (
          <Text variant="caption" color="muted">
            —
          </Text>
        )}
      </Box>
    </Box>
  );
}

// =============================================================================
// Container Group Component
// =============================================================================

interface ContainerGroupHeaderProps {
  readonly group: ContainerGroupViewModel;
  readonly onToggle: ((containerId: string) => void) | undefined;
}

function ContainerGroupHeader({
  group,
  onToggle,
}: ContainerGroupHeaderProps): React.ReactElement {
  const { Box, Text, Icon } = usePrimitives();

  const phaseColor =
    group.containerPhase === "ready"
      ? "success"
      : group.containerPhase === "initializing"
      ? "warning"
      : group.containerPhase === "disposing"
      ? "warning"
      : "muted";

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      padding="sm"
      gap="sm"
      onClick={() => onToggle?.(group.containerId)}
      style={{
        backgroundColor: "var(--hex-devtools-background)",
        borderBottom: "1px solid var(--hex-devtools-border)",
        cursor: onToggle ? "pointer" : "default",
      }}
    >
      <Icon
        name={group.isExpanded ? "chevron-down" : "chevron-right"}
        size="sm"
        color="muted"
      />
      <Text variant="subheading" color="foreground">
        {group.containerName}
      </Text>
      <Box
        data-testid={`phase-badge-${group.containerId}`}
        padding="xs"
        style={{
          borderRadius: 4,
          backgroundColor: `var(--hex-devtools-${phaseColor})`,
        }}
      >
        <Text variant="caption" color="background">
          {group.containerPhase}
        </Text>
      </Box>
      <Text variant="caption" color="muted">
        {group.serviceCount} services
      </Text>
    </Box>
  );
}

// =============================================================================
// Table Header Component
// =============================================================================

interface TableHeaderProps {
  readonly sortColumn: ServicesSortColumn;
  readonly sortDirection: "asc" | "desc";
  readonly onSort: (column: ServicesSortColumn) => void;
}

function TableHeader({
  sortColumn,
  sortDirection,
  onSort,
}: TableHeaderProps): React.ReactElement {
  const { Box, Text } = usePrimitives();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      padding="sm"
      paddingX="md"
      gap="md"
      style={{
        borderBottom: "2px solid var(--hex-devtools-border)",
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: 10,
        margin: "0 4px",
      }}
    >
      <Box flexGrow={1}>
        <SortHeader
          column="name"
          label="Service"
          currentSort={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </Box>
      <Box width={COLUMN_WIDTHS.lifetime} style={{ textAlign: "right" }}>
        <SortHeader
          column="lifetime"
          label="Lifetime"
          currentSort={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </Box>
      <Box width={COLUMN_WIDTHS.count} style={{ textAlign: "right" }}>
        <SortHeader
          column="count"
          label="Count"
          currentSort={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </Box>
      <Box width={COLUMN_WIDTHS.cache} style={{ textAlign: "right" }}>
        <SortHeader
          column="cacheHit"
          label="Cache"
          currentSort={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </Box>
      <Box width={COLUMN_WIDTHS.duration} style={{ textAlign: "right" }}>
        <SortHeader
          column="duration"
          label="Avg Time"
          currentSort={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </Box>
      <Box width={COLUMN_WIDTHS.deps} style={{ textAlign: "right" }}>
        <SortHeader
          column="dependencies"
          label="Deps"
          currentSort={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </Box>
      <Box width={COLUMN_WIDTHS.asyncStatus} style={{ textAlign: "right" }}>
        <Text variant="label" color="muted">
          Status
        </Text>
      </Box>
    </Box>
  );
}

// =============================================================================
// Filter Bar Component
// =============================================================================

interface FilterBarProps {
  readonly filterText: string;
  readonly onFilterChange: (text: string) => void;
  readonly showOnlyCaptive: boolean;
  readonly showOnlyAsync: boolean;
  readonly hasCaptiveWarnings: boolean;
  readonly hasAsyncServices: boolean;
  readonly onToggleCaptiveFilter: (() => void) | undefined;
  readonly onToggleAsyncFilter: (() => void) | undefined;
}

function FilterBar({
  filterText,
  onFilterChange,
  showOnlyCaptive,
  showOnlyAsync,
  hasCaptiveWarnings,
  hasAsyncServices,
  onToggleCaptiveFilter,
  onToggleAsyncFilter,
}: FilterBarProps): React.ReactElement {
  const { Box, Text, Icon } = usePrimitives();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      padding="sm"
      gap="md"
      style={{
        borderBottom: "1px solid var(--hex-devtools-border)",
      }}
    >
      {/* Search Input */}
      <Box flexDirection="row" alignItems="center" gap="xs" flexGrow={1}>
        <Icon name="search" size="sm" color="muted" />
        <input
          type="text"
          data-testid="services-search-input"
          placeholder="Filter services..."
          value={filterText}
          onChange={(e) => onFilterChange(e.target.value)}
          style={{
            flex: 1,
            padding: "4px 8px",
            border: "1px solid var(--hex-devtools-border)",
            borderRadius: 4,
            background: "var(--hex-devtools-background)",
            color: "var(--hex-devtools-foreground)",
            fontSize: 13,
          }}
        />
      </Box>

      {/* Captive Filter Toggle */}
      {hasCaptiveWarnings && onToggleCaptiveFilter && (
        <Box
          data-testid="captive-filter-toggle"
          onClick={onToggleCaptiveFilter}
          flexDirection="row"
          alignItems="center"
          gap="xs"
          padding="xs"
          style={{
            cursor: "pointer",
            borderRadius: 4,
            backgroundColor: showOnlyCaptive
              ? "var(--hex-devtools-warning)"
              : "transparent",
            border: "1px solid var(--hex-devtools-warning)",
          }}
        >
          <Icon name="settings" size="sm" color={showOnlyCaptive ? "background" : "warning"} />
          <Text variant="caption" color={showOnlyCaptive ? "background" : "warning"}>
            Captive
          </Text>
        </Box>
      )}

      {/* Async Filter Toggle */}
      {hasAsyncServices && onToggleAsyncFilter && (
        <Box
          data-testid="async-filter-toggle"
          onClick={onToggleAsyncFilter}
          flexDirection="row"
          alignItems="center"
          gap="xs"
          padding="xs"
          style={{
            cursor: "pointer",
            borderRadius: 4,
            backgroundColor: showOnlyAsync
              ? "var(--hex-devtools-primary)"
              : "transparent",
            border: "1px solid var(--hex-devtools-primary)",
          }}
        >
          <Icon name="async" size="sm" color={showOnlyAsync ? "background" : "primary"} />
          <Text variant="caption" color={showOnlyAsync ? "background" : "primary"}>
            Async
          </Text>
        </Box>
      )}
    </Box>
  );
}

// =============================================================================
// ServicesView Component
// =============================================================================

/**
 * Services Tab component.
 *
 * Displays a sortable, filterable list of registered services with:
 * - Container grouping (collapsible)
 * - Sortable columns (name, lifetime, count, duration)
 * - Search/filter functionality
 * - Captive dependency warning badges
 * - Async factory indicators
 * - Click-to-navigate to Inspector
 *
 * @example
 * ```tsx
 * import { ServicesView } from '@hex-di/devtools';
 * import { PrimitivesProvider } from '@hex-di/devtools';
 * import { DOMPrimitives } from '@hex-di/devtools/dom';
 *
 * function App() {
 *   const [viewModel, setViewModel] = useState(createEmptyServicesViewModel());
 *
 *   return (
 *     <PrimitivesProvider primitives={DOMPrimitives}>
 *       <ServicesView
 *         viewModel={viewModel}
 *         onServiceSelect={(name) => console.log(name)}
 *         onSort={(col) => console.log(col)}
 *         onFilterChange={(text) => console.log(text)}
 *       />
 *     </PrimitivesProvider>
 *   );
 * }
 * ```
 */
export function ServicesView({
  viewModel,
  onServiceSelect,
  onSort,
  onFilterChange,
  onToggleContainerGroup,
  onToggleCaptiveFilter,
  onToggleAsyncFilter,
  onNavigateToInspector,
}: ServicesViewProps): React.ReactElement {
  const { Box, Text, Icon, ScrollView } = usePrimitives();

  // Handle service selection with optional navigation
  const handleServiceSelect = (portName: string) => {
    onServiceSelect(portName);
    onNavigateToInspector?.();
  };

  // Render empty state
  if (viewModel.isEmpty) {
    return (
      <Box
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        padding="lg"
        flexGrow={1}
        data-testid="services-empty-state"
      >
        <Icon name="services" size="lg" color="muted" />
        <Text variant="body" color="muted">
          No services registered
        </Text>
        <Text variant="caption" color="muted">
          Register services to see them here
        </Text>
      </Box>
    );
  }

  // Group services by container
  const servicesByContainer = new Map<string, ServiceRowViewModel[]>();
  for (const service of viewModel.services) {
    const existing = servicesByContainer.get(service.containerId) ?? [];
    existing.push(service);
    servicesByContainer.set(service.containerId, existing);
  }

  return (
    <Box flexDirection="column" flexGrow={1} data-testid="services-view">
      {/* Filter Bar */}
      <FilterBar
        filterText={viewModel.filterText}
        onFilterChange={onFilterChange}
        showOnlyCaptive={viewModel.showOnlyCaptive}
        showOnlyAsync={viewModel.showOnlyAsync}
        hasCaptiveWarnings={viewModel.hasCaptiveWarnings}
        hasAsyncServices={viewModel.hasAsyncServices}
        onToggleCaptiveFilter={onToggleCaptiveFilter}
        onToggleAsyncFilter={onToggleAsyncFilter}
      />

      {/* Summary */}
      <Box
        flexDirection="row"
        alignItems="center"
        padding="sm"
        gap="md"
        style={{ borderBottom: "1px solid var(--hex-devtools-border)" }}
      >
        <Text variant="caption" color="muted">
          {viewModel.filteredCount} of {viewModel.totalServiceCount} services
        </Text>
        {viewModel.hasCaptiveWarnings && (
          <Box flexDirection="row" alignItems="center" gap="xs">
            <Icon name="settings" size="sm" color="warning" />
            <Text variant="caption" color="warning">
              Captive warnings
            </Text>
          </Box>
        )}
      </Box>

      {/* Table Header */}
      <TableHeader
        sortColumn={viewModel.sortColumn}
        sortDirection={viewModel.sortDirection}
        onSort={onSort}
      />

      {/* Services List */}
      <ScrollView vertical>
        <Box flexDirection="column">
          {viewModel.hasMultipleContainers ? (
            // Grouped by container
            viewModel.containerGroups.map((group) => (
              <Box key={group.containerId} flexDirection="column">
                <ContainerGroupHeader
                  group={group}
                  onToggle={onToggleContainerGroup}
                />
                {group.isExpanded &&
                  (servicesByContainer.get(group.containerId) ?? []).map(
                    (service) => (
                      <ServiceRow
                        key={service.portName}
                        service={service}
                        onSelect={handleServiceSelect}
                      />
                    )
                  )}
              </Box>
            ))
          ) : (
            // Flat list
            viewModel.services.map((service) => (
              <ServiceRow
                key={service.portName}
                service={service}
                onSelect={handleServiceSelect}
              />
            ))
          )}
        </Box>
      </ScrollView>
    </Box>
  );
}
