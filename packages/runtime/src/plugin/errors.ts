/**
 * Plugin error classes for @hex-di/runtime.
 *
 * All plugin-related errors extend PluginError, providing consistent structure with:
 * - `code`: Stable string constant for programmatic handling
 * - `isProgrammingError`: Boolean indicating if error is a programming mistake
 * - `context`: Structured information about the error
 * - `suggestions`: Actionable hints for fixing the error
 *
 * @packageDocumentation
 */

// V8-specific Error.captureStackTrace type
type V8ErrorConstructor = typeof Error & {
  captureStackTrace?(targetObject: object, constructorOpt?: unknown): void;
};

// =============================================================================
// Plugin Error Codes
// =============================================================================

/**
 * All possible plugin error codes.
 */
export type PluginErrorCode =
  | "PLUGIN_DEPENDENCY_MISSING"
  | "PLUGIN_CIRCULAR_DEPENDENCY"
  | "PLUGIN_INIT_FAILED"
  | "PLUGIN_NOT_FOUND"
  | "PLUGIN_ALREADY_REGISTERED";

// =============================================================================
// Base Plugin Error
// =============================================================================

/**
 * Abstract base class for all plugin-related errors.
 *
 * Provides a consistent structure for error handling with:
 * - `code`: A stable string constant for programmatic error identification
 * - `isProgrammingError`: Indicates whether this error represents a programming mistake
 * - `context`: Structured information about the error
 * - `suggestions`: Actionable hints for fixing the error
 *
 * @example
 * ```typescript
 * try {
 *   createContainer(graph, { plugins: [MetricsPlugin] });
 * } catch (error) {
 *   if (error instanceof PluginError) {
 *     console.log(`Plugin error [${error.code}]: ${error.message}`);
 *     console.log('Suggestions:', error.suggestions);
 *   }
 * }
 * ```
 */
export abstract class PluginError extends Error {
  /**
   * A stable string constant identifying the error type.
   * Suitable for programmatic error handling and logging.
   */
  abstract readonly code: PluginErrorCode;

  /**
   * Indicates whether this error represents a programming mistake.
   *
   * - `true`: The error is caused by incorrect usage (e.g., missing dependency,
   *   circular dependency). These should be fixed in code.
   * - `false`: The error is caused by runtime conditions (e.g., init threw).
   *   These may be recoverable or require operational handling.
   */
  abstract readonly isProgrammingError: boolean;

  /**
   * Structured information about the error.
   * Contains key-value pairs relevant to this specific error type.
   */
  abstract readonly context: Readonly<Record<string, unknown>>;

  /**
   * Actionable hints for fixing the error.
   * Each suggestion is a complete sentence describing a fix.
   */
  abstract readonly suggestions: readonly string[];

