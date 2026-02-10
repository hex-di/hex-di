/**
 * Evolution guard builder.
 *
 * Composes PokeAPI evolution detail fields into guard predicates
 * for use in evolution state machine transitions. Multiple details
 * are ORed; within a single detail, all non-null fields are ANDed.
 *
 * @packageDocumentation
 */

import type { EvolutionDetail } from "@pokenerve/shared/types/pokemon";
import type { EvolutionContext } from "./evolution-context.js";

// ---------------------------------------------------------------------------
// Single-detail predicate builder
// ---------------------------------------------------------------------------

/**
 * Builds a predicate from a single EvolutionDetail.
 * All non-null/non-default fields are ANDed together.
 */
function buildSingleGuard(detail: EvolutionDetail): (ctx: EvolutionContext) => boolean {
  const checks: Array<(ctx: EvolutionContext) => boolean> = [];

  if (detail.min_level !== null) {
    const required = detail.min_level;
    checks.push(ctx => ctx.level >= required);
  }

  if (detail.min_happiness !== null) {
    const required = detail.min_happiness;
    checks.push(ctx => ctx.friendship >= required);
  }

  if (detail.min_affection !== null) {
    const required = detail.min_affection;
    checks.push(ctx => ctx.affection >= required);
  }

  if (detail.item !== null) {
    const required = detail.item.name;
    checks.push(ctx => ctx.heldItem === required);
  }

  if (detail.held_item !== null) {
    const required = detail.held_item.name;
    checks.push(ctx => ctx.heldItem === required);
  }

  if (detail.known_move !== null) {
    const required = detail.known_move.name;
    checks.push(ctx => ctx.knownMoves.includes(required));
  }

  if (detail.location !== null) {
    const required = detail.location.name;
    checks.push(ctx => ctx.location === required);
  }

  if (detail.time_of_day !== "") {
    const required = detail.time_of_day;
    checks.push(ctx => ctx.timeOfDay === required);
  }

  if (detail.trigger.name === "trade") {
    checks.push(ctx => ctx.isTrading);
  }

  if (detail.needs_overworld_rain) {
    checks.push(ctx => ctx.hasOverworldRain);
  }

  if (detail.turn_upside_down) {
    checks.push(ctx => ctx.isTurnedUpsideDown);
  }

  // If no checks were generated, always allow evolution
  if (checks.length === 0) {
    return () => true;
  }

  // AND all conditions together
  return ctx => checks.every(check => check(ctx));
}

// ---------------------------------------------------------------------------
// Multi-detail guard builder (public API)
// ---------------------------------------------------------------------------

/**
 * Builds a guard function from an array of EvolutionDetail objects.
 *
 * Multiple details are ORed: the guard passes if ANY single detail's
 * conditions are fully met. Within a single detail, all non-null
 * fields are ANDed together.
 */
function buildGuard(details: readonly EvolutionDetail[]): (ctx: EvolutionContext) => boolean {
  if (details.length === 0) {
    return () => true;
  }

  const singleGuards = details.map(buildSingleGuard);

  // OR across all details
  return ctx => singleGuards.some(guard => guard(ctx));
}

// ---------------------------------------------------------------------------
// Human-readable condition descriptions
// ---------------------------------------------------------------------------

interface ConditionDescription {
  readonly label: string;
  readonly requiredValue: string;
  readonly currentValueFn: (ctx: EvolutionContext) => string;
  readonly satisfiedFn: (ctx: EvolutionContext) => boolean;
}

/**
 * Extracts human-readable condition descriptions from a set of evolution details.
 * Returns a flat array of conditions -- if multiple details exist, the result
 * represents the union (any set can be satisfied).
 */
function describeConditions(details: readonly EvolutionDetail[]): readonly ConditionDescription[] {
  if (details.length === 0) {
    return [];
  }

  // For simplicity, describe conditions from the first detail.
  // For branching (multiple details), we describe each set.
  const conditions: ConditionDescription[] = [];

  for (const detail of details) {
    if (detail.min_level !== null) {
      const required = detail.min_level;
      conditions.push({
        label: `Level >= ${required}`,
        requiredValue: String(required),
        currentValueFn: ctx => String(ctx.level),
        satisfiedFn: ctx => ctx.level >= required,
      });
    }

    if (detail.min_happiness !== null) {
      const required = detail.min_happiness;
      conditions.push({
        label: `Friendship >= ${required}`,
        requiredValue: String(required),
        currentValueFn: ctx => String(ctx.friendship),
        satisfiedFn: ctx => ctx.friendship >= required,
      });
    }

    if (detail.min_affection !== null) {
      const required = detail.min_affection;
      conditions.push({
        label: `Affection >= ${required}`,
        requiredValue: String(required),
        currentValueFn: ctx => String(ctx.affection),
        satisfiedFn: ctx => ctx.affection >= required,
      });
    }

    if (detail.item !== null) {
      const required = detail.item.name;
      conditions.push({
        label: `Item: ${required}`,
        requiredValue: required,
        currentValueFn: ctx => ctx.heldItem ?? "none",
        satisfiedFn: ctx => ctx.heldItem === required,
      });
    }

    if (detail.held_item !== null) {
      const required = detail.held_item.name;
      conditions.push({
        label: `Held item: ${required}`,
        requiredValue: required,
        currentValueFn: ctx => ctx.heldItem ?? "none",
        satisfiedFn: ctx => ctx.heldItem === required,
      });
    }

    if (detail.known_move !== null) {
      const required = detail.known_move.name;
      conditions.push({
        label: `Knows move: ${required}`,
        requiredValue: required,
        currentValueFn: ctx => (ctx.knownMoves.length > 0 ? ctx.knownMoves.join(", ") : "none"),
        satisfiedFn: ctx => ctx.knownMoves.includes(required),
      });
    }

    if (detail.location !== null) {
      const required = detail.location.name;
      conditions.push({
        label: `Location: ${required}`,
        requiredValue: required,
        currentValueFn: ctx => ctx.location ?? "none",
        satisfiedFn: ctx => ctx.location === required,
      });
    }

    if (detail.time_of_day !== "") {
      const required = detail.time_of_day;
      conditions.push({
        label: `Time: ${required}`,
        requiredValue: required,
        currentValueFn: ctx => ctx.timeOfDay,
        satisfiedFn: ctx => ctx.timeOfDay === required,
      });
    }

    if (detail.trigger.name === "trade") {
      conditions.push({
        label: "Trade",
        requiredValue: "yes",
        currentValueFn: ctx => (ctx.isTrading ? "yes" : "no"),
        satisfiedFn: ctx => ctx.isTrading,
      });
    }

    if (detail.needs_overworld_rain) {
      conditions.push({
        label: "Overworld rain",
        requiredValue: "yes",
        currentValueFn: ctx => (ctx.hasOverworldRain ? "yes" : "no"),
        satisfiedFn: ctx => ctx.hasOverworldRain,
      });
    }

    if (detail.turn_upside_down) {
      conditions.push({
        label: "Turn upside down",
        requiredValue: "yes",
        currentValueFn: ctx => (ctx.isTurnedUpsideDown ? "yes" : "no"),
        satisfiedFn: ctx => ctx.isTurnedUpsideDown,
      });
    }
  }

  return conditions;
}

export { buildGuard, describeConditions };
export type { ConditionDescription };
