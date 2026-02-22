/**
 * Pattern recognition engine for the Result Panel.
 *
 * Detects 7 recognized chain patterns for educational annotations.
 *
 * Spec: 12-educational-features.md Section 12.6
 *
 * @packageDocumentation
 */

import type { ResultOperationDescriptor, ResultMethodName } from "./types.js";

/** A detected chain pattern with its span. */
export interface ChainPattern {
  /** Pattern display name. */
  readonly name: string;
  /** Pattern description. */
  readonly description: string;
  /** Indices of operations that form this pattern. */
  readonly operationIndices: readonly number[];
}

const OBSERVATION_METHODS: ReadonlySet<ResultMethodName> = new Set([
  "inspect",
  "inspectErr",
  "andTee",
  "orTee",
]);

const NON_SWITCH_METHODS: ReadonlySet<ResultMethodName> = new Set([
  "map",
  "mapErr",
  "mapBoth",
  "flatten",
  "inspect",
  "inspectErr",
  "andTee",
  "orTee",
  "asyncMap",
]);

const ASYNC_CHAIN_METHODS: ReadonlySet<ResultMethodName> = new Set([
  "asyncAndThen",
  "asyncMap",
  "andThen",
]);

const ASYNC_CONSTRUCTOR_METHODS: ReadonlySet<ResultMethodName> = new Set([
  "fromPromise",
  "fromAsyncThrowable",
]);

/** Detect all recognized patterns in a chain's operations. */
export function detectPatterns(
  operations: readonly ResultOperationDescriptor[]
): readonly ChainPattern[] {
  const patterns: ChainPattern[] = [];

  detectValidationPipeline(operations, patterns);
  detectErrorRecovery(operations, patterns);
  detectSideEffectObserver(operations, patterns);
  detectFallbackCascade(operations, patterns);
  detectAsyncPipeline(operations, patterns);
  detectGuardAndProcess(operations, patterns);
  detectExhaustiveHandling(operations, patterns);

  return patterns;
}

/**
 * Validation Pipeline: 2+ andThen operations with no intervening orElse or terminal.
 * Non-switch operations between andThen are permitted.
 */
function detectValidationPipeline(
  operations: readonly ResultOperationDescriptor[],
  patterns: ChainPattern[]
): void {
  const andThenIndices: number[] = [];

  for (const op of operations) {
    if (op.method === "andThen" || op.method === "asyncAndThen") {
      andThenIndices.push(op.index);
    } else if (op.method === "orElse" || op.isTerminal) {
      // Check if we have a valid sequence before this break
      if (andThenIndices.length >= 2) {
        patterns.push({
          name: "Validation Pipeline",
          description:
            "This chain validates input through multiple steps. Each andThen can reject with a specific error.",
          operationIndices: [...andThenIndices],
        });
      }
      andThenIndices.length = 0;
    } else if (!NON_SWITCH_METHODS.has(op.method)) {
      // Non-switch operations are permitted between andThens
      // Other switch operations break the sequence
      if (andThenIndices.length >= 2) {
        patterns.push({
          name: "Validation Pipeline",
          description:
            "This chain validates input through multiple steps. Each andThen can reject with a specific error.",
          operationIndices: [...andThenIndices],
        });
      }
      andThenIndices.length = 0;
    }
  }

  // Check trailing sequence
  if (andThenIndices.length >= 2) {
    patterns.push({
      name: "Validation Pipeline",
      description:
        "This chain validates input through multiple steps. Each andThen can reject with a specific error.",
      operationIndices: [...andThenIndices],
    });
  }
}

/**
 * Error Recovery: An orElse preceded (with 0+ non-switch ops) by andThen or andThrough.
 */
function detectErrorRecovery(
  operations: readonly ResultOperationDescriptor[],
  patterns: ChainPattern[]
): void {
  for (let i = 0; i < operations.length; i++) {
    if (operations[i].method !== "orElse") continue;

    // Look backward for andThen or andThrough, skipping non-switch ops
    for (let j = i - 1; j >= 0; j--) {
      const method = operations[j].method;
      if (method === "andThen" || method === "andThrough" || method === "asyncAndThen") {
        patterns.push({
          name: "Error Recovery",
          description:
            "If the previous step fails, orElse provides a fallback. This is the railway 'recovery switch'.",
          operationIndices: [operations[j].index, operations[i].index],
        });
        break;
      }
      if (!NON_SWITCH_METHODS.has(method)) {
        break; // Hit a non-permitted operation
      }
    }
  }
}

/**
 * Side Effect Observer: 1+ consecutive inspect/inspectErr/andTee/orTee between
 * two non-observation operations.
 */
