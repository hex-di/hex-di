/**
 * Blame-enhanced error formatting.
 *
 * Produces box-drawn ASCII output for container errors that include
 * blame context, suitable for terminal display.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/06-blame-aware-errors | BEH-CO-06-003}
 *
 * @packageDocumentation
 */

import type { ContainerError } from "./base.js";
import type { BlameContext, BlameViolationType } from "./blame.js";

// =============================================================================
// Violation Formatting
// =============================================================================

function formatViolationType(violation: BlameViolationType): string {
  switch (violation._tag) {
    case "FactoryError":
      return `FactoryError — ${String(violation.error)}`;
    case "LifetimeViolation":
      return `LifetimeViolation — expected ${violation.expected}, got ${violation.actual}`;
    case "MissingDependency":
      return `MissingDependency — ${violation.missingPort}`;
    case "DisposalError":
      return `DisposalError — ${String(violation.error)}`;
    case "ContractViolation":
      return `ContractViolation — ${violation.details}`;
  }
}

// =============================================================================
// Box-Drawing Formatter
// =============================================================================

/**
 * Formats a container error with blame context into box-drawn ASCII output.
 *
 * If the error has no blame context, returns the plain error message.
 *
 * @param error - The container error to format
 * @returns Formatted ASCII string with blame information
 *
 * @example
 * ```
 * ┌─ Resolution Error ────────────────────────────────
 * │ Port: "Database" (outbound)
 * │ Adapter: DatabaseAdapter
 * │ Violation: FactoryError — ConnectionFailed
 * │ Path: UserService → Repository → Database
 * └───────────────────────────────────────────────────
 * ```
 */
export function formatBlameError(error: ContainerError): string {
  const blame = (error as ContainerError & { blame?: BlameContext }).blame;
  if (blame === undefined) {
    return error.message;
  }

  const errorType = error.name;
  const header = `\u250C\u2500 ${errorType} `;
  const headerPadding = "\u2500".repeat(Math.max(0, 52 - header.length));
  const headerLine = `${header}${headerPadding}`;

  const portLine = `\u2502 Port: "${blame.portContract.name}" (${blame.portContract.direction})`;
  const adapterLine = `\u2502 Adapter: ${blame.adapterFactory.name}${blame.adapterFactory.sourceLocation ? ` (${blame.adapterFactory.sourceLocation})` : ""}`;
  const violationLine = `\u2502 Violation: ${formatViolationType(blame.violationType)}`;
  const pathLine = `\u2502 Path: ${blame.resolutionPath.join(" \u2192 ")}`;
  const footerLine = `\u2514${"─".repeat(51)}`;

  return [headerLine, portLine, adapterLine, violationLine, pathLine, footerLine].join("\n");
}
