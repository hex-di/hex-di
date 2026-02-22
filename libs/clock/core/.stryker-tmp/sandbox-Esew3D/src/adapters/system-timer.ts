/**
 * SystemTimerSchedulerAdapter — production timer scheduler using platform-native APIs.
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
import { TimerSchedulerPort, createTimerHandle } from "../ports/timer-scheduler.js";
import type { TimerSchedulerService, TimerHandle } from "../ports/timer-scheduler.js";

/**
 * Creates a system timer scheduler using platform-native timer APIs.
 * Captures platform API references at construction time (SEC-2 anti-tampering).
 */
export function createSystemTimerScheduler(): TimerSchedulerService {
  if (stryMutAct_9fa48("440")) {
    {}
  } else {
    stryCov_9fa48("440");
    // SEC-2: Capture platform timer API references at construction time.
    const capturedSetTimeout = globalThis.setTimeout.bind(globalThis);
    const capturedSetInterval = globalThis.setInterval.bind(globalThis);
    const capturedClearTimeout = globalThis.clearTimeout.bind(globalThis);
    const capturedClearInterval = globalThis.clearInterval.bind(globalThis);
    let nextId = 1;
    const handleMap = new Map<number, ReturnType<typeof capturedSetTimeout>>();
    const createHandle = (platformId: ReturnType<typeof capturedSetTimeout>): TimerHandle => {
      if (stryMutAct_9fa48("441")) {
        {}
      } else {
        stryCov_9fa48("441");
        const id = nextId;
        stryMutAct_9fa48("442") ? nextId -= 1 : (stryCov_9fa48("442"), nextId += 1);
        handleMap.set(id, platformId);
        return createTimerHandle(id);
      }
    };
    return Object.freeze(stryMutAct_9fa48("443") ? {} : (stryCov_9fa48("443"), {
      setTimeout(callback: () => void, ms: number): TimerHandle {
        if (stryMutAct_9fa48("444")) {
          {}
        } else {
          stryCov_9fa48("444");
          if (stryMutAct_9fa48("447") ? typeof callback === "function" : stryMutAct_9fa48("446") ? false : stryMutAct_9fa48("445") ? true : (stryCov_9fa48("445", "446", "447"), typeof callback !== (stryMutAct_9fa48("448") ? "" : (stryCov_9fa48("448"), "function")))) {
            if (stryMutAct_9fa48("449")) {
              {}
            } else {
              stryCov_9fa48("449");
              throw new TypeError(stryMutAct_9fa48("450") ? "" : (stryCov_9fa48("450"), "callback must be a function"));
            }
          }
          if (stryMutAct_9fa48("453") ? !Number.isFinite(ms) && ms < 0 : stryMutAct_9fa48("452") ? false : stryMutAct_9fa48("451") ? true : (stryCov_9fa48("451", "452", "453"), (stryMutAct_9fa48("454") ? Number.isFinite(ms) : (stryCov_9fa48("454"), !Number.isFinite(ms))) || (stryMutAct_9fa48("457") ? ms >= 0 : stryMutAct_9fa48("456") ? ms <= 0 : stryMutAct_9fa48("455") ? false : (stryCov_9fa48("455", "456", "457"), ms < 0)))) {
            if (stryMutAct_9fa48("458")) {
              {}
            } else {
              stryCov_9fa48("458");
              throw new TypeError(stryMutAct_9fa48("459") ? `` : (stryCov_9fa48("459"), `ms must be a non-negative finite number, got ${ms}`));
            }
          }
          // Pre-allocate the handle ID so the closure can reference it without
          // a forward-reference let binding.
          const handleId = nextId;
          const platformId = capturedSetTimeout(() => {
            if (stryMutAct_9fa48("460")) {
              {}
            } else {
              stryCov_9fa48("460");
              handleMap.delete(handleId);
              callback();
            }
          }, ms);
          stryMutAct_9fa48("461") ? nextId -= 1 : (stryCov_9fa48("461"), nextId += 1);
          handleMap.set(handleId, platformId);
          return createTimerHandle(handleId);
        }
      },
      setInterval(callback: () => void, ms: number): TimerHandle {
        if (stryMutAct_9fa48("462")) {
          {}
        } else {
          stryCov_9fa48("462");
          if (stryMutAct_9fa48("465") ? typeof callback === "function" : stryMutAct_9fa48("464") ? false : stryMutAct_9fa48("463") ? true : (stryCov_9fa48("463", "464", "465"), typeof callback !== (stryMutAct_9fa48("466") ? "" : (stryCov_9fa48("466"), "function")))) {
            if (stryMutAct_9fa48("467")) {
              {}
            } else {
              stryCov_9fa48("467");
              throw new TypeError(stryMutAct_9fa48("468") ? "" : (stryCov_9fa48("468"), "callback must be a function"));
            }
          }
          if (stryMutAct_9fa48("471") ? !Number.isFinite(ms) && ms <= 0 : stryMutAct_9fa48("470") ? false : stryMutAct_9fa48("469") ? true : (stryCov_9fa48("469", "470", "471"), (stryMutAct_9fa48("472") ? Number.isFinite(ms) : (stryCov_9fa48("472"), !Number.isFinite(ms))) || (stryMutAct_9fa48("475") ? ms > 0 : stryMutAct_9fa48("474") ? ms < 0 : stryMutAct_9fa48("473") ? false : (stryCov_9fa48("473", "474", "475"), ms <= 0)))) {
            if (stryMutAct_9fa48("476")) {
              {}
            } else {
              stryCov_9fa48("476");
              throw new TypeError(stryMutAct_9fa48("477") ? `` : (stryCov_9fa48("477"), `ms must be a positive finite number, got ${ms}`));
            }
          }
          const platformId = capturedSetInterval(callback, ms);
          return createHandle(platformId);
        }
      },
      clearTimeout(handle: TimerHandle): void {
        if (stryMutAct_9fa48("478")) {
          {}
        } else {
          stryCov_9fa48("478");
          const platformId = handleMap.get(handle.id);
          if (stryMutAct_9fa48("481") ? platformId === undefined : stryMutAct_9fa48("480") ? false : stryMutAct_9fa48("479") ? true : (stryCov_9fa48("479", "480", "481"), platformId !== undefined)) {
            if (stryMutAct_9fa48("482")) {
              {}
            } else {
              stryCov_9fa48("482");
              capturedClearTimeout(platformId);
              handleMap.delete(handle.id);
            }
          }
        }
      },
      clearInterval(handle: TimerHandle): void {
        if (stryMutAct_9fa48("483")) {
          {}
        } else {
          stryCov_9fa48("483");
          const platformId = handleMap.get(handle.id);
          if (stryMutAct_9fa48("486") ? platformId === undefined : stryMutAct_9fa48("485") ? false : stryMutAct_9fa48("484") ? true : (stryCov_9fa48("484", "485", "486"), platformId !== undefined)) {
            if (stryMutAct_9fa48("487")) {
              {}
            } else {
              stryCov_9fa48("487");
              capturedClearInterval(platformId);
              handleMap.delete(handle.id);
            }
          }
        }
      },
      sleep(ms: number): Promise<void> {
        if (stryMutAct_9fa48("488")) {
          {}
        } else {
          stryCov_9fa48("488");
          if (stryMutAct_9fa48("491") ? !Number.isFinite(ms) && ms < 0 : stryMutAct_9fa48("490") ? false : stryMutAct_9fa48("489") ? true : (stryCov_9fa48("489", "490", "491"), (stryMutAct_9fa48("492") ? Number.isFinite(ms) : (stryCov_9fa48("492"), !Number.isFinite(ms))) || (stryMutAct_9fa48("495") ? ms >= 0 : stryMutAct_9fa48("494") ? ms <= 0 : stryMutAct_9fa48("493") ? false : (stryCov_9fa48("493", "494", "495"), ms < 0)))) {
            if (stryMutAct_9fa48("496")) {
              {}
            } else {
              stryCov_9fa48("496");
              throw new TypeError(stryMutAct_9fa48("497") ? `` : (stryCov_9fa48("497"), `ms must be a non-negative finite number, got ${ms}`));
            }
          }
          return new Promise<void>(resolve => {
            if (stryMutAct_9fa48("498")) {
              {}
            } else {
              stryCov_9fa48("498");
              capturedSetTimeout(resolve, ms);
            }
          });
        }
      }
    }));
  }
}

/** Pre-wired singleton adapter that provides TimerSchedulerPort. */
export const SystemTimerSchedulerAdapter = createAdapter(stryMutAct_9fa48("499") ? {} : (stryCov_9fa48("499"), {
  provides: TimerSchedulerPort,
  requires: stryMutAct_9fa48("500") ? ["Stryker was here"] : (stryCov_9fa48("500"), []),
  lifetime: stryMutAct_9fa48("501") ? "" : (stryCov_9fa48("501"), "singleton"),
  factory: stryMutAct_9fa48("502") ? () => undefined : (stryCov_9fa48("502"), () => createSystemTimerScheduler())
}));