function detectSideEffectObserver(
  operations: readonly ResultOperationDescriptor[],
  patterns: ChainPattern[]
): void {
  let observerRun: number[] = [];

  for (const op of operations) {
    if (OBSERVATION_METHODS.has(op.method)) {
      observerRun.push(op.index);
    } else {
      if (observerRun.length >= 1) {
        patterns.push({
          name: "Side Effect Observer",
          description:
            "These operations observe the value for logging/metrics without changing the flow.",
          operationIndices: [...observerRun],
        });
      }
      observerRun = [];
    }
  }

  // Trailing run
  if (observerRun.length >= 1) {
    patterns.push({
      name: "Side Effect Observer",
      description:
        "These operations observe the value for logging/metrics without changing the flow.",
      operationIndices: [...observerRun],
    });
  }
}

/**
 * Fallback Cascade: 2+ orElse operations with no intervening andThen.
 * Non-switch operations between orElse are permitted.
 */
function detectFallbackCascade(
  operations: readonly ResultOperationDescriptor[],
  patterns: ChainPattern[]
): void {
  const orElseIndices: number[] = [];

  for (const op of operations) {
    if (op.method === "orElse") {
      orElseIndices.push(op.index);
    } else if (op.method === "andThen" || op.method === "asyncAndThen" || op.isTerminal) {
      if (orElseIndices.length >= 2) {
        patterns.push({
          name: "Fallback Cascade",
          description:
            "Multiple recovery attempts. If the first recovery fails, the next one tries.",
          operationIndices: [...orElseIndices],
        });
      }
      orElseIndices.length = 0;
    } else if (!NON_SWITCH_METHODS.has(op.method) && op.method !== "andThrough") {
      if (orElseIndices.length >= 2) {
        patterns.push({
          name: "Fallback Cascade",
          description:
            "Multiple recovery attempts. If the first recovery fails, the next one tries.",
          operationIndices: [...orElseIndices],
        });
      }
      orElseIndices.length = 0;
    }
  }

  if (orElseIndices.length >= 2) {
    patterns.push({
      name: "Fallback Cascade",
      description: "Multiple recovery attempts. If the first recovery fails, the next one tries.",
      operationIndices: [...orElseIndices],
    });
  }
}

/**
 * Async Processing Pipeline: fromPromise/fromAsyncThrowable constructor followed
 * by at least one asyncAndThen, asyncMap, or andThen.
 */
function detectAsyncPipeline(
  operations: readonly ResultOperationDescriptor[],
  patterns: ChainPattern[]
): void {
  for (let i = 0; i < operations.length; i++) {
    if (!ASYNC_CONSTRUCTOR_METHODS.has(operations[i].method)) continue;

    const pipelineIndices = [operations[i].index];
    let hasAsyncChainOp = false;

    for (let j = i + 1; j < operations.length; j++) {
      if (ASYNC_CHAIN_METHODS.has(operations[j].method)) {
        pipelineIndices.push(operations[j].index);
        hasAsyncChainOp = true;
      } else if (NON_SWITCH_METHODS.has(operations[j].method)) {
        // Permitted intervening non-switch ops
        pipelineIndices.push(operations[j].index);
      } else {
        break;
      }
    }

    if (hasAsyncChainOp) {
      patterns.push({
        name: "Async Processing Pipeline",
        description: "Promise result is processed through async transformations.",
        operationIndices: pipelineIndices,
      });
    }
  }
}

/**
 * Guard and Process: andThrough immediately followed by andThen
 * (with 0+ inspect/andTee in between).
 */
function detectGuardAndProcess(
  operations: readonly ResultOperationDescriptor[],
  patterns: ChainPattern[]
): void {
  for (let i = 0; i < operations.length; i++) {
    if (operations[i].method !== "andThrough") continue;

    // Look forward for andThen, skipping observation ops
    for (let j = i + 1; j < operations.length; j++) {
      const method = operations[j].method;
      if (method === "andThen" || method === "asyncAndThen") {
        patterns.push({
          name: "Guard and Process",
          description:
            "andThrough validates without changing the value, then andThen processes it.",
          operationIndices: [operations[i].index, operations[j].index],
        });
        break;
      }
      if (!OBSERVATION_METHODS.has(method)) {
        break;
      }
    }
  }
}

/**
 * Exhaustive Handling: The terminal (last) operation is match.
 */
function detectExhaustiveHandling(
  operations: readonly ResultOperationDescriptor[],
  patterns: ChainPattern[]
): void {
  if (operations.length === 0) return;
  const last = operations[operations.length - 1];
  if (last.method === "match") {
    patterns.push({
      name: "Exhaustive Handling",
      description: "match handles both Ok and Err cases, ensuring no unhandled errors.",
      operationIndices: [last.index],
    });
  }
}
