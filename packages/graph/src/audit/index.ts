/**
 * Audit trail module barrel export.
 *
 * @packageDocumentation
 */

export type {
  AuditActor,
  AuditSink,
  AuditEvent,
  AuditBuildAttemptEvent,
  AuditValidationDecisionEvent,
  AuditInspectionEvent,
  AuditDepthFallbackEvent,
  AuditErrorRecord,
  ValidationOutcome,
} from "./types.js";

export { setAuditSink, clearAuditSink, hasAuditSink, emitAuditEvent } from "./global-sink.js";
