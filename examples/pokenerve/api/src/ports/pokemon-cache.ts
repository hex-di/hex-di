import { port } from "@hex-di/core";

interface CacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly size: number;
  readonly maxSize: number;
  readonly hitRate: number;
}

interface PokemonCacheService {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
  stats(): CacheStats;
}

const PokemonCachePort = port<PokemonCacheService>()({
  name: "PokemonCache",
  direction: "outbound",
  description: "In-memory LRU cache for PokeAPI responses",
  category: "infrastructure",
  tags: ["cache", "pokemon"],
});

export { PokemonCachePort };
export type { PokemonCacheService, CacheStats };
