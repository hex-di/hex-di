/**
 * Deserialization utilities for TemporalContext and ClockDiagnostics.
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
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";
import { asMonotonic, asWallClock } from "./branded.js";
import type { TemporalContext, OverflowTemporalContext } from "./temporal-context.js";
import type { ClockDiagnostics } from "./ports/diagnostics.js";

/** Error returned when deserialization fails. */
export interface DeserializationError {
  readonly _tag: "DeserializationError";
  readonly schemaType: string;
  readonly expectedVersions: ReadonlyArray<number>;
  readonly actualVersion: number | undefined;
  readonly field: string | undefined;
  readonly message: string;
}

/** Factory for DeserializationError — frozen per GxP error immutability. */
export function createDeserializationError(args: {
  readonly schemaType: string;
  readonly expectedVersions: ReadonlyArray<number>;
  readonly actualVersion?: number;
  readonly field?: string;
  readonly message: string;
}): DeserializationError {
  if (stryMutAct_9fa48("656")) {
    {}
  } else {
    stryCov_9fa48("656");
    return Object.freeze(stryMutAct_9fa48("657") ? {} : (stryCov_9fa48("657"), {
      _tag: "DeserializationError" as const,
      schemaType: args.schemaType,
      expectedVersions: args.expectedVersions,
      actualVersion: args.actualVersion,
      field: args.field,
      message: args.message
    }));
  }
}

/** Check if a value is a plain object. */
function isObject(value: unknown): value is Record<string, unknown> {
  if (stryMutAct_9fa48("658")) {
    {}
  } else {
    stryCov_9fa48("658");
    return stryMutAct_9fa48("661") ? typeof value === "object" && value !== null || !Array.isArray(value) : stryMutAct_9fa48("660") ? false : stryMutAct_9fa48("659") ? true : (stryCov_9fa48("659", "660", "661"), (stryMutAct_9fa48("663") ? typeof value === "object" || value !== null : stryMutAct_9fa48("662") ? true : (stryCov_9fa48("662", "663"), (stryMutAct_9fa48("665") ? typeof value !== "object" : stryMutAct_9fa48("664") ? true : (stryCov_9fa48("664", "665"), typeof value === (stryMutAct_9fa48("666") ? "" : (stryCov_9fa48("666"), "object")))) && (stryMutAct_9fa48("668") ? value === null : stryMutAct_9fa48("667") ? true : (stryCov_9fa48("667", "668"), value !== null)))) && (stryMutAct_9fa48("669") ? Array.isArray(value) : (stryCov_9fa48("669"), !Array.isArray(value))));
  }
}

/**
 * Deserializes a raw object into a TemporalContext.
 * Validates shape and brands numeric fields.
 */
