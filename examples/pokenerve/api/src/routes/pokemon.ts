import { Hono } from "hono";
import { resolvePort } from "@hex-di/hono";
import { PokeApiProxyPort } from "../adapters/pokeapi-proxy.js";
import {
  RateLimitError,
  NotFoundError,
  NetworkError,
  ParseError,
} from "../adapters/pokeapi-proxy.js";

type ApiEnv = { Variables: Record<string, unknown> };

function mapErrorToStatus(error: unknown): { status: 404 | 429 | 500 | 502; message: string } {
  if (error instanceof NotFoundError) {
    return { status: 404, message: error.message };
  }
  if (error instanceof RateLimitError) {
    return { status: 429, message: error.message };
  }
  if (error instanceof NetworkError) {
    return { status: 502, message: error.message };
  }
  if (error instanceof ParseError) {
    return { status: 500, message: error.message };
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  return { status: 500, message };
}

// Type guard helpers for working with unknown PokeAPI responses

function hasProperty<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
  return value !== null && typeof value === "object" && key in value;
}

function getPokemonSpeciesFromFilter(value: unknown): readonly { name: string; url: string }[] {
  if (hasProperty(value, "pokemon_species") && Array.isArray(value.pokemon_species)) {
    return value.pokemon_species;
  }
  return [];
}

function getTypePokemon(
  value: unknown
): readonly { slot: number; pokemon: { name: string; url: string } }[] {
  if (hasProperty(value, "pokemon") && Array.isArray(value.pokemon)) {
    return value.pokemon;
  }
  return [];
}

function getEvolutionChainUrl(species: unknown): string | undefined {
  if (
    hasProperty(species, "evolution_chain") &&
    hasProperty(species.evolution_chain, "url") &&
    typeof species.evolution_chain.url === "string"
  ) {
    return species.evolution_chain.url;
  }
  return undefined;
}

function getTypeEffectiveness(
  value: unknown
): { id: unknown; name: unknown; damage_relations: unknown } | undefined {
  if (
    hasProperty(value, "id") &&
    hasProperty(value, "name") &&
    hasProperty(value, "damage_relations")
  ) {
    return {
      id: value.id,
      name: value.name,
      damage_relations: value.damage_relations,
    };
  }
  return undefined;
}

const pokemonRoutes = new Hono<ApiEnv>();

// GET /pokemon - paginated list with filters
pokemonRoutes.get("/pokemon", async c => {
  try {
    const proxy = resolvePort(c, PokeApiProxyPort);

    const limit = Number(c.req.query("limit") ?? "20");
    const offset = Number(c.req.query("offset") ?? "0");
    const typeFilter = c.req.query("type");
    const habitatFilter = c.req.query("habitat");
    const colorFilter = c.req.query("color");
    const shapeFilter = c.req.query("shape");

    // If filtering by type, use the type endpoint
    if (typeFilter) {
      const typeData = await proxy.fetch(`/type/${typeFilter}`);
      const allPokemon = getTypePokemon(typeData);
      const results = allPokemon.slice(offset, offset + limit).map(tp => tp.pokemon);
      return c.json({
        count: allPokemon.length,
        next:
          offset + limit < allPokemon.length
            ? `/pokemon?type=${typeFilter}&limit=${limit}&offset=${offset + limit}`
            : null,
        previous:
          offset > 0
            ? `/pokemon?type=${typeFilter}&limit=${limit}&offset=${Math.max(0, offset - limit)}`
            : null,
        results,
      });
    }

    // If filtering by habitat, use habitat endpoint
    if (habitatFilter) {
      const raw = await proxy.fetch(`/pokemon-habitat/${habitatFilter}`);
      const allSpecies = getPokemonSpeciesFromFilter(raw);
      const results = allSpecies.slice(offset, offset + limit);
      return c.json({
        count: allSpecies.length,
        next:
          offset + limit < allSpecies.length
            ? `/pokemon?habitat=${habitatFilter}&limit=${limit}&offset=${offset + limit}`
            : null,
        previous:
          offset > 0
            ? `/pokemon?habitat=${habitatFilter}&limit=${limit}&offset=${Math.max(0, offset - limit)}`
            : null,
        results,
      });
    }

    // If filtering by color, use color endpoint
    if (colorFilter) {
      const raw = await proxy.fetch(`/pokemon-color/${colorFilter}`);
      const allSpecies = getPokemonSpeciesFromFilter(raw);
      const results = allSpecies.slice(offset, offset + limit);
      return c.json({
        count: allSpecies.length,
        next:
          offset + limit < allSpecies.length
            ? `/pokemon?color=${colorFilter}&limit=${limit}&offset=${offset + limit}`
            : null,
        previous:
          offset > 0
            ? `/pokemon?color=${colorFilter}&limit=${limit}&offset=${Math.max(0, offset - limit)}`
            : null,
        results,
      });
    }

    // If filtering by shape, use shape endpoint
    if (shapeFilter) {
      const raw = await proxy.fetch(`/pokemon-shape/${shapeFilter}`);
      const allSpecies = getPokemonSpeciesFromFilter(raw);
      const results = allSpecies.slice(offset, offset + limit);
      return c.json({
        count: allSpecies.length,
        next:
          offset + limit < allSpecies.length
            ? `/pokemon?shape=${shapeFilter}&limit=${limit}&offset=${offset + limit}`
            : null,
        previous:
          offset > 0
            ? `/pokemon?shape=${shapeFilter}&limit=${limit}&offset=${Math.max(0, offset - limit)}`
            : null,
        results,
      });
    }

    // Default: paginated list from PokeAPI
    const data = await proxy.fetch(`/pokemon?limit=${limit}&offset=${offset}`);
    return c.json(data);
  } catch (error) {
    const { status, message } = mapErrorToStatus(error);
    return c.json({ error: message }, status);
  }
});

