/**
 * GxP audit bridge — connects HTTP client audit chain to the library inspector.
 * @packageDocumentation
 */

import type { AuditChain, AuditEntry } from "./integrity.js";
import { createAuditChain, appendEntry } from "./integrity.js";

// =============================================================================
// Types
// =============================================================================

export interface AuditBridgeConfig {
  /** Called when a new audit entry is recorded. */
  readonly onEntry?: (entry: AuditEntry) => void;

  /** Called when the audit chain is verified. */
  readonly onVerify?: (valid: boolean) => void;
}

export interface AuditBridge {
  /** Record an HTTP request/response pair. */
  readonly record: (method: string, url: string, status: number | undefined) => AuditEntry;

  /** Get the current audit chain. */
  readonly getChain: () => AuditChain;

  /** Get the number of entries. */
  readonly entryCount: () => number;

  /** Get the last hash in the chain. */
  readonly lastHash: () => string;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create an audit bridge that records HTTP operations into a hash chain.
 *
 * @example
 * ```typescript
 * const bridge = createAuditBridge({
 *   onEntry: (entry) => console.log(`Audit: ${entry.method} ${entry.url}`),
 * });
 *
 * bridge.record("GET", "https://api.example.com/users", 200);
 * ```
 */
export function createAuditBridge(config?: AuditBridgeConfig): AuditBridge {
  let chain = createAuditChain();

  function record(method: string, url: string, status: number | undefined): AuditEntry {
    chain = appendEntry(chain, { method, url, status });
    const entry = chain.entries[chain.entries.length - 1];
    if (entry === undefined) {
      throw new Error("Internal error: audit chain produced no entry");
    }
    if (config?.onEntry !== undefined) {
      config.onEntry(entry);
    }
    return entry;
  }

  function getChain(): AuditChain {
    return chain;
  }

  function entryCount(): number {
    return chain.length;
  }

  function lastHash(): string {
    return chain.lastHash;
  }

  return { record, getChain, entryCount, lastHash };
}
