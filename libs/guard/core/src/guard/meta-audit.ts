import { ok } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { MetaAuditWriteError } from "../errors/types.js";
import { ACL011 } from "../errors/codes.js";

/**
 * An audit entry recording access to the audit trail itself (audit of audit).
 * Implements ALCOA+ requirement for complete and accurate audit records.
 */
export interface MetaAuditEntry {
  readonly _tag: "MetaAuditEntry";
  readonly metaAuditId: string;
  readonly timestamp: string;
  readonly actorId: string;
  readonly accessType: "read" | "export" | "verify" | "replay";
  readonly description: string;
  readonly entryCount: number;
  readonly simulated: boolean;
  readonly scope: string;
  readonly dataClassification?: string;
}

/**
 * An audit entry recording changes to the dataClassification field.
 */
export interface DataClassificationChangeEntry {
  readonly _tag: "DataClassificationChangeEntry";
  readonly changeId: string;
  readonly timestamp: string;
  readonly actorId: string;
  readonly scope: string;
  readonly previousClassification: string | undefined;
  readonly newClassification: string;
  readonly reason: string;
}

/**
 * Service interface for recording meta-audit entries.
 */
export interface MetaAuditTrail {
  recordAccess(entry: MetaAuditEntry): Result<void, MetaAuditWriteError>;
  recordClassificationChange(entry: DataClassificationChangeEntry): Result<void, MetaAuditWriteError>;
}

/**
 * Port for the meta-audit trail service.
 */
export type MetaAuditTrailPort = MetaAuditTrail;

/**
 * Creates a MetaAuditEntry with a generated ID and current timestamp.
 */
export function createMetaAuditEntry(options: {
  readonly actorId: string;
  readonly accessType: MetaAuditEntry["accessType"];
  readonly description: string;
  readonly entryCount: number;
  readonly scope: string;
  readonly simulated?: boolean;
  readonly dataClassification?: string;
}): MetaAuditEntry {
  return Object.freeze({
    _tag: "MetaAuditEntry" as const,
    metaAuditId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actorId: options.actorId,
    accessType: options.accessType,
    description: options.description,
    entryCount: options.entryCount,
    simulated: options.simulated ?? false,
    scope: options.scope,
    ...(options.dataClassification !== undefined
      ? { dataClassification: options.dataClassification }
      : {}),
  });
}

/**
 * Creates a DataClassificationChangeEntry.
 */
export function createDataClassificationChangeEntry(options: {
  readonly actorId: string;
  readonly scope: string;
  readonly previousClassification: string | undefined;
  readonly newClassification: string;
  readonly reason: string;
}): DataClassificationChangeEntry {
  return Object.freeze({
    _tag: "DataClassificationChangeEntry" as const,
    changeId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actorId: options.actorId,
    scope: options.scope,
    previousClassification: options.previousClassification,
    newClassification: options.newClassification,
    reason: options.reason,
  });
}

/**
 * Creates a no-op meta-audit trail that discards all entries.
 * Not suitable for GxP environments.
 */
export function createNoopMetaAuditTrail(): MetaAuditTrailPort {
  return {
    recordAccess(_entry: MetaAuditEntry): Result<void, MetaAuditWriteError> {
      return ok(undefined);
    },
    recordClassificationChange(_entry: DataClassificationChangeEntry): Result<void, MetaAuditWriteError> {
      return ok(undefined);
    },
  };
}

function createMetaAuditWriteError(message: string, cause?: unknown): MetaAuditWriteError {
  return Object.freeze({ code: ACL011, message, cause });
}

// Export for use in testing package
export { createMetaAuditWriteError };
