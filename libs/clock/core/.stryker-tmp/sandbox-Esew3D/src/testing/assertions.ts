/**
 * Testing assertion helpers for clock-related test conditions.
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
import type { MonotonicTimestamp, MonotonicDuration, WallClockTimestamp } from "../branded.js";

/** Asserts that the array of MonotonicTimestamp values is strictly increasing. */
export function assertMonotonic(values: ReadonlyArray<MonotonicTimestamp>, label?: string): void {
  if (stryMutAct_9fa48("1058")) {
    {}
  } else {
    stryCov_9fa48("1058");
    if (stryMutAct_9fa48("1062") ? values.length > 1 : stryMutAct_9fa48("1061") ? values.length < 1 : stryMutAct_9fa48("1060") ? false : stryMutAct_9fa48("1059") ? true : (stryCov_9fa48("1059", "1060", "1061", "1062"), values.length <= 1)) return;
    for (let i = 0; stryMutAct_9fa48("1065") ? i >= values.length - 1 : stryMutAct_9fa48("1064") ? i <= values.length - 1 : stryMutAct_9fa48("1063") ? false : (stryCov_9fa48("1063", "1064", "1065"), i < (stryMutAct_9fa48("1066") ? values.length + 1 : (stryCov_9fa48("1066"), values.length - 1))); stryMutAct_9fa48("1067") ? i-- : (stryCov_9fa48("1067"), i++)) {
      if (stryMutAct_9fa48("1068")) {
        {}
      } else {
        stryCov_9fa48("1068");
        if (stryMutAct_9fa48("1072") ? values[i] < values[i + 1] : stryMutAct_9fa48("1071") ? values[i] > values[i + 1] : stryMutAct_9fa48("1070") ? false : stryMutAct_9fa48("1069") ? true : (stryCov_9fa48("1069", "1070", "1071", "1072"), values[i] >= values[stryMutAct_9fa48("1073") ? i - 1 : (stryCov_9fa48("1073"), i + 1)])) {
          if (stryMutAct_9fa48("1074")) {
            {}
          } else {
            stryCov_9fa48("1074");
            const prefix = label ? stryMutAct_9fa48("1075") ? `` : (stryCov_9fa48("1075"), `Monotonic assertion failed (${label})`) : stryMutAct_9fa48("1076") ? "" : (stryCov_9fa48("1076"), "Monotonic assertion failed");
            throw new Error(stryMutAct_9fa48("1077") ? `` : (stryCov_9fa48("1077"), `${prefix}: values[${i}] (${values[i]}) >= values[${stryMutAct_9fa48("1078") ? i - 1 : (stryCov_9fa48("1078"), i + 1)}] (${values[stryMutAct_9fa48("1079") ? i - 1 : (stryCov_9fa48("1079"), i + 1)]})`));
          }
        }
      }
    }
  }
}

/** Asserts that actual falls within [min, max] inclusive. */
export function assertTimeBetween(actual: MonotonicDuration, min: MonotonicDuration, max: MonotonicDuration, label?: string): void {
  if (stryMutAct_9fa48("1080")) {
    {}
  } else {
    stryCov_9fa48("1080");
    if (stryMutAct_9fa48("1083") ? actual < min && actual > max : stryMutAct_9fa48("1082") ? false : stryMutAct_9fa48("1081") ? true : (stryCov_9fa48("1081", "1082", "1083"), (stryMutAct_9fa48("1086") ? actual >= min : stryMutAct_9fa48("1085") ? actual <= min : stryMutAct_9fa48("1084") ? false : (stryCov_9fa48("1084", "1085", "1086"), actual < min)) || (stryMutAct_9fa48("1089") ? actual <= max : stryMutAct_9fa48("1088") ? actual >= max : stryMutAct_9fa48("1087") ? false : (stryCov_9fa48("1087", "1088", "1089"), actual > max)))) {
      if (stryMutAct_9fa48("1090")) {
        {}
      } else {
        stryCov_9fa48("1090");
        const prefix = label ? stryMutAct_9fa48("1091") ? `` : (stryCov_9fa48("1091"), `Time assertion failed (${label})`) : stryMutAct_9fa48("1092") ? "" : (stryCov_9fa48("1092"), "Time assertion failed");
        throw new Error(stryMutAct_9fa48("1093") ? `` : (stryCov_9fa48("1093"), `${prefix}: ${actual}ms not in [${min}ms, ${max}ms]`));
      }
    }
  }
}

