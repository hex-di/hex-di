/**
 * ServiceBuilder - Fluent API for Service Definition.
 *
 * This module provides a fluent builder pattern for defining services,
 * reducing boilerplate while maintaining full type safety.
 *
 * ## Design Pattern: Immutable Fluent Builder with Phantom Types
 *
 * ServiceBuilder uses the type-state pattern where each method returns a
 * NEW instance with updated type parameters:
 * - `TService`: The service interface type
 * - `TName`: The literal string port name
 * - `TRequires`: Accumulated port dependencies tuple
 * - `TLifetime`: Current lifetime setting
 *
 * ## Example Usage
 *
 * ```typescript
 * // Simple service (no dependencies, singleton)
 * const [LoggerPort, LoggerAdapter] = ServiceBuilder
 *   .create<Logger>()('Logger')
 *   .factory(() => new ConsoleLogger());
 *
 * // With dependencies and custom lifetime
 * const [UserServicePort, UserServiceAdapter] = ServiceBuilder
 *   .create<UserService>()('UserService')
 *   .scoped()
 *   .requires(LoggerPort, DatabasePort)
 *   .factory(({ Logger, Database }) => new UserServiceImpl(Logger, Database));
 * ```
 *
 * @packageDocumentation
 */

import type { Port, DirectedPort } from "../ports/types.js";
import { createPort } from "../ports/factory.js";
import { createAdapter } from "./factory.js";
import type { Adapter, Lifetime, ResolvedDeps } from "./types.js";
import type { TupleToUnion } from "../utils/type-utilities.js";
import { SINGLETON, SCOPED, TRANSIENT, EMPTY_REQUIRES } from "./constants.js";
import type { Singleton, Scoped, Transient, False, EmptyRequires } from "./constants.js";

// =============================================================================
// ServiceBuilder Class
// =============================================================================

/**
 * A fluent builder for defining services with compile-time type tracking.
 *
 * ServiceBuilder uses phantom type parameters to track state at compile time:
 * - Each method returns a NEW frozen instance (immutable builder pattern)
 * - Type parameters evolve with each method call
 * - Terminal `factory()` method produces [Port, Adapter] tuple
 *
 * @typeParam TService - The service interface type
 * @typeParam TName - The literal string port name
 * @typeParam TRequires - Accumulated port dependencies as readonly tuple
 * @typeParam TLifetime - Current lifetime setting ("singleton" | "scoped" | "transient")
 */
export class ServiceBuilder<
  TService,
  TName extends string,
  TRequires extends readonly Port<unknown, string>[],
  TLifetime extends Lifetime,
