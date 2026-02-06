/**
 * Provider components for @hex-di/react.
 *
 * Provides React provider components for DI container and scope management.
 *
 * @packageDocumentation
 */

export { HexDiContainerProvider } from "./container-provider.js";
export type { HexDiContainerProviderProps } from "./container-provider.js";

export { HexDiScopeProvider } from "./scope-provider.js";
export type { HexDiScopeProviderProps } from "./scope-provider.js";

export { HexDiAutoScopeProvider } from "./auto-scope-provider.js";
export type { HexDiAutoScopeProviderProps } from "./auto-scope-provider.js";

export { HexDiAsyncContainerProvider, useAsyncContainerState } from "./async-container-provider.js";
export type {
  HexDiAsyncContainerProviderProps,
  HexDiAsyncContainerLoadingProps,
  HexDiAsyncContainerErrorProps,
  HexDiAsyncContainerReadyProps,
  HexDiAsyncContainerProviderComponent,
} from "./async-container-provider.js";

export { ReactiveScopeProvider } from "./reactive-scope-provider.js";
export type { ReactiveScopeProviderProps } from "./reactive-scope-provider.js";

export { HexDiLazyContainerProvider, useLazyContainerState } from "./lazy-container-provider.js";
export type { UseLazyContainerStateResult } from "./lazy-container-provider.js";
