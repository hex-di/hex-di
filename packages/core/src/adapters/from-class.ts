/**
 * fromClass - Fluent API for Class-Based Service Definition.
 *
 * This module provides a fluent builder pattern for defining services from
 * class constructors, reducing boilerplate for constructor injection while
 * maintaining full type safety.
 *
 * ## Design Pattern: Two-Stage Builder
 *
 * 1. `ClassAdapterBuilder` - Captures the class constructor, provides `.as()` method
 * 2. `ClassServiceBuilder` - Configures lifetime and dependencies, provides `.build()` terminal
 *
 * ## Example Usage
 *
 * ```typescript
 * class UserServiceImpl implements UserService {
 *   constructor(private db: Database, private logger: Logger) {}
 * }
 *
 * const [UserPort, UserAdapter] = fromClass(UserServiceImpl)
 *   .as<UserService>('UserService')
 *   .scoped()
 *   .requires(DatabasePort, LoggerPort)  // Order must match constructor
 *   .build();
 * ```
 *
 * @packageDocumentation
 */

import { createPort } from "../ports/factory.js";
import type { Port, DirectedPort } from "../ports/types.js";
import { createAdapter } from "./factory.js";
import type { Adapter, Lifetime, ResolvedDeps } from "./types.js";
import type { TupleToUnion } from "../utils/type-utilities.js";
import { SINGLETON, SCOPED, TRANSIENT, EMPTY_REQUIRES } from "./constants.js";
import type { Singleton, Scoped, Transient, False, EmptyRequires } from "./constants.js";

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Extracts service instances from deps in the order specified by requires.
 * @internal
 */
function extractServicesInOrder(
  deps: Record<string, unknown>,
  requires: readonly Port<unknown, string>[]
): unknown[] {
  return requires.map(port => deps[port.__portName]);
}

/**
 * Runtime representation of a class factory that doesn't carry phantom TService.
 * @internal
 */
interface ClassFactoryRuntime {
  (deps: Record<string, unknown>): unknown;
}

/**
 * Creates a factory function that instantiates a class with constructor injection.
 *
 * ## SAFETY DOCUMENTATION
 *
 * This function bridges the gap between typed ports and class constructors:
 *
 * - The returned factory function is typed as `(deps) => TService`
 * - At runtime, it extracts services from deps in port order and passes to constructor
 * - The user is responsible for ensuring port order matches constructor parameters
 *
 * This uses function overloads to provide the correct PUBLIC return type while
 * the IMPLEMENTATION works with `unknown` types internally. This is the same
 * pattern used in `ports/factory.ts` for `unsafeCreatePort`.
 *
 * ## Why This Is Safe
 *
 * The TService type parameter is a phantom type - it only exists at compile time.
 * At runtime, the factory just calls `new classConstructor(...args)` and returns
 * whatever the constructor returns. The user is responsible for ensuring that:
 * 1. The class constructor returns something assignable to TService
 * 2. The ports in requires match the constructor parameter order
 *
 * @internal
 */
function createClassFactory<TService, TRequires extends readonly Port<unknown, string>[]>(
  classConstructor: new (...args: readonly unknown[]) => unknown,
  requires: TRequires
): (deps: ResolvedDeps<TupleToUnion<TRequires>>) => TService;
function createClassFactory(
  classConstructor: new (...args: readonly unknown[]) => unknown,
  requires: readonly Port<unknown, string>[]
): ClassFactoryRuntime {
  return (deps: Record<string, unknown>): unknown => {
    const args = extractServicesInOrder(deps, requires);
    return new classConstructor(...args);
  };
}

// =============================================================================
// ClassServiceBuilder Class
// =============================================================================

/**
 * A fluent builder for configuring class-based services.
 *
 * This builder is created by `ClassAdapterBuilder.as()` and provides:
 * - Lifetime configuration methods (singleton/scoped/transient)
 * - Dependency declaration via requires()
 * - Terminal build() method that creates [Port, Adapter] tuple
 *
 * @typeParam TService - The service interface type
 * @typeParam TName - The literal string port name
 * @typeParam TRequires - Accumulated port dependencies as readonly tuple
 * @typeParam TLifetime - Current lifetime setting
 */
