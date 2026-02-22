import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type {
  MetaAuditEntry,
  MetaAuditTrail,
  DataClassificationChangeEntry,
} from "@hex-di/guard";
import { ACL011 } from "@hex-di/guard";

/**
 * Extended interface for in-memory meta-audit trail with query capabilities.
 */
export interface MemoryMetaAuditTrail extends MetaAuditTrail {
  /** Returns all recorded meta-audit entries. */
  readonly entries: readonly MetaAuditEntry[];
  /** Returns all recorded classification change entries. */
  readonly classificationChanges: readonly DataClassificationChangeEntry[];
  /** Clears all recorded entries. */
  clear(): void;
  /** Returns entries filtered by accessType. */
  queryByAccessType(accessType: MetaAuditEntry["accessType"]): readonly MetaAuditEntry[];
  /** Returns entries filtered by actorId. */
  queryByActor(actorId: string): readonly MetaAuditEntry[];
}

/**
 * Creates an in-memory meta-audit trail for testing.
 * All entries are held in-memory and are queryable.
 */
export function createMemoryMetaAuditTrail(options?: {
  /** When true, recordAccess() will always fail (for testing error paths). */
  readonly alwaysFail?: boolean;
}): MemoryMetaAuditTrail {
  const _entries: MetaAuditEntry[] = [];
  const _classificationChanges: DataClassificationChangeEntry[] = [];

  return {
    get entries(): readonly MetaAuditEntry[] {
      return Object.freeze([..._entries]);
    },

    get classificationChanges(): readonly DataClassificationChangeEntry[] {
      return Object.freeze([..._classificationChanges]);
    },

    recordAccess(entry: MetaAuditEntry): Result<void, { code: typeof ACL011; message: string }> {
      if (options?.alwaysFail) {
        return err({ code: ACL011, message: "Simulated meta-audit write failure" });
      }
      _entries.push(entry);
      return ok(undefined);
    },

    recordClassificationChange(
      entry: DataClassificationChangeEntry,
    ): Result<void, { code: typeof ACL011; message: string }> {
      if (options?.alwaysFail) {
        return err({ code: ACL011, message: "Simulated meta-audit write failure" });
      }
      _classificationChanges.push(entry);
      return ok(undefined);
    },

    clear(): void {
      _entries.length = 0;
      _classificationChanges.length = 0;
    },

    queryByAccessType(accessType: MetaAuditEntry["accessType"]): readonly MetaAuditEntry[] {
      return Object.freeze(_entries.filter((e) => e.accessType === accessType));
    },

    queryByActor(actorId: string): readonly MetaAuditEntry[] {
      return Object.freeze(_entries.filter((e) => e.actorId === actorId));
    },
  };
}
