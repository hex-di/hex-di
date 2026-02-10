/**
 * Container wrapper functions for creating public API objects.
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
import type { Port, InferService, AdapterConstraint } from "@hex-di/core";
import { getPortMetadata, isLibraryInspector } from "@hex-di/core";
import { tryCatch, fromPromise } from "@hex-di/result";
import { OverrideBuilder, type ContainerForOverride } from "./override-builder.js";
import type { Graph, InferGraphProvides, InferGraphAsyncPorts } from "@hex-di/graph";
import { mapToContainerError, mapToDisposalError, emitResultEvent } from "./result-helpers.js";
import type {
  Container,
  ContainerMembers,
  ContainerPhase,
  Scope,
  InheritanceModeConfig,
  LazyContainer,
  CreateChildOptions,
  ContainerKind,
} from "../types.js";
import { ContainerBrand } from "../types.js";
import { ADAPTER_ACCESS, INTERNAL_ACCESS, HOOKS_ACCESS } from "../inspection/symbols.js";
import type {
  ResolutionHooks,
  HooksInstaller,
  HookType,
  HookHandler,
  ResolutionHookContext,
  ResolutionResultContext,
} from "../resolution/hooks.js";

/**
 * Union type for hook handlers (beforeResolve or afterResolve).
 * Used as WeakMap key type for handler-to-uninstall mapping.
 * @internal
 */
type AnyHookHandler = HookHandler<"beforeResolve"> | HookHandler<"afterResolve">;
import { unreachable } from "../util/unreachable.js";
import { isRecord } from "../util/type-guards.js";
import { ScopeImpl, createScopeWrapper } from "../scope/impl.js";
import { ChildContainerImpl } from "./impl.js";
import { LazyContainerImpl, type LazyContainerParent } from "./lazy-impl.js";
import type {
  DisposableChild,
  ParentContainerLike,
  InternalContainerMethods,
} from "./internal-types.js";
import type { InspectorAPI } from "../inspection/types.js";
import {
  attachBuiltinAPIs,
  parseChildGraph,
  parseInheritanceModes,
  createChildContainerConfig,
} from "./wrapper-utils.js";

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value has internal container methods.
 * @internal
 */
