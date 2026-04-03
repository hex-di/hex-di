/**
 * Initialization Order Computation.
 *
 * Computes a stable topological ordering of the dependency graph, grouped
 * into parallelizable initialization levels. The ordering is deterministic:
 * ties between independent ports are broken by adapter registration order.
 *
 * Uses Kahn's algorithm (source-removal) with registration-index tie-breaking.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint } from "@hex-di/core";
import { buildDependencyMap } from "./traversal.js";

/**
 * Computes the initialization order from a dependency graph, grouped into
 * parallelizable levels with stable ordering within each level.
 *
 * The result is an array of arrays where:
 * - Each inner array represents a parallelizable initialization level
 * - Within each level, ports are ordered by adapter registration index
 * - Level 0 contains ports with no dependencies (sources)
 * - Level N contains ports whose dependencies are all in levels 0..N-1
 *
 * For every dependency edge A -> B in the graph, B appears at an earlier
 * level than A. This is the defining property of topological sort.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * ## Stability Guarantee
 *
 * When multiple valid topological orderings exist (independent ports with no
 * dependency relationship), the builder selects a deterministic ordering based
 * on adapter registration order. The same adapter sequence always produces
 * the same initialization order.
 *
 * @param adapters - The adapters in registration order
 * @returns Array of initialization levels (each level is parallelizable), or null if cycle detected
 *
 * @example
 * ```typescript
 * const order = computeInitializationOrder(graph.adapters);
 * if (order) {
 *   // [["Config"], ["Database", "Cache"], ["UserService"]]
 *   // Level 0 can init in parallel, then level 1, etc.
 * }
 * ```
 */
interface KahnState {
  readonly inDegree: Map<string, number>;
  readonly adjList: Map<string, string[]>;
  readonly registrationIndex: Map<string, number>;
}

function buildKahnState(
  adapters: readonly AdapterConstraint[],
  depMap: Readonly<Record<string, readonly string[]>>
): KahnState {
  const portNames = Object.keys(depMap);
  const portSet = new Set(portNames);

  const registrationIndex = new Map<string, number>();
  for (let i = 0; i < adapters.length; i++) {
    registrationIndex.set(adapters[i].provides.__portName, i);
  }

  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const portName of portNames) {
    inDegree.set(portName, 0);
    adjList.set(portName, []);
  }

  for (const [portName, deps] of Object.entries(depMap)) {
    for (const dep of deps) {
      if (portSet.has(dep)) {
        adjList.get(dep)?.push(portName);
        inDegree.set(portName, (inDegree.get(portName) ?? 0) + 1);
      }
    }
  }

  return { inDegree, adjList, registrationIndex };
}

function collectSources(
  inDegree: Map<string, number>,
  registrationIndex: Map<string, number>
): string[] {
  const sources: string[] = [];
  for (const [portName, degree] of inDegree) {
    if (degree === 0) sources.push(portName);
  }
  sources.sort((a, b) => (registrationIndex.get(a) ?? 0) - (registrationIndex.get(b) ?? 0));
  return sources;
}

export function computeInitializationOrder(
  adapters: readonly AdapterConstraint[]
): readonly (readonly string[])[] | null {
  if (adapters.length === 0) return Object.freeze([]);

  const depMap = buildDependencyMap(adapters);
  const { inDegree, adjList, registrationIndex } = buildKahnState(adapters, depMap);

  let currentSources = collectSources(inDegree, registrationIndex);
  const result: (readonly string[])[] = [];
  let processedCount = 0;

  while (currentSources.length > 0) {
    result.push(Object.freeze([...currentSources]));
    processedCount += currentSources.length;

    const nextSources: string[] = [];
    for (const current of currentSources) {
      for (const dependent of adjList.get(current) ?? []) {
        const newDegree = (inDegree.get(dependent) ?? 0) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) nextSources.push(dependent);
      }
    }

    nextSources.sort((a, b) => (registrationIndex.get(a) ?? 0) - (registrationIndex.get(b) ?? 0));
    currentSources = nextSources;
  }

  if (processedCount !== Object.keys(depMap).length) return null;
  return Object.freeze(result);
}
