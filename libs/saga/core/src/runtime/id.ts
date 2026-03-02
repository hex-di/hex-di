/**
 * Execution ID Generator
 *
 * Cryptographic unique ID generation for saga executions
 * using crypto.randomUUID() for GxP-compliant uniqueness.
 *
 * @packageDocumentation
 */

/**
 * Generate a unique execution ID.
 * Uses crypto.randomUUID() for cryptographic uniqueness.
 */
export function generateExecutionId(): string {
  return `exec-${crypto.randomUUID()}`;
}
