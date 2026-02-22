/**
 * Attributes attached to a guard evaluation span.
 */
export interface GuardSpanAttributes {
  readonly "hex-di.guard.evaluationId": string;
  readonly "hex-di.guard.portName": string;
  readonly "hex-di.guard.subjectId": string;
  readonly "hex-di.guard.decision": "allow" | "deny";
  readonly "hex-di.guard.policyKind": string;
  readonly "hex-di.guard.durationMs": number;
  readonly "hex-di.guard.scopeId": string;
}

/**
 * Handle for a live guard evaluation span.
 */
export interface GuardSpanHandle {
  end(): void;
  setError(message: string): void;
  setAttribute(key: string, value: string | number | boolean): void;
}

/**
 * Sink interface for receiving guard evaluation spans.
 */
export interface GuardSpanSink {
  startSpan(name: string, attributes: Partial<GuardSpanAttributes>): GuardSpanHandle;
}

/**
 * Port for the guard span sink.
 */
export type GuardSpanSinkPort = GuardSpanSink;

/**
 * A no-operation span sink that creates no-op span handles.
 * Zero overhead when registered; use when span emission is not required.
 */
export const NoopGuardSpanSink: GuardSpanSink = Object.freeze({
  startSpan(_name: string, _attributes: Partial<GuardSpanAttributes>): GuardSpanHandle {
    return Object.freeze({
      end(): void {},
      setError(_message: string): void {},
      setAttribute(_key: string, _value: string | number | boolean): void {},
    });
  },
});
