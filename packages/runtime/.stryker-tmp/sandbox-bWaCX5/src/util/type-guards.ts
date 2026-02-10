/**
 * Shared internal type guards for the runtime package.
 * @internal
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
export function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  if (stryMutAct_9fa48("2230")) {
    {
    }
  } else {
    stryCov_9fa48("2230");
    return stryMutAct_9fa48("2233")
      ? typeof value === "object" || value !== null
      : stryMutAct_9fa48("2232")
        ? false
        : stryMutAct_9fa48("2231")
          ? true
          : (stryCov_9fa48("2231", "2232", "2233"),
            (stryMutAct_9fa48("2235")
              ? typeof value !== "object"
              : stryMutAct_9fa48("2234")
                ? true
                : (stryCov_9fa48("2234", "2235"),
                  typeof value ===
                    (stryMutAct_9fa48("2236") ? "" : (stryCov_9fa48("2236"), "object")))) &&
              (stryMutAct_9fa48("2238")
                ? value === null
                : stryMutAct_9fa48("2237")
                  ? true
                  : (stryCov_9fa48("2237", "2238"), value !== null)));
  }
}
