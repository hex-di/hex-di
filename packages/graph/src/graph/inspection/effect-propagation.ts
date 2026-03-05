/**
 * Effect Propagation Analysis.
 *
 * Computes the transitive error type profile for each port in the dependency graph.
 * When adapter factories return `Result<T, E>`, the error type `E` propagates through
 * the graph: a port's effective error profile is the union of its own error tags and
 * the error tags of all its transitive dependencies.
 *
 * This module implements BEH-GR-10-001 (Transitive Error Type Computation) and
 * BEH-GR-10-003 (Effect Summary Per Port) from the effect propagation spec.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint } from "@hex-di/core";
import type { DependencyMap } from "./traversal.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Error tag information including its source port.
 */
export interface ErrorTagEntry {
  /** The `_tag` value of the error type */
  readonly tag: string;
  /** The port whose adapter factory directly produces this error */
  readonly sourcePort: string;
}

/**
 * Effect summary for a single port, showing its complete error profile.
 */
export interface PortEffectSummary {
  /** The port name */
  readonly portName: string;
  /** Error tags from this port's own factory */
  readonly directErrors: readonly ErrorTagEntry[];
  /** Error tags inherited from transitive dependencies */
  readonly inheritedErrors: readonly ErrorTagEntry[];
  /** All error tags (direct + inherited) */
  readonly totalErrors: readonly ErrorTagEntry[];
  /** True if totalErrors is empty (the port is infallible) */
  readonly isInfallible: boolean;
}

// =============================================================================
// Error Tag Extraction
// =============================================================================

/**
 * Builds a map of port name to its direct error tags from adapter metadata.
 *
 * Reads the `__errorTags` property from each adapter to determine which
 * error tags the port's factory may produce.
 *
 * @param adapters - The adapters to extract error tags from
 * @returns Map of port name to error tag entries
 *
 * @pure Same inputs always produce the same output.
 * @internal
 */
function buildErrorTagMap(
  adapters: readonly AdapterConstraint[]
): ReadonlyMap<string, readonly ErrorTagEntry[]> {
  const result = new Map<string, readonly ErrorTagEntry[]>();

  for (const adapter of adapters) {
    const portName = adapter.provides.__portName;
    const tags = adapter.__errorTags;

    if (tags !== undefined && tags.length > 0) {
      const entries: ErrorTagEntry[] = [];
      for (const tag of tags) {
        entries.push(Object.freeze({ tag, sourcePort: portName }));
      }
      result.set(portName, Object.freeze(entries));
    } else {
      result.set(portName, Object.freeze([]));
    }
  }

  return result;
}

// =============================================================================
// Transitive Error Profile Computation
// =============================================================================

/**
 * Computes the transitive error tags for a given port by walking the dependency graph.
 *
 * For a port P, the transitive error profile is:
 * - P's own error tags (direct errors)
 * - Plus the transitive error tags of each of P's dependencies (inherited errors)
 *
 * Uses a visited set to prevent infinite recursion on cycles.
 *
 * @param portName - The port to compute transitive errors for
 * @param depMap - The dependency map (port -> direct dependencies)
 * @param errorTagMap - Map of port name to its direct error tag entries
 * @param visited - Set of already-visited ports (cycle prevention)
 * @returns Array of all transitive error tag entries (deduplicated by tag:sourcePort)
 *
 * @pure Same inputs always produce the same output.
 * @internal
 */
function computeTransitiveErrorTags(
  portName: string,
  depMap: Readonly<DependencyMap>,
  errorTagMap: ReadonlyMap<string, readonly ErrorTagEntry[]>,
  visited: Set<string>
): ErrorTagEntry[] {
  // Cycle prevention
  if (visited.has(portName)) {
    return [];
  }
  visited.add(portName);

  const result: ErrorTagEntry[] = [];
  const seen = new Set<string>(); // Deduplicate by "tag:sourcePort"

  // Add own errors
  const ownErrors = errorTagMap.get(portName);
  if (ownErrors !== undefined) {
    for (const entry of ownErrors) {
      const key = `${entry.tag}:${entry.sourcePort}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(entry);
      }
    }
  }

  // Add transitive dependency errors
  const deps = depMap[portName];
  if (deps !== undefined) {
    for (const dep of deps) {
      const depErrors = computeTransitiveErrorTags(dep, depMap, errorTagMap, visited);
      for (const entry of depErrors) {
        const key = `${entry.tag}:${entry.sourcePort}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(entry);
        }
      }
    }
  }

  return result;
}

