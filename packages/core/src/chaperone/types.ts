/**
 * Types for the chaperone contract enforcement system.
 *
 * @packageDocumentation
 */

/** Enforcement mode controls runtime checking behavior */
export type EnforcementMode = "strict" | "dev" | "warn" | "off";

/** Configuration for the chaperone */
export interface ChaperoneConfig {
  readonly mode: EnforcementMode;
  readonly onViolation?: (violation: ChaperoneViolation) => void;
}

/** A contract violation report */
export interface ChaperoneViolation {
  readonly _tag: "ChaperoneViolation";
  readonly portName: string;
  readonly member: string;
  readonly kind: "missing-method" | "invalid-return" | "type-mismatch";
  readonly message: string;
}

/** Port contract descriptor for runtime checking */
export interface PortContract {
  readonly portName: string;
  readonly members: ReadonlyArray<string>;
}
