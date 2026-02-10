/**
 * Barrel export for all PokéNerve port definitions.
 *
 * @packageDocumentation
 */

export { PokemonListPort, PokemonDetailPort } from "./pokemon-api.js";
export type { PokemonListService, PokemonDetailService } from "./pokemon-api.js";

export { EvolutionChainPort } from "./evolution.js";
export type { EvolutionChainService } from "./evolution.js";

export { TypeEffectivenessPort } from "./type-chart.js";
export type { TypeEffectivenessService } from "./type-chart.js";

export { BattleEnginePort, DamageCalcPort, AiStrategyPort } from "./battle.js";
export type { BattleEngineService, DamageCalcService, AiStrategyService } from "./battle.js";

export { TradingPort } from "./trading.js";
export type { TradingService } from "./trading.js";

export { PersistencePort } from "./storage.js";
export type { PersistenceService, PersistenceError } from "./storage.js";

export { AnalyticsPort } from "./analytics.js";
export type { AnalyticsService } from "./analytics.js";

// Store ports
export {
  TrainerProfilePort,
  TeamPort,
  FavoritesPort,
  AppSettingsPort,
  TeamPowerPort,
  TypeCoveragePort,
  TeamSuggestionsPort,
} from "../store/ports/index.js";
export type {
  TrainerProfileState,
  TrainerProfileActions,
  TeamState,
  TeamActions,
  AppSettings,
  TeamPowerValue,
  TypeCoverageValue,
  TeamSuggestion,
} from "../store/ports/index.js";

// Trade step ports
export {
  ValidateTradePort,
  ReservePokemonPort,
  ExecuteSwapPort,
  ConfirmTradePort,
} from "./trade-steps/index.js";

// Saga ports
export { TradeSagaPort } from "./saga/index.js";
