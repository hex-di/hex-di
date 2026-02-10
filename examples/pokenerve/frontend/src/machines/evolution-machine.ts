/**
 * Dynamic evolution machine builder.
 *
 * Walks a PokeAPI EvolutionChain recursively and produces a `defineMachine`
 * configuration where each species becomes a state and transitions are
 * guarded by the evolution detail conditions.
 *
 * @packageDocumentation
 */

import type { EvolutionChain, ChainLink, EvolutionDetail } from "@pokenerve/shared/types/pokemon";
import { defineMachine } from "@hex-di/flow";
import type { StateNodeAny } from "@hex-di/flow";
import type { EvolutionContext } from "./evolution-context.js";
import { createDefaultContext } from "./evolution-context.js";
import { buildGuard } from "./evolution-guards.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Metadata about a link in the chain, used for the tree visualization.
 */
interface ChainNodeMeta {
  readonly speciesName: string;
  readonly evolutionDetails: readonly EvolutionDetail[];
  readonly children: readonly ChainNodeMeta[];
}

// ---------------------------------------------------------------------------
// Shared update-context action
// ---------------------------------------------------------------------------

/**
 * Module-level ref for the pending context patch. The action function
 * (which only receives ctx) reads from this ref during synchronous send().
 */
let pendingPatch: Partial<EvolutionContext> = {};

function setPendingPatch(patch: Partial<EvolutionContext>): void {
  pendingPatch = patch;
}

function applyPendingPatch(ctx: EvolutionContext): EvolutionContext {
  const result = { ...ctx, ...pendingPatch };
  pendingPatch = {};
  return result;
}

// ---------------------------------------------------------------------------
// Internal transition config with literal true
// ---------------------------------------------------------------------------

/**
 * Creates the UPDATE_CONTEXT internal self-transition config.
 * Uses a function return type to produce the literal `true` for `internal`.
 */
function createUpdateContextTransition(speciesName: string): {
  readonly target: string;
  readonly internal: true;
  readonly actions: readonly [(ctx: EvolutionContext) => EvolutionContext];
} {
  return {
    target: speciesName,
    internal: true,
    actions: [applyPendingPatch],
  };
}

// ---------------------------------------------------------------------------
// Recursive chain walker
// ---------------------------------------------------------------------------

function collectStates(link: ChainLink, states: Record<string, StateNodeAny>): void {
  const speciesName = link.species.name;

  if (link.evolves_to.length === 0) {
    // Leaf node -> final state
    states[speciesName] = { type: "final" };
    return;
  }

  // Build EVOLVE transitions for each child
  const evolveTransitions: {
    readonly target: string;
    readonly guard: (ctx: EvolutionContext) => boolean;
  }[] = [];

  for (const child of link.evolves_to) {
    const guard = buildGuard(child.evolution_details);
    evolveTransitions.push({
      target: child.species.name,
      guard,
    });
  }

  const updateContextTransition = createUpdateContextTransition(speciesName);

  const evolveValue = evolveTransitions.length === 1 ? evolveTransitions[0] : evolveTransitions;

  states[speciesName] = {
    on: {
      EVOLVE: evolveValue,
      UPDATE_CONTEXT: updateContextTransition,
    },
  };

  // Recurse into children
  for (const child of link.evolves_to) {
    collectStates(child, states);
  }
}

/**
 * Collects the chain metadata tree for visualization purposes.
 */
function collectChainMeta(link: ChainLink): ChainNodeMeta {
  return {
    speciesName: link.species.name,
    evolutionDetails: link.evolution_details,
    children: link.evolves_to.map(collectChainMeta),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a state machine definition from a PokeAPI EvolutionChain.
 *
 * Each species becomes a state. Leaf nodes become final states.
 * Nodes with children get EVOLVE (guarded) and UPDATE_CONTEXT (internal)
 * transitions.
 */
function buildEvolutionMachine(chain: EvolutionChain) {
  const rootSpecies = chain.chain.species.name;
  const states: Record<string, StateNodeAny> = {};

  collectStates(chain.chain, states);

  return defineMachine({
    id: `evolution-${rootSpecies}`,
    initial: rootSpecies,
    context: createDefaultContext(rootSpecies),
    states,
  });
}

export { buildEvolutionMachine, collectChainMeta, setPendingPatch };
export type { ChainNodeMeta };
