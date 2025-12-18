/**
 * ServicesPresenter - Pure presentation logic for Services Tab.
 *
 * Transforms graph data, trace stats, and container info into ServicesViewModel
 * ready for rendering. Handles sorting, filtering, and captive dependency detection.
 *
 * @packageDocumentation
 */

import type {
  PresenterDataSourceContract,
  TraceEntry,
  ExportedGraph,
  ExportedNode,
  Lifetime,
} from "@hex-di/devtools-core";
import type {
  ServicesViewModel,
  ServiceRowViewModel,
  ContainerGroupViewModel,
  ServicesSortColumn,
  SortDirection,
} from "../view-models/services.vm.js";
import { createEmptyServicesViewModel, createServicesViewModel } from "../view-models/services.vm.js";
import type { ContainerPhase } from "../view-models/container-hierarchy.vm.js";
import type { AsyncFactoryStatus } from "../view-models/inspector.vm.js";

// =============================================================================
// Captive Dependency Detection
// =============================================================================

/**
 * Lifetime precedence for captive dependency detection.
 * Higher numbers live longer.
 */
const LIFETIME_PRECEDENCE: Record<Lifetime, number> = {
  singleton: 3,
  scoped: 2,
  transient: 1,
};

/**
 * Detects if a service has a captive dependency issue.
 *
 * A captive dependency occurs when a longer-lived service depends on
 * a shorter-lived service:
 * - Singleton depending on scoped or transient
 * - Scoped depending on transient
 */
function detectCaptiveDependency(
  nodeId: string,
  graph: ExportedGraph
): { hasCaptive: boolean; message: string | null } {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) {
    return { hasCaptive: false, message: null };
  }

  const nodePrecedence = LIFETIME_PRECEDENCE[node.lifetime];

  // Find all dependencies (edges where this node is the source)
  const dependencies = graph.edges
    .filter((e) => e.from === nodeId)
    .map((e) => graph.nodes.find((n) => n.id === e.to))
    .filter((n): n is ExportedNode => n !== undefined);

  for (const dep of dependencies) {
    const depPrecedence = LIFETIME_PRECEDENCE[dep.lifetime];
    if (nodePrecedence > depPrecedence) {
      const message = `${capitalizeLifetime(node.lifetime)} service depends on ${dep.lifetime} ${dep.id}`;
      return { hasCaptive: true, message };
    }
  }

  return { hasCaptive: false, message: null };
}

function capitalizeLifetime(lifetime: Lifetime): string {
  return lifetime.charAt(0).toUpperCase() + lifetime.slice(1);
}

// =============================================================================
// ServicesPresenter
// =============================================================================

/**
 * State for the services presenter.
 */
export interface ServicesPresenterState {
  readonly sortColumn: ServicesSortColumn;
  readonly sortDirection: SortDirection;
  readonly filterText: string;
  readonly showOnlyCaptive: boolean;
  readonly showOnlyAsync: boolean;
  readonly expandedContainerIds: readonly string[];
}

/**
 * Default presenter state.
 */
export const defaultServicesPresenterState: ServicesPresenterState = {
  sortColumn: "name",
  sortDirection: "asc",
  filterText: "",
  showOnlyCaptive: false,
  showOnlyAsync: false,
  expandedContainerIds: [],
};

/**
 * Container info for grouping.
 */
interface ContainerInfo {
  readonly id: string;
  readonly name: string;
  readonly phase: ContainerPhase;
}

/**
 * Presenter for Services Tab.
 */
export class ServicesPresenter {
  private state: ServicesPresenterState = defaultServicesPresenterState;
  private containerInfo: Map<string, ContainerInfo> = new Map();

  constructor(private readonly dataSource: PresenterDataSourceContract) {
    // Initialize with root container
    this.containerInfo.set("root", {
      id: "root",
      name: "Root Container",
      phase: "ready",
    });
  }