export class ClassServiceBuilder<
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
   * The class constructor.
   * @internal
   */
  private readonly _classConstructor: new (...args: readonly unknown[]) => unknown;

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
   * Private constructor enforces use of ClassAdapterBuilder.as().
   * @internal
   */
  constructor(
    name: TName,
    classConstructor: new (...args: readonly unknown[]) => unknown,
    requires: TRequires,
    lifetime: TLifetime
  ) {
    this._name = name;
    this._classConstructor = classConstructor;
    this._requires = requires;
    this._lifetime = lifetime;
    Object.freeze(this);
  }

  // ===========================================================================
  // Lifetime Methods
  // ===========================================================================

  /**
   * Sets the lifetime to singleton (one instance per container).
   */
  singleton(): ClassServiceBuilder<TService, TName, TRequires, Singleton> {
    return new ClassServiceBuilder(this._name, this._classConstructor, this._requires, SINGLETON);
  }

  /**
   * Sets the lifetime to scoped (one instance per scope).
   */
  scoped(): ClassServiceBuilder<TService, TName, TRequires, Scoped> {
    return new ClassServiceBuilder(this._name, this._classConstructor, this._requires, SCOPED);
  }

  /**
   * Sets the lifetime to transient (new instance every resolution).
   */
  transient(): ClassServiceBuilder<TService, TName, TRequires, Transient> {
    return new ClassServiceBuilder(this._name, this._classConstructor, this._requires, TRANSIENT);
  }

  // ===========================================================================
  // requires() Method
  // ===========================================================================

  /**
   * Specifies the port dependencies for this service.
   *
   * **IMPORTANT**: The order of ports must match the constructor parameter order.
   * TypeScript cannot infer the relationship between ports and constructor parameters,
   * so this is the user's responsibility.
   *
   * @example
   * ```typescript
   * class UserServiceImpl {
   *   constructor(
   *     private db: Database,    // First parameter
   *     private logger: Logger   // Second parameter
   *   ) {}
   * }
   *
   * fromClass(UserServiceImpl)
   *   .as<UserService>('UserService')
   *   .requires(DatabasePort, LoggerPort)  // Order must match!
   *   .build();
   * ```
   *
   * @param ports - The ports this service depends on, in constructor parameter order
   */
  requires<const TPorts extends readonly Port<unknown, string>[]>(
    ...ports: TPorts
  ): ClassServiceBuilder<TService, TName, TPorts, TLifetime> {
    return new ClassServiceBuilder(this._name, this._classConstructor, ports, this._lifetime);
  }

  // ===========================================================================
  // build() Terminal Method
  // ===========================================================================

  /**
   * Completes the builder and returns a [Port, Adapter] tuple.
   *
   * This terminal method:
   * 1. Creates a port using the configured name
   * 2. Creates a class adapter with constructor injection
   * 3. Returns a frozen tuple of [Port, Adapter]
   *
   * @returns Frozen tuple of [Port, Adapter] with correct types
   */
  build(): readonly [
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

    // Create a factory function that instantiates the class with constructor injection.
    // The createClassFactory helper uses overloads to bridge the type gap.
    const factory = createClassFactory<TService, TRequires>(this._classConstructor, this._requires);

    const adapter = createAdapter({
      provides: port,
      requires: this._requires,
      lifetime: this._lifetime,
      factory,
    });

    return Object.freeze([port, adapter]);
  }
}

// =============================================================================
// ClassAdapterBuilder Class
// =============================================================================

/**
 * Initial builder that captures a class constructor.
 *
 * This builder provides a single method `.as()` that names the service
 * and optionally narrows the interface type.
 *
 * @typeParam TInstance - The class instance type (inferred from constructor)
 */
export class ClassAdapterBuilder<TInstance> {
  /**
   * The class constructor.
   * @internal
   */
  private readonly _classConstructor: new (...args: readonly unknown[]) => unknown;

  /**
   * Private constructor enforces use of static create().
   * @internal
   */
  private constructor(cls: new (...args: readonly unknown[]) => unknown) {
    this._classConstructor = cls;
    Object.freeze(this);
  }

