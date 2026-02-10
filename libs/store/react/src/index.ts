/**
 * @hex-di/store-react - React Integration for @hex-di/store
 *
 * Provides type-safe React hooks for state, atoms, derived values,
 * and async derived with useSyncExternalStore for concurrent mode safety.
 *
 * All hooks resolve services from the nearest HexDiContainerProvider.
 * There is no separate StoreProvider.
 *
 * @packageDocumentation
 */

// =============================================================================
// Hooks
// =============================================================================

export {
  useStateValue,
  useActions,
  useStatePort,
  useAtom,
  useDerived,
  useAsyncDerived,
  useAsyncDerivedSuspense,
  type UseStatePortResult,
  type UseAsyncDerivedResult,
  type UseAsyncDerivedSuspenseResult,
} from "./hooks/index.js";

// =============================================================================
// Re-exports from @hex-di/store
// =============================================================================

export type {
  StatePortDef,
  AtomPortDef,
  DerivedPortDef,
  AsyncDerivedPortDef,
  DeepReadonly,
  ActionMap,
  BoundActions,
  StateService,
  AtomService,
  DerivedService,
  AsyncDerivedService,
  AsyncDerivedSnapshot,
} from "@hex-di/store";

// =============================================================================
// Re-exports from @hex-di/react
// =============================================================================

export { HexDiContainerProvider, HexDiAutoScopeProvider } from "@hex-di/react";