  /**
   * Get the current services view model.
   */
  getViewModel(): ServicesViewModel {
    const graph = this.dataSource.getGraph();
    const traces = this.dataSource.getTraces();

    if (graph.nodes.length === 0) {
      return createEmptyServicesViewModel();
    }

    // Build per-service statistics from traces
    const serviceStats = this.buildServiceStats(traces);

    // Build service rows
    const serviceRows = this.buildServiceRows(graph, serviceStats);

    // Apply filters
    const filteredServices = this.applyFilters(serviceRows);

    // Sort services
    const sortedServices = this.sortServices(filteredServices);

    // Build container groups
    const containerGroups = this.buildContainerGroups(sortedServices);

    return createServicesViewModel({
      services: sortedServices,
      containerGroups,
      sortColumn: this.state.sortColumn,
      sortDirection: this.state.sortDirection,
      filterText: this.state.filterText,
      showOnlyCaptive: this.state.showOnlyCaptive,
      showOnlyAsync: this.state.showOnlyAsync,
    });
  }

  /**
   * Set sort column and direction.
   */
  setSort(column: ServicesSortColumn): void {
    if (this.state.sortColumn === column) {
      // Toggle direction
      this.state = {
        ...this.state,
        sortDirection: this.state.sortDirection === "asc" ? "desc" : "asc",
      };
    } else {
      this.state = {
        ...this.state,
        sortColumn: column,
        sortDirection: "asc",
      };
    }
  }

  /**
   * Set filter text.
   */
  setFilterText(text: string): void {
    this.state = {
      ...this.state,
      filterText: text,
    };
  }

  /**
   * Toggle captive-only filter.
   */
  toggleCaptiveFilter(): void {
    this.state = {
      ...this.state,
      showOnlyCaptive: !this.state.showOnlyCaptive,
    };
  }

  /**
   * Toggle async-only filter.
   */
  toggleAsyncFilter(): void {
    this.state = {
      ...this.state,
      showOnlyAsync: !this.state.showOnlyAsync,
    };
  }

  /**
   * Toggle container group expansion.
   */
  toggleContainerGroup(containerId: string): void {
    const expanded = this.state.expandedContainerIds;
    const newExpanded = expanded.includes(containerId)
      ? expanded.filter((id) => id !== containerId)
      : [...expanded, containerId];

    this.state = {
      ...this.state,
      expandedContainerIds: newExpanded,
    };
  }

  /**
   * Update container information.
   */
  setContainerInfo(containers: Map<string, ContainerInfo>): void {
    this.containerInfo = containers;
  }

  /**
   * Build per-service statistics from traces.
   */
  private buildServiceStats(traces: readonly TraceEntry[]): Map<
    string,
    {
      resolutionCount: number;
      cacheHitCount: number;
      totalDuration: number;
    }
  > {
    const stats = new Map<
      string,
      {
        resolutionCount: number;
        cacheHitCount: number;
        totalDuration: number;
      }
    >();

    for (const trace of traces) {
      const existing = stats.get(trace.portName) ?? {
        resolutionCount: 0,
        cacheHitCount: 0,
        totalDuration: 0,
      };

      stats.set(trace.portName, {
        resolutionCount: existing.resolutionCount + 1,
        cacheHitCount: existing.cacheHitCount + (trace.isCacheHit ? 1 : 0),
        totalDuration: existing.totalDuration + trace.duration,
      });
    }

    return stats;
  }

