/**
 * VirtualTimerScheduler — controllable timer scheduler linked to a VirtualClockAdapter.
 *
 * When the virtual clock advances, pending timers fire synchronously in chronological order.
 * Exported only from @hex-di/clock/testing.
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
import type { TimerSchedulerService, TimerHandle } from "../ports/timer-scheduler.js";
import { createTimerHandle } from "../ports/timer-scheduler.js";
import type { VirtualClockAdapterInterface } from "./virtual-clock.js";

// =============================================================================
// ClockTimeoutError
// =============================================================================

/** Error thrown when blockUntil() times out waiting for pending timers. */
export interface ClockTimeoutError {
  readonly _tag: "ClockTimeoutError";
  readonly expected: number;
  readonly actual: number;
  readonly timeoutMs: number;
  readonly message: string;
}

/** Factory for ClockTimeoutError — frozen per GxP error immutability. */
export function createClockTimeoutError(expected: number, actual: number, timeoutMs: number): ClockTimeoutError {
  if (stryMutAct_9fa48("1304")) {
    {}
  } else {
    stryCov_9fa48("1304");
    return Object.freeze(stryMutAct_9fa48("1305") ? {} : (stryCov_9fa48("1305"), {
      _tag: "ClockTimeoutError" as const,
      expected,
      actual,
      timeoutMs,
      message: stryMutAct_9fa48("1306") ? `` : (stryCov_9fa48("1306"), `blockUntil(${expected}) timed out after ${timeoutMs}ms: ${actual} timers pending`)
    }));
  }
}

// =============================================================================
// BlockUntilOptions
// =============================================================================

/** Options for VirtualTimerScheduler.blockUntil(). */
export interface BlockUntilOptions {
  readonly timeoutMs?: number;
}

// =============================================================================
// VirtualTimerScheduler Interface
// =============================================================================

/** Extended interface for the virtual timer scheduler. */
export interface VirtualTimerScheduler extends TimerSchedulerService {
  readonly pendingCount: () => number;
  readonly advanceTime: (ms: number) => void;
  readonly runAll: () => void;
  readonly runNext: () => void;
  readonly blockUntil: (n: number, options?: BlockUntilOptions) => Promise<void>;
}

// =============================================================================
// Internal types
// =============================================================================

type TimerType = "timeout" | "interval";
interface PendingTimer {
  readonly id: number;
  readonly callback: () => void;
  readonly type: TimerType;
  readonly intervalMs: number;
  scheduledAt: number;
  readonly registrationOrder: number;
}

// =============================================================================
// createVirtualTimerScheduler
// =============================================================================

/**
 * Creates a virtual timer scheduler linked to a VirtualClockAdapter.
 * Timers fire synchronously when the linked clock advances.
 */
