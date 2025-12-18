/**
 * InspectorPresenter - Pure presentation logic for service/scope inspection.
 *
 * Transforms container data into InspectorViewModel ready for rendering.
 *
 * @packageDocumentation
 */

import type { PresenterDataSourceContract, TraceEntry, ScopeInfo } from "@hex-di/devtools-core";
import type {
  InspectorViewModel,
  ServiceInfoViewModel,
  DependencyViewModel,
  ScopeInfoViewModel,
  InspectorTarget,
  AsyncFactoryStatus,
} from "../view-models/index.js";
import { createEmptyInspectorViewModel } from "../view-models/index.js";

// =============================================================================
// Lifetime Priority for Captive Detection
// =============================================================================

const LIFETIME_PRIORITY: Record<string, number> = {
  singleton: 3,
  scoped: 2,
  transient: 1,
};

// =============================================================================
// InspectorPresenter
// =============================================================================

/**
 * Presenter for service and scope inspection.
 */
export class InspectorPresenter {
  private target: InspectorTarget = "none";
  private selectedServicePortName: string | null = null;
  private selectedScopeId: string | null = null;
  private filterText = "";
  private showDependencies = true;
  private showDependents = true;
  private expandedScopeIds: Set<string> = new Set();

  constructor(private readonly dataSource: PresenterDataSourceContract) {}

  /**
   * Get the current inspector view model.
   */
  getViewModel(): InspectorViewModel {
    const hasData = this.dataSource.hasContainer() || this.dataSource.hasTracing();

    if (!hasData) {
      return createEmptyInspectorViewModel();
    }

    const service = this.selectedServicePortName
      ? this.getServiceInfo(this.selectedServicePortName)
      : null;

    const dependencies = service
      ? this.getDependencies(this.selectedServicePortName!)
      : [];

    const dependents = service
      ? this.getDependents(this.selectedServicePortName!)
      : [];

    const snapshot = this.dataSource.getContainerSnapshot();
    const scope = this.selectedScopeId && snapshot
      ? this.getScopeInfo(this.selectedScopeId, snapshot.scopes)
      : null;

    const scopeServices = scope && snapshot
      ? this.getScopeServices(this.selectedScopeId!, snapshot.scopes)
      : [];

    const scopeTree = snapshot
      ? this.buildScopeTree(snapshot.scopes)
      : [];

    return Object.freeze({
      target: this.target,
      service,
      dependencies: Object.freeze(dependencies),
      dependents: Object.freeze(dependents),
      scope,
      scopeServices: Object.freeze(scopeServices),
      scopeTree: Object.freeze(scopeTree),
      filterText: this.filterText,
      showDependencies: this.showDependencies,
      showDependents: this.showDependents,
      hasData,
    });
  }

  /**
   * Select a service for inspection.
   */
  selectService(portName: string | null): void {
    this.selectedServicePortName = portName;
    this.target = portName ? "service" : "none";
    this.selectedScopeId = null;
  }

  /**
   * Select a scope for inspection.
   */
  selectScope(scopeId: string | null): void {
    this.selectedScopeId = scopeId;
    this.target = scopeId ? "scope" : "none";
    this.selectedServicePortName = null;
  }

  /**
   * Set filter text.
   */
  setFilterText(text: string): void {
    this.filterText = text;
  }

  /**
   * Toggle dependencies visibility.
   */
  setShowDependencies(show: boolean): void {
    this.showDependencies = show;
  }

  /**
   * Toggle dependents visibility.
   */
  setShowDependents(show: boolean): void {
    this.showDependents = show;
  }

  /**
   * Toggle scope expansion.
   */
  toggleScopeExpand(scopeId: string): void {
    if (this.expandedScopeIds.has(scopeId)) {
      this.expandedScopeIds.delete(scopeId);
    } else {
      this.expandedScopeIds.add(scopeId);
    }
  }

