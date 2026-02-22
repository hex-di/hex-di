import { ACL023 } from "../errors/codes.js";
import type { CircuitOpenError } from "../errors/types.js";

/**
 * Possible states of a circuit breaker.
 */
export type CircuitBreakerState = "closed" | "open" | "half-open";

/**
 * Options for creating a circuit breaker.
 */
export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. */
  readonly failureThreshold: number;
  /** Time in milliseconds before attempting to reset from open to half-open. */
  readonly resetTimeoutMs: number;
}

/**
 * A circuit breaker that protects a resource from cascading failures.
 */
export interface CircuitBreaker {
  /** Returns the current state of the circuit. */
  readonly state: CircuitBreakerState;
  /**
   * Records a successful operation. If in half-open, transitions to closed.
   */
  recordSuccess(): void;
  /**
   * Records a failed operation. Increments failure count; opens circuit if threshold reached.
   */
  recordFailure(): void;
  /**
   * Returns a CircuitOpenError if the circuit is open, undefined otherwise.
   * In half-open state, allows one probe through (returns undefined).
   */
  check(): CircuitOpenError | undefined;
}

/**
 * Creates a circuit breaker with the given options.
 *
 * State transitions:
 * - closed → open: after `failureThreshold` consecutive failures
 * - open → half-open: after `resetTimeoutMs` ms
 * - half-open → closed: on next success
 * - half-open → open: on next failure
 */
export function createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  let _state: CircuitBreakerState = "closed";
  let _failureCount = 0;
  let _openedAt: number | undefined;

  function transitionToOpen(): void {
    _state = "open";
    _openedAt = Date.now();
  }

  return {
    get state(): CircuitBreakerState {
      if (_state === "open" && _openedAt !== undefined) {
        if (Date.now() - _openedAt >= options.resetTimeoutMs) {
          _state = "half-open";
        }
      }
      return _state;
    },

    recordSuccess(): void {
      _failureCount = 0;
      _state = "closed";
      _openedAt = undefined;
    },

    recordFailure(): void {
      _failureCount += 1;
      if (_state === "half-open") {
        transitionToOpen();
      } else if (_state === "closed" && _failureCount >= options.failureThreshold) {
        transitionToOpen();
      }
    },

    check(): CircuitOpenError | undefined {
      const currentState = this.state;
      if (currentState === "open") {
        return Object.freeze({ code: ACL023, message: "Circuit breaker is open — audit trail unavailable" });
      }
      // half-open: allow one probe through (returns undefined, caller must record result)
      return undefined;
    },
  };
}