export function hasInternalMethods(
  value: unknown
): value is InternalContainerMethods<Port<unknown, string>> {
  if (stryMutAct_9fa48("956")) {
    {
    }
  } else {
    stryCov_9fa48("956");
    if (
      stryMutAct_9fa48("959")
        ? false
        : stryMutAct_9fa48("958")
          ? true
          : stryMutAct_9fa48("957")
            ? isRecord(value)
            : (stryCov_9fa48("957", "958", "959"), !isRecord(value))
    ) {
      if (stryMutAct_9fa48("960")) {
        {
        }
      } else {
        stryCov_9fa48("960");
        return stryMutAct_9fa48("961") ? true : (stryCov_9fa48("961"), false);
      }
    }
    return stryMutAct_9fa48("964")
      ? (ADAPTER_ACCESS in value &&
          typeof value[ADAPTER_ACCESS] === "function" &&
          "registerChildContainer" in value &&
          typeof value["registerChildContainer"] === "function" &&
          "unregisterChildContainer" in value &&
          typeof value["unregisterChildContainer"] === "function" &&
          "resolveInternal" in value &&
          typeof value["resolveInternal"] === "function" &&
          "resolveAsyncInternal" in value &&
          typeof value["resolveAsyncInternal"] === "function" &&
          "hasAdapter" in value &&
          typeof value["hasAdapter"] === "function" &&
          "has" in value) ||
          typeof value["has"] === "function"
      : stryMutAct_9fa48("963")
        ? false
        : stryMutAct_9fa48("962")
          ? true
          : (stryCov_9fa48("962", "963", "964"),
            (stryMutAct_9fa48("966")
              ? (ADAPTER_ACCESS in value &&
                  typeof value[ADAPTER_ACCESS] === "function" &&
                  "registerChildContainer" in value &&
                  typeof value["registerChildContainer"] === "function" &&
                  "unregisterChildContainer" in value &&
                  typeof value["unregisterChildContainer"] === "function" &&
                  "resolveInternal" in value &&
                  typeof value["resolveInternal"] === "function" &&
                  "resolveAsyncInternal" in value &&
                  typeof value["resolveAsyncInternal"] === "function" &&
                  "hasAdapter" in value &&
                  typeof value["hasAdapter"] === "function") ||
                "has" in value
              : stryMutAct_9fa48("965")
                ? true
                : (stryCov_9fa48("965", "966"),
                  (stryMutAct_9fa48("968")
                    ? (ADAPTER_ACCESS in value &&
                        typeof value[ADAPTER_ACCESS] === "function" &&
                        "registerChildContainer" in value &&
                        typeof value["registerChildContainer"] === "function" &&
                        "unregisterChildContainer" in value &&
                        typeof value["unregisterChildContainer"] === "function" &&
                        "resolveInternal" in value &&
                        typeof value["resolveInternal"] === "function" &&
                        "resolveAsyncInternal" in value &&
                        typeof value["resolveAsyncInternal"] === "function" &&
                        "hasAdapter" in value) ||
                      typeof value["hasAdapter"] === "function"
                    : stryMutAct_9fa48("967")
                      ? true
                      : (stryCov_9fa48("967", "968"),
                        (stryMutAct_9fa48("970")
                          ? (ADAPTER_ACCESS in value &&
                              typeof value[ADAPTER_ACCESS] === "function" &&
                              "registerChildContainer" in value &&
                              typeof value["registerChildContainer"] === "function" &&
                              "unregisterChildContainer" in value &&
                              typeof value["unregisterChildContainer"] === "function" &&
                              "resolveInternal" in value &&
                              typeof value["resolveInternal"] === "function" &&
                              "resolveAsyncInternal" in value &&
                              typeof value["resolveAsyncInternal"] === "function") ||
                            "hasAdapter" in value
                          : stryMutAct_9fa48("969")
                            ? true
                            : (stryCov_9fa48("969", "970"),
                              (stryMutAct_9fa48("972")
                                ? (ADAPTER_ACCESS in value &&
                                    typeof value[ADAPTER_ACCESS] === "function" &&
                                    "registerChildContainer" in value &&
                                    typeof value["registerChildContainer"] === "function" &&
                                    "unregisterChildContainer" in value &&
                                    typeof value["unregisterChildContainer"] === "function" &&
                                    "resolveInternal" in value &&
                                    typeof value["resolveInternal"] === "function" &&
                                    "resolveAsyncInternal" in value) ||
                                  typeof value["resolveAsyncInternal"] === "function"
                                : stryMutAct_9fa48("971")
                                  ? true
                                  : (stryCov_9fa48("971", "972"),
                                    (stryMutAct_9fa48("974")
                                      ? (ADAPTER_ACCESS in value &&
                                          typeof value[ADAPTER_ACCESS] === "function" &&
                                          "registerChildContainer" in value &&
                                          typeof value["registerChildContainer"] === "function" &&
                                          "unregisterChildContainer" in value &&
                                          typeof value["unregisterChildContainer"] === "function" &&
                                          "resolveInternal" in value &&
                                          typeof value["resolveInternal"] === "function") ||
                                        "resolveAsyncInternal" in value
                                      : stryMutAct_9fa48("973")
                                        ? true
                                        : (stryCov_9fa48("973", "974"),
                                          (stryMutAct_9fa48("976")
                                            ? (ADAPTER_ACCESS in value &&
                                                typeof value[ADAPTER_ACCESS] === "function" &&
                                                "registerChildContainer" in value &&
                                                typeof value["registerChildContainer"] ===
                                                  "function" &&
                                                "unregisterChildContainer" in value &&
                                                typeof value["unregisterChildContainer"] ===
                                                  "function" &&
                                                "resolveInternal" in value) ||
                                              typeof value["resolveInternal"] === "function"
                                            : stryMutAct_9fa48("975")
                                              ? true
                                              : (stryCov_9fa48("975", "976"),
                                                (stryMutAct_9fa48("978")
                                                  ? (ADAPTER_ACCESS in value &&
                                                      typeof value[ADAPTER_ACCESS] === "function" &&
                                                      "registerChildContainer" in value &&
                                                      typeof value["registerChildContainer"] ===
                                                        "function" &&
                                                      "unregisterChildContainer" in value &&
                                                      typeof value["unregisterChildContainer"] ===
                                                        "function") ||
                                                    "resolveInternal" in value
                                                  : stryMutAct_9fa48("977")
                                                    ? true
                                                    : (stryCov_9fa48("977", "978"),
                                                      (stryMutAct_9fa48("980")
                                                        ? (ADAPTER_ACCESS in value &&
                                                            typeof value[ADAPTER_ACCESS] ===
                                                              "function" &&
                                                            "registerChildContainer" in value &&
                                                            typeof value[
                                                              "registerChildContainer"
                                                            ] === "function" &&
                                                            "unregisterChildContainer" in value) ||
                                                          typeof value[
                                                            "unregisterChildContainer"
                                                          ] === "function"
                                                        : stryMutAct_9fa48("979")
                                                          ? true
                                                          : (stryCov_9fa48("979", "980"),
                                                            (stryMutAct_9fa48("982")
                                                              ? (ADAPTER_ACCESS in value &&
                                                                  typeof value[ADAPTER_ACCESS] ===
                                                                    "function" &&
                                                                  "registerChildContainer" in
                                                                    value &&
                                                                  typeof value[
                                                                    "registerChildContainer"
                                                                  ] === "function") ||
                                                                "unregisterChildContainer" in value
                                                              : stryMutAct_9fa48("981")
                                                                ? true
                                                                : (stryCov_9fa48("981", "982"),
                                                                  (stryMutAct_9fa48("984")
                                                                    ? (ADAPTER_ACCESS in value &&
                                                                        typeof value[
                                                                          ADAPTER_ACCESS
                                                                        ] === "function" &&
                                                                        "registerChildContainer" in
                                                                          value) ||
                                                                      typeof value[
                                                                        "registerChildContainer"
                                                                      ] === "function"
                                                                    : stryMutAct_9fa48("983")
                                                                      ? true
                                                                      : (stryCov_9fa48(
                                                                          "983",
                                                                          "984"
                                                                        ),
                                                                        (stryMutAct_9fa48("986")
                                                                          ? (ADAPTER_ACCESS in
                                                                              value &&
                                                                              typeof value[
                                                                                ADAPTER_ACCESS
                                                                              ] === "function") ||
                                                                            "registerChildContainer" in
                                                                              value
                                                                          : stryMutAct_9fa48("985")
                                                                            ? true
                                                                            : (stryCov_9fa48(
                                                                                "985",
                                                                                "986"
                                                                              ),
                                                                              (stryMutAct_9fa48(
                                                                                "988"
                                                                              )
                                                                                ? ADAPTER_ACCESS in
                                                                                    value ||
                                                                                  typeof value[
                                                                                    ADAPTER_ACCESS
                                                                                  ] === "function"
                                                                                : stryMutAct_9fa48(
                                                                                      "987"
                                                                                    )
                                                                                  ? true
                                                                                  : (stryCov_9fa48(
                                                                                      "987",
                                                                                      "988"
                                                                                    ),
                                                                                    ADAPTER_ACCESS in
                                                                                      value &&
                                                                                      (stryMutAct_9fa48(
                                                                                        "990"
                                                                                      )
                                                                                        ? typeof value[
                                                                                            ADAPTER_ACCESS
                                                                                          ] !==
                                                                                          "function"
                                                                                        : stryMutAct_9fa48(
                                                                                              "989"
                                                                                            )
                                                                                          ? true
                                                                                          : (stryCov_9fa48(
                                                                                              "989",
                                                                                              "990"
                                                                                            ),
                                                                                            typeof value[
                                                                                              ADAPTER_ACCESS
                                                                                            ] ===
                                                                                              (stryMutAct_9fa48(
                                                                                                "991"
                                                                                              )
                                                                                                ? ""
                                                                                                : (stryCov_9fa48(
                                                                                                    "991"
                                                                                                  ),
                                                                                                  "function")))))) &&
                                                                                (stryMutAct_9fa48(
                                                                                  "992"
                                                                                )
                                                                                  ? ""
                                                                                  : (stryCov_9fa48(
                                                                                      "992"
                                                                                    ),
                                                                                    "registerChildContainer")) in
                                                                                  value)) &&
                                                                          (stryMutAct_9fa48("994")
                                                                            ? typeof value[
                                                                                "registerChildContainer"
                                                                              ] !== "function"
                                                                            : stryMutAct_9fa48(
                                                                                  "993"
                                                                                )
                                                                              ? true
                                                                              : (stryCov_9fa48(
                                                                                  "993",
                                                                                  "994"
                                                                                ),
                                                                                typeof value[
                                                                                  stryMutAct_9fa48(
                                                                                    "995"
                                                                                  )
                                                                                    ? ""
                                                                                    : (stryCov_9fa48(
                                                                                        "995"
                                                                                      ),
                                                                                      "registerChildContainer")
                                                                                ] ===
                                                                                  (stryMutAct_9fa48(
                                                                                    "996"
                                                                                  )
                                                                                    ? ""
                                                                                    : (stryCov_9fa48(
                                                                                        "996"
                                                                                      ),
                                                                                      "function")))))) &&
                                                                    (stryMutAct_9fa48("997")
                                                                      ? ""
                                                                      : (stryCov_9fa48("997"),
                                                                        "unregisterChildContainer")) in
                                                                      value)) &&
                                                              (stryMutAct_9fa48("999")
                                                                ? typeof value[
                                                                    "unregisterChildContainer"
                                                                  ] !== "function"
                                                                : stryMutAct_9fa48("998")
                                                                  ? true
                                                                  : (stryCov_9fa48("998", "999"),
                                                                    typeof value[
                                                                      stryMutAct_9fa48("1000")
                                                                        ? ""
                                                                        : (stryCov_9fa48("1000"),
                                                                          "unregisterChildContainer")
                                                                    ] ===
                                                                      (stryMutAct_9fa48("1001")
                                                                        ? ""
                                                                        : (stryCov_9fa48("1001"),
                                                                          "function")))))) &&
                                                        (stryMutAct_9fa48("1002")
                                                          ? ""
                                                          : (stryCov_9fa48("1002"),
                                                            "resolveInternal")) in value)) &&
                                                  (stryMutAct_9fa48("1004")
                                                    ? typeof value["resolveInternal"] !== "function"
                                                    : stryMutAct_9fa48("1003")
                                                      ? true
                                                      : (stryCov_9fa48("1003", "1004"),
                                                        typeof value[
                                                          stryMutAct_9fa48("1005")
                                                            ? ""
                                                            : (stryCov_9fa48("1005"),
                                                              "resolveInternal")
                                                        ] ===
                                                          (stryMutAct_9fa48("1006")
                                                            ? ""
                                                            : (stryCov_9fa48("1006"),
                                                              "function")))))) &&
                                            (stryMutAct_9fa48("1007")
                                              ? ""
                                              : (stryCov_9fa48("1007"), "resolveAsyncInternal")) in
                                              value)) &&
                                      (stryMutAct_9fa48("1009")
                                        ? typeof value["resolveAsyncInternal"] !== "function"
                                        : stryMutAct_9fa48("1008")
                                          ? true
                                          : (stryCov_9fa48("1008", "1009"),
                                            typeof value[
                                              stryMutAct_9fa48("1010")
                                                ? ""
                                                : (stryCov_9fa48("1010"), "resolveAsyncInternal")
                                            ] ===
                                              (stryMutAct_9fa48("1011")
                                                ? ""
                                                : (stryCov_9fa48("1011"), "function")))))) &&
                                (stryMutAct_9fa48("1012")
                                  ? ""
                                  : (stryCov_9fa48("1012"), "hasAdapter")) in value)) &&
                          (stryMutAct_9fa48("1014")
                            ? typeof value["hasAdapter"] !== "function"
                            : stryMutAct_9fa48("1013")
                              ? true
                              : (stryCov_9fa48("1013", "1014"),
                                typeof value[
                                  stryMutAct_9fa48("1015")
                                    ? ""
                                    : (stryCov_9fa48("1015"), "hasAdapter")
                                ] ===
                                  (stryMutAct_9fa48("1016")
                                    ? ""
                                    : (stryCov_9fa48("1016"), "function")))))) &&
                    (stryMutAct_9fa48("1017") ? "" : (stryCov_9fa48("1017"), "has")) in value)) &&
              (stryMutAct_9fa48("1019")
                ? typeof value["has"] !== "function"
                : stryMutAct_9fa48("1018")
                  ? true
                  : (stryCov_9fa48("1018", "1019"),
                    typeof value[stryMutAct_9fa48("1020") ? "" : (stryCov_9fa48("1020"), "has")] ===
                      (stryMutAct_9fa48("1021") ? "" : (stryCov_9fa48("1021"), "function")))));
  }
}
function isContainerParent<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase = "initialized",
>(value: unknown): value is Container<TProvides, TExtends, TAsyncPorts, TPhase>["parent"] {
  if (stryMutAct_9fa48("1022")) {
    {
    }
  } else {
    stryCov_9fa48("1022");
    if (
      stryMutAct_9fa48("1025")
        ? false
        : stryMutAct_9fa48("1024")
          ? true
          : stryMutAct_9fa48("1023")
            ? isRecord(value)
            : (stryCov_9fa48("1023", "1024", "1025"), !isRecord(value))
    ) {
      if (stryMutAct_9fa48("1026")) {
        {
        }
      } else {
        stryCov_9fa48("1026");
        return stryMutAct_9fa48("1027") ? true : (stryCov_9fa48("1027"), false);
      }
    }
    return stryMutAct_9fa48("1030")
      ? ("resolve" in value &&
          typeof value["resolve"] === "function" &&
          "resolveAsync" in value &&
          typeof value["resolveAsync"] === "function" &&
          "createScope" in value &&
          typeof value["createScope"] === "function" &&
          "dispose" in value &&
          typeof value["dispose"] === "function" &&
          "has" in value &&
          typeof value["has"] === "function") ||
          "isDisposed" in value
      : stryMutAct_9fa48("1029")
        ? false
        : stryMutAct_9fa48("1028")
          ? true
          : (stryCov_9fa48("1028", "1029", "1030"),
            (stryMutAct_9fa48("1032")
              ? ("resolve" in value &&
                  typeof value["resolve"] === "function" &&
                  "resolveAsync" in value &&
                  typeof value["resolveAsync"] === "function" &&
                  "createScope" in value &&
                  typeof value["createScope"] === "function" &&
                  "dispose" in value &&
                  typeof value["dispose"] === "function" &&
                  "has" in value) ||
                typeof value["has"] === "function"
              : stryMutAct_9fa48("1031")
                ? true
                : (stryCov_9fa48("1031", "1032"),
                  (stryMutAct_9fa48("1034")
                    ? ("resolve" in value &&
                        typeof value["resolve"] === "function" &&
                        "resolveAsync" in value &&
                        typeof value["resolveAsync"] === "function" &&
                        "createScope" in value &&
                        typeof value["createScope"] === "function" &&
                        "dispose" in value &&
                        typeof value["dispose"] === "function") ||
                      "has" in value
                    : stryMutAct_9fa48("1033")
                      ? true
                      : (stryCov_9fa48("1033", "1034"),
                        (stryMutAct_9fa48("1036")
                          ? ("resolve" in value &&
                              typeof value["resolve"] === "function" &&
                              "resolveAsync" in value &&
                              typeof value["resolveAsync"] === "function" &&
                              "createScope" in value &&
                              typeof value["createScope"] === "function" &&
                              "dispose" in value) ||
                            typeof value["dispose"] === "function"
                          : stryMutAct_9fa48("1035")
                            ? true
                            : (stryCov_9fa48("1035", "1036"),
                              (stryMutAct_9fa48("1038")
                                ? ("resolve" in value &&
                                    typeof value["resolve"] === "function" &&
                                    "resolveAsync" in value &&
                                    typeof value["resolveAsync"] === "function" &&
                                    "createScope" in value &&
                                    typeof value["createScope"] === "function") ||
                                  "dispose" in value
                                : stryMutAct_9fa48("1037")
                                  ? true
                                  : (stryCov_9fa48("1037", "1038"),
                                    (stryMutAct_9fa48("1040")
                                      ? ("resolve" in value &&
                                          typeof value["resolve"] === "function" &&
                                          "resolveAsync" in value &&
                                          typeof value["resolveAsync"] === "function" &&
                                          "createScope" in value) ||
                                        typeof value["createScope"] === "function"
                                      : stryMutAct_9fa48("1039")
                                        ? true
                                        : (stryCov_9fa48("1039", "1040"),
                                          (stryMutAct_9fa48("1042")
                                            ? ("resolve" in value &&
                                                typeof value["resolve"] === "function" &&
                                                "resolveAsync" in value &&
                                                typeof value["resolveAsync"] === "function") ||
                                              "createScope" in value
                                            : stryMutAct_9fa48("1041")
                                              ? true
                                              : (stryCov_9fa48("1041", "1042"),
                                                (stryMutAct_9fa48("1044")
                                                  ? ("resolve" in value &&
                                                      typeof value["resolve"] === "function" &&
                                                      "resolveAsync" in value) ||
                                                    typeof value["resolveAsync"] === "function"
                                                  : stryMutAct_9fa48("1043")
                                                    ? true
                                                    : (stryCov_9fa48("1043", "1044"),
                                                      (stryMutAct_9fa48("1046")
                                                        ? ("resolve" in value &&
                                                            typeof value["resolve"] ===
                                                              "function") ||
                                                          "resolveAsync" in value
                                                        : stryMutAct_9fa48("1045")
                                                          ? true
                                                          : (stryCov_9fa48("1045", "1046"),
                                                            (stryMutAct_9fa48("1048")
                                                              ? "resolve" in value ||
                                                                typeof value["resolve"] ===
                                                                  "function"
                                                              : stryMutAct_9fa48("1047")
                                                                ? true
                                                                : (stryCov_9fa48("1047", "1048"),
                                                                  (stryMutAct_9fa48("1049")
                                                                    ? ""
                                                                    : (stryCov_9fa48("1049"),
                                                                      "resolve")) in value &&
                                                                    (stryMutAct_9fa48("1051")
                                                                      ? typeof value["resolve"] !==
                                                                        "function"
                                                                      : stryMutAct_9fa48("1050")
                                                                        ? true
                                                                        : (stryCov_9fa48(
                                                                            "1050",
                                                                            "1051"
                                                                          ),
                                                                          typeof value[
                                                                            stryMutAct_9fa48("1052")
                                                                              ? ""
                                                                              : (stryCov_9fa48(
                                                                                  "1052"
                                                                                ),
                                                                                "resolve")
                                                                          ] ===
                                                                            (stryMutAct_9fa48(
                                                                              "1053"
                                                                            )
                                                                              ? ""
                                                                              : (stryCov_9fa48(
                                                                                  "1053"
                                                                                ),
                                                                                "function")))))) &&
                                                              (stryMutAct_9fa48("1054")
                                                                ? ""
                                                                : (stryCov_9fa48("1054"),
                                                                  "resolveAsync")) in value)) &&
                                                        (stryMutAct_9fa48("1056")
                                                          ? typeof value["resolveAsync"] !==
                                                            "function"
                                                          : stryMutAct_9fa48("1055")
                                                            ? true
                                                            : (stryCov_9fa48("1055", "1056"),
                                                              typeof value[
                                                                stryMutAct_9fa48("1057")
                                                                  ? ""
                                                                  : (stryCov_9fa48("1057"),
                                                                    "resolveAsync")
                                                              ] ===
                                                                (stryMutAct_9fa48("1058")
                                                                  ? ""
                                                                  : (stryCov_9fa48("1058"),
                                                                    "function")))))) &&
                                                  (stryMutAct_9fa48("1059")
                                                    ? ""
                                                    : (stryCov_9fa48("1059"), "createScope")) in
                                                    value)) &&
                                            (stryMutAct_9fa48("1061")
                                              ? typeof value["createScope"] !== "function"
                                              : stryMutAct_9fa48("1060")
                                                ? true
                                                : (stryCov_9fa48("1060", "1061"),
                                                  typeof value[
                                                    stryMutAct_9fa48("1062")
                                                      ? ""
                                                      : (stryCov_9fa48("1062"), "createScope")
                                                  ] ===
                                                    (stryMutAct_9fa48("1063")
                                                      ? ""
                                                      : (stryCov_9fa48("1063"), "function")))))) &&
                                      (stryMutAct_9fa48("1064")
                                        ? ""
                                        : (stryCov_9fa48("1064"), "dispose")) in value)) &&
                                (stryMutAct_9fa48("1066")
                                  ? typeof value["dispose"] !== "function"
                                  : stryMutAct_9fa48("1065")
                                    ? true
                                    : (stryCov_9fa48("1065", "1066"),
                                      typeof value[
                                        stryMutAct_9fa48("1067")
                                          ? ""
                                          : (stryCov_9fa48("1067"), "dispose")
                                      ] ===
                                        (stryMutAct_9fa48("1068")
                                          ? ""
                                          : (stryCov_9fa48("1068"), "function")))))) &&
                          (stryMutAct_9fa48("1069") ? "" : (stryCov_9fa48("1069"), "has")) in
                            value)) &&
                    (stryMutAct_9fa48("1071")
                      ? typeof value["has"] !== "function"
                      : stryMutAct_9fa48("1070")
                        ? true
                        : (stryCov_9fa48("1070", "1071"),
                          typeof value[
                            stryMutAct_9fa48("1072") ? "" : (stryCov_9fa48("1072"), "has")
                          ] ===
                            (stryMutAct_9fa48("1073")
                              ? ""
                              : (stryCov_9fa48("1073"), "function")))))) &&
              (stryMutAct_9fa48("1074") ? "" : (stryCov_9fa48("1074"), "isDisposed")) in value);
  }
}