  /**
   * Get service information.
   */
  private getServiceInfo(portName: string): ServiceInfoViewModel | null {
    const graph = this.dataSource.getGraph();
    const node = graph.nodes.find(n => n.id === portName);

    if (!node) {
      return null;
    }

    const traces = this.dataSource.getTraces().filter(t => t.portName === portName);
    const resolutionCount = traces.length;
    const cacheHitCount = traces.filter(t => t.isCacheHit).length;
    const totalDurationMs = traces.reduce((sum, t) => sum + t.duration, 0);
    const avgDurationMs = resolutionCount > 0 ? totalDurationMs / resolutionCount : 0;
    const lastTrace = traces.length > 0 ? traces[traces.length - 1] : null;

    // Calculate async factory status (Task 3.7)
    const asyncFactoryStatus = this.getAsyncFactoryStatus(node.factoryKind, traces);
    const asyncResolutionTime = this.getAsyncResolutionTime(node.factoryKind, traces);

    // Calculate captive chain if applicable (Task 3.7)
    const captiveChain = this.getCaptiveChain(portName);

    return Object.freeze({
      portName: node.id,
      lifetime: node.lifetime,
      factoryKind: node.factoryKind,
      isResolved: resolutionCount > 0,
      resolutionCount,
      avgDurationMs,
      avgDurationFormatted: this.formatDuration(avgDurationMs),
      cacheHitCount,
      cacheHitRate: resolutionCount > 0 ? cacheHitCount / resolutionCount : 0,
      lastResolved: lastTrace ? new Date(lastTrace.startTime).toLocaleString() : null,
      totalDurationMs,
      asyncFactoryStatus,
      asyncResolutionTime,
      captiveChain,
    });
  }

  /**
   * Get async factory resolution status.
   */
  private getAsyncFactoryStatus(
    factoryKind: "sync" | "async",
    traces: readonly TraceEntry[]
  ): AsyncFactoryStatus {
    if (factoryKind !== "async") {
      return null;
    }

    if (traces.length === 0) {
      return "pending";
    }

    // Check if any trace has cache hit (means it was resolved successfully)
    const hasResolved = traces.some(t => t.isCacheHit || t.duration >= 0);
    return hasResolved ? "resolved" : "pending";
  }

  /**
   * Get async resolution time (first non-cache-hit resolution).
   */
  private getAsyncResolutionTime(
    factoryKind: "sync" | "async",
    traces: readonly TraceEntry[]
  ): number | null {
    if (factoryKind !== "async") {
      return null;
    }

    // Find the first non-cache-hit trace (the actual resolution)
    const firstResolution = traces.find(t => !t.isCacheHit);
    return firstResolution?.duration ?? null;
  }

  /**
   * Get the captive dependency chain for a service.
   *
   * Returns an array of port names forming the captive chain,
   * where a longer-lived service depends on a shorter-lived one.
   */
  private getCaptiveChain(portName: string): readonly string[] {
    const graph = this.dataSource.getGraph();
    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
    const sourceNode = nodeMap.get(portName);

    if (!sourceNode) {
      return [];
    }

    const chain: string[] = [];
    const sourcePriority = LIFETIME_PRIORITY[sourceNode.lifetime] ?? 1;

    // Find direct dependencies that are shorter-lived (captive)
    graph.edges
      .filter(e => e.from === portName)
      .forEach(edge => {
        const targetNode = nodeMap.get(edge.to);
        if (targetNode) {
          const targetPriority = LIFETIME_PRIORITY[targetNode.lifetime] ?? 1;
          if (sourcePriority > targetPriority) {
            chain.push(edge.to);
          }
        }
      });

    return Object.freeze(chain);
  }

  /**
   * Get dependencies for a service.
   */
  private getDependencies(portName: string): DependencyViewModel[] {
    const graph = this.dataSource.getGraph();
    const direct = new Set<string>();
    const all = new Map<string, number>();

    // Direct dependencies
    graph.edges
      .filter(e => e.from === portName)
      .forEach(e => {
        direct.add(e.to);
        all.set(e.to, 0);
      });

    // Transitive dependencies (BFS)
    const queue = [...direct].map(id => ({ id, depth: 1 }));
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      graph.edges
        .filter(e => e.from === id)
        .forEach(e => {
          if (!all.has(e.to) || all.get(e.to)! > depth) {
            all.set(e.to, depth);
            queue.push({ id: e.to, depth: depth + 1 });
          }
        });
    }

