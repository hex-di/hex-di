/**
 * Phantom branded timestamp and duration types for @hex-di/clock.
 *
 * Zero runtime cost — brands exist only at the TypeScript type level.
 * All branding utilities are identity functions at runtime.
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
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { ClockService } from "./ports/clock.js";

// =============================================================================
// Unique Symbol Brands (opaque, unforgeable)
// =============================================================================

declare const MonotonicBrand: unique symbol;
declare const WallClockBrand: unique symbol;
declare const HighResBrand: unique symbol;
declare const MonotonicDurationBrand: unique symbol;
declare const WallClockDurationBrand: unique symbol;

// =============================================================================
// Branded Timestamp Types
// =============================================================================

/** Monotonic timestamp in milliseconds, relative to process start. Never decreases. */
export type MonotonicTimestamp = number & {
  readonly [MonotonicBrand]: never;
};

/** Wall-clock timestamp in milliseconds since Unix epoch. May jump with NTP. */
export type WallClockTimestamp = number & {
  readonly [WallClockBrand]: never;
};

/** High-resolution timestamp: performance.timeOrigin + performance.now() in milliseconds. */
export type HighResTimestamp = number & {
  readonly [HighResBrand]: never;
};

// =============================================================================
// Branded Duration Types
// =============================================================================

/** Monotonic elapsed time in milliseconds. Immune to NTP jumps. */
export type MonotonicDuration = number & {
  readonly [MonotonicDurationBrand]: never;
};

/** Wall-clock elapsed time in milliseconds. May go negative on NTP backward correction. */
export type WallClockDuration = number & {
  readonly [WallClockDurationBrand]: never;
};

// =============================================================================
// Zero-Cost Identity Branding (no validation, no runtime cost)
// =============================================================================

/** Brand a number as MonotonicTimestamp. Use only at system boundaries. */
export function asMonotonic(ms: number): MonotonicTimestamp {
  if (stryMutAct_9fa48("540")) {
    {}
  } else {
    stryCov_9fa48("540");
    return ms as MonotonicTimestamp;
  }
}

/** Brand a number as WallClockTimestamp. Use only at system boundaries. */
export function asWallClock(ms: number): WallClockTimestamp {
  if (stryMutAct_9fa48("541")) {
    {}
  } else {
    stryCov_9fa48("541");
    return ms as WallClockTimestamp;
  }
}

/** Brand a number as HighResTimestamp. Use only at system boundaries. */
export function asHighRes(ms: number): HighResTimestamp {
  if (stryMutAct_9fa48("542")) {
    {}
  } else {
    stryCov_9fa48("542");
    return ms as HighResTimestamp;
  }
}

/** Brand a number as MonotonicDuration. Use only at system boundaries. */
export function asMonotonicDuration(ms: number): MonotonicDuration {
  if (stryMutAct_9fa48("543")) {
    {}
  } else {
    stryCov_9fa48("543");
    return ms as MonotonicDuration;
  }
}

/** Brand a number as WallClockDuration. Use only at system boundaries. */
export function asWallClockDuration(ms: number): WallClockDuration {
  if (stryMutAct_9fa48("544")) {
    {}
  } else {
    stryCov_9fa48("544");
    return ms as WallClockDuration;
  }
}

// =============================================================================
// Validated Branding (Result-returning, with plausibility checks)
// =============================================================================

/** Error returned when validated branding fails a plausibility check. */
export interface BrandingValidationError {
  readonly _tag: "BrandingValidationError";
  readonly expectedDomain: "monotonic" | "wallClock" | "highRes";
  readonly value: number;
  readonly message: string;
}

/** Factory for BrandingValidationError — frozen per GxP error immutability. */
export function createBrandingValidationError(expectedDomain: BrandingValidationError["expectedDomain"], value: number, message: string): BrandingValidationError {
  if (stryMutAct_9fa48("545")) {
    {}
  } else {
    stryCov_9fa48("545");
    return Object.freeze(stryMutAct_9fa48("546") ? {} : (stryCov_9fa48("546"), {
      _tag: "BrandingValidationError" as const,
      expectedDomain,
      value,
      message
    }));
  }
}

/**
 * Validated branding for MonotonicTimestamp.
 * Rejects negative values and values >= 1e12 (~31 years from process start).
 */
