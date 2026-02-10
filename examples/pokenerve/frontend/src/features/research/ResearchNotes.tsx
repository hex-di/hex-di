/**
 * Pokemon research notes component.
 *
 * Allows adding custom text tags to any Pokemon, viewing notes by Pokemon,
 * and searching across all notes. Tags are stored as string arrays per
 * Pokemon ID in the shared research state.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useMemo, useCallback } from "react";
import { getPokemonById, getTypeColor } from "./PokemonPicker.js";
import { PokemonPicker } from "./PokemonPicker.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResearchNotesProps {
  readonly notes: ReadonlyMap<number, readonly string[]>;
  readonly onAddTag: (pokemonId: number, tag: string) => void;
  readonly onRemoveTag: (pokemonId: number, tag: string) => void;
}

// ---------------------------------------------------------------------------
// Suggested tags
// ---------------------------------------------------------------------------

const SUGGESTED_TAGS = [
  "powerful",
  "rare",
  "needs-evolution",
  "starter",
  "legendary",
  "trade-target",
  "competitive",
  "favorite-moveset",
] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TagBadge({
  tag,
  onRemove,
}: {
  readonly tag: string;
  readonly onRemove?: () => void;
}): ReactNode {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300">
      {tag}
      {onRemove !== undefined && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:text-blue-100"
          aria-label={`Remove tag ${tag}`}
        >
          x
        </button>
      )}
    </span>
  );
}

function NoteEntry({
  pokemonId,
  tags,
  onAddTag,
  onRemoveTag,
}: {
  readonly pokemonId: number;
  readonly tags: readonly string[];
  readonly onAddTag: (tag: string) => void;
  readonly onRemoveTag: (tag: string) => void;
}): ReactNode {
  const [newTag, setNewTag] = useState("");
  const pokemon = getPokemonById(pokemonId);

  if (pokemon === undefined) return null;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newTag.trim().toLowerCase();
      if (trimmed.length > 0 && !tags.includes(trimmed)) {
        onAddTag(trimmed);
        setNewTag("");
      }
    },
    [newTag, tags, onAddTag]
  );

  const tagsSet = useMemo(() => new Set(tags), [tags]);

  const availableSuggestions = SUGGESTED_TAGS.filter(s => !tagsSet.has(s));

  return (
    <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-3">
      {/* Pokemon header */}
      <div className="mb-2 flex items-center gap-2">
        <img src={pokemon.spriteUrl} alt={pokemon.name} className="h-8 w-8" loading="lazy" />
        <span className="text-sm font-medium capitalize text-gray-200">{pokemon.name}</span>
        <span className="text-xs text-gray-500">#{String(pokemon.id)}</span>
        <div className="ml-1 flex gap-1">
          {pokemon.types.map(t => (
            <span
              key={t}
              className="rounded-full px-1.5 py-0 text-[9px] font-medium text-white"
              style={{ backgroundColor: getTypeColor(t) }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {tags.map(tag => (
          <TagBadge key={tag} tag={tag} onRemove={() => onRemoveTag(tag)} />
        ))}
      </div>

      {/* Add tag input */}
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          type="text"
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          placeholder="Add tag..."
          className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-500"
        >
          Add
        </button>
      </form>

      {/* Quick suggestions */}
      {availableSuggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {availableSuggestions.slice(0, 4).map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onAddTag(suggestion)}
              className="rounded-full border border-gray-700 px-2 py-0.5 text-[9px] text-gray-500 transition-colors hover:border-blue-500 hover:text-blue-400"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ResearchNotes({ notes, onAddTag, onRemoveTag }: ResearchNotesProps): ReactNode {
  const [searchQuery, setSearchQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  // Entries sorted by Pokemon ID
  const noteEntries = useMemo(() => {
    const entries = [...notes.entries()].sort(([a], [b]) => a - b);

    if (searchQuery.length === 0) return entries;

    const lower = searchQuery.toLowerCase();
    return entries.filter(([pokemonId, tags]) => {
      const pokemon = getPokemonById(pokemonId);
      if (pokemon !== undefined && pokemon.name.includes(lower)) return true;
      return tags.some(tag => tag.includes(lower));
    });
  }, [notes, searchQuery]);

  const handlePickerSelect = useCallback(
    (id: number) => {
      // Add Pokemon to notes with empty tags (first tag can be added after)
      if (!notes.has(id)) {
        onAddTag(id, "new");
        // Immediately remove the auto-tag so the entry exists but is clean
        // Actually, better to just add a meaningful default
      }
      setShowPicker(false);
    },
    [notes, onAddTag]
  );

  const existingIds = useMemo(() => new Set(notes.keys()), [notes]);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold text-indigo-400">Notes</h3>
        <span className="text-xs text-gray-500">{String(notes.size)} Pokemon noted</span>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search notes by Pokemon or tag..."
        className="mb-3 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
      />

      {/* Notes list */}
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {noteEntries.map(([pokemonId, tags]) => (
          <NoteEntry
            key={pokemonId}
            pokemonId={pokemonId}
            tags={tags}
            onAddTag={tag => onAddTag(pokemonId, tag)}
            onRemoveTag={tag => onRemoveTag(pokemonId, tag)}
          />
        ))}
      </div>

      {/* Add new note */}
      <div className="mt-3">
        {showPicker ? (
          <div className="space-y-2">
            <PokemonPicker
              onSelect={handlePickerSelect}
              placeholder="Select Pokemon to add notes..."
              excludeIds={existingIds}
            />
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="w-full rounded-lg border border-dashed border-gray-700 py-2 text-sm text-gray-500 transition-colors hover:border-indigo-500 hover:text-indigo-400"
          >
            + Add Notes for Pokemon
          </button>
        )}
      </div>

      {/* Empty state */}
      {notes.size === 0 && !showPicker && (
        <p className="mt-2 text-center text-xs text-gray-600">
          Add research notes and tags to Pokemon
        </p>
      )}
    </div>
  );
}

export { ResearchNotes };