/** Asserts that the wall-clock timestamp is plausible (after 2020, not more than 1 day in future). */
export function assertWallClockPlausible(timestamp: WallClockTimestamp, label?: string): void {
  if (stryMutAct_9fa48("1094")) {
    {}
  } else {
    stryCov_9fa48("1094");
    const Y2020 = 1577836800000;
    const ONE_DAY_MS = 86400000;
    if (stryMutAct_9fa48("1098") ? timestamp >= Y2020 : stryMutAct_9fa48("1097") ? timestamp <= Y2020 : stryMutAct_9fa48("1096") ? false : stryMutAct_9fa48("1095") ? true : (stryCov_9fa48("1095", "1096", "1097", "1098"), timestamp < Y2020)) {
      if (stryMutAct_9fa48("1099")) {
        {}
      } else {
        stryCov_9fa48("1099");
        const prefix = label ? stryMutAct_9fa48("1100") ? `` : (stryCov_9fa48("1100"), `Wall-clock assertion failed (${label})`) : stryMutAct_9fa48("1101") ? "" : (stryCov_9fa48("1101"), "Wall-clock assertion failed");
        throw new Error(stryMutAct_9fa48("1102") ? `` : (stryCov_9fa48("1102"), `${prefix}: ${timestamp} is before 2020-01-01`));
      }
    }
    const maxAllowed = stryMutAct_9fa48("1103") ? Date.now() - ONE_DAY_MS : (stryCov_9fa48("1103"), Date.now() + ONE_DAY_MS);
    if (stryMutAct_9fa48("1107") ? timestamp <= maxAllowed : stryMutAct_9fa48("1106") ? timestamp >= maxAllowed : stryMutAct_9fa48("1105") ? false : stryMutAct_9fa48("1104") ? true : (stryCov_9fa48("1104", "1105", "1106", "1107"), timestamp > maxAllowed)) {
      if (stryMutAct_9fa48("1108")) {
        {}
      } else {
        stryCov_9fa48("1108");
        const prefix = label ? stryMutAct_9fa48("1109") ? `` : (stryCov_9fa48("1109"), `Wall-clock assertion failed (${label})`) : stryMutAct_9fa48("1110") ? "" : (stryCov_9fa48("1110"), "Wall-clock assertion failed");
        throw new Error(stryMutAct_9fa48("1111") ? `` : (stryCov_9fa48("1111"), `${prefix}: ${timestamp} is more than 1 day in the future`));
      }
    }
  }
}

/** Asserts that the array of sequence numbers is strictly increasing by exactly 1 (consecutive). */
export function assertSequenceOrdered(values: ReadonlyArray<number>, label?: string): void {
  if (stryMutAct_9fa48("1112")) {
    {}
  } else {
    stryCov_9fa48("1112");
    if (stryMutAct_9fa48("1116") ? values.length > 1 : stryMutAct_9fa48("1115") ? values.length < 1 : stryMutAct_9fa48("1114") ? false : stryMutAct_9fa48("1113") ? true : (stryCov_9fa48("1113", "1114", "1115", "1116"), values.length <= 1)) return;
    for (let i = 0; stryMutAct_9fa48("1119") ? i >= values.length - 1 : stryMutAct_9fa48("1118") ? i <= values.length - 1 : stryMutAct_9fa48("1117") ? false : (stryCov_9fa48("1117", "1118", "1119"), i < (stryMutAct_9fa48("1120") ? values.length + 1 : (stryCov_9fa48("1120"), values.length - 1))); stryMutAct_9fa48("1121") ? i-- : (stryCov_9fa48("1121"), i++)) {
      if (stryMutAct_9fa48("1122")) {
        {}
      } else {
        stryCov_9fa48("1122");
        const gap = stryMutAct_9fa48("1123") ? values[i + 1] + values[i] : (stryCov_9fa48("1123"), values[stryMutAct_9fa48("1124") ? i - 1 : (stryCov_9fa48("1124"), i + 1)] - values[i]);
        if (stryMutAct_9fa48("1127") ? gap === 1 : stryMutAct_9fa48("1126") ? false : stryMutAct_9fa48("1125") ? true : (stryCov_9fa48("1125", "1126", "1127"), gap !== 1)) {
          if (stryMutAct_9fa48("1128")) {
            {}
          } else {
            stryCov_9fa48("1128");
            const prefix = label ? stryMutAct_9fa48("1129") ? `` : (stryCov_9fa48("1129"), `Sequence assertion failed (${label})`) : stryMutAct_9fa48("1130") ? "" : (stryCov_9fa48("1130"), "Sequence assertion failed");
            throw new Error(stryMutAct_9fa48("1131") ? `` : (stryCov_9fa48("1131"), `${prefix}: values[${i}] (${values[i]}) -> values[${stryMutAct_9fa48("1132") ? i - 1 : (stryCov_9fa48("1132"), i + 1)}] (${values[stryMutAct_9fa48("1133") ? i - 1 : (stryCov_9fa48("1133"), i + 1)]}): gap of ${gap}, expected 1`));
          }
        }
      }
    }
  }
}