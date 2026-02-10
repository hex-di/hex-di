/**
 * Team suggestions async derived port.
 *
 * Computes Pokemon suggestions based on type coverage gaps.
 * Uses async derived to simulate suggestion computation.
 *
 * @packageDocumentation
 */

import { createAsyncDerivedPort } from "@hex-di/store";

interface TeamSuggestion {
  readonly pokemonId: number;
  readonly pokemonName: string;
  readonly reason: string;
  readonly coversTypes: readonly string[];
}

const TeamSuggestionsPort = createAsyncDerivedPort<readonly TeamSuggestion[]>()({
  name: "TeamSuggestions",
  description: "Async team composition suggestions",
  category: "store",
});

export { TeamSuggestionsPort };
export type { TeamSuggestion };
