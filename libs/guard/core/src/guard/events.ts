import type { Decision } from "../evaluator/decision.js";

/**
 * An event emitted when a guard evaluation allows access.
 */
export interface GuardAllowEvent {
  readonly kind: "guard.allow";
  readonly evaluationId: string;
  readonly portName: string;
  readonly subjectId: string;
  readonly decision: Decision & { kind: "allow" };
  readonly timestamp: string;
}

/**
 * An event emitted when a guard evaluation denies access.
 */
export interface GuardDenyEvent {
  readonly kind: "guard.deny";
  readonly evaluationId: string;
  readonly portName: string;
  readonly subjectId: string;
  readonly decision: Decision & { kind: "deny" };
  readonly timestamp: string;
}

/**
 * An event emitted when a guard encounters an error (ACL008, ACL018, ACL009, ACL014).
 */
export interface GuardErrorEvent {
  readonly kind: "guard.error";
  readonly evaluationId: string;
  readonly portName: string;
  readonly subjectId: string;
  readonly errorCode: string;
  readonly message: string;
  readonly timestamp: string;
}

/**
 * Discriminated union of all guard events.
 */
export type GuardEvent = GuardAllowEvent | GuardDenyEvent | GuardErrorEvent;

/**
 * Sink interface for receiving guard events.
 */
export interface GuardEventSink {
  emit(event: GuardEvent): void;
}

/**
 * Port for the guard event sink.
 */
export type GuardEventSinkPort = GuardEventSink;

/**
 * A no-operation event sink that discards all events.
 * Zero overhead when registered; use when event emission is not required.
 */
export const NoopGuardEventSink: GuardEventSink = Object.freeze({
  emit(_event: GuardEvent): void {
    // no-op
  },
});
