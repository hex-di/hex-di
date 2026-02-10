/**
 * Type coverage computation utilities.
 *
 * Shared logic used by both the TypeCoveragePort adapter and the
 * TeamSuggestionsPort adapter to analyze team type coverage.
 *
 * @packageDocumentation
 */

import typeChartJson from "../../data/type-chart.json";
import gen1Data from "../../data/gen1-pokemon.json";

const allTypes: readonly string[] = typeChartJson.types;
const SUPER_EFFECTIVE_THRESHOLD = 2;

const typeMultipliersMap = new Map(
  Object.entries(typeChartJson.chart).map(([typeName, multipliers]) => [typeName, multipliers])
);

function getPokemonTypes(pokemonId: number): readonly string[] {
  const entry = gen1Data.find(p => p.id === pokemonId);
  if (entry === undefined) return [];
  return entry.types.map(t => t.type.name);
}

function getBaseStatTotal(pokemonId: number): number {
  const entry = gen1Data.find(p => p.id === pokemonId);
  if (entry === undefined) return 0;
  return entry.stats.reduce((sum, s) => sum + s.base_stat, 0);
}

function computeCoveredTypes(teamIds: readonly number[]): readonly string[] {
  const covered = new Set<string>();

  for (const id of teamIds) {
    const types = getPokemonTypes(id);
    for (const attackType of types) {
      const multipliers = typeMultipliersMap.get(attackType);
      if (multipliers === undefined) continue;
      for (let i = 0; i < allTypes.length; i++) {
        if (multipliers[i] >= SUPER_EFFECTIVE_THRESHOLD) {
          covered.add(allTypes[i]);
        }
      }
    }
  }

  return [...covered].sort();
}

function computeWeakTypes(teamIds: readonly number[]): readonly string[] {
  const weakTo = new Set<string>();

  for (const id of teamIds) {
    const defenseTypes = getPokemonTypes(id);
    for (const attackingType of allTypes) {
      const multipliers = typeMultipliersMap.get(attackingType);
      if (multipliers === undefined) continue;
      for (const defType of defenseTypes) {
        const defIndex = allTypes.indexOf(defType);
        if (defIndex >= 0 && multipliers[defIndex] >= SUPER_EFFECTIVE_THRESHOLD) {
          weakTo.add(attackingType);
        }
      }
    }
  }

  return [...weakTo].sort();
}

function computeUncoveredTypes(coveredTypes: readonly string[]): readonly string[] {
  const coveredSet = new Set(coveredTypes);
  return allTypes.filter(t => !coveredSet.has(t)).sort();
}

function computeCoveragePercentage(coveredTypes: readonly string[]): number {
  if (allTypes.length === 0) return 0;
  return Math.round((coveredTypes.length / allTypes.length) * 100);
}

/**
 * Find Pokemon that cover a given set of types via super-effective STAB.
 */
function findPokemonCoveringTypes(
  targetTypes: readonly string[],
  excludeIds: ReadonlySet<number>,
  limit: number
): readonly { pokemonId: number; pokemonName: string; coversTypes: readonly string[] }[] {
  if (targetTypes.length === 0) return [];

  const targetSet = new Set(targetTypes);
  const candidates: {
    pokemonId: number;
    pokemonName: string;
    coversTypes: string[];
    score: number;
  }[] = [];

  for (const entry of gen1Data) {
    if (excludeIds.has(entry.id)) continue;

    const coversTypes: string[] = [];
    for (const typeSlot of entry.types) {
      const attackType = typeSlot.type.name;
      const multipliers = typeMultipliersMap.get(attackType);
      if (multipliers === undefined) continue;
      for (let i = 0; i < allTypes.length; i++) {
        if (multipliers[i] >= SUPER_EFFECTIVE_THRESHOLD && targetSet.has(allTypes[i])) {
          if (!coversTypes.includes(allTypes[i])) {
            coversTypes.push(allTypes[i]);
          }
        }
      }
    }

    if (coversTypes.length > 0) {
      candidates.push({
        pokemonId: entry.id,
        pokemonName: entry.name,
        coversTypes,
        score: coversTypes.length,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit).map(({ pokemonId, pokemonName, coversTypes }) => ({
    pokemonId,
    pokemonName,
    coversTypes,
  }));
}

export {
  allTypes,
  getPokemonTypes,
  getBaseStatTotal,
  computeCoveredTypes,
  computeWeakTypes,
  computeUncoveredTypes,
  computeCoveragePercentage,
  findPokemonCoveringTypes,
};
