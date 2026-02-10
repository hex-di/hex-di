/**
 * Inspection Module
 *
 * Store introspection: snapshots, action history, subscriber graphs, events.
 *
 * @packageDocumentation
 */

export { createActionHistory } from "./action-history.js";
export type { ActionHistory } from "./action-history.js";

export { buildSubscriberGraph } from "./subscriber-graph.js";
export type { AdapterRegistration } from "./subscriber-graph.js";

export { createStoreInspectorImpl } from "./store-inspector-impl.js";
export type {
  StoreInspectorConfig,
  PortRegistryEntry,
  StoreInspectorInternal,
} from "./store-inspector-impl.js";

export {
  createStoreInspectorAdapter,
  StoreInspectorAdapter,
  StoreInspectorWithRegistryAdapter,
  StoreInspectorInternalAdapter,
} from "./inspector-adapter.js";
export type {
  CreateStoreInspectorAdapterConfig,
  StoreInspectorAdapterResult,
} from "./inspector-adapter.js";

export { createStoreRegistry } from "./store-registry.js";
export type {
  StoreRegistry,
  StoreRegistryEntry,
  StoreRegistryEvent,
  StoreRegistryListener,
} from "./store-registry.js";

export { StoreRegistryAdapter } from "./registry-adapter.js";

export {
  isStoreInspectorInternal,
  isStoreRegistry,
  isStoreTracingHook,
  extractStoreInspectorInternal,
  extractStoreRegistry,
  extractStoreTracingHook,
} from "./type-guards.js";
