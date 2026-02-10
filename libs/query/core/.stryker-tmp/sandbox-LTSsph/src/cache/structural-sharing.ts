/**
 * Structural sharing (replaceEqualDeep).
 *
 * Preserves reference equality for unchanged portions of a data tree,
 * minimizing unnecessary re-renders in React and other reactive frameworks.
 *
 * @packageDocumentation
 */
// @ts-nocheck

/**
 * BRAND_CAST: Single documented coercion point for generic algorithms.
 * Used at algorithm boundaries where the generic type T is preserved by
 * structural construction but cannot be proven to TypeScript.
 * All call sites must ensure the value structurally matches T.
 */ function stryNS_9fa48() {
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
function unsafeCoerce<T>(value: unknown): T {
  if (stryMutAct_9fa48("378")) {
    {
    }
  } else {
    stryCov_9fa48("378");
    return value as T;
  }
}
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (stryMutAct_9fa48("379")) {
    {
    }
  } else {
    stryCov_9fa48("379");
    if (
      stryMutAct_9fa48("382")
        ? typeof value !== "object" && value === null
        : stryMutAct_9fa48("381")
          ? false
          : stryMutAct_9fa48("380")
            ? true
            : (stryCov_9fa48("380", "381", "382"),
              (stryMutAct_9fa48("384")
                ? typeof value === "object"
                : stryMutAct_9fa48("383")
                  ? false
                  : (stryCov_9fa48("383", "384"),
                    typeof value !==
                      (stryMutAct_9fa48("385") ? "" : (stryCov_9fa48("385"), "object")))) ||
                (stryMutAct_9fa48("387")
                  ? value !== null
                  : stryMutAct_9fa48("386")
                    ? false
                    : (stryCov_9fa48("386", "387"), value === null)))
    )
      return stryMutAct_9fa48("388") ? true : (stryCov_9fa48("388"), false);
    const proto: unknown = Object.getPrototypeOf(value);
    return stryMutAct_9fa48("391")
      ? proto === Object.prototype && proto === null
      : stryMutAct_9fa48("390")
        ? false
        : stryMutAct_9fa48("389")
          ? true
          : (stryCov_9fa48("389", "390", "391"),
            (stryMutAct_9fa48("393")
              ? proto !== Object.prototype
              : stryMutAct_9fa48("392")
                ? false
                : (stryCov_9fa48("392", "393"), proto === Object.prototype)) ||
              (stryMutAct_9fa48("395")
                ? proto !== null
                : stryMutAct_9fa48("394")
                  ? false
                  : (stryCov_9fa48("394", "395"), proto === null)));
  }
}

/**
 * Deep comparison that reuses previous references where possible.
 *
 * Returns `prev` (by reference) for any sub-tree that is structurally equal,
 * and `next` values only where changes exist.
 */
