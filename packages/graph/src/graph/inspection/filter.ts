/**
 * Port Filtering Utilities.
 *
 * Provides functions to filter GraphInspection.ports by direction,
 * category, and tags with configurable matching logic.
 *
 * @packageDocumentation
 */

import type { PortInfo, PortDirection } from "../types/inspection.js";

/**
 * Filter criteria for port inspection results.
 */
export interface PortFilter {
  /** Filter by direction (exact match) */
  readonly direction?: PortDirection;
  /** Filter by category (partial/prefix match) */
  readonly category?: string;
  /** Filter by tags (partial/prefix match) */
  readonly tags?: readonly string[];
  /** How to match multiple tags: "any" (default) or "all" */
  readonly tagMode?: "any" | "all";
  /** How to combine filters: "and" (default) or "or" */
  readonly filterMode?: "and" | "or";
}

/**
 * Result of filtering ports with applied filter context.
 */
export interface FilteredPorts {
  /** The filtered port list */
  readonly ports: readonly PortInfo[];
  /** The filter criteria that was applied */
  readonly appliedFilter: PortFilter;
  /** Count of matched ports */
  readonly matchedCount: number;
  /** Count of total ports before filtering */
  readonly totalCount: number;
}

/**
 * Checks if a string starts with a prefix (case-insensitive).
 */
function matchesPrefix(value: string | undefined, prefix: string): boolean {
  if (value === undefined) return false;
  return value.toLowerCase().startsWith(prefix.toLowerCase());
}

/**
 * Checks if any tag in the list matches a prefix.
 */
function matchesTagPrefix(tags: readonly string[], prefix: string): boolean {
  return tags.some(tag => matchesPrefix(tag, prefix));
}

/**
 * Checks if a port matches filter criteria and returns match results per criterion.
 */
function matchesCriterion(port: PortInfo, filter: PortFilter): boolean[] {
  const matches: boolean[] = [];

  if (filter.direction !== undefined) {
    matches.push(port.direction === filter.direction);
  }

  if (filter.category !== undefined) {
    matches.push(matchesPrefix(port.category, filter.category));
  }

  if (filter.tags !== undefined && filter.tags.length > 0) {
    const tagMode = filter.tagMode ?? "any";
    if (tagMode === "any") {
      matches.push(filter.tags.some(t => matchesTagPrefix(port.tags, t)));
    } else {
      matches.push(filter.tags.every(t => matchesTagPrefix(port.tags, t)));
    }
  }

  return matches;
}

/**
 * Filters a list of ports by the specified criteria.
 *
 * @param ports - The ports to filter
 * @param filter - The filter criteria
 * @returns Filtered ports with metadata about the filtering
 *
 * @example Filter by direction
 * ```typescript
 * const result = filterPorts(inspection.ports, { direction: "inbound" });
 * console.log(`Found ${result.matchedCount} inbound ports`);
 * ```
 *
 * @example Filter by category prefix
 * ```typescript
 * const result = filterPorts(inspection.ports, { category: "infra" });
 * // Matches "infrastructure", "infra-core", etc.
 * ```
 *
 * @example Filter by tags (any match)
 * ```typescript
 * const result = filterPorts(inspection.ports, {
 *   tags: ["log", "debug"],
 *   tagMode: "any", // default
 * });
 * // Matches ports with "logging", "log-level", "debug", "debugger", etc.
 * ```
 *
 * @example Combine filters with AND logic
 * ```typescript
 * const result = filterPorts(inspection.ports, {
 *   direction: "outbound",
 *   category: "persist",
 *   filterMode: "and", // default
 * });
 * // Matches outbound ports with category starting with "persist"
 * ```
 *
 * @example Combine filters with OR logic
 * ```typescript
 * const result = filterPorts(inspection.ports, {
 *   direction: "inbound",
 *   tags: ["core"],
 *   filterMode: "or",
 * });
 * // Matches ports that are inbound OR have a tag starting with "core"
 * ```
 */
export function filterPorts(ports: readonly PortInfo[], filter: PortFilter): FilteredPorts {
  const filterMode = filter.filterMode ?? "and";

  const filtered = ports.filter(port => {
    const matches = matchesCriterion(port, filter);

    // If no criteria specified, match all
    if (matches.length === 0) return true;

    if (filterMode === "and") {
      return matches.every(m => m);
    } else {
      return matches.some(m => m);
    }
  });

  return Object.freeze({
    ports: Object.freeze(filtered),
    appliedFilter: Object.freeze({ ...filter }),
    matchedCount: filtered.length,
    totalCount: ports.length,
  });
}

/**
 * Convenience function to get only inbound ports.
 */
export function getInboundPorts(ports: readonly PortInfo[]): readonly PortInfo[] {
  return filterPorts(ports, { direction: "inbound" }).ports;
}

/**
 * Convenience function to get only outbound ports.
 */
export function getOutboundPorts(ports: readonly PortInfo[]): readonly PortInfo[] {
  return filterPorts(ports, { direction: "outbound" }).ports;
}

/**
 * Convenience function to get ports by category prefix.
 */
export function getPortsByCategory(
  ports: readonly PortInfo[],
  categoryPrefix: string
): readonly PortInfo[] {
  return filterPorts(ports, { category: categoryPrefix }).ports;
}

/**
 * Convenience function to get ports that have any of the specified tag prefixes.
 */
export function getPortsByTags(
  ports: readonly PortInfo[],
  tagPrefixes: readonly string[]
): readonly PortInfo[] {
  return filterPorts(ports, { tags: tagPrefixes, tagMode: "any" }).ports;
}
