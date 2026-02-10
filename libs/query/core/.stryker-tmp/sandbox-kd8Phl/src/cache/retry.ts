/**
 * Retry and backoff logic for query fetching.
 *
 * @packageDocumentation
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g =
    (typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
    new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (
    ns.activeMutant === undefined &&
    g.process &&
    g.process.env &&
    g.process.env.__STRYKER_ACTIVE_MUTANT__
  ) {
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
  var cov =
    ns.mutantCoverage ||
    (ns.mutantCoverage = {
      static: {},
      perTest: {},
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
        throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")");
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { ResultAsync, ok, err, type Result } from "@hex-di/result";
import { queryFetchFailed, type QueryFetchFailed } from "../types/errors.js";

// =============================================================================
// Retry Configuration
// =============================================================================

export interface RetryConfig {
  readonly retry: number | boolean | ((failureCount: number, error: unknown) => boolean);
  readonly retryDelay: number | ((attempt: number, error: unknown) => number);
}

// =============================================================================
// Helpers
// =============================================================================

function shouldRetry(config: RetryConfig, attempt: number, error: unknown): boolean {
  if (stryMutAct_9fa48("286")) {
    {
    }
  } else {
    stryCov_9fa48("286");
    const { retry } = config;
    if (
      stryMutAct_9fa48("289")
        ? typeof retry !== "boolean"
        : stryMutAct_9fa48("288")
          ? false
          : stryMutAct_9fa48("287")
            ? true
            : (stryCov_9fa48("287", "288", "289"),
              typeof retry === (stryMutAct_9fa48("290") ? "" : (stryCov_9fa48("290"), "boolean")))
    )
      return retry;
    if (
      stryMutAct_9fa48("293")
        ? typeof retry !== "number"
        : stryMutAct_9fa48("292")
          ? false
          : stryMutAct_9fa48("291")
            ? true
            : (stryCov_9fa48("291", "292", "293"),
              typeof retry === (stryMutAct_9fa48("294") ? "" : (stryCov_9fa48("294"), "number")))
    )
      return stryMutAct_9fa48("298")
        ? attempt >= retry
        : stryMutAct_9fa48("297")
          ? attempt <= retry
          : stryMutAct_9fa48("296")
            ? false
            : stryMutAct_9fa48("295")
              ? true
              : (stryCov_9fa48("295", "296", "297", "298"), attempt < retry);
    return retry(attempt, error);
  }
}
function getRetryDelay(config: RetryConfig, attempt: number, error: unknown): number {
  if (stryMutAct_9fa48("299")) {
    {
    }
  } else {
    stryCov_9fa48("299");
    const { retryDelay } = config;
    if (
      stryMutAct_9fa48("302")
        ? typeof retryDelay !== "number"
        : stryMutAct_9fa48("301")
          ? false
          : stryMutAct_9fa48("300")
            ? true
            : (stryCov_9fa48("300", "301", "302"),
              typeof retryDelay ===
                (stryMutAct_9fa48("303") ? "" : (stryCov_9fa48("303"), "number")))
    )
      return retryDelay;
    return retryDelay(attempt, error);
  }
}

// =============================================================================
// Fetch with Retry
// =============================================================================

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (stryMutAct_9fa48("304")) {
    {
    }
  } else {
    stryCov_9fa48("304");
    return new Promise((resolve, reject) => {
      if (stryMutAct_9fa48("305")) {
        {
        }
      } else {
        stryCov_9fa48("305");
        const timer = setTimeout(resolve, ms);
        if (
          stryMutAct_9fa48("307")
            ? false
            : stryMutAct_9fa48("306")
              ? true
              : (stryCov_9fa48("306", "307"), signal)
        ) {
          if (stryMutAct_9fa48("308")) {
            {
            }
          } else {
            stryCov_9fa48("308");
            const onAbort = (): void => {
              if (stryMutAct_9fa48("309")) {
                {
                }
              } else {
                stryCov_9fa48("309");
                clearTimeout(timer);
                reject(signal.reason);
              }
            };
            if (
              stryMutAct_9fa48("311")
                ? false
                : stryMutAct_9fa48("310")
                  ? true
                  : (stryCov_9fa48("310", "311"), signal.aborted)
            ) {
              if (stryMutAct_9fa48("312")) {
                {
                }
              } else {
                stryCov_9fa48("312");
                clearTimeout(timer);
                reject(signal.reason);
                return;
              }
            }
            signal.addEventListener(
              stryMutAct_9fa48("313") ? "" : (stryCov_9fa48("313"), "abort"),
              onAbort,
              stryMutAct_9fa48("314")
                ? {}
                : (stryCov_9fa48("314"),
                  {
                    once: stryMutAct_9fa48("315") ? false : (stryCov_9fa48("315"), true),
                  })
            );
          }
        }
      }
    });
  }
}

/**
 * Execute a fetch function with retry logic.
 *
 * Returns the first successful result, or a QueryFetchFailed error after
 * all retries are exhausted.
 */
