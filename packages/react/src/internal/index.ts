/**
 * Internal utilities for @hex-di/react.
 *
 * These are internal implementation details and not part of the public API.
 *
 * @packageDocumentation
 * @internal
 */

export {
  type RuntimeContainerRef,
  type RuntimeScopeRef,
  type RuntimeResolverRef,
  toRuntimeContainerRef,
  toRuntimeScopeRef,
  toRuntimeContainerWithInit,
  toTypedResolver,
} from "./runtime-refs.js";

export {
  type RuntimeResolver,
  type RuntimeContainer,
  type TypedResolver,
  toRuntimeResolver,
  toRuntimeContainer,
  assertResolverProvides,
  isRuntimeContainer,
} from "./runtime-resolver.js";
