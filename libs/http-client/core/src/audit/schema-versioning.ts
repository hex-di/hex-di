/**
 * Versioned audit entry schemas.
 *
 * Supports forward-compatible evolution of the audit entry structure
 * while maintaining chain integrity.
 *
 * @packageDocumentation
 */

import type { AuditEntry } from "./integrity.js";

// =============================================================================
// Types
// =============================================================================

export const CURRENT_SCHEMA_VERSION = 1;

export interface VersionedAuditEntry extends AuditEntry {
  readonly schemaVersion: number;
}

interface AuditSchemaV1 {
  readonly version: 1;
  readonly fields: ReadonlyArray<string>;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create a schema descriptor for the current audit entry format.
 */
export function createAuditSchema(): AuditSchemaV1 {
  return Object.freeze({
    version: CURRENT_SCHEMA_VERSION,
    fields: Object.freeze([
      "index",
      "timestamp",
      "method",
      "url",
      "status",
      "previousHash",
      "hash",
      "schemaVersion",
    ]),
  });
}

/**
 * Migrate an audit entry to the current schema version.
 *
 * Currently only supports v1 (identity migration). Future versions will
 * add migration paths.
 */
export function migrateAuditEntry(
  entry: AuditEntry,
  fromVersion?: number,
): VersionedAuditEntry {
  const version = fromVersion ?? CURRENT_SCHEMA_VERSION;

  if (version === CURRENT_SCHEMA_VERSION) {
    return Object.freeze({
      ...entry,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
  }

  // Future migration paths would go here
  return Object.freeze({
    ...entry,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  });
}
