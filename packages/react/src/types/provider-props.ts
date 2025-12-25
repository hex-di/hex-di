/**
 * Provider component props for @hex-di/react.
 *
 * This module exports all provider component prop types used by
 * ContainerProvider, ScopeProvider, AutoScopeProvider, and AsyncContainerProvider.
 *
 * @packageDocumentation
 */

import type { ReactNode, ComponentType } from "react";
import type { Port } from "@hex-di/ports";
import type { Container } from "@hex-di/runtime";
import type { Resolver } from "./core.js";

// =============================================================================
// ContainerProvider Props
// =============================================================================

/**
 * Props for the ContainerProvider component.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 */
export interface ContainerProviderProps<TProvides extends Port<unknown, string>> {
  /**
   * The pre-created Container instance to provide to the React tree.
   */
  readonly container: Container<TProvides>;

  /**
   * React children that will have access to the container via hooks.
   */
  readonly children: ReactNode;
}

// =============================================================================
// ScopeProvider Props
// =============================================================================

/**
 * Props for the ScopeProvider component.
 *
 * @typeParam TProvides - Union of Port types that the scope can resolve
 *
 * @remarks
 * Accepts Resolver<TProvides> which is satisfied by both Container and Scope.
 * This allows passing the result of useScope() directly to ScopeProvider.
 */
export interface ScopeProviderProps<TProvides extends Port<unknown, string>> {
  /**
   * The externally managed resolver (scope or container) to provide to the React tree.
   * Accepts any Resolver<TProvides> - typically a Scope from useScope() or createScope().
   */
  readonly scope: Resolver<TProvides>;

  /**
   * React children that will resolve services from this scope.
   */
  readonly children: ReactNode;
}

// =============================================================================
// AutoScopeProvider Props
// =============================================================================

/**
 * Props for the AutoScopeProvider component.
 */
export interface AutoScopeProviderProps {
  /**
   * React children that will resolve services from the auto-managed scope.
   */
  readonly children: ReactNode;
}

// =============================================================================
// AsyncContainerProvider Props
// =============================================================================

/**
 * Props for the AsyncContainerProvider component.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 * @typeParam TAsyncPorts - Union of Port types that require async initialization
 */
export interface AsyncContainerProviderProps<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = Port<unknown, string>,
> {
  /**
   * The uninitialized Container instance to initialize and provide.
   * Must be created with createContainer() and NOT yet initialized.
   * Uses root container type (TExtends = never) since only root containers
   * have the initialize() method.
   */
  readonly container: Container<TProvides, never, TAsyncPorts, "uninitialized">;

  /**
   * React children - can be compound components or regular children.
   */
  readonly children: ReactNode;

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

/**
 * Props for the AsyncContainerProvider.Loading compound component.
 */
export interface AsyncContainerLoadingProps {
  readonly children: ReactNode;
}

/**
 * Props for the AsyncContainerProvider.Error compound component.
 * Supports both static children and render prop pattern.
 */
export interface AsyncContainerErrorProps {
  readonly children: ReactNode | ((error: Error) => ReactNode);
}

/**
 * Props for the AsyncContainerProvider.Ready compound component.
 */
export interface AsyncContainerReadyProps {
  readonly children: ReactNode;
}

/**
 * Type for the AsyncContainerProvider component with compound components.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 * @typeParam TAsyncPorts - Union of Port types that require async initialization
 */
export interface AsyncContainerProviderComponent<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = Port<unknown, string>,
> {
  (props: AsyncContainerProviderProps<TProvides, TAsyncPorts>): ReactNode;
  Loading: ComponentType<AsyncContainerLoadingProps>;
  Error: ComponentType<AsyncContainerErrorProps>;
  Ready: ComponentType<AsyncContainerReadyProps>;
}
