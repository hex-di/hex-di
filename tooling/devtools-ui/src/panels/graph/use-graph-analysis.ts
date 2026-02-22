/**
 * Hook for running graph analysis.
 *
 * Delegates to @hex-di/graph/advanced inspection functions.
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import type { GraphAnalysisState, ContainerGraphData } from "./types.js";
import type { GraphInspection } from "@hex-di/graph/advanced";

/**
 * Minimal analysis from ContainerGraphData without requiring a full Graph.
 *
 * Since we only have ContainerGraphData at the UI level (not the full Graph
 * object needed by inspectGraph), we compute what we can from the adapter list.
 */
function analyzeFromGraphData(graphData: ContainerGraphData | undefined): GraphAnalysisState {
  if (graphData === undefined) {
    return createEmptyAnalysis();
  }

  const adapters = graphData.adapters;
  const adapterCount = adapters.length;

  // Compute dependency map
  const depMap = new Map<string, readonly string[]>();
  const portNames = new Set<string>();
  for (const a of adapters) {
    depMap.set(a.portName, a.dependencyNames);
    portNames.add(a.portName);
  }

  // Detect orphan ports (provided but never required by any other adapter)
  const requiredPorts = new Set<string>();
  for (const a of adapters) {
    for (const dep of a.dependencyNames) {
      requiredPorts.add(dep);
    }
  }
  const orphanPorts = adapters
    .filter(a => !requiredPorts.has(a.portName))
    .map(a => a.portName)
    .sort();

  // Compute max chain depth via iterative DFS
  const maxChainDepth = computeMaxDepth(depMap);

  // Compute simple complexity score
  const avgDeps =
    adapterCount > 0
      ? adapters.reduce((sum, a) => sum + a.dependencyNames.length, 0) / adapterCount
      : 0;
  const complexityScore = Math.round(adapterCount * 2 + maxChainDepth * 3 + avgDeps * 5);

  const recommendation: "safe" | "monitor" | "consider-splitting" =
    complexityScore <= 50 ? "safe" : complexityScore <= 100 ? "monitor" : "consider-splitting";

  // Detect unsatisfied requirements
  const unsatisfied = new Set<string>();
  for (const a of adapters) {
    for (const dep of a.dependencyNames) {
      if (!portNames.has(dep)) {
        unsatisfied.add(dep);
      }
    }
  }
  const unsatisfiedRequirements = [...unsatisfied].sort();

  // Ports with inbound/outbound metadata
  let inboundCount = 0;
  let outboundCount = 0;
  for (const a of adapters) {
    const dir =
      a.metadata !== undefined && typeof a.metadata["direction"] === "string"
        ? a.metadata["direction"]
        : undefined;
    if (dir === "inbound") inboundCount++;
    else if (dir === "outbound") outboundCount++;
  }

  return {
    isOpen: false,
    complexityScore,
    recommendation,
    suggestions: [],
    captiveDependencies: [],
    orphanPorts,
    disposalWarnings: [],
    unnecessaryLazyPorts: [],
    portsWithFinalizers: [],
    directionSummary: { inbound: inboundCount, outbound: outboundCount },
    maxChainDepth,
    isComplete: unsatisfiedRequirements.length === 0,
    unsatisfiedRequirements,
    correlationId: `graph_ui_${Date.now()}`,
    depthLimitExceeded: maxChainDepth >= 50,
  };
}

/**
 * Enrich analysis state with data from a full GraphInspection, when available.
 */
function analyzeFromInspection(inspection: GraphInspection): GraphAnalysisState {
  return {
    isOpen: false,
    complexityScore: inspection.typeComplexityScore,
    recommendation: inspection.performanceRecommendation,
    suggestions: inspection.suggestions,
    captiveDependencies: [],
    orphanPorts: [...inspection.orphanPorts],
    disposalWarnings: [...inspection.disposalWarnings],
    unnecessaryLazyPorts: [...inspection.unnecessaryLazyPorts],
    portsWithFinalizers: [...inspection.portsWithFinalizers],
    directionSummary: inspection.directionSummary,
    maxChainDepth: inspection.maxChainDepth,
    isComplete: inspection.isComplete,
    unsatisfiedRequirements: [...inspection.unsatisfiedRequirements],
    correlationId: inspection.correlationId,
    depthWarning: inspection.depthWarning,
    depthLimitExceeded: inspection.depthLimitExceeded,
    actor: inspection.actor,
  };
}

/**
 * Compute max dependency chain depth via iterative DFS.
 */
function computeMaxDepth(depMap: ReadonlyMap<string, readonly string[]>): number {
  const cache = new Map<string, number>();

  function getDepth(portName: string, visited: Set<string>): number {
    if (visited.has(portName)) return 0; // cycle
    const cached = cache.get(portName);
    if (cached !== undefined) return cached;

    visited.add(portName);
    const deps = depMap.get(portName) ?? [];
    let maxChildDepth = 0;
    for (const dep of deps) {
      const childDepth = getDepth(dep, visited);
      if (childDepth > maxChildDepth) maxChildDepth = childDepth;
    }
    visited.delete(portName);

    const depth = maxChildDepth + 1;
    cache.set(portName, depth);
    return depth;
  }

  let maxDepth = 0;
  for (const portName of depMap.keys()) {
    const depth = getDepth(portName, new Set());
    if (depth > maxDepth) maxDepth = depth;
  }
  return maxDepth;
}

function createEmptyAnalysis(): GraphAnalysisState {
  return {
    isOpen: false,
    complexityScore: 0,
    recommendation: "safe",
    suggestions: [],
    captiveDependencies: [],
    orphanPorts: [],
    disposalWarnings: [],
    unnecessaryLazyPorts: [],
    portsWithFinalizers: [],
    directionSummary: { inbound: 0, outbound: 0 },
    maxChainDepth: 0,
    isComplete: true,
    unsatisfiedRequirements: [],
    correlationId: "",
    depthLimitExceeded: false,
  };
}

/**
 * Hook computing graph analysis from container graph data.
 */
function useGraphAnalysis(graphData: ContainerGraphData | undefined): GraphAnalysisState {
  return useMemo(() => analyzeFromGraphData(graphData), [graphData]);
}

export { useGraphAnalysis, analyzeFromGraphData, analyzeFromInspection, createEmptyAnalysis };
