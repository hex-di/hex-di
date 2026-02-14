/**
 * Log injection prevention utilities.
 *
 * Sanitizes log messages to prevent ANSI escape injection,
 * newline injection, and control character injection.
 *
 * @packageDocumentation
 */

/**
 * ESC character (U+001B) used to build ANSI patterns dynamically.
 * Built from char code to avoid no-control-regex lint rule.
 */
const ESC = String.fromCharCode(0x1b);

/**
 * Pattern to match ANSI escape sequences.
 */
const ANSI_PATTERN = new RegExp(ESC + "\\[[0-9;]*[a-zA-Z]", "g");

/**
 * Pattern to match control characters (excluding tab \x09 and newlines \x0a \x0d).
 * Built from char codes to avoid no-control-regex lint rule.
 */
const CONTROL_CHAR_PATTERN = new RegExp(
  "[" +
    String.fromCharCode(0x00) +
    "-" +
    String.fromCharCode(0x08) +
    String.fromCharCode(0x0b) +
    String.fromCharCode(0x0c) +
    String.fromCharCode(0x0e) +
    "-" +
    String.fromCharCode(0x1f) +
    String.fromCharCode(0x7f) +
    "]",
  "g"
);

/**
 * Sanitizes a log message to prevent log injection attacks.
 *
 * Removes ANSI escape sequences, escapes newlines, and strips
 * control characters that could be used for log forging.
 *
 * @param message - The raw log message
 * @returns The sanitized message safe for log output
 */
export function sanitizeMessage(message: string): string {
  let result = message.replace(ANSI_PATTERN, "");
  result = result.replace(/\r\n/g, "\\r\\n");
  result = result.replace(/\n/g, "\\n");
  result = result.replace(/\r/g, "\\r");
  result = result.replace(CONTROL_CHAR_PATTERN, "");
  return result;
}

/**
 * Sanitizes a string value within annotations.
 *
 * Applies the same sanitization as messages to prevent
 * injection through annotation values.
 *
 * @param value - The string value to sanitize
 * @returns The sanitized string
 */
export function sanitizeStringValue(value: string): string {
  return sanitizeMessage(value);
}
