/**
 * Plugin Validation Utilities
 *
 * This module provides runtime validation for DevTools plugins.
 * All validation functions throw descriptive errors when validation fails,
 * making it easy to diagnose configuration issues.
 *
 * ## Validation Rules
 *
 * ### Plugin ID
 * - Must not be empty
 * - Must be lowercase
 * - Must not contain spaces
 * - Must start with a letter
 * - Can contain lowercase letters, numbers, hyphens, and underscores
 *
 * ### Plugin Config
 * - Must have required fields: id, label, component
 * - Label must not be empty or whitespace-only
 * - Component must be a function
 *
 * @packageDocumentation
 */

import type { PluginConfig } from "./plugin-types.js";

// =============================================================================
// Error Messages
// =============================================================================

/**
 * Error class for plugin validation failures.
 * Provides a consistent error type that can be caught and handled.
 */
export class PluginValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginValidationError";
  }
}

// =============================================================================
// Plugin ID Validation
// =============================================================================

/**
 * Regular expression for valid plugin IDs.
 * - Must start with a lowercase letter
 * - Can contain lowercase letters, numbers, hyphens, and underscores
 */
const VALID_ID_PATTERN = /^[a-z][a-z0-9_-]*$/;

/**
 * Validates a plugin ID string.
 *
 * Plugin IDs must follow these rules:
 * - Not empty
 * - Lowercase only
 * - No spaces
 * - Start with a letter
 * - Contain only letters, numbers, hyphens, and underscores
 *
 * @param id - The plugin ID to validate
 * @throws {PluginValidationError} If the ID is invalid
 *
 * @example
 * ```typescript
 * validatePluginId("graph"); // OK
 * validatePluginId("my-plugin"); // OK
 * validatePluginId("plugin_v2"); // OK
 *
 * validatePluginId(""); // Throws: plugin id must not be empty
 * validatePluginId("My Plugin"); // Throws: plugin id must be lowercase
 * validatePluginId("123plugin"); // Throws: plugin id must start with a letter
 * ```
 */
export function validatePluginId(id: string): void {
  // Check for empty string
  if (id === "") {
    throw new PluginValidationError("Plugin id must not be empty");
  }

  // Check for spaces
  if (id.includes(" ")) {
    throw new PluginValidationError(`Plugin id must not contain spaces. Received: "${id}"`);
  }

  // Check for uppercase letters
  if (id !== id.toLowerCase()) {
    throw new PluginValidationError(
      `Plugin id must be lowercase. Received: "${id}". Use "${id.toLowerCase()}" instead.`
    );
  }

  // Check if starts with a letter
  const firstChar = id.charAt(0);
  if (!/[a-z]/.test(firstChar)) {
    throw new PluginValidationError(`Plugin id must start with a letter. Received: "${id}"`);
  }

  // Check for invalid characters using the pattern
  if (!VALID_ID_PATTERN.test(id)) {
    throw new PluginValidationError(
      `Plugin id contains invalid character(s). Only lowercase letters, numbers, hyphens, and underscores are allowed. Received: "${id}"`
    );
  }
}

// =============================================================================
// Plugin Config Validation
// =============================================================================

/**
 * Type guard to check if a value is a valid function (for component validation).
 */
function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/**
 * Validates a plugin configuration object.
 *
 * Checks that all required fields are present and valid:
 * - `id`: Required, must pass `validatePluginId()`
 * - `label`: Required, must be a non-empty string
 * - `component`: Required, must be a function
 *
 * @param config - The plugin configuration to validate
 * @throws {PluginValidationError} If any validation check fails
 *
 * @example
 * ```typescript
 * // Valid config
 * validatePluginConfig({
 *   id: "my-plugin",
 *   label: "My Plugin",
 *   component: MyPluginComponent,
 * });
 *
 * // Missing required field
 * validatePluginConfig({
 *   label: "Test",
 *   component: TestComponent,
 * }); // Throws: Plugin id is required
 *
 * // Invalid field value
 * validatePluginConfig({
 *   id: "test",
 *   label: "",
 *   component: TestComponent,
 * }); // Throws: Plugin label must not be empty
 * ```
 */