export function asMonotonicValidated(ms: number): Result<MonotonicTimestamp, BrandingValidationError> {
  if (stryMutAct_9fa48("547")) {
    {}
  } else {
    stryCov_9fa48("547");
    if (stryMutAct_9fa48("551") ? ms >= 0 : stryMutAct_9fa48("550") ? ms <= 0 : stryMutAct_9fa48("549") ? false : stryMutAct_9fa48("548") ? true : (stryCov_9fa48("548", "549", "550", "551"), ms < 0)) {
      if (stryMutAct_9fa48("552")) {
        {}
      } else {
        stryCov_9fa48("552");
        return err(createBrandingValidationError(stryMutAct_9fa48("553") ? "" : (stryCov_9fa48("553"), "monotonic"), ms, stryMutAct_9fa48("554") ? `` : (stryCov_9fa48("554"), `Monotonic timestamp must be >= 0, got ${ms}`)));
      }
    }
    if (stryMutAct_9fa48("558") ? ms < 1e12 : stryMutAct_9fa48("557") ? ms > 1e12 : stryMutAct_9fa48("556") ? false : stryMutAct_9fa48("555") ? true : (stryCov_9fa48("555", "556", "557", "558"), ms >= 1e12)) {
      if (stryMutAct_9fa48("559")) {
        {}
      } else {
        stryCov_9fa48("559");
        return err(createBrandingValidationError(stryMutAct_9fa48("560") ? "" : (stryCov_9fa48("560"), "monotonic"), ms, stryMutAct_9fa48("561") ? `` : (stryCov_9fa48("561"), `Monotonic timestamp must be < 1e12 (31 years from process start), got ${ms}`)));
      }
    }
    return ok(ms as MonotonicTimestamp);
  }
}

/** Year 2000 Unix timestamp in milliseconds */
const Y2K_MS = 946684800000;
/** One day in milliseconds */
const ONE_DAY_MS = 86400000;

/**
 * Validated branding for WallClockTimestamp.
 * Rejects values before Y2K and values more than 1 day in the future.
 */
export function asWallClockValidated(ms: number): Result<WallClockTimestamp, BrandingValidationError> {
  if (stryMutAct_9fa48("562")) {
    {}
  } else {
    stryCov_9fa48("562");
    if (stryMutAct_9fa48("566") ? ms >= Y2K_MS : stryMutAct_9fa48("565") ? ms <= Y2K_MS : stryMutAct_9fa48("564") ? false : stryMutAct_9fa48("563") ? true : (stryCov_9fa48("563", "564", "565", "566"), ms < Y2K_MS)) {
      if (stryMutAct_9fa48("567")) {
        {}
      } else {
        stryCov_9fa48("567");
        return err(createBrandingValidationError(stryMutAct_9fa48("568") ? "" : (stryCov_9fa48("568"), "wallClock"), ms, stryMutAct_9fa48("569") ? `` : (stryCov_9fa48("569"), `Wall-clock timestamp must be >= ${Y2K_MS} (2000-01-01), got ${ms}`)));
      }
    }
    const maxAllowed = stryMutAct_9fa48("570") ? Date.now() - ONE_DAY_MS : (stryCov_9fa48("570"), Date.now() + ONE_DAY_MS);
    if (stryMutAct_9fa48("574") ? ms <= maxAllowed : stryMutAct_9fa48("573") ? ms >= maxAllowed : stryMutAct_9fa48("572") ? false : stryMutAct_9fa48("571") ? true : (stryCov_9fa48("571", "572", "573", "574"), ms > maxAllowed)) {
      if (stryMutAct_9fa48("575")) {
        {}
      } else {
        stryCov_9fa48("575");
        return err(createBrandingValidationError(stryMutAct_9fa48("576") ? "" : (stryCov_9fa48("576"), "wallClock"), ms, stryMutAct_9fa48("577") ? `` : (stryCov_9fa48("577"), `Wall-clock timestamp must be <= 1 day in the future (${maxAllowed}), got ${ms}`)));
      }
    }
    return ok(ms as WallClockTimestamp);
  }
}

/**
 * Validated branding for HighResTimestamp.
 * Same rules as asWallClockValidated.
 */
