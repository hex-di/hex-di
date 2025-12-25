/**
 * Type definitions for @hex-di/react.
 *
 * Provides all type definitions for the React integration.
 *
 * @packageDocumentation
 */

export type { Resolver, ToResolver } from "./core.js";

export type {
  ContainerProviderProps,
  ScopeProviderProps,
  AutoScopeProviderProps,
  AsyncContainerProviderProps,
  AsyncContainerLoadingProps,
  AsyncContainerErrorProps,
  AsyncContainerReadyProps,
  AsyncContainerProviderComponent,
} from "./provider-props.js";

export type { TypedReactIntegration } from "./factory.js";

export * from "./unified.js";
