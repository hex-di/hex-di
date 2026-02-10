# Feature 1 -- Pokemon Discovery Hub

The entry point to PokeNerve. Browse, search, and filter Pokemon across all regions with live adapter switching, Result-typed error handling, query caching, and distributed tracing.

---

## 1. Feature Overview

The Discovery Hub demonstrates hexagonal architecture's core benefit -- implementation swapping without changing consumers. Three adapters implement the same port contracts. Users browse Pokemon, apply rich filters, and switch data sources at runtime while Brain View shows the dependency graph reconfigure live. Every API call is wrapped in `ResultAsync`, every fetch generates a trace span sent to Jaeger via OTLP.

**HexDI packages exercised:** `@hex-di/core`, `@hex-di/graph`, `@hex-di/runtime`, `@hex-di/result`, `@hex-di/tracing`, `@hex-di/react`, `@hex-di/hono`

---

## 2. Port Definitions

### 2.1 PokemonListPort

```typescript
import { port } from "@hex-di/core";
import type { ResultAsync } from "@hex-di/result";

// ── Domain Types ──────────────────────────────────────────────────────

interface PokemonSummary {
  readonly id: number;
  readonly name: string;
  readonly spriteUrl: string;
  readonly types: readonly string[];
}

interface PokemonListParams {
  readonly offset: number;
  readonly limit: number;
  readonly type?: string;
  readonly habitat?: string;
  readonly color?: string;
  readonly shape?: string;
}

interface PokemonListResponse {
  readonly results: readonly PokemonSummary[];
  readonly count: number;
  readonly next: string | null;
}

interface PokemonApiError {
  readonly _tag: "NetworkError" | "NotFoundError" | "RateLimitError" | "ParseError";
  readonly message: string;
  readonly statusCode?: number;
}

// ── Port ──────────────────────────────────────────────────────────────

interface PokemonListService {
  getList(params: PokemonListParams): ResultAsync<PokemonListResponse, PokemonApiError>;
}

const PokemonListPort = port<PokemonListService>()({
  name: "PokemonList",
  category: "data",
  description: "Paginated Pokemon list with filter support",
});
```

### 2.2 PokemonDetailPort

```typescript
interface PokemonDetail {
  readonly id: number;
  readonly name: string;
  readonly spriteUrl: string;
  readonly types: readonly string[];
  readonly stats: readonly PokemonStat[];
  readonly abilities: readonly PokemonAbility[];
  readonly moves: readonly PokemonMove[];
  readonly height: number;
  readonly weight: number;
  readonly baseExperience: number;
}

interface PokemonStat {
  readonly name: string;
  readonly baseStat: number;
  readonly effort: number;
}

interface PokemonAbility {
  readonly name: string;
  readonly isHidden: boolean;
}

interface PokemonMove {
  readonly name: string;
  readonly learnMethod: string;
  readonly levelLearnedAt: number;
}

interface PokemonDetailService {
  getById(id: number): ResultAsync<PokemonDetail, PokemonApiError>;
  getByName(name: string): ResultAsync<PokemonDetail, PokemonApiError>;
}

const PokemonDetailPort = port<PokemonDetailService>()({
  name: "PokemonDetail",
  category: "data",
  description: "Full Pokemon data retrieval by ID or name",
});
```

### 2.3 FilterOptionsPort

```typescript
interface FilterOptions {
  readonly types: readonly string[];
  readonly habitats: readonly string[];
  readonly colors: readonly string[];
  readonly shapes: readonly string[];
}

interface FilterOptionsService {
  getAll(): ResultAsync<FilterOptions, PokemonApiError>;
}

const FilterOptionsPort = port<FilterOptionsService>()({
  name: "FilterOptions",
  category: "data",
  description: "Available filter values from PokeAPI metadata endpoints",
});
```

---

## 3. Adapter Implementations

### 3.1 RestPokemonAdapter

Direct PokeAPI fetch calls. Slow but always returns fresh data.

