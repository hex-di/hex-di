/**
 * Container error hierarchy for @hex-di/runtime.
 *
 * All container-related errors extend the abstract ContainerError base class,
 * providing consistent error structure with:
 * - `code`: Stable string constant for programmatic handling
 * - `isProgrammingError`: Boolean indicating if error is a programming mistake
 * - `blame`: Optional blame context for error attribution
 * - Contextual information specific to each error type
 *
 * @packageDocumentation
 */

import type { BlameContext } from "@hex-di/core";
import { createBlameContext } from "@hex-di/core";

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
 * - `blame`: Optional blame context for error attribution
 *
 * @remarks
 * - All concrete error classes must extend this base class
 * - The `name` getter returns the concrete class name for stack traces
 * - Uses `Error.captureStackTrace` when available for cleaner stack traces
 */
export abstract class ContainerError extends Error {
  /**
   * A stable string constant identifying the error type.
   * Suitable for programmatic error handling and logging.
   */
  abstract readonly code: string;

  /**
   * Indicates whether this error represents a programming mistake.
   */
  abstract readonly isProgrammingError: boolean;

  /**
   * Optional actionable suggestion for fixing the error.
   */
  suggestion?: string;

  /**
   * Optional blame context identifying which adapter violated which port contract.
   * When present, the blame context is always frozen.
   */
  readonly blame?: BlameContext;

  /**
   * Creates a new ContainerError instance.
   *
   * @param message - The error message describing what went wrong
   * @param blame - Optional blame context for error attribution
   */
  constructor(message: string, blame?: BlameContext) {
    super(message);

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Freeze and attach blame context if provided
    if (blame !== undefined) {
      this.blame = createBlameContext(blame);
    }

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
   * @param blame - Optional blame context for error attribution
   */
  constructor(dependencyChain: readonly string[], blame?: BlameContext) {
    const formattedChain = dependencyChain.join(" -> ");
    super(`Circular dependency detected: ${formattedChain}`, blame);

    // Store a defensive copy of the chain
    this.dependencyChain = Object.freeze([...dependencyChain]);

    // Provide actionable fix suggestion
    this.suggestion =
      "To break the circular dependency, refactor your code:\n" +
      "1. Extract shared logic into a third service that both depend on\n" +
      "2. Pass data as parameters instead of injecting the service\n" +
      "3. Use lazy injection if one service only needs the other occasionally\n\n" +
      "Example - extract shared logic:\n" +
      "```typescript\n" +
      "// Before: A -> B -> A (circular)\n" +
      "// After:  A -> Shared, B -> Shared (no cycle)\n" +
      "const SharedLogicPort = definePort<SharedLogic>();\n" +
      "const SharedLogicAdapter = createAdapter({\n" +
      "  provides: SharedLogicPort,\n" +
      "  factory: () => new SharedLogic()\n" +
      "});\n" +
      "```";
  }
}

// =============================================================================
// FactoryError
// =============================================================================

/**
 * Error thrown when an adapter's factory function throws during instance creation.
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
   */
  readonly cause: unknown;

  /**
   * Creates a new FactoryError.
   *
   * @param portName - The name of the port whose factory threw
   * @param cause - The original exception thrown by the factory
   * @param blame - Optional blame context for error attribution
   */
  constructor(portName: string, cause: unknown, blame?: BlameContext) {
    const causeMessage = extractErrorMessage(cause);
    super(`Factory for port '${portName}' threw: ${causeMessage}`, blame);

    this.portName = portName;
    this.cause = cause;
  }
}

// =============================================================================
// DisposedScopeError
// =============================================================================

