import type { AuditEntry, AuditTrail, AuditQueryPort } from "@hex-di/guard";
import { verifyAuditChain } from "@hex-di/guard";
import { ok } from "@hex-di/result";

/**
 * Validation result for a single audit entry.
 */
export interface AuditEntryValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly entry: AuditEntry;
}

/**
 * In-memory audit trail for testing authorization decisions.
 * Records all entries in order and provides query utilities.
 */
export interface MemoryAuditTrail extends AuditTrail, AuditQueryPort {
  /** All recorded entries in insertion order. */
  readonly entries: readonly AuditEntry[];
  /** Returns all entries for a given subjectId. */
  getBySubject(subjectId: string): readonly AuditEntry[];
  /** Returns all entries for a given portName. */
  getByPort(portName: string): readonly AuditEntry[];
  /** Returns all entries with the given decision. */
  getByDecision(decision: "allow" | "deny"): readonly AuditEntry[];
  /** Clears all recorded entries. */
  clear(): void;
  /** Validates a single audit entry against required field constraints. */
  validateEntry(entry: AuditEntry): AuditEntryValidationResult;
  /** Validates all recorded entries and returns results for invalid ones. */
  validateChain(): readonly AuditEntryValidationResult[];
  /** Asserts all recorded entries are valid; throws if any are not. */
  assertAllEntriesValid(): void;
  /** Verifies the audit chain integrity using sequenceNumber monotonicity. */
  verifyChain(): boolean;
}

const REQUIRED_FIELDS: ReadonlyArray<keyof AuditEntry> = [
  "evaluationId",
  "timestamp",
  "subjectId",
  "authenticationMethod",
  "policy",
  "decision",
  "portName",
  "scopeId",
  "reason",
  "schemaVersion",
];

function validateAuditEntry(entry: AuditEntry): AuditEntryValidationResult {
  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const value = entry[field];
    if (value === undefined || value === null || value === "") {
      errors.push(`Missing or empty required field: ${field}`);
    }
  }

  if (entry.decision !== "allow" && entry.decision !== "deny") {
    errors.push(`Invalid decision value: ${String(entry.decision)}`);
  }

  if (entry.schemaVersion !== 1) {
    errors.push(`Unknown schemaVersion: ${String(entry.schemaVersion)}`);
  }

  // Timestamp must be a parseable ISO 8601 string
  if (entry.timestamp && isNaN(Date.parse(entry.timestamp))) {
    errors.push(`Invalid timestamp format: ${entry.timestamp}`);
  }

  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), entry });
}

/**
 * Creates an in-memory audit trail suitable for testing.
 *
 * @example
 * ```ts
 * const auditTrail = createMemoryAuditTrail();
 * enforcePolicy({ ..., auditTrail });
 * expect(auditTrail.entries).toHaveLength(1);
 * expect(auditTrail.entries[0].decision).toBe("allow");
 * auditTrail.assertAllEntriesValid();
 * ```
 */
export function createMemoryAuditTrail(): MemoryAuditTrail {
  const _entries: AuditEntry[] = [];

  const trail: MemoryAuditTrail = {
    get entries(): readonly AuditEntry[] {
      return _entries;
    },

    record(entry: AuditEntry) {
      _entries.push(entry);
      return ok(undefined);
    },

    getBySubject(subjectId: string): readonly AuditEntry[] {
      return _entries.filter((e) => e.subjectId === subjectId);
    },

    getByPort(portName: string): readonly AuditEntry[] {
      return _entries.filter((e) => e.portName === portName);
    },

    getByDecision(decision: "allow" | "deny"): readonly AuditEntry[] {
      return _entries.filter((e) => e.decision === decision);
    },

    clear(): void {
      _entries.length = 0;
    },

    validateEntry(entry: AuditEntry): AuditEntryValidationResult {
      return validateAuditEntry(entry);
    },

    validateChain(): readonly AuditEntryValidationResult[] {
      return _entries
        .map((e) => validateAuditEntry(e))
        .filter((r) => !r.valid);
    },

    assertAllEntriesValid(): void {
      const invalid = _entries.map((e) => validateAuditEntry(e)).filter((r) => !r.valid);
      if (invalid.length > 0) {
        const messages = invalid.flatMap((r) => r.errors).join("; ");
        throw new Error(`MemoryAuditTrail: ${invalid.length} invalid entries: ${messages}`);
      }
    },

    verifyChain(): boolean {
      return verifyAuditChain(_entries);
    },

    queryByEvaluationId(id: string): AuditEntry | undefined {
      return _entries.find((e) => e.evaluationId === id);
    },

    queryBySubjectId(
      subjectId: string,
      options?: { readonly from?: string; readonly to?: string },
    ): readonly AuditEntry[] {
      return _entries.filter((e) => {
        if (e.subjectId !== subjectId) return false;
        if (options?.from !== undefined && e.timestamp < options.from) return false;
        if (options?.to !== undefined && e.timestamp > options.to) return false;
        return true;
      });
    },

    queryByTimeRange(
      from: string,
      to: string,
      options?: { readonly decision?: "allow" | "deny" },
    ): readonly AuditEntry[] {
      return _entries.filter((e) => {
        if (e.timestamp < from || e.timestamp > to) return false;
        if (options?.decision !== undefined && e.decision !== options.decision) return false;
        return true;
      });
    },

    queryByPortName(
      portName: string,
      options?: { readonly from?: string; readonly to?: string },
    ): readonly AuditEntry[] {
      return _entries.filter((e) => {
        if (e.portName !== portName) return false;
        if (options?.from !== undefined && e.timestamp < options.from) return false;
        if (options?.to !== undefined && e.timestamp > options.to) return false;
        return true;
      });
    },

    exportEntries(options?: { readonly format?: "json" | "jsonl" | "csv" }): string {
      const format = options?.format ?? "jsonl";
      if (format === "json") {
        return JSON.stringify(_entries, null, 2);
      }
      if (format === "csv") {
        const header = [
          "evaluationId",
          "timestamp",
          "subjectId",
          "authenticationMethod",
          "policy",
          "decision",
          "portName",
          "scopeId",
          "reason",
          "durationMs",
          "schemaVersion",
        ].join(",");
        const rows = _entries.map((e) =>
          [
            csvEscape(e.evaluationId),
            csvEscape(e.timestamp),
            csvEscape(e.subjectId),
            csvEscape(e.authenticationMethod),
            csvEscape(e.policy),
            csvEscape(e.decision),
            csvEscape(e.portName),
            csvEscape(e.scopeId),
            csvEscape(e.reason),
            String(e.durationMs),
            String(e.schemaVersion),
          ].join(","),
        );
        return [header, ...rows].join("\n");
      }
      // default: jsonl
      return _entries.map((e) => JSON.stringify(e)).join("\n");
    },
  };

  return trail;
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
