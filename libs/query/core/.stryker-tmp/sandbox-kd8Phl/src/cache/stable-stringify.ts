/**
 * Deterministic JSON serialization.
 *
 * Produces the same string regardless of key insertion order, enabling
 * stable cache key generation.
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
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (stryMutAct_9fa48("337")) {
    {
    }
  } else {
    stryCov_9fa48("337");
    return stryMutAct_9fa48("340")
      ? (typeof value === "object" && value !== null) || !Array.isArray(value)
      : stryMutAct_9fa48("339")
        ? false
        : stryMutAct_9fa48("338")
          ? true
          : (stryCov_9fa48("338", "339", "340"),
            (stryMutAct_9fa48("342")
              ? typeof value === "object" || value !== null
              : stryMutAct_9fa48("341")
                ? true
                : (stryCov_9fa48("341", "342"),
                  (stryMutAct_9fa48("344")
                    ? typeof value !== "object"
                    : stryMutAct_9fa48("343")
                      ? true
                      : (stryCov_9fa48("343", "344"),
                        typeof value ===
                          (stryMutAct_9fa48("345") ? "" : (stryCov_9fa48("345"), "object")))) &&
                    (stryMutAct_9fa48("347")
                      ? value === null
                      : stryMutAct_9fa48("346")
                        ? true
                        : (stryCov_9fa48("346", "347"), value !== null)))) &&
              (stryMutAct_9fa48("348")
                ? Array.isArray(value)
                : (stryCov_9fa48("348"), !Array.isArray(value))));
  }
}

/**
 * Recursively serializes a value to a deterministic JSON string.
 * Object keys are sorted lexicographically; arrays preserve order.
 */
export function stableStringify(value: unknown): string {
  if (stryMutAct_9fa48("349")) {
    {
    }
  } else {
    stryCov_9fa48("349");
    if (
      stryMutAct_9fa48("352")
        ? value === null && typeof value !== "object"
        : stryMutAct_9fa48("351")
          ? false
          : stryMutAct_9fa48("350")
            ? true
            : (stryCov_9fa48("350", "351", "352"),
              (stryMutAct_9fa48("354")
                ? value !== null
                : stryMutAct_9fa48("353")
                  ? false
                  : (stryCov_9fa48("353", "354"), value === null)) ||
                (stryMutAct_9fa48("356")
                  ? typeof value === "object"
                  : stryMutAct_9fa48("355")
                    ? false
                    : (stryCov_9fa48("355", "356"),
                      typeof value !==
                        (stryMutAct_9fa48("357") ? "" : (stryCov_9fa48("357"), "object")))))
    ) {
      if (stryMutAct_9fa48("358")) {
        {
        }
      } else {
        stryCov_9fa48("358");
        return stryMutAct_9fa48("359")
          ? JSON.stringify(value) && "undefined"
          : (stryCov_9fa48("359"),
            JSON.stringify(value) ??
              (stryMutAct_9fa48("360") ? "" : (stryCov_9fa48("360"), "undefined")));
      }
    }
    if (
      stryMutAct_9fa48("362")
        ? false
        : stryMutAct_9fa48("361")
          ? true
          : (stryCov_9fa48("361", "362"), Array.isArray(value))
    ) {
      if (stryMutAct_9fa48("363")) {
        {
        }
      } else {
        stryCov_9fa48("363");
        return (
          (stryMutAct_9fa48("364") ? "" : (stryCov_9fa48("364"), "[")) +
          value
            .map(stableStringify)
            .join(stryMutAct_9fa48("365") ? "" : (stryCov_9fa48("365"), ",")) +
          (stryMutAct_9fa48("366") ? "" : (stryCov_9fa48("366"), "]"))
        );
      }
    }
    if (
      stryMutAct_9fa48("368")
        ? false
        : stryMutAct_9fa48("367")
          ? true
          : (stryCov_9fa48("367", "368"), isRecord(value))
    ) {
      if (stryMutAct_9fa48("369")) {
        {
        }
      } else {
        stryCov_9fa48("369");
        const sortedKeys = stryMutAct_9fa48("370")
          ? Object.keys(value)
          : (stryCov_9fa48("370"), Object.keys(value).sort());
        const pairs = sortedKeys.map(
          stryMutAct_9fa48("371")
            ? () => undefined
            : (stryCov_9fa48("371"),
              key =>
                JSON.stringify(key) +
                (stryMutAct_9fa48("372") ? "" : (stryCov_9fa48("372"), ":")) +
                stableStringify(value[key]))
        );
        return (
          (stryMutAct_9fa48("373") ? "" : (stryCov_9fa48("373"), "{")) +
          pairs.join(stryMutAct_9fa48("374") ? "" : (stryCov_9fa48("374"), ",")) +
          (stryMutAct_9fa48("375") ? "" : (stryCov_9fa48("375"), "}"))
        );
      }
    }
    return stryMutAct_9fa48("376")
      ? JSON.stringify(value) && "undefined"
      : (stryCov_9fa48("376"),
        JSON.stringify(value) ??
          (stryMutAct_9fa48("377") ? "" : (stryCov_9fa48("377"), "undefined")));
  }
}