```typescript
import { createAdapter, SINGLETON } from "@hex-di/core";
import { fromPromise, ResultAsync } from "@hex-di/result";

const RestPokemonListAdapter = createAdapter({
  provides: PokemonListPort,
  requires: [],
  lifetime: SINGLETON,
  factory: () => ({
    getList(params: PokemonListParams): ResultAsync<PokemonListResponse, PokemonApiError> {
      const url = buildListUrl(params);
      return fromPromise(
        fetch(url).then(res => {
          if (!res.ok) throw { status: res.status };
          return res.json();
        }),
        (error): PokemonApiError => mapFetchError(error)
      ).map(raw => parsePokemonListResponse(raw));
    },
  }),
});

const RestPokemonDetailAdapter = createAdapter({
  provides: PokemonDetailPort,
  requires: [],
  lifetime: SINGLETON,
  factory: () => ({
    getById(id: number): ResultAsync<PokemonDetail, PokemonApiError> {
      return fromPromise(
        fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(res => {
          if (!res.ok) throw { status: res.status };
          return res.json();
        }),
        (error): PokemonApiError => mapFetchError(error)
      ).map(raw => parsePokemonDetail(raw));
    },
    getByName(name: string): ResultAsync<PokemonDetail, PokemonApiError> {
      return fromPromise(
        fetch(`https://pokeapi.co/api/v2/pokemon/${name}`).then(res => {
          if (!res.ok) throw { status: res.status };
          return res.json();
        }),
        (error): PokemonApiError => mapFetchError(error)
      ).map(raw => parsePokemonDetail(raw));
    },
  }),
});
```

### 3.2 CachedPokemonAdapter (Decorator Pattern)

Wraps another adapter with a `Map`-based cache, configurable TTL, and hit/miss tracking.

```typescript
interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  readonly size: number;
}

const CachedPokemonListAdapter = createAdapter({
  provides: PokemonListPort,
  requires: [PokemonListPort] as const,
  lifetime: SINGLETON,
  factory: deps => {
    const inner = deps.PokemonList;
    const cache = new Map<string, CacheEntry<PokemonListResponse>>();
    const TTL_MS = 5 * 60 * 1000; // 5 minutes
    const stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };

    return {
      getList(params: PokemonListParams): ResultAsync<PokemonListResponse, PokemonApiError> {
        const key = JSON.stringify(params);
        const cached = cache.get(key);

        if (cached && Date.now() - cached.timestamp < TTL_MS) {
          stats.hits++;
          return ResultAsync.ok(cached.data);
        }

        stats.misses++;
        return inner.getList(params).map(response => {
          cache.set(key, { data: response, timestamp: Date.now() });
          return response;
        });
      },
    };
  },
});
```

**Note:** The `CachedPokemonDetailAdapter` follows the same decorator pattern wrapping `PokemonDetailPort`.

### 3.3 OfflinePokemonAdapter

Returns bundled static JSON data. Works with zero network access.

```typescript
import offlineData from "../data/offline-pokemon.json";

const OfflinePokemonListAdapter = createAdapter({
  provides: PokemonListPort,
  requires: [],
  lifetime: SINGLETON,
  factory: () => ({
    getList(params: PokemonListParams): ResultAsync<PokemonListResponse, PokemonApiError> {
      let filtered = offlineData.pokemon;

      if (params.type) {
        filtered = filtered.filter(p => p.types.includes(params.type));
      }
      if (params.habitat) {
        filtered = filtered.filter(p => p.habitat === params.habitat);
      }
      if (params.color) {
        filtered = filtered.filter(p => p.color === params.color);
      }
      if (params.shape) {
        filtered = filtered.filter(p => p.shape === params.shape);
      }

      const page = filtered.slice(params.offset, params.offset + params.limit);

      return ResultAsync.ok({
        results: page.map(p => ({
          id: p.id,
          name: p.name,
          spriteUrl: p.spriteUrl,
          types: p.types,
        })),
        count: filtered.length,
        next: params.offset + params.limit < filtered.length ? "more" : null,
      });
    },
  }),
});
```

---

## 4. Live Adapter Switching Mechanism

### 4.1 Adapter Choice Type

```typescript
type AdapterChoice = "rest" | "cached" | "offline";
```

### 4.2 Switching Strategy

The adapter switch uses HexDI's child container pattern with overrides.

```
User selects "cached" from AdapterSwitcher dropdown
  |
  v
