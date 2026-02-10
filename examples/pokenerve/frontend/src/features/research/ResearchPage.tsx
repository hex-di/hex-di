/**
 * Research dashboard page.
 *
 * Main layout for the Research feature. Uses @hex-di/store for team,
 * favorites, and trainer profile state management with reactive updates.
 * Derived ports provide team power and type coverage analysis.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useCallback } from "react";
import { useStatePort, useAtom, useDerived } from "@hex-di/store-react";
import { TrainerProfilePort } from "../../store/ports/trainer-profile.js";
import { TeamPort } from "../../store/ports/team.js";
import { FavoritesPort } from "../../store/ports/favorites.js";
import { TeamPowerPort } from "../../store/ports/team-power.js";
import { TypeCoveragePort } from "../../store/ports/type-coverage.js";
import { TeamStats } from "./TeamStats.js";
import { FavoritesList } from "./FavoritesList.js";
import { ResearchNotes } from "./ResearchNotes.js";
import { TeamSuggestions } from "./TeamSuggestions.js";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ResearchPage(): ReactNode {
  // Store hooks
  const { state: profile, actions: profileActions } = useStatePort(TrainerProfilePort);
  const { state: teamState, actions: teamActions } = useStatePort(TeamPort);
  const [favorites, setFavorites] = useAtom(FavoritesPort);
  const teamPower = useDerived(TeamPowerPort);
  const typeCoverage = useDerived(TypeCoveragePort);

  // Local UI state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  // Notes state (kept local - not promoted to store since it's complex map data)
  const [notes, setNotes] = useState<ReadonlyMap<number, readonly string[]>>(new Map());

  // -------------------------------------------------------------------------
  // Trainer name handlers
  // -------------------------------------------------------------------------
  const handleStartEdit = useCallback(() => {
    setEditName(profile.name);
    setIsEditing(true);
  }, [profile.name]);

  const handleNameSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      profileActions.setName(editName);
      setIsEditing(false);
    },
    [editName, profileActions]
  );

  // -------------------------------------------------------------------------
  // Favorites handlers
  // -------------------------------------------------------------------------
  const handleToggleFavorite = useCallback(
    (id: number) => {
      setFavorites(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [setFavorites]
  );

  // -------------------------------------------------------------------------
  // Notes handlers
  // -------------------------------------------------------------------------
  const handleAddTag = useCallback((pokemonId: number, tag: string) => {
    setNotes(prev => {
      const next = new Map(prev);
      const existing = next.get(pokemonId) ?? [];
      if (existing.includes(tag)) return prev;
      next.set(pokemonId, [...existing, tag]);
      return next;
    });
  }, []);

  const handleRemoveTag = useCallback((pokemonId: number, tag: string) => {
    setNotes(prev => {
      const next = new Map(prev);
      const existing = next.get(pokemonId);
      if (existing === undefined) return prev;
      const filtered = existing.filter(t => t !== tag);
      if (filtered.length === 0) {
        next.delete(pokemonId);
      } else {
        next.set(pokemonId, filtered);
      }
      return next;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Team add handler (for suggestions)
  // -------------------------------------------------------------------------
  const handleAddToTeam = useCallback(
    (id: number) => {
      teamActions.add(id);
    },
    [teamActions]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-6">
      {/* Header with trainer profile */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-blue-400">Research Lab</h2>
            <div className="mt-1 flex items-center gap-2">
              {isEditing ? (
                <form onSubmit={handleNameSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="rounded border border-gray-700 bg-gray-800 px-2 py-0.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <button type="submit" className="text-xs text-blue-400 hover:text-blue-300">
                    Save
                  </button>
                </form>
              ) : (
                <>
                  <span className="text-sm text-gray-400">
                    Trainer: <span className="font-medium text-gray-200">{profile.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="text-xs text-gray-600 hover:text-gray-400"
                  >
                    edit
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="ml-auto flex gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-300">{String(teamPower.memberCount)}</p>
              <p className="text-[10px] text-gray-500">Team</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-pink-300">{String(favorites.size)}</p>
              <p className="text-[10px] text-gray-500">Favorites</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-300">
                {String(typeCoverage.coveragePercentage)}%
              </p>
              <p className="text-[10px] text-gray-500">Coverage</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-indigo-300">{String(notes.size)}</p>
              <p className="text-[10px] text-gray-500">Notes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Four-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Column 1: Team */}
        <TeamStats
          team={teamState.members}
          onAddPokemon={handleAddToTeam}
          onRemovePokemon={id => teamActions.remove(id)}
        />

        {/* Column 2: Favorites */}
        <FavoritesList favorites={favorites} onToggleFavorite={handleToggleFavorite} />

        {/* Column 3: Research Notes */}
        <ResearchNotes notes={notes} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} />

        {/* Column 4: Suggestions */}
        <TeamSuggestions onAddToTeam={handleAddToTeam} />
      </div>
    </div>
  );
}

export { ResearchPage };