export function validatePluginConfig(config: PluginConfig): void {
  // Validate id presence
  if (!("id" in config) || config.id === undefined || config.id === null) {
    throw new PluginValidationError("Plugin id is required");
  }

  // Validate id format
  validatePluginId(config.id);

  // Validate label presence
  if (!("label" in config) || config.label === undefined || config.label === null) {
    throw new PluginValidationError("Plugin label is required");
  }

  // Validate label is non-empty string
  if (typeof config.label !== "string" || config.label.trim() === "") {
    throw new PluginValidationError("Plugin label must not be empty");
  }

  // Validate component presence
  if (!("component" in config) || config.component === undefined || config.component === null) {
    throw new PluginValidationError("Plugin component is required");
  }

  // Validate component is a function
  if (!isFunction(config.component)) {
    throw new PluginValidationError(
      `Plugin component must be a function (React component). Received type: ${typeof config.component}`
    );
  }
}

// =============================================================================
// Batch Validation Utilities
// =============================================================================

/**
 * Validates an array of plugin IDs for uniqueness.
 *
 * This is useful when registering multiple plugins to ensure
 * no ID collisions occur.
 *
 * @param ids - Array of plugin IDs to check
 * @throws {PluginValidationError} If duplicate IDs are found
 *
 * @example
 * ```typescript
 * validateUniquePluginIds(["graph", "services", "tracing"]); // OK
 * validateUniquePluginIds(["graph", "services", "graph"]); // Throws: duplicate plugin id
 * ```
 */
export function validateUniquePluginIds(ids: readonly string[]): void {
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      throw new PluginValidationError(
        `Duplicate plugin id found: "${id}". Each plugin must have a unique id.`
      );
    }
    seen.add(id);
  }
}

/**
 * Validates multiple plugin configs at once.
 *
 * Validates each config individually and also checks for ID uniqueness.
 *
 * @param configs - Array of plugin configurations to validate
 * @throws {PluginValidationError} If any validation check fails
 *
 * @example
 * ```typescript
 * validatePluginConfigs([
 *   { id: "graph", label: "Graph", component: GraphContent },
 *   { id: "services", label: "Services", component: ServicesContent },
 * ]); // OK
 * ```
 */
export function validatePluginConfigs(configs: readonly PluginConfig[]): void {
  // Validate each config individually
  for (let i = 0; i < configs.length; i++) {
    try {
      validatePluginConfig(configs[i]);
    } catch (error) {
      if (error instanceof PluginValidationError) {
        throw new PluginValidationError(`Plugin at index ${i}: ${error.message}`);
      }
      throw error;
    }
  }

  // Check for ID uniqueness
  const ids = configs.map(config => config.id);
  validateUniquePluginIds(ids);
}

// =============================================================================
// Type Validation Helpers
// =============================================================================

/**
 * Validates that shortcuts array contains valid shortcut definitions.
 *
 * @param shortcuts - Array of shortcut definitions
 * @throws {PluginValidationError} If any shortcut is invalid
 */
export function validateShortcuts(
  shortcuts: readonly { key: string; action: () => void; description: string }[]
): void {
  for (let i = 0; i < shortcuts.length; i++) {
    const shortcut = shortcuts[i];

    if (typeof shortcut.key !== "string" || shortcut.key.trim() === "") {
      throw new PluginValidationError(`Shortcut at index ${i}: key must be a non-empty string`);
    }

    if (!isFunction(shortcut.action)) {
      throw new PluginValidationError(`Shortcut at index ${i}: action must be a function`);
    }

    if (typeof shortcut.description !== "string" || shortcut.description.trim() === "") {
      throw new PluginValidationError(
        `Shortcut at index ${i}: description must be a non-empty string`
      );
    }
  }
}
