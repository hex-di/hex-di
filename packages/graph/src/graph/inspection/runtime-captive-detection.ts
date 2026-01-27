/**
 * Runtime captive dependency detection for dependency graphs.
 *
 * This module provides runtime captive dependency detection as a safety net
 * for graphs that exceed the compile-time validation depth limit or for
 * cases where forward references bypass compile-time validation.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint, Lifetime } from "../../adapter/index.js";

/**
 * Result of a captive dependency detection.
 */
export interface CaptiveDependencyResult {
  /** The port name of the adapter that has the captive dependency */
  readonly dependentPort: string;
  /** The lifetime of the dependent adapter */
  readonly dependentLifetime: Lifetime;
  /** The port name of the captured dependency */
  readonly captivePort: string;
  /** The lifetime of the captured dependency */
  readonly captiveLifetime: Lifetime;
}

/**
 * Lifetime levels for comparison.
 * Lower number = longer-lived, higher number = shorter-lived.
 */
const LIFETIME_LEVELS: Record<Lifetime, number> = {
  singleton: 1,
  scoped: 2,
  transient: 3,
};

/**
 * Checks if a dependency relationship would create a captive dependency.
 *
 * A captive dependency occurs when a longer-lived service (lower level)
 * depends on a shorter-lived service (higher level).
 *
 * @param dependentLevel - Lifetime level of the dependent service
 * @param dependencyLevel - Lifetime level of the dependency
 * @returns true if this would create a captive dependency
 */
function isCaptive(dependentLevel: number, dependencyLevel: number): boolean {
  return dependentLevel < dependencyLevel;
}

/**
 * Detects captive dependencies in the adapter dependency graph at runtime.
 *
 * This function serves as a safety net for:
 * 1. Graphs that exceed the compile-time validation depth limit
 * 2. Forward reference scenarios that may bypass compile-time validation
 *
 * A "captive dependency" occurs when a longer-lived service (e.g., singleton)
 * depends on a shorter-lived service (e.g., scoped). This is problematic because
 * the singleton would "capture" a single instance of the scoped service, defeating
 * the purpose of the scoped lifetime.
 *
 * ## Iteration Order Independence
 *
 * Detection is order-independent: if a captive dependency exists, it will be found
 * regardless of adapter registration order. The function returns the first violation
 * found during iteration.
 *
 * @param adapters - The adapters in the graph to check
 * @returns The first captive dependency found, or null if none exist
 *
 * @example
 * ```typescript
 * const captive = detectCaptiveAtRuntime(graph.adapters);
 * if (captive) {
 *   throw new Error(
 *     `Captive dependency: ${captive.dependentPort} (${captive.dependentLifetime}) ` +
 *     `cannot depend on ${captive.captivePort} (${captive.captiveLifetime})`
 *   );
 * }
 * ```
 */
export function detectCaptiveAtRuntime(
  adapters: readonly AdapterConstraint[]
): CaptiveDependencyResult | null {
  // Build lifetime map: portName -> lifetime
  const lifetimeMap = new Map<string, Lifetime>();
  for (const adapter of adapters) {
    const portName = adapter.provides.__portName;
    lifetimeMap.set(portName, adapter.lifetime);
  }

  // Check each adapter's requirements for captive dependencies
  for (const adapter of adapters) {
    const dependentPort = adapter.provides.__portName;
    const dependentLifetime = adapter.lifetime;
    const dependentLevel = LIFETIME_LEVELS[dependentLifetime];

    for (const required of adapter.requires) {
      const captivePort = required.__portName;
      const captiveLifetime = lifetimeMap.get(captivePort);

      // Skip if the required port isn't in our graph (external dependency)
      if (captiveLifetime === undefined) {
        continue;
      }

      const captiveLevel = LIFETIME_LEVELS[captiveLifetime];

      if (isCaptive(dependentLevel, captiveLevel)) {
        return {
          dependentPort,
          dependentLifetime,
          captivePort,
          captiveLifetime,
        };
      }
    }
  }

  return null;
}

/**
 * Detects ALL captive dependencies in the adapter dependency graph at runtime.
 *
 * Unlike `detectCaptiveAtRuntime` which returns the first violation found,
 * this function collects all captive dependency violations in the graph.
 *
 * @param adapters - The adapters in the graph to check
 * @returns Array of all captive dependencies found (empty if none)
 *
 * @example
 * ```typescript
 * const violations = detectAllCaptivesAtRuntime(graph.adapters);
 * if (violations.length > 0) {
 *   const messages = violations.map(v =>
 *     `${v.dependentPort} (${v.dependentLifetime}) -> ${v.captivePort} (${v.captiveLifetime})`
 *   );
 *   throw new Error(`Captive dependencies found:\n${messages.join('\n')}`);
 * }
 * ```
 */
export function detectAllCaptivesAtRuntime(
  adapters: readonly AdapterConstraint[]
): readonly CaptiveDependencyResult[] {
  const results: CaptiveDependencyResult[] = [];

  // Build lifetime map: portName -> lifetime
  const lifetimeMap = new Map<string, Lifetime>();
  for (const adapter of adapters) {
    const portName = adapter.provides.__portName;
    lifetimeMap.set(portName, adapter.lifetime);
  }

  // Check each adapter's requirements for captive dependencies
  for (const adapter of adapters) {
    const dependentPort = adapter.provides.__portName;
    const dependentLifetime = adapter.lifetime;
    const dependentLevel = LIFETIME_LEVELS[dependentLifetime];

    for (const required of adapter.requires) {
      const captivePort = required.__portName;
      const captiveLifetime = lifetimeMap.get(captivePort);

      // Skip if the required port isn't in our graph (external dependency)
      if (captiveLifetime === undefined) {
        continue;
      }

      const captiveLevel = LIFETIME_LEVELS[captiveLifetime];

      if (isCaptive(dependentLevel, captiveLevel)) {
        results.push({
          dependentPort,
          dependentLifetime,
          captivePort,
          captiveLifetime,
        });
      }
    }
  }

  return results;
}