// =============================================================================
// Parent Container Extraction
// =============================================================================

/**
 * Extracts a ParentContainerLike from a Container wrapper.
 * @internal
 */
export function asParentContainerLike<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(
  wrapper: Container<TProvides, TExtends, TAsyncPorts>
): ParentContainerLike<TProvides | TExtends, TAsyncPorts> {
  if (stryMutAct_9fa48("1075")) {
    {
    }
  } else {
    stryCov_9fa48("1075");
    if (
      stryMutAct_9fa48("1078")
        ? false
        : stryMutAct_9fa48("1077")
          ? true
          : stryMutAct_9fa48("1076")
            ? hasInternalMethods(wrapper)
            : (stryCov_9fa48("1076", "1077", "1078"), !hasInternalMethods(wrapper))
    ) {
      if (stryMutAct_9fa48("1079")) {
        {
        }
      } else {
        stryCov_9fa48("1079");
        throw new Error(
          (stryMutAct_9fa48("1080")
            ? ""
            : (stryCov_9fa48("1080"), "Invalid Container wrapper: missing internal methods. ")) +
            (stryMutAct_9fa48("1081")
              ? ""
              : (stryCov_9fa48("1081"), "This indicates a bug in createChildContainerWrapper."))
        );
      }
    }
    return stryMutAct_9fa48("1082")
      ? {}
      : (stryCov_9fa48("1082"),
        {
          resolveInternal: stryMutAct_9fa48("1083")
            ? () => undefined
            : (stryCov_9fa48("1083"),
              <P extends TProvides | TExtends>(port: P): InferService<P> =>
                wrapper.resolveInternal(port)),
          resolveAsyncInternal: stryMutAct_9fa48("1084")
            ? () => undefined
            : (stryCov_9fa48("1084"),
              <P extends TProvides | TExtends>(port: P): Promise<InferService<P>> =>
                wrapper.resolveAsyncInternal(port)),
          [ADAPTER_ACCESS]: wrapper[ADAPTER_ACCESS],
          registerChildContainer: wrapper.registerChildContainer,
          unregisterChildContainer: wrapper.unregisterChildContainer,
          originalParent: wrapper,
          has: stryMutAct_9fa48("1085")
            ? () => undefined
            : (stryCov_9fa48("1085"), (port: Port<unknown, string>): boolean => wrapper.has(port)),
          hasAdapter: stryMutAct_9fa48("1086")
            ? () => undefined
            : (stryCov_9fa48("1086"),
              (port: Port<unknown, string>): boolean => wrapper.hasAdapter(port)),
        });
  }
}

