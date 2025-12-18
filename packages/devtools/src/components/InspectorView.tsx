/**
 * InspectorView - Service and scope inspection component.
 *
 * This is a shared headless component that displays detailed information
 * about a selected service or scope, including dependencies and dependents.
 *
 * Features:
 * - Service detail panel layout
 * - Bidirectional dependency tree (dependencies and dependents)
 * - Scope hierarchy visualization
 * - Container snapshot display
 * - Async factory status and timing
 * - Captive dependency chain visualization
 *
 * @packageDocumentation
 */

import React from "react";
import { usePrimitives } from "../hooks/use-primitives.js";
import type {
  InspectorViewModel,
  DependencyViewModel,
  ServiceInfoViewModel,
  ScopeInfoViewModel,
} from "../view-models/inspector.vm.js";
import { getLifetimeColor, getLifetimeIcon } from "../shared/lifetime-colors.js";

// =============================================================================
// Props Interface
// =============================================================================

/**
 * Props for the InspectorView component.
 */
export interface InspectorViewProps {
  /** The inspector view model containing all display state */
  readonly viewModel: InspectorViewModel;
  /** Callback when a dependency is clicked */
  readonly onDependencySelect?: ((portName: string) => void) | undefined;
  /** Callback when dependencies section is toggled */
  readonly onToggleDependencies?: (() => void) | undefined;
  /** Callback when dependents section is toggled */
  readonly onToggleDependents?: (() => void) | undefined;
  /** Callback when a scope is selected */
  readonly onScopeSelect?: ((scopeId: string) => void) | undefined;
  /** Callback when a scope is toggled (expand/collapse) */
  readonly onScopeToggle?: ((scopeId: string) => void) | undefined;
}

// =============================================================================
// Dependency List Item Component
// =============================================================================

interface DependencyItemProps {
  readonly dependency: DependencyViewModel;
  readonly onSelect?: (() => void) | undefined;
}

function DependencyItem({ dependency, onSelect }: DependencyItemProps): React.ReactElement {
  const { Box, Text, Icon } = usePrimitives();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      padding="xs"
      paddingX="sm"
      gap="sm"
      {...(onSelect !== undefined ? { onClick: onSelect } : {})}
    >
      <Icon
        name={getLifetimeIcon(dependency.lifetime)}
        size="sm"
        color={getLifetimeColor(dependency.lifetime)}
      />
      <Text variant="code" color="foreground">
        {dependency.portName}
      </Text>
      <Text variant="caption" color="muted">
        ({dependency.lifetime})
      </Text>
      {!dependency.isDirect && (
        <Text variant="caption" color="muted">
          (indirect)
        </Text>
      )}
    </Box>
  );
}

// =============================================================================
// Async Factory Status Component
// =============================================================================

interface AsyncFactoryStatusSectionProps {
  readonly service: ServiceInfoViewModel;
}

