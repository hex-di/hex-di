/**
 * Helper functions for container implementation.
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
import type { Port } from "@hex-di/core";
import type { MemoMap } from "../util/memo-map.js";
import type { MemoMapSnapshot, MemoEntrySnapshot } from "../inspection/internal-state-types.js";
import type { InheritanceMode } from "../types.js";
import type { DisposableChild, ParentContainerLike, RuntimeAdapter } from "./internal-types.js";
import { ADAPTER_ACCESS } from "../inspection/symbols.js";

// =============================================================================
// Type Guards
// =============================================================================

export function isDisposableChild(value: unknown): value is DisposableChild {
  if (stryMutAct_9fa48("476")) {
    {
    }
  } else {
    stryCov_9fa48("476");
    return stryMutAct_9fa48("479")
      ? (value !== null &&
          typeof value === "object" &&
          "dispose" in value &&
          typeof (
            value as {
              dispose: unknown;
            }
          ).dispose === "function") ||
          "isDisposed" in value
      : stryMutAct_9fa48("478")
        ? false
        : stryMutAct_9fa48("477")
          ? true
          : (stryCov_9fa48("477", "478", "479"),
            (stryMutAct_9fa48("481")
              ? (value !== null && typeof value === "object" && "dispose" in value) ||
                typeof (
                  value as {
                    dispose: unknown;
                  }
                ).dispose === "function"
              : stryMutAct_9fa48("480")
                ? true
                : (stryCov_9fa48("480", "481"),
                  (stryMutAct_9fa48("483")
                    ? (value !== null && typeof value === "object") || "dispose" in value
                    : stryMutAct_9fa48("482")
                      ? true
                      : (stryCov_9fa48("482", "483"),
                        (stryMutAct_9fa48("485")
                          ? value !== null || typeof value === "object"
                          : stryMutAct_9fa48("484")
                            ? true
                            : (stryCov_9fa48("484", "485"),
                              (stryMutAct_9fa48("487")
                                ? value === null
                                : stryMutAct_9fa48("486")
                                  ? true
                                  : (stryCov_9fa48("486", "487"), value !== null)) &&
                                (stryMutAct_9fa48("489")
                                  ? typeof value !== "object"
                                  : stryMutAct_9fa48("488")
                                    ? true
                                    : (stryCov_9fa48("488", "489"),
                                      typeof value ===
                                        (stryMutAct_9fa48("490")
                                          ? ""
                                          : (stryCov_9fa48("490"), "object")))))) &&
                          (stryMutAct_9fa48("491") ? "" : (stryCov_9fa48("491"), "dispose")) in
                            value)) &&
                    (stryMutAct_9fa48("493")
                      ? typeof (
                          value as {
                            dispose: unknown;
                          }
                        ).dispose !== "function"
                      : stryMutAct_9fa48("492")
                        ? true
                        : (stryCov_9fa48("492", "493"),
                          typeof (
                            value as {
                              dispose: unknown;
                            }
                          ).dispose ===
                            (stryMutAct_9fa48("494")
                              ? ""
                              : (stryCov_9fa48("494"), "function")))))) &&
              (stryMutAct_9fa48("495") ? "" : (stryCov_9fa48("495"), "isDisposed")) in value);
  }
}
export function isInheritanceMode(value: unknown): value is InheritanceMode {
  if (stryMutAct_9fa48("496")) {
    {
    }
  } else {
    stryCov_9fa48("496");
    return stryMutAct_9fa48("499")
      ? (value === "shared" || value === "forked") && value === "isolated"
      : stryMutAct_9fa48("498")
        ? false
        : stryMutAct_9fa48("497")
          ? true
          : (stryCov_9fa48("497", "498", "499"),
            (stryMutAct_9fa48("501")
              ? value === "shared" && value === "forked"
              : stryMutAct_9fa48("500")
                ? false
                : (stryCov_9fa48("500", "501"),
                  (stryMutAct_9fa48("503")
                    ? value !== "shared"
                    : stryMutAct_9fa48("502")
                      ? false
                      : (stryCov_9fa48("502", "503"),
                        value ===
                          (stryMutAct_9fa48("504") ? "" : (stryCov_9fa48("504"), "shared")))) ||
                    (stryMutAct_9fa48("506")
                      ? value !== "forked"
                      : stryMutAct_9fa48("505")
                        ? false
                        : (stryCov_9fa48("505", "506"),
                          value ===
                            (stryMutAct_9fa48("507") ? "" : (stryCov_9fa48("507"), "forked")))))) ||
              (stryMutAct_9fa48("509")
                ? value !== "isolated"
                : stryMutAct_9fa48("508")
                  ? false
                  : (stryCov_9fa48("508", "509"),
                    value ===
                      (stryMutAct_9fa48("510") ? "" : (stryCov_9fa48("510"), "isolated")))));
  }
}

// =============================================================================
// Parent Container Checks
// =============================================================================

export function isAdapterProvidedByParent<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(parent: ParentContainerLike<TParentProvides, TAsyncPorts>, adapter: RuntimeAdapter): boolean {
  if (stryMutAct_9fa48("511")) {
    {
    }
  } else {
    stryCov_9fa48("511");
    return stryMutAct_9fa48("514")
      ? parent[ADAPTER_ACCESS](adapter.provides) === undefined
      : stryMutAct_9fa48("513")
        ? false
        : stryMutAct_9fa48("512")
          ? true
          : (stryCov_9fa48("512", "513", "514"),
            parent[ADAPTER_ACCESS](adapter.provides) !== undefined);
  }
}
export function isAdapterProvidedByParentOrExtensions<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(
  parent: ParentContainerLike<TParentProvides, TAsyncPorts>,
  extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>,
  adapter: RuntimeAdapter
): boolean {
  if (stryMutAct_9fa48("515")) {
    {
    }
  } else {
    stryCov_9fa48("515");
    return stryMutAct_9fa48("518")
      ? parent[ADAPTER_ACCESS](adapter.provides) !== undefined && extensions.has(adapter.provides)
      : stryMutAct_9fa48("517")
        ? false
        : stryMutAct_9fa48("516")
          ? true
          : (stryCov_9fa48("516", "517", "518"),
            (stryMutAct_9fa48("520")
              ? parent[ADAPTER_ACCESS](adapter.provides) === undefined
              : stryMutAct_9fa48("519")
                ? false
                : (stryCov_9fa48("519", "520"),
                  parent[ADAPTER_ACCESS](adapter.provides) !== undefined)) ||
              extensions.has(adapter.provides));
  }
}

// =============================================================================
// Object Utilities
// =============================================================================

/**
 * Creates a shallow clone of an object, preserving its prototype.
 *
 * Used for:
 * - Forked inheritance mode (cloning parent instances)
 * - Isolated mode fallback (when no adapter is available)
 *
 * @param obj - The object to clone
 * @returns A shallow clone with the same prototype
 */
