/**
 * Core type definitions for @hex-di/react.
 *
 * This module exports the Resolver interface which abstracts over Container
 * and Scope, solving phase-dependent conditional type union issues.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { Container, Scope } from "@hex-di/runtime";

// =============================================================================
// Resolver Type
// =============================================================================

/**
 * A type-safe resolver interface that abstracts over Container and Scope.
 *
 * This type captures the common resolution capability needed by React hooks
 * without exposing phase-dependent conditional types that cause union
 * incompatibility when creating `Container | Scope` unions.
 *
 * **Problem Solved:**
 * Container and Scope have phase-dependent `resolve` signatures:
 * ```typescript
 * // Initialized: resolve<P extends TProvides>(port: P) => InferService<P>
 * // Uninitialized: resolve<P extends Exclude<TProvides, TAsyncPorts>>(port: P) => InferService<P>
 * ```
 * A union of these produces "This expression is not callable" because TypeScript
 * sees two incompatible function overloads.
 *
 * **Solution:**
 * Define an interface with a single, non-conditional `resolve` signature.
 * Both Container and Scope structurally satisfy this interface when initialized.
 *
 * **Design Decision:**
 * We use the most permissive signature (all TProvides resolvable) because:
 * 1. React hooks are typically used with initialized containers
 * 2. AsyncContainerProvider ensures initialization before children render
 * 3. For uninitialized usage, runtime errors provide the safety net
 *
 * @typeParam TProvides - Union of Port types that can be resolved
 *
 * @remarks
 * This type is structural - any object with matching methods satisfies it.
 * No type casts are needed when assigning Container or Scope to Resolver.
 */
export interface Resolver<TProvides extends Port<unknown, string>> {
  /**
   * Resolves a service instance for the given port synchronously.
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns The service instance for the given port
   */
  resolve<P extends TProvides>(port: P): InferService<P>;

  /**
   * Resolves a service instance for the given port asynchronously.
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns A promise that resolves to the service instance
   */
  resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>>;

  /**
   * Creates a child scope for managing scoped service lifetimes.
   *
   * @param name - Optional custom name for the scope (for DevTools identification)
   * @returns A new resolver (Scope) for the child scope
   */
  createScope(name?: string): Resolver<TProvides>;

  /**
   * Disposes the resolver and all its cached instances.
   *
   * After disposal, resolve() will throw DisposedScopeError.
   * Finalizers are called in LIFO order (last created first disposed).
   *
   * @returns A promise that resolves when disposal is complete
   */
  dispose(): Promise<void>;

  /**
   * Whether the resolver has been disposed.
   *
   * After disposal, resolve() will throw DisposedScopeError.
   */
  readonly isDisposed: boolean;
}

/**
 * Type-level utility to extract a Resolver type from a Container or Scope.
 *
 * Uses conditional type inference to extract TProvides and return
 * a Resolver interface that both Container and Scope can satisfy.
 *
 * @typeParam T - A Container or Scope type
 * @returns Resolver<TProvides> if T is a valid Container or Scope, never otherwise
 *
 * @example
 * ```typescript
 * type AppContainer = Container<typeof LoggerPort | typeof DbPort>;
 * type AppResolver = ToResolver<AppContainer>;
 * // Resolver<typeof LoggerPort | typeof DbPort>
 * ```
 */
export type ToResolver<T> =
  T extends Container<infer P, infer _TExtends, infer _TAsync, infer _TPhase>
    ? Resolver<P>
    : T extends Scope<infer P, infer _TAsync, infer _TPhase>
      ? Resolver<P>
      : never;