// =============================================================================
// Child Container Wrapper
// =============================================================================

/**
 * Creates a frozen Container wrapper for child containers.
 *
 * @param impl - The child container implementation
 * @param childName - Name for the child container
 * @param parentName - Name of the parent container (for hierarchy tracking)
 * @returns A frozen Container wrapper
 *
 * @internal
 */
export function createChildContainerWrapper<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: ChildContainerImpl<TProvides, TExtends, TAsyncPorts>,
  childName: string,
  parentName: string
): Container<TProvides, TExtends, TAsyncPorts, "initialized"> {
  if (stryMutAct_9fa48("1087")) {
    {
    }
  } else {
    stryCov_9fa48("1087");
    // Use ContainerMembers instead of Container for internal type
    // Note: "inspector" is set via Object.defineProperty after creation
    // for non-enumerability. Override is included directly with proper type.
    type ChildContainerInternals = Omit<
      ContainerMembers<TProvides, TExtends, TAsyncPorts, "initialized">,
      "inspector"
    > &
      InternalContainerMethods<TProvides | TExtends> & {
        // Placeholder - will be set by attachBuiltinAPIs before freeze
        inspector?: InspectorAPI;
      };

    // Child containers are always initialized, so resolve accepts all ports
    function resolve<P extends TProvides | TExtends>(port: P): InferService<P> {
      if (stryMutAct_9fa48("1088")) {
        {
        }
      } else {
        stryCov_9fa48("1088");
        return impl.resolve(port);
      }
    }

    // Map from individual handlers to their uninstall functions
    // Using WeakMap to avoid memory leaks if handlers are garbage collected
    const handlerToUninstall = new WeakMap<AnyHookHandler, () => void>();

    // Hook sources for HOOKS_ACCESS (legacy) and addHook/removeHook (new)
    const hookSources: ResolutionHooks[] = stryMutAct_9fa48("1089")
      ? ["Stryker was here"]
      : (stryCov_9fa48("1089"), []);

    // Override method defined using a deferred reference pattern.
    // The container is accessed at call-time (not definition-time), which avoids
    // forward reference issues without needing `let` or eslint-disable.
    // The explicit return type annotation ensures TypeScript infers the correct
    // type parameters for OverrideBuilder.
    //
    // We create a ContainerForOverride object that captures only what OverrideBuilder
    // needs (name + createChild), avoiding the type mismatch from the `parent` property
    // which differs between root containers (parent: never) and child containers.
    function overrideMethod<A extends AdapterConstraint>(
      adapter: A
    ): OverrideBuilder<TProvides | TExtends, never, TAsyncPorts, "initialized"> {
      if (stryMutAct_9fa48("1090")) {
        {
        }
      } else {
        stryCov_9fa48("1090");
        // Create a minimal ContainerForOverride that exposes just name and createChild.
        // This avoids the parent property type mismatch between root and child containers.
        const containerThunk = stryMutAct_9fa48("1091")
          ? () => undefined
          : (stryCov_9fa48("1091"),
            (() => {
              const containerThunk = (): ContainerForOverride<TProvides | TExtends, TAsyncPorts> =>
                stryMutAct_9fa48("1092")
                  ? {}
                  : (stryCov_9fa48("1092"),
                    {
                      name: childName,
                      createChild: stryMutAct_9fa48("1093")
                        ? () => undefined
                        : (stryCov_9fa48("1093"),
                          (graph, options) => childContainer.createChild(graph, options)),
                    });
              return containerThunk;
            })());
        return new OverrideBuilder(
          containerThunk,
          stryMutAct_9fa48("1094") ? [] : (stryCov_9fa48("1094"), [adapter])
        );
      }
    }
    const childContainer: ChildContainerInternals = stryMutAct_9fa48("1095")
      ? {}
      : (stryCov_9fa48("1095"),
        {
          override: overrideMethod,
          resolve,
          resolveAsync: stryMutAct_9fa48("1096")
            ? () => undefined
            : (stryCov_9fa48("1096"),
              <P extends TProvides | TExtends>(port: P): Promise<InferService<P>> =>
                impl.resolveAsync(port)),
          tryResolve: <P extends TProvides | TExtends>(port: P) => {
            if (stryMutAct_9fa48("1097")) {
              {
              }
            } else {
              stryCov_9fa48("1097");
              const result = tryCatch(
                stryMutAct_9fa48("1098")
                  ? () => undefined
                  : (stryCov_9fa48("1098"), () => impl.resolve(port)),
                mapToContainerError
              );
              emitResultEvent(childContainer.inspector, port.__portName, result);
              return result;
            }
          },
          tryResolveAsync: <P extends TProvides | TExtends>(port: P) => {
            if (stryMutAct_9fa48("1099")) {
              {
              }
            } else {
              stryCov_9fa48("1099");
              const resultAsync = fromPromise(impl.resolveAsync(port), mapToContainerError);
              void resultAsync.then(result => {
                if (stryMutAct_9fa48("1100")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1100");
                  emitResultEvent(childContainer.inspector, port.__portName, result);
                }
              });
              return resultAsync;
            }
          },
          tryDispose: stryMutAct_9fa48("1101")
            ? () => undefined
            : (stryCov_9fa48("1101"), () => fromPromise(impl.dispose(), mapToDisposalError)),
          resolveInternal: stryMutAct_9fa48("1102")
            ? () => undefined
            : (stryCov_9fa48("1102"),
              <P extends TProvides | TExtends>(port: P): InferService<P> => impl.resolve(port)),
          resolveAsyncInternal: stryMutAct_9fa48("1103")
            ? () => undefined
            : (stryCov_9fa48("1103"),
              <P extends TProvides | TExtends>(port: P): Promise<InferService<P>> =>
                impl.resolveAsync(port)),
          // Container naming properties
          name: childName,
          parentName: parentName,
          // Derived from parent.name
          kind: "child" as ContainerKind,
          has: stryMutAct_9fa48("1104")
            ? () => undefined
            : (stryCov_9fa48("1104"), (port: Port<unknown, string>): boolean => impl.has(port)),
          hasAdapter: stryMutAct_9fa48("1105")
            ? () => undefined
            : (stryCov_9fa48("1105"),
              (port: Port<unknown, string>): boolean => impl.hasAdapter(port)),
          createScope: stryMutAct_9fa48("1106")
            ? () => undefined
            : (stryCov_9fa48("1106"),
              (name?: string) =>
                createChildContainerScope(
                  impl,
                  name,
                  stryMutAct_9fa48("1107")
                    ? () => undefined
                    : (stryCov_9fa48("1107"), () => childContainer.inspector)
                )),
          createChild: <
            TChildGraph extends Graph<
              Port<unknown, string>,
              Port<unknown, string>,
              Port<unknown, string>
            >,
          >(
            childGraph: TChildGraph,
            options: CreateChildOptions<TProvides | TExtends>
          ): Container<
            TProvides | TExtends,
            Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
            TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
            "initialized"
          > => {
            if (stryMutAct_9fa48("1108")) {
              {
              }
            } else {
              stryCov_9fa48("1108");
              const parentLike: ParentContainerLike<TProvides | TExtends, TAsyncPorts> =
                stryMutAct_9fa48("1109")
                  ? {}
                  : (stryCov_9fa48("1109"),
                    {
                      resolveInternal: stryMutAct_9fa48("1110")
                        ? () => undefined
                        : (stryCov_9fa48("1110"),
                          <P extends TProvides | TExtends>(port: P) => impl.resolve(port)),
                      resolveAsyncInternal: stryMutAct_9fa48("1111")
                        ? () => undefined
                        : (stryCov_9fa48("1111"),
                          <P extends TProvides | TExtends>(port: P) => impl.resolveAsync(port)),
                      has: stryMutAct_9fa48("1112")
                        ? () => undefined
                        : (stryCov_9fa48("1112"), port => impl.has(port)),
                      hasAdapter: stryMutAct_9fa48("1113")
                        ? () => undefined
                        : (stryCov_9fa48("1113"), port => impl.hasAdapter(port)),
                      [ADAPTER_ACCESS]: stryMutAct_9fa48("1114")
                        ? () => undefined
                        : (stryCov_9fa48("1114"), port => impl.getAdapter(port)),
                      registerChildContainer: stryMutAct_9fa48("1115")
                        ? () => undefined
                        : (stryCov_9fa48("1115"), child => impl.registerChildContainer(child)),
                      unregisterChildContainer: stryMutAct_9fa48("1116")
                        ? () => undefined
                        : (stryCov_9fa48("1116"), child => impl.unregisterChildContainer(child)),
                      originalParent: childContainer,
                    });
              return createChildFromGraphInternal<TProvides | TExtends, TAsyncPorts, TChildGraph>(
                parentLike,
                childGraph,
                options.name,
                childName,
                // This child's name becomes the grandchild's parentName
                options.inheritanceModes
              );
            }
          },
          createChildAsync: stryMutAct_9fa48("1117")
            ? () => undefined
            : (stryCov_9fa48("1117"),
              <
                TChildGraph extends Graph<
                  Port<unknown, string>,
                  Port<unknown, string>,
                  Port<unknown, string>
                >,
              >(
                graphLoader: () => Promise<TChildGraph>,
                options: CreateChildOptions<TProvides | TExtends>
              ): Promise<
                Container<
                  TProvides | TExtends,
                  Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
                  TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
                  "initialized"
                >
              > =>
                createChildContainerAsyncInternal(childContainer, childName, graphLoader, options)),
          createLazyChild: stryMutAct_9fa48("1118")
            ? () => undefined
            : (stryCov_9fa48("1118"),
              <
                TChildGraph extends Graph<
                  Port<unknown, string>,
                  Port<unknown, string>,
                  Port<unknown, string>
                >,
              >(
                graphLoader: () => Promise<TChildGraph>,
                options: CreateChildOptions<TProvides | TExtends>
              ): LazyContainer<
                TProvides | TExtends,
                Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
                TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
              > =>
                createLazyChildContainerInternal(childContainer, childName, graphLoader, options)),
          dispose: async () => {
            if (stryMutAct_9fa48("1119")) {
              {
              }
            } else {
              stryCov_9fa48("1119");
              stryMutAct_9fa48("1121")
                ? childContainer.inspector.disposeLibraries?.()
                : stryMutAct_9fa48("1120")
                  ? childContainer.inspector?.disposeLibraries()
                  : (stryCov_9fa48("1120", "1121"), childContainer.inspector?.disposeLibraries?.());
              await impl.dispose();
            }
          },
          get isDisposed() {
            if (stryMutAct_9fa48("1122")) {
              {
              }
            } else {
              stryCov_9fa48("1122");
              return impl.isDisposed;
            }
          },
          get isInitialized() {
            if (stryMutAct_9fa48("1123")) {
              {
              }
            } else {
              stryCov_9fa48("1123");
              // Child containers inherit initialization state from parent
              return stryMutAct_9fa48("1124") ? false : (stryCov_9fa48("1124"), true);
            }
          },
          // Child containers don't have initialize - this should return never
          get initialize(): never {
            if (stryMutAct_9fa48("1125")) {
              {
              }
            } else {
              stryCov_9fa48("1125");
              return unreachable(
                stryMutAct_9fa48("1126")
                  ? ""
                  : (stryCov_9fa48("1126"),
                    "Child containers cannot be initialized - they inherit state from parent")
              );
            }
          },
          get tryInitialize(): never {
            if (stryMutAct_9fa48("1127")) {
              {
              }
            } else {
              stryCov_9fa48("1127");
              return unreachable(
                stryMutAct_9fa48("1128")
                  ? ""
                  : (stryCov_9fa48("1128"),
                    "Child containers cannot be initialized - they inherit state from parent")
              );
            }
          },
          get parent() {
            if (stryMutAct_9fa48("1129")) {
              {
              }
            } else {
              stryCov_9fa48("1129");
              const parent = impl.getParent();
              if (
                stryMutAct_9fa48("1132")
                  ? false
                  : stryMutAct_9fa48("1131")
                    ? true
                    : stryMutAct_9fa48("1130")
                      ? isContainerParent<TProvides, TExtends, TAsyncPorts>(parent)
                      : (stryCov_9fa48("1130", "1131", "1132"),
                        !isContainerParent<TProvides, TExtends, TAsyncPorts>(parent))
              ) {
                if (stryMutAct_9fa48("1133")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1133");
                  throw new Error(
                    stryMutAct_9fa48("1134")
                      ? ""
                      : (stryCov_9fa48("1134"), "Invalid container parent reference.")
                  );
                }
              }
              return parent;
            }
          },
          addHook: <T extends HookType>(type: T, handler: HookHandler<T>): void => {
            if (stryMutAct_9fa48("1135")) {
              {
              }
            } else {
              stryCov_9fa48("1135");
              // Create a ResolutionHooks object with just this handler
              const hooks: ResolutionHooks = (
                stryMutAct_9fa48("1138")
                  ? type !== "beforeResolve"
                  : stryMutAct_9fa48("1137")
                    ? false
                    : stryMutAct_9fa48("1136")
                      ? true
                      : (stryCov_9fa48("1136", "1137", "1138"),
                        type ===
                          (stryMutAct_9fa48("1139")
                            ? ""
                            : (stryCov_9fa48("1139"), "beforeResolve")))
              )
                ? stryMutAct_9fa48("1140")
                  ? {}
                  : (stryCov_9fa48("1140"),
                    {
                      beforeResolve: handler as (ctx: ResolutionHookContext) => void,
                    })
                : stryMutAct_9fa48("1141")
                  ? {}
                  : (stryCov_9fa48("1141"),
                    {
                      afterResolve: handler as (ctx: ResolutionResultContext) => void,
                    });

              // Store uninstall function for later removal
              const uninstall = (): void => {
                if (stryMutAct_9fa48("1142")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1142");
                  const idx = hookSources.indexOf(hooks);
                  if (
                    stryMutAct_9fa48("1145")
                      ? idx === -1
                      : stryMutAct_9fa48("1144")
                        ? false
                        : stryMutAct_9fa48("1143")
                          ? true
                          : (stryCov_9fa48("1143", "1144", "1145"),
                            idx !== (stryMutAct_9fa48("1146") ? +1 : (stryCov_9fa48("1146"), -1)))
                  ) {
                    if (stryMutAct_9fa48("1147")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1147");
                      hookSources.splice(idx, 1);
                    }
                  }
                  impl.uninstallHooks(hooks);
                }
              };
              handlerToUninstall.set(handler, uninstall);
              hookSources.push(hooks);
              impl.installHooks(hooks);
            }
          },
          removeHook: <T extends HookType>(_type: T, handler: HookHandler<T>): void => {
            if (stryMutAct_9fa48("1148")) {
              {
              }
            } else {
              stryCov_9fa48("1148");
              const uninstall = handlerToUninstall.get(handler);
              if (
                stryMutAct_9fa48("1150")
                  ? false
                  : stryMutAct_9fa48("1149")
                    ? true
                    : (stryCov_9fa48("1149", "1150"), uninstall)
              ) {
                if (stryMutAct_9fa48("1151")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1151");
                  uninstall();
                  handlerToUninstall.delete(handler);
                }
              }
            }
          },
          [INTERNAL_ACCESS]: stryMutAct_9fa48("1152")
            ? () => undefined
            : (stryCov_9fa48("1152"), () => impl.getInternalState()),
          [ADAPTER_ACCESS]: stryMutAct_9fa48("1153")
            ? () => undefined
            : (stryCov_9fa48("1153"), (port: Port<unknown, string>) => impl.getAdapter(port)),
          registerChildContainer: stryMutAct_9fa48("1154")
            ? () => undefined
            : (stryCov_9fa48("1154"),
              (child: DisposableChild) => impl.registerChildContainer(child)),
          unregisterChildContainer: stryMutAct_9fa48("1155")
            ? () => undefined
            : (stryCov_9fa48("1155"),
              (child: DisposableChild) => impl.unregisterChildContainer(child)),
          get [ContainerBrand]() {
            if (stryMutAct_9fa48("1156")) {
              {
              }
            } else {
              stryCov_9fa48("1156");
              return unreachable<{
                provides: TProvides;
                extends: TExtends;
              }>(
                stryMutAct_9fa48("1157")
                  ? ""
                  : (stryCov_9fa48("1157"), "Container brand is type-only")
              );
            }
          },
        });

    // HOOKS_ACCESS installer for legacy support
    const hooksInstaller: HooksInstaller = stryMutAct_9fa48("1158")
      ? {}
      : (stryCov_9fa48("1158"),
        {
          installHooks(hooks: ResolutionHooks): () => void {
            if (stryMutAct_9fa48("1159")) {
              {
              }
            } else {
              stryCov_9fa48("1159");
              hookSources.push(hooks);
              // Also install hooks on the impl to actually fire them during resolution
              impl.installHooks(hooks);
              return () => {
                if (stryMutAct_9fa48("1160")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1160");
                  const idx = hookSources.indexOf(hooks);
                  if (
                    stryMutAct_9fa48("1164")
                      ? idx < 0
                      : stryMutAct_9fa48("1163")
                        ? idx > 0
                        : stryMutAct_9fa48("1162")
                          ? false
                          : stryMutAct_9fa48("1161")
                            ? true
                            : (stryCov_9fa48("1161", "1162", "1163", "1164"), idx >= 0)
                  ) {
                    if (stryMutAct_9fa48("1165")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1165");
                      hookSources.splice(idx, 1);
                    }
                  }
                  impl.uninstallHooks(hooks);
                }
              };
            }
          },
        });
    Object.defineProperty(
      childContainer,
      HOOKS_ACCESS,
      stryMutAct_9fa48("1166")
        ? {}
        : (stryCov_9fa48("1166"),
          {
            value: stryMutAct_9fa48("1167")
              ? () => undefined
              : (stryCov_9fa48("1167"), () => hooksInstaller),
            writable: stryMutAct_9fa48("1168") ? true : (stryCov_9fa48("1168"), false),
            enumerable: stryMutAct_9fa48("1169") ? true : (stryCov_9fa48("1169"), false),
            configurable: stryMutAct_9fa48("1170") ? true : (stryCov_9fa48("1170"), false),
          })
    );

    // Add built-in inspector API as non-enumerable property
    attachBuiltinAPIs(childContainer);

    // Install auto-discovery hook for library inspectors
    impl.installHooks(
      stryMutAct_9fa48("1171")
        ? {}
        : (stryCov_9fa48("1171"),
          {
            afterResolve: ctx => {
              if (stryMutAct_9fa48("1172")) {
                {
                }
              } else {
                stryCov_9fa48("1172");
                if (
                  stryMutAct_9fa48("1175")
                    ? ctx.result === undefined
                    : stryMutAct_9fa48("1174")
                      ? false
                      : stryMutAct_9fa48("1173")
                        ? true
                        : (stryCov_9fa48("1173", "1174", "1175"), ctx.result !== undefined)
                ) {
                  if (stryMutAct_9fa48("1176")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("1176");
                    const portMeta = getPortMetadata(ctx.port);
                    if (
                      stryMutAct_9fa48("1179")
                        ? portMeta?.category === "library-inspector" ||
                          isLibraryInspector(ctx.result)
                        : stryMutAct_9fa48("1178")
                          ? false
                          : stryMutAct_9fa48("1177")
                            ? true
                            : (stryCov_9fa48("1177", "1178", "1179"),
                              (stryMutAct_9fa48("1181")
                                ? portMeta?.category !== "library-inspector"
                                : stryMutAct_9fa48("1180")
                                  ? true
                                  : (stryCov_9fa48("1180", "1181"),
                                    (stryMutAct_9fa48("1182")
                                      ? portMeta.category
                                      : (stryCov_9fa48("1182"), portMeta?.category)) ===
                                      (stryMutAct_9fa48("1183")
                                        ? ""
                                        : (stryCov_9fa48("1183"), "library-inspector")))) &&
                                isLibraryInspector(ctx.result))
                    ) {
                      if (stryMutAct_9fa48("1184")) {
                        {
                        }
                      } else {
                        stryCov_9fa48("1184");
                        stryMutAct_9fa48("1185")
                          ? childContainer.inspector.registerLibrary(ctx.result)
                          : (stryCov_9fa48("1185"),
                            childContainer.inspector?.registerLibrary(ctx.result));
                      }
                    }
                  }
                }
              }
            },
          })
    );
    impl.setWrapper(childContainer);
    Object.freeze(childContainer);
    return childContainer;
  }
}

