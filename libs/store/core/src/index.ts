/**
 * @hex-di/store - Reactive State Management for HexDI
 *
 * State ports, adapters, signal-based reactivity, and container integration.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export {
  StoreInspectorPort,
  StoreInspectorInternalPort,
  StoreRegistryPort,
  StoreTracingHookPort,
  StoreLibraryInspectorPort,
  EffectFailedError,
  AsyncDerivedSelectError,
  HydrationError,
  EffectAdapterError,
  EffectErrorHandlerError,
} from "./types/index.js";

export type {
  DeepReadonly,
  NoPayload,
  ActionReducer,
  ActionMap,
  BoundActions,
  Unsubscribe,
  StateListener,
  StateService,
  AtomService,
  DerivedService,
  AsyncDerivedSnapshot,
  AsyncDerivedService,
  LinkedDerivedService,
  StoreRuntimeError,
  EffectContext,
  EffectMap,
  EffectErrorHandler,
  ActionEffect,
  ActionEvent,
  HistoryState,
  HistoryActions,
  StoreInspectorPortDef,
  StoreInspectorInternalPortDef,
  StoreRegistryPortDef,
  StoreTracingHookPortDef,
  PortRegistryEntry,
  StoreInspectorInternal,
  StoreInspectorAPI,
  StoreInspectorListener,
  StatePortInfo,
  StoreSnapshot,
  PortSnapshot,
  StatePortSnapshot,
  AtomPortSnapshot,
  DerivedPortSnapshot,
  AsyncDerivedPortSnapshot,
  ActionHistoryEntry,
  ActionHistoryFilter,
  ActionHistoryConfig,
  SubscriberGraph,
  SubscriberNode,
  SubscriberEdge,
  StoreInspectorEvent,
  StateHydrator,
  HydrationStorage,
} from "./types/index.js";

// =============================================================================
// Ports
// =============================================================================

export {
  createStatePort,
  createAtomPort,
  createDerivedPort,
  createAsyncDerivedPort,
  createLinkedDerivedPort,
  createHistoryPort,
  createHistoryActions,
} from "./ports/index.js";

export type {
  StatePortDef,
  AtomPortDef,
  DerivedPortDef,
  AsyncDerivedPortDef,
  LinkedDerivedPortDef,
  InferStateType,
  InferActionsType,
  InferAtomType,
  InferDerivedType,
  InferAsyncDerivedType,
  InferAsyncDerivedErrorType,
  InferLinkedDerivedType,
} from "./ports/index.js";

// =============================================================================
// Adapters
// =============================================================================

export {
  createStateAdapter,
  createAtomAdapter,
  createDerivedAdapter,
  createAsyncDerivedAdapter,
  createLinkedDerivedAdapter,
  createEffectAdapter,
  createHydrationAdapter,
  isEffectAdapter,
  withEffectAdapters,
} from "./adapters/index.js";

export type { EffectAdapterBrand, CreateHydrationAdapterConfig } from "./adapters/index.js";

// =============================================================================
// Errors
// =============================================================================

export {
  DisposedStateAccess,
  DerivedComputationFailed,
  AsyncDerivedExhausted,
  CircularDerivedDependency,
  BatchExecutionFailed,
  WaitForStateTimeout,
  InvalidComputedGetter,
  type StoreError,
  type StoreProgrammingError,
} from "./errors/index.js";

// =============================================================================
// Reactivity
// =============================================================================

export { createSignal, createComputed, createEffect, untracked } from "./reactivity/index.js";
export type { Signal, Computed, ReactiveEffect } from "./reactivity/index.js";
export { shallowEqual } from "./reactivity/index.js";
export {
  batch,
  isInBatch,
  getBatchDepth,
  batchTargets,
  setBatchDiagnostics,
} from "./reactivity/index.js";
export { createIsolatedReactiveSystem } from "./reactivity/index.js";
export type { ReactiveSystemInstance } from "./reactivity/index.js";
export { createTrackingProxy, trackSelector, hasPathChanged } from "./reactivity/index.js";
export type { TrackingResult } from "./reactivity/index.js";

// =============================================================================
// Utils
// =============================================================================

export { deepFreeze } from "./utils/deep-freeze.js";

// =============================================================================
// Inspection
// =============================================================================

export {
  createActionHistory,
  buildSubscriberGraph,
  createStoreInspectorImpl,
  createStoreInspectorAdapter,
  StoreInspectorAdapter,
  StoreInspectorWithRegistryAdapter,
  StoreInspectorInternalAdapter,
  createStoreRegistry,
  StoreRegistryAdapter,
  isStoreInspectorInternal,
  isStoreRegistry,
  isStoreTracingHook,
  extractStoreInspectorInternal,
  extractStoreRegistry,
  extractStoreTracingHook,
} from "./inspection/index.js";

export type {
  ActionHistory,
  AdapterRegistration,
  StoreInspectorConfig,
  CreateStoreInspectorAdapterConfig,
  StoreInspectorAdapterResult,
  StoreRegistry,
  StoreRegistryEntry,
  StoreRegistryEvent,
  StoreRegistryListener,
} from "./inspection/index.js";

// =============================================================================
// Integration
// =============================================================================

export {
  createStoreTracingBridge,
  createStoreLibraryInspector,
  StoreLibraryInspectorAdapter,
  createStoreTracingHookAdapter,
  createStoreMcpResourceHandler,
} from "./integration/index.js";
export type {
  StoreTracerLike,
  StoreSpanContext,
  StoreTracingBridgeConfig,
  StoreTracingHook,
  StoreMcpResourceMap,
  StoreMcpResourceUri,
  StoreMcpResourceHandler,
} from "./integration/index.js";
