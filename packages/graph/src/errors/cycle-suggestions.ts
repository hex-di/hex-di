/**
 * Refactoring suggestion engine for circular dependency errors.
 *
 * Analyzes cycle edges and adapter metadata to generate actionable suggestions
 * for breaking circular dependencies. Each suggestion is scored and sorted
 * by applicability.
 *
 * @see spec/packages/graph/behaviors/06-enhanced-cycle-errors.md — BEH-GR-06-002
 * @packageDocumentation
 */

import type { AdapterConstraint, Port } from "@hex-di/core";
import { getPortMetadata } from "@hex-di/core";

// =============================================================================
// Types
// =============================================================================

/**
 * A suggestion tag indicating the type of refactoring to break a cycle.
 */
export type CycleSuggestionTag =
  | "LazyEdge"
  | "InterfaceExtraction"
  | "EventDecoupling"
  | "ScopeSeparation";

/**
 * An actionable refactoring suggestion for breaking a circular dependency.
 */
export interface CycleSuggestion {
  readonly _tag: CycleSuggestionTag;
  readonly description: string;
  readonly targetAdapter: string;
  readonly targetPort: string;
}

/**
 * Internal scored suggestion used during ranking.
 */
interface ScoredSuggestion {
  readonly suggestion: CycleSuggestion;
  readonly score: number;
}

// =============================================================================
// Registration lookup types
// =============================================================================

/**
 * Represents the set of adapter registrations in the graph, used to examine
 * adapter metadata for suggestion generation.
 */
export interface GraphRegistrations {
  readonly adapters: readonly AdapterConstraint[];
}

// =============================================================================
// Suggestion generation
// =============================================================================

/**
 * Generates refactoring suggestions for breaking a dependency cycle.
 *
 * For each edge in the cycle, evaluates the applicability of different
 * refactoring strategies based on adapter metadata (lifetime, port categories,
 * tags). Results are scored and sorted with the highest applicability first.
 *
 * Always returns at least one suggestion.
 *
 * @param cycle - Array of port names forming the cycle (last element equals first)
 * @param registrations - The graph's adapter registrations for metadata lookup
 * @returns A frozen array of suggestions, sorted by applicability (highest first)
 */
export function generateCycleSuggestions(
  cycle: ReadonlyArray<string>,
  registrations: GraphRegistrations
): ReadonlyArray<CycleSuggestion> {
  const adapterMap = buildAdapterMap(registrations.adapters);
  const scored: ScoredSuggestion[] = [];

  // For each edge in the cycle, evaluate suggestion applicability
  const nodes = cycle.length > 1 ? cycle.slice(0, -1) : cycle;

  for (let i = 0; i < nodes.length; i++) {
    const fromName = nodes[i];
    const toName = nodes[(i + 1) % nodes.length];
    const fromAdapter = adapterMap.get(fromName);
    const toAdapter = adapterMap.get(toName);

    // LazyEdge: suggest lazyPort for the edge's target
    scored.push({
      suggestion: Object.freeze({
        _tag: "LazyEdge",
        description: `Add lazyPort(${toName}Port) to ${fromName}'s requires to break the cycle`,
        targetAdapter: fromName,
        targetPort: toName,
      }),
      score: 100,
    });

    // InterfaceExtraction: if the target adapter has many requires (large interface)
    if (toAdapter && toAdapter.requires.length >= 2) {
      scored.push({
        suggestion: Object.freeze({
          _tag: "InterfaceExtraction",
          description: `Extract a shared interface from ${toName} that ${fromName} can depend on`,
          targetAdapter: toName,
          targetPort: toName,
        }),
        score: 70,
      });
    }

    // EventDecoupling: if either adapter has event-related metadata
    if (isEventRelated(fromAdapter) || isEventRelated(toAdapter)) {
      scored.push({
        suggestion: Object.freeze({
          _tag: "EventDecoupling",
          description: `Introduce an event-based pattern to decouple ${fromName} from ${toName}`,
          targetAdapter: fromName,
          targetPort: toName,
        }),
        score: 60,
      });
    }

    // ScopeSeparation: if adapters have different lifetimes
    if (fromAdapter && toAdapter && fromAdapter.lifetime !== toAdapter.lifetime) {
      scored.push({
        suggestion: Object.freeze({
          _tag: "ScopeSeparation",
          description: `Move ${toName} to a parent scope to break the dependency from ${fromName}`,
          targetAdapter: toName,
          targetPort: toName,
        }),
        score: 30,
      });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Deduplicate by (_tag, targetAdapter, targetPort)
  const seen = new Set<string>();
  const deduped: CycleSuggestion[] = [];
  for (const entry of scored) {
    const key = `${entry.suggestion._tag}:${entry.suggestion.targetAdapter}:${entry.suggestion.targetPort}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(entry.suggestion);
    }
  }

  // Guarantee at least one suggestion
  if (deduped.length === 0 && nodes.length > 0) {
    const lastEdgeFrom = nodes[nodes.length - 1];
    const lastEdgeTo = nodes[0];
    deduped.push(
      Object.freeze({
        _tag: "LazyEdge",
        description: `Add lazyPort(${lastEdgeTo}Port) to ${lastEdgeFrom}'s requires to break the cycle`,
        targetAdapter: lastEdgeFrom,
        targetPort: lastEdgeTo,
      })
    );
  }

  return Object.freeze(deduped);
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Builds a lookup map from port name to adapter.
 */
function buildAdapterMap(adapters: readonly AdapterConstraint[]): Map<string, AdapterConstraint> {
  const map = new Map<string, AdapterConstraint>();
  for (const adapter of adapters) {
    map.set(adapter.provides.__portName, adapter);
  }
  return map;
}

/**
 * Determines whether an adapter is event-related by inspecting port metadata.
 * Checks category and tags for event-related keywords.
 */
function isEventRelated(adapter: AdapterConstraint | undefined): boolean {
  if (!adapter) return false;

  const port: Port<string, unknown> = adapter.provides;
  const metadata = getPortMetadata(port);

  if (metadata) {
    const category = metadata.category ?? "";
    if (category.includes("event")) return true;

    const tags = metadata.tags ?? [];
    for (const tag of tags) {
      if (tag.includes("event") || tag.includes("bus") || tag.includes("pubsub")) {
        return true;
      }
    }
  }

  // Also check the port name as a fallback heuristic
  const portName = adapter.provides.__portName.toLowerCase();
  return portName.includes("event") || portName.includes("bus");
}
