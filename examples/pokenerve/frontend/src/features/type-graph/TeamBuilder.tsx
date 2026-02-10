/**
 * Team builder panel.
 *
 * Lets users build a team of up to 6 Pokemon from the Gen 1 dataset.
 * Each team member displays their sprite and type badges, with a
 * remove button. Includes a searchable dropdown for Pokemon selection.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useMemo, useCallback, useRef, useEffect } from "react";
import gen1Data from "../../data/gen1-pokemon.json";
import { getTypeColor } from "./type-data.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamMember {
  readonly id: number;
  readonly name: string;
  readonly types: readonly string[];
  readonly spriteUrl: string;
}

interface TeamBuilderProps {
  readonly team: readonly TeamMember[];
  readonly onAddMember: (member: TeamMember) => void;
  readonly onRemoveMember: (index: number) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TEAM_SIZE = 6;

// ---------------------------------------------------------------------------
// Gen1 lookup
// ---------------------------------------------------------------------------

interface Gen1Entry {
  readonly id: number;
  readonly name: string;
  readonly types: readonly string[];
  readonly spriteUrl: string;
}

const gen1List: readonly Gen1Entry[] = gen1Data.map(p => ({
  id: p.id,
  name: p.name,
  types: p.types.map(t => t.type.name),
  spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${String(p.id)}.png`,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatName(name: string): string {
  return name
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Search dropdown
// ---------------------------------------------------------------------------

function PokemonSearchDropdown({
  onSelect,
  disabledIds,
}: {
  readonly onSelect: (entry: Gen1Entry) => void;
  readonly disabledIds: ReadonlySet<number>;
}): ReactNode {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (query.length === 0) return gen1List.slice(0, 20);
    const lower = query.toLowerCase();
    return gen1List.filter(p => p.name.includes(lower)).slice(0, 20);
  }, [query]);

  const handleSelect = useCallback(
    (entry: Gen1Entry) => {
      onSelect(entry);
      setQuery("");
      setIsOpen(false);
    },
    [onSelect]
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target;
      if (
        containerRef.current !== null &&
        target instanceof Node &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search Pokemon to add..."
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
          {filtered.map(pokemon => {
            const isDisabled = disabledIds.has(pokemon.id);
            return (
              <button
                key={pokemon.id}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelect(pokemon)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                  isDisabled
                    ? "cursor-not-allowed text-gray-600"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                <img
                  src={pokemon.spriteUrl}
                  alt={pokemon.name}
                  className="h-7 w-7"
                  loading="lazy"
                />
                <span className="capitalize">{formatName(pokemon.name)}</span>
                <span className="ml-auto flex gap-1">
                  {pokemon.types.map(t => (
                    <span
                      key={t}
                      className="rounded-full px-1.5 py-0.5 text-[10px] text-white"
                      style={{ backgroundColor: getTypeColor(t) }}
                    >
                      {t}
                    </span>
                  ))}
                </span>
                {isDisabled && <span className="text-[10px] text-gray-600">in team</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team member card
// ---------------------------------------------------------------------------

function TeamMemberCard({
  member,
  onRemove,
}: {
  readonly member: TeamMember;
  readonly onRemove: () => void;
}): ReactNode {
  return (
    <div className="group relative flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 p-2">
      <img src={member.spriteUrl} alt={member.name} className="h-10 w-10" loading="lazy" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium capitalize text-white">
          {formatName(member.name)}
        </p>
        <div className="flex gap-1">
          {member.types.map(t => (
            <span
              key={t}
              className="rounded-full px-1.5 py-0.5 text-[10px] text-white"
              style={{ backgroundColor: getTypeColor(t) }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-1 text-gray-500 transition-colors hover:bg-red-900/30 hover:text-red-400"
        aria-label={`Remove ${member.name}`}
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty slot
// ---------------------------------------------------------------------------

function EmptySlot({ index }: { readonly index: number }): ReactNode {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-700 bg-gray-800/30 p-2">
      <span className="text-xs text-gray-600">Slot {index + 1}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function TeamBuilder({ team, onAddMember, onRemoveMember }: TeamBuilderProps): ReactNode {
  const isFull = team.length >= MAX_TEAM_SIZE;

  // Track IDs already in team to disable re-adding
  const disabledIds = useMemo(() => {
    const set = new Set<number>();
    for (const member of team) {
      set.add(member.id);
    }
    return set;
  }, [team]);

  const handleAdd = useCallback(
    (entry: Gen1Entry) => {
      if (isFull) return;
      onAddMember({
        id: entry.id,
        name: entry.name,
        types: entry.types,
        spriteUrl: entry.spriteUrl,
      });
    },
    [isFull, onAddMember]
  );

  // Build empty slots to fill up to MAX_TEAM_SIZE
  const emptySlotCount = MAX_TEAM_SIZE - team.length;
  const emptySlots = Array.from({ length: emptySlotCount }, (_, i) => i);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Team Builder</h3>
        <span className="text-xs text-gray-500">
          {team.length}/{MAX_TEAM_SIZE}
        </span>
      </div>

      {/* Search (hidden when full) */}
      {!isFull && (
        <div className="mb-3">
          <PokemonSearchDropdown onSelect={handleAdd} disabledIds={disabledIds} />
        </div>
      )}

      {/* Team grid */}
      <div className="space-y-2">
        {team.map((member, i) => (
          <TeamMemberCard key={member.id} member={member} onRemove={() => onRemoveMember(i)} />
        ))}
        {emptySlots.map((_, i) => (
          <EmptySlot key={`empty-${String(team.length + i)}`} index={team.length + i} />
        ))}
      </div>
    </div>
  );
}

export { TeamBuilder };
export type { TeamBuilderProps, TeamMember };
