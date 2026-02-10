/**
 * Hydration Adapter Factory
 *
 * Creates adapters that implement the StateHydrator interface
 * using a configurable storage backend.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Port, AdapterConstraint } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import type { StateHydrator, HydrationStorage } from "../types/hydration.js";
import { HydrationError } from "../errors/tagged-errors.js";
import type { StoreAdapterResult } from "./brands.js";

export interface CreateHydrationAdapterConfig<TName extends string = string> {
  readonly provides: Port<StateHydrator, TName>;
  readonly storage: HydrationStorage;
}

/**
 * Creates a hydration adapter for persisting and restoring state.
 *
 * The adapter wraps a synchronous HydrationStorage backend and exposes
 * async ResultAsync-based hydrate/dehydrate operations.
 */
export function createHydrationAdapter<TName extends string>(
  config: CreateHydrationAdapterConfig<TName>
): StoreAdapterResult<TName>;
export function createHydrationAdapter(config: CreateHydrationAdapterConfig): AdapterConstraint {
  return createAdapter({
    provides: config.provides,
    requires: [],
    lifetime: "singleton",
    factory: (): StateHydrator => ({
      hydrate(portName: string): ResultAsync<unknown, HydrationError> {
        return ResultAsync.fromPromise(
          Promise.resolve().then(() => config.storage.get(portName)),
          cause => HydrationError({ portName, cause })
        );
      },
      dehydrate(portName: string, state: unknown): ResultAsync<void, HydrationError> {
        return ResultAsync.fromPromise(
          Promise.resolve().then(() => {
            config.storage.set(portName, state);
          }),
          cause => HydrationError({ portName, cause })
        );
      },
    }),
  });
}
