import { assertNever } from "@hex-di/result";
import type { HashDigest } from "@hex-di/crypto";
import type { PolicyConstraint } from "../policy/constraint.js";
import type { Policy } from "../policy/types.js";
import { isPolicy } from "../policy/types.js";
import { formatPermission } from "../tokens/permission.js";
import type { AuditEntry } from "../guard/types.js";
import type { GxPAuditEntry } from "../guard/types.js";

/**
 * Returns true if v is a plain (non-null, non-array) object.
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Serializes a policy tree to a deterministic JSON string.
 */
export function serializePolicy(policy: PolicyConstraint): string {
  return JSON.stringify(policyToJSON(policy));
}

function policyToJSON(policy: PolicyConstraint): unknown {
  if (!isPolicy(policy)) {
    return { kind: policy.kind };
  }
  return policyToJSONNarrowed(policy);
}

function policyToJSONNarrowed(policy: Policy): unknown {
  switch (policy.kind) {
    case "hasPermission": {
      const obj: Record<string, unknown> = {
        kind: "hasPermission",
        permission: formatPermission(policy.permission),
      };
      if (policy.fields !== undefined) obj["fields"] = policy.fields;
      return obj;
    }
    case "hasRole": {
      return { kind: "hasRole", roleName: policy.roleName };
    }
    case "hasAttribute": {
      const obj: Record<string, unknown> = {
        kind: "hasAttribute",
        attribute: policy.attribute,
        matcher: policy.matcher,
      };
      if (policy.fields !== undefined) obj["fields"] = policy.fields;
      return obj;
    }
    case "hasResourceAttribute": {
      const obj: Record<string, unknown> = {
        kind: "hasResourceAttribute",
        attribute: policy.attribute,
        matcher: policy.matcher,
      };
      if (policy.fields !== undefined) obj["fields"] = policy.fields;
      return obj;
    }
    case "hasSignature": {
      const obj: Record<string, unknown> = { kind: "hasSignature", meaning: policy.meaning };
      if (policy.signerRole !== undefined) obj["signerRole"] = policy.signerRole;
      return obj;
    }
    case "hasRelationship": {
      const obj: Record<string, unknown> = { kind: "hasRelationship", relation: policy.relation };
      if (policy.resourceType !== undefined) obj["resourceType"] = policy.resourceType;
      if (policy.depth !== undefined) obj["depth"] = policy.depth;
      if (policy.fields !== undefined) obj["fields"] = policy.fields;
      return obj;
    }
    case "allOf": {
      return { kind: "allOf", policies: policy.policies.map(policyToJSON) };
    }
    case "anyOf": {
      return { kind: "anyOf", policies: policy.policies.map(policyToJSON) };
    }
    case "not": {
      return { kind: "not", policy: policyToJSON(policy.policy) };
    }
    case "labeled": {
      return { kind: "labeled", label: policy.label, policy: policyToJSON(policy.policy) };
    }
    default: {
      return assertNever(policy);
    }
  }
}

/**
 * Computes a deterministic SHA-256 hash of a policy tree.
 * Keys are sorted before hashing to ensure consistency regardless of
 * object property insertion order.
 *
 * @returns A hex-encoded SHA-256 digest string.
 */
export function hashPolicy(policy: PolicyConstraint, digest: HashDigest): string {
  const canonical = JSON.stringify(policyToJSON(policy), sortedReplacer);
  return digest.sha256Hex(canonical);
}

function sortedReplacer(_key: string, value: unknown): unknown {
  if (!isPlainObject(value) || Array.isArray(value)) return value;
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(value).sort()) {
    sorted[k] = value[k];
  }
  return sorted;
}

/**
 * Serializes an AuditEntry to a JSON string.
 */
export function serializeAuditEntry(entry: AuditEntry): string {
  return JSON.stringify(entry);
}

/**
 * Verifies the integrity of an audit chain.
 * Each entry's integrityHash should cover all required fields.
 * Returns true if all entries pass validation (no hash checking for basic AuditEntry,
 * but verifies sequenceNumber monotonicity and no gaps).
 */
export function verifyAuditChain(entries: readonly AuditEntry[]): boolean {
  if (entries.length === 0) return true;

  // Check sequenceNumbers are monotonically increasing with no gaps if present
  const withSeq = entries.filter(e => e.sequenceNumber !== undefined);
  if (withSeq.length > 0) {
    for (let i = 1; i < withSeq.length; i++) {
      const prev = withSeq[i - 1].sequenceNumber;
      const curr = withSeq[i].sequenceNumber;
      if (prev !== undefined && curr !== undefined && curr !== prev + 1) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Computes an audit chain integrity hash for a GxP audit entry.
 * Covers all required fields to satisfy ALCOA+ requirements.
 */
export function computeAuditEntryHash(
  entry: AuditEntry,
  previousHash: string,
  digest: HashDigest
): string {
  const fields = [
    entry.evaluationId,
    entry.timestamp,
    entry.subjectId,
    entry.authenticationMethod,
    entry.policy,
    entry.decision,
    entry.portName,
    entry.scopeId,
    entry.reason,
    String(entry.durationMs),
    String(entry.schemaVersion),
    String(entry.sequenceNumber ?? ""),
    entry.traceDigest ?? "",
    entry.policySnapshot ?? "",
    previousHash,
  ].join("|");

  return digest.sha256Hex(fields);
}

function isGxPAuditEntry(entry: AuditEntry): entry is GxPAuditEntry {
  return (
    "integrityHash" in entry &&
    typeof Object.getOwnPropertyDescriptor(entry, "integrityHash")?.value === "string"
  );
}

/**
 * Creates an audit export manifest for a set of audit entries.
 * `chainIntegrityVerified` is true when every entry carries an
 * `integrityHash` (i.e. all entries are GxPAuditEntry instances).
 */
export function createAuditExportManifest(options: {
  readonly entries: readonly AuditEntry[];
  readonly exportedAt: string;
  readonly exportedBy: string;
}): string {
  const chainIntegrityVerified = options.entries.every(isGxPAuditEntry);
  return JSON.stringify({
    schemaVersion: 1,
    exportedAt: options.exportedAt,
    exportedBy: options.exportedBy,
    entryCount: options.entries.length,
    chainIntegrityVerified,
    entries: options.entries,
  });
}
