/**
 * Tracing warning utilities for GxP compliance.
 *
 * When tracing is not configured on a container, these utilities emit
 * warnings to inform operators that no audit trail is being captured.
 *
 * Tracing remains OPTIONAL -- these are warnings, not errors.
 *
 * @packageDocumentation
 */

/**
 * Configuration for tracing warning behavior.
 */
export interface TracingWarningConfig {
  /**
   * Whether to emit warnings when tracing is not configured.
   * @default true
   */
  readonly enabled: boolean;

  /**
   * Custom warning handler. Defaults to `console.warn`.
   * Set to a no-op function to suppress warnings entirely.
   */
  readonly handler: (message: string, code: string) => void;

  /**
   * Whether to emit the warning only once per container instance.
   * @default true
   */
  readonly oncePerContainer: boolean;
}

/** Minimal console interface for environments without DOM types. */
declare const console: undefined | { warn?: (...args: unknown[]) => void };

/**
 * Default tracing warning configuration.
 */
export const DEFAULT_TRACING_WARNING_CONFIG: TracingWarningConfig = Object.freeze({
  enabled: true,
  handler: (message: string, _code: string): void => {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn(message);
    }
  },
  oncePerContainer: true,
});

/** Module-level configuration override. */
let _warningConfig: TracingWarningConfig = DEFAULT_TRACING_WARNING_CONFIG;

/**
 * Configures the tracing warning behavior globally.
 *
 * @param config - Partial configuration; unspecified fields use defaults
 */
export function configureTracingWarning(config: Partial<TracingWarningConfig>): void {
  _warningConfig = {
    ...DEFAULT_TRACING_WARNING_CONFIG,
    ...config,
  };
}

/**
 * Resets tracing warning configuration to defaults.
 * Intended for test teardown.
 *
 * @internal
 */
export function resetTracingWarning(): void {
  _warningConfig = DEFAULT_TRACING_WARNING_CONFIG;
}

/**
 * Returns the current tracing warning configuration.
 *
 * @internal
 */
export function getTracingWarningConfig(): TracingWarningConfig {
  return _warningConfig;
}

/**
 * The warning code for tracing-not-configured condition.
 */
export const TRACING_NOT_CONFIGURED_CODE = "HEX_WARN_001";

/**
 * Emits a tracing-not-configured warning.
 *
 * Called by the runtime when a container is created without tracing.
 * The warning includes the container name for identification.
 *
 * @param containerName - The human-readable container name
 */
export function emitTracingWarning(containerName: string): void {
  if (!_warningConfig.enabled) {
    return;
  }
  const message =
    `WARNING[${TRACING_NOT_CONFIGURED_CODE}]: Container '${containerName}' was created ` +
    `without tracing configured. Resolution audit trail is not being captured. ` +
    `For GxP compliance, enable tracing via instrumentContainer() from @hex-di/tracing.`;
  _warningConfig.handler(message, TRACING_NOT_CONFIGURED_CODE);
}
