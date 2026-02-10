# Feature 6 -- Research Notes

A personal research journal where trainers track discoveries, manage their team, and tag Pokemon with custom research notes. This feature demonstrates `@hex-di/store` reactive state management with atoms, derived values, and effects, combined with `@hex-di/query` for data fetching and caching.

**HexDI packages:** `@hex-di/core`, `@hex-di/runtime`, `@hex-di/store`, `@hex-di/query`, `@hex-di/react`

---

## 1. Store Architecture

The research notes feature models trainer state as a graph of reactive atoms and derived values using `@hex-di/store`. Changes to any atom propagate through the dependency graph to recompute derived values, which in turn trigger React re-renders via subscriptions.

### Reactive Dependency Graph

```
trainerProfileAtom
        |
        v
    teamAtom ---------> teamPowerDerived (sum of base stats)
        |                       |
        |                       v
        |              typeCoverageDerived (% of 18 types covered)
        |                       |
        |                       v
        |              teamWeaknessesDerived (types team is weak to)
        |
        v
  favoritesAtom ------> pokedexCompletionDerived (favorites / total * 100)
        |
        v
  researchTagsAtom

  Effects:
  autoSaveEffect -----> subscribes to all atoms, debounced write to localStorage
  syncPreferencesEffect -> subscribes to trainerProfileAtom, syncs theme/display prefs
```

When the user adds a Pokemon to their team, `teamPowerDerived`, `typeCoverageDerived`, and `teamWeaknessesDerived` all recompute automatically. When they favorite a Pokemon, `pokedexCompletionDerived` updates. Brain View shows this reactive graph with values updating in real-time.

---

## 2. Atom Definitions

### Trainer Profile Atom

```typescript
import { createAtomPort, createAtomAdapter } from "@hex-di/store";

interface TrainerProfile {
  readonly name: string;
  readonly avatar: string;
  readonly region: string;
  readonly startedAt: number;
}

const TrainerProfileAtomPort = createAtomPort<TrainerProfile>()({
  name: "TrainerProfileAtom",
});

const TrainerProfileAtomAdapter = createAtomAdapter({
  port: TrainerProfileAtomPort,
  initial: {
    name: "Red",
    avatar: "trainer-red",
    region: "Kanto",
    startedAt: Date.now(),
  },
});
```

### Team Atom

```typescript
const TeamAtomPort = createAtomPort<readonly Pokemon[]>()({
  name: "TeamAtom",
});

const TeamAtomAdapter = createAtomAdapter({
  port: TeamAtomPort,
  initial: [], // empty team, up to 6 members
});
```

### Favorites Atom

```typescript
const FavoritesAtomPort = createAtomPort<ReadonlySet<number>>()({
  name: "FavoritesAtom",
});

const FavoritesAtomAdapter = createAtomAdapter({
  port: FavoritesAtomPort,
  initial: new Set<number>(),
});
```

### Research Tags Atom

```typescript
const ResearchTagsAtomPort = createAtomPort<ReadonlyMap<number, readonly string[]>>()({
  name: "ResearchTagsAtom",
});

const ResearchTagsAtomAdapter = createAtomAdapter({
  port: ResearchTagsAtomPort,
  initial: new Map<number, readonly string[]>(),
});
```

---

## 3. Derived Value Definitions

### Team Power (sum of base stats)

```typescript
import { createDerivedPort, createDerivedAdapter } from "@hex-di/store";

const TeamPowerDerivedPort = createDerivedPort<number>()({
  name: "TeamPowerDerived",
});

const TeamPowerDerivedAdapter = createDerivedAdapter({
  port: TeamPowerDerivedPort,
  deps: { team: TeamAtomPort },
  compute: ({ team }) => {
    return team.reduce((total, pokemon) => {
      const stats = pokemon.stats;
      return (
        total +
        stats.hp +
        stats.attack +
        stats.defense +
        stats["special-attack"] +
        stats["special-defense"] +
        stats.speed
      );
    }, 0);
  },
});
```

