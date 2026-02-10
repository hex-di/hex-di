/**
 * Trade saga adapter.
 *
 * Creates a SagaExecutor by wiring up a SagaRunner with the TradeSaga
 * definition and resolving step ports from the DI container.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { createSagaRunner, createSagaExecutor, SagaPersisterPort } from "@hex-di/saga";
import type { SagaExecutor, PortResolver } from "@hex-di/saga";
import type { TradingError } from "@pokenerve/shared/types/trading";
import { TradeSagaPort } from "../../ports/saga/trade-saga-port.js";
import { TradeSaga } from "../../sagas/trade-saga.js";
import type { TradeInput, TradeOutput } from "../../sagas/trade-saga.js";
import { ValidateTradePort } from "../../ports/trade-steps/validate-trade-port.js";
import { ReservePokemonPort } from "../../ports/trade-steps/reserve-pokemon-port.js";
import { ExecuteSwapPort } from "../../ports/trade-steps/execute-swap-port.js";
import { ConfirmTradePort } from "../../ports/trade-steps/confirm-trade-port.js";

const tradeSagaAdapter = createAdapter({
  provides: TradeSagaPort,
  requires: [
    ValidateTradePort,
    ReservePokemonPort,
    ExecuteSwapPort,
    ConfirmTradePort,
    SagaPersisterPort,
  ],
  lifetime: "scoped",
  factory: (deps): SagaExecutor<TradeInput, TradeOutput, TradingError> => {
    const depsRecord: Record<string, unknown> = deps;
    const resolver: PortResolver = {
      resolve(portName: string): unknown {
        return depsRecord[portName];
      },
    };

    const runner = createSagaRunner(resolver, { persister: deps.SagaPersister });
    return createSagaExecutor<TradeInput, TradeOutput, TradingError>(runner, TradeSaga);
  },
});

export { tradeSagaAdapter };