export function replaceEqualDeep<T>(prev: T, next: T): T {
  if (stryMutAct_9fa48("396")) {
    {
    }
  } else {
    stryCov_9fa48("396");
    // Referential equality -- nothing to do
    if (
      stryMutAct_9fa48("399")
        ? prev !== next
        : stryMutAct_9fa48("398")
          ? false
          : stryMutAct_9fa48("397")
            ? true
            : (stryCov_9fa48("397", "398", "399"), prev === next)
    )
      return prev;

    // Handle null/undefined differences
    if (
      stryMutAct_9fa48("402")
        ? (prev === null || next === null || prev === undefined) && next === undefined
        : stryMutAct_9fa48("401")
          ? false
          : stryMutAct_9fa48("400")
            ? true
            : (stryCov_9fa48("400", "401", "402"),
              (stryMutAct_9fa48("404")
                ? (prev === null || next === null) && prev === undefined
                : stryMutAct_9fa48("403")
                  ? false
                  : (stryCov_9fa48("403", "404"),
                    (stryMutAct_9fa48("406")
                      ? prev === null && next === null
                      : stryMutAct_9fa48("405")
                        ? false
                        : (stryCov_9fa48("405", "406"),
                          (stryMutAct_9fa48("408")
                            ? prev !== null
                            : stryMutAct_9fa48("407")
                              ? false
                              : (stryCov_9fa48("407", "408"), prev === null)) ||
                            (stryMutAct_9fa48("410")
                              ? next !== null
                              : stryMutAct_9fa48("409")
                                ? false
                                : (stryCov_9fa48("409", "410"), next === null)))) ||
                      (stryMutAct_9fa48("412")
                        ? prev !== undefined
                        : stryMutAct_9fa48("411")
                          ? false
                          : (stryCov_9fa48("411", "412"), prev === undefined)))) ||
                (stryMutAct_9fa48("414")
                  ? next !== undefined
                  : stryMutAct_9fa48("413")
                    ? false
                    : (stryCov_9fa48("413", "414"), next === undefined)))
    ) {
      if (stryMutAct_9fa48("415")) {
        {
        }
      } else {
        stryCov_9fa48("415");
        return next;
      }
    }

    // Both arrays
    if (
      stryMutAct_9fa48("418")
        ? Array.isArray(prev) || Array.isArray(next)
        : stryMutAct_9fa48("417")
          ? false
          : stryMutAct_9fa48("416")
            ? true
            : (stryCov_9fa48("416", "417", "418"), Array.isArray(prev) && Array.isArray(next))
    ) {
      if (stryMutAct_9fa48("419")) {
        {
        }
      } else {
        stryCov_9fa48("419");
        const result = next.map(
          stryMutAct_9fa48("420")
            ? () => undefined
            : (stryCov_9fa48("420"),
              (item: unknown, i: number) =>
                (
                  stryMutAct_9fa48("424")
                    ? i >= prev.length
                    : stryMutAct_9fa48("423")
                      ? i <= prev.length
                      : stryMutAct_9fa48("422")
                        ? false
                        : stryMutAct_9fa48("421")
                          ? true
                          : (stryCov_9fa48("421", "422", "423", "424"), i < prev.length)
                )
                  ? replaceEqualDeep(prev[i], item)
                  : item)
        );
        if (
          stryMutAct_9fa48("427")
            ? result.length === prev.length || result.every((item, i) => item === prev[i])
            : stryMutAct_9fa48("426")
              ? false
              : stryMutAct_9fa48("425")
                ? true
                : (stryCov_9fa48("425", "426", "427"),
                  (stryMutAct_9fa48("429")
                    ? result.length !== prev.length
                    : stryMutAct_9fa48("428")
                      ? true
                      : (stryCov_9fa48("428", "429"), result.length === prev.length)) &&
                    (stryMutAct_9fa48("430")
                      ? result.some((item, i) => item === prev[i])
                      : (stryCov_9fa48("430"),
                        result.every(
                          stryMutAct_9fa48("431")
                            ? () => undefined
                            : (stryCov_9fa48("431"),
                              (item, i) =>
                                stryMutAct_9fa48("434")
                                  ? item !== prev[i]
                                  : stryMutAct_9fa48("433")
                                    ? false
                                    : stryMutAct_9fa48("432")
                                      ? true
                                      : (stryCov_9fa48("432", "433", "434"), item === prev[i]))
                        ))))
        ) {
          if (stryMutAct_9fa48("435")) {
            {
            }
          } else {
            stryCov_9fa48("435");
            return prev;
          }
        }
        // GENERIC_BOUNDARY: structural sharing preserves T shape by construction
        return unsafeCoerce<T>(result);
      }
    }

    // Both plain objects
    if (
      stryMutAct_9fa48("438")
        ? isPlainObject(prev) || isPlainObject(next)
        : stryMutAct_9fa48("437")
          ? false
          : stryMutAct_9fa48("436")
            ? true
            : (stryCov_9fa48("436", "437", "438"), isPlainObject(prev) && isPlainObject(next))
    ) {
      if (stryMutAct_9fa48("439")) {
        {
        }
      } else {
        stryCov_9fa48("439");
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);

        // Quick check: if key counts differ, they're different
        let allEqual = stryMutAct_9fa48("442")
          ? prevKeys.length !== nextKeys.length
          : stryMutAct_9fa48("441")
            ? false
            : stryMutAct_9fa48("440")
              ? true
              : (stryCov_9fa48("440", "441", "442"), prevKeys.length === nextKeys.length);
        const result: Record<string, unknown> = {};
        for (const key of nextKeys) {
          if (stryMutAct_9fa48("443")) {
            {
            }
          } else {
            stryCov_9fa48("443");
            if (
              stryMutAct_9fa48("445")
                ? false
                : stryMutAct_9fa48("444")
                  ? true
                  : (stryCov_9fa48("444", "445"), key in prev)
            ) {
              if (stryMutAct_9fa48("446")) {
                {
                }
              } else {
                stryCov_9fa48("446");
                result[key] = replaceEqualDeep(prev[key], next[key]);
                if (
                  stryMutAct_9fa48("449")
                    ? result[key] === prev[key]
                    : stryMutAct_9fa48("448")
                      ? false
                      : stryMutAct_9fa48("447")
                        ? true
                        : (stryCov_9fa48("447", "448", "449"), result[key] !== prev[key])
                ) {
                  if (stryMutAct_9fa48("450")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("450");
                    allEqual = stryMutAct_9fa48("451") ? true : (stryCov_9fa48("451"), false);
                  }
                }
              }
            } else {
              if (stryMutAct_9fa48("452")) {
                {
                }
              } else {
                stryCov_9fa48("452");
                result[key] = next[key];
                allEqual = stryMutAct_9fa48("453") ? true : (stryCov_9fa48("453"), false);
              }
            }
          }
        }
        if (
          stryMutAct_9fa48("455")
            ? false
            : stryMutAct_9fa48("454")
              ? true
              : (stryCov_9fa48("454", "455"), allEqual)
        ) {
          if (stryMutAct_9fa48("456")) {
            {
            }
          } else {
            stryCov_9fa48("456");
            return prev;
          }
        }
        // GENERIC_BOUNDARY: structural sharing preserves T shape by construction
        return unsafeCoerce<T>(result);
      }
    }

    // Primitives or different types
    return next;
  }
}