// =============================================================================
// Error Profile Computation
// =============================================================================

/**
 * Computes the error profile for all ports in the graph.
 *
 * The error profile maps each port name to its transitive error tags.
 * This is the runtime equivalent of the type-level `TransitiveErrors` computation
 * described in BEH-GR-10-001.
 *
 * Tag strings are deduplicated: if the same error tag appears from multiple
 * source ports in the dependency chain, it appears only once in the output.
 *
 * @param adapters - The adapters in the graph
 * @param depMap - The dependency map (port -> direct dependencies)
 * @returns Frozen record mapping port names to sorted, deduplicated arrays of error tag strings
 *
 * @pure Same inputs always produce the same output.
 */
export function computeErrorProfile(
  adapters: readonly AdapterConstraint[],
  depMap: Readonly<DependencyMap>
): Readonly<Record<string, readonly string[]>> {
  const errorTagMap = buildErrorTagMap(adapters);
  const result: Record<string, readonly string[]> = {};

  for (const adapter of adapters) {
    const portName = adapter.provides.__portName;
    const visited = new Set<string>();
    const transitiveErrors = computeTransitiveErrorTags(portName, depMap, errorTagMap, visited);

    // Extract unique tag strings (deduplicated), sorted for determinism
    const tagSet = new Set<string>();
    for (const entry of transitiveErrors) {
      tagSet.add(entry.tag);
    }
    const tags = [...tagSet].sort();
    result[portName] = Object.freeze(tags);
  }

  return Object.freeze(result);
}

/**
 * Computes detailed effect summaries for all ports in the graph.
 *
 * Provides per-port breakdowns of direct vs inherited errors, suitable for
 * runtime inspection and debugging. Implements BEH-GR-10-003.
 *
 * @param adapters - The adapters in the graph
 * @param depMap - The dependency map (port -> direct dependencies)
 * @returns Frozen array of PortEffectSummary objects
 *
 * @pure Same inputs always produce the same output.
 */
export function computeEffectSummaries(
  adapters: readonly AdapterConstraint[],
  depMap: Readonly<DependencyMap>
): readonly PortEffectSummary[] {
  const errorTagMap = buildErrorTagMap(adapters);
  const summaries: PortEffectSummary[] = [];

  for (const adapter of adapters) {
    const portName = adapter.provides.__portName;

    // Direct errors for this port
    const directErrors = errorTagMap.get(portName) ?? [];

    // Transitive errors (includes direct)
    const visited = new Set<string>();
    const transitiveErrors = computeTransitiveErrorTags(portName, depMap, errorTagMap, visited);

    // Inherited errors = transitive minus direct
    const directSet = new Set(directErrors.map(e => `${e.tag}:${e.sourcePort}`));
    const inheritedErrors: ErrorTagEntry[] = [];
    for (const entry of transitiveErrors) {
      const key = `${entry.tag}:${entry.sourcePort}`;
      if (!directSet.has(key)) {
        inheritedErrors.push(entry);
      }
    }

    summaries.push(
      Object.freeze({
        portName,
        directErrors: Object.freeze([...directErrors]),
        inheritedErrors: Object.freeze(inheritedErrors),
        totalErrors: Object.freeze(transitiveErrors),
        isInfallible: transitiveErrors.length === 0,
      })
    );
  }

  return Object.freeze(summaries);
}

// =============================================================================
// Unhandled Error Detection
// =============================================================================

/**
 * Detects ports with unhandled error tags at graph boundaries.
 *
 * A port has unhandled errors if its transitive error profile is non-empty.
 * This produces warnings (not errors) to flag potential issues during build.
 *
 * @param adapters - The adapters in the graph
 * @param depMap - The dependency map (port -> direct dependencies)
 * @returns Array of warning strings for ports with unhandled error tags
 *
 * @pure Same inputs always produce the same output.
 */
export function detectUnhandledErrors(
  adapters: readonly AdapterConstraint[],
  depMap: Readonly<DependencyMap>
): readonly string[] {
  const errorProfile = computeErrorProfile(adapters, depMap);
  const warnings: string[] = [];

  for (const [portName, tags] of Object.entries(errorProfile)) {
    if (tags.length > 0) {
      warnings.push(
        `Port '${portName}' has unhandled error tags in its transitive dependency chain: ${tags.join(", ")}. ` +
          `Consider using adapterOrDie(), adapterOrElse(), or adapterOrHandle() to handle these errors.`
      );
    }
  }

  return Object.freeze(warnings.sort());
}
