/**
 * Audit trail sink interface for GxP compliance.
 *
 * Consumers provide an implementation of this interface to capture
 * all validation decisions, build attempts, and inspection results
 * in a persistent, append-only audit trail.
 *
 * Tracing is OPTIONAL. When no sink is provided, warnings are emitted
 * to console.warn but operations proceed normally.
 *
 * @packageDocumentation
 */

/** Identity of the actor performing the operation */
export interface AuditActor {
  readonly type: "user" | "system" | "process";
  readonly id: string;
  readonly name?: string;
}

/** Structured error record for audit trail */
export interface AuditErrorRecord {
  readonly tag: string;
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
}

/** Outcome of a validation decision */
export type ValidationOutcome =
  | { readonly result: "pass" }
  | { readonly result: "fail"; readonly errors: readonly AuditErrorRecord[] }
  | { readonly result: "fallback"; readonly reason: string };

/** Audit event types */
export type AuditEvent =
  | AuditBuildAttemptEvent
  | AuditValidationDecisionEvent
  | AuditInspectionEvent
  | AuditDepthFallbackEvent;

export interface AuditBuildAttemptEvent {
  readonly type: "graph.build.attempt";
  readonly timestamp: string;
  readonly correlationId: string;
  readonly actor?: AuditActor;
  readonly adapterCount: number;
  readonly outcome: "success" | "failure";
  readonly error?: AuditErrorRecord;
}

export interface AuditValidationDecisionEvent {
  readonly type: "graph.validation.decision";
  readonly timestamp: string;
  readonly correlationId: string;
  readonly actor?: AuditActor;
  readonly validation: ValidationOutcome;
  readonly cycleCheckPerformed: boolean;
  readonly captiveCheckPerformed: boolean;
}

export interface AuditInspectionEvent {
  readonly type: "graph.inspection.performed";
  readonly timestamp: string;
  readonly correlationId: string;
  readonly actor?: AuditActor;
  readonly adapterCount: number;
  readonly isComplete: boolean;
}

export interface AuditDepthFallbackEvent {
  readonly type: "graph.depth.fallback";
  readonly timestamp: string;
  readonly correlationId: string;
  readonly actor?: AuditActor;
  readonly maxChainDepth: number;
  readonly depthLimit: number;
  readonly runtimeCycleDetected: boolean;
}

/** Audit trail sink interface */
export interface AuditSink {
  readonly emit: (event: AuditEvent) => void;
}
