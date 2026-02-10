/**
 * Built-in API factory for container property-based access.
 *
 * Creates InspectorAPI instances for the built-in `.inspector` container property.
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
import type {
  ContainerGraphData,
  AdapterInfo,
  VisualizableAdapter,
  InspectorListener,
  InspectorEvent,
  ServiceOrigin,
  ResultStatistics,
  LibraryInspector,
  UnifiedSnapshot,
} from "@hex-di/core";
import { getPortMetadata } from "@hex-di/core";
import { createLibraryRegistry } from "./library-registry.js";
import type { InspectorAPI } from "./types.js";
import { createInspector as createRuntimeInspector, type InternalAccessible } from "./creation.js";
import {
  detectContainerKindFromInternal,
  detectPhaseFromSnapshot,
  buildTypedSnapshotFromInternal,
} from "./internal-helpers.js";
import type { ContainerInternalState } from "./internal-state-types.js";
import { INTERNAL_ACCESS } from "./symbols.js";

// =============================================================================
// Inspector API Factory
// =============================================================================

/**
 * Simple event emitter for inspector events.
 * @internal
 */
interface EventEmitter {
  readonly listeners: Set<InspectorListener>;
  emit(event: Parameters<InspectorListener>[0]): void;
  subscribe(listener: InspectorListener): () => void;
}

/**
 * Creates a simple event emitter for inspector events.
 * @internal
 */
function createEventEmitter(): EventEmitter {
  if (stryMutAct_9fa48("1200")) {
    {
    }
  } else {
    stryCov_9fa48("1200");
    const listeners = new Set<InspectorListener>();
    return stryMutAct_9fa48("1201")
      ? {}
      : (stryCov_9fa48("1201"),
        {
          listeners,
          emit(event) {
            if (stryMutAct_9fa48("1202")) {
              {
              }
            } else {
              stryCov_9fa48("1202");
              for (const listener of listeners) {
                if (stryMutAct_9fa48("1203")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1203");
                  try {
                    if (stryMutAct_9fa48("1204")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1204");
                      listener(event);
                    }
                  } catch {
                    // Ignore listener errors
                  }
                }
              }
            }
          },
          subscribe(listener) {
            if (stryMutAct_9fa48("1205")) {
              {
              }
            } else {
              stryCov_9fa48("1205");
              listeners.add(listener);
              return () => {
                if (stryMutAct_9fa48("1206")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1206");
                  listeners.delete(listener);
                }
              };
            }
          },
        });
  }
}

/**
 * Determines the service origin for an adapter.
 * @internal
 */
function determineOrigin(
  portName: string,
  internalState: ContainerInternalState,
  hasParent: boolean
): ServiceOrigin {
  if (stryMutAct_9fa48("1207")) {
    {
    }
  } else {
    stryCov_9fa48("1207");
    if (
      stryMutAct_9fa48("1209")
        ? false
        : stryMutAct_9fa48("1208")
          ? true
          : (stryCov_9fa48("1208", "1209"), internalState.overridePorts.has(portName))
    ) {
      if (stryMutAct_9fa48("1210")) {
        {
        }
      } else {
        stryCov_9fa48("1210");
        return stryMutAct_9fa48("1211") ? "" : (stryCov_9fa48("1211"), "overridden");
      }
    }
    if (
      stryMutAct_9fa48("1214")
        ? false
        : stryMutAct_9fa48("1213")
          ? true
          : stryMutAct_9fa48("1212")
            ? hasParent
            : (stryCov_9fa48("1212", "1213", "1214"), !hasParent)
    ) {
      if (stryMutAct_9fa48("1215")) {
        {
        }
      } else {
        stryCov_9fa48("1215");
        return stryMutAct_9fa48("1216") ? "" : (stryCov_9fa48("1216"), "own");
      }
    }
    let isOwnAdapter = stryMutAct_9fa48("1217") ? true : (stryCov_9fa48("1217"), false);
    for (const [, adapter] of internalState.adapterMap) {
      if (stryMutAct_9fa48("1218")) {
        {
        }
      } else {
        stryCov_9fa48("1218");
        if (
          stryMutAct_9fa48("1221")
            ? adapter.portName !== portName
            : stryMutAct_9fa48("1220")
              ? false
              : stryMutAct_9fa48("1219")
                ? true
                : (stryCov_9fa48("1219", "1220", "1221"), adapter.portName === portName)
        ) {
          if (stryMutAct_9fa48("1222")) {
            {
            }
          } else {
            stryCov_9fa48("1222");
            isOwnAdapter = stryMutAct_9fa48("1223") ? false : (stryCov_9fa48("1223"), true);
            break;
          }
        }
      }
    }
    return isOwnAdapter
      ? stryMutAct_9fa48("1224")
        ? ""
        : (stryCov_9fa48("1224"), "own")
      : stryMutAct_9fa48("1225")
        ? ""
        : (stryCov_9fa48("1225"), "inherited");
  }
}