  /**
   * Creates a new PluginError instance.
   *
   * @param message - The error message describing what went wrong
   */
  constructor(message: string) {
    super(message);

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace excluding this constructor for cleaner traces
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
// PluginDependencyMissingError
// =============================================================================

/**
 * Error thrown when a plugin's required dependency is not registered.
 *
 * This error occurs when:
 * - A required plugin is not in the plugins array
 * - A required plugin appears after the dependent plugin (wrong order)
 *
 * @example
 * ```typescript
 * // MetricsPlugin requires TracingPlugin
 * const container = createContainer(graph, {
 *   plugins: [MetricsPlugin], // Missing TracingPlugin!
 * });
 * // Throws PluginDependencyMissingError
 * ```
 */
export class PluginDependencyMissingError extends PluginError {
  readonly code = "PLUGIN_DEPENDENCY_MISSING" as const;
  readonly isProgrammingError = true as const;

  readonly context: Readonly<{
    pluginName: string;
    missingDependency: string;
    dependencySymbol: symbol;
    reason: string;
  }>;

  readonly suggestions: readonly string[];

  /**
   * Creates a new PluginDependencyMissingError.
   *
   * @param pluginName - Name of the plugin that has the missing dependency
   * @param missingDependency - Name of the missing dependency plugin
   * @param dependencySymbol - Symbol of the missing dependency
   * @param reason - The documented reason why this dependency is required
   */
  constructor(
    pluginName: string,
    missingDependency: string,
    dependencySymbol: symbol,
    reason: string
  ) {
    super(
      `Plugin "${pluginName}" requires "${missingDependency}" but it is not registered. ` +
        `Reason: ${reason}`
    );

    this.context = Object.freeze({
      pluginName,
      missingDependency,
      dependencySymbol,
      reason,
    });

    this.suggestions = Object.freeze([
      `Add "${missingDependency}" to the plugins array before "${pluginName}"`,
      `Check that "${missingDependency}" is imported correctly`,
      `If "${missingDependency}" is optional, use \`enhancedBy\` instead of \`requires\``,
    ]);
  }
}

// =============================================================================
// PluginCircularDependencyError
// =============================================================================

/**
 * Error thrown when a circular dependency is detected between plugins.
 *
 * Circular dependencies occur when Plugin A depends on Plugin B,
 * and Plugin B (directly or indirectly) depends back on Plugin A.
 *
 * @example
 * ```typescript
 * // PluginA requires PluginB, PluginB requires PluginA
 * const container = createContainer(graph, {
 *   plugins: [PluginA, PluginB],
 * });
 * // Throws PluginCircularDependencyError with cycle: "A -> B -> A"
 * ```
 */
export class PluginCircularDependencyError extends PluginError {
  readonly code = "PLUGIN_CIRCULAR_DEPENDENCY" as const;
  readonly isProgrammingError = true as const;

  readonly context: Readonly<{
    cycle: readonly string[];
    formattedCycle: string;
  }>;

  readonly suggestions: readonly string[];

  /**
   * Creates a new PluginCircularDependencyError.
   *
   * @param cycle - Array of plugin names forming the cycle (first and last are same)
   */
  constructor(cycle: readonly string[]) {
    const formattedCycle = cycle.join(" -> ");
    super(`Circular plugin dependency detected: ${formattedCycle}`);

    this.context = Object.freeze({
      cycle: Object.freeze([...cycle]),
      formattedCycle,
    });

    this.suggestions = Object.freeze([
      "Review the plugin dependency graph to identify the cycle",
      "Consider extracting shared functionality into a separate plugin",
      "Use optional dependencies (enhancedBy) where possible to break the cycle",
    ]);
  }
}

// =============================================================================
// PluginInitializationError
// =============================================================================

/**
 * Error thrown when a plugin's `createApi` function throws.
 *
 * This wraps the original exception thrown during plugin initialization,
 * providing context about which plugin failed.
 *
 * @example
 * ```typescript
 * const BrokenPlugin = definePlugin({
 *   name: "broken",
 *   symbol: BROKEN,
 *   createApi() {
 *     throw new Error("Database connection failed");
 *   },
 * });
 *
 * createContainer(graph, { plugins: [BrokenPlugin] });
 * // Throws PluginInitializationError wrapping "Database connection failed"
 * ```
 */
export class PluginInitializationError extends PluginError {
  readonly code = "PLUGIN_INIT_FAILED" as const;
  readonly isProgrammingError = false as const;

  readonly context: Readonly<{
    pluginName: string;
    cause: unknown;
  }>;

  readonly suggestions: readonly string[];

  /**
   * Name of the plugin that failed to initialize.
   * Convenience property also available in context.
   */
  readonly pluginName: string;

  /**
   * The original exception thrown by the plugin's createApi function.
   * Can be any value since JavaScript allows throwing non-Error values.
   */
  readonly cause: unknown;

  /**
   * Creates a new PluginInitializationError.
   *
   * @param pluginName - Name of the plugin that failed to initialize
   * @param cause - The original exception thrown by createApi
   */
  constructor(pluginName: string, cause: unknown) {
    const causeMessage =
      cause instanceof Error
        ? cause.message
        : typeof cause === "object" && cause !== null && "message" in cause
          ? String((cause as { message: unknown }).message)
          : String(cause);

    super(`Plugin "${pluginName}" failed to initialize: ${causeMessage}`);

    this.pluginName = pluginName;
    this.cause = cause;
    this.context = Object.freeze({
      pluginName,
      cause,
    });

    this.suggestions = Object.freeze([
      "Check the plugin's createApi implementation for errors",
      "Ensure all required dependencies are correctly providing their APIs",
      "Review the original error message for specific failure details",
    ]);
  }
}

// =============================================================================
// PluginNotFoundError
// =============================================================================

/**
 * Error thrown when attempting to access a plugin API that is not registered.
 *
 * This typically occurs when:
 * - Using container[SYMBOL] for an unregistered plugin
 * - Calling getPluginApi with an undeclared dependency symbol
 *
 * @example
 * ```typescript
 * const container = createContainer(graph, { plugins: [] });
 * const tracing = container[TRACING]; // TRACING plugin not registered
 * // Throws PluginNotFoundError
 * ```
 */
export class PluginNotFoundError extends PluginError {
  readonly code = "PLUGIN_NOT_FOUND" as const;
  readonly isProgrammingError = true as const;

  readonly context: Readonly<{
    pluginSymbol: symbol;
    symbolDescription: string | undefined;
  }>;

  readonly suggestions: readonly string[];

  /**
   * Creates a new PluginNotFoundError.
   *
   * @param pluginSymbol - The symbol of the plugin that was not found
   */
  constructor(pluginSymbol: symbol) {
    const symbolDescription = pluginSymbol.description;
    const symbolName = symbolDescription ?? String(pluginSymbol);

    super(`Plugin with symbol "${symbolName}" is not registered`);

    this.context = Object.freeze({
      pluginSymbol,
      symbolDescription,
    });

    this.suggestions = Object.freeze([
      "Add the required plugin to the plugins array when creating the container",
      "Check that the plugin symbol matches the one used in definePlugin",
      "Ensure the plugin is imported correctly",
    ]);
  }
}

// =============================================================================
// PluginAlreadyRegisteredError
// =============================================================================

/**
 * Error thrown when attempting to register the same plugin symbol twice.
 *
 * Each plugin symbol must be unique within a container's plugins array.
 *
 * @example
 * ```typescript
 * const container = createContainer(graph, {
 *   plugins: [TracingPlugin, TracingPlugin], // Duplicate!
 * });
 * // Throws PluginAlreadyRegisteredError
 * ```
 */
export class PluginAlreadyRegisteredError extends PluginError {
  readonly code = "PLUGIN_ALREADY_REGISTERED" as const;
  readonly isProgrammingError = true as const;

  readonly context: Readonly<{
    pluginName: string;
    pluginSymbol: symbol;
  }>;

  readonly suggestions: readonly string[];

  /**
   * Creates a new PluginAlreadyRegisteredError.
   *
   * @param pluginName - Name of the duplicate plugin
   * @param pluginSymbol - Symbol of the duplicate plugin
   */
  constructor(pluginName: string, pluginSymbol: symbol) {
    super(`Plugin "${pluginName}" is already registered`);

    this.context = Object.freeze({
      pluginName,
      pluginSymbol,
    });

    this.suggestions = Object.freeze([
      "Remove the duplicate plugin from the plugins array",
      "If you need different configurations, create plugins with different symbols",
    ]);
  }
}