React state updates: adapterChoice = "cached"
  |
  v
Container provider creates a child container with override:
  GraphBuilder.create()
    .provide(CachedPokemonListAdapter)
    .provide(CachedPokemonDetailAdapter)
    .build()
  |
  v
Child container replaces the active container in React context
  |
  v
All components re-resolve ports from the new container
  |
  v
Brain View shows:
  - Graph edge change animation (old adapter node fades, new node lights up)
  - Trace span: "adapter.switch" with { from: "rest", to: "cached" }
```

### 4.3 Graph Configurations

Each adapter choice maps to a specific set of adapters provided to the graph:

```typescript
function buildAdapterGraph(choice: AdapterChoice): Graph {
  const builder = GraphBuilder.create().provide(FilterOptionsAdapter);

  switch (choice) {
    case "rest":
      return builder.provide(RestPokemonListAdapter).provide(RestPokemonDetailAdapter).build();
    case "cached":
      return builder
        .provide(RestPokemonListAdapter) // inner adapter
        .provide(CachedPokemonListAdapter) // decorator wrapping inner
        .provide(RestPokemonDetailAdapter)
        .provide(CachedPokemonDetailAdapter)
        .build();
    case "offline":
      return builder
        .provide(OfflinePokemonListAdapter)
        .provide(OfflinePokemonDetailAdapter)
        .build();
  }
}
```

### 4.4 React Integration

```typescript
function DiscoveryContainerProvider({ children }: { readonly children: React.ReactNode }) {
  const [choice, setChoice] = useState<AdapterChoice>("rest");
  const container = useMemo(() => {
    const graph = buildAdapterGraph(choice);
    return createContainer(graph);
  }, [choice]);

  return (
    <HexDiContainerProvider container={container}>
      <AdapterChoiceContext.Provider value={{ choice, setChoice }}>
        {children}
      </AdapterChoiceContext.Provider>
    </HexDiContainerProvider>
  );
}
```

---

## 5. Query Integration

### 5.1 Query Port Definitions

Query ports wrap the data ports with caching semantics, deduplication, and stale-while-revalidate behavior.

```typescript
interface QueryOptions {
  readonly staleTime: number; // ms before data is considered stale
  readonly cacheTime: number; // ms before cache entry is garbage collected
  readonly deduplication: boolean;
}

interface QueryPort<TParams, TData, TError> {
  query(params: TParams): ResultAsync<TData, TError>;
  invalidate(params?: TParams): void;
  prefetch(params: TParams): void;
}
```

### 5.2 Caching Strategy

| Setting                | Value      | Rationale                                                       |
| ---------------------- | ---------- | --------------------------------------------------------------- |
| `staleTime`            | 5 minutes  | PokeAPI data is static; frequent refetches waste bandwidth      |
| `cacheTime`            | 30 minutes | Keep entries alive for back-navigation without refetch          |
| Deduplication          | enabled    | Multiple components requesting the same Pokemon share one fetch |
| Stale-while-revalidate | enabled    | Show cached data immediately, refresh in background             |

### 5.3 Request Deduplication

Concurrent requests for the same key (`JSON.stringify(params)`) share a single in-flight `Promise`. The first request triggers the fetch; subsequent requests receive the same `ResultAsync`.

---

## 6. Result Type Usage

### 6.1 Error Type Hierarchy

```typescript
interface PokemonApiError {
  readonly _tag: "NetworkError" | "NotFoundError" | "RateLimitError" | "ParseError";
  readonly message: string;
  readonly statusCode?: number;
}

