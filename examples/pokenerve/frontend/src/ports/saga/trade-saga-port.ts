/**
 * Trade saga port.
 *
 * Typed saga port for executing Pokemon trades via the saga pattern.
 *
 * @packageDocumentation
 */

import { sagaPort } from "@hex-di/saga";
import type { TradingError } from "@pokenerve/shared/types/trading";
import type { TradeInput, TradeOutput } from "../../sagas/trade-saga.js";

const TradeSagaPort = sagaPort<TradeInput, TradeOutput, TradingError>()({
  name: "TradeSaga",
  description: "Executes a multi-step Pokemon trade with compensation",
});

export { TradeSagaPort };