### Type Coverage (percentage of 18 types covered)

```typescript
const TOTAL_TYPES = 18;

const TypeCoverageDerivedPort = createDerivedPort<number>()({
  name: "TypeCoverageDerived",
});

const TypeCoverageDerivedAdapter = createDerivedAdapter({
  port: TypeCoverageDerivedPort,
  deps: { team: TeamAtomPort },
  compute: ({ team }) => {
    const coveredTypes = new Set<string>();
    for (const pokemon of team) {
      for (const type of pokemon.types) {
        coveredTypes.add(type);
      }
    }
    return Math.round((coveredTypes.size / TOTAL_TYPES) * 100);
  },
});
```

### Pokedex Completion (favorites count / total Pokemon)

```typescript
const TOTAL_POKEMON = 1025; // Gen IX total

const PokedexCompletionDerivedPort = createDerivedPort<number>()({
  name: "PokedexCompletionDerived",
});

const PokedexCompletionDerivedAdapter = createDerivedAdapter({
  port: PokedexCompletionDerivedPort,
  deps: { favorites: FavoritesAtomPort },
  compute: ({ favorites }) => {
    return Math.round((favorites.size / TOTAL_POKEMON) * 100 * 10) / 10;
  },
});
```

### Team Weaknesses (types the team is collectively weak to)

```typescript
interface TeamWeakness {
  readonly type: string;
  readonly weakCount: number; // how many team members are weak to this type
  readonly resistCount: number; // how many team members resist this type
  readonly severity: "critical" | "moderate" | "minor";
}

const TeamWeaknessesDerivedPort = createDerivedPort<readonly TeamWeakness[]>()({
  name: "TeamWeaknessesDerived",
});

const TeamWeaknessesDerivedAdapter = createDerivedAdapter({
  port: TeamWeaknessesDerivedPort,
  deps: { team: TeamAtomPort },
  compute: ({ team }) => {
    // For each of the 18 types, count how many team members are weak/resistant.
    // Uses the type effectiveness data loaded via the TypeChart query.
    // Returns types where weakCount > resistCount, sorted by severity.
    const allTypes = [
      "normal",
      "fire",
      "water",
      "electric",
      "grass",
      "ice",
      "fighting",
      "poison",
      "ground",
      "flying",
      "psychic",
      "bug",
      "rock",
      "ghost",
      "dragon",
      "dark",
      "steel",
      "fairy",
    ];

    const weaknesses: TeamWeakness[] = [];

    for (const attackType of allTypes) {
      let weakCount = 0;
      let resistCount = 0;

      for (const pokemon of team) {
        const effectiveness = getTypeEffectiveness(attackType, pokemon.types);
        if (effectiveness > 1) weakCount++;
        if (effectiveness < 1) resistCount++;
      }

      if (weakCount > resistCount) {
        const severity: TeamWeakness["severity"] =
          weakCount >= 3 ? "critical" : weakCount >= 2 ? "moderate" : "minor";
        weaknesses.push({ type: attackType, weakCount, resistCount, severity });
      }
    }

    return weaknesses.sort((a, b) => b.weakCount - a.weakCount);
  },
});
```

---

## 4. Effect Definitions

### Auto-Save Effect

Debounced persistence of all atoms to `localStorage`. Triggers 500ms after the last atom change.

```typescript
import { createEffectAdapter } from "@hex-di/store";

const AutoSaveEffectAdapter = createEffectAdapter({
  name: "AutoSaveEffect",
  deps: {
    profile: TrainerProfileAtomPort,
    team: TeamAtomPort,
    favorites: FavoritesAtomPort,
    tags: ResearchTagsAtomPort,
  },
  effect: ({ profile, team, favorites, tags }) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function scheduleSave() {
      if (timeoutId !== null) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const saveData = {
          version: 1,
          savedAt: Date.now(),
          profile,
          team,
          favorites: Array.from(favorites),
          tags: Array.from(tags.entries()),
        };
        localStorage.setItem("pokenerve-research", JSON.stringify(saveData));
      }, 500);
    }

    scheduleSave();

    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  },
});
```