// GET /pokemon/:id - full detail
pokemonRoutes.get("/pokemon/:id", async c => {
  try {
    const proxy = resolvePort(c, PokeApiProxyPort);
    const id = c.req.param("id");
    const pokemon = await proxy.fetch(`/pokemon/${id}`);
    return c.json(pokemon);
  } catch (error) {
    const { status, message } = mapErrorToStatus(error);
    return c.json({ error: message }, status);
  }
});

// GET /pokemon/:id/species
pokemonRoutes.get("/pokemon/:id/species", async c => {
  try {
    const proxy = resolvePort(c, PokeApiProxyPort);
    const id = c.req.param("id");
    const species = await proxy.fetch(`/pokemon-species/${id}`);
    return c.json(species);
  } catch (error) {
    const { status, message } = mapErrorToStatus(error);
    return c.json({ error: message }, status);
  }
});

// GET /pokemon/:id/evolution
pokemonRoutes.get("/pokemon/:id/evolution", async c => {
  try {
    const proxy = resolvePort(c, PokeApiProxyPort);
    const id = c.req.param("id");

    // First get species to find evolution chain URL
    const species = await proxy.fetch(`/pokemon-species/${id}`);
    const chainUrl = getEvolutionChainUrl(species);
    if (chainUrl === undefined) {
      return c.json({ error: "Evolution chain not found for this species" }, 404);
    }

    // Extract the evolution chain ID from the URL
    const chainSegments = chainUrl.split("/").filter(s => s.length > 0);
    const chainId = chainSegments[chainSegments.length - 1];

    if (chainId === undefined) {
      return c.json({ error: "Could not parse evolution chain URL" }, 500);
    }

    const chain = await proxy.fetch(`/evolution-chain/${chainId}`);
    return c.json(chain);
  } catch (error) {
    const { status, message } = mapErrorToStatus(error);
    return c.json({ error: message }, status);
  }
});

// GET /types - all types
pokemonRoutes.get("/types", async c => {
  try {
    const proxy = resolvePort(c, PokeApiProxyPort);
    const data = await proxy.fetch("/type");
    return c.json(data);
  } catch (error) {
    const { status, message } = mapErrorToStatus(error);
    return c.json({ error: message }, status);
  }
});

// GET /types/:id/effectiveness
pokemonRoutes.get("/types/:id/effectiveness", async c => {
  try {
    const proxy = resolvePort(c, PokeApiProxyPort);
    const id = c.req.param("id");
    const raw = await proxy.fetch(`/type/${id}`);
    const effectiveness = getTypeEffectiveness(raw);
    if (effectiveness === undefined) {
      return c.json({ error: "Invalid type data" }, 500);
    }
    return c.json(effectiveness);
  } catch (error) {
    const { status, message } = mapErrorToStatus(error);
    return c.json({ error: message }, status);
  }
});

export { pokemonRoutes, mapErrorToStatus };
