/**
 * Graph Traversal Utilities.
 *
 * This module provides reusable functions for traversing and analyzing
 * dependency graphs at runtime. These utilities complement the compile-time
 * type-level validation with runtime inspection capabilities.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint } from "@hex-di/core";

/**
 * Adjacency map representing the dependency graph structure.
 * Maps each port name to its direct dependencies.
 *
 * @example
 * ```typescript
 * const depMap: DependencyMap = {
 *   "UserService": ["UserRepository", "Logger"],
 *   "UserRepository": ["Database"],
 *   "Logger": [],
 *   "Database": []
 * };
 * ```
 */
export type DependencyMap = Record<string, readonly string[]>;

/**
 * Builds a dependency map from a collection of adapters.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * ## Iteration Order Independence
 *
 * The resulting map is semantically identical regardless of adapter order.
 * The array order of dependencies within each port reflects the adapter's
 * `requires` array order.
 *
 * @param adapters - The adapters to build the dependency map from
 * @returns A frozen dependency map (port name -> dependency port names)
 *
 * @example
 * ```typescript
 * const depMap = buildDependencyMap(graph.adapters);
 * console.log(depMap["UserService"]); // ["UserRepository", "Logger"]
 * ```
 */
export function buildDependencyMap(
  adapters: readonly AdapterConstraint[]
): Readonly<DependencyMap> {
  const result: DependencyMap = {};

  for (const adapter of adapters) {
    const portName = adapter.provides.__portName;
    const deps = adapter.requires.map(r => r.__portName);
    result[portName] = Object.freeze(deps);
  }

  return Object.freeze(result);
}

/**
 * Computes the topological order of ports in a dependency graph.
 *
 * Returns ports in an order where each port appears after all its dependencies.
 * This is the order in which services should be initialized.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * ## Iteration Order Independence
 *
 * When multiple valid topological orders exist, the function returns
 * a deterministic result based on the input order. For a consistent
 * canonical order, sort the input adapters first.
 *
 * @param adapters - The adapters to compute topological order for
 * @returns Array of port names in initialization order, or null if cycle detected
 *
 * @example
 * ```typescript
 * const order = topologicalSort(graph.adapters);
 * if (order) {
 *   console.log("Init order:", order);
 *   // ["Database", "Logger", "UserRepository", "UserService"]
 * } else {
 *   console.error("Cycle detected");
 * }
 * ```
 */
export function topologicalSort(adapters: readonly AdapterConstraint[]): string[] | null {
  const depMap = buildDependencyMap(adapters);
  const portNames = Object.keys(depMap);
  const portSet = new Set(portNames);

  // Kahn's algorithm for topological sort
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  // Initialize structures
  for (const port of portNames) {
    inDegree.set(port, 0);
    adjList.set(port, []);
  }

  // Build reverse adjacency and in-degree counts
  for (const [port, deps] of Object.entries(depMap)) {
    for (const dep of deps) {
      // Only count internal dependencies
      if (portSet.has(dep)) {
        adjList.get(dep)?.push(port);
        inDegree.set(port, (inDegree.get(port) ?? 0) + 1);
      }
    }
  }

  // Start with nodes that have no dependencies
  const queue: string[] = [];
  for (const [port, degree] of inDegree) {
    if (degree === 0) {
      queue.push(port);
    }
  }

  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;

    result.push(current);

    // Reduce in-degree for all dependents
    for (const dependent of adjList.get(current) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  // If we couldn't visit all ports, there's a cycle
  if (result.length !== portNames.length) {
    return null;
  }

  return result;
}

/**
 * Gets all transitive dependencies of a port.
 *
 * Returns all ports that the given port depends on, directly or indirectly.
 * Useful for understanding the full dependency tree of a service.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param portName - The port to get transitive dependencies for
 * @param depMap - The dependency map to traverse
 * @returns Set of all transitive dependencies (excludes the port itself)
 *
 * @example
 * ```typescript
 * const deps = getTransitiveDependencies("UserService", depMap);
 * // Set { "UserRepository", "Database", "Logger" }
 * ```
 */
export function getTransitiveDependencies(
  portName: string,
  depMap: Readonly<DependencyMap>
): ReadonlySet<string> {
  const result = new Set<string>();
  const visited = new Set<string>();

  function dfs(current: string): void {
    if (visited.has(current)) return;
    visited.add(current);

    const deps = depMap[current];
    if (!deps) return;

    for (const dep of deps) {
      result.add(dep);
      dfs(dep);
    }
  }

  dfs(portName);
  return result;
}

/**
 * Gets all transitive dependents of a port.
 *
 * Returns all ports that depend on the given port, directly or indirectly.
 * Useful for understanding the impact of changing a service.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param portName - The port to get transitive dependents for
 * @param depMap - The dependency map to traverse
 * @returns Set of all transitive dependents (excludes the port itself)
 *
 * @example
 * ```typescript
 * const dependents = getTransitiveDependents("Database", depMap);
 * // Set { "UserRepository", "UserService" }
 * ```
 */
export function getTransitiveDependents(
  portName: string,
  depMap: Readonly<DependencyMap>
): ReadonlySet<string> {
  // Build reverse adjacency map
  const reverseDeps: Record<string, string[]> = {};

  for (const [port, deps] of Object.entries(depMap)) {
    for (const dep of deps) {
      if (!reverseDeps[dep]) {
        reverseDeps[dep] = [];
      }
      reverseDeps[dep].push(port);
    }
  }

  const result = new Set<string>();
  const visited = new Set<string>();

  function dfs(current: string): void {
    if (visited.has(current)) return;
    visited.add(current);

    const dependents = reverseDeps[current];
    if (!dependents) return;

    for (const dependent of dependents) {
      result.add(dependent);
      dfs(dependent);
    }
  }

  dfs(portName);
  return result;
}

/**
 * Finds a dependency path between two ports, if one exists.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param from - The starting port (dependent)
 * @param to - The target port (dependency)
 * @param depMap - The dependency map to traverse
 * @returns Array representing the path from -> to, or null if no path exists
 *
 * @example
 * ```typescript
 * const path = findDependencyPath("UserService", "Database", depMap);
 * // ["UserService", "UserRepository", "Database"]
 * ```
 */
export function findDependencyPath(
  from: string,
  to: string,
  depMap: Readonly<DependencyMap>
): string[] | null {
  if (from === to) {
    return [from];
  }

  const visited = new Set<string>();
  const parent = new Map<string, string>();

  function bfs(): boolean {
    const queue: string[] = [from];
    visited.add(from);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;

      const deps = depMap[current];
      if (!deps) continue;

      for (const dep of deps) {
        if (visited.has(dep)) continue;

        visited.add(dep);
        parent.set(dep, current);

        if (dep === to) {
          return true;
        }

        queue.push(dep);
      }
    }

    return false;
  }

  if (!bfs()) {
    return null;
  }

  // Reconstruct path
  const path: string[] = [to];
  let current = to;
  let next = parent.get(current);
  while (next !== undefined) {
    current = next;
    path.unshift(current);
    next = parent.get(current);
  }

  return path;
}

