/**
 * Flow Audit Types (GxP F3 + F9)
 *
 * Types for the audit trail with hash chain integrity.
 *
 * @packageDocumentation
 */

import type { EffectAny } from "../effects/types.js";

// =============================================================================
// Flow Audit Record
// =============================================================================

/**
 * An auditable flow transition record with hash chain integrity.
 *
 * Extends the transition event data with cryptographic hash chaining
 * to detect tampering or missing records in the audit trail.
 */
export interface FlowAuditRecord {
  readonly id: string;
  readonly machineId: string;
  readonly prevState: string;
  readonly event: { readonly type: string };
  readonly nextState: string;
  readonly effects: readonly EffectAny[];
  readonly timestamp: number;
  /** FNV-1a hash of this record concatenated with previousHash. */
  readonly hash: string;
  /** Hash of the preceding audit record (empty string for the first record). */
  readonly previousHash: string;
}

// =============================================================================
// Flow Audit Sink Interface
// =============================================================================

/**
 * Consumer interface for audit records.
 *
 * Implementations should persist records durably (e.g., append-only log,
 * database) for regulatory compliance. The sink MUST NOT throw — errors
 * are swallowed and warned once.
 */
export interface FlowAuditSink {
  /** Receives an audit record. Must not throw. */
  write(record: FlowAuditRecord): void;
}