> {
  /**
   * The port name for the service.
   * @internal
   */
  private readonly _name: TName;

  /**
   * The dependencies required by this service.
   * @internal
   */
  private readonly _requires: TRequires;

  /**
   * The lifetime scope for this service.
   * @internal
   */
  private readonly _lifetime: TLifetime;

  /**
   * Private constructor enforces use of static factory methods.
   * Uses Object.freeze for immutability.
   * @internal
   */
  private constructor(name: TName, requires: TRequires, lifetime: TLifetime) {
    this._name = name;
    this._requires = requires;
    this._lifetime = lifetime;
    Object.freeze(this);
  }

  // ===========================================================================
  // Static Factory - Curried for Partial Type Application
  // ===========================================================================

  /**
   * Creates a new ServiceBuilder factory for a given service type.
   *
   * This uses the curried function pattern to enable partial type application:
   * - First call: Specify the service type `TService`
   * - Second call: Provide the port name (inferred as literal type)
   *
   * @typeParam TService - The service interface type
   * @returns A function that accepts the port name and returns a ServiceBuilder
   *
   * @example
   * ```typescript
   * // Service type is explicit, name is inferred
   * const builder = ServiceBuilder.create<Logger>()('Logger');
   * ```
   */
  static create<TService>() {
    return <const TName extends string>(
      name: TName
    ): ServiceBuilder<TService, TName, EmptyRequires, Singleton> => {
      return new ServiceBuilder<TService, TName, EmptyRequires, Singleton>(
        name,
        EMPTY_REQUIRES,
        SINGLETON
      );
    };
  }

  // ===========================================================================
  // Lifetime Methods - Return New Instance with Updated TLifetime
  // ===========================================================================

  /**
   * Sets the lifetime to singleton (one instance per container).
   *
   * @returns New ServiceBuilder with lifetime set to "singleton"
   *
   * @example
   * ```typescript
   * ServiceBuilder.create<Logger>()('Logger')
   *   .singleton()  // Explicit singleton (same as default)
   *   .factory(() => new ConsoleLogger());
   * ```
   */
  singleton(): ServiceBuilder<TService, TName, TRequires, Singleton> {
    return new ServiceBuilder<TService, TName, TRequires, Singleton>(
      this._name,
      this._requires,
      SINGLETON
    );
  }

  /**
   * Sets the lifetime to scoped (one instance per scope).
   *
   * @returns New ServiceBuilder with lifetime set to "scoped"
   *
   * @example
   * ```typescript
   * ServiceBuilder.create<RequestContext>()('RequestContext')
   *   .scoped()
   *   .factory(() => new RequestContextImpl());
   * ```
   */
  scoped(): ServiceBuilder<TService, TName, TRequires, Scoped> {
    return new ServiceBuilder<TService, TName, TRequires, Scoped>(
      this._name,
      this._requires,
      SCOPED
    );
  }

  /**
   * Sets the lifetime to transient (new instance every resolution).
   *
   * @returns New ServiceBuilder with lifetime set to "transient"
   *
   * @example
   * ```typescript
   * ServiceBuilder.create<RequestId>()('RequestId')
   *   .transient()
   *   .factory(() => generateUUID());
   * ```
   */
  transient(): ServiceBuilder<TService, TName, TRequires, Transient> {
    return new ServiceBuilder<TService, TName, TRequires, Transient>(
      this._name,
      this._requires,
      TRANSIENT
    );
  }

  // ===========================================================================
  // requires() Method - Capture Dependencies
  // ===========================================================================

  /**
   * Specifies the port dependencies for this service.
   *
   * Uses rest parameters for ergonomic API and `const` type parameter
   * to preserve the literal tuple type.
   *
   * @typeParam TPorts - The tuple type of required ports
   * @param ports - The ports this service depends on
   * @returns New ServiceBuilder with TPorts as TRequires
   *
   * @example
   * ```typescript
   * ServiceBuilder.create<UserService>()('UserService')
   *   .requires(LoggerPort, DatabasePort)
   *   .factory(({ Logger, Database }) => new UserServiceImpl(Logger, Database));
   * ```
   */
  requires<const TPorts extends readonly Port<unknown, string>[]>(
    ...ports: TPorts
  ): ServiceBuilder<TService, TName, TPorts, TLifetime> {
    return new ServiceBuilder<TService, TName, TPorts, TLifetime>(
      this._name,
      ports,
      this._lifetime
    );
  }

  // ===========================================================================
  // factory() Terminal Method - Produce [Port, Adapter] Tuple
  // ===========================================================================

  /**
   * Completes the builder and returns a [Port, Adapter] tuple.
   *
   * This is the terminal method that:
   * 1. Creates a port using the configured name
   * 2. Creates an adapter with the factory function and all configured options
   * 3. Returns a frozen tuple of [Port, Adapter]
   *
   * @param fn - Factory function that receives resolved dependencies and returns the service
   * @returns Frozen tuple of [Port, Adapter] with correct types
   *
   * @example
   * ```typescript
   * const [LoggerPort, LoggerAdapter] = ServiceBuilder
   *   .create<Logger>()('Logger')
   *   .factory(() => new ConsoleLogger());
   *
   * // With dependencies - factory receives typed deps object
   * const [UserServicePort, UserServiceAdapter] = ServiceBuilder
   *   .create<UserService>()('UserService')
   *   .requires(LoggerPort, DatabasePort)
   *   .factory(({ Logger, Database }) => new UserServiceImpl(Logger, Database));
   * ```
   */
  factory(
    fn: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService
  ): readonly [
    DirectedPort<TService, TName, "outbound">,
    Adapter<
      DirectedPort<TService, TName, "outbound">,
      TupleToUnion<TRequires>,
      TLifetime,
      "sync",
      False,
      TRequires
    >,
  ] {
    const port = createPort<TService, TName>({ name: this._name });

    const adapter = createAdapter({
      provides: port,
      requires: this._requires,
      lifetime: this._lifetime,
      factory: fn,
    });

    return Object.freeze([port, adapter]);
  }
}
