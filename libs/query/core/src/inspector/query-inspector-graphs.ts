/**
 * Query Inspector Graph Building
 *
 * Builds invalidation and dependency graphs from cache state and options.
 *
 * @packageDocumentation
 */

import type { CacheKey } from "../cache/cache-key.js";
import type { CacheEntrySnapshot } from "../cache/cache-entry.js";
import type {
  InvalidationGraph,
  RuntimeInvalidationEdge,
  QueryDependencyGraph,
  QueryPortInfo,
  QueryInspectorOptions,
} from "./query-inspector-types.js";
import { detectCycles, computeMaxCascadeDepth } from "./query-inspector-utils.js";

function addMutationEdges(
  mutationPorts: QueryInspectorOptions["mutationPorts"],
  nodeSet: Set<string>,
  edges: Array<{ from: string; to: string; type: "invalidates" | "removes" }>,
  adjacency: Map<string, string[]>
): void {
  for (const mp of mutationPorts ?? []) {
    nodeSet.add(mp.name);
    addEffectEdges(mp.name, mp.effects?.invalidates, "invalidates", nodeSet, edges, adjacency);
    addEffectEdges(mp.name, mp.effects?.removes, "removes", nodeSet, edges, adjacency);
  }
}

function addEffectEdges(
  from: string,
  targets: ReadonlyArray<{ readonly __portName: string }> | undefined,
  type: "invalidates" | "removes",
  nodeSet: Set<string>,
  edges: Array<{ from: string; to: string; type: "invalidates" | "removes" }>,
  adjacency: Map<string, string[]>
): void {
  if (!targets) return;
  for (const target of targets) {
    nodeSet.add(target.__portName);
    edges.push({ from, to: target.__portName, type });
    const adj = adjacency.get(from) ?? [];
    adj.push(target.__portName);
    adjacency.set(from, adj);
  }
}

function collectRuntimeEdges(
  runtimeInvalidations: ReadonlyMap<
    string,
    { count: number; lastTriggered: number; totalEntriesAffected: number }
  >,
  nodeSet: Set<string>,
  adjacency: Map<string, string[]>
): RuntimeInvalidationEdge[] {
  const runtimeEdges: RuntimeInvalidationEdge[] = [];
  for (const [key, tracking] of runtimeInvalidations) {
    const [from, to, effect] = key.split("→");
    nodeSet.add(from);
    nodeSet.add(to);
    runtimeEdges.push({
      from,
      to,
      effect: effect === "removes" ? "removes" : "invalidates",
      count: tracking.count,
      lastTriggered: tracking.lastTriggered,
      totalEntriesAffected: tracking.totalEntriesAffected,
    });

    if (!adjacency.has(from)) {
      adjacency.set(from, []);
    }
    const adj = adjacency.get(from);
    if (adj && !adj.includes(to)) {
      adj.push(to);
    }
  }
  return runtimeEdges;
}

function buildWarnings(
  cycles: ReadonlyArray<ReadonlyArray<string>>,
  maxCascadeDepth: number,
  runtimeInvalidations: ReadonlyMap<string, unknown>,
  staticEdgeKeys: Set<string>
): string[] {
  const warnings: string[] = [];
  if (cycles.length > 0) {
    warnings.push(`Detected ${cycles.length} invalidation cycle(s)`);
  }
  if (maxCascadeDepth > 3) {
    warnings.push(`Deep invalidation cascade detected (depth: ${maxCascadeDepth})`);
  }
  for (const [key] of runtimeInvalidations) {
    if (!staticEdgeKeys.has(key)) {
      const [from, to, effect] = key.split("→");
      warnings.push(
        `Runtime-only edge: ${from} --${effect}--> ${to} (not declared in static config)`
      );
    }
  }
  return warnings;
}

export function buildInvalidationGraph(params: {
  cacheFindAll: () => Iterable<readonly [CacheKey, CacheEntrySnapshot]>;
  mutationPorts: QueryInspectorOptions["mutationPorts"];
  runtimeInvalidations: ReadonlyMap<
    string,
    { count: number; lastTriggered: number; totalEntriesAffected: number }
  >;
}): InvalidationGraph {
  const { cacheFindAll, mutationPorts, runtimeInvalidations } = params;

  const allEntries = cacheFindAll();
  const nodeSet = new Set<string>();
  for (const [key] of allEntries) {
    nodeSet.add(key[0]);
  }

  const edges: Array<{ from: string; to: string; type: "invalidates" | "removes" }> = [];
  const adjacency = new Map<string, string[]>();

  addMutationEdges(mutationPorts, nodeSet, edges, adjacency);

  const staticEdgeKeys = new Set(edges.map(e => `${e.from}→${e.to}→${e.type}`));
  const runtimeEdges = collectRuntimeEdges(runtimeInvalidations, nodeSet, adjacency);

  const nodes = [...nodeSet];
  const cycles = detectCycles(nodes, adjacency);
  const maxCascadeDepth = computeMaxCascadeDepth(adjacency);
  const warnings = buildWarnings(cycles, maxCascadeDepth, runtimeInvalidations, staticEdgeKeys);

  return {
    nodes,
    edges,
    runtimeEdges,
    cycles,
    maxCascadeDepth,
    warnings,
  };
}

export function buildQueryDependencyGraph(params: {
  queryPorts: ReadonlyArray<QueryPortInfo> | undefined;
}): QueryDependencyGraph {
  const { queryPorts } = params;

  const staticEdges: Array<{ from: string; to: string }> = [];
  const adjacency = new Map<string, string[]>();
  const nodeSet = new Set<string>();

  for (const qp of queryPorts ?? []) {
    nodeSet.add(qp.name);
    if (qp.dependsOn) {
      for (const dep of qp.dependsOn) {
        nodeSet.add(dep.__portName);
        staticEdges.push({ from: qp.name, to: dep.__portName });
        const adj = adjacency.get(qp.name) ?? [];
        adj.push(dep.__portName);
        adjacency.set(qp.name, adj);
      }
    }
  }

  const nodes = [...nodeSet];
  const cycles = detectCycles(nodes, adjacency);

  return {
    staticEdges,
    dynamicEdges: [],
    cycles,
  };
}
