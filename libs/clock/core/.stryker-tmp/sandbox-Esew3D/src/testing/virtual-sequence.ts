/**
 * VirtualSequenceGenerator — controllable test sequence generator.
 *
 * Exported only from @hex-di/clock/testing.
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
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import { SequenceGeneratorPort, createSequenceOverflowError } from "../ports/sequence.js";
import type { SequenceGeneratorService, SequenceOverflowError } from "../ports/sequence.js";

/** Options for createVirtualSequenceGenerator. */
export interface VirtualSequenceOptions {
  readonly startAt?: number;
}

/**
 * Extended interface for the virtual sequence generator.
 * Includes reset() and setCounter() for test manipulation.
 * Production SequenceGeneratorService does NOT have these methods.
 */
export interface VirtualSequenceGenerator extends SequenceGeneratorService {
  readonly setCounter: (value: number) => void;
  readonly reset: () => void;
}

/**
 * Creates a virtual sequence generator with reset and setCounter capabilities.
 */
export function createVirtualSequenceGenerator(options?: VirtualSequenceOptions): VirtualSequenceGenerator {
  if (stryMutAct_9fa48("1274")) {
    {}
  } else {
    stryCov_9fa48("1274");
    const startAt = stryMutAct_9fa48("1275") ? options?.startAt && 0 : (stryCov_9fa48("1275"), (stryMutAct_9fa48("1276") ? options.startAt : (stryCov_9fa48("1276"), options?.startAt)) ?? 0);
    if (stryMutAct_9fa48("1279") ? !Number.isFinite(startAt) && !Number.isInteger(startAt) : stryMutAct_9fa48("1278") ? false : stryMutAct_9fa48("1277") ? true : (stryCov_9fa48("1277", "1278", "1279"), (stryMutAct_9fa48("1280") ? Number.isFinite(startAt) : (stryCov_9fa48("1280"), !Number.isFinite(startAt))) || (stryMutAct_9fa48("1281") ? Number.isInteger(startAt) : (stryCov_9fa48("1281"), !Number.isInteger(startAt))))) {
      if (stryMutAct_9fa48("1282")) {
        {}
      } else {
        stryCov_9fa48("1282");
        throw new TypeError(stryMutAct_9fa48("1283") ? `` : (stryCov_9fa48("1283"), `VirtualSequenceOptions 'startAt' must be a finite integer, got ${startAt}`));
      }
    }
    let counter = startAt;
    return stryMutAct_9fa48("1284") ? {} : (stryCov_9fa48("1284"), {
      next(): Result<number, SequenceOverflowError> {
        if (stryMutAct_9fa48("1285")) {
          {}
        } else {
          stryCov_9fa48("1285");
          if (stryMutAct_9fa48("1289") ? counter < Number.MAX_SAFE_INTEGER : stryMutAct_9fa48("1288") ? counter > Number.MAX_SAFE_INTEGER : stryMutAct_9fa48("1287") ? false : stryMutAct_9fa48("1286") ? true : (stryCov_9fa48("1286", "1287", "1288", "1289"), counter >= Number.MAX_SAFE_INTEGER)) {
            if (stryMutAct_9fa48("1290")) {
              {}
            } else {
              stryCov_9fa48("1290");
              return err(createSequenceOverflowError(counter));
            }
          }
          stryMutAct_9fa48("1291") ? counter -= 1 : (stryCov_9fa48("1291"), counter += 1);
          return ok(counter);
        }
      },
      current(): number {
        if (stryMutAct_9fa48("1292")) {
          {}
        } else {
          stryCov_9fa48("1292");
          return counter;
        }
      },
      reset(): void {
        if (stryMutAct_9fa48("1293")) {
          {}
        } else {
          stryCov_9fa48("1293");
          counter = startAt;
        }
      },
      setCounter(value: number): void {
        if (stryMutAct_9fa48("1294")) {
          {}
        } else {
          stryCov_9fa48("1294");
          if (stryMutAct_9fa48("1297") ? false : stryMutAct_9fa48("1296") ? true : stryMutAct_9fa48("1295") ? Number.isFinite(value) : (stryCov_9fa48("1295", "1296", "1297"), !Number.isFinite(value))) {
            if (stryMutAct_9fa48("1298")) {
              {}
            } else {
              stryCov_9fa48("1298");
              throw new TypeError(stryMutAct_9fa48("1299") ? `` : (stryCov_9fa48("1299"), `setCounter() 'value' must be a finite number, got ${value}`));
            }
          }
          counter = value;
        }
      }
    });
  }
}

/** Virtual sequence generator adapter — transient lifetime for test isolation. */
export const VirtualSequenceGeneratorAdapter = createAdapter(stryMutAct_9fa48("1300") ? {} : (stryCov_9fa48("1300"), {
  provides: SequenceGeneratorPort,
  requires: stryMutAct_9fa48("1301") ? ["Stryker was here"] : (stryCov_9fa48("1301"), []),
  lifetime: stryMutAct_9fa48("1302") ? "" : (stryCov_9fa48("1302"), "transient"),
  factory: stryMutAct_9fa48("1303") ? () => undefined : (stryCov_9fa48("1303"), () => createVirtualSequenceGenerator())
}));