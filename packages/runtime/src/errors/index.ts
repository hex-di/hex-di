/**
 * Container error hierarchy for @hex-di/runtime.
 *
 * All container-related errors extend the abstract ContainerError base class,
 * providing consistent error structure with:
 * - `code`: Stable string constant for programmatic handling
 * - `isProgrammingError`: Boolean indicating if error is a programming mistake
 * - Contextual information specific to each error type
 *
 * @packageDocumentation
 */

// V8-specific Error.captureStackTrace type
// We use a type alias to type the V8-specific static method without conflicts
type V8ErrorConstructor = typeof Error & {
  captureStackTrace?(targetObject: object, constructorOpt?: unknown): void;
};

// =============================================================================
// Error Message Extraction
// =============================================================================

/**
 * Checks if a value is an object with a string `message` property.
 * Used to detect error-like objects that don't extend Error.
 */
function hasMessageProperty(value: unknown): value is { message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as { message: unknown }).message === "string"
  );
}

/**
 * Extracts a human-readable error message from an unknown thrown value.
 *
 * Handles:
 * 1. Standard Error instances → uses error.message
 * 2. Objects with `message` property → uses the message property
 * 3. Other values → converts to string
 *
 * This properly handles custom error objects that have a `message` property
 * but don't extend Error (e.g., from external libraries or serialized errors).
 */
function extractErrorMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  if (hasMessageProperty(cause)) {
    return cause.message;
  }
  return String(cause);
}

// =============================================================================
// ContainerError Abstract Base Class
// =============================================================================

/**
 * Abstract base class for all container-related errors.
 *
 * Provides a consistent structure for error handling with:
 * - `code`: A stable string constant for programmatic error identification
 * - `isProgrammingError`: Indicates whether this error represents a programming
 *   mistake (true) or a runtime condition (false)
 *
 * @remarks
 * - All concrete error classes must extend this base class
 * - The `name` getter returns the concrete class name for stack traces
 * - Uses `Error.captureStackTrace` when available for cleaner stack traces
 *
 * @example
 * ```typescript
 * try {
 *   container.resolve(SomePort);
 * } catch (error) {
 *   if (error instanceof ContainerError) {
 *     console.log(`Error code: ${error.code}`);
 *     if (error.isProgrammingError) {
 *       // This is a bug in the application code
 *     }
 *   }
 * }
 * ```
 */
export abstract class ContainerError extends Error {
  /**
   * A stable string constant identifying the error type.
   * Suitable for programmatic error handling and logging.
   */
  abstract readonly code: string;

  /**
   * Indicates whether this error represents a programming mistake.
   *
   * - `true`: The error is caused by incorrect usage (e.g., circular dependency,
   *   resolving from disposed scope, missing scope). These should be fixed in code.
   * - `false`: The error is caused by runtime conditions (e.g., factory threw).
   *   These may be recoverable or require operational handling.
   */
  abstract readonly isProgrammingError: boolean;

  /**
   * Creates a new ContainerError instance.
   *
   * @param message - The error message describing what went wrong
   */
  constructor(message: string) {
    super(message);

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace excluding this constructor for cleaner traces
    // Note: captureStackTrace is V8-specific (Node.js, Chrome)
    const ErrorWithCapture: V8ErrorConstructor = Error;
    if (typeof ErrorWithCapture.captureStackTrace === "function") {
      ErrorWithCapture.captureStackTrace(this, new.target);
    }
  }

  /**
   * Returns the concrete class name for this error.
   * Used in stack traces and error logging.
   */
  override get name(): string {
    return this.constructor.name;
  }
}

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
   *   The first and last elements should be identical to show the cycle.
   */
  constructor(dependencyChain: readonly string[]) {
    const formattedChain = dependencyChain.join(" -> ");
    super(`Circular dependency detected: ${formattedChain}`);

    // Store a defensive copy of the chain
    this.dependencyChain = Object.freeze([...dependencyChain]);
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
 * - The error message includes both the port name and original error message
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
  readonly code = "FACTORY_FAILED" as const;
  readonly isProgrammingError = false as const;

  /**
   * The name of the port whose factory failed.
   */
  readonly portName: string;

  /**
   * The original exception thrown by the factory function.
   * Can be any value since JavaScript allows throwing non-Error values.
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
  }
}

// =============================================================================
// DisposedScopeError
// =============================================================================

/**
 * Error thrown when attempting to resolve a service from a disposed scope or container.
 *
 * Once a scope or container is disposed, it cannot be used to resolve services.
 * This prevents use-after-dispose bugs and resource leaks.
 *
 * @remarks
 * - This is a programming error - code should not use disposed containers
 * - Typically occurs when scope lifetime is not properly managed
 * - Check your scope lifecycle management if this error occurs
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
 * - Indicates that the code is trying to resolve scoped services incorrectly
 * - The solution is to create a scope and resolve from there
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
 * - The error message includes both the port name and original error message
 * - Similar to FactoryError but specific to async factory resolution
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
  readonly code = "ASYNC_FACTORY_FAILED" as const;
  readonly isProgrammingError = false as const;

  /**
   * The name of the port whose async factory failed.
   */
  readonly portName: string;

  /**
   * The original exception thrown by the async factory function.
   * Can be any value since JavaScript allows throwing non-Error values.
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
 * - The container must be initialized before sync-resolving async ports
 * - Using resolveAsync() always works regardless of initialization state
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
 * - Use `.clonable()` when defining the adapter if shallow cloning is safe
 * - Alternative: use 'shared' (share parent's instance) or 'isolated' (create new via factory)
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
  }
}