  /**
   * Build service rows from graph and stats.
   */
  private buildServiceRows(
    graph: ExportedGraph,
    serviceStats: Map<
      string,
      {
        resolutionCount: number;
        cacheHitCount: number;
        totalDuration: number;
      }
    >
  ): ServiceRowViewModel[] {
    return graph.nodes.map((node): ServiceRowViewModel => {
      const stats = serviceStats.get(node.id);
      const resolutionCount = stats?.resolutionCount ?? 0;
      const cacheHitCount = stats?.cacheHitCount ?? 0;
      const totalDuration = stats?.totalDuration ?? 0;
      const avgDuration = resolutionCount > 0 ? totalDuration / resolutionCount : 0;
      const cacheHitRate = resolutionCount > 0 ? cacheHitCount / resolutionCount : 0;

      // Count dependencies and dependents
      const dependencyCount = graph.edges.filter((e) => e.from === node.id).length;
      const dependentCount = graph.edges.filter((e) => e.to === node.id).length;

      // Detect captive dependency
      const captive = detectCaptiveDependency(node.id, graph);

      // Get container info (default to root)
      const containerId = "root"; // TODO: Get from container hierarchy when available
      const containerInfo = this.containerInfo.get(containerId) ?? {
        id: "root",
        name: "Root Container",
        phase: "ready" as ContainerPhase,
      };

      // Determine async status
      const isAsync = node.factoryKind === "async";
      const asyncStatus: AsyncFactoryStatus = isAsync
        ? resolutionCount > 0
          ? "resolved"
          : "pending"
        : null;

      return {
        portName: node.id,
        lifetime: node.lifetime,
        factoryKind: node.factoryKind,
        resolutionCount,
        cacheHitCount,
        cacheHitRate,
        avgDurationMs: avgDuration,
        avgDurationFormatted: this.formatDuration(avgDuration),
        dependencyCount,
        dependentCount,
        containerId: containerInfo.id,
        containerName: containerInfo.name,
        isAsync,
        asyncStatus,
        hasCaptiveWarning: captive.hasCaptive,
        captiveWarningMessage: captive.message,
      };
    });
  }

  /**
   * Apply filters to service rows.
   */
  private applyFilters(services: ServiceRowViewModel[]): ServiceRowViewModel[] {
    let filtered = services;

    // Text filter
    if (this.state.filterText) {
      const searchTerm = this.state.filterText.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.portName.toLowerCase().includes(searchTerm) ||
          s.lifetime.toLowerCase().includes(searchTerm)
      );
    }

    // Captive filter
    if (this.state.showOnlyCaptive) {
      filtered = filtered.filter((s) => s.hasCaptiveWarning);
    }

    // Async filter
    if (this.state.showOnlyAsync) {
      filtered = filtered.filter((s) => s.isAsync);
    }

    return filtered;
  }

  /**
   * Sort services by current sort column.
   */
  private sortServices(services: ServiceRowViewModel[]): ServiceRowViewModel[] {
    const sorted = [...services];
    const direction = this.state.sortDirection === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (this.state.sortColumn) {
        case "name":
          comparison = a.portName.localeCompare(b.portName);
          break;
        case "lifetime":
          comparison =
            LIFETIME_PRECEDENCE[a.lifetime] - LIFETIME_PRECEDENCE[b.lifetime];
          break;
        case "count":
          comparison = a.resolutionCount - b.resolutionCount;
          break;
        case "duration":
          comparison = a.avgDurationMs - b.avgDurationMs;
          break;
        case "cacheHit":
          comparison = a.cacheHitRate - b.cacheHitRate;
          break;
        case "dependencies":
          comparison = a.dependencyCount - b.dependencyCount;
          break;
      }

      return comparison * direction;
    });

    return sorted;
  }

  /**
   * Build container groups from services.
   */
  private buildContainerGroups(
    services: ServiceRowViewModel[]
  ): ContainerGroupViewModel[] {
    const containerMap = new Map<string, ServiceRowViewModel[]>();

    for (const service of services) {
      const existing = containerMap.get(service.containerId) ?? [];
      existing.push(service);
      containerMap.set(service.containerId, existing);
    }

    const groups: ContainerGroupViewModel[] = [];

    for (const [containerId, containerServices] of containerMap) {
      const containerInfo = this.containerInfo.get(containerId) ?? {
        id: containerId,
        name: containerId,
        phase: "ready" as ContainerPhase,
      };

      groups.push({
        containerId,
        containerName: containerInfo.name,
        containerPhase: containerInfo.phase,
        serviceCount: containerServices.length,
        isExpanded:
          this.state.expandedContainerIds.length === 0 ||
          this.state.expandedContainerIds.includes(containerId),
      });
    }

    return groups;
  }

  /**
   * Format duration for display.
   */
  private formatDuration(ms: number): string {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(0)}us`;
    }
    if (ms < 1000) {
      return `${ms.toFixed(2)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }
}
