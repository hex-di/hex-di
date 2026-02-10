/**
 * Cached Pokemon detail adapter using LRU cache decorator pattern.
 *
 * Wraps the underlying PokemonDetailPort with an in-memory LRU cache.
 * Cache hits avoid network calls; misses delegate to the inner adapter.
 * Demonstrates adapter composition via the `requires` dependency.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ok } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { Pokemon, PokemonSpecies, PokemonApiError } from "@pokenerve/shared/types/pokemon";
import { PokemonDetailPort } from "../../ports/pokemon-api.js";

// ---------------------------------------------------------------------------
// Simple LRU cache
// ---------------------------------------------------------------------------

class LruCache<K, V> {
  private readonly cache = new Map<K, V>();
  private _hits = 0;
  private _misses = 0;

  constructor(private readonly maxSize: number) {}

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      // Delete oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  get size(): number {
    return this.cache.size;
  }

  get hits(): number {
    return this._hits;
  }

  get misses(): number {
    return this._misses;
  }

  trackHit(): void {
    this._hits++;
  }

  trackMiss(): void {
    this._misses++;
  }
}

// ---------------------------------------------------------------------------
// Cached detail adapter (wraps the underlying detail port)
// ---------------------------------------------------------------------------

const cachedPokemonDetailAdapter = createAdapter({
  provides: PokemonDetailPort,
  requires: [PokemonDetailPort],
  lifetime: "singleton",
  factory: deps => {
    const inner = deps.PokemonDetail;
    const pokemonCache = new LruCache<string, Pokemon>(200);
    const speciesCache = new LruCache<string, PokemonSpecies>(200);

    return {
      async getById(id: number): Promise<Result<Pokemon, PokemonApiError>> {
        const key = `pokemon:${id}`;
        const cached = pokemonCache.get(key);
        if (cached !== undefined) {
          pokemonCache.trackHit();
          return ok(cached);
        }
        pokemonCache.trackMiss();
        const result = await inner.getById(id);
        if (result.isOk()) {
          pokemonCache.set(key, result.value);
        }
        return result;
      },
      async getByName(name: string): Promise<Result<Pokemon, PokemonApiError>> {
        const key = `pokemon:name:${name}`;
        const cached = pokemonCache.get(key);
        if (cached !== undefined) {
          pokemonCache.trackHit();
          return ok(cached);
        }
        pokemonCache.trackMiss();
        const result = await inner.getByName(name);
        if (result.isOk()) {
          pokemonCache.set(key, result.value);
        }
        return result;
      },
      async getSpecies(id: number): Promise<Result<PokemonSpecies, PokemonApiError>> {
        const key = `species:${id}`;
        const cached = speciesCache.get(key);
        if (cached !== undefined) {
          speciesCache.trackHit();
          return ok(cached);
        }
        speciesCache.trackMiss();
        const result = await inner.getSpecies(id);
        if (result.isOk()) {
          speciesCache.set(key, result.value);
        }
        return result;
      },
    };
  },
});

export { cachedPokemonDetailAdapter };