function mapFetchError(error: unknown): PokemonApiError {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as Record<string, unknown>).status;
    if (status === 404) {
      return { _tag: "NotFoundError", message: "Pokemon not found", statusCode: 404 };
    }
    if (status === 429) {
      return { _tag: "RateLimitError", message: "Rate limit exceeded", statusCode: 429 };
    }
    return { _tag: "NetworkError", message: `HTTP ${String(status)}`, statusCode: Number(status) };
  }
  return { _tag: "NetworkError", message: "Network request failed" };
}
```

### 6.2 UI State Mapping with `match()`

```typescript
function PokemonListView() {
  const listPort = usePort(PokemonListPort);
  const [result, setResult] = useState<Result<PokemonListResponse, PokemonApiError> | null>(null);

  // ... fetch logic sets result

  if (result === null) {
    return <LoadingSkeleton />;
  }

  return result.match(
    (data) => {
      if (data.results.length === 0) {
        return <EmptyState message="No Pokemon match your filters" />;
      }
      return (
        <div className="grid grid-cols-4 gap-4">
          {data.results.map((pokemon) => (
            <PokemonCard key={pokemon.id} pokemon={pokemon} />
          ))}
        </div>
      );
    },
    (error) => {
      switch (error._tag) {
        case "NetworkError":
          return <ErrorBanner message="Network error. Check your connection." retry />;
        case "NotFoundError":
          return <ErrorBanner message="Pokemon not found." />;
        case "RateLimitError":
          return <ErrorBanner message="Too many requests. Wait a moment." retry />;
        case "ParseError":
          return <ErrorBanner message="Unexpected data format." />;
      }
    }
  );
}
```

---

## 7. Filtering System

### 7.1 PokeAPI Endpoints Used

| Filter  | Endpoint               | Returns                          |
| ------- | ---------------------- | -------------------------------- |
| Type    | `GET /type`            | 18 types + Pokemon per type      |
| Habitat | `GET /pokemon-habitat` | 9 habitats + Pokemon per habitat |
| Color   | `GET /pokemon-color`   | 10 colors + Pokemon per color    |
| Shape   | `GET /pokemon-shape`   | 14 shapes + Pokemon per shape    |

### 7.2 Filter Composition

Filters compose with AND logic. When multiple filters are active, the result set is the intersection.

```
Active filters: type=fire AND habitat=mountain
  |
  v
1. Fetch /type/fire -> Set A (all fire Pokemon IDs)
2. Fetch /pokemon-habitat/mountain -> Set B (all mountain Pokemon IDs)
3. Result = A intersect B
4. Paginate the intersection
```

### 7.3 URL Query Parameter Sync

Filter state is synced bidirectionally with URL query parameters via React Router.

```
URL: /discovery?type=fire&habitat=mountain&page=2

 --> On mount: parse URL params, set filter state
 <-- On filter change: update URL params via navigate()
```

```typescript
interface FilterState {
  readonly type: string | undefined;
  readonly habitat: string | undefined;
  readonly color: string | undefined;
  readonly shape: string | undefined;
  readonly page: number;
}
```

---

## 8. React Components

### 8.1 Component Tree

```
DiscoveryPage
 +-- FilterBar
 |    +-- TypeDropdown
 |    +-- HabitatDropdown
 |    +-- ColorDropdown
 |    +-- ShapeDropdown
 +-- AdapterSwitcher
 +-- PokemonGrid
 |    +-- PokemonCard (repeated)
 |         +-- SpriteImage
 |         +-- TypeBadges
 +-- Pagination
 +-- PokemonDetail (conditionally shown in side panel or modal)
      +-- StatRadarChart
      +-- AbilitiesList
      +-- MovesTable
```

### 8.2 Component Props Interfaces

```typescript
interface DiscoveryPageProps {
  // No props -- top-level route component.
  // Reads filter state from URL params.
}

interface FilterBarProps {
  readonly filters: FilterState;
  readonly options: FilterOptions;
  readonly onFilterChange: (key: keyof FilterState, value: string | undefined) => void;
}

interface PokemonCardProps {
  readonly pokemon: PokemonSummary;
  readonly onClick: (id: number) => void;
}

interface PokemonDetailProps {
  readonly pokemonId: number;
  readonly onClose: () => void;
}

interface AdapterSwitcherProps {
  readonly current: AdapterChoice;
  readonly onChange: (choice: AdapterChoice) => void;
}

interface PaginationProps {
  readonly currentPage: number;
  readonly totalCount: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
}

