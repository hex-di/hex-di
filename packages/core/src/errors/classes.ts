/**
 * Concrete error classes for HexDI.
 *
 * @packageDocumentation
 */

import { ContainerError, extractErrorMessage } from "./base.js";

// =============================================================================
// CircularDependencyError
// =============================================================================

/**
 * Error thrown when a circular dependency is detected during resolution.
 *
 * Circular dependencies occur when Service A depends on Service B,
 * and Service B (directly or indirectly) depends back on Service A.
 *
 * @remarks
 * - This is always a programming error - the dependency graph must be acyclic
 * - The `dependencyChain` property shows the full cycle for debugging
 * - Detection occurs lazily at resolution time, not at container creation
 *
 * @example
 * ```typescript
 * // If UserService -> AuthService -> UserService exists:
 * try {
 *   container.resolve(UserServicePort);
 * } catch (error) {
 *   if (error instanceof CircularDependencyError) {
 *     console.log(error.dependencyChain);
 *     // ['UserService', 'AuthService', 'UserService']
 *   }
 * }
 * ```
 */
export class CircularDependencyError extends ContainerError {
  readonly _tag = "CircularDependency";
  readonly code = "CIRCULAR_DEPENDENCY" as const;
  readonly isProgrammingError = true as const;

  /**
   * The chain of dependencies that form the cycle.
   * The first and last elements are the same, showing where the cycle closes.
   */
  readonly dependencyChain: readonly string[];

  /**
   * Creates a new CircularDependencyError.
   *
   * @param dependencyChain - Array of port names forming the cycle.
   */
  constructor(dependencyChain: readonly string[]) {
    const formattedChain = dependencyChain.join(" -> ");
    super(`Circular dependency detected: ${formattedChain}`);
    this.dependencyChain = Object.freeze([...dependencyChain]);
    Object.freeze(this);
  }
}

// =============================================================================
// FactoryError
// =============================================================================

/**
 * Error thrown when an adapter's factory function throws during instance creation.
 *
 * This error wraps the original exception thrown by the factory, providing
 * context about which port's factory failed.
 *
 * @remarks
 * - This is NOT a programming error - factory failures are runtime conditions
 * - The `cause` property contains the original exception for investigation
 *
 * @example
 * ```typescript
 * try {
 *   container.resolve(DatabasePort);
 * } catch (error) {
 *   if (error instanceof FactoryError) {
 *     console.log(`Factory for ${error.portName} failed`);
 *     console.log('Original error:', error.cause);
 *   }
 * }
 * ```
 */
export class FactoryError extends ContainerError {
  readonly _tag = "FactoryFailed";
  readonly code = "FACTORY_FAILED" as const;
  readonly isProgrammingError = false as const;

  /**
   * The name of the port whose factory failed.
   */
  readonly portName: string;

  /**
   * The original exception thrown by the factory function.
   */
  readonly cause: unknown;

  /**
   * Creates a new FactoryError.
   *
   * @param portName - The name of the port whose factory threw
   * @param cause - The original exception thrown by the factory
   */
  constructor(portName: string, cause: unknown) {
    const causeMessage = extractErrorMessage(cause);
    super(`Factory for port '${portName}' threw: ${causeMessage}`);
    this.portName = portName;
    this.cause = cause;
    Object.freeze(this);
  }
}

// =============================================================================
// DisposedScopeError
// =============================================================================

/**
 * Error thrown when attempting to resolve a service from a disposed scope or container.
 *
 * Once a scope or container is disposed, it cannot be used to resolve services.
 *
 * @remarks
 * - This is a programming error - code should not use disposed containers
 *
 * @example
 * ```typescript
 * const scope = container.createScope();
 * await scope.dispose();
 *
 * // This will throw DisposedScopeError:
 * scope.resolve(UserServicePort);
 * ```
 */
export class DisposedScopeError extends ContainerError {
  readonly _tag = "DisposedScope";
  readonly code = "DISPOSED_SCOPE" as const;
  readonly isProgrammingError = true as const;

  /**
   * The name of the port that was attempted to be resolved.
   */
  readonly portName: string;

  /**
   * Creates a new DisposedScopeError.
   *
   * @param portName - The name of the port that was attempted to be resolved
   */
  constructor(portName: string) {
    super(
      `Cannot resolve port '${portName}' from a disposed scope. ` +
        `The scope has already been disposed and cannot be used for resolution.`
    );
    this.portName = portName;
    Object.freeze(this);
  }
}

// =============================================================================
// ScopeRequiredError
// =============================================================================

/**
 * Error thrown when attempting to resolve a scoped port from the root container.
 *
 * Scoped ports have a lifetime tied to a specific scope. They cannot be resolved
 * from the root container because there is no scope to own their lifetime.
 *
 * @remarks
 * - This is a programming error - use createScope() for scoped dependencies
 *
 * @example
 * ```typescript
 * // UserContextPort is configured with 'scoped' lifetime
 *
 * // This will throw ScopeRequiredError:
 * container.resolve(UserContextPort);
 *
 * // Correct usage:
 * const scope = container.createScope();
 * const userContext = scope.resolve(UserContextPort);
 * ```
 */
export class ScopeRequiredError extends ContainerError {
  readonly _tag = "ScopeRequired";
  readonly code = "SCOPE_REQUIRED" as const;
  readonly isProgrammingError = true as const;

  /**
   * The name of the scoped port that was attempted to be resolved.
   */
  readonly portName: string;