function AsyncFactoryStatusSection({ service }: AsyncFactoryStatusSectionProps): React.ReactElement | null {
  const { Box, Text, Icon } = usePrimitives();

  if (service.factoryKind !== "async") {
    return null;
  }

  const status = service.asyncFactoryStatus ?? "pending";
  const statusColor = status === "resolved" ? "success" : status === "error" ? "error" : "warning";
  const statusIcon = status === "resolved" ? "check" : status === "error" ? "error" : "pending";

  return (
    <Box flexDirection="column" gap="sm">
      <Text variant="subheading" color="foreground">
        Async Factory Status
      </Text>
      <Box flexDirection="row" alignItems="center" gap="md">
        <Box flexDirection="row" alignItems="center" gap="xs">
          <Icon name={statusIcon} size="sm" color={statusColor} />
          <Text variant="body" color={statusColor}>
            {status === "resolved" ? "Resolved" : status === "error" ? "Error" : "Pending"}
          </Text>
        </Box>
        {service.asyncResolutionTime !== null && service.asyncResolutionTime !== undefined && (
          <Box flexDirection="row" alignItems="center" gap="xs">
            <Text variant="caption" color="muted">Resolution time:</Text>
            <Text variant="body" color="foreground">
              {service.asyncResolutionTime.toFixed(2)}ms
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// =============================================================================
// Captive Dependency Chain Component
// =============================================================================

interface CaptiveChainSectionProps {
  readonly service: ServiceInfoViewModel;
  readonly onDependencySelect?: ((portName: string) => void) | undefined;
}

function CaptiveChainSection({ service, onDependencySelect }: CaptiveChainSectionProps): React.ReactElement | null {
  const { Box, Text, Icon } = usePrimitives();

  const captiveChain = service.captiveChain ?? [];
  if (captiveChain.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" gap="sm">
      <Box flexDirection="row" alignItems="center" gap="xs">
        <Icon name="warning" size="sm" color="warning" />
        <Text variant="subheading" color="warning">
          Captive Dependencies
        </Text>
      </Box>
      <Text variant="caption" color="muted">
        This {service.lifetime} service depends on shorter-lived services, which may cause memory leaks.
      </Text>
      <Box flexDirection="column" gap="xs">
        <Box flexDirection="row" alignItems="center" gap="xs">
          <Text variant="code" color="foreground">{service.portName}</Text>
          {captiveChain.map((portName, index) => (
            <React.Fragment key={portName}>
              <Icon name="arrow-right" size="sm" color="warning" />
              <Box
                {...(onDependencySelect ? { onClick: () => onDependencySelect(portName) } : {})}
              >
                <Text variant="code" color="warning">
                  {portName}
                </Text>
              </Box>
            </React.Fragment>
          ))}
        </Box>
      </Box>
      <Text variant="caption" color="muted">
        Lifetime priority: singleton &gt; scoped &gt; transient
      </Text>
    </Box>
  );
}

// =============================================================================
// Service Info Section Component
// =============================================================================

interface ServiceInfoSectionProps {
  readonly service: ServiceInfoViewModel;
}

function ServiceInfoSection({ service }: ServiceInfoSectionProps): React.ReactElement {
  const { Box, Text, Icon, Divider } = usePrimitives();

  const lifetimeColor = getLifetimeColor(service.lifetime);

  return (
    <Box flexDirection="column" gap="sm">
      {/* Service header */}
      <Box flexDirection="row" alignItems="center" gap="sm">
        <Icon
          name={getLifetimeIcon(service.lifetime)}
          size="md"
          color={lifetimeColor}
        />
        <Text variant="heading" color="foreground">
          {service.portName}
        </Text>
        {service.factoryKind === "async" && (
          <Icon name="async" size="sm" color="accent" />
        )}
      </Box>

      {/* Service metadata */}
      <Box flexDirection="row" gap="lg">
        <Box flexDirection="column" gap="xs">
          <Text variant="caption" color="muted">Lifetime</Text>
          <Text variant="body" color={lifetimeColor}>{service.lifetime}</Text>
        </Box>
        <Box flexDirection="column" gap="xs">
          <Text variant="caption" color="muted">Factory</Text>
          <Text variant="body" color="foreground">{service.factoryKind}</Text>
        </Box>
        <Box flexDirection="column" gap="xs">
          <Text variant="caption" color="muted">Resolved</Text>
          <Text variant="body" color={service.isResolved ? "success" : "muted"}>
            {service.isResolved ? "Yes" : "No"}
          </Text>
        </Box>
      </Box>

      <Divider orientation="horizontal" color="border" />

      {/* Performance stats */}
      <Box flexDirection="row" gap="lg">
        <Box flexDirection="column" gap="xs">
          <Text variant="caption" color="muted">Resolutions</Text>
          <Text variant="body" color="foreground">{service.resolutionCount}</Text>
        </Box>
        <Box flexDirection="column" gap="xs">
          <Text variant="caption" color="muted">Avg Duration</Text>
          <Text variant="body" color="foreground">{service.avgDurationFormatted}</Text>
        </Box>
        <Box flexDirection="column" gap="xs">
          <Text variant="caption" color="muted">Cache Hits</Text>
          <Text variant="body" color="foreground">{service.cacheHitCount}</Text>
        </Box>
        <Box flexDirection="column" gap="xs">
          <Text variant="caption" color="muted">Cache Rate</Text>
          <Text variant="body" color="foreground">{(service.cacheHitRate * 100).toFixed(1)}%</Text>
        </Box>
      </Box>

      {service.lastResolved && (
        <Box flexDirection="row" gap="sm">
          <Text variant="caption" color="muted">Last resolved:</Text>
          <Text variant="caption" color="foreground">{service.lastResolved}</Text>
        </Box>
      )}
    </Box>
  );
}

// =============================================================================
// Scope Tree Item Component
// =============================================================================

interface ScopeTreeItemProps {
  readonly scope: ScopeInfoViewModel;
  readonly onSelect?: (() => void) | undefined;
  readonly onToggle?: (() => void) | undefined;
}

function ScopeTreeItem({ scope, onSelect, onToggle }: ScopeTreeItemProps): React.ReactElement {
  const { Box, Text, Icon } = usePrimitives();

  const indentStyle = {
    paddingLeft: `${scope.depth * 16}px`,
  };

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      padding="xs"
      gap="xs"
      style={indentStyle}
    >
      {scope.childIds.length > 0 && (
        <Box {...(onToggle ? { onClick: onToggle } : {})}>
          <Icon
            name={scope.isExpanded ? "chevron-down" : "chevron-right"}
            size="sm"
            color="muted"
          />
        </Box>
      )}
      {scope.childIds.length === 0 && (
        <Box style={{ width: "16px" }} />
      )}
      <Box
        flexDirection="row"
        alignItems="center"
        gap="sm"
        {...(onSelect ? { onClick: onSelect } : {})}
      >
        <Icon
          name={scope.isActive ? "scope-active" : "scope"}
          size="sm"
          color={scope.isSelected ? "accent" : scope.isActive ? "success" : "muted"}
        />
        <Text
          variant="code"
          color={scope.isSelected ? "accent" : "foreground"}
        >
          {scope.name}
        </Text>
        <Text variant="caption" color="muted">
          ({scope.resolvedCount} services)
        </Text>
        {!scope.isActive && (
          <Text variant="caption" color="error">
            (disposed)
          </Text>
        )}
      </Box>
    </Box>
  );
}

// =============================================================================
// Scope Hierarchy Section Component
// =============================================================================

interface ScopeHierarchySectionProps {
  readonly scopeTree: readonly ScopeInfoViewModel[];
  readonly onScopeSelect?: ((scopeId: string) => void) | undefined;
  readonly onScopeToggle?: ((scopeId: string) => void) | undefined;
}

function ScopeHierarchySection({ scopeTree, onScopeSelect, onScopeToggle }: ScopeHierarchySectionProps): React.ReactElement {
  const { Box, Text, Icon } = usePrimitives();

  if (scopeTree.length === 0) {
    return (
      <Box flexDirection="column" gap="sm">
        <Text variant="subheading" color="foreground">
          Scope Hierarchy
        </Text>
        <Text variant="caption" color="muted">
          No scope information available
        </Text>
      </Box>
    );
  }

  // Build visible scopes based on expansion state
  const visibleScopes: ScopeInfoViewModel[] = [];
  const expandedIds = new Set(scopeTree.filter(s => s.isExpanded).map(s => s.id));

  // Add root scopes first
  const roots = scopeTree.filter(s => s.parentId === null);
  const queue = [...roots];

  while (queue.length > 0) {
    const scope = queue.shift()!;
    visibleScopes.push(scope);

    if (expandedIds.has(scope.id)) {
      const children = scopeTree.filter(s => s.parentId === scope.id);
      queue.unshift(...children);
    }
  }

  return (
    <Box flexDirection="column" gap="sm">
      <Box flexDirection="row" alignItems="center" gap="xs">
        <Icon name="scope" size="sm" color="accent" />
        <Text variant="subheading" color="foreground">
          Scope Hierarchy ({scopeTree.length})
        </Text>
      </Box>
      <Box flexDirection="column">
        {visibleScopes.map(scope => (
          <ScopeTreeItem
            key={scope.id}
            scope={scope}
            onSelect={() => onScopeSelect?.(scope.id)}
            onToggle={() => onScopeToggle?.(scope.id)}
          />
        ))}
      </Box>
    </Box>
  );
}

// =============================================================================
// Scope Detail Section Component
// =============================================================================

interface ScopeDetailSectionProps {
  readonly scope: ScopeInfoViewModel;
  readonly scopeServices: readonly ServiceInfoViewModel[];
  readonly onServiceSelect?: ((portName: string) => void) | undefined;
}

function ScopeDetailSection({ scope, scopeServices, onServiceSelect }: ScopeDetailSectionProps): React.ReactElement {
  const { Box, Text, Icon, Divider } = usePrimitives();

  return (
    <Box flexDirection="column" gap="sm">
      {/* Scope header */}
      <Box flexDirection="row" alignItems="center" gap="sm">
        <Icon
          name={scope.isActive ? "scope-active" : "scope"}
          size="md"
          color={scope.isActive ? "success" : "muted"}
        />
        <Text variant="heading" color="foreground">
          {scope.name}
        </Text>
        {!scope.isActive && (
          <Text variant="caption" color="error">(disposed)</Text>
        )}
      </Box>

      {/* Scope metadata */}
      <Box flexDirection="row" gap="lg">
        <Box flexDirection="column" gap="xs">
          <Text variant="caption" color="muted">Status</Text>
          <Text variant="body" color={scope.isActive ? "success" : "error"}>
            {scope.isActive ? "Active" : "Disposed"}
          </Text>
        </Box>
        <Box flexDirection="column" gap="xs">
          <Text variant="caption" color="muted">Services</Text>
          <Text variant="body" color="foreground">{scope.resolvedCount}</Text>
        </Box>
        <Box flexDirection="column" gap="xs">
          <Text variant="caption" color="muted">Depth</Text>
          <Text variant="body" color="foreground">{scope.depth}</Text>
        </Box>
      </Box>

      <Box flexDirection="row" gap="sm">
        <Text variant="caption" color="muted">Created:</Text>
        <Text variant="caption" color="foreground">{scope.createdAt}</Text>
      </Box>

      {scope.parentId && (
        <Box flexDirection="row" gap="sm">
          <Text variant="caption" color="muted">Parent:</Text>
          <Text variant="caption" color="foreground">{scope.parentId}</Text>
        </Box>
      )}

      {scope.childIds.length > 0 && (
        <Box flexDirection="row" gap="sm">
          <Text variant="caption" color="muted">Children:</Text>
          <Text variant="caption" color="foreground">{scope.childIds.join(", ")}</Text>
        </Box>
      )}

      {/* Resolved services in scope */}
      {scopeServices.length > 0 && (
        <>
          <Divider orientation="horizontal" color="border" />
          <Text variant="subheading" color="foreground">
            Resolved Services ({scopeServices.length})
          </Text>
          <Box flexDirection="column">
            {scopeServices.map(service => (
              <Box
                key={service.portName}
                flexDirection="row"
                alignItems="center"
                padding="xs"
                gap="sm"
                {...(onServiceSelect ? { onClick: () => onServiceSelect(service.portName) } : {})}
              >
                <Icon
                  name={getLifetimeIcon(service.lifetime)}
                  size="sm"
                  color={getLifetimeColor(service.lifetime)}
                />
                <Text variant="code" color="foreground">
                  {service.portName}
                </Text>
                <Text variant="caption" color="muted">
                  ({service.avgDurationFormatted})
                </Text>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

// =============================================================================
// InspectorView Component
// =============================================================================

/**
 * Service and scope inspection component.
 *
 * Displays detailed information about the selected service or scope,
 * including dependencies and services that depend on it.
 *
 * @example
 * ```tsx
 * import { InspectorView } from '@hex-di/devtools';
 * import { PrimitivesProvider } from '@hex-di/devtools';
 * import { DOMPrimitives } from '@hex-di/devtools/dom';
 *
 * function App() {
 *   const [viewModel, setViewModel] = useState(createEmptyInspectorViewModel());
 *
 *   return (
 *     <PrimitivesProvider primitives={DOMPrimitives}>
 *       <InspectorView
 *         viewModel={viewModel}
 *         onDependencySelect={(name) => console.log('Selected:', name)}
 *       />
 *     </PrimitivesProvider>
 *   );
 * }
 * ```
 */
export function InspectorView({
  viewModel,
  onDependencySelect,
  onToggleDependencies,
  onToggleDependents,
  onScopeSelect,
  onScopeToggle,
}: InspectorViewProps): React.ReactElement {
  const { Box, Text, Icon, ScrollView, Divider } = usePrimitives();

  // Render empty state
  if (!viewModel.hasData || viewModel.target === "none") {
    return (
      <Box
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        padding="lg"
        flexGrow={1}
        data-testid="inspector-empty-state"
      >
        <Icon name="inspector" size="lg" color="muted" />
        <Text variant="body" color="muted">
          Select a service to inspect
        </Text>
        <Text variant="caption" color="muted">
          Click on a node in the graph
        </Text>
      </Box>
    );
  }

  // Service inspection view
  if (viewModel.target === "service" && viewModel.service) {
    return (
      <ScrollView vertical>
        <Box flexDirection="column" padding="sm" gap="md" data-testid="inspector-view">
          {/* Service info */}
          <ServiceInfoSection service={viewModel.service} />

          {/* Async factory status (if applicable) */}
          {viewModel.service.factoryKind === "async" && (
            <>
              <Divider orientation="horizontal" color="border" />
              <AsyncFactoryStatusSection service={viewModel.service} />
            </>
          )}

          {/* Captive dependency chain (if applicable) */}
          {(viewModel.service.captiveChain?.length ?? 0) > 0 && (
            <>
              <Divider orientation="horizontal" color="border" />
              <CaptiveChainSection
                service={viewModel.service}
                onDependencySelect={onDependencySelect}
              />
            </>
          )}

          <Divider orientation="horizontal" color="border" />

          {/* Dependencies section */}
          <Box flexDirection="column" gap="sm">
            <Box
              flexDirection="row"
              alignItems="center"
              gap="xs"
              {...(onToggleDependencies !== undefined ? { onClick: onToggleDependencies } : {})}
            >
              <Icon
                name={viewModel.showDependencies ? "chevron-down" : "chevron-right"}
                size="sm"
                color="muted"
              />
              <Text variant="subheading" color="foreground">
                Dependencies ({viewModel.dependencies.length})
              </Text>
            </Box>

            {viewModel.showDependencies && (
              <Box flexDirection="column">
                {viewModel.dependencies.length === 0 ? (
                  <Text variant="caption" color="muted">
                    No dependencies
                  </Text>
                ) : (
                  viewModel.dependencies.map((dep) => (
                    <DependencyItem
                      key={dep.portName}
                      dependency={dep}
                      onSelect={() => onDependencySelect?.(dep.portName)}
                    />
                  ))
                )}
              </Box>
            )}
          </Box>

          <Divider orientation="horizontal" color="border" />

          {/* Dependents section */}
          <Box flexDirection="column" gap="sm">
            <Box
              flexDirection="row"
              alignItems="center"
              gap="xs"
              {...(onToggleDependents !== undefined ? { onClick: onToggleDependents } : {})}
            >
              <Icon
                name={viewModel.showDependents ? "chevron-down" : "chevron-right"}
                size="sm"
                color="muted"
              />
              <Text variant="subheading" color="foreground">
                Dependents ({viewModel.dependents.length})
              </Text>
            </Box>

            {viewModel.showDependents && (
              <Box flexDirection="column">
                {viewModel.dependents.length === 0 ? (
                  <Text variant="caption" color="muted">
                    No dependents
                  </Text>
                ) : (
                  viewModel.dependents.map((dep) => (
                    <DependencyItem
                      key={dep.portName}
                      dependency={dep}
                      onSelect={() => onDependencySelect?.(dep.portName)}
                    />
                  ))
                )}
              </Box>
            )}
          </Box>

          {/* Scope hierarchy section */}
          {viewModel.scopeTree.length > 0 && (
            <>
              <Divider orientation="horizontal" color="border" />
              <ScopeHierarchySection
                scopeTree={viewModel.scopeTree}
                onScopeSelect={onScopeSelect}
                onScopeToggle={onScopeToggle}
              />
            </>
          )}
        </Box>
      </ScrollView>
    );
  }

  // Scope inspection view
  if (viewModel.target === "scope" && viewModel.scope) {
    return (
      <ScrollView vertical>
        <Box flexDirection="column" padding="sm" gap="md" data-testid="inspector-scope-view">
          {/* Scope detail */}
          <ScopeDetailSection
            scope={viewModel.scope}
            scopeServices={viewModel.scopeServices}
            onServiceSelect={onDependencySelect}
          />

          <Divider orientation="horizontal" color="border" />

          {/* Full scope hierarchy */}
          <ScopeHierarchySection
            scopeTree={viewModel.scopeTree}
            onScopeSelect={onScopeSelect}
            onScopeToggle={onScopeToggle}
          />
        </Box>
      </ScrollView>
    );
  }

  // Fallback scope view (no specific scope selected)
  return (
    <ScrollView vertical>
      <Box flexDirection="column" padding="sm" gap="md" data-testid="inspector-scope-view">
        <ScopeHierarchySection
          scopeTree={viewModel.scopeTree}
          onScopeSelect={onScopeSelect}
          onScopeToggle={onScopeToggle}
        />
      </Box>
    </ScrollView>
  );
}
