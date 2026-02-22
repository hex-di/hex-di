/**
 * VirtualClockAdapter — controllable test clock for deterministic time testing.
 *
 * NOT frozen — mutable state required for control methods.
 * Exported only from @hex-di/clock/testing, never from the main entry point.
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
import { asMonotonic, asWallClock, asHighRes } from "../branded.js";
import { ClockPort } from "../ports/clock.js";
import type { ClockService } from "../ports/clock.js";

/** Error returned when advance() or options receive out-of-range values. */
export interface ClockRangeError {
  readonly _tag: "ClockRangeError";
  readonly parameter: string;
  readonly value: number;
  readonly message: string;
}

/** Factory for ClockRangeError — frozen per GxP error immutability. */
export function createClockRangeError(parameter: string, value: number, message: string): ClockRangeError {
  if (stryMutAct_9fa48("1140")) {
    {}
  } else {
    stryCov_9fa48("1140");
    return Object.freeze(stryMutAct_9fa48("1141") ? {} : (stryCov_9fa48("1141"), {
      _tag: "ClockRangeError" as const,
      parameter,
      value,
      message
    }));
  }
}

/** Mutable time values for the virtual clock. */
export interface VirtualClockValues {
  readonly monotonic: number;
  readonly wallClock: number;
  readonly highRes: number;
}

/** Options for createVirtualClock. */
export interface VirtualClockOptions {
  readonly initialMonotonic?: number;
  readonly initialWallClock?: number;
  readonly initialHighRes?: number;
  readonly autoAdvance?: number;
}

/** Validate that a value is finite (no NaN, no Infinity). */
function assertFiniteOption(value: number, name: string): void {
  if (stryMutAct_9fa48("1142")) {
    {}
  } else {
    stryCov_9fa48("1142");
    if (stryMutAct_9fa48("1145") ? false : stryMutAct_9fa48("1144") ? true : stryMutAct_9fa48("1143") ? Number.isFinite(value) : (stryCov_9fa48("1143", "1144", "1145"), !Number.isFinite(value))) {
      if (stryMutAct_9fa48("1146")) {
        {}
      } else {
        stryCov_9fa48("1146");
        throw new TypeError(stryMutAct_9fa48("1147") ? `` : (stryCov_9fa48("1147"), `VirtualClock option '${name}' must be a finite number, got ${value}`));
      }
    }
  }
}

/**
 * Extended interface for the virtual clock adapter.
 * Includes control methods for test manipulation.
 */
export interface VirtualClockAdapterInterface extends ClockService {
  readonly advance: (ms: number) => Result<void, ClockRangeError>;
  readonly set: (values: Partial<VirtualClockValues>) => void;
  readonly jumpWallClock: (ms: number) => void;
  readonly setAutoAdvance: (ms: number) => void;
  readonly getAutoAdvance: () => number;
  /** Internal: register an advance listener (used by VirtualTimerScheduler). */
  readonly _onAdvance?: (callback: (ms: number) => void) => void;
}
const DEFAULT_WALL_CLOCK = 1707753600000; // 2024-02-12T12:00:00Z

/**
 * Creates a virtual clock adapter with fully controllable time.
 *
 * NOT frozen — mutable internal state required for advance(), set(), etc.
 */