### Sync Preferences Effect

Synchronizes trainer display preferences (theme, language) when the trainer profile changes.

```typescript
const SyncPreferencesEffectAdapter = createEffectAdapter({
  name: "SyncPreferencesEffect",
  deps: { profile: TrainerProfileAtomPort },
  effect: ({ profile }) => {
    document.documentElement.setAttribute("data-region", profile.region);
    // Apply region-specific theme if needed
  },
});
```

---

## 5. Query Integration

Data fetching with `@hex-di/query` caching for Pokemon list and detail data. The query cache is shared across the entire application and visible in the cache viewer.

### Query Port Definitions

```typescript
import { createQueryPort, createQueryAdapter } from "@hex-di/query";

interface PokemonListParams {
  readonly offset: number;
  readonly limit: number;
}

interface PokemonListResult {
  readonly results: readonly { name: string; id: number }[];
  readonly count: number;
}

const PokemonListQueryPort = createQueryPort<PokemonListResult, PokemonListParams>()({
  name: "PokemonListQuery",
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
});

interface PokemonDetailParams {
  readonly id: number;
}

const PokemonDetailQueryPort = createQueryPort<Pokemon, PokemonDetailParams>()({
  name: "PokemonDetailQuery",
  staleTime: 5 * 60 * 1000,
  cacheTime: 30 * 60 * 1000,
});
```

### Query Adapters

```typescript
const PokemonListQueryAdapter = createQueryAdapter({
  port: PokemonListQueryPort,
  fetcher: async (params, context) => {
    const response = await fetch(
      `${API_BASE}/api/pokemon?offset=${params.offset}&limit=${params.limit}`,
      { headers: context.headers }
    );
    return response.json();
  },
});

const PokemonDetailQueryAdapter = createQueryAdapter({
  port: PokemonDetailQueryPort,
  fetcher: async (params, context) => {
    const response = await fetch(`${API_BASE}/api/pokemon/${params.id}`, {
      headers: context.headers,
    });
    return response.json();
  },
});
```

### Prefetching Strategy

When the user is viewing page N of the Pokemon list, the next page (N+1) is prefetched in the background. This ensures instant navigation when the user clicks "Next Page."

```typescript
import { createQueryClient } from "@hex-di/query";

// Inside the PokemonList component:
function prefetchNextPage(currentOffset: number, limit: number) {
  queryClient.prefetch(PokemonListQueryPort, {
    offset: currentOffset + limit,
    limit,
  });
}
```

### Cache Viewer Data

The cache viewer reads from the `QueryInspectorAPI` provided by `@hex-di/query`:

```typescript
import { createQueryInspector, QueryInspectorPort } from "@hex-di/query";

// QueryInspectorAPI provides:
// - getSnapshot(): QuerySnapshot with all cache entries
// - getCacheStats(): CacheStats with hit rates, miss counts, eviction counts
// - getFetchHistory(): FetchHistoryEntry[] with timing data
```

The `CacheViewer` component displays:

- Total cache entries with key names and staleness indicators
- Cache hit rate as a percentage
- Stale time countdown for each entry
- Active in-flight fetches

---

## 6. Persistence Strategy

### Save Format

```typescript
interface ResearchSaveData {
  readonly version: number; // schema version for migration
  readonly savedAt: number; // timestamp
  readonly profile: TrainerProfile;
  readonly team: readonly Pokemon[]; // serialized team members
  readonly favorites: readonly number[]; // Array.from(Set)
  readonly tags: readonly [number, readonly string[]][]; // Array.from(Map.entries())
}
```

### Hydration on App Load

When the application loads, the `autoSaveEffect` checks `localStorage` for existing data and hydrates all atoms:

