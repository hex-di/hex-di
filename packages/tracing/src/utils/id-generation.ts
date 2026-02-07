/**
 * Trace and span ID generation utilities.
 *
 * Implements W3C Trace Context ID format:
 * - Trace ID: 32 hex characters (16 bytes)
 * - Span ID: 16 hex characters (8 bytes)
 *
 * Uses crypto.getRandomValues when available (browser, Node.js 15+),
 * falls back to Math.random for development/testing environments.
 *
 * Performance optimizations:
 * - Batch generation: single crypto.getRandomValues call fills 256 entries
 * - 256-entry hex lookup table: one lookup per byte instead of two per nibble
 * - Cached crypto reference: avoids repeated globalThis lookups
 *
 * @packageDocumentation
 */

import { getCrypto } from "./globals.js";

/**
 * 256-entry hex lookup table for fast byte-to-hex conversion.
 * One lookup per byte instead of two per nibble.
 */
const HEX_TABLE: string[] = new Array(256);
for (let i = 0; i < 256; i++) {
  HEX_TABLE[i] = (i < 16 ? "0" : "") + i.toString(16);
}

/** Cached crypto reference (resolved once at module load) */
const _crypto = getCrypto();

// Span ID batch: 256 entries × 8 bytes = 2048 bytes
const SPAN_BATCH_SIZE = 256;
const _spanBatch = new Uint8Array(SPAN_BATCH_SIZE * 8);
let _spanBatchIndex = SPAN_BATCH_SIZE; // Start exhausted

// Trace ID batch: 64 entries × 16 bytes = 1024 bytes (less frequent)
const TRACE_BATCH_SIZE = 64;
const _traceBatch = new Uint8Array(TRACE_BATCH_SIZE * 16);
let _traceBatchIndex = TRACE_BATCH_SIZE; // Start exhausted

function fillSpanBatch(): void {
  if (_crypto) {
    _crypto.getRandomValues(_spanBatch);
  } else {
    for (let i = 0; i < _spanBatch.length; i++) {
      _spanBatch[i] = Math.floor(Math.random() * 256);
    }
  }
  _spanBatchIndex = 0;
}

function fillTraceBatch(): void {
  if (_crypto) {
    _crypto.getRandomValues(_traceBatch);
  } else {
    for (let i = 0; i < _traceBatch.length; i++) {
      _traceBatch[i] = Math.floor(Math.random() * 256);
    }
  }
  _traceBatchIndex = 0;
}

/**
 * Generate a W3C Trace Context trace ID.
 *
 * Returns 32 hex characters (16 bytes) representing a globally unique trace identifier.
 * All spans within a trace share the same trace ID.
 *
 * **Format:** 32 lowercase hex chars
 *
 * **Example:** `'4bf92f3577b34da6a3ce929d0e0e4736'`
 *
 * @returns 32-character hex trace ID
 * @public
 */
export function generateTraceId(): string {
  if (_traceBatchIndex >= TRACE_BATCH_SIZE) {
    fillTraceBatch();
  }
  const o = _traceBatchIndex * 16;
  _traceBatchIndex++;
  return (
    HEX_TABLE[_traceBatch[o]] +
    HEX_TABLE[_traceBatch[o + 1]] +
    HEX_TABLE[_traceBatch[o + 2]] +
    HEX_TABLE[_traceBatch[o + 3]] +
    HEX_TABLE[_traceBatch[o + 4]] +
    HEX_TABLE[_traceBatch[o + 5]] +
    HEX_TABLE[_traceBatch[o + 6]] +
    HEX_TABLE[_traceBatch[o + 7]] +
    HEX_TABLE[_traceBatch[o + 8]] +
    HEX_TABLE[_traceBatch[o + 9]] +
    HEX_TABLE[_traceBatch[o + 10]] +
    HEX_TABLE[_traceBatch[o + 11]] +
    HEX_TABLE[_traceBatch[o + 12]] +
    HEX_TABLE[_traceBatch[o + 13]] +
    HEX_TABLE[_traceBatch[o + 14]] +
    HEX_TABLE[_traceBatch[o + 15]]
  );
}

/**
 * Generate a W3C Trace Context span ID.
 *
 * Returns 16 hex characters (8 bytes) representing a unique span identifier.
 * Each span has a unique ID within its trace.
 *
 * **Format:** 16 lowercase hex chars
 *
 * **Example:** `'00f067aa0ba902b7'`
 *
 * @returns 16-character hex span ID
 * @public
 */
export function generateSpanId(): string {
  if (_spanBatchIndex >= SPAN_BATCH_SIZE) {
    fillSpanBatch();
  }
  const o = _spanBatchIndex * 8;
  _spanBatchIndex++;
  return (
    HEX_TABLE[_spanBatch[o]] +
    HEX_TABLE[_spanBatch[o + 1]] +
    HEX_TABLE[_spanBatch[o + 2]] +
    HEX_TABLE[_spanBatch[o + 3]] +
    HEX_TABLE[_spanBatch[o + 4]] +
    HEX_TABLE[_spanBatch[o + 5]] +
    HEX_TABLE[_spanBatch[o + 6]] +
    HEX_TABLE[_spanBatch[o + 7]]
  );
}
