/**
 * Capabilities Module
 *
 * Type-level unification of port injection and guard policies.
 * Ports ARE capabilities.
 *
 * @packageDocumentation
 */

// Types
export type {
  Capability,
  ConstrainedCapability,
  CapabilityConstraints,
  MethodConstraint,
  ServiceOf,
  NameOf,
  IsConstrained,
  ConstraintsOf,
  CapabilitiesAvailable,
} from "./types.js";

// Runtime utilities
export { methodConstraint, constrainCapability, getConstrainedMethods } from "./constraints.js";
