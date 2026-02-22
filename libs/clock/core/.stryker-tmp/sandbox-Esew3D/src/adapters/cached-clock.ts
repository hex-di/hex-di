/**
 * CachedClockAdapter — high-throughput cached time values with background updater.
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
import { createAdapter } from "@hex-di/core";
import { CachedClockPort } from "../ports/cached-clock.js";
import type { CachedClockAdapter as CachedClockAdapterType } from "../ports/cached-clock.js";
import { ClockPort } from "../ports/clock.js";
import type { ClockService } from "../ports/clock.js";
import { asMonotonic, asWallClock } from "../branded.js";

/** Options for createCachedClock. */
export interface CachedClockOptions {
  readonly source: ClockService;
  readonly updateIntervalMs?: number;
}

/**
 * Creates a cached clock adapter that periodically snapshots the source clock.
 * Performs one synchronous read at construction time (CLK-CAC-008).
 */
export function createCachedClock(options: CachedClockOptions): CachedClockAdapterType {
  if (stryMutAct_9fa48("0")) {
    {}
  } else {
    stryCov_9fa48("0");
    const {
      source,
      updateIntervalMs = 1
    } = options;
    if (stryMutAct_9fa48("3") ? !Number.isFinite(updateIntervalMs) && updateIntervalMs <= 0 : stryMutAct_9fa48("2") ? false : stryMutAct_9fa48("1") ? true : (stryCov_9fa48("1", "2", "3"), (stryMutAct_9fa48("4") ? Number.isFinite(updateIntervalMs) : (stryCov_9fa48("4"), !Number.isFinite(updateIntervalMs))) || (stryMutAct_9fa48("7") ? updateIntervalMs > 0 : stryMutAct_9fa48("6") ? updateIntervalMs < 0 : stryMutAct_9fa48("5") ? false : (stryCov_9fa48("5", "6", "7"), updateIntervalMs <= 0)))) {
      if (stryMutAct_9fa48("8")) {
        {}
      } else {
        stryCov_9fa48("8");
        throw new TypeError(stryMutAct_9fa48("9") ? `` : (stryCov_9fa48("9"), `updateIntervalMs must be a positive finite number, got ${updateIntervalMs}`));
      }
    }

    // CLK-CAC-008: Synchronous initial read at construction
    let cachedMonotonic = source.monotonicNow();
    let cachedWallClock = source.wallClockNow();
    let intervalHandle: ReturnType<typeof setInterval> | undefined;
    let running = stryMutAct_9fa48("10") ? true : (stryCov_9fa48("10"), false);
    const adapter = Object.freeze(stryMutAct_9fa48("11") ? {} : (stryCov_9fa48("11"), {
      recentMonotonicNow: stryMutAct_9fa48("12") ? () => undefined : (stryCov_9fa48("12"), () => asMonotonic(cachedMonotonic)),
      recentWallClockNow: stryMutAct_9fa48("13") ? () => undefined : (stryCov_9fa48("13"), () => asWallClock(cachedWallClock)),
      start(): void {
        if (stryMutAct_9fa48("14")) {
          {}
        } else {
          stryCov_9fa48("14");
          if (stryMutAct_9fa48("16") ? false : stryMutAct_9fa48("15") ? true : (stryCov_9fa48("15", "16"), running)) return;
          running = stryMutAct_9fa48("17") ? false : (stryCov_9fa48("17"), true);
          intervalHandle = setInterval(() => {
            if (stryMutAct_9fa48("18")) {
              {}
            } else {
              stryCov_9fa48("18");
              cachedMonotonic = source.monotonicNow();
              cachedWallClock = source.wallClockNow();
            }
          }, updateIntervalMs);
        }
      },
      stop(): void {
        if (stryMutAct_9fa48("19")) {
          {}
        } else {
          stryCov_9fa48("19");
          if (stryMutAct_9fa48("22") ? false : stryMutAct_9fa48("21") ? true : stryMutAct_9fa48("20") ? running : (stryCov_9fa48("20", "21", "22"), !running)) return;
          running = stryMutAct_9fa48("23") ? true : (stryCov_9fa48("23"), false);
          if (stryMutAct_9fa48("26") ? intervalHandle === undefined : stryMutAct_9fa48("25") ? false : stryMutAct_9fa48("24") ? true : (stryCov_9fa48("24", "25", "26"), intervalHandle !== undefined)) {
            if (stryMutAct_9fa48("27")) {
              {}
            } else {
              stryCov_9fa48("27");
              clearInterval(intervalHandle);
              intervalHandle = undefined;
            }
          }
        }
      },
      isRunning(): boolean {
        if (stryMutAct_9fa48("28")) {
          {}
        } else {
          stryCov_9fa48("28");
          return running;
        }
      }
    }));
    return adapter;
  }
}

/** Pre-wired singleton adapter providing CachedClockPort. Auto-calls start(). */
export const SystemCachedClockAdapter = createAdapter(stryMutAct_9fa48("29") ? {} : (stryCov_9fa48("29"), {
  provides: CachedClockPort,
  requires: stryMutAct_9fa48("30") ? [] : (stryCov_9fa48("30"), [ClockPort]),
  lifetime: stryMutAct_9fa48("31") ? "" : (stryCov_9fa48("31"), "singleton"),
  factory: deps => {
    if (stryMutAct_9fa48("32")) {
      {}
    } else {
      stryCov_9fa48("32");
      const adapter = createCachedClock(stryMutAct_9fa48("33") ? {} : (stryCov_9fa48("33"), {
        source: deps.Clock
      }));
      adapter.start();
      return adapter;
    }
  }
}));