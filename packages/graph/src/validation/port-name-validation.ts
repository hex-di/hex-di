/**
 * Port name validation utilities.
 *
 * Validates port names to prevent injection attacks, empty names,
 * and names with control characters.
 *
 * @packageDocumentation
 */

const PORT_NAME_MAX_LENGTH = 256;
const PORT_NAME_PATTERN = /^[a-zA-Z_$][a-zA-Z0-9_$.-]*$/;

export interface PortNameValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * Validates a port name for safety and correctness.
 *
 * Rules:
 * - Must not be empty
 * - Must not exceed 256 characters
 * - Must start with a letter, underscore, or dollar sign
 * - May contain letters, digits, underscores, dollar signs, dots, hyphens
 * - Must not contain control characters, whitespace, or path separators
 */
export function validatePortName(name: string): PortNameValidationResult {
  if (name.length === 0) {
    return { valid: false, reason: "Port name must not be empty" };
  }
  if (name.length > PORT_NAME_MAX_LENGTH) {
    return {
      valid: false,
      reason: `Port name exceeds maximum length of ${PORT_NAME_MAX_LENGTH}`,
    };
  }
  if (!PORT_NAME_PATTERN.test(name)) {
    return {
      valid: false,
      reason:
        "Port name must start with a letter/underscore/$ and contain only alphanumerics, underscores, $, dots, and hyphens",
    };
  }
  return { valid: true };
}
