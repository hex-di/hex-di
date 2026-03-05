/**
 * Scoped Reference Tracking — Public API
 *
 * Re-exports all scoped reference tracking types and functions.
 *
 * @packageDocumentation
 */

// Types
export type {
  ScopedRef,
  ScopeBrandSymbol,
  IsScopedRef,
  ExtractScopeId,
  ExtractService,
  ScopedContainer,
} from "./types.js";

// Escape detection
export type {
  ScopeBound,
  ContainsScopedRef,
  AssertNoEscape,
  ScopeCallback,
  WithScopeFn,
} from "./escape.js";

// Transfer
export type { TransferRecord, TransferRefFn } from "./transfer.js";

export { ScopeTransferError, transferRef, createTransferRecord } from "./transfer.js";