// =============================================================================
// Scope Creation
// =============================================================================

/**
 * Creates a scope from a unified container implementation.
 * @param impl - The child container implementation
 * @param name - Optional name for the scope (used for DevTools identification)
 * @internal
 */
export function createChildContainerScope<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(
  impl: ChildContainerImpl<TProvides, TExtends, TAsyncPorts>,
  name?: string,
  getInspector?: () => import("../inspection/types.js").InspectorAPI | undefined
): Scope<TProvides | TExtends, TAsyncPorts, "initialized"> {
  if (stryMutAct_9fa48("1186")) {
    {
    }
  } else {
    stryCov_9fa48("1186");
    const scopeImpl = new ScopeImpl<TProvides | TExtends, TAsyncPorts, "initialized">(
      impl,
      impl.getSingletonMemo(),
      null, // parentScope
      stryMutAct_9fa48("1187")
        ? () => undefined
        : (stryCov_9fa48("1187"), () => impl.unregisterChildScope(scopeImpl)),
      // unregister callback for disposal
      name // scope name
    );
    impl.registerChildScope(scopeImpl);
    return createScopeWrapper(scopeImpl, getInspector);
  }
}

// =============================================================================
// Child Container Creation from Graph (internal for wrappers)
// =============================================================================

/**
 * Creates a child container from a Graph.
 * Internal version used by child containers' createChild method.
 *
 * @param parentLike - Parent container interface for resolution and registration
 * @param childGraph - The child graph containing adapters
 * @param childName - Name for the child container
 * @param parentName - Name of the parent container (for hierarchy tracking)
 * @param inheritanceModes - Optional per-port inheritance mode configuration
 *
 * @internal
 */
