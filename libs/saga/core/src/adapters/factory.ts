/**
 * Saga Adapter Factory
 *
 * Creates adapter objects that wire a saga definition to a SagaPort.
 *
 * @packageDocumentation
 */

import type { SagaPort } from "../ports/types.js";
import type { SagaAdapter, SagaAdapterConfig } from "./types.js";

/**
 * Creates a saga adapter that binds a saga definition to a SagaPort.
 *
 * @param port - The SagaPort this adapter satisfies
 * @param config - Configuration with the saga definition and dependencies
 * @returns A frozen SagaAdapter object
 *
 * @example
 * ```typescript
 * const OrderSagaAdapter = createSagaAdapter(OrderSagaPort, {
 *   saga: OrderSaga,
 *   requires: [InventoryPort, PaymentPort, ShippingPort],
 *   lifetime: "scoped",
 * });
 * ```
 */
export function createSagaAdapter<
  TPort extends SagaPort<string, unknown, unknown, unknown>,
  TRequires extends readonly unknown[] = readonly [],
>(port: TPort, config: SagaAdapterConfig<TRequires>): SagaAdapter<TPort> {
  return Object.freeze({
    port,
    saga: config.saga,
    requires: config.requires ?? [],
    lifetime: config.lifetime ?? "scoped",
  });
}
