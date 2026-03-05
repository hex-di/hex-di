/**
 * Capability Analyzer Module
 *
 * Static and runtime analysis of adapter factories for ambient authority patterns.
 *
 * @packageDocumentation
 */

export type {
  AmbientAuthorityKind,
  AmbientAuthorityDetection,
  AdapterAuditEntry,
  CapabilityAuditReport,
} from "./types.js";

export { detectAmbientAuthority } from "./analyzer.js";
export { auditGraph } from "./audit.js";
