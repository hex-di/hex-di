/**
 * Visual evolution tree component.
 *
 * Renders the evolution chain as a horizontal tree using HTML/CSS.
 * Each species node shows a sprite image, species name, and active
 * state indicator. Arrows between nodes display guard condition labels.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import type { ChainNodeMeta } from "../../machines/evolution-machine.js";
import type { EvolutionDetail } from "@pokenerve/shared/types/pokemon";
import gen1Data from "../../data/gen1-pokemon.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EvolutionTreeProps {
  readonly chain: ChainNodeMeta;
  readonly currentState: string;
}

// ---------------------------------------------------------------------------
// Pokemon ID lookup
// ---------------------------------------------------------------------------

const gen1Map = new Map<string, number>();
for (const entry of gen1Data) {
  gen1Map.set(entry.name, entry.id);
}

function getSpriteUrl(speciesName: string): string {
  const id = gen1Map.get(speciesName);
  if (id !== undefined) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }
  // Fallback for non-Gen1 Pokemon
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png`;
}

// ---------------------------------------------------------------------------
// Condition Label
// ---------------------------------------------------------------------------

function getConditionLabel(details: readonly EvolutionDetail[]): string {
  if (details.length === 0) return "";

  const detail = details[0];
  if (detail === undefined) return "";

  const parts: string[] = [];

  if (detail.min_level !== null) {
    parts.push(`Lv.${detail.min_level}`);
  }
  if (detail.min_happiness !== null) {
    parts.push(`Friendship ${detail.min_happiness}+`);
  }
  if (detail.min_affection !== null) {
    parts.push(`Affection ${detail.min_affection}+`);
  }
  if (detail.item !== null) {
    parts.push(formatItemName(detail.item.name));
  }
  if (detail.held_item !== null) {
    parts.push(`Hold: ${formatItemName(detail.held_item.name)}`);
  }
  if (detail.time_of_day !== "") {
    parts.push(detail.time_of_day === "day" ? "Day" : "Night");
  }
  if (detail.trigger.name === "trade") {
    parts.push("Trade");
  }
  if (detail.location !== null) {
    parts.push(formatItemName(detail.location.name));
  }
  if (detail.known_move !== null) {
    parts.push(`Move: ${formatItemName(detail.known_move.name)}`);
  }

  return parts.join(", ");
}

function formatItemName(name: string): string {
  return name
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Species Node
// ---------------------------------------------------------------------------

function SpeciesNode({
  speciesName,
  isActive,
}: {
  readonly speciesName: string;
  readonly isActive: boolean;
}): ReactNode {
  const spriteUrl = getSpriteUrl(speciesName);

  return (
    <div
      className={`flex flex-col items-center rounded-xl border-2 p-3 transition-all ${
        isActive
          ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20"
          : "border-gray-700 bg-gray-800/50"
      }`}
      style={{ minWidth: "100px" }}
    >
      <div className={`relative mb-1 h-16 w-16 ${isActive ? "animate-pulse" : ""}`}>
        <img
          src={spriteUrl}
          alt={speciesName}
          className="h-full w-full object-contain"
          loading="lazy"
        />
        {isActive && (
          <div className="absolute -inset-1 -z-10 rounded-full bg-purple-500/20 blur-md" />
        )}
      </div>
      <span
        className={`text-xs font-semibold capitalize ${
          isActive ? "text-purple-300" : "text-gray-400"
        }`}
      >
        {speciesName}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arrow with Label
// ---------------------------------------------------------------------------

function Arrow({ label }: { readonly label: string }): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center px-2">
      {label !== "" && (
        <span className="mb-1 max-w-24 text-center text-[10px] leading-tight text-gray-500">
          {label}
        </span>
      )}
      <div className="flex items-center">
        <div className="h-px w-8 bg-gray-600" />
        <div className="h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-gray-600" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chain Branch (recursive)
// ---------------------------------------------------------------------------

function ChainBranch({
  node,
  currentState,
}: {
  readonly node: ChainNodeMeta;
  readonly currentState: string;
}): ReactNode {
  const isActive = node.speciesName === currentState;

  if (node.children.length === 0) {
    return <SpeciesNode speciesName={node.speciesName} isActive={isActive} />;
  }

  if (node.children.length === 1) {
    const child = node.children[0];
    if (child === undefined) {
      return <SpeciesNode speciesName={node.speciesName} isActive={isActive} />;
    }
    return (
      <div className="flex items-center">
        <SpeciesNode speciesName={node.speciesName} isActive={isActive} />
        <Arrow label={getConditionLabel(child.evolutionDetails)} />
        <ChainBranch node={child} currentState={currentState} />
      </div>
    );
  }

  // Branching (fan out vertically)
  return (
    <div className="flex items-center">
      <SpeciesNode speciesName={node.speciesName} isActive={isActive} />
      <div className="flex flex-col gap-2 pl-2">
        {node.children.map(child => (
          <div key={child.speciesName} className="flex items-center">
            <Arrow label={getConditionLabel(child.evolutionDetails)} />
            <ChainBranch node={child} currentState={currentState} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EvolutionTree
// ---------------------------------------------------------------------------

function EvolutionTree({ chain, currentState }: EvolutionTreeProps): ReactNode {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <ChainBranch node={chain} currentState={currentState} />
    </div>
  );
}

export { EvolutionTree };
export type { EvolutionTreeProps };
