/**
 * Provider components for @hex-di/react.
 *
 * Provides React provider components for DI container and scope management.
 *
 * @packageDocumentation
 */

export { ContainerProvider } from "./container-provider.js";
export type { ContainerProviderProps } from "./container-provider.js";

export { ScopeProvider } from "./scope-provider.js";
export type { ScopeProviderProps } from "./scope-provider.js";

export { AutoScopeProvider } from "./auto-scope-provider.js";
export type { AutoScopeProviderProps } from "./auto-scope-provider.js";

export { AsyncContainerProvider, useAsyncContainerState } from "./async-container-provider.js";
export type {
  AsyncContainerProviderProps,
  AsyncContainerLoadingProps,
  AsyncContainerErrorProps,
  AsyncContainerReadyProps,
  AsyncContainerProviderComponent,
} from "./async-container-provider.js";

export { ReactiveScopeProvider } from "./reactive-scope-provider.js";
export type { ReactiveScopeProviderProps } from "./reactive-scope-provider.js";

export { LazyContainerProvider, useLazyContainerState } from "./lazy-container-provider.js";
export type { UseLazyContainerStateResult } from "./lazy-container-provider.js";
