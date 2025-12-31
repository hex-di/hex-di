/**
 * Provider component props for @hex-di/react.
 *
 * This module exports all provider component prop types used by
 * HexDiContainerProvider, HexDiScopeProvider, HexDiAutoScopeProvider, and HexDiAsyncContainerProvider.
 *
 * @packageDocumentation
 */

import type { ReactNode, ComponentType } from "react";
import type { Port } from "@hex-di/ports";
import type { Container } from "@hex-di/runtime";
import type { Resolver } from "./core.js";

// =============================================================================
// HexDiContainerProvider Props
// =============================================================================

/**
 * Props for the HexDiContainerProvider component.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 */
export interface HexDiContainerProviderProps<TProvides extends Port<unknown, string>> {
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
// HexDiScopeProvider Props
// =============================================================================

/**
 * Props for the HexDiScopeProvider component.
 *
 * @typeParam TProvides - Union of Port types that the scope can resolve
 *
 * @remarks
 * Accepts Resolver<TProvides> which is satisfied by both Container and Scope.
 * This allows passing the result of useScope() directly to HexDiScopeProvider.
 */
export interface HexDiScopeProviderProps<TProvides extends Port<unknown, string>> {
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
// HexDiAutoScopeProvider Props
// =============================================================================

/**
 * Props for the HexDiAutoScopeProvider component.
 */
export interface HexDiAutoScopeProviderProps {
  /**
   * Optional custom name for the scope (for DevTools identification).
   * If not provided, an auto-generated name like "scope-0" will be used.
   */
  readonly name?: string;

  /**
   * React children that will resolve services from the auto-managed scope.
   */
  readonly children: ReactNode;
}

// =============================================================================
// HexDiAsyncContainerProvider Props
// =============================================================================

/**
 * Props for the HexDiAsyncContainerProvider component.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 * @typeParam TAsyncPorts - Union of Port types that require async initialization
 */
export interface HexDiAsyncContainerProviderProps<
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
 * Props for the HexDiAsyncContainerProvider.Loading compound component.
 */
export interface HexDiAsyncContainerLoadingProps {
  readonly children: ReactNode;
}

/**
 * Props for the HexDiAsyncContainerProvider.Error compound component.
 * Supports both static children and render prop pattern.
 */
export interface HexDiAsyncContainerErrorProps {
  readonly children: ReactNode | ((error: Error) => ReactNode);
}

/**
 * Props for the HexDiAsyncContainerProvider.Ready compound component.
 */
export interface HexDiAsyncContainerReadyProps {
  readonly children: ReactNode;
}

/**
 * Type for the HexDiAsyncContainerProvider component with compound components.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 * @typeParam TAsyncPorts - Union of Port types that require async initialization
 */
export interface HexDiAsyncContainerProviderComponent<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = Port<unknown, string>,
> {
  (props: HexDiAsyncContainerProviderProps<TProvides, TAsyncPorts>): ReactNode;
  Loading: ComponentType<HexDiAsyncContainerLoadingProps>;
  Error: ComponentType<HexDiAsyncContainerErrorProps>;
  Ready: ComponentType<HexDiAsyncContainerReadyProps>;
}