export function createVirtualClock(options?: VirtualClockOptions): VirtualClockAdapterInterface {
  if (stryMutAct_9fa48("1148")) {
    {}
  } else {
    stryCov_9fa48("1148");
    const initialMonotonic = stryMutAct_9fa48("1149") ? options?.initialMonotonic && 0 : (stryCov_9fa48("1149"), (stryMutAct_9fa48("1150") ? options.initialMonotonic : (stryCov_9fa48("1150"), options?.initialMonotonic)) ?? 0);
    const initialWallClock = stryMutAct_9fa48("1151") ? options?.initialWallClock && DEFAULT_WALL_CLOCK : (stryCov_9fa48("1151"), (stryMutAct_9fa48("1152") ? options.initialWallClock : (stryCov_9fa48("1152"), options?.initialWallClock)) ?? DEFAULT_WALL_CLOCK);
    const initialHighRes = stryMutAct_9fa48("1153") ? options?.initialHighRes && initialWallClock : (stryCov_9fa48("1153"), (stryMutAct_9fa48("1154") ? options.initialHighRes : (stryCov_9fa48("1154"), options?.initialHighRes)) ?? initialWallClock);
    const initialAutoAdvance = stryMutAct_9fa48("1155") ? options?.autoAdvance && 0 : (stryCov_9fa48("1155"), (stryMutAct_9fa48("1156") ? options.autoAdvance : (stryCov_9fa48("1156"), options?.autoAdvance)) ?? 0);

    // Validate options — reject non-finite values only
    if (stryMutAct_9fa48("1159") ? options?.initialMonotonic === undefined : stryMutAct_9fa48("1158") ? false : stryMutAct_9fa48("1157") ? true : (stryCov_9fa48("1157", "1158", "1159"), (stryMutAct_9fa48("1160") ? options.initialMonotonic : (stryCov_9fa48("1160"), options?.initialMonotonic)) !== undefined)) {
      if (stryMutAct_9fa48("1161")) {
        {}
      } else {
        stryCov_9fa48("1161");
        assertFiniteOption(options.initialMonotonic, stryMutAct_9fa48("1162") ? "" : (stryCov_9fa48("1162"), "initialMonotonic"));
      }
    }
    if (stryMutAct_9fa48("1165") ? options?.initialWallClock === undefined : stryMutAct_9fa48("1164") ? false : stryMutAct_9fa48("1163") ? true : (stryCov_9fa48("1163", "1164", "1165"), (stryMutAct_9fa48("1166") ? options.initialWallClock : (stryCov_9fa48("1166"), options?.initialWallClock)) !== undefined)) {
      if (stryMutAct_9fa48("1167")) {
        {}
      } else {
        stryCov_9fa48("1167");
        assertFiniteOption(options.initialWallClock, stryMutAct_9fa48("1168") ? "" : (stryCov_9fa48("1168"), "initialWallClock"));
      }
    }
    if (stryMutAct_9fa48("1171") ? options?.initialHighRes === undefined : stryMutAct_9fa48("1170") ? false : stryMutAct_9fa48("1169") ? true : (stryCov_9fa48("1169", "1170", "1171"), (stryMutAct_9fa48("1172") ? options.initialHighRes : (stryCov_9fa48("1172"), options?.initialHighRes)) !== undefined)) {
      if (stryMutAct_9fa48("1173")) {
        {}
      } else {
        stryCov_9fa48("1173");
        assertFiniteOption(options.initialHighRes, stryMutAct_9fa48("1174") ? "" : (stryCov_9fa48("1174"), "initialHighRes"));
      }
    }
    if (stryMutAct_9fa48("1177") ? options?.autoAdvance === undefined : stryMutAct_9fa48("1176") ? false : stryMutAct_9fa48("1175") ? true : (stryCov_9fa48("1175", "1176", "1177"), (stryMutAct_9fa48("1178") ? options.autoAdvance : (stryCov_9fa48("1178"), options?.autoAdvance)) !== undefined)) {
      if (stryMutAct_9fa48("1179")) {
        {}
      } else {
        stryCov_9fa48("1179");
        if (stryMutAct_9fa48("1182") ? !Number.isFinite(options.autoAdvance) && options.autoAdvance < 0 : stryMutAct_9fa48("1181") ? false : stryMutAct_9fa48("1180") ? true : (stryCov_9fa48("1180", "1181", "1182"), (stryMutAct_9fa48("1183") ? Number.isFinite(options.autoAdvance) : (stryCov_9fa48("1183"), !Number.isFinite(options.autoAdvance))) || (stryMutAct_9fa48("1186") ? options.autoAdvance >= 0 : stryMutAct_9fa48("1185") ? options.autoAdvance <= 0 : stryMutAct_9fa48("1184") ? false : (stryCov_9fa48("1184", "1185", "1186"), options.autoAdvance < 0)))) {
          if (stryMutAct_9fa48("1187")) {
            {}
          } else {
            stryCov_9fa48("1187");
            throw new TypeError(stryMutAct_9fa48("1188") ? `` : (stryCov_9fa48("1188"), `VirtualClock option 'autoAdvance' must be a non-negative finite number, got ${options.autoAdvance}`));
          }
        }
      }
    }
    let monotonic = initialMonotonic;
    let wallClock = initialWallClock;
    let highRes = initialHighRes;
    let autoAdvanceMs = initialAutoAdvance;
    const advanceListeners: Array<(ms: number) => void> = stryMutAct_9fa48("1189") ? ["Stryker was here"] : (stryCov_9fa48("1189"), []);
    const doAdvance = (ms: number): void => {
      if (stryMutAct_9fa48("1190")) {
        {}
      } else {
        stryCov_9fa48("1190");
        stryMutAct_9fa48("1191") ? monotonic -= ms : (stryCov_9fa48("1191"), monotonic += ms);
        stryMutAct_9fa48("1192") ? wallClock -= ms : (stryCov_9fa48("1192"), wallClock += ms);
        stryMutAct_9fa48("1193") ? highRes -= ms : (stryCov_9fa48("1193"), highRes += ms);
        for (const listener of advanceListeners) {
          if (stryMutAct_9fa48("1194")) {
            {}
          } else {
            stryCov_9fa48("1194");
            listener(ms);
          }
        }
      }
    };

    // The VirtualClockAdapterInterface is NOT frozen
    const adapter: VirtualClockAdapterInterface = stryMutAct_9fa48("1195") ? {} : (stryCov_9fa48("1195"), {
      monotonicNow() {
        if (stryMutAct_9fa48("1196")) {
          {}
        } else {
          stryCov_9fa48("1196");
          const value = asMonotonic(monotonic);
          if (stryMutAct_9fa48("1200") ? autoAdvanceMs <= 0 : stryMutAct_9fa48("1199") ? autoAdvanceMs >= 0 : stryMutAct_9fa48("1198") ? false : stryMutAct_9fa48("1197") ? true : (stryCov_9fa48("1197", "1198", "1199", "1200"), autoAdvanceMs > 0)) {
            if (stryMutAct_9fa48("1201")) {
              {}
            } else {
              stryCov_9fa48("1201");
              doAdvance(autoAdvanceMs);
            }
          }
          return value;
        }
      },
      wallClockNow() {
        if (stryMutAct_9fa48("1202")) {
          {}
        } else {
          stryCov_9fa48("1202");
          const value = asWallClock(wallClock);
          if (stryMutAct_9fa48("1206") ? autoAdvanceMs <= 0 : stryMutAct_9fa48("1205") ? autoAdvanceMs >= 0 : stryMutAct_9fa48("1204") ? false : stryMutAct_9fa48("1203") ? true : (stryCov_9fa48("1203", "1204", "1205", "1206"), autoAdvanceMs > 0)) {
            if (stryMutAct_9fa48("1207")) {
              {}
            } else {
              stryCov_9fa48("1207");
              doAdvance(autoAdvanceMs);
            }
          }
          return value;
        }
      },
      highResNow() {
        if (stryMutAct_9fa48("1208")) {
          {}
        } else {
          stryCov_9fa48("1208");
          const value = asHighRes(highRes);
          if (stryMutAct_9fa48("1212") ? autoAdvanceMs <= 0 : stryMutAct_9fa48("1211") ? autoAdvanceMs >= 0 : stryMutAct_9fa48("1210") ? false : stryMutAct_9fa48("1209") ? true : (stryCov_9fa48("1209", "1210", "1211", "1212"), autoAdvanceMs > 0)) {
            if (stryMutAct_9fa48("1213")) {
              {}
            } else {
              stryCov_9fa48("1213");
              doAdvance(autoAdvanceMs);
            }
          }
          return value;
        }
      },
      advance(ms: number): Result<void, ClockRangeError> {
        if (stryMutAct_9fa48("1214")) {
          {}
        } else {
          stryCov_9fa48("1214");
          if (stryMutAct_9fa48("1218") ? ms >= 0 : stryMutAct_9fa48("1217") ? ms <= 0 : stryMutAct_9fa48("1216") ? false : stryMutAct_9fa48("1215") ? true : (stryCov_9fa48("1215", "1216", "1217", "1218"), ms < 0)) {
            if (stryMutAct_9fa48("1219")) {
              {}
            } else {
              stryCov_9fa48("1219");
              return err(createClockRangeError(stryMutAct_9fa48("1220") ? "" : (stryCov_9fa48("1220"), "ms"), ms, stryMutAct_9fa48("1221") ? "" : (stryCov_9fa48("1221"), "advance() requires a non-negative value")));
            }
          }
          doAdvance(ms);
          return ok(undefined);
        }
      },
      set(values: Partial<VirtualClockValues>): void {
        if (stryMutAct_9fa48("1222")) {
          {}
        } else {
          stryCov_9fa48("1222");
          if (stryMutAct_9fa48("1225") ? values.monotonic === undefined : stryMutAct_9fa48("1224") ? false : stryMutAct_9fa48("1223") ? true : (stryCov_9fa48("1223", "1224", "1225"), values.monotonic !== undefined)) {
            if (stryMutAct_9fa48("1226")) {
              {}
            } else {
              stryCov_9fa48("1226");
              if (stryMutAct_9fa48("1229") ? false : stryMutAct_9fa48("1228") ? true : stryMutAct_9fa48("1227") ? Number.isFinite(values.monotonic) : (stryCov_9fa48("1227", "1228", "1229"), !Number.isFinite(values.monotonic))) {
                if (stryMutAct_9fa48("1230")) {
                  {}
                } else {
                  stryCov_9fa48("1230");
                  throw new TypeError(stryMutAct_9fa48("1231") ? `` : (stryCov_9fa48("1231"), `set() 'monotonic' must be a finite number, got ${values.monotonic}`));
                }
              }
              monotonic = values.monotonic;
            }
          }
          if (stryMutAct_9fa48("1234") ? values.wallClock === undefined : stryMutAct_9fa48("1233") ? false : stryMutAct_9fa48("1232") ? true : (stryCov_9fa48("1232", "1233", "1234"), values.wallClock !== undefined)) {
            if (stryMutAct_9fa48("1235")) {
              {}
            } else {
              stryCov_9fa48("1235");
              if (stryMutAct_9fa48("1238") ? false : stryMutAct_9fa48("1237") ? true : stryMutAct_9fa48("1236") ? Number.isFinite(values.wallClock) : (stryCov_9fa48("1236", "1237", "1238"), !Number.isFinite(values.wallClock))) {
                if (stryMutAct_9fa48("1239")) {
                  {}
                } else {
                  stryCov_9fa48("1239");
                  throw new TypeError(stryMutAct_9fa48("1240") ? `` : (stryCov_9fa48("1240"), `set() 'wallClock' must be a finite number, got ${values.wallClock}`));
                }
              }
              wallClock = values.wallClock;
            }
          }
          if (stryMutAct_9fa48("1243") ? values.highRes === undefined : stryMutAct_9fa48("1242") ? false : stryMutAct_9fa48("1241") ? true : (stryCov_9fa48("1241", "1242", "1243"), values.highRes !== undefined)) {
            if (stryMutAct_9fa48("1244")) {
              {}
            } else {
              stryCov_9fa48("1244");
              if (stryMutAct_9fa48("1247") ? false : stryMutAct_9fa48("1246") ? true : stryMutAct_9fa48("1245") ? Number.isFinite(values.highRes) : (stryCov_9fa48("1245", "1246", "1247"), !Number.isFinite(values.highRes))) {
                if (stryMutAct_9fa48("1248")) {
                  {}
                } else {
                  stryCov_9fa48("1248");
                  throw new TypeError(stryMutAct_9fa48("1249") ? `` : (stryCov_9fa48("1249"), `set() 'highRes' must be a finite number, got ${values.highRes}`));
                }
              }
              highRes = values.highRes;
            }
          }
        }
      },
      jumpWallClock(ms: number): void {
        if (stryMutAct_9fa48("1250")) {
          {}
        } else {
          stryCov_9fa48("1250");
          if (stryMutAct_9fa48("1253") ? false : stryMutAct_9fa48("1252") ? true : stryMutAct_9fa48("1251") ? Number.isFinite(ms) : (stryCov_9fa48("1251", "1252", "1253"), !Number.isFinite(ms))) {
            if (stryMutAct_9fa48("1254")) {
              {}
            } else {
              stryCov_9fa48("1254");
              throw new TypeError(stryMutAct_9fa48("1255") ? `` : (stryCov_9fa48("1255"), `jumpWallClock() 'ms' must be a finite number, got ${ms}`));
            }
          }
          stryMutAct_9fa48("1256") ? wallClock -= ms : (stryCov_9fa48("1256"), wallClock += ms);
          stryMutAct_9fa48("1257") ? highRes -= ms : (stryCov_9fa48("1257"), highRes += ms);
          // monotonic is intentionally NOT affected
        }
      },
      setAutoAdvance(ms: number): void {
        if (stryMutAct_9fa48("1258")) {
          {}
        } else {
          stryCov_9fa48("1258");
          if (stryMutAct_9fa48("1261") ? !Number.isFinite(ms) && ms < 0 : stryMutAct_9fa48("1260") ? false : stryMutAct_9fa48("1259") ? true : (stryCov_9fa48("1259", "1260", "1261"), (stryMutAct_9fa48("1262") ? Number.isFinite(ms) : (stryCov_9fa48("1262"), !Number.isFinite(ms))) || (stryMutAct_9fa48("1265") ? ms >= 0 : stryMutAct_9fa48("1264") ? ms <= 0 : stryMutAct_9fa48("1263") ? false : (stryCov_9fa48("1263", "1264", "1265"), ms < 0)))) {
            if (stryMutAct_9fa48("1266")) {
              {}
            } else {
              stryCov_9fa48("1266");
              throw new TypeError(stryMutAct_9fa48("1267") ? `` : (stryCov_9fa48("1267"), `setAutoAdvance() 'ms' must be a non-negative finite number, got ${ms}`));
            }
          }
          autoAdvanceMs = ms;
        }
      },
      getAutoAdvance(): number {
        if (stryMutAct_9fa48("1268")) {
          {}
        } else {
          stryCov_9fa48("1268");
          return autoAdvanceMs;
        }
      },
      _onAdvance(callback: (ms: number) => void): void {
        if (stryMutAct_9fa48("1269")) {
          {}
        } else {
          stryCov_9fa48("1269");
          advanceListeners.push(callback);
        }
      }
    });
    return adapter;
  }
}

/** Virtual clock adapter constant — transient lifetime for test isolation. */
export const VirtualClockTestAdapter = createAdapter(stryMutAct_9fa48("1270") ? {} : (stryCov_9fa48("1270"), {
  provides: ClockPort,
  requires: stryMutAct_9fa48("1271") ? ["Stryker was here"] : (stryCov_9fa48("1271"), []),
  lifetime: stryMutAct_9fa48("1272") ? "" : (stryCov_9fa48("1272"), "transient"),
  factory: stryMutAct_9fa48("1273") ? () => undefined : (stryCov_9fa48("1273"), () => createVirtualClock())
}));