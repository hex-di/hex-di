/**
 * Linked Derived Adapter Factory
 *
 * Creates adapters for bidirectional derived ports.
 * Delegates to createLinkedDerivedServiceImpl for the actual service implementation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Port, AdapterConstraint, InferPortName } from "@hex-di/core";
import type { PortDeps } from "@hex-di/core";
import type { LinkedDerivedPortDef, InferLinkedDerivedType } from "../ports/port-types.js";
import { StoreRegistryPort, StoreInspectorInternalPort } from "../types/inspection.js";
import { extractStoreRegistry, extractStoreInspectorInternal } from "../inspection/type-guards.js";
import { createLinkedDerivedServiceImpl } from "../services/linked-derived-service-impl.js";
import type { ReactiveSystemInstance } from "../reactivity/system-factory.js";
import { buildLinkedDerivedRegistryEntry } from "../inspection/registry-entry-builder.js";
import { __linkedDerivedAdapterBrand } from "./brands.js";
import type { StoreAdapterResult } from "./brands.js";

// =============================================================================
// createLinkedDerivedAdapter
// =============================================================================

/**
 * Creates a linked (bidirectional) derived adapter.
 *
 * Supports both read (select) and write (set -> write) operations.
 * The `write` function propagates changes back to source state.
 */
export function createLinkedDerivedAdapter<
  TPort extends LinkedDerivedPortDef<string, unknown>,
  const TRequires extends readonly Port<unknown, string>[],
>(config: {
  readonly provides: TPort;
  readonly requires: TRequires;
  readonly select: (deps: PortDeps<TRequires>) => InferLinkedDerivedType<TPort>;
  readonly write: (value: InferLinkedDerivedType<TPort>, deps: PortDeps<TRequires>) => void;
  readonly writesTo?: readonly Port<unknown, string>[];
  readonly equals?: (a: InferLinkedDerivedType<TPort>, b: InferLinkedDerivedType<TPort>) => boolean;
  readonly inspection?: boolean;
  readonly reactiveSystem?: ReactiveSystemInstance;
}): StoreAdapterResult<InferPortName<TPort> & string>;
export function createLinkedDerivedAdapter(config: {
  readonly provides: LinkedDerivedPortDef<string, unknown>;
  readonly requires: readonly Port<unknown, string>[];
  readonly select: (deps: Record<string, unknown>) => unknown;
  readonly write: (value: unknown, deps: Record<string, unknown>) => void;
  readonly writesTo?: readonly Port<unknown, string>[];
  readonly equals?: (a: unknown, b: unknown) => boolean;
  readonly inspection?: boolean;
  readonly reactiveSystem?: ReactiveSystemInstance;
}): AdapterConstraint {
  const portName = config.provides.__portName;

  const inspectionPorts = config.inspection ? [StoreRegistryPort, StoreInspectorInternalPort] : [];

  const requires = [...config.requires, ...inspectionPorts];

  const adp = createAdapter({
    provides: config.provides,
    requires,
    lifetime: "singleton",
    factory: (deps: Record<string, unknown>) => {
      const inspector = config.inspection
        ? extractStoreInspectorInternal(deps.StoreInspectorInternal)
        : undefined;

      const service = createLinkedDerivedServiceImpl({
        portName,
        containerName: "default",
        select: () => config.select(deps),
        write: value => config.write(value, deps),
        inspector,
        reactiveSystem: config.reactiveSystem,
      });

      // Auto-register with registry
      if (config.inspection) {
        const registry = extractStoreRegistry(deps.StoreRegistry);
        if (registry) {
          const requireNames = config.requires.map(p => p.__portName);
          const writesToNames = (config.writesTo ?? []).map(p => p.__portName);
          const branded = { [__linkedDerivedAdapterBrand]: true };
          registry.register(
            buildLinkedDerivedRegistryEntry(portName, service, branded, requireNames, writesToNames)
          );
        }
      }

      return service;
    },
  });

  const branded = { ...adp, [__linkedDerivedAdapterBrand]: true };
  return branded;
}
