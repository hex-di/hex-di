/**
 * Resolver Context for @hex-di/react.
 *
 * Provides the React context for storing the current resolver (Container or Scope).
 *
 * @packageDocumentation
 * @internal
 */

import { createContext } from "react";
import type { Port } from "@hex-di/core";
import type { RuntimeResolverRef } from "../internal/runtime-refs.js";

// =============================================================================
// Brand Symbol for Context
// =============================================================================

/**
 * Unique symbol used for branding context values.
 *
 * This symbol ensures that context values from different createTypedHooks
 * calls are not structurally compatible, preventing accidental mixing of
 * different container trees.
 *
 * NOTE: This is a phantom type - it exists only at the type level.
 *
 * @internal
 */
declare const ContextBrand: unique symbol;

// =============================================================================
// Local Resolver Type
// =============================================================================

/**
 * Local resolver type representing either a Container, ChildContainer, or Scope.
 *
 * We now use RuntimeResolverRef which provides bivariant method signatures,
 * eliminating the need for type casts when storing containers in context.
 *
 * @internal
 */
type LocalResolver = RuntimeResolverRef;

// =============================================================================
// Resolver Context Value Types
// =============================================================================

/**
 * Internal context value structure for the resolver context.
 *
 * This stores the current resolver (Container or Scope), which may differ
 * from the root container when inside a ScopeProvider or AutoScopeProvider.
 *
 * Uses RuntimeResolverRef which provides bivariant method signatures,
 * eliminating the need for type casts when storing resolvers in context.
 *
 * @typeParam TProvides - Union of Port types that can be resolved
 *
 * @internal
 */
export interface ResolverContextValue<TProvides extends Port<string, unknown>> {
  /**
   * The current resolver - either the root container or a scope.
   * Uses RuntimeResolverRef for bivariant storage.
   */
  readonly resolver: LocalResolver;

  /**
   * Brand property for nominal typing.
   * Prevents structural compatibility between different createTypedHooks contexts.
   */
  readonly [ContextBrand]: { provides: TProvides };
}

/**
 * Runtime resolver context value without the phantom brand.
 * Uses RuntimeResolverRef for bivariant storage.
 * @internal
 */
export interface RuntimeResolverContextValue {
  readonly resolver: LocalResolver;
}

// =============================================================================
// Resolver Context
// =============================================================================

/**
 * React Context for the current resolver (Container or Scope).
 *
 * This context stores the nearest resolver and is used by:
 * - usePort hook for service resolution
 * - AutoScopeProvider for creating child scopes
 *
 * @remarks
 * The resolver context is separate from the container context so that
 * ScopeProvider and AutoScopeProvider can override the resolver while
 * preserving access to the root container.
 * Uses RuntimeResolverContextValue (without brand) since brand is a phantom type.
 *
 * @internal
 */
export const ResolverContext = createContext<RuntimeResolverContextValue | null>(null);
ResolverContext.displayName = "HexDI.ResolverContext";