  /**
   * Creates a ClassAdapterBuilder for a class constructor.
   *
   * Uses function overloads to compute the instance type from the class
   * while storing the constructor with a loose type internally.
   *
   * @param cls - The class constructor
   * @returns A new ClassAdapterBuilder instance
   *
   * @internal Use fromClass() instead
   */
  static create<T extends new (...args: readonly unknown[]) => unknown>(
    cls: T
  ): ClassAdapterBuilder<InstanceType<T>>;
  static create(cls: new (...args: readonly unknown[]) => unknown): ClassAdapterBuilder<unknown> {
    return new ClassAdapterBuilder(cls);
  }

  /**
   * Names the service and optionally narrows the interface type.
   *
   * This method uses the curried overload pattern to enable type narrowing:
   * - Without type param: TService defaults to TInstance (the class type)
   * - With type param: TService can be any interface that TInstance implements
   *
   * ## Safety
   *
   * It's the user's responsibility to ensure that if they specify TService,
   * the class actually implements that interface. TypeScript enforces this
   * at the call site through the `TService extends TInstance` constraint.
   *
   * @typeParam TService - The service interface type (defaults to TInstance)
   * @typeParam TName - The literal string port name
   * @param name - The unique name for this service
   * @returns A ClassServiceBuilder for further configuration
   *
   * @example Interface narrowing
   * ```typescript
   * class ConsoleLogger implements Logger {
   *   log(msg: string) { console.log(msg); }
   * }
   *
   * // Without narrowing: TService = ConsoleLogger
   * fromClass(ConsoleLogger).as('Logger')
   *
   * // With narrowing: TService = Logger (interface)
   * fromClass(ConsoleLogger).as<Logger>('Logger')
   * ```
   */
  as<TService extends TInstance, const TName extends string>(
    name: TName
  ): ClassServiceBuilder<TService, TName, EmptyRequires, Singleton>;
  as<const TName extends string>(
    name: TName
  ): ClassServiceBuilder<TInstance, TName, EmptyRequires, Singleton>;
  as<const TName extends string>(
    name: TName
  ): ClassServiceBuilder<unknown, TName, EmptyRequires, Singleton> {
    return new ClassServiceBuilder(name, this._classConstructor, EMPTY_REQUIRES, SINGLETON);
  }
}

// =============================================================================
// fromClass Entry Point
// =============================================================================

/**
 * Creates a fluent builder for class-based service definition.
 *
 * This function starts a builder chain that ends with a [Port, Adapter] tuple.
 * It's the recommended way to create adapters for class constructors with
 * dependency injection.
 *
 * ## Usage Pattern
 *
 * ```typescript
 * const [Port, Adapter] = fromClass(MyClass)
 *   .as<MyInterface>('ServiceName')
 *   .scoped()  // or .singleton() or .transient()
 *   .requires(DependencyPort1, DependencyPort2)  // Order matches constructor!
 *   .build();
 * ```
 *
 * ## Important Notes
 *
 * 1. **Order matters**: The ports passed to `.requires()` must be in the same
 *    order as the constructor parameters. TypeScript cannot verify this.
 *
 * 2. **Interface narrowing**: Use `.as<Interface>('Name')` to expose only the
 *    interface, not the implementation class.
 *
 * 3. **No factory**: Unlike ServiceBuilder, there's no `.factory()` method.
 *    The class constructor IS the factory.
 *
 * @param cls - The class constructor
 * @returns A ClassAdapterBuilder for fluent configuration
 *
 * @example No dependencies
 * ```typescript
 * class ConsoleLogger implements Logger {
 *   log(msg: string) { console.log(msg); }
 * }
 *
 * const [LoggerPort, LoggerAdapter] = fromClass(ConsoleLogger)
 *   .as<Logger>('Logger')
 *   .singleton()
 *   .build();
 * ```
 *
 * @example With dependencies
 * ```typescript
 * class UserServiceImpl implements UserService {
 *   constructor(
 *     private db: Database,
 *     private logger: Logger
 *   ) {}
 * }
 *
 * const [UserPort, UserAdapter] = fromClass(UserServiceImpl)
 *   .as<UserService>('UserService')
 *   .scoped()
 *   .requires(DatabasePort, LoggerPort)
 *   .build();
 * ```
 */
export function fromClass<T extends new (...args: readonly unknown[]) => unknown>(
  cls: T
): ClassAdapterBuilder<InstanceType<T>> {
  return ClassAdapterBuilder.create(cls);
}