  /**
   * Creates a new ScopeRequiredError.
   *
   * @param portName - The name of the scoped port that was attempted to be resolved
   */
  constructor(portName: string) {
    super(
      `Cannot resolve scoped port '${portName}' from the root container. ` +
        `Scoped ports must be resolved from a scope created via createScope().`
    );
    this.portName = portName;
    Object.freeze(this);
  }
}

// =============================================================================
// AsyncFactoryError
// =============================================================================

/**
 * Error thrown when an async adapter's factory function throws during instance creation.
 *
 * This error wraps the original exception thrown by the async factory, providing
 * context about which port's factory failed.
 *
 * @remarks
 * - This is NOT a programming error - async factory failures are runtime conditions
 * - The `cause` property contains the original exception for investigation
 *
 * @example
 * ```typescript
 * try {
 *   await container.resolveAsync(DatabasePort);
 * } catch (error) {
 *   if (error instanceof AsyncFactoryError) {
 *     console.log(`Async factory for ${error.portName} failed`);
 *     console.log('Original error:', error.cause);
 *   }
 * }
 * ```
 */
export class AsyncFactoryError extends ContainerError {
  readonly _tag = "AsyncFactoryFailed";
  readonly code = "ASYNC_FACTORY_FAILED" as const;
  readonly isProgrammingError = false as const;

  /**
   * The name of the port whose async factory failed.
   */
  readonly portName: string;

  /**
   * The original exception thrown by the async factory function.
   */
  readonly cause: unknown;

  /**
   * Creates a new AsyncFactoryError.
   *
   * @param portName - The name of the port whose async factory threw
   * @param cause - The original exception thrown by the factory
   */
  constructor(portName: string, cause: unknown) {
    const causeMessage = extractErrorMessage(cause);
    super(`Async factory for port '${portName}' failed: ${causeMessage}`);
    this.portName = portName;
    this.cause = cause;
    Object.freeze(this);
  }
}

// =============================================================================
// AsyncInitializationRequiredError
// =============================================================================

/**
 * Error thrown when attempting to synchronously resolve an async port before initialization.
 *
 * Async ports (those with async factories) require either:
 * - Async resolution via resolveAsync(), or
 * - Container initialization via initialize() before sync resolve
 *
 * @remarks
 * - This is a programming error - use resolveAsync() or call initialize() first
 *
 * @example
 * ```typescript
 * // DatabasePort has an async factory
 * const container = createContainer(graph);
 *
 * // This will throw AsyncInitializationRequiredError:
 * container.resolve(DatabasePort);
 *
 * // Solution 1: Use async resolution
 * const db = await container.resolveAsync(DatabasePort);
 *
 * // Solution 2: Initialize first, then sync resolve
 * const initialized = await container.initialize();
 * const db = initialized.resolve(DatabasePort);
 * ```
 */
export class AsyncInitializationRequiredError extends ContainerError {
  readonly _tag = "AsyncInitRequired";
  readonly code = "ASYNC_INIT_REQUIRED" as const;
  readonly isProgrammingError = true as const;

  /**
   * The name of the async port that was attempted to be resolved synchronously.
   */
  readonly portName: string;

  /**
   * Creates a new AsyncInitializationRequiredError.
   *
   * @param portName - The name of the async port that was attempted to be resolved
   */
  constructor(portName: string) {
    super(
      `Cannot resolve async port '${portName}' synchronously. ` +
        `Use resolveAsync() or call container.initialize() first.`
    );
    this.portName = portName;
    Object.freeze(this);
  }
}

// =============================================================================
// NonClonableForkedError
// =============================================================================

/**
 * Error thrown when attempting to use forked inheritance mode with a non-clonable adapter.
 *
 * Forked inheritance mode creates a shallow clone of the parent's service instance.
 * This is only safe for services that don't contain resource handles (sockets,
 * file handles, connections) or external references that would become shared.
 *
 * @remarks
 * - This is a programming error - the adapter must be marked as clonable
 * - Use `clonable: true` when defining the adapter if shallow cloning is safe
 *
 * @example
 * ```typescript
 * // DatabaseAdapter is NOT marked as clonable (has socket resource)
 * const child = parent.createChild({
 *   inherit: { Database: 'forked' }  // This will throw NonClonableForkedError
 * });
 *
 * // Solutions:
 * // 1. Use shared mode (share parent's connection):
 * parent.createChild({ inherit: { Database: 'shared' } });
 *
 * // 2. Use isolated mode (create new connection):
 * parent.createChild({ inherit: { Database: 'isolated' } });
 *
 * // 3. Mark adapter as clonable if shallow cloning is safe:
 * const LoggerAdapter = createAdapter({
 *   provides: LoggerPort,
 *   factory: () => new ConsoleLogger(),
 *   clonable: true,  // ← Safe to shallow clone
 * });
 * ```
 */
export class NonClonableForkedError extends ContainerError {
  readonly _tag = "NonClonableForked";
  readonly code = "NON_CLONABLE_FORKED" as const;
  readonly isProgrammingError = true as const;

  /**
   * The name of the port that was attempted to be forked.
   */
  readonly portName: string;

  /**
   * Creates a new NonClonableForkedError.
   *
   * @param portName - The name of the port that cannot be forked
   */
  constructor(portName: string) {
    super(
      `Cannot use forked inheritance for port '${portName}': adapter is not marked as clonable. ` +
        `Use 'shared' or 'isolated' mode, or mark the adapter as clonable if shallow cloning is safe.`
    );
    this.portName = portName;
    Object.freeze(this);
  }
}
