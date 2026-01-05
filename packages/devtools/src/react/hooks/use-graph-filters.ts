/**
 * useGraphFilters hook for managing graph filter state.
 *
 * Provides filtering functionality for graph nodes by:
 * - Lifetime (singleton, scoped, transient)
 * - Ownership (own, inherited, overridden)
 * - Container ID
 * - Port name search with fuzzy matching and debounce
 *
 * @packageDocumentation
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Lifetime } from "@hex-di/graph";
import type { ServiceOrigin } from "@hex-di/plugin";
import type { FactoryKind } from "@hex-di/graph";
import type { PositionedNode } from "../graph-visualization/types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Filter state for graph nodes.
 */
export interface GraphFilterState {
  /** Set of lifetimes to show (empty = show all) */
  readonly lifetimeFilter: ReadonlySet<Lifetime>;
  /** Set of ownership states to show (empty = show all) */
  readonly ownershipFilter: ReadonlySet<ServiceOrigin>;
  /** Set of container IDs to show (empty = show all) */
  readonly containerFilter: ReadonlySet<string>;
  /** Factory kind filter (undefined = show all) */
  readonly factoryKindFilter: FactoryKind | undefined;
  /** Search term for port name filtering */
  readonly searchTerm: string;
}

/**
 * Result of the useGraphFilters hook.
 */
export interface UseGraphFiltersResult {
  /** Filtered nodes after applying all active filters */
  readonly filteredNodes: readonly PositionedNode[];
  /** Number of nodes matching current filters */
  readonly matchCount: number;
  /** Total number of nodes before filtering */
  readonly totalCount: number;
  /** Number of currently active filters */
  readonly activeFilterCount: number;
  /** Current filter state */
  readonly filterState: GraphFilterState;

  // Setters
  /** Set lifetime filter (empty set = no filter) */
  readonly setLifetimeFilter: (lifetimes: ReadonlySet<Lifetime>) => void;
  /** Set ownership filter (empty set = no filter) */
  readonly setOwnershipFilter: (ownership: ReadonlySet<ServiceOrigin>) => void;
  /** Set container filter (empty set = no filter) */
  readonly setContainerFilter: (containerIds: ReadonlySet<string>) => void;
  /** Set factory kind filter (undefined = no filter) */
  readonly setFactoryKindFilter: (factoryKind: FactoryKind | undefined) => void;
  /** Set search term (empty string = no filter) */
  readonly setSearchTerm: (term: string) => void;
  /** Clear all filters */
  readonly clearFilters: () => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Debounce delay for search input in milliseconds */
const SEARCH_DEBOUNCE_MS = 300;

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing graph filter state with debounced search.
 *
 * @param nodes - The nodes to filter
 * @returns Filter state and control functions
 *
 * @example
 * ```tsx
 * const { filteredNodes, setSearchTerm, setLifetimeFilter } = useGraphFilters(nodes);
 *
 * // Filter to singleton services
 * setLifetimeFilter(new Set(['singleton']));
 *
 * // Search for "User"
 * setSearchTerm('User');
 *
 * // Use filteredNodes in rendering
 * ```
 */
export function useGraphFilters(nodes: ReadonlyArray<PositionedNode>): UseGraphFiltersResult {
  // Filter state
  const [lifetimeFilter, setLifetimeFilterState] = useState<ReadonlySet<Lifetime>>(new Set());
  const [ownershipFilter, setOwnershipFilterState] = useState<ReadonlySet<ServiceOrigin>>(
    new Set()
  );
  const [containerFilter, setContainerFilterState] = useState<ReadonlySet<string>>(new Set());
  const [factoryKindFilter, setFactoryKindFilterState] = useState<FactoryKind | undefined>(
    undefined
  );

  // Search state with debounce
  const [searchTerm, setSearchTermState] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search term
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set up new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, SEARCH_DEBOUNCE_MS);

    // Cleanup on unmount or when searchTerm changes
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  // Compute filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      // Lifetime filter
      if (lifetimeFilter.size > 0 && !lifetimeFilter.has(node.lifetime)) {
        return false;
      }

      // Ownership filter
      if (ownershipFilter.size > 0) {
        const nodeOwnership = node.ownership ?? "own";
        if (!ownershipFilter.has(nodeOwnership)) {
          return false;
        }
      }

      // Container filter
      if (containerFilter.size > 0) {
        if (node.containers === undefined || node.containers.length === 0) {
          return false;
        }
        const hasMatchingContainer = node.containers.some(c => containerFilter.has(c));
        if (!hasMatchingContainer) {
          return false;
        }
      }

      // Factory kind filter
      if (factoryKindFilter !== undefined) {
        const nodeFactoryKind = node.factoryKind ?? "sync";
        if (nodeFactoryKind !== factoryKindFilter) {
          return false;
        }
      }

      // Search term filter (fuzzy matching via substring)
      if (debouncedSearchTerm.length > 0) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const labelLower = node.label.toLowerCase();
        const idLower = node.id.toLowerCase();

        if (!labelLower.includes(searchLower) && !idLower.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [
    nodes,
    lifetimeFilter,
    ownershipFilter,
    containerFilter,
    factoryKindFilter,
    debouncedSearchTerm,
  ]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (lifetimeFilter.size > 0) count++;
    if (ownershipFilter.size > 0) count++;
    if (containerFilter.size > 0) count++;
    if (factoryKindFilter !== undefined) count++;
    if (debouncedSearchTerm.length > 0) count++;
    return count;
  }, [lifetimeFilter, ownershipFilter, containerFilter, factoryKindFilter, debouncedSearchTerm]);

  // Filter state object
  const filterState = useMemo<GraphFilterState>(
    () => ({
      lifetimeFilter,
      ownershipFilter,
      containerFilter,
      factoryKindFilter,
      searchTerm,
    }),
    [lifetimeFilter, ownershipFilter, containerFilter, factoryKindFilter, searchTerm]
  );

  // Setters
  const setLifetimeFilter = useCallback((lifetimes: ReadonlySet<Lifetime>) => {
    setLifetimeFilterState(lifetimes);
  }, []);

  const setOwnershipFilter = useCallback((ownership: ReadonlySet<ServiceOrigin>) => {
    setOwnershipFilterState(ownership);
  }, []);

  const setContainerFilter = useCallback((containerIds: ReadonlySet<string>) => {
    setContainerFilterState(containerIds);
  }, []);

  const setFactoryKindFilter = useCallback((factoryKind: FactoryKind | undefined) => {
    setFactoryKindFilterState(factoryKind);
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
  }, []);

  const clearFilters = useCallback(() => {
    setLifetimeFilterState(new Set());
    setOwnershipFilterState(new Set());
    setContainerFilterState(new Set());
    setFactoryKindFilterState(undefined);
    setSearchTermState("");
    setDebouncedSearchTerm("");
  }, []);

  return {
    filteredNodes,
    matchCount: filteredNodes.length,
    totalCount: nodes.length,
    activeFilterCount,
    filterState,
    setLifetimeFilter,
    setOwnershipFilter,
    setContainerFilter,
    setFactoryKindFilter,
    setSearchTerm,
    clearFilters,
  };
}
