/**
 * Type definitions for LazyContainerProvider component.
 *
 * LazyContainerProvider handles deferred graph loading via LazyContainer,
 * supporting loading/error/ready states with compound component pattern.
 *
 * @packageDocumentation
 */

import type { ReactNode } from "react";
import type { Port } from "@hex-di/ports";
import type { LazyContainer } from "@hex-di/runtime";

// =============================================================================
// Main Provider Props
// =============================================================================

/**
 * Props for the LazyContainerProvider component.
 *
 * @typeParam TProvides - Port types inherited from parent container
 * @typeParam TExtends - Port types added by the lazy-loaded graph
 * @typeParam TAsyncPorts - Port types with async factories
 */
export interface LazyContainerProviderProps<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
> {
  /**
   * The LazyContainer instance to load and provide.
   * Created via `container.createLazyChild()`.
   */
  readonly lazyContainer: LazyContainer<TProvides, TExtends, TAsyncPorts>;

  /**
   * React children - can be compound components or regular children.
   */
  readonly children: ReactNode;

  /**
   * Whether to automatically start loading on mount.
   * @default true
   */
  readonly autoLoad?: boolean;

  /**
   * Optional loading fallback for simple mode.
   * Used when children are not compound components.
   */
  readonly loadingFallback?: ReactNode;

  /**
   * Optional error fallback for simple mode.
   * Used when children are not compound components.
   */
  readonly errorFallback?: (error: Error) => ReactNode;
}

// =============================================================================
// Compound Component Props
// =============================================================================

/**
 * Props for the Loading compound component.
 * Renders while the LazyContainer is loading.
 */
export interface LazyContainerLoadingProps {
  readonly children: ReactNode;
}

/**
 * Props for the Error compound component.
 * Renders when loading fails.
 * Supports both static children and render prop pattern.
 */
export interface LazyContainerErrorProps {
  readonly children: ReactNode | ((error: Error) => ReactNode);
}

/**
 * Props for the Ready compound component.
 * Renders when the LazyContainer has loaded successfully.
 * Provides the loaded container through context for hooks.
 */
export interface LazyContainerReadyProps {
  readonly children: ReactNode;
}

// =============================================================================
// Component Type with Compound Components
// =============================================================================

/**
 * LazyContainerProvider component type with compound components attached.
 *
 * @typeParam TProvides - Port types inherited from parent container
 * @typeParam TExtends - Port types added by the lazy-loaded graph
 * @typeParam TAsyncPorts - Port types with async factories
 */
export interface LazyContainerProviderComponent<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
> {
  (props: LazyContainerProviderProps<TProvides, TExtends, TAsyncPorts>): ReactNode;
  Loading: (props: LazyContainerLoadingProps) => ReactNode;
  Error: (props: LazyContainerErrorProps) => ReactNode;
  Ready: (props: LazyContainerReadyProps) => ReactNode;
}

// =============================================================================
// State Types (for internal use)
// =============================================================================

/**
 * Loading status for the lazy container.
 * @internal
 */
export type LazyContainerStatus = "pending" | "loading" | "ready" | "error";
