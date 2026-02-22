/**
 * Audit infrastructure barrel.
 * @packageDocumentation
 */

export {
  createAuditChain,
  appendEntry,
  verifyChain,
  type AuditEntry,
  type AuditEntryInput,
  type AuditChain,
} from "./integrity.js";

export {
  createAuditSink,
  type AuditSink,
  type AuditSinkConfig,
} from "./sink.js";

export {
  createMonotonicTimer,
  type MonotonicTimer,
} from "./monotonic-timing.js";

export {
  createAuditBridge,
  type AuditBridge,
  type AuditBridgeConfig,
} from "./bridge.js";

export {
  createAuditSchema,
  migrateAuditEntry,
  CURRENT_SCHEMA_VERSION,
  type VersionedAuditEntry,
} from "./schema-versioning.js";

export {
  createFailFastAudit,
  type FailFastConfig,
} from "./fail-fast.js";