```typescript
import { createHydrationAdapter } from "@hex-di/store";

const ResearchHydrationAdapter = createHydrationAdapter({
  name: "ResearchHydration",
  storage: {
    async load(): Promise<ResearchSaveData | null> {
      const raw = localStorage.getItem("pokenerve-research");
      if (raw === null) return null;
      return JSON.parse(raw);
    },
    async save(data: ResearchSaveData): Promise<void> {
      localStorage.setItem("pokenerve-research", JSON.stringify(data));
    },
    async clear(): Promise<void> {
      localStorage.removeItem("pokenerve-research");
    },
  },
  hydrate: (data, atoms) => {
    if (data.version !== 1) return; // skip unknown versions

    atoms.set(TrainerProfileAtomPort, data.profile);
    atoms.set(TeamAtomPort, data.team);
    atoms.set(FavoritesAtomPort, new Set(data.favorites));
    atoms.set(ResearchTagsAtomPort, new Map(data.tags));
  },
});
```

### Migration Strategy

The `version` field in `ResearchSaveData` enables future schema migrations. When loading data with an older version, a migration function transforms it to the current schema before hydration. For v1 (the initial version), no migration is needed.

```typescript
function migrateResearchData(data: unknown): ResearchSaveData {
  const obj = data as Record<string, unknown>;
  const version = typeof obj["version"] === "number" ? obj["version"] : 0;

  switch (version) {
    case 0:
      // Pre-versioned data: wrap in v1 format
      return {
        version: 1,
        savedAt: Date.now(),
        profile: DEFAULT_PROFILE,
        team: [],
        favorites: [],
        tags: [],
      };
    case 1:
      return data as ResearchSaveData;
    default:
      // Unknown future version: reset to defaults
      return {
        version: 1,
        savedAt: Date.now(),
        profile: DEFAULT_PROFILE,
        team: [],
        favorites: [],
        tags: [],
      };
  }
}
```

---

## 7. React Components

### Component Tree

```
ResearchPage
  |-- TrainerProfile (editable trainer info card)
  |-- TeamBuilder
  |     |-- TeamSlot x6 (drag target for Pokemon)
  |     |-- TeamStats (derived statistics panel)
  |           |-- PowerScore (total base stats)
  |           |-- TypeCoverage (% bar with type icons)
  |           |-- WeaknessChart (types the team is weak to)
  |-- FavoritesList (grid of favorited Pokemon with search and quick-add)
  |-- ResearchTags (tagging interface for categorizing Pokemon)
  |-- CacheViewer (debug panel showing query cache state)
```

### Props Interfaces

```typescript
interface ResearchPageProps {} // no props -- all state from store

interface TrainerProfileProps {
  readonly profile: TrainerProfile;
  readonly onUpdate: (field: keyof TrainerProfile, value: string) => void;
}

interface TeamBuilderProps {
  readonly team: readonly Pokemon[];
  readonly onAddPokemon: (pokemon: Pokemon) => void;
  readonly onRemovePokemon: (index: number) => void;
  readonly onReorder: (fromIndex: number, toIndex: number) => void;
}

interface TeamStatsProps {
  readonly power: number;
  readonly typeCoverage: number;
  readonly weaknesses: readonly TeamWeakness[];
}

interface FavoritesListProps {
  readonly favorites: ReadonlySet<number>;
  readonly onToggleFavorite: (pokemonId: number) => void;
}

interface ResearchTagsProps {
  readonly tags: ReadonlyMap<number, readonly string[]>;
  readonly onAddTag: (pokemonId: number, tag: string) => void;
  readonly onRemoveTag: (pokemonId: number, tag: string) => void;
}

interface CacheViewerProps {
  readonly entries: readonly CacheEntryDisplay[];
  readonly stats: CacheStats;
}

interface CacheEntryDisplay {
  readonly key: string;
  readonly portName: string;
  readonly dataAge: number; // ms since last fetch
  readonly staleIn: number; // ms until stale
  readonly isStale: boolean;
  readonly hitCount: number;
}

interface CacheStats {
  readonly totalEntries: number;
  readonly hitRate: number; // 0--100 percentage
  readonly missCount: number;
  readonly activeRequests: number;
}
```

### Hook Usage in ResearchPage

