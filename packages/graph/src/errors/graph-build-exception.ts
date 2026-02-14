/**
 * Exception class that preserves full GraphBuildError payload.
 *
 * Thrown by build() and buildFragment() instead of plain Error.
 * Consumers can access the structured error via the .cause property
 * for audit trail reconstruction.
 *
 * Compatible with standard Error handling:
 * - instanceof Error === true
 * - .message contains human-readable string
 * - .cause contains the full GraphBuildError discriminated union
 * - .name === "GraphBuildException"
 *
 * @packageDocumentation
 */

import type { GraphBuildError } from "./graph-build-errors.js";

/**
 * Exception preserving the full structured GraphBuildError.
 *
 * @example
 * ```typescript
 * try {
 *   graph.build();
 * } catch (e) {
 *   if (e instanceof GraphBuildException) {
 *     switch (e.cause._tag) {
 *       case "CyclicDependency":
 *         console.log("Cycle path:", e.cause.cyclePath);
 *         break;
 *       case "CaptiveDependency":
 *         console.log("Captive:", e.cause.dependentPort, "->", e.cause.captivePort);
 *         break;
 *     }
 *   }
 * }
 * ```
 */
export class GraphBuildException extends Error {
  override readonly name = "GraphBuildException" as const;
  readonly cause: GraphBuildError;

  constructor(error: GraphBuildError) {
    super(error.message);
    this.cause = Object.freeze({ ...error });
    Object.freeze(this);
  }
}