interface StatRadarChartProps {
  readonly stats: readonly PokemonStat[];
}
```

### 8.3 Key Component Behaviors

**DiscoveryPage** -- Container component. Reads filter state from URL query params. Passes filter state down to `FilterBar` and uses it to construct `PokemonListParams` for the query. Manages selected Pokemon state for the detail panel.

**FilterBar** -- Renders one dropdown per filter dimension. Loads options from `FilterOptionsPort` on mount. Calls `onFilterChange` when any dropdown value changes. Shows active filter count as a badge.

**PokemonCard** -- Compact card showing sprite image, name, and type badges. Clicking opens the detail panel. Uses Tailwind `hover:scale-105` for interaction feedback. Renders a colored border based on primary type.

**PokemonDetail** -- Expanded view shown as a slide-out panel. Fetches full data from `PokemonDetailPort` using the selected `pokemonId`. Renders a radar chart (6-axis: HP, Atk, Def, SpA, SpD, Spe) for base stats. Lists abilities and a truncated moves table.

**AdapterSwitcher** -- Dropdown with three options: REST (direct), Cached (fast), Offline (bundled). Displays current adapter name and a visual indicator (green dot for connected, gray for offline). Changing the adapter triggers the container rebuild described in Section 4.

---

## 9. Trace Spans Generated

### 9.1 Span Definitions

| Span Name              | Trigger                 | Key Attributes                                                                                                         |
| ---------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pokemon.list.fetch`   | Every list query        | `filter.type`, `filter.habitat`, `filter.color`, `filter.shape`, `result.count`, `cache.hit` (boolean), `adapter.name` |
| `pokemon.detail.fetch` | Every detail query      | `pokemon.id`, `pokemon.name`, `adapter.name`                                                                           |
| `adapter.switch`       | User changes adapter    | `adapter.from`, `adapter.to`, `timestamp`                                                                              |
| `filter.apply`         | User changes any filter | `filter.key`, `filter.value`, `result.count`                                                                           |

### 9.2 Span Structure

```
[pokemon.list.fetch] ─── 120ms
  |-- adapter: "cached"
  |-- cache.hit: false
  |-- filter.type: "fire"
  |-- result.count: 24
  |
  +-- [pokeapi.request] ─── 95ms (child span from Hono backend)
       |-- url: "https://pokeapi.co/api/v2/type/fire"
       |-- status: 200
```

Cross-service tracing: the frontend injects a `traceparent` header. The Hono backend continues the trace context. The full distributed trace is visible in Jaeger spanning browser to API to PokeAPI.

---

## 10. Acceptance Criteria

1. **Browsing**: A user can view a paginated grid of Pokemon with sprite images, names, and type badges. Pagination controls navigate between pages.

2. **Filtering**: A user can filter by type, habitat, color, and shape independently. Filters compose with AND logic. Active filters are reflected in the URL query parameters. Navigating back restores the previous filter state.

3. **Detail View**: Clicking a Pokemon card opens a detail panel showing full stats (radar chart), abilities, and moves. The detail panel can be closed.

4. **Adapter Switching**: A user can switch between REST, Cached, and Offline adapters via the `AdapterSwitcher` dropdown. The data refreshes immediately using the new adapter. Brain View shows the graph reconfiguration.

5. **Error Handling**: Network errors, rate limits, and 404s are shown as typed error banners. The Offline adapter works with no network. Error states include a retry button where applicable.

6. **Tracing**: Every API fetch generates a `pokemon.list.fetch` or `pokemon.detail.fetch` trace span. Adapter switches generate an `adapter.switch` span. Spans include structured attributes as specified. Spans are visible in Jaeger.

7. **Cache Metrics**: When using the Cached adapter, Brain View's Vital Signs panel shows cache hit/miss counts. Cached responses serve in under 5ms.

8. **Result Types**: All data fetching returns `ResultAsync<T, PokemonApiError>`. No untyped exceptions leak to the UI. The `match()` pattern is used for rendering all success/error states.

9. **Filter Options**: Filter dropdowns are populated from PokeAPI metadata endpoints (`/type`, `/pokemon-habitat`, `/pokemon-color`, `/pokemon-shape`). Options load once and are cached.

10. **Cross-Service Tracing**: A single request from the browser produces a distributed trace in Jaeger that spans the React frontend, the Hono API backend, and the external PokeAPI call.
