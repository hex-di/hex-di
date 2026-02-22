/**
 * Atom Adapter Factory
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Port, AdapterConstraint } from "@hex-di/core";
import type { AtomPortDef } from "../ports/port-types.js";
import { StoreRegistryPort, StoreInspectorInternalPort } from "../types/inspection.js";
import { extractStoreRegistry, extractStoreInspectorInternal } from "../inspection/type-guards.js";
import { createAtomServiceImpl } from "../services/atom-service-impl.js";
import type { ReactiveSystemInstance } from "../reactivity/system-factory.js";
import { buildAtomRegistryEntry } from "../inspection/registry-entry-builder.js";
import { __atomAdapterBrand } from "./brands.js";
import type { StoreAdapterResult } from "./brands.js";

/**
 * Creates an atom adapter providing AtomService implementation.
 */
export function createAtomAdapter<TName extends string>(config: {
  readonly provides: AtomPortDef<TName, unknown>;
  readonly lifetime?: "singleton" | "scoped";
  readonly initial: unknown;
  readonly inspection?: boolean;
  readonly reactiveSystem?: ReactiveSystemInstance;
}): StoreAdapterResult<TName>;
export function createAtomAdapter(config: {
  readonly provides: AtomPortDef<string, unknown>;
  readonly lifetime?: "singleton" | "scoped";
  readonly initial: unknown;
  readonly inspection?: boolean;
  readonly reactiveSystem?: ReactiveSystemInstance;
}): AdapterConstraint {
  const inspectionPorts = config.inspection ? [StoreRegistryPort, StoreInspectorInternalPort] : [];

  const requires: readonly Port<string, unknown>[] = [...inspectionPorts];
  const portName = config.provides.__portName;
  const lifetime = config.lifetime ?? "singleton";

  const adp = createAdapter({
    provides: config.provides,
    requires,
    lifetime,
    factory: (deps: Record<string, unknown>) => {
      const inspector = config.inspection
        ? extractStoreInspectorInternal(deps.StoreInspectorInternal)
        : undefined;

      const service = createAtomServiceImpl({
        portName,
        containerName: "default",
        initial: config.initial,
        inspector,
        reactiveSystem: config.reactiveSystem,
      });

      // Auto-register with registry
      if (config.inspection) {
        const registry = extractStoreRegistry(deps.StoreRegistry);
        if (registry) {
          const branded = { [__atomAdapterBrand]: true };
          registry.register(buildAtomRegistryEntry(portName, service, branded, lifetime));
        }
      }

      return service;
    },
  });

  const branded = { ...adp, [__atomAdapterBrand]: true };
  return branded;
}