```typescript
import { usePort } from "@hex-di/react";
import type { AtomService, DerivedService } from "@hex-di/store";

function ResearchPage() {
  // Atoms
  const profileAtom = usePort(TrainerProfileAtomPort);
  const teamAtom = usePort(TeamAtomPort);
  const favoritesAtom = usePort(FavoritesAtomPort);
  const tagsAtom = usePort(ResearchTagsAtomPort);

  // Derived values (recompute automatically when source atoms change)
  const teamPower = usePort(TeamPowerDerivedPort);
  const typeCoverage = usePort(TypeCoverageDerivedPort);
  const completion = usePort(PokedexCompletionDerivedPort);
  const weaknesses = usePort(TeamWeaknessesDerivedPort);

  // Read current values from atom services
  const profile = profileAtom.value;
  const team = teamAtom.value;
  const favorites = favoritesAtom.value;

  // Mutations
  function addToTeam(pokemon: Pokemon) {
    if (team.length >= 6) return;
    teamAtom.update(current => [...current, pokemon]);
  }

  function toggleFavorite(pokemonId: number) {
    favoritesAtom.update(current => {
      const next = new Set(current);
      if (next.has(pokemonId)) {
        next.delete(pokemonId);
      } else {
        next.add(pokemonId);
      }
      return next;
    });
  }

  function addTag(pokemonId: number, tag: string) {
    tagsAtom.update(current => {
      const next = new Map(current);
      const existing = next.get(pokemonId) ?? [];
      if (!existing.includes(tag)) {
        next.set(pokemonId, [...existing, tag]);
      }
      return next;
    });
  }
}
```

### Reactive Update Propagation

When the user adds a Pokemon to their team via `teamAtom.update()`:

1. The `teamAtom` signal notifies its subscribers.
2. `teamPowerDerived` recomputes (signal-based, synchronous).
3. `typeCoverageDerived` recomputes (same batch).
4. `teamWeaknessesDerived` recomputes (same batch).
5. React components subscribed to these derived values re-render.
6. The `autoSaveEffect` schedules a debounced save to `localStorage`.

All derived recomputations happen in a single synchronous batch via `@hex-di/store`'s `batch()` mechanism, preventing intermediate renders.

---

## 8. Acceptance Criteria

1. **Favorites persist**: Favoriting a Pokemon and refreshing the page retains the favorite. The `autoSaveEffect` writes to `localStorage` within 500ms.
2. **Derived values update reactively**: Adding a Pokemon to the team immediately updates the power score, type coverage percentage, and weakness chart without manual refresh.
3. **Team power is correct**: The power score equals the sum of all 6 base stats (HP + Atk + Def + SpA + SpD + Spe) for every team member.
4. **Type coverage is correct**: With a team of Charizard (fire/flying), Blastoise (water), Venusaur (grass/poison), Pikachu (electric), Machamp (fighting), and Alakazam (psychic), the type coverage should be 8/18 = 44%.
5. **Weaknesses are ranked**: The weakness chart lists types in order of severity (most team members weak to that type first). Types where the team has more resistances than weaknesses are not shown.
6. **Cache viewer shows real data**: The cache viewer displays actual query cache entries with names matching the `PokemonListQuery` and `PokemonDetailQuery` ports. Hit rate updates after repeated fetches.
7. **Prefetching works**: Navigating to the next page of the Pokemon list loads instantly (no loading spinner) when the prefetch has completed.
8. **Research tags are per-Pokemon**: Tags added to Pokemon #25 (Pikachu) do not appear on Pokemon #1 (Bulbasaur). Tags are stored in the `researchTagsAtom` as a `Map<number, string[]>`.
9. **Hydration loads saved state**: On app startup, if `localStorage` contains valid `pokenerve-research` data, all atoms are hydrated from the saved state before the first render.
10. **Brain View shows the reactive graph**: The store's reactive dependency graph is visible in Brain View, showing atoms as source nodes, derived values as computed nodes, and edges representing dependencies. Values update in real-time as the user interacts.