/**
 * Finds common dependencies between two or more ports.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param portNames - The ports to find common dependencies for
 * @param depMap - The dependency map to traverse
 * @returns Set of ports that all given ports depend on (transitively)
 *
 * @example
 * ```typescript
 * const common = findCommonDependencies(["ServiceA", "ServiceB"], depMap);
 * // Set { "Logger", "Config" }
 * ```
 */
export function findCommonDependencies(
  portNames: readonly string[],
  depMap: Readonly<DependencyMap>
): ReadonlySet<string> {
  if (portNames.length === 0) {
    return new Set();
  }

  // Get transitive dependencies for each port
  const depSets = portNames.map(port => getTransitiveDependencies(port, depMap));

  // Find intersection
  const firstSet = depSets[0];
  if (!firstSet) return new Set();

  const result = new Set<string>();
  for (const dep of firstSet) {
    if (depSets.every(set => set.has(dep))) {
      result.add(dep);
    }
  }

  return result;
}

/**
 * Computes the dependency layers (initialization levels) for all ports.
 *
 * Ports with no dependencies are at level 0, ports that only depend on
 * level 0 ports are at level 1, and so on.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param adapters - The adapters to compute layers for
 * @returns Map of port name to its initialization level, or null if cycle detected
 *
 * @example
 * ```typescript
 * const layers = computeDependencyLayers(graph.adapters);
 * if (layers) {
 *   // { Database: 0, Logger: 0, UserRepository: 1, UserService: 2 }
 * }
 * ```
 */
export function computeDependencyLayers(
  adapters: readonly AdapterConstraint[]
): ReadonlyMap<string, number> | null {
  const depMap = buildDependencyMap(adapters);
  const portSet = new Set(Object.keys(depMap));
  const levels = new Map<string, number>();
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function computeLevel(port: string): number | null {
    const cachedLevel = levels.get(port);
    if (cachedLevel !== undefined) {
      return cachedLevel;
    }

    if (inStack.has(port)) {
      return null; // Cycle detected
    }

    inStack.add(port);
    visited.add(port);

    const deps = depMap[port] ?? [];
    let maxDepLevel = -1;

    for (const dep of deps) {
      // Only consider internal dependencies
      if (!portSet.has(dep)) continue;

      const depLevel = computeLevel(dep);
      if (depLevel === null) {
        return null; // Propagate cycle detection
      }
      maxDepLevel = Math.max(maxDepLevel, depLevel);
    }

    inStack.delete(port);
    const level = maxDepLevel + 1;
    levels.set(port, level);
    return level;
  }

  for (const port of portSet) {
    if (!visited.has(port)) {
      const level = computeLevel(port);
      if (level === null) {
        return null;
      }
    }
  }

  return levels;
}

/**
 * Gets all ports grouped by their initialization layer.
 *
 * Returns an array where each element is an array of port names at that level.
 * Ports at the same level can be initialized in parallel.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param adapters - The adapters to group by layer
 * @returns Array of port groups by level, or null if cycle detected
 *
 * @example
 * ```typescript
 * const layers = getPortsByLayer(graph.adapters);
 * if (layers) {
 *   // [["Database", "Logger"], ["UserRepository"], ["UserService"]]
 *   // Level 0 ports can init in parallel, then level 1, etc.
 * }
 * ```
 */
export function getPortsByLayer(
  adapters: readonly AdapterConstraint[]
): readonly (readonly string[])[] | null {
  const levels = computeDependencyLayers(adapters);
  if (!levels) return null;

  // Group ports by level
  const layerMap = new Map<number, string[]>();
  for (const [port, level] of levels) {
    let layer = layerMap.get(level);
    if (layer === undefined) {
      layer = [];
      layerMap.set(level, layer);
    }
    layer.push(port);
  }

  // Convert to array, sorted by level
  const maxLevel = Math.max(...layerMap.keys());
  const result: (readonly string[])[] = [];

  for (let i = 0; i <= maxLevel; i++) {
    const layer = layerMap.get(i) ?? [];
    result.push(Object.freeze(layer));
  }

  return Object.freeze(result);
}
