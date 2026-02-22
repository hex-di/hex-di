/**
 * Async Derived Adapter Factory
 *
 * Creates adapters for async derived ports.
 * Delegates to createAsyncDerivedServiceImpl for the actual service implementation.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import type { Port, AdapterConstraint, InferPortName } from "@hex-di/core";
import type { PortDeps } from "@hex-di/core";
import type {
  AsyncDerivedPortDef,
  InferAsyncDerivedType,
  InferAsyncDerivedErrorType,
} from "../ports/port-types.js";
import type { ResultAsync } from "@hex-di/result";
import { StoreRegistryPort, StoreInspectorInternalPort } from "../types/inspection.js";
import { extractStoreRegistry, extractStoreInspectorInternal } from "../inspection/type-guards.js";
import { createAsyncDerivedServiceImpl } from "../services/async-derived-service-impl.js";
import type { ReactiveSystemInstance } from "../reactivity/system-factory.js";
import { buildAsyncDerivedRegistryEntry } from "../inspection/registry-entry-builder.js";
import { __asyncDerivedAdapterBrand } from "./brands.js";
import type { StoreAdapterResult } from "./brands.js";

// =============================================================================
// createAsyncDerivedAdapter
// =============================================================================

/**
 * Creates an async derived adapter providing AsyncDerivedService implementation.
 *
 * The adapter fetches data using `select`, which returns a ResultAsync.
 * It tracks loading/error status and supports retry and stale-while-revalidate.
 */
export function createAsyncDerivedAdapter<
  TPort extends AsyncDerivedPortDef<string, unknown, unknown>,
  const TRequires extends readonly Port<string, unknown>[],
>(config: {
  readonly provides: TPort;
  readonly requires: TRequires;
  readonly select: (
    deps: PortDeps<TRequires>
  ) => ResultAsync<InferAsyncDerivedType<TPort>, InferAsyncDerivedErrorType<TPort>>;
  readonly staleTime?: number;
  readonly retryCount?: number;
  readonly retryDelay?: number | ((attempt: number) => number);
  readonly inspection?: boolean;
  readonly reactiveSystem?: ReactiveSystemInstance;
}): StoreAdapterResult<InferPortName<TPort> & string>;
export function createAsyncDerivedAdapter(config: {
  readonly provides: AsyncDerivedPortDef<string, unknown, unknown>;
  readonly requires: readonly Port<string, unknown>[];
  readonly select: (deps: Record<string, unknown>) => ResultAsync<unknown, unknown>;
  readonly staleTime?: number;
  readonly retryCount?: number;
  readonly retryDelay?: number | ((attempt: number) => number);
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

      const svc = createAsyncDerivedServiceImpl({
        portName,
        containerName: "default",
        select: () => config.select(deps),
        staleTime: config.staleTime,
        retryCount: config.retryCount,
        retryDelay: config.retryDelay,
        inspector,
        reactiveSystem: config.reactiveSystem,
      });

      // Kick off initial fetch (non-blocking)
      svc.refresh();

      // Auto-register with registry
      if (config.inspection) {
        const registry = extractStoreRegistry(deps.StoreRegistry);
        if (registry) {
          const requireNames = config.requires.map(p => p.__portName);
          const branded = { [__asyncDerivedAdapterBrand]: true };
          registry.register(buildAsyncDerivedRegistryEntry(portName, svc, branded, requireNames));
        }
      }

      return svc;
    },
  });

  const branded = { ...adp, [__asyncDerivedAdapterBrand]: true };
  return branded;
}
