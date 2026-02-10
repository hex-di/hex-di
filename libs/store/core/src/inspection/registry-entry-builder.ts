/**
 * Registry Entry Builder
 *
 * Shared helper for building StoreRegistryEntry from service instances
 * and adapter configuration. Used by adapter factories with `inspection: true`.
 *
 * @packageDocumentation
 */

import type { StoreRegistryEntry } from "./store-registry.js";
import type { PortSnapshot } from "../types/inspection.js";
import type { StateServiceInternal } from "../services/state-service-impl.js";
import type { AtomServiceInternal } from "../services/atom-service-impl.js";
import type { DerivedServiceInternal } from "../services/derived-service-impl.js";
import type { AsyncDerivedServiceInternal } from "../services/async-derived-service-impl.js";
import type { LinkedDerivedServiceInternal } from "../services/linked-derived-service-impl.js";
import type { ActionMap } from "../types/actions.js";

// =============================================================================
// Builder Functions
// =============================================================================

export function buildStateRegistryEntry(
  portName: string,
  service: StateServiceInternal<unknown, ActionMap<unknown>>,
  adapter: object,
  lifetime: "singleton" | "scoped",
  requires: readonly string[]
): StoreRegistryEntry {
  return {
    portName,
    adapter,
    lifetime,
    requires,
    writesTo: [],
    getSnapshot: (): PortSnapshot => ({
      kind: "state",
      portName,
      state: service.state,
      subscriberCount: service.subscriberCount,
      actionCount: service.actionCount,
      lastActionAt: service.lastActionAt,
    }),
    getSubscriberCount: () => service.subscriberCount,
    getHasEffects: () => true,
  };
}

export function buildAtomRegistryEntry(
  portName: string,
  service: AtomServiceInternal<unknown>,
  adapter: object,
  lifetime: "singleton" | "scoped"
): StoreRegistryEntry {
  return {
    portName,
    adapter,
    lifetime,
    requires: [],
    writesTo: [],
    getSnapshot: (): PortSnapshot => ({
      kind: "atom",
      portName,
      value: service.value,
      subscriberCount: service.subscriberCount,
    }),
    getSubscriberCount: () => service.subscriberCount,
    getHasEffects: () => false,
  };
}

export function buildDerivedRegistryEntry(
  portName: string,
  service: DerivedServiceInternal<unknown>,
  adapter: object,
  lifetime: "singleton" | "scoped",
  requires: readonly string[]
): StoreRegistryEntry {
  return {
    portName,
    adapter,
    lifetime,
    requires,
    writesTo: [],
    getSnapshot: (): PortSnapshot => ({
      kind: "derived",
      portName,
      value: service.value,
      subscriberCount: service.subscriberCount,
      sourcePortNames: requires,
      isStale: false,
    }),
    getSubscriberCount: () => service.subscriberCount,
    getHasEffects: () => false,
  };
}

export function buildAsyncDerivedRegistryEntry(
  portName: string,
  service: AsyncDerivedServiceInternal<unknown, unknown>,
  adapter: object,
  requires: readonly string[]
): StoreRegistryEntry {
  return {
    portName,
    adapter,
    lifetime: "singleton",
    requires,
    writesTo: [],
    getSnapshot: (): PortSnapshot => ({
      kind: "async-derived",
      portName,
      status: service.snapshot.status,
      data: service.snapshot.data,
      error: service.snapshot.error,
      subscriberCount: service.subscriberCount,
      sourcePortNames: requires,
    }),
    getSubscriberCount: () => service.subscriberCount,
    getHasEffects: () => false,
  };
}

export function buildLinkedDerivedRegistryEntry(
  portName: string,
  service: LinkedDerivedServiceInternal<unknown>,
  adapter: object,
  requires: readonly string[],
  writesTo: readonly string[]
): StoreRegistryEntry {
  return {
    portName,
    adapter,
    lifetime: "singleton",
    requires,
    writesTo,
    getSnapshot: (): PortSnapshot => ({
      kind: "derived",
      portName,
      value: service.value,
      subscriberCount: service.subscriberCount,
      sourcePortNames: requires,
      isStale: false,
    }),
    getSubscriberCount: () => service.subscriberCount,
    getHasEffects: () => false,
  };
}