export function shallowClone<T>(obj: T): T {
  if (stryMutAct_9fa48("521")) {
    {
    }
  } else {
    stryCov_9fa48("521");
    if (
      stryMutAct_9fa48("524")
        ? obj === null && typeof obj !== "object"
        : stryMutAct_9fa48("523")
          ? false
          : stryMutAct_9fa48("522")
            ? true
            : (stryCov_9fa48("522", "523", "524"),
              (stryMutAct_9fa48("526")
                ? obj !== null
                : stryMutAct_9fa48("525")
                  ? false
                  : (stryCov_9fa48("525", "526"), obj === null)) ||
                (stryMutAct_9fa48("528")
                  ? typeof obj === "object"
                  : stryMutAct_9fa48("527")
                    ? false
                    : (stryCov_9fa48("527", "528"),
                      typeof obj !==
                        (stryMutAct_9fa48("529") ? "" : (stryCov_9fa48("529"), "object")))))
    ) {
      if (stryMutAct_9fa48("530")) {
        {
        }
      } else {
        stryCov_9fa48("530");
        return obj;
      }
    }
    const prototype: object | null = Reflect.getPrototypeOf(obj);
    const shell: Record<PropertyKey, never> = {};
    Reflect.setPrototypeOf(shell, prototype);
    return Object.assign(shell, obj);
  }
}

// =============================================================================
// Snapshot Creation
// =============================================================================

export function createMemoMapSnapshot(memo: MemoMap): MemoMapSnapshot {
  if (stryMutAct_9fa48("531")) {
    {
    }
  } else {
    stryCov_9fa48("531");
    const entries: MemoEntrySnapshot[] = stryMutAct_9fa48("532")
      ? ["Stryker was here"]
      : (stryCov_9fa48("532"), []);
    for (const [port, metadata] of memo.entries()) {
      if (stryMutAct_9fa48("533")) {
        {
        }
      } else {
        stryCov_9fa48("533");
        entries.push(
          Object.freeze(
            stryMutAct_9fa48("534")
              ? {}
              : (stryCov_9fa48("534"),
                {
                  port,
                  portName: port.__portName,
                  resolvedAt: metadata.resolvedAt,
                  resolutionOrder: metadata.resolutionOrder,
                })
          )
        );
      }
    }
    return Object.freeze(
      stryMutAct_9fa48("535")
        ? {}
        : (stryCov_9fa48("535"),
          {
            size: entries.length,
            entries: Object.freeze(entries),
          })
    );
  }
}
