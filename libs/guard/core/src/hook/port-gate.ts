/**
 * Port gate hook — coarse-grained static port gating via beforeResolve hook.
 *
 * Uses a static allow/deny map keyed by port name.
 * No subject, no resource, no policy evaluation.
 */
import { ACL031 } from "../errors/codes.js";

/**
 * A gate rule for a single port.
 */
export type PortGateRule =
  | { readonly action: "deny"; readonly reason: string }
  | { readonly action: "allow" };

/**
 * Configuration for the port gate hook.
 */
export interface PortGateConfig {
  readonly [portName: string]: PortGateRule;
}

/**
 * Error thrown when a port gate denies resolution.
 */
export class PortGatedError extends Error {
  readonly code = ACL031;

  constructor(
    readonly portName: string,
    readonly reason: string,
  ) {
    super(`Port '${portName}' is gated: ${reason}`);
    this.name = "PortGatedError";
  }
}

/**
 * Resolution hook interface — minimal subset needed for typing.
 */
export interface ResolutionHook {
  beforeResolve(context: { readonly portName: string }): void;
}

/**
 * Creates a beforeResolve hook that gates port resolution based on
 * a static configuration map.
 *
 * @gxp-warning This hook operates at the infrastructure level — it fires
 * BEFORE subject resolution and guard evaluation. Use it for coarse-grained
 * feature flags and environment-level port disabling. It does NOT produce
 * audit trail entries; for GxP-compliant access control, use enforcePolicy().
 */
export function createPortGateHook(config: PortGateConfig): ResolutionHook {
  return {
    beforeResolve(context: { readonly portName: string }): void {
      const rule = config[context.portName];
      if (rule === undefined) return;

      if (rule.action === "deny") {
        throw new PortGatedError(context.portName, rule.reason);
      }
      // action === "allow" -> proceed
    },
  };
}

/**
 * Result from a GxP readiness check of port gating coverage.
 */
export interface GxPReadinessResult {
  readonly ready: boolean;
  readonly issues: readonly string[];
}

/**
 * Checks GxP readiness by verifying that every port with a gate
 * also has a guard() adapter registered.
 *
 * In GxP-regulated systems, coarse-grained port gates alone are
 * insufficient for audit compliance. Each gated port must also be
 * wrapped with enforcePolicy() (a guard adapter) to produce the
 * required ALCOA+ audit trail entries.
 *
 * @param portNamesWithGate - Port names that have a PortGateHook configured
 * @param portNamesWithGuard - Port names wrapped with a guard() adapter
 */
export function checkGxPReadiness(
  portNamesWithGate: readonly string[],
  portNamesWithGuard: readonly string[],
): GxPReadinessResult {
  const guardSet = new Set(portNamesWithGuard);
  const issues: string[] = [];
  for (const portName of portNamesWithGate) {
    if (!guardSet.has(portName)) {
      issues.push(
        `Port "${portName}" has a PortGateHook but no guard() adapter — GxP requires both`,
      );
    }
  }
  return Object.freeze({ ready: issues.length === 0, issues: Object.freeze([...issues]) });
}