export function deserializeTemporalContext(raw: unknown): Result<TemporalContext, DeserializationError> {
  if (stryMutAct_9fa48("670")) {
    {}
  } else {
    stryCov_9fa48("670");
    if (stryMutAct_9fa48("673") ? false : stryMutAct_9fa48("672") ? true : stryMutAct_9fa48("671") ? isObject(raw) : (stryCov_9fa48("671", "672", "673"), !isObject(raw))) {
      if (stryMutAct_9fa48("674")) {
        {}
      } else {
        stryCov_9fa48("674");
        return err(createDeserializationError(stryMutAct_9fa48("675") ? {} : (stryCov_9fa48("675"), {
          schemaType: stryMutAct_9fa48("676") ? "" : (stryCov_9fa48("676"), "TemporalContext"),
          expectedVersions: stryMutAct_9fa48("677") ? [] : (stryCov_9fa48("677"), [1]),
          message: stryMutAct_9fa48("678") ? "" : (stryCov_9fa48("678"), "Expected an object")
        })));
      }
    }
    if (stryMutAct_9fa48("681") ? typeof raw.sequenceNumber === "number" : stryMutAct_9fa48("680") ? false : stryMutAct_9fa48("679") ? true : (stryCov_9fa48("679", "680", "681"), typeof raw.sequenceNumber !== (stryMutAct_9fa48("682") ? "" : (stryCov_9fa48("682"), "number")))) {
      if (stryMutAct_9fa48("683")) {
        {}
      } else {
        stryCov_9fa48("683");
        return err(createDeserializationError(stryMutAct_9fa48("684") ? {} : (stryCov_9fa48("684"), {
          schemaType: stryMutAct_9fa48("685") ? "" : (stryCov_9fa48("685"), "TemporalContext"),
          expectedVersions: stryMutAct_9fa48("686") ? [] : (stryCov_9fa48("686"), [1]),
          field: stryMutAct_9fa48("687") ? "" : (stryCov_9fa48("687"), "sequenceNumber"),
          message: stryMutAct_9fa48("688") ? "" : (stryCov_9fa48("688"), "Field 'sequenceNumber' must be a number")
        })));
      }
    }
    if (stryMutAct_9fa48("691") ? typeof raw.monotonicTimestamp === "number" : stryMutAct_9fa48("690") ? false : stryMutAct_9fa48("689") ? true : (stryCov_9fa48("689", "690", "691"), typeof raw.monotonicTimestamp !== (stryMutAct_9fa48("692") ? "" : (stryCov_9fa48("692"), "number")))) {
      if (stryMutAct_9fa48("693")) {
        {}
      } else {
        stryCov_9fa48("693");
        return err(createDeserializationError(stryMutAct_9fa48("694") ? {} : (stryCov_9fa48("694"), {
          schemaType: stryMutAct_9fa48("695") ? "" : (stryCov_9fa48("695"), "TemporalContext"),
          expectedVersions: stryMutAct_9fa48("696") ? [] : (stryCov_9fa48("696"), [1]),
          field: stryMutAct_9fa48("697") ? "" : (stryCov_9fa48("697"), "monotonicTimestamp"),
          message: stryMutAct_9fa48("698") ? "" : (stryCov_9fa48("698"), "Field 'monotonicTimestamp' must be a number")
        })));
      }
    }
    if (stryMutAct_9fa48("701") ? typeof raw.wallClockTimestamp === "number" : stryMutAct_9fa48("700") ? false : stryMutAct_9fa48("699") ? true : (stryCov_9fa48("699", "700", "701"), typeof raw.wallClockTimestamp !== (stryMutAct_9fa48("702") ? "" : (stryCov_9fa48("702"), "number")))) {
      if (stryMutAct_9fa48("703")) {
        {}
      } else {
        stryCov_9fa48("703");
        return err(createDeserializationError(stryMutAct_9fa48("704") ? {} : (stryCov_9fa48("704"), {
          schemaType: stryMutAct_9fa48("705") ? "" : (stryCov_9fa48("705"), "TemporalContext"),
          expectedVersions: stryMutAct_9fa48("706") ? [] : (stryCov_9fa48("706"), [1]),
          field: stryMutAct_9fa48("707") ? "" : (stryCov_9fa48("707"), "wallClockTimestamp"),
          message: stryMutAct_9fa48("708") ? "" : (stryCov_9fa48("708"), "Field 'wallClockTimestamp' must be a number")
        })));
      }
    }
    const ctx: TemporalContext = Object.freeze(stryMutAct_9fa48("709") ? {} : (stryCov_9fa48("709"), {
      sequenceNumber: raw.sequenceNumber,
      monotonicTimestamp: asMonotonic(raw.monotonicTimestamp),
      wallClockTimestamp: asWallClock(raw.wallClockTimestamp)
    }));
    return ok(ctx);
  }
}

/**
 * Deserializes a raw object into an OverflowTemporalContext.
 */
