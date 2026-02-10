/**
 * State Hydration Types
 *
 * Defines the StateHydrator interface for persisting and restoring state.
 *
 * @packageDocumentation
 */

import type { ResultAsync } from "@hex-di/result";
import type { HydrationError } from "../errors/tagged-errors.js";

/**
 * Interface for hydrating (restoring) and dehydrating (persisting) state.
 */
export interface StateHydrator {
  hydrate(portName: string): ResultAsync<unknown, HydrationError>;
  dehydrate(portName: string, state: unknown): ResultAsync<void, HydrationError>;
}

/**
 * Backend storage interface for hydration adapters.
 */
export interface HydrationStorage {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown): void;
  remove(key: string): void;
}
