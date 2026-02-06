/**
 * React Context infrastructure for @hex-di/react.
 *
 * Provides the context system that enables React components to access
 * the DI container and scopes.
 *
 * @packageDocumentation
 */

export {
  ContainerContext,
  type ContainerContextValue,
  type RuntimeContainerContextValue,
} from "./container-context.js";

export {
  ResolverContext,
  type ResolverContextValue,
  type RuntimeResolverContextValue,
} from "./resolver-context.js";
