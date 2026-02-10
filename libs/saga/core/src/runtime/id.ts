/**
 * Execution ID Generator
 *
 * Simple unique ID generation for saga executions.
 *
 * @packageDocumentation
 */

let counter = 0;

/**
 * Generate a unique execution ID.
 * Uses a combination of timestamp and counter for uniqueness.
 */
export function generateExecutionId(): string {
  counter += 1;
  return `exec-${Date.now()}-${counter.toString(36)}`;
}