    return Array.from(all.entries()).map(([depPortName, depth]) => {
      const node = graph.nodes.find(n => n.id === depPortName);
      return Object.freeze({
        portName: depPortName,
        lifetime: node?.lifetime ?? "transient",
        isDirect: direct.has(depPortName),
        depth,
      });
    });
  }

  /**
   * Get dependents (services that depend on this one).
   */
  private getDependents(portName: string): DependencyViewModel[] {
    const graph = this.dataSource.getGraph();
    const direct = new Set<string>();
    const all = new Map<string, number>();

    // Direct dependents
    graph.edges
      .filter(e => e.to === portName)
      .forEach(e => {
        direct.add(e.from);
        all.set(e.from, 0);
      });

    // Transitive dependents (BFS)
    const queue = [...direct].map(id => ({ id, depth: 1 }));
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      graph.edges
        .filter(e => e.to === id)
        .forEach(e => {
          if (!all.has(e.from) || all.get(e.from)! > depth) {
            all.set(e.from, depth);
            queue.push({ id: e.from, depth: depth + 1 });
          }
        });
    }

    return Array.from(all.entries()).map(([depPortName, depth]) => {
      const node = graph.nodes.find(n => n.id === depPortName);
      return Object.freeze({
        portName: depPortName,
        lifetime: node?.lifetime ?? "transient",
        isDirect: direct.has(depPortName),
        depth,
      });
    });
  }

  /**
   * Get scope information.
   */
  private getScopeInfo(scopeId: string, scopes: readonly ScopeInfo[]): ScopeInfoViewModel | null {
    const scope = scopes.find(s => s.id === scopeId);
    if (!scope) return null;

    const depth = this.calculateScopeDepth(scopeId, scopes);

    return Object.freeze({
      id: scope.id,
      name: scope.id,
      parentId: scope.parentId,
      childIds: Object.freeze([...scope.childIds]),
      resolvedCount: scope.resolvedPorts.length,
      createdAt: new Date(scope.createdAt).toLocaleString(),
      isActive: scope.isActive,
      isSelected: this.selectedScopeId === scope.id,
      isExpanded: this.expandedScopeIds.has(scope.id),
      depth,
    });
  }

  /**
   * Get services resolved in a scope.
   */
  private getScopeServices(scopeId: string, scopes: readonly ScopeInfo[]): ServiceInfoViewModel[] {
    const scope = scopes.find(s => s.id === scopeId);
    if (!scope) return [];

    return scope.resolvedPorts
      .map(portName => this.getServiceInfo(portName))
      .filter((s): s is ServiceInfoViewModel => s !== null);
  }

  /**
   * Build scope tree view models.
   */
  private buildScopeTree(scopes: readonly ScopeInfo[]): ScopeInfoViewModel[] {
    return scopes.map(scope => {
      const depth = this.calculateScopeDepth(scope.id, scopes);
      return Object.freeze({
        id: scope.id,
        name: scope.id,
        parentId: scope.parentId,
        childIds: Object.freeze([...scope.childIds]),
        resolvedCount: scope.resolvedPorts.length,
        createdAt: new Date(scope.createdAt).toLocaleString(),
        isActive: scope.isActive,
        isSelected: this.selectedScopeId === scope.id,
        isExpanded: this.expandedScopeIds.has(scope.id),
        depth,
      });
    });
  }

  /**
   * Calculate scope depth in hierarchy.
   */
  private calculateScopeDepth(scopeId: string, scopes: readonly ScopeInfo[]): number {
    let depth = 0;
    let current = scopes.find(s => s.id === scopeId);

    while (current?.parentId) {
      depth++;
      current = scopes.find(s => s.id === current!.parentId);
    }

    return depth;
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
