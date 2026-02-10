/**
 * Effect Adapter Discovery Utilities
 *
 * Runtime checks for identifying effect adapters in a list of adapters.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint } from "@hex-di/core";
import { __effectBrand } from "./brands.js";
import type { EffectAdapterBrand } from "./brands.js";

/**
 * Type guard: checks if an adapter is an effect adapter.
 */
export function isEffectAdapter(
  adapter: AdapterConstraint
): adapter is AdapterConstraint & EffectAdapterBrand {
  return Object.getOwnPropertySymbols(adapter).includes(__effectBrand);
}

/**
 * Filters a list of adapters, returning only effect adapters.
 */
export function withEffectAdapters(
  adapters: readonly AdapterConstraint[]
): readonly (AdapterConstraint & EffectAdapterBrand)[] {
  return adapters.filter(isEffectAdapter);
}
