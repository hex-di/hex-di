/**
 * FNV-1a Hash Chain for Audit Integrity (GxP F9)
 *
 * Implements a lightweight, non-cryptographic hash function (FNV-1a)
 * for creating tamper-evident hash chains in the audit trail.
 *
 * @packageDocumentation
 */

// FNV-1a constants (32-bit)
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * Computes a 32-bit FNV-1a hash of the input string.
 *
 * @internal
 */
function fnv1a(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  // Force unsigned 32-bit
  return hash >>> 0;
}

/**
 * Computes the hash for an audit record, chained with the previous hash.
 *
 * The hash covers: machineId, prevState, event.type, nextState, timestamp, and previousHash.
 * This creates a tamper-evident chain: changing any record invalidates all subsequent hashes.
 *
 * @param record - Partial record (without hash/previousHash fields)
 * @param previousHash - The hash of the preceding record (empty string for first)
 * @returns Hex string of the FNV-1a hash
 */
export function computeHash(
  record: {
    readonly machineId: string;
    readonly prevState: string;
    readonly event: { readonly type: string };
    readonly nextState: string;
    readonly timestamp: number;
  },
  previousHash: string
): string {
  const payload = [
    record.machineId,
    record.prevState,
    record.event.type,
    record.nextState,
    String(record.timestamp),
    previousHash,
  ].join("|");

  return fnv1a(payload).toString(16).padStart(8, "0");
}
