/**
 * Battle dependency graph for scoped battle services.
 *
 * Battle services are scoped -- one instance per battle. The DamageCalcPort,
 * AiStrategyPort, and BattleEnginePort get fresh instances within each
 * battle scope, maintaining isolated battle state.
 *
 * @packageDocumentation
 */

import { GraphBuilder } from "@hex-di/graph";
import { damageCalcAdapter } from "../adapters/battle/damage-calc.js";
import { randomAiAdapter } from "../adapters/battle/random-ai.js";
import { battleEngineAdapter } from "../adapters/battle/battle-engine.js";

const battleGraphBuilder = GraphBuilder.create()
  .provide(damageCalcAdapter)
  .provide(randomAiAdapter)
  .provide(battleEngineAdapter);

export { battleGraphBuilder };