export function createVirtualTimerScheduler(clock: VirtualClockAdapterInterface): VirtualTimerScheduler {
  if (stryMutAct_9fa48("1307")) {
    {}
  } else {
    stryCov_9fa48("1307");
    let nextId = 1;
    let registrationOrder = 0;
    const pendingTimers: PendingTimer[] = stryMutAct_9fa48("1308") ? ["Stryker was here"] : (stryCov_9fa48("1308"), []);
    const getCurrentTime = stryMutAct_9fa48("1309") ? () => undefined : (stryCov_9fa48("1309"), (() => {
      const getCurrentTime = (): number => clock.monotonicNow();
      return getCurrentTime;
    })());

    /** Fire all timers scheduled <= targetTime, in chronological / FIFO order. */
    const fireTimersUpTo = (targetTime: number): void => {
      if (stryMutAct_9fa48("1310")) {
        {}
      } else {
        stryCov_9fa48("1310");
        // Repeat until no more timers are scheduled <= targetTime
        // (intervals may re-register themselves within the range)
        let iterations = 0;
        const MAX_ITERATIONS = 100000; // safety limit

        while (stryMutAct_9fa48("1313") ? iterations >= MAX_ITERATIONS : stryMutAct_9fa48("1312") ? iterations <= MAX_ITERATIONS : stryMutAct_9fa48("1311") ? false : (stryCov_9fa48("1311", "1312", "1313"), iterations < MAX_ITERATIONS)) {
          if (stryMutAct_9fa48("1314")) {
            {}
          } else {
            stryCov_9fa48("1314");
            // Find the next timer to fire (smallest scheduledAt <= targetTime, FIFO for ties)
            let nextIndex = stryMutAct_9fa48("1315") ? +1 : (stryCov_9fa48("1315"), -1);
            for (let i = 0; stryMutAct_9fa48("1318") ? i >= pendingTimers.length : stryMutAct_9fa48("1317") ? i <= pendingTimers.length : stryMutAct_9fa48("1316") ? false : (stryCov_9fa48("1316", "1317", "1318"), i < pendingTimers.length); stryMutAct_9fa48("1319") ? i-- : (stryCov_9fa48("1319"), i++)) {
              if (stryMutAct_9fa48("1320")) {
                {}
              } else {
                stryCov_9fa48("1320");
                const timer = pendingTimers[i];
                if (stryMutAct_9fa48("1324") ? timer.scheduledAt > targetTime : stryMutAct_9fa48("1323") ? timer.scheduledAt < targetTime : stryMutAct_9fa48("1322") ? false : stryMutAct_9fa48("1321") ? true : (stryCov_9fa48("1321", "1322", "1323", "1324"), timer.scheduledAt <= targetTime)) {
                  if (stryMutAct_9fa48("1325")) {
                    {}
                  } else {
                    stryCov_9fa48("1325");
                    if (stryMutAct_9fa48("1328") ? (nextIndex === -1 || timer.scheduledAt < pendingTimers[nextIndex].scheduledAt) && timer.scheduledAt === pendingTimers[nextIndex].scheduledAt && timer.registrationOrder < pendingTimers[nextIndex].registrationOrder : stryMutAct_9fa48("1327") ? false : stryMutAct_9fa48("1326") ? true : (stryCov_9fa48("1326", "1327", "1328"), (stryMutAct_9fa48("1330") ? nextIndex === -1 && timer.scheduledAt < pendingTimers[nextIndex].scheduledAt : stryMutAct_9fa48("1329") ? false : (stryCov_9fa48("1329", "1330"), (stryMutAct_9fa48("1332") ? nextIndex !== -1 : stryMutAct_9fa48("1331") ? false : (stryCov_9fa48("1331", "1332"), nextIndex === (stryMutAct_9fa48("1333") ? +1 : (stryCov_9fa48("1333"), -1)))) || (stryMutAct_9fa48("1336") ? timer.scheduledAt >= pendingTimers[nextIndex].scheduledAt : stryMutAct_9fa48("1335") ? timer.scheduledAt <= pendingTimers[nextIndex].scheduledAt : stryMutAct_9fa48("1334") ? false : (stryCov_9fa48("1334", "1335", "1336"), timer.scheduledAt < pendingTimers[nextIndex].scheduledAt)))) || (stryMutAct_9fa48("1338") ? timer.scheduledAt === pendingTimers[nextIndex].scheduledAt || timer.registrationOrder < pendingTimers[nextIndex].registrationOrder : stryMutAct_9fa48("1337") ? false : (stryCov_9fa48("1337", "1338"), (stryMutAct_9fa48("1340") ? timer.scheduledAt !== pendingTimers[nextIndex].scheduledAt : stryMutAct_9fa48("1339") ? true : (stryCov_9fa48("1339", "1340"), timer.scheduledAt === pendingTimers[nextIndex].scheduledAt)) && (stryMutAct_9fa48("1343") ? timer.registrationOrder >= pendingTimers[nextIndex].registrationOrder : stryMutAct_9fa48("1342") ? timer.registrationOrder <= pendingTimers[nextIndex].registrationOrder : stryMutAct_9fa48("1341") ? true : (stryCov_9fa48("1341", "1342", "1343"), timer.registrationOrder < pendingTimers[nextIndex].registrationOrder)))))) {
                      if (stryMutAct_9fa48("1344")) {
                        {}
                      } else {
                        stryCov_9fa48("1344");
                        nextIndex = i;
                      }
                    }
                  }
                }
              }
            }
            if (stryMutAct_9fa48("1347") ? nextIndex !== -1 : stryMutAct_9fa48("1346") ? false : stryMutAct_9fa48("1345") ? true : (stryCov_9fa48("1345", "1346", "1347"), nextIndex === (stryMutAct_9fa48("1348") ? +1 : (stryCov_9fa48("1348"), -1)))) break;
            const timer = pendingTimers[nextIndex];
            if (stryMutAct_9fa48("1351") ? timer.type !== "timeout" : stryMutAct_9fa48("1350") ? false : stryMutAct_9fa48("1349") ? true : (stryCov_9fa48("1349", "1350", "1351"), timer.type === (stryMutAct_9fa48("1352") ? "" : (stryCov_9fa48("1352"), "timeout")))) {
              if (stryMutAct_9fa48("1353")) {
                {}
              } else {
                stryCov_9fa48("1353");
                // Remove before firing (to prevent re-firing if callback throws)
                pendingTimers.splice(nextIndex, 1);
                timer.callback();
              }
            } else {
              if (stryMutAct_9fa48("1354")) {
                {}
              } else {
                stryCov_9fa48("1354");
                // Interval: re-schedule before firing
                stryMutAct_9fa48("1355") ? timer.scheduledAt -= timer.intervalMs : (stryCov_9fa48("1355"), timer.scheduledAt += timer.intervalMs);
                timer.callback();
              }
            }
            stryMutAct_9fa48("1356") ? iterations -= 1 : (stryCov_9fa48("1356"), iterations += 1);
          }
        }
      }
    };

    // Register advance listener on the virtual clock
    if (stryMutAct_9fa48("1358") ? false : stryMutAct_9fa48("1357") ? true : (stryCov_9fa48("1357", "1358"), clock._onAdvance)) {
      if (stryMutAct_9fa48("1359")) {
        {}
      } else {
        stryCov_9fa48("1359");
        clock._onAdvance((_ms: number) => {
          if (stryMutAct_9fa48("1360")) {
            {}
          } else {
            stryCov_9fa48("1360");
            const targetTime = getCurrentTime();
            fireTimersUpTo(targetTime);
          }
        });
      }
    }
    const blockUntilResolvers: Array<{
      n: number;
      resolve: () => void;
      reject: (e: unknown) => void;
    }> = stryMutAct_9fa48("1361") ? ["Stryker was here"] : (stryCov_9fa48("1361"), []);
    const checkBlockUntilResolvers = (): void => {
      if (stryMutAct_9fa48("1362")) {
        {}
      } else {
        stryCov_9fa48("1362");
        const pending = pendingTimers.length;
        for (let i = stryMutAct_9fa48("1363") ? blockUntilResolvers.length + 1 : (stryCov_9fa48("1363"), blockUntilResolvers.length - 1); stryMutAct_9fa48("1366") ? i < 0 : stryMutAct_9fa48("1365") ? i > 0 : stryMutAct_9fa48("1364") ? false : (stryCov_9fa48("1364", "1365", "1366"), i >= 0); stryMutAct_9fa48("1367") ? i++ : (stryCov_9fa48("1367"), i--)) {
          if (stryMutAct_9fa48("1368")) {
            {}
          } else {
            stryCov_9fa48("1368");
            const waiter = blockUntilResolvers[i];
            if (stryMutAct_9fa48("1372") ? pending < waiter.n : stryMutAct_9fa48("1371") ? pending > waiter.n : stryMutAct_9fa48("1370") ? false : stryMutAct_9fa48("1369") ? true : (stryCov_9fa48("1369", "1370", "1371", "1372"), pending >= waiter.n)) {
              if (stryMutAct_9fa48("1373")) {
                {}
              } else {
                stryCov_9fa48("1373");
                blockUntilResolvers.splice(i, 1);
                waiter.resolve();
              }
            }
          }
        }
      }
    };
    const scheduler: VirtualTimerScheduler = stryMutAct_9fa48("1374") ? {} : (stryCov_9fa48("1374"), {
      setTimeout(callback: () => void, ms: number): TimerHandle {
        if (stryMutAct_9fa48("1375")) {
          {}
        } else {
          stryCov_9fa48("1375");
          if (stryMutAct_9fa48("1378") ? typeof callback === "function" : stryMutAct_9fa48("1377") ? false : stryMutAct_9fa48("1376") ? true : (stryCov_9fa48("1376", "1377", "1378"), typeof callback !== (stryMutAct_9fa48("1379") ? "" : (stryCov_9fa48("1379"), "function")))) {
            if (stryMutAct_9fa48("1380")) {
              {}
            } else {
              stryCov_9fa48("1380");
              throw new TypeError(stryMutAct_9fa48("1381") ? "" : (stryCov_9fa48("1381"), "callback must be a function"));
            }
          }
          if (stryMutAct_9fa48("1384") ? !Number.isFinite(ms) && ms < 0 : stryMutAct_9fa48("1383") ? false : stryMutAct_9fa48("1382") ? true : (stryCov_9fa48("1382", "1383", "1384"), (stryMutAct_9fa48("1385") ? Number.isFinite(ms) : (stryCov_9fa48("1385"), !Number.isFinite(ms))) || (stryMutAct_9fa48("1388") ? ms >= 0 : stryMutAct_9fa48("1387") ? ms <= 0 : stryMutAct_9fa48("1386") ? false : (stryCov_9fa48("1386", "1387", "1388"), ms < 0)))) {
            if (stryMutAct_9fa48("1389")) {
              {}
            } else {
              stryCov_9fa48("1389");
              throw new TypeError(stryMutAct_9fa48("1390") ? `` : (stryCov_9fa48("1390"), `ms must be a non-negative finite number, got ${ms}`));
            }
          }
          const id = nextId;
          stryMutAct_9fa48("1391") ? nextId -= 1 : (stryCov_9fa48("1391"), nextId += 1);
          const order = registrationOrder;
          stryMutAct_9fa48("1392") ? registrationOrder -= 1 : (stryCov_9fa48("1392"), registrationOrder += 1);
          pendingTimers.push(stryMutAct_9fa48("1393") ? {} : (stryCov_9fa48("1393"), {
            id,
            callback,
            type: stryMutAct_9fa48("1394") ? "" : (stryCov_9fa48("1394"), "timeout"),
            intervalMs: 0,
            scheduledAt: stryMutAct_9fa48("1395") ? getCurrentTime() - ms : (stryCov_9fa48("1395"), getCurrentTime() + ms),
            registrationOrder: order
          }));
          checkBlockUntilResolvers();
          return createTimerHandle(id);
        }
      },
      setInterval(callback: () => void, ms: number): TimerHandle {
        if (stryMutAct_9fa48("1396")) {
          {}
        } else {
          stryCov_9fa48("1396");
          if (stryMutAct_9fa48("1399") ? typeof callback === "function" : stryMutAct_9fa48("1398") ? false : stryMutAct_9fa48("1397") ? true : (stryCov_9fa48("1397", "1398", "1399"), typeof callback !== (stryMutAct_9fa48("1400") ? "" : (stryCov_9fa48("1400"), "function")))) {
            if (stryMutAct_9fa48("1401")) {
              {}
            } else {
              stryCov_9fa48("1401");
              throw new TypeError(stryMutAct_9fa48("1402") ? "" : (stryCov_9fa48("1402"), "callback must be a function"));
            }
          }
          if (stryMutAct_9fa48("1405") ? !Number.isFinite(ms) && ms <= 0 : stryMutAct_9fa48("1404") ? false : stryMutAct_9fa48("1403") ? true : (stryCov_9fa48("1403", "1404", "1405"), (stryMutAct_9fa48("1406") ? Number.isFinite(ms) : (stryCov_9fa48("1406"), !Number.isFinite(ms))) || (stryMutAct_9fa48("1409") ? ms > 0 : stryMutAct_9fa48("1408") ? ms < 0 : stryMutAct_9fa48("1407") ? false : (stryCov_9fa48("1407", "1408", "1409"), ms <= 0)))) {
            if (stryMutAct_9fa48("1410")) {
              {}
            } else {
              stryCov_9fa48("1410");
              throw new TypeError(stryMutAct_9fa48("1411") ? `` : (stryCov_9fa48("1411"), `ms must be a positive finite number, got ${ms}`));
            }
          }
          const id = nextId;
          stryMutAct_9fa48("1412") ? nextId -= 1 : (stryCov_9fa48("1412"), nextId += 1);
          const order = registrationOrder;
          stryMutAct_9fa48("1413") ? registrationOrder -= 1 : (stryCov_9fa48("1413"), registrationOrder += 1);
          pendingTimers.push(stryMutAct_9fa48("1414") ? {} : (stryCov_9fa48("1414"), {
            id,
            callback,
            type: stryMutAct_9fa48("1415") ? "" : (stryCov_9fa48("1415"), "interval"),
            intervalMs: ms,
            scheduledAt: stryMutAct_9fa48("1416") ? getCurrentTime() - ms : (stryCov_9fa48("1416"), getCurrentTime() + ms),
            registrationOrder: order
          }));
          checkBlockUntilResolvers();
          return createTimerHandle(id);
        }
      },
      clearTimeout(handle: TimerHandle): void {
        if (stryMutAct_9fa48("1417")) {
          {}
        } else {
          stryCov_9fa48("1417");
          const index = pendingTimers.findIndex(stryMutAct_9fa48("1418") ? () => undefined : (stryCov_9fa48("1418"), t => stryMutAct_9fa48("1421") ? t.id === handle.id || t.type === "timeout" : stryMutAct_9fa48("1420") ? false : stryMutAct_9fa48("1419") ? true : (stryCov_9fa48("1419", "1420", "1421"), (stryMutAct_9fa48("1423") ? t.id !== handle.id : stryMutAct_9fa48("1422") ? true : (stryCov_9fa48("1422", "1423"), t.id === handle.id)) && (stryMutAct_9fa48("1425") ? t.type !== "timeout" : stryMutAct_9fa48("1424") ? true : (stryCov_9fa48("1424", "1425"), t.type === (stryMutAct_9fa48("1426") ? "" : (stryCov_9fa48("1426"), "timeout")))))));
          if (stryMutAct_9fa48("1429") ? index === -1 : stryMutAct_9fa48("1428") ? false : stryMutAct_9fa48("1427") ? true : (stryCov_9fa48("1427", "1428", "1429"), index !== (stryMutAct_9fa48("1430") ? +1 : (stryCov_9fa48("1430"), -1)))) {
            if (stryMutAct_9fa48("1431")) {
              {}
            } else {
              stryCov_9fa48("1431");
              pendingTimers.splice(index, 1);
            }
          }
        }
      },
      clearInterval(handle: TimerHandle): void {
        if (stryMutAct_9fa48("1432")) {
          {}
        } else {
          stryCov_9fa48("1432");
          const index = pendingTimers.findIndex(stryMutAct_9fa48("1433") ? () => undefined : (stryCov_9fa48("1433"), t => stryMutAct_9fa48("1436") ? t.id === handle.id || t.type === "interval" : stryMutAct_9fa48("1435") ? false : stryMutAct_9fa48("1434") ? true : (stryCov_9fa48("1434", "1435", "1436"), (stryMutAct_9fa48("1438") ? t.id !== handle.id : stryMutAct_9fa48("1437") ? true : (stryCov_9fa48("1437", "1438"), t.id === handle.id)) && (stryMutAct_9fa48("1440") ? t.type !== "interval" : stryMutAct_9fa48("1439") ? true : (stryCov_9fa48("1439", "1440"), t.type === (stryMutAct_9fa48("1441") ? "" : (stryCov_9fa48("1441"), "interval")))))));
          if (stryMutAct_9fa48("1444") ? index === -1 : stryMutAct_9fa48("1443") ? false : stryMutAct_9fa48("1442") ? true : (stryCov_9fa48("1442", "1443", "1444"), index !== (stryMutAct_9fa48("1445") ? +1 : (stryCov_9fa48("1445"), -1)))) {
            if (stryMutAct_9fa48("1446")) {
              {}
            } else {
              stryCov_9fa48("1446");
              pendingTimers.splice(index, 1);
            }
          }
        }
      },
      sleep(ms: number): Promise<void> {
        if (stryMutAct_9fa48("1447")) {
          {}
        } else {
          stryCov_9fa48("1447");
          return new Promise<void>(resolve => {
            if (stryMutAct_9fa48("1448")) {
              {}
            } else {
              stryCov_9fa48("1448");
              scheduler.setTimeout(resolve, ms);
            }
          });
        }
      },
      pendingCount(): number {
        if (stryMutAct_9fa48("1449")) {
          {}
        } else {
          stryCov_9fa48("1449");
          return pendingTimers.length;
        }
      },
      advanceTime(ms: number): void {
        if (stryMutAct_9fa48("1450")) {
          {}
        } else {
          stryCov_9fa48("1450");
          clock.advance(ms);
        }
      },
      runAll(): void {
        if (stryMutAct_9fa48("1451")) {
          {}
        } else {
          stryCov_9fa48("1451");
          if (stryMutAct_9fa48("1454") ? pendingTimers.length !== 0 : stryMutAct_9fa48("1453") ? false : stryMutAct_9fa48("1452") ? true : (stryCov_9fa48("1452", "1453", "1454"), pendingTimers.length === 0)) return;
          // Find the latest scheduled time
          let latestTime = 0;
          for (const timer of pendingTimers) {
            if (stryMutAct_9fa48("1455")) {
              {}
            } else {
              stryCov_9fa48("1455");
              if (stryMutAct_9fa48("1459") ? timer.scheduledAt <= latestTime : stryMutAct_9fa48("1458") ? timer.scheduledAt >= latestTime : stryMutAct_9fa48("1457") ? false : stryMutAct_9fa48("1456") ? true : (stryCov_9fa48("1456", "1457", "1458", "1459"), timer.scheduledAt > latestTime)) {
                if (stryMutAct_9fa48("1460")) {
                  {}
                } else {
                  stryCov_9fa48("1460");
                  latestTime = timer.scheduledAt;
                }
              }
            }
          }
          // Advance clock to the latest time
          const current = getCurrentTime();
          const delta = stryMutAct_9fa48("1461") ? latestTime + current : (stryCov_9fa48("1461"), latestTime - current);
          if (stryMutAct_9fa48("1465") ? delta <= 0 : stryMutAct_9fa48("1464") ? delta >= 0 : stryMutAct_9fa48("1463") ? false : stryMutAct_9fa48("1462") ? true : (stryCov_9fa48("1462", "1463", "1464", "1465"), delta > 0)) {
            if (stryMutAct_9fa48("1466")) {
              {}
            } else {
              stryCov_9fa48("1466");
              clock.advance(delta);
            }
          }
          // Fire any remaining timers (non-interval)
          const toFire = stryMutAct_9fa48("1467") ? pendingTimers : (stryCov_9fa48("1467"), pendingTimers.filter(stryMutAct_9fa48("1468") ? () => undefined : (stryCov_9fa48("1468"), t => stryMutAct_9fa48("1471") ? t.type !== "timeout" : stryMutAct_9fa48("1470") ? false : stryMutAct_9fa48("1469") ? true : (stryCov_9fa48("1469", "1470", "1471"), t.type === (stryMutAct_9fa48("1472") ? "" : (stryCov_9fa48("1472"), "timeout"))))));
          for (const timer of toFire) {
            if (stryMutAct_9fa48("1473")) {
              {}
            } else {
              stryCov_9fa48("1473");
              const index = pendingTimers.indexOf(timer);
              if (stryMutAct_9fa48("1476") ? index === -1 : stryMutAct_9fa48("1475") ? false : stryMutAct_9fa48("1474") ? true : (stryCov_9fa48("1474", "1475", "1476"), index !== (stryMutAct_9fa48("1477") ? +1 : (stryCov_9fa48("1477"), -1)))) {
                if (stryMutAct_9fa48("1478")) {
                  {}
                } else {
                  stryCov_9fa48("1478");
                  pendingTimers.splice(index, 1);
                  timer.callback();
                }
              }
            }
          }
        }
      },
      runNext(): void {
        if (stryMutAct_9fa48("1479")) {
          {}
        } else {
          stryCov_9fa48("1479");
          if (stryMutAct_9fa48("1482") ? pendingTimers.length !== 0 : stryMutAct_9fa48("1481") ? false : stryMutAct_9fa48("1480") ? true : (stryCov_9fa48("1480", "1481", "1482"), pendingTimers.length === 0)) return;
          // Find the earliest timer
          let earliestIndex = 0;
          for (let i = 1; stryMutAct_9fa48("1485") ? i >= pendingTimers.length : stryMutAct_9fa48("1484") ? i <= pendingTimers.length : stryMutAct_9fa48("1483") ? false : (stryCov_9fa48("1483", "1484", "1485"), i < pendingTimers.length); stryMutAct_9fa48("1486") ? i-- : (stryCov_9fa48("1486"), i++)) {
            if (stryMutAct_9fa48("1487")) {
              {}
            } else {
              stryCov_9fa48("1487");
              const a = pendingTimers[earliestIndex];
              const b = pendingTimers[i];
              if (stryMutAct_9fa48("1490") ? b.scheduledAt < a.scheduledAt && b.scheduledAt === a.scheduledAt && b.registrationOrder < a.registrationOrder : stryMutAct_9fa48("1489") ? false : stryMutAct_9fa48("1488") ? true : (stryCov_9fa48("1488", "1489", "1490"), (stryMutAct_9fa48("1493") ? b.scheduledAt >= a.scheduledAt : stryMutAct_9fa48("1492") ? b.scheduledAt <= a.scheduledAt : stryMutAct_9fa48("1491") ? false : (stryCov_9fa48("1491", "1492", "1493"), b.scheduledAt < a.scheduledAt)) || (stryMutAct_9fa48("1495") ? b.scheduledAt === a.scheduledAt || b.registrationOrder < a.registrationOrder : stryMutAct_9fa48("1494") ? false : (stryCov_9fa48("1494", "1495"), (stryMutAct_9fa48("1497") ? b.scheduledAt !== a.scheduledAt : stryMutAct_9fa48("1496") ? true : (stryCov_9fa48("1496", "1497"), b.scheduledAt === a.scheduledAt)) && (stryMutAct_9fa48("1500") ? b.registrationOrder >= a.registrationOrder : stryMutAct_9fa48("1499") ? b.registrationOrder <= a.registrationOrder : stryMutAct_9fa48("1498") ? true : (stryCov_9fa48("1498", "1499", "1500"), b.registrationOrder < a.registrationOrder)))))) {
                if (stryMutAct_9fa48("1501")) {
                  {}
                } else {
                  stryCov_9fa48("1501");
                  earliestIndex = i;
                }
              }
            }
          }
          const timer = pendingTimers[earliestIndex];
          const current = getCurrentTime();
          const delta = stryMutAct_9fa48("1502") ? timer.scheduledAt + current : (stryCov_9fa48("1502"), timer.scheduledAt - current);
          if (stryMutAct_9fa48("1506") ? delta <= 0 : stryMutAct_9fa48("1505") ? delta >= 0 : stryMutAct_9fa48("1504") ? false : stryMutAct_9fa48("1503") ? true : (stryCov_9fa48("1503", "1504", "1505", "1506"), delta > 0)) {
            if (stryMutAct_9fa48("1507")) {
              {}
            } else {
              stryCov_9fa48("1507");
              clock.advance(delta);
            }
          }
          // Fire the timer (advance may have already fired it via _onAdvance)
          const stillPending = pendingTimers.findIndex(stryMutAct_9fa48("1508") ? () => undefined : (stryCov_9fa48("1508"), t => stryMutAct_9fa48("1511") ? t.id !== timer.id : stryMutAct_9fa48("1510") ? false : stryMutAct_9fa48("1509") ? true : (stryCov_9fa48("1509", "1510", "1511"), t.id === timer.id)));
          if (stryMutAct_9fa48("1514") ? stillPending === -1 : stryMutAct_9fa48("1513") ? false : stryMutAct_9fa48("1512") ? true : (stryCov_9fa48("1512", "1513", "1514"), stillPending !== (stryMutAct_9fa48("1515") ? +1 : (stryCov_9fa48("1515"), -1)))) {
            if (stryMutAct_9fa48("1516")) {
              {}
            } else {
              stryCov_9fa48("1516");
              if (stryMutAct_9fa48("1519") ? timer.type !== "timeout" : stryMutAct_9fa48("1518") ? false : stryMutAct_9fa48("1517") ? true : (stryCov_9fa48("1517", "1518", "1519"), timer.type === (stryMutAct_9fa48("1520") ? "" : (stryCov_9fa48("1520"), "timeout")))) {
                if (stryMutAct_9fa48("1521")) {
                  {}
                } else {
                  stryCov_9fa48("1521");
                  pendingTimers.splice(stillPending, 1);
                }
              } else {
                if (stryMutAct_9fa48("1522")) {
                  {}
                } else {
                  stryCov_9fa48("1522");
                  stryMutAct_9fa48("1523") ? pendingTimers[stillPending].scheduledAt -= timer.intervalMs : (stryCov_9fa48("1523"), pendingTimers[stillPending].scheduledAt += timer.intervalMs);
                }
              }
              timer.callback();
            }
          }
        }
      },
      blockUntil(n: number, options?: BlockUntilOptions): Promise<void> {
        if (stryMutAct_9fa48("1524")) {
          {}
        } else {
          stryCov_9fa48("1524");
          if (stryMutAct_9fa48("1528") ? pendingTimers.length < n : stryMutAct_9fa48("1527") ? pendingTimers.length > n : stryMutAct_9fa48("1526") ? false : stryMutAct_9fa48("1525") ? true : (stryCov_9fa48("1525", "1526", "1527", "1528"), pendingTimers.length >= n)) {
            if (stryMutAct_9fa48("1529")) {
              {}
            } else {
              stryCov_9fa48("1529");
              return Promise.resolve();
            }
          }
          const timeoutMs = stryMutAct_9fa48("1530") ? options?.timeoutMs && 5000 : (stryCov_9fa48("1530"), (stryMutAct_9fa48("1531") ? options.timeoutMs : (stryCov_9fa48("1531"), options?.timeoutMs)) ?? 5000);
          return new Promise<void>((resolve, reject) => {
            if (stryMutAct_9fa48("1532")) {
              {}
            } else {
              stryCov_9fa48("1532");
              const realTimeout = globalThis.setTimeout(() => {
                if (stryMutAct_9fa48("1533")) {
                  {}
                } else {
                  stryCov_9fa48("1533");
                  const waiterIndex = blockUntilResolvers.findIndex(stryMutAct_9fa48("1534") ? () => undefined : (stryCov_9fa48("1534"), w => stryMutAct_9fa48("1537") ? w.resolve !== resolve : stryMutAct_9fa48("1536") ? false : stryMutAct_9fa48("1535") ? true : (stryCov_9fa48("1535", "1536", "1537"), w.resolve === resolve)));
                  if (stryMutAct_9fa48("1540") ? waiterIndex === -1 : stryMutAct_9fa48("1539") ? false : stryMutAct_9fa48("1538") ? true : (stryCov_9fa48("1538", "1539", "1540"), waiterIndex !== (stryMutAct_9fa48("1541") ? +1 : (stryCov_9fa48("1541"), -1)))) {
                    if (stryMutAct_9fa48("1542")) {
                      {}
                    } else {
                      stryCov_9fa48("1542");
                      blockUntilResolvers.splice(waiterIndex, 1);
                    }
                  }
                  reject(createClockTimeoutError(n, pendingTimers.length, timeoutMs));
                }
              }, timeoutMs);
              blockUntilResolvers.push(stryMutAct_9fa48("1543") ? {} : (stryCov_9fa48("1543"), {
                n,
                resolve: () => {
                  if (stryMutAct_9fa48("1544")) {
                    {}
                  } else {
                    stryCov_9fa48("1544");
                    globalThis.clearTimeout(realTimeout);
                    resolve();
                  }
                },
                reject
              }));
            }
          });
        }
      }
    });
    return scheduler;
  }
}