/**
 * Gets the container kind from internal state.
 * @internal
 */
function getContainerKind(internalState: ContainerInternalState): "root" | "child" | "lazy" {
  if (stryMutAct_9fa48("1226")) {
    {
    }
  } else {
    stryCov_9fa48("1226");
    if (
      stryMutAct_9fa48("1229")
        ? internalState.parentState === undefined
        : stryMutAct_9fa48("1228")
          ? false
          : stryMutAct_9fa48("1227")
            ? true
            : (stryCov_9fa48("1227", "1228", "1229"), internalState.parentState !== undefined)
    ) {
      if (stryMutAct_9fa48("1230")) {
        {
        }
      } else {
        stryCov_9fa48("1230");
        return stryMutAct_9fa48("1231") ? "" : (stryCov_9fa48("1231"), "child");
      }
    }
    return stryMutAct_9fa48("1232") ? "" : (stryCov_9fa48("1232"), "root");
  }
}

// =============================================================================
// Result Tracker
// =============================================================================

/**
 * Mutable stats accumulator for a single port.
 * @internal
 */
interface MutablePortStats {
  okCount: number;
  errCount: number;
  errorsByCode: Map<string, number>;
  lastError?: {
    code: string;
    timestamp: number;
  };
}

/**
 * Creates a result tracker that maintains per-port ok/err counts.
 *
 * Integrates with the event emitter: when a `result:ok` or `result:err`
 * event is emitted, the tracker automatically updates its internal state.
 *
 * @internal
 */
