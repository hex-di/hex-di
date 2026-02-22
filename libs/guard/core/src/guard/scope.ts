import type { ScopeExpiredError, RateLimitExceededError } from "../errors/types.js";
import { ACL024, ACL025 } from "../errors/codes.js";

/**
 * Options for scope-level access control.
 */
export interface ScopeOptions {
  /** Time-to-live for the scope in milliseconds. Enforces calls before expiry. */
  readonly ttlMs?: number;
  /** Maximum number of calls allowed within the rate limit window. */
  readonly maxCallsPerWindow?: number;
  /** Rate limit window size in milliseconds. Default: 60000 (1 minute). */
  readonly windowMs?: number;
}

interface ScopeState {
  readonly createdAt: number;
  callCount: number;
  windowStart: number;
}

/**
 * Registry tracking per-scope call counts and creation timestamps.
 */
export interface ScopeRegistry {
  /**
   * Registers a new scope with the given options.
   * Must be called before checking scope validity.
   */
  register(scopeId: string, options?: ScopeOptions): void;
  /**
   * Checks scope validity and increments call count.
   * Returns a ScopeExpiredError or RateLimitExceededError if the scope is invalid.
   */
  check(scopeId: string): ScopeExpiredError | RateLimitExceededError | undefined;
  /** Removes a scope from the registry (called on dispose). */
  unregister(scopeId: string): void;
  /** Returns the registered options for a scope (for testing). */
  getOptions(scopeId: string): ScopeOptions | undefined;
  /**
   * Disposes all scopes whose TTL has elapsed.
   * Returns the number of scopes disposed.
   * Callers (e.g. periodic timer) can use this to bound memory growth.
   */
  disposeExpired(): number;
}

/**
 * Creates an in-memory scope registry for TTL and rate-limit enforcement.
 */
export function createScopeRegistry(): ScopeRegistry {
  const _scopes = new Map<string, { state: ScopeState; options: ScopeOptions }>();

  return {
    register(scopeId: string, options: ScopeOptions = {}): void {
      _scopes.set(scopeId, {
        state: {
          createdAt: Date.now(),
          callCount: 0,
          windowStart: Date.now(),
        },
        options,
      });
    },

    check(scopeId: string): ScopeExpiredError | RateLimitExceededError | undefined {
      const entry = _scopes.get(scopeId);
      if (entry === undefined) return undefined; // not tracked — no constraint

      const { state, options } = entry;
      const now = Date.now();

      // TTL check
      if (options.ttlMs !== undefined) {
        if (now - state.createdAt >= options.ttlMs) {
          return Object.freeze({
            code: ACL024,
            message: `Scope '${scopeId}' has expired (TTL: ${options.ttlMs}ms)`,
            scopeId,
            expiredAt: new Date(state.createdAt + options.ttlMs).toISOString(),
          });
        }
      }

      // Rate limit check
      if (options.maxCallsPerWindow !== undefined) {
        const windowMs = options.windowMs ?? 60_000;

        // Reset window if elapsed
        if (now - state.windowStart >= windowMs) {
          state.callCount = 0;
          state.windowStart = now;
        }

        if (state.callCount >= options.maxCallsPerWindow) {
          return Object.freeze({
            code: ACL025,
            message: `Scope '${scopeId}' rate limit exceeded (${options.maxCallsPerWindow} calls per ${windowMs}ms)`,
            scopeId,
            limit: options.maxCallsPerWindow,
            windowMs,
          });
        }

        state.callCount += 1;
      }

      return undefined;
    },

    unregister(scopeId: string): void {
      _scopes.delete(scopeId);
    },

    getOptions(scopeId: string): ScopeOptions | undefined {
      return _scopes.get(scopeId)?.options;
    },

    disposeExpired(): number {
      const now = Date.now();
      let disposed = 0;
      for (const [scopeId, entry] of _scopes) {
        if (entry.options.ttlMs !== undefined && now - entry.state.createdAt >= entry.options.ttlMs) {
          _scopes.delete(scopeId);
          disposed += 1;
        }
      }
      return disposed;
    },
  };
}