export function fetchWithRetry<TData, TError>(
  portName: string,
  params: unknown,
  fetcher: () => ResultAsync<TData, TError>,
  config: RetryConfig,
  signal?: AbortSignal
): ResultAsync<TData, TError | QueryFetchFailed> {
  if (stryMutAct_9fa48("316")) {
    {
    }
  } else {
    stryCov_9fa48("316");
    const execute = async (): Promise<Result<TData, TError | QueryFetchFailed>> => {
      if (stryMutAct_9fa48("317")) {
        {
        }
      } else {
        stryCov_9fa48("317");
        let attempt = 0;
        if (stryMutAct_9fa48("318")) {
          for (; false; ) {
            const result = await fetcher();
            if (result.isOk()) {
              return ok(result.value);
            }
            if (!shouldRetry(config, attempt, result.error)) {
              return err(queryFetchFailed(portName, params, attempt, result.error));
            }
            const delayMs = getRetryDelay(config, attempt, result.error);
            if (delayMs > 0) {
              await delay(delayMs, signal);
            }
            attempt++;
          }
        } else {
          stryCov_9fa48("318");
          for (;;) {
            if (stryMutAct_9fa48("319")) {
              {
              }
            } else {
              stryCov_9fa48("319");
              const result = await fetcher();
              if (
                stryMutAct_9fa48("321")
                  ? false
                  : stryMutAct_9fa48("320")
                    ? true
                    : (stryCov_9fa48("320", "321"), result.isOk())
              ) {
                if (stryMutAct_9fa48("322")) {
                  {
                  }
                } else {
                  stryCov_9fa48("322");
                  return ok(result.value);
                }
              }
              if (
                stryMutAct_9fa48("325")
                  ? false
                  : stryMutAct_9fa48("324")
                    ? true
                    : stryMutAct_9fa48("323")
                      ? shouldRetry(config, attempt, result.error)
                      : (stryCov_9fa48("323", "324", "325"),
                        !shouldRetry(config, attempt, result.error))
              ) {
                if (stryMutAct_9fa48("326")) {
                  {
                  }
                } else {
                  stryCov_9fa48("326");
                  return err(queryFetchFailed(portName, params, attempt, result.error));
                }
              }
              const delayMs = getRetryDelay(config, attempt, result.error);
              if (
                stryMutAct_9fa48("330")
                  ? delayMs <= 0
                  : stryMutAct_9fa48("329")
                    ? delayMs >= 0
                    : stryMutAct_9fa48("328")
                      ? false
                      : stryMutAct_9fa48("327")
                        ? true
                        : (stryCov_9fa48("327", "328", "329", "330"), delayMs > 0)
              ) {
                if (stryMutAct_9fa48("331")) {
                  {
                  }
                } else {
                  stryCov_9fa48("331");
                  await delay(delayMs, signal);
                }
              }
              stryMutAct_9fa48("332") ? attempt-- : (stryCov_9fa48("332"), attempt++);
            }
          }
        }
      }
    };

    // Use ResultAsync.fromPromise with an identity error mapper since
    // our inner promise never rejects (returns Result values).
    return ResultAsync.fromPromise(
      execute().then(r => {
        if (stryMutAct_9fa48("333")) {
          {
          }
        } else {
          stryCov_9fa48("333");
          if (
            stryMutAct_9fa48("335")
              ? false
              : stryMutAct_9fa48("334")
                ? true
                : (stryCov_9fa48("334", "335"), r.isOk())
          )
            return r.value;
          throw r.error;
        }
      }),
      stryMutAct_9fa48("336")
        ? () => undefined
        : (stryCov_9fa48("336"), e => e as TError | QueryFetchFailed)
    );
  }
}
