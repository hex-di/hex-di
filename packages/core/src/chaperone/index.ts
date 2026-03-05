/**
 * Chaperone Contract Enforcement
 *
 * Proxy-based runtime contract enforcement for resolved services.
 *
 * @packageDocumentation
 */

export { chaperoneService, createPortContract } from "./chaperone.js";
export type {
  EnforcementMode,
  ChaperoneConfig,
  ChaperoneViolation,
  PortContract,
} from "./types.js";
