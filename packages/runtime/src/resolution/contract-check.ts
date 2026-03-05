/**
 * Contract checking integration for the resolution pipeline.
 *
 * Performs opt-in runtime interface conformance checking on resolved service
 * instances. When a port declares `methods` metadata, the instance is verified
 * against the expected interface before being returned.
 *
 * @see {@link https://hex-di.dev/spec/core/behaviors/10-contract-validation | BEH-CO-10}
 *
 * @packageDocumentation
 * @internal
 */

import type { Port } from "@hex-di/core";
import {
  getPortMetadata,
  checkConformance,
  deriveMethodSpecs,
  ContractViolationError,
  createBlameContext,
} from "@hex-di/core";
import type { ContractCheckMode } from "@hex-di/core";
import { ResolutionContext } from "./context.js";

// =============================================================================
// maybeCheckContract
// =============================================================================

/**
 * Conditionally performs contract conformance checking on a resolved instance.
 *
 * Called after the factory returns `Ok` and before freeze. Only runs when:
 * 1. `contractChecks` mode is not `"off"`
 * 2. The port has `methods` metadata defined
 *
 * In `"warn"` mode, violations are logged to console but resolution proceeds.
 * In `"strict"` mode, violations throw a `ContractViolationError`.
 *
 * @param instance - The resolved service instance
 * @param port - The port being resolved
 * @param mode - The contract check mode
 * @param resolutionContext - The current resolution context for blame attribution
 *
 * @internal
 */
export function maybeCheckContract(
  instance: unknown,
  port: Port<string, unknown>,
  mode: ContractCheckMode,
  resolutionContext: ResolutionContext
): void {
  if (mode === "off") {
    return;
  }

  const metadata = getPortMetadata(port);
  if (metadata === undefined || metadata.methods === undefined || metadata.methods.length === 0) {
    return;
  }

  const memberSpecs = deriveMethodSpecs(metadata.methods);
  const result = checkConformance(instance, memberSpecs);

  if (result.conforms) {
    return;
  }

  const portName = port.__portName;

  if (mode === "warn") {
    // Use globalThis.console to avoid TS issues in environments without dom lib
    const g = globalThis as Record<string, unknown>;
    const cons = g.console as { warn?: (...args: unknown[]) => void } | undefined;
    if (cons && typeof cons.warn === "function") {
      const violationSummary = result.violations
        .map(v => `  - [${v._tag}] ${v.memberName}: expected ${v.expected}, got ${v.actual}`)
        .join("\n");
      cons.warn(
        `[@hex-di/runtime] Contract violations on port '${portName}':\n${violationSummary}`
      );
    }
    return;
  }

  // mode === "strict" — throw ContractViolationError
  const resolutionPath = resolutionContext.getPath();
  const blame = createBlameContext({
    adapterFactory: { name: portName },
    portContract: {
      name: portName,
      direction: getPortMetadata(port)?.category === "domain" ? "inbound" : "outbound",
    },
    violationType: {
      _tag: "ContractViolation",
      details: formatViolationSummary(portName, result.violations),
    },
    resolutionPath,
  });

  throw new ContractViolationError(portName, portName, result.violations, blame);
}

/**
 * Formats a concise violation summary for the blame context details.
 */
function formatViolationSummary(
  portName: string,
  violations: ReadonlyArray<{ readonly _tag: string; readonly memberName: string }>
): string {
  if (violations.length === 1) {
    const v = violations[0];
    return `${v._tag}: '${v.memberName}' on adapter for port '${portName}'`;
  }
  return `${violations.length} contract violations on adapter for port '${portName}'`;
}
