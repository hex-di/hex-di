/**
 * Process instance ID generation for multi-process audit trail disambiguation.
 *
 * Uses feature detection and dynamic imports to avoid compile-time dependency
 * on node: modules, making this module safe for all runtimes.
 *
 * @packageDocumentation
 */
// @ts-nocheck


/** Monotonic counter for fallback UUID uniqueness within the same microsecond. */function stryNS_9fa48() {
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
let fallbackCounter = 0;

/** Generate a UUID using available platform APIs. */
function generateUUID(): string {
  if (stryMutAct_9fa48("853")) {
    {}
  } else {
    stryCov_9fa48("853");
    // Prefer Web Crypto API (available in Node.js 15+, all browsers, edge runtimes)
    if (stryMutAct_9fa48("856") ? typeof globalThis.crypto !== "undefined" || typeof globalThis.crypto.randomUUID === "function" : stryMutAct_9fa48("855") ? false : stryMutAct_9fa48("854") ? true : (stryCov_9fa48("854", "855", "856"), (stryMutAct_9fa48("858") ? typeof globalThis.crypto === "undefined" : stryMutAct_9fa48("857") ? true : (stryCov_9fa48("857", "858"), typeof globalThis.crypto !== (stryMutAct_9fa48("859") ? "" : (stryCov_9fa48("859"), "undefined")))) && (stryMutAct_9fa48("861") ? typeof globalThis.crypto.randomUUID !== "function" : stryMutAct_9fa48("860") ? true : (stryCov_9fa48("860", "861"), typeof globalThis.crypto.randomUUID === (stryMutAct_9fa48("862") ? "" : (stryCov_9fa48("862"), "function")))))) {
      if (stryMutAct_9fa48("863")) {
        {}
      } else {
        stryCov_9fa48("863");
        return globalThis.crypto.randomUUID();
      }
    }

    // Fallback: use performance.now() fractional digits + monotonic counter
    const perfNow = (stryMutAct_9fa48("866") ? typeof globalThis.performance === "undefined" : stryMutAct_9fa48("865") ? false : stryMutAct_9fa48("864") ? true : (stryCov_9fa48("864", "865", "866"), typeof globalThis.performance !== (stryMutAct_9fa48("867") ? "" : (stryCov_9fa48("867"), "undefined")))) ? globalThis.performance.now() : 0;
    stryMutAct_9fa48("868") ? fallbackCounter -= 1 : (stryCov_9fa48("868"), fallbackCounter += 1);
    return stryMutAct_9fa48("869") ? `` : (stryCov_9fa48("869"), `fallback-${perfNow.toFixed(6)}-${fallbackCounter}`);
  }
}

/** Obtain the hostname using feature detection (no node:os import). */
function getHostname(): string {
  if (stryMutAct_9fa48("870")) {
    {}
  } else {
    stryCov_9fa48("870");
    // In Node.js, process.env.HOSTNAME or process.env.COMPUTERNAME are common
    if (stryMutAct_9fa48("873") ? typeof globalThis !== "undefined" || "process" in globalThis : stryMutAct_9fa48("872") ? false : stryMutAct_9fa48("871") ? true : (stryCov_9fa48("871", "872", "873"), (stryMutAct_9fa48("875") ? typeof globalThis === "undefined" : stryMutAct_9fa48("874") ? true : (stryCov_9fa48("874", "875"), typeof globalThis !== (stryMutAct_9fa48("876") ? "" : (stryCov_9fa48("876"), "undefined")))) && (stryMutAct_9fa48("877") ? "" : (stryCov_9fa48("877"), "process")) in globalThis)) {
      if (stryMutAct_9fa48("878")) {
        {}
      } else {
        stryCov_9fa48("878");
        const proc = (globalThis as Record<string, unknown>)["process"] as Record<string, unknown> | undefined;
        if (stryMutAct_9fa48("881") ? proc && typeof proc["env"] === "object" || proc["env"] !== null : stryMutAct_9fa48("880") ? false : stryMutAct_9fa48("879") ? true : (stryCov_9fa48("879", "880", "881"), (stryMutAct_9fa48("883") ? proc || typeof proc["env"] === "object" : stryMutAct_9fa48("882") ? true : (stryCov_9fa48("882", "883"), proc && (stryMutAct_9fa48("885") ? typeof proc["env"] !== "object" : stryMutAct_9fa48("884") ? true : (stryCov_9fa48("884", "885"), typeof proc[stryMutAct_9fa48("886") ? "" : (stryCov_9fa48("886"), "env")] === (stryMutAct_9fa48("887") ? "" : (stryCov_9fa48("887"), "object")))))) && (stryMutAct_9fa48("889") ? proc["env"] === null : stryMutAct_9fa48("888") ? true : (stryCov_9fa48("888", "889"), proc[stryMutAct_9fa48("890") ? "" : (stryCov_9fa48("890"), "env")] !== null)))) {
          if (stryMutAct_9fa48("891")) {
            {}
          } else {
            stryCov_9fa48("891");
            const env = proc["env"] as Record<string, unknown>;
            const hostname = stryMutAct_9fa48("892") ? env["HOSTNAME"] && env["COMPUTERNAME"] : (stryCov_9fa48("892"), env[stryMutAct_9fa48("893") ? "" : (stryCov_9fa48("893"), "HOSTNAME")] ?? env[stryMutAct_9fa48("894") ? "" : (stryCov_9fa48("894"), "COMPUTERNAME")]);
            if (stryMutAct_9fa48("897") ? typeof hostname === "string" || hostname.length > 0 : stryMutAct_9fa48("896") ? false : stryMutAct_9fa48("895") ? true : (stryCov_9fa48("895", "896", "897"), (stryMutAct_9fa48("899") ? typeof hostname !== "string" : stryMutAct_9fa48("898") ? true : (stryCov_9fa48("898", "899"), typeof hostname === (stryMutAct_9fa48("900") ? "" : (stryCov_9fa48("900"), "string")))) && (stryMutAct_9fa48("903") ? hostname.length <= 0 : stryMutAct_9fa48("902") ? hostname.length >= 0 : stryMutAct_9fa48("901") ? true : (stryCov_9fa48("901", "902", "903"), hostname.length > 0)))) {
              if (stryMutAct_9fa48("904")) {
                {}
              } else {
                stryCov_9fa48("904");
                return hostname;
              }
            }
          }
        }
      }
    }
    return stryMutAct_9fa48("905") ? "" : (stryCov_9fa48("905"), "unknown");
  }
}

/**
 * Creates a process instance identifier for multi-process audit trail disambiguation.
 * Call once at process startup; reuse the returned value for the entire process lifetime.
 *
 * Format: `{hostname}-{startupTimestamp}-{uuid}`
 *
 * Falls back gracefully on all platforms — no node: imports required.
 */
export function createProcessInstanceId(): string {
  if (stryMutAct_9fa48("906")) {
    {}
  } else {
    stryCov_9fa48("906");
    const hostname = getHostname();
    const timestamp = Date.now();
    const uuid = generateUUID();
    return stryMutAct_9fa48("907") ? `` : (stryCov_9fa48("907"), `${hostname}-${timestamp}-${uuid}`);
  }
}