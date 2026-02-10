/**
 * Evolution Lab page.
 *
 * Main feature page for the Evolution Lab. Allows users to select a Pokemon,
 * view its evolution chain as a visual tree, and manipulate environmental
 * conditions to trigger evolution transitions via a state machine.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createMachineRunner, createBasicExecutor, createActivityManager } from "@hex-di/flow";
import type { MachineRunnerAny } from "@hex-di/flow";
import { TracerLikePort } from "@hex-di/tracing";
import { usePort } from "../../di/hooks.js";
import type { EvolutionChain, ChainLink, EvolutionDetail } from "@pokenerve/shared/types/pokemon";
import type { EvolutionContext } from "../../machines/evolution-context.js";
import { createDefaultContext } from "../../machines/evolution-context.js";
import {
  buildEvolutionMachine,
  collectChainMeta,
  setPendingPatch,
} from "../../machines/evolution-machine.js";
import type { ChainNodeMeta } from "../../machines/evolution-machine.js";
import { getHardcodedChain } from "../../machines/evolution-hardcoded.js";
import { describeConditions } from "../../machines/evolution-guards.js";
import { EvolutionTree } from "./EvolutionTree.js";
import { EvolutionControls, computeVisibleControls } from "./EvolutionControls.js";
import type { VisibleControls } from "./EvolutionControls.js";
import { GuardConditions } from "./GuardConditions.js";
import type { EvolutionTarget } from "./GuardConditions.js";
import gen1Data from "../../data/gen1-pokemon.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RunnerState {
  readonly state: string;
  readonly context: EvolutionContext;
}

// ---------------------------------------------------------------------------
// Build gen1 list for search
// ---------------------------------------------------------------------------

const gen1List = gen1Data.map(entry => ({
  id: entry.id,
  name: entry.name,
}));

// ---------------------------------------------------------------------------
// Type guard for EvolutionContext
// ---------------------------------------------------------------------------

function isEvolutionContext(value: unknown): value is EvolutionContext {
  if (typeof value !== "object" || value === null) return false;
  return (
    "speciesName" in value && "level" in value && "friendship" in value && "timeOfDay" in value
  );
}

// ---------------------------------------------------------------------------
// Helpers to read snapshot without type casts
// ---------------------------------------------------------------------------

function readSnapshotState(runner: MachineRunnerAny): RunnerState {
  const snapshot = runner.snapshot();
  const ctx = snapshot.context;

  if (isEvolutionContext(ctx)) {
    return { state: snapshot.state, context: ctx };
  }

  // Fallback: construct default from snapshot state
  return {
    state: snapshot.state,
    context: createDefaultContext(snapshot.state),
  };
}

// ---------------------------------------------------------------------------
// Collect all chain links (for visible controls computation)
// ---------------------------------------------------------------------------

function collectAllLinks(
  link: ChainLink
): readonly { readonly evolution_details: readonly EvolutionDetail[] }[] {
  const result: { readonly evolution_details: readonly EvolutionDetail[] }[] = [
    { evolution_details: link.evolution_details },
  ];
  for (const child of link.evolves_to) {
    result.push(...collectAllLinks(child));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Build targets for guard conditions display
// ---------------------------------------------------------------------------

function buildTargetsForState(
  chain: EvolutionChain,
  currentState: string
): readonly EvolutionTarget[] {
  const link = findLink(chain.chain, currentState);
  if (link === undefined) return [];

  return link.evolves_to.map(child => ({
    targetName: child.species.name,
    conditions: describeConditions(child.evolution_details),
  }));
}

function findLink(link: ChainLink, speciesName: string): ChainLink | undefined {
  if (link.species.name === speciesName) return link;
  for (const child of link.evolves_to) {
    const found = findLink(child, speciesName);
    if (found !== undefined) return found;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Search Component
// ---------------------------------------------------------------------------

function PokemonSearch({ onSelect }: { readonly onSelect: (name: string) => void }): ReactNode {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(() => {
    if (query.length === 0) return [];
    const lower = query.toLowerCase();
    return gen1List.filter(p => p.name.includes(lower)).slice(0, 10);
  }, [query]);

  const handleSelect = useCallback(
    (name: string) => {
      setQuery(name);
      setShowDropdown(false);
      onSelect(name);
    },
    [onSelect]
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder="Search Pokemon (e.g., charmander, eevee, bulbasaur)..."
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none"
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
          {filtered.map(pokemon => (
            <button
              key={pokemon.id}
              type="button"
              onClick={() => handleSelect(pokemon.name)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
            >
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
                alt={pokemon.name}
                className="h-8 w-8"
                loading="lazy"
              />
              <span className="capitalize">{pokemon.name}</span>
              <span className="ml-auto text-xs text-gray-600">#{pokemon.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Picks
// ---------------------------------------------------------------------------

function QuickPicks({ onSelect }: { readonly onSelect: (name: string) => void }): ReactNode {
  const picks = [
    { name: "bulbasaur", id: 1 },
    { name: "charmander", id: 4 },
    { name: "eevee", id: 133 },
    { name: "pikachu", id: 25 },
    { name: "machop", id: 66 },
    { name: "abra", id: 63 },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      <span className="self-center text-xs text-gray-500">Quick picks:</span>
      {picks.map(p => (
        <button
          key={p.name}
          type="button"
          onClick={() => onSelect(p.name)}
          className="flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-400 transition-colors hover:border-purple-500 hover:text-purple-300"
        >
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
            alt={p.name}
            className="h-5 w-5"
            loading="lazy"
          />
          <span className="capitalize">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EvolutionLabPage
// ---------------------------------------------------------------------------

function EvolutionLabPage(): ReactNode {
  const [chain, setChain] = useState<EvolutionChain | null>(null);
  const [chainMeta, setChainMeta] = useState<ChainNodeMeta | null>(null);
  const [runnerState, setRunnerState] = useState<RunnerState | null>(null);
  const [visibleControls, setVisibleControls] = useState<VisibleControls | null>(null);
  const [loadingChain, setLoadingChain] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const runnerRef = useRef<MachineRunnerAny | null>(null);
  const tracerLike = usePort(TracerLikePort);

  // Build machine and create runner when chain changes
  useEffect(() => {
    if (chain === null) return;

    // Dispose previous runner
    const previousRunner = runnerRef.current;
    if (previousRunner !== null) {
      previousRunner.dispose();
    }

    const machine = buildEvolutionMachine(chain);
    const executor = createBasicExecutor();
    const activityManager = createActivityManager();
    const runner = createMachineRunner(machine, { executor, activityManager, tracer: tracerLike });
    runnerRef.current = runner;

    // Read initial snapshot
    setRunnerState(readSnapshotState(runner));

    // Compute chain metadata and visible controls
    setChainMeta(collectChainMeta(chain.chain));
    const allLinks = collectAllLinks(chain.chain);
    setVisibleControls(computeVisibleControls(allLinks));

    // Subscribe to state changes
    const unsubscribe = runner.subscribe(() => {
      setRunnerState(readSnapshotState(runner));
    });

    return () => {
      unsubscribe();
      runner.dispose();
      runnerRef.current = null;
    };
  }, [chain, tracerLike]);

  // Handle Pokemon selection
  const handlePokemonSelect = useCallback((pokemonName: string) => {
    setLoadingChain(true);
    setErrorMessage(null);

    // Try hardcoded chain first (for immediate UX and when API is unavailable)
    const hardcoded = getHardcodedChain(pokemonName);
    if (hardcoded !== undefined) {
      setChain(hardcoded);
      setLoadingChain(false);
      return;
    }

    // For Pokemon without hardcoded chains, show a message
    setErrorMessage(
      `No evolution chain data available for "${pokemonName}". ` +
        `Try one of the quick picks: Bulbasaur, Charmander, or Eevee.`
    );
    setLoadingChain(false);
  }, []);

  // Handle context updates via setPendingPatch + UPDATE_CONTEXT event
  const handleContextChange = useCallback((patch: Partial<EvolutionContext>) => {
    const runner = runnerRef.current;
    if (runner === null) return;

    // Set the pending patch, then send the UPDATE_CONTEXT event.
    // The action reads from the module-level ref synchronously.
    setPendingPatch(patch);
    runner.send({ type: "UPDATE_CONTEXT" });
    setRunnerState(readSnapshotState(runner));
  }, []);

  // Handle evolve
  const handleEvolve = useCallback(() => {
    const runner = runnerRef.current;
    if (runner === null) return;

    runner.send({ type: "EVOLVE" });
    setRunnerState(readSnapshotState(runner));
  }, []);

  // Compute guard condition targets for current state
  const guardTargets: readonly EvolutionTarget[] = useMemo(() => {
    if (chain === null || runnerState === null) return [];
    return buildTargetsForState(chain, runnerState.state);
  }, [chain, runnerState]);

  // Check if current state is a final state
  const isFinalState = guardTargets.length === 0 && runnerState !== null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="mb-1 text-2xl font-bold text-purple-400">Evolution Lab</h2>
        <p className="text-sm text-gray-500">
          Simulate Pokemon evolution chains. Adjust conditions and trigger evolutions.
        </p>
      </div>

      {/* Search */}
      <div className="mb-4 space-y-3">
        <PokemonSearch onSelect={handlePokemonSelect} />
        <QuickPicks onSelect={handlePokemonSelect} />
      </div>

      {/* Loading */}
      {loadingChain && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-400">Loading evolution chain...</p>
        </div>
      )}

      {/* Error */}
      {errorMessage !== null && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-900/20 p-4">
          <p className="text-sm text-amber-400">{errorMessage}</p>
        </div>
      )}

      {/* Main content */}
      {chain !== null && chainMeta !== null && runnerState !== null && visibleControls !== null && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          {/* Left: Tree + Guard Conditions */}
          <div className="space-y-6">
            <EvolutionTree chain={chainMeta} currentState={runnerState.state} />
            <GuardConditions targets={guardTargets} context={runnerState.context} />
          </div>

          {/* Right: Controls */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="mb-4 rounded-lg bg-gray-800/50 p-3 text-center">
              <p className="text-xs text-gray-500">Current Species</p>
              <p className="text-lg font-bold capitalize text-purple-300">{runnerState.state}</p>
            </div>
            <EvolutionControls
              context={runnerState.context}
              visibleControls={visibleControls}
              isFinalState={isFinalState}
              onContextChange={handleContextChange}
              onEvolve={handleEvolve}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {chain === null && errorMessage === null && !loadingChain && (
        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          <p className="text-gray-500">Select a Pokemon above to explore its evolution chain.</p>
        </div>
      )}
    </div>
  );
}

export { EvolutionLabPage };