export function deserializeOverflowTemporalContext(raw: unknown): Result<OverflowTemporalContext, DeserializationError> {
  if (stryMutAct_9fa48("710")) {
    {}
  } else {
    stryCov_9fa48("710");
    if (stryMutAct_9fa48("713") ? false : stryMutAct_9fa48("712") ? true : stryMutAct_9fa48("711") ? isObject(raw) : (stryCov_9fa48("711", "712", "713"), !isObject(raw))) {
      if (stryMutAct_9fa48("714")) {
        {}
      } else {
        stryCov_9fa48("714");
        return err(createDeserializationError(stryMutAct_9fa48("715") ? {} : (stryCov_9fa48("715"), {
          schemaType: stryMutAct_9fa48("716") ? "" : (stryCov_9fa48("716"), "OverflowTemporalContext"),
          expectedVersions: stryMutAct_9fa48("717") ? [] : (stryCov_9fa48("717"), [1]),
          message: stryMutAct_9fa48("718") ? "" : (stryCov_9fa48("718"), "Expected an object")
        })));
      }
    }
    if (stryMutAct_9fa48("721") ? raw._tag === "OverflowTemporalContext" : stryMutAct_9fa48("720") ? false : stryMutAct_9fa48("719") ? true : (stryCov_9fa48("719", "720", "721"), raw._tag !== (stryMutAct_9fa48("722") ? "" : (stryCov_9fa48("722"), "OverflowTemporalContext")))) {
      if (stryMutAct_9fa48("723")) {
        {}
      } else {
        stryCov_9fa48("723");
        return err(createDeserializationError(stryMutAct_9fa48("724") ? {} : (stryCov_9fa48("724"), {
          schemaType: stryMutAct_9fa48("725") ? "" : (stryCov_9fa48("725"), "OverflowTemporalContext"),
          expectedVersions: stryMutAct_9fa48("726") ? [] : (stryCov_9fa48("726"), [1]),
          field: stryMutAct_9fa48("727") ? "" : (stryCov_9fa48("727"), "_tag"),
          message: stryMutAct_9fa48("728") ? "" : (stryCov_9fa48("728"), "Field '_tag' must be 'OverflowTemporalContext'")
        })));
      }
    }
    if (stryMutAct_9fa48("731") ? raw.sequenceNumber === -1 : stryMutAct_9fa48("730") ? false : stryMutAct_9fa48("729") ? true : (stryCov_9fa48("729", "730", "731"), raw.sequenceNumber !== (stryMutAct_9fa48("732") ? +1 : (stryCov_9fa48("732"), -1)))) {
      if (stryMutAct_9fa48("733")) {
        {}
      } else {
        stryCov_9fa48("733");
        return err(createDeserializationError(stryMutAct_9fa48("734") ? {} : (stryCov_9fa48("734"), {
          schemaType: stryMutAct_9fa48("735") ? "" : (stryCov_9fa48("735"), "OverflowTemporalContext"),
          expectedVersions: stryMutAct_9fa48("736") ? [] : (stryCov_9fa48("736"), [1]),
          field: stryMutAct_9fa48("737") ? "" : (stryCov_9fa48("737"), "sequenceNumber"),
          message: stryMutAct_9fa48("738") ? "" : (stryCov_9fa48("738"), "Field 'sequenceNumber' must be -1")
        })));
      }
    }
    if (stryMutAct_9fa48("741") ? typeof raw.lastValidSequenceNumber === "number" : stryMutAct_9fa48("740") ? false : stryMutAct_9fa48("739") ? true : (stryCov_9fa48("739", "740", "741"), typeof raw.lastValidSequenceNumber !== (stryMutAct_9fa48("742") ? "" : (stryCov_9fa48("742"), "number")))) {
      if (stryMutAct_9fa48("743")) {
        {}
      } else {
        stryCov_9fa48("743");
        return err(createDeserializationError(stryMutAct_9fa48("744") ? {} : (stryCov_9fa48("744"), {
          schemaType: stryMutAct_9fa48("745") ? "" : (stryCov_9fa48("745"), "OverflowTemporalContext"),
          expectedVersions: stryMutAct_9fa48("746") ? [] : (stryCov_9fa48("746"), [1]),
          field: stryMutAct_9fa48("747") ? "" : (stryCov_9fa48("747"), "lastValidSequenceNumber"),
          message: stryMutAct_9fa48("748") ? "" : (stryCov_9fa48("748"), "Field 'lastValidSequenceNumber' must be a number")
        })));
      }
    }
    if (stryMutAct_9fa48("751") ? typeof raw.monotonicTimestamp === "number" : stryMutAct_9fa48("750") ? false : stryMutAct_9fa48("749") ? true : (stryCov_9fa48("749", "750", "751"), typeof raw.monotonicTimestamp !== (stryMutAct_9fa48("752") ? "" : (stryCov_9fa48("752"), "number")))) {
      if (stryMutAct_9fa48("753")) {
        {}
      } else {
        stryCov_9fa48("753");
        return err(createDeserializationError(stryMutAct_9fa48("754") ? {} : (stryCov_9fa48("754"), {
          schemaType: stryMutAct_9fa48("755") ? "" : (stryCov_9fa48("755"), "OverflowTemporalContext"),
          expectedVersions: stryMutAct_9fa48("756") ? [] : (stryCov_9fa48("756"), [1]),
          field: stryMutAct_9fa48("757") ? "" : (stryCov_9fa48("757"), "monotonicTimestamp"),
          message: stryMutAct_9fa48("758") ? "" : (stryCov_9fa48("758"), "Field 'monotonicTimestamp' must be a number")
        })));
      }
    }
    if (stryMutAct_9fa48("761") ? typeof raw.wallClockTimestamp === "number" : stryMutAct_9fa48("760") ? false : stryMutAct_9fa48("759") ? true : (stryCov_9fa48("759", "760", "761"), typeof raw.wallClockTimestamp !== (stryMutAct_9fa48("762") ? "" : (stryCov_9fa48("762"), "number")))) {
      if (stryMutAct_9fa48("763")) {
        {}
      } else {
        stryCov_9fa48("763");
        return err(createDeserializationError(stryMutAct_9fa48("764") ? {} : (stryCov_9fa48("764"), {
          schemaType: stryMutAct_9fa48("765") ? "" : (stryCov_9fa48("765"), "OverflowTemporalContext"),
          expectedVersions: stryMutAct_9fa48("766") ? [] : (stryCov_9fa48("766"), [1]),
          field: stryMutAct_9fa48("767") ? "" : (stryCov_9fa48("767"), "wallClockTimestamp"),
          message: stryMutAct_9fa48("768") ? "" : (stryCov_9fa48("768"), "Field 'wallClockTimestamp' must be a number")
        })));
      }
    }
    const ctx: OverflowTemporalContext = Object.freeze(stryMutAct_9fa48("769") ? {} : (stryCov_9fa48("769"), {
      _tag: "OverflowTemporalContext" as const,
      sequenceNumber: -1 as const,
      lastValidSequenceNumber: raw.lastValidSequenceNumber,
      monotonicTimestamp: asMonotonic(raw.monotonicTimestamp),
      wallClockTimestamp: asWallClock(raw.wallClockTimestamp)
    }));
    return ok(ctx);
  }
}

