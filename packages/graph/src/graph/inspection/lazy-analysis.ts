/**
 * Lazy Port Analysis Utilities.
 *
 * This module provides functions for detecting unnecessary lazy ports
 * in the dependency graph.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint } from "@hex-di/core";

/**
 * Checks if there's a path from 'from' to 'to' in the dependency graph.
 *
 * @pure Same inputs always produce the same output.
 *
 * @param from - Starting port name
 * @param to - Target port name
 * @param dependencyMap - Map of port name to its dependencies
 * @param visited - Set of already-visited ports (for cycle prevention)
 * @returns True if 'to' is reachable from 'from'
 *
 * @internal
 */
function canReach(
  from: string,
  to: string,
  dependencyMap: Record<string, readonly string[]>,
  visited: Set<string>
): boolean {
  if (from === to) return true;
  if (visited.has(from)) return false;

  visited.add(from);
  const deps = dependencyMap[from] ?? [];

  for (const dep of deps) {
    // Skip lazy dependencies when checking reachability
    const actualDep = dep.startsWith("Lazy") ? dep.slice(4) : dep;
    if (canReach(actualDep, to, dependencyMap, visited)) {
      return true;
    }
  }

  return false;
}

/**
 * Detects lazy ports that may be unnecessary (no cycle would exist without them).
 *
 * A lazy port is unnecessary if removing it wouldn't create a cycle in the graph.
 * This function identifies lazy dependencies and checks whether they actually
 * break a cycle or are just adding unnecessary indirection.
 *
 * @pure Same inputs always produce the same output.
 *
 * @param adapters - All adapters in the graph
 * @param dependencyMap - Map of port name to its dependencies
 * @returns Array of lazy port names that may be unnecessary
 *
 * @internal
 */
export function detectUnnecessaryLazyPorts(
  adapters: readonly AdapterConstraint[],
  dependencyMap: Record<string, readonly string[]>
): string[] {
  const unnecessaryLazy: string[] = [];

  // Find all lazy dependencies (port names starting with "Lazy")
  const lazyDeps = new Map<string, string[]>(); // lazyPortName -> [adapters that require it]

  for (const adapter of adapters) {
    const portName = adapter.provides.__portName;
    for (const req of adapter.requires) {
      const reqName = req.__portName;
      if (reqName.startsWith("Lazy")) {
        let dependents = lazyDeps.get(reqName);
        if (dependents === undefined) {
          dependents = [];
          lazyDeps.set(reqName, dependents);
        }
        dependents.push(portName);
      }
    }
  }

  // For each lazy port, check if a cycle would exist if we used the direct dependency
  for (const [lazyPortName, dependentPorts] of lazyDeps) {
    // Extract the original port name (e.g., "LazyUserService" -> "UserService")
    const originalPortName = lazyPortName.slice(4); // Remove "Lazy" prefix

    // Check if using the direct dependency would create a cycle
    // A cycle exists if: originalPort -> ... -> dependentPort (for any dependent)
    let wouldCreateCycle = false;

    for (const dependentPort of dependentPorts) {
      if (canReach(originalPortName, dependentPort, dependencyMap, new Set())) {
        wouldCreateCycle = true;
        break;
      }
    }

    if (!wouldCreateCycle) {
      unnecessaryLazy.push(lazyPortName);
    }
  }

  return unnecessaryLazy;
}
