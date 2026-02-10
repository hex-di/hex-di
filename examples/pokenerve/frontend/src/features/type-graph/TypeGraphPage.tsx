/**
 * Type Synergy Graph page.
 *
 * Main page for the Type Graph feature (TG7). Provides a two-panel layout:
 * - Left panel: interactive type synergy graph visualization with metrics
 * - Right panel: team builder with type coverage analysis and suggestions
 *
 * Uses static type-chart.json data for all effectiveness calculations.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useCallback } from "react";
import { TypeForceGraph } from "./TypeForceGraph.js";
import { TeamBuilder } from "./TeamBuilder.js";
import type { TeamMember } from "./TeamBuilder.js";
import { TypeSuggestions } from "./TypeSuggestions.js";
import { GraphMetrics } from "./GraphMetrics.js";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TypeGraphPage(): ReactNode {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [team, setTeam] = useState<readonly TeamMember[]>([]);

  const handleAddMember = useCallback((member: TeamMember) => {
    setTeam(prev => {
      if (prev.length >= 6) return prev;
      // Prevent duplicates
      if (prev.some(m => m.id === member.id)) return prev;
      return [...prev, member];
    });
  }, []);

  const handleRemoveMember = useCallback((index: number) => {
    setTeam(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-cyan-400">Type Synergy Graph</h1>
        <p className="mt-1 text-sm text-gray-500">
          Explore type matchups, build teams, and analyze coverage
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        {/* Left: Graph + Metrics */}
        <div className="space-y-6">
          <TypeForceGraph selectedType={selectedType} onSelectType={setSelectedType} />
          {selectedType !== null && <GraphMetrics selectedType={selectedType} />}
        </div>

        {/* Right: Team builder + Coverage */}
        <div className="space-y-6">
          <TeamBuilder
            team={team}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
          />
          <TypeSuggestions team={team} />
        </div>
      </div>
    </div>
  );
}

export { TypeGraphPage };
