/**
 * String similarity utilities for error messages.
 *
 * Provides Levenshtein distance calculation and port name suggestion functionality
 * to help developers identify typos in port names.
 *
 * @packageDocumentation
 */
// @ts-nocheck

/**
 * Calculates the Levenshtein distance between two strings.
 *
 * The Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one string
 * into another.
 *
 * Uses dynamic programming with a matrix approach for O(m*n) time complexity
 * where m and n are the lengths of the input strings.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns The Levenshtein distance (number of edits needed)
 *
 * @example
 * ```typescript
 * levenshteinDistance("kitten", "sitting"); // 3
 * levenshteinDistance("UserService", "UserServce"); // 1
 * levenshteinDistance("", "abc"); // 3
 * ```
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
export function levenshteinDistance(a: string, b: string): number {
  if (stryMutAct_9fa48("2172")) {
    {
    }
  } else {
    stryCov_9fa48("2172");
    // Handle edge cases
    if (
      stryMutAct_9fa48("2175")
        ? a !== b
        : stryMutAct_9fa48("2174")
          ? false
          : stryMutAct_9fa48("2173")
            ? true
            : (stryCov_9fa48("2173", "2174", "2175"), a === b)
    )
      return 0;
    if (
      stryMutAct_9fa48("2178")
        ? a.length !== 0
        : stryMutAct_9fa48("2177")
          ? false
          : stryMutAct_9fa48("2176")
            ? true
            : (stryCov_9fa48("2176", "2177", "2178"), a.length === 0)
    )
      return b.length;
    if (
      stryMutAct_9fa48("2181")
        ? b.length !== 0
        : stryMutAct_9fa48("2180")
          ? false
          : stryMutAct_9fa48("2179")
            ? true
            : (stryCov_9fa48("2179", "2180", "2181"), b.length === 0)
    )
      return a.length;

    // Create matrix with dimensions (a.length + 1) x (b.length + 1)
    const matrix: number[][] = stryMutAct_9fa48("2182")
      ? ["Stryker was here"]
      : (stryCov_9fa48("2182"), []);

    // Initialize first column (distance from empty string to a[0..i])
    for (
      let i = 0;
      stryMutAct_9fa48("2185")
        ? i > a.length
        : stryMutAct_9fa48("2184")
          ? i < a.length
          : stryMutAct_9fa48("2183")
            ? false
            : (stryCov_9fa48("2183", "2184", "2185"), i <= a.length);
      stryMutAct_9fa48("2186") ? i-- : (stryCov_9fa48("2186"), i++)
    ) {
      if (stryMutAct_9fa48("2187")) {
        {
        }
      } else {
        stryCov_9fa48("2187");
        matrix[i] = stryMutAct_9fa48("2188") ? [] : (stryCov_9fa48("2188"), [i]);
      }
    }

    // Initialize first row (distance from empty string to b[0..j])
    for (
      let j = 0;
      stryMutAct_9fa48("2191")
        ? j > b.length
        : stryMutAct_9fa48("2190")
          ? j < b.length
          : stryMutAct_9fa48("2189")
            ? false
            : (stryCov_9fa48("2189", "2190", "2191"), j <= b.length);
      stryMutAct_9fa48("2192") ? j-- : (stryCov_9fa48("2192"), j++)
    ) {
      if (stryMutAct_9fa48("2193")) {
        {
        }
      } else {
        stryCov_9fa48("2193");
        matrix[0][j] = j;
      }
    }

    // Fill in the rest of the matrix
    for (
      let i = 1;
      stryMutAct_9fa48("2196")
        ? i > a.length
        : stryMutAct_9fa48("2195")
          ? i < a.length
          : stryMutAct_9fa48("2194")
            ? false
            : (stryCov_9fa48("2194", "2195", "2196"), i <= a.length);
      stryMutAct_9fa48("2197") ? i-- : (stryCov_9fa48("2197"), i++)
    ) {
      if (stryMutAct_9fa48("2198")) {
        {
        }
      } else {
        stryCov_9fa48("2198");
        for (
          let j = 1;
          stryMutAct_9fa48("2201")
            ? j > b.length
            : stryMutAct_9fa48("2200")
              ? j < b.length
              : stryMutAct_9fa48("2199")
                ? false
                : (stryCov_9fa48("2199", "2200", "2201"), j <= b.length);
          stryMutAct_9fa48("2202") ? j-- : (stryCov_9fa48("2202"), j++)
        ) {
          if (stryMutAct_9fa48("2203")) {
            {
            }
          } else {
            stryCov_9fa48("2203");
            const cost = (
              stryMutAct_9fa48("2206")
                ? a[i - 1] !== b[j - 1]
                : stryMutAct_9fa48("2205")
                  ? false
                  : stryMutAct_9fa48("2204")
                    ? true
                    : (stryCov_9fa48("2204", "2205", "2206"),
                      a[stryMutAct_9fa48("2207") ? i + 1 : (stryCov_9fa48("2207"), i - 1)] ===
                        b[stryMutAct_9fa48("2208") ? j + 1 : (stryCov_9fa48("2208"), j - 1)])
            )
              ? 0
              : 1;
            matrix[i][j] = stryMutAct_9fa48("2209")
              ? Math.max(
                  matrix[i - 1][j] + 1,
                  // deletion
                  matrix[i][j - 1] + 1,
                  // insertion
                  matrix[i - 1][j - 1] + cost // substitution
                )
              : (stryCov_9fa48("2209"),
                Math.min(
                  stryMutAct_9fa48("2210")
                    ? matrix[i - 1][j] - 1
                    : (stryCov_9fa48("2210"),
                      matrix[stryMutAct_9fa48("2211") ? i + 1 : (stryCov_9fa48("2211"), i - 1)][j] +
                        1), // deletion
                  stryMutAct_9fa48("2212")
                    ? // deletion
                      matrix[i][j - 1] - 1
                    : (stryCov_9fa48("2212"),
                      matrix[i][stryMutAct_9fa48("2213") ? j + 1 : (stryCov_9fa48("2213"), j - 1)] +
                        1), // insertion
                  stryMutAct_9fa48("2214")
                    ? // insertion
                      matrix[i - 1][j - 1] - cost // substitution
                    : (stryCov_9fa48("2214"),
                      matrix[stryMutAct_9fa48("2215") ? i + 1 : (stryCov_9fa48("2215"), i - 1)][
                        stryMutAct_9fa48("2216") ? j + 1 : (stryCov_9fa48("2216"), j - 1)
                      ] + cost) // substitution
                ));
          }
        }
      }
    }

    // Return bottom-right cell (full distance)
    return matrix[a.length][b.length];
  }
}

/**
 * Maximum Levenshtein distance for port name suggestions.
 *
 * Port names that differ by more than 2 character edits are considered
 * too dissimilar to be likely typos. This threshold balances helpfulness
 * with avoiding false positive suggestions.
 */