function createChildFromGraphInternal<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
>(
  parentLike: ParentContainerLike<TParentProvides, TAsyncPorts>,
  childGraph: TChildGraph,
  childName: string,
  parentName: string,
  inheritanceModes?: InheritanceModeConfig<TParentProvides>
): Container<
  TParentProvides,
  Exclude<InferGraphProvides<TChildGraph>, TParentProvides>,
  TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
  "initialized"
> {
  if (stryMutAct_9fa48("1188")) {
    {
    }
  } else {
    stryCov_9fa48("1188");
    const { overrides, extensions } = parseChildGraph(childGraph);
    const inheritanceModesMap = parseInheritanceModes(inheritanceModes);
    const config = createChildContainerConfig(
      parentLike,
      overrides,
      extensions,
      inheritanceModesMap,
      childName,
      parentName
    );
    const impl = new ChildContainerImpl<
      TParentProvides,
      Exclude<InferGraphProvides<TChildGraph>, TParentProvides>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
    >(config);
    return createChildContainerWrapper<
      TParentProvides,
      Exclude<InferGraphProvides<TChildGraph>, TParentProvides>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
    >(impl, childName, parentName);
  }
}

// =============================================================================
// Async and Lazy Child Container Creation (internal for child containers)
// =============================================================================

/**
 * Creates a child container asynchronously from a graph loader.
 * Internal version used by child containers' createChildAsync method.
 *
 * @internal
 */
