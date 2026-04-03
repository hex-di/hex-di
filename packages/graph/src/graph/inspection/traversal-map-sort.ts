/**
 * Dependency map building and topological sort for graph traversal.
 *
 * Provides buildDependencyMap, topologicalSort, getTransitiveDependencies,
 * and getTransitiveDependents.
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
interface GraphTopology {
  readonly inDegree: Map<string, number>;
  readonly adjList: Map<string, string[]>;
  readonly portCount: number;
}

function buildTopology(depMap: Readonly<DependencyMap>): GraphTopology {
  const portNames = Object.keys(depMap);
  const portSet = new Set(portNames);
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const port of portNames) {
    inDegree.set(port, 0);
    adjList.set(port, []);
  }

  for (const [port, deps] of Object.entries(depMap)) {
    for (const dep of deps) {
      if (portSet.has(dep)) {
        const list = adjList.get(dep);
        if (list) list.push(port);
        inDegree.set(port, (inDegree.get(port) ?? 0) + 1);
      }
    }
  }

  return { inDegree, adjList, portCount: portNames.length };
}

export function topologicalSort(adapters: readonly AdapterConstraint[]): string[] | null {
  const depMap = buildDependencyMap(adapters);
  const { inDegree, adjList, portCount } = buildTopology(depMap);

  const queue: string[] = [];
  for (const [port, degree] of inDegree) {
    if (degree === 0) queue.push(port);
  }

  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    result.push(current);

    for (const dependent of adjList.get(current) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 0) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) queue.push(dependent);
    }
  }

  return result.length !== portCount ? null : result;
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
