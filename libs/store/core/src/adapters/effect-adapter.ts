/**
 * Effect Adapter Factory
 *
 * Creates adapters for effect ports (Effect-as-Port pattern).
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Port, AdapterConstraint } from "@hex-di/core";
import type { ActionEffect } from "../types/effects.js";
import type { PortDeps } from "@hex-di/core";
import { __effectBrand } from "./brands.js";
import type { StoreAdapterResult } from "./brands.js";

// =============================================================================
// createEffectAdapter
// =============================================================================

export interface CreateEffectAdapterConfig<
  TName extends string = string,
  TRequires extends readonly Port<string, unknown>[] = readonly Port<string, unknown>[],
> {
  readonly provides: Port<TName, ActionEffect>;
  readonly requires?: TRequires;
  readonly factory: (deps: PortDeps<TRequires>) => ActionEffect;
  readonly inspection?: boolean;
}

/**
 * Creates an effect adapter for cross-cutting concerns.
 *
 * Effect adapters receive ActionEvents from all state ports and can
 * perform side effects (logging, analytics, persistence, etc.).
 */
export function createEffectAdapter<
  TName extends string,
  const TRequires extends readonly Port<string, unknown>[] = readonly [],
>(config: CreateEffectAdapterConfig<TName, TRequires>): StoreAdapterResult<TName>;
export function createEffectAdapter(config: {
  readonly provides: Port<string, ActionEffect>;
  readonly requires?: readonly Port<string, unknown>[];
  readonly factory: (deps: Record<string, unknown>) => ActionEffect;
  readonly inspection?: boolean;
}): AdapterConstraint {
  const adp = createAdapter({
    provides: config.provides,
    requires: config.requires ?? [],
    lifetime: "singleton",
    factory: (deps: Record<string, unknown>) => config.factory(deps),
  });

  const branded = { ...adp, [__effectBrand]: true };
  return branded;
}
