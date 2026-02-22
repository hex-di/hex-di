/**
 * Audit integrity — FNV-1a hash chain for tamper-evident audit logs.
 *
 * Produces 8-character hexadecimal hash strings. Each entry includes a
 * timestamp, request summary, response status, and hash of the previous entry.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

export interface AuditEntry {
  readonly _tag: "AuditEntry";
  readonly index: number;
  readonly timestamp: number;
  readonly method: string;
  readonly url: string;
  readonly status: number | undefined;
  readonly previousHash: string;
  readonly hash: string;
}

export interface AuditChain {
  readonly entries: ReadonlyArray<AuditEntry>;
  readonly length: number;
  readonly lastHash: string;
}

export interface AuditEntryInput {
  readonly method: string;
  readonly url: string;
  readonly status: number | undefined;
  readonly timestamp?: number;
}

// =============================================================================
// FNV-1a hash
// =============================================================================

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnv1a(input: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  // Unsigned 32-bit to 8-char hex
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// =============================================================================
// Chain operations
// =============================================================================

/**
 * Create a new empty audit chain.
 */
export function createAuditChain(): AuditChain {
  return Object.freeze({
    entries: Object.freeze([]),
    length: 0,
    lastHash: "00000000",
  });
}

/**
 * Append an entry to the audit chain.
 * The entry is frozen and immutable after creation.
 */
export function appendEntry(
  chain: AuditChain,
  input: AuditEntryInput,
): AuditChain {
  const timestamp = input.timestamp ?? Date.now();
  const previousHash = chain.lastHash;

  const hashInput = [
    String(chain.length),
    String(timestamp),
    input.method,
    input.url,
    input.status !== undefined ? String(input.status) : "none",
    previousHash,
  ].join("|");

  const hash = fnv1a(hashInput);

  const entry: AuditEntry = Object.freeze({
    _tag: "AuditEntry" as const,
    index: chain.length,
    timestamp,
    method: input.method,
    url: input.url,
    status: input.status,
    previousHash,
    hash,
  });

  const entries = Object.freeze([...chain.entries, entry]);

  return Object.freeze({
    entries,
    length: entries.length,
    lastHash: hash,
  });
}

/**
 * Verify the integrity of an audit chain.
 *
 * Recomputes each hash and verifies the chain links.
 * Returns `true` if the chain is valid, `false` if tampered.
 */
export function verifyChain(chain: AuditChain): boolean {
  let expectedPrevHash = "00000000";

  for (const entry of chain.entries) {
    if (entry.previousHash !== expectedPrevHash) {
      return false;
    }

    const hashInput = [
      String(entry.index),
      String(entry.timestamp),
      entry.method,
      entry.url,
      entry.status !== undefined ? String(entry.status) : "none",
      entry.previousHash,
    ].join("|");

    const expectedHash = fnv1a(hashInput);
    if (entry.hash !== expectedHash) {
      return false;
    }

    expectedPrevHash = entry.hash;
  }

  return chain.lastHash === expectedPrevHash;
}
