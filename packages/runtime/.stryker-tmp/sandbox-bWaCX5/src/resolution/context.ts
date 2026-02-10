/**
 * ResolutionContext - Internal class for tracking resolution path.
 *
 * This class tracks the current resolution path during dependency resolution
 * and detects circular dependencies. It is an internal implementation detail
 * and should NOT be exported from the public API.
 *
 * @remarks
 * - Uses Set<string> for O(1) cycle detection lookup
 * - Uses array for maintaining order for error messages
 * - Thread-safe within a single synchronous resolution call
 *
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
import { CircularDependencyError } from "../errors/index.js";

/**
 * Internal class for tracking the resolution path and detecting circular dependencies.
 *
 * The ResolutionContext maintains both a Set and an Array of port names:
 * - Set provides O(1) lookup for cycle detection
 * - Array preserves insertion order for error message formatting
 *
 * @internal
 */
export class ResolutionContext {
  /**
   * Set of port names currently in the resolution path for O(1) cycle detection.
   */
  private readonly path: Set<string> = new Set();

  /**
   * Array of port names in resolution order for error message formatting.
   */
  private readonly pathArray: string[] = stryMutAct_9fa48("1864")
    ? ["Stryker was here"]
    : (stryCov_9fa48("1864"), []);

  /**
   * Enters a port into the resolution path.
   *
   * This method should be called at the start of resolving each port.
   * If the port is already in the current resolution path, a circular
   * dependency is detected and CircularDependencyError is thrown.
   *
   * @param portName - The name of the port being resolved
   * @throws CircularDependencyError if the port is already in the resolution path
   */
  enter(portName: string): void {
    if (stryMutAct_9fa48("1865")) {
      {
      }
    } else {
      stryCov_9fa48("1865");
      if (
        stryMutAct_9fa48("1867")
          ? false
          : stryMutAct_9fa48("1866")
            ? true
            : (stryCov_9fa48("1866", "1867"), this.path.has(portName))
      ) {
        if (stryMutAct_9fa48("1868")) {
          {
          }
        } else {
          stryCov_9fa48("1868");
          // Circular dependency detected - build the full chain for the error
          const chain = stryMutAct_9fa48("1869")
            ? []
            : (stryCov_9fa48("1869"), [...this.pathArray, portName]);
          throw new CircularDependencyError(chain);
        }
      }
      this.path.add(portName);
      this.pathArray.push(portName);
    }
  }

  /**
   * Exits a port from the resolution path.
   *
   * This method should be called after successfully resolving a port
   * and all its dependencies. It removes the port from tracking,
   * allowing it to be resolved again in a different resolution chain.
   *
   * @param portName - The name of the port that finished resolving
   */
  exit(portName: string): void {
    if (stryMutAct_9fa48("1870")) {
      {
      }
    } else {
      stryCov_9fa48("1870");
      this.path.delete(portName);
      this.pathArray.pop();
    }
  }

  /**
   * Returns a copy of the current resolution path.
   *
   * The returned array is a defensive copy that can be safely used
   * for error messages without affecting the internal state.
   *
   * @returns A readonly copy of the current resolution path as an array of port names
   */
  getPath(): readonly string[] {
    if (stryMutAct_9fa48("1871")) {
      {
      }
    } else {
      stryCov_9fa48("1871");
      return stryMutAct_9fa48("1872") ? [] : (stryCov_9fa48("1872"), [...this.pathArray]);
    }
  }
}
