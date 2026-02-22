/**
 * Container Context for @hex-di/react.
 *
 * Provides the React context for storing the root container reference.
 *
 * @packageDocumentation
 * @internal
 */

import { createContext } from "react";
import type { Port } from "@hex-di/core";
import type { RuntimeContainerRef } from "../internal/runtime-refs.js";

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
 * The global contexts in this file don't use the brand because they
 * use Port<string, unknown> as the base type, allowing any container.
 *
 * @internal
 */
declare const ContextBrand: unique symbol;

// =============================================================================
// Container Context Value Types
// =============================================================================

/**
 * Internal context value structure for the container context.
 *
 * This stores the root container reference, which is needed for:
 * - Creating new scopes via `useScope` hook
 * - Detecting nested ContainerProvider (single container per tree, or child containers nested)
 *
 * Uses RuntimeContainerRef which provides bivariant method signatures,
 * eliminating the need for type casts when storing containers in context.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 *
 * @internal
 */
export interface ContainerContextValue<TProvides extends Port<string, unknown>> {
  /**
   * The container provided by ContainerProvider.
   * Uses RuntimeContainerRef for bivariant storage.
   */
  readonly container: RuntimeContainerRef;

  /**
   * Flag indicating whether this is a child container.
   * Used to detect if nesting is allowed (child containers can be nested).
   */
  readonly isChildContainer: boolean;

  /**
   * Brand property for nominal typing.
   * Prevents structural compatibility between different createTypedHooks contexts.
   */
  readonly [ContextBrand]: { provides: TProvides };
}

/**
 * Runtime container context value without the phantom brand.
 * Uses RuntimeContainerRef for bivariant storage.
 * @internal
 */
export interface RuntimeContainerContextValue {
  readonly container: RuntimeContainerRef;
  readonly isChildContainer: boolean;
}

// =============================================================================
// Container Context
// =============================================================================

/**
 * React Context for the root container.
 *
 * This context stores the root container and is used to:
 * - Detect nested ContainerProvider (which is an error)
 * - Access the container for scope creation via useContainer
 *
 * @remarks
 * The context value is null when outside a ContainerProvider.
 * Hooks should check for null and throw MissingProviderError.
 * Uses RuntimeContainerContextValue (without brand) since brand is a phantom type.
 *
 * @internal
 */
export const ContainerContext = createContext<RuntimeContainerContextValue | null>(null);
ContainerContext.displayName = "HexDI.ContainerContext";