function createResultTracker(): {
  handleEvent(event: InspectorEvent): void;
  getStatistics(portName: string): ResultStatistics | undefined;
  getAllStatistics(): ReadonlyMap<string, ResultStatistics>;
  getHighErrorRatePorts(threshold: number): readonly ResultStatistics[];
} {
  if (stryMutAct_9fa48("1233")) {
    {
    }
  } else {
    stryCov_9fa48("1233");
    const stats = new Map<string, MutablePortStats>();
    function getOrCreate(portName: string): MutablePortStats {
      if (stryMutAct_9fa48("1234")) {
        {
        }
      } else {
        stryCov_9fa48("1234");
        let entry = stats.get(portName);
        if (
          stryMutAct_9fa48("1237")
            ? entry !== undefined
            : stryMutAct_9fa48("1236")
              ? false
              : stryMutAct_9fa48("1235")
                ? true
                : (stryCov_9fa48("1235", "1236", "1237"), entry === undefined)
        ) {
          if (stryMutAct_9fa48("1238")) {
            {
            }
          } else {
            stryCov_9fa48("1238");
            entry = stryMutAct_9fa48("1239")
              ? {}
              : (stryCov_9fa48("1239"),
                {
                  okCount: 0,
                  errCount: 0,
                  errorsByCode: new Map(),
                });
            stats.set(portName, entry);
          }
        }
        return entry;
      }
    }
    function toSnapshot(portName: string, s: MutablePortStats): ResultStatistics {
      if (stryMutAct_9fa48("1240")) {
        {
        }
      } else {
        stryCov_9fa48("1240");
        const totalCalls = stryMutAct_9fa48("1241")
          ? s.okCount - s.errCount
          : (stryCov_9fa48("1241"), s.okCount + s.errCount);
        return Object.freeze(
          stryMutAct_9fa48("1242")
            ? {}
            : (stryCov_9fa48("1242"),
              {
                portName,
                totalCalls,
                okCount: s.okCount,
                errCount: s.errCount,
                errorRate: (
                  stryMutAct_9fa48("1246")
                    ? totalCalls <= 0
                    : stryMutAct_9fa48("1245")
                      ? totalCalls >= 0
                      : stryMutAct_9fa48("1244")
                        ? false
                        : stryMutAct_9fa48("1243")
                          ? true
                          : (stryCov_9fa48("1243", "1244", "1245", "1246"), totalCalls > 0)
                )
                  ? stryMutAct_9fa48("1247")
                    ? s.errCount * totalCalls
                    : (stryCov_9fa48("1247"), s.errCount / totalCalls)
                  : 0,
                errorsByCode: new Map(s.errorsByCode),
                lastError: s.lastError
                  ? Object.freeze(
                      stryMutAct_9fa48("1248")
                        ? {}
                        : (stryCov_9fa48("1248"),
                          {
                            ...s.lastError,
                          })
                    )
                  : undefined,
              })
        );
      }
    }
    return stryMutAct_9fa48("1249")
      ? {}
      : (stryCov_9fa48("1249"),
        {
          handleEvent(event: InspectorEvent): void {
            if (stryMutAct_9fa48("1250")) {
              {
              }
            } else {
              stryCov_9fa48("1250");
              if (
                stryMutAct_9fa48("1253")
                  ? event.type !== "result:ok"
                  : stryMutAct_9fa48("1252")
                    ? false
                    : stryMutAct_9fa48("1251")
                      ? true
                      : (stryCov_9fa48("1251", "1252", "1253"),
                        event.type ===
                          (stryMutAct_9fa48("1254") ? "" : (stryCov_9fa48("1254"), "result:ok")))
              ) {
                if (stryMutAct_9fa48("1255")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1255");
                  const entry = getOrCreate(event.portName);
                  stryMutAct_9fa48("1256")
                    ? entry.okCount--
                    : (stryCov_9fa48("1256"), entry.okCount++);
                }
              } else if (
                stryMutAct_9fa48("1259")
                  ? event.type !== "result:err"
                  : stryMutAct_9fa48("1258")
                    ? false
                    : stryMutAct_9fa48("1257")
                      ? true
                      : (stryCov_9fa48("1257", "1258", "1259"),
                        event.type ===
                          (stryMutAct_9fa48("1260") ? "" : (stryCov_9fa48("1260"), "result:err")))
              ) {
                if (stryMutAct_9fa48("1261")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1261");
                  const entry = getOrCreate(event.portName);
                  stryMutAct_9fa48("1262")
                    ? entry.errCount--
                    : (stryCov_9fa48("1262"), entry.errCount++);
                  const count = stryMutAct_9fa48("1263")
                    ? entry.errorsByCode.get(event.errorCode) && 0
                    : (stryCov_9fa48("1263"), entry.errorsByCode.get(event.errorCode) ?? 0);
                  entry.errorsByCode.set(
                    event.errorCode,
                    stryMutAct_9fa48("1264") ? count - 1 : (stryCov_9fa48("1264"), count + 1)
                  );
                  entry.lastError = stryMutAct_9fa48("1265")
                    ? {}
                    : (stryCov_9fa48("1265"),
                      {
                        code: event.errorCode,
                        timestamp: event.timestamp,
                      });
                }
              }
            }
          },
          getStatistics(portName: string): ResultStatistics | undefined {
            if (stryMutAct_9fa48("1266")) {
              {
              }
            } else {
              stryCov_9fa48("1266");
              const entry = stats.get(portName);
              if (
                stryMutAct_9fa48("1269")
                  ? entry !== undefined
                  : stryMutAct_9fa48("1268")
                    ? false
                    : stryMutAct_9fa48("1267")
                      ? true
                      : (stryCov_9fa48("1267", "1268", "1269"), entry === undefined)
              )
                return undefined;
              return toSnapshot(portName, entry);
            }
          },
          getAllStatistics(): ReadonlyMap<string, ResultStatistics> {
            if (stryMutAct_9fa48("1270")) {
              {
              }
            } else {
              stryCov_9fa48("1270");
              const result = new Map<string, ResultStatistics>();
              for (const [portName, entry] of stats) {
                if (stryMutAct_9fa48("1271")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1271");
                  result.set(portName, toSnapshot(portName, entry));
                }
              }
              return result;
            }
          },
          getHighErrorRatePorts(threshold: number): readonly ResultStatistics[] {
            if (stryMutAct_9fa48("1272")) {
              {
              }
            } else {
              stryCov_9fa48("1272");
              const result: ResultStatistics[] = stryMutAct_9fa48("1273")
                ? ["Stryker was here"]
                : (stryCov_9fa48("1273"), []);
              for (const [portName, entry] of stats) {
                if (stryMutAct_9fa48("1274")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1274");
                  const totalCalls = stryMutAct_9fa48("1275")
                    ? entry.okCount - entry.errCount
                    : (stryCov_9fa48("1275"), entry.okCount + entry.errCount);
                  if (
                    stryMutAct_9fa48("1278")
                      ? totalCalls > 0 || entry.errCount / totalCalls > threshold
                      : stryMutAct_9fa48("1277")
                        ? false
                        : stryMutAct_9fa48("1276")
                          ? true
                          : (stryCov_9fa48("1276", "1277", "1278"),
                            (stryMutAct_9fa48("1281")
                              ? totalCalls <= 0
                              : stryMutAct_9fa48("1280")
                                ? totalCalls >= 0
                                : stryMutAct_9fa48("1279")
                                  ? true
                                  : (stryCov_9fa48("1279", "1280", "1281"), totalCalls > 0)) &&
                              (stryMutAct_9fa48("1284")
                                ? entry.errCount / totalCalls <= threshold
                                : stryMutAct_9fa48("1283")
                                  ? entry.errCount / totalCalls >= threshold
                                  : stryMutAct_9fa48("1282")
                                    ? true
                                    : (stryCov_9fa48("1282", "1283", "1284"),
                                      (stryMutAct_9fa48("1285")
                                        ? entry.errCount * totalCalls
                                        : (stryCov_9fa48("1285"), entry.errCount / totalCalls)) >
                                        threshold)))
                  ) {
                    if (stryMutAct_9fa48("1286")) {
                      {
                      }
                    } else {
                      stryCov_9fa48("1286");
                      result.push(toSnapshot(portName, entry));
                    }
                  }
                }
              }
              return Object.freeze(result);
            }
          },
        });
  }
}

