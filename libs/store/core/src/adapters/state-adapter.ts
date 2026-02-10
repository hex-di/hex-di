/**
 * State Adapter Factory
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Port, AdapterConstraint } from "@hex-di/core";
import type { PortDeps } from "@hex-di/core";
import type { StatePortDef } from "../ports/port-types.js";
import type { ActionMap, EffectMap } from "../types/index.js";
import type { StoreTracingHook } from "../integration/tracing-bridge.js";
import { StoreRegistryPort, StoreInspectorInternalPort } from "../types/inspection.js";
import {
  extractStoreRegistry,
  extractStoreInspectorInternal,
  extractStoreTracingHook,
} from "../inspection/type-guards.js";
import { createStateServiceImpl } from "../services/state-service-impl.js";
import type { ReactiveSystemInstance } from "../reactivity/system-factory.js";
import { buildStateRegistryEntry } from "../inspection/registry-entry-builder.js";
import { __stateAdapterBrand } from "./brands.js";
import type { StoreAdapterResult } from "./brands.js";

/**
 * Creates a state adapter providing StateService implementation.
 *
 * Generic over TState and TActions to preserve concrete types from the port definition.
 * Uses function overload to bridge between the generic public API and internal
 * createAdapter (which works with unknown).
 *
 * Effects can be provided as either:
 * - A static object (Partial<EffectMap<TState, TActions>>)
 * - A DI function (deps: Record<string, unknown>) => Partial<EffectMap<TState, TActions>>
 *
 * When `inspection: true`, the adapter auto-registers with StoreRegistry and auto-records
 * actions via StoreInspectorInternal.
 */
export function createStateAdapter<
  TName extends string,
  TState,
  TActions extends ActionMap<TState>,
  const TRequires extends readonly Port<unknown, string>[] = readonly [],
>(config: {
  readonly provides: StatePortDef<TName, TState, TActions>;
  readonly requires?: TRequires;
  readonly lifetime?: "singleton" | "scoped";
  readonly initial: TState;
  readonly actions: TActions;
  readonly effects?:
    | Partial<EffectMap<TState, TActions>>
    | ((deps: PortDeps<TRequires>) => Partial<EffectMap<TState, TActions>>);
  readonly onEffectError?: (context: unknown) => void;
  readonly tracingHook?: StoreTracingHook;
  readonly inspection?: boolean;
  readonly reactiveSystem?: ReactiveSystemInstance;
}): StoreAdapterResult<TName>;
export function createStateAdapter(config: {
  readonly provides: Port<unknown, string> & { readonly __portName: string };
  readonly requires?: readonly Port<unknown, string>[];
  readonly lifetime?: "singleton" | "scoped";
  readonly initial: unknown;
  readonly actions: ActionMap<unknown>;
  readonly effects?:
    | Partial<EffectMap<unknown, ActionMap<unknown>>>
    | ((deps: Record<string, unknown>) => Partial<EffectMap<unknown, ActionMap<unknown>>>);
  readonly onEffectError?: (context: unknown) => void;
  readonly tracingHook?: StoreTracingHook;
  readonly inspection?: boolean;
  readonly reactiveSystem?: ReactiveSystemInstance;
}): AdapterConstraint {
  const inspectionPorts = config.inspection ? [StoreRegistryPort, StoreInspectorInternalPort] : [];

  const requires = [...(config.requires ?? []), ...inspectionPorts];

  const portName = config.provides.__portName;
  const lifetime = config.lifetime ?? "singleton";

  const adp = createAdapter({
    provides: config.provides,
    requires,
    lifetime,
    factory: (deps: Record<string, unknown>) => {
      const resolvedEffects =
        typeof config.effects === "function" ? config.effects(deps) : config.effects;

      const inspector = config.inspection
        ? extractStoreInspectorInternal(deps.StoreInspectorInternal)
        : undefined;

      const tracingHook =
        config.tracingHook ??
        (config.inspection ? extractStoreTracingHook(deps.StoreTracingHook) : undefined);

      const service = createStateServiceImpl({
        portName,
        containerName: "default",
        initial: config.initial,
        actions: config.actions,
        effects: resolvedEffects,
        onEffectError: config.onEffectError,
        tracingHook,
        inspector,
        reactiveSystem: config.reactiveSystem,
      });

      // Auto-register with registry
      if (config.inspection) {
        const registry = extractStoreRegistry(deps.StoreRegistry);
        if (registry) {
          const requireNames = (config.requires ?? []).map(p => p.__portName);
          const branded = { [__stateAdapterBrand]: true };
          registry.register(
            buildStateRegistryEntry(portName, service, branded, lifetime, requireNames)
          );
        }
      }

      return service;
    },
  });

  const branded = { ...adp, [__stateAdapterBrand]: true };
  return branded;
}