const MAX_DISTANCE = 2;

/**
 * Suggests a similar port name from available ports based on edit distance.
 *
 * Uses Levenshtein distance to find the closest matching port name.
 * Only suggests matches within MAX_DISTANCE (2 edits) to avoid unhelpful
 * suggestions for completely different names.
 *
 * @param attemptedName - The port name that was attempted (possibly misspelled)
 * @param availablePorts - Array of available port names to search
 * @returns The closest matching port name, or undefined if no close match found
 *
 * @example
 * ```typescript
 * const available = ["UserService", "AuthService", "LoggerService"];
 *
 * suggestSimilarPort("UserServce", available);
 * // Returns "UserService" (distance 1)
 *
 * suggestSimilarPort("UserSrv", available);
 * // Returns undefined (distance 4, too far)
 *
 * suggestSimilarPort("Loger", available);
 * // Returns "LoggerService" (distance 2 - missing 'g' and 'Service')
 * ```
 */
export function suggestSimilarPort(
  attemptedName: string,
  availablePorts: readonly string[]
): string | undefined {
  if (stryMutAct_9fa48("2217")) {
    {
    }
  } else {
    stryCov_9fa48("2217");
    let closestMatch: string | undefined = undefined;
    let closestDistance = stryMutAct_9fa48("2218")
      ? MAX_DISTANCE - 1
      : (stryCov_9fa48("2218"), MAX_DISTANCE + 1);
    for (const portName of availablePorts) {
      if (stryMutAct_9fa48("2219")) {
        {
        }
      } else {
        stryCov_9fa48("2219");
        const distance = levenshteinDistance(attemptedName, portName);
        if (
          stryMutAct_9fa48("2222")
            ? distance <= MAX_DISTANCE || distance < closestDistance
            : stryMutAct_9fa48("2221")
              ? false
              : stryMutAct_9fa48("2220")
                ? true
                : (stryCov_9fa48("2220", "2221", "2222"),
                  (stryMutAct_9fa48("2225")
                    ? distance > MAX_DISTANCE
                    : stryMutAct_9fa48("2224")
                      ? distance < MAX_DISTANCE
                      : stryMutAct_9fa48("2223")
                        ? true
                        : (stryCov_9fa48("2223", "2224", "2225"), distance <= MAX_DISTANCE)) &&
                    (stryMutAct_9fa48("2228")
                      ? distance >= closestDistance
                      : stryMutAct_9fa48("2227")
                        ? distance <= closestDistance
                        : stryMutAct_9fa48("2226")
                          ? true
                          : (stryCov_9fa48("2226", "2227", "2228"), distance < closestDistance)))
        ) {
          if (stryMutAct_9fa48("2229")) {
            {
            }
          } else {
            stryCov_9fa48("2229");
            closestMatch = portName;
            closestDistance = distance;
          }
        }
      }
    }
    return closestMatch;
  }
}
