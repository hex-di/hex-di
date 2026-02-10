/**
 * Cycle Detection for Derived Dependency Evaluation
 *
 * Uses a module-scope evaluation stack to detect circular derived
 * dependencies at runtime. Since `createComputed` callbacks are
 * synchronous and JS is single-threaded, a simple stack + set
 * is sufficient.
 *
 * @packageDocumentation
 */

import { CircularDerivedDependency } from "../errors/index.js";

const _evaluationStack: string[] = [];
const _evaluationSet = new Set<string>();

/**
 * Type guard for CircularDerivedDependency errors.
 * Used to detect and re-throw cycle errors without wrapping.
 */
export function isCircularDerivedDependency(error: unknown): error is CircularDerivedDependency {
  if (typeof error !== "object" || error === null) return false;
  if (!("_tag" in error)) return false;
  const tagged: { _tag: unknown } = error;
  return tagged._tag === "CircularDerivedDependency";
}

/**
 * Wraps a synchronous function with cycle detection.
 *
 * Before `fn` runs, checks if `portName` is already being evaluated.
 * If so, builds the dependency chain and throws `CircularDerivedDependency`.
 * Cleanup is guaranteed via `try/finally`.
 */
export function withCycleDetection<T>(portName: string, fn: () => T): T {
  if (_evaluationSet.has(portName)) {
    const cycleStart = _evaluationStack.indexOf(portName);
    const chain = [..._evaluationStack.slice(cycleStart), portName];
    throw CircularDerivedDependency({ dependencyChain: chain });
  }

  _evaluationStack.push(portName);
  _evaluationSet.add(portName);
  try {
    return fn();
  } finally {
    _evaluationStack.pop();
    _evaluationSet.delete(portName);
  }
}
