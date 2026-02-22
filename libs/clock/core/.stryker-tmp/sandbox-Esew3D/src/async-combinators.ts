/**
 * Async combinators for timer and clock composition.
 *
 * @packageDocumentation
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { TimerSchedulerService } from "./ports/timer-scheduler.js";
import type { ClockService } from "./ports/clock.js";

// =============================================================================
// ClockTimeoutError (minimal version — full version in testing/)
// =============================================================================

/** Error thrown when timeout() fires before the given promise settles. */
export interface ClockTimeoutError {
  readonly _tag: "ClockTimeoutError";
  readonly message: string;
  readonly timeoutMs: number;
}
function createClockTimeoutErrorInternal(ms: number): ClockTimeoutError {
  if (stryMutAct_9fa48("503")) {
    {}
  } else {
    stryCov_9fa48("503");
    return Object.freeze(stryMutAct_9fa48("504") ? {} : (stryCov_9fa48("504"), {
      _tag: "ClockTimeoutError" as const,
      message: stryMutAct_9fa48("505") ? `` : (stryCov_9fa48("505"), `Operation timed out after ${ms}ms`),
      timeoutMs: ms
    }));
  }
}

// =============================================================================
// delay
// =============================================================================

/**
 * Returns a promise that resolves after ms milliseconds.
 * Delegates to scheduler.sleep() — not raw setTimeout.
 */
export function delay(scheduler: TimerSchedulerService, ms: number): Promise<void> {
  if (stryMutAct_9fa48("506")) {
    {}
  } else {
    stryCov_9fa48("506");
    if (stryMutAct_9fa48("509") ? !Number.isFinite(ms) && ms < 0 : stryMutAct_9fa48("508") ? false : stryMutAct_9fa48("507") ? true : (stryCov_9fa48("507", "508", "509"), (stryMutAct_9fa48("510") ? Number.isFinite(ms) : (stryCov_9fa48("510"), !Number.isFinite(ms))) || (stryMutAct_9fa48("513") ? ms >= 0 : stryMutAct_9fa48("512") ? ms <= 0 : stryMutAct_9fa48("511") ? false : (stryCov_9fa48("511", "512", "513"), ms < 0)))) {
      if (stryMutAct_9fa48("514")) {
        {}
      } else {
        stryCov_9fa48("514");
        return Promise.reject(new TypeError(stryMutAct_9fa48("515") ? `` : (stryCov_9fa48("515"), `delay: ms must be a non-negative finite number, got ${ms}`)));
      }
    }
    return scheduler.sleep(ms);
  }
}

// =============================================================================
// timeout
// =============================================================================

/**
 * Races promise against a timer. Rejects with ClockTimeoutError if the timer fires first.
 * Cleans up the timer handle when promise settles first.
 */
export function timeout<T>(scheduler: TimerSchedulerService, promise: Promise<T>, ms: number): Promise<T> {
  if (stryMutAct_9fa48("516")) {
    {}
  } else {
    stryCov_9fa48("516");
    return new Promise<T>((resolve, reject) => {
      if (stryMutAct_9fa48("517")) {
        {}
      } else {
        stryCov_9fa48("517");
        const handle = scheduler.setTimeout(() => {
          if (stryMutAct_9fa48("518")) {
            {}
          } else {
            stryCov_9fa48("518");
            reject(createClockTimeoutErrorInternal(ms));
          }
        }, ms);
        promise.then(value => {
          if (stryMutAct_9fa48("519")) {
            {}
          } else {
            stryCov_9fa48("519");
            scheduler.clearTimeout(handle);
            resolve(value);
          }
        }, (error: unknown) => {
          if (stryMutAct_9fa48("520")) {
            {}
          } else {
            stryCov_9fa48("520");
            scheduler.clearTimeout(handle);
            reject(error);
          }
        });
      }
    });
  }
}

// =============================================================================
// measure
// =============================================================================

/**
 * Executes fn, measures its duration using clock.monotonicNow(), and returns both result and duration.
 * Does NOT catch exceptions from fn.
 */
export async function measure<T>(clock: ClockService, fn: () => T | Promise<T>): Promise<{
  readonly result: T;
  readonly durationMs: number;
}> {
  if (stryMutAct_9fa48("521")) {
    {}
  } else {
    stryCov_9fa48("521");
    const start = clock.monotonicNow();
    const result = await fn();
    const end = clock.monotonicNow();
    return Object.freeze(stryMutAct_9fa48("522") ? {} : (stryCov_9fa48("522"), {
      result,
      durationMs: stryMutAct_9fa48("523") ? end + start : (stryCov_9fa48("523"), end - start)
    }));
  }
}

// =============================================================================
// retry
// =============================================================================

/** Options for the retry combinator. */
export interface RetryOptions {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly backoffMultiplier?: number;
  readonly maxDelayMs?: number;
}

/**
 * Retries fn up to maxAttempts times with configurable delay and exponential backoff.
 * Uses scheduler.sleep() between attempts (not raw setTimeout).
 * Propagates the last error unmodified.
 */
export async function retry<T>(scheduler: TimerSchedulerService, fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  if (stryMutAct_9fa48("524")) {
    {}
  } else {
    stryCov_9fa48("524");
    const {
      maxAttempts,
      delayMs,
      backoffMultiplier = 1,
      maxDelayMs = Infinity
    } = options;
    let lastError: unknown;
    for (let attempt = 0; stryMutAct_9fa48("527") ? attempt >= maxAttempts : stryMutAct_9fa48("526") ? attempt <= maxAttempts : stryMutAct_9fa48("525") ? false : (stryCov_9fa48("525", "526", "527"), attempt < maxAttempts); stryMutAct_9fa48("528") ? attempt-- : (stryCov_9fa48("528"), attempt++)) {
      if (stryMutAct_9fa48("529")) {
        {}
      } else {
        stryCov_9fa48("529");
        try {
          if (stryMutAct_9fa48("530")) {
            {}
          } else {
            stryCov_9fa48("530");
            return await fn();
          }
        } catch (error: unknown) {
          if (stryMutAct_9fa48("531")) {
            {}
          } else {
            stryCov_9fa48("531");
            lastError = error;
            if (stryMutAct_9fa48("535") ? attempt >= maxAttempts - 1 : stryMutAct_9fa48("534") ? attempt <= maxAttempts - 1 : stryMutAct_9fa48("533") ? false : stryMutAct_9fa48("532") ? true : (stryCov_9fa48("532", "533", "534", "535"), attempt < (stryMutAct_9fa48("536") ? maxAttempts + 1 : (stryCov_9fa48("536"), maxAttempts - 1)))) {
              if (stryMutAct_9fa48("537")) {
                {}
              } else {
                stryCov_9fa48("537");
                const computedDelay = stryMutAct_9fa48("538") ? Math.max(delayMs * Math.pow(backoffMultiplier, attempt), maxDelayMs) : (stryCov_9fa48("538"), Math.min(stryMutAct_9fa48("539") ? delayMs / Math.pow(backoffMultiplier, attempt) : (stryCov_9fa48("539"), delayMs * Math.pow(backoffMultiplier, attempt)), maxDelayMs));
                await scheduler.sleep(computedDelay);
              }
            }
          }
        }
      }
    }
    throw lastError;
  }
}