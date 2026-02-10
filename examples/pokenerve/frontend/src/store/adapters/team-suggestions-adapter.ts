/**
 * Team suggestions async derived adapter.
 *
 * Asynchronously computes Pokemon suggestions based on type coverage gaps.
 *
 * @packageDocumentation
 */

import { createAsyncDerivedAdapter } from "@hex-di/store";
import { ResultAsync } from "@hex-di/result";
import { TeamPort } from "../ports/team.js";
import { TypeCoveragePort } from "../ports/type-coverage.js";
import { TeamSuggestionsPort } from "../ports/team-suggestions.js";
import type { TeamSuggestion } from "../ports/team-suggestions.js";
import { findPokemonCoveringTypes } from "../utils/type-coverage-calc.js";

const teamSuggestionsAdapter = createAsyncDerivedAdapter({
  provides: TeamSuggestionsPort,
  requires: [TeamPort, TypeCoveragePort],
  select: deps => {
    const members = deps.Team.state.members;
    const coverage = deps.TypeCoverage.value;

    const excludeIds = new Set(members);
    const candidates = findPokemonCoveringTypes(coverage.uncoveredTypes, excludeIds, 5);

    const suggestions: readonly TeamSuggestion[] = candidates.map(c => ({
      pokemonId: c.pokemonId,
      pokemonName: c.pokemonName,
      reason: `Covers ${c.coversTypes.join(", ")}`,
      coversTypes: c.coversTypes,
    }));

    return ResultAsync.ok(suggestions);
  },
  staleTime: 5000,
});

export { teamSuggestionsAdapter };