export function asHighResValidated(ms: number): Result<HighResTimestamp, BrandingValidationError> {
  if (stryMutAct_9fa48("578")) {
    {}
  } else {
    stryCov_9fa48("578");
    if (stryMutAct_9fa48("582") ? ms >= Y2K_MS : stryMutAct_9fa48("581") ? ms <= Y2K_MS : stryMutAct_9fa48("580") ? false : stryMutAct_9fa48("579") ? true : (stryCov_9fa48("579", "580", "581", "582"), ms < Y2K_MS)) {
      if (stryMutAct_9fa48("583")) {
        {}
      } else {
        stryCov_9fa48("583");
        return err(createBrandingValidationError(stryMutAct_9fa48("584") ? "" : (stryCov_9fa48("584"), "highRes"), ms, stryMutAct_9fa48("585") ? `` : (stryCov_9fa48("585"), `High-res timestamp must be >= ${Y2K_MS} (2000-01-01), got ${ms}`)));
      }
    }
    const maxAllowed = stryMutAct_9fa48("586") ? Date.now() - ONE_DAY_MS : (stryCov_9fa48("586"), Date.now() + ONE_DAY_MS);
    if (stryMutAct_9fa48("590") ? ms <= maxAllowed : stryMutAct_9fa48("589") ? ms >= maxAllowed : stryMutAct_9fa48("588") ? false : stryMutAct_9fa48("587") ? true : (stryCov_9fa48("587", "588", "589", "590"), ms > maxAllowed)) {
      if (stryMutAct_9fa48("591")) {
        {}
      } else {
        stryCov_9fa48("591");
        return err(createBrandingValidationError(stryMutAct_9fa48("592") ? "" : (stryCov_9fa48("592"), "highRes"), ms, stryMutAct_9fa48("593") ? `` : (stryCov_9fa48("593"), `High-res timestamp must be <= 1 day in the future (${maxAllowed}), got ${ms}`)));
      }
    }
    return ok(ms as HighResTimestamp);
  }
}

// =============================================================================
// Duration Utilities
// =============================================================================

/**
 * Compute elapsed monotonic duration since a prior monotonic timestamp.
 * Preferred over asMonotonicDuration(clock.monotonicNow() - start) for clarity.
 */
export function elapsed(clock: ClockService, since: MonotonicTimestamp): MonotonicDuration {
  if (stryMutAct_9fa48("594")) {
    {}
  } else {
    stryCov_9fa48("594");
    return asMonotonicDuration(stryMutAct_9fa48("595") ? clock.monotonicNow() + since : (stryCov_9fa48("595"), clock.monotonicNow() - since));
  }
}

/** Returns true if monotonic duration a > b. */
export function durationGt(a: MonotonicDuration, b: MonotonicDuration): boolean {
  if (stryMutAct_9fa48("596")) {
    {}
  } else {
    stryCov_9fa48("596");
    return stryMutAct_9fa48("600") ? a <= b : stryMutAct_9fa48("599") ? a >= b : stryMutAct_9fa48("598") ? false : stryMutAct_9fa48("597") ? true : (stryCov_9fa48("597", "598", "599", "600"), a > b);
  }
}

/** Returns true if monotonic duration a < b. */
export function durationLt(a: MonotonicDuration, b: MonotonicDuration): boolean {
  if (stryMutAct_9fa48("601")) {
    {}
  } else {
    stryCov_9fa48("601");
    return stryMutAct_9fa48("605") ? a >= b : stryMutAct_9fa48("604") ? a <= b : stryMutAct_9fa48("603") ? false : stryMutAct_9fa48("602") ? true : (stryCov_9fa48("602", "603", "604", "605"), a < b);
  }
}

/**
 * Returns true if value is within [min, max] inclusive.
 * Note: spec signature is durationBetween(value, min, max).
 */
export function durationBetween(value: MonotonicDuration, min: MonotonicDuration, max: MonotonicDuration): boolean {
  if (stryMutAct_9fa48("606")) {
    {}
  } else {
    stryCov_9fa48("606");
    return stryMutAct_9fa48("609") ? value >= min || value <= max : stryMutAct_9fa48("608") ? false : stryMutAct_9fa48("607") ? true : (stryCov_9fa48("607", "608", "609"), (stryMutAct_9fa48("612") ? value < min : stryMutAct_9fa48("611") ? value > min : stryMutAct_9fa48("610") ? true : (stryCov_9fa48("610", "611", "612"), value >= min)) && (stryMutAct_9fa48("615") ? value > max : stryMutAct_9fa48("614") ? value < max : stryMutAct_9fa48("613") ? true : (stryCov_9fa48("613", "614", "615"), value <= max)));
  }
}