async function createChildContainerAsyncInternal<
  TParentProvides extends Port<unknown, string>,
  TParentExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
>(
  // Using Pick to accept ContainerMembers (used by child container wrappers) as well as Container
  parent: Pick<
    ContainerMembers<TParentProvides, TParentExtends, TAsyncPorts, "initialized">,
    "createChild"
  >,
  _parentName: string,
  graphLoader: () => Promise<TChildGraph>,
  options: CreateChildOptions<TParentProvides | TParentExtends>
): Promise<
  Container<
    TParentProvides | TParentExtends,
    Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
    "initialized"
  >
> {
  if (stryMutAct_9fa48("1189")) {
    {
    }
  } else {
    stryCov_9fa48("1189");
    const graph = await graphLoader();
    return parent.createChild(graph, options);
  }
}

/**
 * Creates a lazy-loading child container wrapper.
 * Internal version used by child containers' createLazyChild method.
 *
 * @internal
 */
function createLazyChildContainerInternal<
  TParentProvides extends Port<unknown, string>,
  TParentExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
>(
  // Using Pick to accept ContainerMembers (used by child container wrappers) as well as Container
  parent: Pick<
    ContainerMembers<TParentProvides, TParentExtends, TAsyncPorts, "initialized">,
    "has" | "createChild"
  >,
  _parentName: string,
  graphLoader: () => Promise<TChildGraph>,
  options: CreateChildOptions<TParentProvides | TParentExtends>
): LazyContainer<
  TParentProvides | TParentExtends,
  Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
  TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
> {
  if (stryMutAct_9fa48("1190")) {
    {
    }
  } else {
    stryCov_9fa48("1190");
    const parentLike: LazyContainerParent<TParentProvides | TParentExtends, TAsyncPorts> =
      stryMutAct_9fa48("1191")
        ? {}
        : (stryCov_9fa48("1191"),
          {
            has: stryMutAct_9fa48("1192")
              ? () => undefined
              : (stryCov_9fa48("1192"), port => parent.has(port)),
            createChild: stryMutAct_9fa48("1193")
              ? () => undefined
              : (stryCov_9fa48("1193"), (graph, opts) => parent.createChild(graph, opts)),
          });
    return new LazyContainerImpl<
      TParentProvides | TParentExtends,
      Exclude<InferGraphProvides<TChildGraph>, TParentProvides | TParentExtends>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
      TChildGraph
    >(parentLike, graphLoader, options);
  }
}
