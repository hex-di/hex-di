/**
 * Pokemon Discovery Hub - main container component.
 *
 * Orchestrates the Pokemon browsing experience with filtering, pagination,
 * grid display, detail panel, and adapter switching. Uses @hex-di/query
 * for data fetching with automatic caching and deduplication.
 *
 * Filter state is stored in URL search params for shareable URLs.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@hex-di/query-react";
import { PokemonListQueryPort } from "../../ports/query/pokemon-list-query.js";
import gen1Data from "../../data/gen1-pokemon.json";
import { FilterBar } from "./FilterBar.js";
import type { Filters } from "./FilterBar.js";
import { PokemonGrid } from "./PokemonGrid.js";
import type { PokemonSummary } from "./PokemonCard.js";
import { Pagination } from "./Pagination.js";
import { PokemonDetail } from "./PokemonDetail.js";
import { AdapterSwitcher } from "./AdapterSwitcher.js";
import type { AdapterChoice } from "./AdapterSwitcher.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

/**
 * Gen1 data indexed by name for fast type lookup.
 */
const gen1TypesByName = new Map(gen1Data.map(p => [p.name, p.types.map(t => t.type.name)]));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseIdFromUrl(url: string): number {
  const parts = url.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  const parsed = Number(last);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${String(id)}.png`;
}

function toSummary(name: string, url: string): PokemonSummary {
  const id = parseIdFromUrl(url);
  const types = gen1TypesByName.get(name) ?? [];

  return {
    id,
    name,
    spriteUrl: buildSpriteUrl(id),
    types,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DiscoveryPage(): ReactNode {
  const [searchParams, setSearchParams] = useSearchParams();

  // Adapter choice (visual demo only)
  const [adapterChoice, setAdapterChoice] = useState<AdapterChoice>("rest");

  // Selected pokemon for detail panel
  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(null);

  // Derive filter state from URL params
  const filters: Filters = {
    type: searchParams.get("type") ?? "",
    habitat: searchParams.get("habitat") ?? "",
    color: searchParams.get("color") ?? "",
    shape: searchParams.get("shape") ?? "",
  };

  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Build query params
  const queryParams = useMemo(
    () => ({
      offset,
      limit: PAGE_SIZE,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.habitat ? { habitat: filters.habitat } : {}),
      ...(filters.color ? { color: filters.color } : {}),
      ...(filters.shape ? { shape: filters.shape } : {}),
    }),
    [offset, filters.type, filters.habitat, filters.color, filters.shape]
  );

  // Use @hex-di/query for data fetching
  const queryState = useQuery(PokemonListQueryPort, queryParams);

  // Transform query data to PokemonSummary[]
  const pokemon: readonly PokemonSummary[] = useMemo(() => {
    if (queryState.data === undefined) return [];
    return queryState.data.results.map(r => toSummary(r.name, r.url));
  }, [queryState.data]);

  const totalCount = queryState.data?.count ?? 0;

  // Filter change handler
  const handleFilterChange = useCallback(
    (key: keyof Filters, value: string) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        next.delete("page");
        return next;
      });
    },
    [setSearchParams]
  );

  // Page change handler
  const handlePageChange = useCallback(
    (page: number) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (page > 1) {
          next.set("page", String(page));
        } else {
          next.delete("page");
        }
        return next;
      });
    },
    [setSearchParams]
  );

  return (
    <div className="relative flex h-full flex-col gap-6 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-emerald-400">Discovery Hub</h1>
        <p className="mt-1 text-sm text-gray-500">Browse, filter, and explore the Pokedex</p>
      </div>

      {/* Filter bar + adapter switcher */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <FilterBar filters={filters} onFilterChange={handleFilterChange} />
        <AdapterSwitcher current={adapterChoice} onChange={setAdapterChoice} />
      </div>

      {/* Error banner */}
      {queryState.isError && queryState.error !== null && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {"_tag" in queryState.error &&
            queryState.error._tag === "NetworkError" &&
            `Network error: ${(queryState.error as { message: string }).message}`}
          {"_tag" in queryState.error && queryState.error._tag === "NotFoundError" && `Not found`}
          {"_tag" in queryState.error &&
            queryState.error._tag === "RateLimitError" &&
            `Rate limited. Please wait.`}
          {"_tag" in queryState.error && queryState.error._tag === "ParseError" && `Parse error`}
        </div>
      )}

      {/* Pokemon grid */}
      <PokemonGrid
        pokemon={pokemon}
        onPokemonClick={setSelectedPokemonId}
        isLoading={queryState.isPending}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
      />

      {/* Detail side panel */}
      {selectedPokemonId !== null && (
        <PokemonDetail pokemonId={selectedPokemonId} onClose={() => setSelectedPokemonId(null)} />
      )}
    </div>
  );
}

export { DiscoveryPage };