/**
 * Error thrown when attempting to resolve a service from a disposed scope or container.
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
   * @param blame - Optional blame context for error attribution
   */
  constructor(portName: string, blame?: BlameContext) {
    super(
      `Cannot resolve port '${portName}' from a disposed scope. ` +
        `The scope has already been disposed and cannot be used for resolution.`,
      blame
    );

    this.portName = portName;

    // Provide lifecycle management guidance
    this.suggestion =
      "Scope lifecycle management:\n" +
      "1. Check if the scope is disposed before using it\n" +
      "2. Don't store scope references beyond their intended lifetime\n" +
      "3. Use try/finally to ensure proper disposal timing\n\n" +
      "Example - check disposal state:\n" +
      "```typescript\n" +
      "const scope = container.createScope();\n" +
      "try {\n" +
      "  // Use scope for request lifetime\n" +
      "  const service = scope.resolve(ServicePort);\n" +
      "  await handleRequest(service);\n" +
      "} finally {\n" +
      "  await scope.dispose();\n" +
      "}\n" +
      "// Don't use scope here - it's disposed\n" +
      "```";
  }
}

// =============================================================================
// ScopeRequiredError
// =============================================================================

/**
 * Error thrown when attempting to resolve a scoped port from the root container.
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
   * @param blame - Optional blame context for error attribution
   */
  constructor(portName: string, blame?: BlameContext) {
    super(
      `Cannot resolve scoped port '${portName}' from the root container. ` +
        `Scoped ports must be resolved from a scope created via createScope().`,
      blame
    );

    this.portName = portName;

    // Provide scope creation example
    this.suggestion =
      "Create a scope before resolving scoped services:\n\n" +
      "Example:\n" +
      "```typescript\n" +
      "// Create a scope (typically per-request or per-operation)\n" +
      "const scope = container.createScope();\n\n" +
      "// Resolve scoped services from the scope\n" +
      `const service = scope.resolve(${portName});\n\n` +
      "// Use the service...\n\n" +
      "// Dispose the scope when done\n" +
      "await scope.dispose();\n" +
      "```";
  }
}

// =============================================================================
// AsyncFactoryError
// =============================================================================

/**
 * Error thrown when an async adapter's factory function throws during instance creation.
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
   */
  readonly cause: unknown;

  /**
   * Creates a new AsyncFactoryError.
   *
   * @param portName - The name of the port whose async factory threw
   * @param cause - The original exception thrown by the factory
   * @param blame - Optional blame context for error attribution
   */
  constructor(portName: string, cause: unknown, blame?: BlameContext) {
    const causeMessage = extractErrorMessage(cause);
    super(`Async factory for port '${portName}' failed: ${causeMessage}`, blame);

    this.portName = portName;
    this.cause = cause;
  }
}

// =============================================================================
// AsyncInitializationRequiredError
// =============================================================================

/**
 * Error thrown when attempting to synchronously resolve an async port before initialization.
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

    // Provide async resolution examples
    this.suggestion =
      "Two ways to resolve async ports:\n\n" +
      "Option 1 - Use resolveAsync() (recommended):\n" +
      "```typescript\n" +
      `const service = await container.resolveAsync(${portName});\n` +
      "```\n\n" +
      "Option 2 - Initialize container first, then use sync resolve:\n" +
      "```typescript\n" +
      "const initialized = await container.initialize();\n" +
      `const service = initialized.resolve(${portName});\n` +
      "```";
  }
}

// =============================================================================
// NonClonableForkedError
// =============================================================================

/**
 * Error thrown when attempting to use forked inheritance mode with a non-clonable adapter.
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

    // Provide alternatives to forked mode
    this.suggestion =
      "Choose an appropriate inheritance mode:\n\n" +
      "Option 1 - Use shared mode (share parent's instance):\n" +
      "```typescript\n" +
      "const child = parent.createChild({\n" +
      `  inherit: { ${portName}: 'shared' }\n` +
      "});\n" +
      "```\n\n" +
      "Option 2 - Use isolated mode (create new instance):\n" +
      "```typescript\n" +
      "const child = parent.createChild({\n" +
      `  inherit: { ${portName}: 'isolated' }\n` +
      "});\n" +
      "```\n\n" +
      "Option 3 - Mark adapter as clonable if safe:\n" +
      "```typescript\n" +
      "const adapter = createAdapter({\n" +
      `  provides: ${portName},\n` +
      "  factory: () => new Service(),\n" +
      "  clonable: true,  // Only if shallow clone is safe\n" +
      "  freeze: true,\n" +
      "});\n" +
      "```";
  }
}

// =============================================================================
// DisposalError
// =============================================================================

/**
 * Error returned when container or scope disposal fails.
 */
