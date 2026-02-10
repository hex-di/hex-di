/**
 * Store dependency graph for reactive state management.
 *
 * Composes all store adapters (state, atom, derived, async derived)
 * into a GraphBuilder. All store services are singletons shared
 * across the entire application.
 *
 * @packageDocumentation
 */

import { GraphBuilder } from "@hex-di/graph";
import { trainerProfileAdapter } from "../store/adapters/trainer-profile-adapter.js";
import { teamAdapter } from "../store/adapters/team-adapter.js";
import { favoritesAdapter } from "../store/adapters/favorites-adapter.js";
import { appSettingsAdapter } from "../store/adapters/app-settings-adapter.js";
import { teamPowerAdapter } from "../store/adapters/team-power-adapter.js";
import { typeCoverageAdapter } from "../store/adapters/type-coverage-adapter.js";
import { teamSuggestionsAdapter } from "../store/adapters/team-suggestions-adapter.js";
import { persistenceEffectAdapter } from "../store/adapters/persistence-effect-adapter.js";

const storeGraphBuilder = GraphBuilder.create()
  .provide(trainerProfileAdapter)
  .provide(teamAdapter)
  .provide(favoritesAdapter)
  .provide(appSettingsAdapter)
  .provide(teamPowerAdapter)
  .provide(typeCoverageAdapter)
  .provide(teamSuggestionsAdapter)
  .provide(persistenceEffectAdapter);

export { storeGraphBuilder };
