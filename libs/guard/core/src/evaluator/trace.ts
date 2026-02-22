import type { EvaluationTrace } from "./decision.js";

/**
 * Builds an EvaluationTrace node.
 */
export function buildTrace(options: {
  readonly policyKind: string;
  readonly label?: string;
  readonly result: "allow" | "deny";
  readonly reason?: string;
  readonly durationMs: number;
  readonly children?: readonly EvaluationTrace[];
  readonly visibleFields?: ReadonlyArray<string>;
}): EvaluationTrace {
  const trace: EvaluationTrace = {
    policyKind: options.policyKind,
    ...(options.label !== undefined ? { label: options.label } : {}),
    result: options.result,
    ...(options.reason !== undefined ? { reason: options.reason } : {}),
    durationMs: options.durationMs,
    ...(options.children !== undefined && options.children.length > 0
      ? { children: Object.freeze([...options.children]) }
      : {}),
    ...(options.visibleFields !== undefined ? { visibleFields: Object.freeze([...options.visibleFields]) } : {}),
  };
  return Object.freeze(trace);
}
