/**
 * Disposal Warning Utilities.
 *
 * This module provides functions for detecting potential disposal issues
 * in service dependencies.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint } from "@hex-di/core";

/**
 * Computes disposal warnings for adapters with finalizers.
 *
 * Checks if any adapter with a finalizer depends on an adapter without a finalizer.
 * This can cause use-after-dispose issues when services are disposed in reverse
 * dependency order.
 *
 * @pure Same inputs always produce the same output. No side effects.
 *
 * @param adapters - All adapters in the graph
 * @param dependencyMap - Map of port name to its dependencies
 * @returns Array of warning messages
 *
 * @internal
 */
export function computeDisposalWarnings(
  adapters: readonly AdapterConstraint[],
  dependencyMap: Record<string, readonly string[]>
): string[] {
  const warnings: string[] = [];

  // Build a set of ports that have finalizers
  const portsWithFinalizers = new Set<string>();
  for (const adapter of adapters) {
    if (typeof adapter.finalizer === "function") {
      portsWithFinalizers.add(adapter.provides.__portName);
    }
  }

  // Check each adapter with a finalizer
  for (const adapter of adapters) {
    if (typeof adapter.finalizer !== "function") continue;

    const portName = adapter.provides.__portName;
    const deps = dependencyMap[portName] ?? [];

    // Check if any dependency lacks a finalizer
    for (const dep of deps) {
      // Only warn if the dependency is in our graph (not external)
      const depAdapter = adapters.find(a => a.provides.__portName === dep);
      if (depAdapter && !portsWithFinalizers.has(dep)) {
        warnings.push(
          `'${portName}' has a finalizer but depends on '${dep}' which has no finalizer. ` +
            `During disposal, '${dep}' may be garbage collected before '${portName}' finishes cleanup.`
        );
      }
    }
  }

  return warnings;
}

/**
 * Gets the list of ports that have finalizers.
 *
 * @pure Same inputs always produce the same output.
 *
 * @param adapters - All adapters in the graph
 * @returns Array of port names that have finalizers
 *
 * @internal
 */
export function getPortsWithFinalizers(adapters: readonly AdapterConstraint[]): string[] {
  return adapters.filter(a => typeof a.finalizer === "function").map(a => a.provides.__portName);
}