/**
 * Creates a full InspectorAPI instance from a container.
 *
 * Provides all inspector functionality:
 * - Pull-based queries (getSnapshot, getScopeTree, listPorts, isResolved)
 * - Push-based subscriptions (subscribe)
 * - Hierarchy traversal (getChildContainers)
 * - Graph data (getAdapterInfo, getGraphData)
 *
 * @param container - Container with INTERNAL_ACCESS symbol
 * @returns A frozen InspectorAPI instance
 *
 * @internal
 */
export function createBuiltinInspectorAPI(container: InternalAccessible): InspectorAPI {
  if (stryMutAct_9fa48("1287")) {
    {
    }
  } else {
    stryCov_9fa48("1287");
    // Get the base runtime inspector for pull-based queries
    const runtimeInspector = createRuntimeInspector(container);

    // Get container kind for typed snapshots
    const internalState = container[INTERNAL_ACCESS]();
    const containerKind = detectContainerKindFromInternal(internalState);

    // Create event emitter for subscriptions
    const emitter = createEventEmitter();

    // Create result tracker for result statistics
    const resultTracker = createResultTracker();

    // Create library registry for library inspectors
    const libraryRegistry = createLibraryRegistry();

    /**
     * Unified event dispatch: tracks results and notifies subscribers.
     * @internal
     */
    function emitEvent(event: InspectorEvent): void {
      if (stryMutAct_9fa48("1288")) {
        {
        }
      } else {
        stryCov_9fa48("1288");
        resultTracker.handleEvent(event);
        emitter.emit(event);
      }
    }

    // Cache for child inspectors
    const childInspectorCache = new WeakMap<ContainerInternalState, InspectorAPI>();

    /**
     * Gets InspectorAPI instances for all child containers.
     */
    function getChildContainers(): readonly InspectorAPI[] {
      if (stryMutAct_9fa48("1289")) {
        {
        }
      } else {
        stryCov_9fa48("1289");
        const internalState = container[INTERNAL_ACCESS]();
        const childInspectors: InspectorAPI[] = stryMutAct_9fa48("1290")
          ? ["Stryker was here"]
          : (stryCov_9fa48("1290"), []);
        for (const childState of internalState.childContainers) {
          if (stryMutAct_9fa48("1291")) {
            {
            }
          } else {
            stryCov_9fa48("1291");
            // Check cache first
            let childInspector = childInspectorCache.get(childState);
            if (
              stryMutAct_9fa48("1294")
                ? childInspector === undefined || childState.wrapper !== undefined
                : stryMutAct_9fa48("1293")
                  ? false
                  : stryMutAct_9fa48("1292")
                    ? true
                    : (stryCov_9fa48("1292", "1293", "1294"),
                      (stryMutAct_9fa48("1296")
                        ? childInspector !== undefined
                        : stryMutAct_9fa48("1295")
                          ? true
                          : (stryCov_9fa48("1295", "1296"), childInspector === undefined)) &&
                        (stryMutAct_9fa48("1298")
                          ? childState.wrapper === undefined
                          : stryMutAct_9fa48("1297")
                            ? true
                            : (stryCov_9fa48("1297", "1298"), childState.wrapper !== undefined)))
            ) {
              if (stryMutAct_9fa48("1299")) {
                {
                }
              } else {
                stryCov_9fa48("1299");
                const wrapper = childState.wrapper;

                // Check if wrapper has .inspector property
                if (
                  stryMutAct_9fa48("1302")
                    ? (typeof wrapper === "object" && wrapper !== null && "inspector" in wrapper) ||
                      wrapper.inspector !== undefined
                    : stryMutAct_9fa48("1301")
                      ? false
                      : stryMutAct_9fa48("1300")
                        ? true
                        : (stryCov_9fa48("1300", "1301", "1302"),
                          (stryMutAct_9fa48("1304")
                            ? (typeof wrapper === "object" && wrapper !== null) ||
                              "inspector" in wrapper
                            : stryMutAct_9fa48("1303")
                              ? true
                              : (stryCov_9fa48("1303", "1304"),
                                (stryMutAct_9fa48("1306")
                                  ? typeof wrapper === "object" || wrapper !== null
                                  : stryMutAct_9fa48("1305")
                                    ? true
                                    : (stryCov_9fa48("1305", "1306"),
                                      (stryMutAct_9fa48("1308")
                                        ? typeof wrapper !== "object"
                                        : stryMutAct_9fa48("1307")
                                          ? true
                                          : (stryCov_9fa48("1307", "1308"),
                                            typeof wrapper ===
                                              (stryMutAct_9fa48("1309")
                                                ? ""
                                                : (stryCov_9fa48("1309"), "object")))) &&
                                        (stryMutAct_9fa48("1311")
                                          ? wrapper === null
                                          : stryMutAct_9fa48("1310")
                                            ? true
                                            : (stryCov_9fa48("1310", "1311"),
                                              wrapper !== null)))) &&
                                  (stryMutAct_9fa48("1312")
                                    ? ""
                                    : (stryCov_9fa48("1312"), "inspector")) in wrapper)) &&
                            (stryMutAct_9fa48("1314")
                              ? wrapper.inspector === undefined
                              : stryMutAct_9fa48("1313")
                                ? true
                                : (stryCov_9fa48("1313", "1314"), wrapper.inspector !== undefined)))
                ) {
                  if (stryMutAct_9fa48("1315")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("1315");
                    childInspector = wrapper.inspector as InspectorAPI;
                  }
                } else if (
                  stryMutAct_9fa48("1318")
                    ? (typeof wrapper === "object" && wrapper !== null) ||
                      INTERNAL_ACCESS in wrapper
                    : stryMutAct_9fa48("1317")
                      ? false
                      : stryMutAct_9fa48("1316")
                        ? true
                        : (stryCov_9fa48("1316", "1317", "1318"),
                          (stryMutAct_9fa48("1320")
                            ? typeof wrapper === "object" || wrapper !== null
                            : stryMutAct_9fa48("1319")
                              ? true
                              : (stryCov_9fa48("1319", "1320"),
                                (stryMutAct_9fa48("1322")
                                  ? typeof wrapper !== "object"
                                  : stryMutAct_9fa48("1321")
                                    ? true
                                    : (stryCov_9fa48("1321", "1322"),
                                      typeof wrapper ===
                                        (stryMutAct_9fa48("1323")
                                          ? ""
                                          : (stryCov_9fa48("1323"), "object")))) &&
                                  (stryMutAct_9fa48("1325")
                                    ? wrapper === null
                                    : stryMutAct_9fa48("1324")
                                      ? true
                                      : (stryCov_9fa48("1324", "1325"), wrapper !== null)))) &&
                            INTERNAL_ACCESS in wrapper)
                ) {
                  if (stryMutAct_9fa48("1326")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("1326");
                    // Create inspector from wrapper
                    childInspector = createBuiltinInspectorAPI(wrapper as InternalAccessible);
                  }
                }
                if (
                  stryMutAct_9fa48("1329")
                    ? childInspector === undefined
                    : stryMutAct_9fa48("1328")
                      ? false
                      : stryMutAct_9fa48("1327")
                        ? true
                        : (stryCov_9fa48("1327", "1328", "1329"), childInspector !== undefined)
                ) {
                  if (stryMutAct_9fa48("1330")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("1330");
                    childInspectorCache.set(childState, childInspector);
                  }
                }
              }
            }
            if (
              stryMutAct_9fa48("1333")
                ? childInspector === undefined
                : stryMutAct_9fa48("1332")
                  ? false
                  : stryMutAct_9fa48("1331")
                    ? true
                    : (stryCov_9fa48("1331", "1332", "1333"), childInspector !== undefined)
            ) {
              if (stryMutAct_9fa48("1334")) {
                {
                }
              } else {
                stryCov_9fa48("1334");
                childInspectors.push(childInspector);
              }
            }
          }
        }
        return Object.freeze(childInspectors);
      }
    }

    /**
     * Gets adapter information for all adapters in this container.
     */
    function getAdapterInfo(): readonly AdapterInfo[] {
      if (stryMutAct_9fa48("1335")) {
        {
        }
      } else {
        stryCov_9fa48("1335");
        const internalState = container[INTERNAL_ACCESS]();
        const adapters: AdapterInfo[] = stryMutAct_9fa48("1336")
          ? ["Stryker was here"]
          : (stryCov_9fa48("1336"), []);
        for (const [, adapter] of internalState.adapterMap) {
          if (stryMutAct_9fa48("1337")) {
            {
            }
          } else {
            stryCov_9fa48("1337");
            adapters.push(
              Object.freeze(
                stryMutAct_9fa48("1338")
                  ? {}
                  : (stryCov_9fa48("1338"),
                    {
                      portName: adapter.portName,
                      lifetime: adapter.lifetime,
                      factoryKind: adapter.factoryKind,
                      dependencyNames: Object.freeze(
                        stryMutAct_9fa48("1339")
                          ? []
                          : (stryCov_9fa48("1339"), [...adapter.dependencyNames])
                      ),
                    })
              )
            );
          }
        }
        return Object.freeze(adapters);
      }
    }

    /**
     * Gets complete graph data for DevTools visualization.
     */
    function getGraphData(): ContainerGraphData {
      if (stryMutAct_9fa48("1340")) {
        {
        }
      } else {
        stryCov_9fa48("1340");
        const internalState = container[INTERNAL_ACCESS]();
        const hasParent = stryMutAct_9fa48("1343")
          ? internalState.parentState === undefined
          : stryMutAct_9fa48("1342")
            ? false
            : stryMutAct_9fa48("1341")
              ? true
              : (stryCov_9fa48("1341", "1342", "1343"), internalState.parentState !== undefined);
        const adapters: VisualizableAdapter[] = stryMutAct_9fa48("1344")
          ? ["Stryker was here"]
          : (stryCov_9fa48("1344"), []);
        for (const [port, adapter] of internalState.adapterMap) {
          if (stryMutAct_9fa48("1345")) {
            {
            }
          } else {
            stryCov_9fa48("1345");
            const origin = determineOrigin(adapter.portName, internalState, hasParent);
            const portMeta = getPortMetadata(port);
            const visualizable: VisualizableAdapter = stryMutAct_9fa48("1346")
              ? {}
              : (stryCov_9fa48("1346"),
                {
                  portName: adapter.portName,
                  lifetime: adapter.lifetime,
                  factoryKind: adapter.factoryKind,
                  dependencyNames: Object.freeze(
                    stryMutAct_9fa48("1347")
                      ? []
                      : (stryCov_9fa48("1347"), [...adapter.dependencyNames])
                  ),
                  origin,
                  inheritanceMode: (
                    stryMutAct_9fa48("1350")
                      ? origin === "inherited" || internalState.inheritanceModes !== undefined
                      : stryMutAct_9fa48("1349")
                        ? false
                        : stryMutAct_9fa48("1348")
                          ? true
                          : (stryCov_9fa48("1348", "1349", "1350"),
                            (stryMutAct_9fa48("1352")
                              ? origin !== "inherited"
                              : stryMutAct_9fa48("1351")
                                ? true
                                : (stryCov_9fa48("1351", "1352"),
                                  origin ===
                                    (stryMutAct_9fa48("1353")
                                      ? ""
                                      : (stryCov_9fa48("1353"), "inherited")))) &&
                              (stryMutAct_9fa48("1355")
                                ? internalState.inheritanceModes === undefined
                                : stryMutAct_9fa48("1354")
                                  ? true
                                  : (stryCov_9fa48("1354", "1355"),
                                    internalState.inheritanceModes !== undefined)))
                  )
                    ? stryMutAct_9fa48("1356")
                      ? internalState.inheritanceModes.get(adapter.portName) && "shared"
                      : (stryCov_9fa48("1356"),
                        internalState.inheritanceModes.get(adapter.portName) ??
                          (stryMutAct_9fa48("1357") ? "" : (stryCov_9fa48("1357"), "shared")))
                    : undefined,
                  isOverride: internalState.overridePorts.has(adapter.portName),
                  metadata: (
                    stryMutAct_9fa48("1360")
                      ? portMeta === undefined
                      : stryMutAct_9fa48("1359")
                        ? false
                        : stryMutAct_9fa48("1358")
                          ? true
                          : (stryCov_9fa48("1358", "1359", "1360"), portMeta !== undefined)
                  )
                    ? Object.freeze(
                        stryMutAct_9fa48("1361")
                          ? {}
                          : (stryCov_9fa48("1361"),
                            {
                              ...portMeta,
                            })
                      )
                    : undefined,
                });
            adapters.push(Object.freeze(visualizable));
          }
        }
        const kind = getContainerKind(internalState);
        const graphData: ContainerGraphData = stryMutAct_9fa48("1362")
          ? {}
          : (stryCov_9fa48("1362"),
            {
              adapters: Object.freeze(adapters),
              containerName: internalState.containerName,
              kind,
              parentName: stryMutAct_9fa48("1363")
                ? internalState.parentState?.containerName && null
                : (stryCov_9fa48("1363"),
                  (stryMutAct_9fa48("1364")
                    ? internalState.parentState.containerName
                    : (stryCov_9fa48("1364"), internalState.parentState?.containerName)) ?? null),
            });
        return Object.freeze(graphData);
      }
    }

    // Create the full InspectorAPI
    const inspector: InspectorAPI = stryMutAct_9fa48("1365")
      ? {}
      : (stryCov_9fa48("1365"),
        {
          // Pull-based queries
          getSnapshot() {
            if (stryMutAct_9fa48("1366")) {
              {
              }
            } else {
              stryCov_9fa48("1366");
              const snapshot = runtimeInspector.snapshot();
              const currentState = container[INTERNAL_ACCESS]();
              return buildTypedSnapshotFromInternal(snapshot, containerKind, currentState);
            }
          },
          getScopeTree: stryMutAct_9fa48("1367")
            ? () => undefined
            : (stryCov_9fa48("1367"), () => runtimeInspector.getScopeTree()),
          listPorts: stryMutAct_9fa48("1368")
            ? () => undefined
            : (stryCov_9fa48("1368"), () => runtimeInspector.listPorts()),
          isResolved: stryMutAct_9fa48("1369")
            ? () => undefined
            : (stryCov_9fa48("1369"), (portName: string) => runtimeInspector.isResolved(portName)),
          getContainerKind: stryMutAct_9fa48("1370")
            ? () => undefined
            : (stryCov_9fa48("1370"), () => containerKind),
          getPhase() {
            if (stryMutAct_9fa48("1371")) {
              {
              }
            } else {
              stryCov_9fa48("1371");
              const snapshot = runtimeInspector.snapshot();
              return detectPhaseFromSnapshot(snapshot, containerKind);
            }
          },
          get isDisposed() {
            if (stryMutAct_9fa48("1372")) {
              {
              }
            } else {
              stryCov_9fa48("1372");
              return runtimeInspector.snapshot().isDisposed;
            }
          },
          // Push-based subscriptions
          subscribe: stryMutAct_9fa48("1373")
            ? () => undefined
            : (stryCov_9fa48("1373"), (listener: InspectorListener) => emitter.subscribe(listener)),
          // Hierarchy traversal
          getChildContainers,
          // Graph data
          getAdapterInfo,
          getGraphData,
          // Result statistics
          getResultStatistics: stryMutAct_9fa48("1374")
            ? () => undefined
            : (stryCov_9fa48("1374"), (portName: string) => resultTracker.getStatistics(portName)),
          getAllResultStatistics: stryMutAct_9fa48("1375")
            ? () => undefined
            : (stryCov_9fa48("1375"), () => resultTracker.getAllStatistics()),
          getHighErrorRatePorts: stryMutAct_9fa48("1376")
            ? () => undefined
            : (stryCov_9fa48("1376"),
              (threshold: number) => resultTracker.getHighErrorRatePorts(threshold)),
          // Library inspector registry
          registerLibrary(lib: LibraryInspector): () => void {
            if (stryMutAct_9fa48("1377")) {
              {
              }
            } else {
              stryCov_9fa48("1377");
              return libraryRegistry.registerLibrary(lib, emitEvent);
            }
          },
          getLibraryInspectors: stryMutAct_9fa48("1378")
            ? () => undefined
            : (stryCov_9fa48("1378"), () => libraryRegistry.getLibraryInspectors()),
          getLibraryInspector: stryMutAct_9fa48("1379")
            ? () => undefined
            : (stryCov_9fa48("1379"), (name: string) => libraryRegistry.getLibraryInspector(name)),
          getUnifiedSnapshot(): UnifiedSnapshot {
            if (stryMutAct_9fa48("1380")) {
              {
              }
            } else {
              stryCov_9fa48("1380");
              const containerSnapshot = inspector.getSnapshot();
              const libraries = libraryRegistry.getLibrarySnapshots();
              const registeredLibraries = Object.freeze(
                stryMutAct_9fa48("1381")
                  ? [...libraryRegistry.getLibraryInspectors().keys()]
                  : (stryCov_9fa48("1381"),
                    (stryMutAct_9fa48("1382")
                      ? []
                      : (stryCov_9fa48("1382"), [...libraryRegistry.getLibraryInspectors().keys()])
                    ).sort())
              );
              return Object.freeze(
                stryMutAct_9fa48("1383")
                  ? {}
                  : (stryCov_9fa48("1383"),
                    {
                      timestamp: Date.now(),
                      container: containerSnapshot,
                      libraries,
                      registeredLibraries,
                    })
              );
            }
          },
          // Internal methods (for runtime and tracing)
          getContainer: stryMutAct_9fa48("1384")
            ? () => undefined
            : (stryCov_9fa48("1384"), () => container),
          emit: emitEvent,
          disposeLibraries: stryMutAct_9fa48("1385")
            ? () => undefined
            : (stryCov_9fa48("1385"), () => libraryRegistry.dispose()),
        });
    return Object.freeze(inspector);
  }
}