/**
 * Deserializes a raw object into a ClockDiagnostics.
 */
export function deserializeClockDiagnostics(raw: unknown): Result<ClockDiagnostics, DeserializationError> {
  if (stryMutAct_9fa48("770")) {
    {}
  } else {
    stryCov_9fa48("770");
    if (stryMutAct_9fa48("773") ? false : stryMutAct_9fa48("772") ? true : stryMutAct_9fa48("771") ? isObject(raw) : (stryCov_9fa48("771", "772", "773"), !isObject(raw))) {
      if (stryMutAct_9fa48("774")) {
        {}
      } else {
        stryCov_9fa48("774");
        return err(createDeserializationError(stryMutAct_9fa48("775") ? {} : (stryCov_9fa48("775"), {
          schemaType: stryMutAct_9fa48("776") ? "" : (stryCov_9fa48("776"), "ClockDiagnostics"),
          expectedVersions: stryMutAct_9fa48("777") ? [] : (stryCov_9fa48("777"), [1]),
          message: stryMutAct_9fa48("778") ? "" : (stryCov_9fa48("778"), "Expected an object")
        })));
      }
    }
    if (stryMutAct_9fa48("781") ? typeof raw.adapterName === "string" : stryMutAct_9fa48("780") ? false : stryMutAct_9fa48("779") ? true : (stryCov_9fa48("779", "780", "781"), typeof raw.adapterName !== (stryMutAct_9fa48("782") ? "" : (stryCov_9fa48("782"), "string")))) {
      if (stryMutAct_9fa48("783")) {
        {}
      } else {
        stryCov_9fa48("783");
        return err(createDeserializationError(stryMutAct_9fa48("784") ? {} : (stryCov_9fa48("784"), {
          schemaType: stryMutAct_9fa48("785") ? "" : (stryCov_9fa48("785"), "ClockDiagnostics"),
          expectedVersions: stryMutAct_9fa48("786") ? [] : (stryCov_9fa48("786"), [1]),
          field: stryMutAct_9fa48("787") ? "" : (stryCov_9fa48("787"), "adapterName"),
          message: stryMutAct_9fa48("788") ? "" : (stryCov_9fa48("788"), "Field 'adapterName' must be a string")
        })));
      }
    }
    const validMonotonicSources = ["performance.now", "Date.now-clamped", "host-bridge"] as const;
    if (stryMutAct_9fa48("791") ? false : stryMutAct_9fa48("790") ? true : stryMutAct_9fa48("789") ? validMonotonicSources.includes(raw.monotonicSource as (typeof validMonotonicSources)[number]) : (stryCov_9fa48("789", "790", "791"), !validMonotonicSources.includes(raw.monotonicSource as (typeof validMonotonicSources)[number]))) {
      if (stryMutAct_9fa48("792")) {
        {}
      } else {
        stryCov_9fa48("792");
        return err(createDeserializationError(stryMutAct_9fa48("793") ? {} : (stryCov_9fa48("793"), {
          schemaType: stryMutAct_9fa48("794") ? "" : (stryCov_9fa48("794"), "ClockDiagnostics"),
          expectedVersions: stryMutAct_9fa48("795") ? [] : (stryCov_9fa48("795"), [1]),
          field: stryMutAct_9fa48("796") ? "" : (stryCov_9fa48("796"), "monotonicSource"),
          message: stryMutAct_9fa48("797") ? `` : (stryCov_9fa48("797"), `Field 'monotonicSource' must be one of: ${validMonotonicSources.join(stryMutAct_9fa48("798") ? "" : (stryCov_9fa48("798"), ", "))}`)
        })));
      }
    }
    const validHighResSources = ["performance.timeOrigin+now", "Date.now", "host-bridge", "host-bridge-wallclock"] as const;
    if (stryMutAct_9fa48("801") ? false : stryMutAct_9fa48("800") ? true : stryMutAct_9fa48("799") ? validHighResSources.includes(raw.highResSource as (typeof validHighResSources)[number]) : (stryCov_9fa48("799", "800", "801"), !validHighResSources.includes(raw.highResSource as (typeof validHighResSources)[number]))) {
      if (stryMutAct_9fa48("802")) {
        {}
      } else {
        stryCov_9fa48("802");
        return err(createDeserializationError(stryMutAct_9fa48("803") ? {} : (stryCov_9fa48("803"), {
          schemaType: stryMutAct_9fa48("804") ? "" : (stryCov_9fa48("804"), "ClockDiagnostics"),
          expectedVersions: stryMutAct_9fa48("805") ? [] : (stryCov_9fa48("805"), [1]),
          field: stryMutAct_9fa48("806") ? "" : (stryCov_9fa48("806"), "highResSource"),
          message: stryMutAct_9fa48("807") ? `` : (stryCov_9fa48("807"), `Field 'highResSource' must be one of: ${validHighResSources.join(stryMutAct_9fa48("808") ? "" : (stryCov_9fa48("808"), ", "))}`)
        })));
      }
    }
    const diagnostics: ClockDiagnostics = Object.freeze(stryMutAct_9fa48("809") ? {} : (stryCov_9fa48("809"), {
      adapterName: raw.adapterName,
      monotonicSource: raw.monotonicSource as ClockDiagnostics["monotonicSource"],
      highResSource: raw.highResSource as ClockDiagnostics["highResSource"],
      platformResolutionMs: (stryMutAct_9fa48("812") ? raw.platformResolutionMs === undefined && raw.platformResolutionMs === null : stryMutAct_9fa48("811") ? false : stryMutAct_9fa48("810") ? true : (stryCov_9fa48("810", "811", "812"), (stryMutAct_9fa48("814") ? raw.platformResolutionMs !== undefined : stryMutAct_9fa48("813") ? false : (stryCov_9fa48("813", "814"), raw.platformResolutionMs === undefined)) || (stryMutAct_9fa48("816") ? raw.platformResolutionMs !== null : stryMutAct_9fa48("815") ? false : (stryCov_9fa48("815", "816"), raw.platformResolutionMs === null)))) ? undefined : (stryMutAct_9fa48("819") ? typeof raw.platformResolutionMs !== "number" : stryMutAct_9fa48("818") ? false : stryMutAct_9fa48("817") ? true : (stryCov_9fa48("817", "818", "819"), typeof raw.platformResolutionMs === (stryMutAct_9fa48("820") ? "" : (stryCov_9fa48("820"), "number")))) ? raw.platformResolutionMs : undefined,
      cryptoFipsMode: (stryMutAct_9fa48("823") ? raw.cryptoFipsMode === undefined && raw.cryptoFipsMode === null : stryMutAct_9fa48("822") ? false : stryMutAct_9fa48("821") ? true : (stryCov_9fa48("821", "822", "823"), (stryMutAct_9fa48("825") ? raw.cryptoFipsMode !== undefined : stryMutAct_9fa48("824") ? false : (stryCov_9fa48("824", "825"), raw.cryptoFipsMode === undefined)) || (stryMutAct_9fa48("827") ? raw.cryptoFipsMode !== null : stryMutAct_9fa48("826") ? false : (stryCov_9fa48("826", "827"), raw.cryptoFipsMode === null)))) ? undefined : (stryMutAct_9fa48("830") ? typeof raw.cryptoFipsMode !== "boolean" : stryMutAct_9fa48("829") ? false : stryMutAct_9fa48("828") ? true : (stryCov_9fa48("828", "829", "830"), typeof raw.cryptoFipsMode === (stryMutAct_9fa48("831") ? "" : (stryCov_9fa48("831"), "boolean")))) ? raw.cryptoFipsMode : undefined
    }));
    return ok(diagnostics);
  }
}