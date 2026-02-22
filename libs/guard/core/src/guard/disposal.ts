/**
 * Result from scope disposal chain verification.
 */
export interface DisposalChainResult {
  readonly verified: boolean;
  readonly undisposed: readonly string[];
}

/**
 * Tracks scope disposal state and verifies disposal chains.
 */
export interface ScopeDisposalVerifier {
  /** Registers a scope as requiring disposal. */
  register(scopeId: string): void;
  /** Marks a scope as disposed. */
  dispose(scopeId: string): void;
  /** Returns true if the given scope has been disposed. */
  isDisposed(scopeId: string): boolean;
  /** Verifies that all registered scopes have been disposed. */
  verifyAll(): DisposalChainResult;
  /** Verifies that the specified scopes have all been disposed. */
  verify(scopeIds: readonly string[]): DisposalChainResult;
}

/**
 * Creates a scope disposal verifier that tracks which scopes have been disposed.
 */
export function createScopeDisposalVerifier(): ScopeDisposalVerifier {
  const _registered = new Set<string>();
  const _disposed = new Set<string>();

  return {
    register(scopeId: string): void {
      _registered.add(scopeId);
    },

    dispose(scopeId: string): void {
      _disposed.add(scopeId);
    },

    isDisposed(scopeId: string): boolean {
      return _disposed.has(scopeId);
    },

    verifyAll(): DisposalChainResult {
      const undisposed = [..._registered].filter((id) => !_disposed.has(id));
      return Object.freeze({
        verified: undisposed.length === 0,
        undisposed: Object.freeze(undisposed),
      });
    },

    verify(scopeIds: readonly string[]): DisposalChainResult {
      const undisposed = scopeIds.filter((id) => !_disposed.has(id));
      return Object.freeze({
        verified: undisposed.length === 0,
        undisposed: Object.freeze([...undisposed]),
      });
    },
  };
}
