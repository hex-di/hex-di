/**
 * Type chart data utilities.
 *
 * Imports the static type-chart.json and provides helper functions
 * for type effectiveness lookups, color retrieval, and relationship
 * computation used by the Type Synergy Graph feature.
 *
 * @packageDocumentation
 */

import typeChart from "../../data/type-chart.json";

// ---------------------------------------------------------------------------
// Raw data
// ---------------------------------------------------------------------------

/** All 18 Pokemon type names in canonical order. */
const ALL_TYPES: readonly string[] = typeChart.types;

/** Mapping from type name to hex color string. */
const TYPE_COLORS: Readonly<Record<string, string>> = typeChart.colors;

/** Attack effectiveness chart: chart[attacker][defenderIndex] = multiplier. */
const CHART: Readonly<Record<string, readonly number[]>> = typeChart.chart;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TypeRelationship {
  readonly superEffective: readonly string[];
  readonly notVeryEffective: readonly string[];
  readonly immune: readonly string[];
}

interface TypeDefensiveProfile {
  readonly weakTo: readonly string[];
  readonly resists: readonly string[];
  readonly immuneTo: readonly string[];
}

interface TypeNodePosition {
  readonly name: string;
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------------------
// Color helper
// ---------------------------------------------------------------------------

/** Returns the hex color for a given type name, falling back to normal gray. */
function getTypeColor(typeName: string): string {
  return TYPE_COLORS[typeName] ?? "#A8A77A";
}

// ---------------------------------------------------------------------------
// Effectiveness helpers
// ---------------------------------------------------------------------------

/**
 * Computes the effectiveness multiplier when `attackType` attacks a Pokemon
 * with the given `defendTypes`. For dual types, multipliers are multiplied.
 */
function getEffectiveness(attackType: string, defendTypes: readonly string[]): number {
  const row = CHART[attackType];
  if (row === undefined) return 1;

  let multiplier = 1;
  for (const defendType of defendTypes) {
    const defIndex = ALL_TYPES.indexOf(defendType);
    if (defIndex === -1) continue;
    const value = row[defIndex];
    if (value !== undefined) {
      multiplier *= value;
    }
  }

  return multiplier;
}

/**
 * Computes all offensive relationships for a given attacking type.
 * Returns the types it is super-effective against (2x), not very effective
 * against (0.5x), and immune to (0x).
 */
function getOffensiveRelations(typeName: string): TypeRelationship {
  const row = CHART[typeName];
  if (row === undefined) {
    return { superEffective: [], notVeryEffective: [], immune: [] };
  }

  const superEffective: string[] = [];
  const notVeryEffective: string[] = [];
  const immune: string[] = [];

  for (let i = 0; i < ALL_TYPES.length; i++) {
    const mult = row[i];
    if (mult === undefined) continue;
    const target = ALL_TYPES[i];
    if (target === undefined) continue;

    if (mult >= 2) {
      superEffective.push(target);
    } else if (mult === 0) {
      immune.push(target);
    } else if (mult > 0 && mult < 1) {
      notVeryEffective.push(target);
    }
  }

  return { superEffective, notVeryEffective, immune };
}

/**
 * Computes all defensive relationships for a given defending type.
 * Returns the types it is weak to (takes 2x), resists (takes 0.5x),
 * and is immune to (takes 0x).
 */
function getDefensiveProfile(typeName: string): TypeDefensiveProfile {
  const typeIndex = ALL_TYPES.indexOf(typeName);
  if (typeIndex === -1) {
    return { weakTo: [], resists: [], immuneTo: [] };
  }

  const weakTo: string[] = [];
  const resists: string[] = [];
  const immuneTo: string[] = [];

  for (const attacker of ALL_TYPES) {
    const row = CHART[attacker];
    if (row === undefined) continue;
    const mult = row[typeIndex];
    if (mult === undefined) continue;

    if (mult >= 2) {
      weakTo.push(attacker);
    } else if (mult === 0) {
      immuneTo.push(attacker);
    } else if (mult > 0 && mult < 1) {
      resists.push(attacker);
    }
  }

  return { weakTo, resists, immuneTo };
}

// ---------------------------------------------------------------------------
// Node positioning
// ---------------------------------------------------------------------------

const GRAPH_RADIUS = 250;

/** Precalculated circle positions for each type node. */
const TYPE_POSITIONS: readonly TypeNodePosition[] = ALL_TYPES.map((name, i) => ({
  name,
  x: GRAPH_RADIUS * Math.cos((2 * Math.PI * i) / ALL_TYPES.length - Math.PI / 2),
  y: GRAPH_RADIUS * Math.sin((2 * Math.PI * i) / ALL_TYPES.length - Math.PI / 2),
}));

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  ALL_TYPES,
  TYPE_COLORS,
  CHART,
  GRAPH_RADIUS,
  TYPE_POSITIONS,
  getTypeColor,
  getEffectiveness,
  getOffensiveRelations,
  getDefensiveProfile,
};

export type { TypeRelationship, TypeDefensiveProfile, TypeNodePosition };
