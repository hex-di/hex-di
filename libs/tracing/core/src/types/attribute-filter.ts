/**
 * Configuration for attribute sanitization in the tracing pipeline.
 *
 * Applied before span data is passed to exporters, ensuring PII
 * and sensitive data are redacted at the source.
 *
 * @packageDocumentation
 */

/**
 * Configuration for filtering and sanitizing span attributes.
 *
 * Used by {@link createAttributeFilter} to build a reusable filter
 * function that enforces PII redaction, size limits, and key blocking.
 *
 * @public
 */
export interface AttributeFilterConfig {
  /**
   * Attribute keys that should be completely removed before export.
   * Matched exactly (case-sensitive).
   *
   * @example ['user.email', 'user.ssn', 'auth.token']
   */
  readonly blockedKeys?: readonly string[];

  /**
   * Key prefixes that should be removed.
   * Any attribute key starting with a blocked prefix is removed.
   *
   * @example ['pii.', 'secret.']
   */
  readonly blockedKeyPrefixes?: readonly string[];

  /**
   * Maximum length for string attribute values.
   * Values exceeding this length are truncated with a '[TRUNCATED]' suffix.
   *
   * @default 4096
   */
  readonly maxValueLength?: number;

  /**
   * Maximum length for attribute keys.
   * Keys exceeding this length cause the attribute to be dropped.
   *
   * @default 256
   */
  readonly maxKeyLength?: number;

  /**
   * Maximum number of elements in array attribute values.
   * Arrays exceeding this limit are truncated.
   *
   * @default 128
   */
  readonly maxArrayLength?: number;

  /**
   * Custom redaction function applied to all string values.
   * Return the redacted value, or undefined to remove the attribute.
   *
   * @example (key, value) => key.includes('email') ? '[REDACTED]' : value
   */
  readonly redactValue?: (key: string, value: string) => string | undefined;
}
