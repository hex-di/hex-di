/**
 * Derived Adapter Factory
 *
 * Creates adapters for derived (computed) ports.
 * Delegates to createDerivedServiceImpl for the actual service implementation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Port, AdapterConstraint, InferPortName } from "@hex-di/core";
import type { PortDeps } from "@hex-di/core";
import type { DerivedPortDef, InferDerivedType } from "../ports/port-types.js";
import { StoreRegistryPort, StoreInspectorInternalPort } from "../types/inspection.js";
import { extractStoreRegistry, extractStoreInspectorInternal } from "../inspection/type-guards.js";
import { createDerivedServiceImpl } from "../services/derived-service-impl.js";
import type { ReactiveSystemInstance } from "../reactivity/system-factory.js";
import { buildDerivedRegistryEntry } from "../inspection/registry-entry-builder.js";
import { __derivedAdapterBrand } from "./brands.js";
import type { StoreAdapterResult } from "./brands.js";

// =============================================================================
// createDerivedAdapter
// =============================================================================

/**
 * Creates a derived adapter providing DerivedService implementation.
 *
 * The adapter computes its value by calling `select` with resolved dependencies.
 * Recomputation occurs when any dependency changes.
 */
export function createDerivedAdapter<
  TPort extends DerivedPortDef<string, unknown>,
  const TRequires extends readonly Port<string, unknown>[],
>(config: {
  readonly provides: TPort;
  readonly requires: TRequires;
  readonly select: (deps: PortDeps<TRequires>) => InferDerivedType<TPort>;
  readonly equals?: (a: InferDerivedType<TPort>, b: InferDerivedType<TPort>) => boolean;
  readonly lifetime?: "singleton" | "scoped";
  readonly inspection?: boolean;
  readonly reactiveSystem?: ReactiveSystemInstance;
}): StoreAdapterResult<InferPortName<TPort> & string>;
export function createDerivedAdapter(config: {
  readonly provides: DerivedPortDef<string, unknown>;
  readonly requires: readonly Port<string, unknown>[];
  readonly select: (deps: Record<string, unknown>) => unknown;
  readonly equals?: (a: unknown, b: unknown) => boolean;
  readonly lifetime?: "singleton" | "scoped";
  readonly inspection?: boolean;
  readonly reactiveSystem?: ReactiveSystemInstance;
}): AdapterConstraint {
  const lifetime = config.lifetime ?? "singleton";
  const portName = config.provides.__portName;

  const inspectionPorts = config.inspection ? [StoreRegistryPort, StoreInspectorInternalPort] : [];

  const requires = [...config.requires, ...inspectionPorts];

  const adp = createAdapter({
    provides: config.provides,
    requires,
    lifetime,
    factory: (deps: Record<string, unknown>) => {
      const inspector = config.inspection
        ? extractStoreInspectorInternal(deps.StoreInspectorInternal)
        : undefined;

      const service = createDerivedServiceImpl({
        portName,
        containerName: "default",
        select: () => config.select(deps),
        equals: config.equals,
        inspector,
        reactiveSystem: config.reactiveSystem,
      });

      // Auto-register with registry
      if (config.inspection) {
        const registry = extractStoreRegistry(deps.StoreRegistry);
        if (registry) {
          const requireNames = config.requires.map(p => p.__portName);
          const branded = { [__derivedAdapterBrand]: true };
          registry.register(
            buildDerivedRegistryEntry(portName, service, branded, lifetime, requireNames)
          );
        }
      }

      return service;
    },
  });

  const branded = { ...adp, [__derivedAdapterBrand]: true };
  return branded;
}
