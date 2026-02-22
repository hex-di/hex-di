import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { AuditEntry } from "./types.js";
import type { ArchivalError, ChainIntegrityError } from "../errors/types.js";
import { ACL029 } from "../errors/codes.js";

/**
 * Archived audit trail following the guard-audit-archive schema.
 */
export interface GuardAuditArchive {
  readonly archiveVersion: "guard-audit-archive@1.0.0";
  readonly metadata: {
    readonly createdAt: string;
    readonly entryCount: number;
    readonly chainIntegrityVerified: boolean;
  };
  readonly chains: ReadonlyArray<{
    readonly scopeId: string;
    readonly entries: ReadonlyArray<AuditEntry>;
  }>;
  readonly keyMaterial?: ReadonlyArray<{
    readonly keyId: string;
    readonly algorithm: string;
    readonly publicKey: string;
  }>;
}

/**
 * A required step in the decommissioning checklist.
 */
export interface DecommissioningStep {
  readonly id: string;
  readonly description: string;
  readonly required: boolean;
  readonly completed: boolean;
  readonly completedAt?: string;
  readonly completedBy?: string;
}

/**
 * Decommissioning checklist ensuring all required steps are performed.
 */
export interface DecommissioningChecklist {
  readonly checklistId: string;
  readonly createdAt: string;
  readonly steps: ReadonlyArray<DecommissioningStep>;
  readonly allRequiredComplete: boolean;
}

/**
 * Options for archiving an audit trail.
 */
export interface ArchivalOptions {
  readonly keyMaterial?: ReadonlyArray<{
    readonly keyId: string;
    readonly algorithm: string;
    readonly publicKey: string;
  }>;
  /** Whether to skip chain integrity verification (not recommended). */
  readonly skipIntegrityVerification?: boolean;
}

/**
 * Groups audit entries by scopeId.
 */
function groupByScopeId(entries: readonly AuditEntry[]): Map<string, AuditEntry[]> {
  const groups = new Map<string, AuditEntry[]>();
  for (const entry of entries) {
    const existing = groups.get(entry.scopeId);
    if (existing !== undefined) {
      existing.push(entry);
    } else {
      groups.set(entry.scopeId, [entry]);
    }
  }
  return groups;
}

/**
 * Verifies basic chain integrity (sequence numbers are present and ascending within scope).
 * Returns a ChainIntegrityError if gaps are found, undefined otherwise.
 */
function verifyChainIntegrity(
  entries: readonly AuditEntry[],
  scopeId: string,
): ChainIntegrityError | undefined {
  const sequenced = entries.filter((e) => e.sequenceNumber !== undefined);
  if (sequenced.length === 0) return undefined;

  const sorted = [...sequenced].sort(
    (a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0),
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].sequenceNumber ?? 0;
    const curr = sorted[i].sequenceNumber ?? 0;
    if (curr !== prev + 1) {
      return Object.freeze({
        code: ACL029,
        message: `Chain integrity gap in scope '${scopeId}': expected sequence ${prev + 1}, got ${curr}`,
        scopeId,
      });
    }
  }

  return undefined;
}

/**
 * Archives an audit trail into a portable archive format.
 *
 * Verifies chain integrity before archival. Rejects if gaps are found
 * (unless skipIntegrityVerification is set).
 */
export function archiveAuditTrail(
  entries: readonly AuditEntry[],
  options?: ArchivalOptions,
): Result<GuardAuditArchive, ArchivalError | ChainIntegrityError> {
  const skipVerify = options?.skipIntegrityVerification ?? false;
  const groups = groupByScopeId(entries);

  // Verify chain integrity for all scopes
  if (!skipVerify) {
    for (const [scopeId, scopeEntries] of groups) {
      const integrityError = verifyChainIntegrity(scopeEntries, scopeId);
      if (integrityError !== undefined) {
        return err(integrityError);
      }
    }
  }

  const chains = [...groups.entries()].map(([scopeId, scopeEntries]) => ({
    scopeId,
    entries: Object.freeze([...scopeEntries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )),
  }));

  const archive: GuardAuditArchive = Object.freeze({
    archiveVersion: "guard-audit-archive@1.0.0" as const,
    metadata: Object.freeze({
      createdAt: new Date().toISOString(),
      entryCount: entries.length,
      chainIntegrityVerified: !skipVerify,
    }),
    chains: Object.freeze(chains),
    ...(options?.keyMaterial !== undefined
      ? { keyMaterial: Object.freeze([...options.keyMaterial]) }
      : {}),
  });

  return ok(archive);
}

/**
 * Creates a decommissioning checklist with the standard required steps.
 */
export function createDecommissioningChecklist(): DecommissioningChecklist {
  const steps: DecommissioningStep[] = [
    {
      id: "DECOMM-001",
      description: "Export all audit trail entries to archive format",
      required: true,
      completed: false,
    },
    {
      id: "DECOMM-002",
      description: "Verify chain integrity of exported archive",
      required: true,
      completed: false,
    },
    {
      id: "DECOMM-003",
      description: "Transfer archive to long-term storage",
      required: true,
      completed: false,
    },
    {
      id: "DECOMM-004",
      description: "Revoke all active signing keys",
      required: true,
      completed: false,
    },
    {
      id: "DECOMM-005",
      description: "Record final PolicyChangeAuditEntry with reason 'system-decommission'",
      required: true,
      completed: false,
    },
    {
      id: "DECOMM-006",
      description: "Verify all active scopes disposed",
      required: true,
      completed: false,
    },
    {
      id: "DECOMM-007",
      description: "Notify regulatory authority if required",
      required: false,
      completed: false,
    },
  ];

  return Object.freeze({
    checklistId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    steps: Object.freeze(steps),
    allRequiredComplete: false,
  });
}

/**
 * Returns an updated checklist with the specified step marked as complete.
 */
export function completeDecommissioningStep(
  checklist: DecommissioningChecklist,
  stepId: string,
  completedBy: string,
): DecommissioningChecklist {
  const completedAt = new Date().toISOString();
  const steps = checklist.steps.map((step) =>
    step.id === stepId
      ? Object.freeze({ ...step, completed: true, completedAt, completedBy })
      : step,
  );

  const allRequiredComplete = steps
    .filter((s) => s.required)
    .every((s) => s.completed);

  return Object.freeze({
    ...checklist,
    steps: Object.freeze(steps),
    allRequiredComplete,
  });
}
