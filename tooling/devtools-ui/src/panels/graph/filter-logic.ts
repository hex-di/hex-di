/**
 * Pure filter logic for graph nodes.
 *
 * All functions are pure and side-effect free.
 *
 * @packageDocumentation
 */

import type { GraphFilterState, EnrichedGraphNode, LibraryAdapterKind } from "./types.js";

/**
 * Check if a node matches the search text filter.
 */
function matchesSearchText(node: EnrichedGraphNode, searchText: string): boolean {
  if (searchText === "") return true;
  const lower = searchText.toLowerCase();
  return node.adapter.portName.toLowerCase().includes(lower);
}

/**
 * Check if a node matches the lifetime filter.
 */
function matchesLifetime(node: EnrichedGraphNode, lifetimes: ReadonlySet<string>): boolean {
  if (lifetimes.size === 0) return true;
  return lifetimes.has(node.adapter.lifetime);
}

/**
 * Check if a node matches the origin filter.
 */
function matchesOrigin(node: EnrichedGraphNode, origins: ReadonlySet<string>): boolean {
  if (origins.size === 0) return true;
  return origins.has(node.adapter.origin);
}

/**
 * Check if a node matches the library kind filter.
 */
function matchesLibraryKind(node: EnrichedGraphNode, libraryKinds: ReadonlySet<string>): boolean {
  if (libraryKinds.size === 0) return true;
  if (node.libraryKind === undefined) return false;
  return libraryKinds.has(node.libraryKind.library);
}

/**
 * Check if a node matches the category filter.
 */
function matchesCategory(node: EnrichedGraphNode, category: string): boolean {
  if (category === "") return true;
  if (node.category === undefined) return false;
  return node.category.startsWith(category);
}

/**
 * Check if a node matches the tag filter.
 */
function matchesTags(
  node: EnrichedGraphNode,
  tags: readonly string[],
  tagMode: "any" | "all"
): boolean {
  if (tags.length === 0) return true;
  if (node.tags.length === 0) return false;
  const nodeTagSet = new Set(node.tags);
  if (tagMode === "any") {
    return tags.some(t => nodeTagSet.has(t));
  }
  return tags.every(t => nodeTagSet.has(t));
}

/**
 * Check if a node matches the direction filter.
 */
function matchesDirection(
  node: EnrichedGraphNode,
  direction: "all" | "inbound" | "outbound"
): boolean {
  if (direction === "all") return true;
  return node.direction === direction;
}

/**
 * Check if a node matches the error rate filter.
 */
function matchesMinErrorRate(node: EnrichedGraphNode, minErrorRate: number): boolean {
  if (minErrorRate === 0) return true;
  if (node.errorRate === undefined) return false;
  return node.errorRate >= minErrorRate;
}

/**
 * Check if a node matches the inheritance mode filter.
 */
function matchesInheritanceMode(
  node: EnrichedGraphNode,
  inheritanceModes: ReadonlySet<string>
): boolean {
  if (inheritanceModes.size === 0) return true;
  const mode = node.adapter.inheritanceMode;
  if (mode === undefined) return false;
  return inheritanceModes.has(mode);
}

/**
 * Check if a node matches the resolution status filter.
 */
function matchesResolutionStatus(
  node: EnrichedGraphNode,
  resolutionStatus: "all" | "resolved" | "unresolved"
): boolean {
  if (resolutionStatus === "all") return true;
  if (resolutionStatus === "resolved") return node.isResolved;
  return !node.isResolved;
}

/**
 * All per-dimension predicates for external testing.
 */
const filterPredicates = {
  matchesSearchText,
  matchesLifetime,
  matchesOrigin,
  matchesLibraryKind,
  matchesCategory,
  matchesTags,
  matchesDirection,
  matchesMinErrorRate,
  matchesInheritanceMode,
  matchesResolutionStatus,
};

/**
 * Check if a node matches the complete filter configuration.
 *
 * In "and" mode, all active predicates must match.
 * In "or" mode, at least one active predicate must match
 * (search text is always AND-ed regardless of compound mode).
 */
function matchesFilter(node: EnrichedGraphNode, filter: GraphFilterState): boolean {
  // Search text is always AND-ed
  if (!matchesSearchText(node, filter.searchText)) return false;

  if (filter.compoundMode === "and") {
    return (
      matchesLifetime(node, filter.lifetimes) &&
      matchesOrigin(node, filter.origins) &&
      matchesLibraryKind(node, filter.libraryKinds) &&
      matchesCategory(node, filter.category) &&
      matchesTags(node, filter.tags, filter.tagMode) &&
      matchesDirection(node, filter.direction) &&
      matchesMinErrorRate(node, filter.minErrorRate) &&
      matchesInheritanceMode(node, filter.inheritanceModes) &&
      matchesResolutionStatus(node, filter.resolutionStatus)
    );
  }

  // "or" mode — at least one active dimension must match
  const checks: boolean[] = [];

  if (filter.lifetimes.size > 0) checks.push(matchesLifetime(node, filter.lifetimes));
  if (filter.origins.size > 0) checks.push(matchesOrigin(node, filter.origins));
  if (filter.libraryKinds.size > 0) checks.push(matchesLibraryKind(node, filter.libraryKinds));
  if (filter.category !== "") checks.push(matchesCategory(node, filter.category));
  if (filter.tags.length > 0) checks.push(matchesTags(node, filter.tags, filter.tagMode));
  if (filter.direction !== "all") checks.push(matchesDirection(node, filter.direction));
  if (filter.minErrorRate > 0) checks.push(matchesMinErrorRate(node, filter.minErrorRate));
  if (filter.inheritanceModes.size > 0)
    checks.push(matchesInheritanceMode(node, filter.inheritanceModes));
  if (filter.resolutionStatus !== "all")
    checks.push(matchesResolutionStatus(node, filter.resolutionStatus));

  // If no dimension is active, pass everything
  if (checks.length === 0) return true;

  return checks.some(Boolean);
}

/**
 * Count how many filter dimensions are currently active.
 */
function countActiveFilters(filter: GraphFilterState): number {
  let count = 0;
  if (filter.searchText !== "") count++;
  if (filter.lifetimes.size > 0) count++;
  if (filter.origins.size > 0) count++;
  if (filter.libraryKinds.size > 0) count++;
  if (filter.category !== "") count++;
  if (filter.tags.length > 0) count++;
  if (filter.direction !== "all") count++;
  if (filter.minErrorRate > 0) count++;
  if (filter.inheritanceModes.size > 0) count++;
  if (filter.resolutionStatus !== "all") count++;
  return count;
}

export { matchesFilter, countActiveFilters, filterPredicates };
export type { LibraryAdapterKind };