export class DisposalError extends ContainerError {
  readonly code = "DISPOSAL_FAILED" as const;
  readonly isProgrammingError = false as const;

  /**
   * All individual errors from failed finalizers.
   */
  readonly causes: readonly unknown[];

  /**
   * The original error that triggered this disposal failure.
   */
  declare readonly cause: unknown | undefined;

  /**
   * Creates a new DisposalError.
   *
   * @param message - The error message describing what went wrong
   * @param causes - Array of individual errors from failed finalizers
   * @param originalError - The original error (typically an AggregateError)
   */
  constructor(message: string, causes: readonly unknown[], originalError?: unknown) {
    super(message);
    this.causes = Object.freeze([...causes]);
    if (originalError !== undefined) {
      // Store original error as standard Error.cause (ES2022+)
      Object.defineProperty(this, "cause", {
        value: originalError,
        writable: false,
        enumerable: false,
        configurable: true,
      });
    }
  }

  /**
   * Creates a DisposalError from an AggregateError thrown during disposal.
   */
  static fromAggregateError(err: AggregateError): DisposalError {
    return new DisposalError(
      `Disposal failed: ${err.errors.length} finalizer(s) threw`,
      err.errors,
      err
    );
  }

  /**
   * Creates a DisposalError from an unknown thrown value.
   */
  static fromUnknown(err: unknown): DisposalError {
    if (err instanceof AggregateError) {
      return DisposalError.fromAggregateError(err);
    }
    const message = extractErrorMessage(err);
    return new DisposalError(`Disposal failed: ${message}`, [err], err);
  }
}

// =============================================================================
// FinalizerTimeoutError
// =============================================================================

/**
 * Error thrown when a finalizer exceeds the configured timeout during disposal.
 */
export class FinalizerTimeoutError extends ContainerError {
  readonly code = "FINALIZER_TIMEOUT" as const;
  readonly isProgrammingError = false as const;

  /** The name of the port whose finalizer timed out. */
  readonly portName: string;

  /** The timeout duration in milliseconds. */
  readonly timeoutMs: number;

  constructor(portName: string, timeoutMs: number) {
    super(
      `Finalizer for port '${portName}' timed out after ${timeoutMs}ms. ` +
        `The resource may not have been properly cleaned up.`
    );
    this.portName = portName;
    this.timeoutMs = timeoutMs;
  }
}

// =============================================================================
// ScopeDepthExceededError
// =============================================================================

/**
 * Error thrown when creating a scope would exceed the maximum allowed nesting depth.
 */
export class ScopeDepthExceededError extends ContainerError {
  readonly code = "SCOPE_DEPTH_EXCEEDED" as const;
  readonly isProgrammingError = true as const;

  /** The depth that was attempted. */
  readonly attemptedDepth: number;

  /** The maximum allowed depth. */
  readonly maxDepth: number;

  constructor(attemptedDepth: number, maxDepth: number) {
    super(
      `Cannot create scope at depth ${attemptedDepth}: maximum scope depth is ${maxDepth}. ` +
        `This usually indicates a recursive scope creation pattern.`
    );
    this.attemptedDepth = attemptedDepth;
    this.maxDepth = maxDepth;

    this.suggestion =
      "To fix excessive scope nesting:\n" +
      "1. Reuse existing scopes instead of creating new ones per operation\n" +
      "2. Use flat scope structures (sibling scopes instead of nested)\n" +
      "3. Increase maxScopeDepth in container options if deep nesting is intentional\n\n" +
      "Example - configure max depth:\n" +
      "```typescript\n" +
      "const container = createContainer({\n" +
      "  graph,\n" +
      "  name: 'App',\n" +
      "  safety: { maxScopeDepth: 128 },\n" +
      "});\n" +
      "```";
  }
}
